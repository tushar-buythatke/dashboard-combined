import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useChartKeyboardNav } from '@/hooks/useAccessibility';
import { ChartErrorBoundary } from './components/ChartErrorBoundary';
import { InfoTooltip } from './components/InfoTooltip';
import { useSearchParams } from 'react-router-dom';
// Removed framer-motion for snappy performance
import type { DashboardProfile, EventConfig } from '@/types/analytics';
import { apiService, PLATFORMS, SOURCES } from '@/services/apiService';
import { mockService } from '@/services/mockData';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { SiteDetail } from '@/services/apiService';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Calendar as CalendarIcon, Edit, Sparkles, TrendingUp, TrendingDown, Activity, Zap, CheckCircle2, XCircle, BarChart3, ArrowUpRight, ArrowDownRight, Flame, Target, Hash, Maximize2, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, Navigation, Layers, X, AlertTriangle, Bell, Users, LayoutDashboard, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedCard, CardHeader as EnhancedCardHeader } from '@/components/ui/enhanced-card';
import { InteractiveButton, IconButton } from '@/components/ui/interactive-button';
import { StatBadge } from '@/components/ui/stat-badge';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { HeroGradientHeader } from '@/components/ui/hero-gradient-header';
import { StatWidgetCard, StatWidgetGrid } from '@/components/ui/stat-widget-card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ExpandedPieChartModal, type ExpandedPieData } from './components/ExpandedPieChartModal';
import { CriticalAlertsPanel } from './components/CriticalAlertsPanel';
import { DayWiseComparisonChart, HourlyDeviationChart, DailyAverageChart } from './components/ComparisonCharts';
import { PercentageGraph } from './charts/PercentageGraph';
import { FunnelGraph } from './charts/FunnelGraph';
import { UserFlowVisualization } from './charts/UserFlowVisualization';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ReferenceLine
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from './dashboardViewer/AnimatedNumber';
import { MiniSparkline } from './dashboardViewer/MiniSparkline';
import { CollapsibleLegend } from './dashboardViewer/CollapsibleLegend';
import { PieTooltip } from './dashboardViewer/PieTooltip';
import { CustomTooltip } from './dashboardViewer/CustomTooltip';
import { AdditionalPanelsSection } from './dashboardViewer/AdditionalPanelsSection';
import { MainPanelSection } from './dashboardViewer/MainPanelSection';
import { HourlyStatsCard } from './dashboardViewer/HourlyStatsCard';
import type { DashboardViewerProps, DateRangeState, EventKeyInfo, FilterState, PanelData } from './dashboardViewer/types';
import { combinePieChartDuplicates, ERROR_COLORS, EVENT_COLORS, PIE_COLORS, shouldShowPieChart } from './dashboardViewer/constants';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseTranscriptToFilters } from '@/services/aiService';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';

export type VoiceStatus = 'idle' | 'listening' | 'parsing' | 'applying' | 'done' | 'error';



