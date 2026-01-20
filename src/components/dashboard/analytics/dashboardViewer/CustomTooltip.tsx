import React, { useEffect, useState } from 'react';
// Removed framer-motion for performance
import {
    Activity,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    TrendingUp,
    Users,
    UserPlus,
    Fingerprint,
    XCircle
} from 'lucide-react';

import type { EventConfig } from '@/types/analytics';
import { cn } from '@/lib/utils';
import type { EventKeyInfo } from './types';

// Custom tooltip component - shows per-event success/fail percentages
// Now shows a condensed view with option to expand for more details
// isPinned = true means it was clicked and should auto-expand + show close button
export const CustomTooltip = ({ active, payload, label, events: allEvents = [], eventKeys = [], isPinned = false, onClose }: any) => {
    const [isExpanded, setIsExpanded] = useState(isPinned);

    // Auto-expand when pinned
    useEffect(() => {
        if (isPinned) setIsExpanded(true);
    }, [isPinned]);

    // ESC key to close pinned tooltip
    useEffect(() => {
        if (!isPinned || !onClose) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isPinned, onClose]);

    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    // Build maps for quick lookup from eventKey -> EventConfig and EventKeyInfo
    const eventKeyToConfig = new Map<string, EventConfig>();
    const eventKeyToInfo = new Map<string, EventKeyInfo>();
    (eventKeys as EventKeyInfo[]).forEach((ek: EventKeyInfo) => {
        const cfg = (allEvents as EventConfig[]).find(e => String(e.eventId) === ek.eventId);
        if (cfg) {
            eventKeyToConfig.set(ek.eventKey, cfg);
        }
        eventKeyToInfo.set(ek.eventKey, ek);
    });

    const formatMetricWithKMB = (value: number, metricType: 'timing' | 'delay' | 'bytes' | 'count' | 'money', featureId?: number) => {
        if (!value || value <= 0) return metricType === 'count' ? '0' : null;

        if (metricType === 'count') {
            if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
            return value.toLocaleString();
        }

        if (metricType === 'bytes') {
            if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)}MB`;
            if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`;
            return `${value}B`;
        }

        if (metricType === 'timing') {
            // API timing is in MS
            if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
            return `${Math.round(value)}ms`;
        }

        if (metricType === 'delay') {
            // Feature delay: PA (1) is in minutes, others in seconds
            if (featureId === 1) {
                if (value >= 60) return `${Math.round(value / 60)}h`;
                return `${Math.round(value)}m`;
            }
            // Seconds display
            if (value >= 3600) return `${Math.round(value / 3600)}h`;
            if (value >= 60) return `${Math.round(value / 60)}m`;
            return `${Math.round(value)}s`;
        }

        if (metricType === 'money') {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value.toLocaleString('en-IN')}`;
        }

        return value.toLocaleString();
    };

    // Replace old formatMetric with our new one
    const formatMetric = formatMetricWithKMB;

    // Get per-event data from payload with success/fail/delay info
    const eventDataItems = payload.map((item: any) => {
        const rawKey: string = item.dataKey || '';

        // Distinguish metric types more precisely
        const isTimingKey = rawKey.endsWith('_avgServerToUser') ||
            rawKey.endsWith('_avgServerToCloud') ||
            rawKey.endsWith('_avgCloudToUser');
        const isDelayKey = rawKey.endsWith('_avgDelay');
        const isBytesKey = rawKey.endsWith('_avgBytesOut') || rawKey.endsWith('_avgBytesIn');

        // Handle different dataKey suffixes
        const eventKey = rawKey
            .replace(/_count$/, '')
            .replace(/_avgDelay$/, '')
            .replace(/_avgServerToUser$/, '')
            .replace(/_avgServerToCloud$/, '')
            .replace(/_avgCloudToUser$/, '')
            .replace(/_avgBytesOut$/, '')
            .replace(/_avgBytesIn$/, '')
            .replace(/_success$/, '')
            .replace(/_fail$/, '') || '';

        const cfg = eventKeyToConfig.get(eventKey);
        const ekInfo = eventKeyToInfo.get(eventKey);

        // Determine if this is an average metric view
        const isAvgEvent = ekInfo?.isAvgEvent === 1 || isTimingKey || isDelayKey || isBytesKey;
        const actualEventCount = data[`${eventKey}_count`] !== undefined ? Number(data[`${eventKey}_count`]) : (isAvgEvent ? 0 : Number(item.value || 0));

        const eventSuccessRaw = data[`${eventKey}_success`] !== undefined ? Number(data[`${eventKey}_success`]) : 0;
        const eventFail = data[`${eventKey}_fail`] !== undefined ? Number(data[`${eventKey}_fail`]) : 0;

        // Extract User Metrics
        const totalUsers = data[`${eventKey}_totalUsers`] !== undefined ? Number(data[`${eventKey}_totalUsers`]) : 0;
        const newUsers = data[`${eventKey}_newUsers`] !== undefined ? Number(data[`${eventKey}_newUsers`]) : 0;
        const uniqueUsers = data[`${eventKey}_uniqueUsers`] !== undefined ? Number(data[`${eventKey}_uniqueUsers`]) : 0;

        const isErrorEvent = ekInfo?.isErrorEvent === 1;
        const metricValue = Number(item.value || 0);

        // For error events: successRaw is actually the ERROR count
        const errorCount = isErrorEvent ? eventSuccessRaw : eventFail;
        const successCount = isErrorEvent ? eventFail : eventSuccessRaw;

        // Calculate rates based on actual count
        const errorRate = actualEventCount > 0 ? ((errorCount / actualEventCount) * 100) : 0;
        const successRate = actualEventCount > 0 ? ((successCount / actualEventCount) * 100) : 0;

        let displayName = item.name;
        let isStatus = false;
        let isCache = false;

        if (eventKey.startsWith('status_')) {
            displayName = `Status ${eventKey.replace('status_', '')}`;
            isStatus = true;
        } else if (eventKey.startsWith('cache_')) {
            displayName = `Cache: ${eventKey.replace('cache_', '')}`;
            isCache = true;
        } else if (ekInfo?.eventKey) {
            if (ekInfo.eventKey.startsWith('status_')) {
                displayName = `Status ${ekInfo.eventKey.replace('status_', '')}`;
                isStatus = true;
            } else if (ekInfo.eventKey.startsWith('cache_')) {
                displayName = `Cache: ${ekInfo.eventKey.replace('cache_', '')}`;
                isCache = true;
            }
        }

        // Determine metric type for formatting
        let metricType: 'timing' | 'delay' | 'bytes' | 'count' | 'money' = 'count';

        // Check for specific isAvgEvent types from config
        if (ekInfo?.isAvgEvent === 2) {
            metricType = 'money';
        } else if (ekInfo?.isAvgEvent === 1 && !isTimingKey) {
            // isAvgEvent 1 is delay/time (unless it's specifically a timing key)
            metricType = 'delay';
        } else if (isTimingKey) {
            metricType = 'timing';
        } else if (isDelayKey) {
            metricType = 'delay';
        } else if (isBytesKey) {
            metricType = 'bytes';
        }

        return {
            name: displayName,
            count: actualEventCount,
            successCount,
            errorCount,
            successRate,
            errorRate,
            color: item.color || item.stroke,
            dataKey: item.dataKey,
            isErrorEvent,
            isAvgEvent,
            isTimingEvent: isTimingKey,
            isDelayEvent: isDelayKey,
            isBytesEvent: isBytesKey,
            isStatus,
            isCache,
            featureId: cfg?.feature,
            metricLabel: isAvgEvent ? formatMetric(metricValue, metricType, cfg?.feature) : null,
            metricValue,
            metricType,
            rawKey,
            totalUsers,
            newUsers,
            uniqueUsers
        };
    }).filter((item: any) => item.count !== undefined && item.count >= 0);

    // Calculate totals
    const totalCount = eventDataItems.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const totalSuccess = eventDataItems.reduce((sum: number, item: any) => sum + (item.successCount || 0), 0);
    const totalErrors = eventDataItems.reduce((sum: number, item: any) => sum + (item.errorCount || 0), 0);
    const overallSuccessRate = totalCount > 0 ? ((totalSuccess / totalCount) * 100) : 0;

    // Calculate user metric totals
    const sumTotalUsers = eventDataItems.reduce((sum: number, item: any) => sum + (item.totalUsers || 0), 0);
    const sumNewUsers = eventDataItems.reduce((sum: number, item: any) => sum + (item.newUsers || 0), 0);
    const sumUniqueUsers = eventDataItems.reduce((sum: number, item: any) => sum + (item.uniqueUsers || 0), 0);

    // Check for metrics types across all items
    const someAvgEvents = eventDataItems.some((item: any) => item.isAvgEvent);
    const someBytesEvents = eventDataItems.some((item: any) => item.isBytesEvent);
    const someTimingEvents = eventDataItems.some((item: any) => item.isTimingEvent);
    const allAvgEvents = eventDataItems.length > 0 && eventDataItems.every((item: any) => item.isAvgEvent);

    // Calculate overall average for header if viewing timing
    const avgMetricTotal = someAvgEvents
        ? eventDataItems.reduce((sum: number, item: any) => sum + (item.metricValue || 0), 0) / eventDataItems.length
        : 0;

    // Determine metric type for whole tooltip header
    let headerMetricType: 'timing' | 'delay' | 'bytes' | 'count' | 'money' = 'count';

    // Check if any items are money type
    const someMoneyEvents = eventDataItems.some((item: any) => item.metricType === 'money');

    if (someMoneyEvents) headerMetricType = 'money';
    else if (someTimingEvents) headerMetricType = 'timing';
    else if (someAvgEvents && !someBytesEvents) headerMetricType = 'delay';
    else if (someBytesEvents) headerMetricType = 'bytes';

    const formattedAvgMetric = someAvgEvents ? formatMetric(avgMetricTotal, headerMetricType, eventDataItems[0]?.featureId) : null;

    // Show only first 3 events in collapsed view, or all when expanded/pinned
    const visibleItems = isExpanded ? eventDataItems : eventDataItems.slice(0, 3);
    const hiddenCount = eventDataItems.length - 3;

    const stopEvent = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    const isApiPanel = eventDataItems.some((item: any) => item.isStatus || item.isCache || item.isTimingEvent || item.isBytesEvent);
    const itemLabel = isApiPanel ? 'endpoint' : 'event';

    return (
        <div
            className={cn(
                "relative z-[1000] overflow-visible",
                isPinned
                    ? "bg-transparent p-3 md:p-4 pointer-events-auto"
                    : "bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-3 backdrop-blur-md min-w-[320px] max-w-[500px]"
            )}
            onMouseMoveCapture={stopEvent}
            onWheelCapture={stopEvent}
            onClick={stopEvent}
        >

            {/* Content wrapper */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div
                            className={cn(
                                "h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg",
                                someAvgEvents
                                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/30"
                                    : "bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 shadow-purple-500/30"
                            )}
                        >
                            {someBytesEvents ? (
                                <Activity className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            ) : someAvgEvents ? (
                                headerMetricType === 'money' ? (
                                    <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                ) : (
                                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                )
                            ) : (
                                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm md:text-base text-foreground leading-tight truncate">{label}</div>
                            <div className="text-[10px] md:text-[11px] text-muted-foreground font-medium mt-0.5">{eventDataItems.length} {itemLabel}{eventDataItems.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    {/* Overall stats */}
                    <div className="text-right flex-shrink-0">
                        <div
                            className={cn(
                                "text-xl md:text-2xl font-extrabold bg-clip-text text-transparent",
                                someAvgEvents
                                    ? "bg-gradient-to-r from-amber-600 to-orange-600"
                                    : "bg-gradient-to-r from-purple-600 to-violet-600"
                            )}
                        >
                            {someAvgEvents && formattedAvgMetric ? formattedAvgMetric : formatMetric(totalCount, 'count')}
                        </div>
                        <div className={cn(
                            "text-[10px] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full shadow-sm mt-1 inline-block",
                            overallSuccessRate >= 90 ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                overallSuccessRate >= 70 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" :
                                    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        )}>
                            {overallSuccessRate.toFixed(0)}% Success
                        </div>
                    </div>
                </div>

                {/* User Metrics Summary Bar */}
                {sumTotalUsers > 0 && (
                    <div className="flex items-center gap-4 mb-3 px-1 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {formatMetric(sumTotalUsers, 'count')} <span className="text-[9px] font-medium opacity-70">users</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <UserPlus className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {formatMetric(sumNewUsers, 'count')} <span className="text-[9px] font-medium opacity-70">new</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {formatMetric(sumUniqueUsers, 'count')} <span className="text-[9px] font-medium opacity-70">unique</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* Click to expand hint when not pinned */}
                {!isPinned && eventDataItems.length > 0 && (
                    <div className="text-[9px] text-center text-muted-foreground mb-2 opacity-70">
                        💡 Click on chart to lock & expand details
                    </div>
                )}

                {/* Per-Event Data with Success/Fail / Delay */}
                <div className={cn(
                    "space-y-2.5 md:space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-purple-700",
                    isPinned ? "max-h-[300px] md:max-h-[400px]" : "max-h-60 md:max-h-72"
                )}>
                    {visibleItems.map((item: any, index: number) => (
                        <div
                            key={index}
                            className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-800/40 dark:to-gray-800/20 border border-gray-200/40 dark:border-gray-700/20 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all group"
                        >
                            {/* Title Line */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                                    <div
                                        className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0 shadow-sm ring-1 ring-white dark:ring-gray-900 group-hover:scale-125 transition-transform"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-xs md:text-sm font-bold text-foreground break-words leading-tight">{item.name}</span>
                                </div>

                                {/* Metric Display (Timing or Count) */}
                                {item.isAvgEvent && item.metricLabel ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm md:text-base font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {item.metricLabel}
                                        </span>
                                    </div>
                                ) : !item.isAvgEvent && (
                                    <span className="text-sm md:text-base font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">{formatMetric(item.count, 'count')}</span>
                                )}
                            </div>

                            {/* Details Line */}
                            <div className="flex items-center gap-2 text-[10px] md:text-[11px]">
                                {/* Total Count for Avg events (Timing View) */}
                                {item.isAvgEvent && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-400">
                                        {formatMetric(item.count, 'count')} reqs
                                    </span>
                                )}

                                {/* Success/Fail Details */}
                                <div className="flex items-center gap-1.5 ml-0.5">
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/10">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                        <span className="font-bold text-green-700 dark:text-green-400">
                                            {formatMetric(item.successCount, 'count')}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/10">
                                        <XCircle className="w-2.5 h-2.5 text-red-500" />
                                        <span className="font-bold text-red-700 dark:text-red-400">
                                            {formatMetric(item.errorCount, 'count')}
                                        </span>
                                    </span>
                                </div>

                                {/* Percentage Pill */}
                                <span className={cn(
                                    "ml-auto font-black px-2 py-0.5 rounded-full text-[9px] shadow-sm uppercase tracking-tighter",
                                    item.successRate >= 90
                                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50"
                                        : item.successRate >= 70
                                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50"
                                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                                )}>
                                    {item.successRate.toFixed(0)}%
                                </span>
                            </div>

                            {/* Per-item User Metrics */}
                            {item.totalUsers > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200/40 dark:border-gray-700/40 flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                        <Users className="w-2.5 h-2.5" />
                                        {formatMetric(item.totalUsers, 'count')}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                        <UserPlus className="w-2.5 h-2.5" />
                                        {formatMetric(item.newUsers, 'count')}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                        <Fingerprint className="w-2.5 h-2.5" />
                                        {formatMetric(item.uniqueUsers, 'count')}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Expand/Collapse Button */}
                {eventDataItems.length > 3 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="w-full mt-3 py-2 px-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-bold hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-500/20 dark:hover:to-violet-500/20 transition-all flex items-center justify-center gap-1.5 border border-purple-200/50 dark:border-purple-500/30 shadow-sm"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                SHOW LESS
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                SEE {hiddenCount} MORE
                            </>
                        )}
                    </button>
                )}

                {/* Footer with totals */}
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-dashed border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                        {someAvgEvents && formattedAvgMetric ? (
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                Avg: <span className="font-extrabold text-amber-600 dark:text-amber-400">{formattedAvgMetric}</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground font-medium uppercase tracking-wider opacity-60">Total Population</span>
                        )}

                        <div className="flex items-center gap-3">
                            <span className="font-extrabold text-foreground">{formatMetric(totalCount, 'count')} <span className="text-[9px] font-medium text-muted-foreground">reqs</span></span>
                            <div className="h-3 w-[1px] bg-gray-200 dark:bg-gray-800" />
                            <span className="font-extrabold text-green-600 dark:text-green-400">{formatMetric(totalSuccess, 'count')} <span className="text-[9px] font-medium text-muted-foreground">ok</span></span>
                            <div className="h-3 w-[1px] bg-gray-200 dark:bg-gray-800" />
                            <span className="font-extrabold text-red-600 dark:text-red-400">{formatMetric(totalErrors, 'count')} <span className="text-[9px] font-medium text-muted-foreground">err</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
