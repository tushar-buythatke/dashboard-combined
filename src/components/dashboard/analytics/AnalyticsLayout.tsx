import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardProfile, Feature } from '@/types/analytics';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { FeatureSelector } from './FeatureSelector';
import { ProfileSidebar } from './ProfileSidebar';
import { AnalyticsLogin } from './AnalyticsLogin';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, Plus, Sparkles, Sun, Moon, Building2, ChevronDown, Check, Menu, X, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardViewer } from './DashboardViewer';
import { ProfileBuilder } from './admin/ProfileBuilder';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockService } from '@/services/mockData';
import { getFeatureName, getFeatureShortName } from '@/services/apiService';
import { useTheme } from '@/components/theme/theme-provider';
import { GradientMeshBackground } from '@/components/ui/animated-background';

export function AnalyticsLayout() {
    const { user, logout, isAuthenticated } = useAnalyticsAuth();
    const { organizations, selectedOrganization, setSelectedOrganization } = useOrganization();
    const { mode, toggleMode } = useTheme();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(() => searchParams.get('feature'));
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => searchParams.get('profile'));
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
    const [featureSelectorKey, setFeatureSelectorKey] = useState(0);
    const [criticalAlertsData, setCriticalAlertsData] = useState<any[]>([]);
    
    // Live clock with seconds
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    // Keep selected feature/profile in sync with URL so refreshes/bookmarks
    // land back on the same dashboard instead of the starting page
    useEffect(() => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev as any);
            if (selectedFeatureId) {
                next.set('feature', selectedFeatureId);
            } else {
                next.delete('feature');
            }
            if (selectedProfileId) {
                next.set('profile', selectedProfileId);
            } else {
                next.delete('profile');
            }
            return next;
        });
    }, [selectedFeatureId, selectedProfileId, setSearchParams]);
    
    // New Dashboard Config Modal
    const [showNewConfigModal, setShowNewConfigModal] = useState(false);
    const [newConfigName, setNewConfigName] = useState('');
    const [newConfigFeature, setNewConfigFeature] = useState('1');
    
    // Available features from API
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
    
    // Sidebar collapse state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // Mobile sidebar visibility
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    const isAdmin = user?.role === 0;
    
    // Panel navigation - scroll to specific panel by ID and auto-fetch data
    const handleJumpToPanel = (panelId: string, panelName?: string) => {
        // Use DashboardViewer's handleJumpToPanel if available (it handles both scroll and fetch)
        const dashboardJumpToPanel = (window as any).__dashboardViewerJumpToPanel;
        if (dashboardJumpToPanel && typeof dashboardJumpToPanel === 'function') {
            dashboardJumpToPanel(panelId);
        } else {
            // Fallback: just scroll if DashboardViewer not ready
            const element = document.getElementById(`panel-${panelId}`);
            if (element) {
                const rect = element.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetPosition = rect.top + scrollTop - 100;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
        
        // Close mobile sidebar after jumping
        setMobileSidebarOpen(false);
        
        // Show toast notification
        if (panelName) {
            toast({
                title: `📍 ${panelName}`,
                description: 'Navigated to panel',
                duration: 1500,
            });
        }
    };
    
    // Load features from API when organization changes
    useEffect(() => {
        const loadFeatures = async () => {
            try {
                const features = await mockService.getFeatures(selectedOrganization?.id ?? 0);
                setAvailableFeatures(features);
                // Set default feature to first one if available
                if (features.length > 0 && !selectedFeatureId) {
                    setNewConfigFeature(features[0].id);
                }
            } catch (error) {
                console.error('Failed to load features:', error);
            }
        };
        loadFeatures();
    }, [selectedOrganization?.id]);
    
    // When organization changes, restore selection from URL if present;
    // otherwise fall back to the normal "start" screen.
    useEffect(() => {
        if (selectedOrganization) {
            const featureFromUrl = searchParams.get('feature');
            const profileFromUrl = searchParams.get('profile');
            setSelectedFeatureId(featureFromUrl);
            setSelectedProfileId(profileFromUrl);
            setFeatureSelectorKey(prev => prev + 1);
        }
    }, [selectedOrganization?.id, searchParams]);
    
    // When a feature is selected, auto-set the new config feature to match
    useEffect(() => {
        if (selectedFeatureId) {
            setNewConfigFeature(selectedFeatureId);
        }
    }, [selectedFeatureId]);

    const handleProfileSaved = () => {
        setSidebarRefreshTrigger(prev => prev + 1);
        setIsCreatingProfile(false);
    };
    
    const handleCreateNewConfig = async () => {
        if (!newConfigName.trim()) return;
        
        const newProfile: DashboardProfile = {
            profileId: `profile_${Date.now()}`,
            profileName: newConfigName,
            featureId: newConfigFeature,
            createdBy: user?.id || 'admin',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: 1,
            isActive: true,
            panels: [],
            filters: {
                platform: { type: 'multi-select', options: [], defaultValue: ['0'] },
                pos: { type: 'multi-select', options: [], defaultValue: [] },
                source: { type: 'multi-select', options: [], defaultValue: ['1'] },
                event: { type: 'multi-select', options: [], defaultValue: [] }
            },
            defaultSettings: {
                timeRange: { preset: 'last_7_days', granularity: 'hourly' },
                autoRefresh: 60
            },
            criticalAlerts: { enabled: false, refreshInterval: 30, position: 'top', maxAlerts: 5, filterByPOS: [], filterByEvents: [], isApi: false }
        };
        
        await mockService.saveProfile(newProfile);
        setFeatureSelectorKey(prev => prev + 1);
        setSelectedFeatureId(newConfigFeature);
        setSelectedProfileId(newProfile.profileId);
        setIsCreatingProfile(true);
        setSidebarRefreshTrigger(prev => prev + 1);
        setShowNewConfigModal(false);
        setNewConfigName('');
        // Reset to selected feature or first available
        setNewConfigFeature(selectedFeatureId || availableFeatures[0]?.id || '1');
    };

    if (!isAuthenticated) {
        return <AnalyticsLogin />;
    }

    if (!selectedFeatureId) {
        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-purple-50/30 dark:to-purple-950/10 relative overflow-hidden"
            >
                {/* Background effects - pointer-events-none to not block clicks */}
                <div className="pointer-events-none">
                    <GradientMeshBackground />
                </div>
                
                <header className="border-b border-border/50 px-3 lg:px-4 py-4 lg:py-5 flex justify-between items-center bg-card/95 backdrop-blur-md shadow-sm relative z-10">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-2 lg:gap-3"
                    >
                        <motion.div 
                            className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-white dark:bg-slate-800 p-1 lg:p-1.5 shadow-lg border border-purple-100 dark:border-purple-500/20 overflow-hidden"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <img src="/assets/logo_512x512.png" alt="Buyhatke" className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="flex flex-col">
                            {/* Organization Selector Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1.5 font-bold text-sm lg:text-lg text-foreground leading-tight hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                                        <Building2 className="h-4 w-4 text-purple-500" />
                                        {selectedOrganization?.name || 'Select Organization'}
                                        <ChevronDown className="h-3 w-3 opacity-50" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    {organizations.map((org) => (
                                        <DropdownMenuItem
                                            key={org.id}
                                            onClick={() => setSelectedOrganization(org)}
                                            className="flex items-center justify-between cursor-pointer"
                                        >
                                            <span>{org.name}</span>
                                            {selectedOrganization?.id === org.id && (
                                                <Check className="h-4 w-4 text-purple-600" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <span className="text-[10px] lg:text-xs text-purple-600 dark:text-purple-400 font-medium hidden sm:block">
                                Analytics Dashboard
                            </span>
                        </div>
                    </motion.div>
                    <div className="flex items-center gap-1.5 lg:gap-3">
                        {/* Live Clock */}
                        <motion.div 
                            className="hidden md:flex flex-col items-end px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50/50 to-violet-50/50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-500/30"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="text-sm font-bold text-foreground font-mono tabular-nums">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </div>
                                <motion.div 
                                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 font-mono"
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    :{currentTime.getSeconds().toString().padStart(2, '0')}
                                </motion.div>
                            </div>
                            <div className="text-[9px] text-muted-foreground font-medium">
                                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </motion.div>
                        {/* Theme Toggle */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                                variant="outline" 
                                size="icon"
                                onClick={toggleMode}
                                className="rounded-full border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ rotate: mode === 'dark' ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {mode === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-purple-600" />}
                                </motion.div>
                            </Button>
                        </motion.div>
                        
                        {isAdmin && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button 
                                    onClick={() => setShowNewConfigModal(true)}
                                    size="sm"
                                    className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 h-8"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden lg:inline">New Config</span>
                                </Button>
                            </motion.div>
                        )}
                        <span className="text-muted-foreground text-xs lg:text-sm hidden md:inline">
                            Welcome, <span className="text-foreground font-medium">{user?.username}</span>
                        </span>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-foreground hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 h-8 w-8">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    </div>
                </header>
                <FeatureSelector key={featureSelectorKey} onSelectFeature={setSelectedFeatureId} />
                
                {/* New Config Modal */}
                <Dialog open={showNewConfigModal} onOpenChange={setShowNewConfigModal}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Dashboard Config</DialogTitle>
                            <DialogDescription>
                                Create a new dashboard configuration. Choose a feature type and give it a name.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="config-name">Configuration Name</Label>
                                <Input
                                    id="config-name"
                                    placeholder="e.g., Price Alert - Production"
                                    value={newConfigName}
                                    onChange={(e) => setNewConfigName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="feature-type">Feature Type</Label>
                                <Select value={newConfigFeature} onValueChange={setNewConfigFeature}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select feature" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableFeatures.map(feature => (
                                            <SelectItem key={feature.id} value={feature.id}>
                                                {feature.name} ({getFeatureShortName(feature.id)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowNewConfigModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateNewConfig} disabled={!newConfigName.trim()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Config
                            </Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            </motion.div>
        );
    }    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col bg-gradient-to-br from-background via-background to-purple-50/20 dark:to-purple-950/5 relative"
        >
            <header className="sticky top-0 border-b border-border/50 h-14 lg:h-16 flex items-center px-3 lg:px-4 justify-between bg-card/95 backdrop-blur-md z-50 shadow-sm">
                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Mobile Menu Button */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="md:hidden">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setMobileSidebarOpen(true)}
                            className="hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                setSelectedFeatureId(null);
                                setSelectedProfileId(null);
                                setIsCreatingProfile(false);
                            }}
                            className="hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8 lg:h-9 lg:w-9"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </motion.div>
                    <div className="flex items-center gap-2 lg:gap-3">
                        <motion.div 
                            className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg bg-white dark:bg-slate-800 p-0.5 lg:p-1 shadow border border-purple-100 dark:border-purple-500/20"
                            whileHover={{ rotate: 5 }}
                        >
                            <img src="/assets/logo_512x512.png" alt="Buyhatke" className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="flex items-center gap-1 lg:gap-2">
                            <span className="font-semibold text-foreground text-sm lg:text-base">
                                {selectedFeatureId ? getFeatureName(selectedFeatureId) : 'Analytics'}
                            </span>
                            <span className="text-xs text-muted-foreground hidden md:inline">
                                — {selectedOrganization?.name || 'Organization'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 lg:gap-3">
                    {/* Theme Toggle */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                            variant="outline" 
                            size="icon"
                            onClick={toggleMode}
                            className="rounded-full border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                        >
                            <motion.div
                                initial={false}
                                animate={{ rotate: mode === 'dark' ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {mode === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-purple-600" />}
                            </motion.div>
                        </Button>
                    </motion.div>
                    
                    {isAdmin && (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden sm:block">
                            <Button 
                                onClick={() => setShowNewConfigModal(true)}
                                size="sm"
                                className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 h-8"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden lg:inline">New Config</span>
                            </Button>
                        </motion.div>
                    )}
                    <motion.span 
                        className="text-xs lg:text-sm px-2 lg:px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-medium hidden sm:inline-flex"
                        whileHover={{ scale: 1.02 }}
                    >
                        {user?.role === 0 ? '✨ Admin' : '👁 Viewer'}
                    </motion.span>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 h-8 w-8">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </motion.div>
                </div>
            </header>

            <div className="flex">
                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {mobileSidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                                onClick={() => setMobileSidebarOpen(false)}
                            />
                            <motion.div
                                initial={{ x: -280 }}
                                animate={{ x: 0 }}
                                exit={{ x: -280 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="fixed left-0 top-14 bottom-0 w-[280px] bg-background border-r border-border/40 z-50 md:hidden overflow-hidden"
                            >
                                <div className="absolute top-2 right-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setMobileSidebarOpen(false)}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <ProfileSidebar
                                    featureId={selectedFeatureId}
                                    selectedProfileId={selectedProfileId}
                                    onSelectProfile={(id) => {
                                        setSelectedProfileId(id);
                                        setIsCreatingProfile(false);
                                        setMobileSidebarOpen(false);
                                    }}
                                    onCreateProfile={() => {
                                        setIsCreatingProfile(true);
                                        setSelectedProfileId(null);
                                        setMobileSidebarOpen(false);
                                    }}
                                    refreshTrigger={sidebarRefreshTrigger}
                                    isCollapsed={false}
                                    onToggleCollapse={() => {}}
                                    isMobileDrawer={true}
                                    onJumpToPanel={handleJumpToPanel}
                                    criticalAlerts={criticalAlertsData}
                                />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Desktop Sidebar - sticky under header, no animation */}
                <div className="hidden md:block flex-shrink-0">
                    <div 
                        className="border-r border-border/40 bg-background flex flex-col sticky top-14 lg:top-16"
                        style={{ width: sidebarCollapsed ? 60 : 280 }}
                    >
                    <ProfileSidebar
                        featureId={selectedFeatureId}
                        selectedProfileId={selectedProfileId}
                        onSelectProfile={(id) => {
                            setSelectedProfileId(id);
                            setIsCreatingProfile(false);
                        }}
                        onCreateProfile={() => {
                            setIsCreatingProfile(true);
                            setSelectedProfileId(null);
                        }}
                        refreshTrigger={sidebarRefreshTrigger}
                        isCollapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onJumpToPanel={handleJumpToPanel}
                        criticalAlerts={criticalAlertsData}
                    />
                    </div>
                </div>

                <main className="flex-1 relative min-w-0">
                    {/* Subtle dot pattern background */}
                    <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
                    
                    <div className="relative z-10 p-4 lg:p-6">
                        {isCreatingProfile ? (
                            <motion.div
                                key="builder"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <ProfileBuilder
                                    featureId={selectedFeatureId}
                                    onCancel={() => setIsCreatingProfile(false)}
                                    onSave={handleProfileSaved}
                                    initialProfileId={selectedProfileId}
                                />
                            </motion.div>
                        ) : selectedProfileId ? (
                            <motion.div
                                key="viewer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <DashboardViewer
                                    profileId={selectedProfileId}
                                    onEditProfile={(_profile: DashboardProfile) => {
                                        setIsCreatingProfile(true);
                                    }}
                                    onAlertsUpdate={setCriticalAlertsData}
                                />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full text-muted-foreground"
                            >
                                <motion.div 
                                    className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-lg"
                                    animate={{ 
                                        scale: [1, 1.05, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ 
                                        duration: 4, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <Sparkles className="h-12 w-12 text-primary" />
                                </motion.div>
                                <p className="text-xl font-medium">Select a profile to view dashboard</p>
                                <p className="text-sm mt-2 opacity-60">Choose from the sidebar to get started</p>
                            </motion.div>
                        )}
                    </div>
                </main>
            </div>
            
            {/* New Config Modal (also available when feature is selected) */}
            <Dialog open={showNewConfigModal} onOpenChange={setShowNewConfigModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Dashboard Config</DialogTitle>
                        <DialogDescription>
                            Create a new dashboard configuration for {getFeatureName(selectedFeatureId || newConfigFeature)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="config-name-2">Configuration Name</Label>
                            <Input
                                id="config-name-2"
                                placeholder={`e.g., ${getFeatureName(selectedFeatureId || newConfigFeature)} - Production`}
                                value={newConfigName}
                                onChange={(e) => setNewConfigName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Feature Type</Label>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                                <span className="font-medium">{getFeatureName(selectedFeatureId || newConfigFeature)}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    {getFeatureShortName(selectedFeatureId || newConfigFeature)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewConfigModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateNewConfig} disabled={!newConfigName.trim()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Config
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
