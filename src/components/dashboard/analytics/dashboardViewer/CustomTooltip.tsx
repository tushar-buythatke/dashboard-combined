import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    TrendingDown,
    TrendingUp,
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

    const formatDelay = (delayValue: number, featureId?: number) => {
        if (!delayValue || delayValue <= 0) return null;
        // Feature 1 = Price Alert (value is already in MINUTES)
        // Others (Spend/Auto-coupon) = value is already in SECONDS
        // Default to minutes if feature unknown but value seems like minutes (PA typically)
        if (featureId === 1 || (!featureId && delayValue > 100)) {
            // Likely in minutes
            if (delayValue >= 60) return `${Math.round(delayValue / 60)}h`;
            return `${Math.round(delayValue)}m`;
        }
        // Seconds
        if (delayValue >= 3600) return `${Math.round(delayValue / 3600)}h`;
        if (delayValue >= 60) return `${Math.round(delayValue / 60)}m`;
        return `${Math.round(delayValue)}s`;
    };

    // Get per-event data from payload with success/fail/delay info
    const eventDataItems = payload.map((item: any) => {
        const rawKey: string = item.dataKey || '';
        // Determine if this is a delay dataKey (ends with _avgDelay)
        const isDelayDataKey = rawKey.endsWith('_avgDelay');
        // Handle different dataKey suffixes: _count, _avgDelay, _success, _fail
        const eventKey = rawKey.replace(/_count$/, '').replace(/_avgDelay$/, '').replace(/_success$/, '').replace(/_fail$/, '') || '';
        const cfg = eventKeyToConfig.get(eventKey);
        const ekInfo = eventKeyToInfo.get(eventKey);

        const eventCount = item.value || 0;
        const eventSuccessRaw = data[`${eventKey}_success`] || 0;
        const eventFail = data[`${eventKey}_fail`] || 0;
        // Use EventKeyInfo for isErrorEvent and isAvgEvent (these are on the event key info, not config)
        // Also fallback to detecting from dataKey suffix or from graph context (if all eventKeys passed are isAvg)
        const isErrorEvent = ekInfo?.isErrorEvent === 1;
        const isAvgEvent = ekInfo?.isAvgEvent === 1 || isDelayDataKey;
        // For isAvg events, the value in payload IS the delay value directly
        const avgDelayValue = isAvgEvent ? eventCount : 0;

        // For error events: successRaw is actually the ERROR count, fail is non-error count
        // For normal events: successRaw is success count, fail is failure count
        const errorCount = isErrorEvent ? eventSuccessRaw : eventFail;
        const successCount = isErrorEvent ? eventFail : eventSuccessRaw;
        const errorRate = eventCount > 0 ? ((errorCount / eventCount) * 100) : 0;
        const successRate = eventCount > 0 ? ((successCount / eventCount) * 100) : 0;

        // For API Performance Metrics, if eventKey starts with "status_" or "cache_", use that as the name
        // Otherwise use the item.name
        let displayName = item.name;
        if (ekInfo?.eventKey) {
            if (ekInfo.eventKey.startsWith('status_')) {
                displayName = `Status ${ekInfo.eventKey.replace('status_', '')}`;
            } else if (ekInfo.eventKey.startsWith('cache_')) {
                displayName = `Cache: ${ekInfo.eventKey.replace('cache_', '')}`;
            }
        }
        
        return {
            name: displayName,
            count: eventCount,
            successCount,
            errorCount,
            successRate,
            errorRate,
            color: item.color || item.stroke,
            dataKey: item.dataKey,
            isErrorEvent,
            isAvgEvent,
            featureId: cfg?.feature,
            delayLabel: isAvgEvent ? formatDelay(avgDelayValue, cfg?.feature) : null,
            avgDelayRaw: avgDelayValue,
        };
    }).filter((item: any) => item.count !== undefined && item.count > 0);

    // Calculate totals
    const totalCount = eventDataItems.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const totalSuccess = eventDataItems.reduce((sum: number, item: any) => sum + (item.successCount || 0), 0);
    const totalErrors = eventDataItems.reduce((sum: number, item: any) => sum + (item.errorCount || 0), 0);
    const overallSuccessRate = totalCount > 0 ? ((totalSuccess / totalCount) * 100) : 0;

    // Check if all events are isAvg (for time delay display)
    const allAvgEvents = eventDataItems.length > 0 && eventDataItems.every((item: any) => item.isAvgEvent);
    const avgDelayTotal = allAvgEvents
        ? eventDataItems.reduce((sum: number, item: any) => sum + (item.avgDelayRaw || 0), 0) / eventDataItems.length
        : 0;
    // Get feature from first avg event for formatting
    const avgFeatureId = allAvgEvents ? eventDataItems[0]?.featureId : null;
    const formattedAvgDelay = allAvgEvents ? formatDelay(avgDelayTotal, avgFeatureId) : null;

    // Show only first 3 events in collapsed view, or all when expanded/pinned
    const visibleItems = isExpanded ? eventDataItems : eventDataItems.slice(0, 3);
    const hiddenCount = eventDataItems.length - 3;

    const stopEvent = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            className={cn(
                "relative overflow-hidden",
                isPinned
                    ? "bg-transparent p-3 md:p-4"
                    : "bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-3 backdrop-blur-md min-w-[260px] max-w-[380px]"
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
                        <motion.div
                            className={cn(
                                "h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg",
                                allAvgEvents
                                    ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/30"
                                    : "bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 shadow-purple-500/30"
                            )}
                            whileHover={{ rotate: 5, scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            {allAvgEvents ? (
                                <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            ) : (
                                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            )}
                        </motion.div>
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm md:text-base text-foreground leading-tight truncate">{label}</div>
                            <div className="text-[10px] md:text-[11px] text-muted-foreground font-medium mt-0.5">{eventDataItems.length} event{eventDataItems.length !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    {/* Overall stats - show formatted delay for isAvg events */}
                    <div className="text-right flex-shrink-0">
                        <div
                            className={cn(
                                "text-xl md:text-2xl font-extrabold bg-clip-text text-transparent",
                                allAvgEvents
                                    ? "bg-gradient-to-r from-amber-600 to-orange-600"
                                    : "bg-gradient-to-r from-purple-600 to-violet-600"
                            )}
                        >
                            {allAvgEvents && formattedAvgDelay ? formattedAvgDelay : totalCount.toLocaleString()}
                        </div>
                        <div className={cn(
                            "text-[10px] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full shadow-sm mt-1",
                            overallSuccessRate >= 90 ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                overallSuccessRate >= 70 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" :
                                    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        )}>
                            {overallSuccessRate.toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* Click to expand hint when not pinned */}
                {!isPinned && eventDataItems.length > 0 && (
                    <div className="text-[9px] text-center text-muted-foreground mb-2 opacity-70">
                        💡 Click on chart to lock & expand details
                    </div>
                )}

                {/* Per-Event Data with Success/Fail / Delay */}
                <div className={cn(
                    "space-y-2 md:space-y-2.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-purple-700",
                    isPinned ? "max-h-[300px] md:max-h-[400px]" : "max-h-60 md:max-h-72"
                )}>
                    {visibleItems.map((item: any, index: number) => (
                        <div
                            key={index}
                            className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200/50 dark:border-gray-700/30 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all"
                        >
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                                    <div
                                        className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-900"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-xs md:text-sm font-bold text-foreground truncate">{item.name}</span>
                                </div>
                                {/* For isAvg events, show formatted delay instead of raw count */}
                                {item.isAvgEvent && item.delayLabel ? (
                                    <span className="text-sm md:text-base font-extrabold text-amber-600 dark:text-amber-400 flex-shrink-0 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {item.delayLabel}
                                    </span>
                                ) : (
                                    <span className="text-sm md:text-base font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent flex-shrink-0">{item.count?.toLocaleString()}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] flex-wrap">
                                {item.isAvgEvent && item.delayLabel ? (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                                        Avg Delay: {item.delayLabel}
                                    </span>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-500/10">
                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            <span className="font-semibold text-green-700 dark:text-green-400">
                                                {item.successCount?.toLocaleString()}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 dark:bg-red-500/10">
                                            <XCircle className="w-3 h-3 text-red-500" />
                                            <span className="font-semibold text-red-700 dark:text-red-400">
                                                {item.errorCount?.toLocaleString()}
                                            </span>
                                        </span>
                                    </>
                                )}
                                <span className={cn(
                                    "ml-auto font-bold px-2 py-1 rounded-md text-[10px]",
                                    item.errorRate <= 10
                                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                        : item.errorRate <= 30
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                )}>
                                    {item.successRate.toFixed(0)}%
                                </span>
                            </div>
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
                        className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-500/20 dark:hover:to-violet-500/20 transition-all flex items-center justify-center gap-1.5 border border-purple-200/50 dark:border-purple-500/30 shadow-sm"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                +{hiddenCount} More Event{hiddenCount !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                )}

                {/* Footer with totals */}
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t-2 border-gray-100/80 dark:border-gray-800/80">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                        {allAvgEvents && formattedAvgDelay ? (
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Avg Delay: <span className="font-extrabold text-amber-600 dark:text-amber-400">{formattedAvgDelay}</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground font-medium">Total: <span className="font-extrabold text-foreground">{totalCount.toLocaleString()}</span></span>
                        )}
                        <div className="flex items-center gap-3">
                            <span
                                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-semibold"
                            >
                                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                                {totalSuccess.toLocaleString()}
                            </span>
                            <span
                                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-semibold"
                            >
                                <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                                {totalErrors.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
