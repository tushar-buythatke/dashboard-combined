import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useInView } from 'framer-motion';
import type { DashboardProfile, EventConfig } from '@/types/analytics';
import { apiService, PLATFORMS, SOURCES } from '@/services/apiService';
import type { SiteDetail } from '@/services/apiService';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Calendar as CalendarIcon, Edit, Sparkles, TrendingUp, TrendingDown, Activity, Zap, CheckCircle2, XCircle, BarChart3, ArrowUpRight, ArrowDownRight, Flame, Target, Hash, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Navigation, Layers } from 'lucide-react';
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

// Collapsible Legend Component - Smart dropdown for multiple events
const CollapsibleLegend = ({ 
    eventKeys, 
    events, 
    isExpanded, 
    onToggle,
    maxVisibleItems = 4 
}: { 
    eventKeys: EventKeyInfo[]; 
    events: EventConfig[]; 
    isExpanded: boolean;
    onToggle: () => void;
    maxVisibleItems?: number;
}) => {
    if (!eventKeys || eventKeys.length === 0) return null;
    
    const visibleItems = isExpanded ? eventKeys : eventKeys.slice(0, maxVisibleItems);
    const hiddenCount = eventKeys.length - maxVisibleItems;
    
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50/80 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {visibleItems.map((eventKeyInfo, index) => {
                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                return (
                    <div 
                        key={eventKeyInfo.eventKey}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <div 
                            className="w-3 h-3 rounded-full shadow-inner" 
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                            {eventKeyInfo.eventName}
                        </span>
                    </div>
                );
            })}
            {eventKeys.length > maxVisibleItems && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-7 px-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            +{hiddenCount} more
                        </>
                    )}
                </Button>
            )}
        </div>
    );
};

