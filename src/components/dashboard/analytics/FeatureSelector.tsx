import { useEffect, useState } from 'react';
import type { Feature } from '@/types/analytics';
import { getFeatureColor, apiService } from '@/services/apiService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureSelectorProps {
    onSelectFeature: (featureId: string) => void;
}

export function FeatureSelector({ onSelectFeature }: FeatureSelectorProps) {
    const { selectedOrganization } = useOrganization();
    const { user } = useAnalyticsAuth();
    const { t } = useAccentTheme();
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
                <Loader2 className={cn("h-8 w-8 animate-spin", t.textPrimary)} />
            </div>
        );
    }

    return (
        <div className={cn(
            "mx-4 lg:mx-9 py-6 lg:py-10 px-4 lg:px-8 flex-1 overflow-auto relative rounded-2xl",
            "bg-white/40 dark:bg-gray-900/40",
            "backdrop-blur-xl backdrop-saturate-150",
            "border border-white/40 dark:border-white/10",
            "shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]"
        )} style={{ zoom: 0.9 }}>
            {/* Clean subtle background - soft orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl bg-indigo-200/10 dark:bg-indigo-800/10" />
                <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full blur-3xl bg-purple-100/10 dark:bg-purple-900/10" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl bg-cyan-100/8 dark:bg-cyan-900/8" />
            </div>

            <div className="relative z-10">
                <div className="text-center mb-8 lg:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-700/40">
                        <Zap className="h-3 w-3" />
                        Analytics Dashboard
                    </div>

                    <h1 className="text-2xl lg:text-5xl font-bold mb-3 lg:mb-4">
                        <span
                            className={cn("bg-gradient-to-r bg-clip-text text-transparent", t.landingTitleGradient)}
                            style={{
                                backgroundSize: '200% auto',
                                animation: 'text-gradient-shimmer 3s linear infinite'
                            }}
                        >
                            Hatke Analytics
                        </span>
                    </h1>
                    <p className={cn("text-sm lg:text-lg max-w-xl mx-auto px-4 mb-2", t.textMuted)}>
                        Choose a feature to explore detailed analytics and insights
                    </p>
                    <div className={cn("flex items-center justify-center gap-2 text-xs", t.textMuted)}>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                            <span className="font-semibold">⌘F</span>
                            <span>for faster search</span>
                        </span>
                    </div>
                </div>

                {/* === CARDS GRID === */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5 mb-6 lg:mb-8">
                    {features.map((feature) => {
                        const hasAlerts = (alertCounts[feature.id] || 0) > 0;
                        const isHovered = hoveredCard === feature.id;

                        return (
                            <div
                                key={feature.id}
                                onMouseEnter={() => setHoveredCard(feature.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={cn(
                                    "transform transition-transform duration-200 ease-out active:scale-[0.98]",
                                    hasAlerts
                                        ? isHovered ? 'scale-[1.04] -translate-y-2' : 'hover:scale-[1.03] hover:-translate-y-1.5'
                                        : 'hover:scale-[1.02] hover:-translate-y-1'
                                )}
                                style={{ willChange: 'transform' }}
                            >
                                <div
                                    onClick={() => onSelectFeature(feature.id)}
                                    className="cursor-pointer h-full"
                                >
                                    <Card className={cn(
                                        "group relative overflow-hidden rounded-2xl transition-all duration-300 h-full backdrop-blur-xl backdrop-saturate-150",
                                        hasAlerts
                                            ? isHovered
                                                ? 'border border-red-400/60 dark:border-red-500/50 bg-gradient-to-br from-red-50/70 via-white/80 to-orange-50/60 dark:from-red-900/30 dark:via-gray-900/80 dark:to-orange-900/25 shadow-[0_16px_50px_rgba(239,68,68,0.35),inset_0_1px_0_rgba(255,255,255,0.6)]'
                                                : 'border border-red-300/50 dark:border-red-600/40 bg-gradient-to-br from-red-50/60 via-white/70 to-orange-50/50 dark:from-red-900/20 dark:via-gray-900/70 dark:to-orange-900/15 shadow-[0_8px_30px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.5)]'
                                            : isHovered
                                                ? cn('border bg-white/70 shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]', t.cardBg, t.borderAccent, t.borderAccentDark)
                                                : cn('border bg-white/50 dark:bg-gray-900/50 shadow-[0_4px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]', t.featureCardBorder, t.featureCardBorderDark)
                                    )}>
                                        {/* Subtle gradient overlay on hover */}
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 pointer-events-none rounded-2xl",
                                            isHovered && !hasAlerts && "opacity-8",
                                            t.buttonGradient
                                        )} />

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
                                            {/* === ICON CONTAINER - Uses theme === */}
                                            <div className="flex justify-center mb-3">
                                                <div className={cn(
                                                    "h-12 w-12 lg:h-14 lg:w-14 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 border",
                                                    hasAlerts
                                                        ? 'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-500/25 dark:to-orange-500/25 border-red-300/80 dark:border-red-500/40'
                                                        : cn("bg-gradient-to-br", t.iconBg, t.iconBgDark, t.borderAccent, t.borderAccentDark)
                                                )}>
                                                    {getIcon(feature.id)}
                                                </div>
                                            </div>
                                            <CardTitle className={cn("text-sm lg:text-base mb-1 font-bold leading-tight tracking-tight", t.textBase)}>
                                                {feature.name}
                                            </CardTitle>
                                            <CardDescription className={cn("text-[10px] lg:text-xs line-clamp-2 leading-relaxed", t.textMuted)}>{feature.description}</CardDescription>
                                        </CardHeader>

                                        <CardContent className="flex justify-center pb-3 lg:pb-4 pt-0 relative z-10">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "gap-1.5 text-[10px] lg:text-xs h-7 px-3.5 rounded-full font-semibold transition-all duration-200",
                                                    hasAlerts
                                                        ? 'border-red-300/80 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white hover:border-transparent'
                                                        : cn(t.borderAccent, t.borderAccentDark, t.textPrimary, t.textPrimaryDark, "hover:bg-gradient-to-r hover:text-white hover:border-transparent", t.buttonGradient)
                                                )}
                                            >
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
