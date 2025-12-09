import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardProfile } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Menu, X, Trash2, MoreVertical, AlertTriangle } from 'lucide-react';
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
}

export function ProfileSidebar({
    featureId,
    selectedProfileId,
    onSelectProfile,
    onCreateProfile,
    refreshTrigger = 0,
    isCollapsed = false,
    onToggleCollapse,
    isMobileDrawer = false
}: ProfileSidebarProps) {
    const [profiles, setProfiles] = useState<DashboardProfile[]>([]);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<DashboardProfile | null>(null);
    const { user } = useAnalyticsAuth();
    const { deleteProfile } = useFirebaseConfig();
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
            <div className="p-4 flex items-center justify-between border-b border-purple-200/40 dark:border-purple-500/20 bg-gradient-to-r from-purple-100/80 to-indigo-100/60 dark:from-purple-900/40 dark:to-indigo-900/30">
                <div>
                    <h2 className="font-bold text-sm bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">Profiles</h2>
                    <p className="text-xs text-purple-500 dark:text-purple-400">{profiles.length} dashboards</p>
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
                <div className="space-y-2">
                    {profiles.map((profile) => {
                        const isSelected = selectedProfileId === profile.profileId;
                        const stats = getProfileStats(profile);

                        return (
                            <div key={profile.profileId} className="relative group">
                                <motion.button
                                    onClick={() => handleSelectProfile(profile.profileId)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all duration-300",
                                        isSelected
                                            ? "bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500/20 dark:to-indigo-500/15 border-2 border-purple-400 dark:border-purple-500/50 shadow-lg shadow-purple-500/10"
                                            : "bg-white/60 dark:bg-slate-800/60 border border-purple-200/40 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-md hover:shadow-purple-500/5 hover:translate-x-1"
                                    )}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "font-medium text-sm truncate pr-8",
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
                                
                                {/* Admin Delete Button */}
                                {isAdmin && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 dark:hover:bg-red-500/20"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem
                                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/20"
                                                onClick={(e) => handleDeleteClick(e, profile)}
                                            >
                                                <Trash2 className="h-3 w-3 mr-2" />
                                                Delete Profile
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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

            {/* Desktop Sidebar */}
            <motion.div
                className="hidden lg:flex flex-col h-full bg-background"
                animate={{ width: isCollapsed ? 60 : '100%' }}
                transition={{ duration: 0.2 }}
            >
                {isCollapsed ? <CollapsedContent /> : <ExpandedContent />}
            </motion.div>

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
