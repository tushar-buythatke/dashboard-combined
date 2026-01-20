import React, { useMemo, useState } from 'react';
import {
    Users,
    UserPlus,
    Fingerprint,
    TrendingUp,
    TrendingDown,
    Activity,
    ChevronDown,
    Calendar,
    Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, CartesianGrid, ReferenceLine, Label } from 'recharts';
import { InfoTooltip } from '../components/InfoTooltip';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import type { EventKeyInfo } from './types';
import type { EventConfig } from '@/types/analytics';

interface UserFootfallCardProps {
    graphData: any[];
    eventKeys?: EventKeyInfo[];
    events?: EventConfig[];
}

// Colors for user metrics
const TOTAL_USERS_COLOR = '#3B82F6';  // Blue
const NEW_USERS_COLOR = '#14B8A6';     // Teal
const UNIQUE_USERS_COLOR = '#6366F1';  // Indigo

export const UserFootfallCard = React.memo(({ graphData, eventKeys = [], events = [] }: UserFootfallCardProps) => {
    const [selectedEventId, setSelectedEventId] = useState<string>('all');
    const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
        total: true,
        new: true,
        unique: true
    });

    const toggleMetric = (metric: string) => {
        setVisibleMetrics(prev => ({
            ...prev,
            [metric]: !prev[metric]
        }));
    };

    // Get event name helper
    const getEventName = (id: string) => {
        if (id === 'all') return 'All Events';
        const event = events.find(e => e.eventId === id);
        if (event) return event.eventName;
        const ek = eventKeys.find(k => k.eventKey === id);
        return ek?.eventName || id;
    };

    // Calculate aggregated user metrics
    const userMetrics = useMemo(() => {
        if (!graphData || graphData.length === 0) return null;

        let totalUsersSum = 0;
        let newUsersSum = 0;
        let uniqueUsersSum = 0;
        let dataPointCount = 0;
        let peakUsers = 0;

        // Per-event user metrics
        const perEventMetrics: Record<string, { totalUsers: number; newUsers: number; uniqueUsers: number }> = {};

        // Process data based on selection
        const processedData = graphData.map((item: any) => {
            let total, newU, unique;

            if (selectedEventId === 'all') {
                total = item.totalUsers || 0;
                newU = item.newUsers || 0;
                unique = item.uniqueUsers || 0;
            } else {
                total = item[`${selectedEventId}_totalUsers`] || 0;
                newU = item[`${selectedEventId}_newUsers`] || 0;
                unique = item[`${selectedEventId}_uniqueUsers`] || 0;
            }

            totalUsersSum += total;
            newUsersSum += newU;
            uniqueUsersSum += unique;
            dataPointCount++;
            if (total > peakUsers) peakUsers = total;

            return {
                ...item,
                displayTotal: total,
                displayNew: newU,
                displayUnique: unique
            };
        });

        // Check if we have any user data
        const hasData = totalUsersSum > 0 || newUsersSum > 0 || uniqueUsersSum > 0;
        if (!hasData) return null;

        // Calculate trends (compare first half vs second half)
        const midpoint = Math.floor(processedData.length / 2);
        const firstHalf = processedData.slice(0, midpoint);
        const secondHalf = processedData.slice(midpoint);

        const firstHalfTotal = firstHalf.reduce((sum, d) => sum + (d.displayTotal || 0), 0);
        const secondHalfTotal = secondHalf.reduce((sum, d) => sum + (d.displayTotal || 0), 0);
        const totalTrend = firstHalfTotal > 0 ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100 : 0;

        const firstHalfNew = firstHalf.reduce((sum, d) => sum + (d.displayNew || 0), 0);
        const secondHalfNew = secondHalf.reduce((sum, d) => sum + (d.displayNew || 0), 0);
        const newTrend = firstHalfNew > 0 ? ((secondHalfNew - firstHalfNew) / firstHalfNew) * 100 : 0;

        return {
            totalUsers: totalUsersSum,
            newUsers: newUsersSum,
            uniqueUsers: uniqueUsersSum,
            totalTrend,
            newTrend,
            averagePerPeriod: dataPointCount > 0 ? Math.round(totalUsersSum / dataPointCount) : 0,
            newUserRate: totalUsersSum > 0 ? (newUsersSum / totalUsersSum) * 100 : 0,
            peakUsers,
            processedData
        };
    }, [graphData, eventKeys, selectedEventId]);

    // Don't render if no user data
    if (!userMetrics) return null;

    // Format large numbers
    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
    };

    return (
        <EnhancedCard
            variant="glass"
            glow={true}
            className="border border-blue-200/60 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/80 via-white to-teal-50/60 dark:from-blue-900/20 dark:via-slate-900/80 dark:to-teal-900/20 rounded-2xl shadow-[0_8px_30px_rgba(59,130,246,0.1)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] transition-all duration-300"
        >
            <CardHeader className="pb-3 px-3 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center shadow-lg">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                User Footfall Insights
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-normal">
                                    {graphData.length} periods
                                </span>
                            </CardTitle>
                            <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
                                Track Total, New, and Unique user engagement
                            </div>
                        </div>
                    </div>

                    {/* Event Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 px-3 border-blue-200 dark:border-blue-800 bg-white/50 dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 rounded-xl transition-all duration-200">
                                <Target className="h-3.5 w-3.5 text-blue-500" />
                                <span className="max-w-[120px] truncate text-xs font-medium">
                                    {getEventName(selectedEventId)}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px] rounded-xl shadow-xl border-blue-100 dark:border-blue-900">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-3 py-2">Select Scope</DropdownMenuLabel>
                            <DropdownMenuItem 
                                onClick={() => setSelectedEventId('all')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg",
                                    selectedEventId === 'all' && "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                                )}
                            >
                                <Activity className="h-3.5 w-3.5" />
                                <span className="text-sm">All Events (Total)</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-3 py-2">Individual Events</DropdownMenuLabel>
                            <div className="max-h-[300px] overflow-y-auto px-1">
                                {eventKeys.map((ek) => (
                                    <DropdownMenuItem 
                                        key={ek.eventKey}
                                        onClick={() => setSelectedEventId(ek.eventKey)}
                                        className={cn(
                                            "flex items-center gap-2 px-2 py-2 cursor-pointer rounded-lg mb-0.5",
                                            selectedEventId === ek.eventKey && "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                                        )}
                                    >
                                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                                        <span className="text-xs truncate">{ek.eventName || ek.eventKey}</span>
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                {/* Summary Stats Grid */}
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {/* Total Users */}
                    <div 
                        onClick={() => toggleMetric('total')}
                        className={cn(
                            "p-2.5 md:p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                            visibleMetrics.total 
                                ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200/50 dark:border-blue-500/20 ring-1 ring-blue-500/20" 
                                : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60 grayscale-[0.5]"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Users className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase flex items-center gap-1">
                                Total Users
                                <InfoTooltip content="Total number of users who interacted with events during this period." />
                            </span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-blue-600">
                            {formatNumber(userMetrics.totalUsers)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {userMetrics.totalTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={cn(
                                "font-medium",
                                userMetrics.totalTrend >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {userMetrics.totalTrend >= 0 ? '+' : ''}{userMetrics.totalTrend.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* New Users */}
                    <div 
                        onClick={() => toggleMetric('new')}
                        className={cn(
                            "p-2.5 md:p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                            visibleMetrics.new 
                                ? "bg-gradient-to-br from-teal-500/10 to-teal-500/5 border-teal-200/50 dark:border-teal-500/20 ring-1 ring-teal-500/20" 
                                : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60 grayscale-[0.5]"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <UserPlus className="h-3 w-3 text-teal-500" />
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium uppercase flex items-center gap-1">
                                New Users
                                <InfoTooltip content="Users who interacted for the first time during this period." />
                            </span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-teal-600">
                            {formatNumber(userMetrics.newUsers)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {userMetrics.newTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={cn(
                                "font-medium",
                                userMetrics.newTrend >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {userMetrics.newTrend >= 0 ? '+' : ''}{userMetrics.newTrend.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Unique Users */}
                    <div 
                        onClick={() => toggleMetric('unique')}
                        className={cn(
                            "p-2.5 md:p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                            visibleMetrics.unique 
                                ? "bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-200/50 dark:border-indigo-500/20 ring-1 ring-indigo-500/20" 
                                : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60 grayscale-[0.5]"
                        )}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Fingerprint className="h-3 w-3 text-indigo-500" />
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium uppercase flex items-center gap-1">
                                Unique Users
                                <InfoTooltip content="Distinct users based on unique identifiers." />
                            </span>
                        </div>
                        <div className="text-lg md:text-xl font-bold text-indigo-600">
                            {formatNumber(userMetrics.uniqueUsers)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {userMetrics.newUserRate.toFixed(1)}% new rate
                        </div>
                    </div>
                </div>

                {/* Mini Area Chart */}
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-blue-100/50 dark:border-blue-500/10 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                            <span className="text-xs font-bold text-foreground">User Engagement Trend</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div 
                                onClick={() => toggleMetric('total')}
                                className={cn(
                                    "flex items-center gap-1.5 cursor-pointer transition-opacity",
                                    !visibleMetrics.total && "opacity-30"
                                )}
                            >
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: TOTAL_USERS_COLOR }}></div>
                                <span className="text-[10px] font-semibold text-muted-foreground">TOTAL</span>
                            </div>
                            <div 
                                onClick={() => toggleMetric('new')}
                                className={cn(
                                    "flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3 cursor-pointer transition-opacity",
                                    !visibleMetrics.new && "opacity-30"
                                )}
                            >
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: NEW_USERS_COLOR }}></div>
                                <span className="text-[10px] font-semibold text-muted-foreground">NEW</span>
                            </div>
                            <div 
                                onClick={() => toggleMetric('unique')}
                                className={cn(
                                    "flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-3 cursor-pointer transition-opacity",
                                    !visibleMetrics.unique && "opacity-30"
                                )}
                            >
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: UNIQUE_USERS_COLOR }}></div>
                                <span className="text-[10px] font-semibold text-muted-foreground">UNIQUE</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-64 md:h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={userMetrics.processedData}
                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="totalUsersGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TOTAL_USERS_COLOR} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={TOTAL_USERS_COLOR} stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={NEW_USERS_COLOR} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={NEW_USERS_COLOR} stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="uniqueUsersGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={UNIQUE_USERS_COLOR} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={UNIQUE_USERS_COLOR} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
                                    interval={Math.floor(userMetrics.processedData.length / 8)}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 2 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            // Helper to safely get value from payload by name
                                            const getVal = (name: string) => {
                                                const p = payload.find(x => x.name === name);
                                                return p ? (p.value as number).toLocaleString() : null;
                                            };

                                            const totalVal = getVal('totalUsers');
                                            const newVal = getVal('newUsers');
                                            const uniqueVal = getVal('uniqueUsers');

                                            return (
                                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-blue-200 dark:border-blue-800 p-4 rounded-xl shadow-2xl min-w-[180px]">
                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {totalVal !== null && (
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TOTAL_USERS_COLOR }} />
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Users</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-blue-600">{totalVal}</span>
                                                            </div>
                                                        )}
                                                        {newVal !== null && (
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: NEW_USERS_COLOR }} />
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">New Users</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-teal-600">{newVal}</span>
                                                            </div>
                                                        )}
                                                        {uniqueVal !== null && (
                                                            <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: UNIQUE_USERS_COLOR }} />
                                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Unique Users</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-indigo-600">{uniqueVal}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="displayTotal"
                                    name="totalUsers"
                                    stroke={TOTAL_USERS_COLOR}
                                    strokeWidth={3}
                                    fill="url(#totalUsersGrad)"
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: TOTAL_USERS_COLOR }}
                                    isAnimationActive={true}
                                    hide={!visibleMetrics.total}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="displayNew"
                                    name="newUsers"
                                    stroke={NEW_USERS_COLOR}
                                    strokeWidth={3}
                                    fill="url(#newUsersGrad)"
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: NEW_USERS_COLOR }}
                                    isAnimationActive={true}
                                    hide={!visibleMetrics.new}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="displayUnique"
                                    name="uniqueUsers"
                                    stroke={UNIQUE_USERS_COLOR}
                                    strokeWidth={3}
                                    fill="url(#uniqueUsersGrad)"
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: UNIQUE_USERS_COLOR }}
                                    isAnimationActive={true}
                                    hide={!visibleMetrics.unique}
                                />
                                <ReferenceLine y={userMetrics.peakUsers} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3}>
                                    <Label value="Peak" position="left" style={{ fontSize: '9px', fill: '#ef4444', fontWeight: 'bold' }} />
                                </ReferenceLine>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Stats Row */}
                <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100/50 dark:border-blue-500/10 shadow-sm">
                    <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Average: </span>
                        <span className="text-xs font-bold text-foreground">{formatNumber(userMetrics.averagePerPeriod)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <UserPlus className="h-3.5 w-3.5 text-teal-500" />
                        <span className="text-xs text-muted-foreground">New Rate: </span>
                        <span className="text-xs font-bold text-teal-600">{userMetrics.newUserRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 ml-auto">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">
                            {getEventName(selectedEventId)} metrics
                        </span>
                    </div>
                </div>
            </CardContent>
        </EnhancedCard>
    );
});

UserFootfallCard.displayName = 'UserFootfallCard';
