import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Key, Send, CheckCircle, ChevronDown, ChevronUp, Sparkles, Lock, Unlock, Eye, Edit3, Shield, Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Feature {
    id: string;
    name: string;
}

interface SelectedPermission {
    featureId: string;
    access: 'read' | 'write';
    isExisting?: boolean; // true if user already has this permission
}

export default function RequestAccess() {
    const { user, requestAccess } = useAnalyticsAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [features, setFeatures] = useState<Feature[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<SelectedPermission[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // Get user's existing permissions
    const existingPermissions = useMemo(() => {
        if (!user?.permissions?.features) return {};
        return user.permissions.features as Record<string, 'read' | 'write'>;
    }, [user]);

    // Redirect admins to admin panel
    useEffect(() => {
        if (user?.role === 1) {
            navigate('/admin');
        }
    }, [user, navigate]);

    // Fetch features from API and pre-select existing permissions
    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                const response = await fetch('https://ext1.buyhatke.com/feature-tracking/dashboard/featuresList?organizationId=0');
                const data = await response.json();
                if (data.status === 1 && data.data?.featureMap) {
                    const featureList: Feature[] = Object.entries(data.data.featureMap).map(([id, name]) => ({
                        id,
                        name: name as string
                    }));
                    setFeatures(featureList);

                    // Pre-select existing permissions
                    const existing: SelectedPermission[] = Object.entries(existingPermissions).map(([featureId, access]) => ({
                        featureId,
                        access: access as 'read' | 'write',
                        isExisting: true
                    }));
                    setSelectedPermissions(existing);
                }
            } catch (error) {
                console.error('Failed to fetch features:', error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load features list."
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchFeatures();
    }, [toast, existingPermissions]);

    // Filter features based on search
    const filteredFeatures = useMemo(() => {
        if (!searchQuery) return features;
        return features.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.id.includes(searchQuery)
        );
    }, [features, searchQuery]);

    // Separate features into categories
    const { existingFeatures, availableFeatures } = useMemo(() => {
        const existing: Feature[] = [];
        const available: Feature[] = [];

        filteredFeatures.forEach(f => {
            if (existingPermissions[f.id]) {
                existing.push(f);
            } else {
                available.push(f);
            }
        });

        return { existingFeatures: existing, availableFeatures: available };
    }, [filteredFeatures, existingPermissions]);

    // Display limited features unless "show all" is enabled
    const displayedAvailable = showAll ? availableFeatures : availableFeatures.slice(0, 9);

    // Check if feature is selected
    const isSelected = (featureId: string) => {
        return selectedPermissions.some(p => p.featureId === featureId);
    };

    // Get current access level for feature
    const getAccess = (featureId: string): 'read' | 'write' | null => {
        const perm = selectedPermissions.find(p => p.featureId === featureId);
        return perm ? perm.access : null;
    };

    // Check if feature is existing permission
    const isExistingPerm = (featureId: string) => {
        return !!existingPermissions[featureId];
    };

    // Toggle feature selection
    const toggleFeature = (featureId: string) => {
        if (isExistingPerm(featureId)) {
            // Can't deselect existing permissions, only upgrade
            return;
        }
        if (isSelected(featureId)) {
            setSelectedPermissions(prev => prev.filter(p => p.featureId !== featureId));
        } else {
            setSelectedPermissions(prev => [...prev, { featureId, access: 'read', isExisting: false }]);
        }
    };

    // Toggle between read/write
    const toggleAccess = (featureId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedPermissions(prev =>
            prev.map(p =>
                p.featureId === featureId
                    ? { ...p, access: p.access === 'read' ? 'write' : 'read' }
                    : p
            )
        );
    };

    // Count new requests
    const newRequestCount = selectedPermissions.filter(p => !p.isExisting).length;
    const upgradedCount = selectedPermissions.filter(p => p.isExisting && existingPermissions[p.featureId] !== p.access).length;

    // Submit request
    const handleSubmit = async () => {
        if (newRequestCount === 0 && upgradedCount === 0) {
            toast({
                variant: "destructive",
                title: "No Changes",
                description: "Please select new features or upgrade existing permissions."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Build permissions object
            const permissions = {
                features: selectedPermissions.reduce((acc, p) => {
                    acc[p.featureId] = p.access;
                    return acc;
                }, {} as Record<string, 'read' | 'write'>)
            };

            const result = await requestAccess(permissions);
            if (result.success) {
                toast({
                    title: "Request Submitted! 🎉",
                    description: "Your access request has been sent to the admin for approval."
                });
                navigate('/analytics');
            } else {
                toast({
                    variant: "destructive",
                    title: "Request Failed",
                    description: result.message || "Could not submit request."
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "An error occurred while submitting your request."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get feature name
    const getFeatureName = (id: string) => {
        const feature = features.find(f => f.id === id);
        return feature?.name || `Feature ${id}`;
    };

    // Feature Card Component
    const FeatureCard = ({ feature, existing }: { feature: Feature; existing: boolean }) => {
        const selected = isSelected(feature.id);
        const access = getAccess(feature.id);
        const originalAccess = existingPermissions[feature.id];
        const isUpgraded = existing && access !== originalAccess;

        return (
            <div
                className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${existing
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-500/30'
                        : selected
                            ? 'bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-400 dark:border-purple-500 ring-2 ring-purple-400/30'
                            : 'bg-card hover:bg-purple-50/50 dark:hover:bg-purple-950/10 border-border hover:border-purple-300 dark:hover:border-purple-500/30'
                    }`}
                onClick={() => !existing && toggleFeature(feature.id)}
            >
                {/* Status Badge */}
                {existing && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold shadow-md">
                        ✓ Have Access
                    </div>
                )}
                {!existing && selected && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold shadow-md animate-pulse">
                        + Requesting
                    </div>
                )}
                {isUpgraded && (
                    <div className="absolute -top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md">
                        ↑ Upgrade
                    </div>
                )}

                {/* Feature Icon */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-md ${existing
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                        : selected
                            ? 'bg-gradient-to-br from-purple-400 to-violet-500'
                            : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:from-purple-300 group-hover:to-violet-400'
                    }`}>
                    {existing ? (
                        <Unlock className="h-6 w-6 text-white" />
                    ) : selected ? (
                        <Plus className="h-6 w-6 text-white" />
                    ) : (
                        <Lock className="h-6 w-6 text-slate-500 dark:text-slate-400 group-hover:text-white" />
                    )}
                </div>

                {/* Feature Name */}
                <h3 className="font-semibold text-foreground mb-1">{feature.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">Feature ID: {feature.id}</p>

                {/* Permission Level */}
                {(selected || existing) && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 w-full text-xs font-medium transition-all ${access === 'write'
                                    ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:border-amber-500/50 dark:text-amber-300'
                                    : 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-300'
                                }`}
                            onClick={(e) => toggleAccess(feature.id, e)}
                        >
                            {access === 'write' ? (
                                <><Edit3 className="h-3.5 w-3.5 mr-1.5" /> Write Access</>
                            ) : (
                                <><Eye className="h-3.5 w-3.5 mr-1.5" /> Read Only</>
                            )}
                        </Button>
                    </div>
                )}

                {/* Click hint for unselected */}
                {!selected && !existing && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground group-hover:text-purple-600 transition-colors">
                        <Plus className="h-3 w-3" />
                        Click to request
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-50/30 dark:to-purple-950/10">
            {/* Header */}
            <header className="border-b border-border/50 px-6 py-4 flex flex-wrap gap-4 justify-between items-center bg-card/95 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/analytics')}
                        className="h-9 w-9"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Key className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Request Feature Access</h1>
                            <p className="text-sm text-muted-foreground">Select features you need access to</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {Object.keys(existingPermissions).length > 0 && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-500/30">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                {Object.keys(existingPermissions).length} Features
                            </span>
                        </div>
                    )}
                    {newRequestCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-500/30">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                +{newRequestCount} New
                            </span>
                        </div>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={(newRequestCount === 0 && upgradedCount === 0) || isSubmitting}
                        className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20"
                    >
                        <Send className="h-4 w-4" />
                        Submit Request
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Search */}
                <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search features by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 text-lg rounded-xl border-2 focus:border-purple-400"
                    />
                </div>

                {/* Pending Request Card */}
                {user?.pending_status === 1 && user?.pending_permissions?.features && (
                    <Card className="border-2 border-amber-400 dark:border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-lg">
                        <CardContent className="py-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                                        ⏳ You Have a Pending Request!
                                    </h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                        Waiting for admin approval. Submitting a new request will replace this one.
                                    </p>
                                    
                                    {/* Show requested features */}
                                    <div className="mt-4">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">Features you requested:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(user.pending_permissions.features as Record<string, 'read' | 'write'>).map(([fid, access]) => (
                                                <div
                                                    key={fid}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-black/20 border border-amber-300 dark:border-amber-500/30"
                                                >
                                                    {access === 'write' ? (
                                                        <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                                                    )}
                                                    <span className="font-medium text-foreground">{getFeatureName(fid)}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        access === 'write' 
                                                            ? 'bg-amber-100 text-amber-700' 
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {access}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Existing Permissions Section */}
                        {existingFeatures.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center">
                                        <Shield className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Your Current Access</h2>
                                        <p className="text-sm text-muted-foreground">Features you already have permission to use</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {existingFeatures.map(feature => (
                                        <FeatureCard key={feature.id} feature={feature} existing={true} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Available Features Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Request New Access</h2>
                                    <p className="text-sm text-muted-foreground">Click on features to add them to your request</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {displayedAvailable.map(feature => (
                                    <FeatureCard key={feature.id} feature={feature} existing={false} />
                                ))}
                            </div>

                            {/* Show more/less */}
                            {availableFeatures.length > 9 && (
                                <div className="flex justify-center mt-6">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setShowAll(!showAll)}
                                        className="gap-2 px-8"
                                    >
                                        {showAll ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Show Less
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Show All {availableFeatures.length} Features
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </section>

                        {/* Request Summary */}
                        {newRequestCount > 0 && (
                            <Card className="border-purple-200 dark:border-purple-500/30 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                                <CardContent className="py-6">
                                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-purple-500" />
                                        Your Request Summary
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedPermissions.filter(p => !p.isExisting).map(perm => (
                                            <div
                                                key={perm.featureId}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-black/20 border border-purple-200 dark:border-purple-500/30 shadow-sm"
                                            >
                                                <span className="font-medium text-foreground">{getFeatureName(perm.featureId)}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${perm.access === 'write'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                    }`}>
                                                    {perm.access === 'write' ? 'Write' : 'Read'}
                                                </span>
                                                <button
                                                    className="ml-1 h-5 w-5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-sm font-bold transition-colors"
                                                    onClick={() => toggleFeature(perm.featureId)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
