import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Filter, TrendingDown, X, BarChart3, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelGraphProps {
    data: any[];
    stages: Array<{
        eventId: string;
        eventName: string;
        color?: string;
    }>;
    multipleChildEvents: string[];
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
    filters?: {
        statusCodes?: string[];
        cacheStatus?: string[];
    };
    onViewAsPercentage?: (parentEventId: string, childEventIds: string[]) => void;
    isAvgDelayMode?: boolean; // When true, show avg delay instead of count
}

interface FunnelStageData {
    eventId: string;
    eventName: string;
    count: number;
    avgDelay?: number; // Average delay in ms (for avgDelay mode)
    percentage: number;
    dropoffPercentage: number;
    color: string;
    isMultiple?: boolean;
    isAvgMetric?: boolean; // Indicates this is avgDelay metric
    children?: Array<{
        eventId: string;
        eventName: string;
        count: number;
        avgDelay?: number;
        percentage: number;
        color: string;
    }>;
}

export function FunnelGraph({ data, stages, multipleChildEvents, eventColors, eventNames, filters, onViewAsPercentage, isAvgDelayMode = false }: FunnelGraphProps) {
    const [selectedStage, setSelectedStage] = useState<FunnelStageData | null>(null);
    // Stage highlighting state: null = show all, or specific stage eventId
    const [highlightedStageId, setHighlightedStageId] = useState<string | null>(null);

    const funnelData = useMemo<FunnelStageData[]>(() => {
        if (!data || data.length === 0 || stages.length === 0) return [];

        const funnelPalette = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

        const statusCodes = (filters?.statusCodes || []).filter(Boolean);
        const cacheStatuses = (filters?.cacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        const stageCounts = stages.map((stage) => {
            let count = 0;
            let avgDelaySum = 0;
            let avgDelayCount = 0;

            // Check if data is raw (has eventId and avgDelay fields)
            const isRawData = data.length > 0 && data[0].eventId !== undefined;
            const hasAvgData = isRawData && (data[0].avgDelay !== undefined || data[0].avg !== undefined);

            data.forEach((record) => {
                if (hasStatusFilter || hasCacheFilter) {
                    const baseName = eventNames[stage.eventId] || `Event ${stage.eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                    if (hasStatusFilter) {
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
                } else if (isRawData && String(record.eventId) === String(stage.eventId)) {
                    // Raw data
                    if (isAvgDelayMode && hasAvgData) {
                        // avgDelay mode - accumulate for averaging
                        const delay = Number(record.avgDelay || record.avg || 0);
                        if (delay > 0) {
                            avgDelaySum += delay;
                            avgDelayCount += 1;
                        }
                    }
                    // Always count occurrences for percentage calculation
                    count += Number(record.count || record.successCount || 1);
                } else if (!isRawData) {
                    // Processed data
                    const successKey = `${stage.eventId}_success`;
                    const countKey = `${stage.eventId}_count`;
                    count += Number(record[successKey] || record[countKey] || 0);
                }
            });

            // Calculate average delay if in avgDelay mode
            const avgDelay = avgDelayCount > 0 ? avgDelaySum / avgDelayCount : 0;

            return { ...stage, count, avgDelay, isAvgMetric: isAvgDelayMode && hasAvgData };
        });

        const baseCount = stageCounts[0]?.count || 1;

        // Check if we have multiple child events for the final stage
        const hasMultipleChildren = multipleChildEvents && multipleChildEvents.length > 0;

        // Process ALL stages from the stages array as regular stages
        const regularStages = stageCounts;

        const processedStages: FunnelStageData[] = regularStages.map((stage, index) => {
            const prevCount = index > 0 ? regularStages[index - 1].count : stage.count;
            const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;

            return {
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[stage.eventId] || stage.eventId,
                count: stage.count,
                avgDelay: stage.avgDelay,
                percentage: (stage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[index % funnelPalette.length],
                isMultiple: false,
                isAvgMetric: stage.isAvgMetric,
            };
        });

        // Add final stage with multiple children aggregate (AFTER all regular stages)
        if (hasMultipleChildren) {
            // Final stage is an aggregate of multiple child events (AC_process_success, AC_process_failed)
            const lastStageChildren = multipleChildEvents.map((childEventId, idx) => {
                let count = 0;

                // Check if data is raw
                const isRawData = data.length > 0 && data[0].eventId !== undefined;
                const hasAvgData = isRawData && (data[0].avgDelay !== undefined || data[0].avg !== undefined);
                data.forEach((record) => {
                    if (hasStatusFilter || hasCacheFilter) {
                        const baseName = eventNames[childEventId] || `Event ${childEventId}`;
                        const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                        if (hasStatusFilter) {
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
                    } else if (isRawData && String(record.eventId) === String(childEventId)) {
                        // Raw data - for funnel, always count occurrences (not average delay)
                        count += 1;
                    } else if (!isRawData) {
                        // Processed data
                        const successKey = `${childEventId}_success`;
                        const countKey = `${childEventId}_count`;
                        count += Number(record[successKey] || record[countKey] || 0);
                    }
                });

                // For funnel graphs, we always use count (number of occurrences)
                return {
                    eventId: childEventId,
                    eventName: eventNames[childEventId] || childEventId,
                    count,
                    percentage: (count / baseCount) * 100,
                    color: funnelPalette[idx % funnelPalette.length],
                };
            });

            const totalLastStageCount = lastStageChildren.reduce((sum, child) => sum + child.count, 0);
            const prevCount = regularStages[regularStages.length - 1]?.count || totalLastStageCount;
            const dropoff = prevCount > 0 ? ((prevCount - totalLastStageCount) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: 'final_multiple',
                eventName: 'Final Stage (Combined)',
                count: totalLastStageCount,
                percentage: (totalLastStageCount / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[(processedStages.length) % funnelPalette.length],
                isMultiple: true,
                children: lastStageChildren,
            });
        }

        return processedStages;
    }, [data, stages, multipleChildEvents, eventColors, eventNames, filters]);

    if (!funnelData || funnelData.length === 0) {
        return (
            <Card className="border border-blue-200/60 dark:border-blue-500/30">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-5 w-5 text-blue-500" />
                        Conversion Funnel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No data available for funnel stages
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-xl rounded-2xl">
                <CardHeader className="pb-4 px-6 bg-gradient-to-r from-blue-50/80 to-cyan-50/60 dark:from-blue-900/20 dark:to-cyan-900/10 border-b border-blue-200/40 dark:border-blue-500/20">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Filter className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg">Conversion Funnel</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Event flow analysis • {funnelData.length} stages
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingDown className="h-4 w-4" />
                            <span>Success rate tracking</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <div className="relative h-[420px] flex items-end justify-center gap-4 md:gap-6 pl-12 pr-8 md:pl-14 md:pr-12">
                        {/* Grid Lines - representing 0%, 25%, 50%, 75%, 100% */}
                        <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none" style={{ left: '3rem', right: '2rem' }}>
                            {[0, 25, 50, 75, 100].map((level) => (
                                <div
                                    key={level}
                                    className="absolute left-0 w-full flex items-center"
                                    style={{ bottom: `${level}%` }}
                                >
                                    <span className="absolute -left-9 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                        {level}%
                                    </span>
                                    <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600/50" />
                                </div>
                            ))}
                        </div>

                        {funnelData.map((stage, index) => {
                            const heightPct = Math.max(Math.min(stage.percentage, 100), 2);
                            const isSelected = selectedStage?.eventId === stage.eventId;
                            const isFinalMultiple = stage.isMultiple && stage.children;

                            return (
                                <div
                                    key={stage.eventId}
                                    className="flex flex-col items-center group w-16 sm:w-20 md:w-24 h-full cursor-pointer relative z-10"
                                    onClick={() => setSelectedStage(stage)}
                                    title={`${stage.eventName}\nCount: ${stage.count.toLocaleString()}\nPercentage: ${stage.percentage.toFixed(2)}%\nDrop-off: ${stage.dropoffPercentage.toFixed(2)}%`}
                                >
                                    {/* Bar container - aligned to bottom (0%) */}
                                    <div className="flex-1 flex items-end w-full relative">
                                        {!isFinalMultiple ? (
                                            /* Regular single-event bar */
                                            <div
                                                className={cn(
                                                    "relative w-full transition-all duration-300 shadow-md rounded-t-xl overflow-hidden",
                                                    "bg-gradient-to-t from-indigo-400/90 to-indigo-500/90",
                                                    "hover:from-indigo-500/90 hover:to-indigo-600/90",
                                                    "border-2 border-indigo-500/30 dark:border-indigo-400/30",
                                                    isSelected && "ring-4 ring-indigo-300/50 dark:ring-indigo-400/50 scale-105"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            >
                                                {/* Percentage label INSIDE the bar */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-white font-bold text-xs sm:text-sm md:text-base drop-shadow-lg">
                                                        {stage.percentage.toFixed(1)}%
                                                    </span>
                                                </div>

                                                {/* Count on hover */}
                                                <div className={cn(
                                                    "absolute inset-x-0 top-2 flex items-center justify-center text-white text-[9px] sm:text-[10px] font-semibold px-1 transition-opacity",
                                                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                )}>
                                                    <span className="drop-shadow-lg bg-black/20 px-1.5 py-0.5 rounded text-center">
                                                        {stage.count.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Final stage with multiple events - stacked segments showing INDIVIDUAL percentages */
                                            <div
                                                className={cn(
                                                    "relative w-full transition-all duration-300 shadow-md rounded-t-xl overflow-hidden border-2 border-gray-300 dark:border-gray-600",
                                                    isSelected && "ring-4 ring-purple-300/50 dark:ring-purple-400/50 scale-105"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            >
                                                {/* Stacked segments for each child event - from bottom to top */}
                                                {stage.children?.slice().reverse().map((child, childIdx) => {
                                                    // Calculate height based on child's individual percentage relative to total
                                                    const childHeightPct = (child.percentage / stage.percentage) * 100;
                                                    // Pastel colors in blue/purple/indigo spectrum - consistent with theme
                                                    const segmentColors = [
                                                        'from-indigo-300/80 to-indigo-400/80',
                                                        'from-purple-300/80 to-purple-400/80',
                                                        'from-blue-300/80 to-blue-400/80',
                                                        'from-violet-300/80 to-violet-400/80',
                                                        'from-cyan-300/80 to-cyan-400/80',
                                                        'from-fuchsia-300/80 to-fuchsia-400/80',
                                                    ];

                                                    return (
                                                        <div
                                                            key={child.eventId}
                                                            className={cn(
                                                                "w-full bg-gradient-to-t relative",
                                                                segmentColors[childIdx % segmentColors.length]
                                                            )}
                                                            style={{ height: `${childHeightPct}%` }}
                                                        >
                                                            {/* Show INDIVIDUAL percentage for each segment */}
                                                            {child.percentage > 10 && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-white font-bold text-[10px] sm:text-xs drop-shadow-lg">
                                                                        {child.percentage.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Count on hover - NO total percentage overlay */}
                                                <div className={cn(
                                                    "absolute inset-x-0 top-2 flex items-center justify-center text-white text-[9px] sm:text-[10px] font-semibold px-1 transition-opacity",
                                                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                )}>
                                                    <span className="drop-shadow-lg bg-black/30 px-1.5 py-0.5 rounded text-center">
                                                        {stage.count.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stage label with event name */}
                                    <div className="mt-3 text-center w-full px-1">
                                        <div
                                            className={cn(
                                                "text-[10px] sm:text-xs font-semibold transition-colors mb-1 truncate max-w-full",
                                                isSelected
                                                    ? "text-indigo-600 dark:text-indigo-400"
                                                    : "text-gray-700 dark:text-gray-300"
                                            )}
                                            title={`${index + 1}. ${stage.eventName}`}
                                        >
                                            {index + 1}. {stage.eventName}
                                        </div>
                                        <div className="text-[9px] text-gray-500 dark:text-gray-400">
                                            {stage.count.toLocaleString()} users
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary Footer with Final Stage Toggle */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {funnelData[0]?.count.toLocaleString() || 0}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Started</div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {funnelData[funnelData.length - 1]?.count.toLocaleString() || 0}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Completed</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {funnelData[funnelData.length - 1]?.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Conversion Rate</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-500/30">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs font-medium bg-white/80 hover:bg-white border-orange-300 text-orange-700 hover:text-orange-800"
                                    onClick={() => {
                                        if (onViewAsPercentage && stages.length > 0) {
                                            // Use first stage as parent
                                            const parentEventId = stages[0].eventId;
                                            // Combine ALL stages + multipleChildEvents for child selection
                                            const allChildEvents = [
                                                ...stages.slice(1).map(s => s.eventId), // All stages except first (parent)
                                                ...multipleChildEvents
                                            ];
                                            onViewAsPercentage(parentEventId, allChildEvents);
                                        }
                                    }}
                                >
                                    <BarChart3 className="h-3 w-3 mr-1" />
                                    View as %
                                </Button>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">All Stages Analysis</div>
                            </div>
                        </div>

                        {/* Stage Selection Buttons */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-muted-foreground mr-2">Highlight Stage:</span>
                                <button
                                    onClick={() => setHighlightedStageId(null)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                        highlightedStageId === null
                                            ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    )}
                                >
                                    All
                                </button>
                                {funnelData.map((stage, idx) => (
                                    <button
                                        key={stage.eventId}
                                        onClick={() => setHighlightedStageId(stage.eventId === highlightedStageId ? null : stage.eventId)}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                                            highlightedStageId === stage.eventId
                                                ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: stage.color }}
                                        />
                                        {idx + 1}. {stage.eventName.length > 12 ? `${stage.eventName.substring(0, 12)}...` : stage.eventName}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Expanded Stage Details Modal */}
            <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
                <DialogContent
                    showCloseButton={false}
                    className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-white dark:bg-slate-900"
                >
                    {selectedStage && (
                        <>
                            {/* Premium Header */}
                            <div className="relative px-6 py-5 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <BarChart3 className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold">{selectedStage.eventName}</h2>
                                        <p className="text-blue-100 text-sm">
                                            Stage {funnelData.findIndex(s => s.eventId === selectedStage.eventId) + 1} of {funnelData.length}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedStage(null)}
                                        className="ml-auto h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="p-6 md:p-8">
                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-blue-200/50 dark:border-blue-500/30 p-5 shadow-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">Total Count</span>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                            {selectedStage.count.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-purple-200/50 dark:border-purple-500/30 p-5 shadow-lg">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <span className="text-sm font-medium text-muted-foreground">Conversion %</span>
                                        </div>
                                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                            {selectedStage.percentage.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Drop-off Analysis (if not first stage) */}
                                {funnelData.findIndex(s => s.eventId === selectedStage.eventId) > 0 && (
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-orange-200/50 dark:border-orange-500/30 p-5 shadow-lg mb-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                                <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <span className="text-sm font-semibold">Drop-off Analysis</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                {selectedStage.dropoffPercentage.toFixed(1)}%
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                dropped from previous stage
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Child Events Breakdown (for multiple events stage) */}
                                {selectedStage.isMultiple && selectedStage.children && selectedStage.children.length > 0 && (
                                    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-500/30 p-5 shadow-lg">
                                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            Event Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedStage.children.map((child, idx) => (
                                                <div
                                                    key={child.eventId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: child.color }}
                                                        />
                                                        <span className="text-sm font-medium">{child.eventName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold">{child.count.toLocaleString()}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {child.percentage.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stage Info Footer */}
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Event ID: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{selectedStage.eventId}</code></span>
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