// Left Sidebar Navigation Component (prepared for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __LeftSidebarNav = ({
    profileName,
    panels,
    activePanelId,
    onJumpToPanel,
    panelStats,
    isMainPanelApi
}: {
    profileName: string;
    panels: Array<{ panelId: string; panelName: string; chartType?: string; filterConfig?: { isApiEvent?: boolean; }; }>;
    activePanelId: string | null;
    onJumpToPanel: (panelId: string) => void;
    panelStats?: Record<string, { total: number; success: number; }>;
    isMainPanelApi?: boolean;
}) => {
    const [collapsed, setCollapsed] = useState(false);

    const getChartIcon = (chartType?: string) => {
        switch (chartType) {
            case 'bar': return <BarChart3 className="w-4 h-4" />;
            case 'line': return <TrendingUp className="w-4 h-4" />;
            default: return <Layers className="w-4 h-4" />;
        }
    };

    return (
        <div
            className={cn(
                "fixed left-0 top-20 h-[calc(100vh-5rem)] z-50 transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            <div className="h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700 shadow-xl flex flex-col">
                {/* Header with Profile Name */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                                        <Target className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Configuration</p>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{profileName}</h3>
                                            {/* API Event Indicator in Sidebar Profile Name */}
                                            {isMainPanelApi && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm flex-shrink-0">
                                                    API
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCollapsed(!collapsed)}
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>

                {/* Panel Navigation */}
                <div className="flex-1 overflow-y-auto py-2">
                    {!collapsed && (
                        <div className="px-4 py-2">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Navigation className="w-3 h-3" />
                                Panels ({panels.length})
                            </p>
                        </div>
                    )}

                    <div className="space-y-1 px-2">
                        {panels.map((panel, index) => {
                            const isActive = activePanelId === panel.panelId;
                            const stats = panelStats?.[panel.panelId];

                            return (
                                <button
                                    key={panel.panelId}
                                    onClick={() => onJumpToPanel(panel.panelId)}
                                    className={cn(
                                        "w-full text-left rounded-lg transition-all duration-200 group",
                                        collapsed ? "p-2" : "p-3",
                                        isActive
                                            ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 shadow-sm"
                                            : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-transparent"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex items-center justify-center rounded-lg transition-colors",
                                            collapsed ? "w-10 h-10" : "w-8 h-8",
                                            isActive
                                                ? "bg-purple-500 text-white shadow-md"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600"
                                        )}>
                                            <span className="text-sm font-bold">{index + 1}</span>
                                        </div>

                                        {!collapsed && (
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {getChartIcon(panel.chartType)}
                                                    <span className={cn(
                                                        "font-medium truncate text-sm",
                                                        isActive ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"
                                                    )}>
                                                        {panel.panelName || `Panel ${index + 1}`}
                                                    </span>
                                                    {/* API Event Indicator in Sidebar */}
                                                    {panel.filterConfig?.isApiEvent === true && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-sm">
                                                            API
                                                        </span>
                                                    )}
                                                </div>
                                                {stats && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-gray-500">
                                                            {stats.total.toLocaleString()} events
                                                        </span>
                                                        {stats.success > 0 && (
                                                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {Math.round((stats.success / stats.total) * 100)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!collapsed && isActive && (
                                            <div className="w-1.5 h-8 rounded-full bg-purple-500" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                {!collapsed && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>Click to jump to panel</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom X-Axis Tick Component for better date/time display
const CustomXAxisTick = ({ x, y, payload }: any) => {
    const value = payload?.value || '';

    // Parse the date string to extract parts
    let datePart = '';
    let timePart = '';

    if (value.includes(',')) {
        // Hourly format like "Nov 26, 6 PM"
        const parts = value.split(', ');
        datePart = parts[0] || ''; // "Nov 26"
        timePart = parts[1] || ''; // "6 PM"
    } else {
        // Daily format like "Nov 26"
        datePart = value;
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={12}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={10}
                fontWeight={500}
            >
                {datePart}
            </text>
            {timePart && (
                <text
                    x={0}
                    y={0}
                    dy={24}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize={9}
                >
                    {timePart}
                </text>
            )}
        </g>
    );
};

// Pie chart modal is now in its own component file

export function DashboardViewer({ profileId, onEditProfile, onAlertsUpdate, onPanelActive }: DashboardViewerProps) {
    // Theme and organization context
    const { currentTheme, isAutosnipe, themePalette } = useTheme();
    const { selectedOrganization } = useOrganization();

    const [profile, setProfile] = useState<DashboardProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
    });

    // Manual override for hourly/daily toggle (null = auto based on date range)
    const [hourlyOverride, setHourlyOverride] = useState<boolean | null>(null);

    // Compute isHourly based on date range (8 days or less = hourly) OR manual override
    const autoIsHourly = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 8;
    const isHourly = hourlyOverride !== null ? hourlyOverride : autoIsHourly;

    // Per-panel hourly override state (panelId -> boolean | null)
    // This allows each additional panel to have its own independent hourly/daily toggle
    const [panelHourlyOverride, setPanelHourlyOverride] = useState<Record<string, boolean | null>>({});

    const setPanelHourlyOverrideForId = useCallback((panelId: string, value: boolean | null) => {
        setPanelHourlyOverride(prev => ({
            ...prev,
            [panelId]: value
        }));
    }, []);

    // Expanded pie chart modal state
    const [expandedPie, setExpandedPie] = useState<ExpandedPieData | null>(null);
    const [pieModalOpen, setPieModalOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // API data
    const [events, setEvents] = useState<EventConfig[]>([]);
    const [siteDetails, setSiteDetails] = useState<SiteDetail[]>([]);

    // Multi-select filter state
    // Note: Empty array means "all" for any filter - API sends [] which backend treats as all
    const [filters, setFilters] = useState<FilterState>({
        platforms: [],  // Empty = all platforms
        pos: [],        // Empty = all POS
        sources: [],    // Empty = all sources
        events: []      // Empty = all events
    });

    // Individual panel filter change tracking
    const [panelFilterChanges, setPanelFilterChanges] = useState<Record<string, boolean>>({});

    // Chart data - now stored per panel
    const [graphData, setGraphData] = useState<any[]>([]);
    const [eventKeys, setEventKeys] = useState<EventKeyInfo[]>([]);
    const [pieChartData, setPieChartData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Critical Alerts state - Fully independent panel
    const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [alertsPage, setAlertsPage] = useState(0);
    const [alertsPanelCollapsed, setAlertsPanelCollapsed] = useState(true);
    const [alertSummary, setAlertSummary] = useState<Record<string, number>>({});
    const [alertIsApi, setAlertIsApi] = useState<number>(0); // 0 = Regular, 1 = API, 2 = Funnel/Percent - independent toggle
    const [alertIsHourly, setAlertIsHourly] = useState(true); // true = Hourly, false = Daily


    // Alert-specific filters (independent from main dashboard)
    const [alertFilters, setAlertFilters] = useState<{
        platforms: string[];
        pos: number[];
        sources: string[];
        events: number[];
    }>({
        platforms: [],
        pos: [],
        sources: [],
        events: []
    });
    const [alertDateRange, setAlertDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days default
        to: new Date()
    });

    // Multiple panels data storage
    const [panelsDataMap, setPanelsDataMap] = useState<Map<string, PanelData>>(new Map());

    // Panel-specific filters state (for user modifications - resets on refresh)
    const [panelFiltersState, setPanelFiltersState] = useState<Record<string, FilterState>>({});
    const [panelDateRanges, setPanelDateRanges] = useState<Record<string, DateRangeState>>({});
    const [panelLoading, setPanelLoading] = useState<Record<string, boolean>>({});

    // Chart type toggle for each panel - 'default' or 'deviation'
    const [panelChartType, setPanelChartType] = useState<Record<string, 'default' | 'deviation'>>({});

    // SourceStr (Job ID) filter - client-side only, not sent to API
    // Available sourceStr values extracted from graph data
    const [availableSourceStrs, setAvailableSourceStrs] = useState<string[]>([]);
    const [selectedSourceStrs, setSelectedSourceStrs] = useState<string[]>([]); // Empty = all
    const [availableStatusCodes, setAvailableStatusCodes] = useState<string[]>([]);
    const [availableCacheStatuses, setAvailableCacheStatuses] = useState<string[]>([]);
    const [loadingApiFilters, setLoadingApiFilters] = useState(false);
    // Per-panel API filter states
    const [panelLoadingApiFilters, setPanelLoadingApiFilters] = useState<Record<string, boolean>>({});
    const [panelAvailableStatusCodes, setPanelAvailableStatusCodes] = useState<Record<string, string[]>>({});
    const [panelAvailableCacheStatuses, setPanelAvailableCacheStatuses] = useState<Record<string, string[]>>({});
    const [_panelAvailableSourceStrs, setPanelAvailableSourceStrs] = useState<Record<string, string[]>>({});
    const [panelSelectedSourceStrs, _setPanelSelectedSourceStrs] = useState<Record<string, string[]>>({});

    // Store raw graph response for client-side filtering
    const [rawGraphResponse, setRawGraphResponse] = useState<any>(null);
    const [_panelRawGraphResponses, setPanelRawGraphResponses] = useState<Record<string, any>>({});

    // Panel navigation and UI state
    const [_activePanelId, setActivePanelId] = useState<string | null>(null);
    // Single-panel architecture: Only one panel is shown at a time
    const [activePanelIndex, setActivePanelIndex] = useState<number>(0); // 0 = main panel, 1+ = additional panels
    const [mainLegendExpanded, setMainLegendExpanded] = useState(false);
    const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
    const [apiSelectedEventKey, setApiSelectedEventKey] = useState<string | null>(null); // Independent selection for API Performance Metrics
    const [overlaySelectedEventKey, setOverlaySelectedEventKey] = useState<string | null>(null); // Independent selection for 8-Day Overlay
    const [avgSelectedEventKey, setAvgSelectedEventKey] = useState<string | null>(null); // Independent selection for Avg/Cost Trends
    const [errorSelectedEventKey, setErrorSelectedEventKey] = useState<string | null>(null); // Independent selection for Error Event Tracking
    const [panelLegendExpanded, setPanelLegendExpanded] = useState<Record<string, boolean>>({});
    const [panelSelectedEventKey, setPanelSelectedEventKey] = useState<Record<string, string | null>>({});
    const [panelAvgSelectedEventKey, setPanelAvgSelectedEventKey] = useState<Record<string, string | null>>({});
    const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // API event metric view - comprehensive metrics
    const [apiMetricView, setApiMetricView] = useState<'timing' | 'timing-breakdown' | 'timing-anomaly' | 'bytes' | 'bytes-in' | 'count'>('timing');
    const [panelApiMetricView, setPanelApiMetricView] = useState<Record<string, 'timing' | 'timing-breakdown' | 'timing-anomaly' | 'bytes' | 'bytes-in' | 'count'>>({});

    // Pinned tooltip for main chart - stores the data point to show in expanded view
    const [pinnedTooltip, setPinnedTooltip] = useState<{ dataPoint: any; label: string } | null>(null);

    // Pinned tooltips for panel charts - keyed by panelId
    const [panelPinnedTooltips, setPanelPinnedTooltips] = useState<Record<string, { dataPoint: any; label: string } | null>>({});

    // Zoom state for all panel graphs
    const [panelZoomLevels, setPanelZoomLevels] = useState<Record<string, number>>({});

    // Toast for panel navigation notifications
    const { toast } = useToast();

    // Toggle state for Event Trends vs 8-Day Overlay - main panel and per-panel
    const [showOverlayMain, setShowOverlayMain] = useState<boolean>(false);
    const [showOverlayPanel, setShowOverlayPanel] = useState<Record<string, boolean>>({});

    // Configurable auto-refresh (in minutes, 0 = disabled)
    const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<number>(0);
    const [pendingRefresh, setPendingRefresh] = useState<boolean>(false);
    const initialLoadComplete = useRef<boolean>(false);
    const lastAutoLoadedProfileId = useRef<string | null>(null);

    // Voice Recognition
    const { user } = useAnalyticsAuth();
    const isAdmin = user?.role === 1;

    const { isRecording, transcript, isSupported: isVoiceSupported, toggleRecording, tooltip: voiceTooltip } = useVoiceRecognition();
    const [isParsingVoice, setIsParsingVoice] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
    const [manualTranscript, setManualTranscript] = useState('');

    const lastAutoSentTranscript = useRef<string>('');

    // Sync manual transcript with recognition
    useEffect(() => {
        if (transcript) {
            const currentTranscript = transcript.toLowerCase();
            setManualTranscript(transcript);

            // Auto-send logic: detect keyword "auto send" at the end
            if (currentTranscript.endsWith('auto send') && transcript !== lastAutoSentTranscript.current) {
                lastAutoSentTranscript.current = transcript;
                const cleanText = transcript.slice(0, -9).trim();
                if (cleanText) {
                    handleVoiceTranscript(cleanText);
                }
            }
        }
    }, [transcript]);

    // Update status based on recording
    useEffect(() => {
        if (isRecording) {
            setVoiceStatus('listening');
        } else if (!isRecording) {
            // Only reset if we were previously listening
            setVoiceStatus(prev => prev === 'listening' ? 'idle' : prev);
        }
    }, [isRecording]);

    // Handle voice transcript automatically when it changes - REMOVED AUTO-CALL for manual control
    /*
    useEffect(() => {
        if (transcript) {
            handleVoiceTranscript(transcript);
        }
    }, [transcript]);
    */

    const handleVoiceTranscript = async (text: string) => {
        if (!text) return;
        setVoiceStatus('parsing');
        setIsParsingVoice(true);
        try {
            const options = {
                platforms: PLATFORMS,
                pos: siteDetails.map(s => ({ id: s.id, name: s.name })),
                sources: SOURCES,
                events: events.map(e => ({ id: Number(e.eventId), name: e.eventName }))
            };

            const result = await parseTranscriptToFilters(text, options, new Date().toISOString());

            if (result.explanation) {
                setVoiceStatus('applying');
                toast({
                    title: "AI Analysis Complete",
                    description: result.explanation,
                });
            }

            // Apply filters if present
            const panelToUpdate = profile?.panels?.[activePanelIndex];
            if (!panelToUpdate) return;
            const targetPanelId = panelToUpdate.panelId;

            let updatedPanel = JSON.parse(JSON.stringify(panelToUpdate)); // Deep clone for modifications
            let hasPanelConfigChange = false;

            // Handle Graph Type and Structure Changes
            if (result.graphType && result.graphType !== panelToUpdate.filterConfig?.graphType) {
                updatedPanel.filterConfig.graphType = result.graphType;
                hasPanelConfigChange = true;
            }

            if (result.percentageConfig) {
                updatedPanel.filterConfig.percentageConfig = {
                    ...updatedPanel.filterConfig.percentageConfig,
                    parentEvents: result.percentageConfig.parentEvents.map(String),
                    childEvents: result.percentageConfig.childEvents.map(String)
                };
                hasPanelConfigChange = true;
            }

            if (result.funnelConfig) {
                updatedPanel.filterConfig.funnelConfig = {
                    ...updatedPanel.filterConfig.funnelConfig,
                    stages: result.funnelConfig.stages.map(s => ({ eventId: String(s.eventId) })),
                    multipleChildEvents: result.funnelConfig.multipleChildEvents.map(String)
                };
                hasPanelConfigChange = true;
            }

            if (result.userFlowConfig) {
                updatedPanel.filterConfig.userFlowConfig = {
                    ...updatedPanel.filterConfig.userFlowConfig,
                    stages: result.userFlowConfig.stages.map((s, idx) => ({
                        id: `stage-${Date.now()}-${idx}`,
                        label: s.label,
                        eventIds: s.eventIds.map(String)
                    }))
                };
                hasPanelConfigChange = true;
            }

            if (hasPanelConfigChange) {
                setProfile(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        panels: prev.panels.map(p => p.panelId === targetPanelId ? updatedPanel : p)
                    };
                });
            }

            const currentFilters = panelFiltersState[targetPanelId] || {
                platforms: [],
                pos: [],
                sources: [],
                events: []
            };

            // Extract filters - AI may return them nested in a 'filters' object or at root level
            const aiFilters = result.filters || result;

            // Helper function to extract IDs from filter arrays
            // AI may return [{id: 111, name: "Myntra"}] or just [111]
            const extractIds = (arr: any[] | undefined): number[] => {
                if (!arr || !Array.isArray(arr)) return [];
                return arr.map(item => {
                    // If it's an object with an id property, extract the id
                    if (typeof item === 'object' && item !== null && 'id' in item) {
                        return Number(item.id);
                    }
                    // Otherwise, assume it's already a number
                    return Number(item);
                }).filter(id => !isNaN(id));
            };

            const mergedFilters: FilterState = {
                ...currentFilters,
                // Default to empty (All) for these categories if AI doesn't mention them
                platforms: extractIds(aiFilters.platforms),
                pos: extractIds(aiFilters.pos),
                sources: extractIds(aiFilters.sources),
                events: extractIds(aiFilters.events).length > 0 ? extractIds(aiFilters.events) : currentFilters.events,
                // Setting to currentFilters.events if not mentioned, 
                // but if AI asks for a specific graph, it will override this anyway.

                // Reset overrides if structure changed
                ...(hasPanelConfigChange && {
                    activeStages: undefined,
                    activePercentageEvents: undefined,
                    activePercentageChildEvents: undefined,
                    activeFunnelChildEvents: undefined
                })
            };

            setPanelFiltersState(prev => ({
                ...prev,
                [targetPanelId]: mergedFilters
            }));

            // Clear the transcript and show success
            setManualTranscript('');
            setVoiceStatus('done');
            toast({
                title: "Voice AI: SUCCESS!",
                description: result.explanation || "Filters applied successfully.",
            });

            let targetDateRange: DateRangeState | undefined = undefined;
            const aiDateRange = aiFilters.dateRange || result.dateRange;
            if (aiDateRange) {
                targetDateRange = {
                    from: new Date(aiDateRange.from),
                    to: new Date(aiDateRange.to)
                };
                if (activePanelIndex === 0) {
                    setDateRange(targetDateRange);
                }
                setPanelDateRanges(prev => ({ ...prev, [targetPanelId]: targetDateRange! }));
            }

            // Trigger data refresh for the specific panel targeted with merged filters AND direct date range override
            setPendingRefresh(false);
            // Pass the updatedPanel directly to refreshPanelData to avoid waiting for state sync
            refreshPanelData(targetPanelId, mergedFilters, targetDateRange, hasPanelConfigChange ? updatedPanel : undefined);
            setPanelFilterChanges(prev => ({
                ...prev,
                [targetPanelId]: false
            }));

            setVoiceStatus('done');

            // Reset status after a delay
            setTimeout(() => setVoiceStatus('idle'), 3000);

        } catch (err: any) {
            console.error("Failed to parse voice command:", err);
            setVoiceStatus('error');

            // Clear the transcript to reset UI
            setManualTranscript('');

            // Check if error is related to API quota/key exhaustion
            const errorMessage = err?.message || err?.toString() || '';
            const errorStatus = err?.status || 0;
            const isApiKeyError =
                errorStatus === 429 ||
                errorStatus === 403 ||
                errorStatus === 500 ||
                errorMessage.includes('quota') ||
                errorMessage.includes('exceeded') ||
                errorMessage.includes('429') ||
                errorMessage.includes('403') ||
                errorMessage.includes('API key') ||
                errorMessage.includes('billing');

            toast({
                title: isApiKeyError ? "API Key Exhausted!" : "Voice Error",
                description: isApiKeyError
                    ? "The AI service quota has been exceeded. Please try again later or contact support."
                    : "Failed to understand the command. Please try again.",
                variant: "destructive"
            });
            setTimeout(() => setVoiceStatus('idle'), 3000);
        } finally {
            setIsParsingVoice(false);
        }
    };

    // Track last time we sent uploadChildConfig (to send once per hour)
    const lastConfigUploadTime = useRef<number>(0);

    // Zoom handlers for panel graphs
    const handlePanelZoom = (panelId: string, action: 'in' | 'out' | 'reset') => {
        setPanelZoomLevels(prev => {
            const current = prev[panelId] || 1;
            if (action === 'in') return { ...prev, [panelId]: Math.min(current + 0.2, 5) };
            if (action === 'out') return { ...prev, [panelId]: Math.max(current - 0.2, 0.5) };
            return { ...prev, [panelId]: 1 };
        });
    };

    const handlePanelWheel = (panelId: string, e: React.WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        setPanelZoomLevels(prev => ({
            ...prev,
            [panelId]: Math.max(0.5, Math.min(5, (prev[panelId] || 1) + delta))
        }));
    };

    // Filter panel collapse state - collapsed by default (main dashboard only)
    const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(true); // Default to collapsed for cleaner UI

    // Panel-specific filter collapse states - collapsed by default for new panels
    const [panelFiltersCollapsed, setPanelFiltersCollapsed] = useState<Record<string, boolean>>({});

    // Memoize isMainPanelApi to prevent infinite re-render loop
    // MUST be at top level, not inside conditional logic
    const isMainPanelApi = useMemo(() => {
        const mainPanelConfig = profile?.panels?.[0]?.filterConfig;
        return mainPanelConfig?.isApiEvent === true;
    }, [profile?.panels]);

    const eventConfigById = useMemo(() => {
        const map = new Map<string, EventConfig>();
        events.forEach((e) => {
            map.set(String(e.eventId), e);
        });
        return map;
    }, [events]);

    // Initialize alertIsApi from profile automatically
    useEffect(() => {
        if (!profile) return;

        // Read from first panel's alertsConfig
        const firstPanel = profile.panels[0];
        const panelAlertConfig = firstPanel?.alertsConfig;

        // If panel explicitly defines isApi for alerts, use it
        if (panelAlertConfig?.isApi !== undefined) {
            setAlertIsApi(typeof panelAlertConfig.isApi === 'number' ? panelAlertConfig.isApi : (panelAlertConfig.isApi ? 1 : 0));
        } else {
            // Otherwise fallback to whether the main panel is an API panel
            setAlertIsApi(isMainPanelApi ? 1 : 0);
        }

        // Initialize isHourly from panel config
        if (panelAlertConfig?.isHourly !== undefined) {
            setAlertIsHourly(panelAlertConfig.isHourly);
        } else {
            setAlertIsHourly(true);
        }
    }, [profile, isMainPanelApi]);

    // Force isHourly to false if date range > 7 days
    useEffect(() => {
        const diffInDays = (alertDateRange.to.getTime() - alertDateRange.from.getTime()) / (1000 * 60 * 60 * 24);
        if (diffInDays > 7 && alertIsHourly) {
            setAlertIsHourly(false);
        }
    }, [alertDateRange, alertIsHourly]);

    // Map of eventId -> panelId for drill-down support
    const eventToPanelMap = useMemo(() => {
        const map: Record<string, string> = {};
        profile?.panels?.forEach(panel => {
            panel.events?.forEach((ev: any) => {
                map[String(ev.eventId)] = panel.panelId;
            });
            // Handle special graphs (percentage, funnel)
            if (panel.specialGraph) {
                if (panel.specialGraph.type === 'percentage') {
                    panel.specialGraph.parentEvents?.forEach(id => map[String(id)] = panel.panelId);
                    panel.specialGraph.childEvents?.forEach(id => map[String(id)] = panel.panelId);
                } else if (panel.specialGraph.type === 'funnel') {
                    panel.specialGraph.stages?.forEach(s => map[String(s.eventId)] = panel.panelId);
                    panel.specialGraph.multipleChildEvents?.forEach(id => map[String(id)] = panel.panelId);
                }
            }
        });
        return map;
    }, [profile]);

    // Scroll Spy: Notify parent of active panel
    // Track if we've already set the initial active panel for this profile
    const initialPanelSetRef = useRef<string | null>(null);

    useEffect(() => {
        if (!onPanelActive || !profile?.panels?.length) return;

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -40% 0px', // More sensitive tracking
            threshold: [0, 0.1, 0.5] // Multiple thresholds for better detection
        };

        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0) {
                    const panelId = entry.target.getAttribute('data-panel-id');
                    if (panelId) {
                        onPanelActive(panelId);
                        setActivePanelId(panelId);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersect, observerOptions);

        // Reduced delay for faster tracking
        const timeout = setTimeout(() => {
            Object.entries(panelRefs.current).forEach(([id, element]) => {
                if (element) {
                    if (!element.getAttribute('data-panel-id')) {
                        element.setAttribute('data-panel-id', id);
                    }
                    observer.observe(element);
                }
            });

            // Set initial active panel ONLY on first load or when profileId changes
            // NOT on every profile.panels update (which happens when filterConfig changes)
            if (profile.panels.length > 0 && initialPanelSetRef.current !== profileId) {
                const firstPanelId = profile.panels[0].panelId;
                // console.log('📍 Setting initial active panel:', firstPanelId);
                onPanelActive(firstPanelId);
                setActivePanelId(firstPanelId);
                setActivePanelIndex(0);
                initialPanelSetRef.current = profileId;
            }
        }, 100); // Reduced from 500ms to 100ms

        return () => {
            observer.disconnect();
            clearTimeout(timeout);
        };
    }, [profile?.panels, onPanelActive, profileId]);

    // API Performance Metrics filtered data
    const filteredApiData = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels[0]) return graphData;

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const statusCodes = (mainPanelFilters.percentageStatusCodes || []).filter(Boolean);
        const cacheStatuses = (mainPanelFilters.percentageCacheStatus || []).filter(Boolean);
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        if (!hasStatusFilter && !hasCacheFilter) return graphData;

        // Pre-calculate suffixes to avoid nested loops and repetitive string generation inside the map
        const suffixes: { suffix: string; countSuffix: string; avgServerToUserSuffix: string; avgServerToCloudSuffix: string; avgCloudToUserSuffix: string; avgBytesOutSuffix: string; avgBytesInSuffix: string }[] = [];

        const addSuffix = (suffix: string) => {
            suffixes.push({
                suffix,
                countSuffix: `${suffix}_count`,
                avgServerToUserSuffix: `${suffix}_avgServerToUser`,
                avgServerToCloudSuffix: `${suffix}_avgServerToCloud`,
                avgCloudToUserSuffix: `${suffix}_avgCloudToUser`,
                avgBytesOutSuffix: `${suffix}_avgBytesOut`,
                avgBytesInSuffix: `${suffix}_avgBytesIn`
            });
        };

        if (hasStatusFilter && hasCacheFilter) {
            statusCodes.forEach((status: any) => {
                cacheStatuses.forEach((cache: any) => {
                    addSuffix(`_status_${status}_cache_${cache}`);
                });
            });
        } else if (hasStatusFilter) {
            statusCodes.forEach((status: any) => {
                addSuffix(`_status_${status}`);
            });
        } else if (hasCacheFilter) {
            cacheStatuses.forEach((cache: any) => {
                addSuffix(`_cache_${cache}`);
            });
        }

        return graphData.map(record => {
            const filteredRecord = { ...record };

            eventKeys.forEach(eventKeyInfo => {
                const eventKey = eventKeyInfo.eventKey;

                let filteredCount = 0;
                let filteredAvgServerToUser = 0;
                let filteredAvgServerToCloud = 0;
                let filteredAvgCloudToUser = 0;
                let filteredAvgBytesOut = 0;
                let filteredAvgBytesIn = 0;
                let filterCount = 0;

                // Single loop over pre-calculated suffixes
                for (let i = 0; i < suffixes.length; i++) {
                    const { countSuffix, avgServerToUserSuffix, avgServerToCloudSuffix, avgCloudToUserSuffix, avgBytesOutSuffix, avgBytesInSuffix } = suffixes[i];

                    // Construct keys using base eventKey and pre-calc suffixes
                    const countKey = `${eventKey}${countSuffix}`;
                    const count = Number(record[countKey] || 0);

                    if (count > 0) {
                        filteredCount += count;
                        filteredAvgServerToUser += Number(record[`${eventKey}${avgServerToUserSuffix}`] || 0) * count;
                        filteredAvgServerToCloud += Number(record[`${eventKey}${avgServerToCloudSuffix}`] || 0) * count;
                        filteredAvgCloudToUser += Number(record[`${eventKey}${avgCloudToUserSuffix}`] || 0) * count;
                        filteredAvgBytesOut += Number(record[`${eventKey}${avgBytesOutSuffix}`] || 0) * count;
                        filteredAvgBytesIn += Number(record[`${eventKey}${avgBytesInSuffix}`] || 0) * count;
                        filterCount += count;
                    }
                }

                // Calculate weighted averages - only update if we have filtered data
                if (filterCount > 0) {
                    filteredRecord[`${eventKeyInfo.eventKey}_count`] = filteredCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgServerToUser`] = filteredAvgServerToUser / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgServerToCloud`] = filteredAvgServerToCloud / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgCloudToUser`] = filteredAvgCloudToUser / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgBytesOut`] = filteredAvgBytesOut / filterCount;
                    filteredRecord[`${eventKeyInfo.eventKey}_avgBytesIn`] = filteredAvgBytesIn / filterCount;
                }
            });

            return filteredRecord;
        });
    }, [graphData, eventKeys, events, isMainPanelApi, profile, panelFiltersState]);

    const panelApiPerformanceSeriesMap = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (!profile?.panels || profile.panels.length <= 1) return map;

        const buildFromRaw = (rawData: any[], statusCodes: string[], cacheStatuses: string[], isHourlyBucket: boolean, isSpecialGraph: boolean) => {
            const hasStatus = statusCodes.length > 0;
            const hasCache = cacheStatuses.length > 0;
            const timeMap = new Map<string, any>();
            const usedKeys = new Set<string>();

            rawData.forEach((r: any) => {
                if (!r?.timestamp) return;
                const dt = new Date(r.timestamp);
                const dateKey = isHourlyBucket
                    ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                    : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (!timeMap.has(dateKey)) timeMap.set(dateKey, { date: dateKey, timestamp: r.timestamp });
                const entry = timeMap.get(dateKey);

                const matchesStatus = !hasStatus || (r.status !== undefined && statusCodes.includes(String(r.status)));
                const matchesCache = !hasCache || cacheStatuses.includes(String(r.cacheStatus || 'none'));
                // When status is undefined (aggregated data), always match if no filter is applied
                if (r.status !== undefined && (!matchesStatus || !matchesCache)) return;

                let eventKey: string;
                if (isSpecialGraph) {
                    if (r.status !== undefined) {
                        eventKey = `status_${r.status}`;
                    } else if (r.cacheStatus) {
                        eventKey = `cache_${r.cacheStatus}`;
                    } else {
                        // Fallback: use eventId-based key when status is aggregated
                        const eventId = String(r.eventId);
                        const eventConfig = eventConfigById.get(eventId);
                        const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                            ? `${eventConfig.host} - ${eventConfig.url}`
                            : (eventConfig?.eventName || `Event ${eventId}`);
                        eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
                    }
                } else {
                    const eventId = String(r.eventId);
                    const eventConfig = eventConfigById.get(eventId);
                    const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                        ? `${eventConfig.host} - ${eventConfig.url}`
                        : (eventConfig?.eventName || `Event ${eventId}`);
                    eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
                }
                usedKeys.add(eventKey);

                const count = Number(r.count || 0);
                if (!entry[`${eventKey}_sumCount`]) {
                    entry[`${eventKey}_count`] = 0;
                    entry[`${eventKey}_sumCount`] = 0;
                    entry[`${eventKey}_avgServerToUser_sum`] = 0;
                    entry[`${eventKey}_avgServerToCloud_sum`] = 0;
                    entry[`${eventKey}_avgCloudToUser_sum`] = 0;
                    entry[`${eventKey}_avgBytesOut_sum`] = 0;
                    entry[`${eventKey}_avgBytesIn_sum`] = 0;
                }

                const rawServerToUser = Number(r.avgServerToUser || 0);
                const rawServerToCloud = Number(r.avgServerToCloud || 0);
                const rawCloudToUser = Number(r.avgCloudToUser || 0);
                const sumParts = rawServerToCloud + rawCloudToUser;
                const effectiveServerToUser = rawServerToUser > 0 ? rawServerToUser : (sumParts > 0 ? sumParts : 0);

                const isSuccess = r.status ? (parseInt(r.status) >= 200 && parseInt(r.status) < 300) : true;
                if (!entry[`${eventKey}_success`]) {
                    entry[`${eventKey}_success`] = 0;
                    entry[`${eventKey}_fail`] = 0;
                }

                entry[`${eventKey}_count`] += count;
                entry[`${eventKey}_sumCount`] += count;
                if (isSuccess) entry[`${eventKey}_success`] += count;
                else entry[`${eventKey}_fail`] += count;

                entry[`${eventKey}_avgServerToUser_sum`] += effectiveServerToUser * count;
                entry[`${eventKey}_avgServerToCloud_sum`] += rawServerToCloud * count;
                entry[`${eventKey}_avgCloudToUser_sum`] += rawCloudToUser * count;
                entry[`${eventKey}_avgBytesOut_sum`] += Number(r.avgBytesOut || 0) * count;
                entry[`${eventKey}_avgBytesIn_sum`] += Number(r.avgBytesIn || 0) * count;
            });

            return Array.from(timeMap.values())
                .map((entry) => {
                    const out = { ...entry } as any;
                    usedKeys.forEach((k) => {
                        const denom = Number(out[`${k}_sumCount`] || 0);
                        if (denom > 0) {
                            out[`${k}_avgServerToUser`] = Number(out[`${k}_avgServerToUser_sum`] || 0) / denom;
                            out[`${k}_avgServerToCloud`] = Number(out[`${k}_avgServerToCloud_sum`] || 0) / denom;
                            out[`${k}_avgCloudToUser`] = Number(out[`${k}_avgCloudToUser_sum`] || 0) / denom;
                            out[`${k}_avgBytesOut`] = Number(out[`${k}_avgBytesOut_sum`] || 0) / denom;
                            out[`${k}_avgBytesIn`] = Number(out[`${k}_avgBytesIn_sum`] || 0) / denom;
                        }
                        delete out[`${k}_sumCount`];
                        delete out[`${k}_avgServerToUser_sum`];
                        delete out[`${k}_avgServerToCloud_sum`];
                        delete out[`${k}_avgCloudToUser_sum`];
                        delete out[`${k}_avgBytesOut_sum`];
                        delete out[`${k}_avgBytesIn_sum`];
                    });
                    return out;
                })
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        };

        profile.panels.slice(1).forEach((p: any) => {
            const panelId = p.panelId;
            const panelConfig = (p as any).filterConfig;
            if (!panelConfig?.isApiEvent) return;

            const rawData: any[] = (panelsDataMap.get(panelId)?.rawGraphResponse?.data || []) as any[];
            if (rawData.length === 0) {
                map[panelId] = [];
                return;
            }

            const pf = panelFiltersState[panelId] || {} as any;
            const statusCodes = (pf.percentageStatusCodes || [])
                .filter(Boolean)
                .map((v: any) => String(v))
                .filter((v: string) => /^\d+$/.test(v));
            const cacheStatuses = (pf.percentageCacheStatus || []).filter(Boolean).map((v: any) => String(v));
            const panelRange = panelDateRanges[panelId] || dateRange;
            const isHourlyBucket = Math.ceil((panelRange.to.getTime() - panelRange.from.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
            const isSpecialGraph = panelConfig?.graphType === 'percentage' || panelConfig?.graphType === 'funnel';

            map[panelId] = buildFromRaw(rawData, statusCodes, cacheStatuses, isHourlyBucket, isSpecialGraph);
        });

        return map;
    }, [profile?.panels, panelsDataMap, panelFiltersState, panelDateRanges, dateRange, eventConfigById]);

    const apiEndpointEventKeyInfos = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return [] as EventKeyInfo[];

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelConfig = (profile.panels[0] as any)?.filterConfig;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const isPercentageOrFunnel = mainPanelConfig?.graphType === 'percentage' || mainPanelConfig?.graphType === 'funnel';

        // For percentage/funnel graphs, show status codes instead of endpoint names
        if (isPercentageOrFunnel) {
            // Parent = all success status codes (2xx)
            // Child = selected status codes | cache status
            const allStatusCodes = new Set<string>();
            const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];

            // Extract all status codes from raw data (success codes = 2xx)
            rawData.forEach((r: any) => {
                if (r.status) {
                    allStatusCodes.add(String(r.status));
                }
            });

            const successCodes = Array.from(allStatusCodes).filter(code => {
                const codeNum = parseInt(code, 10);
                return codeNum >= 200 && codeNum < 300;
            }).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            const selectedStatusCodes = (mainPanelFilters.percentageStatusCodes || []).filter(Boolean).map((v: any) => String(v));
            const selectedCacheStatus = (mainPanelFilters.percentageCacheStatus || []).filter(Boolean).map((v: any) => String(v));

            // Build parent event keys (all success codes)
            const parentKeys: EventKeyInfo[] = successCodes.map((code) => ({
                eventId: `status_${code}`,
                eventName: `Status ${code}`,
                eventKey: `status_${code}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
            }));

            // Build child event keys (selected status codes | cache)
            const childKeys: EventKeyInfo[] = [];
            if (selectedStatusCodes.length > 0) {
                selectedStatusCodes.forEach((code: string) => {
                    childKeys.push({
                        eventId: `status_${code}`,
                        eventName: `Status ${code}`,
                        eventKey: `status_${code}`,
                        isErrorEvent: 0,
                        isAvgEvent: 0,
                    });
                });
            }
            if (selectedCacheStatus.length > 0) {
                selectedCacheStatus.forEach((cache: string) => {
                    childKeys.push({
                        eventId: `cache_${cache}`,
                        eventName: `Cache: ${cache}`,
                        eventKey: `cache_${cache}`,
                        isErrorEvent: 0,
                        isAvgEvent: 0,
                    });
                });
            }

            // Return combined - deduplicate by eventKey to prevent duplicates (e.g., Status 200 in both parent and child)
            const combined = [...parentKeys, ...childKeys];
            const deduped = Array.from(
                new Map(combined.map(item => [item.eventKey, item])).values()
            );
            return deduped;
        }

        // Regular mode: show endpoint names
        const selectedEventIds = (mainPanelFilters.events && mainPanelFilters.events.length > 0)
            ? mainPanelFilters.events
            : (mainPanelConfig?.events || []);

        const ids = (selectedEventIds || []).map((v: any) => String(v)).filter(Boolean);
        const result = ids.map((id: string) => {
            const ev = eventConfigById.get(String(id));
            const name = ev?.isApiEvent && ev?.host && ev?.url
                ? `${ev.host} - ${ev.url}`
                : (ev?.eventName || `Event ${id}`);
            return {
                eventId: String(id),
                eventName: name,
                // IMPORTANT: Include _${eventId} suffix to match apiPerformanceSeries data keys
                eventKey: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
            };
        });

        return result;
    }, [isMainPanelApi, profile?.panels, panelFiltersState, eventConfigById, panelsDataMap, rawGraphResponse]);

    // Separate eventKey source for API Performance Metrics - ALWAYS uses endpoint-based keys
    // regardless of whether main graph is percentage/funnel
    const apiPerformanceEventKeys = useMemo((): EventKeyInfo[] => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return [];

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelConfig = (profile.panels[0] as any)?.filterConfig;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};

        // ALWAYS use endpoint-based keys for API Performance Metrics
        const selectedEventIds = (mainPanelFilters.events && mainPanelFilters.events.length > 0)
            ? mainPanelFilters.events
            : (mainPanelConfig?.events || []);

        const ids = (selectedEventIds || []).map((v: any) => String(v)).filter(Boolean);
        const keysResult = ids.map((id: string) => {
            const ev = eventConfigById.get(String(id));
            const name = ev?.isApiEvent && ev?.host && ev?.url
                ? `${ev.host} - ${ev.url}`
                : (ev?.eventName || `Event ${id}`);
            return {
                eventId: String(id),
                eventName: name,
                eventKey: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
            };
        });

        return keysResult;
    }, [isMainPanelApi, profile?.panels, panelFiltersState, eventConfigById]);

    // Build API Performance Metrics series directly from RAW API response so it works even in percentage/funnel views
    const apiPerformanceSeries = useMemo(() => {
        if (!isMainPanelApi || !profile?.panels?.[0]) return graphData;

        const firstPanel = profile?.panels?.[0];
        const firstPanelFilterConfig = (firstPanel as any)?.filterConfig;
        const isFirstPanelSpecialGraphLocal = firstPanelFilterConfig?.graphType === 'percentage' || firstPanelFilterConfig?.graphType === 'funnel' || firstPanelFilterConfig?.graphType === 'user_flow';

        const mainPanelId = profile.panels[0].panelId;
        const mainPanelFilters = panelFiltersState[mainPanelId] || {};
        const statusCodes = ((isFirstPanelSpecialGraphLocal
            ? (mainPanelFilters.percentageStatusCodes || [])
            : (mainPanelFilters.apiStatusCodes || mainPanelFilters.percentageStatusCodes || [])) as any[])
            .filter(Boolean)
            .map(v => String(v))
            .filter(v => /^\d+$/.test(v));
        const cacheStatuses = ((isFirstPanelSpecialGraphLocal
            ? (mainPanelFilters.percentageCacheStatus || [])
            : (mainPanelFilters.apiCacheStatus || mainPanelFilters.percentageCacheStatus || [])) as any[])
            .filter(Boolean)
            .map(v => String(v));
        const hasStatusFilter = statusCodes.length > 0;
        const hasCacheFilter = cacheStatuses.length > 0;

        const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];
        if (!rawData || rawData.length === 0) return graphData;

        // Group by hour/day
        const timeMap = new Map<string, any>();
        const usedKeys = new Set<string>();
        rawData.forEach((r) => {
            if (!r || !r.timestamp) return;
            const dt = new Date(r.timestamp);
            const dateKey = isHourly
                ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true })
                : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!timeMap.has(dateKey)) {
                timeMap.set(dateKey, { date: dateKey, timestamp: r.timestamp });
            }
            const entry = timeMap.get(dateKey);

            const matchesStatus = !hasStatusFilter || (r.status !== undefined && statusCodes.includes(String(r.status)));
            const matchesCache = !hasCacheFilter || cacheStatuses.includes(String(r.cacheStatus || 'none'));
            // When status is undefined (aggregated data), always match if no filter is applied
            if (r.status !== undefined && (!matchesStatus || !matchesCache)) return;

            // In percentage/funnel mode, aggregate by status/cache instead of by event endpoint
            let eventKey: string;
            if (isFirstPanelSpecialGraphLocal) {
                // Use status code or cache status as the key
                if (r.status !== undefined) {
                    eventKey = `status_${r.status}`;
                } else if (r.cacheStatus) {
                    eventKey = `cache_${r.cacheStatus}`;
                } else {
                    // Fallback: use eventId-based key when status is aggregated
                    const eventId = String(r.eventId);
                    const eventConfig = eventConfigById.get(eventId);
                    const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                        ? `${eventConfig.host} - ${eventConfig.url}`
                        : (eventConfig?.eventName || `Event ${eventId}`);
                    eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
                }
            } else {
                // Regular mode: use event endpoint name
                const eventId = String(r.eventId);
                const eventConfig = eventConfigById.get(eventId);
                const baseName = eventConfig?.isApiEvent && eventConfig?.host && eventConfig?.url
                    ? `${eventConfig.host} - ${eventConfig.url}`
                    : (eventConfig?.eventName || `Event ${eventId}`);
                eventKey = `${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}`;
            }
            usedKeys.add(eventKey);

            const count = Number(r.count || 0);
            if (!entry[`${eventKey}_count`]) {
                entry[`${eventKey}_count`] = 0;
                entry[`${eventKey}_sumCount`] = 0;
                entry[`${eventKey}_avgServerToUser_sum`] = 0;
                entry[`${eventKey}_avgServerToCloud_sum`] = 0;
                entry[`${eventKey}_avgCloudToUser_sum`] = 0;
                entry[`${eventKey}_avgBytesOut_sum`] = 0;
                entry[`${eventKey}_avgBytesIn_sum`] = 0;
            }

            const isSuccess = r.status ? (parseInt(r.status) >= 200 && parseInt(r.status) < 300) : true;
            if (!entry[`${eventKey}_success`]) {
                entry[`${eventKey}_success`] = 0;
                entry[`${eventKey}_fail`] = 0;
            }

            entry[`${eventKey}_count`] += count;
            entry[`${eventKey}_sumCount`] += count;
            if (isSuccess) entry[`${eventKey}_success`] += count;
            else entry[`${eventKey}_fail`] += count;

            // avgServerToUser is authoritative (ms). Only fall back to sum of parts when avgServerToUser is 0.
            const rawServerToUser = Number(r.avgServerToUser || 0);
            const rawServerToCloud = Number(r.avgServerToCloud || 0);
            const rawCloudToUser = Number(r.avgCloudToUser || 0);
            const sumParts = rawServerToCloud + rawCloudToUser;
            const effectiveServerToUser = rawServerToUser > 0 ? rawServerToUser : (sumParts > 0 ? sumParts : 0);
            entry[`${eventKey}_avgServerToUser_sum`] += effectiveServerToUser * count;
            entry[`${eventKey}_avgServerToCloud_sum`] += Number(r.avgServerToCloud || 0) * count;
            entry[`${eventKey}_avgCloudToUser_sum`] += Number(r.avgCloudToUser || 0) * count;
            entry[`${eventKey}_avgBytesOut_sum`] += Number(r.avgBytesOut || 0) * count;
            entry[`${eventKey}_avgBytesIn_sum`] += Number(r.avgBytesIn || 0) * count;
        });

        const result = Array.from(timeMap.values())
            .map((entry) => {
                const out = { ...entry } as any;
                // finalize weighted averages
                usedKeys.forEach((key) => {
                    const denom = Number(out[`${key}_sumCount`] || 0);
                    if (denom > 0) {
                        out[`${key}_avgServerToUser`] = Number(out[`${key}_avgServerToUser_sum`] || 0) / denom;
                        out[`${key}_avgServerToCloud`] = Number(out[`${key}_avgServerToCloud_sum`] || 0) / denom;
                        out[`${key}_avgCloudToUser`] = Number(out[`${key}_avgCloudToUser_sum`] || 0) / denom;
                        out[`${key}_avgBytesOut`] = Number(out[`${key}_avgBytesOut_sum`] || 0) / denom;
                        out[`${key}_avgBytesIn`] = Number(out[`${key}_avgBytesIn_sum`] || 0) / denom;
                    }
                    delete out[`${key}_sumCount`];
                    delete out[`${key}_avgServerToUser_sum`];
                    delete out[`${key}_avgServerToCloud_sum`];
                    delete out[`${key}_avgCloudToUser_sum`];
                    delete out[`${key}_avgBytesOut_sum`];
                    delete out[`${key}_avgBytesIn_sum`];
                });
                return out;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return result;
    }, [isMainPanelApi, profile?.panels, panelFiltersState, graphData, rawGraphResponse, panelsDataMap, eventConfigById, isHourly]);

    useEffect(() => {
        if (!profile?.panels || profile.panels.length === 0) return;
        const next: Record<string, boolean> = {};
        profile.panels.forEach(panel => {
            next[panel.panelId] = true; // true = collapsed (filters hidden by default, show graphs directly)
        });
        setPanelFiltersCollapsed(next);
    }, [profile?.panels]);

    // Build and upload child config for percentage/funnel graphs
    const uploadChildConfigIfNeeded = useCallback(async (force: boolean = false) => {
        if (!profile?.panels) return;

        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        // Send if forced (panel edited) or if an hour has passed since last upload
        if (!force && (now - lastConfigUploadTime.current) < oneHour) {
            return;
        }

        // Upload config for each panel that has percentage/funnel graphs
        for (const panel of profile.panels) {
            const panelConfig = (panel as any).filterConfig;
            const dbPanelId = (panel as any)?._dbPanelId;

            // Skip panels without DB ID (not from custom database yet)
            if (!dbPanelId) continue;

            const childParentMappings: Array<{ child: string; parent: string[] }> = [];

            if (panelConfig?.graphType === 'percentage' && panelConfig?.percentageConfig) {
                const { parentEvents = [], childEvents = [] } = panelConfig.percentageConfig;
                childEvents.forEach((childEventId: string) => {
                    childParentMappings.push({
                        child: String(childEventId),
                        parent: parentEvents.map((id: string) => String(id))
                    });
                });
            } else if (panelConfig?.graphType === 'funnel' && panelConfig?.funnelConfig) {
                const { stages = [], multipleChildEvents = [] } = panelConfig.funnelConfig;
                const stageEventIds = stages.map((s: any) => String(s.eventId));
                multipleChildEvents.forEach((childEventId: string) => {
                    childParentMappings.push({
                        child: String(childEventId),
                        parent: stageEventIds
                    });
                });
            }

            // Upload config for this panel if it has any mappings
            if (childParentMappings.length > 0) {
                try {
                    await apiService.uploadChildConfig(dbPanelId, childParentMappings);
                } catch (error) {
                    console.error(`Failed to upload child config for panel ${dbPanelId}:`, error);
                }
            }
        }

        lastConfigUploadTime.current = now;
    }, [profile?.panels]);

    // Note: Auto-selection disabled for 8-Day Overlay
    // Show all events by default to prevent empty graphs
    // User can click legend to filter specific events


    // Close pinned tooltip on Esc
    useEffect(() => {
        if (!pinnedTooltip) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPinnedTooltip(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pinnedTooltip]);

    // Function to toggle panel legend
    const togglePanelLegend = useCallback((panelId: string) => {
        setPanelLegendExpanded(prev => ({
            ...prev,
            [panelId]: !prev[panelId]
        }));
    }, []);

    // Function to handle event click in legend - toggle selection
    const handleEventClick = useCallback((eventKey: string) => {
        setSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in API Performance Metrics legend - independent selection
    const handleApiEventClick = useCallback((eventKey: string) => {
        setApiSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in 8-Day Overlay legend - independent selection
    const handleOverlayEventClick = useCallback((eventKey: string) => {
        setOverlaySelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle event click in Error Event Tracking legend - independent selection
    const handleErrorEventClick = useCallback((eventKey: string) => {
        setErrorSelectedEventKey(prev => prev === eventKey ? null : eventKey);
    }, []);

    // Function to handle graph point click - select event and scroll to legend (used only from pills now)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleGraphPointClick = useCallback((eventKey: string) => {
        // Set the selected event
        setSelectedEventKey(eventKey);
        // Expand the legend if it's collapsed
        setMainLegendExpanded(true);
        // Scroll to the legend item after a short delay to ensure it's rendered
        setTimeout(() => {
            const legendElement = document.getElementById(`legend-${eventKey}`);
            if (legendElement) {
                legendElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                legendElement.classList.add('ring-4', 'ring-purple-400');
                setTimeout(() => {
                    legendElement.classList.remove('ring-4', 'ring-purple-400');
                }, 1500);
            }
        }, 100);
    }, []);

    // Function to handle panel event click - toggle selection
    const handlePanelEventClick = useCallback((panelId: string, eventKey: string) => {
        setPanelSelectedEventKey(prev => ({
            ...prev,
            [panelId]: prev[panelId] === eventKey ? null : eventKey
        }));
    }, []);

    // Function to handle panel graph point click - select event and scroll to legend
    const handlePanelGraphPointClick = useCallback((panelId: string, eventKey: string) => {
        // Set the selected event for this panel
        setPanelSelectedEventKey(prev => ({
            ...prev,
            [panelId]: eventKey
        }));
        // Expand the panel legend if it's collapsed
        setPanelLegendExpanded(prev => ({
            ...prev,
            [panelId]: true
        }));
        // Scroll to the legend item after a short delay
        setTimeout(() => {
            const legendElement = document.getElementById(`legend-${eventKey}`);
            if (legendElement) {
                legendElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                legendElement.classList.add('ring-4', 'ring-purple-400');
                setTimeout(() => {
                    legendElement.classList.remove('ring-4', 'ring-purple-400');
                }, 1500);
            }
        }, 100);
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handlePanelChartClick = useCallback((panelId: string, chartState: any) => {
        if (!chartState || !chartState.activePayload || chartState.activePayload.length === 0) return;
        const firstSeries = chartState.activePayload[0];
        const dataKey = typeof firstSeries.dataKey === 'string' ? firstSeries.dataKey : '';
        if (!dataKey || !dataKey.endsWith('_count')) return;
        const eventKey = dataKey.replace(/_count$/, '');
        if (eventKey) {
            handlePanelGraphPointClick(panelId, eventKey);
        }
    }, [handlePanelGraphPointClick]);

    // Function to update panel-specific filter
    const updatePanelFilter = useCallback((panelId: string, filterType: keyof FilterState, values: number[]) => {
        setPanelFiltersState(prev => ({
            ...prev,
            [panelId]: {
                ...prev[panelId],
                [filterType]: values
            }
        }));
        // Mark that this panel's filters have changed so APPLY banner shows
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: true
        }));
    }, []);

    // Function to update panel date range
    const updatePanelDateRange = useCallback((panelId: string, from: Date, to: Date) => {
        setPanelDateRanges(prev => ({
            ...prev,
            [panelId]: { from, to }
        }));
        // Mark that this panel's filters have changed so APPLY banner shows
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: true
        }));
    }, []);

    // Function to open expanded pie chart and sync with URL so browser
    // back/forward buttons can close/reopen it
    const openExpandedPie = useCallback((type: 'platform' | 'pos' | 'source' | 'status' | 'cacheStatus', title: string, data: any[]) => {
        setExpandedPie({ type, title, data });
        setPieModalOpen(true);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev as any);
            next.set('expandedPie', type);
            return next;
        });
    }, [setSearchParams]);

    // Keep modal open state in sync with the query param so that
    // browser back/forward navigations close or reopen the modal
    useEffect(() => {
        const expandedType = searchParams.get('expandedPie') as 'platform' | 'pos' | 'source' | null;

        if (!expandedType) {
            if (pieModalOpen) setPieModalOpen(false);
            return;
        }

        if (expandedPie && expandedPie.type === expandedType && !pieModalOpen) {
            setPieModalOpen(true);
        }
    }, [searchParams, expandedPie, pieModalOpen]);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            // Memory cleanup: Clear existing panel data and states when switching profiles
            setPanelsDataMap(new Map());
            setPanelFiltersState({});
            setPanelDateRanges({});
            setPanelChartType({});
            setPanelFilterChanges({});
            setPanelAvailableSourceStrs({});
            setPanelPinnedTooltips({});
            setPanelLegendExpanded({});
            setPanelSelectedEventKey({});

            setLoading(true);
            setError(null);

            try {
                const loadedProfile = await mockService.getProfile(profileId);

                if (loadedProfile) {
                    setProfile(loadedProfile);

                    // Fetch site details and events in parallel to reduce
                    // perceived latency on first render.
                    const [sites, featureEvents] = await Promise.all([
                        apiService.getSiteDetails(parseInt(loadedProfile.featureId) || undefined),
                        apiService.getEventsList(loadedProfile.featureId)
                    ]);

                    setSiteDetails(sites);
                    setEvents(featureEvents);

                    // Initialize panel filter states from admin configs (these reset on refresh)
                    const initialPanelFilters: Record<string, FilterState> = {};
                    const initialPanelDateRanges: Record<string, DateRangeState> = {};
                    const initialPanelChartTypes: Record<string, 'default' | 'deviation'> = {};

                    loadedProfile.panels.forEach((panel) => {
                        const panelConfig = (panel as any).filterConfig || {};

                        const defaultFilters: FilterState = {
                            platforms: panelConfig.platforms || [],
                            pos: panelConfig.pos || [],
                            sources: panelConfig.sources || [],
                            events: panelConfig.events || [],
                        };

                        initialPanelFilters[panel.panelId] = defaultFilters;
                        // Use the current global dateRange as the default per-panel range
                        initialPanelDateRanges[panel.panelId] = { ...dateRange };

                        // Initialize chart type per panel from saved config
                        // Default to enabled (true) for daily deviation curve - DEVIATION MODE BY DEFAULT
                        const isDeviation = panelConfig.dailyDeviationCurve !== false;
                        initialPanelChartTypes[panel.panelId] = isDeviation ? 'deviation' : 'default';
                    });

                    setPanelFiltersState(initialPanelFilters);
                    setPanelDateRanges(initialPanelDateRanges);
                    setPanelChartType(initialPanelChartTypes);

                    // Check if panels have saved filter configs
                    const firstPanelConfig = loadedProfile.panels[0]?.filterConfig as any;

                    if (firstPanelConfig && firstPanelConfig.events && firstPanelConfig.events.length > 0) {
                        // Use saved filter config from first panel
                        setFilters({
                            platforms: firstPanelConfig.platforms || [0],
                            pos: firstPanelConfig.pos || [2],
                            sources: firstPanelConfig.sources || [],
                            events: firstPanelConfig.events
                        });
                    } else {
                        // Fall back to defaults - empty arrays mean "all"
                        setFilters({
                            platforms: [],  // All platforms
                            pos: [],        // All POS
                            sources: [],    // All sources
                            events: []      // All events
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to load initial data:', err);
                setError('Failed to load dashboard configuration');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [profileId]);

    // Initialize API filter defaults when raw data becomes available
    useEffect(() => {
        if (!profile || !isMainPanelApi) return;

        const mainPanelId = profile.panels[0]?.panelId;
        if (!mainPanelId) return;

        const mainPanelData = panelsDataMap.get(mainPanelId);
        const rawData = mainPanelData?.rawGraphResponse?.data || rawGraphResponse?.data || [];

        if (rawData.length === 0) return;

        const currentFilters = panelFiltersState[mainPanelId] || {};

        // Skip if already initialized
        if (currentFilters.percentageStatusCodes || currentFilters.percentageCacheStatus) return;

        const statusSet = new Set<string>();
        const cacheSet = new Set<string>();

        rawData.forEach((record: any) => {
            // Direct field extraction (API response format)
            if (record.status !== undefined && record.status !== null) {
                statusSet.add(String(record.status));
            }
            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                cacheSet.add(record.cacheStatus);
            }

            // Also check key patterns for processed data format
            Object.keys(record).forEach(key => {
                const statusMatch = key.match(/_status_(\d+)_/);
                const cacheMatch = key.match(/_cache_([^_]+)_/);
                if (statusMatch) statusSet.add(statusMatch[1]);
                if (cacheMatch) cacheSet.add(cacheMatch[1]);
            });
        });

        if (statusSet.size > 0 || cacheSet.size > 0) {
            const statusCodes = Array.from(statusSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const cacheStatuses = Array.from(cacheSet).sort();

            // Initialize with defaults
            const defaultStatus = statusCodes.includes('200') ? ['200'] : statusCodes;
            const defaultCache = cacheStatuses;

            setPanelFiltersState(prev => ({
                ...prev,
                [mainPanelId]: {
                    ...prev[mainPanelId],
                    percentageStatusCodes: defaultStatus,
                    percentageCacheStatus: defaultCache
                }
            }));

            // Debug logging removed
        }
    }, [profile, isMainPanelApi, panelsDataMap, rawGraphResponse, panelFiltersState]);

    // Helper function to extract unique sourceStr values from raw graph response
    const extractSourceStrs = useCallback((graphResponse: any): string[] => {
        if (!graphResponse?.data) return [];
        const sourceStrs = new Set<string>();
        graphResponse.data.forEach((record: any) => {
            if (record.sourceStr && typeof record.sourceStr === 'string' && record.sourceStr.trim() !== '') {
                sourceStrs.add(record.sourceStr);
            }
        });
        return Array.from(sourceStrs).sort();
    }, []);

    // Helper function to filter raw graph data by selected sourceStrs (client-side filter)
    const filterBySourceStr = useCallback((graphResponse: any, selectedStrs: string[]): any => {
        if (!graphResponse?.data) return graphResponse;
        // If no filter selected (empty array), return all data
        if (selectedStrs.length === 0) return graphResponse;

        const filteredData = graphResponse.data.filter((record: any) => {
            // If record has no sourceStr, exclude it when filtering
            if (!record.sourceStr || record.sourceStr.trim() === '') {
                return false;
            }
            return selectedStrs.includes(record.sourceStr);
        });

        // Rebuild pie chart data from filtered data
        const rebuildPieData = (dimension: string) => {
            const aggregated: Record<string, any> = {};
            filteredData.forEach((record: any) => {
                const key = record[dimension];
                if (key !== undefined && key !== null) {
                    const keyStr = String(key);
                    if (!aggregated[keyStr]) {
                        aggregated[keyStr] = { ...record, count: 0, successCount: 0, failCount: 0 };
                    }
                    aggregated[keyStr].count += record.count || 0;
                    aggregated[keyStr].successCount += record.successCount || 0;
                    aggregated[keyStr].failCount += record.failCount || 0;
                }
            });
            return aggregated;
        };

        // Build proper pie chart data structure
        const rebuiltPieData = {
            platform: rebuildPieData('platform'),
            pos: rebuildPieData('pos'),
            source: rebuildPieData('source'),
            sourceStr: rebuildPieData('sourceStr')
        };

        return {
            ...graphResponse,
            data: filteredData,
            // Ensure pie chart data is in the response
            pieChartData: { data: rebuiltPieData },
            // Also set at root level for backward compatibility
            ...rebuiltPieData
        };
    }, []);

    // Helper function to process graph response into display format
    // Creates separate data series per event for proper bifurcation
    // Handles avgEvents by plotting avgDelay (time) instead of count
    // Handles API events by grouping by status/cacheStatus instead of eventId
    const processGraphData = useCallback((graphResponse: any, startDate: Date, endDate: Date, eventsList: EventConfig[], isApiEvent: boolean = false, graphType?: string, isHourlyOverride: boolean | null = null) => {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // Use override if provided, otherwise fallback to 8-day auto-switch logic
        const isHourly = isHourlyOverride !== null ? isHourlyOverride : daysDiff <= 8;

        // Create maps for event lookup
        const eventNameMap = new Map<string, string>();
        const eventConfigMap = new Map<string, EventConfig>();
        eventsList.forEach(e => {
            eventNameMap.set(String(e.eventId), e.eventName);
            eventConfigMap.set(String(e.eventId), e);
        });

        // For API events, we group by status/cacheStatus instead of eventId
        // UNLESS it's a special graph type (percentage/funnel) which needs specific endpoint comparisons
        // In that case, we fall through to the "Regular" logic but capture status codes as sub-metrics
        const useApiAggregation = isApiEvent && graphType !== 'percentage' && graphType !== 'funnel';

        if (useApiAggregation) {
            const timeMap = new Map<string, any>();
            const statusSet = new Set<string>();
            const cacheStatusSet = new Set<string>();

            (graphResponse.data || []).forEach((record: any) => {
                const recordDate = new Date(record.timestamp);
                const dateKey = isHourly
                    ? recordDate.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        hour12: true
                    })
                    : recordDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });

                const status = record.status ? String(record.status) : 'unknown';
                const cacheStatus = record.cacheStatus || 'none';
                statusSet.add(status);
                cacheStatusSet.add(cacheStatus);

                if (!timeMap.has(dateKey)) {
                    timeMap.set(dateKey, {
                        date: dateKey,
                        timestamp: record.timestamp,
                        count: 0,
                        successCount: 0,
                        failCount: 0,
                    });
                }

                const existing = timeMap.get(dateKey)!;

                // Add overall totals
                existing.count += record.count || 0;
                existing.successCount += record.successCount || 0;
                existing.failCount += record.failCount || 0;

                // Add per-status data
                const statusKey = `status_${status}`;
                if (!existing[`${statusKey}_count`]) {
                    existing[`${statusKey}_count`] = 0;
                    existing[`${statusKey}_success`] = 0;
                    existing[`${statusKey}_fail`] = 0;
                    existing[`${statusKey}_avgBytesIn`] = 0;
                    existing[`${statusKey}_avgBytesOut`] = 0;
                    existing[`${statusKey}_avgServerToUser`] = 0;
                    existing[`${statusKey}_avgServerToCloud`] = 0;
                    existing[`${statusKey}_avgCloudToUser`] = 0;
                    existing[`${statusKey}_dataPointCount`] = 0;
                }
                existing[`${statusKey}_count`] += record.count || 0;
                existing[`${statusKey}_success`] += record.successCount || 0;
                existing[`${statusKey}_fail`] += record.failCount || 0;

                // Accumulate timing metrics for averaging
                if (record.avgBytesIn) existing[`${statusKey}_avgBytesIn`] += parseFloat(record.avgBytesIn);
                if (record.avgBytesOut) existing[`${statusKey}_avgBytesOut`] += parseFloat(record.avgBytesOut);
                if (record.avgServerToUser) existing[`${statusKey}_avgServerToUser`] += parseFloat(record.avgServerToUser);
                if (record.avgServerToCloud) existing[`${statusKey}_avgServerToCloud`] += parseFloat(record.avgServerToCloud);
                if (record.avgCloudToUser) existing[`${statusKey}_avgCloudToUser`] += parseFloat(record.avgCloudToUser);
                existing[`${statusKey}_dataPointCount`] += 1;

                // Add per-cacheStatus data
                const cacheKey = `cache_${cacheStatus}`;
                if (!existing[`${cacheKey}_count`]) {
                    existing[`${cacheKey}_count`] = 0;
                    existing[`${cacheKey}_success`] = 0;
                    existing[`${cacheKey}_fail`] = 0;
                }
                existing[`${cacheKey}_count`] += record.count || 0;
                existing[`${cacheKey}_success`] += record.successCount || 0;
                existing[`${cacheKey}_fail`] += record.failCount || 0;
            });

            // Calculate averages for timing metrics
            timeMap.forEach((entry) => {
                statusSet.forEach(status => {
                    const statusKey = `status_${status}`;
                    const dataPointCount = entry[`${statusKey}_dataPointCount`] || 0;
                    if (dataPointCount > 0) {
                        entry[`${statusKey}_avgBytesIn`] = entry[`${statusKey}_avgBytesIn`] / dataPointCount;
                        entry[`${statusKey}_avgBytesOut`] = entry[`${statusKey}_avgBytesOut`] / dataPointCount;
                        entry[`${statusKey}_avgServerToUser`] = entry[`${statusKey}_avgServerToUser`] / dataPointCount;
                        entry[`${statusKey}_avgServerToCloud`] = entry[`${statusKey}_avgServerToCloud`] / dataPointCount;
                        entry[`${statusKey}_avgCloudToUser`] = entry[`${statusKey}_avgCloudToUser`] / dataPointCount;
                    }
                });
            });

            const sortedData = Array.from(timeMap.values()).sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            // Build event keys for status codes
            const statusEventKeys = Array.from(statusSet).map(status => ({
                eventId: `status_${status}`,
                eventName: `Status ${status}`,
                eventKey: `status_${status}`,
                isErrorEvent: parseInt(status) >= 400 ? 1 : 0,
                isAvgEvent: 0,
                isApiEvent: true,
                apiMetricType: 'status' as const
            }));

            // Build event keys for cache status
            const cacheEventKeys = Array.from(cacheStatusSet).map(cache => ({
                eventId: `cache_${cache}`,
                eventName: `Cache: ${cache}`,
                eventKey: `cache_${cache}`,
                isErrorEvent: 0,
                isAvgEvent: 0,
                isApiEvent: true,
                apiMetricType: 'cache' as const
            }));

            return {
                data: sortedData,
                eventKeys: [...statusEventKeys, ...cacheEventKeys]
            };
        }

        // Regular event processing (non-API events)
        const timeMap = new Map<string, any>();
        const eventIds = new Set<string>();

        (graphResponse.data || []).forEach((record: any) => {
            const recordDate = new Date(record.timestamp);
            const dateKey = isHourly
                ? recordDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    hour12: true
                })
                : recordDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });

            const eventId = String(record.eventId);
            eventIds.add(eventId);

            if (!timeMap.has(dateKey)) {
                timeMap.set(dateKey, {
                    date: dateKey,
                    timestamp: record.timestamp,
                    // Overall totals
                    count: 0,
                    successCount: 0,
                    failCount: 0,
                    avgDelay: 0, // For avg events
                    // Per-event data will be added dynamically
                });
            }

            const existing = timeMap.get(dateKey)!;
            const eventConfig = eventConfigMap.get(eventId);
            // Check for any isAvgEvent type (1=time, 2=rupees, 3=count)
            const isAvgEvent = (eventConfig?.isAvgEvent || 0) >= 1;

            // Add overall totals
            existing.count += record.count || 0;
            existing.successCount += record.successCount || 0;
            existing.failCount += record.failCount || 0;

            // Add per-event data keyed by safe event name
            const eventName = eventNameMap.get(eventId) || `Event ${eventId}`;
            const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');

            if (!existing[`${eventKey}_count`]) {
                existing[`${eventKey}_count`] = 0;
                existing[`${eventKey}_success`] = 0;
                existing[`${eventKey}_fail`] = 0;
                existing[`${eventKey}_avgDelay`] = 0;
                existing[`${eventKey}_delayCount`] = 0; // For calculating average
            }
            existing[`${eventKey}_count`] += record.count || 0;
            existing[`${eventKey}_success`] += record.successCount || 0;
            existing[`${eventKey}_fail`] += record.failCount || 0;

            // Also aggregate by raw numeric eventId for special graphs (percentage/funnel)
            if (!existing[`${eventId}_count`]) {
                existing[`${eventId}_count`] = 0;
                existing[`${eventId}_success`] = 0;
                existing[`${eventId}_fail`] = 0;
            }
            existing[`${eventId}_count`] += record.count || 0;
            existing[`${eventId}_success`] += record.successCount || 0;
            existing[`${eventId}_fail`] += record.failCount || 0;

            // CAPTURE STATUS CODE & CACHE STATUS BREAKDOWNS (if available)
            // This enables "Percentage Graph" to filter by status/cache even for specific Events
            if (record.status) {
                const status = String(record.status);
                const statusKey = `${eventKey}_status_${status}`;
                if (!existing[`${statusKey}_count`]) {
                    existing[`${statusKey}_count`] = 0;
                    existing[`${statusKey}_success`] = 0;
                }
                existing[`${statusKey}_count`] += record.count || 0;
                existing[`${statusKey}_success`] += record.successCount || 0;
            }

            if (record.cacheStatus) {
                const cache = String(record.cacheStatus);
                const cacheKey = `${eventKey}_cache_${cache}`;
                if (!existing[`${cacheKey}_count`]) {
                    existing[`${cacheKey}_count`] = 0;
                    existing[`${cacheKey}_success`] = 0;
                }
                existing[`${cacheKey}_count`] += record.count || 0;
                existing[`${cacheKey}_success`] += record.successCount || 0;
            }

            // For avg events, accumulate delay values (will average later)
            if (isAvgEvent && record.avgDelay) {
                existing[`${eventKey}_avgDelay`] += record.avgDelay;
                existing[`${eventKey}_delayCount`] += 1;
            }
        });

        // Second pass: calculate averages for avg events
        timeMap.forEach((entry) => {
            eventIds.forEach(eventId => {
                const eventName = eventNameMap.get(eventId) || `Event ${eventId}`;
                const eventKey = eventName.replace(/[^a-zA-Z0-9]/g, '_');
                const delayCount = entry[`${eventKey}_delayCount`] || 0;
                if (delayCount > 0) {
                    entry[`${eventKey}_avgDelay`] = entry[`${eventKey}_avgDelay`] / delayCount;
                }
            });
        });

        // Sort by timestamp
        const sortedData = Array.from(timeMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Build event keys metadata with isErrorEvent and isAvgEvent
        const eventKeysInData = Array.from(eventIds).map(id => {
            const name = eventNameMap.get(id) || `Event ${id}`;
            const config = eventConfigMap.get(id);
            return {
                eventId: id,
                eventName: name,
                eventKey: name.replace(/[^a-zA-Z0-9]/g, '_'),
                isErrorEvent: config?.isErrorEvent || 0,
                isAvgEvent: config?.isAvgEvent || 0
            };
        });

        return {
            data: sortedData,
            eventKeys: eventKeysInData
        };
    }, []);

    // Re-process graph data when sourceStr filter changes (client-side filter, no API call)
    useEffect(() => {
        if (rawGraphResponse && events.length > 0) {
            // First filter the raw data by selected sourceStrs
            const filteredResponse = filterBySourceStr(rawGraphResponse, selectedSourceStrs);
            // Check if main panel is API event panel
            const mainPanelConfig = profile?.panels?.[0]?.filterConfig as any;
            const isApiEvent = mainPanelConfig?.isApiEvent || false;
            // Then process the filtered data
            // Then process the filtered data
            const processedResult = processGraphData(filteredResponse, dateRange.from, dateRange.to, events, isApiEvent, mainPanelConfig?.graphType);
            setGraphData(processedResult.data);
            setEventKeys(processedResult.eventKeys || []);
        }
    }, [selectedSourceStrs, rawGraphResponse, dateRange, events, processGraphData, filterBySourceStr, profile]);

    // Auto-select first event when eventKeys change (default to showing only first event)
    // For API events, prioritize status 200 if available
    useEffect(() => {
        if (eventKeys.length > 0 && !selectedEventKey) {
            let keyToSelect = eventKeys[0].eventKey;

            // For API events, try to find status 200
            if (isMainPanelApi) {
                const status200 = eventKeys.find(ek => {
                    const eventName = ek.eventName || '';
                    return eventName.includes('200') || eventName === '200';
                });
                if (status200) {
                    keyToSelect = status200.eventKey;
                }
            }

            setSelectedEventKey(keyToSelect);
        }
    }, [eventKeys, isMainPanelApi]); // Remove selectedEventKey from deps to ensure it always checks

    // Auto-select first event for each panel when their eventKeys change
    useEffect(() => {
        panelsDataMap.forEach((panelData, panelId) => {
            if (panelData.eventKeys && panelData.eventKeys.length > 0 && !panelSelectedEventKey[panelId]) {
                setPanelSelectedEventKey(prev => ({
                    ...prev,
                    [panelId]: panelData.eventKeys![0].eventKey
                }));
            }
        });
    }, [panelsDataMap]); // Remove panelSelectedEventKey from deps to ensure it always checks

    // Auto-select first event for API Performance Metrics
    useEffect(() => {
        if (!isMainPanelApi) return;
        if (apiEndpointEventKeyInfos.length === 0) return;
        const keyToSelect = apiEndpointEventKeyInfos[0].eventKey;
        if (!apiSelectedEventKey || !apiEndpointEventKeyInfos.find((ek: EventKeyInfo) => ek.eventKey === apiSelectedEventKey)) {
            setApiSelectedEventKey(keyToSelect);
        }
    }, [apiEndpointEventKeyInfos, apiSelectedEventKey, isMainPanelApi]);

    // Auto-select first event for 8-Day Overlay
    useEffect(() => {
        if (eventKeys.length > 0) {
            if (!overlaySelectedEventKey || !eventKeys.find(ek => ek.eventKey === overlaySelectedEventKey)) {
                setOverlaySelectedEventKey(eventKeys[0].eventKey);
            }
        }
    }, [eventKeys]);

    // Auto-select first event for Error Event Tracking
    useEffect(() => {
        if (eventKeys.length > 0) {
            if (!errorSelectedEventKey || !eventKeys.find(ek => ek.eventKey === errorSelectedEventKey)) {
                setErrorSelectedEventKey(eventKeys[0].eventKey);
            }
        }
    }, [eventKeys]);


    // Function to refresh a single panel's data
    const refreshPanelData = useCallback(async (panelId: string, overrideFilters?: FilterState, overrideDateRange?: DateRangeState, overridePanel?: any) => {
        if (!profile || events.length === 0) return;

        const panel = overridePanel || profile.panels.find(p => p.panelId === panelId);
        if (!panel) return;

        setPanelLoading(prev => ({ ...prev, [panelId]: true }));

        try {
            const panelConfig = (panel as any).filterConfig;
            const userPanelFilters = overrideFilters || panelFiltersState[panelId];
            const existingPanelData = panelsDataMap.get(panelId);



            // FIXED: Use currentPanelFilters logic - match what the UI shows
            // Priority: 1) User edited filters (panelFiltersState), 2) Last successful call (panelData.filters), 3) Panel config defaults
            const currentPanelFilters = userPanelFilters || existingPanelData?.filters || {
                events: panelConfig?.events || [],
                platforms: panelConfig?.platforms || [],
                pos: panelConfig?.pos || [],
                sources: panelConfig?.sources || []
            };

            let eventIdsToFetch = currentPanelFilters.events || [];

            if (panelConfig?.graphType === 'percentage' && panelConfig?.percentageConfig) {
                const { parentEvents = [], childEvents = [] } = panelConfig.percentageConfig;
                const activeParents = currentPanelFilters.activePercentageEvents || parentEvents;
                const activeChildren = currentPanelFilters.activePercentageChildEvents || childEvents;
                eventIdsToFetch = [...new Set([...activeParents.map((id: string) => parseInt(id)), ...activeChildren.map((id: string) => parseInt(id))])];
            } else if (panelConfig?.graphType === 'funnel' && panelConfig?.funnelConfig) {
                const { stages = [], multipleChildEvents = [] } = panelConfig.funnelConfig;
                const activeStageIds = currentPanelFilters.activeStages || stages.map((s: any) => s.eventId);
                const activeChildIds = currentPanelFilters.activeFunnelChildEvents || multipleChildEvents;
                const stageIds = activeStageIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
                const childIds = activeChildIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
                eventIdsToFetch = [...new Set([...stageIds, ...childIds])];
            } else if (panelConfig?.graphType === 'user_flow' && panelConfig?.userFlowConfig) {
                const stages = panelConfig.userFlowConfig.stages || [];
                // Extract unique event IDs from all stages for visualization
                const stageEventIds = new Set<number>();
                stages.forEach((stage: any) => {
                    if (stage.eventIds && Array.isArray(stage.eventIds)) {
                        stage.eventIds.forEach((id: string | number) => {
                            const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                            if (!isNaN(numId)) stageEventIds.add(numId);
                        });
                    }
                });
                if (stageEventIds.size > 0) {
                    eventIdsToFetch = Array.from(stageEventIds);
                }
            }

            // Now use currentPanelFilters - empty arrays mean "all" (sent to API as [])
            // For special graphs, prefer user edited filters over config
            const panelFilters: FilterState = {
                events: eventIdsToFetch,
                platforms: currentPanelFilters.platforms || [],
                pos: currentPanelFilters.pos || [],
                sources: currentPanelFilters.sources || []
            };
            const panelDateRange = overrideDateRange || panelDateRanges[panelId] || dateRange;

            // Get current sourceStr filter for this panel (client-side filter)
            const currentSourceStrFilter = profile.panels[0]?.panelId === panelId
                ? selectedSourceStrs
                : (panelSelectedSourceStrs[panelId] || []);

            // console.log(`🔄 PANEL REFRESH - Panel ID: ${panelId}`);
            // console.log(`📊 Panel filters being applied:`, panelFilters);
            // console.log(`🌐 Global filters state:`, filters);
            // console.log(`📅 Panel date range:`, panelDateRange);
            // console.log(`🔖 SourceStr filter:`, currentSourceStrFilter);

            // Check if panel has API events
            // IMPORTANT: use panelConfig.isApiEvent (authoritative) instead of panel.events, which may not carry isApiEvent flags.
            const hasApiEvents = panelConfig?.isApiEvent === true;

            // Check if this is a special graph (percentage, funnel, or user_flow)
            const isSpecialGraph = panelConfig?.graphType === 'percentage' || panelConfig?.graphType === 'funnel' || panelConfig?.graphType === 'user_flow';

            // Determine effective hourly override: use per-panel override if available, otherwise global defaults
            // Previously forced 'deviation' charts to hourly, but this prevented 'Daily' view from working
            const panelOverride = panelHourlyOverride[panelId];
            const effectiveHourlyOverride = (panelOverride !== undefined && panelOverride !== null)
                ? panelOverride
                : hourlyOverride;



            // OPTIMIZED: Make all 3 API calls IN PARALLEL for up to 3x speedup
            const eventIdsForSourceStr = eventIdsToFetch.map(id => typeof id === 'number' ? id : parseInt(id)).filter(id => !isNaN(id));

            const [graphResponse, pieResponse, sourceStrsFromApi] = await Promise.all([
                // Graph data call
                apiService.getGraphData(
                    panelFilters.events,
                    hasApiEvents ? [] : panelFilters.platforms,
                    hasApiEvents ? [] : panelFilters.pos,
                    hasApiEvents ? [] : panelFilters.sources,
                    currentSourceStrFilter,
                    panelDateRange.from,
                    panelDateRange.to,
                    hasApiEvents,
                    false,
                    effectiveHourlyOverride
                ),
                // Pie chart call (optional for special graphs)
                (hasApiEvents || !isSpecialGraph)
                    ? apiService.getPieChartData(
                        panelFilters.events,
                        hasApiEvents ? [] : panelFilters.platforms,
                        hasApiEvents ? [] : panelFilters.pos,
                        hasApiEvents ? [] : panelFilters.sources,
                        currentSourceStrFilter,
                        panelDateRange.from,
                        panelDateRange.to,
                        hasApiEvents
                    ).catch(pieErr => {
                        console.warn(`⚠️ Pie chart data failed for panel ${panelId}, continuing without it:`, pieErr);
                        return null;
                    })
                    : Promise.resolve(null),
                // SourceStr call
                eventIdsForSourceStr.length > 0
                    ? apiService.fetchSourceStr(eventIdsForSourceStr).catch(sourceStrErr => {
                        console.warn('📋 SourceStr API failed, will fallback to extraction from graph data:', sourceStrErr);
                        return [];
                    })
                    : Promise.resolve([])
            ]);

            // Fallback: extract sourceStrs from graph response if API had no results
            const finalSourceStrs = sourceStrsFromApi.length > 0 ? sourceStrsFromApi : extractSourceStrs(graphResponse);

            // Apply sourceStr filter (client-side) then process
            const filteredResponse = filterBySourceStr(graphResponse, currentSourceStrFilter);
            const isApiEventPanel = panelConfig?.isApiEvent || false;

            const processedResult = processGraphData(filteredResponse, panelDateRange.from, panelDateRange.to, events, isApiEventPanel, panelConfig?.graphType, effectiveHourlyOverride);

            // Use filtered pie data if sourceStr filter was applied, otherwise use original
            const finalPieData = currentSourceStrFilter.length > 0
                ? (filteredResponse.pieChartData || pieResponse)
                : pieResponse;

            // Update panelsDataMap for this panel
            setPanelsDataMap(prev => {
                const newMap = new Map(prev);
                newMap.set(panelId, {
                    graphData: processedResult.data,
                    eventKeys: processedResult.eventKeys,
                    pieChartData: finalPieData,
                    loading: false,
                    error: null,
                    filters: panelFilters,
                    dateRange: panelDateRange,
                    showLegend: false,
                    rawGraphResponse: graphResponse, // Store for re-processing with sourceStr filter
                    hasLoadedOnce: true // Prevent infinite loading loops
                });
                return newMap;
            });

            // Update available sourceStrs for this panel (from API)
            if (profile.panels[0]?.panelId === panelId) {
                setAvailableSourceStrs(finalSourceStrs);
            } else {
                setPanelAvailableSourceStrs(prev => ({
                    ...prev,
                    [panelId]: finalSourceStrs
                }));
            }

            // CRITICAL: If this is the first/main panel, also update the legacy state variables
            // The main panel UI uses these directly, not panelsDataMap
            if (profile.panels[0]?.panelId === panelId) {

                setGraphData(processedResult.data);
                setEventKeys(processedResult.eventKeys || []);
                setPieChartData(pieResponse);
                setRawGraphResponse(graphResponse); // Store for re-processing
                setLastUpdated(new Date());

            }
        } catch (err) {
            console.error(`Failed to refresh panel ${panelId}:`, err);
            setPanelsDataMap(prev => {
                const newMap = new Map(prev);
                const existing = prev.get(panelId);
                if (existing) {
                    newMap.set(panelId, {
                        ...existing,
                        loading: false,
                        error: `Failed to refresh: ${err instanceof Error ? err.message : 'Unknown error'}`,
                        hasLoadedOnce: true // Prevent infinite loading loops even on error
                    });
                }
                return newMap;
            });
        } finally {
            setPanelLoading(prev => ({ ...prev, [panelId]: false }));
        }
    }, [profile, events, filters, panelFiltersState, panelDateRanges, dateRange, processGraphData, panelsDataMap, selectedSourceStrs, panelSelectedSourceStrs, extractSourceStrs, filterBySourceStr, hourlyOverride, panelHourlyOverride, panelChartType]);

    // NOTE: Additional panels use LAZY LOADING - they load data ONLY when:
    // 1. User clicks on the panel in the sidebar (see ProfileSidebar onPanelClick)
    // 2. User manually clicks the "Refresh Panel" button
    // This prevents excessive API calls on initial page load.

    // Load critical alerts - PANEL-SPECIFIC: loads alerts for the currently active panel only
    const loadAlerts = useCallback(async (expanded: boolean = false) => {
        if (!profile || events.length === 0) return;

        setAlertsLoading(true);
        try {
            // Get the currently active panel
            const activePanel = activePanelIndex === 0
                ? profile.panels[0]
                : profile.panels[activePanelIndex];

            if (!activePanel) {
                setCriticalAlerts([]);
                setAlertSummary({});
                return;
            }

            const panelAlertConfig = activePanel?.alertsConfig;

            // If panel doesn't have alerts config or it's disabled, show no alerts
            if (!panelAlertConfig || panelAlertConfig.enabled === false) {
                // console.log(`📋 Panel ${activePanel.panelId} has no alert config or alerts disabled`);
                setCriticalAlerts([]);
                setAlertSummary({});
                return;
            }

            // Get event IDs from this panel's alert config
            const panelEventFilter = panelAlertConfig?.filterByEvents?.map((id: string | number) => {
                const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                return isNaN(numId) ? null : numId;
            }).filter((id: number | null): id is number => id !== null) || [];

            let eventIds: number[] = [];

            if (panelEventFilter.length > 0) {
                // console.log(`📋 Panel ${activePanel.panelId} has ${panelEventFilter.length} alert event filters:`, panelEventFilter);
                eventIds = panelEventFilter;
            } else {
                // If no specific events in panel config, use panel's regular events
                const panelEvents = activePanel.events?.map((e: any) => Number(e.eventId)).filter((id: number) => !isNaN(id)) || [];
                if (panelEvents.length > 0) {
                    // console.log(`📋 Panel ${activePanel.panelId} using ${panelEvents.length} panel events for alerts:`, panelEvents);
                    eventIds = panelEvents;
                } else {
                    // Fallback to all events if panel has no events
                    eventIds = events.map(e => parseInt(e.eventId));
                }
            }

            // Use panel's alert config settings ONLY if we haven't manually interacted
            // But since this function is driven by dependencies including alertFilters/alertDateRange,
            // we should trust the state variables which are updated by the UI controls.

            // NOTE: The UI controls update 'alertIsApi' and 'alertDateRange' state.
            // We should use those directly to respect user choice.

            const effectiveDateRange = alertDateRange;
            const effectiveIsApi = alertIsApi;
            const effectiveIsHourly = alertIsHourly;

            // console.log(`🚨 Loading alerts for panel ${activePanel.panelId} with ${eventIds.length} event IDs:`, eventIds);

            const limit = 200; // Fetch all alerts upfront for accurate counts

            // Robust isHourly check: Force to false if range > 7 days
            const diffInDays = (effectiveDateRange.to.getTime() - effectiveDateRange.from.getTime()) / (1000 * 60 * 60 * 24);
            const finalIsHourly = diffInDays > 7 ? false : effectiveIsHourly;

            // Format dates with proper start/end times: 00:00:01 for start, 23:59:59 for end
            const formatStartDate = (date: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const yyyy = date.getFullYear();
                const mm = pad(date.getMonth() + 1);
                const dd = pad(date.getDate());
                return `${yyyy}-${mm}-${dd} 00:00:01`;
            };

            const formatEndDate = (date: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                const yyyy = date.getFullYear();
                const mm = pad(date.getMonth() + 1);
                const dd = pad(date.getDate());
                return `${yyyy}-${mm}-${dd} 23:59:59`;
            };

            // Get panel's DB ID for isApi=2 (percent/funnel) alerts
            const dbPanelId = (activePanel as any)?._dbPanelId;

            // Fetch alerts using the new unified API endpoint
            const data = await apiService.getAlerts(
                eventIds,
                formatStartDate(effectiveDateRange.from),
                formatEndDate(effectiveDateRange.to),
                finalIsHourly,
                effectiveIsApi,
                limit,
                alertsPage,
                alertFilters.platforms.length > 0 ? alertFilters.platforms.map(p => Number(p)) : [], // Convert to numbers if needed
                alertFilters.pos.length > 0 ? alertFilters.pos : [],
                alertFilters.sources.length > 0 ? alertFilters.sources.map(s => Number(s)) : [],
                [], // sourceStr - not currently filtered in UI
                effectiveIsApi === 2 ? dbPanelId : undefined // Pass panelId for percent/funnel alerts
            );

            // console.log(`✅ Loaded ${data.alerts?.length || 0} critical alerts`);
            setCriticalAlerts(data.alerts || []);
            setAlertSummary(data.summary || {});
            onAlertsUpdate?.(data.alerts || []);
        } catch (err) {
            console.error('Failed to load critical alerts:', err);
            setCriticalAlerts([]);
            setAlertSummary({});
            onAlertsUpdate?.([]);
        } finally {
            setAlertsLoading(false);
        }
    }, [profile, profile?.panels, activePanelIndex, events, alertFilters, alertDateRange, alertsPage, alertIsApi, alertIsHourly]);

    // Update alert filters when active panel changes
    useEffect(() => {
        if (!profile || events.length === 0) return;

        const activePanel = activePanelIndex === 0
            ? profile.panels[0]
            : profile.panels[activePanelIndex];

        if (activePanel?.alertsConfig) {
            const alertsConfig = activePanel.alertsConfig;
            const panelConfig = (activePanel as any).filterConfig;

            // Update event filters
            if (alertsConfig.filterByEvents && alertsConfig.filterByEvents.length > 0) {
                const eventIds = alertsConfig.filterByEvents.map((id: string | number) => {
                    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                    return isNaN(numId) ? null : numId;
                }).filter((id: number | null): id is number => id !== null);

                // console.log(`🔔 Updating alert filters for panel ${activePanel.panelId}:`, eventIds);
                setAlertFilters(prev => ({
                    ...prev,
                    events: eventIds
                }));
            }

            // Update API toggle
            if (typeof alertsConfig.isApi === 'number') {
                setAlertIsApi(alertsConfig.isApi);
            } else if (alertsConfig.isApi === true) {
                setAlertIsApi(1);
            } else {
                setAlertIsApi(0);
            }

            // Update hourly toggle
            if (typeof alertsConfig.isHourly === 'boolean') {
                setAlertIsHourly(alertsConfig.isHourly);
            }

            // NOTE: Removed config-based alertDateRange override
            // Alerts should always use the default 8-day range, not panel config dates
        }
    }, [profile, activePanelIndex, events.length]);

    // Auto-refresh alerts every 15 minutes AND when active panel changes
    useEffect(() => {
        if (!profile || events.length === 0) return;
        // Immediate load when active panel changes
        // console.log(`🔄 Active panel changed to index ${activePanelIndex}, reloading alerts...`);
        loadAlerts(alertsExpanded);

        const interval = setInterval(() => {
            loadAlerts(alertsExpanded);
        }, 15 * 60 * 1000); // 15 minutes
        return () => clearInterval(interval);
    }, [loadAlerts, alertsExpanded, profile, activePanelIndex, events.length]);

    // Load chart data - LAZY LOADING: Only load first/main panel on initial load
    // Additional panels load data on-demand when navigated to via sidebar
    const loadData = useCallback(async () => {
        if (!profile || events.length === 0) return;

        setDataLoading(true);
        setError(null);

        try {
            // LAZY LOADING: Only load the first (main) panel on initial load
            // Additional panels will be loaded on-demand when clicked in sidebar
            const panelsToLoad = [profile.panels[0]].filter(Boolean);

            const panelPromises = panelsToLoad.map(async (panel) => {
                const panelConfig = (panel as any).filterConfig;
                const userPanelFilters = panelFiltersState[panel.panelId];
                const panelDateRange = panelDateRanges[panel.panelId] || dateRange;

                // Each panel uses its own filter state if available
                let eventIdsToFetch = userPanelFilters?.events?.length > 0
                    ? userPanelFilters.events
                    : (panelConfig?.events || []);

                // For special graphs, extract ALL required event IDs even on initial load
                if (panelConfig?.graphType === 'percentage' && panelConfig?.percentageConfig) {
                    const { parentEvents = [], childEvents = [] } = panelConfig.percentageConfig;
                    const activeParents = userPanelFilters?.activePercentageEvents || parentEvents;
                    const activeChildren = userPanelFilters?.activePercentageChildEvents || childEvents;
                    eventIdsToFetch = [...new Set([...activeParents.map((id: string) => parseInt(id)), ...activeChildren.map((id: string) => parseInt(id))])];
                } else if (panelConfig?.graphType === 'funnel' && panelConfig?.funnelConfig) {
                    const { stages = [], multipleChildEvents = [] } = panelConfig.funnelConfig;
                    const activeStageIds = userPanelFilters?.activeStages || stages.map((s: any) => s.eventId);
                    const activeChildIds = userPanelFilters?.activeFunnelChildEvents || multipleChildEvents;
                    const stageIds = activeStageIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
                    const childIds = activeChildIds.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
                    eventIdsToFetch = [...new Set([...stageIds, ...childIds])];
                } else if (panelConfig?.graphType === 'user_flow' && panelConfig?.userFlowConfig) {
                    const stages = panelConfig.userFlowConfig.stages || [];
                    const stageEventIds = new Set<number>();
                    stages.forEach((stage: any) => {
                        if (stage.eventIds && Array.isArray(stage.eventIds)) {
                            stage.eventIds.forEach((id: string | number) => {
                                const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                                if (!isNaN(numId)) stageEventIds.add(numId);
                            });
                        }
                    });
                    if (stageEventIds.size > 0) {
                        eventIdsToFetch = Array.from(stageEventIds);
                    }
                }

                const panelFilters: FilterState = {
                    events: eventIdsToFetch,
                    platforms: userPanelFilters?.platforms?.length > 0
                        ? userPanelFilters.platforms
                        : (panelConfig?.platforms || []),
                    pos: userPanelFilters?.pos?.length > 0
                        ? userPanelFilters.pos
                        : (panelConfig?.pos || []),
                    sources: userPanelFilters?.sources?.length > 0
                        ? userPanelFilters.sources
                        : (panelConfig?.sources || []),
                    sourceStr: userPanelFilters?.sourceStr && userPanelFilters.sourceStr.length > 0
                        ? userPanelFilters.sourceStr
                        : (panelConfig?.sourceStr || [])
                };



                // Check if panel has API events
                // IMPORTANT: use panelConfig.isApiEvent (authoritative) instead of panel.events, which may not carry isApiEvent flags.
                const hasApiEvents = panelConfig?.isApiEvent === true;

                try {
                    // OPTIMIZED: Fetch graph and pie chart data IN PARALLEL for 2x speedup
                    const [graphResponse, pieResult] = await Promise.all([
                        // Graph data call
                        apiService.getGraphData(
                            panelFilters.events,
                            hasApiEvents ? [] : panelFilters.platforms,
                            hasApiEvents ? [] : panelFilters.pos,
                            hasApiEvents ? [] : panelFilters.sources,
                            hasApiEvents ? [] : panelFilters.sourceStr || [],
                            panelDateRange.from,
                            panelDateRange.to,
                            hasApiEvents
                        ),
                        // Pie chart call - wrapped to handle failures gracefully
                        apiService.getPieChartData(
                            panelFilters.events,
                            hasApiEvents ? [] : panelFilters.platforms,
                            hasApiEvents ? [] : panelFilters.pos,
                            hasApiEvents ? [] : panelFilters.sources,
                            hasApiEvents ? [] : panelFilters.sourceStr || [],
                            panelDateRange.from,
                            panelDateRange.to,
                            hasApiEvents
                        ).catch(pieErr => {
                            console.warn(`⚠️ Pie chart data failed for panel ${panel.panelId}, continuing without it:`, pieErr);
                            return null;
                        })
                    ]);

                    const pieResponse = pieResult;

                    // Extract available sourceStrs from raw response
                    const graphSourceStrs = extractSourceStrs(graphResponse);
                    // Check if this panel is configured for API events
                    // Check if this panel is configured for API events
                    const isApiEventPanel = panelConfig?.isApiEvent || false;
                    const processedResult = processGraphData(graphResponse, panelDateRange.from, panelDateRange.to, events, isApiEventPanel, panelConfig?.graphType);

                    return {
                        panelId: panel.panelId,
                        data: {
                            graphData: processedResult.data,
                            eventKeys: processedResult.eventKeys,
                            pieChartData: pieResponse,
                            loading: false,
                            error: null as string | null,
                            filters: panelFilters,
                            dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                            showLegend: false,
                            rawGraphResponse: graphResponse,
                        },
                        sourceStrsInData: graphSourceStrs,
                    };
                } catch (panelErr) {
                    console.error(`Failed to load data for panel ${panel.panelId}:`, panelErr);
                    return {
                        panelId: panel.panelId,
                        data: {
                            graphData: [],
                            eventKeys: [],
                            pieChartData: null,
                            loading: false,
                            error: `Failed to load: ${panelErr instanceof Error ? panelErr.message : 'Unknown error'}`,
                            filters: panelFilters,
                            dateRange: { from: panelDateRange.from, to: panelDateRange.to },
                            showLegend: false,
                        },
                        sourceStrsInData: [] as string[],
                    };
                }
            });

            const panelResults = await Promise.all(panelPromises);

            // Build new panels data map in one go
            const newPanelsData = new Map<string, PanelData>();
            panelResults.forEach(({ panelId, data, sourceStrsInData }) => {
                newPanelsData.set(panelId, data);

                // Update available sourceStrs per panel
                const isMainPanel = profile.panels[0]?.panelId === panelId;

                // Auto-extract status codes and cache statuses from raw data for API panels
                const panel = profile.panels.find(p => p.panelId === panelId);
                const panelConfig = (panel as any)?.filterConfig;
                const isApiPanel = panelConfig?.isApiEvent || false;

                if (isApiPanel) {
                    // Extract status codes and cache statuses from pieChart data (pieChartApi response)
                    // GraphV2 returns aggregated data without status breakdown, so we use pieChart for dropdowns
                    const statusCodes = new Set<string>();
                    const cacheStatuses = new Set<string>();

                    // PieChartApi returns: { data: { status: { "200": {...}, "404": {...} }, cacheStatus: { "HIT": {...} } } }
                    const pieData = data.pieChartData?.data;
                    if (pieData?.status) {
                        Object.keys(pieData.status).forEach(key => {
                            if (key && key !== 'undefined') {
                                statusCodes.add(String(key));
                            }
                        });
                    }
                    if (pieData?.cacheStatus) {
                        Object.keys(pieData.cacheStatus).forEach(key => {
                            if (key && key !== 'undefined') {
                                cacheStatuses.add(String(key));
                            }
                        });
                    }

                    // Fallback: also check raw graph data for any status fields
                    if (statusCodes.size === 0 && data.rawGraphResponse?.data) {
                        data.rawGraphResponse.data.forEach((record: any) => {
                            if (record.status !== undefined && record.status !== null) {
                                statusCodes.add(String(record.status));
                            }
                            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                cacheStatuses.add(record.cacheStatus);
                            }
                        });
                    }

                    const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                    const sortedCacheStatuses = Array.from(cacheStatuses).sort();

                    if (isMainPanel) {
                        setAvailableStatusCodes(sortedStatusCodes);
                        setAvailableCacheStatuses(sortedCacheStatuses);
                        // Auto-initialize filters with defaults if not already set
                        const currentFilters = panelFiltersState[panelId];
                        if (!currentFilters?.percentageStatusCodes || currentFilters.percentageStatusCodes.length === 0) {
                            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                            const defaultCache = sortedCacheStatuses;
                            setPanelFiltersState(prev => ({
                                ...prev,
                                [panelId]: {
                                    ...prev[panelId],
                                    percentageStatusCodes: defaultStatus,
                                    percentageCacheStatus: defaultCache
                                }
                            }));
                        }
                    } else {
                        setPanelAvailableStatusCodes(prev => ({ ...prev, [panelId]: sortedStatusCodes }));
                        setPanelAvailableCacheStatuses(prev => ({ ...prev, [panelId]: sortedCacheStatuses }));
                        // Auto-initialize filters with defaults if not already set
                        const currentFilters = panelFiltersState[panelId];
                        if (!currentFilters?.percentageStatusCodes || currentFilters.percentageStatusCodes.length === 0) {
                            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                            const defaultCache = sortedCacheStatuses;
                            setPanelFiltersState(prev => ({
                                ...prev,
                                [panelId]: {
                                    ...prev[panelId],
                                    percentageStatusCodes: defaultStatus,
                                    percentageCacheStatus: defaultCache
                                }
                            }));
                        }
                    }
                }

                if (isMainPanel) {
                    setAvailableSourceStrs(sourceStrsInData);
                    if (data.rawGraphResponse) {
                        setRawGraphResponse(data.rawGraphResponse as any);
                    }
                } else {
                    setPanelAvailableSourceStrs(prev => ({
                        ...prev,
                        [panelId]: sourceStrsInData,
                    }));
                    setPanelRawGraphResponses(prev => ({
                        ...prev,
                        [panelId]: data.rawGraphResponse as any,
                    }));
                }
            });

            setPanelsDataMap(newPanelsData);

            // Also set the first panel's data to the main state for backward compatibility
            const firstPanelId = profile.panels[0]?.panelId;
            const firstPanelData = firstPanelId ? newPanelsData.get(firstPanelId) : undefined;
            if (firstPanelData) {
                setGraphData(firstPanelData.graphData);
                setEventKeys(firstPanelData.eventKeys || []);
                setPieChartData(firstPanelData.pieChartData);
            }

            setLastUpdated(new Date());

        } catch (err) {
            console.error('Failed to load analytics data:', err);
            setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setDataLoading(false);
        }
    }, [profile, panelFiltersState, panelDateRanges, dateRange, events, processGraphData, extractSourceStrs, hourlyOverride, panelHourlyOverride]);

    useEffect(() => {
        // Auto-load data on initial mount AND when switching profiles
        // User wants to see fresh data immediately without clicking Apply Changes
        // CHANGED: Removed strict initialLoadComplete check to ensure data loads even if flag was set but data is missing
        if (!loading && profile && events.length > 0) {
            // IMPORTANT: Do NOT auto-fetch again on filter changes.
            // Auto-load exactly once per profileId (until user switches profiles).
            if (lastAutoLoadedProfileId.current === profileId) return;
            // Force load if we have a profile but no data/alerts yet, or just generally on profile change
            loadData();
            loadAlerts();
            setPendingRefresh(false);
            setPanelFilterChanges({});
            initialLoadComplete.current = true;
            lastAutoLoadedProfileId.current = profileId;

            toast({
                title: `📊 ${profile.profileName}`,
                description: `Loaded ${profile.panels.length} panel${profile.panels.length !== 1 ? 's' : ''} with latest data`,
                duration: 2000,
            });

            // Upload child config when profile is loaded (once per hour max)
            uploadChildConfigIfNeeded(false);

            // Initialize selectedSourceStrs from panel config (Main Panel)
            if (profile.panels[0]) {
                const config = (profile.panels[0] as any).filterConfig;
                const savedSourceStrs = config?.sourceStr || [];
                setSelectedSourceStrs(savedSourceStrs);

                // If Job IDs were saved in config and we have data, trigger auto-refresh
                // This ensures Job ID filter is applied immediately on profile load
                if (savedSourceStrs.length > 0 && graphData.length > 0) {
                    // console.log('🔄 Auto-applying Job ID filter from saved config:', savedSourceStrs);
                    // Trigger refresh for main panel with saved Job IDs
                    if (profile.panels[0]?.panelId) {
                        refreshPanelData(profile.panels[0].panelId);
                    }
                }
            }

            // Initialize alert filters from active panel's alertsConfig when profile loads
            // This will be updated when active panel changes via useEffect
            const activePanelForInit = activePanelIndex === 0
                ? profile.panels[0]
                : (profile.panels[activePanelIndex] || profile.panels[0]);

            if (activePanelForInit?.alertsConfig) {
                const alertsConfig = activePanelForInit.alertsConfig;
                const panelConfig = (activePanelForInit as any).filterConfig;

                // Set event filters from saved config
                if (alertsConfig.filterByEvents && alertsConfig.filterByEvents.length > 0) {
                    const eventIds = alertsConfig.filterByEvents.map((id: string | number) => {
                        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                        return isNaN(numId) ? null : numId;
                    }).filter((id: number | null): id is number => id !== null);

                    // console.log('🔔 Initializing alert filters from panel config:', {
                    // panelId: activePanelForInit.panelId,
                    // events: eventIds,
                    // isApi: alertsConfig.isApi,
                    // isHourly: alertsConfig.isHourly,
                    // dateRange: panelConfig?.dateRange
                    // });

                    setAlertFilters(prev => ({
                        ...prev,
                        events: eventIds
                    }));
                }

                // Set API toggle from saved config
                if (typeof alertsConfig.isApi === 'number') {
                    setAlertIsApi(alertsConfig.isApi);
                } else if (alertsConfig.isApi === true) {
                    setAlertIsApi(1);
                } else {
                    setAlertIsApi(0);
                }

                // Set hourly toggle from saved config
                if (typeof alertsConfig.isHourly === 'boolean') {
                    setAlertIsHourly(alertsConfig.isHourly);
                }

                // NOTE: Removed config-based alertDateRange override
                // Alerts should always use the default 8-day range
            }
        }
    }, [loading, profileId, profile, events.length, graphData.length, toast, uploadChildConfigIfNeeded, refreshPanelData]);

    // Set pending refresh when filters or date range change (only after initial load)
    useEffect(() => {
        if (!loading && profile && events.length > 0 && graphData.length > 0 && initialLoadComplete.current) {
            // Mark that filters have changed and need to be applied
            setPendingRefresh(true);
            // Mark all panels as having filter changes
            if (profile?.panels) {
                const changes: Record<string, boolean> = {};
                profile.panels.forEach(panel => {
                    changes[panel.panelId] = true;
                });
                setPanelFilterChanges(changes);
            }
        }
    }, [filters, dateRange]);

    // Refresh data when hourly/daily toggle changes
    const prevHourlyOverride = useRef<boolean | null>(null);
    const prevPanelChartType = useRef<Record<string, 'default' | 'deviation'>>({});
    const prevPanelHourlyOverride = useRef<Record<string, boolean | null>>({});

    useEffect(() => {
        // Trigger if hourlyOverride changed or panelChartType changed or per-panel logic changed
        const hourlyChanged = prevHourlyOverride.current !== hourlyOverride && prevHourlyOverride.current !== null;
        const chartTypeChanged = JSON.stringify(prevPanelChartType.current) !== JSON.stringify(panelChartType);
        const panelHourlyChanged = JSON.stringify(prevPanelHourlyOverride.current) !== JSON.stringify(panelHourlyOverride);

        if (hourlyChanged || chartTypeChanged || panelHourlyChanged) {
            if (!loading && profile && events.length > 0 && initialLoadComplete.current) {
                // Refresh main panel - only if global override changed
                if (hourlyChanged && profile.panels[0]?.panelId) {
                    refreshPanelData(profile.panels[0].panelId);
                }

                // Refresh current active panel - always if any state changed that affects it
                // For panelHourlyChanged, we technically only need to refresh IF the active panel is the one that changed.
                // But refreshing the active panel is safe and cheap enough.
                const activePanelId = profile.panels[activePanelIndex]?.panelId;
                // If main panel is active, we already refreshed it above (if global changed).
                // If it's an additional panel, we must refresh it to pick up new panelOverride or global changes.
                if (activePanelId) {
                    if (activePanelId !== profile.panels[0]?.panelId) {
                        refreshPanelData(activePanelId);
                    } else if (!hourlyChanged && (chartTypeChanged || panelHourlyChanged)) {
                        // If main panel is active, and global hourly didn't change, but chartType/panelOverride did, refresh it
                        refreshPanelData(activePanelId);
                    }
                }
            }
        }
        prevHourlyOverride.current = hourlyOverride;
        prevPanelChartType.current = panelChartType;
        prevPanelHourlyOverride.current = panelHourlyOverride;
    }, [hourlyOverride, panelChartType, panelHourlyOverride, profile, loading, events.length, activePanelIndex, refreshPanelData]);

    // Removed auto-fetch on filter changes - data loads automatically when switching profiles
    // User must click Apply Changes to update data after changing filters

    // Auto-refresh main panel (user-configurable, 0 = disabled by default)
    useEffect(() => {
        if (autoRefreshMinutes <= 0 || !profile || profile.panels.length === 0) return;
        const interval = setInterval(() => {
            refreshPanelData(profile.panels[0].panelId);
        }, autoRefreshMinutes * 60 * 1000);
        return () => clearInterval(interval);
    }, [autoRefreshMinutes, profile, refreshPanelData]);

    // Manual refresh trigger for main panel only (first panel)
    const handleApplyFilters = useCallback(() => {
        setPendingRefresh(false);
        if (profile && profile.panels.length > 0) {
            // Only refresh the first/main panel
            refreshPanelData(profile.panels[0].panelId);
            // Clear the filter change state for the main panel
            setPanelFilterChanges(prev => ({
                ...prev,
                [profile.panels[0].panelId]: false
            }));
        }
    }, [profile, refreshPanelData]);

    // Individual panel refresh function
    const handlePanelRefresh = useCallback((panelId: string) => {
        refreshPanelData(panelId);
        // Clear the filter change state for this specific panel
        setPanelFilterChanges(prev => ({
            ...prev,
            [panelId]: false
        }));
    }, [refreshPanelData]);

    // Function to jump to a panel - sets activePanelIndex and auto-fetches data if needed
    const handleJumpToPanel = useCallback((panelId: string, panelName?: string) => {
        // SINGLE PANEL ARCHITECTURE: Set the active panel index
        const panelIndex = profile?.panels.findIndex(p => p.panelId === panelId) ?? -1;
        if (panelIndex >= 0) {
            setActivePanelIndex(panelIndex);
        }

        // Update active panel ID for sidebar tracking
        if (onPanelActive) {
            onPanelActive(panelId);
        }
        setActivePanelId(panelId);

        // Auto-fetch panel data if not already loaded
        const panelData = panelsDataMap.get(panelId);
        const isMainPanel = panelIndex === 0;

        // For main panel, check legacy graphData state; for others, check panelsDataMap
        const hasData = isMainPanel
            ? graphData.length > 0
            : (panelData && panelData.graphData.length > 0);

        if (!hasData || (panelData && panelData.loading)) {
            // Only fetch if we have profile and events loaded
            if (profile && events.length > 0) {
                refreshPanelData(panelId);
                // Clear pending refresh state after auto-fetch so "Apply Changes" isn't needed
                setPendingRefresh(false);
                setPanelFilterChanges(prev => ({ ...prev, [panelId]: false }));
            }
        } else {
            // Panel already has data - still clear pending refresh to avoid confusion
            setPendingRefresh(false);
            setPanelFilterChanges(prev => ({ ...prev, [panelId]: false }));
        }
    }, [panelsDataMap, profile, events, refreshPanelData, onPanelActive, graphData]);

    // Expose handleJumpToPanel via window for external access (used by AnalyticsLayout)
    useEffect(() => {
        (window as any).__dashboardViewerJumpToPanel = handleJumpToPanel;
        return () => {
            delete (window as any).__dashboardViewerJumpToPanel;
        };
    }, [handleJumpToPanel]);

    // Fetch API filters for individual panels
    const fetchPanelApiFilters = useCallback(async (panelId: string) => {
        if (!profile || !events || events.length === 0) return;

        const panel = profile.panels.find(p => p.panelId === panelId);
        if (!panel) return;

        const panelConfig = (panel as any).filterConfig;
        if (!panelConfig?.isApiEvent) return;

        const currentFilters = panelFiltersState[panelId] || filters;

        // Need at least one event selected
        if (currentFilters.events.length === 0) {
            toast({
                title: "No events selected",
                description: "Please select at least one event to fetch API filters",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }

        setPanelLoadingApiFilters(prev => ({ ...prev, [panelId]: true }));
        try {
            // IMPORTANT: No API call here. Derive options from already fetched panel rawGraphResponse.
            const rawData: any[] = (panelsDataMap.get(panelId)?.rawGraphResponse?.data || []) as any[];
            if (rawData.length > 0) {
                const statusCodes = new Set<string>();
                const cacheStatuses = new Set<string>();

                rawData.forEach((record: any) => {
                    if (record?.status !== undefined && record?.status !== null) {
                        statusCodes.add(String(record.status));
                    }
                    if (record?.cacheStatus && typeof record.cacheStatus === 'string') {
                        cacheStatuses.add(record.cacheStatus);
                    }
                });

                const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                const sortedCacheStatuses = Array.from(cacheStatuses).sort();

                setPanelAvailableStatusCodes(prev => ({ ...prev, [panelId]: sortedStatusCodes }));
                setPanelAvailableCacheStatuses(prev => ({ ...prev, [panelId]: sortedCacheStatuses }));

                // Auto-initialize filters with defaults
                const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
                const defaultCache = sortedCacheStatuses;

                setPanelFiltersState(prev => ({
                    ...prev,
                    [panelId]: {
                        ...prev[panelId],
                        percentageStatusCodes: defaultStatus,
                        percentageCacheStatus: defaultCache
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to fetch panel API filters:', error);
            toast({
                title: "Failed to fetch API filters",
                description: "Please try again",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setPanelLoadingApiFilters(prev => ({ ...prev, [panelId]: false }));
        }
    }, [profile, events.length, panelsDataMap, panelFiltersState, filters, toast]);

    // Fetch API filters (status codes, cache statuses, job IDs) for main panel
    // IMPORTANT: No API call here. We derive filter options from already-fetched rawGraphResponse.
    const fetchApiFilters = useCallback(async () => {
        if (!profile || !isMainPanelApi || !events || events.length === 0) return;

        const mainPanel = profile.panels[0];
        if (!mainPanel) return;

        const mainPanelId = mainPanel.panelId;
        const rawData: any[] = (panelsDataMap.get(mainPanelId)?.rawGraphResponse?.data || rawGraphResponse?.data || []) as any[];
        if (!rawData || rawData.length === 0) return;

        setLoadingApiFilters(true);
        try {
            const jobIds = new Set<string>();
            const statusCodes = new Set<string>();
            const cacheStatuses = new Set<string>();

            rawData.forEach((record: any) => {
                if (record?.sourceStr && typeof record.sourceStr === 'string' && record.sourceStr.trim() !== '') {
                    jobIds.add(record.sourceStr);
                }
                if (record?.status !== undefined && record?.status !== null) {
                    statusCodes.add(String(record.status));
                }
                if (record?.cacheStatus && typeof record.cacheStatus === 'string') {
                    cacheStatuses.add(record.cacheStatus);
                }
            });

            const sortedJobIds = Array.from(jobIds).sort();
            const sortedStatusCodes = Array.from(statusCodes).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const sortedCacheStatuses = Array.from(cacheStatuses).sort();

            setAvailableSourceStrs(sortedJobIds);
            setAvailableStatusCodes(sortedStatusCodes);
            setAvailableCacheStatuses(sortedCacheStatuses);

            // Auto-initialize filters with defaults
            const defaultStatus = sortedStatusCodes.includes('200') ? ['200'] : sortedStatusCodes;
            const defaultCache = sortedCacheStatuses;

            setPanelFiltersState(prev => ({
                ...prev,
                [mainPanelId]: {
                    ...prev[mainPanelId],
                    percentageStatusCodes: defaultStatus,
                    percentageCacheStatus: defaultCache
                }
            }));
        } finally {
            setLoadingApiFilters(false);
        }
    }, [profile, isMainPanelApi, events.length, panelsDataMap, rawGraphResponse]);

    const handleFilterChange = useCallback((type: keyof FilterState, values: any) => {
        // console.log('handleFilterChange called:', { type, values });

        // Special handling for boolean toggles
        if (type === 'activePercentageGroupChildEvents') {
            // Update the main panel's filter state (first panel) - SCOPED TO MAIN PANEL ONLY
            if (profile?.panels && profile.panels.length > 0) {
                const mainPanelId = profile.panels[0].panelId;
                setPanelFiltersState(prev => ({
                    ...prev,
                    [mainPanelId]: {
                        ...prev[mainPanelId],
                        [type]: values
                    }
                }));
                // Set pending refresh to true to show the "Changed" badge
                setPendingRefresh(true);
            }
            return;
        }

        // Determine value type based on filter key
        // activeStages, activePercentageEvents, activeFunnelChildEvents use string IDs
        // platform, pos, source, events use numeric IDs
        const isStringFilter = ['activeStages', 'activePercentageEvents', 'activePercentageChildEvents', 'activeFunnelChildEvents', 'percentageStatusCodes', 'percentageCacheStatus'].includes(type as string);

        // Ensure values is an array for mapping
        const valuesArray = Array.isArray(values) ? values : [values];

        const finalValues = isStringFilter
            ? valuesArray
            : valuesArray.map((v: any) => parseInt(v)).filter((id: number) => !isNaN(id));

        // console.log('Final values after processing:', finalValues);

        // Update the main panel's filter state (first panel) - SCOPED TO MAIN PANEL ONLY
        if (profile?.panels && profile.panels.length > 0) {
            const mainPanelId = profile.panels[0].panelId;

            // console.log('Updating panel filters for:', mainPanelId);

            // Update panel-specific filters for the main panel ONLY
            setPanelFiltersState(prev => {
                const updated = {
                    ...prev,
                    [mainPanelId]: {
                        ...prev[mainPanelId],
                        [type]: finalValues
                    }
                };
                // console.log('Updated panel filters state:', updated);
                return updated;
            });

            // Mark that ONLY this specific panel's filters have changed
            setPanelFilterChanges(prev => ({
                ...prev,
                [mainPanelId]: true
            }));

            // Do NOT trigger global refresh - only main panel refresh will be triggered by useEffect
        }

        // Also update global state for backward compatibility (but this won't be used)
        // Only if numeric, as FilterState expects number[] for legacy keys
        if (!isStringFilter) {
            setFilters(prev => ({ ...prev, [type]: finalValues as number[] }));
        }
    }, [profile, setFilters, setPanelFiltersState, setPanelFilterChanges, setPendingRefresh]);


    const totals = useMemo(() => {
        const totalCount = graphData.reduce((sum, d) => sum + (d.count || 0), 0);
        const totalSuccess = graphData.reduce((sum, d) => sum + (d.successCount || 0), 0);
        const totalFail = graphData.reduce((sum, d) => sum + (d.failCount || 0), 0);
        return { totalCount, totalSuccess, totalFail };
    }, [graphData]);

    const eventOptions = useMemo(() => {
        return events
            .filter(e => isMainPanelApi ? e.isApiEvent === true : e.isApiEvent !== true)
            .sort((a, b) => {
                if (isMainPanelApi) {
                    const aLabel = a.host && a.url ? `${a.host} - ${a.url}` : a.eventName;
                    const bLabel = b.host && b.url ? `${b.host} - ${b.url}` : b.eventName;

                    const aIs200 = aLabel.includes('200') || a.eventName.includes('200');
                    const bIs200 = bLabel.includes('200') || b.eventName.includes('200');

                    if (aIs200 && !bIs200) return -1;
                    if (!aIs200 && bIs200) return 1;

                    const aStatus = parseInt(a.eventName) || 999;
                    const bStatus = parseInt(b.eventName) || 999;
                    return aStatus - bStatus;
                }
                return 0;
            })
            .map(e => {
                let label = e.isApiEvent && e.host && e.url
                    ? `${e.host} - ${e.url}`
                    : e.eventName;
                const tags: string[] = [];
                if (e.isErrorEvent === 1) tags.push('[isError]');
                if (e.isAvgEvent === 1) tags.push('[isAvg]');
                if (tags.length > 0) {
                    label = `${e.eventName} ${tags.join(' ')}`;
                }
                return {
                    value: e.eventId,
                    label,
                    isErrorEvent: e.isErrorEvent === 1,
                    isAvgEvent: e.isAvgEvent === 1
                };
            });
    }, [events, isMainPanelApi]);

    const eventNames = useMemo(() => {
        const names: Record<string, string> = {};
        eventOptions.forEach(opt => {
            names[String(opt.value)] = opt.label;
        });
        return names;
    }, [eventOptions]);

    const platformOptions = useMemo(() => PLATFORMS.map(p => ({ value: p.id.toString(), label: p.name })), []);
    const posOptions = useMemo(() => siteDetails.map(s => ({ value: s.id.toString(), label: `${s.name} (${s.id})` })), [siteDetails]);
    const sourceOptions = useMemo(() => SOURCES.map(s => ({ value: s.id.toString(), label: s.name })), []);

    const selectedEventsList = useMemo(() => {
        if (filters.events.length === 0) return ['All Events'];
        return filters.events.map((id) => {
            const ev = eventConfigById.get(String(id));
            return ev?.eventName || `Event ${id}`;
        });
    }, [filters.events, eventConfigById]);

    const DashboardLoadingSkeleton = () => (
        <div className="space-y-6" style={{ zoom: 0.8 }}>
            <div className="h-40 w-full rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
            <div className="h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
            <div className="h-[400px] w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
    );

    if (loading) return <DashboardLoadingSkeleton />;
    if (!profile) return <div className="p-8 text-center text-destructive">Profile not found</div>;

    const { totalCount, totalSuccess, totalFail } = totals;

    // Calculate panel stats for sidebar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _panelStats = profile.panels.reduce((acc, panel) => {
        const data = panelsDataMap.get(panel.panelId);
        if (data?.graphData) {
            acc[panel.panelId] = {
                total: data.graphData.reduce((sum, d) => sum + (d.count || 0), 0),
                success: data.graphData.reduce((sum, d) => sum + (d.successCount || 0), 0)
            };
        }
        return acc;
    }, {} as Record<string, { total: number; success: number; }>);

    // Detect event types for dual Y-axis rendering
    const hasAvgEvents = eventKeys.some(ek => (ek.isAvgEvent || 0) >= 1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasErrorEvents = eventKeys.some(ek => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
    const hasNormalEvents = eventKeys.some(ek => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _hasMixedEventTypes = hasAvgEvents && hasNormalEvents;

    // Scroll Spy: Notify parent of active panel

    // Separate event keys by type
    // Events with isAvgEvent >= 1 (1=time, 2=rupees, 3=count) go to avg charts
    const avgEventKeys = eventKeys.filter(ek => (ek.isAvgEvent || 0) >= 1);
    const errorEventKeys = eventKeys.filter(ek => ek.isErrorEvent === 1 && (!ek.isAvgEvent || ek.isAvgEvent === 0));
    const normalEventKeys = eventKeys.filter(ek => (!ek.isAvgEvent || ek.isAvgEvent === 0) && (!ek.isErrorEvent || ek.isErrorEvent === 0));

    // Compute global avgEventType for pie chart modals (0=count, 1=time, 2=rupees, 3=avg count)
    const globalAvgEventType = avgEventKeys.length > 0
        ? (avgEventKeys[0].isAvgEvent || 0)
        : 0;

    // Check if first panel is a special graph (percentage or funnel)
    const firstPanel = profile?.panels?.[0];
    const firstPanelFilterConfig = (firstPanel as any)?.filterConfig;
    const isFirstPanelSpecialGraph = firstPanelFilterConfig?.graphType === 'percentage' || firstPanelFilterConfig?.graphType === 'funnel' || firstPanelFilterConfig?.graphType === 'user_flow';

    // Format delay value based on event feature (prepared for future use)
    // Price Alert (feature 1) = value is already in MINUTES
    // Spend/Auto-coupon (others) = value is already in SECONDS
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _formatDelayValue = (value: number, _eventKey?: EventKeyInfo) => {
        if (!value || value <= 0) return '0';
        // Find the event config to get feature
        const eventConfig = events.find(e => String(e.eventId) === _eventKey?.eventId);
        const featureId = eventConfig?.feature;
        if (featureId === 1) {
            // Value is already in minutes
            if (value >= 60) return `${(value / 60).toFixed(1)}h`;
            return `${value.toFixed(1)}m`;
        }
        // Value is already in seconds
        if (value >= 60) return `${(value / 60).toFixed(1)}m`;
        return `${value.toFixed(1)}s`;
    };

    return (
        <>

            <div
                className="space-y-6"
                style={{ zoom: 0.8 }}
            >
                {/* ========== PREMIUM HERO HEADER ========== */}
                <HeroGradientHeader
                    title={profile.profileName}
                    subtitle={`Last updated: ${lastUpdated.toLocaleTimeString()}${dataLoading ? ' • Loading...' : ''}`}
                    icon={<LayoutDashboard className="w-7 h-7 text-white" />}
                    variant="gradient"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {onEditProfile && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onEditProfile(profile)}
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Edit Panels</span>
                                    <span className="sm:hidden">Edit</span>
                                </Button>
                            )}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        <span className="truncate">
                                            {`${dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="range"
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range) => {
                                            if (range?.from) {
                                                const newDateRange = {
                                                    from: range.from,
                                                    to: range.to || range.from
                                                };
                                                setDateRange(newDateRange);

                                                // Update the main panel's date range
                                                if (profile?.panels && profile.panels.length > 0) {
                                                    const mainPanelId = profile.panels[0].panelId;
                                                    setPanelDateRanges(prev => ({
                                                        ...prev,
                                                        [mainPanelId]: newDateRange
                                                    }));

                                                    // Mark that this panel's filters have changed
                                                    setPanelFilterChanges(prev => ({
                                                        ...prev,
                                                        [mainPanelId]: true
                                                    }));
                                                }

                                                setPendingRefresh(true);
                                            }
                                        }}
                                        numberOfMonths={2}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button
                                variant={pendingRefresh ? "default" : "secondary"}
                                size="sm"
                                onClick={handleApplyFilters}
                                disabled={dataLoading}
                                className={cn(
                                    pendingRefresh
                                        ? "bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-lg"
                                        : "bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                                )}
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", dataLoading && "animate-spin")} />
                                {pendingRefresh ? "Apply Changes" : "Refresh"}
                            </Button>
                        </div>
                    }
                />


                {/* ========== AMBIENT GRADIENT BACKGROUND ========== */}
                {/* Theme-aware background with Autosnipe Matrix-style effects */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    {isAutosnipe ? (
                        <>
                            {/* Autosnipe Matrix-style background */}
                            <div className="absolute inset-0 bg-gray-950" />
                            {/* Neon green glow top-left */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Neon green glow top-right */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-green-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar - matrix green */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-900/30 via-emerald-900/15 to-transparent" />
                            {/* Center glow */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-green-500/5 via-transparent to-transparent rounded-full blur-3xl" />
                            {/* Scanline effect */}
                            <div className="absolute inset-0 opacity-[0.02]" style={{
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)'
                            }} />
                        </>
                    ) : (
                        <>
                            {/* Default purple theme background */}
                            {/* Top-left purple orb */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 via-indigo-300/15 to-transparent rounded-full blur-3xl" />
                            {/* Top-right pink orb */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-pink-400/15 via-fuchsia-300/10 to-transparent rounded-full blur-3xl" />
                            {/* Removed bottom gradient bar - was causing partial pink coverage */}
                            {/* Center subtle mesh */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-200/10 via-transparent to-transparent dark:from-indigo-500/5 rounded-full blur-3xl" />
                        </>
                    )}
                </div>

                {/* ==================== CRITICAL ALERTS PANEL (Panel-specific) ==================== */}
                {(() => {
                    // Get the currently active panel
                    const activePanel = activePanelIndex === 0
                        ? profile?.panels?.[0]
                        : profile?.panels?.[activePanelIndex];

                    // Only show critical alerts panel if the active panel has alerts config enabled
                    if (!activePanel || activePanel?.alertsConfig?.enabled === false) {
                        return null;
                    }

                    // Get alert config from active panel
                    const panelAlertConfig = activePanel.alertsConfig;
                    const panelConfig = (activePanel as any).filterConfig;

                    // Initialize alert filters from active panel's config
                    const panelEventFilter = panelAlertConfig?.filterByEvents?.map((id: string | number) => {
                        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                        return isNaN(numId) ? null : numId;
                    }).filter((id: number | null): id is number => id !== null) || [];

                    const panelAlertIsApi = typeof panelAlertConfig?.isApi === 'number'
                        ? panelAlertConfig.isApi
                        : (panelAlertConfig?.isApi === true ? 1 : 0);
                    const panelAlertIsHourly = typeof panelAlertConfig?.isHourly === 'boolean'
                        ? panelAlertConfig.isHourly
                        : alertIsHourly;

                    const panelAlertDateRange = panelConfig?.dateRange
                        ? { from: new Date(panelConfig.dateRange.from), to: new Date(panelConfig.dateRange.to) }
                        : alertDateRange;

                    return (
                        <CriticalAlertsPanel
                            criticalAlerts={criticalAlerts}
                            alertSummary={alertSummary}
                            alertsLoading={alertsLoading}
                            alertsExpanded={alertsExpanded}
                            alertsPanelCollapsed={alertsPanelCollapsed}
                            alertFilters={{
                                ...alertFilters,
                                events: panelEventFilter.length > 0 ? panelEventFilter : alertFilters.events
                            }}
                            alertDateRange={alertDateRange}
                            alertsPage={alertsPage}
                            alertIsApi={alertIsApi}
                            alertIsHourly={alertIsHourly}
                            events={events}
                            siteDetails={siteDetails}
                            onToggleCollapse={() => setAlertsPanelCollapsed(!alertsPanelCollapsed)}
                            onToggleExpanded={() => setAlertsExpanded(!alertsExpanded)}
                            onFilterChange={setAlertFilters}
                            onDateRangeChange={setAlertDateRange}
                            onIsApiChange={setAlertIsApi}
                            onIsHourlyChange={setAlertIsHourly}
                            onLoadAlerts={loadAlerts}
                            onPageChange={setAlertsPage}
                            eventToPanelMap={eventToPanelMap}
                            activePanelDbId={(activePanel as any)?._dbPanelId}
                            onJumpToPanel={(panelId, panelName) => {
                                if (handleJumpToPanel) {
                                    handleJumpToPanel(panelId, panelName);
                                }
                            }}
                        />
                    );
                })()}

                {/* ========== AMBIENT GRADIENT BACKGROUND ========== */}
                {/* Theme-aware background with Autosnipe Matrix-style effects */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    {isAutosnipe ? (
                        <>
                            {/* Autosnipe Matrix-style background */}
                            <div className="absolute inset-0 bg-gray-950" />
                            {/* Neon green glow top-left */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Neon green glow top-right */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-green-400/15 via-teal-400/10 to-transparent rounded-full blur-3xl" />
                            {/* Bottom gradient bar - matrix green */}
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-green-900/30 via-emerald-900/15 to-transparent" />
                            {/* Center glow */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-green-500/5 via-transparent to-transparent rounded-full blur-3xl" />
                            {/* Scanline effect */}
                            <div className="absolute inset-0 opacity-[0.02]" style={{
                                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.1) 2px, rgba(34, 197, 94, 0.1) 4px)'
                            }} />
                        </>
                    ) : (
                        <>
                            {/* Default purple theme background */}
                            {/* Top-left purple orb */}
                            <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 via-indigo-300/15 to-transparent rounded-full blur-3xl" />
                            {/* Top-right pink orb */}
                            <div className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-pink-400/15 via-fuchsia-300/10 to-transparent rounded-full blur-3xl" />
                            {/* Removed bottom gradient bar - was causing partial pink coverage */}
                            {/* Center subtle mesh */}
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-indigo-200/10 via-transparent to-transparent dark:from-indigo-500/5 rounded-full blur-3xl" />
                        </>
                    )}
                </div>

                {error && (
                    <div
                        className="p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 shadow-lg"
                    >
                        {error}
                    </div>
                )}

                {/* Panel switching is handled via sidebar - no tabs needed */}

                {/* ==================== MAIN DASHBOARD FILTERS (Panel 1+) ==================== */}
                {/* Only render main panel when activePanelIndex === 0 */}
                {activePanelIndex === 0 && (
                    <div ref={el => { if (profile.panels[0]) panelRefs.current[profile.panels[0].panelId] = el; }}>
                        <MainPanelSection


                            profile={profile}
                            setProfile={setProfile}
                            panelsDataMap={panelsDataMap}
                            rawGraphResponse={rawGraphResponse}
                            graphData={graphData}
                            filteredApiData={filteredApiData}
                            dateRange={dateRange}
                            isHourly={isHourly}
                            setHourlyOverride={setHourlyOverride}
                            filtersCollapsed={filtersCollapsed}
                            setFiltersCollapsed={setFiltersCollapsed}
                            pendingRefresh={pendingRefresh}
                            panelFiltersState={panelFiltersState}
                            handleFilterChange={handleFilterChange}
                            handleApplyFilters={handleApplyFilters}
                            dataLoading={dataLoading}
                            autoRefreshMinutes={autoRefreshMinutes}
                            setAutoRefreshMinutes={setAutoRefreshMinutes}
                            availableStatusCodes={availableStatusCodes}
                            availableCacheStatuses={availableCacheStatuses}
                            availableSourceStrs={availableSourceStrs}
                            selectedSourceStrs={selectedSourceStrs}
                            setSelectedSourceStrs={setSelectedSourceStrs}
                            platformOptions={platformOptions}
                            posOptions={posOptions}
                            sourceOptions={sourceOptions}
                            eventOptions={eventOptions}
                            totalCount={totalCount}
                            totalSuccess={totalSuccess}
                            totalFail={totalFail}
                            selectedEventsList={selectedEventsList}
                            isMainPanelApi={isMainPanelApi}
                            normalEventKeys={normalEventKeys}
                            eventKeys={eventKeys}
                            avgEventKeys={avgEventKeys}
                            errorEventKeys={errorEventKeys}
                            apiEndpointEventKeyInfos={apiEndpointEventKeyInfos}
                            apiPerformanceEventKeys={apiPerformanceEventKeys}
                            mainLegendExpanded={mainLegendExpanded}
                            setMainLegendExpanded={setMainLegendExpanded}
                            selectedEventKey={selectedEventKey}
                            handleEventClick={handleEventClick}
                            overlaySelectedEventKey={overlaySelectedEventKey}
                            handleOverlayEventClick={handleOverlayEventClick}
                            errorSelectedEventKey={errorSelectedEventKey}
                            handleErrorEventClick={(k) => setErrorSelectedEventKey(prev => prev === k ? null : k)}
                            avgSelectedEventKey={avgSelectedEventKey}
                            handleAvgEventClick={(k) => setAvgSelectedEventKey(prev => prev === k ? null : k)}
                            apiSelectedEventKey={apiSelectedEventKey}
                            handleApiEventClick={handleApiEventClick}
                            panelChartType={panelChartType}
                            setPanelChartType={setPanelChartType}
                            pinnedTooltip={pinnedTooltip}
                            setPinnedTooltip={setPinnedTooltip}
                            isFirstPanelSpecialGraph={isFirstPanelSpecialGraph}
                            apiPerformanceSeries={apiPerformanceSeries}
                            apiMetricView={apiMetricView}
                            setApiMetricView={setApiMetricView}
                            pieChartData={pieChartData}
                            openExpandedPie={openExpandedPie}
                            CustomXAxisTick={CustomXAxisTick}
                            HourlyStatsCard={HourlyStatsCard}
                            events={events}
                            toast={toast}
                            isRecording={isRecording}
                            toggleRecording={toggleRecording}
                            voiceTooltip={voiceTooltip}
                            isParsingVoice={isParsingVoice}
                            handleVoiceTranscript={handleVoiceTranscript}
                            voiceStatus={voiceStatus}
                            manualTranscript={manualTranscript}
                            setManualTranscript={setManualTranscript}
                            isAdmin={isAdmin}
                            setVoiceStatus={setVoiceStatus}
                        />


                    </div>
                )}
                {/* Additional Panels (if profile has more than one panel) */}
                {/* SINGLE PANEL ARCHITECTURE: Only render the active panel */}
                {profile.panels.length > 1 && activePanelIndex > 0 && (
                    <AdditionalPanelsSection
                        profile={profile}
                        setProfile={setProfile}
                        panelsDataMap={panelsDataMap}
                        panelFiltersState={panelFiltersState}
                        panelDateRanges={panelDateRanges}
                        panelLoading={panelLoading}
                        panelRefs={panelRefs}
                        dateRange={dateRange}
                        panelFiltersCollapsed={panelFiltersCollapsed}
                        setPanelFiltersCollapsed={setPanelFiltersCollapsed}
                        panelFilterChanges={panelFilterChanges}
                        handlePanelRefresh={handlePanelRefresh}
                        updatePanelDateRange={updatePanelDateRange}
                        updatePanelFilter={updatePanelFilter}
                        events={events}
                        siteDetails={siteDetails}
                        panelAvailableStatusCodes={panelAvailableStatusCodes}
                        panelAvailableCacheStatuses={panelAvailableCacheStatuses}
                        setPanelFiltersState={setPanelFiltersState}
                        setPanelFilterChanges={setPanelFilterChanges}
                        panelChartType={panelChartType}
                        setPanelChartType={setPanelChartType}
                        panelPinnedTooltips={panelPinnedTooltips}
                        setPanelPinnedTooltips={setPanelPinnedTooltips}
                        panelLegendExpanded={panelLegendExpanded}
                        togglePanelLegend={togglePanelLegend}
                        panelSelectedEventKey={panelSelectedEventKey}
                        handlePanelEventClick={(panelId: string, k: string) => setPanelSelectedEventKey(prev => ({ ...prev, [panelId]: prev[panelId] === k ? null : k }))}
                        panelAvgSelectedEventKey={panelAvgSelectedEventKey}
                        handlePanelAvgEventClick={(panelId: string, k: string) => setPanelAvgSelectedEventKey(prev => ({ ...prev, [panelId]: prev[panelId] === k ? null : k }))}
                        CustomXAxisTick={CustomXAxisTick}
                        panelApiPerformanceSeriesMap={panelApiPerformanceSeriesMap}
                        panelApiMetricView={panelApiMetricView}
                        setPanelApiMetricView={setPanelApiMetricView}
                        openExpandedPie={openExpandedPie}
                        isHourly={isHourly}
                        HourlyStatsCard={HourlyStatsCard}
                        // NEW: Pass active panel index to render only that panel
                        activePanelIndex={activePanelIndex}
                        setIsHourly={() => { }} // Not used for additional panels, they use panelHourlyOverride

                        hourlyOverride={hourlyOverride} // Global override (legacy/main)
                        setHourlyOverride={setHourlyOverride} // Global setter (legacy/main)
                        panelHourlyOverride={panelHourlyOverride}
                        setPanelHourlyOverrideForId={setPanelHourlyOverrideForId}
                        handlePanelZoom={handlePanelZoom}
                        handlePanelWheel={handlePanelWheel}

                        isRecording={isRecording}
                        toggleRecording={toggleRecording}
                        voiceTooltip={voiceTooltip}
                        isParsingVoice={isParsingVoice}
                        handleVoiceTranscript={handleVoiceTranscript}
                        voiceStatus={voiceStatus}
                        manualTranscript={manualTranscript}
                        setManualTranscript={setManualTranscript}
                        isAdmin={isAdmin}
                        setVoiceStatus={setVoiceStatus}
                    />
                )}

                {/* Expanded Pie Chart Modal */}
                <ExpandedPieChartModal
                    open={pieModalOpen}
                    onClose={() => {
                        setSearchParams(prev => {
                            const next = new URLSearchParams(prev as any);
                            next.delete('expandedPie');
                            return next;
                        });
                    }}
                    pieData={expandedPie}
                    isAvgEventType={globalAvgEventType}
                />
            </div>
        </>
    );
}
