"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Area, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from "recharts"
import { TrendingUp, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fetcher } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

const TOP_POS_OPTIONS = [
  { value: "all", label: "Global View" },
  { value: "2", label: "Flipkart (POS 2)" },
  { value: "63", label: "Amazon (POS 63)" },
  { value: "111", label: "Myntra (POS 111)" },
  { value: "2191", label: "Ajio (POS 2191)" },
  { value: "7376", label: "Meesho (POS 7376)" },
]

const chartConfig: ChartConfig = {
  success_rate: {
    label: "Success Rate %",
    color: "hsl(150 70% 45%)",
  },
  avg_delay_hours: {
    label: "Average Delay",
    color: "var(--chart-delay)",
  },
}

const DEFAULT_DAYS = "30"
const MS_IN_DAY = 86_400_000

const parseDateString = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

type NotificationTrendsProps = {
  defaultDays?: string
  defaultPOS?: string
  controlledPOS?: string
  startDate?: string
  endDate?: string
  onDateChange?: (range: { startDate?: string; endDate?: string } | null) => void
  showDatePopover?: boolean
  hideRangeSelect?: boolean
}

export function NotificationTrends({
  defaultDays = DEFAULT_DAYS,
  defaultPOS = "all",
  controlledPOS,
  startDate: externalStart,
  endDate: externalEnd,
  onDateChange,
  showDatePopover = false,
  hideRangeSelect = false,
}: NotificationTrendsProps) {
  const isControlledPos = controlledPOS !== undefined
  const [days, setDays] = useState(defaultDays)
  const [selectedPOS, setSelectedPOS] = useState<string>(controlledPOS ?? defaultPOS)
  const [localRange, setLocalRange] = useState<{ start?: Date; end?: Date }>({})

  useEffect(() => {
    if (!isControlledPos) {
      setSelectedPOS(defaultPOS)
    }
  }, [defaultPOS, isControlledPos])

  useEffect(() => {
    setDays(defaultDays)
  }, [defaultDays])

  useEffect(() => {
    if (showDatePopover) {
      const start = parseDateString(externalStart)
      const end = parseDateString(externalEnd)
      if (start || end) {
        setLocalRange({ start, end })
      }
    }
  }, [externalStart, externalEnd, showDatePopover])

  useEffect(() => {
    if (isControlledPos && controlledPOS) {
      setSelectedPOS(controlledPOS)
    }
  }, [controlledPOS, isControlledPos])

  const requestInit = useMemo(() => {
    const payload = {
      days: Number(days),
      pos: selectedPOS === "all" ? null : Number(selectedPOS),
      startDate: externalStart ?? (localRange.start ? format(localRange.start, "yyyy-MM-dd") : undefined),
      endDate: externalEnd ?? (localRange.end ? format(localRange.end, "yyyy-MM-dd") : undefined),
    }

    return {
      method: "POST",
      body: JSON.stringify(payload),
    } satisfies RequestInit
  }, [days, selectedPOS, externalStart, externalEnd, localRange])

  const selectedPOSLabel = useMemo(() => {
    const option = TOP_POS_OPTIONS.find((opt) => opt.value === selectedPOS)
    return option?.label ?? selectedPOS
  }, [selectedPOS])

  const swrKey: [string, RequestInit] = ["/pa-dasher-api/notifications/trends", requestInit]

  const { data, isLoading, mutate, isValidating } = useSWR<{
    success: boolean
    data?: {
      period: { startDate: string; endDate: string; days: number }
      pos: number | null
      trends: Array<{
        date: string
        pos: number | "Global"
        total_notifications: number
        successful_notifications: number
        failed_notifications: number
        success_rate: number
        avg_delay_minutes: number
        avg_delay_hours: number
        min_delay_minutes: number | null
        max_delay_minutes: number | null
        high_delay_rate: number
        total_delay_samples: number
        total_high_delays: number
      }>
    }
  }>(swrKey, fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const trends = data?.data?.trends ?? []
  const resolvedStartDate = externalStart ?? data?.data?.period?.startDate
  const resolvedEndDate = externalEnd ?? data?.data?.period?.endDate
  const parsedResolvedStart = parseDateString(resolvedStartDate)
  const parsedResolvedEnd = parseDateString(resolvedEndDate)

  const chartData = useMemo(
    () =>
      trends
        .map((point) => {
          const date = new Date(point.date)
          return {
            date: point.date,
            displayDate: format(date, "dd MMM"),
            tooltipDate: format(date, "dd MMM yyyy"),
            success_rate: Number(point.success_rate ?? 0),
            avg_delay_minutes: Number(point.avg_delay_minutes ?? 0),
            avg_delay_hours: Number(point.avg_delay_hours ?? 0),
            total_notifications: Number(point.total_notifications ?? 0),
          }
        })
        .reverse(),
    [trends],
  )

  const latest = trends[0]
  const successRateSummary = latest ? `${latest.success_rate.toFixed(2)}%` : "—"
  const avgDelaySummary = latest
    ? latest.avg_delay_minutes >= 60
      ? latest.avg_delay_minutes >= 1440
        ? `${(latest.avg_delay_minutes / 1440).toFixed(1)}d`
        : `${(latest.avg_delay_minutes / 60).toFixed(1)}h`
      : `${latest.avg_delay_minutes.toFixed(0)}m`
    : "—"

  const leftDomain = useMemo(() => {
    if (!chartData.length) return [0, 100] as [number, number]
    const values = chartData.map((d) => d.success_rate)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = Math.max(2, (max - min) * 0.1)
    return [Math.max(0, Math.floor(min - padding)), Math.min(100, Math.ceil(max + padding))] as [number, number]
  }, [chartData])

  const rightDomain = useMemo(() => {
    if (!chartData.length) return [0, 1] as [number, number]
    const values = chartData.map((d) => d.avg_delay_hours)
    const max = Math.max(...values, 0)
    return [0, max === 0 ? 1 : Math.ceil(max + max * 0.1)] as [number, number]
  }, [chartData])

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Notification Performance Trends</CardTitle>
              <CardDescription>
                Monitor success rate and delivery delays
                {parsedResolvedStart && parsedResolvedEnd
                  ? ` · ${format(parsedResolvedStart, "dd MMM yyyy")} - ${format(parsedResolvedEnd, "dd MMM yyyy")}`
                  : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{successRateSummary}</div>
              <div className="text-xs text-muted-foreground">Latest Success Rate</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{avgDelaySummary}</div>
              <div className="text-xs text-muted-foreground">Average Delay</div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <RefreshCw className={cn("h-4 w-4", isValidating && "animate-spin")} />
              {isValidating ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {!hideRangeSelect && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="trend-days" className="text-xs uppercase tracking-wide">
                Time Range
              </Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger id="trend-days">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isControlledPos && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="trend-pos" className="text-xs uppercase tracking-wide">
                Point of Sale
              </Label>
              <Select value={selectedPOS} onValueChange={setSelectedPOS}>
                <SelectTrigger id="trend-pos">
                  <SelectValue placeholder="Select POS" />
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

          {isControlledPos && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide">Point of Sale</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {selectedPOSLabel}
              </div>
            </div>
          )}

          {showDatePopover && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase tracking-wide">Custom Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      (!localRange.start || !localRange.end) && "text-muted-foreground",
                    )}
                  >
                    {localRange.start && localRange.end
                      ? `${format(localRange.start, "dd MMM yyyy")} - ${format(localRange.end, "dd MMM yyyy")}`
                      : parsedResolvedStart && parsedResolvedEnd
                        ? `${format(parsedResolvedStart, "dd MMM yyyy")} - ${format(parsedResolvedEnd, "dd MMM yyyy")}`
                        : "Pick a range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: localRange.start, to: localRange.end }}
                    onSelect={(range: DateRange | undefined) => {
                      const nextStart = range?.from ?? undefined
                      const nextEnd = range?.to ?? undefined
                      const normalized = {
                        start: nextStart && nextEnd && nextStart > nextEnd ? nextEnd : nextStart ?? undefined,
                        end: nextStart && nextEnd && nextStart > nextEnd ? nextStart : nextEnd ?? undefined,
                      }
                      setLocalRange(normalized)
                      if (normalized.start && normalized.end) {
                        const diffDays = Math.max(
                          1,
                          Math.ceil((normalized.end.getTime() - normalized.start.getTime()) / MS_IN_DAY),
                        )
                        setDays(diffDays.toString())
                        onDateChange?.({
                          startDate: format(normalized.start, "yyyy-MM-dd"),
                          endDate: format(normalized.end, "yyyy-MM-dd"),
                        })
                      } else {
                        setDays(defaultDays)
                        onDateChange?.(null)
                      }
                    }}
                    numberOfMonths={1}
                    defaultMonth={localRange.start ?? localRange.end ?? parsedResolvedStart ?? parsedResolvedEnd ?? new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm">Loading notification trends...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No trend data available for the selected filters.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[420px] w-full">
            <ComposedChart data={chartData} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={chartData.length > 14 ? Math.ceil(chartData.length / 14) : 0}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={leftDomain}
                tickCount={6}
                tickFormatter={(value) => `${Number(value ?? 0).toFixed(0)}%`}
                label={{ value: "Success Rate %", angle: -90, position: "insideLeft", fill: "currentColor" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={rightDomain}
                tickCount={6}
                tickFormatter={(value) => {
                  const val = Number(value ?? 0)
                  if (val >= 24) {
                    return `${(val / 24).toFixed(0)}d`
                  }
                  if (val >= 1) {
                    return `${val.toFixed(1)}h`
                  }
                  return `${Math.max(0, Math.round(val * 60))}m`
                }}
                label={{ value: "Average Delay", angle: 90, position: "insideRight", fill: "currentColor" }}
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value, payload) => {
                      const record = payload?.[0]?.payload as (typeof chartData)[number] | undefined
                      return record?.tooltipDate ?? String(value)
                    }}
                    formatter={(value, name) => {
                      if (name === "success_rate") {
                        return [`${Number(value).toFixed(2)}%`, "Success Rate"]
                      }
                      if (name === "avg_delay_hours") {
                        const hours = Number(value)
                        if (hours >= 24) {
                          return [`${(hours / 24).toFixed(1)} days`, "Avg Delay"]
                        }
                        if (hours >= 1) {
                          return [`${hours.toFixed(1)} hours`, "Avg Delay"]
                        }
                        return [`${(hours * 60).toFixed(0)} mins`, "Avg Delay"]
                      }
                      return [value ?? "—", name]
                    }}
                  />
                }
              />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="success_rate"
                stroke="hsl(150 70% 45%)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, stroke: "hsl(150 70% 45%)", fill: "var(--background)" }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(150 70% 45%)", fill: "var(--background)" }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="avg_delay_hours"
                stroke="var(--chart-delay)"
                fill="var(--chart-delay)"
                fillOpacity={0.15}
                strokeWidth={2.5}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
