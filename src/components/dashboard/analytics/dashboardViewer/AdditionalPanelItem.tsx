import React, { Fragment, useMemo } from 'react';
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
    Percent,
    RefreshCw,
    Target,
    TrendingUp,
    Zap,
    X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InteractiveButton } from '@/components/ui/interactive-button';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { format } from 'date-fns';
import { getPOSName } from '@/lib/posMapping';
import { getEventDisplayName } from '@/hooks/useEventName';
import { PLATFORMS, SOURCES } from '@/services/apiService';
import { AnimatedNumber } from './AnimatedNumber';
import { CollapsibleLegend } from './CollapsibleLegend';
import { CustomTooltip } from './CustomTooltip';
import { PieTooltip } from './PieTooltip';
import { EVENT_COLORS, PIE_COLORS, ERROR_COLORS, combinePieChartDuplicates, shouldShowPieChart } from './constants';
import { PercentageGraph } from '../charts/PercentageGraph';
import { FunnelGraph } from '../charts/FunnelGraph';
import { UserFlowVisualization } from '../charts/UserFlowVisualization';
import { DayWiseComparisonChart } from '../components/ComparisonCharts';
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

interface AdditionalPanelItemProps {
    panel: any;
    panelIndex: number;
    panelData: any;
    currentPanelFilters: any;
    currentPanelDateRange: any;
    isPanelLoading: boolean;
    panelConfig: any;
    // Callbacks and other props
    panelFiltersCollapsed: any;
    setPanelFiltersCollapsed: any;
    panelFilterChanges: any;
    handlePanelRefresh: any;
    setProfile: any;
    profile: any;
    setPanelFiltersState: any;
    setPanelFilterChanges: any;
    updatePanelDateRange: any;
    updatePanelFilter: any;
    hourlyOverride: 'hourly' | 'daily' | 'default';
    setHourlyOverride: any;
    events: any[];
    siteDetails: any[];
    panelAvailableStatusCodes: any;
    panelAvailableCacheStatuses: any;
    panelApiMetricView: any;
    setPanelApiMetricView: any;
    openExpandedPie: any;
    panelChartType: any;
    setPanelChartType: any;
    panelLegendExpanded: any;
    togglePanelLegend: any;
    panelSelectedEventKey: any;
    handlePanelEventClick: any;
    panelPinnedTooltips: any;
    setPanelPinnedTooltips: any;
    CustomXAxisTick: any;
    dateRange: any;
    HourlyStatsCard: any;
    isHourly: boolean; // Prop from parent
}

// Optimized helper for filtering (moved outside component to avoid recreation)
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

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

