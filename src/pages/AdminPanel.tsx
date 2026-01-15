import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShieldAlert, CheckCircle, XCircle, Clock, Users, RefreshCw, Filter, Building2, User, Eye, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PendingUser {
    id: number;
    username: string;
    dashboardId: number;
    dashboardName: string;
    requestedPermissions: {
        features?: Record<string, 'read' | 'write'>;
    } | null;
    createdAt: string;
}

// Dashboard color palette
const DASHBOARD_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    'FeatureTracking': { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-500/50', text: 'text-purple-700 dark:text-purple-300', icon: 'bg-purple-500' },
    'Ads-Dashboard': { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-500/50', text: 'text-blue-700 dark:text-blue-300', icon: 'bg-blue-500' },
    'Internal Dashboard': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-500/50', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-500' },
    'default': { bg: 'bg-slate-100 dark:bg-slate-900/30', border: 'border-slate-300 dark:border-slate-500/50', text: 'text-slate-700 dark:text-slate-300', icon: 'bg-slate-500' },
};

const getDashboardColor = (name: string) => {
    return DASHBOARD_COLORS[name] || DASHBOARD_COLORS['default'];
};

const getDashboardName = (id: number) => {
    switch (id) {
        case 0: return 'Ads-Dashboard';
        case 1: return 'FeatureTracking';
        case 2: return 'Internal Dashboard';
        default: return `Dashboard ${id}`;
    }
};

