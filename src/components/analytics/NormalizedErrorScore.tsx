"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Gauge,
  RefreshCw,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import * as React from "react" // <-- ADDED: Import React to ensure React types are available

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetcher } from "@/lib/api"
import { cn } from "@/lib/utils"

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const TOP_POS_OPTIONS = [
  { value: "default", label: "Critical Top POS" },
  { value: "2,63,111,2191,7376", label: "All Top 5" },
  { value: "2", label: "POS 2 · Flipkart" },
  { value: "63", label: "POS 63 · Amazon" },
  { value: "111", label: "POS 111 · Myntra" },
  { value: "2191", label: "POS 2191 · Ajio" },
  { value: "7376", label: "POS 7376 · Meesho" },
]

// Note: HOURS array is now only for logic, not for a Select dropdown

const DAYS_OPTIONS = [
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
]

type HourlyComparisonItem = {
  pos: number
  pos_name?: string
  hour: number
  current: {
    total_notifications: number
    total_errors: number
    error_rate: number
    success_rate: number
  }
  history: {
    sample_size: number
    average_error_rate: number
    std_deviation: number
  }
  deviation: {
    delta_percentage: number
    z_score: number
    status: "healthy" | "warning" | "critical" | string
  }
}

type HourlyComparisonResponse = {
  data?: {
    comparison: HourlyComparisonItem[]
    hour?: number | string
    days?: number | string
  }
}

const STATUS_STYLES: Record<string, { badge: string; bg: string; indicator: string; label: string }> = {
  healthy: {
    badge: "border-emerald-200 text-emerald-600 bg-emerald-500/10",
    bg: "bg-emerald-500/5",
    indicator: "bg-emerald-500",
    label: "Healthy",
  },
  warning: {
    badge: "text-amber-600 bg-amber-500/10 border border-amber-500/30",
    bg: "bg-amber-500/5",
    indicator: "bg-amber-500",
    label: "Warning",
  },
  critical: {
    badge: "text-red-600 bg-red-500/10 border border-red-500/30",
    bg: "bg-red-500/5",
    indicator: "bg-red-500",
    label: "Critical",
  },
}

type NormalizedErrorScoreProps = {
  controlledPOS?: string | null
  lookup?: Record<string, string>
}

const extractMetrics = (item: HourlyComparisonItem) => {
  return {
    currentErrorRate: toNumber(item.current.error_rate),
    historicalAverage: toNumber(item.history.average_error_rate),
    zScore: toNumber(item.deviation.z_score),
    successRate: toNumber(item.current.success_rate),
    deltaPercentage: toNumber(item.deviation.delta_percentage),
    totalNotifications: toNumber(item.current.total_notifications),
    totalErrors: toNumber(item.current.total_errors),
    sampleSize: toNumber(item.history.sample_size),
  }
}

// FIX: Updated CardHelpers to use React.ReactElement to resolve JSX namespace issue
type CardHelpers = {
  renderStatusBadge: (status: string) => React.ReactElement
}

type MainComparisonCardProps = CardHelpers & {
  item: HourlyComparisonItem
  renderDelta: (delta: number) => React.ReactElement
  sampleHour: number
  lookbackDays: number
}

