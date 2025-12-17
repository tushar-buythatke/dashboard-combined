import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Filter, ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
 * "Step" Layout: Vertical columns dropping down like steps.
 * Features: Click interaction, Taller layout, detailed breakdown.
 */
export function FunnelGraph({ data, stages, multipleChildEvents, eventColors, eventNames }: FunnelGraphProps) {
    const [selectedStage, setSelectedStage] = useState<FunnelStageData | null>(null);

    const funnelData = useMemo<FunnelStageData[]>(() => {
        if (!data || data.length === 0 || stages.length === 0) return [];

        // Calculate SUCCESS counts for each stage (e0_success, e1_success, etc.)
        const stageCounts = stages.map((stage) => {
            let successCount = 0;
            // Derive event key from eventName to match DashboardViewer logic
            const eventName = stage.eventName || eventNames[stage.eventId] || `Event ${stage.eventId}`;
            const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');

            data.forEach((record) => {
                const successKey = `${eventKey}_success`;
                successCount += Number(record[successKey] || 0);
            });
            return { ...stage, successCount };
        });

        // First stage success count is the base (100%) - e0_success
        const baseSuccessCount = stageCounts[0]?.successCount || 1;

        // Process all stages: each shows (stage_success / e0_success) * 100
        const processedStages: FunnelStageData[] = [];

        // Process ALL regular stages (not slicing anything)
        stageCounts.forEach((stage, index) => {
            const prevSuccessCount = index > 0 ? stageCounts[index - 1].successCount : stage.successCount;
            const dropoff = prevSuccessCount > 0 ? ((prevSuccessCount - stage.successCount) / prevSuccessCount) * 100 : 0;

            processedStages.push({
                eventId: stage.eventId,
                eventName: stage.eventName || eventNames[stage.eventId] || stage.eventId,
                count: stage.successCount,
                percentage: (stage.successCount / baseSuccessCount) * 100,
                dropoffPercentage: dropoff,
                color: stage.color || eventColors[stage.eventId] || '#3b82f6',
                isMultiple: false,
            });
        });

        // If there are multiple child events, ADD them as a separate final stage
        if (multipleChildEvents && multipleChildEvents.length > 0) {
            const lastStageChildren = multipleChildEvents.map((childEventId) => {
                let successCount = 0;
                // Derive event key
                const eventName = eventNames[childEventId] || `Event ${childEventId}`;
                const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');

                data.forEach((record) => {
                    const successKey = `${eventKey}_success`;
                    successCount += Number(record[successKey] || 0);
                });

                return {
                    eventId: childEventId,
                    eventName: eventNames[childEventId] || childEventId,
                    count: successCount,
                    percentage: (successCount / baseSuccessCount) * 100,
                    color: eventColors[childEventId] || '#3b82f6',
                };
            }).sort((a, b) => b.count - a.count); // Sort children by count

            const totalLastStageSuccess = lastStageChildren.reduce((sum, child) => sum + child.count, 0);
            const prevSuccessCount = stageCounts[stageCounts.length - 2]?.successCount || totalLastStageSuccess;
            const dropoff = prevSuccessCount > 0 ? ((prevSuccessCount - totalLastStageSuccess) / prevSuccessCount) * 100 : 0;

            processedStages.push({
                eventId: 'multiple',
                eventName: 'Final Stage',
                count: totalLastStageSuccess,
                percentage: (totalLastStageSuccess / baseSuccessCount) * 100,
                dropoffPercentage: dropoff,
                color: '#3b82f6',
                isMultiple: true,
                children: lastStageChildren,
            } as FunnelStageData);
        }

        return processedStages;
    }, [data, stages, multipleChildEvents, eventColors, eventNames]);

    const pastelColors = [
        '#A78BFA', // violet-400
        '#818CF8', // indigo-400
        '#60A5FA', // blue-400
        '#34D399', // emerald-400
        '#F472B6', // pink-400
        '#FBBF24', // amber-400
    ];

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
            <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl">
                <CardHeader className="pb-3 px-4 md:px-6 bg-gradient-to-r from-purple-50/80 to-indigo-50/60 dark:from-purple-900/20 dark:to-indigo-900/10 border-b border-purple-200/40 dark:border-purple-500/20">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <Filter className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg">Conversion Funnel</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Event flow analysis • {stages.length} stages
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6 h-[500px] flex flex-col">
                    {/* Vertical Step Funnel container */}
                    <div className="flex-1 flex items-end justify-center w-full gap-2 md:gap-4 pt-10 px-4">
                        {funnelData.map((stage, index) => {
                            // Calculate height relative to max (100% = full height)
                            // Use actual percentage with minimum 8% so tiny bars are still visible
                            const heightPercent = Math.max(stage.percentage * 0.9, 8); // Scale down slightly for visual clarity
                            
                            return (
                                <React.Fragment key={index}>
                                    {/* Dropoff Badge (Between Stages) */}
                                    {index > 0 && (
                                        <div className="mb-[20%] flex flex-col items-center z-10 -ml-2 -mr-2 md:-ml-3 md:-mr-3 w-16 md:w-20">
                                            <div className="h-[1px] w-full border-t border-dashed border-gray-300 dark:border-gray-600 relative top-3"></div>
                                            <Badge 
                                                variant="outline" 
                                                className="text-[10px] py-0.5 border-red-200 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 z-10 shadow-sm"
                                            >
                                                -{stage.dropoffPercentage.toFixed(1)}%
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Vertical Bar Column */}
                                    <div className="flex flex-col items-center h-full justify-end flex-1 max-w-[120px] group cursor-pointer" onClick={() => setSelectedStage(stage)}>
                                        {/* Count Label */}
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                                            {stage.percentage.toFixed(1)}%
                                        </span>
                                        <span className="text-xs text-muted-foreground mb-2 font-medium">
                                            {stage.count.toLocaleString()}
                                        </span>

                                        {/* The Bar */}
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${heightPercent}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                            className={cn(
                                                "w-full rounded-t-lg shadow-md relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:brightness-110",
                                                stage.isMultiple 
                                                    ? "bg-gray-100 dark:bg-gray-800" // Container for stacked/segments
                                                    : "bg-gradient-to-t from-violet-600 to-indigo-400"
                                            )}
                                        >
                                            {stage.isMultiple && stage.children ? (
                                                // Stacked segments for multiple events
                                                <div className="flex flex-col-reverse w-full h-full"> 
                                                    {stage.children.map((child, i) => {
                                                        // Height relative to this specific stage's total count
                                                        const segmentHeight = (child.count / stage.count) * 100;
                                                        return (
                                                            <div 
                                                                key={i}
                                                                className="w-full relative group/segment"
                                                                style={{ 
                                                                    height: `${segmentHeight}%`,
                                                                    backgroundColor: pastelColors[i % pastelColors.length]
                                                                }}
                                                            >
                                                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                                                     <span className="text-[10px] text-white font-bold drop-shadow-sm truncate px-1">
                                                                        {((child.count / stage.count) * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                // Gradients overlay
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                                            )}
                                        </motion.div>

                                        {/* Label below bar */}
                                        <div className="mt-3 text-center">
                                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 min-h-[2.5em] px-1" title={stage.eventName}>
                                                {stage.eventName}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mt-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.isMultiple ? '#3b82f6' : '#8b5cf6' }}></div>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Step {index + 1}</span>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Drill Down Modal for Stage Details */}
            <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>{selectedStage?.eventName}</span>
                            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                                Step {funnelData.findIndex(s => s.eventId === selectedStage?.eventId) + 1}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Detailed statistics for this funnel stage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {selectedStage?.count.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Total Users</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                                    {selectedStage?.percentage.toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Retention Rate</div>
                            </div>
                        </div>

                        {/* If Multiple Children, show breakdown table */}
                        {selectedStage?.isMultiple && selectedStage.children && (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Event Breakdown
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {selectedStage.children.map((child, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                                    style={{ backgroundColor: pastelColors[i % pastelColors.length] }}
                                                ></div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {child.eventName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {child.count.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {child.percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
