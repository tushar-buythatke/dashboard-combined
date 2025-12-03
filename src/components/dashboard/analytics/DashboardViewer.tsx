import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useInView } from 'framer-motion';
import type { DashboardProfile, EventConfig } from '@/types/analytics';
import { apiService, PLATFORMS, SOURCES } from '@/services/apiService';
import type { SiteDetail } from '@/services/apiService';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar as CalendarIcon, Edit, Sparkles, TrendingUp, TrendingDown, Activity, Zap, CheckCircle2, XCircle, BarChart3, ArrowUpRight, ArrowDownRight, Flame, Target, Hash, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Navigation, Layers, X, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

// Animated Number Counter Component
const AnimatedNumber = ({ value, suffix = '', prefix = '', className = '' }: { value: number; suffix?: string; prefix?: string; className?: string }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: false });
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [value, isInView, motionValue]);

    useEffect(() => {
        const unsubscribe = springValue.on('change', (latest) => {
            setDisplayValue(Math.round(latest));
        });
        return () => unsubscribe();
    }, [springValue]);

    return (
        <span ref={ref} className={className}>
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
            <motion.polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            />
            {/* Animated dot at the end */}
            <motion.circle
                cx={width - padding}
                cy={height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)}
                r="3"
                fill={color}
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
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
    
    const visibleItems = isExpanded ? eventKeys : eventKeys.slice(0, maxVisibleItems);
    const hiddenCount = eventKeys.length - maxVisibleItems;
    
    // Calculate per-event totals and success rates from graphData
    const eventStats = eventKeys.reduce((acc, eventKeyInfo) => {
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
                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                const stats = eventStats[eventKeyInfo.eventKey] || { total: 0, successRate: 0, errorRate: 0, isErrorEvent: false, isAvgEvent: false, avgDelay: 0 };
                const isSelected = selectedEventKey === eventKeyInfo.eventKey;
                
                // Color based on error rate (low error = green, high error = red)
                const rateColor = stats.errorRate <= 10 
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" 
                    : stats.errorRate <= 30 
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
                
                return (
                    <motion.div 
                        key={eventKeyInfo.eventKey}
                        id={`legend-${eventKeyInfo.eventKey}`}
                        className={cn(
                            "flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-white dark:bg-gray-900 shadow-sm border cursor-pointer transition-all whitespace-nowrap",
                            isSelected 
                                ? "border-purple-500 ring-2 ring-purple-500/30 scale-105" 
                                : "border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500/50 active:scale-95"
                        )}
                        onClick={() => onEventClick?.(eventKeyInfo.eventKey)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
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
                    </motion.div>
                );
            })}
            {eventKeys.length > maxVisibleItems && (
                <motion.button
                    onClick={onToggle}
                    className="flex items-center gap-1 h-7 px-2 md:px-3 text-[11px] md:text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-md transition-colors whitespace-nowrap"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                </motion.button>
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
    panelStats 
}: { 
    profileName: string;
    panels: Array<{ panelId: string; panelName: string; chartType?: string; }>; 
    activePanelId: string | null;
    onJumpToPanel: (panelId: string) => void;
    panelStats?: Record<string, { total: number; success: number; }>;
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
        <motion.div 
            className={cn(
                "fixed left-0 top-20 h-[calc(100vh-5rem)] z-50 transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
                {/* Header with Profile Name */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 min-w-0"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                                        <Target className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuration</p>
                                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{profileName}</h3>
                                    </div>
                                </div>
                            </motion.div>
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
                                <motion.button
                                    key={panel.panelId}
                                    onClick={() => onJumpToPanel(panel.panelId)}
                                    className={cn(
                                        "w-full text-left rounded-lg transition-all duration-200 group",
                                        collapsed ? "p-2" : "p-3",
                                        isActive 
                                            ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 shadow-sm" 
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent"
                                    )}
                                    whileHover={{ scale: collapsed ? 1.05 : 1.01 }}
                                    whileTap={{ scale: 0.98 }}
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
                                            <motion.div
                                                className="w-1.5 h-8 rounded-full bg-purple-500"
                                                layoutId="activePanelIndicator"
                                            />
                                        )}
                                    </div>
                                </motion.button>
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
        </motion.div>
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

// Hourly stats card component - uses existing graph data (only shown for ≤7 day ranges)
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
        <Card className="border-2 border-cyan-100 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50/30 to-blue-50/20 dark:from-cyan-500/5 dark:to-blue-500/5 overflow-hidden shadow-md">
            <CardHeader className="pb-3 px-3 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <motion.div 
                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
                            whileHover={{ rotate: 15, scale: 1.05 }}
                        >
                            <Clock className="h-5 w-5 text-white" />
                        </motion.div>
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
                                            <motion.button
                                                key={eventKeyInfo.eventKey}
                                                onClick={() => setSelectedEventKey(eventKeyInfo.eventKey)}
                                                className={cn(
                                                    "flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-medium rounded-full transition-all duration-200 text-center",
                                                    isSelected
                                                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                                                )}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {eventKeyInfo.eventName}
                                            </motion.button>
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
                <div className="p-3 rounded-xl bg-background/60 border border-border/40">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground">Hour Distribution</span>
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
                                    interval={availableHours.length > 12 ? 1 : 0}
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
                                        return v >= 1000 ? `${(v/1000).toFixed(0)}k` : v;
                                    }}
                                />
                                <Tooltip
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
                                    radius={[4, 4, 0, 0]}
                                    cursor="pointer"
                                >
                                    {availableHours.map((hour, index) => (
                                        <Cell 
                                            key={`cell-${index}`}
                                            fill={hour === selectedHour ? '#06b6d4' : hour === peakHour ? '#fbbf24' : '#93c5fd'}
                                            stroke={hour === selectedHour ? '#0891b2' : 'transparent'}
                                            strokeWidth={hour === selectedHour ? 2 : 0}
                                        />
                                    ))}
                                </Bar>
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
        </Card>
    );
}

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
    Cell
} from 'recharts';

// Custom Pie Chart Tooltip
const PieTooltip = ({ active, payload, totalValue }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;

    const percentage = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : '0';
    const percentageNum = parseFloat(percentage);
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[180px] backdrop-blur-xl"
        >
            <div className="flex items-center gap-2 mb-2">
                <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: payload[0]?.payload?.fill || PIE_COLORS[0] }}
                />
                <span className="font-semibold text-sm text-foreground">{data.name}</span>
            </div>
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Count</span>
                    <span className="text-sm font-bold text-foreground">{data.value?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Percentage</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{percentage}%</span>
                </div>
            </div>
            {/* Progress bar showing percentage */}
            <div className="mt-2.5 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full rounded-full"
                    style={{ 
                        backgroundColor: payload[0]?.payload?.fill || PIE_COLORS[0],
                        width: `${Math.min(percentageNum, 100)}%`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentageNum, 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />
            </div>
            <div className="mt-1 text-[10px] text-center text-muted-foreground">
                {percentage}% of total ({totalValue?.toLocaleString()})
            </div>
        </motion.div>
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
        <motion.div
            initial={isPinned ? false : { opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
                "relative overflow-hidden",
                isPinned 
                    ? "bg-transparent p-3 md:p-4" 
                    : "bg-white/95 dark:bg-slate-900/95 rounded-xl md:rounded-2xl shadow-2xl border-2 border-purple-200/50 dark:border-purple-500/30 p-3 md:p-5 backdrop-blur-2xl min-w-[260px] sm:min-w-[280px] max-w-[95vw] sm:max-w-[420px]"
            )}
            onMouseMoveCapture={stopEvent}
            onWheelCapture={stopEvent}
            onClick={stopEvent}
        >
            {/* Animated gradient background - only for hover tooltip */}
            {!isPinned && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.05),transparent_50%)] pointer-events-none" />
                </>
            )}
            
            {/* Content wrapper */}
            <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b-2 border-gray-100/80 dark:border-gray-800/80">
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
                    <motion.div 
                        className={cn(
                            "text-xl md:text-2xl font-extrabold bg-clip-text text-transparent",
                            allAvgEvents 
                                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                                : "bg-gradient-to-r from-purple-600 to-violet-600"
                        )}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        {allAvgEvents && formattedAvgDelay ? formattedAvgDelay : totalCount.toLocaleString()}
                    </motion.div>
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
                    <motion.div 
                        key={index} 
                        className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200/50 dark:border-gray-700/30 hover:border-purple-300 dark:hover:border-purple-500/40 transition-all"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.02, y: -1 }}
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
                    </motion.div>
                ))}
            </div>
            
            {/* Expand/Collapse Button */}
            {eventDataItems.length > 3 && (
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-500/20 dark:hover:to-violet-500/20 transition-all flex items-center justify-center gap-1.5 border border-purple-200/50 dark:border-purple-500/30 shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                </motion.button>
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
                        <motion.span 
                            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-semibold"
                            whileHover={{ scale: 1.05 }}
                        >
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                            {totalSuccess.toLocaleString()}
                        </motion.span>
                        <motion.span 
                            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-semibold"
                            whileHover={{ scale: 1.05 }}
                        >
                            <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                            {totalErrors.toLocaleString()}
                        </motion.span>
                    </div>
                </div>
            </div>
            </div>
        </motion.div>
    );
};

