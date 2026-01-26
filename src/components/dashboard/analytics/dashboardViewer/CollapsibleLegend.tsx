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
        <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-5 py-3 md:py-3.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
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
                        key={`${index}_${eventKeyInfo.eventKey}`}
                        id={`legend-${eventKeyInfo.eventKey}`}
                        className={cn(
                            "flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg bg-white dark:bg-gray-900 shadow-sm border cursor-pointer transition-all whitespace-nowrap",
                            isSelected
                                ? "border-indigo-500 ring-2 ring-indigo-500/30"
                                : "border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500/50"
                        )}
                        onClick={() => onEventClick?.(eventKeyInfo.eventKey)}
                    >
                        <div
                            className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full shadow-inner flex-shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px] md:max-w-[200px]">
                            {eventKeyInfo.eventName}
                        </span>
                        {eventKeyInfo.isErrorEvent === 1 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError</span>
                        )}
                        {(eventKeyInfo.isAvgEvent === 1 || eventKeyInfo.isAvgEvent === 2) && (
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                eventKeyInfo.isAvgEvent === 2
                                    ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                                    : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                            )}>
                                {eventKeyInfo.isAvgEvent === 2 ? 'isAvg₹' : 'isAvg'}
                            </span>
                        )}
                        <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                            {stats.total.toLocaleString()}
                        </span>

                        {/* Show delay time or rupees for avg events */}
                        {stats.isAvgEventType >= 1 && stats.avgDelay > 0 ? (
                            <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1",
                                stats.isAvgEventType === 2
                                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                            )}>
                                {stats.isAvgEventType === 2 ? null : <Clock className="w-3 h-3" />}
                                {formatDelayOrAmount(stats.avgDelay, stats.isAvgEventType, event?.feature)}
                            </span>
                        ) : (
                            <>
                                {/* Show error indicator for error events */}
                                {stats.isErrorEvent && (
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/90 text-white shadow-sm">
                                        ERR
                                    </span>
                                )}
                                <span className={cn(
                                    "text-xs font-semibold px-2.5 py-1 rounded-full",
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
                    className="flex items-center gap-1.5 h-9 px-3 md:px-4 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-500/20 rounded-lg transition-colors whitespace-nowrap"
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
