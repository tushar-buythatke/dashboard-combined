import { useEffect, useState } from 'react';
import type { Feature } from '@/types/analytics';
import { getFeatureColor, apiService } from '@/services/apiService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, Zap, Loader2 } from 'lucide-react';

interface FeatureSelectorProps {
    onSelectFeature: (featureId: string) => void;
}

export function FeatureSelector({ onSelectFeature }: FeatureSelectorProps) {
    const { selectedOrganization } = useOrganization();
    const { user } = useAnalyticsAuth();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    // Load base features - FAST: Direct API call, no Firebase
    useEffect(() => {
        const loadFeatures = async () => {
            setLoading(true);
            try {
                const orgId = selectedOrganization?.id ?? 0;
                
                // Direct API call - fast and reliable
                const apiFeatures = await apiService.getFeaturesList(orgId);
                
                // Transform to Feature format
                let baseFeatures: Feature[] = apiFeatures.map(f => ({
                    id: f.id.toString(),
                    name: f.name,
                    description: `${f.name} analytics and tracking`
                }));

                // Filter features based on user permissions
                // Admins (role=1) see all features
                // Users with null permissions also see all (until admin sets permissions)
                // Only filter if user has explicit permissions set
                if (user?.role !== 1 && user?.permissions?.features && Object.keys(user.permissions.features).length > 0) {
                    baseFeatures = baseFeatures.filter(f => !!user?.permissions?.features?.[String(f.id)]);
                }

                setFeatures(baseFeatures);
            } catch (error) {
                console.error('Failed to load features', error);
                setFeatures([]); // Show empty instead of hanging
            } finally {
                setLoading(false);
            }
        };
        loadFeatures();
    }, [selectedOrganization?.id, user?.role, user?.permissions]);

    // Load alert counts for features (runs after features load, doesn't block UI)
    useEffect(() => {
        const loadAlertCounts = async () => {
            if (!features.length) return;

            try {
                const orgId = selectedOrganization?.id ?? 0;
                const cacheKey = `feature_alert_counts_v2_${orgId}`;
                const CACHE_TTL_MS = 10 * 60 * 1000; // Reduced to 10 mins for better real-time feel

                // Try cache first
                try {
                    const cachedRaw = localStorage.getItem(cacheKey);
                    if (cachedRaw) {
                        const cached = JSON.parse(cachedRaw) as { updatedAt: number; counts: Record<string, number> };
                        if (Date.now() - cached.updatedAt < CACHE_TTL_MS) {
                            setAlertCounts(cached.counts || {});
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('Failed to read feature alert counts cache:', err);
                }

                // 1. Fetch all events for the organization once to avoid per-feature API calls
                // We'll use a Promise.all to fetch events for all features in parallel if needed,
                // but ideally we'd have a bulk getEvents method. For now, let's keep it optimized.
                const featureToEventsMap: Record<string, { regular: number[], api: number[] }> = {};

                await Promise.all(features.map(async (feature) => {
                    try {
                        const events = await apiService.getEventsList(feature.id, orgId);
                        featureToEventsMap[feature.id] = {
                            regular: events.filter(e => !e.isApiEvent).map(e => parseInt(e.eventId)),
                            api: events.filter(e => e.isApiEvent).map(e => parseInt(e.eventId))
                        };
                    } catch (err) {
                        console.warn(`Failed to fetch events for feature ${feature.id}:`, err);
                    }
                }));

                const allRegularIds = Object.values(featureToEventsMap).flatMap(f => f.regular);
                const allApiIds = Object.values(featureToEventsMap).flatMap(f => f.api);

                // 2. Fetch critical alert counts summary in bulk (2 calls: Regular and API)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 7); // Last 7 days

                const [regularAlertCounts, apiAlertCounts]: [Record<string, number>, Record<string, number>] = await Promise.all([
                    allRegularIds.length > 0 ? apiService.getAlertList(allRegularIds, startDate, endDate, true, 0) : Promise.resolve({}),
                    allApiIds.length > 0 ? apiService.getAlertList(allApiIds, startDate, endDate, true, 1) : Promise.resolve({})
                ]);

                // 3. Aggregate counts per feature
                const counts: Record<string, number> = {};
                features.forEach(feature => {
                    const featureEvents = featureToEventsMap[feature.id];
                    let total = 0;

                    if (featureEvents) {
                        featureEvents.regular.forEach(id => {
                            total += (regularAlertCounts[String(id)] || 0);
                        });
                        featureEvents.api.forEach(id => {
                            total += (apiAlertCounts[String(id)] || 0);
                        });
                    }

                    counts[feature.id] = total;
                });

                setAlertCounts(counts);

                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        updatedAt: Date.now(),
                        counts,
                    }));
                } catch (err) {
                    console.warn('Failed to write feature alert counts cache:', err);
                }
            } catch (error) {
                console.error('Failed to load alert counts for features:', error);
            }
        };

        loadAlertCounts();
    }, [features, selectedOrganization?.id]);

    // Dynamic icon
    const getIcon = (id: string) => {
        const color = getFeatureColor(id);
        return <BarChart3 className={`h-6 w-6 ${color.icon}`} />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full py-20">
                <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="mx-4 lg:mx-9 py-6 lg:py-10 px-4 lg:px-8 flex-1 overflow-auto relative rounded-xl bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 dark:from-purple-950/30 dark:via-slate-900 dark:to-indigo-950/20" style={{ zoom: 0.9 }}>
            {/* Simple dot pattern - no blur, no heavy effects */}
            <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />

            {/* Gradient accent bars */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-pink-500/40" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-transparent" />

            <div className="relative z-10">
                <div className="text-center mb-8 lg:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-4">
                        <Zap className="h-3 w-3" />
                        Analytics Dashboard
                    </div>

                    <h1 className="text-2xl lg:text-5xl font-bold mb-3 lg:mb-4">
                        <span
                            className="bg-gradient-to-r from-purple-700 via-fuchsia-500 via-pink-500 to-purple-700 bg-clip-text text-transparent"
                            style={{
                                backgroundSize: '400% auto',
                                animation: 'text-gradient-shimmer 4s linear infinite'
                            }}
                        >
                            Hatke Analytics
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm lg:text-lg max-w-xl mx-auto px-4">
                        Choose a feature to explore detailed analytics and insights
                    </p>
                </div>

                {/* === CARDS GRID === */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5 mb-6 lg:mb-8">
                    {features.map((feature) => {
                        const hasAlerts = (alertCounts[feature.id] || 0) > 0;
                        return (
                            <div
                                key={feature.id}
                                onMouseEnter={() => setHoveredCard(feature.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={`transform transition-transform duration-200 ease-out active:scale-[0.98] ${hasAlerts
                                    ? hoveredCard === feature.id
                                        ? 'scale-[1.04] -translate-y-2'
                                        : 'hover:scale-[1.03] hover:-translate-y-1.5'
                                    : 'hover:scale-[1.02] hover:-translate-y-1'
                                    }`}
                                style={{ willChange: 'transform' }}
                            >
                                <div
                                    onClick={() => onSelectFeature(feature.id)}
                                    className="cursor-pointer h-full"
                                >
                                    <Card className={`group relative overflow-hidden rounded-2xl transition-all duration-200 h-full ${hasAlerts ?
                                        hoveredCard === feature.id ?
                                            'border-2 border-red-500/90 dark:border-red-400/80 bg-gradient-to-br from-red-50/90 via-white/95 to-orange-50/80 dark:from-red-900/20 dark:via-slate-900/90 dark:to-orange-900/15 shadow-[0_12px_40px_rgba(239,68,68,0.35)] shadow-red-500/30' :
                                            'border-2 border-red-400/70 dark:border-red-500/60 bg-gradient-to-br from-red-50/90 via-white/95 to-orange-50/80 dark:from-red-900/20 dark:via-slate-900/90 dark:to-orange-900/15 shadow-[0_8px_30px_rgba(239,68,68,0.25)] shadow-red-500/20' :
                                        hoveredCard === feature.id ?
                                            'border-2 border-purple-400 dark:border-purple-400 bg-gradient-to-br from-purple-50/95 via-white/95 to-pink-50/90 dark:from-purple-900/35 dark:via-slate-900/90 dark:to-pink-900/25 shadow-lg' :
                                            'border border-purple-200/70 dark:border-purple-500/40 bg-gradient-to-br from-white/80 via-white/90 to-purple-50/60 dark:from-slate-900/80 dark:via-slate-900/90 dark:to-purple-900/15 shadow-sm hover:shadow-md'
                                        }`}>

                                        {/* === ALERT INDICATOR === */}
                                        {hasAlerts && (
                                            <>
                                                {/* Pulsing Dot */}
                                                <div className="absolute top-2.5 right-2.5 z-20">
                                                    <span className="relative flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                    </span>
                                                </div>
                                                {/* Alert Count Badge */}
                                                <div className="absolute top-2 left-2 z-20">
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-md border border-red-400/50">
                                                        {alertCounts[feature.id]} Alerts
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        <CardHeader className="text-center relative z-10 px-3 py-4 lg:px-4 lg:py-5">
                                            {/* === ICON CONTAINER === */}
                                            <div className="flex justify-center mb-3">
                                                <div className={`h-12 w-12 lg:h-14 lg:w-14 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 ${hasAlerts ?
                                                    'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-500/25 dark:to-orange-500/25 border border-red-300/80 dark:border-red-500/40' :
                                                    'bg-gradient-to-br from-purple-100 via-violet-100 to-fuchsia-100 dark:from-purple-500/25 dark:via-violet-500/25 dark:to-fuchsia-500/25 border border-purple-300/80 dark:border-purple-500/40'
                                                    }`}>
                                                    {getIcon(feature.id)}
                                                </div>
                                            </div>
                                            <CardTitle className="text-sm lg:text-base text-foreground mb-1 font-bold leading-tight tracking-tight">
                                                {feature.name}
                                            </CardTitle>
                                            <CardDescription className="text-muted-foreground text-[10px] lg:text-xs line-clamp-2 leading-relaxed">{feature.description}</CardDescription>
                                        </CardHeader>

                                        <CardContent className="flex justify-center pb-3 lg:pb-4 pt-0 relative z-10">
                                            <Button variant="outline" size="sm" className={`gap-1.5 text-[10px] lg:text-xs h-7 px-3.5 rounded-full font-semibold transition-all duration-200 ${hasAlerts ?
                                                'border-red-300/80 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white hover:border-transparent' :
                                                'border-purple-300/80 dark:border-purple-500/50 text-purple-700 dark:text-purple-300 hover:bg-purple-500 hover:text-white hover:border-transparent'
                                                }`}>
                                                View
                                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
