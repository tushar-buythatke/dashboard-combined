import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Bell, CheckCircle2, ChevronDown, Filter, CalendarIcon, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { PLATFORMS, PLATFORM_NAMES, SOURCE_NAMES } from '@/services/apiService';
import type { SiteDetail } from '@/services/apiService';
import type { EventConfig } from '@/types/analytics';

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
    events: EventConfig[];
    siteDetails: SiteDetail[];
    onToggleCollapse: () => void;
    onToggleExpanded: () => void;
    onFilterChange: (filters: any) => void;
    onDateRangeChange: (range: { from: Date; to: Date }) => void;
    onLoadAlerts: (expanded?: boolean) => void;
    onPageChange: (page: number) => void;
}

export function CriticalAlertsPanel({
    criticalAlerts,
    alertsLoading,
    alertsExpanded,
    alertsPanelCollapsed,
    alertFilters,
    alertDateRange,
    alertsPage,
    events,
    siteDetails,
    onToggleCollapse,
    onToggleExpanded,
    onFilterChange,
    onDateRangeChange,
    onLoadAlerts,
    onPageChange,
}: CriticalAlertsPanelProps) {
    const { isAutosnipe } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
        >
            <Card className={cn(
                "rounded-2xl overflow-hidden transition-all duration-500 group relative",
                isAutosnipe
                    ? "border border-red-500/30 bg-gradient-to-br from-gray-950/80 via-gray-900/50 to-red-950/20 shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
                    : alertsPanelCollapsed
                        ? criticalAlerts.length > 0
                            ? "border border-red-200/60 dark:border-red-500/30 shadow-[0_8px_30px_rgba(239,68,68,0.12)] bg-gradient-to-br from-red-50/40 via-white to-orange-50/30 dark:from-red-900/10 dark:via-slate-900/80 dark:to-orange-900/5"
                            : "border border-purple-200/60 dark:border-purple-500/30 shadow-[0_8px_30px_rgba(147,51,234,0.12)]"
                        : criticalAlerts.length > 0
                            ? "border border-red-300/60 dark:border-red-500/40 shadow-[0_15px_40px_rgba(239,68,68,0.25)] bg-gradient-to-br from-red-50/80 via-white to-orange-50/60 dark:from-red-900/20 dark:via-slate-900/50 dark:to-orange-900/10"
                            : "border border-purple-300/60 dark:border-purple-500/40 shadow-[0_15px_40px_rgba(147,51,234,0.20)] bg-gradient-to-br from-purple-50/80 via-white to-pink-50/60 dark:from-purple-900/20 dark:via-slate-900/50 dark:to-pink-900/10"
            )}>
                {/* Animated top border accent */}
                <div className={cn(
                    "absolute top-0 left-0 w-full h-1",
                    isAutosnipe
                        ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-500"
                        : criticalAlerts.length > 0
                            ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"
                            : "bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500"
                )} />
                
                {/* Collapsed Header Bar */}
                <div
                    className={cn(
                        "flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-300",
                        isAutosnipe ? (
                            alertsPanelCollapsed
                                ? "bg-gradient-to-r from-gray-900 to-gray-950"
                                : "bg-gradient-to-r from-green-950/50 via-gray-900 to-emerald-950/50"
                        ) : (
                            alertsPanelCollapsed
                                ? "bg-gradient-to-r from-purple-100/80 via-violet-100/60 to-fuchsia-100/40 dark:from-purple-900/30 dark:via-violet-900/20 dark:to-fuchsia-900/10"
                                : "bg-gradient-to-r from-purple-100/90 via-violet-100/70 to-fuchsia-100/50 dark:from-purple-900/40 dark:via-violet-900/30 dark:to-fuchsia-900/20"
                        )
                    )}
                    onClick={onToggleCollapse}
                >
                    <div className="flex items-center gap-3">
                        <motion.div
                            className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                                criticalAlerts.length > 0
                                    ? isAutosnipe
                                        ? "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/30"
                                        : "bg-gradient-to-br from-purple-500 to-violet-600 shadow-purple-500/30"
                                    : isAutosnipe
                                        ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
                                        : "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30"
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
                                <span className={cn(
                                    "bg-clip-text text-transparent",
                                    isAutosnipe
                                        ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                        : "bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600"
                                )}>
                                    Critical Alerts Monitor
                                </span>
                                <span className={cn(
                                    "text-xs font-normal px-2 py-0.5 rounded-full",
                                    isAutosnipe
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                        : "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30"
                                )}>
                                    Panel 0
                                </span>
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {criticalAlerts.length > 0 ? (
                                    <span className="flex items-center gap-1">
                                        <motion.span
                                            className={cn(
                                                "inline-block w-2 h-2 rounded-full",
                                                isAutosnipe ? "bg-red-500" : "bg-purple-500"
                                            )}
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                        />
                                        {criticalAlerts.length} active alert{criticalAlerts.length !== 1 ? 's' : ''} require attention
                                    </span>
                                ) : (
                                    <span className={isAutosnipe ? "text-green-400" : "text-purple-600 dark:text-purple-400"}>
                                        ✓ All systems operating normally
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {criticalAlerts.length > 0 && (
                            <motion.div
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-lg",
                                    isAutosnipe
                                        ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/30"
                                        : "bg-gradient-to-r from-purple-500 to-violet-500 shadow-purple-500/30"
                                )}
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
                            <ChevronDown className={cn(
                                "h-5 w-5",
                                isAutosnipe ? "text-green-400" : "text-purple-600 dark:text-purple-400"
                            )} />
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
                            <div className={cn(
                                "px-4 py-3 border-b",
                                isAutosnipe
                                    ? "bg-gray-900/50 border-green-500/20"
                                    : "bg-gradient-to-r from-purple-50 via-white to-pink-50 dark:from-purple-900/20 dark:via-slate-900/30 dark:to-pink-900/10 border-purple-200 dark:border-purple-500/30"
                            )}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className={cn(
                                        "h-4 w-4",
                                        isAutosnipe ? "text-green-400" : "text-purple-500"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isAutosnipe ? "text-green-300" : "text-purple-700 dark:text-purple-300"
                                    )}>Alert Filters</span>
                                    <span className="text-xs text-muted-foreground">(Independent from dashboard)</span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
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

                                    {/* Event Filter - MultiSelect */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Event</Label>
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
                                    </div>

                                    {/* Refresh Button */}
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                                        <Button
                                            onClick={() => onLoadAlerts(alertsExpanded)}
                                            disabled={alertsLoading}
                                            size="sm"
                                            className={cn(
                                                "w-full h-9",
                                                isAutosnipe
                                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30"
                                                    : "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/30"
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
                            {criticalAlerts.length > 0 && (
                                <div className="px-4 py-3 border-b border-red-200/30 dark:border-red-500/20 bg-gradient-to-r from-red-50/50 to-orange-50/30 dark:from-red-900/10 dark:to-orange-900/5">
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalAlerts.length}</div>
                                            <div className="text-xs text-muted-foreground">Total Alerts</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                {new Set(criticalAlerts.map(alert => alert.pos)).size}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Affected POS</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {new Set(criticalAlerts.map(alert => alert.eventId)).size}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Event Types</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {new Set(criticalAlerts.map(alert => alert.details?.metric)).size}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Metrics</div>
                                        </div>
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
                                ) : criticalAlerts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                                        <p className="text-sm text-muted-foreground">No critical alerts at this time</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 border-l-4 border-red-200 dark:border-red-500/30 pl-4">
                                        {criticalAlerts
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
                                            .slice(0, alertsExpanded ? criticalAlerts.length : 4)
                                            .map((alert, index) => {
                                            const details = alert.details || {};
                                            const eventName = details.eventName || `Event ${alert.eventId}`;
                                            const platformName = PLATFORM_NAMES?.[alert.platform] ?? `Platform ${alert.platform}`;
                                            const sourceName = SOURCE_NAMES?.[alert.source] ?? (alert.source != null ? `Source ${alert.source}` : 'Unknown');

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
                                            
                                            return (
                                                <motion.div
                                                    key={alert.id || index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
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
                                                                <span className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded font-medium">
                                                                    {sourceName}
                                                                </span>
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
                                                            <div className="text-xs text-muted-foreground">
                                                                POS {alert.pos}
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
                                                </motion.div>
                                            );
                                        })}
                                        
                                        {/* Show More / Show Less Button */}
                                        {criticalAlerts.length > 4 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="pt-2"
                                            >
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
                                                        <>Show Less ({criticalAlerts.length - 4} hidden)</>
                                                    ) : (
                                                        <>Show All {criticalAlerts.length} Alerts ({criticalAlerts.length - 4} more)</>
                                                    )}
                                                </Button>
                                            </motion.div>
                                        )}
                                        
                                        {/* Simple Summary */}
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>
                                                    {alertsExpanded ? 'Showing all' : `Showing ${Math.min(4, criticalAlerts.length)} of`} {criticalAlerts.length} critical alerts
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                    Live monitoring
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}
