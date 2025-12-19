import { useEffect, useState } from 'react';
import type { Alert, CriticalAlertsConfig } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CriticalAlertsProps {
    config: CriticalAlertsConfig;
}

export function CriticalAlerts({ config }: CriticalAlertsProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        if (!config.enabled) return;

        const loadAlerts = async () => {
            const data = await mockService.getAlerts();
            setAlerts(data);
        };

        loadAlerts();
        const interval = setInterval(loadAlerts, config.refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [config]);

    if (!config.enabled || alerts.length === 0) return null;

    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    return (
        <EnhancedCard
            variant="glass"
            glow={true}
            className="mb-6 border-red-200/50 dark:border-red-500/30 bg-gradient-to-r from-red-50/80 via-white to-orange-50/60 dark:from-red-950/30 dark:via-slate-900/80 dark:to-orange-950/20 overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30 text-white">
                                <Bell className="w-5 h-5" />
                            </div>
                            {criticalCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-red-600 shadow-sm border border-red-100">
                                    {criticalCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent font-bold">
                                    Critical Alerts Monitor
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] font-medium border border-red-200 dark:border-red-500/30 uppercase tracking-wide">
                                    Panel 0
                                </span>
                            </CardTitle>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs text-muted-foreground font-medium">
                                    {alerts.length} active alerts require attention
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-2 px-4 md:px-6 pb-4">
                    <div className="space-y-3">
                        {alerts.slice(0, config.maxAlerts).map((alert) => (
                            <div
                                key={alert.alertId}
                                className={cn(
                                    "group flex items-start gap-3 p-3 rounded-xl border shadow-sm transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
                                    alert.severity === 'critical'
                                        ? "bg-white dark:bg-red-950/10 border-red-100 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/40"
                                        : alert.severity === 'warning'
                                            ? "bg-white dark:bg-amber-950/10 border-amber-100 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40"
                                            : "bg-white dark:bg-blue-950/10 border-blue-100 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40"
                                )}
                            >
                                <div className={cn(
                                    "mt-0.5 w-2 h-2 rounded-full ring-4 shadow-sm shrink-0",
                                    alert.severity === 'critical'
                                        ? "bg-red-500 ring-red-100 dark:ring-red-900/30"
                                        : alert.severity === 'warning'
                                            ? "bg-amber-500 ring-amber-100 dark:ring-amber-900/30"
                                            : "bg-blue-500 ring-blue-100 dark:ring-blue-900/30"
                                )} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                            {alert.posName}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider",
                                            alert.severity === 'critical' ? "bg-red-100 text-red-700" :
                                                alert.severity === 'warning' ? "bg-amber-100 text-amber-700" :
                                                    "bg-blue-100 text-blue-700"
                                        )}>
                                            {alert.type || 'System'}
                                        </span>
                                        {alert.severity === 'critical' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 font-mono">
                                                ↑ 50.6% deviation
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                        {alert.message}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground font-mono">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                            Current: <span className="font-bold text-gray-900 dark:text-gray-100">17</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            Expected: <span className="font-medium text-green-600 dark:text-green-400">34</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            Threshold: <span className="font-medium text-orange-600 dark:text-orange-400">17</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground font-medium text-right shrink-0">
                                    <span>
                                        {new Date(alert.timestamp).toLocaleDateString()}
                                    </span>
                                    <span>
                                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </EnhancedCard>
    );
}
