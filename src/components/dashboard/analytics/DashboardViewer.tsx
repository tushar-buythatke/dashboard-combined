import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useSpring, useMotionValue, useInView } from 'framer-motion';
import type { DashboardProfile, EventConfig } from '@/types/analytics';
import { apiService, PLATFORMS, SOURCES } from '@/services/apiService';
import { mockService } from '@/services/mockData';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { SiteDetail } from '@/services/apiService';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar as CalendarIcon, Edit, Sparkles, TrendingUp, TrendingDown, Activity, Zap, CheckCircle2, XCircle, BarChart3, ArrowUpRight, ArrowDownRight, Flame, Target, Hash, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Navigation, Layers, X, AlertTriangle, Bell, Users, LayoutDashboard, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedCard, CardHeader as EnhancedCardHeader } from '@/components/ui/enhanced-card';
import { InteractiveButton, IconButton } from '@/components/ui/interactive-button';
import { StatBadge } from '@/components/ui/stat-badge';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { HeroGradientHeader } from '@/components/ui/hero-gradient-header';
import { StatWidgetCard, StatWidgetGrid } from '@/components/ui/stat-widget-card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ExpandedPieChartModal, type ExpandedPieData } from './components/ExpandedPieChartModal';
import { CriticalAlertsPanel } from './components/CriticalAlertsPanel';
import { DayWiseComparisonChart, HourlyDeviationChart, DailyAverageChart } from './components/ComparisonCharts';
import { PercentageGraph } from './charts/PercentageGraph';
import { FunnelGraph } from './charts/FunnelGraph';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ReferenceLine
} from 'recharts';

