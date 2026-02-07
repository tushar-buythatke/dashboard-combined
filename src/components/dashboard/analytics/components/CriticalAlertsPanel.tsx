import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Switch } from '@/components/ui/switch';
import { Bell, CheckCircle2, ChevronDown, Filter, CalendarIcon, RefreshCw, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PLATFORMS, PLATFORM_NAMES, SOURCE_NAMES } from '@/services/apiService';
import type { SiteDetail } from '@/services/apiService';
import type { EventConfig } from '@/types/analytics';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface CriticalAlertsPanelProps {
    criticalAlerts: any[];
    alertsLoading: boolean;
    alertsExpanded: boolean;
    alertsPanelCollapsed: boolean;
    alertFilters: {
        events: number[];
        platforms: string[];
        pos: number[];
        sources: string[];
    };
    alertDateRange: { from: Date; to: Date };
    alertsPage: number;
    alertIsApi: number; // 0=Regular, 1=API, 2=Funnel/Percent
    alertIsHourly: boolean;
    events: EventConfig[];
    siteDetails: SiteDetail[];
    alertSummary?: Record<string, number>; // Summary counts per event
    onToggleCollapse: () => void;
    onToggleExpanded: () => void;
    onFilterChange: (filters: any) => void;
    onDateRangeChange: (range: { from: Date; to: Date }) => void;
    onIsApiChange: (isApi: number) => void;
    onIsHourlyChange: (isHourly: boolean) => void;
    onLoadAlerts: (expanded?: boolean) => void;
    onPageChange: (page: number) => void;
    onJumpToPanel?: (panelId: string, panelName?: string) => void;
    eventToPanelMap?: Record<string, string>;
    activePanelDbId?: number; // DB panel ID for isApi=2 (percent/funnel)
}

