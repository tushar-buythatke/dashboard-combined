import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { InfoTooltip } from './components/InfoTooltip';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { firebaseConfigService } from '@/services/firebaseConfigService';
import { apiService } from '@/services/apiService';
import { dashboardDbService } from '@/services/dashboardDbService';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Menu, X, Trash2, MoreVertical, AlertTriangle, ChevronDown, ChevronUp, Layers, BarChart3, TrendingUp, Sparkles, Search, LayoutDashboard, Shield, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
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
    const [isLoading, setIsLoading] = useState(true); // Add loading state
    const [alertCounts, setAlertCounts] = useState<Record<string, number>>({}); // Store alert counts by eventId
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<DashboardProfile | null>(null);
    const [panelTreeExpanded, setPanelTreeExpanded] = useState(true);
    const { user } = useAnalyticsAuth();
    const { t } = useAccentTheme();
    const { selectedOrganization } = useOrganization();
    const isAdmin = useMemo(() => user?.role === 1, [user?.role]);

    // Helper to check write access for this specific feature
    const hasWriteAccess = useMemo(() => {
        if (isAdmin) return true;
        if (!user?.permissions?.features) return false;
        return user.permissions.features[featureId] === 'write';
    }, [isAdmin, user?.permissions, featureId]);

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
            setIsLoading(true);
            try {
                // Use firebaseConfigService which has DB-first logic
                const result = await firebaseConfigService.getProfiles(featureId, 'default');
                if (result.success) {
                    // Convert DashboardProfileConfig to DashboardProfile format
                    const data = result.items.map(p => ({
                        ...p,
                        lastModified: p.updatedAt || p.createdAt,
                    })) as DashboardProfile[];
                    setProfiles(data);
                    setIsLoading(false); // Stop loading after profiles are set
                    if (!selectedProfileId && data.length > 0) {
                        // Default to first non-APIs profile, or first profile if only APIs exists
                        const defaultProfile = data.find(p => p.profileName !== 'APIs') || data[0];
                        onSelectProfile(defaultProfile.profileId);
                    }

                    // Auto-sync API panels in background (truly non-blocking with setTimeout)
                    // This runs AFTER the UI has updated, preventing any perceived slowness
                    if (featureId && result.success) {
                        setTimeout(() => {
                            (async () => {
                                try {
                                    const apiServiceMod = await import('@/services/apiService');
                                    const dashboardDbServiceMod = await import('@/services/dashboardDbService');

                                    // Get all events for this feature
                                    const events = await apiServiceMod.apiService.getEventsList(featureId, selectedOrganization?.id ?? 0);
                                    const apiEvents = events.filter(e => e.isApiEvent === true);

                                    // Auto-sync API panels (creates/updates as needed)
                                    // Pass existing profiles to avoid duplicates
                                    if (apiEvents.length > 0) {
                                        const existingProfiles = result.items;
                                        const hasApiProfile = existingProfiles.some(p => p.profileName === 'APIs');

                                        // Only sync if there are new API events or no API profile exists
                                        const shouldSync = !hasApiProfile || apiEvents.length > 0;

                                        if (shouldSync) {
                                            await dashboardDbServiceMod.dashboardDbService.autoSyncApiPanels(
                                                parseInt(featureId),
                                                apiEvents
                                            );
                                            // Refresh profiles after sync to show new panels
                                            const refreshResult = await firebaseConfigService.getProfiles(featureId, 'default');
                                            if (refreshResult.success) {
                                                const refreshedData = refreshResult.items.map(p => ({
                                                    ...p,
                                                    lastModified: p.updatedAt || p.createdAt,
                                                })) as DashboardProfile[];
                                                setProfiles(refreshedData);
                                            }
                                        }
                                    }
                                } catch (error) {
                                    console.error('Auto-sync API panels failed:', error);
                                }
                            })();
                        }, 100); // Delay auto-sync to let UI render first
                    }
                }
            } catch (error) {
                console.error('Failed to load profiles:', error);
                setIsLoading(false);
            }
        };
        loadProfiles();
    }, [featureId, refreshTrigger]);

    // Fetch alert counts whenever profiles are loaded or refreshed
    useEffect(() => {
        const fetchAlerts = async () => {
            // Separate event IDs by API/Regular based on panel's isApiEvent flag
            const regularEventIds = new Set<number>();
            const apiEventIds = new Set<number>();

            profiles.forEach(p => {
                p.panels.forEach(panel => {
                    const isApiPanel = panel.filterConfig?.isApiEvent === true;
                    const eventIds = panel.events?.map(e => Number(e.eventId)) ||
                        panel.filterConfig?.events || [];

                    eventIds.forEach((id: number) => {
                        if (isApiPanel) {
                            apiEventIds.add(id);
                        } else {
                            regularEventIds.add(id);
                        }
                    });
                });
            });

            if (regularEventIds.size === 0 && apiEventIds.size === 0) return;

            // Last 7 days for sidebar badges
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            try {
                // Fetch only for relevant event types
                const promises: Promise<Record<string, number>>[] = [];

                if (regularEventIds.size > 0) {
                    promises.push(apiService.getAlertList(Array.from(regularEventIds), startDate, endDate, true, 0));
                } else {
                    promises.push(Promise.resolve({}));
                }

                if (apiEventIds.size > 0) {
                    promises.push(apiService.getAlertList(Array.from(apiEventIds), startDate, endDate, true, 1));
                } else {
                    promises.push(Promise.resolve({}));
                }

                const [regularAlerts, apiAlerts] = await Promise.all(promises);

                // Merge counts
                const mergedCounts: Record<string, number> = { ...regularAlerts };
                Object.keys(apiAlerts).forEach(key => {
                    mergedCounts[key] = (mergedCounts[key] || 0) + (apiAlerts[key] || 0);
                });

                setAlertCounts(mergedCounts);
            } catch (err) {
                console.error("Failed to load sidebar alerts:", err);
            }
        };

        if (profiles.length > 0) {
            fetchAlerts();
        }
    }, [profiles, refreshTrigger]);

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
        if (!profileToDelete || !hasWriteAccess) return;

        const profileId = profileToDelete.profileId;
        const dbProfileId = (profileToDelete as any)._dbProfileId;

        // Close dialog first
        setDeleteDialogOpen(false);
        setProfileToDelete(null);

        // Call database API to delete the profile
        if (dbProfileId) {
            try {
                const success = await dashboardDbService.deleteProfile(dbProfileId, parseInt(featureId));

                if (!success) {
                    console.error('Failed to delete profile from database');
                    // Don't update UI if DB delete failed
                    return;
                }

                console.log('✅ Profile deleted from database');
            } catch (error) {
                console.error('Error deleting profile:', error);
                return;
            }
        }

        // OPTIMISTIC UI UPDATE: Remove profile from list after successful DB deletion
        setProfiles(prev => prev.filter(p => p.profileId !== profileId));

        // If we deleted the currently selected profile, select the first remaining one
        if (selectedProfileId === profileId) {
            const remainingProfiles = profiles.filter(p => p.profileId !== profileId);
            if (remainingProfiles.length > 0) {
                onSelectProfile(remainingProfiles[0].profileId);
            }
        }

        // Also call Firebase for backup sync (optional)
        const result = await firebaseConfigService.deleteProfile(profileId, featureId);
        if (!result.success) {
            console.warn('Firebase delete failed, but DB delete succeeded');
        }
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
                className={cn("h-8 w-8 mx-auto mb-4", t.cardHoverBorder, t.cardHoverBorderDark)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>

            {/* New Profile Button */}
            {hasWriteAccess && (
                <Button
                    onClick={onCreateProfile}
                    size="icon"
                    className={cn("h-8 w-8 mx-auto mb-4 bg-gradient-to-br text-white", t.buttonGradient, t.buttonHover)}
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
                                    ? cn(t.sidebarActive, t.sidebarActiveDark, t.sidebarActiveText, t.sidebarActiveTextDark, "border-2", t.borderAccent, t.borderAccentDark)
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
        <div
            className={cn("flex flex-col h-full transition-colors duration-500 sidebar-glass")}
            style={{
                background: 'linear-gradient(to bottom, hsl(var(--accent-primary) / 0.03) 0%, transparent 60%)',
            }}
        >
            {/* Unified Header + Search Section - Seamless */}
            <div className={cn(
                "border-b border-white/20 dark:border-white/10"
            )}>
                {/* Top Row: Title + Actions */}
                <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Section gradient icon */}
                        <div
                            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, hsl(var(--accent-primary) / 0.9), hsl(var(--accent-primary) / 0.5))' }}
                        >
                            <LayoutDashboard className="w-3 h-3 text-white" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm stat-gradient-text flex items-center gap-1">
                                Profiles
                            </h2>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{profiles.length} dashboards</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {hasWriteAccess && (
                            <Button
                                onClick={onCreateProfile}
                                size="sm"
                                className={cn("h-6 px-2.5 text-[10px] text-white rounded-full shadow-sm bg-gradient-to-r", t.buttonGradient, t.buttonHover)}
                                style={{ background: 'var(--accent-gradient)' }}
                            >
                                <span className="mr-0.5 text-[9px] leading-none" aria-hidden="true">✦</span>
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

                {/* Search - Glassmorphic */}
                <div className="px-3 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search profiles or panels..."
                            className="h-9 pl-9 text-sm rounded-full backdrop-blur-md bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/10 transition-all duration-150 ease-out focus-visible:ring-0 focus-visible:outline-none"
                            style={{
                                ['--tw-ring-shadow' as string]: 'none',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--accent-primary) / 0.15)';
                                e.currentTarget.style.borderColor = 'hsl(var(--accent-primary) / 0.4)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.boxShadow = '';
                                e.currentTarget.style.borderColor = '';
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Profile List - Tree Hierarchy */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                    {/* Skeleton Loading UI */}
                    {isLoading ? (
                        <div className="space-y-2 px-1">
                            {[...Array(4)].map((_, idx) => (
                                <div key={idx} className="animate-pulse flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
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
                                        {/* Continuous vertical tree line — solid 1px, active brighter */}
                                        {isSelected && (
                                            <div
                                                className="absolute left-5 top-0 bottom-0 w-[1px] z-0 pointer-events-none"
                                                style={{
                                                    background: 'hsl(var(--accent-primary) / 0.4)',
                                                }}
                                            />
                                        )}

                                        {/* Profile Node */}
                                        <div className="relative group flex items-center z-10">
                                            {/* Horizontal branch connector from vertical line to profile */}
                                            {isSelected && (
                                                <div
                                                    className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-[2px] z-0 pointer-events-none"
                                                    style={{ background: 'var(--theme-primary)' }}
                                                />
                                            )}
                                            <button
                                                onClick={() => handleSelectProfile(profile.profileId)}
                                                className={cn(
                                                    "flex-1 text-left p-2 rounded-xl transition-all duration-[150ms] ease-out flex items-center gap-2 group/btn",
                                                    isSelected
                                                        ? "shadow-md font-medium"
                                                        : "border border-transparent hover:translate-x-[2px]"
                                                )}
                                                style={isSelected ? {
                                                    background: 'linear-gradient(to right, hsl(var(--accent-primary) / 0.15), hsl(var(--accent-primary) / 0.06))',
                                                    borderLeft: '1.5px solid hsl(var(--accent-primary))',
                                                    borderTop: '1px solid hsl(var(--accent-primary) / 0.12)',
                                                    borderRight: '1px solid hsl(var(--accent-primary) / 0.08)',
                                                    borderBottom: '1px solid hsl(var(--accent-primary) / 0.08)',
                                                } : undefined}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'hsl(var(--accent-primary) / 0.06)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = '';
                                                    }
                                                }}
                                            >
                                                {/* 6px accent dot — active indicator */}
                                                {isSelected && (
                                                    <span
                                                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                                                        style={{ background: 'hsl(var(--accent-primary))' }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm border",
                                                    isSelected
                                                        ? "bg-gradient-to-br text-white"
                                                        : cn("bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700", t.textPrimary, t.textPrimaryDark)
                                                )}
                                                style={isSelected ? { background: 'var(--theme-gradient)' } : undefined}
                                                >
                                                    <Layers className="w-3.5 h-3.5" />
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                                                    <span className={cn(
                                                        "text-[12.5px] font-bold truncate w-full transition-colors",
                                                        isSelected ? "text-gray-900 dark:text-gray-50" : cn("text-slate-600 dark:text-slate-400", t.linkHover, t.linkHoverDark)
                                                    )} title={profile.profileName.includes(' - /') ? profile.profileName.split(' - ')[0] : profile.profileName}>
                                                        {(() => {
                                                            const parts = profile.profileName.split(' - ');
                                                            if (parts.length === 2 && parts[1].trim().startsWith('/')) {
                                                                return parts[1].trim();
                                                            }
                                                            return profile.profileName;
                                                        })()}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[9.5px] mt-0.5">
                                                        <span className="text-muted-foreground font-medium">{stats.panelCount} items</span>
                                                        {stats.hasApi && (
                                                            <span className="flex items-center gap-0.5 px-1 rounded-sm bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-500/20">
                                                                <Activity className="w-2 h-2" /> API
                                                            </span>
                                                        )}
                                                        {/* Profile-level alert badge - accumulated from all panels */}
                                                        {(() => {
                                                            // Calculate total alerts for this profile
                                                            let totalAlerts = 0;
                                                            profile.panels.forEach(panel => {
                                                                const eventIds = panel.events?.map(e => Number(e.eventId)) ||
                                                                    panel.filterConfig?.events || [];
                                                                eventIds.forEach((evtId: number) => {
                                                                    totalAlerts += (alertCounts[String(evtId)] || 0);
                                                                });
                                                            });
                                                            if (totalAlerts > 0) {
                                                                return (
                                                                    <span
                                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-bold border border-red-200 dark:border-red-500/30 cursor-help"
                                                                        title={`${totalAlerts} alerts across ${profile.panels.length} panels (Last 7 days)`}
                                                                    >
                                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                                        {totalAlerts}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </div>

                                                {hasWriteAccess && (
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
                                                    className="overflow-hidden ml-5 mt-1 pl-3 space-y-1 relative"
                                                >
                                                    {profile.panels.map((panel, pIndex) => {
                                                        // Get alert count for THIS specific panel based on its alertsConfig
                                                        const panelAlerts = (() => {
                                                            // Check if this panel has alert config with specific event filter
                                                            const panelAlertConfig = (panel as any).alertsConfig;
                                                            const panelEventFilter = panelAlertConfig?.filterByEvents?.map((id: string) => parseInt(id)) || [];

                                                            // If no specific events selected in panel config, check panel's regular events
                                                            const relevantEventIds = panelEventFilter.length > 0
                                                                ? panelEventFilter
                                                                : (panel.events?.map((e: any) => Number(e.eventId)) || []);

                                                            if (relevantEventIds.length === 0) return 0;

                                                            // Count alerts matching this panel's events from alertCounts state
                                                            return relevantEventIds.reduce((sum: number, evtId: number) => {
                                                                return sum + (alertCounts[String(evtId)] || 0);
                                                            }, 0);
                                                        })();

                                                        const isPanelActive = activePanelId && (panel.panelId === activePanelId || `panel-${panel.panelId}` === activePanelId);

                                                        const panelName = panel.panelName || `Panel ${pIndex + 1}`;
                                                        const panelParts = panelName.split(' - ');
                                                        const hasDomainAndEndpoint = panelParts.length === 2 && panelParts[1].trim().startsWith('/');
                                                        const domainName = hasDomainAndEndpoint ? panelParts[0].trim() : '';
                                                        const displayName = hasDomainAndEndpoint ? panelParts[1].trim() : panelName;

                                                        return (
                                                            <TooltipProvider key={panel.panelId} delayDuration={200}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <motion.button
                                                                            whileHover={{ x: 2 }}
                                                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onJumpToPanel?.(panel.panelId, panel.panelName || `Panel ${pIndex + 1}`);
                                                                            }}
                                                                            className={cn(
                                                                                "w-full relative py-1.5 px-2 rounded-lg flex items-center gap-2 group/panel transition-all duration-[150ms] ease-out border",
                                                                                isPanelActive
                                                                                    ? "shadow-sm font-medium backdrop-blur-sm"
                                                                                    : "bg-transparent border-transparent text-slate-500 dark:text-slate-400"
                                                                            )}
                                                                            style={isPanelActive ? {
                                                                                background: 'linear-gradient(to right, hsl(var(--accent-primary) / 0.12), hsl(var(--accent-primary) / 0.04))',
                                                                                borderLeft: '1.5px solid hsl(var(--accent-primary))',
                                                                                borderTop: '1px solid hsl(var(--accent-primary) / 0.10)',
                                                                                borderRight: '1px solid hsl(var(--accent-primary) / 0.06)',
                                                                                borderBottom: '1px solid hsl(var(--accent-primary) / 0.06)',
                                                                            } : undefined}
                                                                            onMouseEnter={(e) => {
                                                                                if (!isPanelActive) {
                                                                                    e.currentTarget.style.background = 'hsl(var(--accent-primary) / 0.06)';
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!isPanelActive) {
                                                                                    e.currentTarget.style.background = '';
                                                                                }
                                                                            }}
                                                                        >
                                                                            {/* Horizontal connector — solid 1px, accent color */}
                                                                            <div
                                                                                className="absolute left-[-14px] top-1/2 w-3 h-[1px]"
                                                                                style={{ background: isPanelActive ? 'hsl(var(--accent-primary) / 0.7)' : 'hsl(var(--accent-primary) / 0.2)' }}
                                                                            />

                                                                            <div className={cn(
                                                                                "w-4 h-4 rounded-full flex items-center justify-center",
                                                                                isPanelActive
                                                                                    ? "text-white"
                                                                                    : "bg-slate-50 dark:bg-slate-900 text-slate-400"
                                                                            )}
                                                                            style={isPanelActive ? { background: 'var(--theme-gradient)' } : undefined}
                                                                            >
                                                                                {getChartIcon(panel)}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0 flex items-center justify-start text-left">
                                                                                <span
                                                                                    className={cn(
                                                                                        "text-[11px] truncate block w-full text-left transition-colors",
                                                                                        isPanelActive
                                                                                            ? "font-medium"
                                                                                            : "font-medium text-slate-500 dark:text-slate-400"
                                                                                    )}
                                                                                    style={isPanelActive ? { color: 'hsl(var(--accent-primary))' } : undefined}
                                                                                >
                                                                                    {displayName}
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
                                                                    </TooltipTrigger>
                                                                    {domainName && (
                                                                        <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700 px-3 py-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <Activity className="w-3.5 h-3.5 text-blue-400" />
                                                                                <span className="font-semibold text-xs">{domainName}</span>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
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
            <div className={cn("flex flex-col h-full transition-colors duration-500", t.sidebarBg)}>
                {expandedContentJSX}
            </div>
        );
    }

    return (
        <>
            {/* Mobile toggle button - only show if NOT in mobile drawer */}
            <button
                className={cn("fixed bottom-4 left-4 z-50 lg:hidden h-12 w-12 rounded-full text-white shadow-lg flex items-center justify-center bg-gradient-to-br", t.buttonGradient)}
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
                    className={cn("fixed inset-y-0 left-0 w-72 flex flex-col z-50 lg:hidden shadow-xl transition-colors duration-500", t.sidebarBg, t.borderAccent)}
                >
                    {expandedContentJSX}
                </div>
            )}

            {/* Desktop Sidebar (width handled by parent) */}
            <div className={cn("hidden lg:flex flex-col h-full transition-colors duration-500", t.sidebarBg)}>
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