export default function AdminPanel() {
    const { user, getPendingUsers, adminAction } = useAnalyticsAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedDashboards, setSelectedDashboards] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    const isAdmin = user?.role === 1;

    // Feature names from API
    const [featureNames, setFeatureNames] = useState<Record<string, string>>({});

    const getFeatureName = (id: string) => featureNames[id] || `Feature ${id}`;

    // Get unique dashboards
    const uniqueDashboards = useMemo(() => {
        const dashboards = new Set<string>();
        pendingUsers.forEach(u => dashboards.add(u.dashboardName));
        return Array.from(dashboards);
    }, [pendingUsers]);

    // Filtered users
    const filteredUsers = useMemo(() => {
        if (selectedDashboards.size === 0) return pendingUsers;
        return pendingUsers.filter(u => selectedDashboards.has(u.dashboardName));
    }, [pendingUsers, selectedDashboards]);

    // Fetch feature names from API
    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                const response = await fetch('https://ext1.buyhatke.com/feature-tracking/dashboard/featuresList?organizationId=0');
                const data = await response.json();
                if (data.status === 1 && data.data?.featureMap) {
                    setFeatureNames(data.data.featureMap);
                }
            } catch (error) {
                console.error('Failed to fetch feature names:', error);
            }
        };
        fetchFeatures();
    }, []);

    // Redirect non-admins
    useEffect(() => {
        if (!isAdmin) {
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: "You don't have admin privileges.",
            });
            navigate('/analytics');
        }
    }, [isAdmin, navigate, toast]);

    // Load pending users
    const loadPendingUsers = async () => {
        setIsRefreshing(true);
        try {
            const users = await getPendingUsers();
            const mappedUsers = (users || []).map((u: any) => ({
                ...u,
                dashboardName: getDashboardName(u.dashboardId ?? u.dashboard_id)
            }));
            setPendingUsers(mappedUsers);
        } catch (error) {
            console.error('Failed to load pending users:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadPendingUsers();
        }
    }, [isAdmin]);

    const handleAction = async (userId: number, action: 'approve' | 'reject', permissions?: any) => {
        const result = await adminAction(userId, action, permissions);
        if (result.success) {
            toast({
                title: action === 'approve' ? "User Approved ✅" : "Request Rejected",
                description: `Successfully ${action}ed user access request.`,
            });
            loadPendingUsers();
        } else {
            toast({
                variant: "destructive",
                title: "Action Failed",
                description: result.message || "Could not process request.",
            });
        }
    };

    const toggleDashboard = (dashboard: string) => {
        setSelectedDashboards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dashboard)) {
                newSet.delete(dashboard);
            } else {
                newSet.add(dashboard);
            }
            return newSet;
        });
    };

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/30 dark:to-amber-950/10">
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
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Admin Access Panel</h1>
                            <p className="text-sm text-muted-foreground">Manage user access requests</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={showFilters ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filter
                        {selectedDashboards.size > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs">
                                {selectedDashboards.size}
                            </span>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPendingUsers}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/30">
                        <Users className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                            {filteredUsers.length} Pending
                        </span>
                    </div>
                </div>
            </header>

            {/* Dashboard Filter Panel */}
            {showFilters && uniqueDashboards.length > 0 && (
                <div className="border-b border-border/50 bg-card/50 px-6 py-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Filter by Dashboard:</span>
                            {selectedDashboards.size > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setSelectedDashboards(new Set())}
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {uniqueDashboards.map(dashboard => {
                                const colors = getDashboardColor(dashboard);
                                const isSelected = selectedDashboards.has(dashboard);
                                const count = pendingUsers.filter(u => u.dashboardName === dashboard).length;

                                return (
                                    <button
                                        key={dashboard}
                                        onClick={() => toggleDashboard(dashboard)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${isSelected
                                                ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-amber-400`
                                                : 'bg-card border-border hover:border-amber-300'
                                            }`}
                                    >
                                        <Checkbox checked={isSelected} className="pointer-events-none" />
                                        <div className={`h-3 w-3 rounded-full ${colors.icon}`} />
                                        <span className={`font-semibold ${isSelected ? colors.text : 'text-foreground'}`}>
                                            {dashboard}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <Card className="border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="py-16 text-center">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">All Caught Up!</h2>
                            <p className="text-green-600 dark:text-green-400 mt-2">
                                {selectedDashboards.size > 0
                                    ? "No pending requests for selected dashboards."
                                    : "No pending access requests at this time."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-foreground">Pending Access Requests</h2>
                        </div>

                        <div className="grid gap-4">
                            {filteredUsers.map(pUser => {
                                const dashboardColors = getDashboardColor(pUser.dashboardName);

                                return (
                                    <Card key={pUser.id} className={`border-2 ${dashboardColors.border} hover:shadow-lg transition-all`}>
                                        <CardContent className="p-6">
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                {/* User Info */}
                                                <div className="flex items-start gap-4">
                                                    {/* Avatar */}
                                                    <div className={`h-14 w-14 rounded-xl ${dashboardColors.icon} flex items-center justify-center shadow-lg`}>
                                                        <User className="h-7 w-7 text-white" />
                                                    </div>

                                                    <div className="flex-1">
                                                        {/* Username */}
                                                        <h3 className="text-xl font-bold text-foreground">{pUser.username}</h3>

                                                        {/* Dashboard Badge - BIG & Colorful */}
                                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg ${dashboardColors.bg} ${dashboardColors.border} border mt-2`}>
                                                            <Building2 className={`h-4 w-4 ${dashboardColors.text}`} />
                                                            <span className={`font-bold text-base ${dashboardColors.text}`}>
                                                                {pUser.dashboardName}
                                                            </span>
                                                        </div>

                                                        {/* Timestamp */}
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            Requested: {new Date(pUser.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 self-start lg:self-center">
                                                    <Button
                                                        size="lg"
                                                        variant="outline"
                                                        className="border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:border-red-900/50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleAction(pUser.id, 'reject')}
                                                    >
                                                        <XCircle className="h-5 w-5 mr-2" />
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="lg"
                                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20"
                                                        onClick={() => handleAction(pUser.id, 'approve', pUser.requestedPermissions)}
                                                    >
                                                        <CheckCircle className="h-5 w-5 mr-2" />
                                                        Approve
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Requested Features */}
                                            {pUser.requestedPermissions?.features && Object.keys(pUser.requestedPermissions.features).length > 0 && (
                                                <div className="mt-5 pt-5 border-t border-border/50">
                                                    <p className="text-sm font-medium text-muted-foreground mb-3">Requested Feature Access:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(pUser.requestedPermissions.features).map(([fid, access]) => (
                                                            <div
                                                                key={fid}
                                                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border"
                                                            >
                                                                {access === 'write' ? (
                                                                    <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                                                                ) : (
                                                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                                                )}
                                                                <span className="font-medium text-foreground">{getFeatureName(fid)}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${access === 'write'
                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    }`}>
                                                                    {access}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
