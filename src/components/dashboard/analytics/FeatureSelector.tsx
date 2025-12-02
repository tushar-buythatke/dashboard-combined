import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Feature, DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Tag, Calculator, Layers, ArrowRight, Sparkles, Zap } from 'lucide-react';

interface FeatureSelectorProps {
    onSelectFeature: (featureId: string) => void;
}

// Extended feature that includes custom configs
interface FeatureWithConfigs extends Feature {
    isCustomConfig?: boolean;
    profileId?: string;
    baseFeatureId?: string;
}

export function FeatureSelector({ onSelectFeature }: FeatureSelectorProps) {
    const [features, setFeatures] = useState<FeatureWithConfigs[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        const loadFeatures = async () => {
            try {
                // Load base features
                const baseFeatures = await mockService.getFeatures();
                
                // Load all profiles to find custom configs
                const allProfiles: DashboardProfile[] = [];
                for (const feature of baseFeatures) {
                    const profiles = await mockService.getProfiles(feature.id);
                    allProfiles.push(...profiles);
                }
                
                // Create feature cards for each custom config (profile)
                const customConfigs: FeatureWithConfigs[] = allProfiles.map(profile => ({
                    id: profile.profileId, // Use profileId as the feature ID for navigation
                    name: profile.profileName,
                    description: `Custom ${profile.featureId === 'price_alert' ? 'Price Alert' : 
                        profile.featureId === 'auto_coupon' ? 'Auto-Coupon' : 'Spend-Lens'} configuration`,
                    isCustomConfig: true,
                    profileId: profile.profileId,
                    baseFeatureId: profile.featureId
                }));
                
                // Combine base features with custom configs
                setFeatures([...baseFeatures, ...customConfigs]);
            } catch (error) {
                console.error('Failed to load features', error);
            } finally {
                setLoading(false);
            }
        };
        loadFeatures();
    }, []);

    const getIcon = (id: string, isCustom?: boolean) => {
        if (isCustom) {
            return <Layers className="h-10 w-10 text-purple-400" />;
        }
        switch (id) {
            case 'price_alert': return <BarChart3 className="h-10 w-10 text-blue-400" />;
            case 'auto_coupon': return <Tag className="h-10 w-10 text-emerald-400" />;
            case 'spend_lens': return <Calculator className="h-10 w-10 text-amber-400" />;
            default: return <BarChart3 className="h-10 w-10 text-purple-400" />;
        }
    };

    const getFeatureTypeBadge = (baseFeatureId?: string) => {
        if (!baseFeatureId) return null;
        const typeColors: Record<string, string> = {
            'price_alert': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
            'auto_coupon': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
            'spend_lens': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
        };
        const typeNames: Record<string, string> = {
            'price_alert': 'PA',
            'auto_coupon': 'AC',
            'spend_lens': 'SPEND'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[baseFeatureId] || 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                {typeNames[baseFeatureId] || baseFeatureId}
            </span>
        );
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

    // Separate base features and custom configs
    const baseFeatures = features.filter(f => !f.isCustomConfig);
    const customConfigs = features.filter(f => f.isCustomConfig);

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
            
            {/* Base Features - 3D Tilt Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-12 perspective-1000"
            >
                {baseFeatures.map((feature) => (
                    <motion.div 
                        key={feature.id} 
                        variants={itemVariants}
                        onHoverStart={() => setHoveredCard(feature.id)}
                        onHoverEnd={() => setHoveredCard(null)}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div 
                            onClick={() => onSelectFeature(feature.id)}
                            className="cursor-pointer"
                        >
                            <Card className={`group relative overflow-hidden border-border bg-card/80 backdrop-blur-sm transition-all duration-500 ${hoveredCard === feature.id ? 'shadow-2xl shadow-purple-500/20 border-purple-300 dark:border-purple-500/50' : ''}`}>
                                {/* Animated gradient overlay */}
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-violet-500/10"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: hoveredCard === feature.id ? 1 : 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                                
                                {/* Shimmer effect on hover */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: hoveredCard === feature.id ? '200%' : '-100%' }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                />
                                
                                <CardHeader className="text-center relative z-10 p-4 lg:p-6">
                                    <motion.div
                                        className="flex justify-center mb-3 lg:mb-4"
                                        animate={hoveredCard === feature.id ? { 
                                            y: [0, -8, 0],
                                            rotate: [0, 5, -5, 0]
                                        } : {}}
                                        transition={{ duration: 0.6 }}
                                    >
                                        <motion.div 
                                            className="h-14 w-14 lg:h-20 lg:w-20 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20 shadow-sm"
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            {getIcon(feature.id)}
                                        </motion.div>
                                    </motion.div>
                                    <CardTitle className="text-lg lg:text-2xl text-foreground mb-1 lg:mb-2">
                                        <motion.span
                                            animate={hoveredCard === feature.id ? { letterSpacing: '0.02em' } : { letterSpacing: '0em' }}
                                        >
                                            {feature.name}
                                        </motion.span>
                                    </CardTitle>
                                    <CardDescription className="text-muted-foreground text-xs lg:text-sm">{feature.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex justify-center pb-4 lg:pb-6 relative z-10">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button variant="outline" size="sm" className="gap-2 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 group-hover:border-purple-400 dark:group-hover:border-purple-400/50 text-xs lg:text-sm relative overflow-hidden">
                                            <motion.span
                                                className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0"
                                                animate={{ x: ['-100%', '100%'] }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                            />
                                            View Dashboard
                                            <motion.div
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                <ArrowRight className="h-3 w-3 lg:h-4 lg:w-4" />
                                            </motion.div>
                                        </Button>
                                    </motion.div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Custom Configs Section */}
            {customConfigs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <motion.div 
                        className="border-t border-border my-6 lg:my-10 relative"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        <motion.div
                            className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <Sparkles className="h-5 w-5 text-purple-400" />
                        </motion.div>
                    </motion.div>
                    
                    <motion.h2 
                        className="text-base lg:text-xl font-semibold mb-4 lg:mb-6 text-center text-muted-foreground flex items-center justify-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <motion.span
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                        >
                            <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-purple-500" />
                        </motion.span>
                        Custom Configurations
                    </motion.h2>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4"
                    >
                        {customConfigs.map((config) => (
                            <motion.div 
                                key={config.id} 
                                variants={itemVariants}
                                whileHover={{ scale: 1.03, y: -4 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Card
                                    className="group cursor-pointer border-border bg-card/80 backdrop-blur-sm hover:border-purple-300 dark:hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden relative"
                                    onClick={() => onSelectFeature(config.baseFeatureId || config.id)}
                                >
                                    {/* Animated border gradient */}
                                    <motion.div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            background: 'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent)',
                                        }}
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                    
                                    <CardHeader className="text-center p-3 lg:pb-3 relative z-10">
                                        <motion.div 
                                            className="flex justify-center mb-2 lg:mb-3"
                                            whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
                                        >
                                            <div className="h-10 w-10 lg:h-14 lg:w-14 rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-500/10 dark:to-violet-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
                                                {getIcon(config.id, true)}
                                            </div>
                                        </motion.div>
                                        <div className="flex items-center justify-center gap-1 lg:gap-2 flex-wrap">
                                            <CardTitle className="text-xs lg:text-base text-foreground truncate">{config.name}</CardTitle>
                                            <motion.div whileHover={{ scale: 1.1 }}>
                                                {getFeatureTypeBadge(config.baseFeatureId)}
                                            </motion.div>
                                        </div>
                                        <CardDescription className="text-[10px] lg:text-xs text-muted-foreground line-clamp-2">{config.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-center p-2 lg:pb-4 relative z-10">
                                        <Button variant="ghost" size="sm" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-xs h-7 lg:h-8">
                                            Open
                                            <motion.div
                                                className="ml-1"
                                                animate={{ x: [0, 3, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                <ArrowRight className="h-3 w-3" />
                                            </motion.div>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )}
            </div>
        </div>
    );
}
