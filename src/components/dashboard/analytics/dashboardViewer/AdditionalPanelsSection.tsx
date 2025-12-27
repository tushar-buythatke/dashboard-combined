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
import { cn } from '@/lib/utils';

import { PLATFORMS, SOURCES } from '@/services/apiService';

import { AnimatedNumber } from './AnimatedNumber';
import { CollapsibleLegend } from './CollapsibleLegend';
import { CustomTooltip } from './CustomTooltip';
import { PieTooltip } from './PieTooltip';
import { combinePieChartDuplicates, ERROR_COLORS, EVENT_COLORS, PIE_COLORS, shouldShowPieChart } from './constants';
import { PercentageGraph } from '../charts/PercentageGraph';
import { FunnelGraph } from '../charts/FunnelGraph';

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
}: any) {
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
            map[String(e.eventId)] = e.eventName;
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
            {profile.panels.slice(1).filter((_: any, idx: number) => {
                // SINGLE PANEL ARCHITECTURE: Only render the panel that matches activePanelIndex
                // activePanelIndex 0 = main panel, 1+ = additional panels (so idx 0 in slice = activePanelIndex 1)
                return activePanelIndex === idx + 1;
            }).map((panel: any, panelIndex: number) => {
                const panelData = panelsDataMap.get(panel.panelId);
                const rawPanelGraphData = panelData?.graphData || [];
                const pEventKeys = panelData?.eventKeys || [];
                const pPieData = panelData?.pieChartData;
                const currentPanelFilters = panelFiltersState?.[panel.panelId] || panelData?.filters || {
                    events: [],
                    platforms: [],
                    pos: [],
                    sources: []
                };

                const currentPanelDateRange = panelDateRanges?.[panel.panelId] || dateRange;

                const isPanelLoading = panelLoading?.[panel.panelId] || false;

                const panelConfig = (panel as any)?.filterConfig;
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
                                <div className="w-full border-t-4 border-dashed border-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-300 dark:from-purple-600 dark:via-fuchsia-500 dark:to-pink-500" />
                            </div>
                            <div className="relative flex justify-center">
                                <div className="px-6 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-full shadow-lg">
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

                        <Card className="border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-900/20 dark:to-fuchsia-900/10 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
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
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md">
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
                                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
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
                                                                : 'Line Chart'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                                {isPanelLoading ? <Skeleton className="h-4 w-12" /> : pTotalCount.toLocaleString()} total
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
                                <div className="p-3 sm:p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 mb-4">
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
                                                    : "bg-gradient-to-r from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/20 border border-purple-200 dark:border-purple-500/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                                                    panelFiltersCollapsed?.[panel.panelId] !== false
                                                        ? "bg-slate-200 dark:bg-slate-700"
                                                        : "bg-gradient-to-br from-purple-500 to-fuchsia-600"
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
                                                    <ChevronUp className="h-5 w-5 text-purple-500" />
                                                )}
                                            </div>
                                        </button>
                                        {/* Refresh Button */}
                                        <InteractiveButton
                                            onClick={() => handlePanelRefresh?.(panel.panelId)}
                                            disabled={isPanelLoading}
                                            size="sm"
                                            className={cn(
                                                "relative transition-all duration-300 shadow-md font-semibold min-h-[44px] w-full sm:w-auto",
                                                panelFilterChanges?.[panel.panelId]
                                                    ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/40 border-2 border-red-300"
                                                    : "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white"
                                            )}
                                            loading={isPanelLoading}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1.5" />
                                            {panelFilterChanges?.[panel.panelId] ? "⚡ APPLY" : "Refresh"}
                                            {panelFilterChanges?.[panel.panelId] && (
                                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                                    !
                                                </div>
                                            )}
                                        </InteractiveButton>
                                    </div>

                                    {/* Show filters only if explicitly NOT collapsed (false means expanded now) */}
                                    {panelFiltersCollapsed?.[panel.panelId] === false && (
                                        <>
                                            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/10 rounded-lg border border-purple-200 dark:border-purple-500/30">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <CalendarIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                                                        <input
                                                            type="date"
                                                            value={currentPanelDateRange.from.toISOString().split('T')[0]}
                                                            onChange={(e) => {
                                                                const newFrom = new Date(e.target.value);
                                                                updatePanelDateRange?.(panel.panelId, newFrom, currentPanelDateRange.to);
                                                            }}
                                                            className="flex-1 sm:flex-initial px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 min-h-[44px]"
                                                        />
                                                        <span className="text-gray-500 text-sm">to</span>
                                                        <input
                                                            type="date"
                                                            value={currentPanelDateRange.to.toISOString().split('T')[0]}
                                                            onChange={(e) => {
                                                                const newTo = new Date(e.target.value);
                                                                updatePanelDateRange?.(panel.panelId, currentPanelDateRange.from, newTo);
                                                            }}
                                                            className="flex-1 sm:flex-initial px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 min-h-[44px]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <button
                                                            onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, true)}
                                                            className={cn(
                                                                "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                pIsHourly
                                                                    ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
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
                                                                    ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
                                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            )}
                                                        >
                                                            Daily
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {panelGraphType === 'percentage' && panelConfig?.percentageConfig ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/10 rounded-lg border-2 border-purple-300 dark:border-purple-500/30">
                                                        <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
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
                                                                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                                                    <MultiSelectDropdown
                                                                        options={(events || [])
                                                                            .filter((e: any) => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                            .map((e: any) => ({
                                                                                value: String(e.eventId),
                                                                                label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
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
                                                                                label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
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
                                                        <div className="mt-3 text-xs text-muted-foreground text-center">
                                                            Formula: (Child Count / Parent Count) × 100
                                                        </div>
                                                    </div>

                                                    {panelConfig?.isApiEvent ? (
                                                        <div className="mt-4 space-y-3">
                                                            <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span> Data grouped by status codes and cache status
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
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                            </div>

                                                            {/* SourceStr (Job ID) Filter - Only for NON-API events */}
                                                            {!panelConfig?.isApiEvent && (() => {
                                                                const rawData = panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || [];
                                                                const selectedJobIds = (currentPanelFilters.sourceStrs || []).map((s: any) => s.toString());
                                                                return rawData.length > 0 && rawData.some((d: any) => d.sourceStr) && (
                                                                    <div className="mt-3 space-y-1.5">
                                                                        <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Job IDs (sourceStr)</label>
                                                                        <MultiSelectDropdown
                                                                            options={(() => {
                                                                                const unique = Array.from(new Set(rawData.map((d: any) => d.sourceStr).filter(Boolean))).sort();
                                                                                return unique.map((s: any) => ({ value: s.toString(), label: `Job ${s}` }));
                                                                            })()}
                                                                            selected={selectedJobIds}
                                                                            onChange={(values) => {
                                                                                setPanelFiltersState?.((prev: any) => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: { ...prev?.[panel.panelId], sourceStrs: values }
                                                                                }));
                                                                                setPanelFilterChanges?.((prev: any) => ({ ...prev, [panel.panelId]: true }));
                                                                            }}
                                                                            placeholder="Select Job IDs"
                                                                        />
                                                                        {/* Show selected Job IDs immediately */}
                                                                        {selectedJobIds.length > 0 && (
                                                                            <div className="flex items-center gap-2 mt-2 p-2 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 rounded-md">
                                                                                <Hash className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                                                                                <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                                                                                    Filtering: {selectedJobIds.map((id: string) => `Job ${id}`).join(', ')}
                                                                                </span>
                                                                                <span className="ml-auto text-xs text-cyan-600 dark:text-cyan-400">
                                                                                    ({selectedJobIds.length} selected)
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
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
                                                                                            {ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url} ` : ev.eventName}
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
                                                                            label: ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url} ` : ev.eventName
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
                                                            <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span> Data grouped by status codes and cache status
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
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                                        let label = e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName;
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
                                                            />
                                                            {panelConfig?.isApiEvent && (currentPanelFilters.events || []).length > 0 && (() => {
                                                                const selectedEvent = (events || []).find((e: any) => e.eventId === currentPanelFilters.events[0]?.toString());
                                                                return selectedEvent?.callUrl ? (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Call URL:{' '}
                                                                        <code className="px-1 bg-purple-100 dark:bg-purple-900/30 rounded">{selectedEvent.callUrl}</code>
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
                                                                <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span>{' '}
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                                    <CardContent className="pt-4 pb-3">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            <AnimatedNumber value={pTotalCount} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">Total</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
                                    <CardContent className="pt-4 pb-3">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            <AnimatedNumber value={pTotalSuccess} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">Success</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
                                    <CardContent className="pt-4 pb-3">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                            <AnimatedNumber value={pTotalFail} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">Failed</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
                                    <CardContent className="pt-4 pb-3">
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {pTotalCount > 0 ? ((pTotalSuccess / pTotalCount) * 100).toFixed(1) : 0}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">Success Rate</div>
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
                                            onToggleBackToFunnel={(panel as any)?.previousGraphType === 'funnel' ? () => {
                                                // Toggle back to funnel graph
                                                if (profile && profile.panels) {
                                                    const actualIndex = panelIndex + 1;
                                                    const targetPanel = profile.panels[actualIndex];
                                                    const updatedConfig = {
                                                        ...targetPanel.filterConfig,
                                                        graphType: 'funnel' as const,
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

                                                    setProfile?.(updatedProfile);
                                                }
                                            } : undefined}
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

                                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                                        {panelApiSeries.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={panelApiSeries} margin={{ top: 10, right: 30, left: 18, bottom: 50 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis 
                                                                        dataKey="date" 
                                                                        tick={<CustomXAxisTick isHourly={pIsHourly} />} 
                                                                        axisLine={{ stroke: '#e5e7eb' }}
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
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={apiEventKeyInfos as any} />} />
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
                                                                        onClick={() => openExpandedPie?.('status', 'Status Codes', statusData)}
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
                                                                            <Tooltip content={<PieTooltip totalValue={statusData.reduce((acc: number, item: any) => acc + item.value, 0)} category="Status Code" />} />
                                                                            <Legend iconType="circle" iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {showCacheStatus && (
                                                        <Card className="border border-purple-200/60 dark:border-purple-500/30 rounded-2xl overflow-hidden shadow-premium">
                                                            <CardHeader className="pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <CardTitle className="text-sm font-semibold">Cache Status</CardTitle>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() => openExpandedPie?.('cacheStatus', 'Cache Status', cacheStatusData)}
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
                                                                            <Tooltip content={<PieTooltip totalValue={cacheStatusData.reduce((acc: number, item: any) => acc + item.value, 0)} category="Cache Status" />} />
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

                                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                                        {panelApiSeries.length > 0 ? (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart data={panelApiSeries} margin={{ top: 10, right: 30, left: 18, bottom: 50 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis 
                                                                        dataKey="date" 
                                                                        tick={<CustomXAxisTick isHourly={pIsHourly} />} 
                                                                        axisLine={{ stroke: '#e5e7eb' }}
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
                                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={apiEventKeyInfos as any} />} />
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

                            return null;
                        })()}

                        {panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (() => {
                            const pAvgEventKeys = pEventKeys.filter((ek: any) => ek.isAvgEvent >= 1);
                            // FIXED: Added parentheses for correct operator precedence
                            const pErrorEventKeys = pEventKeys.filter((ek: any) => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
                            const pNormalEventKeys = pEventKeys.filter((ek: any) => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));

                            return (
                                <>
                                    {pNormalEventKeys.length > 0 && (panelChartType?.[panel.panelId] ?? 'deviation') !== 'deviation' && (
                                        <Card className="border border-violet-200/60 dark:border-violet-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-5 h-5 text-purple-500" />
                                                        <CardTitle className="text-base font-semibold">Event Trends (Count)</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground font-medium">{pNormalEventKeys.length} events</span>
                                                        {/* Hourly/Daily Toggle */}
                                                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                            <button
                                                                onClick={() => setPanelHourlyOverrideForId?.(panel.panelId, true)}
                                                                className={cn(
                                                                    "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                                                                    pIsHourly
                                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
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
                                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Daily
                                                            </button>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-9 text-sm font-semibold bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
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
                                                <div className="h-[400px]">
                                                    {filteredGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart
                                                                data={filteredGraphData}
                                                                margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                onClick={(chartState: any) => {
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
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pNormalEventKeys} />} cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }} />
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
                                                                        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />
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
                                            <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="h-5 w-5 text-purple-600" />
                                                            <CardTitle className="text-base font-semibold">8-Day Hourly Comparison</CardTitle>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
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

                                        return (
                                            <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <BarChart3 className="h-5 w-5 text-purple-600" />
                                                            <CardTitle className="text-base font-semibold">Daily Overlay Comparison</CardTitle>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
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
                                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">isAvg Events</span>
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
                                                    selectedEventKey={panelSelectedEventKey?.[panel.panelId] || null}
                                                    onEventClick={(eventKey: string) => handlePanelEventClick?.(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {filteredGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart
                                                                data={filteredGraphData}
                                                                margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                onClick={(chartState: any) => {
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
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                <YAxis
                                                                    tick={{ fill: '#f59e0b', fontSize: 10 }}
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
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pAvgEventKeys} />} cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                {pAvgEventKeys
                                                                    .filter((ek: any) => !panelSelectedEventKey?.[panel.panelId] || ek.eventKey === panelSelectedEventKey?.[panel.panelId])
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
                                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
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
                                                                        ? "bg-white dark:bg-slate-600 text-purple-600 dark:text-purple-300 shadow-sm"
                                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                                )}
                                                            >
                                                                Daily
                                                            </button>
                                                        </div>
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError Events</span>
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
                                                <div className="h-[400px]">
                                                    {filteredGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart
                                                                data={filteredGraphData}
                                                                margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                onClick={(chartState: any) => {
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
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                <YAxis tick={{ fill: '#ef4444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pErrorEventKeys} />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }} />
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
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis
                                                                        tick={{ fill: '#f59e0b', fontSize: 10 }}
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
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                    <YAxis tick={{ fill: '#ef4444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
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
                                        <Card className="border border-violet-200/60 dark:border-violet-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-purple-500" />
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
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
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
                                const showChart = shouldShowPieChart(combinedPieData);
                                return { pieConfig, pieType, pieData: combinedPieData, showChart };
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
                                            platform: "from-indigo-500 to-violet-600",
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
                                                <Card className={cn("border-2 overflow-hidden group", borderColorMap[pieType])}>
                                                    <CardHeader className="pb-2">
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
                                                                            onClick={() => openExpandedPie?.(pieType, pieType.charAt(0).toUpperCase() + pieType.slice(1), pieData)}
                                                                        >
                                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="h-48">
                                                            {pieData?.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <PieChart>
                                                                        <Pie data={pieData} cx="50%" cy="45%" innerRadius={30} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.8)" isAnimationActive={false} animationDuration={0}>
                                                                            {pieData.map((_: any, index: number) => (
                                                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                                            ))}
                                                                        </Pie>
                                                                        <Tooltip content={<PieTooltip totalValue={pieTotal} category={pieType} />} />
                                                                        <Legend iconType="circle" iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                                                    </PieChart>
                                                                </ResponsiveContainer>
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

                        {isHourly && filteredGraphData.length > 0 && panelConfig?.showHourlyStats !== false && panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (
                            <div>
                                <HourlyStatsCard graphData={filteredGraphData} isHourly={isHourly} eventKeys={pEventKeys} events={events} />
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
});
