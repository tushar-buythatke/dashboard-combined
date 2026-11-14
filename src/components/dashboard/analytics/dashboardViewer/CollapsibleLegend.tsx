import { ChevronDown, ChevronUp } from 'lucide-react';

import type { EventConfig } from '@/types/analytics';
import type { EventKeyInfo } from './types';
import { ERROR_COLORS, EVENT_COLORS } from './constants';

// Collapsible Legend Component - Smart dropdown for multiple events with success/failure stats
export const CollapsibleLegend = ({
    eventKeys,
    events,
    isExpanded,
    onToggle,
    maxVisibleItems = 4,
    graphData = [],
    selectedEventKey = null,
    onEventClick
}: {
    eventKeys: EventKeyInfo[];
    events: EventConfig[];
    isExpanded: boolean;
    onToggle: () => void;
    maxVisibleItems?: number;
    graphData?: any[];
    selectedEventKey?: string | null;
    onEventClick?: (eventKey: string) => void;
}) => {
    if (!eventKeys || eventKeys.length === 0) return null;

    // Sort API events by status code numerically (200, 400, 499, 500, etc.)
    const sortedEventKeys = [...eventKeys].sort((a, b) => {
        // Extract status code from event name (e.g., "200", "status_200", etc.)
        const extractStatusCode = (name: string) => {
            const match = name.match(/\d{3}/);
            return match ? parseInt(match[0]) : 999;
        };
        const aNum = extractStatusCode(a.eventName);
        const bNum = extractStatusCode(b.eventName);
        return aNum - bNum;
    });

    const visibleItems = isExpanded ? sortedEventKeys : sortedEventKeys.slice(0, maxVisibleItems);
    const hiddenCount = sortedEventKeys.length - maxVisibleItems;

    // Calculate per-event totals and success rates from graphData
    const eventStats = sortedEventKeys.reduce((acc, eventKeyInfo) => {
        const eventKey = eventKeyInfo.eventKey;
        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
        const isErrorEvent = event?.isErrorEvent === 1;
        const isAvgEventType = event?.isAvgEvent || 0; // 0=count, 1=time, 2=rupees, 3=avg count

        let total = 0;
        let success = 0;
        let avgDelay = 0;
        let delayCount = 0;

        graphData.forEach((item: any) => {
            total += item[`${eventKey}_count`] || 0;
            success += item[`${eventKey}_success`] || 0;
            // For avg events, calculate average delay
            if (isAvgEventType >= 1 && item[`${eventKey}_avgDelay`]) {
                avgDelay += item[`${eventKey}_avgDelay`];
                delayCount++;
            }
        });

        // For error events: success is actually error count
        const errorCount = isErrorEvent ? success : (total - success);
        const successCount = isErrorEvent ? (total - success) : success;
        const errorRate = total > 0 ? (errorCount / total) * 100 : 0;
        const successRate = total > 0 ? (successCount / total) * 100 : 0;
        const meanDelay = delayCount > 0 ? avgDelay / delayCount : 0;

        acc[eventKey] = {
            total,
            successCount,
            errorCount,
            successRate,
            errorRate,
            isErrorEvent,
            isAvgEventType,
            avgDelay: meanDelay
        };
        return acc;
    }, {} as Record<string, { total: number; successCount: number; errorCount: number; successRate: number; errorRate: number; isErrorEvent: boolean; isAvgEventType: number; avgDelay: number }>);

    // Format delay time or amount based on isAvgEventType
    // isAvgEventType 1 = time (ms/s/m/h)
    // isAvgEventType 2 = rupees
    const formatDelayOrAmount = (value: number, isAvgEventType: number, featureId?: number) => {
        if (!value || value <= 0) return '0';

        // Rupees (isAvgEventType 2)
        if (isAvgEventType === 2) {
            if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        }

        // Time-based delay (isAvgEventType 1 or legacy)
        if (featureId === 1) {
            // Price Alert - value is in minutes
            if (value >= 60) return `${(value / 60).toFixed(1)}h`;
            return `${value.toFixed(1)}m`;
        } else {
            // Auto-Coupon, Spend - value is in seconds
            if (value >= 60) return `${(value / 60).toFixed(1)}m`;
            return `${value.toFixed(1)}s`;
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {visibleItems.map((eventKeyInfo, index) => {
                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                const isErrorEvent = event?.isErrorEvent === 1;

                // Assign color based on status code for API events
                let color;
                // Extract status code from event name
                const statusMatch = eventKeyInfo.eventName.match(/\d{3}/);
                const statusCode = statusMatch ? parseInt(statusMatch[0]) : NaN;
                if (!isNaN(statusCode)) {
                    // HTTP status code coloring
                    if (statusCode >= 200 && statusCode < 300) {
                        color = '#22c55e'; // Green for 2xx (including 200)
                    } else if (statusCode >= 400 && statusCode < 500) {
                        color = '#f59e0b'; // Orange/yellow for 4xx
                    } else if (statusCode >= 500) {
                        color = '#ef4444'; // Red for 5xx
                    } else {
                        color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                    }
                } else {
                    color = event?.color || (isErrorEvent ? ERROR_COLORS[index % ERROR_COLORS.length] : EVENT_COLORS[index % EVENT_COLORS.length]);
                }

                const stats = eventStats[eventKeyInfo.eventKey] || { total: 0, successRate: 0, errorRate: 0, isErrorEvent: false, isAvgEvent: false, avgDelay: 0 };
                const isSelected = selectedEventKey === eventKeyInfo.eventKey;

                const rateTone = stats.errorRate <= 10 ? 'var(--e-mint)' : stats.errorRate <= 30 ? 'var(--e-amber)' : 'var(--e-red)';
                const metric = stats.isAvgEventType >= 1 && stats.avgDelay > 0
                    ? formatDelayOrAmount(stats.avgDelay, stats.isAvgEventType, event?.feature)
                    : `${stats.successRate.toFixed(0)}%`;
                const tags = [
                    eventKeyInfo.isErrorEvent === 1 || stats.isErrorEvent ? 'error' : null,
                    eventKeyInfo.isAvgEvent === 2 ? 'avg ₹' : eventKeyInfo.isAvgEvent === 1 ? 'avg' : null,
                ].filter(Boolean);

                return (
                    <button
                        type="button"
                        key={`${index}_${eventKeyInfo.eventKey}`}
                        id={`legend-${eventKeyInfo.eventKey}`}
                        aria-pressed={isSelected}
                        className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] transition-colors"
                        style={isSelected
                            ? { background: 'var(--e-ink-pill)', color: 'var(--e-canvas)' }
                            : { background: 'var(--e-surface-2)', color: 'var(--e-ink-2)' }}
                        onClick={() => onEventClick?.(eventKeyInfo.eventKey)}
                    >
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="max-w-[160px] truncate font-bold md:max-w-[220px]" title={eventKeyInfo.eventName}>
                            {eventKeyInfo.eventName}
                        </span>
                        {tags.map((t) => (
                            <span key={t as string} className="text-[10.5px] font-bold opacity-60">{t}</span>
                        ))}
                        <span className="tabular-nums opacity-80">{stats.total.toLocaleString()}</span>
                        <span className="tabular-nums text-[12px] font-bold" style={{ color: isSelected ? undefined : rateTone }}>{metric}</span>
                    </button>
                );
            })}
            {eventKeys.length > maxVisibleItems && (
                <button
                    onClick={onToggle}
                    className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-bold transition-colors hover:bg-[var(--e-surface-3)]"
                    style={{ color: 'var(--e-ink-2)' }}
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            <span className="hidden sm:inline">Show less</span>
                            <span className="sm:hidden">Less</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            <span className="hidden sm:inline">+{hiddenCount} more</span>
                            <span className="sm:hidden">+{hiddenCount}</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
};
