import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, ShieldAlert, CheckCircle, XCircle, Clock, Users, RefreshCw, Filter,
    Building2, User, Eye, Edit3, Activity, MessageSquare, Mic, LogIn, BarChart2,
    ChevronDown, ChevronUp, Calendar, Hash, Zap, TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FEATURE_TRACKING_AUTH_API = 'https://ext1.buyhatke.com/feature-tracking/auth';
const TRACKER_API = 'https://ext1.buyhatke.com/feature-tracking';

interface TrackerLogEntry {
    timestamp: number;
    action: 'login' | 'feature_visit' | 'ai_chat' | 'voice_chat' | 'org_visit';
    featureId?: number | string;
    featureName?: string;
    details?: Record<string, any>;
}

interface DedupLogEntry extends TrackerLogEntry {
    count: number;
}

interface UserTrackerData {
    userId: string;
    email: string;
    logs: TrackerLogEntry[];
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatLastSeen(ts: number): string {
    const d = new Date(ts);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${day}, ${time}`;
}

function formatDayHeader(ts: number): string {
    return new Date(ts).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
    });
}

function getDayKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getUserInitials(email: string): string {
    if (!email) return '?';
    const name = email.split('@')[0];
    const parts = name.split(/[._\-+]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// Merge same action+featureId within 5s into one entry with count.
// Special rule: org_visit for the same orgId is deduplicated per calendar day (show only first visit).
function deduplicateLogs(logs: TrackerLogEntry[]): DedupLogEntry[] {
    const DEDUP_WINDOW = 5000;
    const seenOrgVisitDays = new Set<string>(); // "orgId_YYYY-MM-DD"
    const result: DedupLogEntry[] = [];
    for (const log of logs) {
        // Per-day dedup for org_visit
        if (log.action === 'org_visit') {
            const dayKey = new Date(log.timestamp).toISOString().slice(0, 10);
            const orgDayKey = `${String(log.featureId ?? '')}_${dayKey}`;
            if (seenOrgVisitDays.has(orgDayKey)) continue; // skip — already have this org's visit for this day
            seenOrgVisitDays.add(orgDayKey);
            result.push({ ...log, count: 1 });
            continue;
        }
        // 5s dedup for everything else
        const last = result[result.length - 1];
        if (
            last &&
            last.action === log.action &&
            String(last.featureId ?? '') === String(log.featureId ?? '') &&
            log.timestamp - last.timestamp < DEDUP_WINDOW
        ) {
            last.count++;
        } else {
            result.push({ ...log, count: 1 });
        }
    }
    return result;
}

function groupByDay(logs: DedupLogEntry[]): Array<{ dayKey: string; dayLabel: string; entries: DedupLogEntry[] }> {
    const groups = new Map<string, { dayLabel: string; entries: DedupLogEntry[] }>();
    for (const log of logs) {
        const key = getDayKey(log.timestamp);
        if (!groups.has(key)) {
            groups.set(key, { dayLabel: formatDayHeader(log.timestamp), entries: [] });
        }
        groups.get(key)!.entries.push(log);
    }
    return Array.from(groups.entries())
        .map(([dayKey, v]) => ({ dayKey, ...v }))
        .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

// ─── Dashboard color palette ─────────────────────────────────────────────────

const DASHBOARD_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    'FeatureTracking': { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-500/50', text: 'text-purple-700 dark:text-purple-300', icon: 'bg-purple-500' },
    'Ads-Dashboard': { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-500/50', text: 'text-blue-700 dark:text-blue-300', icon: 'bg-blue-500' },
    'Internal Dashboard': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-500/50', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-500' },
    'default': { bg: 'bg-slate-100 dark:bg-slate-900/30', border: 'border-slate-300 dark:border-slate-500/50', text: 'text-slate-700 dark:text-slate-300', icon: 'bg-slate-500' },
};

const getDashboardColor = (name: string) => DASHBOARD_COLORS[name] || DASHBOARD_COLORS['default'];

const getDashboardName = (id: number) => {
    switch (id) {
        case 0: return 'Ads-Dashboard';
        case 1: return 'FeatureTracking';
        case 2: return 'Internal Dashboard';
        default: return `Dashboard ${id}`;
    }
};

// ─── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
    login: {
        icon: <LogIn className="h-3 w-3" />,
        dotIcon: <LogIn className="h-2.5 w-2.5 text-white" />,
        label: 'Login',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        dot: 'bg-emerald-500',
        pill: 'bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300',
    },
    feature_visit: {
        icon: <BarChart2 className="h-3 w-3" />,
        dotIcon: <BarChart2 className="h-2.5 w-2.5 text-white" />,
        label: 'Feature Visit',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        dot: 'bg-blue-500',
        pill: 'bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300',
    },
    ai_chat: {
        icon: <MessageSquare className="h-3 w-3" />,
        dotIcon: <MessageSquare className="h-2.5 w-2.5 text-white" />,
        label: 'AI Chat',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        dot: 'bg-purple-500',
        pill: 'bg-purple-100 dark:bg-purple-900/25 text-purple-700 dark:text-purple-300',
    },
    voice_chat: {
        icon: <Mic className="h-3 w-3" />,
        dotIcon: <Mic className="h-2.5 w-2.5 text-white" />,
        label: 'Voice Chat',
        color: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-100 dark:bg-pink-900/30',
        dot: 'bg-pink-500',
        pill: 'bg-pink-100 dark:bg-pink-900/25 text-pink-700 dark:text-pink-300',
    },
    org_visit: {
        icon: <Building2 className="h-3 w-3" />,
        dotIcon: <Building2 className="h-2.5 w-2.5 text-white" />,
        label: 'Org Visit',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        dot: 'bg-amber-500',
        pill: 'bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-300',
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

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

    const [activeTab, setActiveTab] = useState<'pending' | 'tracker'>('pending');

    // User Tracker state
    const [trackerData, setTrackerData] = useState<UserTrackerData[]>([]);
    const [trackerLoading, setTrackerLoading] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [featureNames, setFeatureNames] = useState<Record<string, string>>({});

    const getFeatureName = (id: string | number | undefined): string => {
        if (!id) return '';
        return featureNames[String(id)] || '';
    };

    const loadTrackerData = async () => {
        setTrackerLoading(true);
        try {
            const response = await fetch(`${TRACKER_API}/userTracker/logs`);
            const result = await response.json();
            if (result.status === 1) {
                setTrackerData(result.data || []);
            }
        } catch (error) {
            console.error('Failed to load tracker data:', error);
        } finally {
            setTrackerLoading(false);
        }
    };

    const toggleUserExpand = (userId: string) => {
        setExpandedUsers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    // Fetch feature names from all known orgs and merge
    useEffect(() => {
        const fetchAllFeatureNames = async () => {
            const merged: Record<string, string> = {};
            await Promise.all([0, 1, 2, 3, 4, 5].map(async (orgId) => {
                try {
                    const res = await fetch(`${TRACKER_API}/dashboard/featuresList?organizationId=${orgId}`);
                    const data = await res.json();
                    if (data.status === 1 && data.data?.featureMap) {
                        Object.assign(merged, data.data.featureMap);
                    }
                } catch (_) { /* skip */ }
            }));
            setFeatureNames(merged);
        };
        fetchAllFeatureNames();
    }, []);

    // Get unique dashboards
    const uniqueDashboards = useMemo(() => {
        const s = new Set<string>();
        pendingUsers.forEach(u => s.add(u.dashboardName));
        return Array.from(s);
    }, [pendingUsers]);

    const filteredUsers = useMemo(() => {
        if (selectedDashboards.size === 0) return pendingUsers;
        return pendingUsers.filter(u => selectedDashboards.has(u.dashboardName));
    }, [pendingUsers, selectedDashboards]);

    // Tracker aggregate stats
    const trackerStats = useMemo(() => {
        const todayKey = getDayKey(Date.now());
        let totalEvents = 0;
        let todayEvents = 0;
        const activeUserIds = new Set<string>();
        for (const u of trackerData) {
            const deduped = deduplicateLogs(u.logs);
            totalEvents += deduped.length;
            for (const l of deduped) {
                if (getDayKey(l.timestamp) === todayKey) todayEvents++;
            }
            if (u.logs.length > 0) activeUserIds.add(u.userId);
        }
        return { totalUsers: activeUserIds.size, totalEvents, todayEvents };
    }, [trackerData]);

    // Redirect non-admins
    useEffect(() => {
        if (!isAdmin) {
            toast({ variant: 'destructive', title: 'Access Denied', description: "You don't have admin privileges." });
            navigate('/analytics');
        }
    }, [isAdmin, navigate, toast]);

    const loadPendingUsers = async () => {
        setIsRefreshing(true);
        try {
            const users = await getPendingUsers();
            const mapped = (users || []).map((u: any) => ({
                ...u,
                dashboardName: getDashboardName(u.dashboardId ?? u.dashboard_id)
            }));
            setPendingUsers(mapped);
        } catch (error) {
            console.error('Failed to load pending users:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isAdmin) loadPendingUsers();
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin && activeTab === 'tracker') loadTrackerData();
    }, [isAdmin, activeTab]);

    const handleAction = async (userId: number, action: 'approve' | 'reject', permissions?: any) => {
        const result = await adminAction(userId, action, permissions);
        if (result.success) {
            toast({
                title: action === 'approve' ? 'User Approved ✅' : 'Request Rejected',
                description: `Successfully ${action}ed user access request.`,
            });
            loadPendingUsers();
        } else {
            toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: result.message || 'Could not process request.',
            });
        }
    };

    const toggleDashboard = (dashboard: string) => {
        setSelectedDashboards(prev => {
            const s = new Set(prev);
            if (s.has(dashboard)) s.delete(dashboard); else s.add(dashboard);
            return s;
        });
    };

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/30 dark:to-amber-950/10">
            {/* Header */}
            <header className="border-b border-border/50 px-6 py-4 flex flex-wrap gap-4 justify-between items-center bg-card/95 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/analytics')} className="h-9 w-9">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <ShieldAlert className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Admin Access Panel</h1>
                            <p className="text-sm text-muted-foreground">Manage user access requests & activity</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tab Switcher */}
                    <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'pending' ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Pending ({filteredUsers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('tracker')}
                            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${activeTab === 'tracker' ? 'bg-blue-600 text-white' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                        >
                            <Activity className="h-4 w-4" />
                            User Tracker
                        </button>
                    </div>

                    {activeTab === 'pending' && <>
                        <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filter
                            {selectedDashboards.size > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs">{selectedDashboards.size}</span>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={loadPendingUsers} disabled={isRefreshing} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-500/30">
                            <Users className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{filteredUsers.length} Pending</span>
                        </div>
                    </>}

                    {activeTab === 'tracker' && (
                        <Button variant="outline" size="sm" onClick={loadTrackerData} disabled={trackerLoading} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${trackerLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
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
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedDashboards(new Set())}>
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
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${isSelected ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-amber-400` : 'bg-card border-border hover:border-amber-300'}`}
                                    >
                                        <Checkbox checked={isSelected} className="pointer-events-none" />
                                        <div className={`h-3 w-3 rounded-full ${colors.icon}`} />
                                        <span className={`font-semibold ${isSelected ? colors.text : 'text-foreground'}`}>{dashboard}</span>
                                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6">

                {/* ── User Tracker Tab ─────────────────────────────────────── */}
                {activeTab === 'tracker' && (
                    <div className="space-y-6">

                        {/* Section header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <Activity className="h-4.5 w-4.5 text-white h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">User Activity Tracker</h2>
                                    <p className="text-xs text-muted-foreground">Last 10 days · deduplicated</p>
                                </div>
                            </div>

                            {/* Aggregate stat pills */}
                            {trackerData.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                        <Users className="h-3.5 w-3.5" />
                                        <span className="font-bold">{trackerStats.totalUsers}</span>
                                        <span className="opacity-70">active users</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/25 text-violet-700 dark:text-violet-300 text-xs font-medium">
                                        <Zap className="h-3.5 w-3.5" />
                                        <span className="font-bold">{trackerStats.totalEvents}</span>
                                        <span className="opacity-70">total events</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        <span className="font-bold">{trackerStats.todayEvents}</span>
                                        <span className="opacity-70">today</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {trackerLoading ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm text-muted-foreground">Loading activity data…</p>
                                </div>
                            </div>
                        ) : trackerData.length === 0 ? (
                            <Card>
                                <CardContent className="py-20 text-center">
                                    <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                                    <h2 className="text-xl font-semibold text-muted-foreground">No Activity Yet</h2>
                                    <p className="text-muted-foreground mt-2 text-sm">User activity will appear here once users start using the dashboard.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {trackerData.map(userData => {
                                    const isExpanded = expandedUsers.has(userData.userId);
                                    const deduped = deduplicateLogs(userData.logs);

                                    const loginCount = deduped.filter(l => l.action === 'login').length;
                                    const featureVisitCount = deduped.filter(l => l.action === 'feature_visit').length;
                                    const aiChatCount = deduped.filter(l => l.action === 'ai_chat').length;
                                    const voiceChatCount = deduped.filter(l => l.action === 'voice_chat').length;
                                    const orgVisitCount = deduped.filter(l => l.action === 'org_visit').length;
                                    const uniqueFeatureCount = new Set(
                                        userData.logs.filter(l => l.featureId != null).map(l => String(l.featureId))
                                    ).size;
                                    const activeDays = new Set(userData.logs.map(l => getDayKey(l.timestamp))).size;
                                    const totalEvents = deduped.length;
                                    const lastLog = userData.logs[userData.logs.length - 1];

                                    const statPills = [
                                        { value: loginCount, label: 'Login', icon: <LogIn className="h-3 w-3" />, pill: ACTION_CONFIG.login.pill, show: loginCount > 0 },
                                        { value: featureVisitCount, label: 'Features', icon: <BarChart2 className="h-3 w-3" />, pill: ACTION_CONFIG.feature_visit.pill, show: featureVisitCount > 0 },
                                        { value: uniqueFeatureCount, label: 'Unique', icon: <Hash className="h-3 w-3" />, pill: 'bg-cyan-100 dark:bg-cyan-900/25 text-cyan-700 dark:text-cyan-300', show: uniqueFeatureCount > 0 },
                                        { value: aiChatCount, label: 'AI Chat', icon: <MessageSquare className="h-3 w-3" />, pill: ACTION_CONFIG.ai_chat.pill, show: aiChatCount > 0 },
                                        { value: voiceChatCount, label: 'Voice', icon: <Mic className="h-3 w-3" />, pill: ACTION_CONFIG.voice_chat.pill, show: voiceChatCount > 0 },
                                        { value: orgVisitCount, label: 'Orgs', icon: <Building2 className="h-3 w-3" />, pill: ACTION_CONFIG.org_visit.pill, show: orgVisitCount > 0 },
                                    ].filter(s => s.show);

                                    const dayGroups = isExpanded ? groupByDay([...deduped].reverse()) : [];

                                    return (
                                        <Card key={userData.userId} className="border-0 bg-card shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                                            {/* Accent bar */}
                                            <div className="h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500" />

                                            <CardContent className="p-5">
                                                {/* ── User header ──────────────────────────── */}
                                                <div
                                                    className="flex items-start justify-between gap-4 cursor-pointer select-none"
                                                    onClick={() => toggleUserExpand(userData.userId)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* Avatar */}
                                                        <div className="relative shrink-0">
                                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold text-white text-base">
                                                                {getUserInitials(userData.email)}
                                                            </div>
                                                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card" />
                                                        </div>

                                                        {/* Info */}
                                                        <div>
                                                            <p className="font-bold text-base text-foreground leading-tight">
                                                                {userData.email || `User ${userData.userId}`}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                ID #{userData.userId}
                                                                <span className="mx-1.5 opacity-40">·</span>
                                                                {activeDays} active day{activeDays !== 1 ? 's' : ''}
                                                                <span className="mx-1.5 opacity-40">·</span>
                                                                {totalEvents} events
                                                            </p>
                                                            {lastLog && (
                                                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 opacity-60" />
                                                                    Last seen: <span className="font-medium text-foreground/70">{formatLastSeen(lastLog.timestamp)}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: stat pills + chevron */}
                                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                                        {statPills.map((s, i) => (
                                                            <div key={i} className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', s.pill)}>
                                                                {s.icon}
                                                                <span className="font-bold">{s.value}</span>
                                                            </div>
                                                        ))}
                                                        <div className="ml-1 h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                            {isExpanded
                                                                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Stats grid ───────────────────────────── */}
                                                <div className="mt-4 flex flex-wrap gap-1.5">
                                                    {[
                                                        { icon: <LogIn className="h-3 w-3" />, label: 'Logins', value: loginCount, cls: 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400' },
                                                        { icon: <BarChart2 className="h-3 w-3" />, label: 'Feature Visits', value: featureVisitCount, cls: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-400' },
                                                        { icon: <Hash className="h-3 w-3" />, label: 'Unique Features', value: uniqueFeatureCount, cls: 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-400' },
                                                        { icon: <MessageSquare className="h-3 w-3" />, label: 'AI Chats', value: aiChatCount, cls: 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-400' },
                                                        { icon: <Mic className="h-3 w-3" />, label: 'Voice Chats', value: voiceChatCount, cls: 'bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/40 text-pink-700 dark:text-pink-400' },
                                                        { icon: <Building2 className="h-3 w-3" />, label: 'Org Visits', value: orgVisitCount, cls: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400' },
                                                        { icon: <Calendar className="h-3 w-3" />, label: 'Active Days', value: activeDays, cls: 'bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400' },
                                                    ].filter(s => s.value > 0).map((stat, i) => (
                                                        <div key={i} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium', stat.cls)}>
                                                            {stat.icon}
                                                            <span className="font-bold">{stat.value}</span>
                                                            <span className="opacity-60 hidden sm:inline">{stat.label}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* ── Timeline (expanded) ──────────────────── */}
                                                {isExpanded && (
                                                    <div className="mt-5 pt-5 border-t border-border/40 max-h-[500px] overflow-y-auto pr-1 space-y-5">
                                                        {dayGroups.map(({ dayKey, dayLabel, entries }) => (
                                                            <div key={dayKey}>
                                                                {/* Day header */}
                                                                <div className="flex items-center gap-3 mb-3 sticky top-0 bg-card/95 backdrop-blur-sm py-1 -mx-1 px-1 z-10">
                                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {dayLabel}
                                                                    </div>
                                                                    <div className="flex-1 h-px bg-border/50" />
                                                                    <span className="text-[10px] font-semibold text-muted-foreground/60 shrink-0">
                                                                        {entries.length} event{entries.length !== 1 ? 's' : ''}
                                                                    </span>
                                                                </div>

                                                                {/* Timeline entries */}
                                                                <div className="relative ml-2">
                                                                    {/* Vertical guide line */}
                                                                    <div className="absolute left-[10px] top-0 bottom-0 w-px bg-border/40" />

                                                                    <div className="space-y-0.5">
                                                                        {entries.map((log, idx) => {
                                                                            const cfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG] || {
                                                                                dotIcon: <Activity className="h-2.5 w-2.5 text-white" />,
                                                                                label: log.action,
                                                                                color: 'text-gray-600 dark:text-gray-400',
                                                                                dot: 'bg-gray-400',
                                                                            };
                                                                            const resolvedFeature = getFeatureName(log.featureId);
                                                                            const profileName = log.featureName && log.featureName !== String(log.featureId) ? log.featureName : null;

                                                                            return (
                                                                                <div key={idx} className="flex items-center gap-3 py-1.5 pl-1 pr-2 rounded-lg hover:bg-muted/40 transition-colors group/entry">
                                                                                    {/* Timeline dot */}
                                                                                    <div className={cn('h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 relative z-10 shadow-sm', cfg.dot)}>
                                                                                        {cfg.dotIcon}
                                                                                    </div>

                                                                                    {/* Action label */}
                                                                                    <span className={cn('text-xs font-semibold shrink-0', cfg.color)}>
                                                                                        {cfg.label}
                                                                                    </span>

                                                                                    {/* Feature / org name */}
                                                                                    {(resolvedFeature || profileName || log.featureName) && (
                                                                                        <span className="text-xs text-foreground/80 font-medium truncate flex-1">
                                                                                            {resolvedFeature || log.featureName}
                                                                                            {profileName && resolvedFeature && (
                                                                                                <span className="text-muted-foreground font-normal"> › {profileName}</span>
                                                                                            )}
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Spacer */}
                                                                                    {!resolvedFeature && !profileName && !log.featureName && <div className="flex-1" />}

                                                                                    {/* Duplicate count badge */}
                                                                                    {log.count > 1 && (
                                                                                        <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold shrink-0">
                                                                                            ×{log.count}
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Time */}
                                                                                    <span className="text-[11px] text-muted-foreground/70 shrink-0 font-mono tabular-nums">
                                                                                        {formatTime(log.timestamp)}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Pending Users Tab ────────────────────────────────────── */}
                {activeTab === 'pending' && (isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <Card className="border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
                        <CardContent className="py-16 text-center">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">All Caught Up!</h2>
                            <p className="text-green-600 dark:text-green-400 mt-2">
                                {selectedDashboards.size > 0 ? 'No pending requests for selected dashboards.' : 'No pending access requests at this time.'}
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
                                                <div className="flex items-start gap-4">
                                                    <div className={`h-14 w-14 rounded-xl ${dashboardColors.icon} flex items-center justify-center shadow-lg`}>
                                                        <User className="h-7 w-7 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold text-foreground">{pUser.username}</h3>
                                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg ${dashboardColors.bg} ${dashboardColors.border} border mt-2`}>
                                                            <Building2 className={`h-4 w-4 ${dashboardColors.text}`} />
                                                            <span className={`font-bold text-base ${dashboardColors.text}`}>{pUser.dashboardName}</span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-2">Requested: {new Date(pUser.createdAt).toLocaleString()}</p>
                                                    </div>
                                                </div>
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

                                            {pUser.requestedPermissions?.features && Object.keys(pUser.requestedPermissions.features).length > 0 && (
                                                <div className="mt-5 pt-5 border-t border-border/50">
                                                    <p className="text-sm font-medium text-muted-foreground mb-3">Requested Feature Access:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(pUser.requestedPermissions.features).map(([fid, access]) => (
                                                            <div key={fid} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border">
                                                                {access === 'write' ? <Edit3 className="h-3.5 w-3.5 text-amber-600" /> : <Eye className="h-3.5 w-3.5 text-blue-600" />}
                                                                <span className="font-medium text-foreground">{getFeatureName(fid) || `Feature ${fid}`}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${access === 'write' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
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
                ))}
            </main>
        </div>
    );
}