export function CriticalAlertsPanel({
    criticalAlerts,
    alertsLoading,
    alertsExpanded,
    alertsPanelCollapsed,
    alertFilters,
    alertDateRange,
    alertsPage,
    alertIsApi,
    alertIsHourly,
    events,
    siteDetails,
    alertSummary = {},
    onToggleCollapse,
    onToggleExpanded,
    onFilterChange,
    onDateRangeChange,
    onIsApiChange,
    onIsHourlyChange,
    onLoadAlerts,
    onPageChange,
    onJumpToPanel,
    eventToPanelMap = {},
    activePanelDbId
}: CriticalAlertsPanelProps) {
    const { isAutosnipe } = useTheme();

    const dedupedAlerts = useMemo(() => {
        const map = new Map<string, (typeof criticalAlerts)[number]>();

        criticalAlerts.forEach(alert => {
            const details = alert.details || {};
            const rawMetric = String(details.metric || '').toLowerCase();
            const isCountLike = rawMetric === 'count' || rawMetric === 'successcount';

            const metricGroup = isCountLike ? 'countOrSuccess' : rawMetric || 'other';
            // Include status to avoid merging alerts with different status codes
            const statusCode = String(details.status || '');
            const key = `${alert.eventId || ''}_${alert.pos || ''}_${alert.source ?? ''}_${metricGroup}_${statusCode}`;

            const existing = map.get(key);
            if (!existing) {
                map.set(key, alert);
            } else if (isCountLike) {
                // Prefer keeping pure 'count' over 'successCount' when both exist
                const existingMetric = String(existing.details?.metric || '').toLowerCase();
                if (existingMetric === 'successcount' && rawMetric === 'count') {
                    map.set(key, alert);
                }
            }
        });

        return Array.from(map.values());
    }, [criticalAlerts]);

    const { t: themeClasses } = useAccentTheme();

    // State for drill-down view: null = show summary (if multiple events), number = show alerts for that event
    const [selectedEventIdForDrilldown, setSelectedEventIdForDrilldown] = useState<number | null>(null);

    // Derive alert summary from criticalAlerts if alertSummary prop is empty
    const derivedAlertSummary = useMemo(() => {
        if (Object.keys(alertSummary).length > 0) return alertSummary;

        // Build summary from criticalAlerts
        const summary: Record<string, number> = {};
        criticalAlerts.forEach(alert => {
            const eventId = String(alert.eventId);
            summary[eventId] = (summary[eventId] || 0) + 1;
        });
        return summary;
    }, [alertSummary, criticalAlerts]);

    // Determine how many events are currently selected/being shown
    const uniqueEventIds = new Set(criticalAlerts.map(a => a.eventId));
    const selectedEventCount = alertFilters.events.length || uniqueEventIds.size;
    const showSummaryView = selectedEventCount > 1 && selectedEventIdForDrilldown === null;

    // Filter alerts for the selected event when drilled down
    const filteredAlertsForDrilldown = useMemo(() => {
        if (selectedEventIdForDrilldown === null) return dedupedAlerts;
        return dedupedAlerts.filter(alert => alert.eventId === selectedEventIdForDrilldown);
    }, [dedupedAlerts, selectedEventIdForDrilldown]);

    const diffInDays = (alertDateRange.to.getTime() - alertDateRange.from.getTime()) / (1000 * 60 * 60 * 24);
    const isHourlyDisabled = diffInDays > 7;

    return (
        <div className="relative">
            <Card className={cn(
                "rounded-2xl overflow-hidden transition-all duration-500 group relative backdrop-blur-xl",
                isAutosnipe
                    ? "border-2 border-green-500/30 bg-gradient-to-br from-gray-950/80 via-gray-900/50 to-emerald-950/20 shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
                    : alertsPanelCollapsed
                        ? criticalAlerts.length > 0
                            ? cn("border border-red-200/60 dark:border-red-500/30 shadow-[0_8px_30px_rgba(239,68,68,0.12)]", themeClasses.cardBg)
                            : cn("border shadow-lg", themeClasses.cardBg, themeClasses.borderAccent, themeClasses.borderAccentDark)
                        : criticalAlerts.length > 0
                            ? "border-2 border-red-300/60 dark:border-red-500/40 shadow-[0_20px_50px_rgba(239,68,68,0.25)] bg-white/80 dark:bg-slate-900/80"
                            : cn("border-2 shadow-2xl bg-white/80 dark:bg-slate-800/80", themeClasses.borderAccent, themeClasses.borderAccentDark)
            )}>
                {/* Animated top border accent */}
                <div className={cn(
                    "absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r transition-all duration-500 z-30",
                    isAutosnipe
                        ? "from-green-500 via-emerald-400 to-green-500"
                        : criticalAlerts.length > 0
                            ? "from-red-600 via-orange-500 to-red-600 animate-pulse"
                            : themeClasses.headerGradient
                )} />

                {/* Collapsed Header Bar */}
                <div
                    className={cn(
                        "flex items-center justify-between px-5 py-4 cursor-pointer transition-all duration-300 relative overflow-hidden",
                        isAutosnipe ? (
                            alertsPanelCollapsed
                                ? "bg-slate-900/40 hover:bg-slate-900/60"
                                : "bg-emerald-950/20"
                        ) : (
                            alertsPanelCollapsed
                                ? "bg-slate-50/40 dark:bg-slate-950/20 hover:bg-slate-50/60 dark:hover:bg-slate-950/40"
                                : "bg-slate-100/50 dark:bg-slate-950/30"
                        )
                    )}
                    onClick={onToggleCollapse}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div
                            className={cn(
                                "h-11 w-11 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ring-2 ring-white/20 dark:ring-white/10 transition-transform duration-300 group-hover:scale-110",
                                criticalAlerts.length > 0
                                    ? "from-rose-500 to-orange-600 shadow-rose-500/30"
                                    : isAutosnipe
                                        ? "from-emerald-500 to-teal-600 shadow-emerald-500/30"
                                        : themeClasses.buttonGradient
                            )}
                        >
                            {criticalAlerts.length > 0 ? (
                                <Bell className="h-5 w-5 text-white animate-bounce-slow" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-white" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className={cn(
                                    "bg-clip-text text-transparent",
                                    isAutosnipe
                                        ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                                        : criticalAlerts.length > 0
                                            ? "bg-gradient-to-r from-rose-600 to-orange-600"
                                            : "bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-300"
                                )}>
                                    Critical Alerts Monitor
                                </span>
                                <span className={cn(
                                    "text-[10px] uppercase font-black px-2 py-0.5 rounded-lg tracking-tighter shadow-sm",
                                    isAutosnipe
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10"
                                )}>
                                    LIVE
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {criticalAlerts.length > 0 ? (
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                "inline-block w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]",
                                                "bg-red-500"
                                            )}
                                        />
                                        <span className="text-red-500 dark:text-red-400 font-bold">{criticalAlerts.length} active alert{criticalAlerts.length !== 1 ? 's' : ''}</span> requiring immediate attention
                                    </span>
                                ) : (
                                    <span className={cn("flex items-center gap-1.5", isAutosnipe ? "text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400")}>
                                        <CheckCircle2 className="w-3.5 h-3.5" /> All systems operating at peak performance
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        {criticalAlerts.length > 0 && (
                            <div
                                className={cn(
                                    "px-4 py-1.5 rounded-xl text-white text-base font-black shadow-xl ring-2 ring-white/20",
                                    "bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-500/40"
                                )}
                            >
                                {criticalAlerts.length}
                            </div>
                        )}
                        <div className={cn(alertsPanelCollapsed ? "" : "rotate-180", "transition-all duration-500 p-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm")}>
                            <ChevronDown className={cn(
                                "h-5 w-5",
                                isAutosnipe ? "text-emerald-400" : "text-slate-600 dark:text-slate-400"
                            )} />
                        </div>
                    </div>
                </div>

                {/* Expandable Content */}
                {
                    !alertsPanelCollapsed && (
                        <div className="overflow-hidden">
                            {/* Alert Filters Section */}
                            <div className={cn(
                                "px-4 py-3 border-b",
                                isAutosnipe
                                    ? "bg-gray-900/50 border-green-500/20"
                                    : "bg-gradient-to-r from-gray-50 via-white to-slate-50 dark:from-gray-800/20 dark:via-slate-900/30 dark:to-slate-800/10 border-gray-200 dark:border-gray-500/30"
                            )}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className={cn(
                                        "h-4 w-4",
                                        isAutosnipe ? "text-green-400" : "text-current"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isAutosnipe ? "text-green-300" : "text-gray-700 dark:text-gray-300"
                                    )}>Alert Filters</span>
                                    <span className="text-xs text-muted-foreground">(Independent from dashboard)</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
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
                                                            onDateRangeChange({ from: range.from, to: range.to });
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
                                            onChange={(values) => onFilterChange({
                                                ...alertFilters,
                                                platforms: values
                                            })}
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
                                            onChange={(values) => onFilterChange({
                                                ...alertFilters,
                                                pos: values.map(v => parseInt(v))
                                            })}
                                            placeholder="All POS"
                                            className="h-9"
                                        />
                                    </div>

                                    {/* Event Filter / Panel ID Filter */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                            {alertIsApi === 2 ? 'Panel ID' : 'Event'}
                                        </Label>
                                        {alertIsApi === 2 ? (
                                            // For PERCENT mode, show panel ID dropdown with current panel pre-selected
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-9 px-3 flex items-center rounded-md border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-mono text-sm">
                                                    Panel: {activePanelDbId || 'Not available'}
                                                </div>
                                                {activePanelDbId && (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
                                                        ✓ Auto-selected
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            // Regular mode - show events dropdown
                                            <MultiSelectDropdown
                                                options={events.map(e => ({ value: e.eventId, label: e.eventName }))}
                                                selected={alertFilters.events.map(String)}
                                                onChange={(values) => onFilterChange({
                                                    ...alertFilters,
                                                    events: values.map(v => parseInt(v))
                                                })}
                                                placeholder="All Events"
                                                className="h-9"
                                            />
                                        )}
                                    </div>

                                    {/* Event Type Toggle - isApi */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Event Type</Label>
                                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-full gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onIsApiChange(0)}
                                                className={cn(
                                                    "flex-1 px-1 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                    alertIsApi === 0
                                                        ? "bg-green-600 text-white shadow-sm scale-[1.02]"
                                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                )}
                                            >
                                                REGULAR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onIsApiChange(1)}
                                                className={cn(
                                                    "flex-1 px-1 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                    alertIsApi === 1
                                                        ? "bg-indigo-600 text-white shadow-sm scale-[1.02]"
                                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                )}
                                            >
                                                API
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onIsApiChange(2)}
                                                className={cn(
                                                    "flex-1 px-1 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                    alertIsApi === 2
                                                        ? "bg-amber-500 text-white shadow-sm scale-[1.02]"
                                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                )}
                                            >
                                                PERCENT
                                            </button>
                                        </div>
                                    </div>

                                    {/* Granularity Toggle - isHourly */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Granularity</Label>
                                        <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className={cn(
                                                        "flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm w-full transition-opacity",
                                                        isHourlyDisabled ? "opacity-60 grayscale-[0.4] cursor-not-allowed" : ""
                                                    )}>
                                                        <button
                                                            type="button"
                                                            disabled={isHourlyDisabled}
                                                            onClick={() => onIsHourlyChange(false)}
                                                            className={cn(
                                                                "flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-all duration-200",
                                                                !alertIsHourly
                                                                    ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                            )}
                                                        >
                                                            DAILY
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isHourlyDisabled}
                                                            onClick={() => onIsHourlyChange(true)}
                                                            className={cn(
                                                                "flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-all duration-200",
                                                                alertIsHourly
                                                                    ? "bg-orange-500 text-white shadow-md scale-[1.02]"
                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                            )}
                                                        >
                                                            HOURLY
                                                        </button>
                                                    </div>
                                                </TooltipTrigger>
                                                {isHourlyDisabled && (
                                                    <TooltipContent side="top" className="bg-slate-900 text-white border-slate-700 max-w-[200px] text-center">
                                                        <p className="text-xs font-semibold">Hourly data restricted to ranges ≤ 7 days.</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    {/* Refresh Button */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                        <Button
                                            onClick={() => onLoadAlerts(alertsExpanded)}
                                            disabled={alertsLoading}
                                            size="sm"
                                            className={cn(
                                                "w-full h-9 bg-gradient-to-r text-white shadow-lg",
                                                isAutosnipe
                                                    ? "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/30"
                                                    : cn(themeClasses.buttonGradient, themeClasses.buttonHover)
                                            )}
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

                            {/* Summary Stats Header */}
                            {(criticalAlerts.length > 0 || Object.keys(derivedAlertSummary).length > 0) && (
                                <div className="px-5 py-4 border-b border-rose-100/50 dark:border-indigo-500/10 bg-slate-50/40 dark:bg-indigo-950/10">
                                    <div className="grid grid-cols-4 gap-6">
                                        {[
                                            {
                                                label: 'Real-time alerts', value: (() => {
                                                    const summaryTotal = Object.values(alertSummary).reduce((a, b) => a + b, 0);
                                                    return summaryTotal > 0 ? summaryTotal : criticalAlerts.length;
                                                })(), color: 'text-rose-600 dark:text-rose-400', glow: 'shadow-rose-500/20'
                                            },
                                            {
                                                label: 'Impacted Events', value: (() => {
                                                    const eventWithAlerts = Object.keys(derivedAlertSummary).filter(id => derivedAlertSummary[id] > 0).length;
                                                    const alertEventIds = new Set(criticalAlerts.map(alert => alert.eventId)).size;
                                                    return Math.max(eventWithAlerts, alertEventIds);
                                                })(), color: 'text-orange-600 dark:text-orange-400', glow: 'shadow-orange-500/20'
                                            },
                                            { label: 'Event Types', value: new Set(criticalAlerts.map(alert => alert.eventId)).size || Object.keys(derivedAlertSummary).length, color: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-indigo-500/20' },
                                            { label: 'Total Metrics', value: new Set(criticalAlerts.map(alert => alert.details?.metric)).size || 0, color: 'text-cyan-600 dark:text-cyan-400', glow: 'shadow-cyan-500/20' }
                                        ].map((stat, i) => (
                                            <div key={i} className="text-center group/stat">
                                                <div className={cn("text-3xl font-black transition-all duration-300 group-hover/stat:scale-110", stat.color, stat.glow)}>
                                                    {stat.value}
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Alerts List */}
                            <div className={cn(
                                "p-4",
                                isAutosnipe
                                    ? "bg-gray-950/50"
                                    : "bg-white dark:bg-slate-800/50"
                            )}>
                                {alertsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">Loading alerts...</span>
                                    </div>
                                ) : criticalAlerts.length === 0 && Object.keys(derivedAlertSummary).length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                                        <p className="text-sm text-muted-foreground">No critical alerts at this time</p>
                                    </div>
                                ) : showSummaryView ? (
                                    /* ========== SUMMARY VIEW: Show event cards with counts ========== */
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                                Alert Summary by Event ({Object.keys(derivedAlertSummary).length} events)
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">Click for details</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(derivedAlertSummary)
                                                .sort(([, a], [, b]) => b - a) // Sort by count descending
                                                .map(([eventIdStr, count]) => {
                                                    const eventId = parseInt(eventIdStr, 10);
                                                    const eventConfig = events.find(e => Number(e.eventId) === eventId);
                                                    const eventName = eventConfig?.eventName ||
                                                        (eventConfig?.host && eventConfig?.url ? `${eventConfig.host}${eventConfig.url}` : `Event ${eventId}`);

                                                    return (
                                                        <button
                                                            key={eventId}
                                                            onClick={() => setSelectedEventIdForDrilldown(eventId)}
                                                            className={cn(
                                                                "p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl relative overflow-hidden group/card",
                                                                count > 0
                                                                    ? "border-rose-100/50 dark:border-rose-500/20 bg-white/40 dark:bg-rose-900/10 hover:border-rose-400/50"
                                                                    : "border-emerald-100/50 dark:border-emerald-500/20 bg-white/40 dark:bg-emerald-900/10 hover:border-emerald-400/50"
                                                            )}
                                                        >
                                                            {/* Animated background glow on hover */}
                                                            <div className={cn(
                                                                "absolute inset-0 opacity-0 group-hover/card:opacity-10 dark:group-hover/card:opacity-20 transition-opacity duration-500",
                                                                count > 0 ? "bg-rose-500" : "bg-emerald-500"
                                                            )} />

                                                            <div className="flex items-center justify-between relative z-10">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors" title={eventName}>
                                                                        {eventName.length > 30 ? eventName.slice(0, 30) + '...' : eventName}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                                                        ID <span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">{eventId}</span>
                                                                    </div>
                                                                </div>
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black transition-all duration-300 shadow-lg ring-2 ring-white/20",
                                                                    count > 0
                                                                        ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/30 group-hover/card:scale-110"
                                                                        : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30"
                                                                )}>
                                                                    {count > 0 && <AlertTriangle className="w-4 h-4" />}
                                                                    {count}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-end mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/card:text-indigo-500 transition-colors relative z-10">
                                                                Details <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover/card:translate-x-1" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ) : (
                                    /* ========== DETAIL VIEW: Show alerts list with optional back button ========== */
                                    <div className="space-y-3">
                                        {/* Back Button when drilled into a specific event */}
                                        {selectedEventIdForDrilldown !== null && (
                                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedEventIdForDrilldown(null)}
                                                    className="text-gray-700 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-500/30 dark:hover:bg-gray-700/20"
                                                >
                                                    ← Back to Summary
                                                </Button>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    Showing alerts for Event {selectedEventIdForDrilldown}
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-3 border-l-4 border-red-200 dark:border-red-500/30 pl-4">
                                            {filteredAlertsForDrilldown
                                                .sort((a, b) => {
                                                    // Priority-based sorting: HIGH -> MEDIUM -> LOW
                                                    const getPriorityWeight = (alert: any) => {
                                                        const details = alert.details || {};
                                                        const variance = Math.abs(((details.currentValue - details.expectedValue) / details.expectedValue) * 100);

                                                        if (variance > 50) return 3; // HIGH
                                                        if (variance > 20) return 2; // MEDIUM  
                                                        return 1; // LOW
                                                    };

                                                    return getPriorityWeight(b) - getPriorityWeight(a);
                                                })
                                                .slice(0, alertsExpanded ? dedupedAlerts.length : 4)
                                                .map((alert, index) => {
                                                    const details = alert.details || {};
                                                    const eventName = details.eventName || `Event ${alert.eventId}`;
                                                    const platformName = PLATFORM_NAMES?.[alert.platform] ?? `Platform ${alert.platform}`;

                                                    const isSourceValid = alert.source !== -1 && alert.source != null;
                                                    const sourceName = isSourceValid
                                                        ? (SOURCE_NAMES?.[alert.source] ?? `Source ${alert.source}`)
                                                        : null;

                                                    const expectedValueNum = typeof details.expectedValue === 'number' ? details.expectedValue : Number(details.expectedValue);
                                                    const currentValueNum = typeof details.currentValue === 'number' ? details.currentValue : Number(details.currentValue);

                                                    const variance = Number.isFinite(expectedValueNum) && expectedValueNum !== 0 && Number.isFinite(currentValueNum)
                                                        ? (((currentValueNum - expectedValueNum) / expectedValueNum) * 100)
                                                        : null;

                                                    const formatNum = (value: any) => {
                                                        const num = typeof value === 'number' ? value : Number(value);
                                                        if (!Number.isFinite(num)) return 'N/A';
                                                        return num.toFixed(2);
                                                    };

                                                    const siteDetail = siteDetails.find(site => site.id === alert.pos);

                                                    return (
                                                        <div
                                                            key={alert.id || index}
                                                            className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                {/* Alert Indicator */}
                                                                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>

                                                                {/* Event Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <h4 className="font-semibold text-sm text-foreground">{eventName}</h4>
                                                                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
                                                                            {platformName}
                                                                        </span>
                                                                        {sourceName && (
                                                                            <span className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded font-medium">
                                                                                {sourceName}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded font-medium">
                                                                            {details.metric}
                                                                        </span>
                                                                        {variance !== null && (
                                                                            <span className={cn(
                                                                                "text-xs px-2 py-0.5 rounded font-bold",
                                                                                Math.abs(variance) > 50 ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" :
                                                                                    Math.abs(variance) > 20 ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" :
                                                                                        "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                                                                            )}>
                                                                                {variance > 0 ? '+' : ''}{variance.toFixed(1)}% deviation
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center text-xs">
                                                                        {siteDetail?.name ? (
                                                                            <span className="font-bold text-foreground">{siteDetail.name}</span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">Others</span>
                                                                        )}
                                                                        <span className="text-muted-foreground ml-2">·</span>
                                                                        <span className="ml-1 font-semibold text-gray-700 dark:text-gray-400">POS</span>
                                                                        <span className="ml-1 font-bold text-foreground">{alert.pos}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Values */}
                                                                <div className="flex items-center gap-6 text-sm">
                                                                    <div className="text-center">
                                                                        <div className="text-xs text-muted-foreground">Current</div>
                                                                        <div className="font-bold text-green-600 dark:text-green-400">{formatNum(details.currentValue)}</div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-xs text-muted-foreground">Expected</div>
                                                                        <div className="font-medium text-foreground">{formatNum(details.expectedValue)}</div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-xs text-muted-foreground">Threshold</div>
                                                                        <div className="font-medium text-blue-600 dark:text-blue-400">{formatNum(details.threshold)}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Drill-down action */}
                                                                <div className="ml-auto pl-4">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/40 rounded-full transition-all duration-200 group-hover:scale-110"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const eventIdStr = String(alert.eventId);
                                                                            const panelId = eventToPanelMap[eventIdStr];
                                                                            if (onJumpToPanel && panelId) {
                                                                                onJumpToPanel(panelId, eventName);
                                                                            } else if (onJumpToPanel) {
                                                                                onJumpToPanel('', eventName);
                                                                            }
                                                                        }}
                                                                        title={`Drill down to ${eventName}`}
                                                                    >
                                                                        <ArrowRight className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Timestamp */}
                                                            <div className="text-xs text-muted-foreground text-right ml-4">
                                                                {(() => {
                                                                    const raw = details.timestamp || alert.create_time;
                                                                    const dateObj = raw ? new Date(raw) : null;
                                                                    if (!dateObj || isNaN(dateObj.getTime())) return '-';
                                                                    return dateObj.toLocaleDateString();
                                                                })()}
                                                                <br />
                                                                {(() => {
                                                                    const raw = details.timestamp || alert.create_time;
                                                                    const dateObj = raw ? new Date(raw) : null;
                                                                    if (!dateObj || isNaN(dateObj.getTime())) return '';
                                                                    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                })()}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                            {/* Show More / Show Less Button */}
                                            {dedupedAlerts.length > 4 && (
                                                <div className="pt-2">
                                                    <Button
                                                        onClick={onToggleExpanded}
                                                        variant="outline"
                                                        size="sm"
                                                        className={cn(
                                                            "w-full text-xs h-8",
                                                            isAutosnipe
                                                                ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50"
                                                                : "border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-500/50"
                                                        )}
                                                    >
                                                        {alertsExpanded ? (
                                                            <>Show Less ({dedupedAlerts.length - 4} hidden)</>
                                                        ) : (
                                                            <>Show All {dedupedAlerts.length} Alerts ({dedupedAlerts.length - 4} more)</>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Simple Summary */}
                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        {alertsExpanded ? 'Showing all' : `Showing ${Math.min(4, criticalAlerts.length)} of`} {criticalAlerts.length} critical alerts
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                        Live monitoring
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </Card >
        </div >
    );
}
