import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip, Rectangle, Layer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Info, ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, X, ChevronRight, Settings2 } from 'lucide-react';
import { useChartZoom } from '@/hooks/useChartZoom';
import { ChartZoomControls } from '../components/ChartZoomControls';
import { cn } from '@/lib/utils';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface UserFlowVisualizationProps {
    data: any[]; // Raw event data or transitions
    eventNames: Record<string, string>;
    config?: {
        stages?: Array<{
            id: string;
            label: string;
            eventIds: string[];
        }>;
        showDropOffs?: boolean;
    };
    height?: number;
    // New interactive props
    onConfigChange?: (newConfig: any) => void;
    availableEvents?: Array<{ eventId: string; eventName: string; isApiEvent?: boolean; host?: string; url?: string }>;
    isEditable?: boolean;
}


// Custom Node Component (Refined for High Contrast & Consistency)
const CustomNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    if (!payload || !payload.name) return <g />;

    const color = payload.color || '#8b5cf6';
    const displayValue = Math.round(payload.displayValue || payload.value).toLocaleString();

    return (
        <Layer>
            <Rectangle
                x={x}
                y={y}
                width={width}
                height={height}
                fill={color}
                fillOpacity="0.9"
                rx={4}
                ry={4}
                className="transition-all duration-300 hover:fill-opacity-100 cursor-pointer filter drop-shadow-md hover:drop-shadow-lg"
            />

            {/* Event Name Label - Always dark and visible above */}
            <text
                x={x + width / 2}
                y={y - 14}
                textAnchor="middle"
                className="fill-slate-800 dark:fill-slate-100 text-[10px] font-bold tracking-tight pointer-events-none"
            >
                {payload.name.split(' (S')[0]}
            </text>

            {/* Value (Count) - Always dark and consistently positioned to the right */}
            <text
                x={x + width + 8}
                y={y + height / 2 + 1}
                textAnchor="start"
                alignmentBaseline="middle"
                className="fill-slate-800 dark:fill-slate-200 text-[10px] font-extrabold pointer-events-none"
            >
                {displayValue}
            </text>
        </Layer>
    );
};

// Custom Link Component (Interaction Buffer & Pipeline Flow)
const CustomLink = (props: any) => {
    const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index, payload } = props;
    const gradientId = `gradient-link-${index}`;
    const color = payload?.color || '#8b5cf6';

    if (!payload) return <g />;

    const d = `
        M${sourceX},${sourceY + linkWidth / 2}
        C${sourceControlX},${sourceY + linkWidth / 2}
        ${targetControlX},${targetY + linkWidth / 2}
        ${targetX},${targetY + linkWidth / 2}
        L${targetX},${targetY - linkWidth / 2}
        C${targetControlX},${targetY - linkWidth / 2}
        ${sourceControlX},${sourceY - linkWidth / 2}
        ${sourceX},${sourceY - linkWidth / 2}
        Z
    `;

    return (
        <Layer>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="60%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
            </defs>

            {/* Hover Buffer: Invisible wider path for easier interaction on thin lines */}
            <path
                d={d}
                fill="transparent"
                stroke="transparent"
                strokeWidth={Math.max(15, linkWidth + 10)}
                className="cursor-pointer peer"
            />

            {/* Visual Path */}
            <path
                d={d}
                fill={`url(#${gradientId})`}
                stroke="none"
                className="transition-all duration-300 peer-hover:fill-opacity-60 cursor-pointer"
            />
        </Layer>
    );
};

