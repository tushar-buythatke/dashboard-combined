"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetcher } from "@/lib/api"

type RealtimeMetricEnvelope = {
  name?: unknown
  pos?: unknown
  posId?: unknown
  pos_name?: unknown
  volume?: unknown
  total_volume?: unknown
  total_sent?: unknown
  errorRate?: unknown
  error_rate?: unknown
  errors?: { rate?: unknown }
  successRate?: unknown
  success_rate?: unknown
  avg_success_rate?: unknown
  baselineErrorRate?: unknown
  thresholds?: { error_rate?: unknown }
  last_updated?: string
  updatedAt?: string
}

type Top5RealtimeItem = RealtimeMetricEnvelope & {
  android?: { errorRate?: unknown; successRate?: unknown }
  chrome?: { errorRate?: unknown; successRate?: unknown }
  email?: { errorRate?: unknown; successRate?: unknown }
  status?: "critical" | "warning" | string
}

export function RealtimeMetrics() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const { data, error } = useSWR(["/pa-dasher-api/errors/realtime"], fetcher, {
    refreshInterval: 60_000,
  })

  const parsePercent = (value: unknown) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return 0
    return num > 1 ? num / 100 : num
  }

  const deriveTrend = (current: number, reference: number) => {
    if (!Number.isFinite(current) || !Number.isFinite(reference)) return "flat"
    if (current > reference * 1.05) return "up"
    if (current < reference * 0.95) return "down"
    return "flat"
  }

  const rawItems: RealtimeMetricEnvelope[] = Array.isArray(data?.items)
    ? (data?.items as RealtimeMetricEnvelope[])
    : Array.isArray(data?.data)
    ? (data?.data as RealtimeMetricEnvelope[])
    : []

  type NormalizedRealtime = {
    name: string
    errorRate: number
    successRate: number
    volume: number
    trend: "up" | "down" | "flat"
    lastUpdated: string
  }

  const normalized: NormalizedRealtime[] = rawItems.map((item) => {
    const name = String(item.name ?? item.pos_name ?? `POS ${item.pos ?? item.posId ?? ""}`)
    const volume = Number(item.volume ?? item.total_volume ?? item.total_sent ?? 0)
    const errorRate = parsePercent(item.errorRate ?? item.error_rate ?? item.errors?.rate ?? 0)
    const successRate = parsePercent(item.successRate ?? item.success_rate ?? item.avg_success_rate ?? (1 - errorRate))
    const referenceError = parsePercent(item.baselineErrorRate ?? item.thresholds?.error_rate ?? 0.05)
    const trend = deriveTrend(errorRate, referenceError)

    return {
      name,
      errorRate,
      successRate,
      volume: Number.isFinite(volume) ? volume : 0,
      trend: trend as "up" | "down" | "flat",
      lastUpdated: item.last_updated ?? item.updatedAt ?? data?.timestamp ?? new Date().toISOString(),
    }
  })

  const shouldFetchTop5 = normalized.length === 0
  const { data: fallbackTop5, error: fallbackError } = useSWR(
    shouldFetchTop5 ? ["/pa-dasher-api/stats/top5", "fallback"] : null,
    fetcher,
    {
      refreshInterval: 120_000,
      revalidateOnFocus: true,
    },
  )

  const fallbackNormalized: NormalizedRealtime[] = Array.isArray(fallbackTop5?.items)
    ? (fallbackTop5.items as Top5RealtimeItem[]).map((item) => {
        const name = String(item.pos_name ?? item.name ?? `POS ${item.posId ?? item.pos ?? ""}`)
        const errorValues = [item.android?.errorRate, item.chrome?.errorRate, item.email?.errorRate]
          .map(parsePercent)
          .filter((v) => Number.isFinite(v))
        const successValues = [
          item.android?.successRate,
          item.chrome?.successRate,
          item.email?.successRate,
        ]
          .map(parsePercent)
          .filter((v) => Number.isFinite(v))

        const errorRate = errorValues.length > 0 ? errorValues.reduce((sum, v) => sum + v, 0) / errorValues.length : 0
        const successRate = successValues.length > 0 ? successValues.reduce((sum, v) => sum + v, 0) / successValues.length : 1 - errorRate

        const trend: "up" | "down" | "flat" = item.status === "critical" ? "up" : item.status === "warning" ? "flat" : "down"

        return {
          name,
          errorRate,
          successRate,
          volume: Number(item.volume ?? item.total_volume ?? 0),
          trend,
          lastUpdated: item.last_updated ?? fallbackTop5?.timestamp ?? new Date().toISOString(),
        }
      })
    : []

  const dataset = normalized.length > 0 ? normalized : fallbackNormalized

  // prioritize POS 2, 63, 11 when present; fallback to first three
  const prioritized = dataset.sort((a, b) => {
    const order = new Map([
      ["POS 2", 0],
      ["POS 63", 1],
      ["POS 11", 2],
    ])
    const av = order.has(a.name) ? order.get(a.name)! : 999
    const bv = order.has(b.name) ? order.get(b.name)! : 999
    return av - bv
  })
  const items = prioritized.slice(0, 5)
  const currentPOS = items[currentIndex]
  const updated = currentPOS?.lastUpdated ?? data?.timestamp ?? fallbackTop5?.timestamp ?? new Date().toISOString()
  const hasLoaded = Boolean(data || fallbackTop5)
  const combinedError = error ?? fallbackError

  // Reset index when items change
  useEffect(() => {
    setCurrentIndex(0)
  }, [items.length])

  // Auto-rotate every 10 seconds
  useEffect(() => {
    if (items.length === 0 || isPaused) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [items.length, isPaused])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }

  const TrendIcon = currentPOS?.trend === "up" ? TrendingUp : currentPOS?.trend === "down" ? TrendingDown : Minus
  const trendColor = currentPOS?.trend === "up" ? "text-red-500" : currentPOS?.trend === "down" ? "text-green-500" : "text-gray-500"

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary animate-pulse" />
            <div>
              <CardTitle>Real-Time POS Monitoring</CardTitle>
              <CardDescription>
                Live performance metrics • {isPaused ? 'Paused' : 'Auto-rotating every 10s'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={items.length <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant={isPaused ? "default" : "outline"}
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={items.length <= 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Rotation Indicator */}
        {items.length > 1 && (
          <div className="flex gap-2 pt-4">
            {items.map((pos, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/20'
                }`}
                title={pos.name}
              />
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {combinedError ? (
          <div className="flex items-center justify-center py-12 text-destructive">
            <p className="text-sm">Failed to load real-time metrics</p>
          </div>
        ) : currentPOS ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Featured POS Card */}
            <Card className="md:col-span-3 border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-mono">{currentPOS.name}</CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                    {currentPOS.trend}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Last updated: {new Date(updated).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Success Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Success Rate</span>
                      <span className="text-2xl font-bold text-green-600">
                        {Math.round(currentPOS.successRate * 100)}%
                      </span>
                    </div>
                    <Progress value={currentPOS.successRate * 100} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {currentPOS.successRate >= 0.95 ? "Excellent performance" : currentPOS.successRate >= 0.85 ? "Good performance" : "Needs attention"}
                    </p>
                  </div>

                  {/* Error Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-2xl font-bold text-red-600">
                        {Math.round(currentPOS.errorRate * 100)}%
                      </span>
                    </div>
                    <Progress value={currentPOS.errorRate * 100} className="h-3 [&>div]:bg-red-500" />
                    <p className="text-xs text-muted-foreground">
                      {currentPOS.errorRate <= 0.05 ? "Within threshold" : currentPOS.errorRate <= 0.10 ? "Moderate errors" : "High error rate"}
                    </p>
                  </div>

                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Volume</span>
                      <span className="text-2xl font-bold font-mono">
                        {currentPOS.volume.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active transactions being processed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : hasLoaded ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center space-y-2">
              <Activity className="w-6 h-6 mx-auto opacity-60" />
              <p className="text-sm">No real-time metrics available right now</p>
              <p className="text-xs">Data will appear once the monitoring service emits updates.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Loading real-time metrics...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

