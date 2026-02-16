import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Smartphone,
  Monitor,
  TrendingUp,
  Filter,
  ArrowUpRight,
  AlertTriangle,
  Clock3,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
} from 'lucide-react'

import {
  computeNotificationStats,
  parseNumber,
  type NotificationAggregate,
  type NotificationBreakdownEntry,
  type NotificationSummaryData,
} from '@/components/analytics/utils/notificationStats'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PLATFORMS as CENTRAL_PLATFORMS } from '@/services/apiService'

const PLATFORM_UI: Record<number, { color: string; icon: LucideIcon }> = {
  0: { color: '#8b5cf6', icon: Monitor },
  1: { color: '#22c55e', icon: Smartphone },
  2: { color: '#3b82f6', icon: Smartphone },
}

const PLATFORMS = CENTRAL_PLATFORMS.map(p => ({
  ...p,
  color: PLATFORM_UI[p.id]?.color || '#94a3b8',
  icon: PLATFORM_UI[p.id]?.icon || Monitor
}))

type NotificationSummaryProps = {
  summaryData: NotificationSummaryData
  isLoading: boolean
  error?: unknown
  selectedPOS: string
  onSelectedPOSChange: (value: string) => void
}

export default function NotificationSummary({
  summaryData,
  isLoading,
  error,
  selectedPOS,
  onSelectedPOSChange,
}: NotificationSummaryProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<number | 'all'>('all')

  const breakdown = useMemo<NotificationBreakdownEntry[]>(
    () => summaryData?.breakdown ?? [],
    [summaryData],
  )

  const filteredData = useMemo<NotificationBreakdownEntry[]>(() => {
    return breakdown.filter((item) => {
      if (selectedPOS !== 'all' && String(item.pos) !== selectedPOS) return false
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) return false
      return true
    })
  }, [breakdown, selectedPOS, selectedPlatform])

  const overallStats = useMemo<NotificationAggregate>(
    () => computeNotificationStats(filteredData),
    [filteredData],
  )
  const overallSuccessRate = overallStats.total_notifications > 0 ? (overallStats.total_success / overallStats.total_notifications) * 100 : 0
  const overallErrorRate = overallStats.total_notifications > 0 ? (overallStats.total_errors / overallStats.total_notifications) * 100 : 0
  const overallAvgDelay = overallStats.total_notifications > 0 ? overallStats.total_delay / overallStats.total_notifications : 0
  const platformLookup = useMemo(() => {
    return PLATFORMS.reduce((acc, platform) => {
      acc[platform.id] = platform
      return acc
    }, {} as Record<number, (typeof PLATFORMS)[number]>)
  }, [])

  type PlatformPerformance = Record<
    number,
    {
      platform: number
      notifications: number
      success: number
      errors: number
      delayTotal: number
    }
  >

  const platformPerformance = useMemo<PlatformPerformance>(() => {
    return filteredData.reduce<PlatformPerformance>((acc, item) => {
      const platformId = Number(item.platform)
      const totalNotifications = parseNumber(item.total_notifications)
      const directSuccess = parseNumber(item.successful_notifications)
      const fallbackSuccess =
        parseNumber(item.android?.success) +
        parseNumber(item.chrome?.success) +
        parseNumber(item.email?.success)
      const successfulNotifications = directSuccess || fallbackSuccess
      const directFailures = parseNumber(item.failed_notifications)
      const fallbackFailures =
        parseNumber(item.android?.errors) +
        parseNumber(item.chrome?.errors) +
        parseNumber(item.email?.errors)
      const failedNotifications = directFailures || fallbackFailures
      const avgDelayHours =
        parseNumber(item.avg_delay_hours) || parseNumber(item.avg_delay_minutes) / 60 || 0

      if (!acc[platformId]) {
        acc[platformId] = {
          platform: platformId,
          notifications: 0,
          success: 0,
          errors: 0,
          delayTotal: 0,
        }
      }

      const entry = acc[platformId]
      entry.notifications += totalNotifications
      entry.success += successfulNotifications
      entry.errors += failedNotifications
      entry.delayTotal += avgDelayHours * totalNotifications

      return acc
    }, {})
  }, [filteredData])

  type PosPlatformStats = {
    notifications: number
    success: number
    errors: number
  }

  type PosPerformanceEntry = {
    pos: string
    label: string
    total: number
    success: number
    errors: number
    delayTotal: number
    platforms: Record<number, PosPlatformStats>
  }

  const posPerformance = useMemo<Record<string, PosPerformanceEntry>>(() => {
    return filteredData.reduce<Record<string, PosPerformanceEntry>>((acc, item) => {
      const posKey = String(item.pos)
      const totalNotifications = parseNumber(item.total_notifications)
      const directSuccess = parseNumber(item.successful_notifications)
      const fallbackSuccess =
        parseNumber(item.android?.success) +
        parseNumber(item.chrome?.success) +
        parseNumber(item.email?.success)
      const successfulNotifications = directSuccess || fallbackSuccess
      const directFailures = parseNumber(item.failed_notifications)
      const fallbackFailures =
        parseNumber(item.android?.errors) +
        parseNumber(item.chrome?.errors) +
        parseNumber(item.email?.errors)
      const failedNotifications = directFailures || fallbackFailures
      const avgDelayHours =
        parseNumber(item.avg_delay_hours) || parseNumber(item.avg_delay_minutes) / 60 || 0

      if (!acc[posKey]) {
        acc[posKey] = {
          pos: posKey,
          label: item.pos_name || `POS ${item.pos}`,
          total: 0,
          success: 0,
          errors: 0,
          delayTotal: 0,
          platforms: {},
        }
      }

      const entry = acc[posKey]
      entry.total += totalNotifications
      entry.success += successfulNotifications
      entry.errors += failedNotifications
      entry.delayTotal += avgDelayHours * totalNotifications

      const platformId = Number(item.platform)
      if (!entry.platforms[platformId]) {
        entry.platforms[platformId] = { notifications: 0, success: 0, errors: 0 }
      }

      entry.platforms[platformId].notifications += totalNotifications
      entry.platforms[platformId].success += successfulNotifications
      entry.platforms[platformId].errors += failedNotifications

      return acc
    }, {})
  }, [filteredData])

  const posOptions = useMemo(() => {
    const registry = new Map<string, string>()
    breakdown.forEach((item) => {
      const key = String(item.pos)
      if (!registry.has(key)) {
        registry.set(key, item.pos_name || `POS ${item.pos}`)
      }
    })
    return Array.from(registry.entries()).map(([value, label]) => ({ value, label }))
  }, [breakdown])

  const platformOptions = useMemo(() => {
    const registry = new Map<number, string>()
    breakdown.forEach((item) => {
      const platformId = Number(item.platform)
      const label = item.platform_name || platformLookup[platformId]?.name || `Platform ${platformId}`
      if (!registry.has(platformId)) {
        registry.set(platformId, label)
      }
    })
    return Array.from(registry.entries()).map(([value, label]) => ({ value, label }))
  }, [breakdown, platformLookup])

  const [availableBreakdownPos, setAvailableBreakdownPos] = useState<string[]>([])
  const [selectedBreakdownPos, setSelectedBreakdownPos] = useState<string[]>([])

  useEffect(() => {
    const available = Array.from(new Set(filteredData.map((item) => String(item.pos))))
    setAvailableBreakdownPos(available)
    setSelectedBreakdownPos((prev) => {
      if (prev.length === 0) return available
      const next = prev.filter((pos) => available.includes(pos))
      if (next.length === 0) return available
      return next
    })
  }, [filteredData])

  const toggleBreakdownPos = (pos: string) => {
    setSelectedBreakdownPos((prev) => {
      const isSelected = prev.includes(pos)
      if (isSelected) {
        const next = prev.filter((item) => item !== pos)
        return next.length > 0 ? next : availableBreakdownPos
      }
      return [...prev, pos]
    })
  }

  const selectAllBreakdownPos = () => setSelectedBreakdownPos(availableBreakdownPos)

  const breakdownData = useMemo(
    () =>
      filteredData.filter((item) =>
        selectedBreakdownPos.length === 0 ? true : selectedBreakdownPos.includes(String(item.pos)),
      ),
    [filteredData, selectedBreakdownPos],
  )

  let content: ReactNode

  if (isLoading) {
    content = (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-muted/60 py-12 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/60 border-t-transparent"></div>
        <span>Loading notification summary…</span>
      </div>
    )
  } else if (error) {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-10 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load notification data</p>
        <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
      </div>
    )
  } else if (filteredData.length === 0) {
    content = (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/60 py-12 text-sm text-muted-foreground">
        <span>No data available for the selected filters.</span>
      </div>
    )
  } else {
    const platformInsights = Object.values(platformPerformance).map((entry) => {
      const successRate = entry.notifications > 0 ? (entry.success / entry.notifications) * 100 : 0
      const avgDelay = entry.notifications > 0 ? entry.delayTotal / entry.notifications : 0
      return {
        ...entry,
        successRate,
        avgDelay,
      }
    })

    const posInsights = Object.values(posPerformance).map((entry) => {
      const avgDelay = entry.total > 0 ? entry.delayTotal / entry.total : 0
      const successRate = entry.total > 0 ? (entry.success / entry.total) * 100 : 0
      return {
        ...entry,
        avgDelay,
        successRate,
      }
    })

    const topPlatform = [...platformInsights].sort((a, b) => b.successRate - a.successRate)[0]
    const riskiestPlatform = [...platformInsights].sort((a, b) => b.avgDelay - a.avgDelay)[0]
    const highestVolumePos = [...posInsights].sort((a, b) => b.total - a.total)[0]
    const slowestPos = [...posInsights].sort((a, b) => b.avgDelay - a.avgDelay)[0]
    const riskiestPos = [...posInsights].sort((a, b) => b.errors - a.errors)[0]

    const successPercentage = Number.isFinite(overallSuccessRate) ? Math.min(100, Math.max(0, overallSuccessRate)) : 0
    const errorPercentage = Number.isFinite(overallErrorRate) ? Math.min(100, Math.max(0, overallErrorRate)) : 0
    const remainingPercentage = Math.max(0, 100 - (successPercentage + errorPercentage))

    const insights = (
      [
        topPlatform && {
          title: 'Top Platform',
          value: platformLookup[topPlatform.platform]?.name || `Platform ${topPlatform.platform}`,
          description: `${topPlatform.successRate.toFixed(1)}% success · ${topPlatform.notifications.toLocaleString()} alerts`,
          icon: ArrowUpRight,
          tone: 'emerald' as const,
        },
        highestVolumePos && {
          title: 'Highest Volume POS',
          value: `POS ${highestVolumePos.pos}`,
          description: `${highestVolumePos.total.toLocaleString()} notifications · ${highestVolumePos.successRate.toFixed(1)}% success`,
          icon: TrendingUp,
          tone: 'purple' as const,
        },
        slowestPos && slowestPos.avgDelay > 0 && {
          title: 'Slowest Delivery',
          value: `POS ${slowestPos.pos}`,
          description:
            slowestPos.avgDelay < 1
              ? `${(slowestPos.avgDelay * 60).toFixed(0)}m average delay`
              : `${slowestPos.avgDelay.toFixed(1)}h average delay`,
          icon: Clock3,
          tone: 'amber' as const,
        },
        riskiestPos && riskiestPos.errors > 0 && {
          title: 'Highest Failure Volume',
          value: `POS ${riskiestPos.pos}`,
          description: `${riskiestPos.errors.toLocaleString()} failed alerts across all platforms`,
          icon: AlertTriangle,
          tone: 'red' as const,
        },
        riskiestPlatform && {
          title: 'Slowest Platform',
          value: platformLookup[riskiestPlatform.platform]?.name || `Platform ${riskiestPlatform.platform}`,
          description:
            riskiestPlatform.avgDelay < 1
              ? `${(riskiestPlatform.avgDelay * 60).toFixed(0)}m average delay`
              : `${riskiestPlatform.avgDelay.toFixed(1)}h average delay`,
          icon: Clock3,
          tone: 'sky' as const,
        },
      ].filter(Boolean) as Insight[]
    ).slice(0, 4)

    content = (
      <div className="space-y-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Notifications"
            value={overallStats.total_notifications.toLocaleString()}
            icon={BarChart3}
            color="text-primary"
          />
          <SummaryCard
            title="Success Rate"
            value={`${overallSuccessRate.toFixed(1)}%`}
            icon={CheckCircle2}
            color="text-emerald-500"
          />
          <SummaryCard
            title="Total Errors"
            value={overallStats.total_errors.toLocaleString()}
            icon={XCircle}
            color="text-destructive"
          />
          <SummaryCard
            title="Avg Delay"
            value={overallAvgDelay < 1 ? `${Math.round(overallAvgDelay * 60)}m` : `${overallAvgDelay.toFixed(1)}h`}
            icon={Clock}
            color="text-amber-500"
          />
        </div>

        {/* Success vs Failure Split & Insights */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/60 p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Delivery health</span>
              <span className="font-mono text-[10px]">Last 7 days</span>
            </div>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300"
                style={{ width: `${successPercentage}%` }}
              ></div>
              <div
                className="h-full bg-gradient-to-r from-red-500 via-red-400 to-red-300"
                style={{ width: `${errorPercentage}%`, marginLeft: `${successPercentage}%` }}
              ></div>
              {remainingPercentage > 0 && (
                <div
                  className="h-full bg-border/60"
                  style={{ width: `${remainingPercentage}%`, marginLeft: `${successPercentage + errorPercentage}%` }}
                ></div>
              )}
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{overallStats.total_success.toLocaleString()} delivered</p>
                <p>{successPercentage.toFixed(1)}% success</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-medium text-destructive">{overallStats.total_errors.toLocaleString()} failed</p>
                <p>{errorPercentage.toFixed(1)}% errors</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
              <p>
                Average delay{' '}
                <span className="font-medium text-foreground">
                  {overallAvgDelay < 1 ? `${(overallAvgDelay * 60).toFixed(0)} minutes` : `${overallAvgDelay.toFixed(1)} hours`}
                </span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <InsightCard key={`${insight.title}-${insight.value}`} {...insight} />
              ))
            ) : (
              <div className="sm:col-span-2 flex items-center justify-center rounded-xl border border-dashed border-neutral-700/40 bg-neutral-800/20 py-10 text-sm text-neutral-500">
                No notable insights for the current filters.
              </div>
            )}
          </div>
        </div>

        {/* Compact POS Overview */}
        <div className="rounded-xl border border-border/60 bg-background">
          <div className="px-6 py-5 border-b border-border/60">
            <h4 className="text-base font-semibold text-foreground">Top POS Performance</h4>
            <p className="mt-1 text-xs text-muted-foreground">Platform breakdown by volume.</p>
          </div>
          <div className="divide-y divide-border/40">
            {Object.values(posPerformance)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((posData) => (
                <div key={posData.pos} className="p-6 transition-colors hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md border border-border/80 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        POS {posData.pos}
                      </span>
                      <span className="text-sm text-muted-foreground">{posData.total.toLocaleString()} notifications</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {posData.total > 0 ? ((posData.success / posData.total) * 100).toFixed(1) : '0.0'}%
                      </span>
                      <span>success • {posData.errors.toLocaleString()} failures</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {Object.entries(posData.platforms).map(([platformId, stats]) => {
                      const numericPlatformId = Number(platformId)
                      const platform = platformLookup[numericPlatformId]
                      const platformName = platform?.name || 'Unknown'
                      const successRate = stats.notifications > 0 ? (stats.success / stats.notifications) * 100 : 0

                      return (
                        <div
                          key={platformId}
                          className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <span
                                className={cn('h-2 w-2 rounded-full', {
                                  'bg-blue-400': numericPlatformId === 0,
                                  'bg-green-400': numericPlatformId === 1,
                                  'bg-purple-400': numericPlatformId === 2,
                                })}
                              />
                              {platform && <platform.icon className="h-4 w-4" style={{ color: platform.color }} />}
                              <span>{platformName}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {stats.notifications.toLocaleString()} alerts
                            </span>
                          </div>
                          <div
                            className={cn('mt-2 text-xs font-semibold', {
                              'text-emerald-500': successRate >= 90,
                              'text-amber-500': successRate >= 70 && successRate < 90,
                              'text-destructive': successRate < 70,
                            })}
                          >
                            {successRate.toFixed(1)}% success
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="rounded-xl border border-border/60 bg-background">
          <div className="px-6 py-5 border-b border-border/60">
            <h4 className="text-base font-semibold text-foreground">Performance Breakdown</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Top 10 POS systems by notification volume, showing delivery success rates across platforms.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span>Extension (Chrome)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <span>Android App</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                <span>iOS App</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter POS</span>
              <span className="text-[11px] text-muted-foreground">
                {selectedBreakdownPos.length === availableBreakdownPos.length
                  ? 'All systems selected'
                  : `${selectedBreakdownPos.length} of ${availableBreakdownPos.length} selected`}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedBreakdownPos.length === availableBreakdownPos.length ? 'secondary' : 'outline'}
                  className="h-7 rounded-full px-3 text-[11px] font-semibold"
                  onClick={selectAllBreakdownPos}
                >
                  {selectedBreakdownPos.length === availableBreakdownPos.length && (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  )}
                  All
                </Button>
                {availableBreakdownPos.map((posId) => {
                  const active = selectedBreakdownPos.includes(posId)

                  return (
                    <Button
                      key={posId}
                      type="button"
                      size="sm"
                      variant={active ? 'secondary' : 'outline'}
                      className={cn(
                        'h-7 rounded-full px-3 text-[11px] font-semibold transition-colors',
                        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                      )}
                      onClick={() => toggleBreakdownPos(posId)}
                    >
                      {active && <Check className="mr-1 h-3.5 w-3.5" />}
                      POS {posId}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 text-left">POS System</th>
                  <th className="px-6 py-4 text-left">Platform</th>
                  <th className="px-6 py-4 text-right">
                    <div>Total Alerts</div>
                    <div className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">Generated</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div>Delivered</div>
                    <div className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">Successfully</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div>Failed</div>
                    <div className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">Delivery errors</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div>Success Rate</div>
                    <div className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">Delivery %</div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <div>Avg Delay</div>
                    <div className="mt-1 text-[10px] font-normal normal-case text-muted-foreground">Hours</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdownData.slice(0, 10).map((item, index) => {
                  const totalNotifications = parseNumber(item.total_notifications)
                  const directSuccess = parseNumber(item.successful_notifications)
                  const fallbackSuccess =
                    parseNumber(item.android?.success) +
                    parseNumber(item.chrome?.success) +
                    parseNumber(item.email?.success)
                  const successfulNotifications = directSuccess || fallbackSuccess
                  const directFailures = parseNumber(item.failed_notifications)
                  const fallbackFailures =
                    parseNumber(item.android?.errors) +
                    parseNumber(item.chrome?.errors) +
                    parseNumber(item.email?.errors)
                  const failedNotifications = directFailures || fallbackFailures
                  const successRate = item.success_rate || item.android?.success_rate || 0
                  const avgDelayHours = parseNumber(item.avg_delay_hours)
                  const avgDelay = avgDelayHours || parseNumber(item.avg_delay_minutes) / 60 || 0

                  return (
                    <tr
                      key={`${item.pos}-${item.platform}-${index}`}
                      className="border-b border-border/40 transition-colors hover:bg-background/70"
                    >
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <span className="rounded bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">POS {item.pos}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.platform === 0 ? 'bg-blue-400' : item.platform === 1 ? 'bg-green-400' : 'bg-purple-400'
                            }`}
                          ></div>
                          {item.platform_name || platformLookup[item.platform]?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-muted-foreground">
                        {totalNotifications.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-emerald-400">
                        {successfulNotifications.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-destructive">
                        {failedNotifications.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-center">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
                            successRate >= 90
                              ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/25 text-emerald-100 border border-emerald-400/50 shadow-emerald-500/30'
                              : successRate >= 70
                            ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/25 text-yellow-100 border border-yellow-400/50 shadow-yellow-500/30'
                            : 'bg-gradient-to-br from-red-500/30 to-red-600/25 text-red-100 border border-red-400/50 shadow-red-500/30'
                          }`}
                        >
                          {successRate.toFixed(1)}%
                        </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-muted-foreground">
                        <span className="text-xs">
                          {avgDelay < 1 ? `${(avgDelay * 60).toFixed(0)}m` : `${avgDelay.toFixed(1)}h`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border border-border/60 bg-card/80 shadow-xl">
      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold">Notification Performance</CardTitle>
              <CardDescription>Real-time delivery metrics across POS and channels.</CardDescription>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Last 7 Days
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Point of Sale
            </label>
            <Select value={selectedPOS} onValueChange={onSelectedPOSChange}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-background/80 text-sm">
                <SelectValue placeholder="All POS Systems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All POS Systems</SelectItem>
                {posOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary" />
              Delivery Platform
            </label>
            <Select
              value={selectedPlatform === 'all' ? 'all' : String(selectedPlatform)}
              onValueChange={(value) => setSelectedPlatform(value === 'all' ? 'all' : Number(value))}
            >
              <SelectTrigger className="h-11 rounded-xl border-border bg-background/80 text-sm">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platformOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 pt-0">{content}</CardContent>
    </Card>
  )
}

export function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: LucideIcon
  color: string
}) {
  const Icon = icon

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-5 shadow-sm">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="rounded-md bg-muted/70 p-1 text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${color}`}>{value}</div>
    </div>
  )
}

type InsightTone = 'emerald' | 'purple' | 'amber' | 'red' | 'sky'

type Insight = {
  title: string
  value: string
  description: string
  icon: LucideIcon
  tone: InsightTone
}

type InsightCardProps = Insight

const toneStyles: Record<InsightTone, { icon: string; badge: string; border: string; text: string }> = {
  emerald: {
    icon: 'text-emerald-500 bg-emerald-500/10',
    badge: 'bg-emerald-500/10 text-emerald-600',
    border: 'border-emerald-500/20',
    text: 'text-emerald-700',
  },
  purple: {
    icon: 'text-purple-500 bg-purple-500/10',
    badge: 'bg-purple-500/10 text-purple-600',
    border: 'border-purple-500/20',
    text: 'text-purple-700',
  },
  amber: {
    icon: 'text-amber-500 bg-amber-500/10',
    badge: 'bg-amber-500/10 text-amber-600',
    border: 'border-amber-500/20',
    text: 'text-amber-700',
  },
  red: {
    icon: 'text-red-500 bg-red-500/10',
    badge: 'bg-red-500/10 text-red-600',
    border: 'border-red-500/20',
    text: 'text-red-700',
  },
  sky: {
    icon: 'text-sky-500 bg-sky-500/10',
    badge: 'bg-sky-500/10 text-sky-600',
    border: 'border-sky-500/20',
    text: 'text-sky-700',
  },
}

function InsightCard({ title, value, description, icon: Icon, tone }: InsightCardProps) {
  const styles = toneStyles[tone]

  return (
    <div className={`flex flex-col gap-3 rounded-xl border ${styles.border} bg-background/80 p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${styles.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}>
          {title}
        </span>
      </div>
      <div className={`text-lg font-semibold ${styles.text}`}>{value}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
