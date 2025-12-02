import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DashboardProfile } from '@/types/analytics';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { FeatureSelector } from './FeatureSelector';
import { ProfileSidebar } from './ProfileSidebar';
import { AnalyticsLogin } from './AnalyticsLogin';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft, Plus, Sparkles, Sun, Moon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockService } from '@/services/mockData';
import { useTheme } from '@/components/theme/theme-provider';
import { DotPattern, FloatingOrbs, WaveBackground } from '@/components/ui/animated-background';

export function AnalyticsLayout() {
    const { user, logout, isAuthenticated } = useAnalyticsAuth();
    const { mode, toggleMode } = useTheme();
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
    const [featureSelectorKey, setFeatureSelectorKey] = useState(0);
    
    // New Dashboard Config Modal
    const [showNewConfigModal, setShowNewConfigModal] = useState(false);
    const [newConfigName, setNewConfigName] = useState('');
    const [newConfigFeature, setNewConfigFeature] = useState('price_alert');
    
    const isAdmin = user?.role === 0;

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
                pos: { type: 'multi-select', options: [], defaultValue: ['2'] },
                source: { type: 'multi-select', options: [], defaultValue: ['1'] },
                event: { type: 'multi-select', options: [], defaultValue: [] }
            },
            defaultSettings: {
                timeRange: { preset: 'last_7_days', granularity: 'hourly' },
                autoRefresh: 60
            },
            criticalAlerts: { enabled: false, refreshInterval: 30, position: 'top', maxAlerts: 5, filterByPOS: [] }
        };
        
        await mockService.saveProfile(newProfile);
        setFeatureSelectorKey(prev => prev + 1);
        setSelectedFeatureId(newConfigFeature);
        setSelectedProfileId(newProfile.profileId);
        setIsCreatingProfile(true);
        setSidebarRefreshTrigger(prev => prev + 1);
        setShowNewConfigModal(false);
        setNewConfigName('');
        setNewConfigFeature('price_alert');
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
                {/* Background effects */}
                <DotPattern />
                <FloatingOrbs />
                <WaveBackground />
                
                <header className="border-b border-border/50 p-3 lg:p-4 flex justify-between items-center bg-card/80 backdrop-blur-sm shadow-sm relative z-10">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-2 lg:gap-3"
                    >
                        <motion.div 
                            className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-white dark:bg-slate-800 p-1 lg:p-1.5 shadow-lg border border-purple-100 dark:border-purple-500/20"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <img src="/assets/logo_512x512.png" alt="Buyhatke" className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm lg:text-lg text-foreground leading-tight">
                                Buyhatke Internal
                            </span>
                            <span className="text-[10px] lg:text-xs text-purple-600 dark:text-purple-400 font-medium hidden sm:block">
                                Analytics Dashboard
                            </span>
                        </div>
                    </motion.div>
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
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="hidden sm:block"
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
                                        <SelectItem value="price_alert">Price Alert (PA)</SelectItem>
                                        <SelectItem value="auto_coupon">Auto-Coupon (AC)</SelectItem>
                                        <SelectItem value="spend_lens">Spend-Lens (SPEND)</SelectItem>
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
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-purple-50/20 dark:to-purple-950/5 relative"
        >
            <header className="border-b border-border/50 h-14 lg:h-16 flex items-center px-3 lg:px-4 justify-between bg-card/80 backdrop-blur-sm z-10 shadow-sm">
                <div className="flex items-center gap-2 lg:gap-4">
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
                                {selectedFeatureId === 'price_alert' ? 'Price Alert' :
                                    selectedFeatureId === 'auto_coupon' ? 'Auto-Coupon' :
                                        selectedFeatureId === 'spend_lens' ? 'Spend-Lens' : 'Analytics'}
                            </span>
                            <span className="text-xs text-muted-foreground hidden md:inline">
                                — Buyhatke Internal
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

            <div className="flex-1 flex overflow-hidden">
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
                />

                <main className="flex-1 overflow-auto relative">
                    {/* Subtle dot pattern background */}
                    <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
                    
                    <div className="relative z-10 p-3 lg:p-6">
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
                            Create a new dashboard configuration. Choose a feature type and give it a name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="config-name-2">Configuration Name</Label>
                            <Input
                                id="config-name-2"
                                placeholder="e.g., Price Alert - Production"
                                value={newConfigName}
                                onChange={(e) => setNewConfigName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="feature-type-2">Feature Type</Label>
                            <Select value={newConfigFeature} onValueChange={setNewConfigFeature}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select feature" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="price_alert">Price Alert (PA)</SelectItem>
                                    <SelectItem value="auto_coupon">Auto-Coupon (AC)</SelectItem>
                                    <SelectItem value="spend_lens">Spend-Lens (SPEND)</SelectItem>
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
}
