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
}

interface FunnelStageData {
    eventId: string;
    eventName: string;
    count: number;
    percentage: number;
    dropoffPercentage: number;
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

export function FunnelGraph({ data, stages, multipleChildEvents, eventColors, eventNames }: FunnelGraphProps) {
    const [selectedStage, setSelectedStage] = useState<FunnelStageData | null>(null);

    const funnelData = useMemo<FunnelStageData[]>(() => {
        if (!data || data.length === 0 || stages.length === 0) return [];

        const funnelPalette = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'];

        const stageCounts = stages.map((stage) => {
            let count = 0;
            data.forEach((record) => {
                const successKey = `${stage.eventId}_success`;
                const countKey = `${stage.eventId}_count`;
                count += Number(record[successKey] || record[countKey] || 0);
            });
            return { ...stage, count };
        });

        const baseCount = stageCounts[0]?.count || 1;

        // Check if we have multiple child events for the final stage
        const hasMultipleChildren = multipleChildEvents && multipleChildEvents.length > 0;
        
        // Process ALL regular stages (even if hasMultipleChildren, we want to show all stages)
        const regularStages = hasMultipleChildren ? stageCounts.slice(0, -1) : stageCounts;
        
        const processedStages: FunnelStageData[] = regularStages.map((stage, index) => {
            const prevCount = index > 0 ? regularStages[index - 1].count : stage.count;
            const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;

            return {
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[stage.eventId] || stage.eventId,
                count: stage.count,
                percentage: (stage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[index % funnelPalette.length],
                isMultiple: false,
            };
        });

        // Add final stage (either multiple children aggregate or single last stage)
        if (hasMultipleChildren) {
            // Final stage is an aggregate of multiple child events
            const lastStageChildren = multipleChildEvents.map((childEventId, idx) => {
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
                    color: funnelPalette[idx % funnelPalette.length],
                };
            });

            const totalLastStageCount = lastStageChildren.reduce((sum, child) => sum + child.count, 0);
            const prevCount = regularStages[regularStages.length - 1]?.count || totalLastStageCount;
            const dropoff = prevCount > 0 ? ((prevCount - totalLastStageCount) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: 'multiple',
                eventName: stages[stages.length - 1]?.eventName || 'Final Stage',
                count: totalLastStageCount,
                percentage: (totalLastStageCount / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[(processedStages.length) % funnelPalette.length],
                isMultiple: true,
                children: lastStageChildren,
            });
        } else if (stageCounts.length > regularStages.length) {
            // There's one more stage in stageCounts that we haven't processed
            const lastStage = stageCounts[stageCounts.length - 1];
            const prevCount = regularStages[regularStages.length - 1]?.count || lastStage.count;
            const dropoff = prevCount > 0 ? ((prevCount - lastStage.count) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: lastStage.eventId,
                eventName: lastStage.eventName || eventNames[lastStage.eventId] || lastStage.eventId,
                count: lastStage.count,
                percentage: (lastStage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                color: funnelPalette[(processedStages.length) % funnelPalette.length],
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

    return (
        <>
            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-xl rounded-2xl">
                <CardHeader className="pb-4 px-6 bg-gradient-to-r from-blue-50/80 to-cyan-50/60 dark:from-blue-900/20 dark:to-cyan-900/10 border-b border-blue-200/40 dark:border-blue-500/20">
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
                    <div className="relative h-[360px] flex items-end justify-center gap-6 md:gap-10 px-4 md:px-8">
                        {/* Grid Lines */}
                        <div className="absolute inset-x-0 top-0 h-full pointer-events-none">
                            {[100, 75, 50, 25].map((level) => (
                                <div
                                    key={level}
                                    className="absolute left-0 w-full border-t border-dashed border-slate-200 dark:border-slate-700/50"
                                    style={{ top: `${100 - level}%` }}
                                />
                            ))}
                        </div>

                        {funnelData.map((stage, index) => {
                            const heightPct = Math.max(Math.min(stage.percentage, 100), 5);
                            const isSelected = selectedStage?.eventId === stage.eventId;

                            return (
                                <div
                                    key={stage.eventId}
                                    className="flex flex-col items-center group w-16 sm:w-20 md:w-24 lg:w-28 h-full cursor-pointer relative"
                                    onClick={() => setSelectedStage(stage)}
                                >
                                    {/* Percentage label above bar */}
                                    <div className={cn(
                                        "mb-2 text-sm md:text-base font-bold transition-colors",
                                        isSelected 
                                            ? "text-blue-600 dark:text-blue-400" 
                                            : "text-slate-800 dark:text-slate-100"
                                    )}>
                                        {stage.percentage.toFixed(1)}%
                                    </div>

                                    {/* Bar container */}
                                    <div className="flex-1 flex items-end w-full">
                                        <div
                                            className={cn(
                                                "relative w-full transition-all duration-300 shadow-lg rounded-t-lg overflow-hidden",
                                                "bg-gradient-to-t from-blue-600 to-blue-500",
                                                "hover:from-blue-700 hover:to-blue-600",
                                                "border-2 border-blue-700 dark:border-blue-400",
                                                isSelected && "ring-4 ring-blue-400 dark:ring-blue-500 scale-105"
                                            )}
                                            style={{ height: `${heightPct}%` }}
                                        >
                                            {/* Hover/Click count display */}
                                            <div className={cn(
                                                "absolute inset-x-0 bottom-0 top-0 flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold px-1 transition-opacity",
                                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            )}>
                                                <span className="drop-shadow-lg text-center">
                                                    {stage.count.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stage label */}
                                    <div className="mt-3 text-center">
                                        <div className={cn(
                                            "text-xs sm:text-sm font-semibold transition-colors",
                                            isSelected 
                                                ? "text-blue-600 dark:text-blue-400" 
                                                : "text-slate-700 dark:text-slate-300"
                                        )}>
                                            Stage {index + 1}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                                    {funnelData[0]?.count.toLocaleString() || 0}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">Started</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-500/30">
                                <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
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
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Expanded Stage Details Modal */}
            <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
                <DialogContent
                    showCloseButton={false}
                    className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/20 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900"
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