function MainComparisonCard(props: MainComparisonCardProps) {
  const { item, renderStatusBadge, renderDelta, sampleHour, lookbackDays } = props
  const { currentErrorRate, historicalAverage, zScore, successRate, deltaPercentage, totalNotifications, totalErrors, sampleSize } =
    extractMetrics(item)
  // Ensure we use lowercase status for style lookup
  const statusKey = item.deviation.status.toLowerCase()
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.warning

  return (
    <Card className={cn("w-full max-w-2xl border transition-all", statusStyle.bg)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">POS {item.pos}</CardTitle>
            <CardDescription>{item.pos_name ?? `POS ${item.pos}`}</CardDescription>
          </div>
          {renderStatusBadge(item.deviation.status)}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Current Error Rate</span>
            <span className="text-xl font-bold text-destructive">{currentErrorRate.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Historical Average</span>
            <span className="text-sm font-semibold text-foreground">{historicalAverage.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Sample Size</span>
            <span className="font-mono text-sm">{sampleSize.toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/80 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Delta vs Avg
                </span>
                {renderDelta(deltaPercentage)}
              </div>
              <span className="text-[0.7rem] text-muted-foreground">Change from this POS&apos;s typical error rate for the same hour.</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  Z-Score
                </span>
                <span className="font-mono text-foreground">{zScore.toFixed(2)}</span>
              </div>
              <span className="text-[0.7rem] text-muted-foreground">How unusual the spike is: +2 ≈ alert, 0 = normal, negatives = calmer.</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-xs text-muted-foreground">
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Total Notifications</span>
            <span className="font-mono text-sm text-foreground">{totalNotifications.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Total Errors</span>
            <span className="font-mono text-sm text-destructive">{totalErrors.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Success Rate</span>
            <span className="font-mono text-sm text-emerald-500">{successRate.toFixed(2)}%</span>
          </div>
        </div>

        <div className="rounded-md border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4" />
              Context
            </span>
            <span>
              {sampleHour.toString().padStart(2, "0")}:00 • {lookbackDays} days
            </span>
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed">
            Use this hour and lookback to compare like for like. Prioritise investigation when delta is above +10% or the Z-score is above
            +2; negative values confirm the POS is recovering.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

type SideComparisonCardProps = CardHelpers & {
  item: HourlyComparisonItem
}

function SideComparisonCard(props: SideComparisonCardProps) {
  const { item, renderStatusBadge } = props
  const { currentErrorRate, historicalAverage, sampleSize, deltaPercentage, zScore, totalNotifications, totalErrors, successRate } =
    extractMetrics(item)
  // Ensure we use lowercase status for style lookup
  const statusKey = item.deviation.status.toLowerCase()
  const statusStyle = STATUS_STYLES[statusKey] ?? STATUS_STYLES.warning

  return (
    <Card className={cn("hidden w-72 flex-shrink-0 flex-col border transition-all sm:flex", statusStyle.bg)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">POS {item.pos}</CardTitle>
            <CardDescription className="text-xs">{item.pos_name ?? `POS {item.pos}`}</CardDescription>
          </div>
          {renderStatusBadge(item.deviation.status)}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span className="font-medium text-destructive">Current</span>
            <span>{currentErrorRate.toFixed(2)}%</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Historical</span>
            <span>{historicalAverage.toFixed(2)}%</span>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Δ vs Avg</span>
            <span className={cn(deltaPercentage >= 0 ? "text-red-500" : "text-emerald-500", "font-semibold")}> 
              {deltaPercentage >= 0 ? "+" : ""}
              {deltaPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Z-Score</span>
            <span className="font-mono text-foreground">{zScore.toFixed(2)}</span>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Sample Size</span>
            <span className="font-mono">{sampleSize.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border/40 bg-background/60 p-2">
            <span>Total Errors</span>
            <span className="font-mono text-destructive">{totalErrors.toLocaleString()}</span>
          </div>
        </div>
        <div className="rounded-md border border-border/40 bg-background/60 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span>Total Notifications</span>
            <span className="font-mono text-foreground">{totalNotifications.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>Success Rate</span>
            <span className="font-mono text-emerald-500">{successRate.toFixed(2)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export default function NormalizedErrorScore(props: NormalizedErrorScoreProps) {
  const { controlledPOS } = props
  const [selectedPOS, setSelectedPOS] = useState("default")
  const [selectedHour, setSelectedHour] = useState(String(new Date().getHours()))
  const [selectedDays, setSelectedDays] = useState("7")
  const [activeIndex, setActiveIndex] = useState(0)

  const effectivePOS = controlledPOS ?? selectedPOS
  const params = useMemo(() => {
    // Only pass hour and days in search params
    const search = new URLSearchParams({ days: selectedDays, hour: selectedHour })
    if (effectivePOS && effectivePOS !== "default") {
      search.set("pos", effectivePOS)
    }
    return search.toString()
  }, [selectedDays, selectedHour, effectivePOS])

  const swrKey = `/pa-dasher-api/errors/hourly-comparison?${params}&testDayOffset=1`
  const { data, error, isLoading, mutate, isValidating } = useSWR<HourlyComparisonResponse>(swrKey, fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
  })

  const comparisons = data?.data?.comparison ?? []
  // Use the hour/days returned by the API if available, otherwise fall back to the selected filter
  const sampleHour = data?.data?.hour !== undefined ? toNumber(data.data.hour) : Number(selectedHour)
  const lookbackDays = data?.data?.days !== undefined ? toNumber(data.data.days) : Number(selectedDays)

  // Hour Stepper Logic (0-23 wrap)
  const stepHour = (direction: number) => {
    if (isValidating) return; // Prevent spamming while loading
    setSelectedHour((prev) => {
      let currentHour = Number(prev);
      let newHour = currentHour + direction;
      
      // Implement 0-23 wrap logic
      if (newHour > 23) {
        newHour = 0;
      } else if (newHour < 0) {
        newHour = 23;
      }
      return String(newHour);
    });
  };

  useEffect(() => {
    // This effect handles the index for the POS carousel when new data loads
    if (comparisons.length === 0) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((prev) => {
      // Ensure activeIndex is always a valid index in a circular manner
      const mod = prev % comparisons.length
      return mod < 0 ? mod + comparisons.length : mod
    })
  }, [comparisons.length])

  // POS Carousel Logic (wraps around the available critical POS)
  const getWrappedIndex = (index: number) => {
    if (comparisons.length === 0) {
      return 0
    }
    const mod = index % comparisons.length
    return mod < 0 ? mod + comparisons.length : mod
  }

  const stepCarousel = (direction: number) => {
    if (comparisons.length === 0) {
      return
    }
    setActiveIndex((prev) => getWrappedIndex(prev + direction))
  }

  const renderStatusBadge = (status: string) => {
    const statusKey = status.toLowerCase()
    const styles = STATUS_STYLES[statusKey] ?? STATUS_STYLES.warning
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", styles.badge)}>
        <span className={cn("h-2 w-2 rounded-full", styles.indicator)} />
        {styles.label}
      </Badge>
    )
  }

  const renderDelta = (delta: number) => {
    const numericDelta = toNumber(delta)
    if (!Number.isFinite(numericDelta)) {
      return <span className="text-muted-foreground">0.0%</span>
    }
    const label = `${numericDelta >= 0 ? "+" : ""}${numericDelta.toFixed(1)}%`
    const tone = numericDelta >= 0 ? "text-red-500" : "text-emerald-500"
    const Icon = numericDelta >= 0 ? ArrowUpRight : ArrowDownRight
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", tone)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Normalized Error Score</CardTitle>
              <CardDescription>
                Deviation of current error rates from historical norms (hour {sampleHour.toString().padStart(2, "0")}:00 · {lookbackDays} day window)
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCw className={cn("h-4 w-4", isValidating && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          {/* Hour Stepper Control */}
          <div className="flex w-full flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Hour</Label>
            <div className="flex h-11 w-full items-center justify-between rounded-md border border-border bg-background px-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-foreground hover:bg-muted/60"
                onClick={() => stepHour(-1)}
                disabled={isValidating}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="flex-1 text-center text-base font-semibold tabular-nums tracking-wider text-primary">
                {sampleHour.toString().padStart(2, "0")}:00
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-foreground hover:bg-muted/60"
                onClick={() => stepHour(1)}
                disabled={isValidating}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lookback</Label>
            <Select value={selectedDays} onValueChange={setSelectedDays}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {controlledPOS ? (
            <div className="flex w-full flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">POS Filter</Label>
              <div className="flex h-11 w-full items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
                {controlledPOS === "default" ? "Critical Top POS" : controlledPOS}
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">POS Filter</Label>
              <Select value={selectedPOS} onValueChange={setSelectedPOS}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="POS scope" />
                </SelectTrigger>
                <SelectContent>
                  {TOP_POS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center py-12 text-destructive">
            <p className="text-sm">Unable to load hourly comparison right now.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm">Loading normalized error scores...</p>
            </div>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No error deviations detected for the selected filters.</p>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center gap-4">
            {comparisons.length > 1 ? (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => stepCarousel(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}
            <div className="flex w-full max-w-5xl items-stretch justify-center gap-4">
              {comparisons.length > 1 ? (
                <SideComparisonCard
                  key={`side-prev-${getWrappedIndex(activeIndex - 1)}`}
                  item={comparisons[getWrappedIndex(activeIndex - 1)]}
                  renderStatusBadge={renderStatusBadge}
                />
              ) : null}
              <MainComparisonCard
                key={`center-${getWrappedIndex(activeIndex)}`}
                item={comparisons[getWrappedIndex(activeIndex)]}
                renderStatusBadge={renderStatusBadge}
                renderDelta={renderDelta}
                sampleHour={sampleHour}
                lookbackDays={lookbackDays}
              />
              {comparisons.length > 1 ? (
                <SideComparisonCard
                  key={`side-next-${getWrappedIndex(activeIndex + 1)}`}
                  item={comparisons[getWrappedIndex(activeIndex + 1)]}
                  renderStatusBadge={renderStatusBadge}
                />
              ) : null}
            </div>
            {comparisons.length > 1 ? (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => stepCarousel(1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
