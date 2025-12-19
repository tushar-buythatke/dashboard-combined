import React, { useState } from 'react';
import { Clock, Activity, CheckCircle2, Flame, Hash, TrendingUp, Zap } from 'lucide-react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from 'recharts';
import type { EventConfig } from '@/types/analytics';

// Define EventKeyInfo type locally if not exported from types
export interface EventKeyInfo {
    eventKey: string;
    eventId: string;
    eventName: string;
    isErrorEvent?: number;
    isAvgEvent?: number;
}

// Custom X-Axis Tick Component
const CustomXAxisTick = ({ x, y, payload }: any) => {
    const value = payload?.value || '';
    let datePart = '';
    let timePart = '';

    if (value.includes(',')) {
        const parts = value.split(', ');
        datePart = parts[0] || '';
        timePart = parts[1] || '';
    } else {
        datePart = value;
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={12} textAnchor="middle" fill="currentColor" fontSize={10} fontWeight={500} className="fill-gray-500 dark:fill-gray-400">
                {datePart}
            </text>
            {timePart && (
                <text x={0} y={0} dy={24} textAnchor="middle" fill="currentColor" fontSize={9} className="fill-gray-400 dark:fill-gray-500">
                    {timePart}
                </text>
            )}
        </g>
    );
};

export function HourlyInsights({ graphData, isHourly, eventKeys = [], events = [] }: { graphData: any[]; isHourly: boolean; eventKeys?: EventKeyInfo[]; events?: EventConfig[] }) {
    const { isAutosnipe } = useTheme();
    const [selectedHour, setSelectedHour] = useState(new Date().getHours());
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

    if (!isHourly || !graphData || graphData.length === 0) return null;

    const activeEventKey = selectedEventKey;
    const selectedEventInfo = eventKeys.find(ek => ek.eventKey === activeEventKey);
    const isAvgEvent = selectedEventInfo?.isAvgEvent === 1;
    const selectedEventConfig = events.find(e => String(e.eventId) === selectedEventInfo?.eventId);
    const isPriceAlert = selectedEventConfig?.feature === 1;

    // Group data by hour
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

    let peakHour = 0, peakTotal = 0;
    hourlyStats.forEach((stats, hour) => {
        const metric = isAvgEvent ? (stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0) : stats.total;
        if (metric > peakTotal) { peakTotal = metric; peakHour = hour; }
    });

    const avgPerHour = isAvgEvent ? overallAvgDelay : (overallTotal / Math.max(availableHours.length, 1));
    const formatHourShort = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${period}`;
    };

    // Prepare chart data
    const chartData = availableHours.map(hour => {
        const stats = hourlyStats.get(hour);
        return {
            hour,
            hourLabel: formatHourShort(hour),
            value: isAvgEvent ? (stats?.delayCount ? stats.avgDelay / stats.delayCount : 0) : (stats?.total || 0),
            successRate: stats?.total ? (stats.success / stats.total) * 100 : 0
        };
    });

    return (
        <EnhancedCard
            variant="glass"
            glow={true}
            className={cn(
                "rounded-2xl transition-all duration-150",
                isAutosnipe
                    ? "border border-green-500/40 bg-gradient-to-br from-gray-950 via-green-950/20 to-gray-950 shadow-[0_8px_30px_rgba(34,197,94,0.15)] hover:shadow-[0_20px_40px_rgba(34,197,94,0.25)]"
                    : "border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 dark:from-purple-900/20 dark:via-slate-900/80 dark:to-indigo-900/20 shadow-[0_8px_30px_rgba(147,51,234,0.1)] hover:shadow-[0_20px_40px_rgba(147,51,234,0.15)]"
            )}
        >
            {/* Top accent bar */}
            <div className={cn(
                "absolute top-0 left-0 w-full h-1 rounded-t-2xl",
                isAutosnipe
                    ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-500"
                    : "bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
            )} />

            <CardHeader className="pb-3 px-3 md:px-6 pt-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                                isAutosnipe
                                    ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
                                    : "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30"
                            )}
                        >
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                <span className={cn(
                                    "bg-clip-text text-transparent",
                                    isAutosnipe
                                        ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                        : "bg-gradient-to-r from-cyan-600 to-purple-600"
                                )}>
                                    Hourly Insights
                                </span>
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-normal",
                                    isAutosnipe
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
                                )}>
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
                                <div className={cn(
                                    "flex items-center rounded-full p-1 gap-0.5 w-full sm:w-auto",
                                    isAutosnipe ? "bg-gray-900 border border-green-500/30" : "bg-gray-100 dark:bg-gray-800"
                                )}>
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
                                                    "flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-medium rounded-full transition-all duration-150 text-center",
                                                    isSelected
                                                        ? isAutosnipe
                                                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/30"
                                                            : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                                                        : isAutosnipe
                                                            ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
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
                                    <SelectTrigger className={cn(
                                        "w-[180px] h-8 text-xs",
                                        isAutosnipe
                                            ? "bg-gray-900 border-green-500/30 text-green-400"
                                            : "bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-500/30"
                                    )}>
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
                    <div
                        className={cn(
                            "p-2.5 rounded-xl border transition-all duration-150 hover:scale-[1.02]",
                            isAutosnipe
                                ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30 hover:border-green-400/50"
                                : "bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-200/50 dark:border-blue-500/20"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Activity className={cn("h-3 w-3", isAutosnipe ? "text-green-500" : "text-blue-500")} />
                            <span className={cn(
                                "text-[10px] font-medium uppercase",
                                isAutosnipe ? "text-green-400" : "text-blue-600 dark:text-blue-400"
                            )}>
                                {isAvgEvent ? 'Avg Delay' : 'Total Events'}
                            </span>
                        </div>
                        <div className={cn(
                            "text-base md:text-lg font-bold",
                            isAutosnipe ? "text-green-400" : "text-blue-600"
                        )}>
                            {isAvgEvent ? formatDelay(overallAvgDelay) : overallTotal.toLocaleString()}
                        </div>
                    </div>
                    <div
                        className={cn(
                            "p-2.5 rounded-xl border transition-all duration-150 hover:scale-[1.02]",
                            isAutosnipe
                                ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30 hover:border-emerald-400/50"
                                : "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-200/50 dark:border-emerald-500/20"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className={cn(
                                "text-[10px] font-medium uppercase",
                                isAutosnipe ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>Success Rate</span>
                        </div>
                        <div className={cn("text-lg font-bold", isAutosnipe ? "text-emerald-400" : "text-emerald-600")}>
                            {overallSuccessRate.toFixed(1)}%
                        </div>
                    </div>
                    <div
                        className={cn(
                            "p-2.5 rounded-xl border transition-all duration-150 hover:scale-[1.02]",
                            isAutosnipe
                                ? "bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/30 hover:border-yellow-400/50"
                                : "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-200/50 dark:border-amber-500/20"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Flame className={cn("h-3 w-3", isAutosnipe ? "text-yellow-500" : "text-amber-500")} />
                            <span className={cn(
                                "text-[10px] font-medium uppercase",
                                isAutosnipe ? "text-yellow-400" : "text-amber-600 dark:text-amber-400"
                            )}>
                                {isAvgEvent ? 'Peak Delay Hour' : 'Peak Hour'}
                            </span>
                        </div>
                        <div className={cn("text-lg font-bold", isAutosnipe ? "text-yellow-400" : "text-amber-600")}>
                            {formatHourShort(peakHour)}
                        </div>
                    </div>
                    <div
                        className={cn(
                            "p-2.5 rounded-xl border transition-all duration-150 hover:scale-[1.02]",
                            isAutosnipe
                                ? "bg-gradient-to-br from-cyan-500/10 to-teal-500/5 border-cyan-500/30 hover:border-cyan-400/50"
                                : "bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-200/50 dark:border-purple-500/20"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Hash className={cn("h-3 w-3", isAutosnipe ? "text-cyan-500" : "text-purple-500")} />
                            <span className={cn(
                                "text-[10px] font-medium uppercase",
                                isAutosnipe ? "text-cyan-400" : "text-purple-600 dark:text-purple-400"
                            )}>
                                {isAvgEvent ? 'Avg Delay/Hour' : 'Avg/Hour'}
                            </span>
                        </div>
                        <div className={cn("text-lg font-bold", isAutosnipe ? "text-cyan-400" : "text-purple-600")}>
                            {isAvgEvent ? formatDelay(avgPerHour) : Math.round(avgPerHour).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        "p-3 rounded-xl border transition-all duration-150 hover:scale-[1.01]",
                        isAutosnipe
                            ? "bg-gray-900/60 border-green-500/20 hover:border-green-400/40"
                            : "bg-background/60 border-border/40 hover:border-cyan-300 dark:hover:border-cyan-500/50"
                    )}
                >
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isAutosnipe ? "#22c55e" : "hsl(var(--primary))"} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={isAutosnipe ? "#16a34a" : "hsl(var(--primary))"} stopOpacity={0.4} />
                                    </linearGradient>
                                    <linearGradient id="barGradientInactive" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={isAutosnipe ? "#22c55e" : "hsl(var(--primary))"} stopOpacity={0.4} />
                                        <stop offset="100%" stopColor={isAutosnipe ? "#16a34a" : "hsl(var(--primary))"} stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={isAutosnipe ? 0.05 : 0.1} stroke={isAutosnipe ? "#22c55e" : undefined} />
                                <XAxis dataKey="hourLabel" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} interval={0} />
                                <YAxis tick={{ fontSize: 10, fill: isAutosnipe ? '#4ade80' : '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: isAutosnipe ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                                        boxShadow: isAutosnipe ? '0 4px 12px rgba(34, 197, 94, 0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
                                        backgroundColor: isAutosnipe ? 'rgba(10, 10, 10, 0.95)' : undefined
                                    }}
                                    cursor={{ fill: isAutosnipe ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={300}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.hour === selectedHour ? 'url(#barGradient)' : 'url(#barGradientInactive)'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </EnhancedCard>
    );
}
