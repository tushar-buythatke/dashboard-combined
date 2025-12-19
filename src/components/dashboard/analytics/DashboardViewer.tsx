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

import { AnimatedNumber } from './dashboardViewer/AnimatedNumber';
import { MiniSparkline } from './dashboardViewer/MiniSparkline';
import { CollapsibleLegend } from './dashboardViewer/CollapsibleLegend';
import { PieTooltip } from './dashboardViewer/PieTooltip';
import { CustomTooltip } from './dashboardViewer/CustomTooltip';
import { AdditionalPanelsSection } from './dashboardViewer/AdditionalPanelsSection';
import { MainPanelSection } from './dashboardViewer/MainPanelSection';
import type { DashboardViewerProps, DateRangeState, EventKeyInfo, FilterState, PanelData } from './dashboardViewer/types';
import { combinePieChartDuplicates, ERROR_COLORS, EVENT_COLORS, PIE_COLORS, shouldShowPieChart } from './dashboardViewer/constants';



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

// Pie chart modal is now in its own component file

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
    const [alertIsApi, setAlertIsApi] = useState(0); // 0 = Regular events, 1 = API events - independent toggle


    // Alert-specific filters (independent from main dashboard)
    const [alertFilters, setAlertFilters] = useState<{
        platforms: string[];
        pos: number[];
        sources: string[];
        events: number[];
    }>({
        platforms: [],
        pos: [],
        sources: [],
        events: []
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

    // Track last time we sent uploadChildConfig (to send once per hour)
    const lastConfigUploadTime = useRef<number>(0);

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

    const eventConfigById = useMemo(() => {
        const map = new Map<string, EventConfig>();
        events.forEach((e) => {
            map.set(String(e.eventId), e);
        });
        return map;
    }, [events]);

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
                const eventConfig = eventConfigById.get(eventId);
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
    }, [profile?.panels, panelsDataMap, panelFiltersState, panelDateRanges, dateRange, eventConfigById]);

    const apiEndpointEventKeyInfos = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return [] as EventKeyInfo[];

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelConfig = (profile.panels[0] as any)?.filterConfig;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const isPercentageOrFunnel = mainPanelConfig?.graphType === 'percentage' || mainPanelConfig?.graphType === 'funnel';

        // For percentage/funnel graphs, show status codes instead of endpoint names
        if (isPercentageOrFunnel) {
            // Parent = all success status codes (2xx)
            // Child = selected status codes | cache status
            const allStatusCodes = new Set<string>();
            const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];

            // Extract all status codes from raw data (success codes = 2xx)
            rawData.forEach((r: any) => {
                if (r.status) {
                    allStatusCodes.add(String(r.status));
                }
            });

            const successCodes = Array.from(allStatusCodes).filter(code => {
                const codeNum = parseInt(code, 10);
                return codeNum >= 200 && codeNum < 300;
            }).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            const selectedStatusCodes = (mainPanelFilters.percentageStatusCodes || []).filter(Boolean).map((v: any) => String(v));
            const selectedCacheStatus = (mainPanelFilters.percentageCacheStatus || []).filter(Boolean).map((v: any) => String(v));

            // Build parent event keys (all success codes)
            const parentKeys: EventKeyInfo[] = successCodes.map((code) => ({
                eventId: `status_${code}`,
                eventName: `Status ${code}`,
                eventKey: `status_${code}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
            }));

            // Build child event keys (selected status codes | cache)
            const childKeys: EventKeyInfo[] = [];
            if (selectedStatusCodes.length > 0) {
                selectedStatusCodes.forEach((code: string) => {
                    childKeys.push({
                        eventId: `status_${code}`,
                        eventName: `Status ${code}`,
                        eventKey: `status_${code}`,
                        isErrorEvent: 0,
                        isAvgEvent: 0,
                    });
                });
            }
            if (selectedCacheStatus.length > 0) {
                selectedCacheStatus.forEach((cache: string) => {
                    childKeys.push({
                        eventId: `cache_${cache}`,
                        eventName: `Cache: ${cache}`,
                        eventKey: `cache_${cache}`,
                        isErrorEvent: 0,
                        isAvgEvent: 0,
                    });
                });
            }

            // Return combined - deduplicate by eventKey to prevent duplicates (e.g., Status 200 in both parent and child)
            const combined = [...parentKeys, ...childKeys];
            const deduped = Array.from(
                new Map(combined.map(item => [item.eventKey, item])).values()
            );
            return deduped;
        }

        // Regular mode: show endpoint names
        const selectedEventIds = (mainPanelFilters.events && mainPanelFilters.events.length > 0)
            ? mainPanelFilters.events
            : (mainPanelConfig?.events || []);

        const ids = (selectedEventIds || []).map((v: any) => String(v)).filter(Boolean);
        return ids.map((id: string) => {
            const ev = eventConfigById.get(String(id));
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
    }, [isMainPanelApi, profile?.panels, panelFiltersState, eventConfigById, panelsDataMap, rawGraphResponse]);

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

            // In percentage/funnel mode, aggregate by status/cache instead of by event endpoint
            let eventKey: string;
            if (isFirstPanelSpecialGraphLocal) {
                // Use status code or cache status as the key
                if (r.status) {
                    eventKey = `status_${r.status}`;
                } else if (r.cacheStatus) {
                    eventKey = `cache_${r.cacheStatus}`;
                } else {
                    return; // Skip if no status or cache info
                }
            } else {
                // Regular mode: use event endpoint name
                const eventId = String(r.eventId);
                const eventConfig = eventConfigById.get(eventId);
                const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                    ? `${eventConfig.host} - ${eventConfig.url}`
                    : (eventConfig?.eventName || `Event ${eventId}`);
                eventKey = baseName.replace(/[^a-zA-Z0-9]/g, '_');
            }
            usedKeys.add(eventKey);

            const count = Number(r.count || 0);
            if (!entry[`${eventKey}_count`]) {
                entry[`${eventKey}_count`] = 0;
                entry[`${eventKey}_sumCount`] = 0;
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
    }, [isMainPanelApi, profile?.panels, panelFiltersState, graphData, rawGraphResponse, panelsDataMap, eventConfigById, isHourly]);

    useEffect(() => {
        if (!profile?.panels || profile.panels.length === 0) return;
        const next: Record<string, boolean> = {};
        profile.panels.forEach(panel => {
            next[panel.panelId] = true;
        });
        setPanelFiltersCollapsed(next);
    }, [profile?.panels]);

    // Build and upload child config for percentage/funnel graphs
    const uploadChildConfigIfNeeded = useCallback(async (force: boolean = false) => {
        if (!profile?.panels) return;

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // Send if forced (panel edited) or if an hour has passed since last upload
        if (!force && (now - lastConfigUploadTime.current) < oneHour) {
            return;
        }

        // Build config array from all panels with percentage/funnel graphs
        const config: Array<{ child: string; parent: string[] }> = [];

        profile.panels.forEach((panel) => {
            const panelConfig = (panel as any).filterConfig;

            if (panelConfig?.graphType === 'percentage' && panelConfig?.percentageConfig) {
                const { parentEvents = [], childEvents = [] } = panelConfig.percentageConfig;
                childEvents.forEach((childEventId: string) => {
                    config.push({
                        child: String(childEventId),
                        parent: parentEvents.map((id: string) => String(id))
                    });
                });
            } else if (panelConfig?.graphType === 'funnel' && panelConfig?.funnelConfig) {
                const { stages = [], multipleChildEvents = [] } = panelConfig.funnelConfig;
                const stageEventIds = stages.map((s: any) => String(s.eventId));
                multipleChildEvents.forEach((childEventId: string) => {
                    config.push({
                        child: String(childEventId),
                        parent: stageEventIds
                    });
                });
            }
        });

        // Only upload if we have configs
        if (config.length > 0) {
            try {
                await apiService.uploadChildConfig(config);
                lastConfigUploadTime.current = now;
                console.log('✅ Uploaded child config:', config);
            } catch (error) {
                console.error('Failed to upload child config:', error);
            }
        }
    }, [profile?.panels]);

    // Note: Auto-selection disabled for 8-Day Overlay
    // Show all events by default to prevent empty graphs
    // User can click legend to filter specific events


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

            // Upload child config when profile is loaded (once per hour max)
            uploadChildConfigIfNeeded(false);
        }
    }, [loading, profileId, profile, events.length, graphData.length, toast, uploadChildConfigIfNeeded]);

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

    // Function to jump to a panel - scrolls and auto-fetches data if needed
    const handleJumpToPanel = useCallback((panelId: string) => {
        // Scroll to panel
        const panelElement = panelRefs.current[panelId];
        if (panelElement) {
            panelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Auto-fetch panel data if not already loaded
        const panelData = panelsDataMap.get(panelId);
        if (!panelData || panelData.graphData.length === 0 || panelData.loading) {
            // Only fetch if we have profile and events loaded
            if (profile && events.length > 0) {
                refreshPanelData(panelId);
            }
        }
    }, [panelsDataMap, profile, events, refreshPanelData]);

    // Expose handleJumpToPanel via window for external access (used by AnalyticsLayout)
    useEffect(() => {
        (window as any).__dashboardViewerJumpToPanel = handleJumpToPanel;
        return () => {
            delete (window as any).__dashboardViewerJumpToPanel;
        };
    }, [handleJumpToPanel]);

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

    const totals = useMemo(() => {
        const totalCount = graphData.reduce((sum, d) => sum + (d.count || 0), 0);
        const totalSuccess = graphData.reduce((sum, d) => sum + (d.successCount || 0), 0);
        const totalFail = graphData.reduce((sum, d) => sum + (d.failCount || 0), 0);
        return { totalCount, totalSuccess, totalFail };
    }, [graphData]);

    const eventOptions = useMemo(() => {
        return events
            .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
            .sort((a, b) => {
                if (isMainPanelApi) {
                    const aLabel = a.host && a.url ? `${a.host} - ${a.url}` : a.eventName;
                    const bLabel = b.host && b.url ? `${b.host} - ${b.url}` : b.eventName;

                    const aIs200 = aLabel.includes('200') || a.eventName.includes('200');
                    const bIs200 = bLabel.includes('200') || b.eventName.includes('200');

                    if (aIs200 && !bIs200) return -1;
                    if (!aIs200 && bIs200) return 1;

                    const aStatus = parseInt(a.eventName) || 999;
                    const bStatus = parseInt(b.eventName) || 999;
                    return aStatus - bStatus;
                }
                return 0;
            })
            .map(e => {
                let label = e.isApiEvent && e.host && e.url
                    ? `${e.host} - ${e.url}`
                    : e.eventName;
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
    }, [events, isMainPanelApi]);

    const platformOptions = useMemo(() => PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name })), []);
    const posOptions = useMemo(() => siteDetails.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.id})` })), [siteDetails]);
    const sourceOptions = useMemo(() => SOURCES.map(s => ({ value: s.id.toString(), label: s.name })), []);

    const selectedEventsList = useMemo(() => {
        if (filters.events.length === 0) return ['All Events'];
        return filters.events.map((id) => {
            const ev = eventConfigById.get(String(id));
            return ev?.eventName || `Event ${id}`;
        });
    }, [filters.events, eventConfigById]);

    if (loading) return null;
    if (!profile) return <div className="p-8 text-center text-destructive">Profile not found</div>;

    const { totalCount, totalSuccess, totalFail } = totals;

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
    const hasAvgEvents = eventKeys.some(ek => (ek.isAvgEvent || 0) >= 1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasErrorEvents = eventKeys.some(ek => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
    const hasNormalEvents = eventKeys.some(ek => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasMixedEventTypes = hasAvgEvents && hasNormalEvents;

    // Separate event keys by type
    // Events with isAvgEvent >= 1 (1=time, 2=rupees, 3=count) go to avg charts
    const avgEventKeys = eventKeys.filter(ek => (ek.isAvgEvent || 0) >= 1);
    const errorEventKeys = eventKeys.filter(ek => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
    const normalEventKeys = eventKeys.filter(ek => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));

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
                <MainPanelSection
                    profile={profile}
                    setProfile={setProfile}
                    panelsDataMap={panelsDataMap}
                    rawGraphResponse={rawGraphResponse}
                    graphData={graphData}
                    filteredApiData={filteredApiData}
                    dateRange={dateRange}
                    isHourly={isHourly}
                    filtersCollapsed={filtersCollapsed}
                    setFiltersCollapsed={setFiltersCollapsed}
                    pendingRefresh={pendingRefresh}
                    panelFiltersState={panelFiltersState}
                    handleFilterChange={handleFilterChange}
                    handleApplyFilters={handleApplyFilters}
                    dataLoading={dataLoading}
                    autoRefreshMinutes={autoRefreshMinutes}
                    setAutoRefreshMinutes={setAutoRefreshMinutes}
                    availableStatusCodes={availableStatusCodes}
                    availableCacheStatuses={availableCacheStatuses}
                    availableSourceStrs={availableSourceStrs}
                    selectedSourceStrs={selectedSourceStrs}
                    setSelectedSourceStrs={setSelectedSourceStrs}
                    platformOptions={platformOptions}
                    posOptions={posOptions}
                    sourceOptions={sourceOptions}
                    eventOptions={eventOptions}
                    totalCount={totalCount}
                    totalSuccess={totalSuccess}
                    totalFail={totalFail}
                    selectedEventsList={selectedEventsList}
                    isMainPanelApi={isMainPanelApi}
                    normalEventKeys={normalEventKeys}
                    eventKeys={eventKeys}
                    avgEventKeys={avgEventKeys}
                    errorEventKeys={errorEventKeys}
                    apiEndpointEventKeyInfos={apiEndpointEventKeyInfos}
                    mainLegendExpanded={mainLegendExpanded}
                    setMainLegendExpanded={setMainLegendExpanded}
                    selectedEventKey={selectedEventKey}
                    handleEventClick={handleEventClick}
                    overlaySelectedEventKey={overlaySelectedEventKey}
                    handleOverlayEventClick={handleOverlayEventClick}
                    errorSelectedEventKey={errorSelectedEventKey}
                    handleErrorEventClick={handleErrorEventClick}
                    apiSelectedEventKey={apiSelectedEventKey}
                    handleApiEventClick={handleApiEventClick}
                    panelChartType={panelChartType}
                    setPanelChartType={setPanelChartType}
                    pinnedTooltip={pinnedTooltip}
                    setPinnedTooltip={setPinnedTooltip}
                    isFirstPanelSpecialGraph={isFirstPanelSpecialGraph}
                    apiPerformanceSeries={apiPerformanceSeries}
                    apiMetricView={apiMetricView}
                    setApiMetricView={setApiMetricView}
                    pieChartData={pieChartData}
                    openExpandedPie={openExpandedPie}
                    CustomXAxisTick={CustomXAxisTick}
                    HourlyStatsCard={HourlyStatsCard}
                    events={events}
                    toast={toast}
                />

                {/* Additional Panels (if profile has more than one panel) */}
                {/* Render additional panels normally - each panel will check if it's a special graph */}
                {profile.panels.length > 1 && (
                    <AdditionalPanelsSection
                        profile={profile}
                        panelsDataMap={panelsDataMap}
                        panelFiltersState={panelFiltersState}
                        panelDateRanges={panelDateRanges}
                        panelLoading={panelLoading}
                        panelRefs={panelRefs}
                        dateRange={dateRange}
                        panelFiltersCollapsed={panelFiltersCollapsed}
                        setPanelFiltersCollapsed={setPanelFiltersCollapsed}
                        panelFilterChanges={panelFilterChanges}
                        handlePanelRefresh={handlePanelRefresh}
                        updatePanelDateRange={updatePanelDateRange}
                        updatePanelFilter={updatePanelFilter}
                        events={events}
                        siteDetails={siteDetails}
                        panelAvailableStatusCodes={panelAvailableStatusCodes}
                        panelAvailableCacheStatuses={panelAvailableCacheStatuses}
                        setPanelFiltersState={setPanelFiltersState}
                        setPanelFilterChanges={setPanelFilterChanges}
                        panelChartType={panelChartType}
                        setPanelChartType={setPanelChartType}
                        panelPinnedTooltips={panelPinnedTooltips}
                        setPanelPinnedTooltips={setPanelPinnedTooltips}
                        panelLegendExpanded={panelLegendExpanded}
                        togglePanelLegend={togglePanelLegend}
                        panelSelectedEventKey={panelSelectedEventKey}
                        handlePanelEventClick={handlePanelEventClick}
                        CustomXAxisTick={CustomXAxisTick}
                        panelApiPerformanceSeriesMap={panelApiPerformanceSeriesMap}
                        panelApiMetricView={panelApiMetricView}
                        setPanelApiMetricView={setPanelApiMetricView}
                        openExpandedPie={openExpandedPie}
                        isHourly={isHourly}
                        HourlyStatsCard={HourlyStatsCard}
                    />
                )}

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
            </motion.div>
        </>
    );
}
