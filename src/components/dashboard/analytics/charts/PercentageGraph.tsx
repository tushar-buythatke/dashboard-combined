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
    dateRange?: { from: Date; to: Date };
    parentEvents: string[];
    childEvents: string[];
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
    filters?: {
        statusCodes: string[];
        cacheStatus: string[];
    };
    showCombinedPercentage?: boolean;
    isHourly?: boolean;
    onToggleBackToFunnel?: () => void;
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
    onToggleBackToFunnel,
}: PercentageGraphProps) {
    const debug = false;
    if (debug) {
        console.log('PercentageGraph received data:', data.length, 'records');
        console.log('Parent events:', parentEvents);
        console.log('Child events:', childEvents);
        console.log('Filters:', filters);
        console.log('Sample data record:', data[0]);
        console.log('Data keys:', data[0] ? Object.keys(data[0]) : 'No data');
    }

    const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const statusCodes = (filters?.statusCodes || []).filter(Boolean);
        const cacheStatuses = (filters?.cacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        // Early return for no filters to avoid unnecessary processing
        if (!hasStatusFilter && !hasCacheFilter) {
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

                // Fast path for unfiltered data
                // Option A: for raw API data we always use `count` (not successCount)
                const isRawApiData = record.eventId !== undefined && record.status !== undefined;

                parentEvents.forEach((eventId) => {
                    const count = isRawApiData
                        ? (String(record.eventId) === String(eventId) ? Number(record.count || 0) : 0)
                        : Number(record[`${eventId}_success`] || record[`${eventId}_count`] || 0);
                    groupedData[timeKey].parentTotal += count;
                    groupedData[timeKey].parentBreakdown[eventId] = (groupedData[timeKey].parentBreakdown[eventId] || 0) + count;
                });

                childEvents.forEach((eventId) => {
                    const count = isRawApiData
                        ? (String(record.eventId) === String(eventId) ? Number(record.count || 0) : 0)
                        : Number(record[`${eventId}_success`] || record[`${eventId}_count`] || 0);
                    groupedData[timeKey].childTotal += count;
                    groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
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
        }

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
                // Parent events are ALWAYS unfiltered - use total count regardless of filters
                let totalCount = 0;
                
                // Check if this is raw API data (has eventId, status, cacheStatus fields)
                const isRawApiData = record.eventId !== undefined && record.status !== undefined;
                
                if (isRawApiData) {
                    // Raw API data - sum all records for this eventId (unfiltered total)
                    if (String(record.eventId) === String(eventId)) {
                        totalCount = Number(record.count || 0);
                    }
                } else {
                    // Processed data - use existing key-based logic
                    const baseName = eventNames[eventId] || `Event ${eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');
                    
                    // Check if this is an API event by looking for status/cache breakdown in the data
                    const hasApiBreakdown = Object.keys(record).some(key => key.includes(`${eventKey}_status_`) || key.includes(`${eventKey}_cache_`));
                    
                    if (hasApiBreakdown) {
                        // Sum all status codes and cache combinations for total unfiltered count
                        Object.keys(record).forEach(key => {
                            if (key.startsWith(`${eventKey}_status_`) && key.endsWith('_count')) {
                                totalCount += Number(record[key] || 0);
                            }
                        });
                    } else {
                        // Regular event - use success or count key
                        const successKey = `${eventId}_success`;
                        const countKey = `${eventId}_count`;
                        totalCount = Number(record[successKey] || record[countKey] || 0);
                    }
                }

                groupedData[timeKey].parentTotal += totalCount;
                groupedData[timeKey].parentBreakdown[eventId] =
                    (groupedData[timeKey].parentBreakdown[eventId] || 0) + totalCount;
            });

            childEvents.forEach((eventId) => {
                let count = 0;

                // Check if this is raw API data (has eventId, status, cacheStatus fields)
                const isRawApiData = record.eventId !== undefined && record.status !== undefined;

                if (isRawApiData) {
                    // Raw API data - match eventId and apply filters directly
                    if (String(record.eventId) === String(eventId)) {
                        const recordStatus = String(record.status);
                        const recordCache = String(record.cacheStatus || 'none');
                        
                        const statusMatch = !hasStatusFilter || statusCodes.includes(recordStatus);
                        const cacheMatch = !hasCacheFilter || cacheStatuses.includes(recordCache);
                        
                        if (statusMatch && cacheMatch) {
                            count = Number(record.count || 0);
                        }
                    }
                } else {
                    // Processed data - use existing key-based logic
                    if (hasStatusFilter || hasCacheFilter) {
                        const baseName = eventNames[eventId] || `Event ${eventId}`;
                        const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                        if (hasStatusFilter && hasCacheFilter) {
                            // Prefer combined keys if the backend provides them.
                            // If not present (only separate status/cache keys exist), fall back to status-only filtering.
                            const hasCombinedKeys = statusCodes.some((status) =>
                                cacheStatuses.some((cache) => Object.prototype.hasOwnProperty.call(record, `${eventKey}_status_${status}_cache_${cache}_count`))
                            );

                            if (hasCombinedKeys) {
                                statusCodes.forEach((status) => {
                                    cacheStatuses.forEach((cache) => {
                                        const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                                        const countKey = `${combinedKey}_count`;
                                        count += Number(record[countKey] || 0);
                                    });
                                });
                            } else {
                                statusCodes.forEach((status) => {
                                    const statusKey = `${eventKey}_status_${status}`;
                                    const countKey = `${statusKey}_count`;
                                    count += Number(record[countKey] || 0);
                                });
                            }
                        } else if (hasStatusFilter) {
                            statusCodes.forEach((status) => {
                                const statusKey = `${eventKey}_status_${status}`;
                                const countKey = `${statusKey}_count`;
                                count += Number(record[countKey] || 0);
                            });
                        } else if (hasCacheFilter) {
                            cacheStatuses.forEach((cache) => {
                                const cacheKey = `${eventKey}_cache_${cache}`;
                                const countKey = `${cacheKey}_count`;
                                count += Number(record[countKey] || 0);
                            });
                        }
                    } else {
                        const successKey = `${eventId}_success`;
                        const countKey = `${eventId}_count`;
                        count = Number(record[successKey] || record[countKey] || 0);
                    }
                }

                groupedData[timeKey].childTotal += count;
                groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
            });
        });

        const result = Object.entries(groupedData)
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

        if (debug) {
            console.log('Final processed chart data:', result);
            console.log('Total parent events across all time periods:', result.reduce((sum, r) => sum + r.parentCount, 0));
            console.log('Total child events across all time periods:', result.reduce((sum, r) => sum + r.childCount, 0));
        }
        
        return result;
    }, [data, parentEvents, childEvents, filters, eventNames, isHourly]);

    const overallStats = useMemo(() => {
        const totalParent = chartData.reduce((sum, d: any) => sum + (d.parentCount || 0), 0);
        const totalChild = chartData.reduce((sum, d: any) => sum + (d.childCount || 0), 0);
        const percentage = totalParent > 0 ? (totalChild / totalParent) * 100 : 0;

        const percentages = chartData.map((d: any) => d.percentage || 0);
        const minPercentage = percentages.length ? Math.min(...percentages) : 0;
        const maxPercentage = percentages.length ? Math.max(...percentages) : 0;

        if (debug) {
            console.log('OverallStats calculation:', { totalParent, totalChild, percentage });
        }

        return {
            totalParent,
            totalChild,
            percentage,
            minPercentage: isFinite(minPercentage) ? minPercentage : 0,
            maxPercentage: isFinite(maxPercentage) ? maxPercentage : 0,
        };
    }, [chartData]);

    const yAxisConfig = useMemo(() => {
        const maxP = Math.max(0, overallStats.maxPercentage || 0);
        if (maxP > 0 && maxP <= 5) {
            const upper = Math.max(1, Math.ceil(maxP * 1.25 * 100) / 100);
            const step = upper / 4;
            const ticks = [0, step, step * 2, step * 3, upper].map(v => Math.round(v * 100) / 100);
            return { domain: [0, upper] as [number, number], ticks };
        }
        return { domain: [0, 100] as [number, number], ticks: [0, 25, 50, 75, 100] };
    }, [overallStats.maxPercentage]);

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

    const getParentEventNames = () => parentEvents.map((id: string) => eventNames[id] || id).join(', ');
    const getChildEventNames = () => childEvents.map((id: string) => eventNames[id] || id).join(', ');

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
                    <div className="flex items-center gap-3">
                        {onToggleBackToFunnel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onToggleBackToFunnel}
                                className="text-xs font-medium bg-white/80 hover:bg-white border-purple-300 text-purple-700 hover:text-purple-800"
                            >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Back to Funnel
                            </Button>
                        )}
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1">
                            <span className="text-lg font-bold">{overallStats.percentage.toFixed(2)}%</span>
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6">
                {/* Summary Stats - Parent on Left, Child on Right */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {overallStats.totalParent.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Parent Events (Left)</div>
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
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {overallStats.totalChild.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Child Events (Right)</div>
                        <div className="text-xs text-muted-foreground truncate" title={getChildEventNames()}>
                            {getChildEventNames()}
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
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tickMargin={8}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                domain={yAxisConfig.domain}
                                ticks={yAxisConfig.ticks as any}
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
                                            <div className="bg-white dark:bg-white p-3 rounded-lg shadow-lg border border-gray-200" style={{ backgroundColor: 'white' }}>
                                                <p className="text-sm font-semibold mb-2 text-gray-900">{data.time}</p>
                                                <div className="space-y-1 text-xs">
                                                    <p className="text-purple-600 font-bold">
                                                        Percentage: {data.percentage.toFixed(2)}%
                                                    </p>
                                                    <p className="text-green-600">
                                                        Child: {data.childCount.toLocaleString()}
                                                    </p>
                                                    <p className="text-blue-600">
                                                        Parent: {data.parentCount.toLocaleString()}
                                                    </p>
                                                    {childEntries.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="font-semibold mb-1 text-xs text-green-700">Child breakdown</p>
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
                                                            <p className="font-semibold mb-1 text-xs text-blue-700">Parent breakdown</p>
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
                                isAnimationActive={false}
                                activeDot={{ 
                                    r: 8, 
                                    fill: "#8b5cf6",
                                    stroke: "#fff",
                                    strokeWidth: 2,
                                    cursor: "pointer",
                                    onClick: (e: any, payload: any) => {
                                        e?.stopPropagation?.();
                                        if (payload?.payload) {
                                            handleDataPointClick(payload.payload);
                                        }
                                    }
                                }}
                                onClick={(e: any) => {
                                    e?.stopPropagation?.();
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
                className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-white"
                style={{ backgroundColor: 'white' }}
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
                        <div className="p-6 md:p-8" style={{ backgroundColor: 'white' }}>
                            {/* Key Metric - Percentage */}
                            <div className="mb-6 p-6 bg-purple-100 rounded-2xl border-2 border-purple-300 shadow-lg text-center" style={{ backgroundColor: '#f3e8ff' }}>
                                <div className="text-5xl font-bold text-purple-600 mb-2">
                                    {selectedPoint.percentage.toFixed(2)}%
                                </div>
                                <div className="text-sm text-gray-600">
                                    Child / Parent Ratio
                                </div>
                            </div>

                            {/* Counts Grid - Parent Left, Child Right */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white dark:bg-white rounded-xl border border-blue-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Activity className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Parent Count</span>
                                    </div>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {selectedPoint.parentCount.toLocaleString()}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-white rounded-xl border border-green-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Child Count</span>
                                    </div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {selectedPoint.childCount.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Event Breakdowns - Parent Left, Child Right */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Parent Events Breakdown - LEFT SIDE */}
                                {selectedPoint.parentBreakdown && Object.keys(selectedPoint.parentBreakdown).length > 0 && (
                                    <div className="bg-white rounded-xl border border-blue-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-blue-700">
                                            <Activity className="h-4 w-4" />
                                            Parent Event Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(selectedPoint.parentBreakdown as Record<string, number>).map(([eventId, count]) => (
                                                <div
                                                    key={eventId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200"
                                                    style={{ backgroundColor: '#eff6ff' }}
                                                >
                                                    <span className="text-sm font-medium truncate flex-1 mr-2 text-gray-900">
                                                        {eventNames[eventId] || eventId}
                                                    </span>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-blue-700">
                                                            {count.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
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

                                {/* Child Events Breakdown - RIGHT SIDE */}
                                {selectedPoint.childBreakdown && Object.keys(selectedPoint.childBreakdown).length > 0 && (
                                    <div className="bg-white rounded-xl border border-green-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-green-700">
                                            <TrendingUp className="h-4 w-4" />
                                            Child Event Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(selectedPoint.childBreakdown as Record<string, number>).map(([eventId, count]) => (
                                                <div
                                                    key={eventId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                                                    style={{ backgroundColor: '#f0fdf4' }}
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
