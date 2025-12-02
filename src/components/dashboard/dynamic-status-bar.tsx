"use client"

import useSWR from "swr"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/api"

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

type PosInfo = {
  posId: string
  name: string
  errorRate: number // 0..1
  successRate: number // 0..1
  volume: number
}

type RawMetric = {
  metric_type?: string
  type?: string
  current_value?: unknown
  value?: unknown
}

type RealtimePlatformMetrics = {
  errorRate?: unknown
  successRate?: unknown
  delayMs?: unknown
}

type RawRealtimeItem = {
  posId?: unknown
  pos?: unknown
  id?: unknown
  pos_id?: unknown
  name?: unknown
  posName?: unknown
  pos_name?: unknown
  android?: RealtimePlatformMetrics
  chrome?: RealtimePlatformMetrics
  email?: RealtimePlatformMetrics
  errorRate?: unknown
  error_rate?: unknown
  successRate?: unknown
  success_rate?: unknown
  volume?: unknown
  total_volume?: unknown
  total_sent?: unknown
  events?: { volume?: unknown }
  metrics?: RawMetric[]
  status?: string
  alerts?: unknown
}

type RealtimeResponse = {
  items?: RawRealtimeItem[]
  data?: RawRealtimeItem[] | { alerts?: RawRealtimeItem[] }
  timestamp?: string
}

