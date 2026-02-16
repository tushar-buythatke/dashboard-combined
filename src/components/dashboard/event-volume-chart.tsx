"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Filter, TrendingUp, Calendar as CalendarIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { fetcher } from "@/lib/api"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"
import { PLATFORMS } from "@/services/apiService"

// All database events with better organization
const ALL_EVENTS = [
  // Core Alert Events
  { id: 1, name: 'PA_SET', displayName: 'Alerts Set', color: 'var(--chart-alerts-set)', category: 'alerts' },
  { id: 2, name: 'PA_REMOVE', displayName: 'Alerts Removed', color: 'var(--chart-alerts-removed)', category: 'alerts' },
  
  // Feed & Data Events  
  { id: 3, name: 'PA_SPIDY_FEED', displayName: 'Feed Updates', color: 'var(--chart-feed-updates)', category: 'data' },
  { id: 4, name: 'PA_SPIDY_RECEIVED', displayName: 'Feed Received', color: 'var(--chart-feed-received)', category: 'data' },
  { id: 21, name: 'PA_PRICE_UPDATED', displayName: 'Price Updates', color: 'var(--chart-price-updates)', category: 'data' },
  
  // Notification Success Events
  { id: 6, name: 'PA_PUSH_SUCCESS', displayName: 'Push Success', color: 'var(--chart-push-success)', category: 'success' },
  { id: 7, name: 'PA_EMAIL_SUCCESS', displayName: 'Email Success', color: 'var(--chart-email-success)', category: 'success' },
  
  // Error Events
  { id: 10, name: 'PA_PUSH_ERRORED', displayName: 'Push Errors', color: 'var(--chart-push-errors)', category: 'errors' },
  { id: 16, name: 'PA_EMAIL_ERRORED', displayName: 'Email Errors', color: 'var(--chart-email-errors)', category: 'errors' },
]

const EVENT_CATEGORIES = [
  { key: 'alerts', name: 'Alert Management', color: 'var(--chart-alerts-set)' },
  { key: 'data', name: 'Data & Feeds', color: 'var(--chart-feed-updates)' },
  { key: 'success', name: 'Notifications Sent', color: 'var(--chart-push-success)' },
  { key: 'errors', name: 'Notification Errors', color: 'var(--chart-push-errors)' },
]

const CATEGORY_SERIES_STYLE: Record<string, { strokeWidth: number; dotRadius: number; strokeDasharray?: string }> = {
  alerts: { strokeWidth: 2.5, dotRadius: 4 },
  data: { strokeWidth: 2.5, dotRadius: 4 },
  success: { strokeWidth: 3, dotRadius: 5 },
  errors: { strokeWidth: 3, dotRadius: 5, strokeDasharray: "8 4" },
}

const TOP_5_POS = [
  { id: 2, name: 'Flipkart' },
  { id: 63, name: 'Amazon' },
  { id: 111, name: 'Myntra' },
  { id: 2191, name: 'Ajio' },
  { id: 7376, name: 'Meesho' },
]

type EventRecord = {
  date: string
  event_id: number
  event_name: string
  platform?: number | null
  total_count?: number | null
}

type PosStatsResponse = {
  data?: {
    events?: EventRecord[]
  }
}

type AggregatedEventPoint = {
  timestamp: number
  date: string
  total: number
} & Record<string, number | string>

