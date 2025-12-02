import type { DashboardProfile, AnalyticsDataResponse } from '@/types/analytics';
import { CombinedPanel } from './charts/CombinedPanel';
import { SeparatePanel } from './charts/SeparatePanel';
import { cn } from '@/lib/utils';

interface PanelGridProps {
    profile: DashboardProfile;
    data: AnalyticsDataResponse | null;
}

export function PanelGrid({ profile, data }: PanelGridProps) {
    return (
        <div className="grid grid-cols-12 gap-6">
            {profile.panels.map((panel) => {
                // Simple grid system mapping: width 12 = col-span-12, width 6 = col-span-6
                const colSpan = `col-span-12 md:col-span-${panel.position.width}`;

                return (
                    <div key={panel.panelId} className={cn(colSpan, "min-h-[400px]")}>
                        {panel.type === 'combined' ? (
                            <CombinedPanel panel={panel} data={data} />
                        ) : (
                            <SeparatePanel panel={panel} data={data} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