// Left Sidebar Navigation Component (unused)
const _LeftSidebarNav = ({ 
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
function HourlyStatsCard({ graphData, isHourly }: { graphData: any[]; isHourly: boolean }) {
    const [selectedHour, setSelectedHour] = useState(new Date().getHours());
    
    // Don't show if not hourly data or no data
    if (!isHourly || !graphData || graphData.length === 0) return null;

    // Group data by hour and calculate hourly totals
    const hourlyStats = new Map<number, { total: number; success: number; fail: number; count: number; dates: string[] }>();
    
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
        
        const existing = hourlyStats.get(hour) || { total: 0, success: 0, fail: 0, count: 0, dates: [] };
        hourlyStats.set(hour, {
            total: existing.total + (item.count || 0),
            success: existing.success + (item.successCount || 0),
            fail: existing.fail + (item.failCount || 0),
            count: existing.count + 1,
            dates: [...existing.dates, item.date || '']
        });
    });

    // Get sorted hours that have data
    const availableHours = Array.from(hourlyStats.keys()).sort((a, b) => a - b);
    
    // Calculate overall stats
    const overallTotal = graphData.reduce((sum: number, d: any) => sum + (d.count || 0), 0);
    const overallSuccess = graphData.reduce((sum: number, d: any) => sum + (d.successCount || 0), 0);
    const overallSuccessRate = overallTotal > 0 ? (overallSuccess / overallTotal) * 100 : 0;
    
    // Find peak and lowest hours
    let peakHour = 0, peakTotal = 0, lowestHour = 0, lowestTotal = Infinity;
    hourlyStats.forEach((stats, hour) => {
        if (stats.total > peakTotal) { peakTotal = stats.total; peakHour = hour; }
        if (stats.total < lowestTotal && stats.total > 0) { lowestTotal = stats.total; lowestHour = hour; }
    });

    const selectedStats = hourlyStats.get(selectedHour) || { total: 0, success: 0, fail: 0, count: 0, dates: [] };
    const avgPerHour = overallTotal / Math.max(availableHours.length, 1);
    const selectedVsAvg = avgPerHour > 0 ? ((selectedStats.total - avgPerHour) / avgPerHour) * 100 : 0;
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
        <Card className="border-2 border-cyan-100 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50/30 to-blue-50/20 dark:from-cyan-500/5 dark:to-blue-500/5 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div 
                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"
                            whileHover={{ rotate: 15, scale: 1.05 }}
                        >
                            <Clock className="h-5 w-5 text-white" />
                        </motion.div>
                        <div>
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                Hourly Insights
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-normal">
                                    {availableHours.length} hours tracked
                                </span>
                            </CardTitle>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                Analyze event distribution across different hours of the day
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-4">
                {/* Overall Summary Row */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/50 dark:border-blue-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Activity className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase">Total Events</span>
                        </div>
                        <div className="text-lg font-bold text-blue-600">{overallTotal.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">All hours combined</div>
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
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase">Peak Hour</span>
                        </div>
                        <div className="text-lg font-bold text-amber-600">{formatHourShort(peakHour)}</div>
                        <div className="text-[10px] text-muted-foreground">{peakTotal.toLocaleString()} events</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-200/50 dark:border-purple-500/20">
                        <div className="flex items-center gap-1 mb-1">
                            <Hash className="h-3 w-3 text-purple-500" />
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase">Avg/Hour</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{Math.round(avgPerHour).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">Events per hour</div>
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
                    <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={availableHours.map(hour => ({
                                    hour,
                                    label: formatHourShort(hour),
                                    total: hourlyStats.get(hour)?.total || 0,
                                    success: hourlyStats.get(hour)?.success || 0,
                                    fail: hourlyStats.get(hour)?.fail || 0,
                                    isSelected: hour === selectedHour,
                                    isPeak: hour === peakHour
                                }))}
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
                                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
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
                                    formatter={(value: number, name: string) => [
                                        value.toLocaleString(),
                                        name === 'total' ? 'Events' : name === 'success' ? 'Success' : 'Failed'
                                    ]}
                                    labelFormatter={(label) => `Hour: ${label}`}
                                />
                                <Bar 
                                    dataKey="total" 
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

                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-2xl font-bold text-blue-600">{selectedStats.total.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">Total Events</div>
                            <div className="text-[9px] text-blue-500 mt-1">Sum of all events at {formatHourShort(selectedHour)}</div>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-2xl font-bold text-emerald-600">{selectedStats.success.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">Successful</div>
                            <div className="text-[9px] text-emerald-500 mt-1">Events completed OK</div>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-2xl font-bold text-red-600">{selectedStats.fail.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">Failed</div>
                            <div className="text-[9px] text-red-500 mt-1">Events with errors</div>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-white/80 dark:bg-gray-800/50 shadow-sm">
                            <div className="text-2xl font-bold text-purple-600">{selectedSuccessRate.toFixed(1)}%</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">Success Rate</div>
                            <div className="text-[9px] text-purple-500 mt-1">Success / Total</div>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-cyan-200/50 dark:border-cyan-500/20">
                        <div className="grid grid-cols-3 gap-3 text-center">
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
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-4">
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

// Custom tooltip component with rich data visualization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CustomTooltip = ({ active, payload, label, events: _events = [], eventKeys: _eventKeys = [] }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    const totalCount = data.count || 0;
    const totalSuccess = data.successCount || 0;
    const successRate = totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : '0';
    
    // Get per-event data from payload
    const eventDataItems = payload.map((item: any) => ({
        name: item.name,
        value: item.value,
        color: item.color || item.stroke,
        dataKey: item.dataKey
    })).filter((item: any) => item.value !== undefined);
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-500/20 p-4 min-w-[280px] backdrop-blur-xl"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                    <div className="font-bold text-lg text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">Event Analytics</div>
                </div>
            </div>
            
            {/* Per-Event Data */}
            <div className="space-y-2 mb-3">
                {eventDataItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2">
                            <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{item.value?.toLocaleString() || 0}</span>
                    </div>
                ))}
            </div>
            
            {/* Overall Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <motion.div 
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl p-2.5 text-center"
                    whileHover={{ scale: 1.02 }}
                >
                    <Activity className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {totalCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Total</div>
                </motion.div>
                
                <motion.div 
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 rounded-xl p-2.5 text-center"
                    whileHover={{ scale: 1.02 }}
                >
                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {totalSuccess.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-green-600/70 dark:text-green-400/70 uppercase tracking-wide">Success</div>
                </motion.div>
                
                <motion.div 
                    className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl p-2.5 text-center"
                    whileHover={{ scale: 1.02 }}
                >
                    <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {(data.failCount || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-red-600/70 dark:text-red-400/70 uppercase tracking-wide">Failed</div>
                </motion.div>
            </div>
            
            {/* Success Rate Bar */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Success Rate</span>
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">{successRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${successRate}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>
            
            {/* Trend Indicator */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {parseFloat(successRate) >= 90 ? (
                        <>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">Healthy</span>
                        </>
                    ) : parseFloat(successRate) >= 70 ? (
                        <>
                            <Activity className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Moderate</span>
                        </>
                    ) : (
                        <>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Needs Attention</span>
                        </>
                    )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                    {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}
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
            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-500/5 dark:to-violet-500/5">
                    <DialogTitle className="flex items-center gap-3">
                        <motion.div 
                            className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {pieData.type === 'platform' && <Activity className="h-6 w-6 text-white" />}
                            {pieData.type === 'pos' && <Target className="h-6 w-6 text-white" />}
                            {pieData.type === 'source' && <Zap className="h-6 w-6 text-white" />}
                        </motion.div>
                        <div>
                            <span className="text-xl font-bold">{pieData.title} Distribution</span>
                            <p className="text-sm text-muted-foreground font-normal mt-0.5">
                                {pieData.data.length} categories • {total.toLocaleString()} total events
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 max-h-[70vh] overflow-y-auto">
                    {/* Large Pie Chart - 3 columns for better visibility */}
                    <div className="md:col-span-3 h-[450px] flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                                <defs>
                                    {PIE_COLORS.map((color, index) => (
                                        <linearGradient key={index} id={`expandedPieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={pieData.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={150}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={2}
                                    stroke="rgba(255,255,255,0.9)"
                                >
                                    {pieData.data.map((_: any, index: number) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={`url(#expandedPieGradient-${index % PIE_COLORS.length})`}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip totalValue={total} />} />
                                <Legend 
                                    iconType="circle" 
                                    iconSize={10} 
                                    layout="horizontal" 
                                    verticalAlign="bottom"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Detailed Stats Table - 2 columns */}
                    <div className="md:col-span-2 space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</h3>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                            {sortedData.map((item: any, index: number) => {
                                const percentage = ((item.value / total) * 100).toFixed(1);
                                return (
                                    <motion.div
                                        key={item.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                                    >
                                        <div 
                                            className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{item.name}</div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 min-w-[80px]">
                                            <div className="font-bold text-sm">{item.value.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground">{percentage}%</div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                            <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10">
                                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                    {pieData.data.length}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Categories</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {total >= 1000000 ? `${(total/1000000).toFixed(1)}M` : total >= 1000 ? `${(total/1000).toFixed(1)}k` : total}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Total</div>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {sortedData[0]?.name?.slice(0, 8) || '-'}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Top</div>
                            </div>
                        </div>
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
}

// Event colors for the chart
const EVENT_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#a855f7', '#3b82f6'
];

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

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
    
    // Multiple panels data storage
    const [panelsDataMap, setPanelsDataMap] = useState<Map<string, PanelData>>(new Map());
    
    // Panel-specific filters state (for user modifications - resets on refresh)
    const [panelFiltersState, setPanelFiltersState] = useState<Record<string, FilterState>>({});
    const [panelDateRanges, setPanelDateRanges] = useState<Record<string, DateRangeState>>({});
    const [panelLoading, setPanelLoading] = useState<Record<string, boolean>>({});
    
    // Panel navigation and UI state
    const [activePanelId, setActivePanelId] = useState<string | null>(null);
    const [mainLegendExpanded, setMainLegendExpanded] = useState(false);
    const [panelLegendExpanded, setPanelLegendExpanded] = useState<Record<string, boolean>>({});
    const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
    
    // Configurable auto-refresh (in minutes, 0 = disabled)
    const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<number>(0);
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false);

    // Function to jump to a panel
    const handleJumpToPanel = useCallback((panelId: string) => {
        setActivePanelId(panelId);
        const panelElement = panelRefs.current[panelId];
        if (panelElement) {
            panelElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    // Function to toggle panel legend
    const togglePanelLegend = useCallback((panelId: string) => {
        setPanelLegendExpanded(prev => ({
            ...prev,
            [panelId]: !prev[panelId]
        }));
    }, []);

    // Function to update panel-specific filter
    const updatePanelFilter = useCallback((panelId: string, filterType: keyof FilterState, values: number[]) => {
        setPanelFiltersState(prev => ({
            ...prev,
            [panelId]: {
                ...prev[panelId],
                [filterType]: values
            }
        }));
    }, []);

    // Function to update panel date range
    const updatePanelDateRange = useCallback((panelId: string, from: Date, to: Date) => {
        setPanelDateRanges(prev => ({
            ...prev,
            [panelId]: { from, to }
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

    // Helper function to process graph response into display format
    // Now creates separate data series per event for proper bifurcation
    const processGraphData = useCallback((graphResponse: any, startDate: Date, endDate: Date, eventsList: EventConfig[]) => {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Create a map of eventId -> eventName for lookup
        const eventNameMap = new Map<string, string>();
        eventsList.forEach(e => eventNameMap.set(String(e.eventId), e.eventName));

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
                    // Per-event data will be added dynamically
                });
            }
            
            const existing = timeMap.get(dateKey)!;
            
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
            }
            existing[`${eventKey}_count`] += record.count || 0;
            existing[`${eventKey}_success`] += record.successCount || 0;
            existing[`${eventKey}_fail`] += record.failCount || 0;
        });

        // Sort by timestamp
        const sortedData = Array.from(timeMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Attach metadata about which events are in this dataset
        const eventKeysInData = Array.from(eventIds).map(id => {
            const name = eventNameMap.get(id) || `Event ${id}`;
            return {
                eventId: id,
                eventName: name,
                eventKey: name.replace(/[^a-zA-Z0-9]/g, '_')
            };
        });

        return {
            data: sortedData,
            eventKeys: eventKeysInData
        };
    }, []);

    // Function to refresh a single panel's data
    const refreshPanelData = useCallback(async (panelId: string) => {
        if (!profile || events.length === 0) return;
        
        const panel = profile.panels.find(p => p.panelId === panelId);
        if (!panel) return;

        setPanelLoading(prev => ({ ...prev, [panelId]: true }));

        try {
            const panelConfig = (panel as any).filterConfig;
            const userPanelFilters = panelFiltersState[panelId];
            
            console.log(`🔍 DEBUG - Panel Config:`, panelConfig);
            console.log(`👤 DEBUG - User Panel Filters:`, userPanelFilters);
            
            // FIXED: Each panel is completely independent
            // Use panel-specific filters if available, otherwise use panel config defaults
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
            const panelDateRange = panelDateRanges[panelId] || dateRange;
            
            console.log(`🔄 PANEL REFRESH - Panel ID: ${panelId}`);
            console.log(`📊 Panel filters being applied:`, panelFilters);
            console.log(`🌐 Global filters state:`, filters);
            console.log(`📅 Panel date range:`, panelDateRange);

            const graphResponse = await apiService.getGraphData(
                panelFilters.events,
                panelFilters.platforms,
                panelFilters.pos,
                panelFilters.sources,
                panelDateRange.from,
                panelDateRange.to
            );

            const pieResponse = await apiService.getPieChartData(
                panelFilters.events,
                panelFilters.platforms,
                panelFilters.pos,
                panelFilters.sources,
                panelDateRange.from,
                panelDateRange.to
            );

            const processedResult = processGraphData(graphResponse, panelDateRange.from, panelDateRange.to, events);

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
                    showLegend: false
                });
                return newMap;
            });
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
    }, [profile, events, filters, panelFiltersState, panelDateRanges, dateRange, processGraphData]);

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
                
                // FIXED: User's global filters ALWAYS override panel defaults
                // If user has selected specific values, use those
                // If user hasn't selected anything (empty array), use panel defaults OR all
                const panelFilters: FilterState = {
                    events: filters.events.length > 0 
                        ? filters.events 
                        : (panelConfig?.events || []),
                    platforms: filters.platforms.length > 0 
                        ? filters.platforms 
                        : (panelConfig?.platforms || []),
                    pos: filters.pos.length > 0 
                        ? filters.pos 
                        : (panelConfig?.pos || []),
                    sources: filters.sources.length > 0 
                        ? filters.sources 
                        : (panelConfig?.sources || [])
                };
                
                console.log(`Panel ${panel.panelId} - Using filters:`, panelFilters);
                console.log(`User filters:`, filters);
                console.log(`Panel config:`, panelConfig);
                
                try {
                    const graphResponse = await apiService.getGraphData(
                        panelFilters.events,
                        panelFilters.platforms,
                        panelFilters.pos,
                        panelFilters.sources,
                        dateRange.from,
                        dateRange.to
                    );

                    const pieResponse = await apiService.getPieChartData(
                        panelFilters.events,
                        panelFilters.platforms,
                        panelFilters.pos,
                        panelFilters.sources,
                        dateRange.from,
                        dateRange.to
                    );

                    const processedResult = processGraphData(graphResponse, dateRange.from, dateRange.to, events);

                    newPanelsData.set(panel.panelId, {
                        graphData: processedResult.data,
                        eventKeys: processedResult.eventKeys,
                        pieChartData: pieResponse,
                        loading: false,
                        error: null,
                        filters: panelFilters,
                        dateRange: { from: dateRange.from, to: dateRange.to },
                        showLegend: false
                    });
                } catch (panelErr) {
                    console.error(`Failed to load data for panel ${panel.panelId}:`, panelErr);
                    newPanelsData.set(panel.panelId, {
                        graphData: [],
                        eventKeys: [],
                        pieChartData: null,
                        loading: false,
                        error: `Failed to load: ${panelErr instanceof Error ? panelErr.message : 'Unknown error'}`,
                        filters: panelFilters,
                        dateRange: { from: dateRange.from, to: dateRange.to },
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
    }, [profile, filters, dateRange, events, processGraphData]);

    useEffect(() => {
        // Only auto-load on initial mount (when profile and events first become available)
        // After that, user must click "Apply Filters" button
        if (!loading && profile && events.length > 0 && graphData.length === 0) {
            loadData();
            // Clear pending refresh after initial load
            setPendingRefresh(false);
            // Clear all panel filter changes after initial load
            setPanelFilterChanges({});
        }
    }, [loading, profile, events, loadData]);

    // Set pending refresh when filters or date range change
    useEffect(() => {
        if (!loading && profile && events.length > 0 && graphData.length > 0) {
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
    }, [filters, dateRange, loading, profile, events, graphData]);

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

    // Dropdown options
    const eventOptions = events.map(e => ({ value: e.eventId, label: e.eventName }));
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
    const panelStats = profile.panels.reduce((acc, panel) => {
        const data = panelsDataMap.get(panel.panelId);
        if (data?.graphData) {
            acc[panel.panelId] = {
                total: data.graphData.reduce((sum, d) => sum + (d.count || 0), 0),
                success: data.graphData.reduce((sum, d) => sum + (d.successCount || 0), 0)
            };
        }
        return acc;
    }, {} as Record<string, { total: number; success: number; }>);
    
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

            {/* Filters with Multi-Select */}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        
                        {/* Apply Filters Button and Auto-refresh Config */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-4">
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button 
                                        onClick={handleApplyFilters} 
                                        disabled={dataLoading}
                                        className={cn(
                                            "relative transition-all duration-300",
                                            pendingRefresh 
                                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 animate-pulse" 
                                                : "bg-primary hover:bg-primary/90"
                                        )}
                                    >
                                        {dataLoading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                            </motion.div>
                                        ) : (
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                        )}
                                        {pendingRefresh ? "Apply Filters!" : "Refresh This Panel"}
                                        {pendingRefresh && (
                                            <motion.div
                                                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                        )}
                                    </Button>
                                </motion.div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Main Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Card className="border-2 border-purple-100 dark:border-purple-500/20 overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                >
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </motion.div>
                                <div>
                                    <CardTitle className="text-lg">Event Trends</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Hover over data points for detailed insights
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Quick Stats Pills */}
                                <div className="hidden md:flex items-center gap-2">
                                    <motion.div 
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                            {totalCount.toLocaleString()} total
                                        </span>
                                    </motion.div>
                                    <motion.div 
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                            {totalCount > 0 ? ((totalSuccess / totalCount) * 100).toFixed(1) : 0}% success
                                        </span>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Collapsible Legend - Outside the chart */}
                        {eventKeys.length > 0 && (
                            <CollapsibleLegend 
                                eventKeys={eventKeys}
                                events={events}
                                isExpanded={mainLegendExpanded}
                                onToggle={() => setMainLegendExpanded(!mainLegendExpanded)}
                                maxVisibleItems={5}
                            />
                        )}
                        <div className="h-[520px] w-full">
                            {graphData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Check if profile has bar chart type */}
                                    {(profile?.panels?.[0] as any)?.filterConfig?.graphType === 'bar' ? (
                                        <BarChart data={graphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }} barCategoryGap="15%">
                                            <defs>
                                                {/* Dynamic gradients for each event */}
                                                {eventKeys.map((eventKeyInfo, index) => {
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
                                            <YAxis 
                                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => {
                                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                    return value;
                                                }}
                                                dx={-10}
                                            />
                                            <Tooltip 
                                                content={<CustomTooltip events={events} eventKeys={eventKeys} />}
                                                cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
                                            />
                                            {/* Dynamic bars for each event */}
                                            {eventKeys.length > 0 ? eventKeys.map((eventKeyInfo) => {
                                                return (
                                                    <Bar 
                                                        key={`bar_${eventKeyInfo.eventKey}`}
                                                        dataKey={`${eventKeyInfo.eventKey}_count`}
                                                        name={eventKeyInfo.eventName}
                                                        fill={`url(#barColor_${eventKeyInfo.eventKey})`}
                                                        radius={[3, 3, 0, 0]}
                                                        maxBarSize={40}
                                                    />
                                                );
                                            }) : (
                                                /* Fallback to overall totals when no event keys */
                                                <Bar 
                                                    dataKey="count"
                                                    name="Total"
                                                    fill="#6366f1"
                                                    radius={[3, 3, 0, 0]}
                                                    maxBarSize={40}
                                                />
                                            )}
                                        </BarChart>
                                    ) : (
                                        <AreaChart data={graphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
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
                                            <YAxis 
                                                tick={{ fill: '#6b7280', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => {
                                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                    return value;
                                                }}
                                                dx={-10}
                                            />
                                            <Tooltip 
                                                content={<CustomTooltip events={events} eventKeys={eventKeys} />}
                                                cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }}
                                            />
                                            {/* Dynamic areas for each event */}
                                            {eventKeys.length > 0 ? eventKeys.map((eventKeyInfo, index) => {
                                                const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                return (
                                                    <Area 
                                                        key={`area_${eventKeyInfo.eventKey}`}
                                                        type="monotone" 
                                                        dataKey={`${eventKeyInfo.eventKey}_count`}
                                                        name={eventKeyInfo.eventName}
                                                        stroke={color} 
                                                        strokeWidth={2.5}
                                                        fillOpacity={1} 
                                                        fill={`url(#areaColor_${eventKeyInfo.eventKey})`}
                                                        dot={false}
                                                        activeDot={{ 
                                                            r: 6, 
                                                            fill: color, 
                                                            stroke: '#fff', 
                                                            strokeWidth: 2,
                                                            filter: 'url(#glow)'
                                                        }}
                                                    />
                                                );
                                            }) : (
                                                /* Fallback to overall totals when no event keys */
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="count"
                                                    name="Total"
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

            {/* Hourly Stats Card - shown below Event Trends for ≤7 day ranges when enabled */}
            {isHourly && graphData.length > 0 && (profile?.panels?.[0] as any)?.filterConfig?.showHourlyStats !== false && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                >
                    <HourlyStatsCard graphData={graphData} isHourly={isHourly} />
                </motion.div>
            )}

            {/* Pie Charts */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                {/* Platform Distribution */}
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
                                    {pieChartData?.platform?.length > 0 && (
                                        <>
                                            <motion.span 
                                                className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                {pieChartData.platform.length} types
                                            </motion.span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                                onClick={() => openExpandedPie('platform', 'Platform', pieChartData.platform)}
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-52">
                                {pieChartData?.platform?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <defs>
                                                {PIE_COLORS.map((color, index) => (
                                                    <linearGradient key={index} id={`pieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <Pie
                                                data={pieChartData.platform}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={35}
                                                outerRadius={65}
                                                paddingAngle={4}
                                                dataKey="value"
                                                strokeWidth={2}
                                                stroke="rgba(255,255,255,0.8)"
                                            >
                                                {pieChartData.platform.map((_: any, index: number) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={`url(#pieGradient-${index % PIE_COLORS.length})`}
                                                        className="transition-all duration-200 hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                content={<PieTooltip 
                                                    totalValue={pieChartData.platform.reduce((acc: number, item: any) => acc + item.value, 0)} 
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
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <motion.div
                                            animate={{ rotate: [0, 360] }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="opacity-20 mb-2"
                                        >
                                            <Activity className="h-10 w-10" />
                                        </motion.div>
                                        <span className="text-sm">No data</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* POS Distribution */}
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
                                    {pieChartData?.pos?.length > 0 && (
                                        <>
                                            <motion.span 
                                                className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                {pieChartData.pos.length} types
                                            </motion.span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                                onClick={() => openExpandedPie('pos', 'POS', pieChartData.pos)}
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-52">
                                {pieChartData?.pos?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData.pos}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={35}
                                                outerRadius={65}
                                                paddingAngle={4}
                                                dataKey="value"
                                                strokeWidth={2}
                                                stroke="rgba(255,255,255,0.8)"
                                            >
                                                {pieChartData.pos.map((_: any, index: number) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={`url(#pieGradient-${index % PIE_COLORS.length})`}
                                                        className="transition-all duration-200 hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                content={<PieTooltip 
                                                    totalValue={pieChartData.pos.reduce((acc: number, item: any) => acc + item.value, 0)} 
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
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <motion.div
                                            animate={{ rotate: [0, 360] }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="opacity-20 mb-2"
                                        >
                                            <Target className="h-10 w-10" />
                                        </motion.div>
                                        <span className="text-sm">No data</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Source Distribution */}
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
                                    {pieChartData?.source?.length > 0 && (
                                        <>
                                            <motion.span 
                                                className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                {pieChartData.source.length} types
                                            </motion.span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                                                onClick={() => openExpandedPie('source', 'Source', pieChartData.source)}
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-52">
                                {pieChartData?.source?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData.source}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={35}
                                                outerRadius={65}
                                                paddingAngle={4}
                                                dataKey="value"
                                                strokeWidth={2}
                                                stroke="rgba(255,255,255,0.8)"
                                            >
                                                {pieChartData.source.map((_: any, index: number) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={`url(#pieGradient-${index % PIE_COLORS.length})`}
                                                        className="transition-all duration-200 hover:opacity-80"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                content={<PieTooltip 
                                                    totalValue={pieChartData.source.reduce((acc: number, item: any) => acc + item.value, 0)} 
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
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <motion.div
                                            animate={{ rotate: [0, 360] }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="opacity-20 mb-2"
                                        >
                                            <Zap className="h-10 w-10" />
                                        </motion.div>
                                        <span className="text-sm">No data</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

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

                // Dropdown options for this panel's filters
                const pEventOptions = events.map(e => ({ value: e.eventId, label: e.eventName }));
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
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                Resets on refresh
                                            </span>
                                        </div>
                                        <Button
                                            onClick={() => handlePanelRefresh(panel.panelId)}
                                            disabled={isPanelLoading}
                                            size="sm"
                                            className={cn(
                                                "relative transition-all duration-300 shadow-md",
                                                panelFilterChanges[panel.panelId]
                                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 animate-pulse"
                                                    : "bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white"
                                            )}
                                        >
                                            {isPanelLoading ? (
                                                <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                                            ) : (
                                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                            )}
                                            {panelFilterChanges[panel.panelId] ? "Apply Filters!" : "Refresh Panel"}
                                            {panelFilterChanges[panel.panelId] && (
                                                <motion.div
                                                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                />
                                            )}
                                        </Button>
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

                        {/* Panel Chart - with Event Bifurcation */}
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
                                {/* Collapsible Legend for Panel */}
                                {pEventKeys.length > 0 && (
                                    <CollapsibleLegend 
                                        eventKeys={pEventKeys}
                                        events={events}
                                        isExpanded={panelLegendExpanded[panel.panelId] || false}
                                        onToggle={() => togglePanelLegend(panel.panelId)}
                                        maxVisibleItems={4}
                                    />
                                )}
                                <div className="h-[520px]">
                                    {pGraphData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            {panelGraphType === 'bar' ? (
                                                <BarChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }} barCategoryGap="15%">
                                                    <defs>
                                                        {/* Dynamic gradients for each event in this panel */}
                                                        {pEventKeys.map((eventKeyInfo, index) => {
                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                            return (
                                                                <linearGradient key={`barGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`barColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
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
                                                        interval={Math.floor(pGraphData.length / 6)}
                                                    />
                                                    <YAxis 
                                                        tick={{ fill: '#6b7280', fontSize: 10 }} 
                                                        axisLine={false} 
                                                        tickLine={false}
                                                        tickFormatter={(value) => {
                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                            return value;
                                                        }}
                                                    />
                                                    <Tooltip content={<CustomTooltip events={events} eventKeys={pEventKeys} />} />
                                                    {/* Dynamic bars for each event */}
                                                    {pEventKeys.length > 0 ? pEventKeys.map((eventKeyInfo) => {
                                                        return (
                                                            <Bar 
                                                                key={`bar_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                dataKey={`${eventKeyInfo.eventKey}_count`} 
                                                                name={eventKeyInfo.eventName}
                                                                fill={`url(#barColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                radius={[3, 3, 0, 0]}
                                                                maxBarSize={20}
                                                            />
                                                        );
                                                    }) : (
                                                        <>
                                                            <Bar dataKey="count" name="Total" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={25} />
                                                            <Bar dataKey="successCount" name="Success" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={25} />
                                                            <Bar dataKey="failCount" name="Fail" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={25} />
                                                        </>
                                                    )}
                                                </BarChart>
                                            ) : (
                                                <AreaChart data={pGraphData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                                                    <defs>
                                                        {/* Dynamic gradients for each event in this panel */}
                                                        {pEventKeys.map((eventKeyInfo, index) => {
                                                            const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                            const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                            return (
                                                                <linearGradient key={`areaGrad_${panel.panelId}_${eventKeyInfo.eventKey}`} id={`areaColor_${panel.panelId}_${eventKeyInfo.eventKey}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                                                    <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
                                                                </linearGradient>
                                                            );
                                                        })}
                                                        {/* Glow filters */}
                                                        <filter id={`glow_${panel.panelId}`}>
                                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                                            <feMerge>
                                                                <feMergeNode in="coloredBlur"/>
                                                                <feMergeNode in="SourceGraphic"/>
                                                            </feMerge>
                                                        </filter>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        tick={<CustomXAxisTick />}
                                                        axisLine={{ stroke: '#e5e7eb' }}
                                                        tickLine={false}
                                                        height={45}
                                                        interval={Math.floor(pGraphData.length / 6)}
                                                    />
                                                    <YAxis 
                                                        tick={{ fill: '#6b7280', fontSize: 10 }} 
                                                        axisLine={false} 
                                                        tickLine={false}
                                                        tickFormatter={(value) => {
                                                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                                            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                                                            return value;
                                                        }}
                                                    />
                                                    <Tooltip 
                                                        content={<CustomTooltip events={events} eventKeys={pEventKeys} />}
                                                        cursor={{ stroke: '#a855f7', strokeWidth: 1, strokeDasharray: '5 5' }}
                                                    />
                                                    {/* Dynamic areas for each event */}
                                                    {pEventKeys.length > 0 ? pEventKeys.map((eventKeyInfo, index) => {
                                                        const event = events.find(e => String(e.eventId) === eventKeyInfo.eventId);
                                                        const color = event?.color || EVENT_COLORS[index % EVENT_COLORS.length];
                                                        return (
                                                            <Area 
                                                                key={`area_${panel.panelId}_${eventKeyInfo.eventKey}`}
                                                                type="monotone"
                                                                dataKey={`${eventKeyInfo.eventKey}_count`}
                                                                name={eventKeyInfo.eventName}
                                                                stroke={color}
                                                                strokeWidth={2.5}
                                                                fillOpacity={1}
                                                                fill={`url(#areaColor_${panel.panelId}_${eventKeyInfo.eventKey})`}
                                                                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                                                                activeDot={{ 
                                                                    r: 6, 
                                                                    fill: color, 
                                                                    stroke: 'white', 
                                                                    strokeWidth: 2,
                                                                    filter: `url(#glow_${panel.panelId})`
                                                                }}
                                                            />
                                                        );
                                                    }) : (
                                                        <>
                                                            <Area type="monotone" dataKey="count" name="Total" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0.3} fill="#8b5cf6" />
                                                            <Area type="monotone" dataKey="successCount" name="Success" stroke="#22c55e" strokeWidth={2} fillOpacity={0.3} fill="#22c55e" />
                                                            <Area type="monotone" dataKey="failCount" name="Fail" stroke="#ef4444" strokeWidth={2} fillOpacity={0.3} fill="#ef4444" />
                                                        </>
                                                    )}
                                                </AreaChart>
                                            )}
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                            {panelData?.loading ? 'Loading...' : panelData?.error || 'No data available'}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Panel Hourly Stats Card - shown for ≤7 day ranges when enabled */}
                        {isHourly && pGraphData.length > 0 && panelConfig?.showHourlyStats !== false && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 * (panelIndex + 1) }}
                            >
                                <HourlyStatsCard graphData={pGraphData} isHourly={isHourly} />
                            </motion.div>
                        )}

                        {/* Panel Pie Charts */}
                        {panel.visualizations.pieCharts.some(p => p.enabled) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {panel.visualizations.pieCharts.filter(p => p.enabled).map((pieConfig) => {
                                    const pieType = pieConfig.type as 'platform' | 'pos' | 'source';
                                    const pieData = pPieData?.[pieType];
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
                                                                    <defs>
                                                                        {PIE_COLORS.map((color, index) => (
                                                                            <linearGradient key={index} id={`pieGradient-${panel.panelId}-${pieType}-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                                                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                                                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                                                            </linearGradient>
                                                                        ))}
                                                                    </defs>
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
                                                                                fill={`url(#pieGradient-${panel.panelId}-${pieType}-${index % PIE_COLORS.length})`}
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
