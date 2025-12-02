import { useEffect, useState } from 'react';
import type { Alert, CriticalAlertsConfig } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';


interface CriticalAlertsProps {
    config: CriticalAlertsConfig;
}

export function CriticalAlerts({ config }: CriticalAlertsProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);

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

    return (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-destructive">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Critical Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {alerts.slice(0, config.maxAlerts).map((alert) => (
                        <div key={alert.alertId} className="flex items-start gap-2 text-sm">
                            {alert.severity === 'critical' ? (
                                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                            ) : alert.severity === 'warning' ? (
                                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            ) : (
                                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                                <span className="font-semibold">[{alert.posName}]</span>: {alert.message}
                                <span className="text-muted-foreground ml-2 text-xs">
                                    - {new Date(alert.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
