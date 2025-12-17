"use client"

import useSWR from "swr"
import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetcher } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, Check, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

type AlertItem = {
  id: string
  severity: "critical" | "warning"
  message: string
  metric: string
  value: number
  posId?: string
  timestamp: string
}

export function CriticalAlertsPanel() {
  const { data } = useSWR<{ items: AlertItem[] }>(["/pa-dasher-api/alerts/critical?isApi=1"], fetcher, {
    refreshInterval: 15_000,
  })
  const [acked, setAcked] = useState<Record<string, boolean>>({})

  const items = useMemo(() => (data?.items ?? []).filter((i) => !acked[i.id]), [data, acked])

  return (
    <div className="grid gap-4 lg:grid-cols-2 w-full">
      <Card className="h-full w-full min-h-[340px]">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <CardTitle>Critical Alerts</CardTitle>
                <CardDescription>Active alerts requiring attention</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={items.length > 0 ? "destructive" : "secondary"}>
                {items.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-[320px] flex items-center justify-center">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center">
              <Check className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-sm font-medium">All Clear!</p>
              <p className="text-xs text-muted-foreground mt-1">No critical alerts at this time</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[360px] pr-4">
              <div className="space-y-3">
                {items.map((a) => (
                  <AlertCard key={a.id} alert={a} onAcknowledge={() => setAcked((m) => ({ ...m, [a.id]: true }))} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      <Card className="flex flex-col justify-between bg-white/60 border border-border/60 backdrop-blur w-full min-h-[340px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monitoring Stations</CardTitle>
          <CardDescription>Live visual feed</CardDescription>
        </CardHeader>
        <CardContent className="h-full">
          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-3">
              <img
                src="/assets/bot_greenprint.gif"
                alt="Monitoring bot"
                className="w-full rounded-lg border border-border/30 object-cover max-h-[260px] object-contain"
              />
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">Auto Monitor</p>
            </div>
            <div className="space-y-3">
              <img
                src="/assets/pc_blueprint.gif"
                alt="Control station"
                className="w-full rounded-lg border border-border/30 object-cover max-h-[260px] object-contain"
              />
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">Analyst Desk</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertCard({ alert, onAcknowledge }: { alert: AlertItem; onAcknowledge: () => void }) {
  const isCritical = alert.severity === "critical"
  const Icon = isCritical ? AlertTriangle : AlertCircle
  
  return (
    <Card className={`border-l-4 transition-all hover:shadow-md ${
      isCritical ? 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
    }`}>
      <CardContent className="pt-4 pb-3">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Icon className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-red-600' : 'text-orange-500'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isCritical ? "destructive" : "default"} className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-semibold">{alert.metric}</span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onAcknowledge}
              className="shrink-0"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>

          {/* Details */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {alert.posId && (
                <Badge variant="secondary" className="text-xs font-mono">
                  POS {alert.posId}
                </Badge>
              )}
              <span className="font-mono font-semibold">
                Value: {alert.value}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