export const AdditionalPanelItem = React.memo(({
    panel,
    panelIndex,
    panelData,
    currentPanelFilters,
    currentPanelDateRange,
    isPanelLoading,
    panelConfig,
    panelFiltersCollapsed,
    setPanelFiltersCollapsed,
    panelFilterChanges,
    handlePanelRefresh,
    setProfile,
    profile,
    setPanelFiltersState,
    setPanelFilterChanges,
    updatePanelDateRange,
    updatePanelFilter,
    hourlyOverride,
    setHourlyOverride,
    events,
    siteDetails,
    panelAvailableStatusCodes,
    panelAvailableCacheStatuses,
    panelApiMetricView,
    setPanelApiMetricView,
    openExpandedPie,
    panelChartType,
    setPanelChartType,
    panelLegendExpanded,
    togglePanelLegend,
    panelSelectedEventKey,
    handlePanelEventClick,
    panelPinnedTooltips,
    setPanelPinnedTooltips,
    CustomXAxisTick,
    dateRange,
    HourlyStatsCard,
    isHourly,
}: AdditionalPanelItemProps) => {
    const { t: themeClasses } = useAccentTheme();

    const eventColors = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => { map[String(e.eventId)] = e.color; });
        return map;
    }, [events]);

    const eventNames = useMemo(() => {
        const map: Record<string, string> = {};
        (events || []).forEach((e: any) => { map[String(e.eventId)] = getEventDisplayName(e); });
        return map;
    }, [events]);

    // Memoize event config lookup
    const eventConfigMap = useMemo(() => {
        const map = new Map<string, any>();
        (events || []).forEach((e: any) => map.set(String(e.eventId), e));
        return map;
    }, [events]);

    const rawPanelGraphData = panelData?.graphData || [];
    const pEventKeys = panelData?.eventKeys || [];
    const pPieData = panelData?.pieChartData;

    const panelGraphType = panelConfig?.graphType || 'line';
    const isUserFlowGraph = panelGraphType === 'user_flow';

    const filteredGraphData = useMemo(() => applyApiFiltering(
        rawPanelGraphData,
        panelConfig,
        currentPanelFilters,
        pEventKeys,
        panelGraphType === 'percentage' || panelGraphType === 'funnel' ? 'percentage' : 'regular'
    ), [rawPanelGraphData, panelConfig, currentPanelFilters, pEventKeys, panelGraphType]);

    // Calculate totals for badges
    let pTotalCount = 0;
    let pTotalSuccess = 0;
    let pTotalFail = 0;

    if (panelGraphType !== 'percentage' && panelGraphType !== 'funnel') {
        pTotalCount = filteredGraphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
        pTotalSuccess = filteredGraphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
        pTotalFail = filteredGraphData.reduce((sum: number, d: any) => sum + (d.failCount || 0), 0);
    }

    const isRangeShortEnoughForHourly = Math.ceil((currentPanelDateRange.to.getTime() - currentPanelDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 8;
    const pIsHourly = hourlyOverride !== null ? hourlyOverride : isRangeShortEnoughForHourly;

    // Process API Performance Series Locally
    const panelApiSeries = useMemo(() => {
        if (!panelConfig?.isApiEvent || rawPanelGraphData.length === 0) return [];

        const statusCodes = (currentPanelFilters.percentageStatusCodes || [])
            .filter(Boolean)
            .map((v: any) => String(v))
            .filter((v: string) => /^\d+$/.test(v));
        const cacheStatuses = (currentPanelFilters.percentageCacheStatus || []).filter(Boolean).map((v: any) => String(v));

        const isSpecialGraph = panelConfig?.graphType === 'percentage' || panelConfig?.graphType === 'funnel';

        const hasStatus = statusCodes.length > 0;
        const hasCache = cacheStatuses.length > 0;
        const timeMap = new Map<string, any>();
        const usedKeys = new Set<string>();

        const rawData = rawPanelGraphData as any[];

        rawData.forEach((r: any) => {
            if (!r?.timestamp) return;
            const dt = new Date(r.timestamp);
            const dateKey = pIsHourly
                ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!timeMap.has(dateKey)) timeMap.set(dateKey, { date: dateKey, timestamp: r.timestamp });
            const entry = timeMap.get(dateKey);

            const matchesStatus = !hasStatus || (r.status !== undefined && statusCodes.includes(String(r.status)));
            const matchesCache = !hasCache || cacheStatuses.includes(String(r.cacheStatus || 'none'));

            if (r.status !== undefined && (!matchesStatus || !matchesCache)) return;

            let eventKey: string;
            if (isSpecialGraph) {
                if (r.status !== undefined) {
                    eventKey = `status_${r.status}`;
                } else if (r.cacheStatus) {
                    eventKey = `cache_${r.cacheStatus}`;
                } else {
                    const eventId = String(r.eventId);
                    const eventConfig = eventConfigMap.get(eventId);
                    const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                        ? `${eventConfig.host} - ${eventConfig.url}`
                        : (eventConfig?.eventName || `Event ${eventId}`);
                    eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
                }
            } else {
                const eventId = String(r.eventId);
                const eventConfig = eventConfigMap.get(eventId);
                const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                    ? `${eventConfig.host} - ${eventConfig.url}`
                    : (eventConfig?.eventName || `Event ${eventId}`);
                eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
            }
            usedKeys.add(eventKey);

            const count = Number(r.count || 0);
            if (!entry[`${eventKey}_sumCount`]) {
                entry[`${eventKey}_count`] = 0;
                entry[`${eventKey}_sumCount`] = 0;
                entry[`${eventKey}_avgServerToUser_sum`] = 0;
                entry[`${eventKey}_avgServerToCloud_sum`] = 0;
                entry[`${eventKey}_avgCloudToUser_sum`] = 0;
                entry[`${eventKey}_avgBytesOut_sum`] = 0;
                entry[`${eventKey}_avgBytesIn_sum`] = 0;
            }

            const rawServerToUser = Number(r.avgServerToUser || 0);
            const rawServerToCloud = Number(r.avgServerToCloud || 0);
            const rawCloudToUser = Number(r.avgCloudToUser || 0);
            const sumParts = rawServerToCloud + rawCloudToUser;
            const effectiveServerToUser = rawServerToUser > 0 ? rawServerToUser : (sumParts > 0 ? sumParts : 0);

            const isSuccess = r.status ? (parseInt(r.status) >= 200 && parseInt(r.status) < 300) : true;
            if (!entry[`${eventKey}_success`]) {
                entry[`${eventKey}_success`] = 0;
                entry[`${eventKey}_fail`] = 0;
            }

            entry[`${eventKey}_count`] += count;
            entry[`${eventKey}_sumCount`] += count;
            if (isSuccess) entry[`${eventKey}_success`] += count;
            else entry[`${eventKey}_fail`] += count;

            entry[`${eventKey}_avgServerToUser_sum`] += effectiveServerToUser * count;
            entry[`${eventKey}_avgServerToCloud_sum`] += rawServerToCloud * count;
            entry[`${eventKey}_avgCloudToUser_sum`] += rawCloudToUser * count;
            entry[`${eventKey}_avgBytesOut_sum`] += Number(r.avgBytesOut || 0) * count;
            entry[`${eventKey}_avgBytesIn_sum`] += Number(r.avgBytesIn || 0) * count;
        });

        return Array.from(timeMap.values())
            .map((entry) => {
                const out = { ...entry } as any;
                usedKeys.forEach((k) => {
                    const denom = Number(out[`${k}_sumCount`] || 0);
                    if (denom > 0) {
                        out[`${k}_avgServerToUser`] = Number(out[`${k}_avgServerToUser_sum`] || 0) / denom;
                        out[`${k}_avgServerToCloud`] = Number(out[`${k}_avgServerToCloud_sum`] || 0) / denom;
                        out[`${k}_avgCloudToUser`] = Number(out[`${k}_avgCloudToUser_sum`] || 0) / denom;
                        out[`${k}_avgBytesOut`] = Number(out[`${k}_avgBytesOut_sum`] || 0) / denom;
                        out[`${k}_avgBytesIn`] = Number(out[`${k}_avgBytesIn_sum`] || 0) / denom;
                    }
                    delete out[`${k}_sumCount`];
                    delete out[`${k}_avgServerToUser_sum`];
                    delete out[`${k}_avgServerToCloud_sum`];
                    delete out[`${k}_avgCloudToUser_sum`];
                    delete out[`${k}_avgBytesOut_sum`];
                    delete out[`${k}_avgBytesIn_sum`];
                });
                return out;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    }, [
        rawPanelGraphData,
        currentPanelFilters,
        pIsHourly,
        panelConfig,
        eventConfigMap
    ]);

    const apiEventKeyInfos = useMemo(() => {
        if (!panelConfig?.graphType && !panelConfig?.funnelConfig) return [];
        if (!panelApiSeries || panelApiSeries.length === 0) return [];

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
        return [];
    }, [panelApiSeries, events, panelConfig]);

    const panelMetricView = panelApiMetricView?.[panel.panelId] || 'timing';

    return (
        <div
            ref={(el) => {
                // If ref handling is needed, parent can pass a ref callback
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

            <Card className={cn("relative rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] hover:shadow-card-hover transition-all duration-500 border border-slate-200/60 dark:border-indigo-500/20 backdrop-blur-xl mb-6 overflow-hidden", themeClasses.cardBg, themeClasses.cardHoverBorder)}>
                {/* Thematic gradient banner */}
                <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg ring-2 ring-white/20 dark:ring-white/10", themeClasses.buttonGradient)}>
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
                                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r text-white shadow-md", themeClasses.buttonGradient)}>
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
                                                    ? "bg-gray-100 text-gray-800 dark:bg-gray-600/20 dark:text-gray-300"
                                                    : panelGraphType === 'funnel'
                                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
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
                    <div className="p-4 sm:p-5 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/30 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-5 mb-4">
                            {/* Clickable Filter Toggle Bar */}
                            <button
                                onClick={() =>
                                    setPanelFiltersCollapsed?.((prev: any) => ({
                                        ...prev,
                                        [panel.panelId]: !prev?.[panel.panelId]
                                    }))
                                }
                                className={cn(
                                    "flex-1 flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
                                    panelFiltersCollapsed?.[panel.panelId] !== false
                                        ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        : "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/30 dark:to-slate-800/20 border border-gray-200 dark:border-gray-500/30"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                        panelFiltersCollapsed?.[panel.panelId] !== false
                                            ? "bg-slate-200 dark:bg-slate-700"
                                            : "bg-gradient-to-br from-gray-500 to-slate-600"
                                    )}>
                                        <Filter className={cn(
                                            "w-4 h-4",
                                            panelFiltersCollapsed?.[panel.panelId] !== false ? "text-slate-500" : "text-white"
                                        )} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">Panel Filters</span>
                                        <span className="text-xs text-muted-foreground">Click to {panelFiltersCollapsed?.[panel.panelId] !== false ? 'expand' : 'collapse'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground hidden sm:inline">(Independent)</span>
                                    {panelFiltersCollapsed?.[panel.panelId] !== false ? (
                                        <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                                    ) : (
                                        <ChevronUp className="h-5 w-5 text-current" />
                                    )}
                                </div>
                            </button>
                            <InteractiveButton
                                onClick={() => handlePanelRefresh?.(panel.panelId)}
                                disabled={isPanelLoading}
                                size="sm"
                                className={cn(
                                    "relative transition-all duration-300 shadow-md font-semibold min-h-[44px] px-6 py-3 w-full sm:w-auto",
                                    panelFilterChanges?.[panel.panelId]
                                        ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/40 border-2 border-red-300"
                                        : "bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white"
                                )}
                                loading={isPanelLoading}
                            >
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                {panelFilterChanges?.[panel.panelId] ? "⚡ APPLY" : "Refresh"}
                                {panelFilterChanges?.[panel.panelId] && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-red-300">
                                        !
                                    </div>
                                )}
                            </InteractiveButton>
                        </div>
                        {panelFiltersCollapsed?.[panel.panelId] === false && (
                            <>
                                <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-800/10 rounded-lg border border-gray-200 dark:border-gray-500/30">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <CalendarIcon className="w-4 h-4 text-current flex-shrink-0" />
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
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <button
                                                onClick={() => setHourlyOverride('hourly')}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                    pIsHourly
                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                )}
                                            >
                                                Hourly
                                            </button>
                                            <button
                                                onClick={() => setHourlyOverride('daily')}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                    !pIsHourly
                                                        ? "bg-white dark:bg-slate-600 text-gray-700 dark:text-gray-300 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                )}
                                            >
                                                Daily
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {panelConfig?.isApiEvent ? (
                                    <div className="grid gap-3 sm:gap-4 grid-cols-1">
                                        <div className="space-y-1.5">
                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                                API Events (Host / URL)
                                            </label>
                                            <MultiSelectDropdown
                                                options={events
                                                    .filter((e: any) => e.isApiEvent === true)
                                                    .map((e: any) => {
                                                        let label = getEventDisplayName(e);
                                                        const tags: string[] = [];
                                                        if (e.isErrorEvent === 1) tags.push('[isError]');
                                                        if (e.isAvgEvent === 1) tags.push('[isAvg]');
                                                        if (tags.length > 0) label = `${getEventDisplayName(e)} ${tags.join(' ')}`;
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
                                                placeholder="Select API events"
                                            />
                                            {panelConfig?.isApiEvent && (currentPanelFilters.events || []).length > 0 && (() => {
                                                const selectedEvent = (events || []).find((e: any) => e.eventId === currentPanelFilters.events[0]?.toString());
                                                return selectedEvent?.callUrl ? (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Call URL:{' '}
                                                        <code className="px-1 bg-gray-100 dark:bg-gray-800/30 rounded">{selectedEvent.callUrl}</code>
                                                    </p>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status Codes</label>
                                                <MultiSelectDropdown
                                                    options={(panelAvailableStatusCodes || []).map((s: string) => ({ value: s, label: s }))}
                                                    selected={(currentPanelFilters.apiStatusCodes || []).map((s: any) => String(s))}
                                                    onChange={(values) => updatePanelFilter?.(panel.panelId, 'apiStatusCodes', values)}
                                                    placeholder="Status..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                <MultiSelectDropdown
                                                    options={(panelAvailableCacheStatuses || []).map((s: string) => ({ value: s, label: s }))}
                                                    selected={(currentPanelFilters.apiCacheStatus || []).map((s: any) => String(s))}
                                                    onChange={(values) => updatePanelFilter?.(panel.panelId, 'apiCacheStatus', values)}
                                                    placeholder="Cache..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-4 p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-700/30">
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Events</label>
                                            <MultiSelectDropdown
                                                options={events
                                                    .filter((e: any) => e.isApiEvent !== true)
                                                    .map((e: any) => {
                                                        const label = getEventDisplayName(e);
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
                                                placeholder="Select events"
                                            />
                                        </div>
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
                            </>
                        )}
                    </div>
                    {/* Pie Charts */}
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
                            <div className={cn("grid grid-cols-1 gap-8 mb-6", gridCols)}>
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
                                            <Card className={cn("relative border border-slate-200/60 dark:border-indigo-500/20 overflow-hidden group rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] transition-all backdrop-blur-xl", themeClasses.cardBg, themeClasses.cardHoverBorder)}>
                                                <div className={cn("absolute top-0 left-0 right-0 h-1 transition-all duration-500 z-30 bg-gradient-to-r", gradientMap[pieType])} />
                                                <CardHeader className="pb-2 px-4 pt-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("h-8 w-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md ring-1 ring-white/20", gradientMap[pieType])}>
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
                                        </div >
                                    );
                                })}
                            </div >
                        ) : null;
                    })()}

                    {/* API Performance Metrics Chart */}
                    {
                        panelConfig?.isApiEvent && panelApiSeries.length > 0 && (
                            <Card className={cn("relative border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] rounded-2xl mb-6 backdrop-blur-xl", themeClasses.cardBg, themeClasses.cardHoverBorder)}>
                                <div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 z-30", themeClasses.headerGradient)} />
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                        <div className="flex flex-wrap gap-2">
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
                                                    {tab === 'bytes' && '📤 Bytes Out'}
                                                    {tab === 'bytes-in' && '📥 Bytes In'}
                                                    {tab === 'count' && '📈 Count'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                    <div className="h-[280px] md:h-[360px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={panelApiSeries} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                <XAxis dataKey="date" tick={<CustomXAxisTick isHourly={pIsHourly} />} axisLine={false} tickLine={false} height={45} interval={Math.max(0, Math.floor((panelApiSeries.length || 0) / 8))} />
                                                <YAxis
                                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(value) => {
                                                        if (!value || value <= 0) return '0';
                                                        if (panelMetricView?.startsWith('timing')) return `${Number(value).toFixed(0)}ms`;
                                                        if (panelMetricView?.startsWith('bytes')) return value >= 1000000 ? `${(value / 1000000).toFixed(1)}MB` : `${Number(value).toFixed(0)}B`;
                                                        return formatNumber(value);
                                                    }}
                                                    width={65}
                                                    dx={-5}
                                                />
                                                <Tooltip content={<CustomTooltip events={events} eventKeys={apiEventKeyInfos as any} />} wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} />
                                                {apiEventKeyInfos.map((ek: any, idx: number) => {
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
                                                            key={`papi_item_${panel.panelId}_${ek.eventKey}_${panelMetricView}`}
                                                            type="monotone"
                                                            dataKey={dataKey}
                                                            name={ek.eventName}
                                                            stroke={color}
                                                            strokeWidth={2.5}
                                                            fillOpacity={0.12}
                                                            fill={color}
                                                            dot={false}
                                                            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                                                            isAnimationActive={false} connectNulls={true}
                                                        />
                                                    );
                                                })}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Hourly Stats */}
                    {
                        pIsHourly && filteredGraphData.length > 0 && panelConfig?.showHourlyStats !== false && panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (
                            <div>
                                <HourlyStatsCard graphData={filteredGraphData} isHourly={pIsHourly} eventKeys={pEventKeys} events={events} />
                            </div>
                        )
                    }
                </CardContent >
            </Card >
        </div >
    );
});
