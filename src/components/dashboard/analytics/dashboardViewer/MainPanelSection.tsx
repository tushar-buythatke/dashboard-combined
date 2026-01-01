import React, { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTooltip } from '../components/InfoTooltip';
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    Filter,
    Flame,
    GitBranch,
    Hash,
    Info,
    LayoutDashboard,
    Maximize2,
    Mic,
    MoreHorizontal,
    Percent,
    RefreshCw,
    Search,
    Settings,
    Share2,
    Target,
    X,
    XCircle,
    Sparkles,
    Zap,
} from 'lucide-react';
import { AiInsightsBadge } from '../components/AiInsightsBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getPOSName } from '@/lib/posMapping';

import { PercentageGraph } from '../charts/PercentageGraph';
import { FunnelGraph } from '../charts/FunnelGraph';
import { UserFlowVisualization } from '../charts/UserFlowVisualization';
import { DayWiseComparisonChart, DailyAverageChart } from '../components/ComparisonCharts';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { AnimatedNumber } from './AnimatedNumber';
import { MiniSparkline } from './MiniSparkline';
import { CollapsibleLegend } from './CollapsibleLegend';
import { PieTooltip } from './PieTooltip';
import { CustomTooltip } from './CustomTooltip';
import { useChartZoom } from '@/hooks/useChartZoom';
import { ChartZoomControls } from '../components/ChartZoomControls';
import type { DashboardProfile } from '@/types/analytics';
import type { DateRangeState, EventKeyInfo, FilterState, PanelData } from './types';
import { combinePieChartDuplicates, EVENT_COLORS, PIE_COLORS, shouldShowPieChart } from './constants';
import { ChartExpandedView } from '../components/ChartExpandedView';

type MainPanelSectionProps = {
    profile: DashboardProfile;
    setProfile: React.Dispatch<React.SetStateAction<any>>;
    panelsDataMap: Map<string, PanelData>;
    rawGraphResponse: any;
    graphData: any[];
    filteredApiData: any[];
    dateRange: DateRangeState;
    isHourly: boolean;
    setHourlyOverride?: React.Dispatch<React.SetStateAction<boolean | null>>;
    filtersCollapsed: boolean;
    setFiltersCollapsed: (next: boolean) => void;
    pendingRefresh: boolean;
    panelFiltersState: Record<string, Partial<FilterState>>;
    handleFilterChange: (type: keyof FilterState, values: any) => void;
    handleApplyFilters: () => void;
    dataLoading: boolean;
    autoRefreshMinutes: number;
    setAutoRefreshMinutes: (next: number) => void;
    availableStatusCodes: string[];
    availableCacheStatuses: string[];
    availableSourceStrs: string[];
    selectedSourceStrs: string[];
    setSelectedSourceStrs: (next: string[]) => void;
    platformOptions: any[];
    posOptions: any[];
    sourceOptions: any[];
    eventOptions: any[];
    totalCount: number;
    totalSuccess: number;
    totalFail: number;
    selectedEventsList: string[];
    isMainPanelApi: boolean;
    normalEventKeys: EventKeyInfo[];
    eventKeys: EventKeyInfo[];
    avgEventKeys: EventKeyInfo[];
    errorEventKeys: EventKeyInfo[];
    apiEndpointEventKeyInfos: EventKeyInfo[];
    apiPerformanceEventKeys: EventKeyInfo[];  // Always endpoint-based, for API Performance Metrics
    mainLegendExpanded: boolean;
    setMainLegendExpanded: (next: boolean) => void;
    selectedEventKey: string | null;
    handleEventClick: (eventKey: string) => void;
    overlaySelectedEventKey: string | null;
    handleOverlayEventClick: (eventKey: string) => void;
    errorSelectedEventKey: string | null;
    handleErrorEventClick: (eventKey: string) => void;
    apiSelectedEventKey: string | null;
    handleApiEventClick: (eventKey: string) => void;
    panelChartType: Record<string, 'default' | 'deviation'>;
    setPanelChartType: React.Dispatch<React.SetStateAction<Record<string, 'default' | 'deviation'>>>;
    pinnedTooltip: any;
    setPinnedTooltip: (next: any) => void;
    isFirstPanelSpecialGraph: boolean;
    apiPerformanceSeries: any[];
    apiMetricView: any;
    setApiMetricView: (next: any) => void;
    pieChartData: any;
    openExpandedPie: (pieType: any, title: string, data: any[]) => void;
    CustomXAxisTick: React.ComponentType<any>;
    HourlyStatsCard: React.ComponentType<any>;
    events: any[];
    toast: (args: any) => void;
    isRecording?: boolean;
    toggleRecording?: () => void;
    voiceTooltip?: string;
    isParsingVoice?: boolean;
    voiceStatus?: string;
    manualTranscript?: string;
    setManualTranscript?: (text: string) => void;
    handleVoiceTranscript?: (text: string) => void;
    isAdmin?: boolean;
    setVoiceStatus?: (status: any) => void;
};