// Expanded Pie Chart Modal Component
interface ExpandedPieData {
    type: 'platform' | 'pos' | 'source';
    title: string;
    data: any[];
}

const ExpandedPieChartModal = ({ 
    open, 
    onClose, 
    pieData 
}: { 
    open: boolean; 
    onClose: () => void; 
    pieData: ExpandedPieData | null;
}) => {
    if (!pieData || !pieData.data?.length) return null;
    
    const total = pieData.data.reduce((acc: number, item: any) => acc + item.value, 0);
    const sortedData = [...pieData.data].sort((a, b) => b.value - a.value);
    
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[90vw]">
                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                            {pieData.type === 'platform' && <Activity className="h-5 w-5 text-white" />}
                            {pieData.type === 'pos' && <Target className="h-5 w-5 text-white" />}
                            {pieData.type === 'source' && <Zap className="h-5 w-5 text-white" />}
                        </div>
                        <div>
                            <span className="text-lg font-bold">{pieData.title} Distribution</span>
                            <p className="text-sm text-muted-foreground font-normal">
                                {sortedData.length} categories • {total.toLocaleString()} total
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Pie Chart */}
                    <div className="h-[300px] w-full md:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sortedData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    strokeWidth={2}
                                    stroke="#fff"
                                >
                                    {sortedData.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip totalValue={total} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Breakdown List */}
                    <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto">
                        {sortedData.map((item: any, index: number) => {
                            const percentage = ((item.value / total) * 100).toFixed(1);
                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                                >
                                    <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold">{item.value.toLocaleString()}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({percentage}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface DashboardViewerProps {
    profileId: string;
    onEditProfile?: (profile: DashboardProfile) => void;
}

interface FilterState {
    platforms: number[];
    pos: number[];
    sources: number[];
    events: number[];
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

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// Utility function to combine duplicate entries (like multiple "Unknown") in pie chart data
const combinePieChartDuplicates = (data: any[]): any[] => {
    if (!data || data.length === 0) return [];
    
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

export function DashboardViewer({ profileId, onEditProfile }: DashboardViewerProps) {
    const [profile, setProfile] = useState<DashboardProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    // Compute isHourly based on date range (7 days or less = hourly)
    const isHourly = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 7;

    // Expanded pie chart modal state
    const [expandedPie, setExpandedPie] = useState<ExpandedPieData | null>(null);
    const [pieModalOpen, setPieModalOpen] = useState(false);

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
    const [alertsPanelCollapsed, setAlertsPanelCollapsed] = useState(false);
    
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
    
    // SourceStr (Job ID) filter - client-side only, not sent to API
    // Available sourceStr values extracted from graph data
    const [availableSourceStrs, setAvailableSourceStrs] = useState<string[]>([]);
    const [selectedSourceStrs, setSelectedSourceStrs] = useState<string[]>([]); // Empty = all
    const [_panelAvailableSourceStrs, setPanelAvailableSourceStrs] = useState<Record<string, string[]>>({});
    const [panelSelectedSourceStrs, _setPanelSelectedSourceStrs] = useState<Record<string, string[]>>({});
    
    // Store raw graph response for client-side filtering
    const [rawGraphResponse, setRawGraphResponse] = useState<any>(null);
    const [_panelRawGraphResponses, setPanelRawGraphResponses] = useState<Record<string, any>>({});
    
    // Panel navigation and UI state
    const [_activePanelId, setActivePanelId] = useState<string | null>(null);
    const [mainLegendExpanded, setMainLegendExpanded] = useState(false);
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
    const [panelLegendExpanded, setPanelLegendExpanded] = useState<Record<string, boolean>>({});
    const [panelSelectedEventKey, setPanelSelectedEventKey] = useState<Record<string, string | null>>({});
    const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Pinned tooltip for main chart - stores the data point to show in expanded view
    const [pinnedTooltip, setPinnedTooltip] = useState<{ dataPoint: any; label: string } | null>(null);
    
    // Configurable auto-refresh (in minutes, 0 = disabled)
    const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<number>(0);
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false);
    const initialLoadComplete = useRef<boolean>(false);

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

    // Function to open expanded pie chart
    const openExpandedPie = (type: 'platform' | 'pos' | 'source', title: string, data: any[]) => {
        setExpandedPie({ type, title, data });
        setPieModalOpen(true);
    };

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { mockService } = await import('@/services/mockData');
                const loadedProfile = await mockService.getProfile(profileId);
                
                if (loadedProfile) {
                    setProfile(loadedProfile);
                    
                    const sites = await apiService.getSiteDetails();
                    setSiteDetails(sites);
                    
                    const featureEvents = await apiService.getEventsList(loadedProfile.featureId);
                    setEvents(featureEvents);
                    
                    // Initialize panel filter states from admin configs (these reset on refresh)
                    const initialPanelFilters: Record<string, FilterState> = {};
                    const initialPanelDateRanges: Record<string, DateRangeState> = {};
                    const defaultDateRange = {
                        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        to: new Date()
                    };
                    
                    loadedProfile.panels.forEach(panel => {
                        const panelConfig = (panel as any).filterConfig;
                        initialPanelFilters[panel.panelId] = {
                            events: panelConfig?.events || [],
                            platforms: panelConfig?.platforms || [],
                            pos: panelConfig?.pos || [],
                            sources: panelConfig?.sources || []
                        };
                        initialPanelDateRanges[panel.panelId] = { ...defaultDateRange };
                    });
                    
                    setPanelFiltersState(initialPanelFilters);
                    setPanelDateRanges(initialPanelDateRanges);
                    
                    // Check if panels have saved filter configs
                    const firstPanelConfig = loadedProfile.panels[0]?.filterConfig as any;
                    
                    if (firstPanelConfig && firstPanelConfig.events && firstPanelConfig.events.length > 0) {
                        // Use saved filter config from first panel
                        setFilters({
                            platforms: firstPanelConfig.platforms || [0],
                            pos: firstPanelConfig.pos || [2],
                            sources: firstPanelConfig.sources || [1],
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
    const processGraphData = useCallback((graphResponse: any, startDate: Date, endDate: Date, eventsList: EventConfig[]) => {
        console.log('📊 processGraphData called with:', {
            responseDataLength: graphResponse?.data?.length || 0,
            startDate,
            endDate,
            eventsListLength: eventsList?.length || 0
        });
        
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Create maps for event lookup
        const eventNameMap = new Map<string, string>();
        const eventConfigMap = new Map<string, EventConfig>();
        eventsList.forEach(e => {
            eventNameMap.set(String(e.eventId), e.eventName);
            eventConfigMap.set(String(e.eventId), e);
        });

        // First pass: collect all unique timestamps and events
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
            
            // Add to overall totals
            existing.count += record.count || 0;
            existing.successCount += record.successCount || 0;
            existing.failCount += record.failCount || 0;
            
            // Add per-event data
            const eventName = eventNameMap.get(eventId) || `Event ${eventId}`;
            const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_'); // Safe key for object property
            
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

        console.log('📊 processGraphData result:', {
            sortedDataLength: sortedData.length,
            eventKeysCount: eventKeysInData.length,
            sampleData: sortedData.length > 0 ? sortedData[0] : null,
            eventKeys: eventKeysInData
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
            // Then process the filtered data
            const processedResult = processGraphData(filteredResponse, dateRange.from, dateRange.to, events);
            setGraphData(processedResult.data);
            setEventKeys(processedResult.eventKeys || []);
        }
    }, [selectedSourceStrs, rawGraphResponse, dateRange, events, processGraphData, filterBySourceStr]);

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
            
            console.log(`🔍 DEBUG - Panel Config:`, panelConfig);
            console.log(`👤 DEBUG - User Panel Filters:`, userPanelFilters);
            console.log(`📦 DEBUG - Existing Panel Data Filters:`, existingPanelData?.filters);
            
            // FIXED: Use currentPanelFilters logic - match what the UI shows
            // Priority: 1) User edited filters (panelFiltersState), 2) Last successful call (panelData.filters), 3) Panel config defaults
            const currentPanelFilters = userPanelFilters || existingPanelData?.filters || {
                events: panelConfig?.events || [],
                platforms: panelConfig?.platforms || [],
                pos: panelConfig?.pos || [],
                sources: panelConfig?.sources || []
            };
            
            // Now use currentPanelFilters - empty arrays mean "all" (sent to API as [])
            const panelFilters: FilterState = {
                events: currentPanelFilters.events,
                platforms: currentPanelFilters.platforms,
                pos: currentPanelFilters.pos,
                sources: currentPanelFilters.sources
            };
            const panelDateRange = panelDateRanges[panelId] || dateRange;
            
            // Get current sourceStr filter for this panel (client-side filter)
            const currentSourceStrFilter = profile.panels[0]?.panelId === panelId 
                ? selectedSourceStrs 
                : (panelSelectedSourceStrs[panelId] || []);
            
            console.log(`🔄 PANEL REFRESH - Panel ID: ${panelId}`);
            console.log(`📊 Panel filters being applied:`, panelFilters);
            console.log(`🌐 Global filters state:`, filters);
            console.log(`📅 Panel date range:`, panelDateRange);
            console.log(`🔖 SourceStr filter:`, currentSourceStrFilter);

            const graphResponse = await apiService.getGraphData(
                panelFilters.events,
                panelFilters.platforms,
                panelFilters.pos,
                panelFilters.sources,
                panelDateRange.from,
                panelDateRange.to
            );

            // Pie chart is optional - don't fail the whole refresh if it fails
            let pieResponse = null;
            try {
                pieResponse = await apiService.getPieChartData(
                    panelFilters.events,
                    panelFilters.platforms,
                    panelFilters.pos,
                    panelFilters.sources,
                    panelDateRange.from,
                    panelDateRange.to
                );
            } catch (pieErr) {
                console.warn(`⚠️ Pie chart data failed for panel ${panelId}, continuing without it:`, pieErr);
            }

            // Extract available sourceStrs from the raw response
            const sourceStrsInData = extractSourceStrs(graphResponse);
            
            // Apply sourceStr filter (client-side) then process
            const filteredResponse = filterBySourceStr(graphResponse, currentSourceStrFilter);
            const processedResult = processGraphData(filteredResponse, panelDateRange.from, panelDateRange.to, events);

            console.log(`✅ PANEL ${panelId} - Processed data:`, {
                dataLength: processedResult.data.length,
                eventKeysCount: processedResult.eventKeys.length,
                availableSourceStrs: sourceStrsInData.length,
                pieData: pieResponse ? 'received' : 'null'
            });

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
                console.log(`🔄 Updating main panel state variables with:`, {
                    graphDataLength: processedResult.data.length,
                    eventKeysCount: processedResult.eventKeys?.length || 0,
                    availableSourceStrs: sourceStrsInData.length,
                    pieDataKeys: pieResponse ? Object.keys(pieResponse) : []
                });
                setGraphData(processedResult.data);
                setEventKeys(processedResult.eventKeys || []);
                setPieChartData(pieResponse);
                setRawGraphResponse(graphResponse); // Store for re-processing
                setLastUpdated(new Date());
                console.log(`✅ Main panel state variables updated!`);
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

    // Load critical alerts - uses alert-specific filters (independent)
    const loadAlerts = useCallback(async (expanded: boolean = false) => {
        if (!profile || events.length === 0) return;
        
        setAlertsLoading(true);
        try {
            // Use alert-specific filters, fall back to all events if empty
            const eventIds = alertFilters.events.length > 0 
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
                alertsPage
            );
            setCriticalAlerts(alerts);
        } catch (err) {
            console.error('Failed to load critical alerts:', err);
            setCriticalAlerts([]);
        } finally {
            setAlertsLoading(false);
        }
    }, [profile, events, alertFilters, alertDateRange, alertsPage]);

    // Load chart data for all panels
    const loadData = useCallback(async () => {
        if (!profile || events.length === 0) return;
        
        setDataLoading(true);
        setError(null);
        
        try {
            // Load data for each panel that has filterConfig
            const newPanelsData = new Map<string, PanelData>();
            
            for (const panel of profile.panels) {
                const panelConfig = (panel as any).filterConfig;
                const userPanelFilters = panelFiltersState[panel.panelId];
                const panelDateRange = panelDateRanges[panel.panelId] || dateRange;
                
                // FIXED: Each panel uses its own filter state if available
                // Priority: 1) Panel-specific user filters, 2) Panel config, 3) Empty (all)
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
                
                console.log(`Panel ${panel.panelId} - Using filters:`, panelFilters);
                console.log(`User panel filters:`, userPanelFilters);
                console.log(`Panel config:`, panelConfig);
                
                try {
                    const graphResponse = await apiService.getGraphData(
                        panelFilters.events,
                        panelFilters.platforms,
                        panelFilters.pos,
                        panelFilters.sources,
                        panelDateRange.from,
                        panelDateRange.to
                    );

                    // Pie chart is optional - don't fail the whole refresh if it fails
                    let pieResponse = null;
                    try {
                        pieResponse = await apiService.getPieChartData(
                            panelFilters.events,
                            panelFilters.platforms,
                            panelFilters.pos,
                            panelFilters.sources,
                            panelDateRange.from,
                            panelDateRange.to
                        );
                    } catch (pieErr) {
                        console.warn(`⚠️ Pie chart data failed for panel ${panel.panelId}, continuing without it:`, pieErr);
                    }

                    // Extract available sourceStrs from raw response
                    const sourceStrsInData = extractSourceStrs(graphResponse);
                    
                    const processedResult = processGraphData(graphResponse, panelDateRange.from, panelDateRange.to, events);

                    newPanelsData.set(panel.panelId, {
                        graphData: processedResult.data,
                        eventKeys: processedResult.eventKeys,
                        pieChartData: pieResponse,
                        loading: false,
                        error: null,
                        filters: panelFilters,
                        dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                        showLegend: false,
                        rawGraphResponse: graphResponse // Store for sourceStr filtering
                    });
                    
                    // Update available sourceStrs for this panel
                    if (profile.panels[0]?.panelId === panel.panelId) {
                        setAvailableSourceStrs(sourceStrsInData);
                        setRawGraphResponse(graphResponse);
                    } else {
                        setPanelAvailableSourceStrs(prev => ({
                            ...prev,
                            [panel.panelId]: sourceStrsInData
                        }));
                        setPanelRawGraphResponses(prev => ({
                            ...prev,
                            [panel.panelId]: graphResponse
                        }));
                    }
                } catch (panelErr) {
                    console.error(`Failed to load data for panel ${panel.panelId}:`, panelErr);
                    newPanelsData.set(panel.panelId, {
                        graphData: [],
                        eventKeys: [],
                        pieChartData: null,
                        loading: false,
                        error: `Failed to load: ${panelErr instanceof Error ? panelErr.message : 'Unknown error'}`,
                        filters: panelFilters,
                        dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                        showLegend: false
                    });
                }
            }
            
            setPanelsDataMap(newPanelsData);
            
            // Also set the first panel's data to the main state for backward compatibility
            const firstPanelData = newPanelsData.get(profile.panels[0]?.panelId);
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
        // Only auto-load on initial mount (when profile and events first become available)
        // After that, user must click "Apply Filters" button
        if (!loading && profile && events.length > 0 && graphData.length === 0) {
            loadData();
            loadAlerts(); // Load critical alerts too
            // Clear pending refresh after initial load
            setPendingRefresh(false);
            // Clear all panel filter changes after initial load
            setPanelFilterChanges({});
            // Mark initial load as complete after a short delay
            setTimeout(() => {
                initialLoadComplete.current = true;
            }, 500);
        }
    }, [loading, profile, events, loadData, loadAlerts]);

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

    const handleFilterChange = (type: keyof FilterState, values: string[]) => {
        const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
        
        // Update the main panel's filter state (first panel)
        if (profile?.panels && profile.panels.length > 0) {
            const mainPanelId = profile.panels[0].panelId;
            
            // Update panel-specific filters for the main panel
            setPanelFiltersState(prev => ({
                ...prev,
                [mainPanelId]: {
                    ...prev[mainPanelId],
                    [type]: numericValues
                }
            }));
            
            // Mark that this panel's filters have changed
            setPanelFilterChanges(prev => ({
                ...prev,
                [mainPanelId]: true
            }));
        }
        
        // Also update global state for backward compatibility (but this won't be used)
        setFilters(prev => ({ ...prev, [type]: numericValues }));
        setPendingRefresh(true);
    };

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;
    if (!profile) return <div className="p-8 text-center text-destructive">Profile not found</div>;

    // Calculate totals
    const totalCount = graphData.reduce((sum, d) => sum + (d.count || 0), 0);
    const totalSuccess = graphData.reduce((sum, d) => sum + (d.successCount || 0), 0);
    const totalFail = graphData.reduce((sum, d) => sum + (d.failCount || 0), 0);

    // Dropdown options with indicators for error/avg events
    const eventOptions = events.map(e => {
        let label = e.eventName;
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
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
            {/* Header */}
            <motion.div 
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div>
                    <motion.h1 
                        className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Sparkles className="h-5 w-5 text-purple-500" />
                        </motion.span>
                        {profile.profileName}
                    </motion.h1>
                    <motion.p 
                        className="text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Last updated: {lastUpdated.toLocaleTimeString()}
                        {dataLoading && (
                            <motion.span 
                                className="ml-2 text-primary"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                • Loading...
                            </motion.span>
                        )}
                    </motion.p>
                </div>

                <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {onEditProfile && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button variant="outline" size="sm" onClick={() => onEditProfile(profile)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                        </motion.div>
                    )}
                    <Popover>
                        <PopoverTrigger asChild>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline" size="sm">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {`${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`}
                                </Button>
                            </motion.div>
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
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleApplyFilters} 
                            disabled={dataLoading}
                            className={cn(
                                "transition-all duration-300",
                                pendingRefresh && "border-amber-400 text-amber-600 hover:bg-amber-50"
                            )}
                        >
                            <motion.div
                                animate={dataLoading ? { rotate: 360 } : {}}
                                transition={{ duration: 1, repeat: dataLoading ? Infinity : 0, ease: "linear" }}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                            </motion.div>
                            {pendingRefresh ? "Apply" : "Refresh"}
                        </Button>
                    </motion.div>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {error && (
                    <motion.div 
                        className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ==================== CRITICAL ALERTS PANEL (Panel 0) ==================== */}
            {/* Fully independent, collapsible panel with its own filters */}
            {/* Only show if criticalAlerts.enabled is true in the profile */}
            {profile?.criticalAlerts?.enabled !== false && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative"
            >
                <Card className={cn(
                    "border-2 overflow-hidden transition-all duration-300",
                    alertsPanelCollapsed 
                        ? "border-red-200/50 dark:border-red-500/20" 
                        : "border-red-300 dark:border-red-500/40 shadow-lg shadow-red-500/10"
                )}>
                    {/* Collapsed Header Bar */}
                    <div 
                        className={cn(
                            "flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-300",
                            alertsPanelCollapsed 
                                ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10" 
                                : "bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/20"
                        )}
                        onClick={() => setAlertsPanelCollapsed(!alertsPanelCollapsed)}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div 
                                className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                                    criticalAlerts.length > 0 
                                        ? "bg-gradient-to-br from-red-500 to-orange-600" 
                                        : "bg-gradient-to-br from-green-500 to-emerald-600"
                                )}
                                animate={criticalAlerts.length > 0 ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {criticalAlerts.length > 0 ? (
                                    <Bell className="h-5 w-5 text-white" />
                                ) : (
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                )}
                            </motion.div>
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                                        Critical Alerts Monitor
                                    </span>
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                        Panel 0
                                    </span>
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {criticalAlerts.length > 0 ? (
                                        <span className="flex items-center gap-1">
                                            <motion.span 
                                                className="inline-block w-2 h-2 rounded-full bg-red-500"
                                                animate={{ opacity: [1, 0.3, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                            {criticalAlerts.length} active alert{criticalAlerts.length !== 1 ? 's' : ''} require attention
                                        </span>
                                    ) : (
                                        <span className="text-green-600 dark:text-green-400">✓ All systems operating normally</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {criticalAlerts.length > 0 && (
                                <motion.div 
                                    className="px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold shadow-lg"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    {criticalAlerts.length}
                                </motion.div>
                            )}
                            <motion.div
                                animate={{ rotate: alertsPanelCollapsed ? 0 : 180 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Expandable Content */}
                    <AnimatePresence>
                        {!alertsPanelCollapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                {/* Alert Filters Section */}
                                <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/30 border-b border-red-100 dark:border-red-500/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Alert Filters</span>
                                        <span className="text-xs text-muted-foreground">(Independent from dashboard)</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                        {/* Date Range */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Date Range</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                                        {alertDateRange.from.toLocaleDateString()} - {alertDateRange.to.toLocaleDateString()}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="range"
                                                        selected={{ from: alertDateRange.from, to: alertDateRange.to }}
                                                        onSelect={(range) => {
                                                            if (range?.from && range?.to) {
                                                                setAlertDateRange({ from: range.from, to: range.to });
                                                            }
                                                        }}
                                                        numberOfMonths={2}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* Platform Filter - MultiSelect */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Platform</Label>
                                            <MultiSelectDropdown
                                                options={PLATFORMS.map(p => ({ value: String(p.id), label: p.name }))}
                                                selected={alertFilters.platforms.map(String)}
                                                onChange={(values) => setAlertFilters(prev => ({
                                                    ...prev,
                                                    platforms: values
                                                }))}
                                                placeholder="All Platforms"
                                                className="h-9"
                                            />
                                        </div>

                                        {/* POS Filter - MultiSelect */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">POS</Label>
                                            <MultiSelectDropdown
                                                options={siteDetails.map(s => ({ value: String(s.id), label: `${s.name} (${s.id})` }))}
                                                selected={alertFilters.pos.map(String)}
                                                onChange={(values) => setAlertFilters(prev => ({
                                                    ...prev,
                                                    pos: values.map(v => parseInt(v))
                                                }))}
                                                placeholder="All POS"
                                                className="h-9"
                                            />
                                        </div>

                                        {/* Event Filter - MultiSelect */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Event</Label>
                                            <MultiSelectDropdown
                                                options={events.map(e => ({ value: e.eventId, label: e.eventName }))}
                                                selected={alertFilters.events.map(String)}
                                                onChange={(values) => setAlertFilters(prev => ({
                                                    ...prev,
                                                    events: values.map(v => parseInt(v))
                                                }))}
                                                placeholder="All Events"
                                                className="h-9"
                                            />
                                        </div>

                                        {/* Refresh Button */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                            <Button 
                                                onClick={() => loadAlerts(alertsExpanded)}
                                                disabled={alertsLoading}
                                                size="sm"
                                                className="w-full h-9 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                                            >
                                                {alertsLoading ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 mr-1" />
                                                        Refresh Alerts
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Alerts Content */}
                                <CardContent className="pt-4">
                                    {alertsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <RefreshCw className="h-8 w-8 animate-spin text-red-500 mb-2" />
                                            <p className="text-sm text-muted-foreground">Loading alerts...</p>
                                        </div>
                                    ) : criticalAlerts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                                            </div>
                                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">No Critical Alerts</p>
                                            <p className="text-sm text-muted-foreground">All monitored metrics are within expected thresholds</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Alert Stats Summary */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30">
                                                    <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
                                                    <div className="text-xs text-muted-foreground">Total Alerts</div>
                                                </div>
                                                <div className="px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30">
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {new Set(criticalAlerts.map(a => a.pos)).size}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Affected POS</div>
                                                </div>
                                                <div className="px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30">
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {new Set(criticalAlerts.map(a => a.eventId)).size}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Event Types</div>
                                                </div>
                                                <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {new Set(criticalAlerts.map(a => a.details?.metric)).size}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">Metrics</div>
                                                </div>
                                            </div>

                                            {/* Alerts List */}
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                                {criticalAlerts.slice(0, alertsExpanded ? 20 : 5).map((alert, idx) => {
                                                    const eventName = alert.details?.eventName || `Event ${alert.eventId}`;
                                                    const posName = siteDetails.find(s => s.id === alert.pos)?.name || `POS ${alert.pos}`;
                                                    const timestamp = new Date(alert.details?.timestamp || alert.create_time);
                                                    const currentValue = alert.details?.currentValue;
                                                    const expectedValue = alert.details?.expectedValue;
                                                    const threshold = alert.details?.threshold;
                                                    const metric = alert.details?.metric || 'unknown';
                                                    const deviation = expectedValue ? Math.abs(((currentValue - expectedValue) / expectedValue) * 100).toFixed(1) : null;
                                                    
                                                    return (
                                                        <motion.div
                                                            key={alert.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="group relative p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-red-200 dark:border-red-500/30 hover:shadow-lg hover:border-red-300 dark:hover:border-red-500/50 transition-all duration-200"
                                                        >
                                                            {/* Priority indicator */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-red-500 to-orange-500" />
                                                            
                                                            <div className="flex items-start justify-between gap-4 pl-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                        <motion.div 
                                                                            className="h-2.5 w-2.5 rounded-full bg-red-500"
                                                                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                                        />
                                                                        <span className="font-semibold text-sm">{eventName}</span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                                                                            {posName}
                                                                        </span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium">
                                                                            {metric}
                                                                        </span>
                                                                        {deviation && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-medium">
                                                                                ↑ {deviation}% deviation
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                                                                        <div>
                                                                            <span className="text-muted-foreground">Current: </span>
                                                                            <span className="font-bold text-red-600">{currentValue?.toLocaleString()}</span>
                                                                        </div>
                                                                        {expectedValue && (
                                                                            <div>
                                                                                <span className="text-muted-foreground">Expected: </span>
                                                                                <span className="font-medium text-green-600">{Math.round(expectedValue).toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                        {threshold && (
                                                                            <div>
                                                                                <span className="text-muted-foreground">Threshold: </span>
                                                                                <span className="font-medium text-orange-600">{Math.round(threshold).toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="text-right shrink-0">
                                                                    <div className="text-xs font-medium text-muted-foreground">
                                                                        {timestamp.toLocaleDateString()}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>

                                            {/* Pagination & View Controls */}
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-red-100 dark:border-red-500/20">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setAlertsExpanded(!alertsExpanded);
                                                        if (!alertsExpanded) {
                                                            loadAlerts(true);
                                                        }
                                                    }}
                                                >
                                                    {alertsExpanded ? (
                                                        <>
                                                            <ChevronUp className="h-4 w-4 mr-1" />
                                                            Show Less
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-4 w-4 mr-1" />
                                                            Show More ({criticalAlerts.length - 5} more)
                                                        </>
                                                    )}
                                                </Button>
                                                
                                                {alertsExpanded && (
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={alertsPage === 0}
                                                            onClick={() => {
                                                                setAlertsPage(Math.max(0, alertsPage - 1));
                                                                loadAlerts(true);
                                                            }}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        <span className="text-sm text-muted-foreground px-2">
                                                            Page {alertsPage + 1}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={criticalAlerts.length < 20}
                                                            onClick={() => {
                                                                setAlertsPage(alertsPage + 1);
                                                                loadAlerts(true);
                                                            }}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
            )}

            {/* ==================== MAIN DASHBOARD FILTERS (Panel 1+) ==================== */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className={cn(
                    "border-2 overflow-hidden group transition-all duration-300",
                    pendingRefresh 
                        ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-500/20" 
                        : "border-primary/20 hover:border-primary/40"
                )}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <motion.span 
                                className={cn(
                                    "w-2 h-2 rounded-full",
                                    pendingRefresh ? "bg-amber-500" : "bg-primary"
                                )}
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: pendingRefresh ? 1 : 2, repeat: Infinity }}
                            />
                            Filters
                            {pendingRefresh && (
                                <motion.span 
                                    className="text-xs px-2 py-1 bg-amber-500 text-white rounded-full font-medium"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                >
                                    Changed
                                </motion.span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <motion.div 
                                className="space-y-2"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platform</Label>
                                <MultiSelectDropdown
                                    options={platformOptions}
                                    selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.platforms || []) : []).map(id => id.toString())}
                                    onChange={(values) => handleFilterChange('platforms', values)}
                                    placeholder="Select platforms"
                                />
                            </motion.div>
                            <motion.div 
                                className="space-y-2"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">POS</Label>
                                <MultiSelectDropdown
                                    options={posOptions}
                                    selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.pos || []) : []).map(id => id.toString())}
                                    onChange={(values) => handleFilterChange('pos', values)}
                                    placeholder="Select POS"
                                />
                            </motion.div>
                            <motion.div 
                                className="space-y-2"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Source</Label>
                                <MultiSelectDropdown
                                    options={sourceOptions}
                                    selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.sources || []) : []).map(id => id.toString())}
                                    onChange={(values) => handleFilterChange('sources', values)}
                                    placeholder="Select sources"
                                />
                            </motion.div>
                            <motion.div 
                                className="space-y-2"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Event</Label>
                                <MultiSelectDropdown
                                    options={eventOptions}
                                    selected={(profile?.panels?.[0] ? (panelFiltersState[profile.panels[0].panelId]?.events || []) : []).map(id => id.toString())}
                                    onChange={(values) => handleFilterChange('events', values)}
                                    placeholder="Select events"
                                />
                            </motion.div>
                        </div>
                        
                        {/* Job ID (sourceStr) Filter - Only shown when data contains sourceStr values */}
                        {availableSourceStrs.length > 0 && (
                            <motion.div 
                                className="mt-4 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-500/30"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
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
                            </motion.div>
                        )}
                        
                        {/* Apply Filters Button and Auto-refresh Config */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-4">
                                {/* Prominent Apply Filters button with clear visual cue */}
                                <motion.div 
                                    whileHover={{ scale: 1.03 }} 
                                    whileTap={{ scale: 0.97 }}
                                    animate={pendingRefresh ? { scale: [1, 1.02, 1] } : {}}
                                    transition={pendingRefresh ? { duration: 1.5, repeat: Infinity } : {}}
                                >
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
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <RefreshCw className="mr-2 h-5 w-5" />
                                            </motion.div>
                                        ) : (
                                            <RefreshCw className={cn("mr-2 h-5 w-5", pendingRefresh && "animate-spin")} />
                                        )}
                                        {pendingRefresh ? "⚡ APPLY CHANGES" : "Refresh This Panel"}
                                        {pendingRefresh && (
                                            <motion.div
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                            >
                                                !
                                            </motion.div>
                                        )}
                                    </Button>
                                </motion.div>
                                {pendingRefresh && (
                                    <motion.span 
                                        className="text-sm text-red-600 dark:text-red-400 font-medium"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                    >
                                        Filters changed! Click to update data.
                                    </motion.span>
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
                                    <motion.span 
                                        className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <motion.div
                                            className="w-2 h-2 rounded-full bg-green-500"
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                        Active
                                    </motion.span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Total Count Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="group"
                >
                    <Card className="relative bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-blue-500/20 hover:border-blue-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                        {/* Animated background shimmer */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/10 to-blue-500/0"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                        />
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-400/20 to-transparent" />
                        
                        <CardContent className="pt-5 pb-4 relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <motion.div 
                                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3"
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                    >
                                        <Hash className="h-5 w-5 text-white" />
                                    </motion.div>
                                    <motion.div 
                                        className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", delay: 0.5 }}
                                    >
                                        <AnimatedNumber value={totalCount} />
                                    </motion.div>
                                    <div className="text-sm text-muted-foreground mt-1 font-medium">Total Events</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <MiniSparkline data={graphData.slice(-7).map(d => d.count || 0)} color="#6366f1" />
                                    <motion.div 
                                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <Activity className="h-3 w-3" />
                                        <span>Last 7 days</span>
                                    </motion.div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Success Count Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="group"
                >
                    <Card className="relative bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20 hover:border-green-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-400/10 to-green-500/0"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5 }}
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-green-400/20 to-transparent" />
                        
                        <CardContent className="pt-5 pb-4 relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <motion.div 
                                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 mb-3"
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                    >
                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                    </motion.div>
                                    <motion.div 
                                        className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", delay: 0.6 }}
                                    >
                                        <AnimatedNumber value={totalSuccess} />
                                    </motion.div>
                                    <div className="text-sm text-muted-foreground mt-1 font-medium">Success Count</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {/* Success Rate Badge */}
                                    <motion.div 
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            (totalSuccess / totalCount * 100) >= 90 
                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' 
                                                : (totalSuccess / totalCount * 100) >= 70 
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                        }`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", delay: 0.9 }}
                                    >
                                        {(totalSuccess / totalCount * 100) >= 90 ? (
                                            <ArrowUpRight className="h-3 w-3" />
                                        ) : (
                                            <ArrowDownRight className="h-3 w-3" />
                                        )}
                                        {totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0}%
                                    </motion.div>
                                    <MiniSparkline data={graphData.slice(-7).map(d => d.successCount || 0)} color="#22c55e" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Fail Count Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="group"
                >
                    <Card className="relative bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 border-red-500/20 hover:border-red-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-400/10 to-red-500/0"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-red-400/20 to-transparent" />
                        
                        <CardContent className="pt-5 pb-4 relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <motion.div 
                                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 mb-3"
                                        whileHover={{ rotate: 10, scale: 1.1 }}
                                    >
                                        <XCircle className="h-5 w-5 text-white" />
                                    </motion.div>
                                    <motion.div 
                                        className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", delay: 0.7 }}
                                    >
                                        <AnimatedNumber value={totalFail} />
                                    </motion.div>
                                    <div className="text-sm text-muted-foreground mt-1 font-medium">Fail Count</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {/* Alert indicator for high fail rate */}
                                    {totalFail > 0 && (totalFail / totalCount * 100) > 10 && (
                                        <motion.div 
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            <Flame className="h-3 w-3" />
                                            Alert
                                        </motion.div>
                                    )}
                                    <MiniSparkline data={graphData.slice(-7).map(d => d.failCount || 0)} color="#ef4444" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Selected Events Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.03, y: -4 }}
                    className="group"
                >
                    <Card className="relative bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-fuchsia-500/10 border-purple-500/20 hover:border-purple-400/50 transition-all duration-300 cursor-pointer overflow-hidden">
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-400/10 to-purple-500/0"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.5 }}
                        />
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400/20 to-transparent" />
                        
                        <CardContent className="pt-5 pb-4 relative">
                            <div className="flex items-start justify-between mb-2">
                                <motion.div 
                                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30"
                                    whileHover={{ rotate: 10, scale: 1.1 }}
                                >
                                    <Target className="h-5 w-5 text-white" />
                                </motion.div>
                                <motion.div 
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 1 }}
                                >
                                    <AnimatedNumber value={selectedEventsList.length} suffix={` event${selectedEventsList.length !== 1 ? 's' : ''}`} />
                                </motion.div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[52px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-600">
                                <AnimatePresence mode="popLayout">
                                    {selectedEventsList.length > 0 ? selectedEventsList.slice(0, 6).map((eventName, idx) => (
                                        <motion.span 
                                            key={eventName}
                                            layout
                                            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.6, rotate: 10 }}
                                            transition={{ type: "spring", delay: idx * 0.05 }}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 dark:from-purple-500/20 dark:to-violet-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            {eventName}
                                        </motion.span>
                                    )) : (
                                        <motion.span 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-muted-foreground text-sm italic"
                                        >
                                            All events selected
                                        </motion.span>
                                    )}
                                    {selectedEventsList.length > 6 && (
                                        <motion.span 
                                            initial={{ opacity: 0, scale: 0.6 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg"
                                        >
                                            +{selectedEventsList.length - 6} more
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2 font-medium">Selected Events</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Main Chart - Count Events Only */}
            {normalEventKeys.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Card className="border-2 border-purple-100 dark:border-purple-500/20 overflow-hidden shadow-lg">
                    <CardHeader className="pb-2 px-3 md:px-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                >
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base md:text-lg">Event Count Trends</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {/* Mobile: Click • Desktop: Hover */}
                                        <span className="hidden md:inline">Count-based events • Hover for insights</span>
                                        <span className="md:hidden">Tap data points for insights</span>
                                    </p>
                                </div>
                            </div>
                            {/* Event count indicator moved to CollapsibleLegend which now shows per-event stats */}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 relative px-2 md:px-6 pb-4 md:pb-6">
                        {/* Collapsible Legend - Only normal (count) events */}
                        {normalEventKeys.length > 0 && (
                            <CollapsibleLegend 
                                eventKeys={normalEventKeys}
                                events={events}
                                isExpanded={mainLegendExpanded}
                                onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                maxVisibleItems={5}
                                graphData={graphData}
                                selectedEventKey={selectedEventKey}
                                onEventClick={handleEventClick}
                            />
                        )}

                        {/* Pinned Tooltip Overlay - Rendered outside chart for persistence */}
                        <AnimatePresence>
                            {pinnedTooltip && (
                                <motion.div 
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setPinnedTooltip(null)}
                                >
                                    {/* Backdrop with gradient */}
                                    <motion.div 
                                        className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-purple-900/20 backdrop-blur-md"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    />
                                    
                                    {/* Modal Container */}
                                    <motion.div
                                        className="relative z-10 w-full max-w-[420px] sm:max-w-[480px]"
                                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Floating Close Button - Outside the card */}
                                        <motion.button
                                            type="button"
                                            onClick={() => setPinnedTooltip(null)}
                                            className="absolute -top-3 -right-3 z-20 h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 transition-all duration-200"
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            aria-label="Close details"
                                        >
                                            <X className="h-5 w-5" />
                                        </motion.button>
                                        
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
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="h-[300px] sm:h-[400px] md:h-[520px] w-full cursor-pointer">
                            {graphData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Check if profile has bar chart type */}
                                    {(profile?.panels?.[0] as any)?.filterConfig?.graphType === 'bar' ? (
                                        <BarChart
                                            data={graphData}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                            barCategoryGap="15%"
                                            onClick={(chartState: any) => {
                                                console.log('BarChart onClick triggered:', chartState);
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
                                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
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
                                                return (
                                                    <Bar 
                                                        key={`bar_${eventKey}`}
                                                        dataKey={`${eventKey}_count`}
                                                        name={eventKeyInfo.eventName}
                                                        yAxisId="left"
                                                        fill={`url(#barColor_${eventKey})`}
                                                        radius={[3, 3, 0, 0]}
                                                        maxBarSize={40}
                                                        opacity={selectedEventKey && selectedEventKey !== eventKey ? 0.4 : 1}
                                                        cursor="pointer"
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
                                                />
                                            )}
                                        </BarChart>
                                    ) : (
                                        <AreaChart
                                            data={graphData}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                                            onClick={(chartState: any) => {
                                                console.log('AreaChart onClick triggered:', chartState);
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
                                                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                                                        </linearGradient>
                                                    );
                                                })}
                                                {/* Glow filters for lines */}
                                                <filter id="glow">
                                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur"/>
                                                        <feMergeNode in="SourceGraphic"/>
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
                                            {normalEventKeys.length > 0 ? normalEventKeys.map((eventKeyInfo, index) => {
                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                const eventKey = eventKeyInfo.eventKey;
                                                return (
                                                    <Area 
                                                        key={`area_${eventKey}`}
                                                        type="monotone" 
                                                        dataKey={`${eventKey}_count`}
                                                        name={eventKeyInfo.eventName}
                                                        yAxisId="left"
                                                        stroke={color} 
                                                        strokeWidth={selectedEventKey === eventKey ? 4 : 2.5}
                                                        fillOpacity={selectedEventKey && selectedEventKey !== eventKey ? 0.3 : 1} 
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
                                                    />
                                                )}
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
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
                </Card>
            </motion.div>
            )}

            {/* Time Delay Chart - For isAvg Events Only */}
            {avgEventKeys.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
            >
                <Card className="border-2 border-amber-100 dark:border-amber-500/20 overflow-hidden shadow-lg">
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
                                                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                                        <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
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
                                        {avgEventKeys.map((eventKeyInfo, index) => {
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

            {/* Error Events Chart - For isError Events Only (not isAvg) */}
            {errorEventKeys.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card className="border-2 border-red-100 dark:border-red-500/20 overflow-hidden shadow-lg">
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
                                selectedEventKey={selectedEventKey}
                                onEventClick={handleEventClick}
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
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                                            </linearGradient>
                                            {/* Success gradient (green) */}
                                            <linearGradient id="okGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
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
                                        {errorEventKeys.map((eventKeyInfo) => {
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
                    <motion.div 
                        className={cn("grid gap-3 md:gap-4", gridClass)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        {/* Platform Distribution */}
                        {showPlatform && (
                            <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                                <Card className="border-2 border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-500/5 dark:to-violet-500/5 overflow-hidden group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <motion.div 
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md"
                                                    whileHover={{ rotate: 15 }}
                                                >
                                                    <Activity className="h-4 w-4 text-white" />
                                                </motion.div>
                                                <CardTitle className="text-sm font-semibold text-foreground">Platform</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <motion.span 
                                                    className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    {platformData.length} types
                                                </motion.span>
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
                            </motion.div>
                        )}

                        {/* POS Distribution */}
                        {showPos && (
                            <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                                <Card className="border-2 border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-500/5 dark:to-teal-500/5 overflow-hidden group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <motion.div 
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md"
                                                    whileHover={{ rotate: 15 }}
                                                >
                                                    <Target className="h-4 w-4 text-white" />
                                                </motion.div>
                                                <CardTitle className="text-sm font-semibold text-foreground">POS</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <motion.span 
                                                    className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    {posData.length} types
                                                </motion.span>
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
                            </motion.div>
                        )}

                        {/* Source Distribution */}
                        {showSource && (
                            <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                                <Card className="border-2 border-amber-100 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-500/5 dark:to-orange-500/5 overflow-hidden group">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <motion.div 
                                                    className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md"
                                                    whileHover={{ rotate: 15 }}
                                                >
                                                    <Zap className="h-4 w-4 text-white" />
                                                </motion.div>
                                                <CardTitle className="text-sm font-semibold text-foreground">Source</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <motion.span 
                                                    className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    {sourceData.length} types
                                                </motion.span>
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
                            </motion.div>
                        )}
                    </motion.div>
                );
            })()}

            {/* Hourly Stats Card - shown below Pie Charts for ≤7 day ranges when enabled */}
            {isHourly && graphData.length > 0 && (profile?.panels?.[0] as any)?.filterConfig?.showHourlyStats !== false && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <HourlyStatsCard graphData={graphData} isHourly={isHourly} eventKeys={eventKeys} events={events} />
                </motion.div>
            )}

            {/* Additional Panels (if profile has more than one panel) */}
            {profile.panels.length > 1 && profile.panels.slice(1).map((panel, panelIndex) => {
                const panelData = panelsDataMap.get(panel.panelId);
                const pGraphData = panelData?.graphData || [];
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
                const panelConfig = (panel as any).filterConfig;
                const panelGraphType = panelConfig?.graphType || 'line';
                
                // Calculate totals for this panel (using event keys if available)
                const pTotalCount = pGraphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
                const pTotalSuccess = pGraphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
                const pTotalFail = pGraphData.reduce((sum: number, d: any) => sum + (d.failCount || 0), 0);

                // Dropdown options for this panel's filters (with isError/isAvg badges)
                const pEventOptions = events.map(e => {
                    let label = e.eventName;
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
                                        Panel {panelIndex + 2}: {panel.panelName}
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Panel Header Card with Filters */}
                        <Card className="border-2 border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-900/20 dark:to-fuchsia-900/10">
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
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                                    panelGraphType === 'bar' 
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                        : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                )}>
                                                    {panelGraphType === 'bar' ? 'Bar Chart' : 'Line Chart'}
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
                                <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-purple-100 dark:border-purple-500/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Panel Filters</span>
                                        </div>
                                        <motion.div
                                            animate={panelFilterChanges[panel.panelId] ? { scale: [1, 1.02, 1] } : {}}
                                            transition={panelFilterChanges[panel.panelId] ? { duration: 1.5, repeat: Infinity } : {}}
                                        >
                                            <Button
                                                onClick={() => handlePanelRefresh(panel.panelId)}
                                                disabled={isPanelLoading}
                                                size="sm"
                                                className={cn(
                                                    "relative transition-all duration-300 shadow-md font-semibold",
                                                    panelFilterChanges[panel.panelId]
                                                        ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/40 border-2 border-red-300"
                                                        : "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white"
                                                )}
                                            >
                                                {isPanelLoading ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                                ) : (
                                                    <RefreshCw className={cn("w-4 h-4 mr-1.5", panelFilterChanges[panel.panelId] && "animate-spin")} />
                                                )}
                                                {panelFilterChanges[panel.panelId] ? "⚡ APPLY" : "Refresh"}
                                                {panelFilterChanges[panel.panelId] && (
                                                    <motion.div
                                                        className="absolute -top-2 -right-2 w-4 h-4 bg-white text-red-600 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                                        animate={{ scale: [1, 1.3, 1] }}
                                                        transition={{ duration: 0.8, repeat: Infinity }}
                                                    >
                                                        !
                                                    </motion.div>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </div>
                                    
                                    {/* Date Range Picker for Panel */}
                                    <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={currentPanelDateRange.from.toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const newFrom = new Date(e.target.value);
                                                        updatePanelDateRange(panel.panelId, newFrom, currentPanelDateRange.to);
                                                    }}
                                                    className="px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                                                />
                                                <span className="text-gray-500">to</span>
                                                <input
                                                    type="date"
                                                    value={currentPanelDateRange.to.toISOString().split('T')[0]}
                                                    onChange={(e) => {
                                                        const newTo = new Date(e.target.value);
                                                        updatePanelDateRange(panel.panelId, currentPanelDateRange.from, newTo);
                                                    }}
                                                    className="px-2 py-1 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Events</label>
                                            <MultiSelectDropdown
                                                options={pEventOptions}
                                                selected={currentPanelFilters.events.map(id => id.toString())}
                                                onChange={(values) => {
                                                    const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                                                    updatePanelFilter(panel.panelId, 'events', numericValues);
                                                }}
                                                placeholder="Select events"
                                            />
                                        </div>
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* Panel Stats */}
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

                        {/* Separate event keys by type for this panel */}
                        {(() => {
                            // Events with BOTH isAvg and isError go to isAvg
                            const pAvgEventKeys = pEventKeys.filter(ek => ek.isAvgEvent === 1);
                            const pErrorEventKeys = pEventKeys.filter(ek => ek.isErrorEvent === 1 && ek.isAvgEvent !== 1);
                            const pNormalEventKeys = pEventKeys.filter(ek => ek.isAvgEvent !== 1 && ek.isErrorEvent !== 1);
                            
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
                                    {/* Panel Chart - Normal Events (count) */}
                                    {pNormalEventKeys.length > 0 && (
                                        <Card className="border-2 border-violet-100 dark:border-violet-500/20">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-purple-500" />
                                                        Event Trends (Count)
                                                    </CardTitle>
                                                    <span className="text-xs text-muted-foreground">{pNormalEventKeys.length} events</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <CollapsibleLegend 
                                                    eventKeys={pNormalEventKeys}
                                                    events={events}
                                                    isExpanded={panelLegendExpanded[panel.panelId] || false}
                                                    onToggle={() => togglePanelLegend(panel.panelId)}
                                                    maxVisibleItems={4}
                                                    graphData={pGraphData}
                                                    selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                    onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {pGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                <defs>
                                                                    {pNormalEventKeys.map((eventKeyInfo, index) => {
                                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                        return (
                                                                            <linearGradient key={`normalGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`normalColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                                                                <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                                                                            </linearGradient>
                                                                        );
                                                                    })}
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(pGraphData.length / 6)} />
                                                                <YAxis 
                                                                    tick={{ fill: '#6b7280', fontSize: 10 }} 
                                                                    axisLine={false} 
                                                                    tickLine={false}
                                                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                                />
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pNormalEventKeys} />} />
                                                                {pNormalEventKeys.map((eventKeyInfo, index) => {
                                                                    const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                    const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                    return (
                                                                        <Area 
                                                                            key={`normal_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                            type="monotone"
                                                                            dataKey={`${eventKeyInfo.eventKey}_count`}
                                                                            name={eventKeyInfo.eventName}
                                                                            stroke={color}
                                                                            strokeWidth={2.5}
                                                                            fill={`url(#normalColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
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

                                    {/* Panel Chart - isAvg Events (Time Delay) */}
                                    {pAvgEventKeys.length > 0 && (
                                        <Card className="border-2 border-amber-100 dark:border-amber-500/20">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-amber-500" />
                                                        <CardTitle className="text-base font-semibold">Time Delay Trends</CardTitle>
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
                                                    graphData={pGraphData}
                                                    selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                    onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {pGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                <defs>
                                                                    {pAvgEventKeys.map((eventKeyInfo, index) => {
                                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                        return (
                                                                            <linearGradient key={`avgGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`avgColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                                                                <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                                                                            </linearGradient>
                                                                        );
                                                                    })}
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(pGraphData.length / 6)} />
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
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pAvgEventKeys} />} />
                                                                {pAvgEventKeys.map((eventKeyInfo, index) => {
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

                                    {/* Panel Chart - isError Events (Error Tracking) */}
                                    {pErrorEventKeys.length > 0 && (
                                        <Card className="border-2 border-red-100 dark:border-red-500/20">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                                        <CardTitle className="text-base font-semibold">Error Event Trends</CardTitle>
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
                                                    graphData={pGraphData}
                                                    selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                    onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {pGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                <defs>
                                                                    {pErrorEventKeys.map((eventKeyInfo) => (
                                                                        <linearGradient key={`errorGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`errorColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                                                                        </linearGradient>
                                                                    ))}
                                                                    <linearGradient id={`errorSuccessGrad_${panel.panelId}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(pGraphData.length / 6)} />
                                                                <YAxis 
                                                                    tick={{ fill: '#ef4444', fontSize: 10 }} 
                                                                    axisLine={false} 
                                                                    tickLine={false}
                                                                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                                                />
                                                                <Tooltip content={<CustomTooltip events={events} eventKeys={pErrorEventKeys} />} />
                                                                {pErrorEventKeys.map((eventKeyInfo) => {
                                                                    const eventKey = eventKeyInfo.eventKey;
                                                                    return (
                                                                        <React.Fragment key={`error_frag_${panel.panelId}_${eventKey}`}>
                                                                            {/* Error count (red) */}
                                                                            <Area 
                                                                                type="monotone"
                                                                                dataKey={`${eventKey}_success`}
                                                                                name={`${eventKeyInfo.eventName} (Errors)`}
                                                                                stroke="#ef4444"
                                                                                strokeWidth={2.5}
                                                                                fill={`url(#errorColor_${panel.panelId}_${eventKey})`}
                                                                                dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
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
                                        </Card>
                                    )}

                                    {/* Fallback - All events in one chart if no type separation */}
                                    {pNormalEventKeys.length === 0 && pAvgEventKeys.length === 0 && pErrorEventKeys.length === 0 && pEventKeys.length > 0 && (
                                        <Card className="border-2 border-violet-100 dark:border-violet-500/20">
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
                                                    graphData={pGraphData}
                                                    selectedEventKey={panelSelectedEventKey[panel.panelId] || null}
                                                    onEventClick={(eventKey) => handlePanelEventClick(panel.panelId, eventKey)}
                                                />
                                                <div className="h-[400px]">
                                                    {pGraphData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                                <defs>
                                                                    {pEventKeys.map((eventKeyInfo, index) => {
                                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                                        return (
                                                                            <linearGradient key={`fallbackGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`fallbackColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                                                                <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                                                                            </linearGradient>
                                                                        );
                                                                    })}
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                                <XAxis dataKey="date" tick={<CustomXAxisTick />} tickLine={false} height={45} interval={Math.floor(pGraphData.length / 6)} />
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
                        })()}

                        {/* Panel Pie Charts - shown ABOVE Hourly Insights */}
                        {panel.visualizations.pieCharts.some(p => p.enabled) && (() => {
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
                        })()}

                        {/* Panel Hourly Stats Card - shown BELOW Pie Charts for ≤7 day ranges when enabled */}
                        {isHourly && pGraphData.length > 0 && panelConfig?.showHourlyStats !== false && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 * (panelIndex + 1) }}
                            >
                                <HourlyStatsCard graphData={pGraphData} isHourly={isHourly} eventKeys={pEventKeys} events={events} />
                            </motion.div>
                        )}
                    </motion.div>
                );
            })}

            {/* Expanded Pie Chart Modal */}
            <ExpandedPieChartModal 
                open={pieModalOpen} 
                onClose={() => setPieModalOpen(false)} 
                pieData={expandedPie}
            />
        </motion.div>
        </>
    );
}
