import React, { useState } from 'react';
import {
    Clock,
    Activity,
    CheckCircle2,
    Flame,
    Hash,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell, ReferenceLine } from 'recharts';
import { InfoTooltip } from '../components/InfoTooltip';
import type { EventKeyInfo } from './types';
import type { EventConfig } from '@/types/analytics';

interface HourlyStatsCardProps {
    graphData: any[];
    isHourly: boolean;
    eventKeys?: EventKeyInfo[];
    events?: EventConfig[];
}

export const HourlyStatsCard = React.memo(({ graphData, isHourly, eventKeys = [], events = [] }: HourlyStatsCardProps) => {
    const { t: themeClasses } = useAccentTheme();
    const [selectedHour, setSelectedHour] = useState(new Date().getHours());
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

    if (!isHourly || !graphData || graphData.length === 0) return null;

    const activeEventKey = selectedEventKey;
    const selectedEventInfo = eventKeys.find(ek => ek.eventKey === activeEventKey);
    const isAvgEvent = selectedEventInfo?.isAvgEvent === 1;
    const selectedEventConfig = events.find(e => String(e.eventId) === selectedEventInfo?.eventId);
    const isPriceAlert = selectedEventConfig?.feature === 1;

    const hourlyStats = new Map<number, { total: number; success: number; fail: number; count: number; dates: string[]; avgDelay: number; delayCount: number }>();

    graphData.forEach((item: any) => {
        let hour = 0;
        if (item.timestamp) {
            const recordDate = new Date(item.timestamp);
            hour = recordDate.getHours();
        } else {
            const dateStr = item.date || '';
            const amPmMatch = dateStr.match(/(\d{1,2})\s*(AM|PM)/i);
            if (amPmMatch) {
                hour = parseInt(amPmMatch[1]);
                if (amPmMatch[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (amPmMatch[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
            } else {
                const timeMatch = dateStr.match(/(\d{1,2}):\d{2}/);
                if (timeMatch) hour = parseInt(timeMatch[1]);
            }
        }
        const existing = hourlyStats.get(hour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };
        let itemTotal = 0, itemSuccess = 0, itemFail = 0, itemDelay = 0;
        if (activeEventKey) {
            itemTotal = item[`${activeEventKey}_count`] || 0;
            itemSuccess = item[`${activeEventKey}_success`] || 0;
            itemFail = item[`${activeEventKey}_fail`] || 0;
            itemDelay = item[`${activeEventKey}_avgDelay`] || 0;
        } else {
            itemTotal = item.count || 0;
            itemSuccess = item.successCount || 0;
            itemFail = item.failCount || 0;
        }
        hourlyStats.set(hour, {
            total: existing.total + itemTotal,
            success: existing.success + itemSuccess,
            fail: existing.fail + itemFail,
            count: existing.count + 1,
            dates: [...existing.dates, item.date || ''],
            avgDelay: existing.avgDelay + itemDelay,
            delayCount: existing.delayCount + (itemDelay > 0 ? 1 : 0)
        });
    });

    const availableHours = Array.from(hourlyStats.keys()).sort((a, b) => a - b);
    let overallTotal = 0, overallSuccess = 0, overallDelay = 0, delayCount = 0;
    if (activeEventKey) {
        graphData.forEach((d: any) => {
            overallTotal += d[`${activeEventKey}_count`] || 0;
            overallSuccess += d[`${activeEventKey}_success`] || 0;
            const delay = d[`${activeEventKey}_avgDelay`] || 0;
            if (delay > 0) {
                overallDelay += delay;
                delayCount++;
            }
        });
    } else {
        overallTotal = graphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
        overallSuccess = graphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
    }
    const overallSuccessRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;
    const overallAvgDelay = delayCount > 0 ? overallDelay / delayCount : 0;

    const formatDelay = (delayValue: number) => {
        if (!delayValue || delayValue <= 0) return '0';
        if (isPriceAlert) {
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}h`;
            return `${delayValue.toFixed(1)}m`;
        } else {
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}m`;
            return `${delayValue.toFixed(1)}s`;
        }
    };

    let peakHour = 0, peakTotal = 0, lowestHour = 0, lowestTotal = Infinity;
    hourlyStats.forEach((stats, hour) => {
        const metric = isAvgEvent ? (stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0) : stats.total;
        if (metric > peakTotal) { peakTotal = metric; peakHour = hour; }
        if (metric < lowestTotal && metric > 0) { lowestTotal = metric; lowestHour = hour; }
    });

    const selectedStats = hourlyStats.get(selectedHour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };
    const selectedAvgDelay = selectedStats.delayCount > 0 ? selectedStats.avgDelay / selectedStats.delayCount : 0;
    const avgPerHour = isAvgEvent ? overallAvgDelay : (overallTotal / Math.max(availableHours.length, 1));
    const selectedMetric = isAvgEvent ? selectedAvgDelay : selectedStats.total;
    const selectedVsAvg = avgPerHour > 0 ? ((selectedMetric - avgPerHour) / avgPerHour) * 100 : 0;
    const selectedSuccessRate = selectedStats.total > 0 ? (selectedStats.success / selectedStats.total) * 100 : 0;
    const avgPerDataPoint = selectedStats.count > 0 ? selectedStats.total / selectedStats.count : 0;

    const midpoint = Math.floor(availableHours.length / 2);
    const firstHalfTotal = availableHours.slice(0, midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const secondHalfTotal = availableHours.slice(midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const trendDirection = secondHalfTotal > firstHalfTotal ? 'up' : secondHalfTotal < firstHalfTotal ? 'down' : 'stable';

    const navigateHour = (direction: number) => {
        const currentIndex = availableHours.indexOf(selectedHour);
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = availableHours.length - 1;
        if (newIndex >= availableHours.length) newIndex = 0;
        setSelectedHour(availableHours[newIndex]);
    };

    const formatHour = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:00 ${period}`;
    };

    const formatHourShort = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${period}`;
    };

    return (
        <EnhancedCard
            variant="glass"
            glow={true}
            className={cn("rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border", themeClasses.borderAccent, themeClasses.borderAccentDark, themeClasses.cardAccentBg, themeClasses.cardAccentBgDark)}
        >
            <CardHeader className="pb-3 px-3 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                Hourly Insights
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-normal">
                                    {availableHours.length} hours tracked
                                </span>
                            </CardTitle>
                            <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
                                {selectedEventKey
                                    ? `Showing data for: ${eventKeys.find(e => e.eventKey === selectedEventKey)?.eventName || selectedEventKey}`
                                    : 'Analyze event distribution across different hours of the day'}
                            </div>
                        </div>
                    </div>
                    {eventKeys.length > 0 && (
                        <div className="flex items-center w-full sm:w-auto">
                            {eventKeys.length <= 3 ? (
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-0.5 w-full sm:w-auto">
                                    {eventKeys.map((eventKeyInfo, index) => {
                                        const isSelected = selectedEventKey === eventKeyInfo.eventKey || (selectedEventKey === null && index === 0);
                                        if (selectedEventKey === null && index === 0) {
                                            setTimeout(() => setSelectedEventKey(eventKeyInfo.eventKey), 0);
                                        }
                                        return (
                                            <button
                                                key={eventKeyInfo.eventKey}
                                                onClick={() => setSelectedEventKey(eventKeyInfo.eventKey)}
                                                className={cn(
                                                    "flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-medium rounded-full transition-all duration-200 text-center",
                                                    isSelected
                                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                                                )}
                                            >
                                                {eventKeyInfo.eventName}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Select
                                    value={selectedEventKey || eventKeys[0]?.eventKey || ''}
                                    onValueChange={(value) => setSelectedEventKey(value)}
                                >
                                    <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-500/30">
                                        <SelectValue placeholder="Select event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventKeys.map((eventKeyInfo) => (
                                            <SelectItem key={eventKeyInfo.eventKey} value={eventKeyInfo.eventKey} className="text-xs">
                                                {eventKeyInfo.eventName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/50 dark:border-blue-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Activity className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase flex items-center gap-1">
                                {isAvgEvent ? 'Avg Delay' : 'Total Events'}
                                <InfoTooltip content={isAvgEvent ? "Average processing time for events during this period." : "Total number of events recorded across all selected filters."} />
                            </span>
                        </div>
                        <div className="text-base md:text-lg font-bold text-blue-600">
                            {isAvgEvent ? formatDelay(overallAvgDelay) : overallTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{selectedEventKey ? eventKeys.find(e => e.eventKey === selectedEventKey)?.eventName : 'All events'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-200/50 dark:border-emerald-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase flex items-center gap-1">
                                Success Rate
                                <InfoTooltip content="Percentage of events that completed successfully without errors." />
                            </span>
                        </div>
                        <div className="text-lg font-bold text-emerald-600">{overallSuccessRate.toFixed(1)}%</div>
                        <div className="text-[10px] text-muted-foreground">{overallSuccess.toLocaleString()} succeeded</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/50 dark:border-amber-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Flame className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase flex items-center gap-1">
                                {isAvgEvent ? 'Peak Delay Hour' : 'Peak Hour'}
                                <InfoTooltip content={isAvgEvent ? "The hour with the highest average processing delay." : "The hour with the highest volume of events."} />
                            </span>
                        </div>
                        <div className="text-lg font-bold text-amber-600">{formatHourShort(peakHour)}</div>
                        <div className="text-[10px] text-muted-foreground">
                            {isAvgEvent ? formatDelay(peakTotal) : `${Math.round(peakTotal).toLocaleString()} events`}
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/5 border border-gray-200/50 dark:border-gray-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Hash className="h-3 w-3 text-gray-500" />
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium uppercase flex items-center gap-1">
                                {isAvgEvent ? 'Avg Delay/Hour' : 'Avg/Hour'}
                                <InfoTooltip content={isAvgEvent ? "The historical average delay calculated across all tracked hours." : "Average number of events per hour across the selected time range."} />
                            </span>
                        </div>
                        <div className="text-lg font-bold text-gray-600">
                            {isAvgEvent ? formatDelay(avgPerHour) : Math.round(avgPerHour).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {isAvgEvent ? 'Delay per hour' : 'Events per hour'}
                        </div>
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-500" />
                            <span className="text-xs font-semibold text-foreground">Hour Distribution</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-medium">Click bars</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></div>
                                <span className="text-[10px] text-muted-foreground">Selected</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div>
                                <span className="text-[10px] text-muted-foreground">Peak</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-24 md:h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={availableHours.map(hour => {
                                    const stats = hourlyStats.get(hour);
                                    const hourAvgDelay = stats && stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0;
                                    return {
                                        hour,
                                        label: formatHourShort(hour),
                                        total: stats?.total || 0,
                                        success: stats?.success || 0,
                                        fail: stats?.fail || 0,
                                        avgDelay: hourAvgDelay,
                                        avgLine: isAvgEvent ? overallAvgDelay : avgPerHour,
                                        isSelected: hour === selectedHour,
                                        isPeak: hour === peakHour
                                    };
                                })}
                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                onClick={(data: any) => {
                                    if (data?.activePayload?.[0]?.payload?.hour !== undefined) {
                                        setSelectedHour(data.activePayload[0].payload.hour);
                                    }
                                }}
                            >
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 9, fill: 'currentColor' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                                    interval={availableHours.length > 18 ? 2 : availableHours.length > 12 ? 1 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: 'currentColor' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => {
                                        if (isAvgEvent) {
                                            if (isPriceAlert) return v >= 60 ? `${(v / 60).toFixed(0)}h` : `${v.toFixed(0)}m`;
                                            return v >= 60 ? `${(v / 60).toFixed(0)}m` : `${v.toFixed(0)}s`;
                                        }
                                        return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;
                                    }}
                                />
                                <Tooltip
                                    active={typeof window !== 'undefined' && window.innerWidth >= 768 ? undefined : false}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255,255,255,0.95)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        fontSize: '11px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value: number, name: string) => {
                                        if (isAvgEvent && name === 'avgDelay') return [formatDelay(value), 'Avg Delay'];
                                        return [value.toLocaleString(), name === 'total' ? 'Events' : name === 'success' ? 'Success' : 'Failed'];
                                    }}
                                    labelFormatter={(label) => `Hour: ${label}`}
                                />
                                <Bar
                                    dataKey={isAvgEvent ? "avgDelay" : "total"}
                                    radius={[6, 6, 0, 0]}
                                    cursor="pointer"
                                    onClick={(data: any) => {
                                        if (data && data.hour !== undefined) setSelectedHour(data.hour);
                                    }}
                                >
                                    {availableHours.map((hour, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={hour === selectedHour ? '#06b6d4' : hour === peakHour ? '#fbbf24' : '#93c5fd'}
                                            stroke={hour === selectedHour ? '#0891b2' : hour === peakHour ? '#f59e0b' : 'transparent'}
                                            strokeWidth={hour === selectedHour ? 3 : hour === peakHour ? 2 : 0}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        />
                                    ))}
                                </Bar>
                                <ReferenceLine
                                    y={isAvgEvent ? overallAvgDelay : avgPerHour}
                                    stroke="#fbbf24"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{
                                        value: `Avg: ${isAvgEvent ? formatDelay(overallAvgDelay) : avgPerHour.toFixed(0)}`,
                                        position: 'right',
                                        fill: '#f59e0b',
                                        fontSize: 10,
                                        fontWeight: 'bold'
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-2 border-cyan-200/60 dark:border-cyan-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20" onClick={() => navigateHour(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                                <div className="text-xl font-bold text-foreground">{formatHour(selectedHour)}</div>
                                <div className="text-[10px] text-muted-foreground">Selected Hour</div>
                            </div>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20" onClick={() => navigateHour(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedHour === peakHour && (
                                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold flex items-center gap-1">
                                    <Flame className="h-3 w-3" /> Peak Hour
                                </span>
                            )}
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1", selectedVsAvg >= 0 ? "bg-red-100 text-red-600 dark:bg-red-500/20" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20")}>
                                {selectedVsAvg >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {selectedVsAvg >= 0 ? '+' : ''}{selectedVsAvg.toFixed(1)}% vs avg
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                {isAvgEvent ? formatDelay(selectedAvgDelay) : selectedStats.total.toLocaleString()}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">
                                {isAvgEvent ? 'Avg Delay' : 'Total Events'}
                            </div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{selectedStats.success.toLocaleString()}</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Successful</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-red-600">{selectedStats.fail.toLocaleString()}</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Failed</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-gray-600">{selectedSuccessRate.toFixed(1)}%</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Success Rate</div>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-cyan-200/50 dark:border-cyan-500/20">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
                            <div>
                                <div className="text-xs text-muted-foreground">Data Points</div>
                                <div className="text-sm font-semibold text-foreground">{selectedStats.count} occurrences</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Avg per Occurrence</div>
                                <div className="text-sm font-semibold text-foreground">{Math.round(avgPerDataPoint).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">% of Total</div>
                                <div className="text-sm font-semibold text-foreground">{overallTotal > 0 ? ((selectedStats.total / overallTotal) * 100).toFixed(1) : 0}%</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[10px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>Peak: {formatHourShort(peakHour)}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div>Lowest: {formatHourShort(lowestHour)}</span>
                    </div>
                    <span className="flex items-center gap-1">Trend: {trendDirection === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : trendDirection === 'down' ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Activity className="h-3 w-3 text-blue-500" />} {trendDirection === 'up' ? 'Increasing' : trendDirection === 'down' ? 'Decreasing' : 'Stable'}</span>
                </div>
            </CardContent>
        </EnhancedCard>
    );
});
