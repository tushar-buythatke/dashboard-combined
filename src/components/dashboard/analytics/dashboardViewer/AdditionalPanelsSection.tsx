import React, { Fragment, useMemo, useState, useEffect } from 'react';
import { createPortal, unstable_batchedUpdates } from 'react-dom';
import { AiInsightsBadge } from '../components/AiInsightsBadge';
import type { FilterState } from './types';
import { InfoTooltip } from '../components/InfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronUp,
    Clock,
    Filter,
    Hash,
    Layers,
    Maximize2,
    Mic,
    Percent,
    PieChart as PieChartIcon,
    RefreshCw,
    Target,
    TrendingUp,
    Zap,
    X,
    Sparkles,
    CheckCircle2,
    XCircle,
    Info,
    Command,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveButton } from '@/components/ui/interactive-button';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TooltipProvider, Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { format } from 'date-fns';
import { getPOSName } from '@/lib/posMapping';
import { getEventDisplayName } from '@/hooks/useEventName';
import { useIsMobile } from '@/hooks/use-mobile';

import { PLATFORMS, SOURCES } from '@/services/apiService';

import { AnimatedNumber } from './AnimatedNumber';
import { CollapsibleLegend } from './CollapsibleLegend';
import { CustomTooltip } from './CustomTooltip';
import { PieTooltip } from './PieTooltip';
import { ChartExpandedView } from '../components/ChartExpandedView';
import { combinePieChartDuplicates, ERROR_COLORS, EVENT_COLORS, PIE_COLORS, shouldShowPieChart } from './constants';
import { PercentageGraph } from '../charts/PercentageGraph';
import { FunnelGraph } from '../charts/FunnelGraph';
import { UserFlowVisualization } from '../charts/UserFlowVisualization';
import { ChartZoomControls } from '../components/ChartZoomControls';
import { useChartZoom } from '@/hooks/useChartZoom';

import { DayWiseComparisonChart, DailyAverageChart } from '../components/ComparisonCharts';
import { DashboardChatbot } from '../components/DashboardChatbot';
import type { ChatbotContext } from '@/services/chatbotService';

import {
    Area,
    AreaChart,
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

// Professional Pie Tooltip
const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toLocaleString();
};

