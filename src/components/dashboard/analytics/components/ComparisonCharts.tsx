import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ComparisonChartsProps {
    data: any[];
    dateRange: { from: Date; to: Date };
    eventKeys: string[];
    eventColors: Record<string, string>;
}

/**
 * 7-Day Overlay Comparison Chart
 * Shows up to 7 different days overlaid on the same graph for day-wise comparison
 */
export function DayWiseComparisonChart({ data, dateRange, eventKeys, eventColors }: ComparisonChartsProps) {
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

    // Create unified time points (0-23 hours)
    const timePoints = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`
    }));

    // Build base comparison data - aggregate by hour across all days
    const baseData = timePoints.map(({ hour, label }) => {
        const point: any = { hour, time: label };
        
        daySeriesAsc.forEach(({ dayKey, label }) => {
            const dayData = groupedByDay[dayKey];
            const hourData = dayData.filter(d => d.hour === hour);
            
            if (hourData.length > 0 && eventKeys.length > 0) {
                // Sum all event counts for this hour
                const totalCount = eventKeys.reduce((sum, eventKey) => {
                    const hourSum = hourData.reduce((hSum, d) => {
                        const value = Number(d[`${eventKey}_count`]) || Number(d[eventKey]) || 0;
                        return hSum + value;
                    }, 0);
                    return sum + hourSum;
                }, 0);

                point[label] = Math.round(totalCount / hourData.length);
            }
        });
        
        return point;
    });

    // Apply simple moving-average smoothing (window = 3) to reduce micro-jitters
    const windowSize = 3;
    const halfWindow = Math.floor(windowSize / 2);
    const comparisonData = baseData.map((point, index) => {
        const smoothedPoint: any = { ...point };

        daySeriesAsc.forEach(({ label }) => {
            const values: number[] = [];
            for (let i = index - halfWindow; i <= index + halfWindow; i++) {
                if (i < 0 || i >= baseData.length) continue;
                const v = baseData[i][label];
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    values.push(v);
                }
            }

            if (values.length > 0) {
                smoothedPoint[label] = Math.round(
                    values.reduce((sum, v) => sum + v, 0) / values.length
                );
            }
        });

        return smoothedPoint;
    });

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

    return (
        <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-lg rounded-2xl">
            <CardHeader className="pb-2 px-4 md:px-6 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-900/20 dark:to-purple-900/10 border-b border-indigo-200/40 dark:border-indigo-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">7-Day Overlay Comparison</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Compare patterns across different days
                            </p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Highlight</span>
                        <Button
                            type="button"
                            variant={highlightRecentTwo ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-[11px] rounded-full"
                            onClick={() => setHighlightRecentTwo((prev) => !prev)}
                        >
                            {highlightRecentTwo ? 'Today + last 2' : 'Legend selected'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                {/* Smart summary chips */}
                <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
                    {peakHourTime && peakHourValue != null && (
                        <div className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                            Peak hour today: {peakHourTime} ({Math.round(peakHourValue)})
                        </div>
                    )}
                    {todayVsAvgPct != null && (
                        <div className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {todayVsAvgPct >= 0 ? '▲' : '▼'} Today vs 7-day avg: {todayVsAvgPct >= 0 ? '+' : ''}{todayVsAvgPct.toFixed(0)}%
                        </div>
                    )}
                    {/* Volatility chip intentionally removed for now */}
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 11 }}
                                interval={2}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                    border: '1px solid #ddd',
                                    borderRadius: '8px'
                                }}
                                // itemSorter is called per item; return a numeric rank.
                                // We want newest day first, so we build an index map and
                                // return a negative index so higher (newer) indexes come first.
                                itemSorter={(item: any) => {
                                    const orderMap: Record<string, number> = {};
                                    daySeriesAsc.forEach((ds, idx) => {
                                        orderMap[ds.label] = idx; // 0 = oldest, max = newest
                                    });
                                    const idx = orderMap[item?.name as string] ?? -1;
                                    return -idx;
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

                                const isSelected = highlightRecentTwo
                                    ? isRecent
                                    : selectedDayKey
                                        ? selectedDayKey === dayKey
                                        : dayKey === daySeriesAsc[daySeriesAsc.length - 1]?.dayKey;

                                const strokeColor = isSelected ? color : '#9CA3AF';
                                const strokeOpacity = isSelected ? (highlightRecentTwo ? 0.9 : 1) : 0.2;
                                const strokeWidth = isSelected ? (highlightRecentTwo ? 2 : 2.5) : 1.25;

                                return (
                                    <Line
                                        key={dayKey}
                                        type="monotoneX"
                                        dataKey={label}
                                        name={label}
                                        stroke={strokeColor}
                                        strokeOpacity={strokeOpacity}
                                        strokeWidth={strokeWidth}
                                        dot={false}
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
            </CardContent>
        </Card>
    );
}

/**
 * Hourly Deviation Chart
 * Shows hourly patterns across multiple days with deviation indicators
 */
export function HourlyDeviationChart({ data, dateRange, eventKeys, eventColors }: ComparisonChartsProps) {
    if (!data || data.length === 0) return null;

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
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Hourly Deviation Analysis</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                See hourly patterns with min/max deviation
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                            <defs>
                                <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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
            </CardContent>
        </Card>
    );
}

/**
 * Average Line Overlay for Daily Data (>7 days)
 * Shows daily trends with average line to identify dips
 */
export function DailyAverageChart({ data, dateRange, eventKeys, eventColors }: ComparisonChartsProps) {
    if (!data || data.length === 0) return null;

    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only show this chart for > 7 days
    if (daysDiff <= 7) return null;

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
        const value = eventKeys.reduce((sum, key) => {
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

    return (
        <Card className="border border-emerald-200/60 dark:border-emerald-500/30 overflow-hidden shadow-lg rounded-2xl">
            <CardHeader className="pb-2 px-4 md:px-6 bg-gradient-to-r from-emerald-50/80 to-green-50/60 dark:from-emerald-900/20 dark:to-green-900/10 border-b border-emerald-200/40 dark:border-emerald-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Daily Trends with Average Line</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {daysDiff} days • Average: {overallAvg.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                            <defs>
                                <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
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
            </CardContent>
        </Card>
    );
}
