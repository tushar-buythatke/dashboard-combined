import type { DashboardProfile, AnalyticsDataResponse } from '@/types/analytics';
import { CombinedPanel } from './charts/CombinedPanel';
import { SeparatePanel } from './charts/SeparatePanel';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PanelGridProps {
    profile: DashboardProfile;
    data: AnalyticsDataResponse | null;
}

export function PanelGrid({ profile, data }: PanelGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-4 md:gap-6 auto-rows-auto">
            {profile.panels.map((panel, index) => {
                // Enhanced grid system with bento-style responsive layout
                const widthMap: Record<number, string> = {
                    3: 'xl:col-span-3',
                    4: 'xl:col-span-4',
                    6: 'md:col-span-1 lg:col-span-2 xl:col-span-6',
                    8: 'md:col-span-2 lg:col-span-2 xl:col-span-8',
                    12: 'md:col-span-2 lg:col-span-3 xl:col-span-12'
                };
                
                const colSpan = widthMap[panel.position.width] || 'xl:col-span-6';

                return (
                    <motion.div 
                        key={panel.panelId} 
                        className={cn(colSpan, "min-h-[350px] md:min-h-[400px]")}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                            duration: 0.4, 
                            delay: index * 0.05,
                            ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                    >
                        {panel.type === 'combined' ? (
                            <CombinedPanel panel={panel} data={data} />
                        ) : (
                            <SeparatePanel panel={panel} data={data} />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
