import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Feature } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { getFeatureColor, apiService } from '@/services/apiService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, Sparkles, Zap } from 'lucide-react';

interface FeatureSelectorProps {
    onSelectFeature: (featureId: string) => void;
}

export function FeatureSelector({ onSelectFeature }: FeatureSelectorProps) {
    const { selectedOrganization } = useOrganization();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    // Load base features
    useEffect(() => {
        const loadFeatures = async () => {
            setLoading(true);
            try {
                const orgId = selectedOrganization?.id ?? 0;
                const baseFeatures = await mockService.getFeatures(orgId);
                setFeatures(baseFeatures);
            } catch (error) {
                console.error('Failed to load features', error);
            } finally {
                setLoading(false);
            }
        };
        loadFeatures();
    }, [selectedOrganization?.id]);

    // Load alert counts for features (check which features have critical alerts)
    useEffect(() => {
        const loadAlertCounts = async () => {
            if (features.length === 0) return;
            
            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 7); // Last 7 days
                
                // Fetch alerts for all event IDs (we'll check which features have alerts)
                const alerts = await apiService.getCriticalAlerts(
                    [], // All events
                    [], // All platforms
                    [], // All POS
                    [], // All sources
                    startDate,
                    endDate,
                    100, // Get up to 100 alerts
                    0
                );
                
                // Count alerts per feature (using eventId mapping)
                const counts: Record<string, number> = {};
                features.forEach(f => {
                    counts[f.id] = 0;
                });
                
                // If we have alerts, show on Price Alert feature
                if (alerts.length > 0) {
                    counts['1'] = alerts.length;
                }
                
                setAlertCounts(counts);
            } catch (error) {
                console.error('Failed to load alert counts:', error);
            }
        };
        
        loadAlertCounts();
    }, [features]);

    // Dynamic icon - uses color from API-based palette (smaller size)
    const getIcon = (id: string) => {
        const color = getFeatureColor(id);
        return <BarChart3 className={`h-6 w-6 ${color.icon}`} />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <Sparkles className="h-8 w-8 text-purple-400" />
                </motion.div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto py-6 lg:py-10 px-3 lg:px-4 flex-1 overflow-auto relative">
            {/* Subtle dot pattern background */}
            <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
            
            {/* Floating decorative elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-64 h-64 rounded-full"
                        style={{
                            background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(147, 51, 234, 0.03)' : 'rgba(124, 58, 237, 0.03)'} 0%, transparent 70%)`,
                            left: `${(i * 20) % 80}%`,
                            top: `${(i * 15) % 60}%`,
                        }}
                        animate={{
                            x: [0, 30, 0],
                            y: [0, -20, 0],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 8 + i * 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.5,
                        }}
                    />
                ))}
            </div>
            
            <div className="relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-8 lg:mb-12"
                >
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-medium mb-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <motion.span
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Zap className="h-3 w-3" />
                        </motion.span>
                        Analytics Dashboard
                    </motion.div>
                    
                    <motion.h1 
                        className="text-2xl lg:text-5xl font-bold mb-3 lg:mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <motion.span 
                            className="bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 bg-clip-text text-transparent bg-[length:200%_auto]"
                            animate={{ backgroundPosition: ['0% center', '200% center'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            Select a Feature
                        </motion.span>
                    </motion.h1>
                    <motion.p 
                        className="text-muted-foreground text-sm lg:text-lg max-w-xl mx-auto px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Choose a feature to explore detailed analytics and insights
                    </motion.p>
                </motion.div>
            
            {/* Base Features - Compact Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4 mb-6 lg:mb-8"
            >
                {features.map((feature) => {
                    const hasAlerts = (alertCounts[feature.id] || 0) > 0;
                    return (
                    <motion.div 
                        key={feature.id} 
                        variants={itemVariants}
                        onHoverStart={() => setHoveredCard(feature.id)}
                        onHoverEnd={() => setHoveredCard(null)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div 
                            onClick={() => onSelectFeature(feature.id)}
                            className="cursor-pointer"
                        >
                            <Card className={`group relative border-border bg-card/80 backdrop-blur-sm transition-all duration-300 ${hoveredCard === feature.id ? 'shadow-lg shadow-purple-500/20 border-purple-300 dark:border-purple-500/50' : ''} ${hasAlerts ? 'border-red-300 dark:border-red-500/50' : ''}`}>
                                {/* Alert Indicator - Red Blinking */}
                                {hasAlerts && (
                                    <>
                                        {/* Pulsing red glow - positioned inside the card */}
                                        <div className="absolute top-2 right-2 z-20">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                        </div>
                                        {/* Alert count badge - inside card */}
                                        <div className="absolute top-2 left-2 z-20">
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded animate-pulse">
                                                {alertCounts[feature.id]} alerts
                                            </span>
                                        </div>
                                    </>
                                )}
                                
                                {/* Subtle gradient overlay on hover */}
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: hoveredCard === feature.id ? 1 : 0 }}
                                    transition={{ duration: 0.2 }}
                                />
                                
                                <CardHeader className="text-center relative z-10 p-3 lg:p-4">
                                    <div className="flex justify-center mb-2">
                                        <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20 ${hasAlerts ? 'border-red-300 dark:border-red-500/30' : ''}`}>
                                            {getIcon(feature.id)}
                                        </div>
                                    </div>
                                    <CardTitle className="text-sm lg:text-base text-foreground mb-0.5 truncate">
                                        {feature.name}
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground text-[10px] lg:text-xs line-clamp-1">{feature.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center pb-3 lg:pb-4 pt-0 relative z-10">
                                    <Button variant="outline" size="sm" className={`gap-1 text-[10px] lg:text-xs h-7 px-2 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 ${hasAlerts ? 'border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400' : ''}`}>
                                        View
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                    );
                })}
            </motion.div>
            </div>
        </div>
    );
}
