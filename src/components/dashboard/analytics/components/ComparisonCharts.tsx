import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Clock, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartZoomControls } from './ChartZoomControls';
import { useChartZoom } from '@/hooks/useChartZoom';

// Color palette for different days
const DAY_COLORS = [
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

interface ComparisonChartsProps {
    data: any[];
    dateRange: { from: Date; to: Date };
    eventKeys: string[];
    eventColors: Record<string, string>;
    eventNames?: Record<string, string>;
    eventStats?: Array<{ eventKey: string; eventId: string; total: number; successRate: number }>;
    selectedEventKey?: string | null;
    onEventClick?: (eventKey: string) => void;
    headless?: boolean;
    onExpand?: () => void;
}


/**
 * 8-Day Overlay Comparison Chart
 * Shows up to 7 different days overlaid on the same graph for day-wise comparison
 */
export function DayWiseComparisonChart({ data, dateRange, eventKeys, eventColors, eventNames = {}, eventStats, selectedEventKey, onEventClick, headless, onExpand }: ComparisonChartsProps) {
    if (!data || data.length === 0) return null;

    // Group data by day
    const groupedByDay: Record<string, any[]> = {};

    data.forEach((record) => {
        const date = new Date(record.timestamp || record.date);
        const dayKey = date.toDateString();

        if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = [];
        }

        groupedByDay[dayKey].push({
            hour: date.getHours(),
            ...record
        });
    });

    const daysAsc = Object.keys(groupedByDay)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-7);

    // Build metadata for each day (label + base color)
    // Keep an ascending list for calculations and a descending
    // list for legend/tooltip display so the latest day appears first.
    const daySeriesAsc = daysAsc.map((dayKey, index) => {
        const date = new Date(dayKey);
        const dayName = DAY_NAMES[date.getDay()];
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
        return {
            dayKey,
            label: `${dayName} ${dateStr}`,
            color: DAY_COLORS[index % DAY_COLORS.length],
        };
    });

    const daySeriesDesc = [...daySeriesAsc].reverse();

    // Highlight state
    // - selectedDayKey: used when manually picking a day from legend
    // - highlightRecentTwo: when true, always emphasize the last 2 days
    const [selectedDayKey, setSelectedDayKey] = React.useState<string | null>(() =>
        daysAsc.length > 0 ? daysAsc[daysAsc.length - 1] : null
    );
    const [highlightRecentTwo, setHighlightRecentTwo] = React.useState<boolean>(true);

    // Auto-select first event on load if available
    React.useEffect(() => {
        if (eventStats && eventStats.length > 0 && !selectedEventKey && onEventClick) {
            // Auto-select the first event (highest total by default as they're sorted)
            onEventClick(eventStats[0].eventKey);
        }
    }, [eventStats, selectedEventKey, onEventClick]);

    // Create unified time points (0-23 hours)
    const timePoints = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`
    }));

    // Build base comparison data - aggregate by hour across all days
    // Only aggregate the eventKeys that are passed in (filtered)
    // For today, only include hours that have passed (not future hours with 0)
    const now = new Date();
    const currentHour = now.getHours();
    const todayDateString = now.toDateString();

    const baseData = timePoints.map(({ hour, label }) => {
        const point: any = { hour, time: label };

        daySeriesAsc.forEach(({ dayKey, label: dayLabel }) => {
            const dayData = groupedByDay[dayKey];
            const hourData = dayData.filter(d => d.hour === hour);

            // Check if this is today
            const isToday = dayKey === todayDateString;

            // For today: if no data for this hour AND hour is >= current hour, treat as future (null)
            // This prevents showing 0 for hours that haven't happened yet
            const hasNoData = hourData.length === 0 || (eventKeys.length > 0 && eventKeys.every(eventKey => {
                return hourData.every(d => {
                    const value = Number(d[`${eventKey}_count`]) || Number(d[eventKey]) || 0;
                    return value === 0;
                });
            }));

            const isFutureHour = isToday && hasNoData && hour >= currentHour;

            // For future hours of today (no data yet), set to null to avoid plotting 0s
            if (isFutureHour) {
                point[dayLabel] = null;
                return;
            }

            // Initialize to null for past hours (this allows showing gaps for hours with no data)
            point[dayLabel] = null;

            if (hourData.length > 0 && eventKeys.length > 0) {
                // Sum only the filtered event counts for this hour
                const totalCount = eventKeys.reduce((sum, eventKey) => {
                    const hourSum = hourData.reduce((hSum, d) => {
                        const value = Number(d[`${eventKey}_count`]) || Number(d[eventKey]) || 0;
                        return hSum + value;
                    }, 0);
                    return sum + hourSum;
                }, 0);

                point[dayLabel] = Math.round(totalCount / hourData.length);
            }
        });

        return point;
    });

    // Smoothing logic removed as per requirements to show raw data precision
    const comparisonData = baseData;

    // Derive simple insights for summary chips
    let peakHourTime: string | null = null;
    let peakHourValue: number | null = null;
    let todayVsAvgPct: number | null = null;

    const todaySeries = daySeriesAsc[daySeriesAsc.length - 1];
    if (todaySeries) {
        const todayLabel = todaySeries.label;
        const todayValues: number[] = [];

        comparisonData.forEach((point, idx) => {
            const v = point[todayLabel];
            if (typeof v === 'number' && !Number.isNaN(v)) {
                todayValues.push(v);

                if (peakHourValue == null || v > peakHourValue) {
                    peakHourValue = v;
                    peakHourTime = point.time;
                }
            }
        });

        // Today vs 7-day average at peak hour
        if (peakHourTime) {
            const idx = comparisonData.findIndex(p => p.time === peakHourTime);
            if (idx >= 0) {
                const point = comparisonData[idx];
                const vals: number[] = [];
                daySeriesAsc.forEach(ds => {
                    const v = point[ds.label];
                    if (typeof v === 'number' && !Number.isNaN(v)) {
                        vals.push(v);
                    }
                });
                if (vals.length > 0 && peakHourValue != null) {
                    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                    if (avg > 0) {
                        todayVsAvgPct = ((peakHourValue - avg) / avg) * 100;
                    }
                }
            }
        }
    }

    const Content = (
        <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        interval={2}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatNumber}
                        width={65}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <Tooltip
                        content={({ active, payload, label }: any) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-3 shadow-xl rounded-xl min-w-[170px] z-50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                                        <div className="space-y-2">
                                            {payload.map((entry: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{entry.name}</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                                                        {formatNumber(entry.value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                        onClick={(o: any) => {
                            const dataKey = typeof o?.dataKey === 'string' ? o.dataKey : null;
                            if (!dataKey) return;
                            const matched = daySeriesAsc.find(series => series.label === dataKey);
                            if (matched) {
                                // When user clicks legend, switch to single-day focus mode
                                setHighlightRecentTwo(false);
                                setSelectedDayKey(matched.dayKey);
                            }
                        }}
                    />

                    {/* Render a line for each day - legend newest first */}
                    {daySeriesDesc.map(({ dayKey, label, color }) => {
                        const recentThreeKeys = daySeriesAsc.slice(-3).map(ds => ds.dayKey);
                        const isRecent = recentThreeKeys.includes(dayKey);

                        // Last 2 days + today are considered "recent"
                        // Today is the very last item in daySeriesAsc
                        const isToday = dayKey === daySeriesAsc[daySeriesAsc.length - 1]?.dayKey;
                        const isYesterdayOrBefore = isRecent && !isToday;

                        const isSelected = highlightRecentTwo
                            ? isRecent
                            : selectedDayKey
                                ? selectedDayKey === dayKey
                                : isToday;

                        // NEW LOGIC: No more grey outs. Always use the series color.
                        // We use a slight opacity reduction only for NON-selected lines to keep focus,
                        // but they are still clearly colored, not grey.
                        const strokeColor = color;
                        const strokeOpacity = isSelected ? 1 : 0.4; // Brighter than before (was 0.2 and merged with grey)

                        // Width logic:
                        // - Today: 3.5 (Boldest)
                        // - Last 2 Days (when toggled): 2.5 (Bold)
                        // - Selected (from legend): 2.5 (Bold)
                        // - Others: 1.25 (Normal)
                        let strokeWidth = 1.25;
                        if (isToday) {
                            strokeWidth = 3.5;
                        } else if (isSelected) {
                            strokeWidth = 2.5;
                        }

                        return (
                            <Line
                                key={dayKey}
                                type="monotone"
                                dataKey={label}
                                name={label}
                                stroke={strokeColor}
                                strokeOpacity={strokeOpacity}
                                strokeWidth={strokeWidth}
                                dot={false}
                                connectNulls={false}
                                activeDot={{
                                    r: isSelected ? 5 : 3,
                                    strokeWidth: 2,
                                    stroke: '#fff',
                                }}
                                isAnimationActive={false}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );

    if (headless) {
        return (
            <div className="w-full h-full relative">
                {/* Smart summary chips embedded in headless mode if needed, or kept clean */}
                <div className="mb-3 flex flex-wrap gap-2 text-sm px-2">
                    {peakHourTime && peakHourValue != null && (
                        <div className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 font-medium">
                            Peak: {peakHourTime} ({formatNumber(peakHourValue)})
                        </div>
                    )}
                    {todayVsAvgPct != null && (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200 font-medium">
                            {todayVsAvgPct >= 0 ? '▲' : '▼'} vs 7d: {todayVsAvgPct >= 0 ? '+' : ''}{todayVsAvgPct.toFixed(0)}%
                        </div>
                    )}
                    <Button
                        type="button"
                        variant={highlightRecentTwo ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-3 text-xs font-semibold rounded-lg ml-auto"
                        onClick={() => setHighlightRecentTwo((prev) => !prev)}
                    >
                        {highlightRecentTwo ? 'Today + 2' : 'Selected'}
                    </Button>
                </div>
                {Content}
            </div>
        );
    }

    return (
        <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-lg rounded-2xl">
            <CardHeader className="pb-2 px-4 md:px-6 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-900/20 dark:to-purple-900/10 border-b border-indigo-200/40 dark:border-indigo-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">8-Day Overlay Comparison</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                Compare patterns across different days
                            </p>
                        </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-medium">Highlight</span>
                            <Button
                                type="button"
                                variant={highlightRecentTwo ? 'default' : 'outline'}
                                size="sm"
                                className="h-9 px-4 text-sm font-semibold rounded-lg"
                                onClick={() => setHighlightRecentTwo((prev) => !prev)}
                            >
                                {highlightRecentTwo ? 'Today + last 2' : 'Legend selected'}
                            </Button>
                        </div>
                    </div>
                    {/* Event Stats Badges */}
                    {!headless && eventStats && eventStats.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {eventStats
                                .slice()
                                .sort((a, b) => {
                                    // Extract status codes and sort numerically (200, 400, 500, etc.)
                                    const extractStatusCode = (key: string) => {
                                        const match = key.match(/\d{3}/);
                                        return match ? parseInt(match[0]) : 999;
                                    };
                                    const aCode = extractStatusCode(a.eventKey);
                                    const bCode = extractStatusCode(b.eventKey);
                                    // If both are status codes, sort by code
                                    if (aCode !== 999 && bCode !== 999) {
                                        return aCode - bCode;
                                    }
                                    // Otherwise sort by total count descending
                                    return b.total - a.total;
                                })
                                .map((stat, idx) => {
                                    const isSelected = selectedEventKey === stat.eventKey;
                                    // Determine color based on status code
                                    const statusMatch = stat.eventKey.match(/\d{3}/);
                                    const statusCode = statusMatch ? parseInt(statusMatch[0]) : NaN;
                                    let badgeColor;
                                    if (!isNaN(statusCode)) {
                                        if (statusCode >= 200 && statusCode < 300) {
                                            badgeColor = '#22c55e'; // Green for 2xx
                                        } else if (statusCode >= 400 && statusCode < 500) {
                                            badgeColor = '#f59e0b'; // Orange for 4xx
                                        } else if (statusCode >= 500) {
                                            badgeColor = '#ef4444'; // Red for 5xx
                                        } else {
                                            badgeColor = eventColors[stat.eventId] || DAY_COLORS[idx % DAY_COLORS.length];
                                        }
                                    } else {
                                        badgeColor = eventColors[stat.eventId] || DAY_COLORS[idx % DAY_COLORS.length];
                                    }
                                    return (
                                        <div
                                            key={stat.eventKey}
                                            onClick={() => onEventClick?.(stat.eventKey)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${isSelected
                                                ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 shadow-md scale-105'
                                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-102'
                                                }`}
                                        >
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: badgeColor }} />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {eventNames[String(stat.eventId)] || stat.eventKey}
                                            </span>
                                            <span className={`text-sm font-bold ${isSelected ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>{stat.total.toLocaleString()}</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                                                {stat.successRate.toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 bg-gradient-to-br from-indigo-50/30 to-purple-50/20 dark:from-indigo-900/10 dark:to-purple-900/5">
                {/* Smart summary chips */}
                <div className="mb-3 flex flex-wrap gap-2 text-sm relative">
                    {peakHourTime && peakHourValue != null && (
                        <div className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 font-medium">
                            Peak hour today: {peakHourTime} ({formatNumber(peakHourValue)})
                        </div>
                    )}
                    {todayVsAvgPct != null && (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200 font-medium">
                            {todayVsAvgPct >= 0 ? '▲' : '▼'} Today vs 7-day avg: {todayVsAvgPct >= 0 ? '+' : ''}{todayVsAvgPct.toFixed(0)}%
                        </div>
                    )}
                    {/* Volatility chip intentionally removed for now */}
                </div>

                <div className="h-[400px] w-full relative">
                    {Content}
                </div>
            </CardContent>
        </Card >
    );
}

/**
 * Hourly Deviation Chart
 * Shows hourly patterns across multiple days with deviation indicators
 */
export function HourlyDeviationChart({ data, dateRange, eventKeys, eventColors }: ComparisonChartsProps) {
    if (!data || data.length === 0) return null;

    // Zoom functionality
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom();

    // Calculate hourly averages and deviations
    const hourlyStats: Record<number, { values: number[]; avg: number; min: number; max: number }> = {};

    data.forEach((record) => {
        const date = new Date(record.timestamp || record.date);
        const hour = date.getHours();

        if (!hourlyStats[hour]) {
            hourlyStats[hour] = { values: [], avg: 0, min: Infinity, max: -Infinity };
        }

        const value = eventKeys.reduce((sum, key) => sum + (Number(record[key]) || 0), 0);
        hourlyStats[hour].values.push(value);
    });

    // Calculate statistics
    Object.keys(hourlyStats).forEach((hourStr) => {
        const hour = parseInt(hourStr);
        const values = hourlyStats[hour].values;
        hourlyStats[hour].avg = values.reduce((a, b) => a + b, 0) / values.length;
        hourlyStats[hour].min = Math.min(...values);
        hourlyStats[hour].max = Math.max(...values);
    });

    const chartData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        time: `${hour}:00`,
        avg: hourlyStats[hour]?.avg || 0,
        min: hourlyStats[hour]?.min || 0,
        max: hourlyStats[hour]?.max || 0,
        deviation: hourlyStats[hour] ? hourlyStats[hour].max - hourlyStats[hour].min : 0
    }));

    return (
        <Card className="border border-cyan-200/60 dark:border-cyan-500/30 overflow-hidden shadow-lg rounded-2xl">
            <CardHeader className="pb-2 px-4 md:px-6 bg-gradient-to-r from-cyan-50/80 to-blue-50/60 dark:from-cyan-900/20 dark:to-blue-900/10 border-b border-cyan-200/40 dark:border-cyan-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Hourly Deviation Analysis</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                See hourly patterns with min/max deviation
                            </p>
                        </div>
                    </div>
                    <ChartZoomControls
                        zoomLevel={zoomLevel}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onReset={resetZoom}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="h-[400px] w-full cursor-pointer overflow-hidden relative" onWheel={handleWheel}>
                    <div
                        className="w-full h-full origin-top-left transition-transform duration-100 ease-out"
                        style={{ transform: `scale(${zoomLevel})`, width: `${zoomLevel * 100}%`, height: `${zoomLevel * 100}%` }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 12 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />

                                <Line
                                    type="monotone"
                                    dataKey="avg"
                                    name="Average"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    dot={{ r: 3, fill: '#06b6d4' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="max"
                                    name="Max"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="min"
                                    name="Min"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Average Line Overlay for Daily Data (>7 days)
 * Shows daily trends with average line to identify dips
 */
export function DailyAverageChart({ data, dateRange, eventKeys, eventColors, eventNames = {}, eventStats, selectedEventKey, onEventClick }: ComparisonChartsProps) {
    if (!data || data.length === 0) return null;

    // Zoom functionality
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom();

    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));

    // Only show this chart for > 7 days
    if (daysDiff <= 7) return null;

    // Filter event keys based on selection
    const filteredEventKeys = selectedEventKey ? eventKeys.filter(k => k === selectedEventKey) : eventKeys;

    // Group by day
    const dailyData: Record<string, any> = {};

    data.forEach((record) => {
        const date = new Date(record.timestamp || record.date);
        const dayKey = date.toDateString();

        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                date: dayKey,
                dateObj: date,
                total: 0,
                count: 0
            };
        }

        // Match the graphData shape used elsewhere: `${eventKey}_count` first, then plain key
        const value = filteredEventKeys.reduce((sum, key) => {
            const countKey = `${key}_count`;
            const raw = (record as any)[countKey] ?? (record as any)[key];
            const num = Number(raw) || 0;
            return sum + num;
        }, 0);
        dailyData[dayKey].total += value;
        dailyData[dayKey].count += 1;
    });

    const chartData = Object.values(dailyData)
        .map((day: any) => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: day.count > 0 ? day.total / day.count : 0,
            timestamp: day.dateObj.getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

    // Calculate overall average
    const overallAvg = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;

    // Helper function to extract status code from event key
    const extractStatusCode = (eventKey: string): number => {
        const match = eventKey.match(/\b(\d{3})\b/);
        return match ? parseInt(match[1]) : 999;
    };

    // Sort event stats by status code
    const sortedEventStats = eventStats ? [...eventStats].sort((a, b) => {
        const codeA = extractStatusCode(a.eventKey);
        const codeB = extractStatusCode(b.eventKey);
        return codeA - codeB;
    }) : [];

    return (
        <Card className="border border-emerald-200/60 dark:border-emerald-500/30 overflow-hidden shadow-lg rounded-2xl">
            <CardHeader className="pb-2 px-4 md:px-6 bg-gradient-to-r from-emerald-50/80 to-green-50/60 dark:from-emerald-900/20 dark:to-green-900/10 border-b border-emerald-200/40 dark:border-emerald-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Daily Trends with Average Line</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                {daysDiff} days • Average: {overallAvg.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <ChartZoomControls
                        zoomLevel={zoomLevel}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onReset={resetZoom}
                    />
                </div>
                {/* Event badges for selection */}
                {sortedEventStats && sortedEventStats.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {sortedEventStats.map((stat) => {
                            const isSelected = selectedEventKey === stat.eventKey;
                            const statusCode = extractStatusCode(stat.eventKey);
                            let bgColor = 'bg-slate-100 dark:bg-slate-800';
                            let borderColor = 'border-slate-300 dark:border-slate-600';
                            let textColor = 'text-slate-700 dark:text-slate-300';

                            if (statusCode >= 200 && statusCode < 300) {
                                bgColor = 'bg-green-50 dark:bg-green-900/20';
                                borderColor = 'border-green-300 dark:border-green-600';
                                textColor = 'text-green-700 dark:text-green-300';
                            } else if (statusCode >= 400 && statusCode < 500) {
                                bgColor = 'bg-orange-50 dark:bg-orange-900/20';
                                borderColor = 'border-orange-300 dark:border-orange-600';
                                textColor = 'text-orange-700 dark:text-orange-300';
                            } else if (statusCode >= 500) {
                                bgColor = 'bg-red-50 dark:bg-red-900/20';
                                borderColor = 'border-red-300 dark:border-red-600';
                                textColor = 'text-red-700 dark:text-red-300';
                            }

                            return (
                                <button
                                    key={stat.eventKey}
                                    onClick={() => onEventClick?.(stat.eventKey)}
                                    className={cn(
                                        'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200',
                                        'hover:scale-105 cursor-pointer',
                                        isSelected
                                            ? `${bgColor} ${borderColor} ${textColor} shadow-md`
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60 hover:opacity-100'
                                    )}
                                >
                                    <span className="font-semibold">{eventNames[String(stat.eventId)] || stat.eventKey}</span>
                                    <span className="ml-2 opacity-75">{stat.total.toLocaleString()}</span>
                                    <span className="ml-1.5 text-xs opacity-60">({stat.successRate.toFixed(1)}%)</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="h-[400px] w-full cursor-pointer overflow-hidden relative" onWheel={handleWheel}>
                    <div
                        className="w-full h-full origin-top-left transition-transform duration-100 ease-out"
                        style={{ transform: `scale(${zoomLevel})`, width: `${zoomLevel * 100}%`, height: `${zoomLevel * 100}%` }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                                <defs>
                                    <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend />

                                {/* Average reference line */}
                                <ReferenceLine
                                    y={overallAvg}
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    label={{
                                        value: `Avg: ${overallAvg.toFixed(0)}`,
                                        position: 'right',
                                        fill: '#f59e0b',
                                        fontSize: 12,
                                        fontWeight: 'bold'
                                    }}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name="Daily Value"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fill="url(#dailyGradient)"
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
