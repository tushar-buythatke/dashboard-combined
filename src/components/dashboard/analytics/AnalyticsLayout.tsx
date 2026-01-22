import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DashboardProfile, Feature } from '@/types/analytics';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { FeatureSelector } from './FeatureSelector';
import { ProfileSidebar } from './ProfileSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, Plus, Sparkles, Sun, Moon, Building2, ChevronDown, Check, Menu, X, Settings, Layers, ShieldAlert, UserPlus, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardViewer } from './DashboardViewer';
import { ProfileBuilder } from './admin/ProfileBuilder';
import { ChartErrorBoundary } from './components/ChartErrorBoundary';
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
import { firebaseConfigService } from '@/services/firebaseConfigService';
import { getFeatureName, getFeatureShortName } from '@/services/apiService';
import { useTheme } from '@/components/theme/theme-provider';
import { GradientMeshBackground } from '@/components/ui/animated-background';
import { CustomEventLabelsProvider } from '@/contexts/CustomEventLabelsContext';

export function AnalyticsLayout() {
    const { user, logout, isAuthenticated, isLoading, requestAccess, adminAction, getPendingUsers, refreshUser } = useAnalyticsAuth();
    const navigate = useNavigate();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/auth', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Prevent flash of protected content while redirecting
    if (!isLoading && !isAuthenticated) return null;

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
    const [activePanelId, setActivePanelId] = useState<string | null>(null);

    // Admin Access Management
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [showAdminPane, setShowAdminPane] = useState(true);

    // User Access Request
    const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
    const [requestFeatures, setRequestFeatures] = useState<string[]>([]);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

    // Live clock with seconds
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Keep selected feature/profile in sync with URL
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
    const [newConfigMode, setNewConfigMode] = useState<'new' | 'existing'>('new'); // New or add to existing
    const [selectedExistingProfile, setSelectedExistingProfile] = useState<string | null>(null);

    // Available features from API
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
    const [existingProfiles, setExistingProfiles] = useState<DashboardProfile[]>([]);

    // Sidebar collapse state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Mobile sidebar visibility
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const isAdmin = user?.role === 1;

    // Helper to check write access for a feature
    const hasWriteAccess = (featureId: string | null) => {
        // If user is global admin (role 1), they have write access everywhere
        if (isAdmin) return true;

        if (!featureId || !user?.permissions?.features) return false;
        return user.permissions.features[featureId] === 'write';
    };

    // Helper to check if user has access to a feature
    const hasFeatureAccess = (featureId: string) => {
        if (isAdmin) return true;

        if (!user?.permissions?.features) return false;
        return !!user.permissions.features[featureId];
    };

    // Panel navigation - scroll to specific panel by ID and auto-fetch data
    const handleJumpToPanel = (panelId: string, panelName?: string) => {
        const dashboardJumpToPanel = (window as any).__dashboardViewerJumpToPanel;
        if (dashboardJumpToPanel && typeof dashboardJumpToPanel === 'function') {
            dashboardJumpToPanel(panelId);
        } else {
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

        setMobileSidebarOpen(false);

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
                let features = await mockService.getFeatures(selectedOrganization?.id ?? 0);

                // Filter features based on user permissions (unless user is global admin)
                if (!isAdmin && user?.permissions?.features) {
                    features = features.filter(f => hasFeatureAccess(f.id));
                }

                setAvailableFeatures(features);
                if (features.length > 0 && !selectedFeatureId) {
                    setNewConfigFeature(features[0].id);
                }
            } catch (error) {
                console.error('Failed to load features:', error);
                setAvailableFeatures([]);
            }
        };
        loadFeatures();
        loadFeatures();
    }, [selectedOrganization?.id, selectedFeatureId, user?.permissions]);

    // Load pending users for Admin
    useEffect(() => {
        if (isAdmin) {
            const loadPending = async () => {
                if (getPendingUsers) {
                    const users = await getPendingUsers();
                    setPendingUsers(users);
                }
            };
            loadPending();
            // Poll every 30s
            const interval = setInterval(loadPending, 30000);
            return () => clearInterval(interval);
        }
    }, [isAdmin, getPendingUsers]);

    const handleAdminAction = async (userId: string | number, action: 'approve' | 'reject', permissions?: any) => {
        if (adminAction) {
            const result = await adminAction(userId, action, permissions);
            if (result.success) {
                toast({
                    title: action === 'approve' ? "User Approved" : "Request Rejected",
                    description: `Successfully ${action}ed user request.`,
                });
                // Refresh pending users
                const users = await getPendingUsers();
                setPendingUsers(users);
            } else {
                toast({
                    variant: "destructive",
                    title: "Action Failed",
                    description: result.message || "Could not process request.",
                });
            }
        }
    };

    const handleRequestAccess = async () => {
        if (requestAccess && requestFeatures.length > 0) {
            setIsSubmittingRequest(true);
            const permissions: { features: Record<string, 'read' | 'write'> } = { features: {} };
            requestFeatures.forEach(fid => {
                permissions.features[fid] = 'read'; // Default to read access
            });

            const result = await requestAccess(permissions);
            setIsSubmittingRequest(false);

            if (result.success) {
                toast({
                    title: "Request Submitted",
                    description: "Your access request has been sent to the admin.",
                });
                setShowRequestAccessModal(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Request Failed",
                    description: result.message || "Could not submit request.",
                });
            }
        }
    };

    // Load existing profiles when modal opens
    useEffect(() => {
        const loadExistingProfiles = async () => {
            if (showNewConfigModal && newConfigMode === 'existing' && newConfigFeature) {
                try {
                    // Use firebaseConfigService which has DB-first logic
                    const result = await firebaseConfigService.getProfiles(newConfigFeature, 'default');
                    if (result.success) {
                        const profiles = result.items.map(p => ({
                            ...p,
                            lastModified: p.updatedAt || p.createdAt,
                        })) as DashboardProfile[];
                        setExistingProfiles(profiles);
                        if (profiles.length > 0 && !selectedExistingProfile) {
                            setSelectedExistingProfile(profiles[0].profileId);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load existing profiles:', error);
                    setExistingProfiles([]);
                }
            }
        };
        loadExistingProfiles();
    }, [showNewConfigModal, newConfigMode, newConfigFeature]);

    // When organization changes, restore selection from URL
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
        if (newConfigMode === 'new' && !newConfigName.trim()) return;
        if (newConfigMode === 'existing' && !selectedExistingProfile) return;

        if (newConfigMode === 'new') {
            // Create new profile
            const newProfile: DashboardProfile = {
                profileId: `profile_${Date.now()}`,
                profileName: newConfigName,
                featureId: newConfigFeature,
                createdBy: String(user?.id || 'admin'),
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
        } else {
            // Add panels to existing profile
            setFeatureSelectorKey(prev => prev + 1);
            setSelectedFeatureId(newConfigFeature);
            setSelectedProfileId(selectedExistingProfile);
            setIsCreatingProfile(true);
            setSidebarRefreshTrigger(prev => prev + 1);
        }

        setShowNewConfigModal(false);
        setNewConfigName('');
        setNewConfigMode('new');
        setSelectedExistingProfile(null);
        setNewConfigFeature(selectedFeatureId || availableFeatures[0]?.id || '1');
    };

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-purple-50/30 dark:to-purple-950/10">
                <div className="text-center space-y-4">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (!selectedFeatureId) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-purple-50/30 dark:to-purple-950/10 relative overflow-hidden">
                {/* Background effects */}
                <div className="pointer-events-none">
                    <GradientMeshBackground />
                </div>

                <header className="border-b border-border/50 px-3 lg:px-4 py-4 lg:py-5 flex justify-between items-center bg-card/95 backdrop-blur-md shadow-sm relative z-10">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-white dark:bg-slate-800 p-1 lg:p-1.5 shadow-lg border border-purple-100 dark:border-purple-500/20 overflow-hidden">
                            <img src="/assets/logo_512x512.png" alt="Buyhatke" className="w-full h-full object-contain" />
                        </div>
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
                    </div>
                    <div className="flex items-center gap-1.5 lg:gap-3">
                        {/* Request Access Button (Non-Admins) */}
                        {!isAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (user?.pending_status === 1) {
                                        // Trigger manual refresh to check approval status
                                        refreshUser?.();
                                        navigate('/request-access');
                                    } else {
                                        navigate('/request-access');
                                    }
                                }}
                                className={`hidden sm:flex gap-2 h-8 ${user?.pending_status === 1 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-600/20' : ''}`}
                            >
                                {user?.pending_status === 1 ? (
                                    <>
                                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                                        <span>Check Status</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-3.5 w-3.5" />
                                        <span>Request Access</span>
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Admin Access Panel Button */}
                        {isAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/admin')}
                                className={cn(
                                    "flex items-center gap-1.5 h-8 px-3 transition-all duration-300",
                                    pendingUsers.length > 0
                                        ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-300 animate-pulse hover:bg-red-100 dark:hover:bg-red-900/50 shadow-[0_0_8px_rgba(220,38,38,0.3)]"
                                        : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                )}
                            >
                                <ShieldAlert className={cn(
                                    "h-3.5 w-3.5",
                                    pendingUsers.length > 0 ? "text-red-500" : "text-amber-600 dark:text-amber-400"
                                )} />
                                <span className="text-xs font-bold">Admin Access Panel</span>
                                {pendingUsers.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-600 text-white font-bold shadow-sm">
                                        {pendingUsers.length}
                                    </span>
                                )}
                            </Button>
                        )}

                        {/* Live Clock */}
                        <div className="hidden md:flex flex-col items-end px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50/50 to-violet-50/50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-500/30">
                            <div className="flex items-center gap-1.5">
                                <div className="text-sm font-bold text-foreground font-mono tabular-nums">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </div>
                                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 font-mono">
                                    :{currentTime.getSeconds().toString().padStart(2, '0')}
                                </div>
                            </div>
                            <div className="text-[9px] text-muted-foreground font-medium">
                                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                        {/* Theme Toggle */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleMode}
                            className="rounded-full border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                        >
                            {mode === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-purple-600" />}
                        </Button>

                        {hasWriteAccess(selectedFeatureId || newConfigFeature) && (
                            <Button
                                onClick={() => setShowNewConfigModal(true)}
                                size="sm"
                                className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 h-8"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden lg:inline">New Config</span>
                            </Button>
                        )}
                        <span className="text-muted-foreground text-xs lg:text-sm hidden md:inline">
                            Welcome, <span className="text-foreground font-medium">{user?.username}</span>
                        </span>
                        <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-foreground hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 h-8 w-8">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
                <FeatureSelector key={featureSelectorKey} onSelectFeature={setSelectedFeatureId} />

                {/* New Config Modal */}
                <Dialog open={showNewConfigModal} onOpenChange={setShowNewConfigModal}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create New Dashboard Config</DialogTitle>
                            <DialogDescription>
                                Create a new profile or add panels to an existing one.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Mode Selection */}
                            <div className="grid gap-3">
                                <Label>Configuration Mode</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={newConfigMode === 'new' ? 'default' : 'outline'}
                                        className="flex-1"
                                        onClick={() => setNewConfigMode('new')}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        New Profile
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={newConfigMode === 'existing' ? 'default' : 'outline'}
                                        className="flex-1"
                                        onClick={() => setNewConfigMode('existing')}
                                    >
                                        <Layers className="h-4 w-4 mr-2" />
                                        Add to Existing
                                    </Button>
                                </div>
                            </div>

                            {/* Feature Selection */}
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

                            {/* Conditional: New Profile Name OR Existing Profile Selection */}
                            {newConfigMode === 'new' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="config-name">Profile Name</Label>
                                    <Input
                                        id="config-name"
                                        placeholder="e.g., Price Alert - Production"
                                        value={newConfigName}
                                        onChange={(e) => setNewConfigName(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="existing-profile">Select Existing Profile</Label>
                                    <Select value={selectedExistingProfile || undefined} onValueChange={setSelectedExistingProfile}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select profile to add panels to" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {existingProfiles.map(profile => (
                                                <SelectItem key={profile.profileId} value={profile.profileId}>
                                                    {profile.profileName} ({profile.panels.length} panels)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {existingProfiles.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            No existing profiles for this feature. Create a new one instead.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                setShowNewConfigModal(false);
                                setNewConfigMode('new');
                                setSelectedExistingProfile(null);
                            }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNewConfig}
                                disabled={
                                    (newConfigMode === 'new' && !newConfigName.trim()) ||
                                    (newConfigMode === 'existing' && !selectedExistingProfile)
                                }
                            >
                                {newConfigMode === 'new' ? (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Profile
                                    </>
                                ) : (
                                    <>
                                        <Layers className="h-4 w-4 mr-2" />
                                        Add Panels
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <CustomEventLabelsProvider>
            <div className="flex flex-col bg-gradient-to-br from-background via-background to-purple-50/20 dark:to-purple-950/5 relative">
            <header className="sticky top-0 border-b border-border/50 h-14 lg:h-16 flex items-center px-3 lg:px-4 justify-between bg-card/95 backdrop-blur-md z-50 shadow-sm">
                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileSidebarOpen(true)}
                            className="hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setSelectedFeatureId(null);
                            setSelectedProfileId(null);
                            setIsCreatingProfile(false);
                            // Force fresh remount of FeatureSelector to avoid stale loading state
                            setFeatureSelectorKey(prev => prev + 1);
                        }}
                        className="hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8 lg:h-9 lg:w-9"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="h-7 w-7 lg:h-8 lg:w-8 rounded-lg bg-white dark:bg-slate-800 p-0.5 lg:p-1 shadow border border-purple-100 dark:border-purple-500/20">
                            <img src="/assets/logo_512x512.png" alt="Buyhatke" className="w-full h-full object-contain" />
                        </div>
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
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleMode}
                        className="rounded-full border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-500/10 h-8 w-8"
                    >
                        {mode === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-purple-600" />}
                    </Button>

                    {/* Admin Access Panel Button */}
                    {isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/admin')}
                            className={cn(
                                "hidden sm:flex items-center gap-1.5 h-8 px-3 transition-all duration-300",
                                pendingUsers.length > 0
                                    ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-300 animate-pulse hover:bg-red-100 dark:hover:bg-red-900/50 shadow-[0_0_8px_rgba(220,38,38,0.3)]"
                                    : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                            )}
                        >
                            <ShieldAlert className={cn(
                                "h-3.5 w-3.5",
                                pendingUsers.length > 0 ? "text-red-500" : "text-amber-600 dark:text-amber-400"
                            )} />
                            <span className="text-xs font-bold hidden lg:inline">Admin Panel</span>
                            {pendingUsers.length > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-600 text-white font-bold shadow-sm">
                                    {pendingUsers.length}
                                </span>
                            )}
                        </Button>
                    )}

                    {hasWriteAccess(selectedFeatureId) && (
                        <div className="hidden sm:block">
                            <Button
                                onClick={() => setShowNewConfigModal(true)}
                                size="sm"
                                className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 h-8"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="hidden lg:inline">New Config</span>
                            </Button>
                        </div>
                    )}
                    <span className="text-xs lg:text-sm px-2 lg:px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-medium hidden sm:inline-flex">
                        {isAdmin ? ' Super Admin 🤟🏻😎' : (hasWriteAccess(selectedFeatureId) ? '😼 Editor' : '🦁 Viewer')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={logout} className="hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 h-8 w-8">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            <div className="flex">
                {/* Mobile Sidebar Overlay - No animation, just show/hide */}
                {mobileSidebarOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setMobileSidebarOpen(false)}
                        />
                        <div className="fixed left-0 top-14 bottom-0 w-[280px] bg-background border-r border-border/40 z-50 md:hidden overflow-hidden">
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
                                onToggleCollapse={() => { }}
                                isMobileDrawer={true}
                                onJumpToPanel={handleJumpToPanel}
                                criticalAlerts={criticalAlertsData}
                                activePanelId={activePanelId}
                            />
                        </div>
                    </>
                )}

                {/* Desktop Sidebar - instant width change, no animation */}
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
                            activePanelId={activePanelId}
                        />
                    </div>
                </div>

                <main className="flex-1 relative min-w-0">
                    {/* Subtle dot pattern background */}
                    <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />

                    <div className="relative z-10 p-4 lg:p-6">

                        {isCreatingProfile ? (
                            <ProfileBuilder
                                featureId={selectedFeatureId}
                                onCancel={() => setIsCreatingProfile(false)}
                                onSave={handleProfileSaved}
                                initialProfileId={selectedProfileId}
                            />
                        ) : selectedProfileId ? (
                            <ChartErrorBoundary>
                                <DashboardViewer
                                    profileId={selectedProfileId}
                                    onEditProfile={hasWriteAccess(selectedFeatureId) ? (_profile: DashboardProfile) => {
                                        setIsCreatingProfile(true);
                                    } : undefined}
                                    onAlertsUpdate={setCriticalAlertsData}
                                    onPanelActive={setActivePanelId}
                                />
                            </ChartErrorBoundary>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-lg">
                                    <Sparkles className="h-12 w-12 text-primary" />
                                </div>
                                <p className="text-xl font-medium">Select a profile to view dashboard</p>
                                <p className="text-sm mt-2 opacity-60">Choose from the sidebar to get started</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* New Config Modal (also available when feature is selected) */}
            <Dialog open={showNewConfigModal} onOpenChange={setShowNewConfigModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Dashboard Config</DialogTitle>
                        <DialogDescription>
                            Create a new profile or add panels to an existing profile for {getFeatureName(selectedFeatureId || newConfigFeature)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Mode Selection */}
                        <div className="grid gap-3">
                            <Label>Configuration Mode</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={newConfigMode === 'new' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setNewConfigMode('new')}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Profile
                                </Button>
                                <Button
                                    type="button"
                                    variant={newConfigMode === 'existing' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setNewConfigMode('existing')}
                                >
                                    <Layers className="h-4 w-4 mr-2" />
                                    Add to Existing
                                </Button>
                            </div>
                        </div>

                        {/* Feature Display */}
                        <div className="grid gap-2">
                            <Label>Feature Type</Label>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
                                <span className="font-medium">{getFeatureName(selectedFeatureId || newConfigFeature)}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    {getFeatureShortName(selectedFeatureId || newConfigFeature)}
                                </span>
                            </div>
                        </div>

                        {/* Conditional: New Profile Name OR Existing Profile Selection */}
                        {newConfigMode === 'new' ? (
                            <div className="grid gap-2">
                                <Label htmlFor="config-name-2">Profile Name</Label>
                                <Input
                                    id="config-name-2"
                                    placeholder={`e.g., ${getFeatureName(selectedFeatureId || newConfigFeature)} - Production`}
                                    value={newConfigName}
                                    onChange={(e) => setNewConfigName(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="existing-profile-2">Select Existing Profile</Label>
                                <Select value={selectedExistingProfile || undefined} onValueChange={setSelectedExistingProfile}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select profile to add panels to" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {existingProfiles.map(profile => (
                                            <SelectItem key={profile.profileId} value={profile.profileId}>
                                                {profile.profileName} ({profile.panels.length} panels)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {existingProfiles.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No existing profiles for this feature. Create a new one instead.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowNewConfigModal(false);
                            setNewConfigMode('new');
                            setSelectedExistingProfile(null);
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateNewConfig}
                            disabled={
                                (newConfigMode === 'new' && !newConfigName.trim()) ||
                                (newConfigMode === 'existing' && !selectedExistingProfile)
                            }
                        >
                            {newConfigMode === 'new' ? (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Profile
                                </>
                            ) : (
                                <>
                                    <Layers className="h-4 w-4 mr-2" />
                                    Add Panels
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Request Access Modal */}
            <Dialog open={showRequestAccessModal} onOpenChange={setShowRequestAccessModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Request Feature Access</DialogTitle>
                        <DialogDescription>
                            Select the features you need access to. Admin approval is required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                            <Label>Available Features</Label>
                            {availableFeatures.map(feature => (
                                <div key={feature.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`req-feature-${feature.id}`}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={requestFeatures.includes(String(feature.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setRequestFeatures([...requestFeatures, String(feature.id)]);
                                            } else {
                                                setRequestFeatures(requestFeatures.filter(id => id !== String(feature.id)));
                                            }
                                        }}
                                    />
                                    <div className="flex-1">
                                        <label htmlFor={`req-feature-${feature.id}`} className="text-sm font-medium leading-none cursor-pointer block">
                                            {feature.name}
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-0.5">{feature.description || "Analytics and tracking"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRequestAccessModal(false)}>Cancel</Button>
                        <Button onClick={handleRequestAccess} disabled={isSubmittingRequest || requestFeatures.length === 0}>
                            {isSubmittingRequest ? "Submitting..." : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </CustomEventLabelsProvider>
    );
}