export function EventVolumeChart() {
  const [selectedPOS, setSelectedPOS] = useState<string>("2")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set(ALL_EVENTS.map(e => e.id)))
  const initialFrom = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date
  }, [])
  const initialTo = useMemo(() => new Date(), [])
  const [dateRange, setDateRange] = useState<DateRange>({ from: initialFrom, to: initialTo })

  const handleRangeSelect = (range?: DateRange) => {
    if (!range) {
      setDateRange({ from: undefined, to: undefined })
      return
    }
    const { from, to } = range
    if (from && to && from > to) {
      setDateRange({ from: to, to: from })
    } else {
      setDateRange({ from, to })
    }
  }

  const formatQueryDate = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined)
  const startDate = formatQueryDate(dateRange?.from)
  const endDate = formatQueryDate(dateRange?.to)

  const swrKey = startDate && endDate ? `/pa-dasher-api/stats/pos/${selectedPOS}?startDate=${startDate}&endDate=${endDate}` : null

  const { data, isLoading, mutate, isValidating } = useSWR<PosStatsResponse>(swrKey, fetcher, {
    refreshInterval: 60_000,
  })

  const events = data?.data?.events ?? []

  // Toggle event visibility
  const toggleEvent = (eventId: number) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  // Toggle all events in a category
  const toggleCategory = (category: string) => {
    const categoryEvents = ALL_EVENTS.filter((e) => e.category === category).map((e) => e.id)
    const allSelected = categoryEvents.every((id) => selectedEvents.has(id))

    setSelectedEvents((prev) => {
      const newSet = new Set(prev)
      if (allSelected) {
        categoryEvents.forEach((id) => newSet.delete(id))
      } else {
        categoryEvents.forEach((id) => newSet.add(id))
      }
      return newSet
    })
  }

  // Filter events by platform and selected events
  const filteredEventData = events.filter((event) => {
    if (!selectedEvents.has(event.event_id)) return false
    if (selectedPlatform !== 'all' && event.platform !== Number(selectedPlatform)) return false
    return true
  })

  // Group by date for line chart
  const chartData = filteredEventData.reduce<AggregatedEventPoint[]>((acc, event) => {
    const timestamp = new Date(event.date).getTime()
    const displayDate = new Date(event.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    let dateEntry = acc.find((d) => d.timestamp === timestamp)
    if (!dateEntry) {
      dateEntry = { timestamp, date: displayDate, total: 0 }
      acc.push(dateEntry)
    }

    const eventInfo = ALL_EVENTS.find((e) => e.id === event.event_id)
    if (eventInfo) {
      const current = Number(dateEntry[eventInfo.name] ?? 0)
      const increment = Number(event.total_count ?? 0)
      dateEntry[eventInfo.name] = current + increment
      dateEntry.total = (dateEntry.total ?? 0) + increment
    }

    return acc
  }, [])

  // Sort by date
  chartData.sort((a, b) => a.timestamp - b.timestamp)

  const totalVolume = filteredEventData.reduce((sum, e) => sum + Number(e.total_count ?? 0), 0)

  const paletteEvents = ALL_EVENTS.map((event, index) => ({
    ...event,
    color: event.color || `hsl(var(--chart-${(index % 5) + 1}))`,
  }))

  const lineChartConfig = useMemo(() => {
    return paletteEvents.reduce<ChartConfig>((acc, event) => {
      acc[event.name] = {
        label: event.displayName,
        color: event.color,
      }
      return acc
    }, {} as ChartConfig)
  }, [paletteEvents])

  const filteredEvents = useMemo(() => {
    return (selectedCategory === 'all'
      ? paletteEvents
      : paletteEvents.filter((event) => event.category === selectedCategory))
  }, [paletteEvents, selectedCategory])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            <div>
              <CardTitle>Event Volume Trends</CardTitle>
              <CardDescription>Track event patterns and activity over time</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold">{totalVolume.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Volume</div>
            </div>
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={!startDate || !endDate || isValidating}
              className="gap-2"
            >
              {isValidating ? "Fetching..." : "Fetch Data"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-3 pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pos-select" className="text-xs">
              <Filter className="w-3 h-3 inline mr-1" />
              Point of Sale
            </Label>
            <Select value={selectedPOS} onValueChange={setSelectedPOS}>
              <SelectTrigger id="pos-select">
                <SelectValue placeholder="Select POS" />
              </SelectTrigger>
              <SelectContent>
                {TOP_5_POS.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id.toString()}>
                    {pos.name} (POS {pos.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-xs flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Date Range
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    (!dateRange.from || !dateRange.to) && "text-muted-foreground",
                  )}
                >
                  {dateRange?.from && dateRange?.to ? (
                    `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                  ) : (
                    "Pick a range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  numberOfMonths={1}
                  defaultMonth={dateRange?.from ?? dateRange?.to ?? new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-select" className="text-xs">
              <Filter className="w-3 h-3 inline mr-1" />
              Event Category
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-select">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EVENT_CATEGORIES.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="platform-select" className="text-xs">
              <Filter className="w-3 h-3 inline mr-1" />
              Platform
            </Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger id="platform-select">
                <SelectValue placeholder="Select Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform.id} value={platform.id.toString()}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Event Toggles by Category */}
        <div className="space-y-4 pt-4">
          {EVENT_CATEGORIES.map((category) => {
            const categoryEvents = ALL_EVENTS.filter(
              (event) =>
                event.category === category.key &&
                (selectedCategory === 'all' || selectedCategory === category.key),
            )

            if (categoryEvents.length === 0) return null

            const allSelected = categoryEvents.every((event) => selectedEvents.has(event.id))

            return (
              <div key={category.key} className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCategory(category.key)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </span>
                  <Badge variant={allSelected ? "default" : "outline"}>
                    {categoryEvents.filter((event) => selectedEvents.has(event.id)).length}/{categoryEvents.length}
                  </Badge>
                </Button>

                <div className="flex flex-wrap gap-2 pl-5">
                  {categoryEvents.map((event) => (
                    <Button
                      key={event.id}
                      variant={selectedEvents.has(event.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleEvent(event.id)}
                      className="text-xs"
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ backgroundColor: event.color }}
                      />
                      {event.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading event trends...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No data available for selected filters</p>
          </div>
        ) : (
          <ChartContainer config={lineChartConfig} className="h-[460px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
                  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
                  return value.toString()
                }}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value) =>
                      typeof value === 'number'
                        ? format(new Date(value), 'dd MMM yyyy')
                        : value
                    }
                  />
                }
              />

              {filteredEvents
                .filter((event) => selectedEvents.has(event.id))
                .map((event) => (
                  <Line
                    key={event.id}
                    type="monotone"
                    dataKey={event.name}
                    stroke={event.color}
                    strokeWidth={CATEGORY_SERIES_STYLE[event.category]?.strokeWidth ?? 2.5}
                    strokeDasharray={CATEGORY_SERIES_STYLE[event.category]?.strokeDasharray}
                    dot={{
                      r: (CATEGORY_SERIES_STYLE[event.category]?.dotRadius ?? 4) + 1,
                      stroke: event.color,
                      strokeWidth: 1.5,
                      fill: 'var(--background)',
                    }}
                    activeDot={{
                      r: (CATEGORY_SERIES_STYLE[event.category]?.dotRadius ?? 4) + 3,
                      stroke: event.color,
                      strokeWidth: 2,
                      fill: 'var(--background)',
                    }}
                    name={event.displayName}
                    connectNulls={false}
                  />
                ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
