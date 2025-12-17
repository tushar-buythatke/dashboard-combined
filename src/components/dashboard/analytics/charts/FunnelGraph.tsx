import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, TrendingDown, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelGraphProps {
    data: any[];
    stages: Array<{
        eventId: string;
        eventName: string;
        color?: string;
    }>;
    multipleChildEvents: string[]; // Last stage can have multiple events
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
}

interface FunnelStageData {
    eventId: string;
    eventName: string;
    count: number;
    percentage: number; // Relative to first stage (100%)
    dropoffPercentage: number; // Dropoff from previous stage
    color: string;
    isMultiple?: boolean;
    children?: Array<{
        eventId: string;
        eventName: string;
        count: number;
        percentage: number;
        color: string;
    }>;
}

/**
 * Funnel Graph Component
 * Shows conversion funnel visualization with percentages and dropoffs
 * Uses successCount from graph API data
 * Formula: (current_stage_successCount / first_stage_successCount) × 100
 */
export function FunnelGraph({ data, stages, multipleChildEvents, eventColors, eventNames }: FunnelGraphProps) {
    const funnelData = useMemo<FunnelStageData[]>(() => {
        if (!data || data.length === 0 || stages.length === 0) return [];

        // Calculate counts for each stage using successCount or count
        const stageCounts = stages.map((stage) => {
            let count = 0;
            data.forEach((record) => {
                const successKey = `${stage.eventId}_success`;
                const countKey = `${stage.eventId}_count`;
                count += Number(record[successKey] || record[countKey] || 0);
            });
            return { ...stage, count };
        });

        // First stage count is the base (100%)
        const baseCount = stageCounts[0]?.count || 1;

        // Process all stages except the last one
        const processedStages: FunnelStageData[] = stageCounts.slice(0, -1).map((stage, index) => {
            const prevCount = index > 0 ? stageCounts[index - 1].count : stage.count;
            const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;

            return {
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[stage.eventId] || stage.eventId,
                count: stage.count,
                percentage: (stage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: stage.color || eventColors[stage.eventId] || '#3b82f6',
                isMultiple: false,
            };
        });

        // Process last stage with multiple children
        if (multipleChildEvents && multipleChildEvents.length > 0) {
            const lastStageChildren = multipleChildEvents.map((childEventId) => {
                let count = 0;
                data.forEach((record) => {
                    const successKey = `${childEventId}_success`;
                    const countKey = `${childEventId}_count`;
                    count += Number(record[successKey] || record[countKey] || 0);
                });

                return {
                    eventId: childEventId,
                    eventName: eventNames[childEventId] || childEventId,
                    count,
                    percentage: (count / baseCount) * 100,
                    color: eventColors[childEventId] || '#3b82f6',
                };
            });

            const totalLastStageCount = lastStageChildren.reduce((sum, child) => sum + child.count, 0);
            const prevCount = stageCounts[stageCounts.length - 2]?.count || totalLastStageCount;
            const dropoff = prevCount > 0 ? ((prevCount - totalLastStageCount) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: 'multiple',
                eventName: stages[stages.length - 1]?.eventName || 'Final Stage',
                count: totalLastStageCount,
                percentage: (totalLastStageCount / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: '#3b82f6',
                isMultiple: true,
                children: lastStageChildren,
            } as FunnelStageData);
        } else if (stageCounts.length > 0) {
            // Single last stage
            const lastStage = stageCounts[stageCounts.length - 1];
            const prevCount = stageCounts[stageCounts.length - 2]?.count || lastStage.count;
            const dropoff = prevCount > 0 ? ((prevCount - lastStage.count) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: lastStage.eventId,
                eventName: lastStage.eventName || eventNames[lastStage.eventId] || lastStage.eventId,
                count: lastStage.count,
                percentage: (lastStage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: lastStage.color || eventColors[lastStage.eventId] || '#3b82f6',
                isMultiple: false,
            });
        }

        return processedStages;
    }, [data, stages, multipleChildEvents, eventColors, eventNames]);

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

    const maxWidth = 100;

    return (
        <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl">
            <CardHeader className="pb-3 px-4 md:px-6 bg-gradient-to-r from-blue-50/80 to-cyan-50/60 dark:from-blue-900/20 dark:to-cyan-900/10 border-b border-blue-200/40 dark:border-blue-500/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
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
                <div className="relative h-[350px] mt-8 flex items-end justify-center gap-4 px-4 md:px-12">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {/* 100% Line */}
                        <div className="absolute top-0 left-0 w-full border-t border-dashed border-slate-300 dark:border-slate-600">
                            <span className="absolute -top-3 left-0 text-[10px] text-muted-foreground bg-white dark:bg-slate-900 px-1">100%</span>
                        </div>
                        {/* 75% Line */}
                        <div className="absolute top-1/4 left-0 w-full border-t border-dashed border-slate-200 dark:border-slate-700 opacity-50">
                            <span className="absolute -top-3 left-0 text-[10px] text-muted-foreground bg-white dark:bg-slate-900 px-1">75%</span>
                        </div>
                        {/* 50% Line */}
                        <div className="absolute top-2/4 left-0 w-full border-t border-dashed border-slate-200 dark:border-slate-700 opacity-50">
                            <span className="absolute -top-3 left-0 text-[10px] text-muted-foreground bg-white dark:bg-slate-900 px-1">50%</span>
                        </div>
                        {/* 25% Line */}
                        <div className="absolute top-3/4 left-0 w-full border-t border-dashed border-slate-200 dark:border-slate-700 opacity-50">
                            <span className="absolute -top-3 left-0 text-[10px] text-muted-foreground bg-white dark:bg-slate-900 px-1">25%</span>
                        </div>
                        {/* 0% Line */}
                        <div className="absolute bottom-0 left-0 w-full border-t border-slate-300 dark:border-slate-600" />
                    </div>

                    {funnelData.map((stage, index) => {
                        const height = Math.max(stage.percentage, 2); // Min height for visibility
                        const isFirst = index === 0;

                        return (
                            <div key={stage.eventId} className="relative z-10 flex flex-col items-center group flex-1 max-w-[120px]">
                                {/* Dropoff Label (conditionally shown on hover or always?) */}
                                {!isFirst && (
                                    <div className="absolute -left-1/2 top-1/2 -ml-2 text-[10px] font-bold text-red-500 bg-white/80 dark:bg-slate-900/80 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap">
                                        -{stage.dropoffPercentage.toFixed(1)}%
                                    </div>
                                )}

                                {/* Percentage Label */}
                                <div className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform">
                                    {stage.percentage.toFixed(1)}%
                                </div>

                                {/* Bar Container */}
                                <div className="w-full relative flex items-end justify-center h-full">
                                    {/* Vertical Bar */}
                                    {!stage.isMultiple ? (
                                        <div
                                            className={cn(
                                                "w-full rounded-t-lg transition-all duration-500 hover:brightness-110 cursor-pointer relative overflow-hidden shadow-lg",
                                                // Gradients
                                                "bg-gradient-to-t from-opacity-90 to-opacity-100"
                                            )}
                                            style={{
                                                height: `${height}%`,
                                                backgroundColor: stage.color,
                                            }}
                                        >
                                            {/* Hover highlight */}
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                                            {/* Count inside bar */}
                                            <div className="absolute bottom-2 inset-x-0 text-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                {stage.count.toLocaleString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full flex items-end rounded-t-lg overflow-hidden shadow-lg"
                                            style={{ height: `${height}%` }}
                                        >
                                            {stage.children?.map((child, idx) => {
                                                const childHeightPct = stage.count > 0 ? (child.count / stage.count) * 100 : 0;
                                                return (
                                                    <div
                                                        key={child.eventId}
                                                        className="flex-1 h-full hover:brightness-125 transition-all relative group/child"
                                                        style={{
                                                            backgroundColor: child.color,
                                                            height: '100%' // They share the full height of the parent stack? No, side by side or stacked? 
                                                            // User wants decomposition of the last stage. 
                                                            // If they are strictly parts of the total, stacked is better for height consistency, 
                                                            // but typically multi-select breakdown implies comparing them side-by-side or stacked.
                                                            // Let's go with Stacked proportional vertical segments? No, that's hard to read.
                                                            // Let's do horizontal distribution within the bar (side-by-side slices)
                                                        }}
                                                        title={`${child.eventName}: ${child.count.toLocaleString()} (${child.percentage.toFixed(1)}%)`}
                                                    >
                                                        <div className="absolute bottom-1 inset-x-0 text-center text-[8px] text-white opacity-0 group-hover/child:opacity-100 truncate px-1">
                                                            {child.eventName}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* X-Axis Label */}
                                <div className="mt-3 text-center">
                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={stage.eventName}>
                                        {stage.eventName}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Step {index + 1}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {funnelData[0]?.count.toLocaleString() || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Started</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {funnelData[funnelData.length - 1]?.count.toLocaleString() || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Completed</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {funnelData[funnelData.length - 1]?.percentage.toFixed(1) || 0}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Conversion Rate</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
