import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Layers, Menu, X, BarChart3, PieChart, Calendar, Activity, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';

interface ProfileSidebarProps {
    featureId: string;
    selectedProfileId: string | null;
    onSelectProfile: (profileId: string) => void;
    onCreateProfile: () => void;
    refreshTrigger?: number;
}

export function ProfileSidebar({
    featureId,
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    refreshTrigger = 0
}: ProfileSidebarProps) {
    const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user } = useAnalyticsAuth();
    const isAdmin = user?.role === 0;

    useEffect(() => {
        const loadProfiles = async () => {
            const data = await mockService.getProfiles(featureId);
            setProfiles(data);
            if (!selectedProfileId && data.length > 0) {
                onSelectProfile(data[0].profileId);
            }
        };
        loadProfiles();
    }, [featureId, refreshTrigger]);

    const handleSelectProfile = (profileId: string) => {
        onSelectProfile(profileId);
        setIsMobileOpen(false);
    };

    // Helper to get profile stats
    const getProfileStats = (profile: DashboardProfile) => {
        const panels = profile.panels || [];
        const totalEvents = panels.reduce((sum, p) => sum + (p.events?.length || 0), 0);
        const hasBarChart = panels.some((p: any) => p.filterConfig?.graphType === 'bar');
        const pieChartCount = panels.reduce((sum, p) => 
            sum + (p.visualizations?.pieCharts?.filter(pc => pc.enabled)?.length || 0), 0
        );
        return { panelCount: panels.length, totalEvents, hasBarChart, pieChartCount };
    };

    const SidebarContent = () => (
        <>
            {/* Header */}
            <div className="p-4 lg:p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Grid3X3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground text-base lg:text-lg">Profiles</h2>
                            <p className="text-xs text-muted-foreground">{profiles.length} dashboards</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    onClick={onCreateProfile}
                                    size="sm"
                                    className="h-8 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm text-xs font-medium"
                                    title="Create New Profile"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    New
                                </Button>
                            </motion.div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 lg:hidden"
                            onClick={() => setIsMobileOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            {/* Profile Grid */}
            <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                <AnimatePresence mode="popLayout">
                    <div className="grid grid-cols-1 gap-3">
                        {profiles.map((profile, index) => {
                            const isSelected = selectedProfileId === profile.profileId;
                            const stats = getProfileStats(profile);
                            
                            return (
                                <motion.div
                                    key={profile.profileId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleSelectProfile(profile.profileId)}
                                    className="cursor-pointer group"
                                >
                                    <motion.div
                                        className={cn(
                                            "relative p-3 rounded-xl transition-all duration-200 overflow-hidden",
                                            isSelected 
                                                ? "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-500/15 dark:to-indigo-500/10 border-2 border-purple-300 dark:border-purple-500/40 shadow-md shadow-purple-500/10" 
                                                : "bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:shadow-sm"
                                        )}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        {/* Selected indicator bar */}
                                        {isSelected && (
                                            <motion.div 
                                                layoutId="selectedBar"
                                                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-l-xl"
                                            />
                                        )}

                                        {/* Profile Name & Icon */}
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                                isSelected 
                                                    ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm" 
                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                                            )}>
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className={cn(
                                                    "font-semibold text-sm truncate",
                                                    isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground"
                                                )}>
                                                    {profile.profileName}
                                                </p>
                                            </div>
                                            
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50"
                                                />
                                            )}
                                        </div>
                                        
                                        {/* Bento Stats Grid */}
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <div className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-lg",
                                                isSelected 
                                                    ? "bg-purple-100/80 dark:bg-purple-500/20" 
                                                    : "bg-gray-100/80 dark:bg-white/5"
                                            )}>
                                                <Grid3X3 className={cn(
                                                    "h-3.5 w-3.5 mb-0.5",
                                                    isSelected ? "text-purple-600 dark:text-purple-400" : "text-gray-500"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground"
                                                )}>{stats.panelCount}</span>
                                                <span className="text-[9px] text-muted-foreground">Panels</span>
                                            </div>
                                            
                                            <div className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-lg",
                                                isSelected 
                                                    ? "bg-indigo-100/80 dark:bg-indigo-500/20" 
                                                    : "bg-gray-100/80 dark:bg-white/5"
                                            )}>
                                                <Activity className={cn(
                                                    "h-3.5 w-3.5 mb-0.5",
                                                    isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"
                                                )}>{stats.totalEvents}</span>
                                                <span className="text-[9px] text-muted-foreground">Events</span>
                                            </div>
                                            
                                            <div className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-lg",
                                                isSelected 
                                                    ? "bg-blue-100/80 dark:bg-blue-500/20" 
                                                    : "bg-gray-100/80 dark:bg-white/5"
                                            )}>
                                                <BarChart3 className={cn(
                                                    "h-3.5 w-3.5 mb-0.5",
                                                    stats.hasBarChart 
                                                        ? (isSelected ? "text-blue-600 dark:text-blue-400" : "text-blue-500")
                                                        : "text-gray-400"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    stats.hasBarChart 
                                                        ? (isSelected ? "text-blue-700 dark:text-blue-300" : "text-blue-600")
                                                        : "text-gray-400"
                                                )}>{stats.hasBarChart ? 'Bar' : 'Line'}</span>
                                                <span className="text-[9px] text-muted-foreground">Chart</span>
                                            </div>
                                            
                                            <div className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-lg",
                                                isSelected 
                                                    ? "bg-pink-100/80 dark:bg-pink-500/20" 
                                                    : "bg-gray-100/80 dark:bg-white/5"
                                            )}>
                                                <PieChart className={cn(
                                                    "h-3.5 w-3.5 mb-0.5",
                                                    isSelected ? "text-pink-600 dark:text-pink-400" : "text-gray-500"
                                                )} />
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    isSelected ? "text-pink-700 dark:text-pink-300" : "text-foreground"
                                                )}>{stats.pieChartCount}</span>
                                                <span className="text-[9px] text-muted-foreground">Pies</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
                
                {profiles.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/10">
                            <Layers className="h-7 w-7 text-purple-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No profiles yet</p>
                        <p className="text-xs text-muted-foreground mb-4">Create your first dashboard profile</p>
                        {isAdmin && (
                            <Button 
                                onClick={onCreateProfile}
                                size="sm" 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Create Profile
                            </Button>
                        )}
                    </motion.div>
                )}
            </div>
            
            {/* Footer */}
            <div className="p-3 lg:p-4 border-t border-border/40">
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-gray-100/80 dark:hover:bg-white/5 rounded-lg h-10 gap-2.5 text-sm transition-colors" 
                    size="sm"
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </Button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile toggle button */}
            <motion.button
                className="fixed bottom-4 left-4 z-50 lg:hidden h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center"
                onClick={() => setIsMobileOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Menu className="h-5 w-5" />
            </motion.button>
            
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>
            
            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 left-0 w-80 bg-background border-r border-border/50 flex flex-col z-50 lg:hidden shadow-2xl"
                    >
                        <SidebarContent />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-72 xl:w-80 border-r border-border/40 bg-background flex-col h-full">
                <SidebarContent />
            </div>
        </>
    );
}
