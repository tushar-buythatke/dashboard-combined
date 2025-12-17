import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart, ReferenceLine } from 'recharts';
import { Percent, TrendingUp, TrendingDown, X, BarChart3, Activity } from 'lucide-react';
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

    // Handler for reliable click events
    const handleDataPointClick = (data: any) => {
        if (data && data.time) {
            setSelectedPoint(data);
        }
    };

    return (
        <>
            <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-xl rounded-2xl">
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
                            onClick={(e: any) => {
                                // Handle chart background click
                                if (e?.activePayload?.[0]?.payload) {
                                    handleDataPointClick(e.activePayload[0].payload);
                                }
                            }}
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
                                activeDot={{ 
                                    r: 6, 
                                    onClick: (e: any, payload: any) => {
                                        if (payload?.payload) {
                                            handleDataPointClick(payload.payload);
                                        }
                                    }
                                }}
                                onClick={(e: any) => {
                                    if (e?.activePayload?.[0]?.payload) {
                                        handleDataPointClick(e.activePayload[0].payload);
                                    }
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                            <span>Percentage</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <span>Child Events</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            <span>Parent Events</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Click any point on the chart to view detailed breakdown
                    </p>
                </div>
            </CardContent>
        </Card>

        {/* Expanded Data Point Modal */}
        <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
            <DialogContent
                showCloseButton={false}
                className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-purple-50/30 to-violet-50/20 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900"
            >
                {selectedPoint && (
                    <>
                        {/* Premium Header */}
                        <div className="relative px-6 py-5 bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 text-white">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">{selectedPoint.time}</h2>
                                    <p className="text-purple-100 text-sm">
                                        Percentage Analysis Breakdown
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectedPoint(null)}
                                    className="ml-auto h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="p-6 md:p-8">
                            {/* Key Metric - Percentage */}
                            <div className="mb-6 p-6 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/20 rounded-2xl border-2 border-purple-300 dark:border-purple-500/40 shadow-lg text-center">
                                <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                                    {selectedPoint.percentage.toFixed(2)}%
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Child / Parent Ratio
                                </div>
                            </div>

                            {/* Counts Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-green-200/50 dark:border-green-500/30 p-5 shadow-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">Child Count</span>
                                    </div>
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {selectedPoint.childCount.toLocaleString()}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-blue-200/50 dark:border-blue-500/30 p-5 shadow-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">Parent Count</span>
                                    </div>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {selectedPoint.parentCount.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Event Breakdowns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Child Events Breakdown */}
                                {selectedPoint.childBreakdown && Object.keys(selectedPoint.childBreakdown).length > 0 && (
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-green-200/50 dark:border-green-500/30 p-5 shadow-lg">
                                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-green-700 dark:text-green-300">
                                            <TrendingUp className="h-4 w-4" />
                                            Child Event Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(selectedPoint.childBreakdown as Record<string, number>).map(([eventId, count]) => (
                                                <div
                                                    key={eventId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                                                >
                                                    <span className="text-sm font-medium truncate flex-1 mr-2">
                                                        {eventNames[eventId] || eventId}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-green-700 dark:text-green-300">
                                                            {count.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {selectedPoint.childCount > 0 
                                                                ? ((count / selectedPoint.childCount) * 100).toFixed(1)
                                                                : '0'}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Parent Events Breakdown */}
                                {selectedPoint.parentBreakdown && Object.keys(selectedPoint.parentBreakdown).length > 0 && (
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-blue-200/50 dark:border-blue-500/30 p-5 shadow-lg">
                                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                            <Activity className="h-4 w-4" />
                                            Parent Event Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(selectedPoint.parentBreakdown as Record<string, number>).map(([eventId, count]) => (
                                                <div
                                                    key={eventId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                                                >
                                                    <span className="text-sm font-medium truncate flex-1 mr-2">
                                                        {eventNames[eventId] || eventId}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                            {count.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {selectedPoint.parentCount > 0 
                                                                ? ((count / selectedPoint.parentCount) * 100).toFixed(1)
                                                                : '0'}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Info */}
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Time: {selectedPoint.time}</span>
                                    <span>Click outside to close</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    </>
    );
}
