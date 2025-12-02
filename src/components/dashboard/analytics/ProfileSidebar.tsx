import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';

interface ProfileSidebarProps {
    featureId: string;
    selectedProfileId: string | null;
    onSelectProfile: (profileId: string) => void;
    onCreateProfile: () => void;
    refreshTrigger?: number;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function ProfileSidebar({
    featureId,
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    refreshTrigger = 0,
    isCollapsed = false,
    onToggleCollapse
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

    // Helper to get profile stats - simplified
    const getProfileStats = (profile: DashboardProfile) => {
        const panels = profile.panels || [];
        const totalEvents = panels.reduce((sum, p) => sum + (p.events?.length || 0), 0);
        return { panelCount: panels.length, totalEvents };
    };

    // Collapsed view - just numbers
    const CollapsedContent = () => (
        <div className="flex flex-col h-full py-4">
            {/* Collapse Toggle */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8 mx-auto mb-4 hover:bg-purple-100 dark:hover:bg-purple-500/20"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            {/* New Profile Button */}
            {isAdmin && (
                <Button
                    onClick={onCreateProfile}
                    size="icon"
                    className="h-8 w-8 mx-auto mb-4 bg-purple-600 hover:bg-purple-700"
                    title="Create New Profile"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            )}

            {/* Profile list - collapsed */}
            <div className="flex-1 overflow-y-auto px-2 space-y-2">
                {profiles.map((profile, index) => {
                    const isSelected = selectedProfileId === profile.profileId;
                    return (
                        <motion.button
                            key={profile.profileId}
                            onClick={() => handleSelectProfile(profile.profileId)}
                            className={cn(
                                "w-full h-10 rounded-lg flex items-center justify-center transition-all",
                                isSelected 
                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-2 border-purple-400 dark:border-purple-500/50" 
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title={profile.profileName}
                        >
                            <span className="text-sm font-bold">{index + 1}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );

    // Expanded view - minimal design
    const ExpandedContent = () => (
        <div className="flex flex-col h-full">
            {/* Header - Minimal */}
            <div className="p-4 flex items-center justify-between border-b border-border/30">
                <div>
                    <h2 className="font-semibold text-sm text-foreground">Profiles</h2>
                    <p className="text-xs text-muted-foreground">{profiles.length} dashboards</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            onClick={onCreateProfile}
                            size="sm"
                            className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            New
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCollapse}
                        className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 lg:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            {/* Profile List - Minimal */}
            <div className="flex-1 overflow-y-auto p-3">
                <AnimatePresence mode="popLayout">
                    <div className="space-y-2">
                        {profiles.map((profile) => {
                            const isSelected = selectedProfileId === profile.profileId;
                            const stats = getProfileStats(profile);
                            
                            return (
                                <motion.button
                                    key={profile.profileId}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => handleSelectProfile(profile.profileId)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg transition-all",
                                        isSelected 
                                            ? "bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-400 dark:border-purple-500/40" 
                                            : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "font-medium text-sm truncate",
                                            isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground"
                                        )}>
                                            {profile.profileName}
                                        </span>
                                        {isSelected && (
                                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                        <span>{stats.panelCount} panels</span>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <span>{stats.totalEvents} events</span>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </AnimatePresence>
                
                {profiles.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">No profiles yet</p>
                        {isAdmin && (
                            <Button 
                                onClick={onCreateProfile}
                                size="sm" 
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Create Profile
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile toggle button */}
            <motion.button
                className="fixed bottom-4 left-4 z-50 lg:hidden h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center"
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
                        className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border/50 flex flex-col z-50 lg:hidden shadow-xl"
                    >
                        <ExpandedContent />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Desktop Sidebar */}
            <motion.div 
                className="hidden lg:flex flex-col h-full bg-background"
                animate={{ width: isCollapsed ? 60 : '100%' }}
                transition={{ duration: 0.2 }}
            >
                {isCollapsed ? <CollapsedContent /> : <ExpandedContent />}
            </motion.div>
        </>
    );
}
