import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { InfoTooltip } from './components/InfoTooltip';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Menu, X, Trash2, MoreVertical, AlertTriangle, ChevronDown, ChevronUp, Layers, BarChart3, TrendingUp, Sparkles, Search, LayoutDashboard, Shield, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    activePanelId?: string | null; // Prop from parent
}



export const ProfileSidebar = memo(function ProfileSidebar({
    featureId,
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    refreshTrigger = 0,
    isCollapsed = false,
    onToggleCollapse,
    isMobileDrawer = false,
    onJumpToPanel,
    criticalAlerts = [],
    activePanelId = null
}: ProfileSidebarProps) {
    const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<DashboardProfile | null>(null);
    const [panelTreeExpanded, setPanelTreeExpanded] = useState(true);
    const { user } = useAnalyticsAuth();
    const { deleteProfile } = useFirebaseConfig();
    const isAdmin = useMemo(() => user?.role === 0, [user?.role]);
    const [showSmartGuide, setShowSmartGuide] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // activePanelId is now a prop

    // Smart Guide Persistence: Only show once every 24 hours
    useEffect(() => {
        const lastShown = localStorage.getItem('lastSmartGuideShown');
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (!lastShown || now - parseInt(lastShown) > twentyFourHours) {
            setShowSmartGuide(true);
            localStorage.setItem('lastSmartGuideShown', now.toString());
        }
    }, []);

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
        // If clicking the same profile again, deselect it (collapse panels)
        if (selectedProfileId === profileId) {
            onSelectProfile(''); // Empty string to deselect
        } else {
            onSelectProfile(profileId);
        }
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
        const hasApi = panels.some(p => p.filterConfig?.isApiEvent === true || (p as any).isApiEvent === true);
        return { panelCount: panels.length, totalEvents, hasApi };
    }, []);

    const filteredProfiles = useMemo(() => {
        if (!searchQuery.trim()) return profiles;
        const query = searchQuery.toLowerCase();
        return profiles.filter(p =>
            p.profileName.toLowerCase().includes(query) ||
            p.panels?.some(panel => panel.panelName?.toLowerCase().includes(query))
        );
    }, [profiles, searchQuery]);

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
        if (panel.type === 'alerts') return <Shield className="w-3 h-3" />;
        const graphType = panel.filterConfig?.graphType || panel.graphType;
        const isApi = panel.filterConfig?.isApiEvent || panel.isApiEvent;

        if (isApi) return <Activity className="w-3 h-3" />;
        if (graphType === 'line') return <TrendingUp className="w-3 h-3" />;
        if (graphType === 'bar' || graphType === 'percentage') return <BarChart3 className="w-3 h-3" />;
        return <Layers className="w-3 h-3" />;
    };

    // Components removed from inside to prevent unmounting loops

    // Collapsed Content JSX
    const collapsedContentJSX = (
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

    // Expanded Content JSX moved to separate variable for cleaner render
    const expandedContentJSX = (
        <div className="flex flex-col h-full bg-gradient-to-b from-purple-50/50 via-white to-indigo-50/30 dark:from-purple-900/20 dark:via-slate-900 dark:to-indigo-900/10">
            {/* Header - Premium gradient */}
            <div className="p-3 flex items-center justify-between border-b border-purple-200/40 dark:border-purple-500/20 bg-gradient-to-r from-purple-100/80 to-indigo-100/60 dark:from-purple-900/40 dark:to-indigo-900/30">
                <div className="flex items-center gap-2">
                    <div>
                        <h2 className="font-bold text-xs bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1">
                            Profiles
                        </h2>
                        <p className="text-[10px] text-purple-500 dark:text-purple-400">{profiles.length} dashboards</p>
                    </div>
                    {showSmartGuide && (
                        <div className="ml-auto flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 shadow-sm">
                            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-tighter">Smart Guide</span>
                            <InfoTooltip
                                content="✨ PRO TIP: Use the profile tree below to instantly jump to specific panels. Profiles with the 'API' badge are optimized for background services."
                            />
                        </div>
                    )}
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

            {/* Search Bar - Premium Glassmorphism */}
            <div className="px-3 py-2 border-b border-purple-200/40 dark:border-purple-500/20">
                <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400 group-focus-within:text-purple-600 transition-colors" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search profiles or panels..."
                        className="h-8 pl-8 text-xs bg-white/50 dark:bg-slate-950/50 border-purple-100 dark:border-purple-500/20 focus:ring-purple-500/30 rounded-full"
                    />
                </div>
            </div>

            {/* Profile List - Tree Hierarchy */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-900/40">
                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {filteredProfiles.map((profile) => {
                            const isSelected = selectedProfileId === profile.profileId;
                            const stats = getProfileStats(profile);

                            return (
                                <motion.div
                                    key={profile.profileId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative mb-1"
                                >
                                    {/* Profile Node */}
                                    <div className="relative group flex items-center">
                                        <button
                                            onClick={() => handleSelectProfile(profile.profileId)}
                                            className={cn(
                                                "flex-1 text-left p-2 rounded-lg transition-all duration-200 flex items-center gap-2 group/btn",
                                                isSelected
                                                    ? "bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-900/90 dark:to-purple-900/90 shadow-md border border-indigo-300 dark:border-indigo-500/50"
                                                    : "hover:bg-purple-50/80 dark:hover:bg-purple-900/10 border border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-sm border",
                                                isSelected
                                                    ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white border-indigo-400"
                                                    : "bg-white dark:bg-slate-800 text-indigo-400 border-slate-200 dark:border-slate-700 group-hover/btn:text-indigo-600 group-hover/btn:border-indigo-200"
                                            )}>
                                                <Layers className="w-3.5 h-3.5" />
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                                                <span className={cn(
                                                    "text-[12.5px] font-bold truncate w-full transition-colors",
                                                    isSelected ? "text-indigo-900 dark:text-indigo-50" : "text-slate-600 dark:text-slate-400 group-hover/btn:text-indigo-600"
                                                )}>
                                                    {profile.profileName}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9.5px] mt-0.5">
                                                    <span className="text-muted-foreground font-medium">{stats.panelCount} items</span>
                                                    {stats.hasApi && (
                                                        <span className="flex items-center gap-0.5 px-1 rounded-sm bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-500/20">
                                                            <Activity className="w-2 h-2" /> API
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-opacity cursor-pointer"
                                                    onClick={(e) => handleDeleteClick(e, profile)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleDeleteClick(e as any, profile);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-500/70" />
                                                </div>
                                            )}
                                        </button>

                                        {/* Dynamic Indicator for Selected */}
                                        {/* Removed active-indicator bar */}
                                    </div>

                                    {/* Nested Tree - Panels */}
                                    <AnimatePresence>
                                        {isSelected && profile.panels && profile.panels.length > 0 && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden ml-5 mt-1 border-l-2 border-dashed border-purple-100 dark:border-purple-800/40 pl-3 space-y-1 relative"
                                            >
                                                {profile.panels.map((panel, pIndex) => {
                                                    // Get alert count for THIS specific panel based on its alertsConfig
                                                    const panelAlerts = (() => {
                                                        if (!criticalAlerts || criticalAlerts.length === 0) return 0;
                                                        
                                                        // Check if this panel has alert config with specific event filter
                                                        const panelAlertConfig = (panel as any).alertsConfig;
                                                        const panelEventFilter = panelAlertConfig?.filterByEvents?.map((id: string) => parseInt(id)) || [];
                                                        
                                                        // If no specific events selected in panel config, check panel's regular events
                                                        const relevantEventIds = panelEventFilter.length > 0 
                                                            ? panelEventFilter 
                                                            : (panel.events?.map((e: any) => Number(e.eventId)) || []);
                                                        
                                                        if (relevantEventIds.length === 0) return 0;
                                                        
                                                        // Count alerts matching this panel's events
                                                        return criticalAlerts.filter((alert: any) => {
                                                            const alertEventId = Number(alert.eventId || alert.event_id || alert.eventID);
                                                            return relevantEventIds.includes(alertEventId);
                                                        }).length;
                                                    })();
                                                    
                                                    const isPanelActive = activePanelId && (panel.panelId === activePanelId || `panel-${panel.panelId}` === activePanelId);

                                                    return (
                                                        <motion.button
                                                            key={panel.panelId}
                                                            whileHover={{ x: 2 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Jump to panel and mark as active
                                                                onJumpToPanel?.(panel.panelId, panel.panelName || `Panel ${pIndex + 1}`);
                                                            }}
                                                            className={cn(
                                                                "w-full relative py-1.5 px-2 rounded-md flex items-center gap-2 group/panel transition-all border",
                                                                isPanelActive 
                                                                    ? "bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/60 dark:to-purple-900/60 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-500/30 font-semibold shadow-sm" 
                                                                    : "bg-transparent hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-purple-100 dark:hover:border-purple-500/10 hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                                            )}
                                                        >
                                                            {/* Horizontal connector line */}
                                                            <div className={cn(
                                                                "absolute -left-[14px] top-1/2 w-3 h-[1px]",
                                                                isPanelActive ? "bg-indigo-400 dark:bg-indigo-500" : "bg-purple-200 dark:bg-purple-800/60"
                                                            )} />

                                                            <div className={cn(
                                                                "w-4 h-4 rounded-sm flex items-center justify-center",
                                                                isPanelActive
                                                                    ? "bg-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300"
                                                                    : "bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover/panel:text-purple-600 dark:group-hover/panel:text-purple-400"
                                                            )}>
                                                                {getChartIcon(panel)}
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex items-center justify-start text-left">
                                                                <span className={cn(
                                                                    "text-[11px] truncate block w-full text-left transition-colors",
                                                                    isPanelActive
                                                                        ? "text-indigo-900 dark:text-indigo-100"
                                                                        : "font-medium text-slate-500 dark:text-slate-400 group-hover/panel:text-purple-900 dark:group-hover/panel:text-purple-100"
                                                                )}>
                                                                    {panel.panelName || `Panel ${pIndex + 1}`}
                                                                </span>
                                                            </div>

                                                            {panelAlerts > 0 && (
                                                                <TooltipProvider delayDuration={100}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="flex items-center gap-1 font-black text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.4)] animate-pulse-subtle cursor-help">
                                                                                <AlertTriangle className="w-3 h-3 fill-white/20" /> {panelAlerts}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right" className="bg-red-950 text-white border-red-800 p-3 max-w-xs shadow-2xl">
                                                                            <div className="space-y-1">
                                                                                <p className="font-bold flex items-center gap-2 text-sm">
                                                                                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                                                                                    Critical Alerts Detected
                                                                                </p>
                                                                                <p className="text-red-200 text-[11px] leading-relaxed">
                                                                                    There are {panelAlerts} high-severity events in this panel. Please check the dashboard for details.
                                                                                </p>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {filteredProfiles.length === 0 && (
                    <div className="text-center py-12 px-4">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {searchQuery ? `No results for "${searchQuery}"` : "Create your first dashboard profile to get started."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // If rendered in mobile drawer from parent, just show content directly
    if (isMobileDrawer) {
        return (
            <div className="flex flex-col h-full bg-background">
                {expandedContentJSX}
            </div>
        );
    }

    return (
        <>
            {/* Mobile toggle button - only show if NOT in mobile drawer */}
            <button
                className="fixed bottom-4 left-4 z-50 lg:hidden h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center"
                onClick={() => setIsMobileOpen(true)}
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            {isMobileOpen && (
                <div
                    className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border/50 flex flex-col z-50 lg:hidden shadow-xl"
                >
                    {expandedContentJSX}
                </div>
            )}

            {/* Desktop Sidebar (width handled by parent) */}
            <div className="hidden lg:flex flex-col bg-background h-full">
                {isCollapsed ? collapsedContentJSX : expandedContentJSX}
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
});
