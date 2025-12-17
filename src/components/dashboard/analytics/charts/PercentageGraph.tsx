import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart, ReferenceLine } from 'recharts';
import { Percent, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PercentageGraphProps {
    data: any[];
    dateRange: { from: Date; to: Date };
    parentEvents: string[]; // Event IDs to sum as parent (denominator)
    childEvents: string[]; // Event IDs to sum as child (numerator)
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
    filters?: {
        statusCodes?: string[];
        cacheStatus?: string[];
    };
    showCombinedPercentage?: boolean;
    isHourly?: boolean;
}

/**
 * Percentage Graph Component
 * Shows percentage calculation: (Child Events successCount / Parent Events successCount) × 100
 * Uses ONLY graph API data with successCount field
 */
export function PercentageGraph({
    data,
    dateRange,
    parentEvents,
    childEvents,
    eventColors,
    eventNames,
    filters,
    showCombinedPercentage = true,
    isHourly = true,
}: PercentageGraphProps) {

    const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const statusCodes = (filters?.statusCodes || []).filter(Boolean);
        const cacheStatuses = (filters?.cacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        const groupedData: Record<string, {
            parentTotal: number;
            childTotal: number;
            timestamp: number;
            parentBreakdown: Record<string, number>;
            childBreakdown: Record<string, number>;
        }> = {};

        data.forEach((record) => {
            const date = new Date(record.timestamp || record.date);
            const timeKey = isHourly
                ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.getHours()}:00`
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!groupedData[timeKey]) {
                groupedData[timeKey] = {
                    parentTotal: 0,
                    childTotal: 0,
                    timestamp: date.getTime(),
                    parentBreakdown: {},
                    childBreakdown: {},
                };
            }

            parentEvents.forEach((eventId) => {
                let count = 0;

                if (hasStatusFilter || hasCacheFilter) {
                    const baseName = eventNames[eventId] || `Event ${eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                    if (hasStatusFilter) {
                        statusCodes.forEach((status) => {
                            const statusKey = `${eventKey}_status_${status}`;
                            const successKey = `${statusKey}_success`;
                            const countKey = `${statusKey}_count`;
                            count += Number(record[successKey] || record[countKey] || 0);
                        });
                    } else if (hasCacheFilter) {
                        cacheStatuses.forEach((cache) => {
                            const cacheKey = `${eventKey}_cache_${cache}`;
                            const successKey = `${cacheKey}_success`;
                            const countKey = `${cacheKey}_count`;
                            count += Number(record[successKey] || record[countKey] || 0);
                        });
                    }
                } else {
                    const successKey = `${eventId}_success`;
                    const countKey = `${eventId}_count`;
                    count = Number(record[successKey] || record[countKey] || 0);
                }

                groupedData[timeKey].parentTotal += count;
                groupedData[timeKey].parentBreakdown[eventId] =
                    (groupedData[timeKey].parentBreakdown[eventId] || 0) + count;
            });

            childEvents.forEach((eventId) => {
                let count = 0;

                if (hasStatusFilter || hasCacheFilter) {
                    const baseName = eventNames[eventId] || `Event ${eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                    if (hasStatusFilter) {
                        statusCodes.forEach((status) => {
                            const statusKey = `${eventKey}_status_${status}`;
                            const successKey = `${statusKey}_success`;
                            const countKey = `${statusKey}_count`;
                            count += Number(record[successKey] || record[countKey] || 0);
                        });
                    } else if (hasCacheFilter) {
                        cacheStatuses.forEach((cache) => {
                            const cacheKey = `${eventKey}_cache_${cache}`;
                            const successKey = `${cacheKey}_success`;
                            const countKey = `${cacheKey}_count`;
                            count += Number(record[successKey] || record[countKey] || 0);
                        });
                    }
                } else {
                    const successKey = `${eventId}_success`;
                    const countKey = `${eventId}_count`;
                    count = Number(record[successKey] || record[countKey] || 0);
                }

                groupedData[timeKey].childTotal += count;
                groupedData[timeKey].childBreakdown[eventId] =
                    (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
            });
        });

        return Object.entries(groupedData)
            .map(([timeKey, values]) => ({
                time: timeKey,
                percentage: values.parentTotal > 0 ? (values.childTotal / values.parentTotal) * 100 : 0,
                parentCount: values.parentTotal,
                childCount: values.childTotal,
                timestamp: values.timestamp,
                parentBreakdown: values.parentBreakdown,
                childBreakdown: values.childBreakdown,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [data, parentEvents, childEvents, isHourly, filters, eventNames]);

    // Calculate overall statistics
    const overallStats = useMemo(() => {
        const totalParent = chartData.reduce((sum, d) => sum + d.parentCount, 0);
        const totalChild = chartData.reduce((sum, d) => sum + d.childCount, 0);
        const percentage = totalParent > 0 ? (totalChild / totalParent) * 100 : 0;

        // Find min and max percentages
        const percentages = chartData.map(d => d.percentage);
        const minPercentage = Math.min(...percentages);
        const maxPercentage = Math.max(...percentages);

        return {
            totalParent,
            totalChild,
            percentage,
            minPercentage: isFinite(minPercentage) ? minPercentage : 0,
            maxPercentage: isFinite(maxPercentage) ? maxPercentage : 0,
        };
    }, [chartData]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="border border-purple-200/60 dark:border-purple-500/30 rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-purple-50/80 to-violet-50/60 dark:from-purple-900/20 dark:to-violet-900/10 border-b border-purple-200/40 dark:border-purple-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                            <Percent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Percentage Analysis</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Child / Parent ratio • Time series view
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No data available for the selected date range
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getParentEventNames = () => parentEvents.map(id => eventNames[id] || id).join(', ');
    const getChildEventNames = () => childEvents.map(id => eventNames[id] || id).join(', ');

    return (
        <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl">
            <CardHeader className="pb-3 px-4 md:px-6 bg-gradient-to-r from-purple-50/80 to-violet-50/60 dark:from-purple-900/20 dark:to-violet-900/10 border-b border-purple-200/40 dark:border-purple-500/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                            <Percent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Percentage Analysis</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Child/Parent Event Ratio • {isHourly ? 'Hourly' : 'Daily'} Breakdown
                            </p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1">
                        <span className="text-lg font-bold">{overallStats.percentage.toFixed(2)}%</span>
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {overallStats.totalChild.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total Child Events</div>
                        <div className="text-xs text-muted-foreground truncate" title={getChildEventNames()}>
                            {getChildEventNames()}
                        </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {overallStats.totalParent.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total Parent Events</div>
                        <div className="text-xs text-muted-foreground truncate" title={getParentEventNames()}>
                            {getParentEventNames()}
                        </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {overallStats.percentage.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Overall Ratio</div>
                        <div className="text-xs text-muted-foreground">
                            Range: {overallStats.minPercentage.toFixed(1)}% - {overallStats.maxPercentage.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Line Chart */}
                <div className="h-[420px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                        >
                            <defs>
                                <linearGradient id="percentageGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                domain={[0, 'auto']}
                            />
                            <ReferenceLine
                                y={overallStats.percentage}
                                stroke="#facc15"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                label={{ value: 'Avg', position: 'right', fill: '#facc15', fontSize: 11 }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        const parentBreakdown = (data.parentBreakdown || {}) as Record<string, number>;
                                        const childBreakdown = (data.childBreakdown || {}) as Record<string, number>;
                                        const parentEntries = Object.entries(parentBreakdown);
                                        const childEntries = Object.entries(childBreakdown);
                                        return (
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                                                <p className="text-sm font-semibold mb-2">{data.time}</p>
                                                <div className="space-y-1 text-xs">
                                                    <p className="text-purple-600 dark:text-purple-400 font-bold">
                                                        Percentage: {data.percentage.toFixed(2)}%
                                                    </p>
                                                    <p className="text-green-600 dark:text-green-400">
                                                        Child: {data.childCount.toLocaleString()}
                                                    </p>
                                                    <p className="text-blue-600 dark:text-blue-400">
                                                        Parent: {data.parentCount.toLocaleString()}
                                                    </p>
                                                    {childEntries.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="font-semibold mb-1 text-xs text-green-700 dark:text-green-300">Child breakdown</p>
                                                            {childEntries.map(([eventId, count]) => (
                                                                <div key={eventId} className="flex items-center justify-between">
                                                                    <span>{eventNames[eventId] || eventId}</span>
                                                                    <span className="font-mono">{count.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {parentEntries.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="font-semibold mb-1 text-xs text-blue-700 dark:text-blue-300">Parent breakdown</p>
                                                            {parentEntries.map(([eventId, count]) => (
                                                                <div key={eventId} className="flex items-center justify-between">
                                                                    <span>{eventNames[eventId] || eventId}</span>
                                                                    <span className="font-mono">{count.toLocaleString()}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="percentage"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fill="url(#percentageGradient)"
                                name="Child/Parent %"
                                activeDot={{ r: 4 }}
                                onClick={(e: any) => {
                                    if (!e || !e.activePayload || !e.activePayload.length) return;
                                    const payload = e.activePayload[0].payload;
                                    setSelectedPoint(payload);
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {selectedPoint && (
                    <div className="mt-4 p-4 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-white/80 dark:bg-slate-900/70 shadow-md max-w-md">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <p className="text-sm font-semibold mb-1">{selectedPoint.time}</p>
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                                    Percentage: {selectedPoint.percentage.toFixed(2)}%
                                </p>
                            </div>
                            <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => setSelectedPoint(null)}
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-1 text-xs">
                            <p className="text-green-600 dark:text-green-400">
                                Child: {selectedPoint.childCount.toLocaleString()}
                            </p>
                            <p className="text-blue-600 dark:text-blue-400">
                                Parent: {selectedPoint.parentCount.toLocaleString()}
                            </p>

                            {selectedPoint.childBreakdown && (
                                <div className="mt-2">
                                    <p className="font-semibold mb-1 text-xs text-green-700 dark:text-green-300">Child breakdown</p>
                                    {Object.entries(selectedPoint.childBreakdown as Record<string, number>).map(([eventId, count]) => (
                                        <div key={eventId} className="flex items-center justify-between">
                                            <span>{eventNames[eventId] || eventId}</span>
                                            <span className="font-mono">{count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedPoint.parentBreakdown && (
                                <div className="mt-2">
                                    <p className="font-semibold mb-1 text-xs text-blue-700 dark:text-blue-300">Parent breakdown</p>
                                    {Object.entries(selectedPoint.parentBreakdown as Record<string, number>).map(([eventId, count]) => (
                                        <div key={eventId} className="flex items-center justify-between">
                                            <span>{eventNames[eventId] || eventId}</span>
                                            <span className="font-mono">{count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <span>✓ Fail</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500"></div>
                            <span>✓ Success</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            <span>✓ Total</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