export const MainPanelSection = React.memo(function MainPanelSection({
    profile,
    setProfile,
    panelsDataMap,
    rawGraphResponse,
    graphData,
    filteredApiData,
    dateRange,
    isHourly,
    setHourlyOverride,
    filtersCollapsed,
    setFiltersCollapsed,
    pendingRefresh,
    panelFiltersState,
    handleFilterChange,
    handleApplyFilters,
    dataLoading,
    autoRefreshMinutes,
    setAutoRefreshMinutes,
    availableStatusCodes,
    availableCacheStatuses,
    availableSourceStrs,
    selectedSourceStrs,
    setSelectedSourceStrs,
    platformOptions,
    posOptions,
    sourceOptions,
    eventOptions,
    totalCount,
    totalSuccess,
    totalFail,
    selectedEventsList,
    isMainPanelApi,
    normalEventKeys,
    eventKeys,
    avgEventKeys,
    errorEventKeys,
    apiEndpointEventKeyInfos,
    apiPerformanceEventKeys,
    mainLegendExpanded,
    setMainLegendExpanded,
    selectedEventKey,
    handleEventClick,
    overlaySelectedEventKey,
    handleOverlayEventClick,
    errorSelectedEventKey,
    handleErrorEventClick,
    apiSelectedEventKey,
    handleApiEventClick,
    panelChartType,
    setPanelChartType,
    pinnedTooltip,
    setPinnedTooltip,
    isFirstPanelSpecialGraph,
    apiPerformanceSeries,
    apiMetricView,
    setApiMetricView,
    pieChartData,
    openExpandedPie,
    CustomXAxisTick,
    HourlyStatsCard,
    events,
    toast,
    isRecording = false,
    toggleRecording = () => { },
    voiceTooltip = 'Voice Search',
    isParsingVoice = false,
    voiceStatus = 'idle',
    manualTranscript = '',
    setManualTranscript = () => { },
    handleVoiceTranscript = () => { },
    isAdmin = false,
    setVoiceStatus = () => { },
}: MainPanelSectionProps) {
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const [expandedChart, setExpandedChart] = useState<{ title: string; render: (zoom: number) => React.ReactNode } | null>(null);
    const [voicePopoverOpen, setVoicePopoverOpen] = useState(false);

    // Keyboard shortcut for Voice AI (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (isAdmin && !isMainPanelApi) {
                    setVoicePopoverOpen(prev => {
                        const willOpen = !prev;
                        // If opening, start recording after a short delay
                        if (willOpen && !isRecording && toggleRecording) {
                            setTimeout(() => toggleRecording(), 150);
                        }
                        return willOpen;
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAdmin, isMainPanelApi, isRecording, toggleRecording]);

    // Ensure we have valid default values for arrays
    const rawEvents = events || [];

    // Memoize event lookup maps to prevent recreation on every render
    const eventColors = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => { map[String(e.eventId)] = e.color; });
        return map;
    }, [events]);

    const eventNames = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => { map[String(e.eventId)] = e.eventName; });
        return map;
    }, [events]);

    // Compute the main panel's avgEventType from events (0=count, 1=time, 2=rupees, 3=avg count)
    const mainPanelAvgEventType = useMemo(() => {
        // Check avgEventKeys first
        for (const ek of avgEventKeys) {
            const event = events.find((e: any) => String(e.eventId) === ek.eventId);
            if (event?.isAvgEvent && event.isAvgEvent >= 1) {
                return event.isAvgEvent;
            }
        }
        // Fallback to checking all events
        for (const event of events || []) {
            if (event.isAvgEvent && event.isAvgEvent >= 1) {
                return event.isAvgEvent;
            }
        }
        return 0;
    }, [avgEventKeys, events]);

    // Memoize status code groupings for filter UI
    const statusCodeGroups = useMemo(() => ({
        codes2xx: (availableStatusCodes || []).filter((c: string) => c.startsWith('2')),
        codes3xx: (availableStatusCodes || []).filter((c: string) => c.startsWith('3')),
        codes4xx: (availableStatusCodes || []).filter((c: string) => c.startsWith('4')),
        codes5xx: (availableStatusCodes || []).filter((c: string) => c.startsWith('5')),
        codesOther: (availableStatusCodes || []).filter((c: string) => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5')),
    }), [availableStatusCodes]);

    return (
        <div className="space-y-8 mobile-no-scroll">
            <ChartExpandedView
                isOpen={!!expandedChart}
                onClose={() => setExpandedChart(null)}
                title={expandedChart?.title || 'Chart Analysis'}
            >
                {expandedChart?.render || (() => null)}
            </ChartExpandedView>
            {/* ==================== MAIN DASHBOARD FILTERS (Panel 1+) ==================== */}
            <Card
                className="rounded-2xl overflow-hidden group transition-all duration-300 relative"
            >
                {/* Purple/Pink Gradient Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                <CardHeader className="pb-3 relative cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors" onClick={() => setFiltersCollapsed(!filtersCollapsed)}>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full bg-primary"
                            />
                            <span className="font-bold text-lg">Filters</span>
                            {/* API Event Badge */}
                            {isMainPanelApi && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md animate-none">
                                    API
                                </span>
                            )}
                            {pendingRefresh && (
                                <span
                                    className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium"
                                >
                                    Changed
                                </span>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {/* Voice Command Button - Admin Only & Non-API Only */}
                            {isAdmin && !isMainPanelApi && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <Popover open={voicePopoverOpen} onOpenChange={(open) => {
                                        setVoicePopoverOpen(open);
                                        if (open) {
                                            if (!isRecording) {
                                                setTimeout(() => toggleRecording(), 100);
                                            }
                                        } else {
                                            setManualTranscript('');
                                            setVoiceStatus?.('idle');
                                        }
                                    }}>
                                        <UiTooltip>
                                            <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={cn(
                                                            "h-8 gap-2 px-3 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-300 shadow-sm relative overflow-hidden group/mic ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg",
                                                            isRecording && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-md shadow-red-500/20"
                                                        )}
                                                    >
                                                        {isRecording ? (
                                                            <>
                                                                <span className="absolute inset-0 bg-red-500/10 animate-pulse" />
                                                                <div className="relative flex items-center gap-1.5">
                                                                <div className="flex gap-0.5 items-center h-4">
                                                                    <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0ms]" style={{height: '40%'}} />
                                                                    <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_100ms]" style={{height: '70%'}} />
                                                                    <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_200ms]" style={{height: '100%'}} />
                                                                    <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_300ms]" style={{height: '70%'}} />
                                                                    <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_400ms]" style={{height: '40%'}} />
                                                                </div>
                                                                <span className="font-bold text-xs animate-pulse">Listening...</span>
                                                            </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Mic className={cn(
                                                                    "h-4 w-4 text-indigo-500 group-hover/mic:scale-110 transition-transform",
                                                                    isParsingVoice && "animate-spin"
                                                                )} />
                                                                <span className="font-bold text-xs tracking-wide">
                                                                    {isParsingVoice ? 'AI Analyzing...' : 'Voice AI'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 text-white border-slate-800 p-2 shadow-xl">
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-bold text-xs uppercase tracking-wider opacity-60">Status</p>
                                                    <p className="flex items-center gap-2">
                                                        {voiceStatus === 'idle' && <span className="w-2 h-2 rounded-full bg-slate-400" />}
                                                        {voiceStatus === 'listening' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                        {voiceStatus === 'parsing' && <RefreshCw className="h-3 w-3 animate-spin text-purple-400" />}
                                                        {voiceStatus === 'applying' && <Zap className="h-3 w-3 text-amber-400 animate-bounce" />}
                                                        {voiceStatus === 'done' && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                                                        {voiceStatus === 'error' && <XCircle className="h-3 w-3 text-red-400" />}
                                                        <span className="capitalize font-medium text-xs">
                                                            {voiceStatus === 'idle' && 'Ready to listen'}
                                                            {voiceStatus === 'listening' && 'Listening to your command...'}
                                                            {voiceStatus === 'parsing' && 'AI is understanding...'}
                                                            {voiceStatus === 'applying' && 'Applying filters...'}
                                                            {voiceStatus === 'done' && 'Filters applied!'}
                                                            {voiceStatus === 'error' && 'Something went wrong'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </TooltipContent>
                                        </UiTooltip>

                                        <PopoverContent
                                            className="w-[calc(100vw-2rem)] sm:w-80 p-4 border-2 border-indigo-100 dark:border-indigo-900/50 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                                        <Sparkles className="h-4 w-4" />
                                                        AI Voice Assistant
                                                    </h4>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-500 border-indigo-200">
                                                        Beta
                                                    </Badge>
                                                </div>

                                                <div className="relative">
                                                    <textarea
                                                        placeholder="Type your command or use voice..."
                                                        className="w-full min-h-[150px] max-h-[400px] p-4 text-sm bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none font-medium text-slate-700 dark:text-slate-200"
                                                        value={manualTranscript}
                                                        onChange={(e) => setManualTranscript(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === ' ') {
                                                                e.stopPropagation();
                                                            }
                                                        }}
                                                    />
                                                    {manualTranscript.toLowerCase().includes('auto send') && (
                                                        <div className="absolute right-3 top-3">
                                                            <Badge variant="outline" className="bg-indigo-500 text-white border-none animate-pulse text-[10px] px-1.5 py-0 h-4">
                                                                AUTO SEND DETECTED
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    {isRecording && (
                                                        <div className="absolute right-3 bottom-3">
                                                            <div className="flex gap-1">
                                                                <div className="w-1 h-3 bg-red-400 animate-pulse" />
                                                                <div className="w-1 h-3 bg-red-400 animate-pulse delay-75" />
                                                                <div className="w-1 h-3 bg-red-400 animate-pulse delay-150" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant={isRecording ? "destructive" : "outline"}
                                                        size="sm"
                                                        onClick={() => toggleRecording()}
                                                        className="flex-1 gap-2 rounded-xl font-bold"
                                                    >
                                                        {isRecording ? (
                                                            <>
                                                                <XCircle className="h-4 w-4" /> Stop
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Mic className="h-4 w-4" /> Speak
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={!manualTranscript.trim() || isParsingVoice || isRecording}
                                                        onClick={() => handleVoiceTranscript(manualTranscript)}
                                                        className="flex-1 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20"
                                                    >
                                                        {voiceStatus === 'parsing' ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : voiceStatus === 'done' ? (
                                                            <Zap className="h-4 w-4 text-yellow-300" />
                                                        ) : (
                                                            <Zap className="h-4 w-4" />
                                                        )}
                                                        {voiceStatus === 'done' ? 'Project SUCCESS!' : 'Send'}
                                                    </Button>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                        <Info className="h-3 w-3" /> TRY SAYING
                                                    </p>
                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 italic font-medium">
                                                        "Show Flipkart data for the last 3 days <strong>AUTO SEND</strong>"
                                                    </p>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">⌘K</span>
                                </div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFiltersCollapsed(!filtersCollapsed);
                                }}
                                className="h-8 w-8 p-0"
                            >
                                {filtersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {!filtersCollapsed && (
                    <CardContent>
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm font-medium text-muted-foreground">Filter Configuration</div>
                            {/* Hourly/Daily Toggle in Filter Panel */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">Data Resolution:</span>
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <button
                                        onClick={() => setHourlyOverride?.(true)}
                                        className={cn(
                                            "px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
                                            isHourly
                                                ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-md ring-1 ring-purple-200 dark:ring-purple-500/30"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                        )}
                                    >
                                        Hourly
                                    </button>
                                    <button
                                        onClick={() => setHourlyOverride?.(false)}
                                        className={cn(
                                            "px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
                                            !isHourly
                                                ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-md ring-1 ring-purple-200 dark:ring-purple-500/30"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                                        )}
                                    >
                                        Daily
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={cn(
                            "grid gap-3 sm:gap-4",
                            isMainPanelApi
                                ? "grid-cols-1"
                                : "grid-cols-1" // Will be overridden by inner content
                        )}>
                            {(() => {
                                const mainPanel = profile?.panels?.[0];
                                const mainPanelId = mainPanel?.panelId;
                                const mainPanelConfig = (mainPanel as any)?.filterConfig;
                                const currentFilters = mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>;
                                const mainGraphType = (currentFilters as any).graphType || mainPanelConfig?.graphType;

                                const isPercentageGraph = mainGraphType === 'percentage';
                                const percentageConfig = mainPanelConfig?.percentageConfig;
                                const isFunnelGraph = mainGraphType === 'funnel';
                                const isUserFlowGraph = mainGraphType === 'user_flow';

                                // Type guards
                                const funnelConfig = isFunnelGraph ? (mainPanelConfig?.funnelConfig) : undefined;
                                const userFlowConfig = isUserFlowGraph ? (mainPanelConfig?.userFlowConfig || { startEventId: '', includeEvents: [], showDropOffs: true }) : undefined;

                                // Extract available status codes and cache statuses from raw data (for API events)
                                let configuredStatusCodes = percentageConfig?.filters?.statusCodes || [];
                                let configuredCacheStatus = percentageConfig?.filters?.cacheStatus || [];

                                if (isMainPanelApi && mainPanelId) {
                                    const mainPanelData = panelsDataMap.get(mainPanelId);
                                    const rawData = mainPanelData?.rawGraphResponse?.data || rawGraphResponse?.data || [];
                                    const statusSet = new Set<string>();
                                    const cacheSet = new Set<string>();

                                    rawData.forEach((record: any) => {
                                        // Direct field extraction (API response format)
                                        if (record.status !== undefined && record.status !== null) {
                                            statusSet.add(String(record.status));
                                        }
                                        if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                            cacheSet.add(record.cacheStatus);
                                        }

                                        // Also check key patterns for processed data format
                                        Object.keys(record).forEach(key => {
                                            const statusMatch = key.match(/_status_(\d+)_/);
                                            const cacheMatch = key.match(/_cache_([^_]+)_/);
                                            if (statusMatch) statusSet.add(statusMatch[1]);
                                            if (cacheMatch) cacheSet.add(cacheMatch[1]);
                                        });
                                    });

                                    if (statusSet.size > 0) {
                                        configuredStatusCodes = Array.from(statusSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                                    }
                                    if (cacheSet.size > 0) {
                                        configuredCacheStatus = Array.from(cacheSet).sort();
                                    }
                                }

                                const activeStatusCodes = (currentFilters as Partial<FilterState>).percentageStatusCodes || configuredStatusCodes;
                                const activeCacheStatus = (currentFilters as Partial<FilterState>).percentageCacheStatus || configuredCacheStatus;

                                // Specialized Filters for Percentage Graph
                                if (isPercentageGraph && percentageConfig) {
                                    // Default to grouped if not specified
                                    const isGrouped = currentFilters.activePercentageGroupChildEvents ?? percentageConfig.groupChildEvents ?? true;

                                    return (
                                        <div className="col-span-12 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Percent className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Percentage Graph - Event Selection</span>
                                                </div>

                                                {/* Graph Grouping Toggle */}
                                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <button
                                                        onClick={() => handleFilterChange('activePercentageGroupChildEvents', true)}
                                                        className={cn(
                                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                                            isGrouped
                                                                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-md"
                                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50"
                                                        )}
                                                    >
                                                        SINGLE GRAPH
                                                    </button>
                                                    <button
                                                        onClick={() => handleFilterChange('activePercentageGroupChildEvents', false)}
                                                        className={cn(
                                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                                            !isGrouped
                                                                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-md"
                                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-white/50"
                                                        )}
                                                    >
                                                        SEPARATE GRAPHS
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Parent Events (Denominator) */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                            Parent Events (Denominator)
                                                        </label>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                                        <MultiSelectDropdown
                                                            options={events
                                                                .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                .map(e => ({
                                                                    value: String(e.eventId),
                                                                    label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                    color: e.color
                                                                }))}
                                                            selected={currentFilters.activePercentageEvents || percentageConfig.parentEvents}
                                                            onChange={(selected) => {
                                                                handleFilterChange('activePercentageEvents', selected);
                                                            }}
                                                            placeholder="Select Parent Events (Multiple Supported)"
                                                            maxDisplayItems={3}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Child Events (Numerator) */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                            Child Events (Numerator)
                                                        </label>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-100 dark:border-green-900/30 shadow-sm">
                                                        <MultiSelectDropdown
                                                            options={events
                                                                .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                .map(e => ({
                                                                    value: String(e.eventId),
                                                                    label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                    color: e.color
                                                                }))}
                                                            selected={currentFilters.activePercentageChildEvents || percentageConfig.childEvents}
                                                            onChange={(selected) => {
                                                                handleFilterChange('activePercentageChildEvents', selected);
                                                            }}
                                                            placeholder="Select Child Events (Multiple Supported)"
                                                            maxDisplayItems={3}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-xs text-muted-foreground text-center bg-white/50 dark:bg-black/20 p-2 rounded">
                                                Formula: <span className="font-mono text-xs">(Child Count / Parent Count) × 100</span>
                                            </div>
                                            {/* Platform, POS, Source filters for percentage graph - hide for API events */}
                                            {!isMainPanelApi && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Platforms</Label>
                                                        <MultiSelectDropdown
                                                            options={platformOptions}
                                                            selected={(currentFilters.platforms || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('platforms', values)}
                                                            placeholder="Select platforms"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">POS</Label>
                                                        <MultiSelectDropdown
                                                            options={posOptions}
                                                            selected={(currentFilters.pos || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('pos', values)}
                                                            placeholder="Select POS"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Sources</Label>
                                                        <MultiSelectDropdown
                                                            options={sourceOptions}
                                                            selected={(currentFilters.sources || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('sources', values)}
                                                            placeholder="Select sources"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Configuration for User Flow Graph
                                if (isUserFlowGraph) {
                                    return (
                                        <div className="col-span-12 space-y-4">
                                            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:bg-slate-900 rounded-lg p-4 border border-violet-200 dark:border-violet-500/30 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white dark:bg-violet-900/20 p-2 rounded-lg border border-violet-100 dark:border-violet-500/20 shadow-sm">
                                                        <GitBranch className="h-5 w-5 text-violet-500" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-violet-700 dark:text-violet-300">User Flow Configuration</h4>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Configure stages and events directly on the visualization card below.
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Disabled mock control to indicate where filters would be if needed */}
                                                <div className="opacity-50 pointer-events-none">
                                                    <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800">
                                                        Interactive Mode Active
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // Specialized Filters for Funnel Graph - dropdowns like Template Builder
                                if (isFunnelGraph && funnelConfig) {
                                    const defaultStageIds = funnelConfig.stages.map((s: any) => s.eventId);
                                    const activeStageIds = (currentFilters.activeStages && currentFilters.activeStages.length > 0)
                                        ? currentFilters.activeStages
                                        : defaultStageIds;

                                    const activeChildEventsForMain = (currentFilters.activeFunnelChildEvents && currentFilters.activeFunnelChildEvents.length > 0)
                                        ? currentFilters.activeFunnelChildEvents
                                        : (funnelConfig.multipleChildEvents || []);

                                    return (
                                        <div className="col-span-12 space-y-4">
                                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-500/30">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Filter className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Funnel Graph Configuration</span>
                                                </div>

                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                                    Define conversion stages: e1 (parent) → e2 → e3 → ... → last (multiple children)
                                                </p>

                                                {/* Funnel Stages - Individual Dropdowns (e1, e2, e3...) with add/remove */}
                                                <div className="space-y-3">
                                                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                        Funnel Stages
                                                    </label>
                                                    {(activeStageIds.length > 0 ? activeStageIds : defaultStageIds).map((currentId: string, idx: number) => {
                                                        const selectedId = currentId || defaultStageIds[idx] || '';
                                                        return (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold flex-shrink-0">
                                                                    e{idx + 1}
                                                                </span>
                                                                <select
                                                                    className="flex-1 h-10 px-3 rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    value={selectedId}
                                                                    onChange={(e) => {
                                                                        const newId = e.target.value;
                                                                        const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                        base[idx] = newId;
                                                                        handleFilterChange('activeStages', base);
                                                                    }}
                                                                >
                                                                    <option value="">Select event</option>
                                                                    {events
                                                                        .filter(ev => isMainPanelApi ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                        .map(ev => (
                                                                            <option key={ev.eventId} value={ev.eventId}>
                                                                                {ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="text-[11px] text-red-500 hover:text-red-700 px-1 disabled:opacity-40"
                                                                    disabled={(activeStageIds.length || defaultStageIds.length) <= 1}
                                                                    onClick={() => {
                                                                        const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                        const next = base.filter((_, i) => i !== idx);
                                                                        handleFilterChange('activeStages', next);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    <div>
                                                        <button
                                                            type="button"
                                                            className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                                                            onClick={() => {
                                                                const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                const next = [...base, ''];
                                                                handleFilterChange('activeStages', next);
                                                            }}
                                                        >
                                                            + Add Stage
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Final Stage (Multiple Events) - Multi-Select */}
                                                {funnelConfig.multipleChildEvents && funnelConfig.multipleChildEvents.length > 0 && (
                                                    <div className="mt-4 space-y-2">
                                                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                            Final Stage (Multiple Events)
                                                        </label>
                                                        <MultiSelectDropdown
                                                            options={events
                                                                .filter(ev => isMainPanelApi ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                .map(ev => ({
                                                                    value: String(ev.eventId),
                                                                    label: ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName
                                                                }))}
                                                            selected={activeChildEventsForMain}
                                                            onChange={(values) => handleFilterChange('activeFunnelChildEvents', values)}
                                                            placeholder="Select final stage events"
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                            These events will be shown with different colors in the final bar
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Platform, POS, Source filters - hide for API events */}
                                            {!isMainPanelApi && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Platforms</Label>
                                                        <MultiSelectDropdown
                                                            options={platformOptions}
                                                            selected={(currentFilters.platforms || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('platforms', values)}
                                                            placeholder="Select platforms"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">POS</Label>
                                                        <MultiSelectDropdown
                                                            options={posOptions}
                                                            selected={(currentFilters.pos || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('pos', values)}
                                                            placeholder="Select POS"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Sources</Label>
                                                        <MultiSelectDropdown
                                                            options={sourceOptions}
                                                            selected={(currentFilters.sources || []).map((id: number) => id.toString())}
                                                            onChange={(values) => handleFilterChange('sources', values)}
                                                            placeholder="Select sources"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Default Filters (Regular Graphs and User Flow)
                                // User Flow keeps Platform/POS/Source active but disables the global Events dropdown
                                return (
                                    <div className={cn(
                                        "grid gap-3 sm:gap-4",
                                        isMainPanelApi
                                            ? "grid-cols-1"
                                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                                    )}>
                                        {!isMainPanelApi && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Platform</Label>
                                                    <MultiSelectDropdown
                                                        options={platformOptions}
                                                        selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.platforms || []) : []).map(id => id.toString())}
                                                        onChange={(values) => handleFilterChange('platforms', values)}
                                                        placeholder="Select platforms"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">POS</Label>
                                                    <MultiSelectDropdown
                                                        options={posOptions}
                                                        selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.pos || []) : []).map(id => id.toString())}
                                                        onChange={(values) => handleFilterChange('pos', values)}
                                                        placeholder="Select POS"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Source</Label>
                                                    <MultiSelectDropdown
                                                        options={sourceOptions}
                                                        selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.sources || []) : []).map(id => id.toString())}
                                                        onChange={(values) => handleFilterChange('sources', values)}
                                                        placeholder="Select sources"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">
                                                {isMainPanelApi ? 'API Events (Host / URL)' : 'Event'}
                                            </Label>
                                            <MultiSelectDropdown
                                                options={eventOptions}
                                                selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.events || []) : []).map(id => id.toString())}
                                                onChange={(values) => handleFilterChange('events', values)}
                                                placeholder={isMainPanelApi ? "Select API events" : "Select events"}
                                                disabled={mainGraphType === 'user_flow'}
                                            />
                                            {mainGraphType === 'user_flow' && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                    Events configured in flow stages below
                                                </p>
                                            )}
                                            {isMainPanelApi && (() => {
                                                const mainPanelId = profile?.panels?.[0]?.panelId;
                                                const selectedEventId = mainPanelId ? panelFiltersState[mainPanelId]?.events?.[0] : undefined;
                                                if (!selectedEventId) return null;

                                                const selectedEvent = events.find(e => e.eventId === String(selectedEventId));
                                                return selectedEvent?.callUrl ? (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Call URL: <code className="px-1 bg-purple-100 dark:bg-purple-900/30 rounded">{selectedEvent.callUrl}</code>
                                                    </p>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>

                        {/* API Events Info Banner with Filters */}
                        {isMainPanelApi && (
                            <div className="mt-4 space-y-3">
                                <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                    <p className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span> Data grouped by <code className="px-1 bg-white dark:bg-gray-800 rounded">status</code> codes and <code className="px-1 bg-white dark:bg-gray-800 rounded">cacheStatus</code>. Metrics include response time, bytes transferred, and error rates.
                                    </p>
                                </div>

                                {/* Status & Cache Filters */}
                                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/30">
                                    <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        API Filters (Status & Cache)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Status Codes</Label>
                                            {/* Show 2xx and 3xx individually, group only 4xx and 5xx */}
                                            {(() => {
                                                const codes2xx = availableStatusCodes.filter(c => c.startsWith('2'));
                                                const codes3xx = availableStatusCodes.filter(c => c.startsWith('3'));
                                                const codes4xx = availableStatusCodes.filter(c => c.startsWith('4'));
                                                const codes5xx = availableStatusCodes.filter(c => c.startsWith('5'));
                                                const codesOther = availableStatusCodes.filter(c => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5'));

                                                // Build grouped options - 2xx and 3xx shown individually, 4xx and 5xx grouped
                                                const groupedOptions: Array<{ label: string; value: string }> = [];
                                                // Show 2xx codes individually
                                                codes2xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                // Show 3xx codes individually
                                                codes3xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                // Group 4xx codes with count breakdown
                                                if (codes4xx.length > 0) {
                                                    groupedOptions.push({ label: `4xx Group (${codes4xx.join(', ')})`, value: '4xx_group' });
                                                }
                                                // Group 5xx codes with count breakdown
                                                if (codes5xx.length > 0) {
                                                    groupedOptions.push({ label: `5xx Group (${codes5xx.join(', ')})`, value: '5xx_group' });
                                                }
                                                codesOther.forEach(c => groupedOptions.push({ label: c, value: c }));

                                                const currentSelected = profile?.panels?.[0]
                                                    ? (panelFiltersState[profile.panels[0].panelId]?.percentageStatusCodes || [])
                                                    : [];

                                                const displaySelected = (() => {
                                                    const s = new Set<string>(currentSelected);
                                                    if (codes4xx.length > 0 && codes4xx.every(c => s.has(c))) s.add('4xx_group');
                                                    if (codes5xx.length > 0 && codes5xx.every(c => s.has(c))) s.add('5xx_group');
                                                    return Array.from(s);
                                                })();

                                                return (
                                                    <>
                                                        <MultiSelectDropdown
                                                            options={groupedOptions}
                                                            selected={displaySelected}
                                                            onChange={(values) => {
                                                                // console.log('Status code selection changed:', values);
                                                                // Expand group selections to individual codes
                                                                let expandedValues = [...values];
                                                                if (values.includes('4xx_group')) {
                                                                    expandedValues = expandedValues.filter(v => v !== '4xx_group');
                                                                    expandedValues.push(...codes4xx);
                                                                }
                                                                if (values.includes('5xx_group')) {
                                                                    expandedValues = expandedValues.filter(v => v !== '5xx_group');
                                                                    expandedValues.push(...codes5xx);
                                                                }
                                                                const uniqueValues = Array.from(new Set(expandedValues));
                                                                const defaultStatus = availableStatusCodes.includes('200') ? ['200'] : availableStatusCodes;
                                                                const nextValues = uniqueValues.length === 0 ? [...defaultStatus] : uniqueValues;
                                                                // console.log('Final status codes to apply:', nextValues);
                                                                handleFilterChange('percentageStatusCodes', nextValues);
                                                            }}
                                                            placeholder={availableStatusCodes.length > 0 ? "Select status codes" : "Loading..."}
                                                            disabled={availableStatusCodes.length === 0}
                                                        />
                                                        {availableStatusCodes.length === 0 && (
                                                            <p className="text-xs text-muted-foreground">Loading status codes...</p>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm uppercase tracking-wide text-muted-foreground font-semibold">Cache Status</Label>
                                            <MultiSelectDropdown
                                                options={availableCacheStatuses.map(status => ({ label: status, value: status }))}
                                                selected={
                                                    profile?.panels?.[0]
                                                        ? (panelFiltersState[profile.panels[0].panelId]?.percentageCacheStatus || [])
                                                        : []
                                                }
                                                onChange={(values) => {
                                                    const defaultCache = availableCacheStatuses.length > 0 ? [...availableCacheStatuses] : [];
                                                    const nextValues = values.length === 0 ? [...defaultCache] : Array.from(new Set(values));
                                                    handleFilterChange('percentageCacheStatus', nextValues);
                                                }}
                                                placeholder={availableCacheStatuses.length > 0 ? "Select cache statuses" : "Loading..."}
                                                disabled={availableCacheStatuses.length === 0}
                                            />
                                            {availableCacheStatuses.length === 0 && (
                                                <p className="text-xs text-muted-foreground">Loading cache statuses...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Job ID (sourceStr) Filter - Only shown when data contains sourceStr values */}
                        {availableSourceStrs.length > 0 && (
                            <div
                                className="mt-4 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-500/30"
                            >
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-cyan-600" />
                                        <Label className="text-sm uppercase tracking-wide text-cyan-700 dark:text-cyan-300 font-semibold">
                                            Job ID Filter
                                        </Label>
                                        <InfoTooltip
                                            content="Filter data by specific background jobs or process IDs if available."
                                        />
                                        <span className="text-xs text-cyan-600 dark:text-cyan-400">
                                            ({availableSourceStrs.length} jobs found)
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <MultiSelectDropdown
                                            options={availableSourceStrs.map(s => ({ value: s, label: s }))}
                                            selected={selectedSourceStrs}
                                            onChange={(values) => setSelectedSourceStrs(values)}
                                            placeholder="All Job IDs"
                                            className="bg-white dark:bg-gray-800"
                                        />
                                    </div>
                                    {selectedSourceStrs.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedSourceStrs([])}
                                            className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/30"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Apply Filters Button and Auto-refresh Config */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-4">
                                {/* Prominent Apply Filters button with clear visual cue */}
                                <Button
                                    onClick={handleApplyFilters}
                                    disabled={dataLoading}
                                    size="lg"
                                    className={cn(
                                        "relative transition-all duration-300 font-semibold",
                                        pendingRefresh
                                            ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-xl shadow-red-500/40 border-2 border-red-300"
                                            : "bg-primary hover:bg-primary/90"
                                    )}
                                >
                                    {dataLoading ? (
                                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-5 w-5" />
                                    )}
                                    {pendingRefresh ? "⚡ APPLY CHANGES" : "Refresh This Panel"}
                                    {pendingRefresh && (
                                        <div
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                        >
                                            !
                                        </div>
                                    )}
                                </Button>
                                {pendingRefresh && (
                                    <span
                                        className="text-sm text-red-600 dark:text-red-400 font-medium"
                                    >
                                        Filters changed! Click to update data.
                                    </span>
                                )}

                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Auto-refresh:</Label>
                                <select
                                    value={autoRefreshMinutes}
                                    onChange={(e) => setAutoRefreshMinutes(Number(e.target.value))}
                                    className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value={0}>Disabled</option>
                                    <option value={1}>1 min</option>
                                    <option value={2}>2 min</option>
                                    <option value={5}>5 min</option>
                                    <option value={10}>10 min</option>
                                    <option value={15}>15 min</option>
                                    <option value={30}>30 min</option>
                                </select>
                                {autoRefreshMinutes > 0 && (
                                    <span
                                        className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card >

            {/* Stats Cards - ONLY for non-special graphs */}
            {
                (() => {
                    const mainPanel = profile?.panels?.[0];
                    const filterConfig = (mainPanel as any)?.filterConfig;
                    const graphType = filterConfig?.graphType;

                    // Skip stats cards for special graph types
                    if (graphType === 'percentage' || graphType === 'funnel' || graphType === 'user_flow') {
                        return null;
                    }

                    return (
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
                            {/* Total Count Card */}
                            <div
                                className="group"
                            >
                                <Card className="relative rounded-2xl bg-gradient-to-br from-purple-500/10 via-violet-500/8 to-fuchsia-500/10 dark:from-purple-500/15 dark:via-violet-500/12 dark:to-fuchsia-500/15 border border-purple-200/60 dark:border-purple-500/30 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_8px_25px_rgba(147,51,234,0.08)] hover:shadow-[0_15px_35px_rgba(147,51,234,0.20)]">
                                    {/* Purple/Pink Gradient Accent Bar */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                                    {/* Animated background shimmer */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/8 to-purple-500/0" />
                                    {/* Glow effect on hover */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400/15 via-violet-400/10 to-fuchsia-400/15" />

                                    <CardContent className="pt-3 pb-3 relative">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-purple-500/20 mb-2"
                                                >
                                                    <Hash className="h-4 w-4 text-white" />
                                                </div>
                                                <div
                                                    className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent min-h-[32px]"
                                                >
                                                    {dataLoading ? <Skeleton className="h-8 w-24" /> : <AnimatedNumber value={totalCount} />}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                                                    Total Events
                                                    <InfoTooltip content="Grand total of all events recorded within the selected timeframe and filters." />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <MiniSparkline data={graphData.slice(-7).map(d => d.count || 0)} color="#a855f7" />
                                                <span
                                                    className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400"
                                                >
                                                    <Activity className="h-3 w-3" />
                                                    <span>{Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Success Count Card */}
                            <div
                                className="group"
                            >
                                <Card className="relative bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20 hover:border-green-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-400/10 to-green-500/0"
                                    />
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-green-400/20 to-transparent" />

                                    <CardContent className="pt-3 pb-3 relative">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div
                                                    className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent min-h-[32px]"
                                                >
                                                    {dataLoading ? <Skeleton className="h-8 w-20" /> : <AnimatedNumber value={totalSuccess} />}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                                                    Success Count
                                                    <InfoTooltip content="Total number of events that were processed successfully." />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {/* Success Rate Badge */}
                                                <span
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${(totalSuccess / totalCount * 100) >= 90
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                                                        : (totalSuccess / totalCount * 100) >= 70
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                                        }`}
                                                >
                                                    {(totalSuccess / totalCount * 100) >= 90 ? (
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowDownRight className="h-3 w-3" />
                                                    )}
                                                    {totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0}%
                                                </span>
                                                <MiniSparkline data={graphData.slice(-7).map(d => d.successCount || 0)} color="#22c55e" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Fail Count Card */}
                            <div
                                className="group"
                            >
                                <Card className="relative bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 border-red-500/20 hover:border-red-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-400/10 to-red-500/0"
                                    />
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-red-400/20 to-transparent" />

                                    <CardContent className="pt-3 pb-3 relative">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md shadow-red-500/25 mb-2"
                                                >
                                                    <XCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div
                                                    className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent min-h-[32px]"
                                                >
                                                    {dataLoading ? <Skeleton className="h-8 w-16" /> : <AnimatedNumber value={totalFail} />}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                                                    Fail Count
                                                    <InfoTooltip content="Total number of events that encountered errors or failed processing." />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {/* Alert indicator for high fail rate */}
                                                {totalFail > 0 && (totalFail / totalCount * 100) > 10 && (
                                                    <span
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                                    >
                                                        <Flame className="h-3 w-3" />
                                                        Alert
                                                    </span>
                                                )}
                                                <MiniSparkline data={graphData.slice(-7).map(d => d.failCount || 0)} color="#ef4444" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Selected Events Card */}
                            <div
                                className="group"
                            >
                                <Card className="relative bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-fuchsia-500/10 border-purple-500/20 hover:border-purple-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div
                                        className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/10 to-purple-500/0"
                                    />
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400/20 to-transparent" />

                                    <CardContent className="pt-3 pb-3 relative">
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div>
                                                <div
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/25"
                                                >
                                                    <Target className="h-4 w-4 text-white" />
                                                </div>
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                                >
                                                    <AnimatedNumber value={selectedEventsList.length} suffix={` event${selectedEventsList.length !== 1 ? 's' : ''}`} />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 max-h-[45px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600">
                                            {selectedEventsList.length > 0 ? selectedEventsList.slice(0, 6).map((eventName, idx) => (
                                                <span
                                                    key={eventName}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 dark:from-purple-500/20 dark:to-violet-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    {eventName}
                                                </span>
                                            )) : (
                                                <span
                                                    className="text-muted-foreground text-sm italic"
                                                >
                                                    All events selected
                                                </span>
                                            )}
                                            {selectedEventsList.length > 6 && (
                                                <span
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg"
                                                >
                                                    +{selectedEventsList.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                                            Selected Events
                                            <InfoTooltip content="The specific event types currently being visualized in the trends below." />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Main Chart - Count Events Only */}
            {
                normalEventKeys.length > 0 && (() => {
                    const mainPanelId = profile?.panels?.[0]?.panelId;
                    const mainPanel = profile?.panels?.[0];
                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';

                    // Check if this is a special graph panel (percentage, funnel, or user_flow)
                    const filterConfig = (mainPanel as any)?.filterConfig;
                    const graphType = filterConfig?.graphType;

                    const eventColors = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {});
                    const eventNames = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.eventName }), {});

                    // Percentage Graph - EXCLUSIVE RENDERING
                    const percentageConfig = filterConfig?.percentageConfig;
                    const panelFilters = panelFiltersState[mainPanelId || ''] || {};

                    if (graphType === 'percentage' && percentageConfig) {
                        const activeParentEvents = panelFilters.activePercentageEvents && panelFilters.activePercentageEvents.length > 0
                            ? panelFilters.activePercentageEvents
                            : percentageConfig.parentEvents;

                        const activeChildEvents = panelFilters.activePercentageChildEvents && panelFilters.activePercentageChildEvents.length > 0
                            ? panelFilters.activePercentageChildEvents
                            : percentageConfig.childEvents;

                        const configuredStatusCodes = percentageConfig.filters?.statusCodes || [];
                        const configuredCacheStatus = percentageConfig.filters?.cacheStatus || [];
                        const activeStatusCodes = panelFilters.percentageStatusCodes && panelFilters.percentageStatusCodes.length > 0
                            ? panelFilters.percentageStatusCodes
                            : configuredStatusCodes;
                        const activeCacheStatus = panelFilters.percentageCacheStatus && panelFilters.percentageCacheStatus.length > 0
                            ? panelFilters.percentageCacheStatus
                            : configuredCacheStatus;

                        // For avgDelay events, use raw data instead of aggregated data (mirrors AdditionalPanelsSection logic)
                        const hasAvgEvents = [...activeParentEvents, ...activeChildEvents].some((eventId: string) => {
                            const ev = (events || []).find((e: any) => String(e.eventId) === String(eventId));
                            return ev?.isAvgEvent === 1;
                        });

                        // Build percentage graph data with proper handling for avgEvents and sourceStr filtering
                        const percentageGraphData = (() => {
                            if (hasAvgEvents || isMainPanelApi) {
                                let rawData = panelsDataMap.get(mainPanelId || '')?.rawGraphResponse?.data || rawGraphResponse?.data || [];

                                // Apply sourceStr filtering ONLY if data has sourceStr and filter is selected
                                const activeSourceStrs = selectedSourceStrs || [];
                                const hasSourceStr = rawData.length > 0 && rawData.some((d: any) => d.sourceStr);

                                if (hasSourceStr && activeSourceStrs.length > 0) {
                                    rawData = rawData.filter((d: any) =>
                                        d.sourceStr && activeSourceStrs.includes(d.sourceStr.toString())
                                    );
                                }

                                return rawData;
                            }
                            return graphData;
                        })();

                        // Define onToggleBackToFunnel handler once
                        const handleToggleBackToFunnel = (profile?.panels?.[0] as any)?.previousGraphType === 'funnel' ? () => {
                            if (profile && profile.panels && profile.panels[0]) {
                                const updatedConfig = {
                                    ...profile.panels[0].filterConfig,
                                    graphType: 'funnel' as const,
                                };

                                const updatedProfile = {
                                    ...profile,
                                    panels: profile.panels.map((panel, index) =>
                                        index === 0 ? {
                                            ...panel,
                                            filterConfig: updatedConfig,
                                            previousGraphType: undefined
                                        } : panel
                                    )
                                };

                                setProfile(updatedProfile as any);

                                toast({
                                    title: "🔄 Switched to Funnel Analysis",
                                    description: "Back to funnel view",
                                    duration: 2000,
                                });
                            }
                        } : undefined;

                        const isGrouped = panelFilters.activePercentageGroupChildEvents ?? percentageConfig.groupChildEvents ?? true;

                        if (isGrouped) {
                            return (
                                <div className="relative group">
                                    <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <UiTooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-gray-500 hover:text-indigo-600 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm"
                                                    onClick={() => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        if (mainPanelId) {
                                                            setExpandedChart({
                                                                title: 'Percentage Distribution',
                                                                render: (zoomLevel) => (
                                                                    <div style={{ width: `${zoomLevel * 100}%`, height: '100%', minWidth: '100%' }}>
                                                                        <PercentageGraph
                                                                            data={percentageGraphData}
                                                                            parentEvents={activeParentEvents}
                                                                            childEvents={activeChildEvents}
                                                                            eventColors={eventColors}
                                                                            eventNames={eventNames}
                                                                            filters={{
                                                                                ...(percentageConfig?.filters || {}),
                                                                                statusCodes: activeStatusCodes,
                                                                                cacheStatus: activeCacheStatus
                                                                            }}
                                                                            isHourly={isHourly}
                                                                            onToggleHourly={(newValue) => {
                                                                                if (setHourlyOverride) {
                                                                                    setHourlyOverride(newValue);
                                                                                }
                                                                            }}
                                                                            onToggleBackToFunnel={handleToggleBackToFunnel}
                                                                            events={events}
                                                                        />
                                                                    </div>
                                                                )
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Maximize2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Expand to full screen</p>
                                            </TooltipContent>
                                        </UiTooltip>
                                    </div>
                                    <PercentageGraph
                                        data={percentageGraphData}
                                        parentEvents={activeParentEvents}
                                        childEvents={activeChildEvents}
                                        eventColors={eventColors}
                                        eventNames={eventNames}
                                        filters={{
                                            ...(percentageConfig?.filters || {}),
                                            statusCodes: activeStatusCodes,
                                            cacheStatus: activeCacheStatus
                                        }}
                                        isHourly={isHourly}
                                        onToggleHourly={(newValue) => {
                                            if (setHourlyOverride) {
                                                setHourlyOverride(newValue);
                                            }
                                        }}
                                        onToggleBackToFunnel={handleToggleBackToFunnel}
                                        events={events}
                                    />
                                </div>
                            );
                        } else {
                            // Separate Graphs Mode
                            return (
                                <div className="space-y-6">
                                    {activeChildEvents.map((childEvent: string, index: number) => (
                                        <div key={childEvent} className="relative">
                                            <div className="flex items-center gap-2 mb-2 px-2 bg-slate-50 dark:bg-slate-900/50 py-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: eventColors[childEvent] || '#8884d8' }} />
                                                <span className="font-semibold text-sm text-foreground">
                                                    {eventNames[String(childEvent)] || `Event ${childEvent}`}
                                                </span>
                                            </div>
                                            <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <UiTooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-500 hover:text-indigo-600 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm"
                                                            onClick={() => {
                                                                const mainPanelId = profile?.panels?.[0]?.panelId;
                                                                if (mainPanelId) {
                                                                    setExpandedChart({
                                                                        title: `${eventNames[String(childEvent)] || childEvent} Percentage`,
                                                                        render: (zoomLevel) => (
                                                                            <div style={{ width: `${zoomLevel * 100}%`, height: '100%', minWidth: '100%' }}>
                                                                                <PercentageGraph
                                                                                    data={percentageGraphData}
                                                                                    parentEvents={activeParentEvents}
                                                                                    childEvents={[childEvent]}
                                                                                    eventColors={eventColors}
                                                                                    eventNames={eventNames}
                                                                                    filters={{
                                                                                        ...(percentageConfig?.filters || {}),
                                                                                        statusCodes: activeStatusCodes,
                                                                                        cacheStatus: activeCacheStatus
                                                                                    }}
                                                                                    isHourly={isHourly}
                                                                                    events={events}
                                                                                    showCombinedPercentage={false}
                                                                                    onToggleHourly={(newValue) => {
                                                                                        if (setHourlyOverride) {
                                                                                            setHourlyOverride(newValue);
                                                                                        }
                                                                                    }}
                                                                                    onToggleBackToFunnel={index === 0 ? handleToggleBackToFunnel : undefined}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Maximize2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Expand to full screen</p>
                                                    </TooltipContent>
                                                </UiTooltip>
                                            </div>
                                            <PercentageGraph
                                                data={percentageGraphData}
                                                parentEvents={activeParentEvents}
                                                childEvents={[childEvent]}
                                                eventColors={eventColors}
                                                eventNames={eventNames}
                                                filters={{
                                                    ...(percentageConfig?.filters || {}),
                                                    statusCodes: activeStatusCodes,
                                                    cacheStatus: activeCacheStatus
                                                }}
                                                isHourly={isHourly}
                                                events={events}
                                                showCombinedPercentage={false}
                                                onToggleHourly={(newValue) => {
                                                    if (setHourlyOverride) {
                                                        setHourlyOverride(newValue);
                                                    }
                                                }}
                                                onToggleBackToFunnel={index === 0 ? handleToggleBackToFunnel : undefined}
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        // Close Percentage Graph Block
                    }

                    // Funnel Graph - EXCLUSIVE RENDERING
                    const funnelConfig = filterConfig?.funnelConfig;

                    if (graphType === 'funnel' && funnelConfig) {
                        const activeStageIds = panelFilters.activeStages && panelFilters.activeStages.length > 0
                            ? panelFilters.activeStages
                            : funnelConfig.stages.map((s: any) => s.eventId);

                        const activeStages = funnelConfig.stages
                            .filter((stage: any) => activeStageIds.includes(stage.eventId))
                            .map((stage: any) => {
                                const evt = events.find(e => String(e.eventId) === String(stage.eventId));
                                return {
                                    eventId: stage.eventId,
                                    eventName: evt?.eventName || stage.label || stage.eventName || stage.eventId,
                                    color: evt?.color || stage.color
                                };
                            });

                        const activeChildEvents = panelFilters.activeFunnelChildEvents && panelFilters.activeFunnelChildEvents.length > 0
                            ? panelFilters.activeFunnelChildEvents
                            : (funnelConfig.multipleChildEvents || []);

                        return (
                            <div>
                                <FunnelGraph
                                    data={isMainPanelApi ? filteredApiData : graphData}
                                    stages={activeStages}
                                    multipleChildEvents={activeChildEvents}
                                    eventColors={eventColors}
                                    eventNames={eventNames}
                                    isHourly={isHourly}
                                    filters={isMainPanelApi ? {
                                        statusCodes: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageStatusCodes || [],
                                        cacheStatus: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageCacheStatus || []
                                    } : undefined}
                                    onToggleHourly={(newValue) => {
                                        if (setHourlyOverride) {
                                            setHourlyOverride(newValue);
                                        }
                                    }}
                                    onViewAsPercentage={(parentEventId, childEventIds) => {
                                        // Switch to percentage graph
                                        if (profile && profile.panels && profile.panels[0]) {
                                            const filterConfig = profile.panels[0].filterConfig;
                                            const updatedConfig = {
                                                ...filterConfig,
                                                graphType: 'percentage' as const,
                                                events: filterConfig?.events || [],
                                                platforms: filterConfig?.platforms || [],
                                                pos: filterConfig?.pos || [],
                                                sources: filterConfig?.sources || [],
                                                sourceStr: filterConfig?.sourceStr || [],
                                                percentageConfig: {
                                                    parentEvents: [parentEventId],
                                                    childEvents: childEventIds,
                                                    filters: {
                                                        statusCodes: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageStatusCodes || [],
                                                        cacheStatus: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageCacheStatus || []
                                                    }
                                                }
                                            };

                                            const updatedProfile = {
                                                ...profile,
                                                panels: profile.panels.map((panel, index) =>
                                                    index === 0 ? {
                                                        ...panel,
                                                        filterConfig: updatedConfig,
                                                        previousGraphType: panel.filterConfig?.graphType
                                                    } : panel
                                                )
                                            };

                                            setProfile(updatedProfile as any);
                                        }
                                    }}
                                />
                            </div>
                        );

                    }

                    // User Flow Graph - EXCLUSIVE RENDERING
                    if (graphType === 'user_flow') {
                        const userFlowConfig = filterConfig?.userFlowConfig;

                        // Merge filter state with config
                        return (
                            <Card className="border border-violet-200/60 dark:border-violet-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 mt-4">
                                <CardHeader className="pb-2 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/60 dark:from-violet-900/20 dark:to-fuchsia-900/10 border-b border-violet-200/40 dark:border-violet-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                <GitBranch className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base md:text-lg">User Flow Visualization</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">Track user journey through defined stages</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">Flow Analysis</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <UserFlowVisualization
                                        data={rawGraphResponse?.data || []}
                                        eventNames={eventNames}
                                        config={{
                                            stages: userFlowConfig?.stages || [],
                                            showDropOffs: userFlowConfig?.showDropOffs ?? true
                                        }}
                                        height={500}
                                        availableEvents={events as any[]}
                                        isEditable={true}
                                        onConfigChange={(newConfig) => {
                                            if (profile && setProfile && profile.panels && profile.panels.length > 0) {
                                                const updatedProfile = {
                                                    ...profile,
                                                    panels: profile.panels.map((panel, index) =>
                                                        index === 0 ? {
                                                            ...panel,
                                                            filterConfig: {
                                                                ...panel.filterConfig,
                                                                userFlowConfig: {
                                                                    ...panel.filterConfig?.userFlowConfig,
                                                                    ...newConfig
                                                                }
                                                            }
                                                        } : panel
                                                    )
                                                };
                                                setProfile(updatedProfile);
                                            }
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        );
                    }

                    // Apply API filtering to main panel graph data if this is an API panel
                    const mainFilteredGraphData = (() => {
                        if (!isMainPanelApi) return graphData;

                        // In API aggregation mode (graphType != percentage/funnel), graphData is already broken out by status/cache.
                        // Do not attempt to re-filter by status/cache using eventId-derived keys (it will zero-out the series).
                        return graphData;

                        const mainPanelFilters = mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>;
                        const mainPanelConfig = (profile?.panels?.[0] as any)?.filterConfig;
                        const mainPercentageConfig = mainPanelConfig?.percentageConfig;
                        const mainConfiguredStatusCodes = mainPercentageConfig?.filters?.statusCodes || [];
                        const mainConfiguredCacheStatus = mainPercentageConfig?.filters?.cacheStatus || [];

                        const statusCodes = (mainPanelFilters.percentageStatusCodes || mainConfiguredStatusCodes || []).filter(Boolean);
                        const cacheStatuses = (mainPanelFilters.percentageCacheStatus || mainConfiguredCacheStatus || []).filter(Boolean);
                        const hasStatusFilter = statusCodes.length > 0;
                        const hasCacheFilter = cacheStatuses.length > 0;

                        if (!hasStatusFilter && !hasCacheFilter) return graphData;

                        return graphData.map(record => {
                            const filteredRecord = { ...record };

                            normalEventKeys.forEach(eventKeyInfo => {
                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                const baseName = event?.eventName || `Event ${eventKeyInfo.eventId}`;
                                const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                                let filteredCount = 0;
                                let filteredSuccess = 0;
                                let filteredFail = 0;
                                let filteredAvgDelay = 0;

                                if (hasStatusFilter && hasCacheFilter) {
                                    // Prefer combined keys if present; else fall back to status-only.
                                    const hasCombinedKeys = statusCodes.some((status: string) =>
                                        cacheStatuses.some((cache: string) => Object.prototype.hasOwnProperty.call(record, `${eventKey}_status_${status}_cache_${cache}_count`))
                                    );

                                    if (hasCombinedKeys) {
                                        statusCodes.forEach((status: string) => {
                                            cacheStatuses.forEach((cache: string) => {
                                                const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                                                filteredCount += Number(record[`${combinedKey}_count`] || 0);
                                                filteredSuccess += Number(record[`${combinedKey}_success`] || 0);
                                                filteredFail += Number(record[`${combinedKey}_fail`] || 0);
                                                filteredAvgDelay += Number(record[`${combinedKey}_avgDelay`] || 0);
                                            });
                                        });
                                    } else {
                                        statusCodes.forEach((status: string) => {
                                            const statusKey = `${eventKey}_status_${status}`;
                                            filteredCount += Number(record[`${statusKey}_count`] || 0);
                                            filteredSuccess += Number(record[`${statusKey}_success`] || 0);
                                            filteredFail += Number(record[`${statusKey}_fail`] || 0);
                                            filteredAvgDelay += Number(record[`${statusKey}_avgDelay`] || 0);
                                        });
                                    }
                                } else if (hasStatusFilter) {
                                    statusCodes.forEach((status: string) => {
                                        const statusKey = `${eventKey}_status_${status}`;
                                        filteredCount += Number(record[`${statusKey}_count`] || 0);
                                        filteredSuccess += Number(record[`${statusKey}_success`] || 0);
                                        filteredFail += Number(record[`${statusKey}_fail`] || 0);
                                        filteredAvgDelay += Number(record[`${statusKey}_avgDelay`] || 0);
                                    });
                                } else if (hasCacheFilter) {
                                    cacheStatuses.forEach((cache: string) => {
                                        const cacheKey = `${eventKey}_cache_${cache}`;
                                        filteredCount += Number(record[`${cacheKey}_count`] || 0);
                                        filteredSuccess += Number(record[`${cacheKey}_success`] || 0);
                                        filteredFail += Number(record[`${cacheKey}_fail`] || 0);
                                        filteredAvgDelay += Number(record[`${cacheKey}_avgDelay`] || 0);
                                    });
                                }

                                filteredRecord[`${eventKeyInfo.eventKey}_count`] = filteredCount;
                                filteredRecord[`${eventKeyInfo.eventKey}_success`] = filteredSuccess;
                                filteredRecord[`${eventKeyInfo.eventKey}_fail`] = filteredFail;
                                filteredRecord[`${eventKeyInfo.eventKey}_avgDelay`] = filteredAvgDelay;
                            });

                            return filteredRecord;
                        });
                    })();

                    // Calculate event stats for badges and sort by count
                    const eventStatsForBadges = normalEventKeys.map(eventKeyInfo => {
                        const eventKey = eventKeyInfo.eventKey;
                        let total = 0;
                        let success = 0;

                        mainFilteredGraphData.forEach((item: any) => {
                            total += Number(item[`${eventKey}_count`] ?? item[eventKey] ?? 0);
                            success += Number(item[`${eventKey}_success`] ?? item[`${eventKey}_successCount`] ?? 0);
                        });

                        const successRate = total > 0 ? (success / total) * 100 : 0;

                        return {
                            eventKey,
                            eventId: eventKeyInfo.eventId,
                            total,
                            successRate
                        };
                    });

                    // Sort normalEventKeys by total count descending (highest first) for legend
                    const sortedNormalEventKeys = [...normalEventKeys].sort((a, b) => {
                        const aTotal = eventStatsForBadges.find(s => s.eventKey === a.eventKey)?.total || 0;
                        const bTotal = eventStatsForBadges.find(s => s.eventKey === b.eventKey)?.total || 0;
                        return bTotal - aTotal;
                    });

                    // If in deviation mode, show only the overlay chart with toggle button
                    // For hourly: only show 8-Day Overlay if date range <= 8 days
                    if (isHourly && mainChartType === 'deviation') {
                        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysDiff <= 8) {
                            // Filter to show only selected event or all events
                            const filteredEventKeys = overlaySelectedEventKey
                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                : normalEventKeys.map(e => e.eventKey);

                            return (
                                <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                    <CardHeader className="pb-2 px-3 md:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                                <CardTitle className="text-base md:text-lg">8-Day Hourly Comparison</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    onClick={() => {
                                                        setPanelChartType(prev => {
                                                            const mainPanelId = profile?.panels?.[0]?.panelId;
                                                            if (!mainPanelId) return prev;
                                                            return {
                                                                ...prev,
                                                                [mainPanelId]: 'default',
                                                            };
                                                        });
                                                    }}
                                                >
                                                    ← Event Trends
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 ml-2 text-gray-500 hover:text-indigo-600"
                                                    onClick={() => setExpandedChart({
                                                        title: '8-Day Hourly Comparison',
                                                        render: (z) => (
                                                            <DayWiseComparisonChart
                                                                data={graphData}
                                                                dateRange={dateRange}
                                                                eventKeys={filteredEventKeys}
                                                                eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                eventNames={eventNames}
                                                                eventStats={eventStatsForBadges}
                                                                selectedEventKey={overlaySelectedEventKey}
                                                                onEventClick={handleOverlayEventClick}
                                                            />
                                                        )
                                                    })}
                                                >
                                                    <Maximize2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                        <DayWiseComparisonChart
                                            data={graphData}
                                            dateRange={dateRange}
                                            eventKeys={filteredEventKeys}
                                            eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                            eventNames={eventNames}
                                            eventStats={eventStatsForBadges}
                                            selectedEventKey={overlaySelectedEventKey}
                                            onEventClick={handleOverlayEventClick}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        }
                    }

                    // If in deviation mode for DAILY data, show daily overlay comparison
                    // Only show for date ranges <= 8 days
                    if (!isHourly && mainChartType === 'deviation') {
                        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysDiff <= 8) {
                            // Filter to show only selected event or all events
                            const filteredEventKeys = overlaySelectedEventKey
                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                : normalEventKeys.map(e => e.eventKey);

                            return (
                                <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                    <CardHeader className="pb-2 px-3 md:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-indigo-600" />
                                                <CardTitle className="text-base md:text-lg">Daily Overlay Comparison</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    onClick={() => {
                                                        setPanelChartType(prev => {
                                                            const mainPanelId = profile?.panels?.[0]?.panelId;
                                                            if (!mainPanelId) return prev;
                                                            return {
                                                                ...prev,
                                                                [mainPanelId]: 'default',
                                                            };
                                                        });
                                                    }}
                                                >
                                                    ← Event Trends
                                                </Button>
                                                <UiTooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 ml-2 text-gray-500 hover:text-indigo-600"
                                                            onClick={() => setExpandedChart({
                                                                title: 'Daily Overlay Comparison',
                                                                render: (z) => (
                                                                    <DayWiseComparisonChart
                                                                        data={graphData}
                                                                        dateRange={dateRange}
                                                                        eventKeys={filteredEventKeys}
                                                                        eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                        eventNames={eventNames}
                                                                        eventStats={eventStatsForBadges}
                                                                        selectedEventKey={overlaySelectedEventKey}
                                                                        onEventClick={handleOverlayEventClick}
                                                                    />
                                                                )
                                                            })}
                                                        >
                                                            <Maximize2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Expand to full screen</p>
                                                    </TooltipContent>
                                                </UiTooltip>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-2 md:px-6 pb-4 md:pb-6 relative group">
                                        <div className="absolute top-14 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <ChartZoomControls
                                                zoomLevel={zoomLevel}
                                                onZoomIn={zoomIn}
                                                onZoomOut={zoomOut}
                                                onReset={resetZoom}
                                            />
                                        </div>
                                        <div
                                            className="w-full h-full origin-top-left transition-all duration-100 ease-out overflow-x-auto overflow-y-hidden"
                                            onWheel={handleWheel}
                                        >
                                            <div style={{ width: `${zoomLevel * 100}%`, height: '100%', minWidth: '100%' }}>
                                                <DayWiseComparisonChart
                                                    data={graphData}
                                                    dateRange={dateRange}
                                                    eventKeys={filteredEventKeys}
                                                    eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                    eventNames={eventNames}
                                                    eventStats={eventStatsForBadges}
                                                    selectedEventKey={overlaySelectedEventKey}
                                                    onEventClick={handleOverlayEventClick}
                                                    headless={true}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        }
                    }

                    // Otherwise show the regular chart
                    return (
                        <div>
                            <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                                <CardHeader className="pb-2 px-3 md:px-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"
                                            >
                                                <BarChart3 className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                                    {/* API Event Indicator Badge */}
                                                    {profile?.panels?.[0]?.filterConfig?.isApiEvent === true && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md">
                                                            API
                                                        </span>
                                                    )}
                                                    {(() => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                        if (isHourly && mainChartType === 'deviation') {
                                                            return '8-Day Hourly Comparison';
                                                        }
                                                        if (isHourly) {
                                                            return 'Hourly Event Trends';
                                                        }
                                                        if (mainChartType === 'deviation') {
                                                            return 'Daily Overlay Comparison';
                                                        }
                                                        return 'Daily Event Trends with Average';
                                                    })()}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {isHourly ? (
                                                        <span className="hidden md:inline">
                                                            {(() => {
                                                                const mainPanelId = profile?.panels?.[0]?.panelId;
                                                                const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                                return mainChartType === 'deviation'
                                                                    ? 'Compare hourly patterns across last 8 days'
                                                                    : 'Hourly data points • Toggle for day-wise comparison';
                                                            })()}
                                                        </span>
                                                    ) : (
                                                        <span className="hidden md:inline">Daily event counts • Toggle for overlay comparison</span>
                                                    )}
                                                    <span className="md:hidden">Tap data points for insights</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* AI Insights Button - Admin Only */}
                                            {isAdmin && (
                                                <AiInsightsBadge
                                                    panelId="main-panel"
                                                    panelName={profile?.panels?.[0]?.panelName || 'Main Panel'}
                                                    data={graphData}
                                                    metricType={isMainPanelApi ? 'percentage' : (mainPanelAvgEventType >= 1 ? 'timing' : 'count')}
                                                    isHourly={isHourly}
                                                    eventKeys={eventKeys}
                                                />
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 text-sm font-semibold bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4"
                                                onClick={() => {
                                                    setPanelChartType(prev => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        if (!mainPanelId) return prev;
                                                        const current = prev[mainPanelId] ?? 'default';
                                                        return {
                                                            ...prev,
                                                            [mainPanelId]: current === 'deviation' ? 'default' : 'deviation',
                                                        };
                                                    });
                                                }}
                                            >
                                                {(() => {
                                                    const mainPanelId = profile?.panels?.[0]?.panelId;
                                                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                    if (isHourly) {
                                                        return mainChartType === 'deviation' ? '← Event Trends' : '8-Day Overlay →';
                                                    }
                                                    return mainChartType === 'deviation' ? '← Event Trends' : 'Daily Overlay →';
                                                })()}
                                            </Button>
                                            {/* Hourly/Daily Toggle */}
                                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <button
                                                    onClick={() => setHourlyOverride?.(true)}
                                                    className={cn(
                                                        "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                        isHourly
                                                            ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-md ring-1 ring-purple-200 dark:ring-purple-500/30"
                                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50"
                                                    )}
                                                >
                                                    Hourly
                                                </button>
                                                <button
                                                    onClick={() => setHourlyOverride?.(false)}
                                                    className={cn(
                                                        "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                        !isHourly
                                                            ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-md ring-1 ring-purple-200 dark:ring-purple-500/30"
                                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50"
                                                    )}
                                                >
                                                    Daily
                                                </button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-gray-500 hover:text-indigo-600"
                                                onClick={() => {
                                                    // Determine current chart type and render correct expanded view
                                                    const mainPanelId = profile?.panels?.[0]?.panelId;
                                                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';

                                                    let chartTitle = 'Event Trends';
                                                    let renderFn = (z: number) => null;

                                                    // Logic mostly duplicates render below, but simplified for expand view
                                                    // NOTE: In a real refactor, we would extract the "chart switch" logic to a component
                                                    // For now, we will just pass the standard Line/Bar chart as that is 90% of use cases
                                                    // To support Overlay mode in Expand, we'd need more logic here.

                                                    setExpandedChart({
                                                        title: 'Expanded Analysis',
                                                        render: (z) => (
                                                            /* Re-use the main chart rendering logic or a simplified version */
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                {(profile?.panels?.[0] as any)?.filterConfig?.graphType === 'bar' ? (
                                                                    <BarChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                        <XAxis dataKey="date" />
                                                                        <YAxis />
                                                                        <Tooltip />
                                                                        <Bar dataKey="count" fill="#8884d8" />
                                                                    </BarChart>
                                                                ) : (
                                                                    <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                        <XAxis dataKey="date" />
                                                                        <YAxis />
                                                                        <Tooltip />
                                                                        {normalEventKeys.map((ek, i) => (
                                                                            <Area key={ek.eventKey} type="monotone" dataKey={`${ek.eventKey}_count`} stroke={EVENT_COLORS[i % EVENT_COLORS.length]} fill={EVENT_COLORS[i % EVENT_COLORS.length]} fillOpacity={0.3} />
                                                                        ))}
                                                                    </AreaChart>
                                                                )}
                                                            </ResponsiveContainer>
                                                        )
                                                    });
                                                }}
                                            >
                                                <Maximize2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                    {/* Collapsible Legend - Only normal (count) events - Hide when showing overlay */}
                                    {(() => {
                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                        const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                        const showingHourlyOverlay = isHourly && mainChartType === 'deviation';
                                        const showingDailyOverlay = !isHourly && mainChartType === 'deviation';

                                        // Show legend for daily overlay, but not for hourly overlay (8-Day has its own badges)
                                        if (showingDailyOverlay && normalEventKeys.length > 0) {
                                            return (
                                                <CollapsibleLegend
                                                    eventKeys={sortedNormalEventKeys}
                                                    events={events}
                                                    isExpanded={mainLegendExpanded}
                                                    onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                                    maxVisibleItems={5}
                                                    graphData={graphData}
                                                    selectedEventKey={overlaySelectedEventKey}
                                                    onEventClick={handleOverlayEventClick}
                                                />
                                            );
                                        }

                                        return !showingHourlyOverlay && normalEventKeys.length > 0 && (
                                            <CollapsibleLegend
                                                eventKeys={sortedNormalEventKeys}
                                                events={events}
                                                isExpanded={mainLegendExpanded}
                                                onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                                maxVisibleItems={5}
                                                graphData={graphData}
                                                selectedEventKey={selectedEventKey}
                                                onEventClick={handleEventClick}
                                            />
                                        );
                                    })()}

                                    <div className="h-[300px] sm:h-[400px] md:h-[520px] w-full cursor-pointer relative group overflow-x-auto overflow-y-hidden">
                                        <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <ChartZoomControls
                                                zoomLevel={zoomLevel}
                                                onZoomIn={zoomIn}
                                                onZoomOut={zoomOut}
                                                onReset={resetZoom}
                                            />
                                        </div>
                                        <div
                                            className="h-full transition-all duration-200"
                                            style={{ width: `${Math.max(100, zoomLevel * 100)}%`, minWidth: '100%' }}
                                        >
                                            {graphData.length > 0 ? (
                                                <>
                                                    {/* Show deviation chart for days < 7 when toggled */}
                                                    {(() => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';

                                                        // Calculate event stats for badges
                                                        const eventStatsForBadges = normalEventKeys.map(eventKeyInfo => {
                                                            const eventKey = eventKeyInfo.eventKey;
                                                            let total = 0;
                                                            let success = 0;

                                                            graphData.forEach((item: any) => {
                                                                total += item[`${eventKey}_count`] || 0;
                                                                success += item[`${eventKey}_success`] || 0;
                                                            });

                                                            const successRate = total > 0 ? (success / total) * 100 : 0;

                                                            return {
                                                                eventKey,
                                                                eventId: eventKeyInfo.eventId,
                                                                total,
                                                                successRate
                                                            };
                                                        });

                                                        if (isHourly && mainChartType === 'deviation') {
                                                            // Filter to show only selected event or all events
                                                            const filteredEventKeys = overlaySelectedEventKey
                                                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                                                : normalEventKeys.map(e => e.eventKey);

                                                            const filteredEventStats = overlaySelectedEventKey
                                                                ? eventStatsForBadges.filter(s => s.eventKey === overlaySelectedEventKey)
                                                                : eventStatsForBadges;

                                                            return (
                                                                <DayWiseComparisonChart
                                                                    data={graphData}
                                                                    dateRange={dateRange}
                                                                    eventKeys={filteredEventKeys}
                                                                    eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                    eventStats={filteredEventStats}
                                                                    selectedEventKey={overlaySelectedEventKey}
                                                                    onEventClick={handleOverlayEventClick}
                                                                />
                                                            );
                                                        }

                                                        // For daily overlay mode, show daily average chart with line + avg
                                                        if (!isHourly && mainChartType === 'deviation') {
                                                            // Filter to show only selected event or all events
                                                            const filteredEventKeys = overlaySelectedEventKey
                                                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                                                : normalEventKeys.map(e => e.eventKey);

                                                            const filteredEventStats = overlaySelectedEventKey
                                                                ? eventStatsForBadges.filter(s => s.eventKey === overlaySelectedEventKey)
                                                                : eventStatsForBadges;

                                                            return (
                                                                <DailyAverageChart
                                                                    data={graphData}
                                                                    dateRange={dateRange}
                                                                    eventKeys={filteredEventKeys}
                                                                    eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                    eventNames={eventNames}
                                                                    eventStats={filteredEventStats}
                                                                    selectedEventKey={overlaySelectedEventKey}
                                                                    onEventClick={handleOverlayEventClick}
                                                                />
                                                            );
                                                        }

                                                        // Default chart rendering
                                                        return (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                {/* Check if profile has bar chart type */}
                                                                {(profile?.panels?.[0] as any)?.filterConfig?.graphType === 'bar' ? (
                                                                    <BarChart
                                                                        data={graphData}
                                                                        margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                                                        barCategoryGap="15%"
                                                                        onClick={(chartState: any) => {
                                                                            if (chartState && chartState.activeIndex !== undefined) {
                                                                                const index = parseInt(chartState.activeIndex);
                                                                                const dataPoint = graphData[index];
                                                                                if (dataPoint) {
                                                                                    setPinnedTooltip({
                                                                                        dataPoint,
                                                                                        label: chartState.activeLabel || dataPoint.date || ''
                                                                                    });
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <defs>
                                                                            {/* Dynamic gradients for normal events */}
                                                                            {normalEventKeys.map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                return (
                                                                                    <linearGradient key={`barGrad_${index}_${eventKeyInfo.eventKey}`} id={`barColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                                                                                        <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                                                                    </linearGradient>
                                                                                );
                                                                            })}
                                                                        </defs>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                        <XAxis
                                                                            dataKey="date"
                                                                            tick={<CustomXAxisTick />}
                                                                            axisLine={{ stroke: '#e5e7eb' }}
                                                                            tickLine={false}
                                                                            height={45}
                                                                            interval={Math.floor(graphData.length / 8)}
                                                                        />
                                                                        {/* Left Y-axis for Count */}
                                                                        <YAxis
                                                                            yAxisId="left"
                                                                            tick={{ fill: '#6b7280', fontSize: 11 }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tickFormatter={(value) => {
                                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                                return value;
                                                                            }}
                                                                            dx={-10}
                                                                            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                                                                        />
                                                                        <Tooltip
                                                                            content={<CustomTooltip events={events} eventKeys={normalEventKeys} />}
                                                                            cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
                                                                        />
                                                                        {/* Dynamic bars for normal (count) events only */}
                                                                        {normalEventKeys.length > 0 ? normalEventKeys.map((eventKeyInfo, index) => {
                                                                            const eventKey = eventKeyInfo.eventKey;
                                                                            const countKey = `${eventKey}_count`;
                                                                            const resolvedCountKey = (graphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                                ? countKey
                                                                                : eventKey;
                                                                            return (
                                                                                <Bar
                                                                                    key={`bar_${index}_${eventKey}`}
                                                                                    dataKey={resolvedCountKey}
                                                                                    name={eventKeyInfo.eventName}
                                                                                    yAxisId="left"
                                                                                    fill={`url(#barColor_${eventKey})`}
                                                                                    radius={[3, 3, 0, 0]}
                                                                                    maxBarSize={40}
                                                                                    opacity={selectedEventKey && selectedEventKey !== eventKey ? 0.4 : 1}
                                                                                    cursor="pointer"
                                                                                    isAnimationActive={false}
                                                                                    animationDuration={0}
                                                                                />
                                                                            );
                                                                        }) : (
                                                                            /* Fallback to overall totals when no event keys */
                                                                            <Bar
                                                                                dataKey="count"
                                                                                name="Total"
                                                                                yAxisId="left"
                                                                                fill="#6366f1"
                                                                                radius={[3, 3, 0, 0]}
                                                                                maxBarSize={40}
                                                                                isAnimationActive={false}
                                                                                animationDuration={0}
                                                                            />
                                                                        )}
                                                                    </BarChart>
                                                                ) : (
                                                                    <AreaChart
                                                                        data={graphData}
                                                                        margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                                                        onClick={(chartState: any) => {
                                                                            if (chartState && chartState.activeIndex !== undefined) {
                                                                                const index = parseInt(chartState.activeIndex);
                                                                                const dataPoint = graphData[index];
                                                                                if (dataPoint) {
                                                                                    setPinnedTooltip({
                                                                                        dataPoint,
                                                                                        label: chartState.activeLabel || dataPoint.date || ''
                                                                                    });
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <defs>
                                                                            {/* Dynamic gradients for each event */}
                                                                            {eventKeys.map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                return (
                                                                                    <linearGradient key={`areaGrad_${index}_${eventKeyInfo.eventKey}`} id={`areaColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                                                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                                                                    </linearGradient>
                                                                                );
                                                                            })}
                                                                            {/* Glow filters for lines */}
                                                                            <filter id="glow">
                                                                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                                                <feMerge>
                                                                                    <feMergeNode in="coloredBlur" />
                                                                                    <feMergeNode in="SourceGraphic" />
                                                                                </feMerge>
                                                                            </filter>
                                                                        </defs>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                        <XAxis
                                                                            dataKey="date"
                                                                            tick={<CustomXAxisTick isHourly={isHourly} />}
                                                                            axisLine={{ stroke: '#e5e7eb' }}
                                                                            tickLine={false}
                                                                            height={45}
                                                                            interval={Math.floor(graphData.length / 8)}
                                                                        />
                                                                        {/* Left Y-axis for Count */}
                                                                        <YAxis
                                                                            yAxisId="left"
                                                                            tick={{ fill: '#6b7280', fontSize: 11 }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tickFormatter={(value) => {
                                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                                return value;
                                                                            }}
                                                                            dx={-10}
                                                                            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                                                                        />
                                                                        <Tooltip
                                                                            content={<CustomTooltip events={events} eventKeys={normalEventKeys} />}
                                                                            cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                                        />
                                                                        {/* Dynamic areas for normal (count) events only */}
                                                                        {normalEventKeys.length > 0 ? normalEventKeys
                                                                            .filter(ek => !selectedEventKey || ek.eventKey === selectedEventKey)
                                                                            .map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                const eventKey = eventKeyInfo.eventKey;
                                                                                const countKey = `${eventKey}_count`;
                                                                                const resolvedCountKey = (graphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                                    ? countKey
                                                                                    : eventKey;
                                                                                return (
                                                                                    <Area
                                                                                        key={`area_${index}_${eventKey}`}
                                                                                        type="monotone"
                                                                                        dataKey={resolvedCountKey}
                                                                                        name={eventKeyInfo.eventName}
                                                                                        yAxisId="left"
                                                                                        stroke={color}
                                                                                        strokeWidth={2.5}
                                                                                        fillOpacity={1}
                                                                                        fill={`url(#areaColor_${eventKey})`}
                                                                                        dot={false}
                                                                                        activeDot={{
                                                                                            r: 8,
                                                                                            fill: color,
                                                                                            stroke: '#fff',
                                                                                            strokeWidth: 3,
                                                                                            filter: 'url(#glow)',
                                                                                            cursor: 'pointer',
                                                                                        }}
                                                                                        isAnimationActive={false} connectNulls={true}
                                                                                        animationDuration={0}
                                                                                    />
                                                                                );
                                                                            }) : (
                                                                            /* Fallback to overall totals when no event keys */
                                                                            <Area
                                                                                type="monotone"
                                                                                dataKey="count"
                                                                                name="Total"
                                                                                yAxisId="left"
                                                                                stroke="#6366f1"
                                                                                strokeWidth={2.5}
                                                                                fillOpacity={0.3}
                                                                                fill="#6366f1"
                                                                                dot={false}
                                                                                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                                                                isAnimationActive={false} connectNulls={true}
                                                                                animationDuration={0}
                                                                            />
                                                                        )}
                                                                    </AreaChart>
                                                                )}
                                                            </ResponsiveContainer>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                    <div>
                                                        <BarChart3 className={`h-12 w-12 mb-3 opacity-30 ${dataLoading ? 'animate-spin' : ''}`} />
                                                    </div>
                                                    <p className="text-sm">
                                                        {dataLoading ? 'Loading chart data...' : 'No data available for selected filters'}
                                                    </p>
                                                    {!dataLoading && (
                                                        <p className="text-xs mt-1 opacity-60">Try adjusting your filter selections</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>

                                {/* Pinned Tooltip Overlay - Rendered outside chart for persistence */}
                                {pinnedTooltip && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                        <div
                                            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                            onClick={() => setPinnedTooltip(null)}
                                        />
                                        <div className="relative max-w-lg w-full">
                                            {/* Modal Container */}
                                            <div
                                                className="relative z-10 w-full max-w-[520px] sm:max-w-[600px]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Floating Close Button - Outside the card */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPinnedTooltip(null)}
                                                    className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                                    aria-label="Close details"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>

                                                {/* Card Content */}
                                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                                                    {/* Decorative header gradient */}
                                                    <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                                                    <div className="max-h-[70vh] overflow-y-auto p-1">
                                                        <CustomTooltip
                                                            active={true}
                                                            payload={eventKeys.map((ek, idx) => {
                                                                const event = events.find(e => String(e.eventId) === ek.eventId);
                                                                const color = event?.color || EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                return {
                                                                    dataKey: `${ek.eventKey}_count`,
                                                                    name: ek.eventName,
                                                                    value: pinnedTooltip.dataPoint[`${ek.eventKey}_count`] || 0,
                                                                    color,
                                                                    stroke: color,
                                                                    payload: pinnedTooltip.dataPoint
                                                                };
                                                            }).filter(p => p.value > 0)}
                                                            label={pinnedTooltip.label}
                                                            events={events}
                                                            eventKeys={eventKeys}
                                                            isPinned={true}
                                                            onClose={() => setPinnedTooltip(null)}
                                                        />
                                                    </div>

                                                    {/* Footer hint */}
                                                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 text-center">
                                                        <span className="text-xs text-muted-foreground">Click outside or press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-mono mx-1">ESC</kbd> to close</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </Card>
                        </div>
                    );
                })()
            }

            {/* Time Delay Chart - For isAvg Events Only (skip for special graphs) */}
            {
                avgEventKeys.length > 0 && !isFirstPanelSpecialGraph && (
                    <div>
                        <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                            <CardHeader className="pb-2 px-3 md:px-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            {(() => {
                                                const firstAvgEvent = avgEventKeys[0];
                                                const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                return avgEventType === 2 ? <DollarSign className="h-6 w-6 text-white" /> : <Clock className="h-6 w-6 text-white" />;
                                            })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base md:text-lg">
                                                {(() => {
                                                    const firstAvgEvent = avgEventKeys[0];
                                                    const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                    if (avgEventType === 2) return 'Cost Trends';
                                                    if (avgEventType === 3) return 'Count Trends';
                                                    return 'Time Delay Trends';
                                                })()}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {(() => {
                                                    const firstAvgEvent = avgEventKeys[0];
                                                    const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                    if (avgEventType === 2) return <span className="hidden md:inline">Average amount per event • Currency in Rupees (₹)</span>;
                                                    if (avgEventType === 3) return <span className="hidden md:inline">Average count per event</span>;
                                                    return (
                                                        <>
                                                            <span className="hidden md:inline">Average delay per event • Price Alerts in minutes, others in seconds</span>
                                                            <span className="md:hidden">Delay tracking for isAvg events</span>
                                                        </>
                                                    );
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                                            {(() => {
                                                const firstAvgEvent = avgEventKeys[0];
                                                const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                if (avgEventType === 2) return 'isAvg₹ Events';
                                                return 'isAvg Events';
                                            })()}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 ml-1 text-gray-500 hover:text-indigo-600"
                                            onClick={() => {
                                                const firstAvgEvent = avgEventKeys[0];
                                                const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                let title = 'Time Delay Trends';
                                                if (avgEventType === 2) title = 'Cost Trends';
                                                if (avgEventType === 3) title = 'Count Trends';

                                                setExpandedChart({
                                                    title,
                                                    render: (z) => (
                                                        <AreaChart
                                                            data={graphData}
                                                            margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
                                                        >
                                                            <defs>
                                                                {avgEventKeys.map((eventKeyInfo, index) => {
                                                                    const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                    const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                    return (
                                                                        <linearGradient key={`timeGrad_${index}_${eventKeyInfo.eventKey}`} id={`timeColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                                        </linearGradient>
                                                                    );
                                                                })}
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                            <XAxis dataKey="date" />
                                                            <YAxis />
                                                            <Tooltip />
                                                            {avgEventKeys.map((eventKeyInfo, index) => {
                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                const eventKey = eventKeyInfo.eventKey;
                                                                return (
                                                                    <Area
                                                                        key={`time_${index}_${eventKey}`}
                                                                        type="monotone"
                                                                        dataKey={`${eventKey}_avgDelay`}
                                                                        name={eventKeyInfo.eventName}
                                                                        stroke={color}
                                                                        strokeWidth={2.5}
                                                                        fillOpacity={1}
                                                                        fill={`url(#timeColor_${eventKey})`}
                                                                    />
                                                                );
                                                            })}
                                                        </AreaChart>
                                                    )
                                                });
                                            }}
                                        >
                                            <Maximize2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6 group">
                                {/* Collapsible Legend - Only avg (time) events */}
                                {avgEventKeys.length > 0 && (
                                    <CollapsibleLegend
                                        eventKeys={avgEventKeys}
                                        events={events}
                                        isExpanded={mainLegendExpanded}
                                        onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                        maxVisibleItems={5}
                                        graphData={graphData}
                                        selectedEventKey={selectedEventKey}
                                        onEventClick={handleEventClick}
                                    />
                                )}

                                <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <ChartZoomControls
                                        zoomLevel={zoomLevel}
                                        onZoomIn={zoomIn}
                                        onZoomOut={zoomOut}
                                        onReset={resetZoom}
                                    />
                                </div>

                                <div
                                    className="h-[300px] sm:h-[350px] md:h-[400px] w-full cursor-pointer overflow-x-auto overflow-y-hidden relative group"
                                >
                                    <div
                                        className="h-full transition-all duration-200"
                                        style={{ width: `${Math.max(100, zoomLevel * 100)}%`, minWidth: '100%' }}
                                    >
                                        {graphData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={graphData}
                                                    margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
                                                >
                                                    <defs>
                                                        {/* Dynamic gradients for avg events */}
                                                        {avgEventKeys.map((eventKeyInfo, index) => {
                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                            return (
                                                                <linearGradient key={`timeGrad_${index}_${eventKeyInfo.eventKey}`} id={`timeColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={<CustomXAxisTick isHourly={isHourly} />}
                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                        tickLine={false}
                                                        height={45}
                                                        interval={Math.floor(graphData.length / 8)}
                                                    />
                                                    {/* Y-axis for Time Delay */}
                                                    <YAxis
                                                        tick={{ fill: '#f59e0b', fontSize: 11 }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(value) => {
                                                            if (!value || value <= 0) return '0';
                                                            // Get the first avg event to determine type
                                                            const firstAvgEvent = avgEventKeys[0];
                                                            const avgEventType = firstAvgEvent?.isAvgEvent || 0;

                                                            if (avgEventType === 2) {
                                                                // isAvgEvent 2 = Rupees
                                                                return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                                                            } else if (avgEventType === 3) {
                                                                // isAvgEvent 3 = Count
                                                                return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
                                                            } else if (avgEventType === 1) {
                                                                // isAvgEvent 1 = Time (minutes/seconds)
                                                                const hasPriceAlert = avgEventKeys.some(ek => {
                                                                    const ev = events.find(e => String(e.eventId) === ek.eventId);
                                                                    return ev?.feature === 1;
                                                                });
                                                                if (hasPriceAlert) {
                                                                    // Price alerts - value is already in MINUTES
                                                                    if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                                                    return `${value.toFixed(1)}m`;
                                                                } else {
                                                                    // Others - value is already in SECONDS
                                                                    if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                                                    return `${value.toFixed(1)}s`;
                                                                }
                                                            }
                                                            return value.toLocaleString();
                                                        }}
                                                        dx={-10}
                                                        label={{
                                                            value: (() => {
                                                                const firstAvgEvent = avgEventKeys[0];
                                                                const avgEventType = firstAvgEvent?.isAvgEvent || 0;
                                                                if (avgEventType === 2) return 'Amount (₹)';
                                                                if (avgEventType === 3) return 'Count';
                                                                if (avgEventType === 1) return 'Delay';
                                                                return 'Value';
                                                            })(),
                                                            angle: -90,
                                                            position: 'insideLeft',
                                                            style: { fill: '#f59e0b', fontSize: 10 }
                                                        }}
                                                    />
                                                    <Tooltip
                                                        content={<CustomTooltip events={events} eventKeys={avgEventKeys} />}
                                                        cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                    />
                                                    {/* Dynamic areas for avg (time) events */}
                                                    {avgEventKeys
                                                        .filter(ek => !selectedEventKey || ek.eventKey === selectedEventKey)
                                                        .map((eventKeyInfo, index) => {
                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                            const eventKey = eventKeyInfo.eventKey;
                                                            return (
                                                                <Area
                                                                    key={`time_${index}_${eventKey}`}
                                                                    type="monotone"
                                                                    dataKey={`${eventKey}_avgDelay`}
                                                                    name={eventKeyInfo.eventName}
                                                                    stroke={color}
                                                                    strokeWidth={2.5}
                                                                    fillOpacity={1}
                                                                    fill={`url(#timeColor_${eventKey})`}
                                                                    dot={false}
                                                                    activeDot={{
                                                                        r: 8,
                                                                        fill: color,
                                                                        stroke: '#fff',
                                                                        strokeWidth: 3,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                    isAnimationActive={false} connectNulls={true}
                                                                    animationDuration={0}
                                                                />
                                                            );
                                                        })}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                <Clock className="h-12 w-12 mb-3 opacity-30" />
                                                <p className="text-sm">
                                                    {dataLoading ? 'Loading delay data...' : 'No delay data available'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* API Events Chart - For isApiEvent panels showing status codes and timing metrics */}
            {
                (() => {
                    const isApiEvent = isMainPanelApi;

                    // Use apiPerformanceEventKeys for visibility check (always endpoint-based)
                    if (!isApiEvent || apiPerformanceEventKeys.length === 0) return null;

                    return (
                        <div>
                            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                                <CardHeader className="pb-2 px-3 md:px-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <Activity className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <span className="hidden md:inline">Response times, data transfer, and status code distribution</span>
                                                    <span className="md:hidden">API timing and status metrics</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">API Events</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                    {/* Collapsible Legend - Status codes and cache status */}
                                    {apiPerformanceEventKeys.length > 0 && (
                                        <CollapsibleLegend
                                            eventKeys={apiPerformanceEventKeys}
                                            events={events}
                                            isExpanded={mainLegendExpanded}
                                            onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                            maxVisibleItems={5}
                                            graphData={graphData}
                                            selectedEventKey={apiSelectedEventKey}
                                            onEventClick={handleApiEventClick}
                                        />
                                    )}

                                    {/* Tabs for different metrics */}
                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                                        {(['timing', 'timing-breakdown', 'timing-anomaly', 'bytes', 'bytes-in', 'count'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setApiMetricView(tab as any)}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                                    apiMetricView === tab
                                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                )}
                                            >
                                                {tab === 'timing' && '⏱️ Time (Avg)'}
                                                {tab === 'timing-breakdown' && '🔀 Timing Breakdown'}
                                                {tab === 'timing-anomaly' && '⚠️ Anomalies'}
                                                {tab === 'bytes' && '📤 Bytes Out (Avg)'}
                                                {tab === 'bytes-in' && '📥 Bytes In (Avg)'}
                                                {tab === 'count' && '📈 Request Count'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Info box for anomaly detection */}
                                    {apiMetricView === 'timing-anomaly' && (
                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                                                        Anomaly Detection Active
                                                    </p>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                                        Red dots highlight response times exceeding 2 standard deviations above the mean. These may indicate performance issues requiring investigation.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                        {(isMainPanelApi ? apiPerformanceSeries : graphData).length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={isMainPanelApi ? apiPerformanceSeries : graphData}
                                                    margin={{ top: 10, right: 30, left: 18, bottom: 50 }}
                                                >
                                                    <defs>
                                                        {apiPerformanceEventKeys.map((eventKeyInfo: EventKeyInfo, index: number) => {
                                                            const color = EVENT_COLORS[index % EVENT_COLORS.length];
                                                            return (
                                                                <linearGradient key={`apiGrad_${index}_${eventKeyInfo.eventKey}`} id={`apiColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={<CustomXAxisTick isHourly={isHourly} />}
                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                        tickLine={false}
                                                        height={45}
                                                        interval={Math.max(0, Math.floor(((isMainPanelApi ? apiPerformanceSeries : graphData).length || 0) / 8))}
                                                    />
                                                    <YAxis
                                                        tick={{ fill: '#3b82f6', fontSize: 11 }}
                                                        width={60}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(value) => {
                                                            if (!value || value <= 0) return '0';
                                                            const isTimingView = apiMetricView?.startsWith('timing');
                                                            const isBytesView = apiMetricView?.startsWith('bytes');

                                                            if (isTimingView) {
                                                                return `${value.toFixed(0)}ms`;
                                                            } else if (isBytesView) {
                                                                // Bytes
                                                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}GB`;
                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}MB`;
                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}KB`;
                                                                return `${value.toFixed(0)}B`;
                                                            } else {
                                                                // Count
                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                return value;
                                                            }
                                                        }}
                                                        dx={0}
                                                        label={{
                                                            value: apiMetricView?.startsWith('timing') ? 'Time (ms)' : apiMetricView?.startsWith('bytes') ? 'Data (bytes)' : 'Count',
                                                            angle: -90,
                                                            position: 'insideLeft',
                                                            style: { fill: '#3b82f6', fontSize: 10 }
                                                        }}
                                                    />
                                                    <Tooltip
                                                        content={<CustomTooltip events={events} eventKeys={apiPerformanceEventKeys} />}
                                                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                    />
                                                    {/* Dynamic areas - simplified approach that works */}
                                                    {apiPerformanceEventKeys.map((eventKeyInfo: EventKeyInfo, index: number) => {
                                                        // Only filter by apiSelectedEventKey if it matches one of the apiPerformanceEventKeys
                                                        // This prevents status-based selections (like 'status_200') from hiding all endpoint-based areas
                                                        const validSelection = apiSelectedEventKey && apiPerformanceEventKeys.some(k => k.eventKey === apiSelectedEventKey);
                                                        if (validSelection && eventKeyInfo.eventKey !== apiSelectedEventKey) {
                                                            return null;
                                                        }

                                                        const color = EVENT_COLORS[index % EVENT_COLORS.length];
                                                        const eventKey = eventKeyInfo.eventKey;

                                                        // Determine dataKey based on metric view
                                                        let dataKey = `${eventKey}_count`;
                                                        if (apiMetricView === 'timing' || apiMetricView === 'timing-anomaly') {
                                                            dataKey = `${eventKey}_avgServerToUser`;
                                                        } else if (apiMetricView === 'bytes') {
                                                            dataKey = `${eventKey}_avgBytesOut`;
                                                        } else if (apiMetricView === 'bytes-in') {
                                                            dataKey = `${eventKey}_avgBytesIn`;
                                                        }

                                                        // For timing breakdown, show stacked areas
                                                        if (apiMetricView === 'timing-breakdown') {
                                                            return (
                                                                <React.Fragment key={`api_breakdown_${index}_${eventKey}`}>
                                                                    <Area
                                                                        type="monotone"
                                                                        dataKey={`${eventKey}_avgServerToCloud`}
                                                                        name={`${eventKeyInfo.eventName} (Server)`}
                                                                        stroke="#ef4444"
                                                                        strokeWidth={2}
                                                                        fill="#ef4444"
                                                                        fillOpacity={0.3}
                                                                        stackId={eventKey}
                                                                        isAnimationActive={false}
                                                                    />
                                                                    <Area
                                                                        type="monotone"
                                                                        dataKey={`${eventKey}_avgCloudToUser`}
                                                                        name={`${eventKeyInfo.eventName} (Network)`}
                                                                        stroke="#f59e0b"
                                                                        strokeWidth={2}
                                                                        fill="#f59e0b"
                                                                        fillOpacity={0.3}
                                                                        stackId={eventKey}
                                                                        isAnimationActive={false}
                                                                    />
                                                                </React.Fragment>
                                                            );
                                                        }

                                                        // Calculate anomaly threshold (mean + 2*stdDev) for this event's timing
                                                        const timingValues = (isMainPanelApi ? apiPerformanceSeries : graphData)
                                                            .map((d: any) => d[dataKey])
                                                            .filter((v: any) => typeof v === 'number' && !isNaN(v) && v > 0);
                                                        const mean = timingValues.length > 0 ? timingValues.reduce((a: number, b: number) => a + b, 0) / timingValues.length : 0;
                                                        const variance = timingValues.length > 0 ? timingValues.reduce((acc: number, val: number) => acc + Math.pow(val - mean, 2), 0) / timingValues.length : 0;
                                                        const stdDev = Math.sqrt(variance);
                                                        const anomalyThreshold = mean + 2 * stdDev;

                                                        // Custom dot renderer for anomaly detection
                                                        const renderAnomalyDot = (props: any) => {
                                                            const { cx, cy, payload, dataKey: dk } = props;
                                                            const value = payload?.[dk];
                                                            if (apiMetricView !== 'timing-anomaly') return <g key={`no-anomaly-${cx}-${cy}`} />;
                                                            if (typeof value !== 'number' || value <= anomalyThreshold) return <g key={`below-thresh-${cx}-${cy}`} />;
                                                            // Render triangular warning indicator
                                                            return (
                                                                <g key={`anomaly-${cx}-${cy}`}>
                                                                    <polygon
                                                                        points={`${cx},${cy - 12} ${cx - 8},${cy + 4} ${cx + 8},${cy + 4}`}
                                                                        fill="#ef4444"
                                                                        stroke="#fff"
                                                                        strokeWidth={2}
                                                                        filter="drop-shadow(0 2px 4px rgba(239,68,68,0.4))"
                                                                    />
                                                                    <text
                                                                        x={cx}
                                                                        y={cy - 2}
                                                                        textAnchor="middle"
                                                                        fill="#fff"
                                                                        fontSize={8}
                                                                        fontWeight="bold"
                                                                    >!</text>
                                                                </g>
                                                            );
                                                        };

                                                        return (
                                                            <Area
                                                                key={`api_${index}_${eventKey}_${apiMetricView}`}
                                                                type="monotone"
                                                                dataKey={dataKey}
                                                                name={eventKeyInfo.eventName}
                                                                stroke={color}
                                                                strokeWidth={2.5}
                                                                fill={color}
                                                                fillOpacity={0.4}
                                                                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                                                                dot={apiMetricView === 'timing-anomaly' ? renderAnomalyDot : false}
                                                                isAnimationActive={false}
                                                            />
                                                        );
                                                    })}
                                                </AreaChart >
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center">
                                                <p className="text-muted-foreground">No API performance data available</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })()
            }

            {/* Error Events Chart - For isError Events Only (skip for special graphs) */}
            {
                errorEventKeys.length > 0 && !isFirstPanelSpecialGraph && (
                    <div>
                        <Card className="border border-indigo-200/60 dark:border-indigo-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                            <CardHeader className="pb-2 px-3 md:px-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <AlertTriangle className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base md:text-lg">Error Event Tracking</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                <span className="hidden md:inline">Failed event counts over time • Red line = Failed Count</span>
                                                <span className="md:hidden">Failed count tracking for isError events</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Hourly/Daily Toggle */}
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                            <button
                                                onClick={() => setHourlyOverride?.(true)}
                                                className={cn(
                                                    "px-2 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                                    isHourly
                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                                )}
                                            >
                                                Hourly
                                            </button>
                                            <button
                                                onClick={() => setHourlyOverride?.(false)}
                                                className={cn(
                                                    "px-2 py-1 text-xs font-medium rounded-md transition-all duration-200",
                                                    !isHourly
                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                                )}
                                            >
                                                Daily
                                            </button>
                                        </div>
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">isError Events</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                {/* Collapsible Legend - Only error events */}
                                {errorEventKeys.length > 0 && (
                                    <CollapsibleLegend
                                        eventKeys={errorEventKeys}
                                        events={events}
                                        isExpanded={mainLegendExpanded}
                                        onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                        maxVisibleItems={5}
                                        graphData={graphData}
                                        selectedEventKey={errorSelectedEventKey}
                                        onEventClick={handleErrorEventClick}
                                    />
                                )}

                                <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                    {graphData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={graphData}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
                                            >
                                                <defs>
                                                    {/* Error gradient (red) */}
                                                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                                    </linearGradient>
                                                    {/* Success gradient (green) */}
                                                    <linearGradient id="okGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={<CustomXAxisTick isHourly={isHourly} />}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                    height={50}
                                                    interval={Math.floor(graphData.length / 8)}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#ef4444', fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                />
                                                <Tooltip
                                                    content={<CustomTooltip events={events} eventKeys={errorEventKeys} />}
                                                    cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                />
                                                {/* For error events: success = error count, fail = non-error count */}
                                                {errorEventKeys
                                                    .filter(ek => !errorSelectedEventKey || ek.eventKey === errorSelectedEventKey)
                                                    .map((eventKeyInfo) => {
                                                        const eventKey = eventKeyInfo.eventKey;
                                                        return (
                                                            <React.Fragment key={`error_main_${eventKey}`}>
                                                                {/* isError events: Show ONLY successCount as RED line (it represents FAILED count) */}
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey={`${eventKey}_success`}
                                                                    name={`${eventKeyInfo.eventName} (Failed Count)`}
                                                                    stroke="#ef4444"
                                                                    strokeWidth={3}
                                                                    fill="url(#errorGradient)"
                                                                    dot={false}
                                                                    activeDot={{ r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                                                    isAnimationActive={false} connectNulls={true}
                                                                    animationDuration={0}
                                                                />
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                            <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
                                            <p className="text-sm">
                                                {dataLoading ? 'Loading error data...' : 'No error data available'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Pie Charts - Shown above Hourly Insights, hidden if only 1 item (100% share) */}
            {
                (() => {
                    // Check if this is an API event panel
                    const isApiEvent = isMainPanelApi;

                    if (isApiEvent) {
                        // API Event Pie Charts - Status and CacheStatus distribution
                        // Access the nested data property from the API response
                        const apiData = pieChartData?.data || pieChartData;
                        const pickMetric = (val: any) => {
                            const count = Number(val?.count || 0);
                            if (count > 0) return { value: count, metricType: 'count' };
                            const avgDelay = Number(val?.avgDelay);
                            if (!Number.isNaN(avgDelay) && avgDelay > 0) return { value: avgDelay, metricType: 'avgDelay' };
                            const medianDelay = Number(val?.medianDelay);
                            if (!Number.isNaN(medianDelay) && medianDelay > 0) return { value: medianDelay, metricType: 'medianDelay' };
                            const modeDelay = Number(val?.modeDelay);
                            if (!Number.isNaN(modeDelay) && modeDelay > 0) return { value: modeDelay, metricType: 'modeDelay' };
                            return { value: 0, metricType: 'count' };
                        };

                        const statusData = apiData?.status ? Object.entries(apiData.status).map(([key, val]: [string, any]) => {
                            const metric = pickMetric(val);
                            return {
                                name: `${val.status}`,
                                value: metric.value,
                                metricType: metric.metricType,
                            };
                        }) : [];

                        const cacheStatusData = apiData?.cacheStatus ? Object.entries(apiData.cacheStatus).map(([key, val]: [string, any]) => {
                            const metric = pickMetric(val);
                            return {
                                name: val.cacheStatus || 'Unknown',
                                value: metric.value,
                                metricType: metric.metricType,
                            };
                        }) : [];

                        // Sort status data with 200 first
                        statusData.sort((a, b) => {
                            if (a.name === '200') return -1;
                            if (b.name === '200') return 1;
                            return parseInt(a.name) - parseInt(b.name);
                        });

                        const showStatus = statusData.length > 0;
                        const showCacheStatus = cacheStatusData.length > 0;
                        const visibleCount = [showStatus, showCacheStatus].filter(Boolean).length;

                        if (visibleCount === 0) {
                            return null;
                        }

                        const gridClass = visibleCount === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 md:grid-cols-2 w-full mx-auto";

                        return (
                            <div className={cn("grid gap-6 md:gap-8 mt-8", gridClass)}>
                                {/* Status Code Distribution */}
                                {showStatus && (
                                    <div>
                                        <Card className="border border-blue-200/60 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-500/5 dark:to-indigo-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                                            <Hash className="h-4 w-4 text-white" />
                                                        </div>
                                                        <CardTitle className="text-sm font-semibold text-foreground">Status Codes</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                                            {statusData.length} codes
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                                                            onClick={() => openExpandedPie('status', 'Status Codes', statusData)}
                                                        >
                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-72">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={statusData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={70}
                                                                outerRadius={100}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={2}
                                                                stroke="#fff"
                                                                isAnimationActive={false}
                                                                animationDuration={0}
                                                            >
                                                                {statusData.map((_: any, index: number) => (
                                                                    <Cell
                                                                        key={`status-cell-${index}`}
                                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<PieTooltip
                                                                    totalValue={statusData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                    category="Status Code"
                                                                    isAvgEventType={mainPanelAvgEventType}
                                                                />}
                                                            />
                                                            <Legend
                                                                iconType="circle"
                                                                iconSize={8}
                                                                layout="horizontal"
                                                                verticalAlign="bottom"
                                                                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Cache Status Distribution */}
                                {showCacheStatus && (
                                    <div>
                                        <Card className="border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-500/5 dark:to-fuchsia-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-md">
                                                            <Zap className="h-4 w-4 text-white" />
                                                        </div>
                                                        <CardTitle className="text-sm font-semibold text-foreground">Cache Status</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                                                            {cacheStatusData.length} types
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-purple-100 dark:hover:bg-purple-500/20"
                                                            onClick={() => openExpandedPie('cacheStatus', 'Cache Status', cacheStatusData)}
                                                        >
                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-72">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={cacheStatusData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={70}
                                                                outerRadius={100}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={2}
                                                                stroke="#fff"
                                                                isAnimationActive={false}
                                                                animationDuration={0}
                                                            >
                                                                {cacheStatusData.map((_: any, index: number) => (
                                                                    <Cell
                                                                        key={`cache-cell-${index}`}
                                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<PieTooltip
                                                                    totalValue={cacheStatusData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                    category="Cache Status"
                                                                    isAvgEventType={mainPanelAvgEventType}
                                                                />}
                                                            />
                                                            <Legend
                                                                iconType="circle"
                                                                iconSize={8}
                                                                layout="horizontal"
                                                                verticalAlign="bottom"
                                                                wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Note: Removed check that blocked pie charts when ANY panel was percentage/funnel
                    // This was too restrictive - let pie charts show if they have valid data

                    // Process pie chart data - combine duplicates and filter out single-item charts
                    const platformData = pieChartData?.platform ? combinePieChartDuplicates(pieChartData.platform) : [];
                    const rawPosData = pieChartData?.pos ? combinePieChartDuplicates(pieChartData.pos) : [];
                    // Apply POS mapping to convert IDs to human-readable names
                    const posData = rawPosData.map((item: any) => ({
                        ...item,
                        name: getPOSName(item.name)
                    }));
                    const sourceData = pieChartData?.source ? combinePieChartDuplicates(pieChartData.source) : [];

                    const showPlatform = shouldShowPieChart(pieChartData?.platform);
                    const showPos = shouldShowPieChart(pieChartData?.pos);
                    const showSource = shouldShowPieChart(pieChartData?.source);

                    const visibleCount = [showPlatform, showPos, showSource].filter(Boolean).length;

                    // If no pie charts to show, return null
                    if (visibleCount === 0) return null;

                    // Dynamic grid class based on visible charts
                    const gridClass = visibleCount === 1
                        ? "grid-cols-1 max-w-md mx-auto"
                        : visibleCount === 2
                            ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                            : "grid-cols-1 md:grid-cols-3";

                    return (
                        <div className={cn("grid gap-3 md:gap-4", gridClass)}>
                            {/* Platform Distribution */}
                            {showPlatform && (
                                <div>
                                    <Card className="border border-indigo-200/60 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-500/5 dark:to-violet-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                                                        <Activity className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">Platform</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                                        {platformData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                                        onClick={() => openExpandedPie('platform', 'Platform', platformData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={platformData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {platformData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`platform-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={platformData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="Platform"
                                                                isAvgEventType={mainPanelAvgEventType}
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* POS Distribution */}
                            {showPos && (
                                <div>
                                    <Card className="border border-emerald-200/60 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-500/5 dark:to-teal-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                                                        <Target className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">POS</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                        {posData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                                        onClick={() => openExpandedPie('pos', 'POS', posData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={posData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {posData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`pos-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={posData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="POS"
                                                                isAvgEventType={mainPanelAvgEventType}
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Source Distribution */}
                            {showSource && (
                                <div>
                                    <Card className="border border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-500/5 dark:to-orange-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                                                        <Zap className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">Source</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                        {sourceData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                                                        onClick={() => openExpandedPie('source', 'Source', sourceData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={sourceData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {sourceData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`source-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={sourceData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="Source"
                                                                isAvgEventType={mainPanelAvgEventType}
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    );
                })()
            }

            {/* Hourly Stats Card - shown below Pie Charts for ≤8 day ranges when enabled */}
            {
                isHourly && graphData.length > 0 && (profile?.panels?.[0] as any)?.filterConfig?.showHourlyStats !== false && !isFirstPanelSpecialGraph && (
                    <div className="mt-6">
                        <HourlyStatsCard graphData={graphData} isHourly={isHourly} eventKeys={eventKeys} events={events} />
                    </div>
                )
            }
        </div>
    );
});
