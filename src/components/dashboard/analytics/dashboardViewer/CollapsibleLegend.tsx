import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

import type { EventConfig } from '@/types/analytics';
import { cn } from '@/lib/utils';
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
        const isAvgEvent = event?.isAvgEvent === 1;

        let total = 0;
        let success = 0;
        let avgDelay = 0;
        let delayCount = 0;

        graphData.forEach((item: any) => {
            total += item[`${eventKey}_count`] || 0;
            success += item[`${eventKey}_success`] || 0;
            // For avg events, calculate average delay
            if (isAvgEvent && item[`${eventKey}_avgDelay`]) {
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
            isAvgEvent,
            avgDelay: meanDelay
        };
        return acc;
    }, {} as Record<string, { total: number; successCount: number; errorCount: number; successRate: number; errorRate: number; isErrorEvent: boolean; isAvgEvent: boolean; avgDelay: number }>);

    // Format delay time based on feature
    // Price Alert (feature 1) = value is already in MINUTES
    // Auto-Coupon, Spend (others) = value is already in SECONDS
    const formatDelay = (delayValue: number, featureId?: number) => {
        if (!delayValue || delayValue <= 0) return '0';
        if (featureId === 1) {
            // Price Alert - value is in minutes
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}h`;
            return `${delayValue.toFixed(1)}m`;
        } else {
            // Auto-Coupon, Spend - value is in seconds
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}m`;
            return `${delayValue.toFixed(1)}s`;
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
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

                // Color based on error rate (low error = green, high error = red)
                const rateColor = stats.errorRate <= 10
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                    : stats.errorRate <= 30
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";

                return (
                    <div
                        key={eventKeyInfo.eventKey}
                        id={`legend-${eventKeyInfo.eventKey}`}
                        className={cn(
                            "flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-white dark:bg-gray-900 shadow-sm border cursor-pointer transition-all whitespace-nowrap",
                            isSelected
                                ? "border-purple-500 ring-2 ring-purple-500/30"
                                : "border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500/50"
                        )}
                        onClick={() => onEventClick?.(eventKeyInfo.eventKey)}
                    >
                        <div
                            className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-inner flex-shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[80px] md:max-w-[120px]">
                            {eventKeyInfo.eventName}
                        </span>
                        {eventKeyInfo.isErrorEvent === 1 && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError</span>
                        )}
                        {eventKeyInfo.isAvgEvent === 1 && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">isAvg</span>
                        )}
                        <span className="text-[11px] md:text-xs font-semibold text-gray-900 dark:text-white">
                            {stats.total.toLocaleString()}
                        </span>

                        {/* Show delay time for avg events */}
                        {stats.isAvgEvent && stats.avgDelay > 0 ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDelay(stats.avgDelay, event?.feature)}
                            </span>
                        ) : (
                            <>
                                {/* Show error indicator for error events */}
                                {stats.isErrorEvent && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/90 text-white shadow-sm">
                                        ERR
                                    </span>
                                )}
                                <span className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                    rateColor
                                )}>
                                    {stats.successRate.toFixed(0)}%
                                </span>
                            </>
                        )}
                    </div>
                );
            })}
            {eventKeys.length > maxVisibleItems && (
                <button
                    onClick={onToggle}
                    className="flex items-center gap-1 h-7 px-2 md:px-3 text-[11px] md:text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-md transition-colors whitespace-nowrap"
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
