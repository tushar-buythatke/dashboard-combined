"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetcher } from "@/lib/api";

const getBrandLogoEndpoint = (brand: string) => {
  const base = import.meta.env.DEV ? "/brand-logo" : "/api/brand-logo";
  const url = new URL(base, window.location.origin);
  url.searchParams.set("brand", brand);
  return url.toString();
};

const getBrandForPOS = (posName: string) => {
  const name = (posName || "").toLowerCase();

  if (name.includes("milky") && name.includes("mist")) return "Milky Mist";
  if (name.includes("flipkart")) return "flipkart";

  return null;
};

function BrandLogo({ brand }: { brand: string }) {
  const [errored, setErrored] = useState(false);
  const src = getBrandLogoEndpoint(brand);

  if (errored) {
    return (
      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
        {brand.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={brand}
      className="w-6 h-6 rounded object-contain bg-white"
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}

type POSSummary = {
  pos: number;
  pos_name: string;
  total_volume: number;
  success_rate: number;
  error_rate: number;
  avg_delay_hours: number;
  health_status?: string;
};

const toPercent = (value: unknown) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
}

type RawTop5Item = {
  posId?: unknown
  pos?: unknown
  posName?: unknown
  name?: unknown
  volume?: unknown
  total_volume?: unknown
  android?: { errorRate?: unknown; successRate?: unknown; delayMs?: unknown }
  chrome?: { errorRate?: unknown; successRate?: unknown; delayMs?: unknown }
  email?: { errorRate?: unknown; successRate?: unknown; delayMs?: unknown }
  errorRate?: unknown
  error_rate?: unknown
  successRate?: unknown
  success_rate?: unknown
  status?: string
  metrics?: Array<{
    metric_type?: unknown
    type?: unknown
    current_value?: unknown
    value?: unknown
  }>
}

export default function POSStatsGrid() {
  const { data, isLoading } = useSWR<{ data: { pos_list: POSSummary[] } }>(
    ["/pa-dasher-api/stats/all-pos-summary?limit=10", "pos-summary"],
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 120_000,
    }
  );

  const primaryList = data?.data?.pos_list || [];
  const shouldLoadFallback = !!data && primaryList.length === 0;

  const { data: top5Data } = useSWR(shouldLoadFallback ? ["/pa-dasher-api/stats/top5", "pos-summary-fallback"] : null, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: true,
  })

  const fallbackList: POSSummary[] = useMemo(() => {
    if (!Array.isArray(top5Data?.items)) return []
    return (top5Data.items as RawTop5Item[]).map((item) => {
      const posId = Number(item.posId ?? item.pos ?? 0)
      const name = String(item.posName ?? item.name ?? `POS ${posId || ""}`)
      const volume = Number(item.volume ?? item.total_volume ?? 0)

      const errorPercents = [item.android?.errorRate, item.chrome?.errorRate, item.email?.errorRate]
        .map(toPercent)
        .filter((v) => Number.isFinite(v))
      const successPercents = [item.android?.successRate, item.chrome?.successRate, item.email?.successRate]
        .map(toPercent)
        .filter((v) => Number.isFinite(v))

      const avgErrorPercent = errorPercents.length > 0
        ? errorPercents.reduce((sum, v) => sum + v, 0) / errorPercents.length
        : toPercent(item.errorRate ?? item.error_rate ?? 0)
      const avgSuccessPercent = successPercents.length > 0
        ? successPercents.reduce((sum, v) => sum + v, 0) / successPercents.length
        : toPercent(item.successRate ?? item.success_rate ?? (100 - avgErrorPercent))

      const delayValues = [item.android?.delayMs, item.chrome?.delayMs, item.email?.delayMs]
        .map((value) => Number(value))
        .filter((v) => Number.isFinite(v) && v > 0)
      const avgDelayHours = delayValues.length > 0
        ? delayValues.reduce((sum, v) => sum + v, 0) / delayValues.length / 1000 / 60 / 60
        : 0

      const status = item.status ?? (avgErrorPercent > 15 ? "critical" : avgErrorPercent > 5 ? "warning" : "healthy")

      return {
        pos: posId,
        pos_name: name,
        total_volume: Number.isFinite(volume) ? volume : 0,
        success_rate: Number.isFinite(avgSuccessPercent) ? avgSuccessPercent : 0,
        error_rate: Number.isFinite(avgErrorPercent) ? avgErrorPercent : 0,
        avg_delay_hours: Number.isFinite(avgDelayHours) ? avgDelayHours : 0,
        health_status: status,
      }
    })
  }, [top5Data])

  const displayList = primaryList.length > 0 ? primaryList : fallbackList
  const isFallback = primaryList.length === 0 && fallbackList.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>POS Systems Overview</CardTitle>
        <CardDescription>
          Performance metrics and health status of all connected POS systems
        </CardDescription>
        {isFallback && (
          <p className="text-xs text-muted-foreground pt-1">
            Showing live snapshot from top POS because cached summary data is not yet available.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Loading POS data...</p>
            </div>
          </div>
        ) : displayList.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No POS data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {displayList.map((pos) => (
              <POSCard key={pos.pos} pos={pos} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function POSCard({ pos }: { pos: POSSummary }) {
  const status = pos.health_status ?? "healthy"
  const statusConfig =
    status === "critical"
      ? { color: "text-red-500", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", variant: "destructive" as const }
      : status === "warning"
      ? { color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950", border: "border-orange-200 dark:border-orange-800", variant: "default" as const }
      : { color: "text-green-500", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", variant: "secondary" as const };

  const StatusIcon =
    status === "critical"
      ? AlertTriangle
      : status === "warning"
      ? Activity
      : CheckCircle;

  const successRate = parseFloat(String(pos.success_rate || 0));
  const brand = getBrandForPOS(pos.pos_name);

  return (
    <Card className={`hover:-translate-y-1 hover:shadow-xl transition-all duration-200 ${statusConfig.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {brand ? <BrandLogo brand={brand} /> : null}
            <CardTitle className="text-lg font-mono truncate">POS {pos.pos}</CardTitle>
          </div>
          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
        </div>
        <Badge variant={statusConfig.variant} className="w-fit text-xs">
          {pos.health_status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Success Rate Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Success Rate</span>
            <span className="font-semibold">{successRate.toFixed(1)}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Volume
            </span>
            <span className="font-mono font-semibold">{pos.total_volume?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Errors
            </span>
            <span className="font-mono font-semibold text-red-500">
              {parseFloat(String(pos.error_rate || 0)).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Avg Delay
            </span>
            <span className="font-mono font-semibold text-orange-500">
              {(() => {
                const delay = parseFloat(String(pos.avg_delay_hours || 0));
                return delay < 1 ? `${Math.round(delay * 60)}m` : `${delay.toFixed(1)}h`;
              })()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