export function UserFlowVisualization({
    data,
    eventNames,
    config = {},
    height = 500,
    onConfigChange,
    availableEvents = [],
    isEditable = true
}: UserFlowVisualizationProps) {
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const [localStages, setLocalStages] = useState<any[]>(config.stages || []);

    // Sync local stages with config prop
    useEffect(() => {
        if (config.stages) {
            setLocalStages(config.stages);
        } else if (localStages.length === 0) {
            // Initialize with default empty stage if strictly no config
            setLocalStages([{ id: 'stage-1', label: 'Step 1', eventIds: [] }]);
        }
    }, [config.stages]);

    // Handle updates to stages
    const handleStageUpdate = (updatedStages: any[]) => {
        setLocalStages(updatedStages);
        if (onConfigChange) {
            onConfigChange({ ...config, stages: updatedStages });
        }
    };

    // Event Color Mapping (Premium Palette)
    const EVENT_PALETTE = [
        '#6366f1', '#ec4899', '#f97316', '#10b981', '#3b82f6',
        '#8b5cf6', '#f59e0b', '#06b6d4', '#d946ef', '#14b8a6'
    ];

    const getEventColor = (name: string) => {
        // Strip stage suffix for color consistency
        const baseName = name.split(' (S')[0];
        let hash = 0;
        for (let i = 0; i < baseName.length; i++) {
            hash = baseName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return EVENT_PALETTE[Math.abs(hash) % EVENT_PALETTE.length];
    };

    // Calculate Sankey Data based on Stages
    const sankeyData = useMemo(() => {
        if (!localStages || localStages.length === 0) {
            return { nodes: [], links: [] };
        }

        const nodes: any[] = [];
        const links: any[] = [];
        const nodesMap = new Map<string, number>();

        const getNodeIndex = (name: string) => {
            if (!nodesMap.has(name)) {
                nodesMap.set(name, nodes.length);
                const color = getEventColor(name);
                nodes.push({ name, value: 0, color });
            }
            return nodesMap.get(name)!;
        };

        // Map event IDs to their Assigned stage index
        const eventStageMap = new Map<string, number>();
        localStages.forEach((stage, idx) => {
            stage.eventIds?.forEach((eid: string) => eventStageMap.set(eid, idx));
        });

        // Check if we have direct transitions in the data
        const hasTransitions = data.some(d => d.nextEventId);

        if (hasTransitions) {
            data.forEach(d => {
                if (!d.nextEventId) return;

                const sourceEid = String(d.eventId);
                const targetEid = String(d.nextEventId);
                const count = Number(d.count || 0);

                const sourceStageIdx = eventStageMap.get(sourceEid);
                const targetStageIdx = eventStageMap.get(targetEid);

                if (sourceStageIdx !== undefined && targetStageIdx !== undefined && targetStageIdx === sourceStageIdx + 1) {
                    const sourceName = `${eventNames[sourceEid] || sourceEid} (S${sourceStageIdx + 1})`;
                    const targetName = `${eventNames[targetEid] || targetEid} (S${targetStageIdx + 1})`;

                    const sourceNodeIdx = getNodeIndex(sourceName);
                    const targetNodeIdx = getNodeIndex(targetName);

                    links.push({
                        source: sourceNodeIdx,
                        target: targetNodeIdx,
                        value: count,
                        color: nodes[sourceNodeIdx].color // Inherit color from source
                    });

                    nodes[sourceNodeIdx].value += count;
                    nodes[targetNodeIdx].value += count;
                }
            });
        } else {
            // Fallback: Proportional Distribution Model
            const eventCounts = new Map<string, number>();
            data.forEach(d => {
                const eid = String(d.eventId);
                const count = Number(d.count || d.value || 0);
                eventCounts.set(eid, (eventCounts.get(eid) || 0) + count);
            });

            for (let i = 0; i < localStages.length - 1; i++) {
                const sourceStage = localStages[i];
                const targetStage = localStages[i + 1];
                const sourceEvents = sourceStage.eventIds || [];
                const targetEvents = targetStage.eventIds || [];

                if (sourceEvents.length === 0 || targetEvents.length === 0) continue;

                let stageSourceTotal = 0;
                sourceEvents.forEach((eid: string) => {
                    stageSourceTotal += eventCounts.get(String(eid)) || 0;
                });

                if (stageSourceTotal === 0) continue;

                targetEvents.forEach((tEid: string) => {
                    const tStrEid = String(tEid);
                    const tCount = eventCounts.get(tStrEid) || 0;
                    if (tCount === 0) return;

                    const targetName = `${eventNames[tStrEid] || tStrEid} (S${i + 2})`;
                    const targetNodeIdx = getNodeIndex(targetName);
                    nodes[targetNodeIdx].value += tCount;

                    sourceEvents.forEach((sEid: string) => {
                        const sStrEid = String(sEid);
                        const sCount = eventCounts.get(sStrEid) || 0;
                        if (sCount === 0) return;

                        const share = sCount / stageSourceTotal;
                        const linkValue = tCount * share;
                        if (linkValue < 0.1) return;

                        const sourceName = `${eventNames[sStrEid] || sStrEid} (S${i + 1})`;
                        const sourceNodeIdx = getNodeIndex(sourceName);

                        links.push({
                            source: sourceNodeIdx,
                            target: targetNodeIdx,
                            value: linkValue,
                            color: nodes[sourceNodeIdx].color
                        });

                        nodes[sourceNodeIdx].value += linkValue;
                    });
                });
            }
        }

        // Consolidate links
        const consolidatedLinksMap = new Map<string, { value: number, color: string }>();
        links.forEach(l => {
            const key = `${l.source}-${l.target}`;
            const existing = consolidatedLinksMap.get(key);
            consolidatedLinksMap.set(key, {
                value: (existing?.value || 0) + l.value,
                color: l.color
            });
        });

        const finalLinks = Array.from(consolidatedLinksMap.entries()).map(([key, data]) => {
            const [s, t] = key.split('-').map(Number);
            return { source: s, target: t, value: data.value, color: data.color };
        });

        // Ensure nodes have minimum visual value for visibility of small events
        // We use a small base value so tiny events aren't invisible
        const finalNodes = nodes.map(n => ({
            ...n,
            displayValue: n.value,
            value: Math.max(n.value, 50) // Scale booster for visibility
        }));

        return { nodes: finalNodes, links: finalLinks };
    }, [data, localStages, eventNames]);

    const formattedEvents = useMemo(() => {
        return availableEvents.map(e => ({
            value: e.eventId,
            label: e.isApiEvent && e.host && e.url
                ? `${e.host} - ${e.url}`
                : e.eventName
        }));
    }, [availableEvents]);

    return (
        <Card className="border-purple-200/60 dark:border-purple-500/30 overflow-hidden relative group">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-purple-500" />
                        User Flow Analysis
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <ChartZoomControls
                            zoomLevel={zoomLevel}
                            onZoomIn={zoomIn}
                            onZoomOut={zoomOut}
                            onReset={resetZoom}
                        />
                    </div>
                </div>

                {/* Interactive Stage Configuration Header */}
                {isEditable && (
                    <div className="w-full relative bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex items-start p-3 gap-3 min-w-max">
                                {localStages.map((stage, index) => (
                                    <div key={stage.id || index} className="flex items-start">
                                        <div className="w-[240px] flex-shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 p-2 group/stage relative hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors">

                                            {/* Stage Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <Input
                                                    className="h-7 text-xs font-semibold bg-transparent border-transparent hover:border-slate-200 focus:border-purple-400 px-1 w-[140px]"
                                                    value={stage.label}
                                                    onChange={(e) => {
                                                        const newStages = [...localStages];
                                                        newStages[index] = { ...stage, label: e.target.value };
                                                        handleStageUpdate(newStages);
                                                    }}
                                                />
                                                <div className="flex items-center">
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                        Step {index + 1}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 ml-1 opacity-0 group-hover/stage:opacity-100 text-slate-400 hover:text-red-500"
                                                        onClick={() => {
                                                            const newStages = localStages.filter((_, i) => i !== index);
                                                            handleStageUpdate(newStages);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Event Selector */}
                                            <div className="space-y-1">
                                                <MultiSelectDropdown
                                                    options={formattedEvents}
                                                    selected={stage.eventIds || []}
                                                    onChange={(values) => {
                                                        const newStages = [...localStages];
                                                        newStages[index] = { ...stage, eventIds: values };
                                                        handleStageUpdate(newStages);
                                                    }}
                                                    placeholder="Select events..."
                                                    className="w-full h-8 text-xs bg-white dark:bg-slate-950"
                                                />
                                            </div>
                                        </div>

                                        {/* Connector Arrow */}
                                        {index < localStages.length - 1 && (
                                            <div className="h-[100px] flex items-center justify-center px-1 text-slate-300 dark:text-slate-700">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add Stage Button */}
                                <div className="h-[100px] flex items-center ml-2">
                                    <Button
                                        variant="outline"
                                        className="h-full border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10 flex flex-col gap-2 px-4"
                                        onClick={() => {
                                            const newStage = {
                                                id: `stage-${Date.now()}`,
                                                label: `Step ${localStages.length + 1}`,
                                                eventIds: []
                                            };
                                            handleStageUpdate([...localStages, newStage]);
                                        }}
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span className="text-xs font-semibold">Add Step</span>
                                    </Button>
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0 bg-white dark:bg-slate-950 relative" onWheel={handleWheel}>
                {sankeyData.nodes.length > 0 && sankeyData.links.length > 0 ? (
                    <div className="relative border-t border-slate-100 dark:border-slate-800">
                        {/* Stage Identification Header for Sankey Area */}
                        <div
                            className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 pointer-events-none"
                            style={{ width: `${Math.max(100, zoomLevel * 100)}%` }}
                        >
                            <div className="flex items-center justify-between px-20 h-10">
                                {localStages.map((stage, idx) => (
                                    <div key={`header-${idx}`} className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stage.label || `Stage ${idx + 1}`}</span>
                                        <div className="h-1 w-8 bg-purple-400/30 rounded-full mt-0.5" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sankey Scrollable Area */}
                        <ScrollArea className="w-full">
                            <div
                                className="min-h-[600px] md:min-h-[900px] py-10"
                                style={{ width: `${Math.max(100, zoomLevel * 100)}%` }}
                            >
                                <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 768 ? 600 : 900}>
                                    <Sankey
                                        data={sankeyData}
                                        node={<CustomNode />}
                                        link={<CustomLink />}
                                        nodePadding={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 100} // Increased padding for ultra-clean spacing
                                        margin={{ left: 100, right: 100, top: 40, bottom: 40 }}
                                        iterations={128} // Max iterations for perfect layout
                                    >
                                        <RechartsTooltip
                                            cursor={{ fill: 'transparent' }}
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const isNode = !('source' in data);
                                                    return (
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
                                                            {isNode ? (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{data.name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                                            Actual Count: <span className="font-semibold">{Math.round(data.displayValue || data.value).toLocaleString()}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                                                        <span>{data.source.name}</span>
                                                                        <ChevronRight className="h-3 w-3" />
                                                                        <span>{data.target.name}</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                                        Flow: <span className="font-bold text-slate-900 dark:text-slate-100">{Math.round(data.value).toLocaleString()}</span>
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </Sankey>
                                </ResponsiveContainer>
                            </div>
                            <ScrollBar orientation="horizontal" className="z-20" />
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                        <GitBranch className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm font-medium">Configure flow steps to visualize data</p>
                        <p className="text-xs opacity-60 mt-1">Add steps and select events above</p>
                    </div>
                )}

                {/* Overlay Hint */}
                <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 opacity-60 pointer-events-none flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Ctrl</kbd>
                        <span>+ Scroll to zoom</span>
                    </div>
                    <span>•</span>
                    <span>Scroll horizontally to scrub flow</span>
                </div>
            </CardContent>
        </Card>
    );
}