export const AdditionalPanelsSection = React.memo(function AdditionalPanelsSection({
    profile,
    setProfile,
    panelsDataMap,
    panelFiltersState,
    panelDateRanges,
    panelLoading,
    panelRefs,
    dateRange,
    panelFiltersCollapsed,
    setPanelFiltersCollapsed,
    panelFilterChanges,
    handlePanelRefresh,
    updatePanelDateRange,
    updatePanelFilter,
    events,
    siteDetails,
    panelAvailableStatusCodes,
    panelAvailableCacheStatuses,
    setPanelFiltersState,
    setPanelFilterChanges,
    panelChartType,
    setPanelChartType,
    panelPinnedTooltips,
    setPanelPinnedTooltips,
    panelLegendExpanded,
    togglePanelLegend,
    panelSelectedEventKey,
    handlePanelEventClick,
    panelAvgSelectedEventKey,
    handlePanelAvgEventClick,
    setExpandedChart,
    CustomXAxisTick,
    panelApiPerformanceSeriesMap,
    panelApiMetricView,
    setPanelApiMetricView,
    openExpandedPie,
    isHourly,
    HourlyStatsCard,
    // Single-panel architecture: Render only this panel index
    activePanelIndex,
    hourlyOverride,
    setHourlyOverride,
    panelHourlyOverride,
    setPanelHourlyOverrideForId,
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
}: any) {
    const { t: themeClasses } = useAccentTheme();
    const isMobile = useIsMobile();
    const [eventDistModes, setEventDistModes] = useState<Record<string, 'platform' | 'pos' | 'source'>>({});
    const [jobIdDistModes, setJobIdDistModes] = useState<Record<string, 'platform' | 'pos' | 'source'>>({});
    const [chatbotOpen, setChatbotOpen] = useState<Record<string, boolean>>({});

    // Helper to render external labels for slices > 5%
    // Helper to render external labels for slices > 5%
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 15;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="currentColor"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-[9px] font-bold fill-slate-500 dark:fill-slate-400"
            >
                <tspan x={x} dy="-0.6em">{name}</tspan>
                <tspan x={x} dy="1.2em" className="font-normal opacity-80">{`${Math.floor(value).toLocaleString()} (${(percent * 100).toFixed(2)}%)`}</tspan>
            </text>
        );
    };
    // Zoom state for Event Trends charts in additional panels
    const eventTrendsZoom = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    // Zoom state for Time Delay charts in additional panels
    const timeDelayZoom = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    // Zoom state for Error Event Trends charts in additional panels
    const errorTrendsZoom = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const [voicePopoverOpen, setVoicePopoverOpen] = useState(false);

    // Keyboard shortcuts for Voice AI, Chatbot, and Panel Actions
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+L for Chatbot - toggle and snap to right
            if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
                e.preventDefault();
                e.stopPropagation();
                const currentPanel = profile?.panels?.[activePanelIndex];
                if (currentPanel) {
                    setChatbotOpen(prev => ({
                        ...prev,
                        [currentPanel.panelId]: !prev[currentPanel.panelId]
                    }));
                }
                return;
            }
            // Cmd+K for Voice AI
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const currentPanel = profile?.panels?.[activePanelIndex];
                if (isAdmin && !currentPanel?.filterConfig?.isApiEvent) {
                    setVoicePopoverOpen(prev => {
                        const willOpen = !prev;
                        if (willOpen && !isRecording && toggleRecording) {
                            setTimeout(() => toggleRecording(), 500);
                        }
                        return willOpen;
                    });
                }
            }
            // Cmd+Enter to Refresh
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                const currentPanel = profile?.panels?.[activePanelIndex];
                if (currentPanel && handlePanelRefresh) {
                    handlePanelRefresh(currentPanel.panelId);
                    setFlashMessage("Refreshing Panel...");
                    setRefreshFlash(true);
                    setTimeout(() => setRefreshFlash(false), 800);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Cmd+Shift to toggle Hourly/Daily
            if (e.key === 'Shift' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                const currentPanel = profile?.panels?.[activePanelIndex];
                if (currentPanel && setPanelHourlyOverrideForId) {
                    const pDateRange = panelDateRanges?.[currentPanel.panelId] || dateRange;
                    const isRangeShort = pDateRange ? Math.ceil((pDateRange.to.getTime() - pDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 8 : false;
                    const currentEffective = panelHourlyOverride?.[currentPanel.panelId] ?? (hourlyOverride ?? isRangeShort);

                    const newValue = !currentEffective;

                    unstable_batchedUpdates(() => {
                        setPanelHourlyOverrideForId(currentPanel.panelId, newValue);

                        // Update Date Range based on mode
                        if (updatePanelDateRange) {
                            const now = new Date();
                            const newFrom = new Date(now);
                            if (newValue) { // Switching to Hourly -> Last 7 days
                                newFrom.setDate(now.getDate() - 7);
                            } else { // Switching to Daily -> Last 30 days
                                newFrom.setDate(now.getDate() - 30);
                            }
                            updatePanelDateRange(currentPanel.panelId, newFrom, now);
                        }

                        setFlashMessage(newValue ? "Switched to Hourly (7 Days)" : "Switched to Daily (30 Days)");
                        setRefreshFlash(true);
                        setTimeout(() => setRefreshFlash(false), 2000);
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isAdmin, activePanelIndex, profile, isRecording, toggleRecording, handlePanelRefresh, setPanelHourlyOverrideForId, panelHourlyOverride, panelDateRanges, dateRange, hourlyOverride, updatePanelDateRange]);

    const [refreshFlash, setRefreshFlash] = useState(false);
    const [flashMessage, setFlashMessage] = useState("Refreshing Panel...");


    const eventColors = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => {
            map[String(e.eventId)] = e.color;
        });
        return map;
    }, [events]);

    const eventNames = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => {
            map[String(e.eventId)] = getEventDisplayName(e);
        });
        return map;
    }, [events]);

    if (!profile?.panels || profile.panels.length <= 1) return null;

    const applyApiFiltering = (rawData: any[], panelConfig: any, filters: any, eventKeys: any[], filterType: 'percentage' | 'regular' = 'percentage') => {
        if (!panelConfig?.isApiEvent) return rawData;

        const isAlreadyAggregated = (eventKeys || []).some((ek: any) => {
            const k = ek?.eventKey;
            return typeof k === 'string' && (k.startsWith('status_') || k.startsWith('cache_'));
        });
        if (isAlreadyAggregated) return rawData;

        const statusCodes = (filterType === 'percentage'
            ? (filters.percentageStatusCodes || [])
            : (filters.apiStatusCodes || []))
            .filter(Boolean)
            .map((v: any) => String(v))
            .filter((v: string) => /^\d+$/.test(v));
        const cacheStatuses = (filterType === 'percentage'
            ? (filters.percentageCacheStatus || [])
            : (filters.apiCacheStatus || []))
            .filter(Boolean)
            .map((v: any) => String(v));

        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        if (!hasStatusFilter && !hasCacheFilter) return rawData;

        return rawData.map(record => {
            const filteredRecord = { ...record };

            eventKeys.forEach(eventKeyInfo => {
                const eventKey = eventKeyInfo.eventKey;

                let filteredCount = 0;
                let filteredSuccess = 0;
                let filteredFail = 0;
                let filteredAvgDelay = 0;

                if (hasStatusFilter && hasCacheFilter) {
                    statusCodes.forEach((status: string) => {
                        cacheStatuses.forEach((cache: string) => {
                            const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                            filteredCount += Number(record[`${combinedKey}_count`] || 0);
                            filteredSuccess += Number(record[`${combinedKey}_success`] || 0);
                            filteredFail += Number(record[`${combinedKey}_fail`] || 0);
                            filteredAvgDelay += Number(record[`${combinedKey}_avgDelay`] || 0);
                        });
                    });
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
    };

    return (
        <>
            {/* Fixed Position Refresh Notification Banner - visible when scrolled (Portal) */}
            {refreshFlash && createPortal(
                <div className={cn("fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-gradient-to-r text-white rounded-full shadow-2xl flex items-center gap-2 animate-bounce font-sans antialiased pointer-events-none", themeClasses.buttonGradient)}>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span className="font-bold text-xs tracking-wide">{flashMessage}</span>
                </div>,
                document.body
            )}
            {profile.panels.slice(1).filter((_: any, idx: number) => {
                // SINGLE PANEL ARCHITECTURE: Only render the panel that matches activePanelIndex
                // activePanelIndex 0 = main panel, 1+ = additional panels (so idx 0 in slice = activePanelIndex 1)
                return activePanelIndex === idx + 1;
            }).map((panel: any, panelIndex: number) => {
                const panelData = panelsDataMap.get(panel.panelId);
                const rawPanelGraphData = panelData?.graphData || [];
                const pEventKeys = panelData?.eventKeys || [];
                const pPieData = panelData?.pieChartData;
                const panelConfig = (panel as any)?.filterConfig;
                const currentPanelFilters = panelFiltersState?.[panel.panelId] || panelData?.filters || {
                    events: [],
                    platforms: [],
                    pos: [],
                    sources: [],
                    sourceStrs: panelConfig?.sourceStr || [] // Load saved job IDs from filterConfig
                };

                const currentPanelDateRange = panelDateRanges?.[panel.panelId] || dateRange;

                const isPanelLoading = panelLoading?.[panel.panelId] || false;

                const panelGraphType = panelConfig?.graphType || 'line';

                const filteredGraphData = applyApiFiltering(
                    rawPanelGraphData,
                    panelConfig,
                    currentPanelFilters,
                    pEventKeys,
                    panelGraphType === 'percentage' || panelGraphType === 'funnel' ? 'percentage' : 'regular'
                );

                let pTotalCount = 0;
                let pTotalSuccess = 0;
                let pTotalFail = 0;

                if (panelGraphType !== 'percentage' && panelGraphType !== 'funnel') {
                    pTotalCount = filteredGraphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
                    pTotalSuccess = filteredGraphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
                    pTotalFail = filteredGraphData.reduce((sum: number, d: any) => sum + (d.failCount || 0), 0);
                }

                const isRangeShortEnoughForHourly = Math.ceil((currentPanelDateRange.to.getTime() - currentPanelDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 8;
                // Use per-panel override if available, otherwise fall back to global override (legacy/main) or auto logic
                const pIsHourly = (panelHourlyOverride && panelHourlyOverride[panel.panelId] !== undefined && panelHourlyOverride[panel.panelId] !== null)
                    ? panelHourlyOverride[panel.panelId]
                    : (hourlyOverride !== null ? hourlyOverride : isRangeShortEnoughForHourly);

                return (
                    <div
                        key={panel.panelId}
                        ref={(el) => {
                            if (panelRefs?.current) panelRefs.current[panel.panelId] = el;
                        }}
                        id={`panel-${panel.panelId}`}
                        className="space-y-6 scroll-mt-20"
                    >
                        <div className="relative py-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className={cn("w-full border-t-4 border-dashed", themeClasses.borderAccent, themeClasses.borderAccentDark)} />
                            </div>
                            <div className="relative flex justify-center">
                                <div className={cn("px-6 py-2 bg-gradient-to-r rounded-full shadow-lg", themeClasses.buttonGradient)}>
                                    <span className="text-white font-bold text-sm flex items-center gap-2">
                                        <Layers className="w-5 h-5" />
                                        {panelConfig?.isApiEvent && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/30 backdrop-blur-sm border border-white/50">
                                                API
                                            </span>
                                        )}
                                        Panel {panelIndex + 2}: {panel.panelName}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Card className={cn("rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300 border", themeClasses.featureCardBorder, themeClasses.featureCardBorderDark)}>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", themeClasses.buttonGradient)}>
                                            {panelGraphType === 'bar' ? (
                                                <BarChart3 className="h-6 w-6 text-white" />
                                            ) : (
                                                <TrendingUp className="h-6 w-6 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-foreground">{panel.panelName}</h2>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                {panelConfig?.isApiEvent && (
                                                    <>
                                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r text-white shadow-md", themeClasses.buttonGradient)}>
                                                            API
                                                        </span>
                                                        <span className="text-muted-foreground">•</span>
                                                    </>
                                                )}
                                                <span
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                                        panelGraphType === 'bar'
                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                            : panelGraphType === 'percentage'
                                                                ? "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200"
                                                                : panelGraphType === 'funnel'
                                                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                                                    : panelGraphType === 'user_flow'
                                                                        ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
                                                                        : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                    )}
                                                >
                                                    {panelGraphType === 'bar'
                                                        ? 'Bar Chart'
                                                        : panelGraphType === 'percentage'
                                                            ? 'Percentage Analysis'
                                                            : panelGraphType === 'funnel'
                                                                ? 'Funnel Analysis'
                                                                : panelGraphType === 'user_flow'
                                                                    ? 'User Flow'
                                                                    : 'Line Chart'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                {isPanelLoading ? <Skeleton className="h-4 w-12" /> : formatNumber(pTotalCount)} total
                                            </span>
                                            <InfoTooltip content="Sum of all events recorded for this panel and its filters." />
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                                {isPanelLoading ? <Skeleton className="h-4 w-10" /> : (pTotalCount > 0 ? ((pTotalSuccess / pTotalCount) * 100).toFixed(1) : 0)}% success
                                            </span>
                                            <InfoTooltip content="Percentage of events that completed successfully in this panel." />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {/* Refresh Flash Banner */}
                                {refreshFlash && (
                                    <div className={cn("mb-3 p-2 bg-gradient-to-r rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 animate-pulse shadow-lg", themeClasses.buttonGradient)}>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        {flashMessage}
                                    </div>
                                )}
                                <div className={cn("p-3 sm:p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border shadow-sm mb-6", themeClasses.borderAccent, themeClasses.borderAccentDark)}>
                                    <div className={cn(
                                        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 p-2 rounded-xl transition-all duration-300",
                                        panelFiltersCollapsed?.[panel.panelId] !== false
                                            ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                                            : "border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                                    )}>
                                        {/* Clickable Filter Toggle Left Section */}
                                        <div
                                            className="flex items-center gap-3 cursor-pointer flex-1"
                                            onClick={() =>
                                                setPanelFiltersCollapsed?.((prev: any) => ({
                                                    ...prev,
                                                    [panel.panelId]: !prev?.[panel.panelId]
                                                }))
                                            }
                                        >
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                                                panelFiltersCollapsed?.[panel.panelId] !== false
                                                    ? "bg-slate-200 dark:bg-slate-700"
                                                    : cn("bg-gradient-to-br", themeClasses.buttonGradient)
                                            )}>
                                                <Filter className={cn(
                                                    "w-5 h-5",
                                                    panelFiltersCollapsed?.[panel.panelId] !== false ? "text-slate-500" : "text-white"
                                                )} />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        panelFiltersCollapsed?.[panel.panelId] !== false ? "text-slate-700 dark:text-slate-300" : cn(themeClasses.sidebarActiveText, themeClasses.sidebarActiveTextDark)
                                                    )}>
                                                        Panel Filters
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                                        Independent
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground">Click to {panelFiltersCollapsed?.[panel.panelId] !== false ? 'expand' : 'collapse'}</span>
                                                    {panelFiltersCollapsed?.[panel.panelId] !== false ? (
                                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronUp className="h-4 w-4 text-current" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side Actions */}
                                        <div className="flex items-center gap-3 justify-end flex-wrap">
                                            {/* Voice AI Button - Admin Only & Non-API Only */}
                                            {isAdmin && !panelConfig?.isApiEvent && (
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
                                                                            "h-9 gap-2 px-3 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-300 shadow-sm relative overflow-hidden group/mic ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg",
                                                                            isRecording && "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-md shadow-red-500/20"
                                                                        )}
                                                                    >
                                                                        {isRecording ? (
                                                                            <>
                                                                                <span className="absolute inset-0 bg-red-500/10 animate-pulse" />
                                                                                <div className="relative flex items-center gap-1.5">
                                                                                    <div className="flex gap-0.5 items-center h-4">
                                                                                        <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0ms]" style={{ height: '40%' }} />
                                                                                        <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_100ms]" style={{ height: '70%' }} />
                                                                                        <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_200ms]" style={{ height: '100%' }} />
                                                                                        <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_300ms]" style={{ height: '70%' }} />
                                                                                        <div className="w-1 bg-red-500 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_400ms]" style={{ height: '40%' }} />
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
                                                                        {voiceStatus === 'parsing' && <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />}
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
                                                                        size="sm"
                                                                        disabled={!manualTranscript.trim() || isParsingVoice || isRecording}
                                                                        onClick={() => handleVoiceTranscript(manualTranscript)}
                                                                        className={cn("flex-1 gap-2 bg-gradient-to-r rounded-xl font-bold text-white shadow-lg", themeClasses.buttonGradient, themeClasses.buttonHover)}
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
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 shadow-sm">⌘K</span>
                                                </div>
                                            )}
                                            {/* Chatbot Button */}
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setChatbotOpen(prev => ({
                                                            ...prev,
                                                            [panel.panelId]: !prev[panel.panelId]
                                                        }));
                                                        // Position will be set to right side in chatbot component
                                                    }}
                                                    className={cn(
                                                        "h-8 gap-2 px-3 border-indigo-200 dark:border-indigo-800 bg-white/60 dark:bg-slate-900/40 text-indigo-700 dark:text-indigo-300",
                                                        "hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-200",
                                                        "transition-all duration-300 shadow-sm relative overflow-hidden group/chat ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
                                                    )}
                                                >
                                                    <Sparkles className="h-4 w-4 text-indigo-500 group-hover/chat:scale-110 transition-transform" />
                                                    <span>AI Chat</span>
                                                </Button>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 shadow-sm">⌘L</span>
                                            </div>
                                            {/* Refresh Button - Updated to match Main Panel & Purple Flash */}
                                            <div className="flex flex-col items-center gap-0.5">
                                                <InteractiveButton
                                                    onClick={() => {
                                                        setFlashMessage("Refreshing Panel...");
                                                        setRefreshFlash(true);
                                                        setTimeout(() => setRefreshFlash(false), 2000);
                                                        handlePanelRefresh?.(panel.panelId);
                                                    }}
                                                    disabled={isPanelLoading}
                                                    size="sm"
                                                    className={cn(
                                                        "relative transition-all duration-300 shadow-md font-semibold min-h-[36px] px-4 rounded-lg",
                                                        panelFilterChanges?.[panel.panelId]
                                                            ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/40 border border-red-300"
                                                            : cn("bg-gradient-to-r text-white", themeClasses.buttonGradient, themeClasses.buttonHover),
                                                        refreshFlash && cn("ring-4 ring-opacity-75", themeClasses.ringAccent)
                                                    )}
                                                    loading={isPanelLoading}
                                                >
                                                    {/* Flash overlay */}
                                                    {refreshFlash && (
                                                        <span className={cn("absolute inset-0 animate-ping rounded-lg opacity-30 bg-gradient-to-r", themeClasses.buttonGradient)} />
                                                    )}
                                                    <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isPanelLoading && "animate-spin")} />
                                                    <span className="text-xs">{panelFilterChanges?.[panel.panelId] ? "APPLY" : "Refresh"}</span>
                                                    {panelFilterChanges?.[panel.panelId] && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm border border-red-100">
                                                            !
                                                        </div>
                                                    )}
                                                </InteractiveButton>
                                                <div className={cn("hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border shadow-sm", "bg-gradient-to-r", themeClasses.buttonGradient, "border-transparent")}>
                                                    <span className="text-[9px] font-bold text-white drop-shadow-sm">⌘+Enter</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show filters only if explicitly NOT collapsed (false means expanded now) */}
                                    {panelFiltersCollapsed?.[panel.panelId] === false && (
                                        <>
                                            <div className="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="text-xs font-medium text-muted-foreground">Filter Configuration</div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                                                            <Command className="h-3 w-3" />
                                                            <span className="font-medium">L</span>
                                                        </span>
                                                        <span>for AI Chat</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <CalendarIcon className={cn("w-4 h-4 flex-shrink-0", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                                                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "flex-1 sm:flex-initial justify-start text-left font-normal min-h-[44px]",
                                                                        !currentPanelDateRange.from && "text-muted-foreground",
                                                                        themeClasses.badgeBg,
                                                                        themeClasses.badgeBgDark,
                                                                        themeClasses.borderAccent,
                                                                        themeClasses.borderAccentDark,
                                                                        "hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className={cn("mr-2 h-4 w-4 flex-shrink-0", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                                                                    {currentPanelDateRange.from ? (
                                                                        format(currentPanelDateRange.from, "dd/MM/yyyy")
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-950" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={currentPanelDateRange.from}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            updatePanelDateRange?.(panel.panelId, date, currentPanelDateRange.to);
                                                                        }
                                                                    }}
                                                                    initialFocus
                                                                    classNames={{
                                                                        day_selected: cn("!bg-gradient-to-r text-white hover:!bg-gradient-to-r hover:text-white focus:!bg-gradient-to-r focus:text-white", themeClasses.buttonGradient),
                                                                        day_today: cn("bg-accent text-accent-foreground", themeClasses.badgeBg, themeClasses.badgeBgDark),
                                                                        day_range_start: cn("!bg-gradient-to-r text-white", themeClasses.buttonGradient),
                                                                        day_range_end: cn("!bg-gradient-to-r text-white", themeClasses.buttonGradient),
                                                                    }}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <span className="text-gray-500 text-sm">to</span>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "flex-1 sm:flex-initial justify-start text-left font-normal min-h-[44px]",
                                                                        !currentPanelDateRange.to && "text-muted-foreground",
                                                                        themeClasses.badgeBg,
                                                                        themeClasses.badgeBgDark,
                                                                        "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className={cn("mr-2 h-4 w-4 flex-shrink-0", themeClasses.textPrimary, themeClasses.textPrimaryDark)} />
                                                                    {currentPanelDateRange.to ? (
                                                                        format(currentPanelDateRange.to, "dd/MM/yyyy")
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-950" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={currentPanelDateRange.to}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            updatePanelDateRange?.(panel.panelId, currentPanelDateRange.from, date);
                                                                        }
                                                                    }}
                                                                    initialFocus
                                                                    classNames={{
                                                                        day_selected: cn("!bg-gradient-to-r text-white hover:!bg-gradient-to-r hover:text-white focus:!bg-gradient-to-r focus:text-white", themeClasses.buttonGradient),
                                                                        day_today: cn("bg-accent text-accent-foreground", themeClasses.badgeBg, themeClasses.badgeBgDark),
                                                                        day_range_start: cn("!bg-gradient-to-r text-white", themeClasses.buttonGradient),
                                                                        day_range_end: cn("!bg-gradient-to-r text-white", themeClasses.buttonGradient),
                                                                    }}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground font-medium">Showing:</span>
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                                            {isPanelLoading && (
                                                                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                                    <RefreshCw className="h-3 w-3 animate-spin text-gray-700" />
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, true)}
                                                                disabled={isPanelLoading}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
                                                                    isPanelLoading && "opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                Hourly
                                                            </button>
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, false)}
                                                                disabled={isPanelLoading}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    !pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
                                                                    isPanelLoading && "opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                Daily
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>



                                            {panelGraphType === 'percentage' && panelConfig?.percentageConfig ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/30 rounded-lg border-2 border-gray-300 dark:border-gray-500/30">
                                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                                            <Percent className="h-4 w-4" />
                                                            Percentage Graph - Event Selection
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                        Parent Events (Denominator)
                                                                    </label>
                                                                </div>
                                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-gray-100 dark:border-gray-700/40 shadow-sm">
                                                                    <MultiSelectDropdown
                                                                        options={(events || [])
                                                                            .filter((e: any) => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                            .map((e: any) => ({
                                                                                value: String(e.eventId),
                                                                                label: getEventDisplayName(e),
                                                                                color: e.color
                                                                            }))}
                                                                        selected={currentPanelFilters.activePercentageEvents || panelConfig.percentageConfig.parentEvents}
                                                                        onChange={(selected) => {
                                                                            setPanelFiltersState?.((prev: any) => ({
                                                                                ...prev,
                                                                                [panel.panelId]: {
                                                                                    ...prev?.[panel.panelId],
                                                                                    activePercentageEvents: selected
                                                                                }
                                                                            }));
                                                                            setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                        }}
                                                                        placeholder="Select Parent Events"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                        Child Events (Numerator)
                                                                    </label>
                                                                </div>
                                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-100 dark:border-green-900/30 shadow-sm">
                                                                    <MultiSelectDropdown
                                                                        options={(events || [])
                                                                            .filter((e: any) => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                            .map((e: any) => ({
                                                                                value: String(e.eventId),
                                                                                label: getEventDisplayName(e),
                                                                                color: e.color
                                                                            }))}
                                                                        selected={currentPanelFilters.activePercentageChildEvents || panelConfig.percentageConfig.childEvents}
                                                                        onChange={(selected) => {
                                                                            setPanelFiltersState?.((prev: any) => ({
                                                                                ...prev,
                                                                                [panel.panelId]: {
                                                                                    ...prev?.[panel.panelId],
                                                                                    activePercentageChildEvents: selected
                                                                                }
                                                                            }));
                                                                            setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                        }}
                                                                        placeholder="Select Child Events"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3 px-1">
                                                            <div className="text-xs text-muted-foreground">
                                                                Formula: (Child Count / Parent Count) × 100
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`percentage-show-events-${panel.panelId}`}
                                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-gray-700 focus:ring-gray-400 cursor-pointer"
                                                                    checked={currentPanelFilters.showEventPieCharts ?? false}
                                                                    onChange={(e) => {
                                                                        setPanelFiltersState?.((prev: any) => ({
                                                                            ...prev,
                                                                            [panel.panelId]: { ...prev?.[panel.panelId], showEventPieCharts: e.target.checked }
                                                                        }));
                                                                        setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                    }}
                                                                />
                                                                <label htmlFor={`percentage-show-events-${panel.panelId}`} className="text-[10px] font-bold text-gray-800 dark:text-gray-200 cursor-pointer uppercase tracking-wider">
                                                                    Events Analysis
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {panelConfig?.isApiEvent ? (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-500/20">
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-semibold text-gray-700 dark:text-gray-400">API Events:</span> Data grouped by status codes and cache status
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/30">
                                                                <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                                                    <Activity className="h-4 w-4" />
                                                                    API Filters (Status & Cache)
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status Codes</label>
                                                                        {(() => {
                                                                            const panelStatusCodes = (panelAvailableStatusCodes?.[panel.panelId] || []).slice();
                                                                            const codes2xx = panelStatusCodes.filter((c: string) => c.startsWith('2'));
                                                                            const codes3xx = panelStatusCodes.filter((c: string) => c.startsWith('3'));
                                                                            const codes4xx = panelStatusCodes.filter((c: string) => c.startsWith('4'));
                                                                            const codes5xx = panelStatusCodes.filter((c: string) => c.startsWith('5'));
                                                                            const codesOther = panelStatusCodes.filter((c: string) => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5'));

                                                                            const groupedOptions: Array<{ label: string; value: string }> = [];
                                                                            codes2xx.forEach((c: string) => groupedOptions.push({ label: c, value: c }));
                                                                            codes3xx.forEach((c: string) => groupedOptions.push({ label: c, value: c }));
                                                                            if (codes4xx.length > 0) groupedOptions.push({ label: `4xx Group (${codes4xx.join(', ')})`, value: '4xx_group' });
                                                                            if (codes5xx.length > 0) groupedOptions.push({ label: `5xx Group (${codes5xx.join(', ')})`, value: '5xx_group' });
                                                                            codesOther.forEach((c: string) => groupedOptions.push({ label: c, value: c }));

                                                                            return (
                                                                                <MultiSelectDropdown
                                                                                    options={groupedOptions}
                                                                                    selected={(() => {
                                                                                        const panelSelected = currentPanelFilters.percentageStatusCodes || [];
                                                                                        const s = new Set<string>(panelSelected);
                                                                                        if (codes4xx.length > 0 && codes4xx.every((c: string) => s.has(c))) s.add('4xx_group');
                                                                                        if (codes5xx.length > 0 && codes5xx.every((c: string) => s.has(c))) s.add('5xx_group');
                                                                                        return Array.from(s);
                                                                                    })()}
                                                                                    onChange={(values) => {
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
                                                                                        const defaultStatus = panelStatusCodes.includes('200') ? ['200'] : panelStatusCodes;
                                                                                        const nextValues = uniqueValues.length === 0 ? [...defaultStatus] : uniqueValues;
                                                                                        setPanelFiltersState?.((prev: any) => ({
                                                                                            ...prev,
                                                                                            [panel.panelId]: {
                                                                                                ...prev?.[panel.panelId],
                                                                                                percentageStatusCodes: nextValues
                                                                                            }
                                                                                        }));
                                                                                        setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                    }}
                                                                                    placeholder={panelStatusCodes.length > 0 ? "Select status codes" : "Loading..."}
                                                                                    disabled={panelStatusCodes.length === 0}
                                                                                />
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                                        <MultiSelectDropdown
                                                                            options={(panelAvailableCacheStatuses?.[panel.panelId] || []).map((cache: string) => ({ label: cache, value: cache }))}
                                                                            selected={currentPanelFilters.percentageCacheStatus || []}
                                                                            onChange={(values) => {
                                                                                const availableCache = panelAvailableCacheStatuses?.[panel.panelId] || [];
                                                                                const defaultCache = availableCache.length > 0 ? [...availableCache] : [];
                                                                                const nextValues = values.length === 0 ? [...defaultCache] : Array.from(new Set(values));
                                                                                setPanelFiltersState?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        ...prev?.[panel.panelId],
                                                                                        percentageCacheStatus: nextValues
                                                                                    }
                                                                                }));
                                                                                setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                            }}
                                                                            placeholder={(panelAvailableCacheStatuses?.[panel.panelId] || []).length > 0 ? "Select cache statuses" : "Loading..."}
                                                                            disabled={(panelAvailableCacheStatuses?.[panel.panelId] || []).length === 0}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={`grid gap-4 mt-4 p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-700/30 ${!panelConfig?.isApiEvent ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Platforms</label>
                                                                    <MultiSelectDropdown
                                                                        options={PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name }))}
                                                                        selected={(currentPanelFilters.platforms || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'platforms', numericValues);
                                                                        }}
                                                                        placeholder="Select platforms"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">POS</label>
                                                                    <MultiSelectDropdown
                                                                        options={(siteDetails || []).map((s: any) => ({ value: s.id.toString(), label: `${s.name} (${s.id})` }))}
                                                                        selected={(currentPanelFilters.pos || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'pos', numericValues);
                                                                        }}
                                                                        placeholder="All"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Sources</label>
                                                                    <MultiSelectDropdown
                                                                        options={SOURCES.map(s => ({ value: s.id.toString(), label: s.name }))}
                                                                        selected={(currentPanelFilters.sources || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'sources', numericValues);
                                                                        }}
                                                                        placeholder="All"
                                                                    />
                                                                </div>
                                                                {/* SourceStr (Job ID) Filter - Always visible for NON-API events */}
                                                                {(() => {
                                                                    console.log(`🔍 Panel ${panel.panelId} - isApiEvent:`, panelConfig?.isApiEvent, 'panelConfig:', panelConfig);
                                                                    const shouldShow = !panelConfig?.isApiEvent;
                                                                    console.log(`🔍 Should show Job IDs filter:`, shouldShow);

                                                                    if (!shouldShow) return null;

                                                                    return (
                                                                        <div className="space-y-2">
                                                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Job IDs</label>
                                                                            <MultiSelectDropdown
                                                                                options={(() => {
                                                                                    const rawData = panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || [];
                                                                                    const savedJobIds = panelConfig?.sourceStr || [];
                                                                                    const fromData = rawData.length > 0 && rawData.some((d: any) => d.sourceStr)
                                                                                        ? Array.from(new Set(rawData.map((d: any) => d.sourceStr).filter(Boolean))).sort()
                                                                                        : [];
                                                                                    const fromConfig = savedJobIds || [];
                                                                                    const availableJobIds = Array.from(new Set([...fromData, ...fromConfig])).sort();
                                                                                    console.log(`🔍 Panel ${panel.panelId} - Available Job IDs:`, availableJobIds);
                                                                                    return availableJobIds.map((s: any) => ({ value: s.toString(), label: s.toString() }));
                                                                                })()}
                                                                                selected={(currentPanelFilters.sourceStrs || []).map((s: any) => s.toString())}
                                                                                onChange={(values) => {
                                                                                    setPanelFiltersState?.((prev: any) => ({
                                                                                        ...prev,
                                                                                        [panel.panelId]: { ...prev?.[panel.panelId], sourceStrs: values }
                                                                                    }));
                                                                                    setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                }}
                                                                                placeholder="All Job IDs"
                                                                            />
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : panelGraphType === 'funnel' && panelConfig?.funnelConfig ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-lg border-2 border-blue-300 dark:border-blue-500/30">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Filter className="h-4 w-4 text-blue-500" />
                                                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Funnel Graph Configuration</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                                            Define conversion stages: e1 (parent) → e2 → e3 → ... → last (multiple children)
                                                        </p>

                                                        <div className="space-y-3">
                                                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                                Funnel Stages
                                                            </label>
                                                            {(() => {
                                                                const defaultStageIds = panelConfig.funnelConfig.stages.map((s: any) => s.eventId);
                                                                const activeStageIds = (currentPanelFilters.activeStages && currentPanelFilters.activeStages.length > 0)
                                                                    ? currentPanelFilters.activeStages
                                                                    : defaultStageIds;

                                                                return (activeStageIds.length > 0 ? activeStageIds : defaultStageIds).map((currentId: string, idx: number) => {
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
                                                                                    setPanelFiltersState?.((prev: any) => ({
                                                                                        ...prev,
                                                                                        [panel.panelId]: {
                                                                                            ...prev?.[panel.panelId],
                                                                                            activeStages: base
                                                                                        }
                                                                                    }));
                                                                                    setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                }}
                                                                            >
                                                                                <option value="">Select event</option>
                                                                                {(events || [])
                                                                                    .filter((ev: any) => panelConfig?.isApiEvent ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                                    .map((ev: any) => (
                                                                                        <option key={ev.eventId} value={ev.eventId}>
                                                                                            {getEventDisplayName(ev)}
                                                                                        </option>
                                                                                    ))}
                                                                            </select>
                                                                            <button
                                                                                type="button"
                                                                                className="text-[11px] text-red-500 hover:text-red-700 px-1 disabled:opacity-40"
                                                                                disabled={(activeStageIds.length || defaultStageIds.length) <= 1}
                                                                                onClick={() => {
                                                                                    const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                                    const next = base.filter((_: any, i: number) => i !== idx);
                                                                                    setPanelFiltersState?.((prev: any) => ({
                                                                                        ...prev,
                                                                                        [panel.panelId]: {
                                                                                            ...prev?.[panel.panelId],
                                                                                            activeStages: next
                                                                                        }
                                                                                    }));
                                                                                    setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                }}
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                                                                    onClick={() => {
                                                                        const defaultStageIds = panelConfig.funnelConfig.stages.map((s: any) => s.eventId);
                                                                        const activeStageIds = (currentPanelFilters.activeStages && currentPanelFilters.activeStages.length > 0)
                                                                            ? currentPanelFilters.activeStages
                                                                            : defaultStageIds;
                                                                        const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                        const next = [...base, ''];
                                                                        setPanelFiltersState?.((prev: any) => ({
                                                                            ...prev,
                                                                            [panel.panelId]: {
                                                                                ...prev?.[panel.panelId],
                                                                                activeStages: next
                                                                            }
                                                                        }));
                                                                        setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                    }}
                                                                >
                                                                    + Add Stage
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {panelConfig.funnelConfig.multipleChildEvents && panelConfig.funnelConfig.multipleChildEvents.length > 0 && (
                                                            <div className="mt-4 space-y-2">
                                                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                                    Final Stage (Multiple Events)
                                                                </label>
                                                                <MultiSelectDropdown
                                                                    options={(events || [])
                                                                        .filter((ev: any) => panelConfig?.isApiEvent ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                        .map((ev: any) => ({
                                                                            value: String(ev.eventId),
                                                                            label: getEventDisplayName(ev)
                                                                        }))}
                                                                    selected={currentPanelFilters.activeFunnelChildEvents || panelConfig.funnelConfig.multipleChildEvents}
                                                                    onChange={(values) => {
                                                                        setPanelFiltersState?.((prev: any) => ({
                                                                            ...prev,
                                                                            [panel.panelId]: {
                                                                                ...prev?.[panel.panelId],
                                                                                activeFunnelChildEvents: values
                                                                            }
                                                                        }));
                                                                        setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                    }}
                                                                    placeholder="Select final stage events"
                                                                />
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                    These events will be shown with different colors in the final bar
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {panelConfig?.isApiEvent ? (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-500/20">
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-semibold text-gray-700 dark:text-gray-400">API Events:</span> Data grouped by status codes and cache status
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/30">
                                                                <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                                                    <Activity className="h-4 w-4" />
                                                                    API Filters (Status & Cache)
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status Codes</label>
                                                                        <MultiSelectDropdown
                                                                            options={(panelAvailableStatusCodes?.[panel.panelId] || []).map((code: string) => ({ label: code, value: code }))}
                                                                            selected={currentPanelFilters.percentageStatusCodes || []}
                                                                            onChange={(values) => {
                                                                                setPanelFiltersState?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        ...prev?.[panel.panelId],
                                                                                        percentageStatusCodes: values
                                                                                    }
                                                                                }));
                                                                                setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                            }}
                                                                            placeholder={(panelAvailableStatusCodes?.[panel.panelId] || []).length > 0 ? "Select status codes" : "Loading..."}
                                                                            disabled={(panelAvailableStatusCodes?.[panel.panelId] || []).length === 0}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                                        <MultiSelectDropdown
                                                                            options={(panelAvailableCacheStatuses?.[panel.panelId] || []).map((cache: string) => ({ label: cache, value: cache }))}
                                                                            selected={currentPanelFilters.percentageCacheStatus || []}
                                                                            onChange={(values) => {
                                                                                setPanelFiltersState?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        ...prev?.[panel.panelId],
                                                                                        percentageCacheStatus: values
                                                                                    }
                                                                                }));
                                                                                setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                            }}
                                                                            placeholder={(panelAvailableCacheStatuses?.[panel.panelId] || []).length > 0 ? "Select cache statuses" : "Loading..."}
                                                                            disabled={(panelAvailableCacheStatuses?.[panel.panelId] || []).length === 0}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-700/30">
                                                            <div className="space-y-2">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Platforms</label>
                                                                <MultiSelectDropdown
                                                                    options={PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name }))}
                                                                    selected={(currentPanelFilters.platforms || []).map((id: any) => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter?.(panel.panelId, 'platforms', numericValues);
                                                                    }}
                                                                    placeholder="All"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">POS</label>
                                                                <MultiSelectDropdown
                                                                    options={(siteDetails || []).map((s: any) => ({ value: s.id.toString(), label: `${s.name} (${s.id})` }))}
                                                                    selected={(currentPanelFilters.pos || []).map((id: any) => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter?.(panel.panelId, 'pos', numericValues);
                                                                    }}
                                                                    placeholder="All"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Sources</label>
                                                                <MultiSelectDropdown
                                                                    options={SOURCES.map(s => ({ value: s.id.toString(), label: s.name }))}
                                                                    selected={(currentPanelFilters.sources || []).map((id: any) => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter?.(panel.panelId, 'sources', numericValues);
                                                                    }}
                                                                    placeholder="All"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Regular Graph Filters */
                                                <>
                                                    <div
                                                        className={cn(
                                                            "grid gap-3 sm:gap-4",
                                                            panelConfig?.isApiEvent
                                                                ? "grid-cols-1"
                                                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                                                        )}
                                                    >
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                                                {panelConfig?.isApiEvent ? 'API Events (Host / URL)' : 'Events'}
                                                            </label>
                                                            <MultiSelectDropdown
                                                                options={events
                                                                    .filter((e: any) => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                    .map((e: any) => {
                                                                        let label = getEventDisplayName(e);
                                                                        const tags: string[] = [];
                                                                        if (e.isErrorEvent === 1) tags.push('[isError]');
                                                                        if (e.isAvgEvent === 1) tags.push('[isAvg]');
                                                                        if (tags.length > 0) label = `${e.eventName} ${tags.join(' ')}`;
                                                                        return {
                                                                            value: e.eventId,
                                                                            label,
                                                                            isErrorEvent: e.isErrorEvent === 1,
                                                                            isAvgEvent: e.isAvgEvent === 1
                                                                        };
                                                                    })}
                                                                selected={(currentPanelFilters.events || []).map((id: any) => id.toString())}
                                                                onChange={(values) => {
                                                                    const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                    updatePanelFilter?.(panel.panelId, 'events', numericValues);
                                                                }}
                                                                placeholder={panelConfig?.isApiEvent ? "Select API events" : "Select events"}
                                                                disabled={panelGraphType === 'user_flow'}
                                                            />
                                                            {panelGraphType === 'user_flow' && (
                                                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                                    Events configured in flow stages below
                                                                </p>
                                                            )}
                                                            {panelConfig?.isApiEvent && (currentPanelFilters.events || []).length > 0 && (() => {
                                                                const selectedEvent = (events || []).find((e: any) => e.eventId === currentPanelFilters.events[0]?.toString());
                                                                return selectedEvent?.callUrl ? (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Call URL:{' '}
                                                                        <code className="px-1 bg-gray-100 dark:bg-gray-800/50 rounded">{selectedEvent.callUrl}</code>
                                                                    </p>
                                                                ) : null;
                                                            })()}
                                                        </div>

                                                        {!panelConfig?.isApiEvent && (
                                                            <>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</label>
                                                                    <MultiSelectDropdown
                                                                        options={PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name }))}
                                                                        selected={(currentPanelFilters.platforms || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'platforms', numericValues);
                                                                        }}
                                                                        placeholder="Select platforms"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</label>
                                                                    <MultiSelectDropdown
                                                                        options={(siteDetails || []).map((s: any) => ({ value: s.id.toString(), label: `${s.name} (${s.id})` }))}
                                                                        selected={(currentPanelFilters.pos || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'pos', numericValues);
                                                                        }}
                                                                        placeholder="Select POS"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</label>
                                                                    <MultiSelectDropdown
                                                                        options={SOURCES.map(s => ({ value: s.id.toString(), label: s.name }))}
                                                                        selected={(currentPanelFilters.sources || []).map((id: any) => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter?.(panel.panelId, 'sources', numericValues);
                                                                        }}
                                                                        placeholder="Select sources"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {panelConfig?.isApiEvent && (() => {
                                                        const rawData = panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || [];
                                                        const statusSet = new Set<string>();
                                                        const cacheSet = new Set<string>();

                                                        rawData.forEach((record: any) => {
                                                            if (record.status !== undefined && record.status !== null) {
                                                                statusSet.add(String(record.status));
                                                            }
                                                            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                                                cacheSet.add(record.cacheStatus);
                                                            }
                                                            Object.keys(record).forEach(key => {
                                                                const statusMatch = key.match(/_status_(\d+)_/);
                                                                const cacheMatch = key.match(/_cache_([^_]+)_/);
                                                                if (statusMatch) statusSet.add(statusMatch[1]);
                                                                if (cacheMatch) cacheSet.add(cacheMatch[1]);
                                                            });
                                                        });

                                                        const availableStatus = Array.from(statusSet).sort((a, b) => parseInt(a) - parseInt(b));
                                                        const availableCache = Array.from(cacheSet).sort();

                                                        if (!currentPanelFilters.apiStatusCodes && availableStatus.length > 0) {
                                                            const defaultStatus = availableStatus.includes('200') ? ['200'] : availableStatus;
                                                            setPanelFiltersState?.((prev: any) => ({
                                                                ...prev,
                                                                [panel.panelId]: {
                                                                    ...prev?.[panel.panelId],
                                                                    apiStatusCodes: defaultStatus
                                                                }
                                                            }));
                                                        }
                                                        if (!currentPanelFilters.apiCacheStatus && availableCache.length > 0) {
                                                            setPanelFiltersState?.((prev: any) => ({
                                                                ...prev,
                                                                [panel.panelId]: {
                                                                    ...prev?.[panel.panelId],
                                                                    apiCacheStatus: availableCache
                                                                }
                                                            }));
                                                        }

                                                        const activeStatus = currentPanelFilters.apiStatusCodes || availableStatus;
                                                        const activeCache = currentPanelFilters.apiCacheStatus || availableCache;

                                                        return (
                                                            <div className="mt-3 space-y-3">
                                                                <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-200 dark:border-gray-500/20">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        <span className="font-semibold text-gray-700 dark:text-gray-400">API Events:</span>{' '}
                                                                        Data grouped by <code className="px-1 bg-white dark:bg-gray-800 rounded">status</code> codes and{' '}
                                                                        <code className="px-1 bg-white dark:bg-gray-800 rounded">cacheStatus</code>.
                                                                    </p>
                                                                </div>
                                                                {(availableStatus.length > 0 || availableCache.length > 0) && (
                                                                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/30">
                                                                        <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                                                            <Activity className="h-4 w-4" />
                                                                            API Filters (Status & Cache)
                                                                        </h4>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            {availableStatus.length > 0 && (
                                                                                <div className="space-y-1.5">
                                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status Codes</label>
                                                                                    <MultiSelectDropdown
                                                                                        options={availableStatus.map(code => ({ label: code, value: code }))}
                                                                                        selected={activeStatus}
                                                                                        onChange={(values) => {
                                                                                            setPanelFiltersState?.((prev: any) => ({
                                                                                                ...prev,
                                                                                                [panel.panelId]: {
                                                                                                    ...prev?.[panel.panelId],
                                                                                                    apiStatusCodes: values
                                                                                                }
                                                                                            }));
                                                                                            setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                        }}
                                                                                        placeholder="Select status codes"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            {availableCache.length > 0 && (
                                                                                <div className="space-y-1.5">
                                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                                                    <MultiSelectDropdown
                                                                                        options={availableCache.map(cache => ({ label: cache, value: cache }))}
                                                                                        selected={activeCache}
                                                                                        onChange={(values) => {
                                                                                            setPanelFiltersState?.((prev: any) => ({
                                                                                                ...prev,
                                                                                                [panel.panelId]: {
                                                                                                    ...prev?.[panel.panelId],
                                                                                                    apiCacheStatus: values
                                                                                                }
                                                                                            }));
                                                                                            setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                                        }}
                                                                                        placeholder="Select cache status"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                                <Card className="relative bg-white/95 dark:bg-gray-900/95 rounded-xl border-blue-200/60 dark:border-blue-500/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            <AnimatedNumber value={pTotalCount} />
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">Total</div>
                                    </CardContent>
                                </Card>
                                <Card className="relative bg-white/95 dark:bg-gray-900/95 rounded-xl border-green-200/60 dark:border-green-500/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-400" />
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            <AnimatedNumber value={pTotalSuccess} />
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">Success</div>
                                    </CardContent>
                                </Card>
                                <Card className="relative bg-white/95 dark:bg-gray-900/95 rounded-xl border-red-200/60 dark:border-red-500/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400" />
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            <AnimatedNumber value={pTotalFail} />
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">Failed</div>
                                    </CardContent>
                                </Card>
                                <Card className="relative bg-white/95 dark:bg-gray-900/95 rounded-xl border-gray-200/60 dark:border-gray-600/40 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 via-slate-500 to-gray-600" />
                                    <CardContent className="pt-4 pb-4">
                                        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                                            {pTotalCount > 0 ? ((pTotalSuccess / pTotalCount) * 100).toFixed(1) : 0}%
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {(() => {
                            if (panelGraphType === 'percentage' && panelConfig?.percentageConfig) {
                                const activeParentEvents = panelConfig.percentageConfig.parentEvents?.filter((id: string) =>
                                    !currentPanelFilters.activePercentageEvents || currentPanelFilters.activePercentageEvents.includes(id)
                                ) || [];

                                const activeChildEvents = panelConfig.percentageConfig.childEvents?.filter((id: string) =>
                                    !currentPanelFilters.activePercentageChildEvents || currentPanelFilters.activePercentageChildEvents.includes(id)
                                ) || [];

                                const mergedFilters = {
                                    ...(panelConfig.percentageConfig.filters || {}),
                                    statusCodes: currentPanelFilters.percentageStatusCodes || panelConfig.percentageConfig.filters?.statusCodes || [],
                                    cacheStatus: currentPanelFilters.percentageCacheStatus || panelConfig.percentageConfig.filters?.cacheStatus || [],
                                };

                                const panelApiSeries = panelApiPerformanceSeriesMap?.[panel.panelId] || [];
                                const panelMetricView = panelApiMetricView?.[panel.panelId] || 'timing';

                                // Build event key info - if special graph (percentage/funnel), use status/cache keys
                                const isSpecialGraph = true; // Inside percentage block
                                const apiEventKeyInfos = (() => {
                                    // First, try to extract keys from panelApiSeries data if available
                                    // This is the most reliable method as it uses actual data keys
                                    if (panelApiSeries.length > 0) {
                                        const dataKeys = new Set<string>();
                                        const firstRecord = panelApiSeries[0];

                                        // Extract unique event keys from data keys (format: eventKey_metric)
                                        Object.keys(firstRecord).forEach(key => {
                                            if (key === 'date' || key === 'timestamp') return;
                                            // Extract base event key by removing metric suffix
                                            const match = key.match(/^(.+)_(count|avgServerToUser|avgServerToCloud|avgCloudToUser|avgBytesOut|avgBytesIn|success|fail|sumCount)$/);
                                            if (match) {
                                                dataKeys.add(match[1]);
                                            }
                                        });

                                        if (dataKeys.size > 0) {
                                            return Array.from(dataKeys).map(eventKey => {
                                                // Try to find event config for nicer display name
                                                const eventIdMatch = eventKey.match(/_(\d+)$/);
                                                const eventId = eventIdMatch ? eventIdMatch[1] : eventKey;
                                                const ev = (events || []).find((e: any) => String(e.eventId) === eventId);
                                                const displayName = ev?.isApiEvent && ev?.host && ev?.url
                                                    ? `${ev.host} - ${ev.url}`
                                                    : (ev?.eventName || eventKey.replace(/_/g, ' '));

                                                return {
                                                    eventId,
                                                    eventName: displayName,
                                                    eventKey: eventKey,
                                                    isErrorEvent: 0,
                                                    isAvgEvent: 0
                                                };
                                            });
                                        }
                                    }

                                    // Fallback: Build from panel config events
                                    const activeParentEvents = panelConfig?.percentageConfig?.parentEvents || [];
                                    const activeChildEvents = panelConfig?.percentageConfig?.childEvents || [];
                                    const apiEventIds = Array.from(new Set([...(activeParentEvents || []), ...(activeChildEvents || [])].map(String)));

                                    if (apiEventIds.length === 0) return [];

                                    return apiEventIds.map((id) => {
                                        const ev = (events || []).find((e: any) => String(e.eventId) === String(id));
                                        const name = ev?.isApiEvent && ev?.host && ev?.url
                                            ? `${ev.host} - ${ev.url}`
                                            : (ev?.eventName || `Event ${id}`);
                                        return {
                                            eventId: String(id),
                                            eventName: name,
                                            eventKey: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`
                                        };
                                    });
                                })();

                                // For avgDelay events OR API events, use raw data instead of aggregated data
                                // API events need raw data to access successCount for percentage calculation
                                const hasAvgEvents = [...activeParentEvents, ...activeChildEvents].some((eventId: string) => {
                                    const ev = (events || []).find((e: any) => String(e.eventId) === String(eventId));
                                    return ev?.isAvgEvent === 1;
                                });
                                const hasApiEvents = panelConfig?.isApiEvent || [...activeParentEvents, ...activeChildEvents].some((eventId: string) => {
                                    const ev = (events || []).find((e: any) => String(e.eventId) === String(eventId));
                                    return ev?.isApiEvent === 1 || ev?.isApiEvent === true;
                                });

                                const percentageGraphData = (hasAvgEvents || hasApiEvents)
                                    ? (() => {
                                        let rawData = panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || [];

                                        // Apply sourceStr filtering ONLY if data has sourceStr and filter is selected
                                        const selectedSourceStrs = currentPanelFilters.sourceStrs || [];
                                        const hasSourceStr = rawData.length > 0 && rawData.some((d: any) => d.sourceStr);

                                        if (hasSourceStr && selectedSourceStrs.length > 0) {
                                            rawData = rawData.filter((d: any) =>
                                                d.sourceStr && selectedSourceStrs.includes(d.sourceStr.toString())
                                            );
                                        }

                                        return rawData;
                                    })()
                                    : filteredGraphData;

                                return (
                                    <div className="space-y-6">
                                        <PercentageGraph
                                            data={percentageGraphData}
                                            dateRange={currentPanelDateRange}
                                            parentEvents={activeParentEvents}
                                            childEvents={activeChildEvents}
                                            eventColors={eventColors}
                                            eventNames={eventNames}
                                            filters={mergedFilters}
                                            showCombinedPercentage={panelConfig.percentageConfig.showCombinedPercentage !== false}
                                            isHourly={pIsHourly}
                                            onToggleHourly={(newIsHourly: boolean) => {
                                                // Update hourly override state using the per-panel setter
                                                setPanelHourlyOverrideForId?.(panel.panelId, newIsHourly);
                                            }}
                                            onToggleBackToFunnel={(panel as any)?.previousGraphType ? () => {
                                                // Toggle back to previous graph type
                                                const prevType = (panel as any)?.previousGraphType;
                                                // FIX: Use activePanelIndex directly instead of panelIndex + 1
                                                // panelIndex is always 0 due to single panel filter, but activePanelIndex is the correct index
                                                console.log('🔄 Back to Previous (Additional Panel) clicked:', { prevType, panelIndex, activePanelIndex, panelId: panel.panelId });

                                                if (profile && profile.panels && prevType) {
                                                    const actualIndex = activePanelIndex; // FIX: Use activePanelIndex directly
                                                    const targetPanel = profile.panels[actualIndex];
                                                    if (!targetPanel) {
                                                        console.error('❌ Target panel not found at index:', actualIndex);
                                                        return;
                                                    }
                                                    const updatedConfig = {
                                                        ...targetPanel.filterConfig,
                                                        graphType: prevType as 'funnel' | 'percentage' | 'user_flow',
                                                    };

                                                    const updatedProfile = {
                                                        ...profile,
                                                        panels: profile.panels.map((p: any, i: number) =>
                                                            i === actualIndex ? {
                                                                ...p,
                                                                filterConfig: updatedConfig,
                                                                previousGraphType: undefined
                                                            } : p
                                                        )
                                                    };

                                                    console.log('🔄 Updating additional panel at index', actualIndex, 'with graphType:', prevType);
                                                    setProfile?.(updatedProfile);
                                                } else {
                                                    console.error('❌ Cannot switch back (Additional Panel):', { prevType, profileExists: !!profile });
                                                }
                                            } : undefined}
                                            events={events}
                                            eventPieCharts={panelData?.eventPieCharts}
                                            onExpand={() => {
                                                setExpandedChart?.({
                                                    title: `${panel.panelName} - Percentage Analysis`,
                                                    render: (z: number) => (
                                                        <div style={{ width: '100%', height: '100%' }}>
                                                            <PercentageGraph
                                                                data={percentageGraphData}
                                                                dateRange={currentPanelDateRange}
                                                                parentEvents={activeParentEvents}
                                                                childEvents={activeChildEvents}
                                                                eventColors={eventColors}
                                                                eventNames={eventNames}
                                                                filters={mergedFilters}
                                                                showCombinedPercentage={panelConfig.percentageConfig.showCombinedPercentage !== false}
                                                                isHourly={pIsHourly}
                                                                events={events}
                                                                eventPieCharts={panelData?.eventPieCharts}
                                                            />
                                                        </div>
                                                    )
                                                });
                                            }}
                                        />


                                        {panelConfig?.isApiEvent && apiEventKeyInfos.length > 0 && (
                                            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl">
                                                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/10 border-b border-blue-200/40 dark:border-blue-500/20">
                                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                                <Activity className="h-6 w-6 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
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
                                                    {/* Collapsible Legend */}
                                                    {apiEventKeyInfos.length > 0 && (
                                                        <CollapsibleLegend
                                                            eventKeys={apiEventKeyInfos as any}
                                                            events={events}
                                                            isExpanded={panelLegendExpanded?.[`${panel.panelId}_api`] || false}
                                                            onToggle={() => togglePanelLegend?.(`${panel.panelId}_api`)}
                                                            maxVisibleItems={5}
                                                            graphData={panelApiSeries}
                                                        />
                                                    )}

                                                    {/* Tabs for different metrics */}
                                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                                                        {(['timing', 'timing-breakdown', 'timing-anomaly', 'bytes', 'bytes-in', 'count'] as const).map((tab) => (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setPanelApiMetricView?.((prev: any) => ({ ...prev, [panel.panelId]: tab }))}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                                                    panelMetricView === tab
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
                                                    {panelMetricView === 'timing-anomaly' && (
                                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                                                                        Anomaly Detection Active
                                                                    </p>
                                                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                                                        Red dots highlight response times exceeding 2 standard deviations above the mean.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full relative group">
                                                        {panelApiSeries.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={panelApiSeries} margin={{ top: 10, right: 30, left: 18, bottom: 50 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis
                                                                        dataKey="date"
                                                                        tick={<CustomXAxisTick isHourly={pIsHourly} />}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        height={45}
                                                                        interval={Math.max(0, Math.floor((panelApiSeries.length || 0) / 8))}
                                                                    />
                                                                    <YAxis
                                                                        tick={{ fill: '#3b82f6', fontSize: 11 }}
                                                                        width={60}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (!value || value <= 0) return '0';
                                                                            const isTimingView = panelMetricView?.startsWith('timing');
                                                                            const isBytesView = panelMetricView?.startsWith('bytes');
                                                                            if (isTimingView) return `${Number(value).toFixed(0)}ms`;
                                                                            if (isBytesView) {
                                                                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}GB`;
                                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}MB`;
                                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}KB`;
                                                                                return `${Number(value).toFixed(0)}B`;
                                                                            }
                                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                            return value;
                                                                        }}
                                                                    />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={apiEventKeyInfos as any} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                    {apiEventKeyInfos.map((ek, idx) => {
                                                                        const color = EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                        let dataKey = `${ek.eventKey}_count`;
                                                                        if (panelMetricView === 'timing' || panelMetricView === 'timing-anomaly') dataKey = `${ek.eventKey}_avgServerToUser`;
                                                                        if (panelMetricView === 'bytes') dataKey = `${ek.eventKey}_avgBytesOut`;
                                                                        if (panelMetricView === 'bytes-in') dataKey = `${ek.eventKey}_avgBytesIn`;

                                                                        if (panelMetricView === 'timing-breakdown') {
                                                                            return (
                                                                                <Fragment key={`pbreak_${panel.panelId}_${ek.eventKey}`}>
                                                                                    <Area type="monotone" dataKey={`${ek.eventKey}_avgServerToCloud`} name={`${ek.eventName} (Server)`} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} connectNulls={true} />
                                                                                    <Area type="monotone" dataKey={`${ek.eventKey}_avgCloudToUser`} name={`${ek.eventName} (Network)`} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} connectNulls={true} />
                                                                                </Fragment>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <Area
                                                                                key={`papi_${panel.panelId}_${ek.eventKey}_${panelMetricView}`}
                                                                                type="monotone"
                                                                                dataKey={dataKey}
                                                                                name={ek.eventName}
                                                                                stroke={color}
                                                                                strokeWidth={2.5}
                                                                                fillOpacity={0.12}
                                                                                fill={color}
                                                                                dot={false}
                                                                                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
                                                                                isAnimationActive={false} connectNulls={true}
                                                                                animationDuration={0}
                                                                            />
                                                                        );
                                                                    })}
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                                                <div className="text-center">
                                                                    <Activity className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                                                                    <p className="text-sm font-medium">No API performance data</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">Select events and apply filters to view metrics</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {panelConfig?.isApiEvent && (() => {
                                            const apiData = (pPieData as any)?.data || pPieData;
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
                                            const statusData = apiData?.status
                                                ? Object.entries(apiData.status).map(([_, val]: [string, any]) => {
                                                    const metric = pickMetric(val);
                                                    return { name: `${val.status}`, value: metric.value, metricType: metric.metricType };
                                                })
                                                : [];
                                            const cacheStatusData = apiData?.cacheStatus
                                                ? Object.entries(apiData.cacheStatus).map(([_, val]: [string, any]) => {
                                                    const metric = pickMetric(val);
                                                    return { name: val.cacheStatus || 'Unknown', value: metric.value, metricType: metric.metricType };
                                                })
                                                : [];

                                            statusData.sort((a: any, b: any) => {
                                                if (a.name === '200') return -1;
                                                if (b.name === '200') return 1;
                                                return parseInt(a.name) - parseInt(b.name);
                                            });

                                            const showStatus = statusData.length > 0;
                                            const showCacheStatus = cacheStatusData.length > 0;
                                            const visibleCount = [showStatus, showCacheStatus].filter(Boolean).length;
                                            if (visibleCount === 0) return null;

                                            const gridClass = visibleCount === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto';

                                            return (
                                                <div className={cn('grid gap-3 md:gap-4', gridClass)}>
                                                    {showStatus && (
                                                        <Card className="border border-blue-200/60 dark:border-blue-500/30 rounded-2xl overflow-hidden shadow-premium">
                                                            <CardHeader className="pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-sm font-semibold">Status Codes</CardTitle>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() => openExpandedPie?.('status', 'Status Codes', { status: statusData })}
                                                                    >
                                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="h-52">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <PieChart>
                                                                            <Pie data={statusData} cx="50%" cy="45%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value" strokeWidth={2} stroke="#fff" isAnimationActive={false}>
                                                                                {statusData.map((_: any, index: number) => (
                                                                                    <Cell key={`p_status_${panel.panelId}_${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip content={<PieTooltip totalValue={statusData.reduce((acc: number, item: any) => acc + item.value, 0)} category="Status Code" />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                            <Legend iconType="circle" iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {showCacheStatus && (
                                                        <Card className="border border-gray-200/60 dark:border-gray-500/30 rounded-2xl overflow-hidden shadow-premium">
                                                            <CardHeader className="pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-sm font-semibold">Cache Status</CardTitle>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() => openExpandedPie?.('cacheStatus', 'Cache Status', { cacheStatus: cacheStatusData })}
                                                                    >
                                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="h-52">
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <PieChart>
                                                                            <Pie data={cacheStatusData} cx="50%" cy="45%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value" strokeWidth={2} stroke="#fff" isAnimationActive={false}>
                                                                                {cacheStatusData.map((_: any, index: number) => (
                                                                                    <Cell key={`p_cache_${panel.panelId}_${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip content={<PieTooltip totalValue={cacheStatusData.reduce((acc: number, item: any) => acc + item.value, 0)} category="Cache Status" />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                            <Legend iconType="circle" iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            }

                            if (panelGraphType === 'funnel' && panelConfig?.funnelConfig) {
                                const activeStages = panelConfig.funnelConfig.stages?.filter((s: any) =>
                                    !currentPanelFilters.activeStages || currentPanelFilters.activeStages.includes(s.eventId)
                                ) || [];

                                const panelApiSeries = panelApiPerformanceSeriesMap?.[panel.panelId] || [];
                                const panelMetricView = panelApiMetricView?.[panel.panelId] || 'timing';

                                // Build apiEventKeyInfos for funnel
                                const apiEventKeyInfos = (() => {
                                    // First, try to extract keys from panelApiSeries data if available
                                    if (panelApiSeries.length > 0) {
                                        const dataKeys = new Set<string>();
                                        const firstRecord = panelApiSeries[0];

                                        Object.keys(firstRecord).forEach(key => {
                                            if (key === 'date' || key === 'timestamp') return;
                                            const match = key.match(/^(.+)_(count|avgServerToUser|avgServerToCloud|avgCloudToUser|avgBytesOut|avgBytesIn|success|fail|sumCount)$/);
                                            if (match) dataKeys.add(match[1]);
                                        });

                                        if (dataKeys.size > 0) {
                                            return Array.from(dataKeys).map(eventKey => {
                                                const eventIdMatch = eventKey.match(/_(\d+)$/);
                                                const eventId = eventIdMatch ? eventIdMatch[1] : eventKey;
                                                const ev = (events || []).find((e: any) => String(e.eventId) === eventId);
                                                const displayName = ev?.isApiEvent && ev?.host && ev?.url
                                                    ? `${ev.host} - ${ev.url}`
                                                    : (ev?.eventName || eventKey.replace(/_/g, ' '));

                                                return { eventId, eventName: displayName, eventKey, isErrorEvent: 0, isAvgEvent: 0 };
                                            });
                                        }
                                    }

                                    // Fallback: Build from funnel config
                                    const apiEventIds = Array.from(new Set([...(activeStages.map((s: any) => s.eventId)), ...(panelConfig.funnelConfig.multipleChildEvents || [])].map(String)));
                                    return apiEventIds.map((id) => {
                                        const ev = (events || []).find((e: any) => String(e.eventId) === String(id));
                                        const name = ev?.isApiEvent && ev?.host && ev?.url ? `${ev.host} - ${ev.url}` : (ev?.eventName || `Event ${id}`);
                                        return { eventId: String(id), eventName: name, eventKey: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}` };
                                    });
                                })();

                                return (
                                    <div className="space-y-6">
                                        <FunnelGraph
                                            data={filteredGraphData}
                                            stages={activeStages}
                                            multipleChildEvents={panelConfig.funnelConfig.multipleChildEvents || []}
                                            eventColors={eventColors}
                                            eventNames={eventNames}
                                            isHourly={pIsHourly}
                                            filters={panelConfig?.isApiEvent ? {
                                                statusCodes: currentPanelFilters.percentageStatusCodes || [],
                                                cacheStatus: currentPanelFilters.percentageCacheStatus || [],
                                            } : undefined}
                                            onViewAsPercentage={(parentEventId, childEventIds) => {
                                                // console.log('🔄 View as Percentage clicked:', { parentEventId, childEventIds, panelIndex, panelId: panel.panelId });
                                                if (profile && profile.panels) {
                                                    // CRITICAL FIX: Find actual index in profile.panels using panelId, not filtered array index
                                                    const actualIndex = profile.panels.findIndex((p: any) => p.panelId === panel.panelId);
                                                    // console.log('📍 Found panel at actual index:', actualIndex);
                                                    if (actualIndex === -1) {
                                                        console.error('❌ Could not find panel in profile.panels');
                                                        return;
                                                    }
                                                    const targetPanel = profile.panels[actualIndex];
                                                    const filterConfig = targetPanel.filterConfig;

                                                    const updatedConfig = {
                                                        ...filterConfig,
                                                        graphType: 'percentage',
                                                        percentageConfig: {
                                                            parentEvents: [parentEventId],
                                                            childEvents: childEventIds,
                                                            filters: {
                                                                statusCodes: currentPanelFilters.percentageStatusCodes || [],
                                                                cacheStatus: currentPanelFilters.percentageCacheStatus || []
                                                            }
                                                        }
                                                    };

                                                    // console.log('📊 Updated config:', updatedConfig);

                                                    const updatedProfile = {
                                                        ...profile,
                                                        panels: profile.panels.map((p: any, i: number) =>
                                                            i === actualIndex ? {
                                                                ...p,
                                                                filterConfig: updatedConfig,
                                                                previousGraphType: p.filterConfig?.graphType // Track previous graph type for back button
                                                            } : p
                                                        )
                                                    };
                                                    setProfile?.(updatedProfile);

                                                    // Mark panel for refresh to fetch percentage data
                                                    setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));

                                                    // Also refresh panel data automatically
                                                    setTimeout(() => {
                                                        handlePanelRefresh?.(panel.panelId);
                                                    }, 100);

                                                    // console.log('✅ Switched to Percentage View');
                                                }
                                            }}
                                        />

                                        {panelConfig?.isApiEvent && apiEventKeyInfos.length > 0 && (
                                            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl">
                                                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/10 border-b border-blue-200/40 dark:border-blue-500/20">
                                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                                <Activity className="h-6 w-6 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
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
                                                    {/* Collapsible Legend */}
                                                    {apiEventKeyInfos.length > 0 && (
                                                        <CollapsibleLegend
                                                            eventKeys={apiEventKeyInfos as any}
                                                            events={events}
                                                            isExpanded={panelLegendExpanded?.[`${panel.panelId}_api_funnel`] || false}
                                                            onToggle={() => togglePanelLegend?.(`${panel.panelId}_api_funnel`)}
                                                            maxVisibleItems={5}
                                                            graphData={panelApiSeries}
                                                        />
                                                    )}

                                                    {/* Tabs for different metrics */}
                                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                                                        {(['timing', 'timing-breakdown', 'timing-anomaly', 'bytes', 'bytes-in', 'count'] as const).map((tab) => (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setPanelApiMetricView?.((prev: any) => ({ ...prev, [panel.panelId]: tab }))}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                                                    panelMetricView === tab
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
                                                    {panelMetricView === 'timing-anomaly' && (
                                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                                                                        Anomaly Detection Active
                                                                    </p>
                                                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                                                        Red dots highlight response times exceeding 2 standard deviations above the mean.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full relative group">
                                                        {panelApiSeries.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={panelApiSeries} margin={{ top: 10, right: 30, left: 18, bottom: 50 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis
                                                                        dataKey="date"
                                                                        tick={<CustomXAxisTick isHourly={pIsHourly} />}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        height={45}
                                                                        interval={Math.max(0, Math.floor((panelApiSeries.length || 0) / 8))}
                                                                    />
                                                                    <YAxis
                                                                        tick={{ fill: '#3b82f6', fontSize: 11 }}
                                                                        width={60}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (!value || value <= 0) return '0';
                                                                            const isTimingView = panelMetricView?.startsWith('timing');
                                                                            const isBytesView = panelMetricView?.startsWith('bytes');
                                                                            if (isTimingView) return `${Number(value).toFixed(0)}ms`;
                                                                            if (isBytesView) {
                                                                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}GB`;
                                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}MB`;
                                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}KB`;
                                                                                return `${Number(value).toFixed(0)}B`;
                                                                            }
                                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                            return value;
                                                                        }}
                                                                    />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={apiEventKeyInfos as any} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                    {apiEventKeyInfos.map((ek, idx) => {
                                                                        const color = EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                        let dataKey = `${ek.eventKey}_count`;
                                                                        if (panelMetricView === 'timing' || panelMetricView === 'timing-anomaly') dataKey = `${ek.eventKey}_avgServerToUser`;
                                                                        if (panelMetricView === 'bytes') dataKey = `${ek.eventKey}_avgBytesOut`;
                                                                        if (panelMetricView === 'bytes-in') dataKey = `${ek.eventKey}_avgBytesIn`;

                                                                        if (panelMetricView === 'timing-breakdown') {
                                                                            return (
                                                                                <Fragment key={`pbreak_fun_${panel.panelId}_${ek.eventKey}`}>
                                                                                    <Area type="monotone" dataKey={`${ek.eventKey}_avgServerToCloud`} name={`${ek.eventName} (Server)`} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} connectNulls={true} />
                                                                                    <Area type="monotone" dataKey={`${ek.eventKey}_avgCloudToUser`} name={`${ek.eventName} (Network)`} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} connectNulls={true} />
                                                                                </Fragment>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <Area
                                                                                key={`papi_fun_${panel.panelId}_${ek.eventKey}_${panelMetricView}`}
                                                                                type="monotone"
                                                                                dataKey={dataKey}
                                                                                name={ek.eventName}
                                                                                stroke={color}
                                                                                strokeWidth={2.5}
                                                                                fillOpacity={0.12}
                                                                                fill={color}
                                                                                dot={false}
                                                                                activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2, cursor: 'pointer' }}
                                                                                isAnimationActive={false} connectNulls={true}
                                                                                animationDuration={0}
                                                                            />
                                                                        );
                                                                    })}
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                                                <div className="text-center">
                                                                    <Activity className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                                                                    <p className="text-sm font-medium">No API performance data</p>
                                                                    <p className="text-xs text-muted-foreground mt-1">Select events and apply filters to view metrics</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                );
                            }

                            if (panelGraphType === 'user_flow' && panelConfig?.userFlowConfig) {
                                return (
                                    <div className="space-y-6">
                                        <Card className="border border-cyan-200/60 dark:border-cyan-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                            <CardHeader className="pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                                                            <Activity className="h-6 w-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg font-bold">User Flow Analysis</CardTitle>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {panelConfig.userFlowConfig.stages?.length || 0} stages configured
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-gray-500 hover:text-cyan-600"
                                                        title="See full page expansion"
                                                        onClick={() => {
                                                            setExpandedChart?.({
                                                                title: `${panel.panelName} - User Flow Analysis`,
                                                                render: (z: number) => (
                                                                    <div style={{ width: '100%', height: '100%' }}>
                                                                        <UserFlowVisualization
                                                                            data={panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || []}
                                                                            eventNames={eventNames}
                                                                            config={{
                                                                                stages: panelConfig.userFlowConfig.stages || [],
                                                                                showDropOffs: panelConfig.userFlowConfig.showDropOffs ?? true
                                                                            }}
                                                                            height={800}
                                                                            availableEvents={events as any[]}
                                                                            isEditable={true}
                                                                            onConfigChange={(newConfig) => {
                                                                                if (profile && setProfile) {
                                                                                    setProfile((prev: any) => ({
                                                                                        ...prev,
                                                                                        panels: prev.panels.map((p: any) =>
                                                                                            p.panelId === panel.panelId ? {
                                                                                                ...p,
                                                                                                filterConfig: {
                                                                                                    ...p.filterConfig,
                                                                                                    userFlowConfig: {
                                                                                                        ...p.filterConfig?.userFlowConfig,
                                                                                                        ...newConfig
                                                                                                    }
                                                                                                }
                                                                                            } : p
                                                                                        )
                                                                                    }));
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )
                                                            });
                                                        }}
                                                    >
                                                        <Maximize2 className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <UserFlowVisualization
                                                    data={panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || []}
                                                    eventNames={eventNames}
                                                    config={{
                                                        stages: panelConfig.userFlowConfig.stages || [],
                                                        showDropOffs: panelConfig.userFlowConfig.showDropOffs ?? true
                                                    }}
                                                    height={500}
                                                    availableEvents={events as any[]}
                                                    isEditable={true}
                                                    onConfigChange={(newConfig) => {
                                                        if (profile && setProfile) {
                                                            setProfile((prev: any) => ({
                                                                ...prev,
                                                                panels: prev.panels.map((p: any) =>
                                                                    p.panelId === panel.panelId ? {
                                                                        ...p,
                                                                        filterConfig: {
                                                                            ...p.filterConfig,
                                                                            userFlowConfig: {
                                                                                ...p.filterConfig?.userFlowConfig,
                                                                                ...newConfig
                                                                            }
                                                                        }
                                                                    } : p
                                                                )
                                                            }));
                                                        }
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            }

                            return null;
                        })()}

                        {panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && panelGraphType !== 'user_flow' && (() => {
                            const pAvgEventKeys = pEventKeys.filter((ek: any) => ek.isAvgEvent >= 1);
                            // FIXED: Added parentheses for correct operator precedence
                            const pErrorEventKeys = pEventKeys.filter((ek: any) => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
                            const pNormalEventKeys = pEventKeys.filter((ek: any) => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));

                            return (
                                <>
                                    {pNormalEventKeys.length > 0 && (panelChartType?.[panel.panelId] ?? 'deviation') !== 'deviation' && (
                                        <Card className="border border-gray-200/60 dark:border-gray-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-5 h-5 text-current" />
                                                        <CardTitle className="text-base font-semibold">Event Trends (Count)</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground font-medium">{pNormalEventKeys.length} events</span>

                                                        {/* AI Insights Button - Admin Only */}
                                                        {isAdmin && filteredGraphData.length > 0 && (
                                                            <AiInsightsBadge
                                                                panelId={panel.panelId}
                                                                panelName={panel.panelName || 'Event Trends (Count)'}
                                                                data={filteredGraphData}
                                                                metricType={panelConfig?.isApiEvent ? 'percentage' : (panelData?.events?.[0]?.isAvgEvent ? 'timing' : 'count')}
                                                                isHourly={pIsHourly}
                                                                eventKeys={pNormalEventKeys}
                                                            />
                                                        )}

                                                        {/* Hourly/Daily Toggle */}
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, true)}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Hourly
                                                            </button>
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, false)}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    !pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Daily
                                                            </button>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 text-sm font-semibold bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                            onClick={() => {
                                                                setPanelChartType?.((prev: any) => {
                                                                    const current = prev?.[panel.panelId] ?? 'default';
                                                                    return {
                                                                        ...prev,
                                                                        [panel.panelId]: current === 'deviation' ? 'default' : 'deviation',
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            {(() => {
                                                                const currentType = panelChartType?.[panel.panelId] ?? 'deviation';
                                                                if (pIsHourly) {
                                                                    return currentType === 'deviation' ? '← Event Trends' : '8-Day Overlay →';
                                                                }
                                                                return currentType === 'deviation' ? '← Event Trends' : 'Daily Overlay →';
                                                            })()}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-500 hover:text-gray-700"
                                                            title="See full page expansion"
                                                            onClick={() => {
                                                                setExpandedChart?.({
                                                                    title: `${panel.panelName} - Event Trends`,
                                                                    render: (z: number) => (
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                                <XAxis dataKey="date" />
                                                                                <YAxis />
                                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pNormalEventKeys} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                                {pNormalEventKeys.map((ek: any, i: number) => (
                                                                                    <Area key={ek.eventKey} type="monotone" dataKey={`${ek.eventKey}_count`} stroke={EVENT_COLORS[i % EVENT_COLORS.length]} fill={EVENT_COLORS[i % EVENT_COLORS.length]} fillOpacity={0.3} />
                                                                                ))}
                                                                            </AreaChart>
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
                                            <CardContent className="space-y-4">
                                                <CollapsibleLegend
                                                    eventKeys={pNormalEventKeys}
                                                    events={events}
                                                    isExpanded={panelLegendExpanded?.[panel.panelId] || false}
                                                    onToggle={() => togglePanelLegend?.(panel.panelId)}
                                                    maxVisibleItems={4}
                                                    graphData={filteredGraphData}
                                                    selectedEventKey={panelSelectedEventKey?.[panel.panelId] || null}
                                                    onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px] relative group overflow-x-auto overflow-y-hidden touch-pan-y">
                                                    {/* Zoom Controls for Event Trends */}
                                                    <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <ChartZoomControls
                                                            zoomLevel={eventTrendsZoom.zoomLevel}
                                                            onZoomIn={eventTrendsZoom.zoomIn}
                                                            onZoomOut={eventTrendsZoom.zoomOut}
                                                            onReset={eventTrendsZoom.resetZoom}
                                                        />
                                                    </div>
                                                    <div
                                                        className="h-full transition-all duration-200"
                                                        style={{ width: `${Math.max(100, eventTrendsZoom.zoomLevel * 100)}%`, minWidth: '100%' }}
                                                    >
                                                        {filteredGraphData.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart
                                                                    data={filteredGraphData}
                                                                    margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                    onClick={(chartState: any) => {
                                                                        if (isMobile) return;
                                                                        if (chartState && chartState.activeIndex !== undefined) {
                                                                            const index = parseInt(chartState.activeIndex);
                                                                            const dataPoint = filteredGraphData[index];
                                                                            if (dataPoint) {
                                                                                setPanelPinnedTooltips?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        dataPoint,
                                                                                        label: chartState.activeLabel || dataPoint.date || ''
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <defs>
                                                                        {pNormalEventKeys.map((eventKeyInfo: any, index: number) => {
                                                                            const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            return (
                                                                                <linearGradient key={`normalGrad_${index}_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`normalColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                                                                </linearGradient>
                                                                            );
                                                                        })}
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={pNormalEventKeys} />} cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                    {pNormalEventKeys
                                                                        .filter((ek: any) => !panelSelectedEventKey?.[panel.panelId] || ek.eventKey === panelSelectedEventKey?.[panel.panelId])
                                                                        .map((eventKeyInfo: any, index: number) => {
                                                                            const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            const countKey = `${eventKeyInfo.eventKey}_count`;
                                                                            const resolvedCountKey = (filteredGraphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                                ? countKey
                                                                                : eventKeyInfo.eventKey;
                                                                            return (
                                                                                <Area
                                                                                    key={`normal_${index}_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                                    type="monotone"
                                                                                    dataKey={resolvedCountKey}
                                                                                    name={eventKeyInfo.eventName}
                                                                                    stroke={color}
                                                                                    strokeWidth={2.5}
                                                                                    fill={`url(#normalColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                                    dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                                    activeDot={{ r: 8, fill: color, stroke: '#fff', strokeWidth: 3, cursor: 'pointer' }}
                                                                                />
                                                                            );
                                                                        })}
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const pinnedData = panelPinnedTooltips?.[panel.panelId];
                                                    if (!pinnedData) return null;

                                                    return (
                                                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                            <div
                                                                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                    const updated = { ...prev };
                                                                    delete updated[panel.panelId];
                                                                    return updated;
                                                                })}
                                                            />
                                                            <div className="relative max-w-lg w-full">
                                                                <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                            const updated = { ...prev };
                                                                            delete updated[panel.panelId];
                                                                            return updated;
                                                                        })}
                                                                        className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                                                        aria-label="Close details"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                                                                        <div className="h-1.5 w-full bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600" />
                                                                        <div className="max-h-[70vh] overflow-y-auto p-1">
                                                                            <CustomTooltip
                                                                                active={true}
                                                                                payload={pNormalEventKeys.map((ek: any, idx: number) => {
                                                                                    const event = (events || []).find((e: any) => String(e.eventId) === ek.eventId);
                                                                                    const color = event?.color || EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                                    return {
                                                                                        dataKey: Object.prototype.hasOwnProperty.call(pinnedData.dataPoint || {}, `${ek.eventKey}_count`) ? `${ek.eventKey}_count` : ek.eventKey,
                                                                                        name: ek.eventName,
                                                                                        value: (pinnedData.dataPoint[`${ek.eventKey}_count`] ?? pinnedData.dataPoint[ek.eventKey] ?? 0) as any,
                                                                                        color,
                                                                                        payload: pinnedData.dataPoint,
                                                                                        unit: '',
                                                                                    };
                                                                                })}
                                                                                label={pinnedData.label}
                                                                                events={events}
                                                                                eventKeys={pNormalEventKeys}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {pIsHourly && pNormalEventKeys.length > 0 && filteredGraphData.length > 0 && (panelChartType?.[panel.panelId] ?? 'deviation') === 'deviation' && (() => {
                                        const pEventStatsForBadges = pNormalEventKeys.map((eventKeyInfo: any) => {
                                            const eventKey = eventKeyInfo.eventKey;
                                            let total = 0;
                                            let success = 0;

                                            filteredGraphData.forEach((item: any) => {
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

                                        const selectedEventKey = panelSelectedEventKey?.[panel.panelId];
                                        const filteredEventKeys = selectedEventKey
                                            ? pNormalEventKeys.filter((e: any) => e.eventKey === selectedEventKey).map((e: any) => e.eventKey)
                                            : pNormalEventKeys.map((e: any) => e.eventKey);

                                        return (
                                            <Card className="border border-gray-200/60 dark:border-gray-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="h-5 w-5 text-gray-700" />
                                                            <CardTitle className="text-base font-semibold">8-Day Hourly Comparison</CardTitle>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                            onClick={() => {
                                                                setPanelChartType?.((prev: any) => ({
                                                                    ...prev,
                                                                    [panel.panelId]: 'default',
                                                                }));
                                                            }}
                                                        >
                                                            ← Event Trends
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                                    <DayWiseComparisonChart
                                                        data={filteredGraphData}
                                                        dateRange={currentPanelDateRange}
                                                        eventKeys={filteredEventKeys}
                                                        eventColors={eventColors}
                                                        eventNames={eventNames}
                                                        eventStats={pEventStatsForBadges}
                                                        selectedEventKey={selectedEventKey}
                                                        onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                    />
                                                </CardContent>
                                            </Card>
                                        );
                                    })()}

                                    {!pIsHourly && pNormalEventKeys.length > 0 && filteredGraphData.length > 0 && (panelChartType?.[panel.panelId] ?? 'deviation') === 'deviation' && (() => {
                                        const pEventStatsForBadges = pNormalEventKeys.map((eventKeyInfo: any) => {
                                            const eventKey = eventKeyInfo.eventKey;
                                            let total = 0;
                                            let success = 0;

                                            filteredGraphData.forEach((item: any) => {
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

                                        const selectedEventKey = panelSelectedEventKey?.[panel.panelId];
                                        const filteredEventKeys = selectedEventKey
                                            ? pNormalEventKeys.filter((e: any) => e.eventKey === selectedEventKey).map((e: any) => e.eventKey)
                                            : pNormalEventKeys.map((e: any) => e.eventKey);

                                        // Calculate days difference to determine which chart to show
                                        const daysDiff = Math.ceil((currentPanelDateRange.to.getTime() - currentPanelDateRange.from.getTime()) / (1000 * 60 * 60 * 24));

                                        // For >8 days, show Daily Trends with Average Line instead
                                        if (daysDiff > 8) {
                                            return (
                                                <Card className="border border-emerald-200/60 dark:border-emerald-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                                                                <CardTitle className="text-base font-semibold">Daily Trends with Average Line</CardTitle>
                                                                <span className="text-xs text-muted-foreground">({daysDiff} days)</span>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                                onClick={() => {
                                                                    setPanelChartType?.((prev: any) => ({
                                                                        ...prev,
                                                                        [panel.panelId]: 'default',
                                                                    }));
                                                                }}
                                                            >
                                                                ← Event Trends
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                                        <DailyAverageChart
                                                            data={filteredGraphData}
                                                            dateRange={currentPanelDateRange}
                                                            eventKeys={filteredEventKeys}
                                                            eventColors={eventColors}
                                                            eventNames={eventNames}
                                                            eventStats={pEventStatsForBadges}
                                                            selectedEventKey={selectedEventKey}
                                                            onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            );
                                        }

                                        // For <=8 days, show the 8-Day Overlay Comparison
                                        return (
                                            <Card className="border border-gray-200/60 dark:border-gray-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="h-5 w-5 text-gray-700" />
                                                            <CardTitle className="text-base font-semibold">Daily Overlay Comparison</CardTitle>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                                            onClick={() => {
                                                                setPanelChartType?.((prev: any) => ({
                                                                    ...prev,
                                                                    [panel.panelId]: 'default',
                                                                }));
                                                            }}
                                                        >
                                                            ← Event Trends
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                                    <DayWiseComparisonChart
                                                        data={filteredGraphData}
                                                        dateRange={currentPanelDateRange}
                                                        eventKeys={filteredEventKeys}
                                                        eventColors={eventColors}
                                                        eventNames={eventNames}
                                                        eventStats={pEventStatsForBadges}
                                                        selectedEventKey={selectedEventKey}
                                                        onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                    />
                                                </CardContent>
                                            </Card>
                                        );
                                    })()}

                                    {pAvgEventKeys.length > 0 && panel.type === 'combined' && (
                                        <Card className="border border-amber-200/60 dark:border-amber-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-amber-500" />
                                                        <CardTitle className="text-base font-semibold">Time Delay Trends (Combined)</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">isAvg Events</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-500 hover:text-amber-600"
                                                            title="See full page expansion"
                                                            onClick={() => {
                                                                setExpandedChart?.({
                                                                    title: `${panel.panelName} - Time Delay Trends`,
                                                                    render: (z: number) => (
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                                <XAxis dataKey="date" />
                                                                                <YAxis />
                                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pAvgEventKeys} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                                {pAvgEventKeys.map((ek: any, i: number) => (
                                                                                    <Area key={ek.eventKey} type="monotone" dataKey={`${ek.eventKey}_avgDelay`} stroke={EVENT_COLORS[i % EVENT_COLORS.length]} fill={EVENT_COLORS[i % EVENT_COLORS.length]} fillOpacity={0.3} />
                                                                                ))}
                                                                            </AreaChart>
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
                                            <CardContent className="space-y-4">
                                                <CollapsibleLegend
                                                    eventKeys={pAvgEventKeys}
                                                    events={events}
                                                    isExpanded={panelLegendExpanded?.[`${panel.panelId}_avg`] || false}
                                                    onToggle={() => togglePanelLegend?.(`${panel.panelId}_avg`)}
                                                    maxVisibleItems={4}
                                                    graphData={filteredGraphData}
                                                    selectedEventKey={panelAvgSelectedEventKey?.[panel.panelId] || null}
                                                    onEventClick={(eventKey: string) => handlePanelAvgEventClick?.(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px] relative group overflow-x-auto overflow-y-hidden touch-pan-y">
                                                    {/* Zoom Controls for Time Delay Trends */}
                                                    <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <ChartZoomControls
                                                            zoomLevel={timeDelayZoom.zoomLevel}
                                                            onZoomIn={timeDelayZoom.zoomIn}
                                                            onZoomOut={timeDelayZoom.zoomOut}
                                                            onReset={timeDelayZoom.resetZoom}
                                                        />
                                                    </div>
                                                    <div
                                                        className="h-full transition-all duration-200"
                                                        style={{ width: `${Math.max(100, timeDelayZoom.zoomLevel * 100)}%`, minWidth: '100%' }}
                                                    >
                                                        {filteredGraphData.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart
                                                                    data={filteredGraphData}
                                                                    margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                    onClick={(chartState: any) => {
                                                                        if (isMobile) return;
                                                                        if (chartState && chartState.activeIndex !== undefined) {
                                                                            const index = parseInt(chartState.activeIndex);
                                                                            const dataPoint = filteredGraphData[index];
                                                                            if (dataPoint) {
                                                                                setPanelPinnedTooltips?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [`${panel.panelId}_avg`]: {
                                                                                        dataPoint,
                                                                                        label: chartState.activeLabel || dataPoint.date || ''
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <defs>
                                                                        {pAvgEventKeys.map((eventKeyInfo: any, index: number) => {
                                                                            const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            return (
                                                                                <linearGradient key={`avgGrad_${index}_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`avgColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                                                </linearGradient>
                                                                            );
                                                                        })}
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis
                                                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (!value || value <= 0) return '0';
                                                                            const hasPriceAlert = pAvgEventKeys.some((ek: any) => {
                                                                                const ev = (events || []).find((e: any) => String(e.eventId) === ek.eventId);
                                                                                return ev?.feature === 1;
                                                                            });
                                                                            if (hasPriceAlert) {
                                                                                if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                                                                return `${value.toFixed(1)}m`;
                                                                            }
                                                                            if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                                                            return `${value.toFixed(1)}s`;
                                                                        }}
                                                                    />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={pAvgEventKeys} />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5 5' }} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                    {pAvgEventKeys
                                                                        .filter((ek: any) => !panelAvgSelectedEventKey?.[panel.panelId] || ek.eventKey === panelAvgSelectedEventKey?.[panel.panelId])
                                                                        .map((eventKeyInfo: any, index: number) => {
                                                                            const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            return (
                                                                                <Area
                                                                                    key={`avg_${index}_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                                    type="monotone"
                                                                                    dataKey={`${eventKeyInfo.eventKey}_avgDelay`}
                                                                                    name={eventKeyInfo.eventName}
                                                                                    stroke={color}
                                                                                    strokeWidth={2.5}
                                                                                    fill={`url(#avgColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                                    dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                                    activeDot={{ r: 8, fill: color, stroke: '#fff', strokeWidth: 3, cursor: 'pointer' }}
                                                                                />
                                                                            );
                                                                        })}
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const pinnedData = panelPinnedTooltips?.[`${panel.panelId}_avg`];
                                                    if (!pinnedData) return null;

                                                    return (
                                                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                            <div
                                                                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                    const updated = { ...prev };
                                                                    delete updated[`${panel.panelId}_avg`];
                                                                    return updated;
                                                                })}
                                                            />
                                                            <div className="relative max-w-lg w-full">
                                                                <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                            const updated = { ...prev };
                                                                            delete updated[`${panel.panelId}_avg`];
                                                                            return updated;
                                                                        })}
                                                                        className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                                                        aria-label="Close details"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                                                                        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600" />
                                                                        <div className="max-h-[70vh] overflow-y-auto p-1">
                                                                            <CustomTooltip
                                                                                active={true}
                                                                                payload={pAvgEventKeys.map((ek: any, idx: number) => {
                                                                                    const event = (events || []).find((e: any) => String(e.eventId) === ek.eventId);
                                                                                    const color = event?.color || EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                                    return {
                                                                                        dataKey: `${ek.eventKey}_avgDelay`,
                                                                                        name: ek.eventName,
                                                                                        value: pinnedData.dataPoint[`${ek.eventKey}_avgDelay`] || 0,
                                                                                        color,
                                                                                        payload: pinnedData.dataPoint,
                                                                                        unit: '',
                                                                                    };
                                                                                })}
                                                                                label={pinnedData.label}
                                                                                events={events}
                                                                                eventKeys={pAvgEventKeys}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {pErrorEventKeys.length > 0 && panel.type === 'combined' && (
                                        <Card className="border border-red-200/60 dark:border-red-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                                        <CardTitle className="text-base font-semibold">Error Event Trends (Combined)</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Hourly/Daily Toggle */}
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, true)}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Hourly
                                                            </button>
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, false)}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    !pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Daily
                                                            </button>
                                                        </div>
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError Events</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-500 hover:text-red-600"
                                                            title="See full page expansion"
                                                            onClick={() => {
                                                                setExpandedChart?.({
                                                                    title: `${panel.panelName} - Error Event Trends`,
                                                                    render: (z: number) => (
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                                <XAxis dataKey="date" />
                                                                                <YAxis />
                                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pErrorEventKeys} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                                {pErrorEventKeys.map((ek: any, i: number) => (
                                                                                    <Area key={ek.eventKey} type="monotone" dataKey={`${ek.eventKey}_count`} stroke={ERROR_COLORS[i % ERROR_COLORS.length]} fill={ERROR_COLORS[i % ERROR_COLORS.length]} fillOpacity={0.3} />
                                                                                ))}
                                                                            </AreaChart>
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
                                            <CardContent className="space-y-4">
                                                <CollapsibleLegend
                                                    eventKeys={pErrorEventKeys}
                                                    events={events}
                                                    isExpanded={panelLegendExpanded?.[`${panel.panelId}_error`] || false}
                                                    onToggle={() => togglePanelLegend?.(`${panel.panelId}_error`)}
                                                    maxVisibleItems={4}
                                                    graphData={filteredGraphData}
                                                    selectedEventKey={panelSelectedEventKey?.[panel.panelId] || null}
                                                    onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px] relative group overflow-x-auto overflow-y-hidden touch-pan-y">
                                                    {/* Zoom Controls for Error Event Trends */}
                                                    <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <ChartZoomControls
                                                            zoomLevel={errorTrendsZoom.zoomLevel}
                                                            onZoomIn={errorTrendsZoom.zoomIn}
                                                            onZoomOut={errorTrendsZoom.zoomOut}
                                                            onReset={errorTrendsZoom.resetZoom}
                                                        />
                                                    </div>
                                                    <div
                                                        className="h-full transition-all duration-200"
                                                        style={{ width: `${Math.max(100, errorTrendsZoom.zoomLevel * 100)}%`, minWidth: '100%' }}
                                                    >
                                                        {filteredGraphData.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart
                                                                    data={filteredGraphData}
                                                                    margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                    onClick={(chartState: any) => {
                                                                        if (isMobile) return;
                                                                        if (chartState && chartState.activeIndex !== undefined) {
                                                                            const index = parseInt(chartState.activeIndex);
                                                                            const dataPoint = filteredGraphData[index];
                                                                            if (dataPoint) {
                                                                                setPanelPinnedTooltips?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [`${panel.panelId}_error`]: {
                                                                                        dataPoint,
                                                                                        label: chartState.activeLabel || dataPoint.date || ''
                                                                                    }
                                                                                }));
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <defs>
                                                                        {pErrorEventKeys.map((eventKeyInfo: any, index: number) => {
                                                                            const errorColor = ERROR_COLORS[index % ERROR_COLORS.length];
                                                                            return (
                                                                                <linearGradient key={`errorGrad_${index}_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`errorColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                    <stop offset="5%" stopColor={errorColor} stopOpacity={0.4} />
                                                                                    <stop offset="95%" stopColor={errorColor} stopOpacity={0.05} />
                                                                                </linearGradient>
                                                                            );
                                                                        })}
                                                                        <linearGradient id={`errorSuccessGrad_${panel.panelId}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={pErrorEventKeys} />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                                    {pErrorEventKeys
                                                                        .filter((ek: any) => !panelSelectedEventKey?.[panel.panelId] || ek.eventKey === panelSelectedEventKey?.[panel.panelId])
                                                                        .map((eventKeyInfo: any, idx: number) => {
                                                                            const eventKey = eventKeyInfo.eventKey;
                                                                            // For isError events: successCount = failed count, so show ONLY red line
                                                                            return (
                                                                                <Area
                                                                                    key={`error_${idx}_${panel.panelId}_${eventKey}_failed`}
                                                                                    type="monotone"
                                                                                    dataKey={`${eventKey}_success`}
                                                                                    name={`${eventKeyInfo.eventName} (Failed Count)`}
                                                                                    stroke="#ef4444"
                                                                                    strokeWidth={3}
                                                                                    fill={`url(#errorColor_${panel.panelId}_${eventKey})`}
                                                                                    dot={false}
                                                                                    activeDot={{ r: 7, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                                                                    isAnimationActive={false} connectNulls={true}
                                                                                    animationDuration={0}
                                                                                />
                                                                            );
                                                                        })}
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const pinnedData = panelPinnedTooltips?.[`${panel.panelId}_error`];
                                                    if (!pinnedData) return null;

                                                    return (
                                                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                            <div
                                                                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                    const updated = { ...prev };
                                                                    delete updated[`${panel.panelId}_error`];
                                                                    return updated;
                                                                })}
                                                            />
                                                            <div className="relative max-w-lg w-full">
                                                                <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPanelPinnedTooltips?.((prev: any) => {
                                                                            const updated = { ...prev };
                                                                            delete updated[`${panel.panelId}_error`];
                                                                            return updated;
                                                                        })}
                                                                        className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                                                        aria-label="Close details"
                                                                    >
                                                                        <X className="h-5 w-5" />
                                                                    </button>
                                                                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                                                                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600" />
                                                                        <div className="max-h-[70vh] overflow-y-auto p-1">
                                                                            <CustomTooltip
                                                                                active={true}
                                                                                payload={pErrorEventKeys.map((ek: any, idx: number) => {
                                                                                    const event = (events || []).find((e: any) => String(e.eventId) === ek.eventId);
                                                                                    const color = event?.color || EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                                    return {
                                                                                        dataKey: `${ek.eventKey}_count`,
                                                                                        name: ek.eventName,
                                                                                        value: pinnedData.dataPoint[`${ek.eventKey}_count`] || 0,
                                                                                        color,
                                                                                        payload: pinnedData.dataPoint,
                                                                                        unit: '',
                                                                                    };
                                                                                })}
                                                                                label={pinnedData.label}
                                                                                events={events}
                                                                                eventKeys={pErrorEventKeys}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {pAvgEventKeys.length > 0 && panel.type === 'separate' && pAvgEventKeys.map((avgEventKeyInfo: any, avgIdx: number) => {
                                        const avgEvent = (events || []).find((e: any) => String(e.eventId) === avgEventKeyInfo.eventId);
                                        const avgColor = avgEvent?.color || EVENT_COLORS[avgIdx % EVENT_COLORS.length];
                                        const featureId = avgEvent?.feature;

                                        return (
                                            <Card key={`avg_sep_${panel.panelId}_${avgEventKeyInfo.eventKey}`} className="border border-amber-200/60 dark:border-amber-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-amber-500" />
                                                            <CardTitle className="text-base font-semibold">{avgEventKeyInfo.eventName}</CardTitle>
                                                        </div>
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">isAvg Event</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="h-[400px]">
                                                        {filteredGraphData.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                    <defs>
                                                                        <linearGradient id={`avgGrad_sep_${panel.panelId}_${avgEventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor={avgColor} stopOpacity={0.4} />
                                                                            <stop offset="95%" stopColor={avgColor} stopOpacity={0.05} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis
                                                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (!value || value <= 0) return '0';
                                                                            const avgEventType = avgEventKeyInfo?.isAvgEvent || 0;
                                                                            if (avgEventType === 2) {
                                                                                // isAvgEvent 2 = Rupees
                                                                                return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                                                                            } else if (avgEventType === 3) {
                                                                                // isAvgEvent 3 = Count
                                                                                return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
                                                                            } else if (avgEventType === 1) {
                                                                                // isAvgEvent 1 = Time (minutes/seconds)
                                                                                if (featureId === 1) {
                                                                                    if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                                                                    return `${value.toFixed(1)}m`;
                                                                                }
                                                                                if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                                                                return `${value.toFixed(1)}s`;
                                                                            }
                                                                            return value.toLocaleString();
                                                                        }}
                                                                        label={{
                                                                            value: (() => {
                                                                                const avgEventType = avgEventKeyInfo?.isAvgEvent || 0;
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
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={[avgEventKeyInfo]} />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                    <Area
                                                                        type="monotone"
                                                                        dataKey={`${avgEventKeyInfo.eventKey}_avgDelay`}
                                                                        name={avgEventKeyInfo.eventName}
                                                                        stroke={avgColor}
                                                                        strokeWidth={2.5}
                                                                        fill={`url(#avgGrad_sep_${panel.panelId}_${avgEventKeyInfo.eventKey})`}
                                                                        dot={{ fill: avgColor, strokeWidth: 0, r: 3 }}
                                                                        activeDot={{ r: 8, fill: avgColor, stroke: '#fff', strokeWidth: 3 }}
                                                                        isAnimationActive={false} connectNulls={true}
                                                                        animationDuration={0}
                                                                    />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    {pErrorEventKeys.length > 0 && panel.type === 'separate' && pErrorEventKeys.map((errorEventKeyInfo: any, errorIdx: number) => {
                                        const errorEvent = (events || []).find((e: any) => String(e.eventId) === errorEventKeyInfo.eventId);
                                        const errorColor = errorEvent?.color || ERROR_COLORS[errorIdx % ERROR_COLORS.length];

                                        return (
                                            <Card key={`error_sep_${panel.panelId}_${errorEventKeyInfo.eventKey}`} className="border border-red-200/60 dark:border-red-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                                            <CardTitle className="text-base font-semibold">{errorEventKeyInfo.eventName}</CardTitle>
                                                        </div>
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError Event</span>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="h-[400px]">
                                                        {filteredGraphData.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                    <defs>
                                                                        <linearGradient id={`errorGrad_sep_${panel.panelId}_${errorEventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor={errorColor} stopOpacity={0.4} />
                                                                            <stop offset="95%" stopColor={errorColor} stopOpacity={0.05} />
                                                                        </linearGradient>
                                                                        <linearGradient id={`errorSuccessGrad_sep_${panel.panelId}_${errorEventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={[errorEventKeyInfo]} />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                    <Area
                                                                        type="monotone"
                                                                        dataKey={`${errorEventKeyInfo.eventKey}_success`}
                                                                        name="Errors"
                                                                        stroke={errorColor}
                                                                        strokeWidth={2.5}
                                                                        fill={`url(#errorGrad_sep_${panel.panelId}_${errorEventKeyInfo.eventKey})`}
                                                                        dot={{ fill: errorColor, strokeWidth: 0, r: 3 }}
                                                                        activeDot={{ r: 8, fill: errorColor, stroke: '#fff', strokeWidth: 3 }}
                                                                        isAnimationActive={false} connectNulls={true}
                                                                        animationDuration={0}
                                                                    />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    {pNormalEventKeys.length === 0 && pAvgEventKeys.length === 0 && pErrorEventKeys.length === 0 && pEventKeys.length > 0 && (
                                        <Card className="border border-gray-200/60 dark:border-gray-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-current" />
                                                        Event Trends
                                                    </CardTitle>
                                                    <span className="text-xs text-muted-foreground">{pEventKeys.length} events</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <CollapsibleLegend
                                                    eventKeys={pEventKeys}
                                                    events={events}
                                                    isExpanded={panelLegendExpanded?.[panel.panelId] || false}
                                                    onToggle={() => togglePanelLegend?.(panel.panelId)}
                                                    maxVisibleItems={4}
                                                    graphData={filteredGraphData}
                                                    selectedEventKey={panelSelectedEventKey?.[panel.panelId] || null}
                                                    onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {filteredGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                <defs>
                                                                    {pEventKeys.map((eventKeyInfo: any, index: number) => {
                                                                        const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                        return (
                                                                            <linearGradient key={`fallbackGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`fallbackColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                                                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                                                            </linearGradient>
                                                                        );
                                                                    })}
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatNumber(value)} />
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pEventKeys} />} />
                                                                {pEventKeys.map((eventKeyInfo: any, index: number) => {
                                                                    const event = (events || []).find((e: any) => String(e.eventId) === eventKeyInfo.eventId);
                                                                    const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                    return (
                                                                        <Area
                                                                            key={`fallback_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                            type="monotone"
                                                                            dataKey={`${eventKeyInfo.eventKey}_count`}
                                                                            name={eventKeyInfo.eventName}
                                                                            stroke={color}
                                                                            strokeWidth={2.5}
                                                                            fill={`url(#fallbackColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                            dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                        />
                                                                    );
                                                                })}
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            );
                        })()}

                        {panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && panel.visualizations?.pieCharts?.some((p: any) => p.enabled) && (() => {
                            const processedPieConfigs = panel.visualizations.pieCharts.filter((p: any) => p.enabled).map((pieConfig: any) => {
                                const pieType = pieConfig.type as 'platform' | 'pos' | 'source';
                                const rawPieData = pPieData?.[pieType];
                                const combinedPieData = combinePieChartDuplicates(rawPieData || []);
                                // Apply POS name mapping for grocery POS IDs (same as MainPanelSection)
                                const mappedPieData = pieType === 'pos'
                                    ? combinedPieData.map((item: any) => ({
                                        ...item,
                                        name: getPOSName(item.name)
                                    }))
                                    : combinedPieData;
                                const showChart = shouldShowPieChart(mappedPieData);
                                return { pieConfig, pieType, pieData: mappedPieData, showChart };
                            }).filter((item: any) => item.showChart);

                            const gridCols = processedPieConfigs.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
                                processedPieConfigs.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
                                    'md:grid-cols-3';

                            return processedPieConfigs.length > 0 ? (
                                <div className={cn("grid grid-cols-1 gap-8", gridCols)}>
                                    {processedPieConfigs.map(({ pieType, pieData }: any) => {
                                        const pieTotal = pieData?.reduce((acc: number, item: any) => acc + item.value, 0) || 0;

                                        const iconMap: any = {
                                            platform: <Activity className="h-4 w-4 text-white" />,
                                            pos: <Target className="h-4 w-4 text-white" />,
                                            source: <Zap className="h-4 w-4 text-white" />,
                                        };
                                        const gradientMap: any = {
                                            platform: "from-indigo-500 to-blue-600",
                                            pos: "from-emerald-500 to-teal-600",
                                            source: "from-amber-500 to-orange-600",
                                        };
                                        const borderColorMap: any = {
                                            platform: "border-indigo-100 dark:border-indigo-500/20",
                                            pos: "border-emerald-100 dark:border-emerald-500/20",
                                            source: "border-amber-100 dark:border-amber-500/20",
                                        };
                                        const hoverBgMap: any = {
                                            platform: "hover:bg-indigo-100 dark:hover:bg-indigo-500/20",
                                            pos: "hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
                                            source: "hover:bg-amber-100 dark:hover:bg-amber-500/20",
                                        };

                                        return (
                                            <div key={pieType}>
                                                <Card className={cn("border-2 overflow-hidden group rounded-xl shadow-sm hover:shadow-md transition-all", borderColorMap[pieType])}>
                                                    <CardHeader className="pb-2 px-4 pt-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md", gradientMap[pieType])}>
                                                                    {iconMap[pieType]}
                                                                </div>
                                                                <CardTitle className="text-sm font-semibold text-foreground capitalize">{pieType}</CardTitle>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {pieData?.length > 0 && (
                                                                    <>
                                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                                            {pieData.length} types
                                                                        </span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={cn("h-7 w-7", hoverBgMap[pieType])}
                                                                            onClick={() => {
                                                                                const dists = {
                                                                                    platform: pieType === 'platform' ? pieData : [],
                                                                                    pos: pieType === 'pos' ? pieData : [],
                                                                                    source: pieType === 'source' ? pieData : []
                                                                                };
                                                                                openExpandedPie?.(pieType, pieType.charAt(0).toUpperCase() + pieType.slice(1), dists);
                                                                            }}
                                                                        >
                                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="px-4 pb-4">
                                                        <div className="h-44 relative">
                                                            {pieData?.length > 0 ? (
                                                                <>
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <PieChart>
                                                                            <Pie
                                                                                data={pieData}
                                                                                cx="50%"
                                                                                cy="50%"
                                                                                innerRadius={45}
                                                                                outerRadius={70}
                                                                                paddingAngle={2}
                                                                                dataKey="value"
                                                                                isAnimationActive={false}
                                                                                stroke="none"
                                                                            >
                                                                                {pieData.map((_: any, index: number) => (
                                                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={pieTotal} category={pieType} />} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                        <span className="text-xl font-black text-foreground tabular-nums">
                                                                            {formatNumber(pieTotal)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="absolute bottom-0 left-0 right-0 space-y-1 px-2 pb-2">
                                                                        {[...pieData]
                                                                            .sort((a: any, b: any) => b.value - a.value)
                                                                            .slice(0, 2)
                                                                            .map((item: any, idx: number) => {
                                                                                const percentage = pieTotal > 0 ? (item.value / pieTotal) * 100 : 0;
                                                                                return (
                                                                                    <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
                                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                            <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                        </div>
                                                                                        <span className="text-indigo-500">{percentage.toFixed(0)}%</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                                    {iconMap[pieType]}
                                                                    <span className="text-sm mt-2">No data</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null;
                        })()}

                        {/* Per-Event Distribution Pie Charts */}
                        {(() => {
                            const panelData = panelsDataMap.get(panel.panelId);
                            const eventPieCharts = panelData?.eventPieCharts;
                            const panelConfig = (panel as any)?.filterConfig;

                            const showEventPieCharts = (currentPanelFilters.showEventPieCharts ?? panelConfig?.showEventPieCharts);
                            if (!showEventPieCharts || !eventPieCharts || Object.keys(eventPieCharts).length === 0) return null;

                            // For percentage graphs, separate parent and child events
                            const isPercentageGraph = panelGraphType === 'percentage';
                            const percentageConfig = panelConfig?.percentageConfig;
                            const parentEventIds = isPercentageGraph && percentageConfig
                                ? (currentPanelFilters.activePercentageEvents || percentageConfig.parentEvents || []).map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
                                : [];
                            const childEventIds = isPercentageGraph && percentageConfig
                                ? (currentPanelFilters.activePercentageChildEvents || percentageConfig.childEvents || []).map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id))
                                : [];

                            const parentEvents = parentEventIds.map((id: number) => events.find((e: any) => e.eventId === String(id))).filter(Boolean);
                            const childEvents = childEventIds.map((id: number) => events.find((e: any) => e.eventId === String(id))).filter(Boolean);
                            const allEvents = isPercentageGraph
                                ? [...parentEvents, ...childEvents]
                                : Object.keys(eventPieCharts).map((id: string) => events.find((e: any) => String(e.eventId) === id)).filter(Boolean);

                            return (
                                <div className="mt-8 space-y-6 px-4">
                                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
                                            <PieChartIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">Event Distribution Analysis</h3>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                {isPercentageGraph
                                                    ? "POS, Platform, and Source breakdown for parent and child events"
                                                    : "Detailed POS, Platform, and Source breakdown for each selected event"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Parent Events Section (for percentage graphs) */}
                                    {isPercentageGraph && parentEvents.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="h-1 w-8 bg-gray-500 rounded-full" />
                                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Parent Events (Denominator)</h4>
                                            </div>
                                            <div className={cn("grid gap-4", parentEvents.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                                                {parentEvents.map((event: any) => {
                                                    const pieData = eventPieCharts[event.eventId];
                                                    if (!pieData) return null;

                                                    const platformData = pieData?.platform ? combinePieChartDuplicates(pieData.platform).map((item: any) => ({
                                                        ...item,
                                                        name: PLATFORMS.find(p => p.id === Number(item.name))?.name || item.name
                                                    })) : [];
                                                    const rawPosData = pieData?.pos ? combinePieChartDuplicates(pieData.pos) : [];
                                                    const posData = rawPosData.map((item: any) => ({
                                                        ...item,
                                                        name: getPOSName(item.name)
                                                    }));
                                                    const sourceData = pieData?.source ? combinePieChartDuplicates(pieData.source) : [];

                                                    const showPlatform = shouldShowPieChart(pieData?.platform);
                                                    const showPos = shouldShowPieChart(pieData?.pos);
                                                    const showSource = shouldShowPieChart(pieData?.source);

                                                    if (!showPlatform && !showPos && !showSource) return null;

                                                    // Single event: show all 3 pie charts side-by-side
                                                    if (parentEvents.length === 1) {
                                                        const availableCharts = [
                                                            { id: 'platform', label: 'Platform', data: platformData, show: showPlatform, color: 'indigo' },
                                                            { id: 'pos', label: 'POS', data: posData, show: showPos, color: 'emerald' },
                                                            { id: 'source', label: 'Source', data: sourceData, show: showSource, color: 'amber' }
                                                        ].filter(c => c.show);

                                                        return (
                                                            <Card key={event.eventId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                                                <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/30 border-b border-gray-100 dark:border-gray-700">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                                                        <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{event.eventName}</CardTitle>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent className="p-4">
                                                                    <div className={cn("grid gap-4", availableCharts.length === 3 ? "grid-cols-3" : availableCharts.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
                                                                        {availableCharts.map((chart) => {
                                                                            const totalVal = chart.data.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                            return (
                                                                                <div key={chart.id} className="space-y-3">
                                                                                    <div className="text-center">
                                                                                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{chart.label}</span>
                                                                                    </div>
                                                                                    <div
                                                                                        className="h-40 w-full cursor-pointer transition-transform duration-300 hover:scale-105 relative"
                                                                                        onClick={() => {
                                                                                            const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                            openExpandedPie(chart.id as any, `${event.eventName} - ${chart.label}`, dists, event.isApiEvent);
                                                                                        }}
                                                                                    >
                                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                                            <PieChart>
                                                                                                <Pie
                                                                                                    data={chart.data}
                                                                                                    cx="50%"
                                                                                                    cy="50%"
                                                                                                    innerRadius={45}
                                                                                                    outerRadius={70}
                                                                                                    paddingAngle={2}
                                                                                                    dataKey="value"
                                                                                                    isAnimationActive={false}
                                                                                                    stroke="none"
                                                                                                >
                                                                                                    {chart.data.map((_: any, idx: number) => (
                                                                                                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                                    ))}
                                                                                                </Pie>
                                                                                                <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={chart.label} />} />
                                                                                            </PieChart>
                                                                                        </ResponsiveContainer>
                                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                                            <span className="text-xl font-black text-foreground tabular-nums">
                                                                                                {formatNumber(totalVal)}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="space-y-1 px-1">
                                                                                        {[...chart.data]
                                                                                            .sort((a: any, b: any) => b.value - a.value)
                                                                                            .slice(0, 2)
                                                                                            .map((item: any, idx: number) => {
                                                                                                const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                                return (
                                                                                                    <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
                                                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                            <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                                        </div>
                                                                                                        <span className="text-indigo-500">{percentage.toFixed(0)}%</span>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    }

                                                    // Multiple events: show tabbed interface
                                                    const defaultMode = (posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source';
                                                    const activeMode = eventDistModes[event.eventId] || defaultMode;
                                                    const dists = { platform: platformData, pos: posData, source: sourceData };

                                                    return (
                                                        <Card key={event.eventId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/30 border-b border-gray-100 dark:border-gray-700">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                                                        <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{event.eventName}</CardTitle>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700/40 rounded-full"
                                                                        onClick={() => {
                                                                            const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                            openExpandedPie(activeMode, `${event.eventName} - ${activeMode.toUpperCase()}`, dists, event.isApiEvent);
                                                                        }}
                                                                    >
                                                                        <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-400" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="p-4">
                                                                {/* Distribution Mode Toggle */}
                                                                <div className="flex items-center justify-center p-1 mb-4 bg-muted/60 dark:bg-slate-800/60 rounded-xl border border-border/50 shadow-sm">
                                                                    {[
                                                                        { id: 'platform', label: 'Platform', show: shouldShowPieChart(pieData?.platform), color: 'indigo' },
                                                                        { id: 'pos', label: 'POS', show: shouldShowPieChart(pieData?.pos), color: 'emerald' },
                                                                        { id: 'source', label: 'Source', show: shouldShowPieChart(pieData?.source), color: 'amber' }
                                                                    ].filter(t => t.show).map((tab) => {
                                                                        const activeModeInner = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                        const isActive = activeModeInner === tab.id;
                                                                        const dataLength = (tab.id === 'platform' ? platformData : tab.id === 'pos' ? posData : sourceData).length;

                                                                        return (
                                                                            <button
                                                                                key={tab.id}
                                                                                onClick={() => setEventDistModes(prev => ({ ...prev, [event.eventId]: tab.id as any }))}
                                                                                className={cn(
                                                                                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-300",
                                                                                    isActive
                                                                                        ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-md border border-${tab.color}-100 dark:border-${tab.color}-900/50`
                                                                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                                                )}
                                                                            >
                                                                                {tab.label}
                                                                                {dataLength > 1 && (
                                                                                    <span className={cn(
                                                                                        "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                                        isActive ? `bg-${tab.color}-500` : "bg-slate-300 dark:bg-slate-600"
                                                                                    )} />
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Large Pie Chart View */}
                                                                <div className="relative group">
                                                                    {(() => {
                                                                        const activeModeInner = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                        const activeData = activeModeInner === 'platform' ? platformData : activeModeInner === 'pos' ? posData : sourceData;
                                                                        const totalVal = activeData.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                        const categoryLabel = activeModeInner === 'platform' ? 'Platform' : activeModeInner === 'pos' ? 'POS Site' : 'Source';

                                                                        return (
                                                                            <div className="space-y-4">
                                                                                <div
                                                                                    className="h-44 w-full cursor-pointer transition-transform duration-300 group-hover:scale-105 relative"
                                                                                    onClick={() => {
                                                                                        const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                        openExpandedPie(activeModeInner, `${event.eventName} - ${activeModeInner.toUpperCase()}`, dists, event.isApiEvent);
                                                                                    }}
                                                                                >
                                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                                        <PieChart>
                                                                                            <Pie
                                                                                                data={activeData}
                                                                                                cx="50%"
                                                                                                cy="50%"
                                                                                                innerRadius={55}
                                                                                                outerRadius={85}
                                                                                                paddingAngle={2}
                                                                                                dataKey="value"
                                                                                                isAnimationActive={false}
                                                                                                stroke="none"
                                                                                            >
                                                                                                {activeData.map((_: any, idx: number) => (
                                                                                                    <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                                ))}
                                                                                            </Pie>
                                                                                            <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={categoryLabel} />} />
                                                                                        </PieChart>
                                                                                    </ResponsiveContainer>

                                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{activeModeInner}</span>
                                                                                        <span className="text-2xl font-black text-foreground tabular-nums">
                                                                                            {formatNumber(totalVal)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Persistent Legend - Top 3 by Percentage Share */}
                                                                                <div className="space-y-1.5 px-2">
                                                                                    {[...activeData]
                                                                                        .sort((a: any, b: any) => b.value - a.value)
                                                                                        .slice(0, 3)
                                                                                        .map((item: any, idx: number) => {
                                                                                            const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                            return (
                                                                                                <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                        <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-2 tabular-nums">
                                                                                                        <span className="text-foreground">{formatNumber(item.value)}</span>
                                                                                                        <span className="text-indigo-500 w-10 text-right">{percentage.toFixed(1)}%</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                    }

                                    {/* Child Events Section (for percentage graphs) */}
                                    {isPercentageGraph && childEvents.length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="h-1 w-8 bg-green-500 rounded-full" />
                                                <h4 className="text-sm font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">Child Events (Numerator)</h4>
                                            </div>

                                            {(() => {
                                                const uniqueChildEvents = childEvents.filter((childEvent: any) =>
                                                    !parentEvents.some((parentEvent: any) => parentEvent.eventId === childEvent.eventId)
                                                );

                                                if (uniqueChildEvents.length === 0 && childEvents.length > 0) {
                                                    return (
                                                        <div className="p-4 rounded-xl border border-dashed border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 text-center">
                                                            <p className="text-sm text-muted-foreground">
                                                                Child events are identical to parent events and are displayed above.
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                // Use uniqueChildEvents.length for single event check (same as parent events logic)
                                                // This ensures we show all 3 charts when there's only one unique child event
                                                const isSingleChildEvent = uniqueChildEvents.length === 1;

                                                return (
                                                    <div className={cn("grid gap-4", isSingleChildEvent ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                                                        {uniqueChildEvents.map((event: any) => {
                                                            const pieData = eventPieCharts[event.eventId];
                                                            if (!pieData) return null;

                                                            const platformData = pieData?.platform ? combinePieChartDuplicates(pieData.platform).map((item: any) => ({
                                                                ...item,
                                                                name: PLATFORMS.find(p => p.id === Number(item.name))?.name || item.name
                                                            })) : [];
                                                            const rawPosData = pieData?.pos ? combinePieChartDuplicates(pieData.pos) : [];
                                                            const posData = rawPosData.map((item: any) => ({
                                                                ...item,
                                                                name: getPOSName(item.name)
                                                            }));
                                                            const sourceData = pieData?.source ? combinePieChartDuplicates(pieData.source) : [];

                                                            const showPlatform = shouldShowPieChart(pieData?.platform);
                                                            const showPos = shouldShowPieChart(pieData?.pos);
                                                            const showSource = shouldShowPieChart(pieData?.source);

                                                            if (!showPlatform && !showPos && !showSource) return null;

                                                            // Single child event: show all 3 pie charts side-by-side (same logic as parent events)
                                                            if (isSingleChildEvent) {
                                                                const availableCharts = [
                                                                    { id: 'platform', label: 'Platform', data: platformData, show: showPlatform, color: 'indigo' },
                                                                    { id: 'pos', label: 'POS', data: posData, show: showPos, color: 'emerald' },
                                                                    { id: 'source', label: 'Source', data: sourceData, show: showSource, color: 'amber' }
                                                                ].filter(c => c.show);

                                                                return (
                                                                    <Card key={event.eventId} className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden shadow-sm">
                                                                        <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-b border-green-100 dark:border-green-800">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2.5">
                                                                                    <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: event.color }} />
                                                                                    <CardTitle className="text-sm font-bold text-green-700 dark:text-green-300 truncate">{event.eventName}</CardTitle>
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 flex-shrink-0 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full"
                                                                                    onClick={() => {
                                                                                        const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                        openExpandedPie('platform', `${event.eventName} - Distribution`, dists, (event as any).isApiEvent);
                                                                                    }}
                                                                                >
                                                                                    <Maximize2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                                </Button>
                                                                            </div>
                                                                        </CardHeader>
                                                                        <CardContent className="p-4">
                                                                            <div className={cn("grid gap-4", availableCharts.length === 3 ? "grid-cols-3" : availableCharts.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
                                                                                {availableCharts.map((chart) => {
                                                                                    const totalVal = chart.data.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                                    return (
                                                                                        <div key={chart.id} className="space-y-3">
                                                                                            <div className="text-center">
                                                                                                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{chart.label}</span>
                                                                                            </div>
                                                                                            <div
                                                                                                className="h-40 w-full cursor-pointer transition-transform duration-300 hover:scale-105 relative"
                                                                                                onClick={() => {
                                                                                                    const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                                    openExpandedPie(chart.id as any, `${event.eventName} - ${chart.label}`, dists, (event as any).isApiEvent);
                                                                                                }}
                                                                                            >
                                                                                                <ResponsiveContainer width="100%" height="100%">
                                                                                                    <PieChart>
                                                                                                        <Pie
                                                                                                            data={chart.data}
                                                                                                            cx="50%"
                                                                                                            cy="50%"
                                                                                                            innerRadius={45}
                                                                                                            outerRadius={70}
                                                                                                            paddingAngle={2}
                                                                                                            dataKey="value"
                                                                                                            isAnimationActive={false}
                                                                                                            stroke="none"
                                                                                                        >
                                                                                                            {chart.data.map((_: any, idx: number) => (
                                                                                                                <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                                            ))}
                                                                                                        </Pie>
                                                                                                        <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={chart.label} />} />
                                                                                                    </PieChart>
                                                                                                </ResponsiveContainer>
                                                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                                                    <span className="text-xl font-black text-foreground tabular-nums">
                                                                                                        {formatNumber(totalVal)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-1 px-1">
                                                                                                {[...chart.data]
                                                                                                    .sort((a: any, b: any) => b.value - a.value)
                                                                                                    .slice(0, 2)
                                                                                                    .map((item: any, idx: number) => {
                                                                                                        const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                                        return (
                                                                                                            <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
                                                                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                                    <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                                                </div>
                                                                                                                <span className="text-indigo-500">{percentage.toFixed(0)}%</span>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                );
                                                            }

                                                            // Multiple child events: show tabbed interface
                                                            const defaultMode = (posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source';
                                                            const activeMode = eventDistModes[event.eventId] || defaultMode;

                                                            return (
                                                                <Card key={event.eventId} className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                                    <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-b border-green-100 dark:border-green-800">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                                <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: event.color }} />
                                                                                <CardTitle className="text-sm font-bold text-green-700 dark:text-green-300 truncate">{event.eventName}</CardTitle>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 flex-shrink-0 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full"
                                                                                onClick={() => {
                                                                                    const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                    openExpandedPie(activeMode, `${event.eventName} - ${activeMode.toUpperCase()}`, dists, (event as any).isApiEvent);
                                                                                }}
                                                                            >
                                                                                <Maximize2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                                            </Button>
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardContent className="p-4">
                                                                        {/* Distribution Mode Toggle */}
                                                                        <div className="flex items-center justify-center p-1 mb-4 bg-muted/60 dark:bg-slate-800/60 rounded-xl border border-border/50 shadow-sm">
                                                                            {[
                                                                                { id: 'platform', label: 'Platform', show: shouldShowPieChart(pieData?.platform), color: 'indigo' },
                                                                                { id: 'pos', label: 'POS', show: shouldShowPieChart(pieData?.pos), color: 'emerald' },
                                                                                { id: 'source', label: 'Source', show: shouldShowPieChart(pieData?.source), color: 'amber' }
                                                                            ].filter(t => t.show).map((tab) => {
                                                                                const activeModeInner = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                                const isActive = activeModeInner === tab.id;
                                                                                const dataLength = (tab.id === 'platform' ? platformData : tab.id === 'pos' ? posData : sourceData).length;

                                                                                return (
                                                                                    <button
                                                                                        key={tab.id}
                                                                                        onClick={() => setEventDistModes(prev => ({ ...prev, [event.eventId]: tab.id as any }))}
                                                                                        className={cn(
                                                                                            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-300",
                                                                                            isActive
                                                                                                ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-md border border-${tab.color}-100 dark:border-${tab.color}-900/50`
                                                                                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                                                        )}
                                                                                    >
                                                                                        {tab.label}
                                                                                        {dataLength > 1 && (
                                                                                            <span className={cn(
                                                                                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                                                isActive ? `bg-${tab.color}-500` : "bg-slate-300 dark:bg-slate-600"
                                                                                            )} />
                                                                                        )}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Large Pie Chart View */}
                                                                        <div className="relative group">
                                                                            {(() => {
                                                                                const activeModeInner = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                                const activeData = activeModeInner === 'platform' ? platformData : activeModeInner === 'pos' ? posData : sourceData;
                                                                                const totalVal = activeData.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                                const categoryLabel = activeModeInner === 'platform' ? 'Platform' : activeModeInner === 'pos' ? 'POS Site' : 'Source';

                                                                                return (
                                                                                    <div className="space-y-4">
                                                                                        <div
                                                                                            className="h-44 w-full cursor-pointer transition-transform duration-300 group-hover:scale-105 relative"
                                                                                            onClick={() => {
                                                                                                const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                                openExpandedPie(activeModeInner, `${event.eventName} - ${activeModeInner.toUpperCase()}`, dists, event.isApiEvent);
                                                                                            }}
                                                                                        >
                                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                                <PieChart>
                                                                                                    <Pie
                                                                                                        data={activeData}
                                                                                                        cx="50%"
                                                                                                        cy="50%"
                                                                                                        innerRadius={55}
                                                                                                        outerRadius={85}
                                                                                                        paddingAngle={2}
                                                                                                        dataKey="value"
                                                                                                        isAnimationActive={false}
                                                                                                        stroke="none"
                                                                                                    >
                                                                                                        {activeData.map((_: any, idx: number) => (
                                                                                                            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                                        ))}
                                                                                                    </Pie>
                                                                                                    <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={categoryLabel} />} />
                                                                                                </PieChart>
                                                                                            </ResponsiveContainer>

                                                                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{activeModeInner}</span>
                                                                                                <span className="text-2xl font-black text-foreground tabular-nums">
                                                                                                    {formatNumber(totalVal)}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Persistent Legend - Top 3 by Percentage Share */}
                                                                                        <div className="space-y-1.5 px-2">
                                                                                            {[...activeData]
                                                                                                .sort((a: any, b: any) => b.value - a.value)
                                                                                                .slice(0, 3)
                                                                                                .map((item: any, idx: number) => {
                                                                                                    const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                                    return (
                                                                                                        <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                                <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                                            </div>
                                                                                                            <div className="flex items-center gap-2 tabular-nums">
                                                                                                                <span className="text-foreground">{formatNumber(item.value)}</span>
                                                                                                                <span className="text-indigo-500 w-10 text-right">{percentage.toFixed(1)}%</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            );
                                                        })}
                                                    </div>);
                                            })()}
                                        </div>
                                    )
                                    }

                                    {/* Regular Events Section (for non-percentage graphs) */}
                                    {!isPercentageGraph && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {allEvents.map((event: any) => {
                                                const pieData = eventPieCharts[event.eventId];
                                                if (!pieData) return null;

                                                const platformData = pieData?.platform ? combinePieChartDuplicates(pieData.platform).map((item: any) => ({
                                                    ...item,
                                                    name: PLATFORMS.find(p => p.id === Number(item.name))?.name || item.name
                                                })) : [];
                                                const rawPosData = pieData?.pos ? combinePieChartDuplicates(pieData.pos) : [];
                                                const posData = rawPosData.map((item: any) => ({
                                                    ...item,
                                                    name: getPOSName(item.name)
                                                }));
                                                const sourceData = pieData?.source ? combinePieChartDuplicates(pieData.source) : [];

                                                const showPlatform = shouldShowPieChart(pieData?.platform) && platformData.length > 1;
                                                const showPos = shouldShowPieChart(pieData?.pos) && posData.length > 1;
                                                const showSource = shouldShowPieChart(pieData?.source) && sourceData.length > 1;

                                                if (!showPlatform && !showPos && !showSource) return null;

                                                return (
                                                    <Card key={event.eventId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                        <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/30 border-b border-gray-100 dark:border-gray-700">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                    <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: event.color }} />
                                                                    <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{event.eventName}</CardTitle>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700/40 rounded-full"
                                                                    onClick={() => {
                                                                        const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                        const mode = eventDistModes[event.eventId] || (showPlatform ? 'platform' : showPos ? 'pos' : 'source');
                                                                        openExpandedPie(mode, `${event.eventName} - ${mode.toUpperCase()}`, dists, (event as any).isApiEvent);
                                                                    }}
                                                                >
                                                                    <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-400" />
                                                                </Button>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-4">
                                                            {/* Distribution Mode Toggle */}
                                                            <div className="flex items-center justify-center p-1 mb-4 bg-muted/60 dark:bg-slate-800/60 rounded-xl border border-border/50 shadow-sm">
                                                                {[
                                                                    { id: 'platform', label: 'Platform', show: shouldShowPieChart(pieData?.platform), color: 'indigo' },
                                                                    { id: 'pos', label: 'POS', show: shouldShowPieChart(pieData?.pos), color: 'emerald' },
                                                                    { id: 'source', label: 'Source', show: shouldShowPieChart(pieData?.source), color: 'amber' }
                                                                ].filter(t => t.show).map((tab) => {
                                                                    const activeMode = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                    const isActive = activeMode === tab.id;
                                                                    const dataLength = (tab.id === 'platform' ? platformData : tab.id === 'pos' ? posData : sourceData).length;

                                                                    return (
                                                                        <button
                                                                            key={tab.id}
                                                                            onClick={() => setEventDistModes(prev => ({ ...prev, [event.eventId]: tab.id as any }))}
                                                                            className={cn(
                                                                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-300",
                                                                                isActive
                                                                                    ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-md border border-${tab.color}-100 dark:border-${tab.color}-900/50`
                                                                                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                                            )}
                                                                        >
                                                                            {tab.label}
                                                                            {dataLength > 1 && (
                                                                                <span className={cn(
                                                                                    "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                                    isActive ? `bg-${tab.color}-500` : "bg-slate-300 dark:bg-slate-600"
                                                                                )} />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Large Pie Chart View */}
                                                            <div className="relative group">
                                                                {(() => {
                                                                    const activeMode = eventDistModes[event.eventId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                    const activeData = activeMode === 'platform' ? platformData : activeMode === 'pos' ? posData : sourceData;
                                                                    const totalVal = activeData.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                    const categoryLabel = activeMode === 'platform' ? 'Platform' : activeMode === 'pos' ? 'POS Site' : 'Source';

                                                                    return (
                                                                        <div className="space-y-4">
                                                                            <div
                                                                                className="h-44 w-full cursor-pointer transition-transform duration-300 group-hover:scale-105 relative"
                                                                                onClick={() => {
                                                                                    const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                    openExpandedPie(activeMode, `${event.eventName} - ${activeMode.toUpperCase()}`, dists, (event as any).isApiEvent);
                                                                                }}
                                                                            >
                                                                                <ResponsiveContainer width="100%" height="100%">
                                                                                    <PieChart>
                                                                                        <Pie
                                                                                            data={activeData}
                                                                                            cx="50%"
                                                                                            cy="50%"
                                                                                            innerRadius={55}
                                                                                            outerRadius={85}
                                                                                            paddingAngle={2}
                                                                                            dataKey="value"
                                                                                            isAnimationActive={false}
                                                                                            stroke="none"
                                                                                        >
                                                                                            {activeData.map((_: any, idx: number) => (
                                                                                                <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                            ))}
                                                                                        </Pie>
                                                                                        <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={categoryLabel} />} />
                                                                                    </PieChart>
                                                                                </ResponsiveContainer>

                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{activeMode}</span>
                                                                                    <span className="text-2xl font-black text-foreground tabular-nums">
                                                                                        {formatNumber(totalVal)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Persistent Legend - Top 3 by Percentage Share */}
                                                                            <div className="space-y-1.5 px-2">
                                                                                {[...activeData]
                                                                                    .sort((a: any, b: any) => b.value - a.value)
                                                                                    .slice(0, 3)
                                                                                    .map((item: any, idx: number) => {
                                                                                        const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                        return (
                                                                                            <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                    <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 tabular-nums">
                                                                                                    <span className="text-foreground">{formatNumber(item.value)}</span>
                                                                                                    <span className="text-indigo-500 w-10 text-right">{percentage.toFixed(1)}%</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Job ID Pie Charts */}
                        {(() => {
                            const panelData = panelsDataMap.get(panel.panelId);
                            const jobIdPieCharts = panelData?.jobIdPieCharts;
                            const panelConfig = (panel as any)?.filterConfig;

                            const showJobIdPieCharts = (currentPanelFilters.showJobIdPieCharts ?? panelConfig?.showJobIdPieCharts);
                            if (!showJobIdPieCharts || !jobIdPieCharts || Object.keys(jobIdPieCharts).length === 0) return null;

                            const selectedJobIds = currentPanelFilters.sourceStrs || panelConfig?.sourceStr || [];

                            return (
                                <div className="mt-8 space-y-6 px-4">
                                    <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
                                            <PieChartIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">Job ID Distribution Analysis</h3>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                Detailed POS, Platform, and Source breakdown for each selected job ID
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {selectedJobIds.map((jobId: string) => {
                                            const pieData = jobIdPieCharts[jobId];
                                            if (!pieData) return null;

                                            const apiData = pieData?.data || pieData;
                                            const platformData = apiData?.platform ? combinePieChartDuplicates(apiData.platform).map((item: any) => ({
                                                ...item,
                                                name: PLATFORMS.find(p => p.id === Number(item.name))?.name || item.name
                                            })) : [];
                                            const rawPosData = apiData?.pos ? combinePieChartDuplicates(apiData.pos) : [];
                                            const posData = rawPosData.map((item: any) => ({
                                                ...item,
                                                name: getPOSName(item.name)
                                            }));
                                            const sourceData = apiData?.source ? combinePieChartDuplicates(apiData.source) : [];

                                            const showPlatform = shouldShowPieChart(platformData) && platformData.length > 1;
                                            const showPos = shouldShowPieChart(posData) && posData.length > 1;
                                            const showSource = shouldShowPieChart(sourceData) && sourceData.length > 1;

                                            if (!showPlatform && !showPos && !showSource) return null;

                                            return (
                                                <Card key={jobId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                    <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/30 border-b border-gray-100 dark:border-gray-700">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                <div className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse bg-gray-500" />
                                                                <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{jobId}</CardTitle>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700/40 rounded-full"
                                                                onClick={() => {
                                                                    const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                    const mode = jobIdDistModes[jobId] || (showPlatform ? 'platform' : showPos ? 'pos' : 'source');
                                                                    openExpandedPie(mode, `${jobId} - ${mode.toUpperCase()}`, dists, false);
                                                                }}
                                                            >
                                                                <Maximize2 className="h-4 w-4 text-gray-700 dark:text-gray-400" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4">
                                                        {/* Distribution Mode Toggle */}
                                                        <div className="flex items-center justify-center p-1 mb-4 bg-muted/60 dark:bg-slate-800/60 rounded-xl border border-border/50 shadow-sm">
                                                            {[
                                                                { id: 'platform', label: 'Platform', show: shouldShowPieChart(platformData), color: 'indigo' },
                                                                { id: 'pos', label: 'POS', show: shouldShowPieChart(posData), color: 'emerald' },
                                                                { id: 'source', label: 'Source', show: shouldShowPieChart(sourceData), color: 'amber' }
                                                            ].filter(t => t.show).map((tab) => {
                                                                const activeMode = jobIdDistModes[jobId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                const isActive = activeMode === tab.id;
                                                                const dataLength = (tab.id === 'platform' ? platformData : tab.id === 'pos' ? posData : sourceData).length;

                                                                return (
                                                                    <button
                                                                        key={tab.id}
                                                                        onClick={() => setJobIdDistModes(prev => ({ ...prev, [jobId]: tab.id as any }))}
                                                                        className={cn(
                                                                            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-300",
                                                                            isActive
                                                                                ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-md border border-${tab.color}-100 dark:border-${tab.color}-900/50`
                                                                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        {tab.label}
                                                                        {dataLength > 1 && (
                                                                            <span className={cn(
                                                                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                                isActive ? `bg-${tab.color}-500` : "bg-slate-300 dark:bg-slate-600"
                                                                            )} />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Large Pie Chart View */}
                                                        <div className="relative group">
                                                            {(() => {
                                                                const activeMode = jobIdDistModes[jobId] || ((posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source');
                                                                const activeData = activeMode === 'platform' ? platformData : activeMode === 'pos' ? posData : sourceData;
                                                                const totalVal = activeData.reduce((acc: number, item: any) => acc + item.value, 0);
                                                                const categoryLabel = activeMode === 'platform' ? 'Platform' : activeMode === 'pos' ? 'POS Site' : 'Source';

                                                                return (
                                                                    <div className="space-y-4">
                                                                        <div
                                                                            className="h-44 w-full cursor-pointer transition-transform duration-300 group-hover:scale-105 relative"
                                                                            onClick={() => {
                                                                                const dists = { platform: platformData, pos: posData, source: sourceData };
                                                                                openExpandedPie(activeMode, `${jobId} - ${activeMode.toUpperCase()}`, dists, false);
                                                                            }}
                                                                        >
                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                <PieChart>
                                                                                    <Pie
                                                                                        data={activeData}
                                                                                        cx="50%"
                                                                                        cy="50%"
                                                                                        innerRadius={55}
                                                                                        outerRadius={85}
                                                                                        paddingAngle={2}
                                                                                        dataKey="value"
                                                                                        isAnimationActive={false}
                                                                                        stroke="none"
                                                                                    >
                                                                                        {activeData.map((_: any, idx: number) => (
                                                                                            <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                                        ))}
                                                                                    </Pie>
                                                                                    <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={categoryLabel} />} />
                                                                                </PieChart>
                                                                            </ResponsiveContainer>

                                                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{activeMode}</span>
                                                                                <span className="text-2xl font-black text-foreground tabular-nums">
                                                                                    {formatNumber(totalVal)}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Persistent Legend - Top 3 by Percentage Share */}
                                                                        <div className="space-y-1.5 px-2">
                                                                            {[...activeData]
                                                                                .sort((a: any, b: any) => b.value - a.value)
                                                                                .slice(0, 3)
                                                                                .map((item: any, idx: number) => {
                                                                                    const percentage = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
                                                                                    return (
                                                                                        <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                                                                <span className="truncate text-muted-foreground">{item.name}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2 tabular-nums">
                                                                                                <span className="text-foreground">{formatNumber(item.value)}</span>
                                                                                                <span className="text-indigo-500 w-10 text-right">{percentage.toFixed(1)}%</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {isHourly && filteredGraphData.length > 0 && panelConfig?.showHourlyStats !== false && panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (
                            <div>
                                <HourlyStatsCard graphData={filteredGraphData} isHourly={isHourly} eventKeys={pEventKeys} events={events} />
                            </div>
                        )}
                    </div >
                );
            })}

            {/* Dashboard Chatbots for each panel */}
            {profile.panels.slice(1).map((panel: any) => {
                if (activePanelIndex !== profile.panels.indexOf(panel)) return null;

                const panelData = panelsDataMap.get(panel.panelId);
                const currentPanelFilters = panelFiltersState?.[panel.panelId] || panelData?.filters || {};
                const currentPanelDateRange = panelDateRanges?.[panel.panelId] || dateRange;
                const filteredGraphData = panelData?.graphData || [];

                return (
                    <DashboardChatbot
                        key={panel.panelId}
                        isOpen={chatbotOpen[panel.panelId] || false}
                        onClose={() => setChatbotOpen(prev => ({
                            ...prev,
                            [panel.panelId]: false
                        }))}
                        context={{
                            currentFilters: currentPanelFilters,
                            currentDateRange: currentPanelDateRange,
                            availableOptions: {
                                platforms: PLATFORMS.map(p => ({ id: p.id, name: p.name })),
                                pos: siteDetails.map((s: any) => ({ id: s.id, name: s.name })),
                                sources: (SOURCES as Array<{ id: number; name: string }>).map((s) => s.name),
                                events: events
                                    .filter((e: any) => !e.isApiEvent)
                                    .map((e: any) => ({ id: parseInt(e.eventId), name: e.eventName || getEventDisplayName(e) }))
                            },
                            panelName: panel.panelName || panel.panelId,
                            graphData: filteredGraphData,
                            metricType: (panel as any)?.filterConfig?.graphType === 'percentage'
                                ? 'percentage'
                                : (panel as any)?.filterConfig?.graphType === 'funnel'
                                    ? 'funnel'
                                    : 'count',
                            panelGraphType: (panel as any)?.filterConfig?.graphType,
                            panelGraphConfig: {
                                percentageConfig: (panel as any)?.filterConfig?.percentageConfig,
                                funnelConfig: (panel as any)?.filterConfig?.funnelConfig,
                                userFlowConfig: (panel as any)?.filterConfig?.userFlowConfig,
                            }
                        }}
                        featureId={profile?.featureId}
                        onUpdateFilters={(filters) => {
                            // Apply filter updates from chatbot
                            const currentFilters = currentPanelFilters || {
                                platforms: [],
                                pos: [],
                                sources: [],
                                events: []
                            };

                            const allowedEventIds = new Set(
                                (events || [])
                                    .filter((e: any) => !e.isApiEvent)
                                    .map((e: any) => Number(parseInt(e.eventId)))
                                    .filter((n: number) => !isNaN(n))
                            );

                            const toNumberArray = (value: any): number[] => {
                                if (!Array.isArray(value)) return [];
                                return value.map((v: any) => Number(v)).filter((n: number) => !isNaN(n));
                            };

                            const clampEvents = (value: any): number[] => {
                                return toNumberArray(value).filter((id) => allowedEventIds.has(id));
                            };

                            const mergedFilters: FilterState = {
                                platforms: filters.platforms !== undefined ? toNumberArray(filters.platforms) : toNumberArray(currentFilters.platforms),
                                pos: filters.pos !== undefined ? toNumberArray(filters.pos) : toNumberArray(currentFilters.pos),
                                sources: filters.sources !== undefined ? toNumberArray(filters.sources) : toNumberArray(currentFilters.sources),
                                events: filters.events !== undefined ? clampEvents(filters.events) : toNumberArray(currentFilters.events),
                            };

                            let overridePanel: any | undefined = undefined;

                            if (filters.graphType || filters.percentageConfig || filters.funnelConfig || filters.userFlowConfig) {
                                const panelToUpdate = panel;
                                if (panelToUpdate) {
                                    overridePanel = JSON.parse(JSON.stringify(panelToUpdate));
                                    if (!overridePanel.filterConfig) overridePanel.filterConfig = {};

                                    if (filters.graphType) {
                                        overridePanel.filterConfig.graphType = filters.graphType;
                                    }

                                    if (filters.percentageConfig) {
                                        overridePanel.filterConfig.percentageConfig = {
                                            ...overridePanel.filterConfig.percentageConfig,
                                            parentEvents: clampEvents(filters.percentageConfig.parentEvents).map(String),
                                            childEvents: clampEvents(filters.percentageConfig.childEvents).map(String)
                                        };
                                    }

                                    if (filters.funnelConfig) {
                                        overridePanel.filterConfig.funnelConfig = {
                                            ...overridePanel.filterConfig.funnelConfig,
                                            stages: (Array.isArray(filters.funnelConfig.stages) ? filters.funnelConfig.stages : [])
                                                .map((s: any) => Number(s?.eventId))
                                                .filter((id: number) => !isNaN(id) && allowedEventIds.has(id))
                                                .map((id: number) => ({ eventId: String(id) })),
                                            multipleChildEvents: clampEvents(filters.funnelConfig.multipleChildEvents).map(String)
                                        };
                                    }

                                    if (filters.userFlowConfig) {
                                        overridePanel.filterConfig.userFlowConfig = {
                                            ...overridePanel.filterConfig.userFlowConfig,
                                            stages: (Array.isArray(filters.userFlowConfig.stages) ? filters.userFlowConfig.stages : [])
                                                .map((s: any, idx: number) => ({
                                                    id: `stage-${Date.now()}-${idx}`,
                                                    label: String(s?.label || `Step ${idx + 1}`),
                                                    eventIds: clampEvents(s?.eventIds).map(String)
                                                }))
                                        };
                                    }

                                    setProfile((prev: any) => {
                                        if (!prev) return prev;
                                        return {
                                            ...prev,
                                            panels: prev.panels.map((p: any) => p.panelId === panel.panelId ? overridePanel : p)
                                        };
                                    });
                                }
                            }

                            if (filters.platforms !== undefined) {
                                updatePanelFilter?.(panel.panelId, 'platforms', mergedFilters.platforms);
                            }
                            if (filters.pos !== undefined) {
                                updatePanelFilter?.(panel.panelId, 'pos', mergedFilters.pos);
                            }
                            if (filters.sources !== undefined) {
                                updatePanelFilter?.(panel.panelId, 'sources', mergedFilters.sources);
                            }
                            if (filters.events !== undefined) {
                                updatePanelFilter?.(panel.panelId, 'events', mergedFilters.events);
                            }

                            const overrideDateRange = filters?.dateRange?.from && filters?.dateRange?.to
                                ? { from: new Date(filters.dateRange.from), to: new Date(filters.dateRange.to) }
                                : undefined;

                            if (overrideDateRange) {
                                updatePanelDateRange?.(panel.panelId, overrideDateRange.from, overrideDateRange.to);
                            }

                            setTimeout(() => {
                                handlePanelRefresh?.(panel.panelId, { filters: mergedFilters, dateRange: overrideDateRange, panel: overridePanel });
                            }, 0);
                        }}
                    />
                );
            })}
        </>
    );
});
