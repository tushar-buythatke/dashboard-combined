import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Filter, TrendingDown, X, BarChart3, TrendingUp, Users, UserPlus } from 'lucide-react';
import { useChartZoom } from '@/hooks/useChartZoom';
import { ChartZoomControls } from '../components/ChartZoomControls';
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
    isHourly?: boolean;
    onToggleHourly?: (isHourly: boolean) => void;
}

interface FunnelStageData {
    eventId: string;
    eventName: string;
    count: number;
    avgDelay?: number; // Average delay in ms (for avgDelay mode)
    percentage: number;
    dropoffPercentage: number;
    color: string;
    totalUsers?: number;
    newUsers?: number;
    uniqueUsers?: number;
    isMultiple?: boolean;
    isAvgMetric?: boolean; // Indicates this is avgDelay metric
    children?: Array<{
        eventId: string;
        eventName: string;
        count: number;
        avgDelay?: number;
        percentage: number;
        color: string;
        totalUsers?: number;
        newUsers?: number;
        uniqueUsers?: number;
    }>;
}

export function FunnelGraph({ data, stages, multipleChildEvents, eventColors, eventNames, filters, onViewAsPercentage, isAvgDelayMode = false, isHourly = false, onToggleHourly }: FunnelGraphProps) {
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const [selectedStage, setSelectedStage] = useState<FunnelStageData | null>(null);
    // Stage highlighting state: null = show all, or specific stage eventId
    const [highlightedStageId, setHighlightedStageId] = useState<string | null>(null);
    // Hovered stage for tooltip
    const [hoveredStage, setHoveredStage] = useState<FunnelStageData | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (stage: FunnelStageData, e: React.MouseEvent) => {
        // Target the bar container (first child) for accurate measurement
        const barContainer = e.currentTarget.firstElementChild;
        if (!barContainer) return;

        const rect = barContainer.getBoundingClientRect();
        const heightPct = Math.max(Math.min(stage.percentage, 100), 2);
        const barHeight = (rect.height * heightPct) / 100;
        
        setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.bottom - barHeight - 12 // Reduced margin slightly for tighter feel
        });
        setHoveredStage(stage);
    };

    const funnelData = useMemo<FunnelStageData[]>(() => {
        if (!data || data.length === 0 || stages.length === 0) return [];

        const funnelPalette = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

        const statusCodes = (filters?.statusCodes || []).filter(Boolean);
        const cacheStatuses = (filters?.cacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        const stageCounts = stages.map((stage) => {
            let count = 0;
            let weightedDelaySum = 0;
            let delayCountBase = 0;

            // Check if data is raw (has eventId and avgDelay fields)
            const isRawData = data.length > 0 && data[0].eventId !== undefined;
            const hasAvgData = isRawData && (data[0].avgDelay !== undefined || data[0].avg !== undefined);

            data.forEach((record) => {
                // Aggregate user metrics for the stage
                const stageTotalUsers = Number(record[`${stage.eventId}_totalUsers`] || 0);
                const stageNewUsers = Number(record[`${stage.eventId}_newUsers`] || 0);
                const stageUniqueUsers = Number(record[`${stage.eventId}_uniqueUsers`] || 0);

                if (hasStatusFilter || hasCacheFilter) {
                    const baseName = eventNames[String(stage.eventId)] || `Event ${stage.eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                    if (hasStatusFilter) {
                        statusCodes.forEach((status) => {
                            const statusKey = `${eventKey}_status_${status}`;
                            const countKey = `${statusKey}_count`;
                            const currentCount = Number(record[countKey] || 0);
                            count += currentCount;

                            if (isAvgDelayMode) {
                                // For API filters, we might have avgDelay per status if available
                                // Assuming record has `${statusKey}_avgDelay`
                                const delay = Number(record[`${statusKey}_avgDelay`] || 0);
                                if (delay > 0) {
                                    weightedDelaySum += delay * currentCount;
                                    delayCountBase += currentCount;
                                }
                            }
                        });
                    } else if (hasCacheFilter) {
                        cacheStatuses.forEach((cache) => {
                            const cacheKey = `${eventKey}_cache_${cache}`;
                            const countKey = `${cacheKey}_count`;
                            const currentCount = Number(record[countKey] || 0);
                            count += currentCount;

                            if (isAvgDelayMode) {
                                const delay = Number(record[`${cacheKey}_avgDelay`] || 0);
                                if (delay > 0) {
                                    weightedDelaySum += delay * currentCount;
                                    delayCountBase += currentCount;
                                }
                            }
                        });
                    }
                } else if (isRawData && String(record.eventId) === String(stage.eventId)) {
                    // Raw data
                    const currentCount = Number(record.count || record.successCount || 1);

                    if (isAvgDelayMode && hasAvgData) {
                        // avgDelay mode - accumulate for weighted average
                        const delay = Number(record.avgDelay || record.avg || 0);
                        if (delay > 0) {
                            weightedDelaySum += delay * currentCount;
                            delayCountBase += currentCount;
                        }
                    }
                    // Always count occurrences for percentage calculation
                    count += currentCount;
                } else if (!isRawData) {
                    // Processed data
                    const successKey = `${stage.eventId}_success`;
                    const countKey = `${stage.eventId}_count`;
                    count += Number(record[successKey] || record[countKey] || 0);
                }
            });

            // Calculate average delay if in avgDelay mode
            const avgDelay = delayCountBase > 0 ? weightedDelaySum / delayCountBase : 0;

            // Aggregate user metrics for the stage
            let stageTotalUsers = 0;
            let stageNewUsers = 0;
            let stageUniqueUsers = 0;

            data.forEach((record) => {
                const isMatch = isRawData 
                    ? String(record.eventId) === String(stage.eventId)
                    : true; // For processed data, we assume the keys are stage-specific

                if (isMatch) {
                    const baseName = eventNames[String(stage.eventId)] || `Event ${stage.eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');
                    
                    // Priority 1: Keyed by event name (e.g., "GiftVoucher_totalUsers")
                    // Priority 2: Keyed by event ID (e.g., "45_totalUsers")
                    // Priority 3: Common snake_case keys
                    // Priority 4: Direct keys if it's raw data and the ID matches
                    stageTotalUsers += Number(
                        record[`${eventKey}_totalUsers`] || 
                        record[`${stage.eventId}_totalUsers`] || 
                        record[`${eventKey}_users`] || 
                        record[`${stage.eventId}_users`] || 
                        (isRawData ? (record.totalUsers || record.users || 0) : 0)
                    );
                    stageNewUsers += Number(
                        record[`${eventKey}_newUsers`] || 
                        record[`${stage.eventId}_newUsers`] || 
                        record[`${eventKey}_new_users`] || 
                        record[`${stage.eventId}_new_users`] || 
                        (isRawData ? (record.newUsers || record.new_users || 0) : 0)
                    );
                    stageUniqueUsers += Number(
                        record[`${eventKey}_uniqueUsers`] || 
                        record[`${stage.eventId}_uniqueUsers`] || 
                        record[`${eventKey}_unique_users`] || 
                        record[`${stage.eventId}_unique_users`] || 
                        (isRawData ? (record.uniqueUsers || record.unique_users || 0) : 0)
                    );
                }
            });

            return { ...stage, count, avgDelay, totalUsers: stageTotalUsers, newUsers: stageNewUsers, uniqueUsers: stageUniqueUsers, isAvgMetric: isAvgDelayMode && hasAvgData };
        });

        const baseCount = stageCounts[0]?.count || 1;

        // Check if we have multiple child events for the final stage
        const hasMultipleChildren = multipleChildEvents && multipleChildEvents.length > 0;

        // Process ALL stages from the stages array as regular stages
        const regularStages = stageCounts;

        const processedStages: FunnelStageData[] = regularStages.map((stage, index) => {
            const prevCount = index > 0 ? regularStages[index - 1].count : stage.count;
            const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;

            // Cap percentage at 100% for visualization purposes, but keep real value for labels if needed
            const rawPercentage = (stage.count / baseCount) * 100;
            
            return {
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[String(stage.eventId)] || `Event ${stage.eventId}`,
                count: stage.count,
                avgDelay: stage.avgDelay,
                totalUsers: stage.totalUsers,
                newUsers: stage.newUsers,
                uniqueUsers: stage.uniqueUsers,
                percentage: rawPercentage,
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
                let childTotalUsers = 0;
                let childNewUsers = 0;
                let childUniqueUsers = 0;

                // Check if data is raw
                const isRawData = data.length > 0 && data[0].eventId !== undefined;
                const hasAvgData = isRawData && (data[0].avgDelay !== undefined || data[0].avg !== undefined);
                data.forEach((record) => {
                    const isMatch = isRawData 
                        ? String(record.eventId) === String(childEventId)
                        : true;

                    if (isMatch) {
                        const baseName = eventNames[String(childEventId)] || `Event ${childEventId}`;
                        const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                        childTotalUsers += Number(
                            record[`${eventKey}_totalUsers`] || 
                            record[`${childEventId}_totalUsers`] || 
                            record[`${eventKey}_users`] || 
                            record[`${childEventId}_users`] || 
                            (isRawData ? (record.totalUsers || record.users || 0) : 0)
                        );
                        childNewUsers += Number(
                            record[`${eventKey}_newUsers`] || 
                            record[`${childEventId}_newUsers`] || 
                            record[`${eventKey}_new_users`] || 
                            record[`${childEventId}_new_users`] || 
                            (isRawData ? (record.newUsers || record.new_users || 0) : 0)
                        );
                        childUniqueUsers += Number(
                            record[`${eventKey}_uniqueUsers`] || 
                            record[`${childEventId}_uniqueUsers`] || 
                            record[`${eventKey}_unique_users`] || 
                            record[`${childEventId}_unique_users`] || 
                            (isRawData ? (record.uniqueUsers || record.unique_users || 0) : 0)
                        );
                    }

                    if (hasStatusFilter || hasCacheFilter) {
                        const baseName = eventNames[String(childEventId)] || `Event ${childEventId}`;
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
                    eventName: eventNames[String(childEventId)] || `Event ${childEventId}`,
                    count,
                    totalUsers: childTotalUsers,
                    newUsers: childNewUsers,
                    uniqueUsers: childUniqueUsers,
                    percentage: (count / baseCount) * 100,
                    color: funnelPalette[idx % funnelPalette.length],
                };
            });

            const totalLastStageCount = lastStageChildren.reduce((sum, child) => sum + child.count, 0);
            const totalLastStageUsers = lastStageChildren.reduce((sum, child) => sum + (child.totalUsers || 0), 0);
            const totalLastStageNewUsers = lastStageChildren.reduce((sum, child) => sum + (child.newUsers || 0), 0);
            const totalLastStageUniqueUsers = lastStageChildren.reduce((sum, child) => sum + (child.uniqueUsers || 0), 0);
            const prevCount = regularStages[regularStages.length - 1]?.count || totalLastStageCount;
            const dropoff = prevCount > 0 ? ((prevCount - totalLastStageCount) / prevCount) * 100 : 0;

            // If only 1 event in final stage, show its name; otherwise show "Final Stage (Combined)"
            const finalStageName = lastStageChildren.length === 1 
                ? lastStageChildren[0].eventName 
                : 'Final Stage (Combined)';

            processedStages.push({
                eventId: 'final_multiple',
                eventName: finalStageName,
                count: totalLastStageCount,
                totalUsers: totalLastStageUsers,
                newUsers: totalLastStageNewUsers,
                uniqueUsers: totalLastStageUniqueUsers,
                percentage: (totalLastStageCount / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[(processedStages.length) % funnelPalette.length],
                isMultiple: lastStageChildren.length > 1,
                children: lastStageChildren,
            });
        }

        // Filter out stages with 0 count to avoid "ugly" empty bars
        const filteredProcessedStages = processedStages.filter(stage => stage.count > 0);

        return filteredProcessedStages;
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
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Filter className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg">Conversion Funnel</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Event flow analysis • {funnelData.length} stages
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingDown className="h-5 w-5" />
                                <span className="font-medium">Success rate tracking</span>
                            </div>
                            {onToggleHourly && (
                                <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleHourly(false); }}
                                        className={cn(
                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                            !isHourly
                                                ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        DAILY
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleHourly(true); }}
                                        className={cn(
                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                            isHourly
                                                ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        HOURLY
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8 relative">
                    <div className="absolute top-2 right-2 z-50">
                        <ChartZoomControls
                            zoomLevel={zoomLevel}
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={resetZoom}
                        />
                    </div>
                    <div
                        className="relative h-[450px] flex items-end justify-center gap-6 md:gap-8 pl-12 pr-8 md:pl-14 md:pr-12 origin-center transition-transform duration-100 ease-out"
                        style={{ transform: `scale(${zoomLevel})` }}
                        onWheel={handleWheel}
                    >
                        {/* Grid Lines - representing 0%, 25%, 50%, 75%, 100% */}
                        <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none" style={{ left: '3rem', right: '2rem' }}>
                            {[0, 25, 50, 75, 100].map((level) => (
                                <div
                                    key={level}
                                    className="absolute left-0 w-full flex items-center"
                                    style={{ bottom: `${level}%` }}
                                >
                                    <span className="absolute -left-9 text-xs font-medium text-gray-500 dark:text-gray-400">
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
                                    className="flex flex-col items-center group w-24 sm:w-32 md:w-40 h-full cursor-pointer relative z-10"
                                    onClick={() => setSelectedStage(stage)}
                                    onMouseEnter={(e) => handleMouseEnter(stage, e)}
                                    onMouseLeave={() => setHoveredStage(null)}
                                >
                                    {/* Bar container - aligned to bottom (0%) */}
                                    <div className="flex-1 flex items-end w-full relative">
                                        {!isFinalMultiple ? (
                                            /* Regular single-event bar with dual metrics */
                                            <div
                                                className={cn(
                                                    "relative w-full transition-all duration-300 shadow-md rounded-t-xl overflow-visible",
                                                    // Color code based on drop-off percentage
                                                    stage.dropoffPercentage > 30
                                                        ? "bg-gradient-to-t from-red-400/90 to-red-500/90 hover:from-red-500/90 hover:to-red-600/90 border-2 border-red-500/30"
                                                        : stage.dropoffPercentage > 15
                                                            ? "bg-gradient-to-t from-orange-400/90 to-orange-500/90 hover:from-orange-500/90 hover:to-orange-600/90 border-2 border-orange-500/30"
                                                            : "bg-gradient-to-t from-indigo-400/90 to-indigo-500/90 hover:from-indigo-500/90 hover:to-indigo-600/90 border-2 border-indigo-500/30",
                                                    isSelected && "ring-4 ring-indigo-300/50 dark:ring-indigo-400/50 scale-105"
                                                )}
                                                style={{ height: `${heightPct}%` }}
                                            >
                                                {/* Labels ABOVE bar when percentage < 10% - positioned at top of bar with negative offset */}
                                                {stage.percentage < 10 && (
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 whitespace-nowrap transition-opacity duration-200 group-hover:opacity-0">
                                                        <span className="font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
                                                            {Math.min(stage.percentage, 100).toFixed(1)}%
                                                        </span>
                                                        <span className="font-semibold text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                                            {stage.count.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {/* Percentage and User Badges */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className="text-white font-bold text-base sm:text-lg md:text-xl drop-shadow-lg leading-none">
                                                            {Math.min(stage.percentage, 100).toFixed(1)}%
                                                        </span>
                                                        <span className="text-white/80 font-semibold text-[10px] sm:text-xs drop-shadow-lg leading-none">
                                                            {stage.count.toLocaleString()} hits
                                                        </span>
                                                    </div>
                                                    
                                                    {/* User Badges inside bar if space permits and data exists */}
                                                    {stage.percentage > 25 && (stage.totalUsers || 0) > 0 && (
                                                        <div className="mt-3 flex flex-col gap-1.5 w-full px-2 max-w-[120px]">
                                                            <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-md px-2 py-1 border border-white/10">
                                                                <Users className="h-2.5 w-2.5 text-white/80" />
                                                                <span className="text-[10px] font-bold text-white">{(stage.totalUsers || 0).toLocaleString()}</span>
                                                            </div>
                                                            {(stage.newUsers || 0) > 0 && (
                                                                <div className="flex items-center justify-between bg-teal-500/30 backdrop-blur-md rounded-md px-2 py-1 border border-white/10">
                                                                    <UserPlus className="h-2.5 w-2.5 text-white/80" />
                                                                    <span className="text-[10px] font-bold text-white">{(stage.newUsers || 0).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* High drop-off indicator */}
                                                {stage.dropoffPercentage > 20 && stage.percentage >= 10 && (
                                                    <div className="absolute top-2 right-2 bg-red-500/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/20">
                                                        <span className="text-white text-[10px] font-bold">{stage.dropoffPercentage >= 0 ? '-' : '+'}{Math.abs(stage.dropoffPercentage).toFixed(0)}%</span>
                                                    </div>
                                                )}
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
                                                                    <span className="text-white font-bold text-xs sm:text-sm drop-shadow-lg">
                                                                        {Math.min(child.percentage, 100).toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Count on hover - NO total percentage overlay */}
                                                <div className={cn(
                                                    "absolute inset-x-0 top-2 flex items-center justify-center text-white text-xs sm:text-sm font-semibold px-1 transition-opacity",
                                                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                )}>
                                                    <span className="drop-shadow-lg bg-black/30 px-2 py-1 rounded text-center">
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
                                                "text-xs sm:text-sm font-semibold transition-colors mb-1 truncate max-w-full",
                                                isSelected
                                                    ? "text-indigo-600 dark:text-indigo-400"
                                                    : "text-gray-700 dark:text-gray-300"
                                            )}
                                            title={`${index + 1}. ${stage.eventName}`}
                                        >
                                            {index + 1}. {stage.eventName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
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
                                <div className="flex flex-col items-center">
                                    <div className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {funnelData[0]?.count.toLocaleString() || 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1 font-medium">Total Hits</div>
                                    {(funnelData[0]?.totalUsers || 0) > 0 && (
                                        <div className="mt-2 flex items-center gap-2 text-[10px] bg-indigo-100/50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                            <Users className="h-3 w-3 text-indigo-500" />
                                            <span className="text-indigo-700 dark:text-indigo-300 font-bold">{(funnelData[0]?.totalUsers || 0).toLocaleString()} users</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-500/30">
                                <div className="flex flex-col items-center">
                                    <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {funnelData[funnelData.length - 1]?.count.toLocaleString() || 0}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1 font-medium">Completed</div>
                                    {(funnelData[funnelData.length - 1]?.totalUsers || 0) > 0 && (
                                        <div className="mt-2 flex items-center gap-2 text-[10px] bg-emerald-100/50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            <Users className="h-3 w-3 text-emerald-500" />
                                            <span className="text-emerald-700 dark:text-emerald-300 font-bold">{(funnelData[funnelData.length - 1]?.totalUsers || 0).toLocaleString()} users</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {Math.min(funnelData[funnelData.length - 1]?.percentage || 0, 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Conversion Rate</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-500/30 relative z-20">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-sm font-semibold bg-white/80 hover:bg-white border-orange-300 text-orange-700 hover:text-orange-800 relative z-30 cursor-pointer h-10"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent card clicks
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
                                    <BarChart3 className="h-4 w-4 mr-1.5" />
                                    View as %
                                </Button>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">All Stages Analysis</div>
                            </div>
                        </div>


                    </div>
                </CardContent>
            </Card >

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
                                            {Math.min(selectedStage.percentage, 100).toFixed(1)}%
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
                                                {selectedStage.dropoffPercentage >= 0 ? '-' : '+'}{Math.abs(selectedStage.dropoffPercentage).toFixed(1)}%
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
                                                            {Math.min(child.percentage, 100).toFixed(1)}%
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
            </Dialog >
            {/* Global Portal Tooltip - Renders outside stacking contexts */}
            {hoveredStage && createPortal(
                <div 
                    className="fixed z-[99999] pointer-events-none animate-in fade-in-0 duration-300 ease-out"
                    style={{ 
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-2 border-indigo-500/50 dark:border-indigo-400/40 p-5 min-w-[280px] isolation-auto relative">
                        {/* Tooltip Arrow */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-900 rotate-45 border-r-2 border-b-2 border-indigo-500/50 dark:border-indigo-400/40" />
                        
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3 truncate max-w-[240px] relative z-10" title={hoveredStage.eventName}>
                            {funnelData.findIndex(s => s.eventId === hoveredStage.eventId) + 1}. {hoveredStage.eventName}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Users</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{(hoveredStage.totalUsers || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">New</span>
                                <span className="font-bold text-teal-600 dark:text-teal-400">{(hoveredStage.newUsers || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold">Unique</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{(hoveredStage.uniqueUsers || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs relative z-10">
                            <div className="flex items-center justify-between gap-6">
                                <span className="text-gray-500 font-medium">Hits:</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{hoveredStage.count.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-6">
                                <span className="text-gray-500 font-medium">Percentage:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.min(hoveredStage.percentage, 100).toFixed(1)}%</span>
                            </div>
                            {funnelData.findIndex(s => s.eventId === hoveredStage.eventId) > 0 && (
                                <>
                                    <div className="flex items-center justify-between gap-6">
                                        <span className="text-gray-500 font-medium">{hoveredStage.dropoffPercentage > 0 ? 'Drop-off:' : 'Increase:'}</span>
                                        <span className={cn(
                                            "font-bold",
                                            hoveredStage.dropoffPercentage > 30 ? "text-red-600 dark:text-red-400" :
                                                hoveredStage.dropoffPercentage > 0 ? (hoveredStage.dropoffPercentage > 15 ? "text-orange-600 dark:text-orange-400" : "text-yellow-600 dark:text-yellow-400") :
                                                    "text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            {hoveredStage.dropoffPercentage >= 0 ? '-' : '+'}{Math.abs(hoveredStage.dropoffPercentage).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6">
                                        <span className="text-gray-500 font-medium">From previous:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                            {funnelData[funnelData.findIndex(s => s.eventId === hoveredStage.eventId) - 1]?.count.toLocaleString() || 0}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}