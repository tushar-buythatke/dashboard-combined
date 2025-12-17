import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Menu, X, Trash2, MoreVertical, AlertTriangle, ChevronDown, ChevronUp, Layers, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFirebaseConfig } from '@/contexts/FirebaseConfigContext';

interface ProfileSidebarProps {
    featureId: string;
    selectedProfileId: string | null;
    onSelectProfile: (profileId: string) => void;
    onCreateProfile: () => void;
    refreshTrigger?: number;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    isMobileDrawer?: boolean; // New prop to indicate if rendered in mobile drawer
    onJumpToPanel?: (panelId: string, panelName?: string) => void; // Callback to scroll to specific panel
    criticalAlerts?: any[]; // Critical alerts data
}

export function ProfileSidebar({
    featureId,
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    refreshTrigger = 0,
    isCollapsed = false,
    onToggleCollapse,
    isMobileDrawer = false,
    onJumpToPanel,
    criticalAlerts = []
}: ProfileSidebarProps) {
    const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<DashboardProfile | null>(null);
    const [panelTreeExpanded, setPanelTreeExpanded] = useState(true);
    const { user } = useAnalyticsAuth();
    const { deleteProfile } = useFirebaseConfig();
    const isAdmin = useMemo(() => user?.role === 0, [user?.role]);

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

    const handleDeleteClick = (e: React.MouseEvent, profile: DashboardProfile) => {
        e.stopPropagation();
        setProfileToDelete(profile);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!profileToDelete || !isAdmin) return;
        
        const success = await deleteProfile(profileToDelete.profileId);
        if (success) {
            // If we deleted the currently selected profile, select the first remaining one
            if (selectedProfileId === profileToDelete.profileId) {
                const remainingProfiles = profiles.filter(p => p.profileId !== profileToDelete.profileId);
                if (remainingProfiles.length > 0) {
                    onSelectProfile(remainingProfiles[0].profileId);
                }
            }
            
            // Refresh the profiles list
            const data = await mockService.getProfiles(featureId);
            setProfiles(data);
        }
        
        setDeleteDialogOpen(false);
        setProfileToDelete(null);
    };

    // Get total alerts for the selected profile (filtered by profile's alert config event selection)
    const selectedProfileAlertCount = useMemo(() => {
        if (!criticalAlerts || criticalAlerts.length === 0 || !selectedProfileId) {
            return 0;
        }
        
        // Find the selected profile
        const currentProfile = profiles.find(p => p.profileId === selectedProfileId);
        if (!currentProfile) return criticalAlerts.length;
        
        // Check if profile has Critical Alerts config with specific event filter
        const profileEventFilter = currentProfile.criticalAlerts?.filterByEvents?.map(id => parseInt(id)) || [];
        
        // If no specific events selected, show all alerts
        if (profileEventFilter.length === 0) {
            return criticalAlerts.length;
        }
        
        // Filter alerts by profile's selected events
        const filteredAlerts = criticalAlerts.filter((alert: any) => {
            const alertEventId = Number(alert.eventId || alert.event_id || alert.eventID);
            return profileEventFilter.includes(alertEventId);
        });
        
        return filteredAlerts.length;
    }, [criticalAlerts, selectedProfileId, profiles]);

    // Helper to get profile stats - memoized
    const getProfileStats = useCallback((profile: DashboardProfile) => {
        const panels = profile.panels || [];
        const totalEvents = panels.reduce((sum, p) => sum + (p.events?.length || 0), 0);
        return { panelCount: panels.length, totalEvents };
    }, []);

    // Helper to get alert count for a panel's events - memoized to prevent re-renders
    const getPanelAlertCount = useCallback((panel: any) => {
        if (!panel.events || !criticalAlerts || criticalAlerts.length === 0) {
            return 0;
        }
        
        // Convert both to numbers for comparison since alerts have numeric eventId
        const panelEventIds = panel.events.map((e: any) => Number(e.eventId));
        const alertCount = criticalAlerts.filter((alert: any) => {
            const alertEventId = Number(alert.eventId || alert.event_id || alert.eventID);
            return panelEventIds.includes(alertEventId);
        }).length;
        
        return alertCount;
    }, [criticalAlerts]);

    // Helper to get chart icon based on panel type
    const getChartIcon = (panel: any) => {
        // Check if panel has visualizations configured
        if (panel.visualizations?.lineGraph?.enabled) {
            return <TrendingUp className="w-3.5 h-3.5" />;
        }
        if (panel.visualizations?.pieCharts?.length > 0) {
            return <BarChart3 className="w-3.5 h-3.5" />;
        }
        return <Layers className="w-3.5 h-3.5" />;
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
                        <button
                            key={profile.profileId}
                            onClick={() => handleSelectProfile(profile.profileId)}
                            className={cn(
                                "w-full h-10 rounded-lg flex items-center justify-center transition-colors duration-200",
                                isSelected
                                    ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-2 border-purple-400 dark:border-purple-500/50"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent"
                            )}
                            title={profile.profileName}
                        >
                            <span className="text-sm font-bold">{index + 1}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Expanded view - premium design
    const ExpandedContent = () => (
        <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/50 via-white to-indigo-50/30 dark:from-purple-900/20 dark:via-slate-900 dark:to-indigo-900/10">
            {/* Header - Premium gradient */}
            <div className="p-3 flex items-center justify-between border-b border-purple-200/40 dark:border-purple-500/20 bg-gradient-to-r from-purple-100/80 to-indigo-100/60 dark:from-purple-900/40 dark:to-indigo-900/30">
                <div>
                    <h2 className="font-bold text-xs bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">Profiles</h2>
                    <p className="text-[10px] text-purple-500 dark:text-purple-400">{profiles.length} dashboards</p>
                </div>
                <div className="flex items-center gap-1">
                    {isAdmin && (
                        <Button
                            onClick={onCreateProfile}
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-purple-600 hover:bg-purple-700"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            New
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCollapse}
                        className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft className="h-3 w-3" />
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

            {/* Profile List - Minimal & Compact */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1.5">
                    {profiles.map((profile) => {
                        const isSelected = selectedProfileId === profile.profileId;
                        const stats = getProfileStats(profile);

                        return (
                            <div key={profile.profileId} className="relative group">
                                {/* Admin Delete Button - Shows on hover only */}
                                {isAdmin && (
                                    <button
                                        className="absolute top-2 right-2 z-20 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-500/20"
                                        onClick={(e) => handleDeleteClick(e, profile)}
                                        title="Delete Profile"
                                    >
                                        <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => handleSelectProfile(profile.profileId)}
                                    className={cn(
                                        "w-full text-left p-2.5 rounded-lg relative",
                                        isSelected
                                            ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/15 border-[3px] border-purple-500 dark:border-purple-400 shadow-lg shadow-purple-500/20"
                                            : "bg-white/80 dark:bg-slate-800/70 border-[2px] border-purple-300/60 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className={cn(
                                                "font-medium text-sm truncate",
                                                isSelected ? "text-purple-900 dark:text-purple-100" : "text-gray-900 dark:text-gray-100"
                                            )}>
                                                {profile.profileName}
                                            </span>
                                            {/* API Badge */}
                                            {profile.panels?.[0]?.filterConfig?.isApiEvent === true && (
                                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm flex-shrink-0">
                                                    API
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <span>{stats.panelCount} panels</span>
                                        <span className="text-gray-400 dark:text-gray-600">|</span>
                                        <span>{stats.totalEvents} events</span>
                                    </div>
                                </button>

                                {/* Panel Navigation Tree - Only show for selected profile */}
                                {isSelected && profile.panels && profile.panels.length > 0 && onJumpToPanel && panelTreeExpanded && (
                                    <div className="mt-1.5 ml-1 space-y-1">
                                        <div className="flex items-center justify-between px-1.5 py-1">
                                            <span className="text-[9px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5">
                                                <Layers className="w-2.5 h-2.5" />
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPanelTreeExpanded(false);
                                                }}
                                            >
                                                <ChevronUp className="h-2.5 w-2.5" />
                                            </Button>
                                        </div>
                                        {profile.panels.map((panel, index) => {
                                            // Show total profile alerts on first panel only
                                            const showAlerts = index === 0 && isSelected;
                                            const alertCount = showAlerts ? selectedProfileAlertCount : 0;
                                            return (
                                            <button
                                                key={panel.panelId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onJumpToPanel(panel.panelId, panel.panelName || `${index + 1}`);
                                                }}
                                                className="w-full text-left px-1.5 py-1.5 rounded-md bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 border border-purple-200/30 dark:border-purple-500/20 transition-colors group/panel"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="flex items-center justify-center w-4 h-4 rounded bg-purple-200 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 text-[9px] font-bold flex-shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[10px] font-medium text-purple-900 dark:text-purple-100 truncate group-hover/panel:text-purple-700 dark:group-hover/panel:text-purple-200 block">
                                                            {panel.panelName || `${index + 1}`}
                                                        </span>
                                                        <span className="block text-[9px] text-muted-foreground">
                                                            {panel.events?.length || 0} events
                                                        </span>
                                                    </div>
                                                    {alertCount > 0 && (
                                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold flex-shrink-0 shadow-md">
                                                            <AlertTriangle className="w-2.5 h-2.5" />
                                                            {alertCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        )})}
                                    </div>
                                )}

                                {/* Expand Panel Tree Button */}
                                {isSelected && profile.panels && profile.panels.length > 0 && onJumpToPanel && !panelTreeExpanded && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-2 h-7 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPanelTreeExpanded(true);
                                        }}
                                    >
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Show {profile.panels.length} Panels
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>

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

    // If rendered in mobile drawer from parent, just show content directly
    if (isMobileDrawer) {
        return (
            <div className="flex flex-col h-full bg-background">
                <ExpandedContent />
            </div>
        );
    }

    return (
        <>
            {/* Mobile toggle button - only show if NOT in mobile drawer */}
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

            {/* Desktop Sidebar (width handled by parent) */}
            <div className="hidden lg:flex flex-col bg-background">
                {isCollapsed ? <CollapsedContent /> : <ExpandedContent />}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete Profile
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{profileToDelete?.profileName}"? 
                            <br />
                            <strong>This action cannot be undone.</strong> All dashboard panels and configurations will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete Profile
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
