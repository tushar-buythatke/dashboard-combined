import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart, ReferenceLine, ComposedChart, Scatter, PieChart, Pie, Cell } from 'recharts';
import { Percent, TrendingUp, TrendingDown, X, BarChart3, Activity, AlertTriangle, Maximize2, PieChart as PieChartIcon } from 'lucide-react';
import { useChartZoom } from '@/hooks/useChartZoom';
import { ChartZoomControls } from '../components/ChartZoomControls';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import type { EventConfig } from '@/types/analytics';
import { PIE_COLORS } from '../dashboardViewer/constants';
import { PieTooltip } from '../dashboardViewer/PieTooltip';

interface PercentageGraphProps {
    data: any[];
    dateRange?: { from: Date; to: Date };
    parentEvents: string[];
    childEvents: string[];
    eventColors: Record<string, string>;
    eventNames: Record<string, string>;
    filters?: {
        statusCodes: string[];
        cacheStatus: string[];
    };
    showCombinedPercentage?: boolean;
    isHourly?: boolean;
    onToggleHourly?: (isHourly: boolean) => void;
    onToggleBackToFunnel?: () => void;
    events?: EventConfig[]; // Event configurations to detect isAvgEvent type
    onExpand?: () => void; // Callback for expansion button
    eventPieCharts?: Record<string, any>;
}

/**
 * Percentage Graph Component
 * Shows percentage calculation: (Child Events successCount / Parent Events successCount) × 100
 * Uses ONLY graph API data with successCount field
 */
