import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from 'recharts';
import { Percent, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

interface DrillDownData {
    timestamp: number;
    timeLabel: string;
    ratio: number;
    parentTotal: number;
    childTotal: number;
    parentBreakdown: Array<{ name: string; count: number; id: string }>;
    childBreakdown: Array<{ name: string; count: number; id: string }>;
}

/**
 * Percentage Graph Component
 * Shows percentage calculation: (Child Events successCount / Parent Events successCount) × 100
 * Features: Click-to-drill-down, Taller layout, detailed per-event stats
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
    const [selectedPoint, setSelectedPoint] = useState<DrillDownData | null>(null);

    // Helper to get count based on filters
    const getFilteredCount = (record: any, eventId: string) => {
        // Derive event key from eventName to match DashboardViewer logic
        const eventName = eventNames[eventId] || `Event ${eventId}`;
        const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');

        // If no filters, return default success count (Original behavior)
        if ((!filters?.statusCodes?.length) && (!filters?.cacheStatus?.length)) {
            return Number(record[`${eventKey}_success`] || 0);
        }

        let total = 0;
        let hasFilters = false;

        // If status filters exist, sum them
        if (filters?.statusCodes?.length) {
            hasFilters = true;
            filters.statusCodes.forEach(code => {
                total += Number(record[`${eventKey}_status_${code}_count`] || 0);
            });
        }

        // If cache filters exist, sum them (Note: this adds to status count if both present)
        if (filters?.cacheStatus?.length) {
            hasFilters = true;
            filters.cacheStatus.forEach(code => {
                total += Number(record[`${eventKey}_cache_${code}_count`] || 0);
            });
        }

        return hasFilters ? total : Number(record[`${eventKey}_success`] || 0);
    };

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Group by time period
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

            // Sum parent events
            parentEvents.forEach((eventId) => {
                const count = getFilteredCount(record, eventId);
                groupedData[timeKey].parentTotal += count;
                groupedData[timeKey].parentBreakdown[eventId] = (groupedData[timeKey].parentBreakdown[eventId] || 0) + count;
            });

            // Sum child events
            childEvents.forEach((eventId) => {
                const count = getFilteredCount(record, eventId);
                groupedData[timeKey].childTotal += count;
                groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
            });
        });

        // Calculate percentages
        return Object.entries(groupedData)
            .map(([timeKey, values]) => ({
                time: timeKey,
                percentage: values.parentTotal > 0 ? (values.childTotal / values.parentTotal) * 100 : 0,
                parentCount: values.parentTotal,
                childCount: values.childTotal,
                timestamp: values.timestamp,
                // Store detailed breakdown for drill-down
                details: {
                    timestamp: values.timestamp,
                    timeLabel: timeKey,
                    ratio: values.parentTotal > 0 ? (values.childTotal / values.parentTotal) * 100 : 0,
                    parentTotal: values.parentTotal,
                    childTotal: values.childTotal,
                    parentBreakdown: Object.entries(values.parentBreakdown).map(([id, count]) => ({
                        id,
                        name: eventNames[id] || id,
                        count
                    })).sort((a, b) => b.count - a.count),
                    childBreakdown: Object.entries(values.childBreakdown).map(([id, count]) => ({
                        id,
                        name: eventNames[id] || id,
                        count
                    })).sort((a, b) => b.count - a.count)
                } as DrillDownData
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
        <>
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
                                    {filters?.statusCodes?.length ? <span className="ml-1 text-purple-600 font-medium">(Filtered by Status)</span> : null}
                                    {filters?.cacheStatus?.length ? <span className="ml-1 text-purple-600 font-medium">(Filtered by Cache)</span> : null}
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
                            <div className="text-xs text-muted-foreground mt-1">Numerator (Child)</div>
                            <div className="text-xs text-muted-foreground truncate" title={getChildEventNames()}>
                                {getChildEventNames()}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {overallStats.totalParent.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Denominator (Parent)</div>
                            <div className="text-xs text-muted-foreground truncate" title={getParentEventNames()}>
                                {getParentEventNames()}
                            </div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {overallStats.percentage.toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Ratio</div>
                            <div className="text-xs text-muted-foreground">
                                Range: {overallStats.minPercentage.toFixed(1)}% - {overallStats.maxPercentage.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* Line Chart */}
                    <div className="h-[500px] mt-4 relative">
                        <p className="absolute top-2 right-2 z-10 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm border border-purple-300 dark:border-purple-600">
                            💡 Click any point for detailed breakdown
                        </p>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={chartData}
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload[0]) {
                                        setSelectedPoint(data.activePayload[0].payload.details);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
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
                                <Tooltip
                                    cursor={{ stroke: '#8b5cf6', strokeWidth: 2 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                                                    <p className="text-sm font-semibold mb-2">{data.time}</p>
                                                    <div className="space-y-1 text-xs">
                                                        <p className="text-purple-600 dark:text-purple-400 font-bold">
                                                            Ratio: {data.percentage.toFixed(2)}%
                                                        </p>
                                                        <p className="text-green-600 dark:text-green-400">
                                                            Child: {data.childCount.toLocaleString()}
                                                        </p>
                                                        <p className="text-blue-600 dark:text-blue-400">
                                                            Parent: {data.parentCount.toLocaleString()}
                                                        </p>
                                                        <p className="text-muted-foreground italic mt-2 text-[10px]">
                                                            Click to drill down
                                                        </p>
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
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Simple Legend */}
                    <div className="mt-4 flex justify-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div>
                            <span>Numerator (Child Events)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded"></div>
                            <span>Denominator (Parent Events)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Drill Down Modal */}
            <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Analysis for {selectedPoint?.timeLabel}</span>
                            <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                                {selectedPoint?.ratio.toFixed(2)}% Ratio
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Detailed breakdown of parent and child events for this timestamp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Child Events Breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Numerator (Child)
                                <span className="ml-auto text-xs bg-green-100 px-2 py-0.5 rounded-full">
                                    Total: {selectedPoint?.childTotal.toLocaleString()}
                                </span>
                            </h4>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {selectedPoint?.childBreakdown.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-green-50/50 rounded border border-green-100">
                                        <div className="truncate flex-1 pr-2" title={item.name}>
                                            <span className="font-medium text-green-800">{item.name}</span>
                                        </div>
                                        <div className="font-bold text-green-600">
                                            {item.count.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                {selectedPoint?.childBreakdown.length === 0 && (
                                    <div className="text-center text-muted-foreground text-xs py-4">No child events recorded</div>
                                )}
                            </div>
                        </div>

                        {/* Parent Events Breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Denominator (Parent)
                                <span className="ml-auto text-xs bg-blue-100 px-2 py-0.5 rounded-full">
                                    Total: {selectedPoint?.parentTotal.toLocaleString()}
                                </span>
                            </h4>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {selectedPoint?.parentBreakdown.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-blue-50/50 rounded border border-blue-100">
                                        <div className="truncate flex-1 pr-2" title={item.name}>
                                            <span className="font-medium text-blue-800">{item.name}</span>
                                        </div>
                                        <div className="font-bold text-blue-600">
                                            {item.count.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                {selectedPoint?.parentBreakdown.length === 0 && (
                                    <div className="text-center text-muted-foreground text-xs py-4">No parent events recorded</div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