export function DynamicStatusBar({ enableSounds = false }: { enableSounds?: boolean }) {
  const { data, error } = useSWR<RealtimeResponse>(["/pa-dasher-api/stats/top5"], fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const parsePercent = (value: unknown) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return 0
    return num > 1 ? num / 100 : num
  }

  const average = (values: number[]) => {
    const filtered = values.filter((v) => Number.isFinite(v) && v >= 0)
    if (filtered.length === 0) return 0
    return filtered.reduce((sum, v) => sum + v, 0) / filtered.length
  }

  const hydrateFromRealtimeShape = (item: RawRealtimeItem): PosInfo => {
    const posId = String(item.posId ?? item.pos ?? item.id ?? item.pos_id ?? "")
    const name = String(item.name ?? item.posName ?? item.pos_name ?? `POS ${posId || ""}`)

    const platformRates = [
      item.android?.errorRate,
      item.chrome?.errorRate,
      item.email?.errorRate,
    ].map(parsePercent)
    const platformSuccess = [
      item.android?.successRate,
      item.chrome?.successRate,
      item.email?.successRate,
    ].map(parsePercent)

    const derivedError = platformRates.some((v) => v > 0) ? average(platformRates) : parsePercent(item.errorRate ?? item.error_rate)
    const derivedSuccess = platformSuccess.some((v) => v > 0)
      ? average(platformSuccess)
      : parsePercent(item.successRate ?? item.success_rate ?? (1 - derivedError))
    const volume = Number(
      item.volume ?? item.total_volume ?? item.total_sent ?? item.events?.volume ?? 0,
    )

    return {
      posId,
      name,
      errorRate: Math.min(Math.max(derivedError, 0), 1),
      successRate: Math.min(Math.max(derivedSuccess, 0), 1),
      volume: Number.isFinite(volume) ? volume : 0,
    }
  }

  const rawItems: RawRealtimeItem[] = (() => {
    if (Array.isArray(data?.items)) {
      return data?.items ?? []
    }

    const dataPayload = data?.data
    if (Array.isArray((dataPayload as { alerts?: RawRealtimeItem[] })?.alerts)) {
      return ((dataPayload as { alerts?: RawRealtimeItem[] })?.alerts) ?? []
    }

    if (Array.isArray(dataPayload)) {
      return dataPayload as RawRealtimeItem[]
    }

    return []
  })()

  const normalized: PosInfo[] = rawItems
    .map((item) => {
      if (item?.alerts && !item?.posId && !item?.pos) return null

      const hydrated = hydrateFromRealtimeShape(item)

      // Some backends send aggregated metrics inside `metrics` array
      if (Array.isArray(item.metrics)) {
        const metricMap = new Map<string, number>()
        item.metrics.forEach((metric: RawMetric) => {
          const key = String(metric.metric_type || metric.type || "")
          const value = Number(metric.current_value ?? metric.value ?? 0)
          metricMap.set(key, value)
        })
        if (!hydrated.volume && metricMap.has("volume")) {
          hydrated.volume = Number(metricMap.get("volume") || 0)
        }
        if (metricMap.has("error_rate")) {
          hydrated.errorRate = parsePercent(metricMap.get("error_rate"))
        }
        if (metricMap.has("success_rate")) {
          hydrated.successRate = parsePercent(metricMap.get("success_rate"))
        }
      }

      return hydrated
    })
    .filter(Boolean) as PosInfo[]

  // Ensure top-5 items follow design and prioritize 2,63,11 when present
  const prioritized = normalized.sort((a, b) => {
    const order = new Map<string, number>([
      ["POS 2", 0],
      ["POS 63", 1],
      ["POS 11", 2],
    ])
    const av = order.has(a.name) ? order.get(a.name)! : 999
    const bv = order.has(b.name) ? order.get(b.name)! : 999
    return av - bv
  })
  const items = prioritized.slice(0, 5)
  const [index, setIndex] = useState(0)
  const active = items.length > 0 ? items[index % items.length] : undefined

  // Reset index when items change
  useEffect(() => {
    setIndex(0)
  }, [items.length])

  useEffect(() => {
    if (items.length === 0) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 10_000)
    return () => clearInterval(id)
  }, [items.length])

  const severity = useMemo(() => {
    if (!active) return "info"
    const er = active.errorRate
    if (er >= 0.15) return "critical"
    if (er >= 0.05) return "warning"
    return "healthy"
  }, [active])

  const lastSeverity = useRef(severity)
  useEffect(() => {
    if (enableSounds && lastSeverity.current !== "critical" && severity === "critical") {
      try {
        // Lightweight beep using Web Audio API; no asset required
        const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
        if (!AudioContextCtor) {
          console.warn("AudioContext not supported in this browser")
        } else {
          const ctx = new AudioContextCtor()
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = "sine"
          o.frequency.setValueAtTime(880, ctx.currentTime)
          g.gain.setValueAtTime(0.001, ctx.currentTime)
          g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.01)
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
          o.connect(g).connect(ctx.destination)
          o.start()
          o.stop(ctx.currentTime + 0.45)
        }
      } catch (err) {
        console.warn("DynamicStatusBar: failed to play alert sound", err)
      }
    }
    lastSeverity.current = severity
  }, [enableSounds, severity])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              "overflow-hidden transition-colors duration-300",
              severity === "critical" && "bg-red-600/15 border-red-600 animate-[pulse_2s_ease-in-out_infinite]",
              severity === "warning" && "bg-yellow-500/15 border-yellow-500",
              severity === "healthy" && "bg-green-600/10 border-green-600",
              (!active || error) && "border-dashed border-border/60",
            )}
            role="region"
            aria-live="polite"
          >
            <CardContent className="p-0">
              <div className="flex items-stretch">
                {/* Animated meter */}
                <div
                  className={cn(
                    "h-12 md:h-14 transition-[width] duration-300",
                    severity === "critical" && "bg-red-600/70",
                    severity === "warning" && "bg-yellow-500/70",
                    severity === "healthy" && "bg-green-600/70",
                  )}
                  style={{ width: `${Math.min(100, Math.max(8, (active?.errorRate ?? 0) * 100))}%` }}
                />
                <div className="flex-1 px-4 py-2 flex items-center justify-between">
                  <div className="text-sm md:text-base">
                    <span className="font-semibold">{active?.name ?? "—"}</span>
                    <span className="ml-2 text-muted-foreground">POS</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm md:text-base">
                    <span>
                      Error: <strong>{Math.round((active?.errorRate ?? 0) * 100)}%</strong>
                    </span>
                    <span className="text-green-600">
                      Success: <strong>{Math.round((active?.successRate ?? 0) * 100)}%</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Vol: {active?.volume ? active.volume.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">
            Cycling Top 5 POS every 10s • Severity: <strong className="capitalize">{severity}</strong>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