// Animated Number Counter Component - fast 0 -> value animation
const AnimatedNumber = ({ value, suffix = '', prefix = '', className = '' }: { value: number; suffix?: string; prefix?: string; className?: string }) => {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        const duration = 150; // ms – very fast
        const startValue = displayValue;
        const diff = value - startValue;

        if (diff === 0) return;

        const startTime = performance.now();
        let frameId: number;

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            // Ease-out cubic for a quick but smooth finish
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(startValue + diff * eased);
            setDisplayValue(next);
            if (t < 1) {
                frameId = requestAnimationFrame(tick);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <span className={className}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
};

// Sparkline Mini Chart Component
const MiniSparkline = ({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const padding = 2;

    const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`sparkGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
            </defs>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={width - padding}
                cy={height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)}
                r="3"
                fill={color}
            />
        </svg>
    );
};

// Collapsible Legend Component - Smart dropdown for multiple events with success/failure stats
const CollapsibleLegend = ({
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

// Left Sidebar Navigation Component (prepared for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __LeftSidebarNav = ({
    profileName,
    panels,
    activePanelId,
    onJumpToPanel,
    panelStats,
    isMainPanelApi
}: {
    profileName: string;
    panels: Array<{ panelId: string; panelName: string; chartType?: string; filterConfig?: { isApiEvent?: boolean; }; }>;
    activePanelId: string | null;
    onJumpToPanel: (panelId: string) => void;
    panelStats?: Record<string, { total: number; success: number; }>;
    isMainPanelApi?: boolean;
}) => {
    const [collapsed, setCollapsed] = useState(false);

    const getChartIcon = (chartType?: string) => {
        switch (chartType) {
            case 'bar': return <BarChart3 className="w-4 h-4" />;
            case 'line': return <TrendingUp className="w-4 h-4" />;
            default: return <Layers className="w-4 h-4" />;
        }
    };

    return (
        <div
            className={cn(
                "fixed left-0 top-20 h-[calc(100vh-5rem)] z-50 transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <div className="h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
                {/* Header with Profile Name */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                                        <Target className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuration</p>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{profileName}</h3>
                                            {/* API Event Indicator in Sidebar Profile Name */}
                                            {isMainPanelApi && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm flex-shrink-0">
                                                    API
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCollapsed(!collapsed)}
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Panel Navigation */}
                <div className="flex-1 overflow-y-auto py-2">
                    {!collapsed && (
                        <div className="px-4 py-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Navigation className="w-3 h-3" />
                                Panels ({panels.length})
                            </p>
                        </div>
                    )}

                    <div className="space-y-1 px-2">
                        {panels.map((panel, index) => {
                            const isActive = activePanelId === panel.panelId;
                            const stats = panelStats?.[panel.panelId];

                            return (
                                <button
                                    key={panel.panelId}
                                    onClick={() => onJumpToPanel(panel.panelId)}
                                    className={cn(
                                        "w-full text-left rounded-lg transition-all duration-200 group",
                                        collapsed ? "p-2" : "p-3",
                                        isActive
                                            ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 shadow-sm"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex items-center justify-center rounded-lg transition-colors",
                                            collapsed ? "w-10 h-10" : "w-8 h-8",
                                            isActive
                                                ? "bg-purple-500 text-white shadow-md"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600"
                                        )}>
                                            <span className="text-sm font-bold">{index + 1}</span>
                                        </div>

                                        {!collapsed && (
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {getChartIcon(panel.chartType)}
                                                    <span className={cn(
                                                        "font-medium truncate text-sm",
                                                        isActive ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"
                                                    )}>
                                                        {panel.panelName || `Panel ${index + 1}`}
                                                    </span>
                                                    {/* API Event Indicator in Sidebar */}
                                                    {panel.filterConfig?.isApiEvent === true && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm">
                                                            API
                                                        </span>
                                                    )}
                                                </div>
                                                {stats && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500">
                                                            {stats.total.toLocaleString()} events
                                                        </span>
                                                        {stats.success > 0 && (
                                                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {Math.round((stats.success / stats.total) * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!collapsed && isActive && (
                                            <div className="w-1.5 h-8 rounded-full bg-purple-500" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                {!collapsed && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Click to jump to panel</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom X-Axis Tick Component for better date/time display
const CustomXAxisTick = ({ x, y, payload }: any) => {
    const value = payload?.value || '';

    // Parse the date string to extract parts
    let datePart = '';
    let timePart = '';

    if (value.includes(',')) {
        // Hourly format like "Nov 26, 6 PM"
        const parts = value.split(', ');
        datePart = parts[0] || ''; // "Nov 26"
        timePart = parts[1] || ''; // "6 PM"
    } else {
        // Daily format like "Nov 26"
        datePart = value;
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={12}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={10}
                fontWeight={500}
            >
                {datePart}
            </text>
            {timePart && (
                <text
                    x={0}
                    y={0}
                    dy={24}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize={9}
                >
                    {timePart}
                </text>
            )}
        </g>
    );
};

// Hourly stats card component - uses existing graph data (only shown for ≤8 day ranges)
// Now supports event-type-wise filtering and handles isAvg events (showing delay instead of count)
function HourlyStatsCard({ graphData, isHourly, eventKeys = [], events = [] }: { graphData: any[]; isHourly: boolean; eventKeys?: EventKeyInfo[]; events?: EventConfig[] }) {
    const [selectedHour, setSelectedHour] = useState(new Date().getHours());
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null); // null = show all events, else specific event key

    // Don't show if not hourly data or no data
    if (!isHourly || !graphData || graphData.length === 0) return null;

    // Get the active event key for filtering
    const activeEventKey = selectedEventKey;

    // Check if selected event is an isAvg event
    const selectedEventInfo = eventKeys.find(ek => ek.eventKey === activeEventKey);
    const isAvgEvent = selectedEventInfo?.isAvgEvent === 1;
    const selectedEventConfig = events.find(e => String(e.eventId) === selectedEventInfo?.eventId);
    const isPriceAlert = selectedEventConfig?.feature === 1; // Price alerts show in minutes

    // Group data by hour and calculate hourly totals (filtered by event if selected)
    const hourlyStats = new Map<number, { total: number; success: number; fail: number; count: number; dates: string[]; avgDelay: number; delayCount: number }>();

    graphData.forEach((item: any) => {
        let hour = 0;

        // Try to extract hour from timestamp first (ISO format)
        if (item.timestamp) {
            const recordDate = new Date(item.timestamp);
            hour = recordDate.getHours();
        } else {
            // Fallback to parsing from date string
            const dateStr = item.date || '';
            const amPmMatch = dateStr.match(/(\d{1,2})\s*(AM|PM)/i);
            if (amPmMatch) {
                hour = parseInt(amPmMatch[1]);
                if (amPmMatch[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
                if (amPmMatch[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
            } else {
                const timeMatch = dateStr.match(/(\d{1,2}):\d{2}/);
                if (timeMatch) hour = parseInt(timeMatch[1]);
            }
        }

        const existing = hourlyStats.get(hour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };

        // If a specific event is selected, use that event's data; otherwise use overall totals
        let itemTotal = 0, itemSuccess = 0, itemFail = 0, itemDelay = 0;
        if (activeEventKey) {
            itemTotal = item[`${activeEventKey}_count`] || 0;
            itemSuccess = item[`${activeEventKey}_success`] || 0;
            itemFail = item[`${activeEventKey}_fail`] || 0;
            itemDelay = item[`${activeEventKey}_avgDelay`] || 0;
        } else {
            itemTotal = item.count || 0;
            itemSuccess = item.successCount || 0;
            itemFail = item.failCount || 0;
        }

        hourlyStats.set(hour, {
            total: existing.total + itemTotal,
            success: existing.success + itemSuccess,
            fail: existing.fail + itemFail,
            count: existing.count + 1,
            dates: [...existing.dates, item.date || ''],
            avgDelay: existing.avgDelay + itemDelay,
            delayCount: existing.delayCount + (itemDelay > 0 ? 1 : 0)
        });
    });

    // Get sorted hours that have data
    const availableHours = Array.from(hourlyStats.keys()).sort((a, b) => a - b);

    // Calculate overall stats (filtered by event if selected)
    let overallTotal = 0, overallSuccess = 0, overallDelay = 0, delayCount = 0;
    if (activeEventKey) {
        graphData.forEach((d: any) => {
            overallTotal += d[`${activeEventKey}_count`] || 0;
            overallSuccess += d[`${activeEventKey}_success`] || 0;
            const delay = d[`${activeEventKey}_avgDelay`] || 0;
            if (delay > 0) {
                overallDelay += delay;
                delayCount++;
            }
        });
    } else {
        overallTotal = graphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
        overallSuccess = graphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
    }
    const overallSuccessRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;
    const overallAvgDelay = delayCount > 0 ? overallDelay / delayCount : 0;

    // Format delay based on event type
    // Price alerts (feature 1) = value is already in MINUTES
    // Others (Spend, Auto-coupon) = value is already in SECONDS
    const formatDelay = (delayValue: number) => {
        if (!delayValue || delayValue <= 0) return '0';
        if (isPriceAlert) {
            // Value is in minutes
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}h`;
            return `${delayValue.toFixed(1)}m`;
        } else {
            // Value is in seconds
            if (delayValue >= 60) return `${(delayValue / 60).toFixed(1)}m`;
            return `${delayValue.toFixed(1)}s`;
        }
    };

    // Find peak and lowest hours (by delay for isAvg events, by total for count events)
    let peakHour = 0, peakTotal = 0, lowestHour = 0, lowestTotal = Infinity;
    hourlyStats.forEach((stats, hour) => {
        const metric = isAvgEvent ? (stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0) : stats.total;
        if (metric > peakTotal) { peakTotal = metric; peakHour = hour; }
        if (metric < lowestTotal && metric > 0) { lowestTotal = metric; lowestHour = hour; }
    });

    const selectedStats = hourlyStats.get(selectedHour) || { total: 0, success: 0, fail: 0, count: 0, dates: [], avgDelay: 0, delayCount: 0 };
    const selectedAvgDelay = selectedStats.delayCount > 0 ? selectedStats.avgDelay / selectedStats.delayCount : 0;
    const avgPerHour = isAvgEvent ? overallAvgDelay : (overallTotal / Math.max(availableHours.length, 1));
    const selectedMetric = isAvgEvent ? selectedAvgDelay : selectedStats.total;
    const selectedVsAvg = avgPerHour > 0 ? ((selectedMetric - avgPerHour) / avgPerHour) * 100 : 0;
    const selectedSuccessRate = selectedStats.total > 0 ? (selectedStats.success / selectedStats.total) * 100 : 0;
    const avgPerDataPoint = selectedStats.count > 0 ? selectedStats.total / selectedStats.count : 0;

    // Calculate trend (compare first half vs second half of available hours)
    const midpoint = Math.floor(availableHours.length / 2);
    const firstHalfTotal = availableHours.slice(0, midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const secondHalfTotal = availableHours.slice(midpoint).reduce((sum, h) => sum + (hourlyStats.get(h)?.total || 0), 0);
    const trendDirection = secondHalfTotal > firstHalfTotal ? 'up' : secondHalfTotal < firstHalfTotal ? 'down' : 'stable';

    const navigateHour = (direction: number) => {
        const currentIndex = availableHours.indexOf(selectedHour);
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = availableHours.length - 1;
        if (newIndex >= availableHours.length) newIndex = 0;
        setSelectedHour(availableHours[newIndex]);
    };

    const formatHour = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:00 ${period}`;
    };

    const formatHourShort = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}${period}`;
    };

    return (
        <EnhancedCard
            variant="glass"
            glow={true}
            className="border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 dark:from-purple-900/20 dark:via-slate-900/80 dark:to-indigo-900/20 rounded-2xl shadow-[0_8px_30px_rgba(147,51,234,0.1)] hover:shadow-[0_20px_40px_rgba(147,51,234,0.15)] transition-all duration-300"
        >
            <CardHeader className="pb-3 px-3 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                Hourly Insights
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-normal">
                                    {availableHours.length} hours tracked
                                </span>
                            </CardTitle>
                            <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
                                {selectedEventKey
                                    ? `Showing data for: ${eventKeys.find(e => e.eventKey === selectedEventKey)?.eventName || selectedEventKey}`
                                    : 'Analyze event distribution across different hours of the day'}
                            </div>
                        </div>
                    </div>
                    {/* Event Type Filter - Pills for <=3 events, Dropdown for more */}
                    {eventKeys.length > 0 && (
                        <div className="flex items-center w-full sm:w-auto">
                            {eventKeys.length <= 3 ? (
                                // Pill-style for 3 or fewer events
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-0.5 w-full sm:w-auto">
                                    {eventKeys.map((eventKeyInfo, index) => {
                                        const isSelected = selectedEventKey === eventKeyInfo.eventKey || (selectedEventKey === null && index === 0);
                                        // Auto-select first event if none selected
                                        if (selectedEventKey === null && index === 0) {
                                            setTimeout(() => setSelectedEventKey(eventKeyInfo.eventKey), 0);
                                        }
                                        return (
                                            <button
                                                key={eventKeyInfo.eventKey}
                                                onClick={() => setSelectedEventKey(eventKeyInfo.eventKey)}
                                                className={cn(
                                                    "flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-medium rounded-full transition-all duration-200 text-center",
                                                    isSelected
                                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                                                )}
                                            >
                                                {eventKeyInfo.eventName}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Dropdown for more than 3 events
                                <Select
                                    value={selectedEventKey || eventKeys[0]?.eventKey || ''}
                                    onValueChange={(value) => setSelectedEventKey(value)}
                                >
                                    <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-gray-800 border-cyan-200 dark:border-cyan-500/30">
                                        <SelectValue placeholder="Select event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eventKeys.map((eventKeyInfo) => (
                                            <SelectItem key={eventKeyInfo.eventKey} value={eventKeyInfo.eventKey} className="text-xs">
                                                {eventKeyInfo.eventName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-4">
                {/* Overall Summary Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/50 dark:border-blue-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Activity className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">
                                {isAvgEvent ? 'Avg Delay' : 'Total Events'}
                            </span>
                        </div>
                        <div className="text-base md:text-lg font-bold text-blue-600">
                            {isAvgEvent ? formatDelay(overallAvgDelay) : overallTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{selectedEventKey ? eventKeys.find(e => e.eventKey === selectedEventKey)?.eventName : 'All events'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-200/50 dark:border-emerald-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">Success Rate</span>
                        </div>
                        <div className="text-lg font-bold text-emerald-600">{overallSuccessRate.toFixed(1)}%</div>
                        <div className="text-[10px] text-muted-foreground">{overallSuccess.toLocaleString()} succeeded</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/50 dark:border-amber-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Flame className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase">
                                {isAvgEvent ? 'Peak Delay Hour' : 'Peak Hour'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-amber-600">{formatHourShort(peakHour)}</div>
                        <div className="text-[10px] text-muted-foreground">
                            {isAvgEvent ? formatDelay(peakTotal) : `${Math.round(peakTotal).toLocaleString()} events`}
                        </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-200/50 dark:border-purple-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Hash className="h-3 w-3 text-purple-500" />
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase">
                                {isAvgEvent ? 'Avg Delay/Hour' : 'Avg/Hour'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-purple-600">
                            {isAvgEvent ? formatDelay(avgPerHour) : Math.round(avgPerHour).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {isAvgEvent ? 'Delay per hour' : 'Events per hour'}
                        </div>
                    </div>
                </div>

                {/* Hour Distribution Chart */}
                <div
                    className="p-3 rounded-xl bg-background/60 border border-border/40 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-200"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-500" />
                            <span className="text-xs font-semibold text-foreground">Hour Distribution</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-medium">Click bars</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></div>
                                <span className="text-[10px] text-muted-foreground">Selected</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div>
                                <span className="text-[10px] text-muted-foreground">Peak</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-24 md:h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={availableHours.map(hour => {
                                    const stats = hourlyStats.get(hour);
                                    const hourAvgDelay = stats && stats.delayCount > 0 ? stats.avgDelay / stats.delayCount : 0;
                                    return {
                                        hour,
                                        label: formatHourShort(hour),
                                        total: stats?.total || 0,
                                        success: stats?.success || 0,
                                        fail: stats?.fail || 0,
                                        avgDelay: hourAvgDelay,
                                        avgLine: isAvgEvent ? overallAvgDelay : avgPerHour, // Add average line
                                        isSelected: hour === selectedHour,
                                        isPeak: hour === peakHour
                                    };
                                })}
                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                onClick={(data: any) => {
                                    if (data?.activePayload?.[0]?.payload?.hour !== undefined) {
                                        setSelectedHour(data.activePayload[0].payload.hour);
                                    }
                                }}
                            >
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 9, fill: 'currentColor' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                                    interval={availableHours.length > 18 ? 2 : availableHours.length > 12 ? 1 : 0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: 'currentColor' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => {
                                        if (isAvgEvent) {
                                            // Format as time delay - values are already in minutes (Price Alert) or seconds (others)
                                            if (isPriceAlert) {
                                                // Value is already in minutes
                                                return v >= 60 ? `${(v / 60).toFixed(0)}h` : `${v.toFixed(0)}m`;
                                            } else {
                                                // Value is already in seconds
                                                return v >= 60 ? `${(v / 60).toFixed(0)}m` : `${v.toFixed(0)}s`;
                                            }
                                        }
                                        return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;
                                    }}
                                />
                                <Tooltip
                                    active={typeof window !== 'undefined' && window.innerWidth >= 768 ? undefined : false}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255,255,255,0.95)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        fontSize: '11px',
                                        padding: '8px 12px'
                                    }}
                                    formatter={(value: number, name: string) => {
                                        if (isAvgEvent && name === 'avgDelay') {
                                            return [formatDelay(value), 'Avg Delay'];
                                        }
                                        return [
                                            value.toLocaleString(),
                                            name === 'total' ? 'Events' : name === 'success' ? 'Success' : 'Failed'
                                        ];
                                    }}
                                    labelFormatter={(label) => `Hour: ${label}`}
                                />
                                <Bar
                                    dataKey={isAvgEvent ? "avgDelay" : "total"}
                                    radius={[6, 6, 0, 0]}
                                    cursor="pointer"
                                    onClick={(data: any) => {
                                        if (data && data.hour !== undefined) {
                                            setSelectedHour(data.hour);
                                        }
                                    }}
                                >
                                    {availableHours.map((hour, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={hour === selectedHour ? '#06b6d4' : hour === peakHour ? '#fbbf24' : '#93c5fd'}
                                            stroke={hour === selectedHour ? '#0891b2' : hour === peakHour ? '#f59e0b' : 'transparent'}
                                            strokeWidth={hour === selectedHour ? 3 : hour === peakHour ? 2 : 0}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        />
                                    ))}
                                </Bar>
                                {/* Yellow dashed average line */}
                                <ReferenceLine 
                                    y={isAvgEvent ? overallAvgDelay : avgPerHour} 
                                    stroke="#fbbf24" 
                                    strokeDasharray="5 5" 
                                    strokeWidth={2}
                                    label={{ 
                                        value: `Avg: ${isAvgEvent ? formatDelay(overallAvgDelay) : avgPerHour.toFixed(0)}`,
                                        position: 'right',
                                        fill: '#f59e0b',
                                        fontSize: 10,
                                        fontWeight: 'bold'
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Selected Hour Detail */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-2 border-cyan-200/60 dark:border-cyan-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
                                onClick={() => navigateHour(-1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                                <div className="text-xl font-bold text-foreground">{formatHour(selectedHour)}</div>
                                <div className="text-[10px] text-muted-foreground">Selected Hour</div>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
                                onClick={() => navigateHour(1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedHour === peakHour && (
                                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold flex items-center gap-1">
                                    <Flame className="h-3 w-3" /> Peak Hour
                                </span>
                            )}
                            <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1",
                                selectedVsAvg >= 0
                                    ? "bg-red-100 text-red-600 dark:bg-red-500/20"
                                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
                            )}>
                                {selectedVsAvg >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {selectedVsAvg >= 0 ? '+' : ''}{selectedVsAvg.toFixed(1)}% vs avg
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                {isAvgEvent ? formatDelay(selectedAvgDelay) : selectedStats.total.toLocaleString()}
                            </div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">
                                {isAvgEvent ? 'Avg Delay' : 'Total Events'}
                            </div>
                            <div className="text-[8px] sm:text-[9px] text-blue-500 mt-1">
                                {isAvgEvent ? `Average delay at ${formatHourShort(selectedHour)}` : `Sum of all events at ${formatHourShort(selectedHour)}`}
                            </div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{selectedStats.success.toLocaleString()}</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Successful</div>
                            <div className="text-[8px] sm:text-[9px] text-emerald-500 mt-1">Events completed OK</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-red-600">{selectedStats.fail.toLocaleString()}</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Failed</div>
                            <div className="text-[8px] sm:text-[9px] text-red-500 mt-1">Events with errors</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-xl sm:text-2xl font-bold text-purple-600">{selectedSuccessRate.toFixed(1)}%</div>
                            <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Success Rate</div>
                            <div className="text-[8px] sm:text-[9px] text-purple-500 mt-1">Success / Total</div>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-cyan-200/50 dark:border-cyan-500/20">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
                            <div>
                                <div className="text-xs text-muted-foreground">Data Points</div>
                                <div className="text-sm font-semibold text-foreground">{selectedStats.count} occurrences</div>
                                <div className="text-[9px] text-muted-foreground">Times this hour appeared in data</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Avg per Occurrence</div>
                                <div className="text-sm font-semibold text-foreground">{Math.round(avgPerDataPoint).toLocaleString()}</div>
                                <div className="text-[9px] text-muted-foreground">Events each time at {formatHourShort(selectedHour)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">% of Total</div>
                                <div className="text-sm font-semibold text-foreground">{overallTotal > 0 ? ((selectedStats.total / overallTotal) * 100).toFixed(1) : 0}%</div>
                                <div className="text-[9px] text-muted-foreground">Share of all events</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Insights Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[10px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            Peak: {formatHourShort(peakHour)} ({peakTotal.toLocaleString()})
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            Lowest: {formatHourShort(lowestHour)} ({lowestTotal === Infinity ? 0 : lowestTotal.toLocaleString()})
                        </span>
                    </div>
                    <span className="flex items-center gap-1">
                        Trend: {trendDirection === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : trendDirection === 'down' ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Activity className="h-3 w-3 text-blue-500" />}
                        {trendDirection === 'up' ? 'Increasing' : trendDirection === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                </div>
            </CardContent>
        </EnhancedCard>
    );
}

// Custom Pie Chart Tooltip
const PieTooltip = ({ active, payload, totalValue }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0';
    const percentageNum = parseFloat(percentage);

    return (
        <div
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200/60 dark:border-slate-700/60 p-3 min-w-[160px] max-w-[200px]"
        >
            <div className="flex items-center gap-2.5 mb-2">
                <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: payload[0]?.payload?.fill || PIE_COLORS[0] }}
                />
                <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                    {data.name}
                </span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Value</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {data.value?.toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Share</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {percentage}%
                    </span>
                </div>
            </div>
        </div>
    );
};

// Custom tooltip component - shows per-event success/fail percentages
// Now shows a condensed view with option to expand for more details
// isPinned = true means it was clicked and should auto-expand + show close button
const CustomTooltip = ({ active, payload, label, events: allEvents = [], eventKeys = [], isPinned = false, onClose }: any) => {
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

        return {
            name: item.name,
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

// Pie chart modal is now in its own component file

interface DashboardViewerProps {
    profileId: string;
    onEditProfile?: (profile: DashboardProfile) => void;
    onAlertsUpdate?: (alerts: any[]) => void;
}

interface FilterState {
    platforms: number[];
    pos: number[];
    sources: number[];
    events: number[];
    // New fields for togglable filters
    activeStages?: string[]; // Event IDs for active funnel stages
    activePercentageEvents?: string[]; // Event IDs for active percentage PARENT events (denominator)
    activePercentageChildEvents?: string[]; // Event IDs for active percentage CHILD events (numerator)
    activeFunnelChildEvents?: string[]; // Event IDs for active funnel multiple child breakdown
    percentageStatusCodes?: string[]; // Status codes for percentage analysis API events
    percentageCacheStatus?: string[]; // Cache status for percentage analysis API events
    apiStatusCodes?: string[]; // Status codes for regular API performance panels
    apiCacheStatus?: string[]; // Cache status for regular API performance panels
}

interface DateRangeState {
    from: Date;
    to: Date;
}

// Event key info for chart rendering
interface EventKeyInfo {
    eventId: string;
    eventName: string;
    eventKey: string;
    isErrorEvent?: number; // 1 = error event (red styling)
    isAvgEvent?: number;   // 1 = avg event (show time delay instead of count)
}

// Panel-specific data storage with filters and date range
interface PanelData {
    graphData: any[];
    eventKeys?: EventKeyInfo[];
    pieChartData: any;
    loading: boolean;
    error: string | null;
    filters: FilterState;
    dateRange: DateRangeState;
    showLegend: boolean; // Collapsed legend state
    rawGraphResponse?: any; // Store raw response for sourceStr filtering
}

// Event colors for the chart
const EVENT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#a855f7', '#3b82f6'
];

// Distinct color palette for error events - various shades for better distinction
// Vibrant, highly distinguishable error colors for easy identification
const ERROR_COLORS = [
    '#ef4444',  // bright red
    '#f97316',  // bright orange
    '#f59e0b',  // bright amber
    '#ec4899',  // bright pink
    '#a855f7',  // bright purple
    '#ec4899',  // bright magenta
    '#f43f5e',  // bright rose
    '#fb923c',  // bright orange-red
];

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// Utility function to combine duplicate entries (like multiple "Unknown") in pie chart data
const combinePieChartDuplicates = (data: any[]): any[] => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const combinedMap = new Map<string, number>();
    data.forEach(item => {
        const name = item.name || 'Unknown';
        combinedMap.set(name, (combinedMap.get(name) || 0) + (item.value || 0));
    });

    return Array.from(combinedMap.entries()).map(([name, value]) => ({ name, value }));
};

// Utility function to check if pie chart should be displayed
// Returns false if there's only 1 item (100% share) - no point showing that
const shouldShowPieChart = (data: any[]): boolean => {
    if (!data || data.length === 0) return false;
    const combinedData = combinePieChartDuplicates(data);
    return combinedData.length > 1;
};

export function DashboardViewer({ profileId, onEditProfile, onAlertsUpdate }: DashboardViewerProps) {
    // Theme and organization context
    const { currentTheme, isAutosnipe, themePalette } = useTheme();
    const { selectedOrganization } = useOrganization();

    const [profile, setProfile] = useState<DashboardProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    // Compute isHourly based on date range (8 days or less = hourly)
    const isHourly = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 8;

    // Expanded pie chart modal state
    const [expandedPie, setExpandedPie] = useState<ExpandedPieData | null>(null);
    const [pieModalOpen, setPieModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // API data
    const [events, setEvents] = useState<EventConfig[]>([]);
    const [siteDetails, setSiteDetails] = useState<SiteDetail[]>([]);

    // Multi-select filter state
    // Note: Empty array means "all" for any filter - API sends [] which backend treats as all
    const [filters, setFilters] = useState<FilterState>({
        platforms: [],  // Empty = all platforms
        pos: [],        // Empty = all POS
        sources: [],    // Empty = all sources
        events: []      // Empty = all events
    });

    // Individual panel filter change tracking
    const [panelFilterChanges, setPanelFilterChanges] = useState<Record<string, boolean>>({});

    // Chart data - now stored per panel
    const [graphData, setGraphData] = useState<any[]>([]);
    const [eventKeys, setEventKeys] = useState<EventKeyInfo[]>([]);
    const [pieChartData, setPieChartData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Critical Alerts state - Fully independent panel
    const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [alertsPage, setAlertsPage] = useState(0);
    const [alertsPanelCollapsed, setAlertsPanelCollapsed] = useState(true);
    const [alertIsApi, setAlertIsApi] = useState(0); // 0 = Regular events, 1 = API events

    // Alert-specific filters (independent from main dashboard)
    const [alertFilters, setAlertFilters] = useState<{
        events: number[];
        platforms: string[];
        pos: number[];
        sources: string[];
    }>({
        events: [],
        platforms: [],
        pos: [],
        sources: []
    });
    const [alertDateRange, setAlertDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    // Multiple panels data storage
    const [panelsDataMap, setPanelsDataMap] = useState<Map<string, PanelData>>(new Map());

    // Panel-specific filters state (for user modifications - resets on refresh)
    const [panelFiltersState, setPanelFiltersState] = useState<Record<string, FilterState>>({});
    const [panelDateRanges, setPanelDateRanges] = useState<Record<string, DateRangeState>>({});
    const [panelLoading, setPanelLoading] = useState<Record<string, boolean>>({});

    // Chart type toggle for each panel - 'default' or 'deviation'
    const [panelChartType, setPanelChartType] = useState<Record<string, 'default' | 'deviation'>>({});

    // SourceStr (Job ID) filter - client-side only, not sent to API
    // Available sourceStr values extracted from graph data
    const [availableSourceStrs, setAvailableSourceStrs] = useState<string[]>([]);
    const [selectedSourceStrs, setSelectedSourceStrs] = useState<string[]>([]); // Empty = all
    const [availableStatusCodes, setAvailableStatusCodes] = useState<string[]>([]);
    const [availableCacheStatuses, setAvailableCacheStatuses] = useState<string[]>([]);
    const [loadingApiFilters, setLoadingApiFilters] = useState(false);
    // Per-panel API filter states
    const [panelLoadingApiFilters, setPanelLoadingApiFilters] = useState<Record<string, boolean>>({});
    const [panelAvailableStatusCodes, setPanelAvailableStatusCodes] = useState<Record<string, string[]>>({});
    const [panelAvailableCacheStatuses, setPanelAvailableCacheStatuses] = useState<Record<string, string[]>>({});
    const [_panelAvailableSourceStrs, setPanelAvailableSourceStrs] = useState<Record<string, string[]>>({});
    const [panelSelectedSourceStrs, _setPanelSelectedSourceStrs] = useState<Record<string, string[]>>({});

    // Store raw graph response for client-side filtering
    const [rawGraphResponse, setRawGraphResponse] = useState<any>(null);
    const [_panelRawGraphResponses, setPanelRawGraphResponses] = useState<Record<string, any>>({});

    // Panel navigation and UI state
    const [_activePanelId, setActivePanelId] = useState<string | null>(null);
    const [mainLegendExpanded, setMainLegendExpanded] = useState(false);
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
    const [apiSelectedEventKey, setApiSelectedEventKey] = useState<string | null>(null); // Independent selection for API Performance Metrics
    const [overlaySelectedEventKey, setOverlaySelectedEventKey] = useState<string | null>(null); // Independent selection for 8-Day Overlay
    const [errorSelectedEventKey, setErrorSelectedEventKey] = useState<string | null>(null); // Independent selection for Error Event Tracking
    const [panelLegendExpanded, setPanelLegendExpanded] = useState<Record<string, boolean>>({});
    const [panelSelectedEventKey, setPanelSelectedEventKey] = useState<Record<string, string | null>>({});
    const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // API event metric view - comprehensive metrics
    const [apiMetricView, setApiMetricView] = useState<'timing' | 'timing-breakdown' | 'timing-anomaly' | 'bytes' | 'bytes-in' | 'count'>('timing');
    const [panelApiMetricView, setPanelApiMetricView] = useState<Record<string, 'timing' | 'timing-breakdown' | 'timing-anomaly' | 'bytes' | 'bytes-in' | 'count'>>({});

    // Pinned tooltip for main chart - stores the data point to show in expanded view
    const [pinnedTooltip, setPinnedTooltip] = useState<{ dataPoint: any; label: string } | null>(null);

    // Pinned tooltips for panel charts - keyed by panelId
    const [panelPinnedTooltips, setPanelPinnedTooltips] = useState<Record<string, { dataPoint: any; label: string } | null>>({});

    // Toast for panel navigation notifications
    const { toast } = useToast();

    // Toggle state for Event Trends vs 8-Day Overlay - main panel and per-panel
    const [showOverlayMain, setShowOverlayMain] = useState<boolean>(false);
    const [showOverlayPanel, setShowOverlayPanel] = useState<Record<string, boolean>>({});

    // Configurable auto-refresh (in minutes, 0 = disabled)
    const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<number>(0);
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false);
    const initialLoadComplete = useRef<boolean>(false);
    const lastAutoLoadedProfileId = useRef<string | null>(null);

    // Filter panel collapse state - collapsed by default (main dashboard only)
    const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(false); // Default to expanded so API filters are visible

    // Panel-specific filter collapse states - collapsed by default for new panels
    const [panelFiltersCollapsed, setPanelFiltersCollapsed] = useState<Record<string, boolean>>({});

    // Memoize isMainPanelApi to prevent infinite re-render loop
    // MUST be at top level, not inside conditional logic
    const isMainPanelApi = useMemo(() => {
        const mainPanelConfig = profile?.panels?.[0]?.filterConfig;
        return mainPanelConfig?.isApiEvent === true;
    }, [profile?.panels]);

    // API Performance Metrics filtered data
    const filteredApiData = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels[0]) return graphData;
        
        const mainPanelId = profile.panels[0].panelId;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const statusCodes = (mainPanelFilters.percentageStatusCodes || []).filter(Boolean);
        const cacheStatuses = (mainPanelFilters.percentageCacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;
        
        if (!hasStatusFilter && !hasCacheFilter) return graphData;
        
        return graphData.map(record => {
            const filteredRecord = { ...record };
            
            eventKeys.forEach(eventKeyInfo => {
                const eventKey = eventKeyInfo.eventKey;
                
                let filteredCount = 0;
                let filteredAvgServerToUser = 0;
                let filteredAvgServerToCloud = 0;
                let filteredAvgCloudToUser = 0;
                let filteredAvgBytesOut = 0;
                let filteredAvgBytesIn = 0;
                let filterCount = 0;
                
                if (hasStatusFilter && hasCacheFilter) {
                    // Both filters: combine status AND cache
                    statusCodes.forEach((status) => {
                        cacheStatuses.forEach((cache) => {
                            const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                            const countKey = `${combinedKey}_count`;
                            const avgServerToUserKey = `${combinedKey}_avgServerToUser`;
                            const avgServerToCloudKey = `${combinedKey}_avgServerToCloud`;
                            const avgCloudToUserKey = `${combinedKey}_avgCloudToUser`;
                            const avgBytesOutKey = `${combinedKey}_avgBytesOut`;
                            const avgBytesInKey = `${combinedKey}_avgBytesIn`;
                            
                            const count = Number(record[countKey] || 0);
                            if (count > 0) {
                                filteredCount += count;
                                filteredAvgServerToUser += Number(record[avgServerToUserKey] || 0) * count;
                                filteredAvgServerToCloud += Number(record[avgServerToCloudKey] || 0) * count;
                                filteredAvgCloudToUser += Number(record[avgCloudToUserKey] || 0) * count;
                                filteredAvgBytesOut += Number(record[avgBytesOutKey] || 0) * count;
                                filteredAvgBytesIn += Number(record[avgBytesInKey] || 0) * count;
                                filterCount += count;
                            }
                        });
                    });
                } else if (hasStatusFilter) {
                    statusCodes.forEach((status) => {
                        const statusKey = `${eventKey}_status_${status}`;
                        const countKey = `${statusKey}_count`;
                        const avgServerToUserKey = `${statusKey}_avgServerToUser`;
                        const avgServerToCloudKey = `${statusKey}_avgServerToCloud`;
                        const avgCloudToUserKey = `${statusKey}_avgCloudToUser`;
                        const avgBytesOutKey = `${statusKey}_avgBytesOut`;
                        const avgBytesInKey = `${statusKey}_avgBytesIn`;
                        
                        const count = Number(record[countKey] || 0);
                        if (count > 0) {
                            filteredCount += count;
                            filteredAvgServerToUser += Number(record[avgServerToUserKey] || 0) * count;
                            filteredAvgServerToCloud += Number(record[avgServerToCloudKey] || 0) * count;
                            filteredAvgCloudToUser += Number(record[avgCloudToUserKey] || 0) * count;
                            filteredAvgBytesOut += Number(record[avgBytesOutKey] || 0) * count;
                            filteredAvgBytesIn += Number(record[avgBytesInKey] || 0) * count;
                            filterCount += count;
                        }
                    });
                } else if (hasCacheFilter) {
                    cacheStatuses.forEach((cache) => {
                        const cacheKey = `${eventKey}_cache_${cache}`;
                        const countKey = `${cacheKey}_count`;
                        const avgServerToUserKey = `${cacheKey}_avgServerToUser`;
                        const avgServerToCloudKey = `${cacheKey}_avgServerToCloud`;
                        const avgCloudToUserKey = `${cacheKey}_avgCloudToUser`;
                        const avgBytesOutKey = `${cacheKey}_avgBytesOut`;
                        const avgBytesInKey = `${cacheKey}_avgBytesIn`;
                        
                        const count = Number(record[countKey] || 0);
                        if (count > 0) {
                            filteredCount += count;
                            filteredAvgServerToUser += Number(record[avgServerToUserKey] || 0) * count;
                            filteredAvgServerToCloud += Number(record[avgServerToCloudKey] || 0) * count;
                            filteredAvgCloudToUser += Number(record[avgCloudToUserKey] || 0) * count;
                            filteredAvgBytesOut += Number(record[avgBytesOutKey] || 0) * count;
                            filteredAvgBytesIn += Number(record[avgBytesInKey] || 0) * count;
                            filterCount += count;
                        }
                    });
                }
                
                // Calculate weighted averages - only update if we have filtered data
                if (filterCount > 0) {
                    filteredRecord[`${eventKeyInfo.eventKey}_count`] = filteredCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgServerToUser`] = filteredAvgServerToUser / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgServerToCloud`] = filteredAvgServerToCloud / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgCloudToUser`] = filteredAvgCloudToUser / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgBytesOut`] = filteredAvgBytesOut / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgBytesIn`] = filteredAvgBytesIn / filterCount;
                }
                // If no filtered data, keep original values (don't zero them out)
            });
            
            return filteredRecord;
        });
    }, [graphData, eventKeys, events, isMainPanelApi, profile, panelFiltersState]);

    const panelApiPerformanceSeriesMap = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (!profile?.panels || profile.panels.length <= 1) return map;

        const buildFromRaw = (rawData: any[], statusCodes: string[], cacheStatuses: string[], isHourlyBucket: boolean) => {
            const hasStatus = statusCodes.length > 0;
            const hasCache = cacheStatuses.length > 0;
            const timeMap = new Map<string, any>();
            const usedKeys = new Set<string>();

            rawData.forEach((r: any) => {
                if (!r?.timestamp) return;
                const dt = new Date(r.timestamp);
                const dateKey = isHourlyBucket
                    ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                    : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (!timeMap.has(dateKey)) timeMap.set(dateKey, { date: dateKey, timestamp: r.timestamp });
                const entry = timeMap.get(dateKey);

                const matchesStatus = !hasStatus || statusCodes.includes(String(r.status));
                const matchesCache = !hasCache || cacheStatuses.includes(String(r.cacheStatus || 'none'));
                if (!matchesStatus || !matchesCache) return;

                const eventId = String(r.eventId);
                const eventConfig = events.find(e => String(e.eventId) === eventId);
                const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                    ? `${eventConfig.host} - ${eventConfig.url}`
                    : (eventConfig?.eventName || `Event ${eventId}`);
                const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');
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

                entry[`${eventKey}_count`] += count;
                entry[`${eventKey}_sumCount`] += count;
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
        };

        profile.panels.slice(1).forEach((p: any) => {
            const panelId = p.panelId;
            const panelConfig = (p as any).filterConfig;
            if (!panelConfig?.isApiEvent) return;

            const rawData: any[] = (panelsDataMap.get(panelId)?.rawGraphResponse?.data || []) as any[];
            if (rawData.length === 0) {
                map[panelId] = [];
                return;
            }

            const pf = panelFiltersState[panelId] || {} as any;
            const statusCodes = (pf.percentageStatusCodes || [])
                .filter(Boolean)
                .map((v: any) => String(v))
                .filter((v: string) => /^\d+$/.test(v));
            const cacheStatuses = (pf.percentageCacheStatus || []).filter(Boolean).map((v: any) => String(v));
            const panelRange = panelDateRanges[panelId] || dateRange;
            const isHourlyBucket = Math.ceil((panelRange.to.getTime() - panelRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 7;

            map[panelId] = buildFromRaw(rawData, statusCodes, cacheStatuses, isHourlyBucket);
        });

        return map;
    }, [profile?.panels, panelsDataMap, panelFiltersState, panelDateRanges, dateRange, events]);

    const apiEndpointEventKeyInfos = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return [] as EventKeyInfo[];

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelConfig = (profile.panels[0] as any)?.filterConfig;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const selectedEventIds = (mainPanelFilters.events && mainPanelFilters.events.length > 0)
            ? mainPanelFilters.events
            : (mainPanelConfig?.events || []);

        const ids = (selectedEventIds || []).map((v: any) => String(v)).filter(Boolean);
        return ids.map((id: string) => {
            const ev = events.find(e => String(e.eventId) === String(id));
            const name = ev?.isApiEvent && ev?.host && ev?.url
                ? `${ev.host} - ${ev.url}`
                : (ev?.eventName || `Event ${id}`);
            return {
                eventId: String(id),
                eventName: name,
                eventKey: name.replace(/[^a-zA-Z0-9]/g, '_'),
                isErrorEvent: 0,
                isAvgEvent: 0,
            };
        });
    }, [isMainPanelApi, profile?.panels, panelFiltersState, events]);

    // Build API Performance Metrics series directly from RAW API response so it works even in percentage/funnel views
    const apiPerformanceSeries = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return graphData;

        const firstPanel = profile?.panels?.[0];
        const firstPanelFilterConfig = (firstPanel as any)?.filterConfig;
        const isFirstPanelSpecialGraphLocal = firstPanelFilterConfig?.graphType === 'percentage' || firstPanelFilterConfig?.graphType === 'funnel';

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const statusCodes = ((isFirstPanelSpecialGraphLocal
            ? (mainPanelFilters.percentageStatusCodes || [])
            : (mainPanelFilters.apiStatusCodes || mainPanelFilters.percentageStatusCodes || [])) as any[])
            .filter(Boolean)
            .map(v => String(v))
            .filter(v => /^\d+$/.test(v));
        const cacheStatuses = ((isFirstPanelSpecialGraphLocal
            ? (mainPanelFilters.percentageCacheStatus || [])
            : (mainPanelFilters.apiCacheStatus || mainPanelFilters.percentageCacheStatus || [])) as any[])
            .filter(Boolean)
            .map(v => String(v));
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];
        if (!rawData || rawData.length === 0) return graphData;

        // Group by hour/day
        const timeMap = new Map<string, any>();
        const usedKeys = new Set<string>();
        rawData.forEach((r) => {
            if (!r || !r.timestamp) return;
            const dt = new Date(r.timestamp);
            const dateKey = isHourly
                ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!timeMap.has(dateKey)) {
                timeMap.set(dateKey, { date: dateKey, timestamp: r.timestamp });
            }
            const entry = timeMap.get(dateKey);

            const matchesStatus = !hasStatusFilter || statusCodes.includes(String(r.status));
            const matchesCache = !hasCacheFilter || cacheStatuses.includes(String(r.cacheStatus || 'none'));
            if (!matchesStatus || !matchesCache) return;

            const eventId = String(r.eventId);
            const eventConfig = events.find(e => String(e.eventId) === eventId);
            const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                ? `${eventConfig.host} - ${eventConfig.url}`
                : (eventConfig?.eventName || `Event ${eventId}`);
            const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');
            usedKeys.add(eventKey);

            const count = Number(r.count || 0);
            if (!entry[`${eventKey}_count`]) {
                entry[`${eventKey}_count`] = 0;
                entry[`${eventKey}_sumCount`]= 0;
                entry[`${eventKey}_avgServerToUser_sum`] = 0;
                entry[`${eventKey}_avgServerToCloud_sum`] = 0;
                entry[`${eventKey}_avgCloudToUser_sum`] = 0;
                entry[`${eventKey}_avgBytesOut_sum`] = 0;
                entry[`${eventKey}_avgBytesIn_sum`] = 0;
            }

            entry[`${eventKey}_count`] += count;
            entry[`${eventKey}_sumCount`] += count;
            // avgServerToUser is authoritative (ms). Only fall back to sum of parts when avgServerToUser is 0.
            const rawServerToUser = Number(r.avgServerToUser || 0);
            const rawServerToCloud = Number(r.avgServerToCloud || 0);
            const rawCloudToUser = Number(r.avgCloudToUser || 0);
            const sumParts = rawServerToCloud + rawCloudToUser;
            const effectiveServerToUser = rawServerToUser > 0 ? rawServerToUser : (sumParts > 0 ? sumParts : 0);
            entry[`${eventKey}_avgServerToUser_sum`] += effectiveServerToUser * count;
            entry[`${eventKey}_avgServerToCloud_sum`] += Number(r.avgServerToCloud || 0) * count;
            entry[`${eventKey}_avgCloudToUser_sum`] += Number(r.avgCloudToUser || 0) * count;
            entry[`${eventKey}_avgBytesOut_sum`] += Number(r.avgBytesOut || 0) * count;
            entry[`${eventKey}_avgBytesIn_sum`] += Number(r.avgBytesIn || 0) * count;
        });

        const result = Array.from(timeMap.values())
            .map((entry) => {
                const out = { ...entry } as any;
                // finalize weighted averages
                usedKeys.forEach((key) => {
                    const denom = Number(out[`${key}_sumCount`] || 0);
                    if (denom > 0) {
                        out[`${key}_avgServerToUser`] = Number(out[`${key}_avgServerToUser_sum`] || 0) / denom;
                        out[`${key}_avgServerToCloud`] = Number(out[`${key}_avgServerToCloud_sum`] || 0) / denom;
                        out[`${key}_avgCloudToUser`] = Number(out[`${key}_avgCloudToUser_sum`] || 0) / denom;
                        out[`${key}_avgBytesOut`] = Number(out[`${key}_avgBytesOut_sum`] || 0) / denom;
                        out[`${key}_avgBytesIn`] = Number(out[`${key}_avgBytesIn_sum`] || 0) / denom;
                    }
                    delete out[`${key}_sumCount`];
                    delete out[`${key}_avgServerToUser_sum`];
                    delete out[`${key}_avgServerToCloud_sum`];
                    delete out[`${key}_avgCloudToUser_sum`];
                    delete out[`${key}_avgBytesOut_sum`];
                    delete out[`${key}_avgBytesIn_sum`];
                });
                return out;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return result;
    }, [isMainPanelApi, profile?.panels, panelFiltersState, panelsDataMap, rawGraphResponse, events, isHourly, graphData]);

    // Initialize panel filters as collapsed when profile loads
    useEffect(() => {
        if (profile?.panels) {
            const initialCollapseState: Record<string, boolean> = {};
            profile.panels.forEach(panel => {
                initialCollapseState[panel.panelId] = true; // Collapsed by default
            });
            setPanelFiltersCollapsed(initialCollapseState);
        }
    }, [profile?.panels]);

    // Note: Auto-selection disabled for 8-Day Overlay
    // Show all events by default to prevent empty graphs
    // User can click legend to filter specific events

    // Function to jump to a panel (prepared for future use)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleJumpToPanel = useCallback((panelId: string) => {
        setActivePanelId(panelId);
        const panelElement = panelRefs.current[panelId];
        if (panelElement) {
            panelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    // Close pinned tooltip on Esc
    useEffect(() => {
        if (!pinnedTooltip) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPinnedTooltip(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pinnedTooltip]);

    // Function to toggle panel legend
    const togglePanelLegend = useCallback((panelId: string) => {
        setPanelLegendExpanded(prev => ({
            ...prev,
            [panelId]: !prev[panelId]
        }));
    }, []);

    // Function to handle event click in legend - toggle selection
    const handleEventClick = useCallback((eventKey: string) => {
        setSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in API Performance Metrics legend - independent selection
    const handleApiEventClick = useCallback((eventKey: string) => {
        setApiSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in 8-Day Overlay legend - independent selection
    const handleOverlayEventClick = useCallback((eventKey: string) => {
        setOverlaySelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in Error Event Tracking legend - independent selection
    const handleErrorEventClick = useCallback((eventKey: string) => {
        setErrorSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle graph point click - select event and scroll to legend (used only from pills now)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleGraphPointClick = useCallback((eventKey: string) => {
        // Set the selected event
        setSelectedEventKey(eventKey);
        // Expand the legend if it's collapsed
        setMainLegendExpanded(true);
        // Scroll to the legend item after a short delay to ensure it's rendered
        setTimeout(() => {
            const legendElement = document.getElementById(`legend-${eventKey}`);
            if (legendElement) {
                legendElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                legendElement.classList.add('ring-4', 'ring-purple-400');
                setTimeout(() => {
                    legendElement.classList.remove('ring-4', 'ring-purple-400');
                }, 1500);
            }
        }, 100);
    }, []);

    // Function to handle panel event click - toggle selection
    const handlePanelEventClick = useCallback((panelId: string, eventKey: string) => {
        setPanelSelectedEventKey(prev => ({
            ...prev,
            [panelId]: prev[panelId] === eventKey ? null : eventKey
        }));
    }, []);

    // Function to handle panel graph point click - select event and scroll to legend
    const handlePanelGraphPointClick = useCallback((panelId: string, eventKey: string) => {
        // Set the selected event for this panel
        setPanelSelectedEventKey(prev => ({
            ...prev,
            [panelId]: eventKey
        }));
        // Expand the panel legend if it's collapsed
        setPanelLegendExpanded(prev => ({
            ...prev,
            [panelId]: true
        }));
        // Scroll to the legend item after a short delay
        setTimeout(() => {
            const legendElement = document.getElementById(`legend-${eventKey}`);
            if (legendElement) {
                legendElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                legendElement.classList.add('ring-4', 'ring-purple-400');
                setTimeout(() => {
                    legendElement.classList.remove('ring-4', 'ring-purple-400');
                }, 1500);
            }
        }, 100);
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handlePanelChartClick = useCallback((panelId: string, chartState: any) => {
        if (!chartState || !chartState.activePayload || chartState.activePayload.length === 0) return;
        const firstSeries = chartState.activePayload[0];
        const dataKey = typeof firstSeries.dataKey === 'string' ? firstSeries.dataKey : '';
        if (!dataKey || !dataKey.endsWith('_count')) return;
        const eventKey = dataKey.replace(/_count$/, '');
        if (eventKey) {
            handlePanelGraphPointClick(panelId, eventKey);
        }
    }, [handlePanelGraphPointClick]);

    // Function to update panel-specific filter
    const updatePanelFilter = useCallback((panelId: string, filterType: keyof FilterState, values: number[]) => {
        setPanelFiltersState(prev => ({
            ...prev,
            [panelId]: {
                ...prev[panelId],
                [filterType]: values
            }
        }));
        // Mark that this panel's filters have changed so APPLY banner shows
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: true
        }));
    }, []);

    // Function to update panel date range
    const updatePanelDateRange = useCallback((panelId: string, from: Date, to: Date) => {
        setPanelDateRanges(prev => ({
            ...prev,
            [panelId]: { from, to }
        }));
        // Mark that this panel's filters have changed so APPLY banner shows
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: true
        }));
    }, []);

    // Function to open expanded pie chart and sync with URL so browser
    // back/forward buttons can close/reopen it
    const openExpandedPie = (type: 'platform' | 'pos' | 'source' | 'status' | 'cacheStatus', title: string, data: any[]) => {
        setExpandedPie({ type, title, data });
        setPieModalOpen(true);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev as any);
            next.set('expandedPie', type);
            return next;
        });
    };

    // Keep modal open state in sync with the query param so that
    // browser back/forward navigations close or reopen the modal
    useEffect(() => {
        const expandedType = searchParams.get('expandedPie') as 'platform' | 'pos' | 'source' | null;

        if (!expandedType) {
            if (pieModalOpen) setPieModalOpen(false);
            return;
        }

        if (expandedPie && expandedPie.type === expandedType && !pieModalOpen) {
            setPieModalOpen(true);
        }
    }, [searchParams, expandedPie, pieModalOpen]);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);

            try {
                const loadedProfile = await mockService.getProfile(profileId);

                if (loadedProfile) {
                    setProfile(loadedProfile);

                    // Fetch site details and events in parallel to reduce
                    // perceived latency on first render.
                    const [sites, featureEvents] = await Promise.all([
                        apiService.getSiteDetails(),
                        apiService.getEventsList(loadedProfile.featureId)
                    ]);

                    setSiteDetails(sites);
                    setEvents(featureEvents);

                    // Initialize panel filter states from admin configs (these reset on refresh)
                    const initialPanelFilters: Record<string, FilterState> = {};
                    const initialPanelDateRanges: Record<string, DateRangeState> = {};
                    const initialPanelChartTypes: Record<string, 'default' | 'deviation'> = {};

                    loadedProfile.panels.forEach((panel) => {
                        const panelConfig = (panel as any).filterConfig || {};

                        const defaultFilters: FilterState = {
                            platforms: panelConfig.platforms || [],
                            pos: panelConfig.pos || [],
                            sources: panelConfig.sources || [],
                            events: panelConfig.events || [],
                        };

                        initialPanelFilters[panel.panelId] = defaultFilters;
                        // Use the current global dateRange as the default per-panel range
                        initialPanelDateRanges[panel.panelId] = { ...dateRange };

                        // Initialize chart type per panel from saved config
                        // Default to enabled (true) for daily deviation curve - DEVIATION MODE BY DEFAULT
                        const isDeviation = panelConfig.dailyDeviationCurve !== false;
                        initialPanelChartTypes[panel.panelId] = isDeviation ? 'deviation' : 'default';
                    });

                    setPanelFiltersState(initialPanelFilters);
                    setPanelDateRanges(initialPanelDateRanges);
                    setPanelChartType(initialPanelChartTypes);

                    // Check if panels have saved filter configs
                    const firstPanelConfig = loadedProfile.panels[0]?.filterConfig as any;

                    if (firstPanelConfig && firstPanelConfig.events && firstPanelConfig.events.length > 0) {
                        // Use saved filter config from first panel
                        setFilters({
                            platforms: firstPanelConfig.platforms || [0],
                            pos: firstPanelConfig.pos || [2],
                            sources: firstPanelConfig.sources || [],
                            events: firstPanelConfig.events
                        });
                    } else {
                        // Fall back to defaults - empty arrays mean "all"
                        setFilters({
                            platforms: [],  // All platforms
                            pos: [],        // All POS
                            sources: [],    // All sources
                            events: []      // All events
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to load initial data:', err);
                setError('Failed to load dashboard configuration');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [profileId]);

    // Initialize API filter defaults when raw data becomes available
    useEffect(() => {
        if (!profile || !isMainPanelApi) return;
        
        const mainPanelId = profile.panels[0]?.panelId;
        if (!mainPanelId) return;
        
        const mainPanelData = panelsDataMap.get(mainPanelId);
        const rawData = mainPanelData?.rawGraphResponse?.data || rawGraphResponse?.data || [];
        
        if (rawData.length === 0) return;
        
        const currentFilters = panelFiltersState[mainPanelId] || {};
        
        // Skip if already initialized
        if (currentFilters.percentageStatusCodes || currentFilters.percentageCacheStatus) return;
        
        const statusSet = new Set<string>();
        const cacheSet = new Set<string>();
        
        rawData.forEach((record: any) => {
            // Direct field extraction (API response format)
            if (record.status !== undefined && record.status !== null) {
                statusSet.add(String(record.status));
            }
            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                cacheSet.add(record.cacheStatus);
            }
            
            // Also check key patterns for processed data format
            Object.keys(record).forEach(key => {
                const statusMatch = key.match(/_status_(\d+)_/);
                const cacheMatch = key.match(/_cache_([^_]+)_/);
                if (statusMatch) statusSet.add(statusMatch[1]);
                if (cacheMatch) cacheSet.add(cacheMatch[1]);
            });
        });
        
        if (statusSet.size > 0 || cacheSet.size > 0) {
            const statusCodes = Array.from(statusSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const cacheStatuses = Array.from(cacheSet).sort();
            
            // Initialize with defaults
            const defaultStatus = statusCodes.includes('200') ? ['200'] : statusCodes;
            const defaultCache = cacheStatuses;
            
            setPanelFiltersState(prev => ({
                ...prev,
                [mainPanelId]: {
                    ...prev[mainPanelId],
                    percentageStatusCodes: defaultStatus,
                    percentageCacheStatus: defaultCache
                }
            }));
            
            console.log('🔧 Initialized API filters:', { statusCodes: defaultStatus, cacheStatuses: defaultCache });
        }
    }, [profile, isMainPanelApi, panelsDataMap, rawGraphResponse, panelFiltersState]);

    // Helper function to extract unique sourceStr values from raw graph response
    const extractSourceStrs = useCallback((graphResponse: any): string[] => {
        if (!graphResponse?.data) return [];
        const sourceStrs = new Set<string>();
        graphResponse.data.forEach((record: any) => {
            if (record.sourceStr && typeof record.sourceStr === 'string' && record.sourceStr.trim() !== '') {
                sourceStrs.add(record.sourceStr);
            }
        });
        return Array.from(sourceStrs).sort();
    }, []);

    // Helper function to filter raw graph data by selected sourceStrs (client-side filter)
    const filterBySourceStr = useCallback((graphResponse: any, selectedStrs: string[]): any => {
        if (!graphResponse?.data) return graphResponse;
        // If no filter selected (empty array), return all data
        if (selectedStrs.length === 0) return graphResponse;

        return {
            ...graphResponse,
            data: graphResponse.data.filter((record: any) => {
                // If record has no sourceStr, include it only if we're not filtering
                if (!record.sourceStr || record.sourceStr.trim() === '') {
                    return false; // Exclude records without sourceStr when filtering
                }
                return selectedStrs.includes(record.sourceStr);
            })
        };
    }, []);

    // Helper function to process graph response into display format
    // Creates separate data series per event for proper bifurcation
    // Handles avgEvents by plotting avgDelay (time) instead of count
    // Handles API events by grouping by status/cacheStatus instead of eventId
    const processGraphData = useCallback((graphResponse: any, startDate: Date, endDate: Date, eventsList: EventConfig[], isApiEvent: boolean = false, graphType?: string) => {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Create maps for event lookup
        const eventNameMap = new Map<string, string>();
        const eventConfigMap = new Map<string, EventConfig>();
        eventsList.forEach(e => {
            eventNameMap.set(String(e.eventId), e.eventName);
            eventConfigMap.set(String(e.eventId), e);
        });

        // For API events, we group by status/cacheStatus instead of eventId
        // UNLESS it's a special graph type (percentage/funnel) which needs specific endpoint comparisons
        // In that case, we fall through to the "Regular" logic but capture status codes as sub-metrics
        const useApiAggregation = isApiEvent && graphType !== 'percentage' && graphType !== 'funnel';

        if (useApiAggregation) {
            const timeMap = new Map<string, any>();
            const statusSet = new Set<string>();
            const cacheStatusSet = new Set<string>();

            (graphResponse.data || []).forEach((record: any) => {
                const recordDate = new Date(record.timestamp);
                const dateKey = isHourly
                    ? recordDate.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        hour12: true
                    })
                    : recordDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                const status = record.status ? String(record.status) : 'unknown';
                const cacheStatus = record.cacheStatus || 'none';
                statusSet.add(status);
                cacheStatusSet.add(cacheStatus);

                if (!timeMap.has(dateKey)) {
                    timeMap.set(dateKey, {
                        date: dateKey,
                        timestamp: record.timestamp,
                        count: 0,
                        successCount: 0,
                        failCount: 0,
                    });
                }

                const existing = timeMap.get(dateKey)!;

                // Add overall totals
                existing.count += record.count || 0;
                existing.successCount += record.successCount || 0;
                existing.failCount += record.failCount || 0;

                // Add per-status data
                const statusKey = `status_${status}`;
                if (!existing[`${statusKey}_count`]) {
                    existing[`${statusKey}_count`] = 0;
                    existing[`${statusKey}_success`] = 0;
                    existing[`${statusKey}_fail`] = 0;
                    existing[`${statusKey}_avgBytesIn`] = 0;
                    existing[`${statusKey}_avgBytesOut`] = 0;
                    existing[`${statusKey}_avgServerToUser`] = 0;
                    existing[`${statusKey}_avgServerToCloud`] = 0;
                    existing[`${statusKey}_avgCloudToUser`] = 0;
                    existing[`${statusKey}_dataPointCount`] = 0;
                }
                existing[`${statusKey}_count`] += record.count || 0;
                existing[`${statusKey}_success`] += record.successCount || 0;
                existing[`${statusKey}_fail`] += record.failCount || 0;

                // Accumulate timing metrics for averaging
                if (record.avgBytesIn) existing[`${statusKey}_avgBytesIn`] += parseFloat(record.avgBytesIn);
                if (record.avgBytesOut) existing[`${statusKey}_avgBytesOut`] += parseFloat(record.avgBytesOut);
                if (record.avgServerToUser) existing[`${statusKey}_avgServerToUser`] += parseFloat(record.avgServerToUser);
                if (record.avgServerToCloud) existing[`${statusKey}_avgServerToCloud`] += parseFloat(record.avgServerToCloud);
                if (record.avgCloudToUser) existing[`${statusKey}_avgCloudToUser`] += parseFloat(record.avgCloudToUser);
                existing[`${statusKey}_dataPointCount`] += 1;

                // Add per-cacheStatus data
                const cacheKey = `cache_${cacheStatus}`;
                if (!existing[`${cacheKey}_count`]) {
                    existing[`${cacheKey}_count`] = 0;
                    existing[`${cacheKey}_success`] = 0;
                    existing[`${cacheKey}_fail`] = 0;
                }
                existing[`${cacheKey}_count`] += record.count || 0;
                existing[`${cacheKey}_success`] += record.successCount || 0;
                existing[`${cacheKey}_fail`] += record.failCount || 0;
            });

            // Calculate averages for timing metrics
            timeMap.forEach((entry) => {
                statusSet.forEach(status => {
                    const statusKey = `status_${status}`;
                    const dataPointCount = entry[`${statusKey}_dataPointCount`] || 0;
                    if (dataPointCount > 0) {
                        entry[`${statusKey}_avgBytesIn`] = entry[`${statusKey}_avgBytesIn`] / dataPointCount;
                        entry[`${statusKey}_avgBytesOut`] = entry[`${statusKey}_avgBytesOut`] / dataPointCount;
                        entry[`${statusKey}_avgServerToUser`] = entry[`${statusKey}_avgServerToUser`] / dataPointCount;
                        entry[`${statusKey}_avgServerToCloud`] = entry[`${statusKey}_avgServerToCloud`] / dataPointCount;
                        entry[`${statusKey}_avgCloudToUser`] = entry[`${statusKey}_avgCloudToUser`] / dataPointCount;
                    }
                });
            });

            const sortedData = Array.from(timeMap.values()).sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            // Build event keys for status codes
            const statusEventKeys = Array.from(statusSet).map(status => ({
                eventId: `status_${status}`,
                eventName: `Status ${status}`,
                eventKey: `status_${status}`,
                isErrorEvent: parseInt(status) >= 400 ? 1 : 0,
                isAvgEvent: 0,
                isApiEvent: true,
                apiMetricType: 'status' as const
            }));

            // Build event keys for cache status
            const cacheEventKeys = Array.from(cacheStatusSet).map(cache => ({
                eventId: `cache_${cache}`,
                eventName: `Cache: ${cache}`,
                eventKey: `cache_${cache}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
                isApiEvent: true,
                apiMetricType: 'cache' as const
            }));

            return {
                data: sortedData,
                eventKeys: [...statusEventKeys, ...cacheEventKeys]
            };
        }

        // Regular event processing (non-API events)
        const timeMap = new Map<string, any>();
        const eventIds = new Set<string>();

        (graphResponse.data || []).forEach((record: any) => {
            const recordDate = new Date(record.timestamp);
            const dateKey = isHourly
                ? recordDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    hour12: true
                })
                : recordDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

            const eventId = String(record.eventId);
            eventIds.add(eventId);

            if (!timeMap.has(dateKey)) {
                timeMap.set(dateKey, {
                    date: dateKey,
                    timestamp: record.timestamp,
                    // Overall totals
                    count: 0,
                    successCount: 0,
                    failCount: 0,
                    avgDelay: 0, // For avg events
                    // Per-event data will be added dynamically
                });
            }

            const existing = timeMap.get(dateKey)!;
            const eventConfig = eventConfigMap.get(eventId);
            const isAvgEvent = eventConfig?.isAvgEvent === 1;

            // Add overall totals
            existing.count += record.count || 0;
            existing.successCount += record.successCount || 0;
            existing.failCount += record.failCount || 0;

            // Add per-event data keyed by safe event name
            const eventName = eventNameMap.get(eventId) || `Event ${eventId}`;
            const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');

            if (!existing[`${eventKey}_count`]) {
                existing[`${eventKey}_count`] = 0;
                existing[`${eventKey}_success`] = 0;
                existing[`${eventKey}_fail`] = 0;
                existing[`${eventKey}_avgDelay`] = 0;
                existing[`${eventKey}_delayCount`] = 0; // For calculating average
            }
            existing[`${eventKey}_count`] += record.count || 0;
            existing[`${eventKey}_success`] += record.successCount || 0;
            existing[`${eventKey}_fail`] += record.failCount || 0;

            // Also aggregate by raw numeric eventId for special graphs (percentage/funnel)
            if (!existing[`${eventId}_count`]) {
                existing[`${eventId}_count`] = 0;
                existing[`${eventId}_success`] = 0;
                existing[`${eventId}_fail`] = 0;
            }
            existing[`${eventId}_count`] += record.count || 0;
            existing[`${eventId}_success`] += record.successCount || 0;
            existing[`${eventId}_fail`] += record.failCount || 0;

            // CAPTURE STATUS CODE & CACHE STATUS BREAKDOWNS (if available)
            // This enables "Percentage Graph" to filter by status/cache even for specific Events
            if (record.status) {
                const status = String(record.status);
                const statusKey = `${eventKey}_status_${status}`;
                if (!existing[`${statusKey}_count`]) {
                    existing[`${statusKey}_count`] = 0;
                    existing[`${statusKey}_success`] = 0;
                }
                existing[`${statusKey}_count`] += record.count || 0;
                existing[`${statusKey}_success`] += record.successCount || 0;
            }

            if (record.cacheStatus) {
                const cache = String(record.cacheStatus);
                const cacheKey = `${eventKey}_cache_${cache}`;
                if (!existing[`${cacheKey}_count`]) {
                    existing[`${cacheKey}_count`] = 0;
                    existing[`${cacheKey}_success`] = 0;
                }
                existing[`${cacheKey}_count`] += record.count || 0;
                existing[`${cacheKey}_success`] += record.successCount || 0;
            }

            // For avg events, accumulate delay values (will average later)
            if (isAvgEvent && record.avgDelay) {
                existing[`${eventKey}_avgDelay`] += record.avgDelay;
                existing[`${eventKey}_delayCount`] += 1;
            }
        });

        // Second pass: calculate averages for avg events
        timeMap.forEach((entry) => {
            eventIds.forEach(eventId => {
                const eventName = eventNameMap.get(eventId) || `Event ${eventId}`;
                const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');
                const delayCount = entry[`${eventKey}_delayCount`] || 0;
                if (delayCount > 0) {
                    entry[`${eventKey}_avgDelay`] = entry[`${eventKey}_avgDelay`] / delayCount;
                }
            });
        });

        // Sort by timestamp
        const sortedData = Array.from(timeMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Build event keys metadata with isErrorEvent and isAvgEvent
        const eventKeysInData = Array.from(eventIds).map(id => {
            const name = eventNameMap.get(id) || `Event ${id}`;
            const config = eventConfigMap.get(id);
            return {
                eventId: id,
                eventName: name,
                eventKey: name.replace(/[^a-zA-Z0-9]/g, '_'),
                isErrorEvent: config?.isErrorEvent || 0,
                isAvgEvent: config?.isAvgEvent || 0
            };
        });

        return {
            data: sortedData,
            eventKeys: eventKeysInData
        };
    }, []);

    // Re-process graph data when sourceStr filter changes (client-side filter, no API call)
    useEffect(() => {
        if (rawGraphResponse && events.length > 0) {
            // First filter the raw data by selected sourceStrs
            const filteredResponse = filterBySourceStr(rawGraphResponse, selectedSourceStrs);
            // Check if main panel is API event panel
            const mainPanelConfig = profile?.panels?.[0]?.filterConfig as any;
            const isApiEvent = mainPanelConfig?.isApiEvent || false;
            // Then process the filtered data
            // Then process the filtered data
            const processedResult = processGraphData(filteredResponse, dateRange.from, dateRange.to, events, isApiEvent, mainPanelConfig?.graphType);
            setGraphData(processedResult.data);
            setEventKeys(processedResult.eventKeys || []);
        }
    }, [selectedSourceStrs, rawGraphResponse, dateRange, events, processGraphData, filterBySourceStr, profile]);

    // Auto-select first event when eventKeys change (default to showing only first event)
    // For API events, prioritize status 200 if available
    useEffect(() => {
        if (eventKeys.length > 0 && !selectedEventKey) {
            let keyToSelect = eventKeys[0].eventKey;

            // For API events, try to find status 200
            if (isMainPanelApi) {
                const status200 = eventKeys.find(ek => {
                    const eventName = ek.eventName || '';
                    return eventName.includes('200') || eventName === '200';
                });
                if (status200) {
                    keyToSelect = status200.eventKey;
                }
            }

            setSelectedEventKey(keyToSelect);
        }
    }, [eventKeys, isMainPanelApi]); // Remove selectedEventKey from deps to ensure it always checks

    // Auto-select first event for each panel when their eventKeys change
    useEffect(() => {
        panelsDataMap.forEach((panelData, panelId) => {
            if (panelData.eventKeys && panelData.eventKeys.length > 0 && !panelSelectedEventKey[panelId]) {
                setPanelSelectedEventKey(prev => ({
                    ...prev,
                    [panelId]: panelData.eventKeys![0].eventKey
                }));
            }
        });
    }, [panelsDataMap]); // Remove panelSelectedEventKey from deps to ensure it always checks

    // Auto-select first event for API Performance Metrics
    useEffect(() => {
        if (!isMainPanelApi) return;
        if (apiEndpointEventKeyInfos.length === 0) return;
        const keyToSelect = apiEndpointEventKeyInfos[0].eventKey;
        if (!apiSelectedEventKey || !apiEndpointEventKeyInfos.find((ek: EventKeyInfo) => ek.eventKey === apiSelectedEventKey)) {
            setApiSelectedEventKey(keyToSelect);
        }
    }, [apiEndpointEventKeyInfos, apiSelectedEventKey, isMainPanelApi]);

    // Auto-select first event for 8-Day Overlay
    useEffect(() => {
        if (eventKeys.length > 0) {
            if (!overlaySelectedEventKey || !eventKeys.find(ek => ek.eventKey === overlaySelectedEventKey)) {
                setOverlaySelectedEventKey(eventKeys[0].eventKey);
            }
        }
    }, [eventKeys]);

    // Auto-select first event for Error Event Tracking
    useEffect(() => {
        if (eventKeys.length > 0) {
            if (!errorSelectedEventKey || !eventKeys.find(ek => ek.eventKey === errorSelectedEventKey)) {
                setErrorSelectedEventKey(eventKeys[0].eventKey);
            }
        }
    }, [eventKeys]);


    // Function to refresh a single panel's data
    const refreshPanelData = useCallback(async (panelId: string) => {
        if (!profile || events.length === 0) return;

        const panel = profile.panels.find(p => p.panelId === panelId);
        if (!panel) return;

        setPanelLoading(prev => ({ ...prev, [panelId]: true }));

        try {
            const panelConfig = (panel as any).filterConfig;
            const userPanelFilters = panelFiltersState[panelId];
            const existingPanelData = panelsDataMap.get(panelId);



            // FIXED: Use currentPanelFilters logic - match what the UI shows
            // Priority: 1) User edited filters (panelFiltersState), 2) Last successful call (panelData.filters), 3) Panel config defaults
            const currentPanelFilters = userPanelFilters || existingPanelData?.filters || {
                events: panelConfig?.events || [],
                platforms: panelConfig?.platforms || [],
                pos: panelConfig?.pos || [],
                sources: panelConfig?.sources || []
            };

            // For special graphs (percentage/funnel), extract ALL required event IDs
            let eventIdsToFetch = currentPanelFilters.events;
            if (panelConfig?.graphType === 'percentage' && panelConfig?.percentageConfig) {
                const { parentEvents = [], childEvents = [] } = panelConfig.percentageConfig;
                // Use activePercentageEvents/activePercentageChildEvents if available from filters
                const activeParents = userPanelFilters?.activePercentageEvents || parentEvents;
                const activeChildren = userPanelFilters?.activePercentageChildEvents || childEvents;
                eventIdsToFetch = [...new Set([...activeParents.map((id: string) => parseInt(id)), ...activeChildren.map((id: string) => parseInt(id))])];

            } else if (panelConfig?.graphType === 'funnel' && panelConfig?.funnelConfig) {
                const { stages = [], multipleChildEvents = [] } = panelConfig.funnelConfig;
                // Use activeStages/activeFunnelChildEvents if available from filters
                const activeStageIds = userPanelFilters?.activeStages || stages.map((s: any) => s.eventId);
                const activeChildIds = userPanelFilters?.activeFunnelChildEvents || multipleChildEvents;
                const stageEventIds = activeStageIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
                const childEventIds = activeChildIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
                eventIdsToFetch = [...new Set([...stageEventIds, ...childEventIds])];

            }

            // Now use currentPanelFilters - empty arrays mean "all" (sent to API as [])
            // For special graphs, prefer user edited filters over config
            const panelFilters: FilterState = {
                events: eventIdsToFetch,
                platforms: currentPanelFilters.platforms || [],
                pos: currentPanelFilters.pos || [],
                sources: currentPanelFilters.sources || []
            };
            const panelDateRange = panelDateRanges[panelId] || dateRange;

            // Get current sourceStr filter for this panel (client-side filter)
            const currentSourceStrFilter = profile.panels[0]?.panelId === panelId
                ? selectedSourceStrs
                : (panelSelectedSourceStrs[panelId] || []);

            // console.log(`🔄 PANEL REFRESH - Panel ID: ${panelId}`);
            // console.log(`📊 Panel filters being applied:`, panelFilters);
            // console.log(`🌐 Global filters state:`, filters);
            // console.log(`📅 Panel date range:`, panelDateRange);
            // console.log(`🔖 SourceStr filter:`, currentSourceStrFilter);

            // Check if panel has API events
            // IMPORTANT: use panelConfig.isApiEvent (authoritative) instead of panel.events, which may not carry isApiEvent flags.
            const hasApiEvents = panelConfig?.isApiEvent === true;

            // Check if this is a special graph (percentage or funnel)
            const isSpecialGraph = panelConfig?.graphType === 'percentage' || panelConfig?.graphType === 'funnel';

            // For API events, send empty arrays for platform/pos/source (API groups by status/cacheStatus)
            const graphResponse = await apiService.getGraphData(
                panelFilters.events, // Only eventIds are used for API events
                hasApiEvents ? [] : panelFilters.platforms, // Empty for API events
                hasApiEvents ? [] : panelFilters.pos, // Empty for API events
                hasApiEvents ? [] : panelFilters.sources, // Empty for API events
                panelDateRange.from,
                panelDateRange.to,
                hasApiEvents // Pass isApiEvent flag -> sets isApi: true in request body
            );

            // Pie chart is optional - don't fail the whole refresh if it fails
            // For API panels, we DO want status/cache pies even in special graphs.
            let pieResponse = null;
            if (hasApiEvents || !isSpecialGraph) {
                try {
                    pieResponse = await apiService.getPieChartData(
                        panelFilters.events,
                        hasApiEvents ? [] : panelFilters.platforms, // Empty for API events
                        hasApiEvents ? [] : panelFilters.pos, // Empty for API events
                        hasApiEvents ? [] : panelFilters.sources, // Empty for API events
                        panelDateRange.from,
                        panelDateRange.to,
                        hasApiEvents // Pass isApiEvent flag for pieChartApi endpoint
                    );
                } catch (pieErr) {
                    console.warn(`⚠️ Pie chart data failed for panel ${panelId}, continuing without it:`, pieErr);
                }
            }

            // Extract available sourceStrs from the raw response
            const sourceStrsInData = extractSourceStrs(graphResponse);

            // Apply sourceStr filter (client-side) then process
            const filteredResponse = filterBySourceStr(graphResponse, currentSourceStrFilter);
            const isApiEventPanel = panelConfig?.isApiEvent || false;
            const processedResult = processGraphData(filteredResponse, panelDateRange.from, panelDateRange.to, events, isApiEventPanel, panelConfig?.graphType);



            // Update panelsDataMap for this panel
            setPanelsDataMap(prev => {
                const newMap = new Map(prev);
                newMap.set(panelId, {
                    graphData: processedResult.data,
                    eventKeys: processedResult.eventKeys,
                    pieChartData: pieResponse,
                    loading: false,
                    error: null,
                    filters: panelFilters,
                    dateRange: panelDateRange,
                    showLegend: false,
                    rawGraphResponse: graphResponse // Store for re-processing with sourceStr filter
                });
                return newMap;
            });

            // Update available sourceStrs for this panel
            if (profile.panels[0]?.panelId === panelId) {
                setAvailableSourceStrs(sourceStrsInData);
            } else {
                setPanelAvailableSourceStrs(prev => ({
                    ...prev,
                    [panelId]: sourceStrsInData
                }));
            }

            // CRITICAL: If this is the first/main panel, also update the legacy state variables
            // The main panel UI uses these directly, not panelsDataMap
            if (profile.panels[0]?.panelId === panelId) {

                setGraphData(processedResult.data);
                setEventKeys(processedResult.eventKeys || []);
                setPieChartData(pieResponse);
                setRawGraphResponse(graphResponse); // Store for re-processing
                setLastUpdated(new Date());

            }
        } catch (err) {
            console.error(`Failed to refresh panel ${panelId}:`, err);
            setPanelsDataMap(prev => {
                const newMap = new Map(prev);
                const existing = prev.get(panelId);
                if (existing) {
                    newMap.set(panelId, {
                        ...existing,
                        loading: false,
                        error: `Failed to refresh: ${err instanceof Error ? err.message : 'Unknown error'}`
                    });
                }
                return newMap;
            });
        } finally {
            setPanelLoading(prev => ({ ...prev, [panelId]: false }));
        }
    }, [profile, events, filters, panelFiltersState, panelDateRanges, dateRange, processGraphData, panelsDataMap, selectedSourceStrs, panelSelectedSourceStrs, extractSourceStrs, filterBySourceStr]);

    // Auto-load all panel data when profile and events are ready
    useEffect(() => {
        if (!profile || events.length === 0) return;

        // DISABLE AUTO-LOADING - only load on manual refresh
        // console.log('🚀 Auto-loading all panels...');
        
        // Check if we already have data for all panels

        // Load data for all panels
        // profile.panels.forEach(panel => {
        //     refreshPanelData(panel.panelId);
        // });

        // initialLoadComplete.current = true;
    }, [profile, events, refreshPanelData, panelsDataMap]);

    // Load critical alerts - uses alert-specific filters (independent)
    const loadAlerts = useCallback(async (expanded: boolean = false) => {
        if (!profile || events.length === 0) return;

// ...
        setAlertsLoading(true);
        try {
            // Check if profile has Critical Alerts config with specific event selection
            const profileEventFilter = profile.criticalAlerts?.filterByEvents?.map(id => parseInt(id)) || [];

            // Priority: profile-level event filter > runtime alert filters > all events
            const eventIds = profileEventFilter.length > 0
                ? profileEventFilter
                : alertFilters.events.length > 0
                    ? alertFilters.events
                    : events.map(e => parseInt(e.eventId));

            const limit = expanded ? 20 : 10;
            const alerts = await apiService.getCriticalAlerts(
                eventIds,
                alertFilters.platforms.length > 0 ? alertFilters.platforms : [],
                alertFilters.pos.length > 0 ? alertFilters.pos : [],
                alertFilters.sources.length > 0 ? alertFilters.sources : [],
                alertDateRange.from,
                alertDateRange.to,
                limit,
                alertsPage,
                alertIsApi // Pass isApi parameter
            );
            setCriticalAlerts(alerts);
            onAlertsUpdate?.(alerts); // Send alerts to parent
        } catch (err) {
            console.error('Failed to load critical alerts:', err);
            setCriticalAlerts([]);
            onAlertsUpdate?.([]); // Send empty array on error
        } finally {
            setAlertsLoading(false);
        }
    }, [profile, events, alertFilters, alertDateRange, alertsPage]);

    // Load chart data for all panels (in parallel for snappy first paint)
    const loadData = useCallback(async () => {
        if (!profile || events.length === 0) return;

        setDataLoading(true);
        setError(null);

        try {
            // Prepare fetch promises for each panel
            const panelPromises = profile.panels.map(async (panel) => {
                const panelConfig = (panel as any).filterConfig;
                const userPanelFilters = panelFiltersState[panel.panelId];
                const panelDateRange = panelDateRanges[panel.panelId] || dateRange;

                // Each panel uses its own filter state if available
                const panelFilters: FilterState = {
                    events: userPanelFilters?.events?.length > 0
                        ? userPanelFilters.events
                        : (panelConfig?.events || []),
                    platforms: userPanelFilters?.platforms?.length > 0
                        ? userPanelFilters.platforms
                        : (panelConfig?.platforms || []),
                    pos: userPanelFilters?.pos?.length > 0
                        ? userPanelFilters.pos
                        : (panelConfig?.pos || []),
                    sources: userPanelFilters?.sources?.length > 0
                        ? userPanelFilters.sources
                        : (panelConfig?.sources || [])
                };



                // Check if panel has API events
                // IMPORTANT: use panelConfig.isApiEvent (authoritative) instead of panel.events, which may not carry isApiEvent flags.
                const hasApiEvents = panelConfig?.isApiEvent === true;

                try {
                    // For API events, send empty arrays for platform/pos/source
                    const graphResponse = await apiService.getGraphData(
                        panelFilters.events, // Only eventIds matter for API events
                        hasApiEvents ? [] : panelFilters.platforms, // Empty for API events
                        hasApiEvents ? [] : panelFilters.pos, // Empty for API events
                        hasApiEvents ? [] : panelFilters.sources, // Empty for API events
                        panelDateRange.from,
                        panelDateRange.to,
                        hasApiEvents // Pass isApiEvent flag -> sets isApi: true
                    );

                    // Pie chart is optional - don't fail the whole refresh if it fails
                    let pieResponse = null;
                    try {
                        pieResponse = await apiService.getPieChartData(
                            panelFilters.events,
                            hasApiEvents ? [] : panelFilters.platforms, // Empty for API events
                            hasApiEvents ? [] : panelFilters.pos, // Empty for API events
                            hasApiEvents ? [] : panelFilters.sources, // Empty for API events
                            panelDateRange.from,
                            panelDateRange.to,
                            hasApiEvents // Pass isApiEvent flag for pieChartApi endpoint
                        );
                    } catch (pieErr) {
                        console.warn(`⚠️ Pie chart data failed for panel ${panel.panelId}, continuing without it:`, pieErr);
                    }

                    // Extract available sourceStrs from raw response
                    const graphSourceStrs = extractSourceStrs(graphResponse);
                    // Check if this panel is configured for API events
                    // Check if this panel is configured for API events
                    const isApiEventPanel = panelConfig?.isApiEvent || false;
                    const processedResult = processGraphData(graphResponse, panelDateRange.from, panelDateRange.to, events, isApiEventPanel, panelConfig?.graphType);

                    return {
                        panelId: panel.panelId,
                        data: {
                            graphData: processedResult.data,
                            eventKeys: processedResult.eventKeys,
                            pieChartData: pieResponse,
                            loading: false,
                            error: null as string | null,
                            filters: panelFilters,
                            dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                            showLegend: false,
                            rawGraphResponse: graphResponse,
                        },
                        sourceStrsInData: graphSourceStrs,
                    };
                } catch (panelErr) {
                    console.error(`Failed to load data for panel ${panel.panelId}:`, panelErr);
                    return {
                        panelId: panel.panelId,
                        data: {
                            graphData: [],
                            eventKeys: [],
                            pieChartData: null,
                            loading: false,
                            error: `Failed to load: ${panelErr instanceof Error ? panelErr.message : 'Unknown error'}`,
                            filters: panelFilters,
                            dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                            showLegend: false,
                        },
                        sourceStrsInData: [] as string[],
                    };
                }
            });

            const panelResults = await Promise.all(panelPromises);

            // Build new panels data map in one go
            const newPanelsData = new Map<string, PanelData>();
            panelResults.forEach(({ panelId, data, sourceStrsInData }) => {
                newPanelsData.set(panelId, data);

                // Update available sourceStrs per panel
                const isMainPanel = profile.panels[0]?.panelId === panelId;
                
                // Auto-extract status codes and cache statuses from raw data for API panels
                const panel = profile.panels.find(p => p.panelId === panelId);
                const panelConfig = (panel as any)?.filterConfig;
                const isApiPanel = panelConfig?.isApiEvent || false;
                
                if (isApiPanel && data.rawGraphResponse?.data) {
                    const statusCodes = new Set<string>();
                    const cacheStatuses = new Set<string>();
                    
                    data.rawGraphResponse.data.forEach((record: any) => {
                        // Direct field extraction (API response format)
                        if (record.status !== undefined && record.status !== null) {
                            statusCodes.add(String(record.status));
                        }
                        if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                            cacheStatuses.add(record.cacheStatus);
                        }
                        
                        // Also check key patterns for processed data format
                        Object.keys(record).forEach(key => {
                            const statusMatch = key.match(/_status_(\d+)_/);
                            const cacheMatch = key.match(/_cache_([^_]+)_/);
                            if (statusMatch) statusCodes.add(statusMatch[1]);
                            if (cacheMatch) cacheStatuses.add(cacheMatch[1]);
                        });
                    });
                    
                    const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                    const sortedCacheStatuses = Array.from(cacheStatuses).sort();
                    
                    if (isMainPanel) {
                        setAvailableStatusCodes(sortedStatusCodes);
                        setAvailableCacheStatuses(sortedCacheStatuses);
                        // Auto-initialize filters with defaults if not already set
                        const currentFilters = panelFiltersState[panelId];
                        if (!currentFilters?.percentageStatusCodes || currentFilters.percentageStatusCodes.length === 0) {
                            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                            const defaultCache = sortedCacheStatuses;
                            setPanelFiltersState(prev => ({
                                ...prev,
                                [panelId]: {
                                    ...prev[panelId],
                                    percentageStatusCodes: defaultStatus,
                                    percentageCacheStatus: defaultCache
                                }
                            }));
                        }
                    } else {
                        setPanelAvailableStatusCodes(prev => ({ ...prev, [panelId]: sortedStatusCodes }));
                        setPanelAvailableCacheStatuses(prev => ({ ...prev, [panelId]: sortedCacheStatuses }));
                        // Auto-initialize filters with defaults if not already set
                        const currentFilters = panelFiltersState[panelId];
                        if (!currentFilters?.percentageStatusCodes || currentFilters.percentageStatusCodes.length === 0) {
                            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                            const defaultCache = sortedCacheStatuses;
                            setPanelFiltersState(prev => ({
                                ...prev,
                                [panelId]: {
                                    ...prev[panelId],
                                    percentageStatusCodes: defaultStatus,
                                    percentageCacheStatus: defaultCache
                                }
                            }));
                        }
                    }
                }
                
                if (isMainPanel) {
                    setAvailableSourceStrs(sourceStrsInData);
                    if (data.rawGraphResponse) {
                        setRawGraphResponse(data.rawGraphResponse as any);
                    }
                } else {
                    setPanelAvailableSourceStrs(prev => ({
                        ...prev,
                        [panelId]: sourceStrsInData,
                    }));
                    setPanelRawGraphResponses(prev => ({
                        ...prev,
                        [panelId]: data.rawGraphResponse as any,
                    }));
                }
            });

            setPanelsDataMap(newPanelsData);

            // Also set the first panel's data to the main state for backward compatibility
            const firstPanelId = profile.panels[0]?.panelId;
            const firstPanelData = firstPanelId ? newPanelsData.get(firstPanelId) : undefined;
            if (firstPanelData) {
                setGraphData(firstPanelData.graphData);
                setEventKeys(firstPanelData.eventKeys || []);
                setPieChartData(firstPanelData.pieChartData);
            }

            setLastUpdated(new Date());

        } catch (err) {
            console.error('Failed to load analytics data:', err);
            setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setDataLoading(false);
        }
    }, [profile, panelFiltersState, panelDateRanges, dateRange, events, processGraphData, extractSourceStrs]);

    useEffect(() => {
        // Auto-load data on initial mount AND when switching profiles
        // User wants to see fresh data immediately without clicking Apply Changes
        // CHANGED: Removed strict initialLoadComplete check to ensure data loads even if flag was set but data is missing
        if (!loading && profile && events.length > 0) {
            // IMPORTANT: Do NOT auto-fetch again on filter changes.
            // Auto-load exactly once per profileId (until user switches profiles).
            if (lastAutoLoadedProfileId.current === profileId) return;
            // Force load if we have a profile but no data/alerts yet, or just generally on profile change
            loadData();
            loadAlerts(); 
            setPendingRefresh(false);
            setPanelFilterChanges({});
            initialLoadComplete.current = true;
            lastAutoLoadedProfileId.current = profileId;

            toast({
                title: `📊 ${profile.profileName}`,
                description: `Loaded ${profile.panels.length} panel${profile.panels.length !== 1 ? 's' : ''} with latest data`,
                duration: 2000,
            });
        }
    }, [loading, profileId, profile, events.length, graphData.length, toast]);

    // Set pending refresh when filters or date range change (only after initial load)
    useEffect(() => {
        if (!loading && profile && events.length > 0 && graphData.length > 0 && initialLoadComplete.current) {
            // Mark that filters have changed and need to be applied
            setPendingRefresh(true);
            // Mark all panels as having filter changes
            if (profile?.panels) {
                const changes: Record<string, boolean> = {};
                profile.panels.forEach(panel => {
                    changes[panel.panelId] = true;
                });
                setPanelFilterChanges(changes);
            }
        }
    }, [filters, dateRange]);

    // Removed auto-fetch on filter changes - data loads automatically when switching profiles
    // User must click Apply Changes to update data after changing filters

    // Auto-refresh main panel (user-configurable, 0 = disabled by default)
    useEffect(() => {
        if (autoRefreshMinutes <= 0 || !profile || profile.panels.length === 0) return;
        const interval = setInterval(() => {
            refreshPanelData(profile.panels[0].panelId);
        }, autoRefreshMinutes * 60 * 1000);
        return () => clearInterval(interval);
    }, [autoRefreshMinutes, profile, refreshPanelData]);

    // Manual refresh trigger for main panel only (first panel)
    const handleApplyFilters = useCallback(() => {
        setPendingRefresh(false);
        if (profile && profile.panels.length > 0) {
            // Only refresh the first/main panel
            refreshPanelData(profile.panels[0].panelId);
            // Clear the filter change state for the main panel
            setPanelFilterChanges(prev => ({
                ...prev,
                [profile.panels[0].panelId]: false
            }));
        }
    }, [profile, refreshPanelData]);

    // Individual panel refresh function
    const handlePanelRefresh = useCallback((panelId: string) => {
        refreshPanelData(panelId);
        // Clear the filter change state for this specific panel
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: false
        }));
    }, [refreshPanelData]);

    // Fetch API filters for individual panels
    const fetchPanelApiFilters = useCallback(async (panelId: string) => {
        if (!profile || !events || events.length === 0) return;
        
        const panel = profile.panels.find(p => p.panelId === panelId);
        if (!panel) return;
        
        const panelConfig = (panel as any).filterConfig;
        if (!panelConfig?.isApiEvent) return;
        
        const currentFilters = panelFiltersState[panelId] || filters;
        
        // Need at least one event selected
        if (currentFilters.events.length === 0) {
            toast({
                title: "No events selected",
                description: "Please select at least one event to fetch API filters",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        
        setPanelLoadingApiFilters(prev => ({ ...prev, [panelId]: true }));
        try {
            // IMPORTANT: No API call here. Derive options from already fetched panel rawGraphResponse.
            const rawData: any[] = (panelsDataMap.get(panelId)?.rawGraphResponse?.data || []) as any[];
            if (rawData.length > 0) {
                const statusCodes = new Set<string>();
                const cacheStatuses = new Set<string>();

                rawData.forEach((record: any) => {
                    if (record?.status !== undefined && record?.status !== null) {
                        statusCodes.add(String(record.status));
                    }
                    if (record?.cacheStatus && typeof record.cacheStatus === 'string') {
                        cacheStatuses.add(record.cacheStatus);
                    }
                });

                const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                const sortedCacheStatuses = Array.from(cacheStatuses).sort();

                setPanelAvailableStatusCodes(prev => ({ ...prev, [panelId]: sortedStatusCodes }));
                setPanelAvailableCacheStatuses(prev => ({ ...prev, [panelId]: sortedCacheStatuses }));

                // Auto-initialize filters with defaults
                const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                const defaultCache = sortedCacheStatuses;

                setPanelFiltersState(prev => ({
                    ...prev,
                    [panelId]: {
                        ...prev[panelId],
                        percentageStatusCodes: defaultStatus,
                        percentageCacheStatus: defaultCache
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to fetch panel API filters:', error);
            toast({
                title: "Failed to fetch API filters",
                description: "Please try again",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setPanelLoadingApiFilters(prev => ({ ...prev, [panelId]: false }));
        }
    }, [profile, events.length, panelsDataMap, panelFiltersState, filters, toast]);

    // Fetch API filters (status codes, cache statuses, job IDs) for main panel
    // IMPORTANT: No API call here. We derive filter options from already-fetched rawGraphResponse.
    const fetchApiFilters = useCallback(async () => {
        if (!profile || !isMainPanelApi || !events || events.length === 0) return;

        const mainPanel = profile.panels[0];
        if (!mainPanel) return;

        const mainPanelId = mainPanel.panelId;
        const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];
        if (!rawData || rawData.length === 0) return;

        setLoadingApiFilters(true);
        try {
            const jobIds = new Set<string>();
            const statusCodes = new Set<string>();
            const cacheStatuses = new Set<string>();

            rawData.forEach((record: any) => {
                if (record?.sourceStr && typeof record.sourceStr === 'string' && record.sourceStr.trim() !== '') {
                    jobIds.add(record.sourceStr);
                }
                if (record?.status !== undefined && record?.status !== null) {
                    statusCodes.add(String(record.status));
                }
                if (record?.cacheStatus && typeof record.cacheStatus === 'string') {
                    cacheStatuses.add(record.cacheStatus);
                }
            });

            const sortedJobIds = Array.from(jobIds).sort();
            const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const sortedCacheStatuses = Array.from(cacheStatuses).sort();

            setAvailableSourceStrs(sortedJobIds);
            setAvailableStatusCodes(sortedStatusCodes);
            setAvailableCacheStatuses(sortedCacheStatuses);

            // Auto-initialize filters with defaults
            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
            const defaultCache = sortedCacheStatuses;

            setPanelFiltersState(prev => ({
                ...prev,
                [mainPanelId]: {
                    ...prev[mainPanelId],
                    percentageStatusCodes: defaultStatus,
                    percentageCacheStatus: defaultCache
                }
            }));
        } finally {
            setLoadingApiFilters(false);
        }
    }, [profile, isMainPanelApi, events.length, panelsDataMap, rawGraphResponse]);

    const handleFilterChange = (type: keyof FilterState, values: string[]) => {
        // console.log('handleFilterChange called:', { type, values });
        
        // Determine value type based on filter key
        // activeStages, activePercentageEvents, activeFunnelChildEvents use string IDs
        // platform, pos, source, events use numeric IDs
        const isStringFilter = ['activeStages', 'activePercentageEvents', 'activePercentageChildEvents', 'activeFunnelChildEvents', 'percentageStatusCodes', 'percentageCacheStatus'].includes(type as string);
        
        const finalValues = isStringFilter
            ? values
            : values.map(v => parseInt(v)).filter(id => !isNaN(id));

        // console.log('Final values after processing:', finalValues);

        // Update the main panel's filter state (first panel) - SCOPED TO MAIN PANEL ONLY
        if (profile?.panels && profile.panels.length > 0) {
            const mainPanelId = profile.panels[0].panelId;

            // console.log('Updating panel filters for:', mainPanelId);

            // Update panel-specific filters for the main panel ONLY
            setPanelFiltersState(prev => {
                const updated = {
                    ...prev,
                    [mainPanelId]: {
                        ...prev[mainPanelId],
                        [type]: finalValues
                    }
                };
                // console.log('Updated panel filters state:', updated);
                return updated;
            });

            // Mark that ONLY this specific panel's filters have changed
            setPanelFilterChanges(prev => ({
                ...prev,
                [mainPanelId]: true
            }));
            
            // Do NOT trigger global refresh - only main panel refresh will be triggered by useEffect
        }

        // Also update global state for backward compatibility (but this won't be used)
        // Only if numeric, as FilterState expects number[] for legacy keys
        if (!isStringFilter) {
            setFilters(prev => ({ ...prev, [type]: finalValues as number[] }));
        }
        setPendingRefresh(true);
    };

    if (loading) return null;
    if (!profile) return <div className="p-8 text-center text-destructive">Profile not found</div>;

    // Calculate totals
    const totalCount = graphData.reduce((sum, d) => sum + (d.count || 0), 0);
    const totalSuccess = graphData.reduce((sum, d) => sum + (d.successCount || 0), 0);
    const totalFail = graphData.reduce((sum, d) => sum + (d.failCount || 0), 0);

    // Dropdown options with indicators for error/avg events
    // For API events, show only API events (isApiEvent === true)
    // For regular events, show only non-API events (isApiEvent !== true)
    const eventOptions = events
        .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
        .sort((a, b) => {
            // For API events, prioritize status 200
            if (isMainPanelApi) {
                const aLabel = a.host && a.url ? `${a.host} - ${a.url}` : a.eventName;
                const bLabel = b.host && b.url ? `${b.host} - ${b.url}` : b.eventName;

                // Check if event name contains "200"
                const aIs200 = aLabel.includes('200') || a.eventName.includes('200');
                const bIs200 = bLabel.includes('200') || b.eventName.includes('200');

                if (aIs200 && !bIs200) return -1;
                if (!aIs200 && bIs200) return 1;

                // Then sort by status code if both are status events
                const aStatus = parseInt(a.eventName) || 999;
                const bStatus = parseInt(b.eventName) || 999;
                return aStatus - bStatus;
            }
            return 0; // Keep original order for non-API events
        })
        .map(e => {
            let label = e.isApiEvent && e.host && e.url
                ? `${e.host} - ${e.url}`  // API events show host/url
                : e.eventName;             // Regular events show eventName
            const tags: string[] = [];
            if (e.isErrorEvent === 1) tags.push('[isError]');
            if (e.isAvgEvent === 1) tags.push('[isAvg]');
            if (tags.length > 0) {
                label = `${e.eventName} ${tags.join(' ')}`;
            }
            return {
                value: e.eventId,
                label,
                isErrorEvent: e.isErrorEvent === 1,
                isAvgEvent: e.isAvgEvent === 1
            };
        });
    const platformOptions = PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name }));
    const posOptions = siteDetails.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.id})` }));
    const sourceOptions = SOURCES.map(s => ({ value: s.id.toString(), label: s.name }));

    // Get selected events for display (as array for badges)
    // Empty array means "All" events
    const selectedEventsList = filters.events.length === 0
        ? ['All Events']
        : filters.events.map(id =>
            events.find(e => parseInt(e.eventId) === id)?.eventName || `Event ${id}`
        );

    // Calculate panel stats for sidebar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _panelStats = profile.panels.reduce((acc, panel) => {
        const data = panelsDataMap.get(panel.panelId);
        if (data?.graphData) {
            acc[panel.panelId] = {
                total: data.graphData.reduce((sum, d) => sum + (d.count || 0), 0),
                success: data.graphData.reduce((sum, d) => sum + (d.successCount || 0), 0)
            };
        }
        return acc;
    }, {} as Record<string, { total: number; success: number; }>);

    // Detect event types for dual Y-axis rendering
    const hasAvgEvents = eventKeys.some(ek => ek.isAvgEvent === 1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasErrorEvents = eventKeys.some(ek => ek.isErrorEvent === 1 && ek.isAvgEvent !== 1);
    const hasNormalEvents = eventKeys.some(ek => ek.isAvgEvent !== 1 && ek.isErrorEvent !== 1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasMixedEventTypes = hasAvgEvents && hasNormalEvents;

    // Separate event keys by type
    // Events with BOTH isAvg and isError go to isAvg (time delay charts)
    const avgEventKeys = eventKeys.filter(ek => ek.isAvgEvent === 1);
    const errorEventKeys = eventKeys.filter(ek => ek.isErrorEvent === 1 && ek.isAvgEvent !== 1);
    const normalEventKeys = eventKeys.filter(ek => ek.isAvgEvent !== 1 && ek.isErrorEvent !== 1);

    // Check if first panel is a special graph (percentage or funnel)
    const firstPanel = profile?.panels?.[0];
    const firstPanelFilterConfig = (firstPanel as any)?.filterConfig;
    const isFirstPanelSpecialGraph = firstPanelFilterConfig?.graphType === 'percentage' || firstPanelFilterConfig?.graphType === 'funnel';

    // Format delay value based on event feature (prepared for future use)
    // Price Alert (feature 1) = value is already in MINUTES
    // Spend/Auto-coupon (others) = value is already in SECONDS
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _formatDelayValue = (value: number, _eventKey?: EventKeyInfo) => {
        if (!value || value <= 0) return '0';
        // Find the event config to get feature
        const eventConfig = events.find(e => String(e.eventId) === _eventKey?.eventId);
        const featureId = eventConfig?.feature;
        if (featureId === 1) {
            // Value is already in minutes
            if (value >= 60) return `${(value / 60).toFixed(1)}h`;
            return `${value.toFixed(1)}m`;
        }
        // Value is already in seconds
        if (value >= 60) return `${(value / 60).toFixed(1)}m`;
        return `${value.toFixed(1)}s`;
    };

    return (
        <>

            <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ zoom: 0.8 }}
            >
                {/* ========== PREMIUM HERO HEADER ========== */}
                <HeroGradientHeader
                    title={profile.profileName}
                    subtitle={`Last updated: ${lastUpdated.toLocaleTimeString()}${dataLoading ? ' • Loading...' : ''}`}
                    icon={<LayoutDashboard className="w-7 h-7 text-white" />}
                    variant="gradient"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {onEditProfile && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onEditProfile(profile)}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Edit Profile</span>
                                    <span className="sm:hidden">Edit</span>
                                </Button>
                            )}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <span className="truncate">
                                            {`${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="range"
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range) => {
                                            if (range?.from) {
                                                const newDateRange = {
                                                    from: range.from,
                                                    to: range.to || range.from
                                                };
                                                setDateRange(newDateRange);

                                                // Update the main panel's date range
                                                if (profile?.panels && profile.panels.length > 0) {
                                                    const mainPanelId = profile.panels[0].panelId;
                                                    setPanelDateRanges(prev => ({
                                                        ...prev,
                                                        [mainPanelId]: newDateRange
                                                    }));

                                                    // Mark that this panel's filters have changed
                                                    setPanelFilterChanges(prev => ({
                                                        ...prev,
                                                        [mainPanelId]: true
                                                    }));
                                                }

                                                setPendingRefresh(true);
                                            }
                                        }}
                                        numberOfMonths={2}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button
                                variant={pendingRefresh ? "default" : "secondary"}
                                size="sm"
                                onClick={handleApplyFilters}
                                disabled={dataLoading}
                                className={cn(
                                    pendingRefresh
                                        ? "bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-lg"
                                        : "bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                )}
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", dataLoading && "animate-spin")} />
                                {pendingRefresh ? "Apply Changes" : "Refresh"}
                            </Button>
                        </div>
                    }
                />


                {/* ========== AMBIENT GRADIENT BACKGROUND ========== */}
                {/* Theme-aware background with Autosnipe Matrix-style effects */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    {isAutosnipe ? (
                        <>
                            {/* Autosnipe Matrix-style background */}
                            <div className="absolute inset-0 bg-gray-950" />
                            {/* Neon green glow top-left */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Neon green glow top-right */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-green-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar - matrix green */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-900/30 via-emerald-900/15 to-transparent" />
                            {/* Center glow */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-green-500/5 via-transparent to-transparent rounded-full blur-3xl" />
                            {/* Scanline effect */}
                            <div className="absolute inset-0 opacity-[0.02]" style={{
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)'
                            }} />
                        </>
                    ) : (
                        <>
                            {/* Default purple theme background */}
                            {/* Top-left purple orb */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 via-indigo-300/15 to-transparent rounded-full blur-3xl" />
                            {/* Top-right pink orb */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-pink-400/15 via-fuchsia-300/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-purple-100/40 via-pink-50/20 to-transparent dark:from-purple-900/20 dark:via-pink-900/10" />
                            {/* Center subtle mesh */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-200/10 via-transparent to-transparent dark:from-indigo-500/5 rounded-full blur-3xl" />
                        </>
                    )}
                </div>

                {/* ==================== CRITICAL ALERTS PANEL (Panel 0) ==================== */}
                {profile?.criticalAlerts?.enabled !== false && (
                    <CriticalAlertsPanel
                        criticalAlerts={criticalAlerts}
                        alertsLoading={alertsLoading}
                        alertsExpanded={alertsExpanded}
                        alertsPanelCollapsed={alertsPanelCollapsed}
                        alertFilters={alertFilters}
                        alertDateRange={alertDateRange}
                        alertsPage={alertsPage}
                        alertIsApi={alertIsApi}
                        events={events}
                        siteDetails={siteDetails}
                        onToggleCollapse={() => setAlertsPanelCollapsed(!alertsPanelCollapsed)}
                        onToggleExpanded={() => setAlertsExpanded(!alertsExpanded)}
                        onFilterChange={setAlertFilters}
                        onDateRangeChange={setAlertDateRange}
                        onIsApiChange={setAlertIsApi}
                        onLoadAlerts={loadAlerts}
                        onPageChange={setAlertsPage}
                    />
                )}

                {/* ========== AMBIENT GRADIENT BACKGROUND ========== */}
                {/* Theme-aware background with Autosnipe Matrix-style effects */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    {isAutosnipe ? (
                        <>
                            {/* Autosnipe Matrix-style background */}
                            <div className="absolute inset-0 bg-gray-950" />
                            {/* Neon green glow top-left */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Neon green glow top-right */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-green-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar - matrix green */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-900/30 via-emerald-900/15 to-transparent" />
                            {/* Center glow */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-green-500/5 via-transparent to-transparent rounded-full blur-3xl" />
                            {/* Scanline effect */}
                            <div className="absolute inset-0 opacity-[0.02]" style={{
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)'
                            }} />
                        </>
                    ) : (
                        <>
                            {/* Default purple theme background */}
                            {/* Top-left purple orb */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 via-indigo-300/15 to-transparent rounded-full blur-3xl" />
                            {/* Top-right pink orb */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-pink-400/15 via-fuchsia-300/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-purple-100/40 via-pink-50/20 to-transparent dark:from-purple-900/20 dark:via-pink-900/10" />
                            {/* Center subtle mesh */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-200/10 via-transparent to-transparent dark:from-indigo-500/5 rounded-full blur-3xl" />
                        </>
                    )}
                </div>

                {error && (
                    <div
                        className="p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 shadow-lg"
                    >
                        {error}
                    </div>
                )}

                {/* ==================== MAIN DASHBOARD FILTERS (Panel 1+) ==================== */}
                <Card
                    className="rounded-2xl overflow-hidden group transition-all duration-300 relative"
                >
                    {/* Purple/Pink Gradient Accent Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                    <CardHeader className="pb-3 relative cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors" onClick={() => setFiltersCollapsed(!filtersCollapsed)}>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <span
                                    className="w-2 h-2 rounded-full bg-primary"
                                />
                                <span className="font-bold text-lg">Filters</span>
                                {/* API Event Badge */}
                                {isMainPanelApi && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md animate-none">
                                        API
                                    </span>
                                )}
                                {pendingRefresh && (
                                    <span
                                        className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium"
                                    >
                                        Changed
                                    </span>
                                )}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFiltersCollapsed(!filtersCollapsed);
                                }}
                                className="h-8 w-8 p-0"
                            >
                                {filtersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    {!filtersCollapsed && (
                        <CardContent>
                            <div className={cn(
                                "grid gap-3 sm:gap-4",
                                isMainPanelApi
                                    ? "grid-cols-1"
                                    : "grid-cols-1" // Will be overridden by inner content
                            )}>
                                {(() => {
                                    const mainPanel = profile?.panels?.[0];
                                    const mainPanelId = mainPanel?.panelId;
                                    const mainPanelConfig = (mainPanel as any)?.filterConfig;
                                    const mainGraphType = mainPanelConfig?.graphType;
                                    const currentFilters = mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>;

                                    const isPercentageGraph = mainGraphType === 'percentage';
                                    const percentageConfig = mainPanelConfig?.percentageConfig;
                                    const isFunnelGraph = mainGraphType === 'funnel';
                                    const funnelConfig = mainPanelConfig?.funnelConfig;

                                    // Extract available status codes and cache statuses from raw data (for API events)
                                    let configuredStatusCodes = percentageConfig?.filters?.statusCodes || [];
                                    let configuredCacheStatus = percentageConfig?.filters?.cacheStatus || [];
                                    
                                    if (isMainPanelApi && mainPanelId) {
                                        const mainPanelData = panelsDataMap.get(mainPanelId);
                                        const rawData = mainPanelData?.rawGraphResponse?.data || rawGraphResponse?.data || [];
                                        const statusSet = new Set<string>();
                                        const cacheSet = new Set<string>();

                                        rawData.forEach((record: any) => {
                                            // Direct field extraction (API response format)
                                            if (record.status !== undefined && record.status !== null) {
                                                statusSet.add(String(record.status));
                                            }
                                            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                                cacheSet.add(record.cacheStatus);
                                            }
                                            
                                            // Also check key patterns for processed data format
                                            Object.keys(record).forEach(key => {
                                                const statusMatch = key.match(/_status_(\d+)_/);
                                                const cacheMatch = key.match(/_cache_([^_]+)_/);
                                                if (statusMatch) statusSet.add(statusMatch[1]);
                                                if (cacheMatch) cacheSet.add(cacheMatch[1]);
                                            });
                                        });

                                        if (statusSet.size > 0) {
                                            configuredStatusCodes = Array.from(statusSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                                        }
                                        if (cacheSet.size > 0) {
                                            configuredCacheStatus = Array.from(cacheSet).sort();
                                        }
                                    }
                                    
                                    const activeStatusCodes = (currentFilters as Partial<FilterState>).percentageStatusCodes || configuredStatusCodes;
                                    const activeCacheStatus = (currentFilters as Partial<FilterState>).percentageCacheStatus || configuredCacheStatus;

                                    // Specialized Filters for Percentage Graph
                                    if (isPercentageGraph && percentageConfig) {
                                        return (
                                            <div className="col-span-12 space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Percent className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Percentage Graph - Event Selection</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Parent Events (Denominator) */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Parent Events (Denominator)
                                                            </label>
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                                            <MultiSelectDropdown
                                                                options={events
                                                                    .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                    .map(e => ({
                                                                        value: String(e.eventId),
                                                                        label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                        color: e.color
                                                                    }))}
                                                                selected={currentFilters.activePercentageEvents || percentageConfig.parentEvents}
                                                                onChange={(selected) => {
                                                                    handleFilterChange('activePercentageEvents', selected);
                                                                }}
                                                                placeholder="Select Parent Events (Multiple Supported)"
                                                                maxDisplayItems={3}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Child Events (Numerator) */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Child Events (Numerator)
                                                            </label>
                                                        </div>
                                                        <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-100 dark:border-green-900/30 shadow-sm">
                                                            <MultiSelectDropdown
                                                                options={events
                                                                    .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                    .map(e => ({
                                                                        value: String(e.eventId),
                                                                        label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                        color: e.color
                                                                    }))}
                                                                selected={currentFilters.activePercentageChildEvents || percentageConfig.childEvents}
                                                                onChange={(selected) => {
                                                                    handleFilterChange('activePercentageChildEvents', selected);
                                                                }}
                                                                placeholder="Select Child Events (Multiple Supported)"
                                                                maxDisplayItems={3}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-xs text-muted-foreground text-center bg-white/50 dark:bg-black/20 p-2 rounded">
                                                    Formula: <span className="font-mono text-xs">(Child Count / Parent Count) × 100</span>
                                                </div>
                                                {/* Platform, POS, Source filters for percentage graph - hide for API events */}
                                                {!isMainPanelApi && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</Label>
                                                            <MultiSelectDropdown
                                                                options={platformOptions}
                                                                selected={(currentFilters.platforms || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('platforms', values)}
                                                                placeholder="Select platforms"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</Label>
                                                            <MultiSelectDropdown
                                                                options={posOptions}
                                                                selected={(currentFilters.pos || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('pos', values)}
                                                                placeholder="Select POS"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</Label>
                                                            <MultiSelectDropdown
                                                                options={sourceOptions}
                                                                selected={(currentFilters.sources || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('sources', values)}
                                                                placeholder="Select sources"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Specialized Filters for Funnel Graph - dropdowns like Template Builder
                                    if (isFunnelGraph && funnelConfig) {
                                        const defaultStageIds = funnelConfig.stages.map((s: any) => s.eventId);
                                        const activeStageIds = (currentFilters.activeStages && currentFilters.activeStages.length > 0)
                                            ? currentFilters.activeStages
                                            : defaultStageIds;

                                        const activeChildEventsForMain = (currentFilters.activeFunnelChildEvents && currentFilters.activeFunnelChildEvents.length > 0)
                                            ? currentFilters.activeFunnelChildEvents
                                            : (funnelConfig.multipleChildEvents || []);

                                        return (
                                            <div className="col-span-12 space-y-4">
                                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-500/30">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Filter className="h-4 w-4 text-blue-500" />
                                                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Funnel Graph Configuration</span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                                        Define conversion stages: e1 (parent) → e2 → e3 → ... → last (multiple children)
                                                    </p>

                                                    {/* Funnel Stages - Individual Dropdowns (e1, e2, e3...) with add/remove */}
                                                    <div className="space-y-3">
                                                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                            Funnel Stages
                                                        </label>
                                                        {(activeStageIds.length > 0 ? activeStageIds : defaultStageIds).map((currentId: string, idx: number) => {
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
                                                                            handleFilterChange('activeStages', base);
                                                                        }}
                                                                    >
                                                                        <option value="">Select event</option>
                                                                        {events
                                                                            .filter(ev => isMainPanelApi ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                            .map(ev => (
                                                                            <option key={ev.eventId} value={ev.eventId}>
                                                                                {ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        type="button"
                                                                        className="text-[11px] text-red-500 hover:text-red-700 px-1 disabled:opacity-40"
                                                                        disabled={(activeStageIds.length || defaultStageIds.length) <= 1}
                                                                        onClick={() => {
                                                                            const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                            const next = base.filter((_, i) => i !== idx);
                                                                            handleFilterChange('activeStages', next);
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        <div>
                                                            <button
                                                                type="button"
                                                                className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                                                                onClick={() => {
                                                                    const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                    const next = [...base, ''];
                                                                    handleFilterChange('activeStages', next);
                                                                }}
                                                            >
                                                                + Add Stage
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Final Stage (Multiple Events) - Multi-Select */}
                                                    {funnelConfig.multipleChildEvents && funnelConfig.multipleChildEvents.length > 0 && (
                                                        <div className="mt-4 space-y-2">
                                                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                                Final Stage (Multiple Events)
                                                            </label>
                                                            <MultiSelectDropdown
                                                                options={events
                                                                    .filter(ev => isMainPanelApi ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                    .map(ev => ({ 
                                                                        value: String(ev.eventId), 
                                                                        label: ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName 
                                                                    }))}
                                                                selected={activeChildEventsForMain}
                                                                onChange={(values) => handleFilterChange('activeFunnelChildEvents', values)}
                                                                placeholder="Select final stage events"
                                                            />
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                These events will be shown with different colors in the final bar
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Platform, POS, Source filters - hide for API events */}
                                                {!isMainPanelApi && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</Label>
                                                            <MultiSelectDropdown
                                                                options={platformOptions}
                                                                selected={(currentFilters.platforms || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('platforms', values)}
                                                                placeholder="Select platforms"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</Label>
                                                            <MultiSelectDropdown
                                                                options={posOptions}
                                                                selected={(currentFilters.pos || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('pos', values)}
                                                                placeholder="Select POS"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</Label>
                                                            <MultiSelectDropdown
                                                                options={sourceOptions}
                                                                selected={(currentFilters.sources || []).map((id: number) => id.toString())}
                                                                onChange={(values) => handleFilterChange('sources', values)}
                                                                placeholder="Select sources"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Default Filters (Regular Graphs)
                                    return (
                                        <div className={cn(
                                            "grid gap-3 sm:gap-4",
                                             isMainPanelApi
                                                ? "grid-cols-1"
                                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                                        )}>
                                            {!isMainPanelApi && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platform</Label>
                                                        <MultiSelectDropdown
                                                            options={platformOptions}
                                                            selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.platforms || []) : []).map(id => id.toString())}
                                                            onChange={(values) => handleFilterChange('platforms', values)}
                                                            placeholder="Select platforms"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">POS</Label>
                                                        <MultiSelectDropdown
                                                            options={posOptions}
                                                            selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.pos || []) : []).map(id => id.toString())}
                                                            onChange={(values) => handleFilterChange('pos', values)}
                                                            placeholder="Select POS"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Source</Label>
                                                        <MultiSelectDropdown
                                                            options={sourceOptions}
                                                            selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.sources || []) : []).map(id => id.toString())}
                                                            onChange={(values) => handleFilterChange('sources', values)}
                                                            placeholder="Select sources"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    {isMainPanelApi ? 'API Events (Host / URL)' : 'Event'}
                                                </Label>
                                                <MultiSelectDropdown
                                                    options={eventOptions}
                                                    selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.events || []) : []).map(id => id.toString())}
                                                    onChange={(values) => handleFilterChange('events', values)}
                                                    placeholder={isMainPanelApi ? "Select API events" : "Select events"}
                                                />
                                                {isMainPanelApi && profile?.panels?.[0] && panelFiltersState[profile.panels[0].panelId]?.events?.length > 0 && (() => {
                                                    const selectedEvent = events.find(e => e.eventId === panelFiltersState[profile.panels[0].panelId]?.events[0]?.toString());
                                                    return selectedEvent?.callUrl ? (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Call URL: <code className="px-1 bg-purple-100 dark:bg-purple-900/30 rounded">{selectedEvent.callUrl}</code>
                                                        </p>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })()}

                            </div>

                            {/* API Events Info Banner with Filters */}
                            {isMainPanelApi && (
                                <div className="mt-4 space-y-3">
                                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span> Data grouped by <code className="px-1 bg-white dark:bg-gray-800 rounded">status</code> codes and <code className="px-1 bg-white dark:bg-gray-800 rounded">cacheStatus</code>. Metrics include response time, bytes transferred, and error rates.
                                        </p>
                                    </div>
                                    
                                    {/* Status & Cache Filters */}
                                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/30">
                                        <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                            <Activity className="h-4 w-4" />
                                            API Filters (Status & Cache)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Status Codes</Label>
                                                {/* Show 2xx and 3xx individually, group only 4xx and 5xx */}
                                                {(() => {
                                                    const codes2xx = availableStatusCodes.filter(c => c.startsWith('2'));
                                                    const codes3xx = availableStatusCodes.filter(c => c.startsWith('3'));
                                                    const codes4xx = availableStatusCodes.filter(c => c.startsWith('4'));
                                                    const codes5xx = availableStatusCodes.filter(c => c.startsWith('5'));
                                                    const codesOther = availableStatusCodes.filter(c => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5'));
                                                    
                                                    // Build grouped options - 2xx and 3xx shown individually, 4xx and 5xx grouped
                                                    const groupedOptions: Array<{ label: string; value: string }> = [];
                                                    // Show 2xx codes individually
                                                    codes2xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                    // Show 3xx codes individually
                                                    codes3xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                    // Group 4xx codes with count breakdown
                                                    if (codes4xx.length > 0) {
                                                        groupedOptions.push({ label: `4xx Group (${codes4xx.join(', ')})`, value: '4xx_group' });
                                                    }
                                                    // Group 5xx codes with count breakdown
                                                    if (codes5xx.length > 0) {
                                                        groupedOptions.push({ label: `5xx Group (${codes5xx.join(', ')})`, value: '5xx_group' });
                                                    }
                                                    codesOther.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                    
                                                    const currentSelected = profile?.panels?.[0]
                                                        ? (panelFiltersState[profile.panels[0].panelId]?.percentageStatusCodes || [])
                                                        : [];

                                                    const displaySelected = (() => {
                                                        const s = new Set<string>(currentSelected);
                                                        if (codes4xx.length > 0 && codes4xx.every(c => s.has(c))) s.add('4xx_group');
                                                        if (codes5xx.length > 0 && codes5xx.every(c => s.has(c))) s.add('5xx_group');
                                                        return Array.from(s);
                                                    })();
                                                    
                                                    return (
                                                        <>
                                                            <MultiSelectDropdown
                                                                options={groupedOptions}
                                                                selected={displaySelected}
                                                                onChange={(values) => {
                                                                    // console.log('Status code selection changed:', values);
                                                                    // Expand group selections to individual codes
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
                                                                    const defaultStatus = availableStatusCodes.includes('200') ? ['200'] : availableStatusCodes;
                                                                    const nextValues = uniqueValues.length === 0 ? [...defaultStatus] : uniqueValues;
                                                                    // console.log('Final status codes to apply:', nextValues);
                                                                    handleFilterChange('percentageStatusCodes', nextValues);
                                                                }}
                                                                placeholder={availableStatusCodes.length > 0 ? "Select status codes" : "Loading..."}
                                                                disabled={availableStatusCodes.length === 0}
                                                            />
                                                            {availableStatusCodes.length === 0 && (
                                                                <p className="text-xs text-muted-foreground">Loading status codes...</p>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</Label>
                                                <MultiSelectDropdown
                                                    options={availableCacheStatuses.map(status => ({ label: status, value: status }))}
                                                    selected={
                                                        profile?.panels?.[0] 
                                                            ? (panelFiltersState[profile.panels[0].panelId]?.percentageCacheStatus || [])
                                                            : []
                                                    }
                                                    onChange={(values) => {
                                                        const defaultCache = availableCacheStatuses.length > 0 ? [...availableCacheStatuses] : [];
                                                        const nextValues = values.length === 0 ? [...defaultCache] : Array.from(new Set(values));
                                                        handleFilterChange('percentageCacheStatus', nextValues);
                                                    }}
                                                    placeholder={availableCacheStatuses.length > 0 ? "Select cache statuses" : "Loading..."}
                                                    disabled={availableCacheStatuses.length === 0}
                                                />
                                                {availableCacheStatuses.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">Loading cache statuses...</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Job ID (sourceStr) Filter - Only shown when data contains sourceStr values */}
                            {availableSourceStrs.length > 0 && (
                                <div
                                    className="mt-4 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-500/30"
                                >
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <Hash className="w-4 h-4 text-cyan-600" />
                                            <Label className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300 font-medium">
                                                Job ID Filter
                                            </Label>
                                            <span className="text-xs text-cyan-600 dark:text-cyan-400">
                                                ({availableSourceStrs.length} jobs found)
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <MultiSelectDropdown
                                                options={availableSourceStrs.map(s => ({ value: s, label: s }))}
                                                selected={selectedSourceStrs}
                                                onChange={(values) => setSelectedSourceStrs(values)}
                                                placeholder="All Job IDs"
                                                className="bg-white dark:bg-gray-800"
                                            />
                                        </div>
                                        {selectedSourceStrs.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedSourceStrs([])}
                                                className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/30"
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Apply Filters Button and Auto-refresh Config */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
                                <div className="flex items-center gap-4">
                                    {/* Prominent Apply Filters button with clear visual cue */}
                                    <Button
                                        onClick={handleApplyFilters}
                                        disabled={dataLoading}
                                        size="lg"
                                        className={cn(
                                            "relative transition-all duration-300 font-semibold",
                                            pendingRefresh
                                                ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-xl shadow-red-500/40 border-2 border-red-300"
                                                : "bg-primary hover:bg-primary/90"
                                        )}
                                    >
                                        {dataLoading ? (
                                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="mr-2 h-5 w-5" />
                                        )}
                                        {pendingRefresh ? "⚡ APPLY CHANGES" : "Refresh This Panel"}
                                        {pendingRefresh && (
                                            <div
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                            >
                                                !
                                            </div>
                                        )}
                                    </Button>
                                    {pendingRefresh && (
                                        <span
                                            className="text-sm text-red-600 dark:text-red-400 font-medium"
                                        >
                                            Filters changed! Click to update data.
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Auto-refresh:</Label>
                                    <select
                                        value={autoRefreshMinutes}
                                        onChange={(e) => setAutoRefreshMinutes(Number(e.target.value))}
                                        className="h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value={0}>Disabled</option>
                                        <option value={1}>1 min</option>
                                        <option value={2}>2 min</option>
                                        <option value={5}>5 min</option>
                                        <option value={10}>10 min</option>
                                        <option value={15}>15 min</option>
                                        <option value={30}>30 min</option>
                                    </select>
                                    {autoRefreshMinutes > 0 && (
                                        <span
                                            className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Stats Cards - ONLY for non-special graphs */}
                {(() => {
                    const mainPanel = profile?.panels?.[0];
                    const filterConfig = (mainPanel as any)?.filterConfig;
                    const graphType = filterConfig?.graphType;
                    
                    // Skip stats cards for special graph types
                    if (graphType === 'percentage' || graphType === 'funnel') {
                        return null;
                    }
                    
                    return (
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Count Card */}
                    <div
                        className="group"
                    >
                        <Card className="relative rounded-2xl bg-gradient-to-br from-purple-500/10 via-violet-500/8 to-fuchsia-500/10 dark:from-purple-500/15 dark:via-violet-500/12 dark:to-fuchsia-500/15 border border-purple-200/60 dark:border-purple-500/30 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_8px_25px_rgba(147,51,234,0.08)] hover:shadow-[0_15px_35px_rgba(147,51,234,0.20)]">
                            {/* Purple/Pink Gradient Accent Bar */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                            {/* Animated background shimmer */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/8 to-purple-500/0" />
                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400/15 via-violet-400/10 to-fuchsia-400/15" />

                            <CardContent className="pt-3 pb-3 relative">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div
                                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shadow-purple-500/20 mb-2"
                                        >
                                            <Hash className="h-4 w-4 text-white" />
                                        </div>
                                        <div
                                            className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent"
                                        >
                                            <AnimatedNumber value={totalCount} />
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">Total Events</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <MiniSparkline data={graphData.slice(-7).map(d => d.count || 0)} color="#a855f7" />
                                        <span
                                            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400"
                                        >
                                            <Activity className="h-3 w-3" />
                                            <span>{Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Success Count Card */}
                    <div
                        className="group"
                    >
                        <Card className="relative bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20 hover:border-green-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-400/10 to-green-500/0"
                            />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-green-400/20 to-transparent" />

                            <CardContent className="pt-3 pb-3 relative">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div
                                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/25 mb-2"
                                        >
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        </div>
                                        <div
                                            className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                                        >
                                            <AnimatedNumber value={totalSuccess} />
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">Success Count</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {/* Success Rate Badge */}
                                        <span
                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${(totalSuccess / totalCount * 100) >= 90
                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                                                : (totalSuccess / totalCount * 100) >= 70
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                                }`}
                                        >
                                            {(totalSuccess / totalCount * 100) >= 90 ? (
                                                <ArrowUpRight className="h-3 w-3" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3" />
                                            )}
                                            {totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0}%
                                        </span>
                                        <MiniSparkline data={graphData.slice(-7).map(d => d.successCount || 0)} color="#22c55e" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Fail Count Card */}
                    <div
                        className="group"
                    >
                        <Card className="relative bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 border-red-500/20 hover:border-red-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-400/10 to-red-500/0"
                            />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-red-400/20 to-transparent" />

                            <CardContent className="pt-3 pb-3 relative">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div
                                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-md shadow-red-500/25 mb-2"
                                        >
                                            <XCircle className="h-4 w-4 text-white" />
                                        </div>
                                        <div
                                            className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"
                                        >
                                            <AnimatedNumber value={totalFail} />
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-medium">Fail Count</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {/* Alert indicator for high fail rate */}
                                        {totalFail > 0 && (totalFail / totalCount * 100) > 10 && (
                                            <span
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                            >
                                                <Flame className="h-3 w-3" />
                                                Alert
                                            </span>
                                        )}
                                        <MiniSparkline data={graphData.slice(-7).map(d => d.failCount || 0)} color="#ef4444" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Events Card */}
                    <div
                        className="group"
                    >
                        <Card className="relative bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-fuchsia-500/10 border-purple-500/20 hover:border-purple-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/10 to-purple-500/0"
                            />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400/20 to-transparent" />

                            <CardContent className="pt-3 pb-3 relative">
                                <div className="flex items-start justify-between mb-1.5">
                                    <div>
                                        <div
                                            className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/25"
                                        >
                                            <Target className="h-4 w-4 text-white" />
                                        </div>
                                        <span
                                            className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                        >
                                            <AnimatedNumber value={selectedEventsList.length} suffix={` event${selectedEventsList.length !== 1 ? 's' : ''}`} />
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-[45px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600">
                                    {selectedEventsList.length > 0 ? selectedEventsList.slice(0, 6).map((eventName, idx) => (
                                        <span
                                            key={eventName}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 dark:from-purple-500/20 dark:to-violet-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            {eventName}
                                        </span>
                                    )) : (
                                        <span
                                            className="text-muted-foreground text-sm italic"
                                        >
                                            All events selected
                                        </span>
                                    )}
                                    {selectedEventsList.length > 6 && (
                                        <span
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg"
                                        >
                                            +{selectedEventsList.length - 6} more
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1.5 font-medium">Selected Events</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                    );
                })()}

                {/* Main Chart - Count Events Only */}
                {normalEventKeys.length > 0 && (() => {
                    const mainPanelId = profile?.panels?.[0]?.panelId;
                    const mainPanel = profile?.panels?.[0];
                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';

                    // Check if this is a special graph panel (percentage or funnel)
                    const filterConfig = (mainPanel as any)?.filterConfig;
                    const graphType = filterConfig?.graphType;

                    const eventColors = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {});
                    const eventNames = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.eventName }), {});

                    // Percentage Graph - EXCLUSIVE RENDERING
                    const percentageConfig = filterConfig?.percentageConfig;
                    const panelFilters = panelFiltersState[mainPanelId || ''] || {};

                    if (graphType === 'percentage' && percentageConfig) {
                        const activeParentEvents = panelFilters.activePercentageEvents && panelFilters.activePercentageEvents.length > 0
                            ? panelFilters.activePercentageEvents
                            : percentageConfig.parentEvents;

                        const activeChildEvents = panelFilters.activePercentageChildEvents && panelFilters.activePercentageChildEvents.length > 0
                            ? panelFilters.activePercentageChildEvents
                            : percentageConfig.childEvents;

                        const configuredStatusCodes = percentageConfig.filters?.statusCodes || [];
                        const configuredCacheStatus = percentageConfig.filters?.cacheStatus || [];
                        const activeStatusCodes = panelFilters.percentageStatusCodes && panelFilters.percentageStatusCodes.length > 0
                            ? panelFilters.percentageStatusCodes
                            : configuredStatusCodes;
                        const activeCacheStatus = panelFilters.percentageCacheStatus && panelFilters.percentageCacheStatus.length > 0
                            ? panelFilters.percentageCacheStatus
                            : configuredCacheStatus;

                        // Create separate percentage graphs for each child event
                        return (
                            <div className="space-y-6">
                                {activeChildEvents.map((childEvent: string, index: number) => (
                                    <PercentageGraph
                                        key={`${activeParentEvents.join('-')}-${childEvent}-${index}`}
                                        data={isMainPanelApi && mainPanelId
                                            ? ((panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[])
                                            : graphData}
                                        dateRange={dateRange}
                                        parentEvents={activeParentEvents}
                                        childEvents={[childEvent]} // Single child event per graph
                                        eventColors={eventColors}
                                        eventNames={eventNames}
                                        filters={{
                                            ...(percentageConfig?.filters || {}),
                                            statusCodes: activeStatusCodes,
                                            cacheStatus: activeCacheStatus
                                        }}
                                        isHourly={isHourly}
                                        onToggleBackToFunnel={(profile?.panels?.[0] as any)?.previousGraphType === 'funnel' ? () => {
                                            // Toggle back to funnel graph
                                            if (profile && profile.panels && profile.panels[0]) {
                                                const updatedConfig = {
                                                    ...profile.panels[0].filterConfig,
                                                    graphType: 'funnel' as const,
                                                };
                                                
                                                const updatedProfile = {
                                                    ...profile,
                                                    panels: profile.panels.map((panel, index) => 
                                                        index === 0 ? { 
                                                            ...panel, 
                                                            filterConfig: updatedConfig,
                                                            previousGraphType: undefined
                                                        } : panel
                                                    )
                                                };
                                                
                                                setProfile(updatedProfile as any);
                                                
                                                toast({
                                                    title: "🔄 Switched to Funnel Analysis",
                                                    description: "Back to funnel view",
                                                    duration: 2000,
                                                });
                                            }
                                        } : undefined}
                                    />
                                ))}
                            </div>
                        );
                    }

                    // Funnel Graph - EXCLUSIVE RENDERING
                    const funnelConfig = filterConfig?.funnelConfig;

                    if (graphType === 'funnel' && funnelConfig) {
                        const activeStageIds = panelFilters.activeStages && panelFilters.activeStages.length > 0
                            ? panelFilters.activeStages
                            : funnelConfig.stages.map((s: any) => s.eventId);

                        const activeStages = funnelConfig.stages
                            .filter((stage: any) => activeStageIds.includes(stage.eventId))
                            .map((stage: any) => {
                                const evt = events.find(e => String(e.eventId) === String(stage.eventId));
                                return {
                                    eventId: stage.eventId,
                                    eventName: evt?.eventName || stage.label || stage.eventName || stage.eventId,
                                    color: evt?.color || stage.color
                                };
                            });

                        const activeChildEvents = panelFilters.activeFunnelChildEvents && panelFilters.activeFunnelChildEvents.length > 0
                            ? panelFilters.activeFunnelChildEvents
                            : (funnelConfig.multipleChildEvents || []);

                        return (
                            <div>
                                <FunnelGraph
                                    data={isMainPanelApi ? filteredApiData : graphData}
                                    stages={activeStages}
                                    multipleChildEvents={activeChildEvents}
                                    eventColors={eventColors}
                                    eventNames={eventNames}
                                    filters={isMainPanelApi ? {
                                        statusCodes: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageStatusCodes || [],
                                        cacheStatus: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageCacheStatus || []
                                    } : undefined}
                                    onViewAsPercentage={(parentEventId, childEventIds) => {
                                        // Switch to percentage graph
                                        if (profile && profile.panels && profile.panels[0]) {
                                            const filterConfig = profile.panels[0].filterConfig;
                                            const updatedConfig = {
                                                ...filterConfig,
                                                graphType: 'percentage' as const,
                                                events: filterConfig?.events || [],
                                                platforms: filterConfig?.platforms || [],
                                                pos: filterConfig?.pos || [],
                                                sources: filterConfig?.sources || [],
                                                sourceStr: filterConfig?.sourceStr || [],
                                                percentageConfig: {
                                                    parentEvents: [parentEventId],
                                                    childEvents: childEventIds,
                                                    filters: {
                                                        statusCodes: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageStatusCodes || [],
                                                        cacheStatus: (mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>).percentageCacheStatus || []
                                                    }
                                                }
                                            };

                                            const updatedProfile = {
                                                ...profile,
                                                panels: profile.panels.map((panel, index) =>
                                                    index === 0 ? {
                                                        ...panel,
                                                        filterConfig: updatedConfig,
                                                        previousGraphType: panel.filterConfig?.graphType
                                                    } : panel
                                                )
                                            };

                                            setProfile(updatedProfile as any);
                                        }
                                    }}
                                />
                            </div>
                        );
                    }

                    // Apply API filtering to main panel graph data if this is an API panel
                    const mainFilteredGraphData = (() => {
                        if (!isMainPanelApi) return graphData;

                        // In API aggregation mode (graphType != percentage/funnel), graphData is already broken out by status/cache.
                        // Do not attempt to re-filter by status/cache using eventId-derived keys (it will zero-out the series).
                        return graphData;

                        const mainPanelFilters = mainPanelId ? (panelFiltersState[mainPanelId] || {} as Partial<FilterState>) : {} as Partial<FilterState>;
                        const mainPanelConfig = (profile?.panels?.[0] as any)?.filterConfig;
                        const mainPercentageConfig = mainPanelConfig?.percentageConfig;
                        const mainConfiguredStatusCodes = mainPercentageConfig?.filters?.statusCodes || [];
                        const mainConfiguredCacheStatus = mainPercentageConfig?.filters?.cacheStatus || [];

                        const statusCodes = (mainPanelFilters.percentageStatusCodes || mainConfiguredStatusCodes || []).filter(Boolean);
                        const cacheStatuses = (mainPanelFilters.percentageCacheStatus || mainConfiguredCacheStatus || []).filter(Boolean);
                        const hasStatusFilter = statusCodes.length > 0;
                        const hasCacheFilter = cacheStatuses.length > 0;

                        if (!hasStatusFilter && !hasCacheFilter) return graphData;

                        return graphData.map(record => {
                            const filteredRecord = { ...record };

                            normalEventKeys.forEach(eventKeyInfo => {
                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                const baseName = event?.eventName || `Event ${eventKeyInfo.eventId}`;
                                const eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');

                                let filteredCount = 0;
                                let filteredSuccess = 0;
                                let filteredFail = 0;
                                let filteredAvgDelay = 0;

                                if (hasStatusFilter && hasCacheFilter) {
                                    // Prefer combined keys if present; else fall back to status-only.
                                    const hasCombinedKeys = statusCodes.some((status: string) =>
                                        cacheStatuses.some((cache: string) => Object.prototype.hasOwnProperty.call(record, `${eventKey}_status_${status}_cache_${cache}_count`))
                                    );

                                    if (hasCombinedKeys) {
                                        statusCodes.forEach((status: string) => {
                                            cacheStatuses.forEach((cache: string) => {
                                                const combinedKey = `${eventKey}_status_${status}_cache_${cache}`;
                                                filteredCount += Number(record[`${combinedKey}_count`] || 0);
                                                filteredSuccess += Number(record[`${combinedKey}_success`] || 0);
                                                filteredFail += Number(record[`${combinedKey}_fail`] || 0);
                                                filteredAvgDelay += Number(record[`${combinedKey}_avgDelay`] || 0);
                                            });
                                        });
                                    } else {
                                        statusCodes.forEach((status: string) => {
                                            const statusKey = `${eventKey}_status_${status}`;
                                            filteredCount += Number(record[`${statusKey}_count`] || 0);
                                            filteredSuccess += Number(record[`${statusKey}_success`] || 0);
                                            filteredFail += Number(record[`${statusKey}_fail`] || 0);
                                            filteredAvgDelay += Number(record[`${statusKey}_avgDelay`] || 0);
                                        });
                                    }
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
                    })();

                    // Calculate event stats for badges and sort by count
                    const eventStatsForBadges = normalEventKeys.map(eventKeyInfo => {
                        const eventKey = eventKeyInfo.eventKey;
                        let total = 0;
                        let success = 0;

                        mainFilteredGraphData.forEach((item: any) => {
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

                    // Sort normalEventKeys by total count descending (highest first) for legend
                    const sortedNormalEventKeys = [...normalEventKeys].sort((a, b) => {
                        const aTotal = eventStatsForBadges.find(s => s.eventKey === a.eventKey)?.total || 0;
                        const bTotal = eventStatsForBadges.find(s => s.eventKey === b.eventKey)?.total || 0;
                        return bTotal - aTotal;
                    });

                    // If in deviation mode, show only the overlay chart with toggle button
                    // For hourly: only show 8-Day Overlay if date range <= 8 days
                    if (isHourly && mainChartType === 'deviation') {
                        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysDiff <= 8) {
                            // Filter to show only selected event or all events
                            const filteredEventKeys = overlaySelectedEventKey
                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                : normalEventKeys.map(e => e.eventKey);

                            return (
                                <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                    <CardHeader className="pb-2 px-3 md:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                                <CardTitle className="text-base md:text-lg">8-Day Hourly Comparison</CardTitle>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                onClick={() => {
                                                    setPanelChartType(prev => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        if (!mainPanelId) return prev;
                                                        return {
                                                            ...prev,
                                                            [mainPanelId]: 'default',
                                                        };
                                                    });
                                                }}
                                            >
                                                ← Event Trends
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                        <DayWiseComparisonChart
                                            data={graphData}
                                            dateRange={dateRange}
                                            eventKeys={filteredEventKeys}
                                            eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                            eventStats={eventStatsForBadges}
                                            selectedEventKey={overlaySelectedEventKey}
                                            onEventClick={handleOverlayEventClick}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        }
                    }

                    // If in deviation mode for DAILY data, show daily overlay comparison
                    // Only show for date ranges <= 8 days
                    if (!isHourly && mainChartType === 'deviation') {
                        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysDiff <= 8) {
                            // Filter to show only selected event or all events
                            const filteredEventKeys = overlaySelectedEventKey
                                ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                : normalEventKeys.map(e => e.eventKey);

                            return (
                                <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                    <CardHeader className="pb-2 px-3 md:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-purple-600" />
                                                <CardTitle className="text-base md:text-lg">Daily Overlay Comparison</CardTitle>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                onClick={() => {
                                                    setPanelChartType(prev => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        if (!mainPanelId) return prev;
                                                        return {
                                                            ...prev,
                                                            [mainPanelId]: 'default',
                                                        };
                                                    });
                                                }}
                                            >
                                                ← Event Trends
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-2 md:px-6 pb-4 md:pb-6">
                                        <DayWiseComparisonChart
                                            data={graphData}
                                            dateRange={dateRange}
                                            eventKeys={filteredEventKeys}
                                            eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                            eventStats={eventStatsForBadges}
                                            selectedEventKey={overlaySelectedEventKey}
                                            onEventClick={handleOverlayEventClick}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        }
                    }

                    // Otherwise show the regular chart
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="border border-purple-200/60 dark:border-purple-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                                <CardHeader className="pb-2 px-3 md:px-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
                                            >
                                                <BarChart3 className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                                                    {/* API Event Indicator Badge */}
                                                    {profile?.panels?.[0]?.filterConfig?.isApiEvent === true && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md">
                                                            API
                                                        </span>
                                                    )}
                                                    {(() => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                        if (isHourly && mainChartType === 'deviation') {
                                                            return '8-Day Hourly Comparison';
                                                        }
                                                        if (isHourly) {
                                                            return 'Hourly Event Trends';
                                                        }
                                                        if (mainChartType === 'deviation') {
                                                            return 'Daily Overlay Comparison';
                                                        }
                                                        return 'Daily Event Trends with Average';
                                                    })()}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {isHourly ? (
                                                        <span className="hidden md:inline">
                                                            {(() => {
                                                                const mainPanelId = profile?.panels?.[0]?.panelId;
                                                                const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                                return mainChartType === 'deviation'
                                                                    ? 'Compare hourly patterns across last 8 days'
                                                                    : 'Hourly data points • Toggle for day-wise comparison';
                                                            })()}
                                                        </span>
                                                    ) : (
                                                        <span className="hidden md:inline">Daily event counts • Toggle for overlay comparison</span>
                                                    )}
                                                    <span className="md:hidden">Tap data points for insights</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                onClick={() => {
                                                    setPanelChartType(prev => {
                                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                                        if (!mainPanelId) return prev;
                                                        const current = prev[mainPanelId] ?? 'default';
                                                        return {
                                                            ...prev,
                                                            [mainPanelId]: current === 'deviation' ? 'default' : 'deviation',
                                                        };
                                                    });
                                                }}
                                            >
                                                {(() => {
                                                    const mainPanelId = profile?.panels?.[0]?.panelId;
                                                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                                    if (isHourly) {
                                                        return mainChartType === 'deviation' ? '← Event Trends' : '8-Day Overlay →';
                                                    }
                                                    return mainChartType === 'deviation' ? '← Event Trends' : 'Daily Overlay →';
                                                })()}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                    {/* Collapsible Legend - Only normal (count) events - Hide when showing overlay */}
                                    {(() => {
                                        const mainPanelId = profile?.panels?.[0]?.panelId;
                                        const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';
                                        const showingHourlyOverlay = isHourly && mainChartType === 'deviation';
                                        const showingDailyOverlay = !isHourly && mainChartType === 'deviation';

                                        // Show legend for daily overlay, but not for hourly overlay (8-Day has its own badges)
                                        if (showingDailyOverlay && normalEventKeys.length > 0) {
                                            return (
                                                <CollapsibleLegend
                                                    eventKeys={sortedNormalEventKeys}
                                                    events={events}
                                                    isExpanded={mainLegendExpanded}
                                                    onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                                    maxVisibleItems={5}
                                                    graphData={graphData}
                                                    selectedEventKey={overlaySelectedEventKey}
                                                    onEventClick={handleOverlayEventClick}
                                                />
                                            );
                                        }

                                        return !showingHourlyOverlay && normalEventKeys.length > 0 && (
                                            <CollapsibleLegend
                                                eventKeys={sortedNormalEventKeys}
                                                events={events}
                                                isExpanded={mainLegendExpanded}
                                                onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                                maxVisibleItems={5}
                                                graphData={graphData}
                                                selectedEventKey={selectedEventKey}
                                                onEventClick={handleEventClick}
                                            />
                                        );
                                    })()}

                                    <div className="h-[300px] sm:h-[400px] md:h-[520px] w-full cursor-pointer">
                                        {graphData.length > 0 ? (
                                            <>
                                                {/* Show deviation chart for days < 7 when toggled */}
                                                {(() => {
                                                    const mainPanelId = profile?.panels?.[0]?.panelId;
                                                    const mainChartType = mainPanelId ? panelChartType[mainPanelId] ?? 'default' : 'default';

                                                    // Calculate event stats for badges
                                                    const eventStatsForBadges = normalEventKeys.map(eventKeyInfo => {
                                                        const eventKey = eventKeyInfo.eventKey;
                                                        let total = 0;
                                                        let success = 0;

                                                        graphData.forEach((item: any) => {
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

                                                    if (isHourly && mainChartType === 'deviation') {
                                                        // Filter to show only selected event or all events
                                                        const filteredEventKeys = overlaySelectedEventKey
                                                            ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                                            : normalEventKeys.map(e => e.eventKey);

                                                        const filteredEventStats = overlaySelectedEventKey
                                                            ? eventStatsForBadges.filter(s => s.eventKey === overlaySelectedEventKey)
                                                            : eventStatsForBadges;

                                                        return (
                                                            <DayWiseComparisonChart
                                                                data={graphData}
                                                                dateRange={dateRange}
                                                                eventKeys={filteredEventKeys}
                                                                eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                eventStats={filteredEventStats}
                                                                selectedEventKey={overlaySelectedEventKey}
                                                                onEventClick={handleOverlayEventClick}
                                                            />
                                                        );
                                                    }

                                                    // For daily overlay mode, show daily average chart with line + avg
                                                    if (!isHourly && mainChartType === 'deviation') {
                                                        // Filter to show only selected event or all events
                                                        const filteredEventKeys = overlaySelectedEventKey
                                                            ? normalEventKeys.filter(e => e.eventKey === overlaySelectedEventKey).map(e => e.eventKey)
                                                            : normalEventKeys.map(e => e.eventKey);

                                                        const filteredEventStats = overlaySelectedEventKey
                                                            ? eventStatsForBadges.filter(s => s.eventKey === overlaySelectedEventKey)
                                                            : eventStatsForBadges;

                                                        return (
                                                            <DailyAverageChart
                                                                data={graphData}
                                                                dateRange={dateRange}
                                                                eventKeys={filteredEventKeys}
                                                                eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                eventStats={filteredEventStats}
                                                                selectedEventKey={overlaySelectedEventKey}
                                                                onEventClick={handleOverlayEventClick}
                                                            />
                                                        );
                                                    }

                                                    // Default chart rendering
                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            {/* Check if profile has bar chart type */}
                                                            {(profile?.panels?.[0] as any)?.filterConfig?.graphType === 'bar' ? (
                                                                <BarChart
                                                                    data={graphData}
                                                                    margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                                                    barCategoryGap="15%"
                                                                    onClick={(chartState: any) => {
                                                                        if (chartState && chartState.activeIndex !== undefined) {
                                                                            const index = parseInt(chartState.activeIndex);
                                                                            const dataPoint = graphData[index];
                                                                            if (dataPoint) {
                                                                                setPinnedTooltip({
                                                                                    dataPoint,
                                                                                    label: chartState.activeLabel || dataPoint.date || ''
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <defs>
                                                                        {/* Dynamic gradients for normal events */}
                                                                        {normalEventKeys.map((eventKeyInfo, index) => {
                                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            return (
                                                                                <linearGradient key={`barGrad_${eventKeyInfo.eventKey}`} id={`barColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                                                                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                                                                </linearGradient>
                                                                            );
                                                                        })}
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis
                                                                        dataKey="date"
                                                                        tick={<CustomXAxisTick />}
                                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                                        tickLine={false}
                                                                        height={45}
                                                                        interval={Math.floor(graphData.length / 8)}
                                                                    />
                                                                    {/* Left Y-axis for Count */}
                                                                    <YAxis
                                                                        yAxisId="left"
                                                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                            return value;
                                                                        }}
                                                                        dx={-10}
                                                                        label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                                                                    />
                                                                    <Tooltip
                                                                        content={<CustomTooltip events={events} eventKeys={normalEventKeys} />}
                                                                        cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
                                                                    />
                                                                    {/* Dynamic bars for normal (count) events only */}
                                                                    {normalEventKeys.length > 0 ? normalEventKeys.map((eventKeyInfo) => {
                                                                        const eventKey = eventKeyInfo.eventKey;
                                                                        const countKey = `${eventKey}_count`;
                                                                        const resolvedCountKey = (graphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                            ? countKey
                                                                            : eventKey;
                                                                        return (
                                                                            <Bar
                                                                                key={`bar_${eventKey}`}
                                                                                dataKey={resolvedCountKey}
                                                                                name={eventKeyInfo.eventName}
                                                                                yAxisId="left"
                                                                                fill={`url(#barColor_${eventKey})`}
                                                                                radius={[3, 3, 0, 0]}
                                                                                maxBarSize={40}
                                                                                opacity={selectedEventKey && selectedEventKey !== eventKey ? 0.4 : 1}
                                                                                cursor="pointer"
                                                                                isAnimationActive={false}
                                                                                animationDuration={0}
                                                                            />
                                                                        );
                                                                    }) : (
                                                                        /* Fallback to overall totals when no event keys */
                                                                        <Bar
                                                                            dataKey="count"
                                                                            name="Total"
                                                                            yAxisId="left"
                                                                            fill="#6366f1"
                                                                            radius={[3, 3, 0, 0]}
                                                                            maxBarSize={40}
                                                                            isAnimationActive={false}
                                                                            animationDuration={0}
                                                                        />
                                                                    )}
                                                                </BarChart>
                                                            ) : (
                                                                <AreaChart
                                                                    data={graphData}
                                                                    margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                                                    onClick={(chartState: any) => {
                                                                        if (chartState && chartState.activeIndex !== undefined) {
                                                                            const index = parseInt(chartState.activeIndex);
                                                                            const dataPoint = graphData[index];
                                                                            if (dataPoint) {
                                                                                setPinnedTooltip({
                                                                                    dataPoint,
                                                                                    label: chartState.activeLabel || dataPoint.date || ''
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <defs>
                                                                        {/* Dynamic gradients for each event */}
                                                                        {eventKeys.map((eventKeyInfo, index) => {
                                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            return (
                                                                                <linearGradient key={`areaGrad_${eventKeyInfo.eventKey}`} id={`areaColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                                                                </linearGradient>
                                                                            );
                                                                        })}
                                                                        {/* Glow filters for lines */}
                                                                        <filter id="glow">
                                                                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                                                            <feMerge>
                                                                                <feMergeNode in="coloredBlur" />
                                                                                <feMergeNode in="SourceGraphic" />
                                                                            </feMerge>
                                                                        </filter>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                    <XAxis
                                                                        dataKey="date"
                                                                        tick={<CustomXAxisTick isHourly={isHourly} />}
                                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                                        tickLine={false}
                                                                        height={45}
                                                                        interval={Math.floor(graphData.length / 8)}
                                                                    />
                                                                    {/* Left Y-axis for Count */}
                                                                    <YAxis
                                                                        yAxisId="left"
                                                                        tick={{ fill: '#6b7280', fontSize: 11 }}
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickFormatter={(value) => {
                                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                            return value;
                                                                        }}
                                                                        dx={-10}
                                                                        label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                                                                    />
                                                                    <Tooltip
                                                                        content={<CustomTooltip events={events} eventKeys={normalEventKeys} />}
                                                                        cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                                    />
                                                                    {/* Dynamic areas for normal (count) events only */}
                                                                    {normalEventKeys.length > 0 ? normalEventKeys
                                                                        .filter(ek => !selectedEventKey || ek.eventKey === selectedEventKey)
                                                                        .map((eventKeyInfo, index) => {
                                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                            const eventKey = eventKeyInfo.eventKey;
                                                                            const countKey = `${eventKey}_count`;
                                                                            const resolvedCountKey = (graphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                                ? countKey
                                                                                : eventKey;
                                                                            return (
                                                                                <Area
                                                                                    key={`area_${eventKey}`}
                                                                                    type="monotone"
                                                                                    dataKey={resolvedCountKey}
                                                                                    name={eventKeyInfo.eventName}
                                                                                    yAxisId="left"
                                                                                    stroke={color}
                                                                                    strokeWidth={2.5}
                                                                                    fillOpacity={1}
                                                                                    fill={`url(#areaColor_${eventKey})`}
                                                                                    dot={false}
                                                                                    activeDot={{
                                                                                        r: 8,
                                                                                        fill: color,
                                                                                        stroke: '#fff',
                                                                                        strokeWidth: 3,
                                                                                        filter: 'url(#glow)',
                                                                                        cursor: 'pointer',
                                                                                    }}
                                                                                    isAnimationActive={false}
                                                                                    animationDuration={0}
                                                                                />
                                                                            );
                                                                        }) : (
                                                                        /* Fallback to overall totals when no event keys */
                                                                        <Area
                                                                            type="monotone"
                                                                            dataKey="count"
                                                                            name="Total"
                                                                            yAxisId="left"
                                                                            stroke="#6366f1"
                                                                            strokeWidth={2.5}
                                                                            fillOpacity={0.3}
                                                                            fill="#6366f1"
                                                                            dot={false}
                                                                            activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                                                                            isAnimationActive={false}
                                                                            animationDuration={0}
                                                                        />
                                                                    )}
                                                                </AreaChart>
                                                            )}
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                                <motion.div
                                                    animate={{ rotate: dataLoading ? 360 : 0 }}
                                                    transition={{ duration: 2, repeat: dataLoading ? Infinity : 0, ease: "linear" }}
                                                >
                                                    <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
                                                </motion.div>
                                                <p className="text-sm">
                                                    {dataLoading ? 'Loading chart data...' : 'No data available for selected filters'}
                                                </p>
                                                {!dataLoading && (
                                                    <p className="text-xs mt-1 opacity-60">Try adjusting your filter selections</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>

                                {/* Pinned Tooltip Overlay - Rendered outside chart for persistence */}
                                {pinnedTooltip && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                        <div
                                            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                            onClick={() => setPinnedTooltip(null)}
                                        />
                                        <div className="relative max-w-lg w-full">
                                            {/* Modal Container */}
                                            <div
                                                className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Floating Close Button - Outside the card */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPinnedTooltip(null)}
                                                    className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                                    aria-label="Close details"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>

                                                {/* Card Content */}
                                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                                                    {/* Decorative header gradient */}
                                                    <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500" />

                                                    <div className="max-h-[70vh] overflow-y-auto p-1">
                                                        <CustomTooltip
                                                            active={true}
                                                            payload={eventKeys.map((ek, idx) => {
                                                                const event = events.find(e => String(e.eventId) === ek.eventId);
                                                                const color = event?.color || EVENT_COLORS[idx % EVENT_COLORS.length];
                                                                return {
                                                                    dataKey: `${ek.eventKey}_count`,
                                                                    name: ek.eventName,
                                                                    value: pinnedTooltip.dataPoint[`${ek.eventKey}_count`] || 0,
                                                                    color,
                                                                    stroke: color,
                                                                    payload: pinnedTooltip.dataPoint
                                                                };
                                                            }).filter(p => p.value > 0)}
                                                            label={pinnedTooltip.label}
                                                            events={events}
                                                            eventKeys={eventKeys}
                                                            isPinned={true}
                                                            onClose={() => setPinnedTooltip(null)}
                                                        />
                                                    </div>

                                                    {/* Footer hint */}
                                                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-800 text-center">
                                                        <span className="text-xs text-muted-foreground">Click outside or press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-mono mx-1">ESC</kbd> to close</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </Card>
                        </motion.div>
                    );
                })()}

                {/* Time Delay Chart - For isAvg Events Only (skip for special graphs) */}
                {avgEventKeys.length > 0 && !isFirstPanelSpecialGraph && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <Card className="border border-amber-200/60 dark:border-amber-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                            <CardHeader className="pb-2 px-3 md:px-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
                                            whileHover={{ scale: 1.05, rotate: 5 }}
                                        >
                                            <Clock className="h-5 w-5 text-white" />
                                        </motion.div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base md:text-lg">Time Delay Trends</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                <span className="hidden md:inline">Average delay per event • Price Alerts in minutes, others in seconds</span>
                                                <span className="md:hidden">Delay tracking for isAvg events</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">isAvg Events</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                {/* Collapsible Legend - Only avg (time) events */}
                                {avgEventKeys.length > 0 && (
                                    <CollapsibleLegend
                                        eventKeys={avgEventKeys}
                                        events={events}
                                        isExpanded={mainLegendExpanded}
                                        onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                        maxVisibleItems={5}
                                        graphData={graphData}
                                        selectedEventKey={selectedEventKey}
                                        onEventClick={handleEventClick}
                                    />
                                )}

                                <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full cursor-pointer">
                                    {graphData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={graphData}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
                                            >
                                                <defs>
                                                    {/* Dynamic gradients for avg events */}
                                                    {avgEventKeys.map((eventKeyInfo, index) => {
                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                        return (
                                                            <linearGradient key={`timeGrad_${eventKeyInfo.eventKey}`} id={`timeColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                            </linearGradient>
                                                        );
                                                    })}
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={<CustomXAxisTick isHourly={isHourly} />}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                    height={45}
                                                    interval={Math.floor(graphData.length / 8)}
                                                />
                                                {/* Y-axis for Time Delay */}
                                                <YAxis
                                                    tick={{ fill: '#f59e0b', fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(value) => {
                                                        // Check if any avg event is a Price Alert (feature 1) - show in minutes
                                                        const hasPriceAlert = avgEventKeys.some(ek => {
                                                            const ev = events.find(e => String(e.eventId) === ek.eventId);
                                                            return ev?.feature === 1;
                                                        });
                                                        if (!value || value <= 0) return '0';
                                                        if (hasPriceAlert) {
                                                            // Price alerts - value is already in MINUTES
                                                            if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                                            return `${value.toFixed(1)}m`;
                                                        } else {
                                                            // Others - value is already in SECONDS
                                                            if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                                            return `${value.toFixed(1)}s`;
                                                        }
                                                    }}
                                                    dx={-10}
                                                    label={{ value: 'Delay', angle: -90, position: 'insideLeft', style: { fill: '#f59e0b', fontSize: 10 } }}
                                                />
                                                <Tooltip
                                                    content={<CustomTooltip events={events} eventKeys={avgEventKeys} />}
                                                    cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                />
                                                {/* Dynamic areas for avg (time) events */}
                                                {avgEventKeys
                                                    .filter(ek => !selectedEventKey || ek.eventKey === selectedEventKey)
                                                    .map((eventKeyInfo, index) => {
                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                        const eventKey = eventKeyInfo.eventKey;
                                                        return (
                                                            <Area
                                                                key={`time_${eventKey}`}
                                                                type="monotone"
                                                                dataKey={`${eventKey}_avgDelay`}
                                                                name={eventKeyInfo.eventName}
                                                                stroke={color}
                                                                strokeWidth={2.5}
                                                                fillOpacity={1}
                                                                fill={`url(#timeColor_${eventKey})`}
                                                                dot={false}
                                                                activeDot={{
                                                                    r: 8,
                                                                    fill: color,
                                                                    stroke: '#fff',
                                                                    strokeWidth: 3,
                                                                    cursor: 'pointer',
                                                                }}
                                                                isAnimationActive={false}
                                                                animationDuration={0}
                                                            />
                                                        );
                                                    })}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                            <Clock className="h-12 w-12 mb-3 opacity-30" />
                                            <p className="text-sm">
                                                {dataLoading ? 'Loading delay data...' : 'No delay data available'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* API Events Chart - For isApiEvent panels showing status codes and timing metrics */}
                {(() => {
                    const isApiEvent = isMainPanelApi;

                    if (!isApiEvent || eventKeys.length === 0) return null;

                    return (
                        <div>
                            <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                                <CardHeader className="pb-2 px-3 md:px-6">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
                                                whileHover={{ scale: 1.05, rotate: 5 }}
                                            >
                                                <Activity className="h-5 w-5 text-white" />
                                            </motion.div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <span className="hidden md:inline">Response times, data transfer, and status code distribution</span>
                                                    <span className="md:hidden">API timing and status metrics</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">API Events</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                    {/* Collapsible Legend - Status codes and cache status */}
                                    {apiEndpointEventKeyInfos.length > 0 && (
                                        <CollapsibleLegend
                                            eventKeys={apiEndpointEventKeyInfos}
                                            events={events}
                                            isExpanded={mainLegendExpanded}
                                            onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                            maxVisibleItems={5}
                                            graphData={graphData}
                                            selectedEventKey={apiSelectedEventKey}
                                            onEventClick={handleApiEventClick}
                                        />
                                    )}

                                    {/* Tabs for different metrics */}
                                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                                        {(['timing', 'timing-breakdown', 'timing-anomaly', 'bytes', 'bytes-in', 'count'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setApiMetricView(tab as any)}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                                                    apiMetricView === tab
                                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
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
                                    {apiMetricView === 'timing-anomaly' && (
                                        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                                                <div className="flex-1">
                                                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                                                        Anomaly Detection Active
                                                    </p>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                                        Red dots highlight response times exceeding 2 standard deviations above the mean. These may indicate performance issues requiring investigation.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                        {(isMainPanelApi ? apiPerformanceSeries : graphData).length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={isMainPanelApi ? apiPerformanceSeries : graphData}
                                                    margin={{ top: 10, right: 30, left: 18, bottom: 50 }}
                                                >
                                                    <defs>
                                                        {apiEndpointEventKeyInfos.map((eventKeyInfo: EventKeyInfo, index: number) => {
                                                            const color = EVENT_COLORS[index % EVENT_COLORS.length];
                                                            return (
                                                                <linearGradient key={`apiGrad_${eventKeyInfo.eventKey}`} id={`apiColor_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                                                                </linearGradient>
                                                            );
                                                        })}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={<CustomXAxisTick isHourly={isHourly} />}
                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                        tickLine={false}
                                                        height={45}
                                                        interval={Math.max(0, Math.floor(((isMainPanelApi ? apiPerformanceSeries : graphData).length || 0) / 8))}
                                                    />
                                                    <YAxis
                                                        tick={{ fill: '#3b82f6', fontSize: 11 }}
                                                        width={60}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tickFormatter={(value) => {
                                                            if (!value || value <= 0) return '0';
                                                            const isTimingView = apiMetricView?.startsWith('timing');
                                                            const isBytesView = apiMetricView?.startsWith('bytes');

                                                            if (isTimingView) {
                                                                return `${value.toFixed(0)}ms`;
                                                            } else if (isBytesView) {
                                                                // Bytes
                                                                if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}GB`;
                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}MB`;
                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}KB`;
                                                                return `${value.toFixed(0)}B`;
                                                            } else {
                                                                // Count
                                                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                return value;
                                                            }
                                                        }}
                                                        dx={0}
                                                        label={{
                                                            value: apiMetricView?.startsWith('timing') ? 'Time (ms)' : apiMetricView?.startsWith('bytes') ? 'Data (bytes)' : 'Count',
                                                            angle: -90,
                                                            position: 'insideLeft',
                                                            style: { fill: '#3b82f6', fontSize: 10 }
                                                        }}
                                                    />
                                                    <Tooltip
                                                        content={<CustomTooltip events={events} eventKeys={apiEndpointEventKeyInfos} />}
                                                        cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                    />
                                                    {/* Dynamic areas based on selected metric view */}
                                                    {apiEndpointEventKeyInfos
                                                        .filter((eventKeyInfo: EventKeyInfo) => !apiSelectedEventKey || eventKeyInfo.eventKey === apiSelectedEventKey)
                                                        .map((eventKeyInfo: EventKeyInfo, index: number) => {
                                                            const color = EVENT_COLORS[index % EVENT_COLORS.length];
                                                            const eventKey = eventKeyInfo.eventKey;

                                                            // Determine dataKey based on metric view
                                                            let dataKey = `${eventKey}_count`;
                                                            if (apiMetricView === 'timing') {
                                                                dataKey = `${eventKey}_avgServerToUser`;
                                                            } else if (apiMetricView === 'timing-anomaly') {
                                                                // Show avg timing but highlight anomalies (values > 2 std dev)
                                                                dataKey = `${eventKey}_avgServerToUser`;
                                                            } else if (apiMetricView === 'bytes') {
                                                                dataKey = `${eventKey}_avgBytesOut`;
                                                            } else if (apiMetricView === 'bytes-in') {
                                                                dataKey = `${eventKey}_avgBytesIn`;
                                                            }

                                                            // For timing breakdown, show 3 separate areas
                                                            if (apiMetricView === 'timing-breakdown') {
                                                                return (
                                                                    <React.Fragment key={`api_breakdown_${eventKey}`}>
                                                                        <Area
                                                                            type="monotone"
                                                                            dataKey={`${eventKey}_avgServerToCloud`}
                                                                            name={`${eventKeyInfo.eventName} (Server)`}
                                                                            stroke="#ef4444"
                                                                            strokeWidth={2}
                                                                            fillOpacity={0.3}
                                                                            fill="#ef4444"
                                                                            stackId={eventKey}
                                                                        />
                                                                        <Area
                                                                            type="monotone"
                                                                            dataKey={`${eventKey}_avgCloudToUser`}
                                                                            name={`${eventKeyInfo.eventName} (Network)`}
                                                                            stroke="#f59e0b"
                                                                            strokeWidth={2}
                                                                            fillOpacity={0.3}
                                                                            fill="#f59e0b"
                                                                            stackId={eventKey}
                                                                        />
                                                                    </React.Fragment>
                                                                );
                                                            }

                                                            // Calculate anomaly threshold if in anomaly mode
                                                            let isAnomalyMode = apiMetricView === 'timing-anomaly';
                                                            let anomalyThreshold = 0;
                                                            if (isAnomalyMode) {
                                                                // Calculate mean and standard deviation for this event using filtered data
                                                                const values = (isMainPanelApi ? apiPerformanceSeries : filteredApiData)
                                                                    .map(d => d[dataKey])
                                                                    .filter(v => typeof v === 'number' && v > 0);
                                                                if (values.length > 0) {
                                                                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                                                                    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                                                                    const stdDev = Math.sqrt(variance);
                                                                    anomalyThreshold = mean + (2 * stdDev); // 2 standard deviations above mean
                                                                }
                                                            }

                                                            return (
                                                                <Area
                                                                    key={`api_${eventKey}_${apiMetricView}`}
                                                                    type="monotone"
                                                                    dataKey={dataKey}
                                                                    name={eventKeyInfo.eventName}
                                                                    stroke={color}
                                                                    strokeWidth={2.5}
                                                                    fillOpacity={1}
                                                                    fill={`url(#apiColor_${eventKey})`}
                                                                    dot={isAnomalyMode ? ((props: any) => {
                                                                        const value = props.payload?.[dataKey];
                                                                        if (value && value > anomalyThreshold) {
                                                                            return (
                                                                                <circle
                                                                                    cx={props.cx}
                                                                                    cy={props.cy}
                                                                                    r={6}
                                                                                    fill="#ef4444"
                                                                                    stroke="#fff"
                                                                                    strokeWidth={2}
                                                                                />
                                                                            );
                                                                        }
                                                                        // Return invisible dot for non-anomalous points
                                                                        return (
                                                                            <circle
                                                                                cx={props.cx}
                                                                                cy={props.cy}
                                                                                r={0}
                                                                                fill="transparent"
                                                                            />
                                                                        );
                                                                    }) as any : false}
                                                                    activeDot={{
                                                                        r: 8,
                                                                        fill: color,
                                                                        stroke: '#fff',
                                                                        strokeWidth: 3,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                    isAnimationActive={false}
                                                                    animationDuration={0}
                                                                />
                                                            );
                                                        })}
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center">
                                                <p className="text-muted-foreground">No API performance data available</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })()}

                {/* Error Events Chart - For isError Events Only (skip for special graphs) */}
                {errorEventKeys.length > 0 && !isFirstPanelSpecialGraph && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="border border-red-200/60 dark:border-red-500/30 overflow-hidden shadow-premium rounded-2xl hover:shadow-card-hover transition-all duration-300">
                            <CardHeader className="pb-2 px-3 md:px-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20"
                                            whileHover={{ scale: 1.05, rotate: 5 }}
                                        >
                                            <AlertTriangle className="h-5 w-5 text-white" />
                                        </motion.div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base md:text-lg">Error Event Tracking</CardTitle>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                <span className="hidden md:inline">Error vs Non-Error counts • Red = Errors, Green = OK</span>
                                                <span className="md:hidden">Error tracking for isError events</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError Events</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                                {/* Collapsible Legend - Only error events */}
                                {errorEventKeys.length > 0 && (
                                    <CollapsibleLegend
                                        eventKeys={errorEventKeys}
                                        events={events}
                                        isExpanded={mainLegendExpanded}
                                        onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                        maxVisibleItems={5}
                                        graphData={graphData}
                                        selectedEventKey={errorSelectedEventKey}
                                        onEventClick={handleErrorEventClick}
                                    />
                                )}

                                <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
                                    {graphData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={graphData}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 50 }}
                                            >
                                                <defs>
                                                    {/* Error gradient (red) */}
                                                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                                    </linearGradient>
                                                    {/* Success gradient (green) */}
                                                    <linearGradient id="okGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={<CustomXAxisTick isHourly={isHourly} />}
                                                    axisLine={{ stroke: '#e5e7eb' }}
                                                    tickLine={false}
                                                    height={50}
                                                    interval={Math.floor(graphData.length / 8)}
                                                />
                                                <YAxis
                                                    tick={{ fill: '#ef4444', fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                />
                                                <Tooltip
                                                    content={<CustomTooltip events={events} eventKeys={errorEventKeys} />}
                                                    cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                />
                                                {/* For error events: success = error count, fail = non-error count */}
                                                {errorEventKeys
                                                    .filter(ek => !errorSelectedEventKey || ek.eventKey === errorSelectedEventKey)
                                                    .map((eventKeyInfo) => {
                                                        const eventKey = eventKeyInfo.eventKey;
                                                        return (
                                                            <React.Fragment key={`error_main_${eventKey}`}>
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey={`${eventKey}_success`}
                                                                    name={`${eventKeyInfo.eventName} (Errors)`}
                                                                    stroke="#ef4444"
                                                                    strokeWidth={2.5}
                                                                    fill="url(#errorGradient)"
                                                                    dot={false}
                                                                    activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey={`${eventKey}_fail`}
                                                                    name={`${eventKeyInfo.eventName} (OK)`}
                                                                    stroke="#22c55e"
                                                                    strokeWidth={2}
                                                                    fill="url(#okGradient)"
                                                                    dot={false}
                                                                    activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                                                                />
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                            <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
                                            <p className="text-sm">
                                                {dataLoading ? 'Loading error data...' : 'No error data available'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Pie Charts - Shown above Hourly Insights, hidden if only 1 item (100% share) */}
                {(() => {
                    // Check if this is an API event panel
                    const isApiEvent = isMainPanelApi;

                    if (isApiEvent) {
                        // API Event Pie Charts - Status and CacheStatus distribution
                        // Access the nested data property from the API response
                        const apiData = pieChartData?.data || pieChartData;
                        const statusData = apiData?.status ? Object.entries(apiData.status).map(([key, val]: [string, any]) => ({
                            name: `${val.status}`,
                            value: val.count
                        })) : [];

                        const cacheStatusData = apiData?.cacheStatus ? Object.entries(apiData.cacheStatus).map(([key, val]: [string, any]) => ({
                            name: val.cacheStatus || 'Unknown',
                            value: val.count
                        })) : [];

                        // Sort status data with 200 first
                        statusData.sort((a, b) => {
                            if (a.name === '200') return -1;
                            if (b.name === '200') return 1;
                            return parseInt(a.name) - parseInt(b.name);
                        });

                        const showStatus = statusData.length > 0;
                        const showCacheStatus = cacheStatusData.length > 0;
                        const visibleCount = [showStatus, showCacheStatus].filter(Boolean).length;

                        if (visibleCount === 0) {
                            return null;
                        }

                        const gridClass = visibleCount === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto";

                        return (
                            <div className={cn("grid gap-3 md:gap-4", gridClass)}>
                                {/* Status Code Distribution */}
                                {showStatus && (
                                    <div>
                                        <Card className="border border-blue-200/60 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-500/5 dark:to-indigo-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                                            <Hash className="h-4 w-4 text-white" />
                                                        </div>
                                                        <CardTitle className="text-sm font-semibold text-foreground">Status Codes</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                                            {statusData.length} codes
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                                                            onClick={() => openExpandedPie('status', 'Status Codes', statusData)}
                                                        >
                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-52">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={statusData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={35}
                                                                outerRadius={65}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={2}
                                                                stroke="#fff"
                                                                isAnimationActive={false}
                                                                animationDuration={0}
                                                            >
                                                                {statusData.map((_: any, index: number) => (
                                                                    <Cell
                                                                        key={`status-cell-${index}`}
                                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<PieTooltip
                                                                    totalValue={statusData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                    category="Status Code"
                                                                />}
                                                            />
                                                            <Legend
                                                                iconType="circle"
                                                                iconSize={8}
                                                                layout="horizontal"
                                                                verticalAlign="bottom"
                                                                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Cache Status Distribution */}
                                {showCacheStatus && (
                                    <div>
                                        <Card className="border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-500/5 dark:to-fuchsia-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-md">
                                                            <Zap className="h-4 w-4 text-white" />
                                                        </div>
                                                        <CardTitle className="text-sm font-semibold text-foreground">Cache Status</CardTitle>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                                                            {cacheStatusData.length} types
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 hover:bg-purple-100 dark:hover:bg-purple-500/20"
                                                            onClick={() => openExpandedPie('cacheStatus', 'Cache Status', cacheStatusData)}
                                                        >
                                                            <Maximize2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-52">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={cacheStatusData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={35}
                                                                outerRadius={65}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={2}
                                                                stroke="#fff"
                                                                isAnimationActive={false}
                                                                animationDuration={0}
                                                            >
                                                                {cacheStatusData.map((_: any, index: number) => (
                                                                    <Cell
                                                                        key={`cache-cell-${index}`}
                                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                content={<PieTooltip
                                                                    totalValue={cacheStatusData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                    category="Cache Status"
                                                                />}
                                                            />
                                                            <Legend
                                                                iconType="circle"
                                                                iconSize={8}
                                                                layout="horizontal"
                                                                verticalAlign="bottom"
                                                                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Check if ANY panel is a special graph (percentage or funnel)
                    // If so, we hide the top-level pie charts to avoid clutter/confusion
                    const isAnyPanelSpecial = profile?.panels?.some((p: any) =>
                        p.filterConfig?.graphType === 'percentage' || p.filterConfig?.graphType === 'funnel' ||
                        p.graphType === 'percentage' || p.graphType === 'funnel'
                    );

                    // If special graph exists, don't show pie charts
                    if (isAnyPanelSpecial) {
                        return null;
                    }

                    // Process pie chart data - combine duplicates and filter out single-item charts
                    const platformData = pieChartData?.platform ? combinePieChartDuplicates(pieChartData.platform) : [];
                    const posData = pieChartData?.pos ? combinePieChartDuplicates(pieChartData.pos) : [];
                    const sourceData = pieChartData?.source ? combinePieChartDuplicates(pieChartData.source) : [];

                    const showPlatform = shouldShowPieChart(pieChartData?.platform);
                    const showPos = shouldShowPieChart(pieChartData?.pos);
                    const showSource = shouldShowPieChart(pieChartData?.source);

                    const visibleCount = [showPlatform, showPos, showSource].filter(Boolean).length;

                    // If no pie charts to show, return null
                    if (visibleCount === 0) return null;

                    // Dynamic grid class based on visible charts
                    const gridClass = visibleCount === 1
                        ? "grid-cols-1 max-w-md mx-auto"
                        : visibleCount === 2
                            ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                            : "grid-cols-1 md:grid-cols-3";

                    return (
                        <div className={cn("grid gap-3 md:gap-4", gridClass)}>
                            {/* Platform Distribution */}
                            {showPlatform && (
                                <div>
                                    <Card className="border border-indigo-200/60 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-500/5 dark:to-violet-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                                                        <Activity className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">Platform</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                                                        {platformData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                                        onClick={() => openExpandedPie('platform', 'Platform', platformData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={platformData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {platformData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`platform-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={platformData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="Platform"
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* POS Distribution */}
                            {showPos && (
                                <div>
                                    <Card className="border border-emerald-200/60 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-500/5 dark:to-teal-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                                                        <Target className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">POS</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                        {posData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                                        onClick={() => openExpandedPie('pos', 'POS', posData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={posData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {posData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`pos-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={posData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="POS"
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Source Distribution */}
                            {showSource && (
                                <div>
                                    <Card className="border border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-500/5 dark:to-orange-500/5 overflow-hidden group rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                                                        <Zap className="h-4 w-4 text-white" />
                                                    </div>
                                                    <CardTitle className="text-sm font-semibold text-foreground">Source</CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                        {sourceData.length} types
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                                                        onClick={() => openExpandedPie('source', 'Source', sourceData)}
                                                    >
                                                        <Maximize2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={sourceData}
                                                            cx="50%"
                                                            cy="45%"
                                                            innerRadius={35}
                                                            outerRadius={65}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            strokeWidth={2}
                                                            stroke="#fff"
                                                            isAnimationActive={false}
                                                            animationDuration={0}
                                                        >
                                                            {sourceData.map((_: any, index: number) => (
                                                                <Cell
                                                                    key={`source-cell-${index}`}
                                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            content={<PieTooltip
                                                                totalValue={sourceData.reduce((acc: number, item: any) => acc + item.value, 0)}
                                                                category="Source"
                                                            />}
                                                        />
                                                        <Legend
                                                            iconType="circle"
                                                            iconSize={8}
                                                            layout="horizontal"
                                                            verticalAlign="bottom"
                                                            wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Hourly Stats Card - shown below Pie Charts for ≤8 day ranges when enabled */}
                {isHourly && graphData.length > 0 && (profile?.panels?.[0] as any)?.filterConfig?.showHourlyStats !== false && !isFirstPanelSpecialGraph && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <HourlyStatsCard graphData={graphData} isHourly={isHourly} eventKeys={eventKeys} events={events} />
                    </motion.div>
                )}

                {/* Additional Panels (if profile has more than one panel) */}
                {/* Render additional panels normally - each panel will check if it's a special graph */}
                {profile.panels.length > 1 && (() => {
                    // Helper function to apply API filtering to panel data
                    const applyApiFiltering = (rawData: any[], panelConfig: any, filters: any, eventKeys: any[], filterType: 'percentage' | 'regular' = 'percentage') => {
                        if (!panelConfig?.isApiEvent) return rawData;

                        // If the dataset is already API-aggregated into series like `status_200_*` / `cache_dynamic_*`,
                        // do NOT run the status/cache filtering logic below (it expects per-event keys and will zero out series).
                        const isAlreadyAggregated = (eventKeys || []).some((ek: any) => {
                            const k = ek?.eventKey;
                            return typeof k === 'string' && (k.startsWith('status_') || k.startsWith('cache_'));
                        });
                        if (isAlreadyAggregated) return rawData;
                        
                        // Use different filter keys based on the filter type
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
                            
                            // Filter each event key's data based on status/cache filters
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
                    
                    return profile.panels.slice(1).map((panel, panelIndex) => {
                        const panelData = panelsDataMap.get(panel.panelId);
                        const rawPanelGraphData = panelData?.graphData || [];
                        const pEventKeys = panelData?.eventKeys || [];
                        const pPieData = panelData?.pieChartData;
                        // Use the editable panel filter state (falls back to panelData.filters)
                        const currentPanelFilters = panelFiltersState[panel.panelId] || panelData?.filters || {
                            events: [],
                            platforms: [],
                            pos: [],
                            sources: []
                        };
                        const currentPanelDateRange = panelDateRanges[panel.panelId] || dateRange;
                        const isPanelLoading = panelLoading[panel.panelId] || false;
                        const panelConfig = (panel as any)?.filterConfig;
                        const panelGraphType = panelConfig?.graphType || 'line';
                        
                        // Apply API filtering to additional panel data if this is an API panel
                        const filteredGraphData = applyApiFiltering(
                            rawPanelGraphData,
                            panelConfig,
                            currentPanelFilters,
                            pEventKeys,
                            panelGraphType === 'percentage' || panelGraphType === 'funnel' ? 'percentage' : 'regular'
                        );

                    // Calculate totals for this panel (using event keys if available)
                    let pTotalCount = 0;
                    let pTotalSuccess = 0;
                    let pTotalFail = 0;

                    // Skip stats card display for percentage and funnel graphs
                    if (panelGraphType !== 'percentage' && panelGraphType !== 'funnel') {
                        // Standard Logic - only for regular line/bar charts
                        pTotalCount = filteredGraphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
                        pTotalSuccess = filteredGraphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
                        pTotalFail = filteredGraphData.reduce((sum: number, d: any) => sum + (d.failCount || 0), 0);
                    }

                    // Dropdown options for this panel's filters (with isError/isAvg badges)
                    // For API events, show only API events (isApiEvent === true)
                    // For regular events, show only non-API events (isApiEvent !== true)
                    const pEventOptions = events
                        .filter(e => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                        .map(e => {
                            let label = e.isApiEvent && e.host && e.url
                                ? `${e.host} - ${e.url}`  // API events show host/url
                                : e.eventName;             // Regular events show eventName
                            const tags: string[] = [];
                            if (e.isErrorEvent === 1) tags.push('[isError]');
                            if (e.isAvgEvent === 1) tags.push('[isAvg]');
                            if (tags.length > 0) {
                                label = `${e.eventName} ${tags.join(' ')}`;
                            }
                            return {
                                value: e.eventId,
                                label,
                                isErrorEvent: e.isErrorEvent === 1,
                                isAvgEvent: e.isAvgEvent === 1
                            };
                        });
                    const pPlatformOptions = PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name }));
                    const pPosOptions = siteDetails.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.id})` }));
                    const pSourceOptions = SOURCES.map(s => ({ value: s.id.toString(), label: s.name }));

                    // Panel date range isHourly calculation
                    const pIsHourly = Math.ceil((currentPanelDateRange.to.getTime() - currentPanelDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 7;

                    return (
                        <motion.div
                            key={panel.panelId}
                            ref={(el) => { panelRefs.current[panel.panelId] = el; }}
                            id={`panel-${panel.panelId}`}
                            className="space-y-6 scroll-mt-20"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 * (panelIndex + 1) }}
                        >
                            {/* Panel Separator with visual distinction */}
                            <div className="relative py-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-4 border-dashed border-gradient-to-r from-purple-300 via-fuchsia-400 to-pink-300 dark:from-purple-600 dark:via-fuchsia-500 dark:to-pink-500" />
                                </div>
                                <div className="relative flex justify-center">
                                    <motion.div
                                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 rounded-full shadow-lg"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <span className="text-white font-bold text-sm flex items-center gap-2">
                                            <Layers className="w-4 h-4" />
                                            {panelConfig?.isApiEvent && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/30 backdrop-blur-sm border border-white/50">
                                                    API
                                                </span>
                                            )}
                                            Panel {panelIndex + 2}: {panel.panelName}
                                        </span>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Panel Header Card with Filters */}
                            <Card className="border border-purple-200/60 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-900/20 dark:to-fuchsia-900/10 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg"
                                                whileHover={{ rotate: 10 }}
                                            >
                                                {panelGraphType === 'bar' ? (
                                                    <BarChart3 className="h-6 w-6 text-white" />
                                                ) : (
                                                    <TrendingUp className="h-6 w-6 text-white" />
                                                )}
                                            </motion.div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">{panel.panelName}</h2>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    {/* API Event Indicator Badge */}
                                                    {panelConfig?.isApiEvent && (
                                                        <>
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-md">
                                                                API
                                                            </span>
                                                            <span className="text-muted-foreground">•</span>
                                                        </>
                                                    )}
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                                        panelGraphType === 'bar'
                                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                            : panelGraphType === 'percentage'
                                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                                                : panelGraphType === 'funnel'
                                                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                                                    : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                    )}>
                                                        {panelGraphType === 'bar' ? 'Bar Chart'
                                                            : panelGraphType === 'percentage' ? 'Percentage Analysis'
                                                                : panelGraphType === 'funnel' ? 'Funnel Analysis'
                                                                    : 'Line Chart'}
                                                    </span>
                                                    <span className="text-muted-foreground">•</span>
                                                    <span>{pEventKeys.length} events tracked</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <motion.div
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                    {pTotalCount.toLocaleString()} total
                                                </span>
                                            </motion.div>
                                            <motion.div
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
                                                whileHover={{ scale: 1.05 }}
                                            >
                                                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                                    {pTotalCount > 0 ? ((pTotalSuccess / pTotalCount) * 100).toFixed(1) : 0}% success
                                                </span>
                                            </motion.div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {/* Panel-specific Interactive Filters */}
                                    <div className="p-3 sm:p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-purple-100 dark:border-purple-500/20">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">Panel Filters</span>
                                                <span className="text-xs text-muted-foreground hidden sm:inline">(Independent from dashboard)</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPanelFiltersCollapsed(prev => ({ ...prev, [panel.panelId]: !prev[panel.panelId] }))}
                                                    className="h-6 w-6 p-0 ml-2"
                                                >
                                                    {panelFiltersCollapsed[panel.panelId] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            {!panelFiltersCollapsed[panel.panelId] && (
                                                <div>
                                                    <InteractiveButton
                                                        onClick={() => handlePanelRefresh(panel.panelId)}
                                                        disabled={isPanelLoading}
                                                        size="sm"
                                                        className={cn(
                                                            "relative transition-all duration-300 shadow-md font-semibold min-h-[44px] w-full sm:w-auto",
                                                            panelFilterChanges[panel.panelId]
                                                                ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/40 border-2 border-red-300"
                                                                : "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white"
                                                        )}
                                                        loading={isPanelLoading}
                                                    >
                                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                                        {panelFilterChanges[panel.panelId] ? "⚡ APPLY FILTERS" : "Refresh Alerts"}
                                                        {panelFilterChanges[panel.panelId] && (
                                                            <motion.div
                                                                className="absolute -top-2 -right-2 w-4 h-4 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                                                animate={{ scale: [1, 1.3, 1] }}
                                                                transition={{ duration: 0.8, repeat: 2 }}
                                                            >
                                                                !
                                                            </motion.div>
                                                        )}
                                                    </InteractiveButton>
                                                </div>
                                            )}
                                        </div>

                                        {!panelFiltersCollapsed[panel.panelId] && (
                                            <>
                                                {/* Date Range Picker for Panel */}
                                                <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30">
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
                                                                    updatePanelDateRange(panel.panelId, newFrom, currentPanelDateRange.to);
                                                                }}
                                                                className="flex-1 sm:flex-initial px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 min-h-[44px]"
                                                            />
                                                            <span className="text-gray-500 text-sm">to</span>
                                                            <input
                                                                type="date"
                                                                value={currentPanelDateRange.to.toISOString().split('T')[0]}
                                                                onChange={(e) => {
                                                                    const newTo = new Date(e.target.value);
                                                                    updatePanelDateRange(panel.panelId, currentPanelDateRange.from, newTo);
                                                                }}
                                                                className="flex-1 sm:flex-initial px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 min-h-[44px]"
                                                            />
                                                        </div>
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded-full",
                                                            pIsHourly
                                                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                        )}>
                                                            {pIsHourly ? 'Hourly' : 'Daily'} data
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Filter Dropdowns Grid */}
                                                {/* Special UI for Percentage and Funnel Graphs */}
                                                {(() => {

                                                    return null;
                                                })()}
                                                {panelGraphType === 'percentage' && panelConfig?.percentageConfig ? (
                                                    <div className="space-y-4">
                                                        <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/10 rounded-lg border-2 border-purple-300 dark:border-purple-500/30">
                                                            <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                                                                <Percent className="h-4 w-4" />
                                                                Percentage Graph - Event Selection
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                {/* Parent Events (Denominator) - Dropdown like main panel */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                            Parent Events (Denominator)
                                                                        </label>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-100 dark:border-purple-900/30 shadow-sm">
                                                                        <MultiSelectDropdown
                                                                            options={events
                                                                                .filter(e => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                .map(e => ({
                                                                                    value: String(e.eventId),
                                                                                    label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                                    color: e.color
                                                                                }))}
                                                                            selected={currentPanelFilters.activePercentageEvents || panelConfig.percentageConfig.parentEvents}
                                                                            onChange={(selected) => {
                                                                                setPanelFiltersState(prev => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        ...prev[panel.panelId],
                                                                                        activePercentageEvents: selected
                                                                                    }
                                                                                }));
                                                                                setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                            }}
                                                                            placeholder="Select Parent Events"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Child Events (Numerator) - Dropdown like main panel */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                            Child Events (Numerator)
                                                                        </label>
                                                                    </div>
                                                                    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-green-100 dark:border-green-900/30 shadow-sm">
                                                                        <MultiSelectDropdown
                                                                            options={events
                                                                                .filter(e => panelConfig?.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                .map(e => ({
                                                                                    value: String(e.eventId),
                                                                                    label: e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName,
                                                                                    color: e.color
                                                                                }))}
                                                                            selected={currentPanelFilters.activePercentageChildEvents || panelConfig.percentageConfig.childEvents}
                                                                            onChange={(selected) => {
                                                                                setPanelFiltersState(prev => ({
                                                                                    ...prev,
                                                                                    [panel.panelId]: {
                                                                                        ...prev[panel.panelId],
                                                                                        activePercentageChildEvents: selected
                                                                                    }
                                                                                }));
                                                                                setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
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

                                                        {/* Status & Cache Filters for API Percentage Graphs */}
                                                        {panelConfig?.isApiEvent && (
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
                                                                            {/* Show 2xx and 3xx individually, group only 4xx and 5xx */}
                                                                            {(() => {
                                                                                const panelStatusCodes = panelAvailableStatusCodes[panel.panelId] || [];
                                                                                const codes2xx = panelStatusCodes.filter(c => c.startsWith('2'));
                                                                                const codes3xx = panelStatusCodes.filter(c => c.startsWith('3'));
                                                                                const codes4xx = panelStatusCodes.filter(c => c.startsWith('4'));
                                                                                const codes5xx = panelStatusCodes.filter(c => c.startsWith('5'));
                                                                                const codesOther = panelStatusCodes.filter(c => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5'));
                                                                                
                                                                                // Build grouped options - 2xx and 3xx shown individually, 4xx and 5xx grouped
                                                                                const groupedOptions: Array<{ label: string; value: string }> = [];
                                                                                // Show 2xx codes individually
                                                                                codes2xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                // Show 3xx codes individually
                                                                                codes3xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                // Group 4xx codes with actual codes listed
                                                                                if (codes4xx.length > 0) {
                                                                                    groupedOptions.push({ label: `4xx Group (${codes4xx.join(', ')})`, value: '4xx_group' });
                                                                                }
                                                                                // Group 5xx codes with actual codes listed
                                                                                if (codes5xx.length > 0) {
                                                                                    groupedOptions.push({ label: `5xx Group (${codes5xx.join(', ')})`, value: '5xx_group' });
                                                                                }
                                                                                codesOther.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                
                                                                                return (
                                                                                    <>
                                                                                        <MultiSelectDropdown
                                                                                            options={groupedOptions}
                                                                                            selected={(() => {
                                                                                                const panelSelected = currentPanelFilters.percentageStatusCodes || [];
                                                                                                const s = new Set<string>(panelSelected);
                                                                                                if (codes4xx.length > 0 && codes4xx.every(c => s.has(c))) s.add('4xx_group');
                                                                                                if (codes5xx.length > 0 && codes5xx.every(c => s.has(c))) s.add('5xx_group');
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

                                                                                                setPanelFiltersState(prev => ({
                                                                                                    ...prev,
                                                                                                    [panel.panelId]: {
                                                                                                        ...prev[panel.panelId],
                                                                                                        percentageStatusCodes: nextValues
                                                                                                    }
                                                                                                }));
                                                                                                setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                                            }}
                                                                                            placeholder={panelStatusCodes.length > 0 ? "Select status codes" : "Loading..."}
                                                                                            disabled={panelStatusCodes.length === 0}
                                                                                        />
                                                                                        {panelStatusCodes.length === 0 && (
                                                                                            <p className="text-xs text-muted-foreground">Loading status codes...</p>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                                            <MultiSelectDropdown
                                                                                options={(panelAvailableCacheStatuses[panel.panelId] || []).map(cache => ({ label: cache, value: cache }))}
                                                                                selected={currentPanelFilters.percentageCacheStatus || []}
                                                                                onChange={(values) => {
                                                                                    const availableCache = panelAvailableCacheStatuses[panel.panelId] || [];
                                                                                    const defaultCache = availableCache.length > 0 ? [...availableCache] : [];
                                                                                    const nextValues = values.length === 0 ? [...defaultCache] : Array.from(new Set(values));

                                                                                    setPanelFiltersState(prev => ({
                                                                                        ...prev,
                                                                                        [panel.panelId]: {
                                                                                            ...prev[panel.panelId],
                                                                                            percentageCacheStatus: nextValues
                                                                                        }
                                                                                    }));
                                                                                    setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                                }}
                                                                                placeholder={(panelAvailableCacheStatuses[panel.panelId] || []).length > 0 ? "Select cache statuses" : "Loading..."}
                                                                                disabled={(panelAvailableCacheStatuses[panel.panelId] || []).length === 0}
                                                                            />
                                                                            {(panelAvailableCacheStatuses[panel.panelId] || []).length === 0 && (
                                                                                <p className="text-xs text-muted-foreground">Loading cache statuses...</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Platform, POS, Source filters for percentage graph (non-API) */}
                                                        {!panelConfig?.isApiEvent && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</label>
                                                                    <MultiSelectDropdown
                                                                        options={pPlatformOptions}
                                                                        selected={currentPanelFilters.platforms.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'platforms', numericValues);
                                                                        }}
                                                                        placeholder="Select platforms"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</label>
                                                                    <MultiSelectDropdown
                                                                        options={pPosOptions}
                                                                        selected={currentPanelFilters.pos.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'pos', numericValues);
                                                                        }}
                                                                        placeholder="Select POS"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</label>
                                                                    <MultiSelectDropdown
                                                                        options={pSourceOptions}
                                                                        selected={currentPanelFilters.sources.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'sources', numericValues);
                                                                        }}
                                                                        placeholder="Select sources"
                                                                    />
                                                                </div>
                                                            </div>
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

                                                            {/* Funnel Stages - Individual Dropdowns like main panel */}
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
                                                                                        setPanelFiltersState(prev => ({
                                                                                            ...prev,
                                                                                            [panel.panelId]: {
                                                                                                ...prev[panel.panelId],
                                                                                                activeStages: base
                                                                                            }
                                                                                        }));
                                                                                        setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                                    }}
                                                                                >
                                                                                    <option value="">Select event</option>
                                                                                    {events
                                                                                        .filter(ev => panelConfig?.isApiEvent ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                                        .map(ev => (
                                                                                        <option key={ev.eventId} value={ev.eventId}>
                                                                                            {ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-[11px] text-red-500 hover:text-red-700 px-1 disabled:opacity-40"
                                                                                    disabled={(activeStageIds.length || defaultStageIds.length) <= 1}
                                                                                    onClick={() => {
                                                                                        const base = (activeStageIds && activeStageIds.length > 0 ? [...activeStageIds] : [...defaultStageIds]);
                                                                                        const next = base.filter((_, i) => i !== idx);
                                                                                        setPanelFiltersState(prev => ({
                                                                                            ...prev,
                                                                                            [panel.panelId]: {
                                                                                                ...prev[panel.panelId],
                                                                                                activeStages: next
                                                                                            }
                                                                                        }));
                                                                                        setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
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
                                                                            setPanelFiltersState(prev => ({
                                                                                ...prev,
                                                                                [panel.panelId]: {
                                                                                    ...prev[panel.panelId],
                                                                                    activeStages: next
                                                                                }
                                                                            }));
                                                                            setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                        }}
                                                                    >
                                                                        + Add Stage
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Final Stage (Multiple Events) - Multi-Select like main panel */}
                                                            {panelConfig.funnelConfig.multipleChildEvents && panelConfig.funnelConfig.multipleChildEvents.length > 0 && (
                                                                <div className="mt-4 space-y-2">
                                                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                                        Final Stage (Multiple Events)
                                                                    </label>
                                                                    <MultiSelectDropdown
                                                                        options={events
                                                                            .filter(ev => panelConfig?.isApiEvent ? ev.isApiEvent === true : ev.isApiEvent !== true)
                                                                            .map(ev => ({ 
                                                                                value: String(ev.eventId), 
                                                                                label: ev.isApiEvent && ev.host && ev.url ? `${ev.host} - ${ev.url}` : ev.eventName 
                                                                            }))}
                                                                        selected={currentPanelFilters.activeFunnelChildEvents || panelConfig.funnelConfig.multipleChildEvents}
                                                                        onChange={(values) => {
                                                                            setPanelFiltersState(prev => ({
                                                                                ...prev,
                                                                                [panel.panelId]: {
                                                                                    ...prev[panel.panelId],
                                                                                    activeFunnelChildEvents: values
                                                                                }
                                                                            }));
                                                                            setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                        }}
                                                                        placeholder="Select final stage events"
                                                                    />
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                        These events will be shown with different colors in the final bar
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* API Filters for Funnel (Status & Cache) */}
                                                        {panelConfig?.isApiEvent && (
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
                                                                            {/* Show 2xx and 3xx individually, group only 4xx and 5xx */}
                                                                            {(() => {
                                                                                const panelStatusCodes = panelAvailableStatusCodes[panel.panelId] || [];
                                                                                const codes2xx = panelStatusCodes.filter(c => c.startsWith('2'));
                                                                                const codes3xx = panelStatusCodes.filter(c => c.startsWith('3'));
                                                                                const codes4xx = panelStatusCodes.filter(c => c.startsWith('4'));
                                                                                const codes5xx = panelStatusCodes.filter(c => c.startsWith('5'));
                                                                                const codesOther = panelStatusCodes.filter(c => !c.startsWith('2') && !c.startsWith('3') && !c.startsWith('4') && !c.startsWith('5'));
                                                                                
                                                                                // Build grouped options - 2xx and 3xx shown individually, 4xx and 5xx grouped
                                                                                const groupedOptions: Array<{ label: string; value: string }> = [];
                                                                                // Show 2xx codes individually
                                                                                codes2xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                // Show 3xx codes individually
                                                                                codes3xx.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                // Group 4xx codes with actual codes listed
                                                                                if (codes4xx.length > 0) {
                                                                                    groupedOptions.push({ label: `4xx Group (${codes4xx.join(', ')})`, value: '4xx_group' });
                                                                                }
                                                                                // Group 5xx codes with actual codes listed
                                                                                if (codes5xx.length > 0) {
                                                                                    groupedOptions.push({ label: `5xx Group (${codes5xx.join(', ')})`, value: '5xx_group' });
                                                                                }
                                                                                codesOther.forEach(c => groupedOptions.push({ label: c, value: c }));
                                                                                
                                                                                return (
                                                                                    <>
                                                                                        <MultiSelectDropdown
                                                                                            options={groupedOptions}
                                                                                            selected={currentPanelFilters.percentageStatusCodes || []}
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

                                                                                                setPanelFiltersState(prev => ({
                                                                                                    ...prev,
                                                                                                    [panel.panelId]: {
                                                                                                        ...prev[panel.panelId],
                                                                                                        percentageStatusCodes: nextValues
                                                                                                    }
                                                                                                }));
                                                                                                setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                                            }}
                                                                                            placeholder={panelStatusCodes.length > 0 ? "Select status codes" : "Loading..."}
                                                                                            disabled={panelStatusCodes.length === 0}
                                                                                        />
                                                                                        {panelStatusCodes.length === 0 && (
                                                                                            <p className="text-xs text-muted-foreground">Loading status codes...</p>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Cache Status</label>
                                                                            <MultiSelectDropdown
                                                                                options={(panelAvailableCacheStatuses[panel.panelId] || []).map(cache => ({ label: cache, value: cache }))}
                                                                                selected={currentPanelFilters.percentageCacheStatus || []}
                                                                                onChange={(values) => {
                                                                                    const availableCache = panelAvailableCacheStatuses[panel.panelId] || [];
                                                                                    const defaultCache = availableCache.length > 0 ? [...availableCache] : [];
                                                                                    const nextValues = values.length === 0 ? [...defaultCache] : Array.from(new Set(values));

                                                                                    setPanelFiltersState(prev => ({
                                                                                        ...prev,
                                                                                        [panel.panelId]: {
                                                                                            ...prev[panel.panelId],
                                                                                            percentageCacheStatus: nextValues
                                                                                        }
                                                                                    }));
                                                                                    setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
                                                                                }}
                                                                                placeholder={(panelAvailableCacheStatuses[panel.panelId] || []).length > 0 ? "Select cache statuses" : "Loading..."}
                                                                                disabled={(panelAvailableCacheStatuses[panel.panelId] || []).length === 0}
                                                                            />
                                                                            {(panelAvailableCacheStatuses[panel.panelId] || []).length === 0 && (
                                                                                <p className="text-xs text-muted-foreground">Loading cache statuses...</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Platform, POS, Source filters for funnel graph (non-API only) */}
                                                        {!panelConfig?.isApiEvent && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</label>
                                                                <MultiSelectDropdown
                                                                    options={pPlatformOptions}
                                                                    selected={currentPanelFilters.platforms.map(id => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter(panel.panelId, 'platforms', numericValues);
                                                                    }}
                                                                    placeholder="Select platforms"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</label>
                                                                <MultiSelectDropdown
                                                                    options={pPosOptions}
                                                                    selected={currentPanelFilters.pos.map(id => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter(panel.panelId, 'pos', numericValues);
                                                                    }}
                                                                    placeholder="Select POS"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</label>
                                                                <MultiSelectDropdown
                                                                    options={pSourceOptions}
                                                                    selected={currentPanelFilters.sources.map(id => id.toString())}
                                                                    onChange={(values) => {
                                                                        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                        updatePanelFilter(panel.panelId, 'sources', numericValues);
                                                                    }}
                                                                    placeholder="Select sources"
                                                                />
                                                            </div>
                                                        </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Regular Graph Filters */
                                                    <div className={cn(
                                                        "grid gap-3 sm:gap-4",
                                                        panelConfig?.isApiEvent
                                                            ? "grid-cols-1" // API events: only show Events dropdown
                                                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" // Regular events: show all 4 dropdowns
                                                    )}>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                                                {panelConfig?.isApiEvent ? 'API Events (Host / URL)' : 'Events'}
                                                            </label>
                                                            <MultiSelectDropdown
                                                                options={pEventOptions}
                                                                selected={currentPanelFilters.events.map(id => id.toString())}
                                                                onChange={(values) => {
                                                                    const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                    updatePanelFilter(panel.panelId, 'events', numericValues);
                                                                }}
                                                                placeholder={panelConfig?.isApiEvent ? "Select API events" : "Select events"}
                                                            />
                                                            {/* Show callUrl reference for API events */}
                                                            {panelConfig?.isApiEvent && currentPanelFilters.events.length > 0 && (() => {
                                                                const selectedEvent = events.find(e => e.eventId === currentPanelFilters.events[0]?.toString());
                                                                return selectedEvent?.callUrl ? (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Call URL: <code className="px-1 bg-purple-100 dark:bg-purple-900/30 rounded">{selectedEvent.callUrl}</code>
                                                                    </p>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                        {/* Only show Platform/POS/Source for non-API events */}
                                                        {!panelConfig?.isApiEvent && (
                                                            <>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Platforms</label>
                                                                    <MultiSelectDropdown
                                                                        options={pPlatformOptions}
                                                                        selected={currentPanelFilters.platforms.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'platforms', numericValues);
                                                                        }}
                                                                        placeholder="Select platforms"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">POS</label>
                                                                    <MultiSelectDropdown
                                                                        options={pPosOptions}
                                                                        selected={currentPanelFilters.pos.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'pos', numericValues);
                                                                        }}
                                                                        placeholder="Select POS"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Sources</label>
                                                                    <MultiSelectDropdown
                                                                        options={pSourceOptions}
                                                                        selected={currentPanelFilters.sources.map(id => id.toString())}
                                                                        onChange={(values) => {
                                                                            const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                                            updatePanelFilter(panel.panelId, 'sources', numericValues);
                                                                        }}
                                                                        placeholder="Select sources"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {/* API Events Info Banner + Filters */}
                                                {panelConfig?.isApiEvent && panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (() => {
                                                    // Derive available status codes and cache statuses from raw data
                                                    const rawData = panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || [];
                                                    const statusSet = new Set<string>();
                                                    const cacheSet = new Set<string>();

                                                    rawData.forEach((record: any) => {
                                                        // Direct field extraction (API response format)
                                                        if (record.status !== undefined && record.status !== null) {
                                                            statusSet.add(String(record.status));
                                                        }
                                                        if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                                            cacheSet.add(record.cacheStatus);
                                                        }
                                                        
                                                        // Also check key patterns for processed data format
                                                        Object.keys(record).forEach(key => {
                                                            const statusMatch = key.match(/_status_(\d+)_/);
                                                            const cacheMatch = key.match(/_cache_([^_]+)_/);
                                                            if (statusMatch) statusSet.add(statusMatch[1]);
                                                            if (cacheMatch) cacheSet.add(cacheMatch[1]);
                                                        });
                                                    });

                                                    const availableStatus = Array.from(statusSet).sort((a, b) => parseInt(a) - parseInt(b));
                                                    const availableCache = Array.from(cacheSet).sort();

                                                    // Initialize defaults if not set
                                                    if (!currentPanelFilters.apiStatusCodes && availableStatus.length > 0) {
                                                        const defaultStatus = availableStatus.includes('200') ? ['200'] : availableStatus;
                                                        setPanelFiltersState(prev => ({
                                                            ...prev,
                                                            [panel.panelId]: {
                                                                ...prev[panel.panelId],
                                                                apiStatusCodes: defaultStatus
                                                            }
                                                        }));
                                                    }
                                                    if (!currentPanelFilters.apiCacheStatus && availableCache.length > 0) {
                                                        setPanelFiltersState(prev => ({
                                                            ...prev,
                                                            [panel.panelId]: {
                                                                ...prev[panel.panelId],
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
                                                                    <span className="font-semibold text-purple-600 dark:text-purple-400">API Events:</span> Data grouped by <code className="px-1 bg-white dark:bg-gray-800 rounded">status</code> codes and <code className="px-1 bg-white dark:bg-gray-800 rounded">cacheStatus</code>. Metrics include response time, bytes transferred, and error rates.
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
                                                                                        setPanelFiltersState(prev => ({
                                                                                            ...prev,
                                                                                            [panel.panelId]: {
                                                                                                ...prev[panel.panelId],
                                                                                                apiStatusCodes: values
                                                                                            }
                                                                                        }));
                                                                                        setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
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
                                                                                        setPanelFiltersState(prev => ({
                                                                                            ...prev,
                                                                                            [panel.panelId]: {
                                                                                                ...prev[panel.panelId],
                                                                                                apiCacheStatus: values
                                                                                            }
                                                                                        }));
                                                                                        setPanelFilterChanges(prev => ({ ...prev, [panel.panelId]: true }));
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
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Panel Stats - Hide for percentage and funnel graphs */}
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

                            {/* Separate event keys by type for this panel */}
                            {
                                (() => {
                                    // Check if this panel is a special graph (percentage or funnel)
                                    if (panelGraphType === 'percentage' && panelConfig?.percentageConfig) {
                                        const eventColors = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {});
                                        const eventNames = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.eventName }), {});

                                        // Apply active filters
                                        const activeParentEvents = panelConfig.percentageConfig.parentEvents?.filter((id: string) =>
                                            !currentPanelFilters.activePercentageEvents || currentPanelFilters.activePercentageEvents.includes(id)
                                        ) || [];

                                        const activeChildEvents = panelConfig.percentageConfig.childEvents?.filter((id: string) =>
                                            !currentPanelFilters.activePercentageChildEvents || currentPanelFilters.activePercentageChildEvents.includes(id)
                                        ) || [];

                                        // Merge config filters with dashboard-level panel filters
                                        const mergedFilters = {
                                            ...(panelConfig.percentageConfig.filters || {}),
                                            statusCodes: currentPanelFilters.percentageStatusCodes || panelConfig.percentageConfig.filters?.statusCodes || [],
                                            cacheStatus: currentPanelFilters.percentageCacheStatus || panelConfig.percentageConfig.filters?.cacheStatus || []
                                        };

                                        const panelApiSeries = panelApiPerformanceSeriesMap[panel.panelId] || [];
                                        const panelMetricView = panelApiMetricView[panel.panelId] || 'timing';
                                        const apiEventIds = Array.from(new Set([...activeParentEvents, ...activeChildEvents].map(String)));
                                        const apiEventKeyInfos = apiEventIds.map((id) => {
                                            const ev = events.find(e => String(e.eventId) === String(id));
                                            const name = ev?.isApiEvent && ev?.host && ev?.url
                                                ? `${ev.host} - ${ev.url}`
                                                : (ev?.eventName || `Event ${id}`);
                                            return { eventId: String(id), eventName: name, eventKey: name.replace(/[^a-zA-Z0-9]/g, '_') };
                                        });

                                        return (
                                            <div className="space-y-6">
                                                <PercentageGraph
                                                    data={panelConfig?.isApiEvent
                                                        ? ((panelsDataMap.get(panel.panelId)?.rawGraphResponse?.data || []) as any[])
                                                        : filteredGraphData}
                                                    dateRange={currentPanelDateRange}
                                                    parentEvents={activeParentEvents}
                                                    childEvents={activeChildEvents}
                                                    eventColors={eventColors}
                                                    eventNames={eventNames}
                                                    filters={mergedFilters}
                                                    showCombinedPercentage={panelConfig.percentageConfig.showCombinedPercentage !== false}
                                                    isHourly={pIsHourly}
                                                />

                                                {panelConfig?.isApiEvent && apiEventKeyInfos.length > 0 && (
                                                    <Card className="border border-blue-200/60 dark:border-blue-500/30 overflow-hidden shadow-premium rounded-2xl">
                                                        <CardHeader className="pb-2 px-3 md:px-6">
                                                            <div className="flex items-center justify-between">
                                                                <CardTitle className="text-base md:text-lg">API Performance Metrics</CardTitle>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(['timing', 'timing-breakdown', 'timing-anomaly', 'bytes', 'bytes-in', 'count'] as const).map((tab) => (
                                                                        <button
                                                                            key={tab}
                                                                            onClick={() => setPanelApiMetricView(prev => ({ ...prev, [panel.panelId]: tab }))}
                                                                            className={cn(
                                                                                "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                                                                                panelMetricView === tab
                                                                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
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
                                                                {panelApiSeries.length > 0 ? (
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <AreaChart data={panelApiSeries} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                            <XAxis dataKey="date" tick={<CustomXAxisTick isHourly={pIsHourly} />} tickLine={false} height={45} interval={Math.max(0, Math.floor((panelApiSeries.length || 0) / 8))} />
                                                                            <YAxis
                                                                                tick={{ fill: '#3b82f6', fontSize: 11 }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                                tickFormatter={(value) => {
                                                                                    if (!value || value <= 0) return '0';
                                                                                    const isTimingView = panelMetricView?.startsWith('timing');
                                                                                    const isBytesView = panelMetricView?.startsWith('bytes');
                                                                                    if (isTimingView) {
                                                                                        return `${value.toFixed(0)}ms`;
                                                                                    }
                                                                                    if (isBytesView) {
                                                                                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}GB`;
                                                                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}MB`;
                                                                                        if (value >= 1000) return `${(value / 1000).toFixed(1)}KB`;
                                                                                        return `${value.toFixed(0)}B`;
                                                                                    }
                                                                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                                                    return value;
                                                                                }}
                                                                                label={{
                                                                                    value: panelMetricView?.startsWith('timing') ? 'Time (ms)' : panelMetricView?.startsWith('bytes') ? 'Data (bytes)' : 'Count',
                                                                                    angle: -90,
                                                                                    position: 'insideLeft',
                                                                                    style: { fill: '#3b82f6', fontSize: 10 }
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
                                                                                        <React.Fragment key={`pbreak_${panel.panelId}_${ek.eventKey}`}>
                                                                                            <Area type="monotone" dataKey={`${ek.eventKey}_avgServerToCloud`} name={`${ek.eventName} (Server)`} stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} />
                                                                                            <Area type="monotone" dataKey={`${ek.eventKey}_avgCloudToUser`} name={`${ek.eventName} (Network)`} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} stackId={ek.eventKey} isAnimationActive={false} />
                                                                                        </React.Fragment>
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
                                                                                        isAnimationActive={false}
                                                                                        animationDuration={0}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </AreaChart>
                                                                    </ResponsiveContainer>
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center text-muted-foreground">No API performance data</div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {panelConfig?.isApiEvent && (() => {
                                                    const apiData = (pPieData as any)?.data || pPieData;
                                                    const statusData = apiData?.status
                                                        ? Object.entries(apiData.status).map(([_, val]: [string, any]) => ({ name: `${val.status}`, value: val.count }))
                                                        : [];
                                                    const cacheStatusData = apiData?.cacheStatus
                                                        ? Object.entries(apiData.cacheStatus).map(([_, val]: [string, any]) => ({ name: val.cacheStatus || 'Unknown', value: val.count }))
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
                                                                                onClick={() => openExpandedPie('status', 'Status Codes', statusData)}
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
                                                                                onClick={() => openExpandedPie('cacheStatus', 'Cache Status', cacheStatusData)}
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

                                                {/* Note: Keep +1 panel pies as the original expandable pie charts (platform/pos/source). */}
                                            </div>
                                        );
                                    }

                                    if (panelGraphType === 'funnel' && panelConfig?.funnelConfig) {
                                        const eventColors = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {});
                                        const eventNames = events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.eventName }), {});

                                        // Filter stages based on activeStages
                                        const activeStages = panelConfig.funnelConfig.stages?.filter((s: any) =>
                                            !currentPanelFilters.activeStages || currentPanelFilters.activeStages.includes(s.eventId)
                                        ) || [];

                                        return (
                                            <FunnelGraph
                                                data={filteredGraphData}
                                                stages={activeStages}
                                                multipleChildEvents={panelConfig.funnelConfig.multipleChildEvents || []}
                                                eventColors={eventColors}
                                                eventNames={eventNames}
                                                filters={panelConfig?.isApiEvent ? {
                                                    statusCodes: currentPanelFilters.percentageStatusCodes || [],
                                                    cacheStatus: currentPanelFilters.percentageCacheStatus || []
                                                } : undefined}
                                            />
                                        );
                                    }

                                    // Regular graph rendering for non-special graphs
                                    // Events with BOTH isAvg and isError go to isAvg
                                    const pAvgEventKeys = pEventKeys.filter(ek => ek.isAvgEvent === 1);
                                    const pErrorEventKeys = pEventKeys.filter(ek => ek.isErrorEvent === 1 && ek.isAvgEvent !== 1);
                                    const pNormalEventKeys = pEventKeys.filter(ek => ek.isAvgEvent !== 1 && ek.isErrorEvent !== 1);

                                    // Apply API filtering to graph data if this is an API panel
                                    const apiFilteredGraphData = applyApiFiltering(filteredGraphData, panelConfig, currentPanelFilters, pEventKeys, 'regular');

                                    // Helper function to format delay for this panel (prepared for future use)
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const _formatPanelDelay = (value: number, _eventKeyInfo?: EventKeyInfo) => {
                                        if (!value || value <= 0) return '0';
                                        const eventConfig = events.find(e => String(e.eventId) === _eventKeyInfo?.eventId);
                                        const featureId = eventConfig?.feature;
                                        if (featureId === 1) {
                                            if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                            return `${value.toFixed(1)}m`;
                                        }
                                        if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                        return `${value.toFixed(1)}s`;
                                    };

                                    return (
                                        <>
                                            {/* Panel Chart - Normal Events (count) - Show when NOT in deviation mode */}
                                            {pNormalEventKeys.length > 0 && (panelChartType[panel.panelId] ?? 'deviation') !== 'deviation' && (
                                                <Card className="border border-violet-200/60 dark:border-violet-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-slate-900">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Activity className="w-4 h-4 text-purple-500" />
                                                                <CardTitle className="text-base font-semibold">
                                                                    Event Trends (Count)
                                                                </CardTitle>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">{pNormalEventKeys.length} events</span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-xs bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                                                    onClick={() => {
                                                                        setPanelChartType(prev => {
                                                                            const current = prev[panel.panelId] ?? 'default';
                                                                            return {
                                                                                ...prev,
                                                                                [panel.panelId]: current === 'deviation' ? 'default' : 'deviation',
                                                                            };
                                                                        });
                                                                    }}
                                                                >
                                                                    {(() => {
                                                                        const currentType = panelChartType[panel.panelId] ?? 'deviation';
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
                                                            isExpanded={panelLegendExpanded[panel.panelId] || false}
                                                            onToggle={() => togglePanelLegend(panel.panelId)}
                                                            maxVisibleItems={4}
                                                            graphData={filteredGraphData}
                                                            selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                            onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
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
                                                                                    setPanelPinnedTooltips(prev => ({
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
                                                                            {pNormalEventKeys.map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                return (
                                                                                    <linearGradient key={`normalGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`normalColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                                                                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                                                                    </linearGradient>
                                                                                );
                                                                            })}
                                                                        </defs>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                        <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(filteredGraphData.length / 6)} />
                                                                        <YAxis
                                                                            tick={{ fill: '#6b7280', fontSize: 10 }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                                        />
                                                                        <Tooltip content={<CustomTooltip events={events} eventKeys={pNormalEventKeys} />} cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                        {pNormalEventKeys
                                                                            .filter(ek => !panelSelectedEventKey[panel.panelId] || ek.eventKey === panelSelectedEventKey[panel.panelId])
                                                                            .map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                const countKey = `${eventKeyInfo.eventKey}_count`;
                                                                                const resolvedCountKey = (filteredGraphData || []).some((row: any) => row && Object.prototype.hasOwnProperty.call(row, countKey))
                                                                                    ? countKey
                                                                                    : eventKeyInfo.eventKey;
                                                                                return (
                                                                                    <Area
                                                                                        key={`normal_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                                        type="monotone"
                                                                                        dataKey={resolvedCountKey}
                                                                                        name={eventKeyInfo.eventName}
                                                                                        stroke={color}
                                                                                        strokeWidth={2.5}
                                                                                        fill={`url(#normalColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                                        dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                                        activeDot={{
                                                                                            r: 8,
                                                                                            fill: color,
                                                                                            stroke: '#fff',
                                                                                            strokeWidth: 3,
                                                                                            cursor: 'pointer',
                                                                                        }}
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

                                                    {/* Pinned Tooltip Modal for Panel Charts */}
                                                    {(() => {
                                                        const pinnedData = panelPinnedTooltips[panel.panelId];
                                                        if (!pinnedData) return null;

                                                        return (
                                                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                                <div
                                                                    className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                    onClick={() => setPanelPinnedTooltips(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[panel.panelId];
                                                                        return updated;
                                                                    })}
                                                                />
                                                                <div className="relative max-w-lg w-full">
                                                                    <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPanelPinnedTooltips(prev => {
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
                                                                                    payload={pNormalEventKeys.map((ek, idx) => {
                                                                                        const event = events.find(e => String(e.eventId) === ek.eventId);
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
                                                </Card>
                                            )}

                                            {/* 8-Day Overlay Comparison for Hourly Panel Data - Show in deviation mode (default) */}
                                            {pIsHourly && pNormalEventKeys.length > 0 && filteredGraphData.length > 0 && (panelChartType[panel.panelId] ?? 'deviation') === 'deviation' && (() => {
                                                // Calculate event stats for panel overlay badges
                                                const pEventStatsForBadges = pNormalEventKeys.map(eventKeyInfo => {
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

                                                // Filter events based on selected event (if any)
                                                const selectedEventKey = panelSelectedEventKey[panel.panelId];
                                                const filteredEventKeys = selectedEventKey
                                                    ? pNormalEventKeys.filter(e => e.eventKey === selectedEventKey).map(e => e.eventKey)
                                                    : pNormalEventKeys.map(e => e.eventKey);

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
                                                                        setPanelChartType(prev => ({
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
                                                                eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                eventStats={pEventStatsForBadges}
                                                                selectedEventKey={selectedEventKey}
                                                                onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })()}

                                            {/* Daily Overlay Comparison for Daily Panel Data - Show in deviation mode */}
                                            {!pIsHourly && pNormalEventKeys.length > 0 && filteredGraphData.length > 0 && (panelChartType[panel.panelId] ?? 'deviation') === 'deviation' && (() => {
                                                // Calculate event stats for panel overlay badges
                                                const pEventStatsForBadges = pNormalEventKeys.map(eventKeyInfo => {
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

                                                // Filter events based on selected event (if any)
                                                const selectedEventKey = panelSelectedEventKey[panel.panelId];
                                                const filteredEventKeys = selectedEventKey
                                                    ? pNormalEventKeys.filter(e => e.eventKey === selectedEventKey).map(e => e.eventKey)
                                                    : pNormalEventKeys.map(e => e.eventKey);

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
                                                                        setPanelChartType(prev => ({
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
                                                                eventColors={events.reduce((acc, e) => ({ ...acc, [e.eventId]: e.color }), {})}
                                                                eventStats={pEventStatsForBadges}
                                                                selectedEventKey={selectedEventKey}
                                                                onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })()}

                                            {/* Panel Chart - isAvg Events (Time Delay) */}
                                            {/* Show combined or separate based on panel.type */}
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
                                                            isExpanded={panelLegendExpanded[`${panel.panelId}_avg`] || false}
                                                            onToggle={() => togglePanelLegend(`${panel.panelId}_avg`)}
                                                            maxVisibleItems={4}
                                                            graphData={filteredGraphData}
                                                            selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                            onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
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
                                                                                    setPanelPinnedTooltips(prev => ({
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
                                                                            {pAvgEventKeys.map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                return (
                                                                                    <linearGradient key={`avgGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`avgColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
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
                                                                                const hasPriceAlert = pAvgEventKeys.some(ek => {
                                                                                    const ev = events.find(e => String(e.eventId) === ek.eventId);
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
                                                                            .filter(ek => !panelSelectedEventKey[panel.panelId] || ek.eventKey === panelSelectedEventKey[panel.panelId])
                                                                            .map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                                return (
                                                                                    <Area
                                                                                        key={`avg_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                                        type="monotone"
                                                                                        dataKey={`${eventKeyInfo.eventKey}_avgDelay`}
                                                                                        name={eventKeyInfo.eventName}
                                                                                        stroke={color}
                                                                                        strokeWidth={2.5}
                                                                                        fill={`url(#avgColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                                        dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                                        activeDot={{
                                                                                            r: 8,
                                                                                            fill: color,
                                                                                            stroke: '#fff',
                                                                                            strokeWidth: 3,
                                                                                            cursor: 'pointer',
                                                                                        }}
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

                                                    {/* Pinned Tooltip Modal for Avg/Time Delay Charts */}
                                                    {(() => {
                                                        const pinnedData = panelPinnedTooltips[`${panel.panelId}_avg`];
                                                        if (!pinnedData) return null;

                                                        return (
                                                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                                <div
                                                                    className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                    onClick={() => setPanelPinnedTooltips(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[`${panel.panelId}_avg`];
                                                                        return updated;
                                                                    })}
                                                                />
                                                                <div className="relative max-w-lg w-full">
                                                                    <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPanelPinnedTooltips(prev => {
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
                                                                                    payload={pAvgEventKeys.map((ek, idx) => {
                                                                                        const event = events.find(e => String(e.eventId) === ek.eventId);
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
                                                </Card>
                                            )}

                                            {/* Panel Charts - Separate isAvg Events (one chart per event) */}
                                            {pAvgEventKeys.length > 0 && panel.type === 'separate' && pAvgEventKeys.map((avgEventKeyInfo, avgIdx) => {
                                                const avgEvent = events.find(e => String(e.eventId) === avgEventKeyInfo.eventId);
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
                                                                        <AreaChart
                                                                            data={filteredGraphData}
                                                                            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                        >
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
                                                                                    if (featureId === 1) {
                                                                                        if (value >= 60) return `${(value / 60).toFixed(1)}h`;
                                                                                        return `${value.toFixed(1)}m`;
                                                                                    }
                                                                                    if (value >= 60) return `${(value / 60).toFixed(1)}m`;
                                                                                    return `${value.toFixed(1)}s`;
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
                                                                                activeDot={{
                                                                                    r: 8,
                                                                                    fill: avgColor,
                                                                                    stroke: '#fff',
                                                                                    strokeWidth: 3
                                                                                }}
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

                                            {/* Panel Chart - isError Events (Error Tracking) */}
                                            {/* Show combined or separate based on panel.type */}
                                            {pErrorEventKeys.length > 0 && panel.type === 'combined' && (
                                                <Card className="border border-red-200/60 dark:border-red-500/30 rounded-2xl shadow-premium hover:shadow-card-hover transition-all duration-300">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                                <CardTitle className="text-base font-semibold">Error Event Trends (Combined)</CardTitle>
                                                            </div>
                                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">isError Events</span>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <CollapsibleLegend
                                                            eventKeys={pErrorEventKeys}
                                                            events={events}
                                                            isExpanded={panelLegendExpanded[`${panel.panelId}_error`] || false}
                                                            onToggle={() => togglePanelLegend(`${panel.panelId}_error`)}
                                                            maxVisibleItems={4}
                                                            graphData={filteredGraphData}
                                                            selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                            onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
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
                                                                                    setPanelPinnedTooltips(prev => ({
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
                                                                            {pErrorEventKeys.map((eventKeyInfo, index) => {
                                                                                const errorColor = ERROR_COLORS[index % ERROR_COLORS.length];
                                                                                return (
                                                                                    <linearGradient key={`errorGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`errorColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
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
                                                                        <YAxis
                                                                            tick={{ fill: '#ef4444', fontSize: 10 }}
                                                                            axisLine={false}
                                                                            tickLine={false}
                                                                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                                        />
                                                                        <Tooltip content={<CustomTooltip events={events} eventKeys={pErrorEventKeys} />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                        {pErrorEventKeys
                                                                            .filter(ek => !panelSelectedEventKey[panel.panelId] || ek.eventKey === panelSelectedEventKey[panel.panelId])
                                                                            .map((eventKeyInfo, idx) => {
                                                                                const eventKey = eventKeyInfo.eventKey;
                                                                                const errorColor = ERROR_COLORS[idx % ERROR_COLORS.length];
                                                                                return (
                                                                                    <React.Fragment key={`error_frag_${panel.panelId}_${eventKey}`}>
                                                                                        {/* Error count (distinct colors) */}
                                                                                        <Area
                                                                                            type="monotone"
                                                                                            dataKey={`${eventKey}_success`}
                                                                                            name={`${eventKeyInfo.eventName} (Errors)`}
                                                                                            stroke={errorColor}
                                                                                            strokeWidth={2.5}
                                                                                            fill={`url(#errorColor_${panel.panelId}_${eventKey})`}
                                                                                            dot={{ fill: errorColor, strokeWidth: 0, r: 3 }}
                                                                                            activeDot={{
                                                                                                r: 8,
                                                                                                fill: errorColor,
                                                                                                stroke: '#fff',
                                                                                                strokeWidth: 3,
                                                                                                cursor: 'pointer',
                                                                                            }}
                                                                                        />
                                                                                        {/* Non-error count (green) */}
                                                                                        <Area
                                                                                            type="monotone"
                                                                                            dataKey={`${eventKey}_fail`}
                                                                                            name={`${eventKeyInfo.eventName} (OK)`}
                                                                                            stroke="#22c55e"
                                                                                            strokeWidth={2}
                                                                                            fill={`url(#errorSuccessGrad_${panel.panelId})`}
                                                                                            dot={{ fill: '#22c55e', strokeWidth: 0, r: 2 }}
                                                                                            activeDot={{
                                                                                                r: 6,
                                                                                                fill: '#22c55e',
                                                                                                stroke: '#fff',
                                                                                                strokeWidth: 2,
                                                                                                cursor: 'pointer',
                                                                                            }}
                                                                                        />
                                                                                    </React.Fragment>
                                                                                );
                                                                            })}
                                                                    </AreaChart>
                                                                </ResponsiveContainer>
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data available</div>
                                                            )}
                                                        </div>
                                                    </CardContent>

                                                    {/* Pinned Tooltip Modal for Error Charts */}
                                                    {(() => {
                                                        const pinnedData = panelPinnedTooltips[`${panel.panelId}_error`];
                                                        if (!pinnedData) return null;

                                                        return (
                                                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                                                <div
                                                                    className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                                                                    onClick={() => setPanelPinnedTooltips(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[`${panel.panelId}_error`];
                                                                        return updated;
                                                                    })}
                                                                />
                                                                <div className="relative max-w-lg w-full">
                                                                    <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPanelPinnedTooltips(prev => {
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
                                                                                    payload={pErrorEventKeys.map((ek, idx) => {
                                                                                        const event = events.find(e => String(e.eventId) === ek.eventId);
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
                                                </Card>
                                            )}

                                            {/* Panel Charts - Separate isError Events (one chart per event) */}
                                            {pErrorEventKeys.length > 0 && panel.type === 'separate' && pErrorEventKeys.map((errorEventKeyInfo, errorIdx) => {
                                                const errorEvent = events.find(e => String(e.eventId) === errorEventKeyInfo.eventId);
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
                                                                        <AreaChart
                                                                            data={filteredGraphData}
                                                                            margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                                                                        >
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
                                                                            <YAxis
                                                                                tick={{ fill: '#ef4444', fontSize: 10 }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                                            />
                                                                            <Tooltip content={<CustomTooltip events={events} eventKeys={[errorEventKeyInfo]} />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                                            {/* Error count */}
                                                                            <Area
                                                                                type="monotone"
                                                                                dataKey={`${errorEventKeyInfo.eventKey}_success`}
                                                                                name={`Errors`}
                                                                                stroke={errorColor}
                                                                                strokeWidth={2.5}
                                                                                fill={`url(#errorGrad_sep_${panel.panelId}_${errorEventKeyInfo.eventKey})`}
                                                                                dot={{ fill: errorColor, strokeWidth: 0, r: 3 }}
                                                                                activeDot={{
                                                                                    r: 8,
                                                                                    fill: errorColor,
                                                                                    stroke: '#fff',
                                                                                    strokeWidth: 3
                                                                                }}
                                                                            />
                                                                            {/* Non-error count (OK) */}
                                                                            <Area
                                                                                type="monotone"
                                                                                dataKey={`${errorEventKeyInfo.eventKey}_fail`}
                                                                                name={`OK`}
                                                                                stroke="#22c55e"
                                                                                strokeWidth={2}
                                                                                fill={`url(#errorSuccessGrad_sep_${panel.panelId}_${errorEventKeyInfo.eventKey})`}
                                                                                dot={{ fill: '#22c55e', strokeWidth: 0, r: 2 }}
                                                                                activeDot={{
                                                                                    r: 6,
                                                                                    fill: '#22c55e',
                                                                                    stroke: '#fff',
                                                                                    strokeWidth: 2
                                                                                }}
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

                                            {/* Fallback - All events in one chart if no type separation */}
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
                                                            isExpanded={panelLegendExpanded[panel.panelId] || false}
                                                            onToggle={() => togglePanelLegend(panel.panelId)}
                                                            maxVisibleItems={4}
                                                            graphData={filteredGraphData}
                                                            selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                            onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                        />
                                                        <div className="h-[400px]">
                                                            {filteredGraphData.length > 0 ? (
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <AreaChart data={filteredGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                        <defs>
                                                                            {pEventKeys.map((eventKeyInfo, index) => {
                                                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
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
                                                                        {pEventKeys.map((eventKeyInfo, index) => {
                                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
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
                                })()
                            }

                            {/* Panel Pie Charts - shown ABOVE Hourly Insights - HIDE for special graphs */}
                            {
                                panelGraphType !== 'percentage' && panelGraphType !== 'funnel' &&
                                panel.visualizations.pieCharts.some(p => p.enabled) && (() => {
                                    // Process pie data for additional panels - combine duplicates and filter hidden
                                    const processedPieConfigs = panel.visualizations.pieCharts.filter(p => p.enabled).map((pieConfig) => {
                                        const pieType = pieConfig.type as 'platform' | 'pos' | 'source';
                                        const rawPieData = pPieData?.[pieType];
                                        const combinedPieData = combinePieChartDuplicates(rawPieData || []);
                                        const showChart = shouldShowPieChart(combinedPieData);
                                        return { pieConfig, pieType, pieData: combinedPieData, showChart };
                                    }).filter(item => item.showChart);

                                    // Dynamic grid based on visible charts
                                    const gridCols = processedPieConfigs.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
                                        processedPieConfigs.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
                                            'md:grid-cols-3';

                                    return processedPieConfigs.length > 0 ? (
                                        <div className={cn("grid grid-cols-1 gap-4", gridCols)}>
                                            {processedPieConfigs.map(({ pieConfig: _pieConfig, pieType, pieData }) => {
                                                const pieTotal = pieData?.reduce((acc: number, item: any) => acc + item.value, 0) || 0;

                                                const iconMap = {
                                                    platform: <Activity className="h-4 w-4 text-white" />,
                                                    pos: <Target className="h-4 w-4 text-white" />,
                                                    source: <Zap className="h-4 w-4 text-white" />
                                                };
                                                const gradientMap = {
                                                    platform: "from-indigo-500 to-violet-600",
                                                    pos: "from-emerald-500 to-teal-600",
                                                    source: "from-amber-500 to-orange-600"
                                                };
                                                const borderColorMap = {
                                                    platform: "border-indigo-100 dark:border-indigo-500/20",
                                                    pos: "border-emerald-100 dark:border-emerald-500/20",
                                                    source: "border-amber-100 dark:border-amber-500/20"
                                                };
                                                const hoverBgMap = {
                                                    platform: "hover:bg-indigo-100 dark:hover:bg-indigo-500/20",
                                                    pos: "hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
                                                    source: "hover:bg-amber-100 dark:hover:bg-amber-500/20"
                                                };

                                                return (
                                                    <motion.div
                                                        key={pieType}
                                                        whileHover={{ scale: 1.02, y: -4 }}
                                                        transition={{ type: "spring", stiffness: 300 }}
                                                    >
                                                        <Card className={cn("border-2 overflow-hidden group", borderColorMap[pieType])}>
                                                            <CardHeader className="pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <motion.div
                                                                            className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md", gradientMap[pieType])}
                                                                            whileHover={{ rotate: 15 }}
                                                                        >
                                                                            {iconMap[pieType]}
                                                                        </motion.div>
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
                                                                                    onClick={() => openExpandedPie(pieType, pieType.charAt(0).toUpperCase() + pieType.slice(1), pieData)}
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
                                                                                <Pie
                                                                                    data={pieData}
                                                                                    cx="50%"
                                                                                    cy="45%"
                                                                                    innerRadius={30}
                                                                                    outerRadius={55}
                                                                                    paddingAngle={4}
                                                                                    dataKey="value"
                                                                                    strokeWidth={2}
                                                                                    stroke="rgba(255,255,255,0.8)"
                                                                                    isAnimationActive={false}
                                                                                    animationDuration={0}
                                                                                >
                                                                                    {pieData.map((_: any, index: number) => (
                                                                                        <Cell
                                                                                            key={`cell-${index}`}
                                                                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                                                        />
                                                                                    ))}
                                                                                </Pie>
                                                                                <Tooltip content={<PieTooltip totalValue={pieTotal} category={pieType} />} />
                                                                                <Legend
                                                                                    iconType="circle"
                                                                                    iconSize={8}
                                                                                    layout="horizontal"
                                                                                    verticalAlign="bottom"
                                                                                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                                                                                />
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
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : null;
                                })()
                            }

                            {/* Panel Hourly Stats Card - shown BELOW Pie Charts for ≤7 day ranges when enabled */}
                            {
                                isHourly && filteredGraphData.length > 0 && panelConfig?.showHourlyStats !== false &&
                                panelGraphType !== 'percentage' && panelGraphType !== 'funnel' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 * (panelIndex + 1) }}
                                    >
                                        <HourlyStatsCard graphData={filteredGraphData} isHourly={isHourly} eventKeys={pEventKeys} events={events} />
                                    </motion.div>
                                )
                            }
                        </motion.div>
                    );
                });
            })()}

                {/* Expanded Pie Chart Modal */}
                <ExpandedPieChartModal
                    open={pieModalOpen}
                    onClose={() => {
                        setSearchParams(prev => {
                            const next = new URLSearchParams(prev as any);
                            next.delete('expandedPie');
                            return next;
                        });
                    }}
                    pieData={expandedPie}
                />
            </motion.div >
        </>
    );
}