export function PercentageGraph({
    data,
    dateRange,
    parentEvents,
    childEvents,
    eventColors,
    eventNames,
    filters,
    showCombinedPercentage = true,
    isHourly = true,
    onToggleHourly,
    onToggleBackToFunnel,
    events = [],
    onExpand,
    eventPieCharts = {},
}: PercentageGraphProps) {
    const { t: themeClasses } = useAccentTheme();
    const { zoomLevel, zoomIn, zoomOut, resetZoom, handleWheel } = useChartZoom({ minZoom: 0.5, maxZoom: 3 });
    const debug = false;
    if (debug) {
        console.log('=== PercentageGraph Debug ===');
        console.log('PercentageGraph received data:', data.length, 'records');
        console.log('Parent events:', parentEvents);
        console.log('Child events:', childEvents);
        console.log('Filters:', filters);

        if (data.length > 0) {
            console.log('Sample data record:', data[0]);
            console.log('Sample record keys:', Object.keys(data[0]));
            console.log('Sample record.successCount:', data[0].successCount);
            console.log('Sample record.count:', data[0].count);
            console.log('Sample record.status:', data[0].status);
            console.log('Sample record.eventId:', data[0].eventId);
        }
    }

    const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
    // Distribution mode state for each event: platform | pos | source
    const [eventDistModes, setEventDistModes] = useState<Record<string, 'platform' | 'pos' | 'source'>>({});
    // Line selection state: null = show all, 'all' = show all (explicit), or specific line ID
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

    // Detect isAvgEvent type from child events: 0=count, 1=time(ms), 2=rupees
    const isAvgEventType = useMemo(() => {
        if (!events || events.length === 0) return 0;
        // Check child events first
        for (const childEventId of childEvents) {
            const eventConfig = events.find(e => String(e.eventId) === String(childEventId));
            if (eventConfig?.isAvgEvent && eventConfig.isAvgEvent >= 1) {
                return eventConfig.isAvgEvent;
            }
        }
        // Check parent events as fallback
        for (const parentEventId of parentEvents) {
            const eventConfig = events.find(e => String(e.eventId) === String(parentEventId));
            if (eventConfig?.isAvgEvent && eventConfig.isAvgEvent >= 1) {
                return eventConfig.isAvgEvent;
            }
        }
        return 0;
    }, [events, childEvents, parentEvents]);

    // Format value based on isAvgEventType
    const formatValue = (value: number, forAxis = false) => {
        if (!value || value <= 0) return forAxis ? '0' : '0';

        if (isAvgEventType === 2) {
            // isAvgEvent 2 = Rupees
            if (forAxis) {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
                return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
            }
            return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        } else if (isAvgEventType === 1) {
            // isAvgEvent 1 = Time in ms
            if (value >= 60000) {
                // More than a minute - show in minutes
                return forAxis ? `${(value / 60000).toFixed(1)}m` : `${(value / 60000).toFixed(2)} min`;
            } else if (value >= 1000) {
                // More than a second - show in seconds
                return forAxis ? `${(value / 1000).toFixed(1)}s` : `${(value / 1000).toFixed(2)} sec`;
            }
            return forAxis ? `${value.toFixed(0)}ms` : `${value.toFixed(2)} ms`;
        }
        // Default: count
        if (forAxis) {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toLocaleString();
    };

    // Get Y-axis label based on isAvgEventType
    const getYAxisLabel = () => {
        if (isAvgEventType === 2) return 'Amount (₹)';
        if (isAvgEventType === 1) return 'Delay (ms)';
        return 'Percentage (%)';
    };


    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // DETECT: Same parent and child events = show successCount and failCount as 2 lines
        const isSameParentChild = parentEvents.length === childEvents.length &&
            parentEvents.every(pe => childEvents.includes(pe));

        // Check data format: raw API data has eventId, processed has _success/_count keys
        const isRawApiData = data.some(r => r.eventId !== undefined);
        const hasSuccessFailData = data.some(r =>
            (r.successCount !== undefined && r.failCount !== undefined) ||
            data.some(d => Object.keys(d).some(k => k.endsWith('_success') || k.endsWith('_fail')))
        );

        // If same parent/child, we'll show success% and fail% instead of child/parent ratio
        if (isSameParentChild && (isRawApiData || hasSuccessFailData)) {
            const groupedData: Record<string, {
                count: number;
                successCount: number;
                failCount: number;
                timestamp: number;
                hasAnomaly: boolean;
            }> = {};

            data.forEach((record) => {
                const date = new Date(record.timestamp || record.date);
                const timeKey = isHourly
                    ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.getHours()}:00`
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                parentEvents.forEach((eventId) => {
                    let count = 0;
                    let successCount = 0;
                    let failCount = 0;
                    let hasMatch = false;

                    if (isRawApiData && record.eventId !== undefined && String(record.eventId) === String(eventId)) {
                        // Raw API data format
                        count = Number(record.count || 0);
                        successCount = Number(record.successCount || 0);
                        failCount = Number(record.failCount || 0);
                        hasMatch = true;
                    } else if (!isRawApiData) {
                        // Processed data format - look for _success and _fail keys
                        const successKey = `${eventId}_success`;
                        const failKey = `${eventId}_fail`;
                        const countKey = `${eventId}_count`;

                        if (record[successKey] !== undefined || record[countKey] !== undefined) {
                            successCount = Number(record[successKey] || 0);
                            failCount = Number(record[failKey] || 0);
                            count = Number(record[countKey] || successCount + failCount);
                            hasMatch = true;
                        }
                    }

                    if (!hasMatch) return;

                    if (!groupedData[timeKey]) {
                        groupedData[timeKey] = {
                            count: 0,
                            successCount: 0,
                            failCount: 0,
                            timestamp: date.getTime(),
                            hasAnomaly: false,
                        };
                    }

                    groupedData[timeKey].count += count;
                    groupedData[timeKey].successCount += successCount;
                    groupedData[timeKey].failCount += failCount;

                    // Anomaly detection: successCount + failCount != count
                    if (count > 0 && Math.abs((successCount + failCount) - count) > 1) {
                        groupedData[timeKey].hasAnomaly = true;
                    }
                });
            });

            // Only return if we have data
            const entries = Object.entries(groupedData);
            if (entries.length > 0) {
                return entries
                    .map(([timeKey, values]) => ({
                        time: timeKey,
                        timestamp: values.timestamp,
                        count: values.count,
                        successCount: values.successCount,
                        failCount: values.failCount,
                        // Calculate percentages relative to count
                        success_percentage: values.count > 0 ? (values.successCount / values.count) * 100 : 0,
                        fail_percentage: values.count > 0 ? (values.failCount / values.count) * 100 : 0,
                        child_success_percentage: values.count > 0 ? (values.successCount / values.count) * 100 : 0,
                        child_fail_percentage: values.count > 0 ? (values.failCount / values.count) * 100 : 0,
                        percentage: values.count > 0 ? (values.successCount / values.count) * 100 : 0, // Default combined
                        hasAnomaly: values.hasAnomaly,
                        anomalyValue: values.hasAnomaly ? (values.count > 0 ? (values.successCount / values.count) * 100 : 0) : null,
                        isSameParentChild: true,
                        isAvgMetric: false,
                        parentCount: values.count,
                        childCount: values.successCount,
                        parentBreakdown: {} as Record<string, number>,
                        childBreakdown: {} as Record<string, number>,
                        parent_percentage: 100,
                    }))
                    .sort((a, b) => a.timestamp - b.timestamp);
            }
            // Fall through to regular processing if no data matched
        }


        // --- PATCH: Fallback to count if all successCount are zero in visible data ---
        let alwaysUseCountInsteadOfSuccess = false;
        const sample = data.find(
            (d) => typeof d === 'object' && (d.successCount !== undefined || d.count !== undefined)
        );
        if (sample) {
            let hasAnySuccess = false;
            let hasAnyCount = false;
            for (const rec of data) {
                if (typeof rec !== 'object') continue;
                if (typeof rec.successCount === 'number' && rec.successCount > 0) hasAnySuccess = true;
                if (typeof rec.count === 'number' && rec.count > 0) hasAnyCount = true;
            }
            if (!hasAnySuccess && hasAnyCount) {
                alwaysUseCountInsteadOfSuccess = true;
                if (typeof window !== 'undefined') {
                    // Silently fall back to count for % calculation
                }
            }
        }

        const statusCodes = (filters?.statusCodes || []).filter(Boolean);
        const cacheStatuses = (filters?.cacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        // Early return for no filters to avoid unnecessary processing
        if (!hasStatusFilter && !hasCacheFilter) {
            const groupedData: Record<string, {
                parentTotal: number;
                childTotal: number;
                timestamp: number;
                parentBreakdown: Record<string, number>;
                childBreakdown: Record<string, number>;
                parentAvgSum: number;
                parentAvgCount: number;
                childAvgSum: number;
                childAvgCount: number;
                childAvgData: Record<string, { sum: number; count: number }>;
                isAvgMetric: boolean;
            }> = {};

            data.forEach((record) => {
                const date = new Date(record.timestamp || record.date);
                const timeKey = isHourly
                    ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.getHours()}:00`
                    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (!groupedData[timeKey]) {
                    groupedData[timeKey] = {
                        parentTotal: 0,
                        childTotal: 0,
                        timestamp: date.getTime(),
                        parentBreakdown: {},
                        childBreakdown: {},
                        parentAvgSum: 0,
                        parentAvgCount: 0,
                        childAvgSum: 0,
                        childAvgCount: 0,
                        childAvgData: {},
                        isAvgMetric: false,
                    };
                }

                // Fast path for unfiltered data
                // Detect record type: avgDelay records have avgDelay field, API count records have status field
                const isRawApiData = record.eventId !== undefined;
                const hasAvgData = record.avgDelay !== undefined || record.avg !== undefined;
                const hasStatusData = record.status !== undefined;

                parentEvents.forEach((eventId) => {
                    if (isRawApiData && String(record.eventId) === String(eventId)) {
                        // CRITICAL: Check hasStatusData FIRST because API data includes avgDelay:0 which falsely triggers hasAvgData
                        if (hasStatusData) {
                            // For API events with status codes - ALWAYS use count
                            // Each record represents a specific status code, count is the total for that status
                            const count = Number(record.count || 0);
                            const statusKey = `status_${record.status}`;
                            groupedData[timeKey].parentTotal += count;
                            groupedData[timeKey].parentBreakdown[statusKey] = (groupedData[timeKey].parentBreakdown[statusKey] || 0) + count;
                        } else if (hasAvgData && Number(record.avgDelay || record.avg || 0) > 0) {
                            // For avg metrics (only when avgDelay > 0), track sum and count
                            const avgValue = Number(record.avgDelay || record.avg || 0);
                            groupedData[timeKey].parentAvgSum += avgValue;
                            groupedData[timeKey].parentAvgCount += 1;
                            groupedData[timeKey].isAvgMetric = true;
                        } else {
                            // For aggregated API data (no status breakdown), parent uses TOTAL count
                            // This represents all requests regardless of status
                            const totalCount = Number(record.count || 0);
                            groupedData[timeKey].parentTotal += totalCount;
                            groupedData[timeKey].parentBreakdown[eventId] = (groupedData[timeKey].parentBreakdown[eventId] || 0) + totalCount;
                        }
                    } else if (!isRawApiData) {
                        const count = Number(record[`${eventId}_success`] || record[`${eventId}_count`] || 0);
                        groupedData[timeKey].parentTotal += count;
                        groupedData[timeKey].parentBreakdown[eventId] = (groupedData[timeKey].parentBreakdown[eventId] || 0) + count;
                    }
                });

                childEvents.forEach((eventId) => {
                    if (isRawApiData && String(record.eventId) === String(eventId)) {
                        // CRITICAL: Check hasStatusData FIRST because API data includes avgDelay:0 which falsely triggers hasAvgData
                        if (hasStatusData) {
                            // For API events with status codes - ALWAYS use count
                            // Each record represents a specific status code, count is the total for that status
                            const count = Number(record.count || 0);
                            const statusKey = `status_${record.status}`;
                            groupedData[timeKey].childTotal += count;
                            groupedData[timeKey].childBreakdown[statusKey] = (groupedData[timeKey].childBreakdown[statusKey] || 0) + count;
                        } else if (hasAvgData && Number(record.avgDelay || record.avg || 0) > 0) {
                            // For avg metrics (only when avgDelay > 0), track sum and count PER CHILD EVENT and overall
                            const avgValue = Number(record.avgDelay || record.avg || 0);
                            if (!groupedData[timeKey].childAvgData[eventId]) {
                                groupedData[timeKey].childAvgData[eventId] = { sum: 0, count: 0 };
                            }
                            groupedData[timeKey].childAvgData[eventId].sum += avgValue;
                            groupedData[timeKey].childAvgData[eventId].count += 1;
                            // Track overall child average
                            groupedData[timeKey].childAvgSum += avgValue;
                            groupedData[timeKey].childAvgCount += 1;
                            groupedData[timeKey].isAvgMetric = true;
                        } else {
                            // For aggregated API data (no status breakdown), child uses SUCCESS count
                            // This represents successful requests (2xx) - the "filtered" view
                            const successCount = Number(record.successCount || 0);
                            groupedData[timeKey].childTotal += successCount;
                            groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + successCount;
                        }
                    } else if (!isRawApiData) {
                        const count = Number(record[`${eventId}_success`] || record[`${eventId}_count`] || 0);
                        groupedData[timeKey].childTotal += count;
                        groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
                    }
                });
            });

            return Object.entries(groupedData)
                .map(([timeKey, values]) => {
                    // For avg metrics, compute the actual average
                    const parentValue = values.isAvgMetric
                        ? (values.parentAvgCount > 0 ? values.parentAvgSum / values.parentAvgCount : 0)
                        : values.parentTotal;

                    let childValue = 0;
                    const finalChildBreakdown: Record<string, number> = {};

                    if (values.isAvgMetric) {
                        // For avgDelay: compute overall child average
                        childValue = values.childAvgCount > 0 ? values.childAvgSum / values.childAvgCount : 0;
                        // Also compute per-child breakdown for tooltip and individual lines
                        Object.entries(values.childAvgData).forEach(([eventId, data]) => {
                            const avg = data.count > 0 ? data.sum / data.count : 0;
                            finalChildBreakdown[eventId] = avg;
                        });
                    } else {
                        // For count metrics: use existing breakdown
                        childValue = values.childTotal;
                        Object.assign(finalChildBreakdown, values.childBreakdown);
                    }

                    // Calculate individual child percentages for separate lines
                    const childPercentages: Record<string, number> = {};
                    Object.entries(finalChildBreakdown).forEach(([childId, childVal]) => {
                        childPercentages[`child_${childId}_percentage`] = parentValue > 0 ? (childVal / parentValue) * 100 : 0;
                    });

                    return {
                        time: timeKey,
                        percentage: parentValue > 0 ? (childValue / parentValue) * 100 : 0,
                        parentCount: parentValue,
                        childCount: childValue,
                        timestamp: values.timestamp,
                        parentBreakdown: values.parentBreakdown,
                        childBreakdown: finalChildBreakdown,
                        isAvgMetric: values.isAvgMetric,
                        isSameParentChild: false,
                        hasAnomaly: false,
                        ...childPercentages, // Add individual child percentage fields
                        parent_percentage: parentValue > 0 ? 100 : 0, // Parent line at 100%
                    };
                })
                .sort((a, b) => a.timestamp - b.timestamp);
        }



        const groupedData: Record<string, {
            parentTotal: number;
            childTotal: number;
            timestamp: number;
            parentBreakdown: Record<string, number>;
            childBreakdown: Record<string, number>;
            parentAvgSum: number;
            parentAvgCount: number;
            childAvgSum: number;
            childAvgCount: number;
            childAvgData: Record<string, { sum: number; count: number }>;
            isAvgMetric: boolean;
        }> = {};

        data.forEach((record) => {
            const date = new Date(record.timestamp || record.date);
            const timeKey = isHourly
                ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${date.getHours()}:00`
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!groupedData[timeKey]) {
                groupedData[timeKey] = {
                    parentTotal: 0,
                    childTotal: 0,
                    timestamp: date.getTime(),
                    parentBreakdown: {},
                    childBreakdown: {},
                    parentAvgSum: 0,
                    parentAvgCount: 0,
                    childAvgSum: 0,
                    childAvgCount: 0,
                    childAvgData: {},
                    isAvgMetric: false,
                };
            }

            parentEvents.forEach((eventId) => {
                // Parent events are ALWAYS unfiltered - use total count regardless of filters
                let totalCount = 0;

                // Check if this is raw API data (has eventId field)
                const isRawApiData = record.eventId !== undefined;
                const hasAvgData = record.avgDelay !== undefined || record.avg !== undefined;
                const hasStatusData = record.status !== undefined;

                if (isRawApiData) {
                    // Raw API data - sum all records for this eventId (unfiltered total)
                    if (String(record.eventId) === String(eventId)) {
                        // CRITICAL: Check hasStatusData FIRST because API data includes avgDelay:0 which falsely triggers hasAvgData
                        if (hasStatusData) {
                            // For API events with status codes - use count for parent total
                            totalCount = Number(record.count || 0);
                            const statusKey = `status_${record.status}`;
                            groupedData[timeKey].parentBreakdown[statusKey] =
                                (groupedData[timeKey].parentBreakdown[statusKey] || 0) + totalCount;
                            groupedData[timeKey].parentTotal += totalCount;
                        } else if (hasAvgData && Number(record.avgDelay || record.avg || 0) > 0) {
                            // For avg metrics (only when avgDelay > 0), track sum and count
                            const avgValue = Number(record.avgDelay || record.avg || 0);
                            groupedData[timeKey].parentAvgSum += avgValue;
                            groupedData[timeKey].parentAvgCount += 1;
                            groupedData[timeKey].isAvgMetric = true;
                        } else {
                            totalCount = Number(record.count || 0);
                            groupedData[timeKey].parentBreakdown[eventId] =
                                (groupedData[timeKey].parentBreakdown[eventId] || 0) + totalCount;
                            groupedData[timeKey].parentTotal += totalCount;
                        }
                    }
                } else {
                    // Processed data - use existing key-based logic
                    const baseName = eventNames[String(eventId)] || `Event ${eventId}`;
                    const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                    // Check if this is an API event by looking for status/cache breakdown in the data
                    const hasApiBreakdown = Object.keys(record).some(key => key.includes(`${eventKey}_status_`) || key.includes(`${eventKey}_cache_`));

                    if (hasApiBreakdown) {
                        // Sum all status codes and cache combinations for total unfiltered count
                        Object.keys(record).forEach(key => {
                            if (key.startsWith(`${eventKey}_status_`) && key.endsWith('_count')) {
                                const count = Number(record[key] || 0);
                                totalCount += count;
                                // Extract status code from key (format: eventKey_status_XXX_count)
                                const statusMatch = key.match(/_status_(\d+)_/);
                                if (statusMatch && statusMatch[1]) {
                                    const statusKey = `status_${statusMatch[1]}`;
                                    groupedData[timeKey].parentBreakdown[statusKey] =
                                        (groupedData[timeKey].parentBreakdown[statusKey] || 0) + count;
                                }
                            }
                        });
                    } else {
                        // Regular event - use success or count key
                        const successKey = `${eventId}_success`;
                        const countKey = `${eventId}_count`;
                        totalCount = Number(record[successKey] || record[countKey] || 0);
                    }
                }

                // Only add to parentTotal for non-raw API data (raw API data already handled above)
                if (!isRawApiData) {
                    groupedData[timeKey].parentTotal += totalCount;
                    groupedData[timeKey].parentBreakdown[eventId] =
                        (groupedData[timeKey].parentBreakdown[eventId] || 0) + totalCount;
                }
            });

            childEvents.forEach((eventId) => {
                let count = 0;

                // Check if this is raw API data (has eventId field)
                const isRawApiData = record.eventId !== undefined;
                const hasAvgData = record.avgDelay !== undefined || record.avg !== undefined;
                const hasStatusData = record.status !== undefined;

                if (isRawApiData) {
                    // Raw API data - match eventId and apply filters directly
                    if (String(record.eventId) === String(eventId)) {
                        // CRITICAL: Check hasStatusData FIRST because API data includes avgDelay:0 which falsely triggers hasAvgData
                        if (hasStatusData) {
                            // For count metrics with status/cache filters
                            const recordStatus = String(record.status);
                            const recordCache = String(record.cacheStatus || 'none');

                            const statusMatch = !hasStatusFilter || statusCodes.some(s => String(s) === recordStatus);
                            const cacheMatch = !hasCacheFilter || cacheStatuses.some(c => String(c) === recordCache);

                            if (statusMatch && cacheMatch) {
                                // For API events with status codes - ALWAYS use count
                                count = Number(record.count || 0);
                                // Track by status code for breakdown
                                const statusKey = `status_${recordStatus}`;
                                groupedData[timeKey].childBreakdown[statusKey] =
                                    (groupedData[timeKey].childBreakdown[statusKey] || 0) + count;
                                groupedData[timeKey].childTotal += count;
                            }
                        } else if (hasAvgData && Number(record.avgDelay || record.avg || 0) > 0) {
                            // For avg metrics (only when avgDelay > 0), track sum and count PER CHILD EVENT and overall
                            const avgValue = Number(record.avgDelay || record.avg || 0);
                            if (!groupedData[timeKey].childAvgData[eventId]) {
                                groupedData[timeKey].childAvgData[eventId] = { sum: 0, count: 0 };
                            }
                            groupedData[timeKey].childAvgData[eventId].sum += avgValue;
                            groupedData[timeKey].childAvgData[eventId].count += 1;
                            // Track overall child average
                            groupedData[timeKey].childAvgSum += avgValue;
                            groupedData[timeKey].childAvgCount += 1;
                            groupedData[timeKey].isAvgMetric = true;
                        } else {
                            // For aggregated API data (no status breakdown), child uses SUCCESS count
                            // This represents successful requests (2xx) - the "filtered" view
                            const successCount = Number(record.successCount || 0);
                            groupedData[timeKey].childBreakdown[eventId] =
                                (groupedData[timeKey].childBreakdown[eventId] || 0) + successCount;
                            groupedData[timeKey].childTotal += successCount;
                        }
                    }
                } else {
                    // Processed data - use existing key-based logic
                    if (hasStatusFilter || hasCacheFilter) {
                        const baseName = eventNames[String(eventId)] || `Event ${eventId}`;
                        const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                        if (hasStatusFilter && hasCacheFilter) {
                            // Prefer combined keys if the backend provides them.
                            // If not present (only separate status/cache keys exist), fall back to status-only filtering.
                            const hasCombinedKeys = statusCodes.some((status) =>
                                cacheStatuses.some((cache) => Object.prototype.hasOwnProperty.call(record, `${eventKey}_status_${status}_cache_${cache}_count`))
                            );

                            if (hasCombinedKeys) {
                                statusCodes.forEach((status) => {
                                    cacheStatuses.forEach((cache) => {
                                        const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                                        const countKey = `${combinedKey}_count`;
                                        count += Number(record[countKey] || 0);
                                    });
                                });
                            } else {
                                statusCodes.forEach((status) => {
                                    const statusKey = `${eventKey}_status_${status}`;
                                    const countKey = `${statusKey}_count`;
                                    count += Number(record[countKey] || 0);
                                });
                            }
                        } else if (hasStatusFilter) {
                            statusCodes.forEach((status) => {
                                const statusKey = `${eventKey}_status_${status}`;
                                const countKey = `${statusKey}_count`;
                                const statusCount = Number(record[countKey] || 0);
                                count += statusCount;
                                // Track by status code for breakdown
                                const breakdownKey = `status_${status}`;
                                groupedData[timeKey].childBreakdown[breakdownKey] =
                                    (groupedData[timeKey].childBreakdown[breakdownKey] || 0) + statusCount;
                            });
                        } else if (hasCacheFilter) {
                            cacheStatuses.forEach((cache) => {
                                const cacheKey = `${eventKey}_cache_${cache}`;
                                const countKey = `${cacheKey}_count`;
                                count += Number(record[countKey] || 0);
                            });
                        }
                    } else {
                        const successKey = `${eventId}_success`;
                        const countKey = `${eventId}_count`;
                        count = Number(record[successKey] || record[countKey] || 0);
                    }
                }

                // For API events, track by status code; for regular events, track by eventId
                if (isRawApiData && String(record.eventId) === String(eventId) && count > 0) {
                    // Already tracked above
                } else if (count > 0) {
                    groupedData[timeKey].childTotal += count;
                    groupedData[timeKey].childBreakdown[eventId] = (groupedData[timeKey].childBreakdown[eventId] || 0) + count;
                }
            });
        });



        const result = Object.entries(groupedData)
            .map(([timeKey, values]) => {
                // For avg metrics, compute the actual average
                const parentValue = values.isAvgMetric
                    ? (values.parentAvgCount > 0 ? values.parentAvgSum / values.parentAvgCount : 0)
                    : values.parentTotal;

                let childValue = 0;
                const finalChildBreakdown: Record<string, number> = {};

                if (values.isAvgMetric) {
                    // For avgDelay: compute overall child average
                    childValue = values.childAvgCount > 0 ? values.childAvgSum / values.childAvgCount : 0;
                    // Also compute per-child breakdown for tooltip and individual lines
                    Object.entries(values.childAvgData).forEach(([eventId, data]) => {
                        const avg = data.count > 0 ? data.sum / data.count : 0;
                        finalChildBreakdown[eventId] = avg;
                    });
                } else {
                    // For count metrics: use existing breakdown
                    childValue = values.childTotal;
                    Object.assign(finalChildBreakdown, values.childBreakdown);
                }

                // Calculate individual child percentages for separate lines
                const childPercentages: Record<string, number> = {};
                Object.entries(finalChildBreakdown).forEach(([childId, childVal]) => {
                    childPercentages[`child_${childId}_percentage`] = parentValue > 0 ? (childVal / parentValue) * 100 : 0;
                });

                return {
                    time: timeKey,
                    percentage: parentValue > 0 ? (childValue / parentValue) * 100 : 0,
                    parentCount: parentValue,
                    childCount: childValue,
                    timestamp: values.timestamp,
                    parentBreakdown: values.parentBreakdown,
                    childBreakdown: finalChildBreakdown,
                    isAvgMetric: values.isAvgMetric,
                    isSameParentChild: false,
                    hasAnomaly: false,
                    ...childPercentages, // Add individual child percentage fields
                    parent_percentage: parentValue > 0 ? 100 : 0, // Parent line at 100%
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        if (debug) {
            console.log('Final processed chart data:', result);
            console.log('Total parent events across all time periods:', result.reduce((sum, r) => sum + r.parentCount, 0));
            console.log('Total child events across all time periods:', result.reduce((sum, r) => sum + r.childCount, 0));
        }
        return result;
    }, [data, parentEvents, childEvents, filters, eventNames, isHourly]);

    // Sort child events by average percentage (Descending)
    const sortedChildEvents = useMemo(() => {
        if (!childEvents || childEvents.length === 0 || !chartData || chartData.length === 0) {
            return childEvents;
        }

        const stats = childEvents.map(eventId => {
            const key = `child_${eventId}_percentage`;
            const total = chartData.reduce((sum, item) => sum + (Number((item as any)[key]) || 0), 0);
            const avg = total / chartData.length;
            return { eventId, avg };
        });

        return stats.sort((a, b) => b.avg - a.avg).map(s => s.eventId);
    }, [childEvents, chartData]);

    const visibleLegendEvents = sortedChildEvents; // Always show all events in legend

    // Pie chart data for child event distribution
    const childEventPieData = useMemo(() => {
        if (!childEvents || childEvents.length === 0 || !chartData || chartData.length === 0) {
            return [];
        }

        // Premium color palette - vibrant and visually appealing
        const premiumColors = [
            '#7c3aed', // Deeper Violet - more royal
            '#0891b2', // Richer Cyan - more jewel-like
            '#e11d48', // Deeper Rose - more sophisticated
            '#059669', // Richer Emerald - more precious
            '#d97706', // Deeper Amber - more golden
            '#4f46e5', // Richer Indigo - more intense
            '#db2777', // Deeper Pink - more vibrant
            '#0d9488', // Richer Teal - more oceanic
            '#9333ea', // Deeper Purple - more luxurious
            '#ea580c', // Richer Orange - more sunset-like
        ];

        // Aggregate childBreakdown across all time points
        const totalCounts: Record<string, number> = {};
        chartData.forEach((item: any) => {
            if (item.childBreakdown) {
                Object.entries(item.childBreakdown).forEach(([eventId, count]) => {
                    totalCounts[eventId] = (totalCounts[eventId] || 0) + (Number(count) || 0);
                });
            }
        });

        // Calculate total parent count for percentage
        const totalParentCount = chartData.reduce((sum, item: any) => sum + (item.parentCount || 0), 0);

        // Build pie data from aggregated counts
        return childEvents.map((eventId, index) => {
            const totalCount = totalCounts[eventId] || 0;
            const name = eventNames[String(eventId)] || `Event ${eventId}`;
            const color = eventColors[String(eventId)] || premiumColors[index % premiumColors.length];

            return {
                name,
                value: totalCount,
                color,
                eventId,
                parentPercentage: totalParentCount > 0 ? (totalCount / totalParentCount) * 100 : 0,
            };
        }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    }, [childEvents, chartData, eventNames, eventColors]);

    const overallStats = useMemo(() => {
        const totalParent = chartData.reduce((sum, d: any) => sum + (d.parentCount || 0), 0);
        const totalChild = chartData.reduce((sum, d: any) => sum + (d.childCount || 0), 0);
        const percentage = totalParent > 0 ? (totalChild / totalParent) * 100 : 0;

        const percentages = chartData.map((d: any) => d.percentage || 0);
        const minPercentage = percentages.length ? Math.min(...percentages) : 0;
        const maxPercentage = percentages.length ? Math.max(...percentages) : 0;

        if (debug) {
            console.log('OverallStats calculation:', { totalParent, totalChild, percentage });
        }

        return {
            totalParent,
            totalChild,
            percentage,
            minPercentage: isFinite(minPercentage) ? minPercentage : 0,
            maxPercentage: isFinite(maxPercentage) ? maxPercentage : 0,
        };
    }, [chartData]);

    const yAxisConfig = useMemo(() => {
        const maxP = Math.max(0, overallStats.maxPercentage || 0);
        if (maxP > 0 && maxP <= 5) {
            const upper = Math.max(1, Math.ceil(maxP * 1.25 * 100) / 100);
            const step = upper / 4;
            const ticks = [0, step, step * 2, step * 3, upper].map(v => Math.round(v * 100) / 100);
            return { domain: [0, upper] as [number, number], ticks };
        }
        return { domain: [0, 100] as [number, number], ticks: [0, 25, 50, 75, 100] };
    }, [overallStats.maxPercentage]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="border border-gray-200/60 dark:border-gray-500/30 rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-gray-50/80 to-slate-50/60 dark:from-gray-800/20 dark:to-slate-800/10 border-b border-gray-200/40 dark:border-gray-500/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
                            <Percent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base md:text-lg">Percentage Analysis</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Child / Parent ratio • Time series view
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No data available for the selected date range
                    </p>
                </CardContent>
            </Card>
        );
    }

    // For API events, show status/cache codes instead of endpoint names
    const isApiEventMode = filters && (filters.statusCodes?.length > 0 || filters.cacheStatus?.length > 0);

    const getParentEventNames = () => {
        if (isApiEventMode) {
            // Parent = all status codes (not just 2xx)
            return 'All Status Codes';
        }
        return parentEvents.map((id: string) => eventNames[String(id)] || `Event ${id}`).join(', ');
    };

    const getChildEventNames = () => {
        if (isApiEventMode) {
            const parts: string[] = [];
            if (filters?.statusCodes && filters.statusCodes.length > 0) {
                parts.push(`Status: ${filters.statusCodes.join(', ')}`);
            }
            if (filters?.cacheStatus && filters.cacheStatus.length > 0) {
                parts.push(`Cache: ${filters.cacheStatus.join(', ')}`);
            }
            return parts.length > 0 ? parts.join(' | ') : 'All';
        }
        return childEvents.map((id: string) => eventNames[String(id)] || `Event ${id}`).join(', ');
    };

    // Handler for reliable click events
    const handleDataPointClick = (data: any) => {
        if (data && data.time) {
            setSelectedPoint(data);
        }
    };

    return (
        <>
            <Card className="border border-gray-200/60 dark:border-gray-500/30 overflow-hidden shadow-xl rounded-2xl">
                <CardHeader className="pb-3 px-4 md:px-6 bg-gradient-to-r from-gray-50/80 to-slate-50/60 dark:from-gray-800/20 dark:to-slate-800/10 border-b border-gray-200/40 dark:border-gray-500/20">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
                                <Percent className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg">Percentage Analysis</CardTitle>
                                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                                    Child/Parent Event Ratio • {isHourly ? 'Hourly' : 'Daily'} Breakdown
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Day-wise / Hourly Toggle */}
                            {onToggleHourly && (
                                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-gray-500/30 p-1 shadow-sm">
                                    <button
                                        onClick={() => onToggleHourly(false)}
                                        className={cn(
                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                            !isHourly
                                                ? "bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-sm"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => onToggleHourly(true)}
                                        className={cn(
                                            "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                                            isHourly
                                                ? "bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-sm"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        Hourly
                                    </button>
                                </div>
                            )}
                            {onToggleBackToFunnel && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onToggleBackToFunnel}
                                    className="text-sm font-semibold bg-white/80 hover:bg-white border-gray-300 text-gray-800 hover:text-gray-800 h-10 px-4"
                                >
                                    <BarChart3 className="h-4 w-4 mr-1.5" />
                                    Back to Funnel
                                </Button>
                            )}
                            {onExpand && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-500 hover:text-gray-700"
                                    title="See full page expansion"
                                    onClick={onExpand}
                                >
                                    <Maximize2 className="h-5 w-5" />
                                </Button>
                            )}
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 px-3 py-1">
                                <span className="text-lg font-bold">{overallStats.percentage.toFixed(2)}%</span>
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6">
                    {/* Summary Stats - Parent on Left, Child on Right - Only show for count-based events */}
                    {chartData.length > 0 && !chartData[0].isAvgMetric && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-500/30">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {overallStats.totalParent.toLocaleString()}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Parent Events (Left)</div>
                                <div className="text-sm text-muted-foreground truncate" title={getParentEventNames()}>
                                    {getParentEventNames()}
                                </div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-500/30">
                                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                                    {overallStats.percentage.toFixed(2)}%
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Overall Ratio</div>
                                <div className="text-sm text-muted-foreground">
                                    Range: {overallStats.minPercentage.toFixed(1)}% - {overallStats.maxPercentage.toFixed(1)}%
                                </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {overallStats.totalChild.toLocaleString()}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Child Events (Right)</div>
                                <div className="text-sm text-muted-foreground truncate" title={getChildEventNames()}>
                                    {getChildEventNames()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Line Chart */}
                    <div className={cn("relative group", chartData.length > 0 && chartData[0].isAvgMetric ? "h-[420px] mt-2" : "h-[420px] mt-4")}>
                        <div className="absolute top-2 right-12 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {/* Zoom controls removed for PercentageGraph to avoid obstruction and duplication */}
                        </div>
                        <div 
                            className="w-full h-full origin-center transition-transform duration-100 ease-out"
                            style={{ transform: `scale(${zoomLevel})` }}
                            onWheel={handleWheel}
                        >
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                                onClick={(e: any) => {
                                    // Handle chart background click
                                    if (e?.activePayload?.[0]?.payload) {
                                        handleDataPointClick(e.activePayload[0].payload);
                                    }
                                }}
                            >
                                <defs>
                                    <linearGradient id="percentageGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tickMargin={8}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                                    domain={isAvgEventType >= 1 ? ['auto', 'auto'] : yAxisConfig.domain}
                                    ticks={isAvgEventType >= 1 ? undefined : (yAxisConfig.ticks as any)}
                                    tickFormatter={isAvgEventType >= 1 ? (value: number) => formatValue(value, true) : undefined}
                                />
                                <ReferenceLine
                                    y={overallStats.percentage}
                                    stroke="#facc15"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    label={{ value: 'Avg', position: 'right', fill: '#facc15', fontSize: 11 }}
                                />
                                <Tooltip
                                    wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            const isAvgDelay = data.isAvgMetric;
                                            const parentBreakdown = (data.parentBreakdown || {}) as Record<string, number>;
                                            const childBreakdown = (data.childBreakdown || {}) as Record<string, number>;
                                            const parentEntries = Object.entries(parentBreakdown);
                                            const childEntries = Object.entries(childBreakdown);

                                            // Helper to keep only the filtered status/cache codes and drop raw eventIds
                                            const statusSet = new Set((filters?.statusCodes || []).map((s) => String(s)));
                                            const cacheSet = new Set((filters?.cacheStatus || []).map((c) => String(c)));
                                            const shouldKeepApiEntry = (key: string) => {
                                                const isStatus = key.startsWith('status_');
                                                const isCache = key.startsWith('cache_');
                                                const code = isStatus ? key.replace('status_', '') : isCache ? key.replace('cache_', '') : key;

                                                // Hide raw eventIds when in API mode
                                                if (!isStatus && !isCache) return false;
                                                if (isStatus && statusSet.size > 0 && !statusSet.has(code)) return false;
                                                if (isCache && cacheSet.size > 0 && !cacheSet.has(code)) return false;
                                                return true;
                                            };

                                            // Custom tooltip for "Same Parent/Child" mode (Dual Success/Fail lines)
                                            if (data.isSameParentChild) {
                                                const eventId = childEvents[0];
                                                const eventName = eventId ? (eventNames[String(eventId)] || `Event ${eventId}`) : 'Event';

                                                return (
                                                    <div className="bg-white dark:bg-white p-3 rounded-lg shadow-lg border border-gray-200" style={{ backgroundColor: 'white' }}>
                                                        <p className="text-sm font-semibold mb-2 text-gray-900">{data.time}</p>
                                                        <div className="space-y-2 text-xs">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-semibold text-green-600 flex items-center gap-1.5">
                                                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                                    {eventName} Success
                                                                </span>
                                                                <span className="font-mono font-bold text-gray-900">
                                                                    {Number(data.successCount).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-semibold text-red-600 flex items-center gap-1.5">
                                                                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                                                    {eventName} Fail
                                                                </span>
                                                                <span className="font-mono font-bold text-gray-900">
                                                                    {Number(data.failCount).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            {/* Show percentages as supplemental info */}
                                                            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-[10px] text-muted-foreground">
                                                                <span className="text-green-600/80">Success Rate: {data.success_percentage.toFixed(2)}%</span>
                                                                <span className="text-red-600/80">Fail Rate: {data.fail_percentage.toFixed(2)}%</span>
                                                            </div>
                                                            {data.hasAnomaly && (
                                                                <div className="mt-1 px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200 text-xs font-bold text-center flex items-center justify-center gap-1">
                                                                    <span>⚠️</span> Anomaly Detected
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Sort child entries by value descending (highest first)
                                            const filteredChildEntries = (isApiEventMode
                                                ? childEntries.filter(([key]) => shouldKeepApiEntry(key))
                                                : childEntries
                                            ).sort((a, b) => Number(b[1]) - Number(a[1]));

                                            // Sort parent entries by value descending (highest first)
                                            const filteredParentEntries = (isApiEventMode
                                                ? parentEntries.filter(([key]) => shouldKeepApiEntry(key))
                                                : parentEntries
                                            ).sort((a, b) => Number(b[1]) - Number(a[1]));

                                            return (
                                                <div className="bg-white dark:bg-white p-4 rounded-xl shadow-xl border-2 border-gray-100 min-w-[220px]" style={{ backgroundColor: 'white' }}>
                                                    <p className="text-sm font-bold mb-3 text-gray-900 border-b pb-2">{data.time}</p>
                                                    <div className="space-y-2 text-xs">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-500">Percentage:</span>
                                                            <span className="font-bold text-gray-700 text-sm">{data.percentage.toFixed(2)}%</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-500">{isAvgEventType >= 1 ? (isAvgEventType === 2 ? 'Child Amount' : 'Child Delay') : isAvgDelay ? 'Child Avg' : 'Child'}:</span>
                                                            <span className="font-bold text-gray-900">{isAvgEventType >= 1 ? formatValue(data.childCount) : isAvgDelay ? data.childCount.toFixed(2) : data.childCount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-gray-500">{isAvgEventType >= 1 ? (isAvgEventType === 2 ? 'Parent Amount' : 'Parent Delay') : isAvgDelay ? 'Parent Avg' : 'Parent'}:</span>
                                                            <span className="font-bold text-gray-900">{isAvgEventType >= 1 ? formatValue(data.parentCount) : isAvgDelay ? data.parentCount.toFixed(2) : data.parentCount.toLocaleString()}</span>
                                                        </div>
                                                        {filteredChildEntries.length > 0 && (
                                                            <div className="mt-3 pt-2 border-t border-gray-100">
                                                                <p className="font-bold mb-2 text-xs text-green-700 flex items-center gap-1">
                                                                    {isApiEventMode ? 'Selected Status/Cache' : 'Child breakdown'}
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {filteredChildEntries.map(([key, count], idx) => {
                                                                        const displayLabel = isApiEventMode
                                                                            ? (key.startsWith('status_') ? `Status ${key.replace('status_', '')}` :
                                                                                key.startsWith('cache_') ? `Cache: ${key.replace('cache_', '')}` : (eventNames[String(key)] || `Event ${key}`))
                                                                            : (eventNames[String(key)] || `Event ${key}`);
                                                                        // Use color from eventColors or fallback to premium colors
                                                                        const colors = ['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#a855f7', '#f97316'];
                                                                        const color = eventColors[key] || colors[idx % colors.length];
                                                                        return (
                                                                            <div key={key} className="flex items-center justify-between gap-3">
                                                                                <span className="flex items-center gap-2 text-gray-700 truncate max-w-[180px]" title={displayLabel}>
                                                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                                                    {displayLabel}
                                                                                </span>
                                                                                <span className="font-bold font-mono text-gray-900 flex-shrink-0">{isAvgEventType >= 1 ? formatValue(count) : isAvgDelay ? count.toFixed(2) : count.toLocaleString()}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {filteredParentEntries.length > 0 && (
                                                            <div className="mt-3 pt-2 border-t border-gray-100">
                                                                <p className="font-bold mb-2 text-xs text-blue-700 flex items-center gap-1">
                                                                    {isApiEventMode ? 'Status/Cache Breakdown' : 'Parent breakdown'}
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {filteredParentEntries.map(([key, count], idx) => {
                                                                        const displayLabel = isApiEventMode
                                                                            ? (key.startsWith('status_') ? `Status ${key.replace('status_', '')}` :
                                                                                key.startsWith('cache_') ? `Cache: ${key.replace('cache_', '')}` : (eventNames[String(key)] || `Event ${key}`))
                                                                            : (eventNames[String(key)] || `Event ${key}`);
                                                                        const colors = ['#3b82f6', '#14b8a6', '#a855f7', '#f97316', '#22c55e'];
                                                                        const color = eventColors[key] || colors[idx % colors.length];
                                                                        return (
                                                                            <div key={key} className="flex items-center justify-between gap-3">
                                                                                <span className="flex items-center gap-2 text-gray-700 truncate max-w-[180px]" title={displayLabel}>
                                                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                                                    {displayLabel}
                                                                                </span>
                                                                                <span className="font-bold font-mono text-gray-900 flex-shrink-0">{isAvgEventType >= 1 ? formatValue(count) : isAvgDelay ? count.toFixed(2) : count.toLocaleString()}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />

                                {/* Individual child event lines - one for each child OR status code OR success/fail for same parent/child */}
                                {(() => {
                                    // SPECIAL CASE: Same parent and child events - show success% and fail% as 2 lines
                                    const isSameParentChildMode = chartData.length > 0 && chartData[0].isSameParentChild;

                                    if (isSameParentChildMode) {
                                        // Render SUCCESS and FAIL lines for same parent/child
                                        const lines = [
                                            { id: 'success', dataKey: 'success_percentage', color: '#22c55e', name: 'Success %' }, // Fixed to Green
                                            { id: 'fail', dataKey: 'fail_percentage', color: '#ef4444', name: 'Fail %' }
                                        ];

                                        return (
                                            <>
                                                {lines.map(({ id, dataKey, color, name }) => {
                                                    const isLineSelected = selectedLineId === null || selectedLineId === id;
                                                    const lineOpacity = isLineSelected ? 1 : 0.15;
                                                    const lineWidth = isLineSelected ? 2.5 : 1;

                                                    return (
                                                        <Area
                                                            key={`same-parent-child-${id}`}
                                                            type="monotone"
                                                            dataKey={dataKey}
                                                            stroke={color}
                                                            strokeWidth={lineWidth}
                                                            strokeOpacity={lineOpacity}
                                                            fill="none"
                                                            name={name}
                                                            isAnimationActive={false}
                                                            dot={false}
                                                            activeDot={isLineSelected ? { r: 6, fill: color, stroke: '#fff', strokeWidth: 2 } : false}
                                                        />
                                                    );
                                                })}
                                                {/* Anomaly Scatter Plot Layer */}
                                                <Scatter
                                                    name="Anomaly Detected"
                                                    dataKey="anomalyValue"
                                                    fill="#f59e0b"
                                                    shape={(props: any) => {
                                                        const { cx, cy, payload } = props;
                                                        if (payload.hasAnomaly) {
                                                            return (
                                                                <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
                                                                    <div className="flex items-center justify-center w-full h-full bg-amber-100 rounded-full border border-amber-500 shadow-sm animate-pulse">
                                                                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                                                                    </div>
                                                                </foreignObject>
                                                            );
                                                        }
                                                        return <g />;
                                                    }}
                                                />
                                            </>
                                        );
                                    }

                                    // For avgDelay metrics, use child events directly
                                    // For API events with filters, use status codes
                                    // Otherwise, use child events
                                    const isAvgMetric = chartData.length > 0 && chartData[0].isAvgMetric;

                                    const renderKeys = isAvgMetric
                                        ? childEvents // For avgDelay, render each child event
                                        : isApiEventMode
                                            ? [
                                                ...(filters?.statusCodes || []).map((code: any) => `status_${code}`),
                                                ...(filters?.cacheStatus || []).map((status: any) => `cache_${status}`)
                                            ]
                                            : childEvents;

                                    return renderKeys.map((childId, index) => {
                                        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                        const color = eventColors[childId] || colors[index % colors.length];
                                        const childDataKey = `child_${childId}_percentage`;

                                        const displayName = isApiEventMode
                                            ? (childId.startsWith('status_') ? `Status ${childId.replace('status_', '')}` :
                                                childId.startsWith('cache_') ? `Cache: ${childId.replace('cache_', '')}` : childId)
                                            : (eventNames[String(childId)] || `Event ${childId}`);

                                        // Apply line selection filtering
                                        const isLineSelected = selectedLineId === null || selectedLineId === childId;
                                        const lineOpacity = isLineSelected ? 1 : 0.15;
                                        const lineWidth = isLineSelected ? 2.5 : 1;

                                        return (
                                            <Area
                                                key={`child-line-${childId}`}
                                                type="monotone"
                                                dataKey={childDataKey}
                                                stroke={color}
                                                strokeWidth={lineWidth}
                                                strokeOpacity={lineOpacity}
                                                fill="none"
                                                name={displayName}
                                                isAnimationActive={false}
                                                dot={false}
                                                activeDot={isLineSelected ? { r: 6, fill: color, stroke: '#fff', strokeWidth: 2 } : false}
                                            />
                                        );
                                    });
                                })()}

                                {/* Parent Event Line (Base 100%) - For avgDelay metrics */}
                                {chartData.length > 0 && chartData[0].isAvgMetric && (
                                    <Area
                                        type="monotone"
                                        dataKey="parent_percentage"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="none"
                                        name="Parent Event (Avg)"
                                        isAnimationActive={false}
                                        dot={false}
                                        strokeDasharray="5 5"
                                        activeDot={{ r: 6, fill: "#3b82f6", stroke: '#fff', strokeWidth: 2 }}
                                    />
                                )}

                                {/* Combined percentage line - show when All is selected, hide when single event is selected */}
                                {showCombinedPercentage && selectedLineId === null && (
                                    <Area
                                        type="monotone"
                                        dataKey="percentage"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        fill="url(#percentageGradient)"
                                        name="Combined %"
                                        isAnimationActive={false}
                                        dot={false}
                                        activeDot={{
                                            r: 8,
                                            fill: "#8b5cf6",
                                            stroke: "#fff",
                                            strokeWidth: 2,
                                            cursor: "pointer",
                                            onClick: (e: any, payload: any) => {
                                                e?.stopPropagation?.();
                                                if (payload?.payload) {
                                                    handleDataPointClick(payload.payload);
                                                }
                                            }
                                        }}
                                        onClick={(e: any) => {
                                            e?.stopPropagation?.();
                                            if (e?.activePayload?.[0]?.payload) {
                                                handleDataPointClick(e.activePayload[0].payload);
                                            }
                                        }}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                        </div>
                    </div>


                    {/* Line Selection Buttons - Color Coded Legend */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-muted-foreground mr-2">Select Line:</span>
                            {/* Always show "All" button */}
                            <button
                                onClick={() => setSelectedLineId(null)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                                    selectedLineId === null
                                        ? "bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md"
                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-700"
                                )}
                            >
                                All
                            </button>
                            {/* Same parent/child mode: Show Success and Fail buttons */}
                            {chartData.length > 0 && chartData[0].isSameParentChild ? (
                                <>
                                    <button
                                        onClick={() => setSelectedLineId(selectedLineId === 'success' ? null : 'success')}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border-2",
                                            selectedLineId === 'success'
                                                ? "shadow-md border-green-400"
                                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                                        )}
                                        style={selectedLineId === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' } : {}}
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#22c55e' }} />
                                        <span className="font-semibold">{selectedLineId === 'success' ? 'AC_process_success' : 'Success %'}</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedLineId(selectedLineId === 'fail' ? null : 'fail')}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border-2",
                                            selectedLineId === 'fail'
                                                ? "shadow-md border-red-400"
                                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
                                        )}
                                        style={selectedLineId === 'fail' ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' } : {}}
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#ef4444' }} />
                                        <span className="font-semibold">{selectedLineId === 'fail' ? 'AC_process_failed' : 'Fail %'}</span>
                                    </button>
                                    {/* Anomaly indicator */}
                                    {chartData.some(d => d.hasAnomaly) && (
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            ⚠️ Anomaly Detected
                                        </span>
                                    )}
                                </>
                            ) : (
                                /* Regular child events mode - sorted by average value descending */
                                (() => {
                                    // Calculate averages and sort by descending order
                                    const eventsWithAvg = visibleLegendEvents.map((eventId) => {
                                        const key = `child_${eventId}_percentage`;
                                        const total = chartData.reduce((sum, item) => sum + (Number((item as any)[key]) || 0), 0);
                                        const avg = chartData.length > 0 ? (total / chartData.length) : 0;
                                        return { eventId, avg };
                                    }).sort((a, b) => b.avg - a.avg); // Sort descending by average

                                    return eventsWithAvg.map(({ eventId, avg }) => {
                                        // Find original index for color consistency
                                        const originalIndex = childEvents.indexOf(eventId);
                                        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                        const color = eventColors[eventId] || colors[originalIndex % colors.length];

                                        const name = eventNames[String(eventId)] || `Event ${eventId}`;
                                        const isSelected = selectedLineId === eventId;
                                        const avgStr = avg.toFixed(1);

                                        return (
                                            <button
                                                key={eventId}
                                                onClick={() => setSelectedLineId(isSelected ? null : eventId)}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border-2",
                                                    isSelected
                                                        ? "shadow-md"
                                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border-slate-200 dark:border-slate-700"
                                                )}
                                                style={isSelected ? {
                                                    backgroundColor: `${color}20`,
                                                    color: color,
                                                    borderColor: color
                                                } : {}}
                                                title={`${name}: ${avgStr}% avg`}
                                            >
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full shadow-sm flex-shrink-0"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="font-semibold truncate max-w-[200px]" title={name}>{name}</span>
                                                <span className={cn("text-[10px] ml-0.5 flex-shrink-0", isSelected ? "opacity-90" : "opacity-70")}>({avgStr}%)</span>
                                            </button>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    </div>

                    {/* Per-Event Distribution Analysis Pie Charts - DISABLED redundant section */}
                    {false && (() => {
                        const panelId = 'percentage_graph'; // Generic ID for state tracking
                        const allEventIds = [...parentEvents, ...childEvents];
                        const uniqueEventIds = Array.from(new Set(allEventIds));
                        const eventsToAnalyze = uniqueEventIds.map(id => events.find(e => String(e.eventId) === String(id))).filter(Boolean);

                        if (eventsToAnalyze.length === 0) return null;

                        return (
                            <div className="mt-8 space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700/40">
                                <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
                                        <PieChartIcon className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground">Event Distribution Analysis</h3>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            POS, Platform, and Source breakdown for parent and child events
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {eventsToAnalyze.map((event) => {
                                        if (!event) return null;
                                        const pieData = eventPieCharts[event.eventId];
                                        if (!pieData) return null;

                                        // Data transformation (same as MainPanelSection)
                                        const platformData = pieData?.platform ? Object.entries(pieData.platform).map(([name, value]: [string, any]) => ({ name, value: typeof value === 'object' ? value.count : value })) : [];
                                        const posData = pieData?.pos ? Object.entries(pieData.pos).map(([name, value]: [string, any]) => ({ name, value: typeof value === 'object' ? value.count : value })) : [];
                                        const sourceData = pieData?.source ? Object.entries(pieData.source).map(([name, value]: [string, any]) => ({ name, value: typeof value === 'object' ? value.count : value })) : [];

                                        const showPlatform = platformData.length > 0;
                                        const showPos = posData.length > 0;
                                        const showSource = sourceData.length > 0;

                                        if (!showPlatform && !showPos && !showSource) return null;

                                        const defaultMode = (posData && posData.length > 0) ? 'pos' : (platformData && platformData.length > 0) ? 'platform' : 'source';
                                        const activeMode = eventDistModes[event.eventId] || defaultMode;
                                        const activeData = activeMode === 'platform' ? platformData : activeMode === 'pos' ? posData : sourceData;
                                        const totalVal = activeData.reduce((acc: number, item: any) => acc + item.value, 0);
                                        const categoryLabel = activeMode === 'platform' ? 'Platform' : activeMode === 'pos' ? 'POS Site' : 'Source';

                                        return (
                                            <Card key={event.eventId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                                <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-800/10 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                                            <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-300 truncate">{event.eventName}</CardTitle>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4">
                                                    <div className="flex flex-row items-start gap-4 h-full">
                                                        <div className="flex flex-col gap-1.5 p-1 bg-muted/30 dark:bg-slate-800/30 rounded-xl border border-border/40 shadow-sm w-32 shrink-0">
                                                            {[
                                                                { id: 'platform', label: 'Platform', show: showPlatform, color: 'indigo' },
                                                                { id: 'pos', label: 'POS', show: showPos, color: 'emerald' },
                                                                { id: 'source', label: 'Source', show: showSource, color: 'amber' }
                                                            ].filter(t => t.show).map((tab) => {
                                                                const isActive = activeMode === tab.id;
                                                                return (
                                                                    <button
                                                                        key={tab.id}
                                                                        onClick={() => setEventDistModes(prev => ({ ...prev, [event.eventId]: tab.id as any }))}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-200",
                                                                            isActive
                                                                                ? `bg-white dark:bg-slate-900 text-${tab.color}-600 dark:text-${tab.color}-400 shadow-sm border border-${tab.color}-100 dark:border-${tab.color}-900/40 translate-x-1`
                                                                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        <span>{tab.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="relative flex-1 min-w-0 h-full">
                                                            <div className="h-64 w-full cursor-pointer relative">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <PieChart>
                                                                        <Pie
                                                                            data={activeData}
                                                                            cx="50%"
                                                                            cy="50%"
                                                                            innerRadius={45}
                                                                            outerRadius={75}
                                                                            paddingAngle={2}
                                                                            dataKey="value"
                                                                            isAnimationActive={false}
                                                                            stroke="none"
                                                                        >
                                                                            {activeData.map((_: any, idx: number) => (
                                                                                <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                                            ))}
                                                                        </Pie>
                                                                        <Tooltip wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }} content={<PieTooltip totalValue={totalVal} category={categoryLabel} isAvgEventType={event.isAvgEvent} />} />
                                                                    </PieChart>
                                                                </ResponsiveContainer>
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{activeMode}</span>
                                                                    <span className="text-2xl font-black text-foreground tabular-nums">
                                                                        {totalVal >= 1000 ? `${(totalVal / 1000).toFixed(1)}k` : totalVal.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Child Event Distribution Pie Chart (Legacy) */}
                    {false && childEventPieData.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                                    <BarChart3 className="h-3.5 w-3.5 text-white" />
                                </div>
                                Child Event Distribution
                                <span className="text-xs font-normal text-muted-foreground/70 ml-1">
                                    ({childEventPieData.length} events)
                                </span>
                            </h4>
                            <div className="h-72 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={childEventPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            strokeWidth={2}
                                            stroke="rgba(255,255,255,0.8)"
                                            isAnimationActive={false}
                                        >
                                            {childEventPieData.map((entry: any, index: number) => {
                                                // Use consistent premium colors palette to avoid garish overrides
                                                const premiumColors = [
                                                    '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b',
                                                    '#6366f1', '#ec4899', '#14b8a6', '#a855f7', '#f97316'
                                                ];
                                                const color = premiumColors[index % premiumColors.length];
                                                return (
                                                    <Cell
                                                        key={`cell-${entry.eventId || index}`}
                                                        fill={color}
                                                        style={{
                                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Pie>
                                        <Tooltip
                                            wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload[0]) {
                                                    const data = payload[0].payload;
                                                    const premiumColors = [
                                                        '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b',
                                                        '#6366f1', '#ec4899', '#14b8a6', '#a855f7', '#f97316'
                                                    ];
                                                    const colorIndex = childEventPieData.findIndex(e => e.eventId === data.eventId);
                                                    const color = premiumColors[colorIndex % premiumColors.length];
                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[160px]">
                                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                                                <span
                                                                    className="w-3 h-3 rounded-full shadow-sm"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{data.name}</p>
                                                            </div>
                                                            <div className="space-y-1.5 text-xs">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-gray-500 dark:text-gray-400">Count:</span>
                                                                    <span className="font-bold text-gray-900 dark:text-white">{data.value?.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-gray-500 dark:text-gray-400">% of Parent:</span>
                                                                    <span className="font-bold text-gray-700 dark:text-gray-400">
                                                                        {data.parentPercentage?.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Clean horizontal legend with colors matching the chart */}
                            <div className="flex flex-wrap gap-3 justify-center mt-4">
                                {childEventPieData.map((entry: any, index: number) => {
                                    const premiumColors = [
                                        '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b',
                                        '#6366f1', '#ec4899', '#14b8a6', '#a855f7', '#f97316'
                                    ];
                                    const color = premiumColors[index % premiumColors.length];
                                    // Calculate percentage of total children
                                    const totalChildValue = childEventPieData.reduce((sum, e) => sum + e.value, 0);
                                    const childPercent = totalChildValue > 0 ? ((entry.value / totalChildValue) * 100).toFixed(1) : '0';

                                    return (
                                        <div
                                            key={`legend-${entry.eventId}`}
                                            className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className="text-slate-700 dark:text-slate-300 font-medium max-w-[120px] truncate" title={entry.name}>
                                                {entry.name}
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white">{entry.value.toLocaleString()}</span>
                                            <span className="text-gray-700 dark:text-gray-400 font-semibold text-[10px] px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800/50 rounded">
                                                {childPercent}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Job ID Pie Charts */}
                    {null}

                </CardContent>
            </Card>

            {/* Expanded Data Point Modal */}
            <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
                <DialogContent
                    showCloseButton={false}
                    className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden p-0 bg-white"
                    style={{ backgroundColor: 'white' }}
                >
                    {selectedPoint && (
                        <>
                            {/* Premium Header */}
                            <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-gray-600 via-gray-500 to-slate-600 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <BarChart3 className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold">{selectedPoint.time}</h2>
                                        <p className="text-gray-100 text-sm">
                                            Percentage Analysis Breakdown
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedPoint(null)}
                                        className="ml-auto h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-white/10 hover:bg-white/20 text-white touch-manipulation"
                                        aria-label="Close dialog"
                                    >
                                        <X className="h-5 w-5 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="p-4 sm:p-6 md:p-8 max-h-[calc(85vh-80px)] sm:max-h-[calc(90vh-80px)] overflow-y-auto" style={{ backgroundColor: 'white' }}>
                                {/* Key Metric - Percentage */}
                                <div className="mb-6 p-6 bg-gray-100 rounded-2xl border-2 border-gray-300 shadow-lg text-center" style={{ backgroundColor: '#f3e8ff' }}>
                                    <div className="text-5xl font-bold text-gray-700 mb-2">
                                        {selectedPoint.percentage.toFixed(2)}%
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Child / Parent Ratio
                                    </div>
                                </div>

                                {/* Counts Grid - Parent Left, Child Right */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white dark:bg-white rounded-xl border border-blue-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <Activity className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Parent Count</span>
                                        </div>
                                        <div className="text-3xl font-bold text-blue-600">
                                            {selectedPoint.parentCount.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-white rounded-xl border border-green-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Child Count</span>
                                        </div>
                                        <div className="text-3xl font-bold text-green-600">
                                            {selectedPoint.childCount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Event Breakdowns - Parent Left, Child Right */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Parent Events Breakdown - LEFT SIDE */}
                                    {selectedPoint.parentBreakdown && Object.keys(selectedPoint.parentBreakdown).length > 0 && (
                                        <div className="bg-white rounded-xl border border-blue-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-blue-700">
                                                <Activity className="h-4 w-4" />
                                                Parent Event Breakdown
                                            </h3>
                                            <div className="space-y-3">
                                                {(() => {
                                                    const entries = Object.entries(selectedPoint.parentBreakdown as Record<string, number>)
                                                        .map(([key, count]) => ({ key, count }))
                                                        .sort((a, b) => b.count - a.count);
                                                    const top2 = entries.slice(0, 2);
                                                    const others = entries.slice(2);
                                                    const othersTotal = others.reduce((sum, e) => sum + e.count, 0);

                                                    return (
                                                        <>
                                                            {top2.map(({ key, count }) => {
                                                                const displayLabel = isApiEventMode
                                                                    ? (key.startsWith('status_') ? `Status ${key.replace('status_', '')}` :
                                                                        (key.match(/\d+/) ? `Status ${key.match(/\d+/)?.[0]}` : key))
                                                                    : (eventNames[String(key)] || `Event ${key}`);
                                                                return (
                                                                    <div
                                                                        key={key}
                                                                        className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200"
                                                                        style={{ backgroundColor: '#eff6ff' }}
                                                                    >
                                                                        <span className="text-sm font-medium truncate flex-1 mr-2 text-gray-900">
                                                                            {displayLabel}
                                                                        </span>
                                                                        <div className="text-right">
                                                                            <div className="text-sm font-bold text-blue-700">
                                                                                {count.toLocaleString()}
                                                                            </div>
                                                                            <div className="text-xs text-gray-600">
                                                                                {selectedPoint.parentCount > 0
                                                                                    ? ((count / selectedPoint.parentCount) * 100).toFixed(1)
                                                                                    : '0'}%
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            {othersTotal > 0 && (
                                                                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                                                                    <span className="text-sm font-medium truncate flex-1 mr-2 text-gray-900">
                                                                        Others ({others.length})
                                                                    </span>
                                                                    <div className="text-right">
                                                                        <div className="text-sm font-bold text-blue-700">
                                                                            {othersTotal.toLocaleString()}
                                                                        </div>
                                                                        <div className="text-xs text-gray-600">
                                                                            {selectedPoint.parentCount > 0
                                                                                ? ((othersTotal / selectedPoint.parentCount) * 100).toFixed(1)
                                                                                : '0'}%
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Child Events Breakdown - RIGHT SIDE */}
                                    {selectedPoint.childBreakdown && Object.keys(selectedPoint.childBreakdown).length > 0 && (
                                        <div className="bg-white rounded-xl border border-green-200/50 p-5 shadow-lg" style={{ backgroundColor: 'white' }}>
                                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-green-700">
                                                <TrendingUp className="h-4 w-4" />
                                                Child Event Breakdown
                                            </h3>
                                            <div className="space-y-3">
                                                {(() => {
                                                    // Premium color palette for child events
                                                    const premiumColors = [
                                                        '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b',
                                                        '#6366f1', '#ec4899', '#14b8a6', '#a855f7', '#f97316',
                                                    ];

                                                    // Sort by count in descending order and add colors
                                                    const entries = Object.entries(selectedPoint.childBreakdown as Record<string, number>)
                                                        .map(([key, count], index) => {
                                                            const displayLabel = isApiEventMode
                                                                ? (key.startsWith('status_') ? `Status ${key.replace('status_', '')}` :
                                                                    key.startsWith('cache_') ? `Cache: ${key.replace('cache_', '')}` :
                                                                        (key.match(/\d+/) ? `Status ${key.match(/\d+/)?.[0]}` : key))
                                                                : (eventNames[String(key)] || `Event ${key}`);
                                                            const color = eventColors[key] || premiumColors[index % premiumColors.length];
                                                            return { key, count, displayLabel, color };
                                                        })
                                                        .sort((a, b) => b.count - a.count); // Sort descending by count

                                                    return entries.map(({ key, count, displayLabel, color }) => (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                                                            style={{ backgroundColor: '#f0fdf4' }}
                                                        >
                                                            <div className="flex items-center gap-2 flex-1 mr-2">
                                                                <span
                                                                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                                <span className="text-sm font-medium truncate text-gray-900">
                                                                    {displayLabel}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                                    {count.toLocaleString()}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {selectedPoint.parentCount > 0
                                                                        ? ((count / selectedPoint.parentCount) * 100).toFixed(1)
                                                                        : '0'}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Info */}
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground text-center sm:text-left">
                                        <span>Time: {selectedPoint.time}</span>
                                        <span className="hidden sm:inline">Click outside to close</span>
                                        <span className="sm:hidden">Tap outside or ✕ to close</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
