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
import { useAccentTheme } from '@/contexts/AccentThemeContext';

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
    config,
    height = 400,
    onConfigChange,
    availableEvents = [],
    isEditable = false
}: UserFlowVisualizationProps) {
    const { t: themeClasses } = useAccentTheme();
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const [localStages, setLocalStages] = useState(config?.stages || []);

    // Sync local stages with config prop
    useEffect(() => {
        if (config?.stages) {
            setLocalStages(config.stages);
        } else if (localStages.length === 0) {
            // Initialize with default empty stage if strictly no config
            setLocalStages([{ id: 'stage-1', label: 'Step 1', eventIds: [] }]);
        }
    }, [config?.stages]);

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
        <Card className={cn("border-slate-200/60 dark:border-indigo-500/20 overflow-hidden relative group backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)]", themeClasses.cardBg)}>
            {/* Thematic Accent Bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />

            <CardHeader className="pb-3 border-b border-slate-100 dark:border-indigo-500/10 bg-slate-50/40 dark:bg-indigo-950/10 space-y-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg ring-1 ring-white/20", themeClasses.buttonGradient)}>
                            <GitBranch className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100">User Flow Analysis</span>
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
                    <div className="w-full relative bg-white/50 dark:bg-slate-950/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-indigo-500/15 shadow-sm overflow-hidden">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex items-start p-3 gap-3 min-w-max">
                                {localStages.map((stage, index) => (
                                    <div key={stage.id || index} className="flex items-start">
                                        <div className="w-[240px] flex-shrink-0 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-indigo-500/10 p-2.5 group/stage relative hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300">

                                            {/* Stage Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <Input
                                                    className="h-7 text-xs font-bold bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5 focus:border-indigo-400 dark:focus:border-indigo-500/40 px-2 w-[140px] transition-all"
                                                    value={stage.label}
                                                    onChange={(e) => {
                                                        const newStages = [...localStages];
                                                        newStages[index] = { ...stage, label: e.target.value };
                                                        handleStageUpdate(newStages);
                                                    }}
                                                />
                                                <div className="flex items-center">
                                                    <Badge variant="secondary" className="text-[10px] h-5 bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-none">
                                                        Step {index + 1}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 ml-1 opacity-0 group-hover/stage:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
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
                                                    className={cn("w-full h-8 text-xs border-slate-200/60 dark:border-indigo-500/10 transition-colors duration-500", themeClasses.cardBg)}
                                                />
                                            </div>
                                        </div>

                                        {/* Connector Arrow */}
                                        {index < localStages.length - 1 && (
                                            <div className="h-[105px] flex items-center justify-center px-1 text-indigo-300 dark:text-indigo-500/30">
                                                <ChevronRight className="h-6 w-6 animate-pulse" style={{ animationDuration: '3s' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add Stage Button */}
                                <div className="h-[105px] flex items-center ml-2">
                                    <Button
                                        variant="outline"
                                        className="h-full border-dashed border-slate-300 dark:border-indigo-500/20 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 flex flex-col gap-2 px-5 transition-all duration-300 rounded-xl"
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
                                        <span className="text-xs font-bold uppercase tracking-wider">Add Step</span>
                                    </Button>
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0 bg-transparent relative" onWheel={handleWheel}>
                {sankeyData.nodes.length > 0 && sankeyData.links.length > 0 ? (
                    <div className="relative border-t border-slate-100 dark:border-indigo-500/10">
                        {/* Stage Identification Header for Sankey Area */}
                        <div
                            className="sticky top-0 z-10 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-100 dark:border-indigo-500/10 pointer-events-none"
                            style={{ width: `${Math.max(100, zoomLevel * 100)}%` }}
                        >
                            <div className="flex items-center justify-between px-20 h-10">
                                {localStages.map((stage, idx) => (
                                    <div key={`header-${idx}`} className="flex flex-col items-center">
                                        <span className="text-[10px] font-extrabold text-indigo-500/80 dark:text-indigo-400 uppercase tracking-widest">{stage.label || `Stage ${idx + 1}`}</span>
                                        <div className={cn("h-1 w-10 rounded-full mt-0.5 shadow-[0_0_8px_rgba(99,102,241,0.4)]", themeClasses.headerGradient)} />
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
                                                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-indigo-500/30 p-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 ring-1 ring-white/10">
                                                            {isNode ? (
                                                                <div className="space-y-1.5">
                                                                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{data.name}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]" style={{ backgroundColor: data.color }} />
                                                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                                            Count: <span className="font-bold text-slate-900 dark:text-white">{Math.round(data.displayValue || data.value).toLocaleString()}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                                        <span className="truncate max-w-[100px]">{data.source.name}</span>
                                                                        <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
                                                                        <span className="truncate max-w-[100px]">{data.target.name}</span>
                                                                    </div>
                                                                    <div className="h-px bg-slate-100 dark:bg-indigo-500/20 w-full" />
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                                        Flow: <span className="font-extrabold text-slate-900 dark:text-white text-base ml-1">{Math.round(data.value).toLocaleString()}</span>
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
                    <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground bg-slate-50/20 dark:bg-indigo-950/5">
                        <div className="p-5 rounded-full bg-slate-100/50 dark:bg-indigo-500/10 mb-5 relative group-hover:scale-110 transition-transform duration-500">
                            <GitBranch className="h-10 w-10 opacity-40 text-indigo-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Configure flow steps to visualize data</p>
                        <p className="text-xs opacity-60 mt-1 font-medium">Add steps and select events above</p>
                    </div>
                )}

                {/* Overlay Hint */}
                <div className="absolute bottom-4 left-6 z-20 text-[10px] text-slate-500 dark:text-indigo-400/60 font-bold uppercase tracking-widest pointer-events-none flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-indigo-500/20 shadow-sm transition-all group-hover:bg-white dark:group-hover:bg-slate-800">Ctrl</kbd>
                        <span>+ Scroll to zoom</span>
                    </div>
                    <span>•</span>
                    <span className="transition-all group-hover:text-indigo-500">Scroll horizontally to scrub flow</span>
                </div>
            </CardContent>
        </Card>
    );
}
