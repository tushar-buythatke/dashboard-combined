import React, { useEffect, useState } from 'react';
// Removed framer-motion for performance
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    const isPartialLatestDay = Boolean((data as any)?.isPartialLatestDay);


    return (
        <div
            className={cn(
                "relative z-[1000] overflow-visible",
                isPinned
                    ? "bg-transparent p-3 md:p-4 pointer-events-auto"
                    : "rounded-[22px] bg-[var(--e-surface)] shadow-[0_0_0_1px_var(--e-line),0_30px_60px_-24px_rgba(0,0,0,0.45)] px-4 py-3.5 min-w-[280px] max-w-[380px]"
            )}

            onMouseMoveCapture={stopEvent}
            onWheelCapture={stopEvent}
            onClick={stopEvent}
        >

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold leading-tight" style={{ color: 'var(--e-ink)' }}>{label}</div>
                        <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--e-ink-3)' }}>
                            {eventDataItems.length} {itemLabel}{eventDataItems.length !== 1 ? 's' : ''}
                            {sumTotalUsers > 0 && <> · {formatMetric(sumTotalUsers, 'count')} users · {formatMetric(sumNewUsers, 'count')} new</>}
                        </div>
                        {isPartialLatestDay && (
                            <div className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: 'color-mix(in srgb, var(--e-amber) 16%, transparent)', color: 'var(--e-amber)' }}>
                                Still accumulating
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                        <div className="text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--e-ink)' }}>
                            {someAvgEvents && formattedAvgMetric ? formattedAvgMetric : formatMetric(totalCount, 'count')}
                        </div>
                        <div
                            className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                            style={{
                                background: `color-mix(in srgb, ${overallSuccessRate >= 90 ? 'var(--e-mint)' : overallSuccessRate >= 70 ? 'var(--e-amber)' : 'var(--e-red)'} 14%, transparent)`,
                                color: overallSuccessRate >= 90 ? 'var(--e-mint)' : overallSuccessRate >= 70 ? 'var(--e-amber)' : 'var(--e-red)',
                            }}
                        >
                            {overallSuccessRate.toFixed(0)}% ok
                        </div>
                    </div>
                </div>

                {/* Per-event rows */}
                <div className={cn("mt-3 space-y-1 overflow-y-auto pr-1", isPinned ? "max-h-[300px] md:max-h-[400px]" : "max-h-64")}>
                    {visibleItems.map((item: any, index: number) => (
                        <div key={index} className="rounded-[14px] px-2.5 py-2" style={{ background: 'var(--e-surface-2)' }}>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold" style={{ color: 'var(--e-ink)' }} title={item.name}>{item.name}</span>
                                <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--e-ink)' }}>
                                    {item.isAvgEvent && item.metricLabel ? item.metricLabel : formatMetric(item.count, 'count')}
                                </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 pl-[18px] text-[11px] tabular-nums" style={{ color: 'var(--e-ink-3)' }}>
                                <span className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--e-surface-3)' }}>
                                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, item.successRate))}%`, background: item.successRate >= 90 ? 'var(--e-mint)' : item.successRate >= 70 ? 'var(--e-amber)' : 'var(--e-red)' }} />
                                </span>
                                {item.isAvgEvent && <span>{formatMetric(item.count, 'count')} reqs</span>}
                                <span style={{ color: 'var(--e-mint)' }}>{formatMetric(item.successCount, 'count')} ok</span>
                                <span style={{ color: 'var(--e-red)' }}>{formatMetric(item.errorCount, 'count')} err</span>
                                <span className="font-bold" style={{ color: 'var(--e-ink-2)' }}>{item.successRate.toFixed(0)}%</span>
                            </div>
                        </div>
                    ))}
                </div>

                {eventDataItems.length > 3 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-full py-1.5 text-[11.5px] font-bold"
                        style={{ background: 'var(--e-surface-2)', color: 'var(--e-ink-2)' }}
                    >
                        {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" />Show less</> : <><ChevronDown className="h-3.5 w-3.5" />{hiddenCount} more</>}
                    </button>
                )}

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2.5 text-[11.5px] tabular-nums" style={{ borderColor: 'var(--e-line)', color: 'var(--e-ink-3)' }}>
                    <span>{someAvgEvents && formattedAvgMetric ? <>Avg <b style={{ color: 'var(--e-ink)' }}>{formattedAvgMetric}</b></> : (!isPinned ? 'Click to pin' : 'Totals')}</span>
                    <span className="flex items-center gap-2.5">
                        <span><b style={{ color: 'var(--e-ink)' }}>{formatMetric(totalCount, 'count')}</b> reqs</span>
                        <span><b style={{ color: 'var(--e-mint)' }}>{formatMetric(totalSuccess, 'count')}</b> ok</span>
                        <span><b style={{ color: 'var(--e-red)' }}>{formatMetric(totalErrors, 'count')}</b> err</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
