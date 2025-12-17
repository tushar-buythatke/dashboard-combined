import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, TrendingDown } from 'lucide-react';
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

        const funnelPalette = ['#6366f1', '#4f46e5', '#7c3aed', '#8b5cf6'];

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

        const processedStages: FunnelStageData[] = stageCounts.slice(0, -1).map((stage, index) => {
            const prevCount = index > 0 ? stageCounts[index - 1].count : stage.count;
            const dropoff = prevCount > 0 ? ((prevCount - stage.count) / prevCount) * 100 : 0;

            return {
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[stage.eventId] || stage.eventId,
                count: stage.count,
                percentage: (stage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                // Force consistent purple/blue palette for main stages
                color: funnelPalette[index % funnelPalette.length],
                isMultiple: false,
            };
        });

        if (multipleChildEvents && multipleChildEvents.length > 0) {
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
                    // Use palette variants for child segments as well
                    color: funnelPalette[idx % funnelPalette.length],
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
                color: funnelPalette[(stages.length - 1) % funnelPalette.length],
                isMultiple: true,
                children: lastStageChildren,
            });
        } else if (stageCounts.length > 0) {
            const lastStage = stageCounts[stageCounts.length - 1];
            const prevCount = stageCounts[stageCounts.length - 2]?.count || lastStage.count;
            const dropoff = prevCount > 0 ? ((prevCount - lastStage.count) / prevCount) * 100 : 0;

            processedStages.push({
                eventId: lastStage.eventId,
                eventName: lastStage.eventName || eventNames[lastStage.eventId] || lastStage.eventId,
                count: lastStage.count,
                percentage: (lastStage.count / baseCount) * 100,
                dropoffPercentage: dropoff,
                // Use final palette color for last stage
                color: funnelPalette[(stages.length - 1) % funnelPalette.length],
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
                <div className="relative h-[320px] flex items-end justify-center gap-10 px-8">
                    {/* Grid Lines (no percentage labels, just guides) */}
                    <div className="absolute inset-x-0 top-0 h-full pointer-events-none">
                        {[100, 75, 50, 25].map((level) => (
                            <div
                                key={level}
                                className="absolute left-0 w-full border-t border-dashed border-slate-200 dark:border-slate-700"
                                style={{ top: `${100 - level}%` }}
                            />
                        ))}
                    </div>

                    {funnelData.map((stage, index) => {
                        const heightPct = Math.max(Math.min(stage.percentage, 100), 5); // clamp 5–100

                        return (
                            <div
                                key={stage.eventId}
                                className="flex flex-col items-center group w-16 sm:w-20 md:w-24 h-full cursor-pointer"
                                onClick={() => setSelectedStage(stage)}
                            >
                                {/* Percentage label above bar */}
                                <div className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {stage.percentage.toFixed(1)}%
                                </div>

                                {/* Bar aligned to grid (percentage-based height) */}
                                <div className="flex-1 flex items-end w-full">
                                    <div
                                        className="relative w-full bg-indigo-800 hover:bg-indigo-900 transition-colors shadow-md border border-slate-300 dark:border-slate-700 rounded-none"
                                        style={{ height: `${heightPct}%` }}
                                    >
                                        <div className="absolute bottom-2 inset-x-0 text-center text-white text-[11px] sm:text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                            {stage.count.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Label as Stage 1 / Stage 2 / ... */}
                                <div className="mt-2 text-center">
                                    <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Stage {index + 1}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Expanded details on click */}
                {selectedStage && (
                    <div className="mt-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 max-w-md mx-auto text-xs">
                        <div className="flex items-start justify-between mb-1">
                            <div>
                                <p className="text-sm font-semibold mb-1">{selectedStage.eventName}</p>
                                <p className="text-slate-600 dark:text-slate-300">Step {funnelData.findIndex(s => s.eventId === selectedStage.eventId) + 1}</p>
                            </div>
                            <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={() => setSelectedStage(null)}
                            >
                                Clear
                            </button>
                        </div>
                        <div className="space-y-1">
                            <p>
                                <span className="font-semibold">Percentage:</span> {selectedStage.percentage.toFixed(1)}%
                            </p>
                            <p>
                                <span className="font-semibold">Count:</span> {selectedStage.count.toLocaleString()}
                            </p>
                            {!selectedStage.isMultiple && (
                                <p>
                                    <span className="font-semibold">Drop-off from previous:</span>{' '}
                                    {selectedStage.dropoffPercentage.toFixed(1)}%
                                </p>
                            )}
                        </div>
                    </div>
                )}

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
                                {funnelData[funnelData.length - 1]?.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Conversion Rate</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}