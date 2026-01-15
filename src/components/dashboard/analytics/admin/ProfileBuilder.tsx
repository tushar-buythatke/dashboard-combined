import { useState, useEffect } from 'react';
import type { DashboardProfile, PanelConfig, EventConfig } from '@/types/analytics';
import { mockService } from '@/services/mockData';
import { apiService, PLATFORMS, SOURCES, getFeatureName, getFeatureShortName } from '@/services/apiService';
import type { SiteDetail } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PanelCombineModal } from './PanelCombineModal';
import { PanelPreview } from './PanelPreview';
import { Save, Trash2, Plus, Combine, Layers, BarChart3, LineChart, CalendarIcon, Bell, AlertTriangle, RefreshCw, Activity, ChevronLeft, ChevronRight, LayoutDashboard, GitBranch } from 'lucide-react';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { TutorialOverlay, type TutorialStep } from '../components/TutorialOverlay';
import { InfoTooltip } from '../components/InfoTooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProfileBuilderProps {
    featureId: string;
    onCancel: () => void;
    onSave?: () => void;
    initialProfileId?: string | null;
}

// Extended panel config with filters using numeric IDs
interface ExtendedPanelConfig extends Omit<PanelConfig, 'type'> {
    type: 'separate' | 'combined' | 'alerts' | 'special'; // Extended type to include alerts panel and special graphs
    filters: {
        events: number[];      // Numeric event IDs
        platforms: number[];   // Numeric platform IDs
        pos: number[];         // Numeric POS IDs
        sources: number[];     // Numeric source IDs
        sourceStr: string[];   // Job IDs (client-side filter)
    };
    graphType: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow';
    userFlowConfig?: {
        stages: { id: string; label: string; eventIds: string[] }[];
        showDropOffs: boolean;
    };
    dateRange: {
        from: Date;
        to: Date;
    };
    showHourlyStats: boolean;
    dailyDeviationCurve?: boolean;
    isApiEvent?: boolean; // Toggle for API events vs regular events
    autoApiConfig?: boolean; // Auto-detect and configure API events
    // Per-panel critical alert configuration
    criticalAlertConfig?: {
        enabled: boolean;
        alertEventFilters: number[]; // Event IDs to monitor
        alertsIsApi: number; // 0=REGULAR, 1=API, 2=PERCENT
        alertsIsHourly: boolean;
    };
}

export function ProfileBuilder({ featureId, onCancel, onSave, initialProfileId }: ProfileBuilderProps) {
    const { user } = useAnalyticsAuth();
    const { toast } = useToast();
    const [profileName, setProfileName] = useState('New Profile');
    const [panels, setPanels] = useState<ExtendedPanelConfig[]>([]);
    const [alertEventFilters, setAlertEventFilters] = useState<number[]>([]); // Event IDs for critical alerts
    const [alertsIsApi, setAlertsIsApi] = useState<number>(0); // 0=REGULAR, 1=API, 2=PERCENT
    const [alertsIsHourly, setAlertsIsHourly] = useState(false); // Default to Daily as per request
    const [loading, setLoading] = useState(true);
    const [workflowMode, setWorkflowMode] = useState<'quick' | 'template'>('template');
    const [combineModalOpen, setCombineModalOpen] = useState(false);
    const [combiningPanel, setCombiningPanel] = useState<ExtendedPanelConfig | null>(null);
    const [currentPanelIndex, setCurrentPanelIndex] = useState(0); // For single-panel edit mode
    
    // DB IDs for proper upsert behavior (UPDATE instead of INSERT)
    const [dbProfileId, setDbProfileId] = useState<number | undefined>(undefined);
    const [dbPanelIds, setDbPanelIds] = useState<Record<string, number>>({});

    // Tutorial state
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [savedTutorialState, setSavedTutorialState] = useState<{
        panels: ExtendedPanelConfig[];
        alertEventFilters: number[];
        alertsIsApi: number;
    } | null>(null);

    const tutorialSteps: TutorialStep[] = [
        {
            id: 'welcome',
            title: '👋 Welcome to Profile Builder!',
            description: 'This interactive guide will teach you how to create powerful dashboards. You can exit anytime by clicking the X. Let\'s get started!',
            targetId: 'profile-builder-header',
            position: 'bottom',
            arrow: 'down'
        },
        {
            id: 'critical-alerts-intro',
            title: '🚨 Critical Alerts Monitor',
            description: 'Panel 0 is special - it monitors your system for anomalies, errors, and performance issues across all your features.',
            targetId: 'panel-alerts',
            position: 'bottom',
            arrow: 'down'
        },
        {
            id: 'alert-api-toggle',
            title: '🔄 API vs Regular Events (Alerts)',
            description: 'Toggle this to switch between monitoring regular feature events or low-level API metrics (status codes, response times).',
            targetId: 'alert-api-toggle',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'alert-event-selection',
            title: '🎯 Select Events to Monitor',
            description: 'Choose specific events to track in alerts, or leave empty to monitor everything. This helps you focus on what matters most.',
            targetId: 'alert-event-dropdown',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'add-new-panel',
            title: '➕ Adding New Panels',
            description: 'Click this button to add a new panel. Each panel can track different metrics with its own filters and visualization type.',
            targetId: 'add-panel-btn',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'panel-name',
            title: '✏️ Panel Name',
            description: 'Give your panel a descriptive name so you can easily identify it on your dashboard.',
            targetId: 'panel-name-input',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'event-type-toggle',
            title: '🔀 Event Type Toggle',
            description: 'This is one of the most powerful features! Toggle between Regular Events (feature tracking) and API Events (technical metrics like response times).',
            targetId: 'api-event-toggle',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'event-selection',
            title: '📊 Select Events to Track',
            description: 'Choose which events you want to visualize in this panel. You can select multiple events to compare them.',
            targetId: 'event-dropdown',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'platform-filter',
            title: '💻 Platform Filter',
            description: 'Filter data by platform (Desktop, Mobile, etc.). Leave empty to show all platforms.',
            targetId: 'platform-dropdown',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'pos-filter',
            title: '📍 POS Filter',
            description: 'Filter by Point of Sale (store location). This helps you analyze regional performance.',
            targetId: 'pos-dropdown',
            position: 'left',
            arrow: 'right'
        },
        {
            id: 'source-filter',
            title: '🔗 Source Filter',
            description: 'Filter by traffic source to see which channels are performing best.',
            targetId: 'source-dropdown',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'date-range',
            title: '📅 Date Range',
            description: 'Select the time period for your data. You can analyze trends over days, weeks, or months.',
            targetId: 'date-range-picker',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'job-id-filter',
            title: '🔍 Job ID Filter (Advanced)',
            description: 'Filter by specific Job IDs for debugging. Click "Fetch Job IDs" to see available options based on your selected events.',
            targetId: 'job-id-section',
            position: 'top',
            arrow: 'down'
        },
        {
            id: 'graph-types',
            title: '📈 Choosing the Right Visualization',
            description: 'Select the best way to represent your data. Different graph types reveal different insights!',
            targetId: 'graph-type-selector',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'graph-line',
            title: '📉 Line Chart: For Trends',
            description: 'Ideal for tracking trends over time. Perfect for identifying patterns, growth, or sudden drops in activity.',
            targetId: 'line-radio-item',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'graph-bar',
            title: '📊 Bar Chart: For Comparisons',
            description: 'Best for comparing volumes across different categories like Platforms, POS, or status codes.',
            targetId: 'bar-radio-item',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'graph-percentage',
            title: '🎯 Percentage Graph: Success Rates',
            description: 'Calculates the ratio between Parent and Child events. Used for success rates, error rates, and conversion ratios.',
            targetId: 'percentage-radio-item',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'graph-funnel',
            title: '▼ Funnel Graph: Journey Analysis',
            description: 'Visualize multi-step user journeys. Identify exactly where users drop off and optimize your flow.',
            targetId: 'funnel-radio-item',
            position: 'right',
            arrow: 'left'
        },
        {
            id: 'finish',
            title: '🎉 You\'re All Set!',
            description: 'You\'ve learned how to create powerful dashboard profiles! Your changes haven\'t been saved - click "Save Profile" when you\'re ready. Now go build something amazing!',
            targetId: 'profile-builder-header',
            position: 'bottom',
            arrow: 'down'
        }
    ];

    const startTutorial = () => {
        // Save current state before starting tutorial
        setSavedTutorialState({
            panels: JSON.parse(JSON.stringify(panels)),
            alertEventFilters: [...alertEventFilters],
            alertsIsApi: alertsIsApi
        });

        setIsTutorialOpen(true);
        setCurrentStep(0);
    };

    const exitTutorial = () => {
        setIsTutorialOpen(false);
        setCurrentStep(0);

        // Restore saved state if user wants to revert changes
        if (savedTutorialState) {
            setPanels(savedTutorialState.panels);
            setAlertEventFilters(savedTutorialState.alertEventFilters);
            setAlertsIsApi(savedTutorialState.alertsIsApi);
            setSavedTutorialState(null);
        }
    };

    const nextStep = () => {
        if (currentStep < tutorialSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Finish tutorial - keep changes
            setIsTutorialOpen(false);
            setCurrentStep(0);
            setSavedTutorialState(null);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Data loaded from APIs
    const [availableEvents, setAvailableEvents] = useState<EventConfig[]>([]);
    const [siteDetails, setSiteDetails] = useState<SiteDetail[]>([]);
    const [availableJobIds, setAvailableJobIds] = useState<string[]>([]); // Job IDs from API
    const [availableStatusCodes, setAvailableStatusCodes] = useState<string[]>([]); // Status codes from API
    const [availableCacheStatuses, setAvailableCacheStatuses] = useState<string[]>([]); // Cache statuses from API
    const [loadingJobIds, setLoadingJobIds] = useState(false);

    // Function to fetch available job IDs, status codes, and cache statuses from a sample API call
    const fetchAvailableJobIds = async (panelId?: string) => {
        const panel = panelId ? panels.find(p => p.panelId === panelId) : panels[0];
        if (!panel || panel.filters.events.length === 0) {
            return; // Need at least one event selected
        }

        setLoadingJobIds(true);
        try {
            const promises: Promise<any>[] = [];

            // 1. Fetch Job IDs (sourceStr) using dedicated API
            promises.push(apiService.fetchSourceStr(panel.filters.events).then((response: any) => {
                const jobIds = new Set<string>();
                // fetchSourceStr returns array directly
                if (Array.isArray(response)) {
                    response.forEach((id: string) => {
                        if (id && typeof id === 'string' && id.trim() !== '') {
                            jobIds.add(id);
                        }
                    });
                }
                return { type: 'jobIds', data: jobIds };
            }).catch((err: any) => {
                console.error("Failed to fetch sourceStrs", err);
                return { type: 'jobIds', data: new Set<string>() };
            }));

            // 2. For API events, we also need status codes and cache statuses
            // We still need to fetch some graph data to find active status codes if no dedicated API exists
            if (panel.isApiEvent) {
                promises.push(apiService.getGraphData(
                    panel.filters.events,

                    [], [], [], [], // empty filters (including sourceStr)
                    panel.dateRange.from,
                    panel.dateRange.to,
                    true
                ).then((response: any) => {
                    const statusCodes = new Set<string>();
                    const cacheStatuses = new Set<string>();

                    if (response?.data) {
                        response.data.forEach((record: any) => {
                            // Direct field extraction
                            if (record.status !== undefined && record.status !== null) {
                                statusCodes.add(String(record.status));
                            }
                            if (record.cacheStatus && typeof record.cacheStatus === 'string') {
                                cacheStatuses.add(record.cacheStatus);
                            }

                            // Processed data format keys extraction
                            Object.keys(record).forEach((key: string) => {
                                const statusMatch = key.match(/_status_(\d+)_/);
                                const cacheMatch = key.match(/_cache_([^_]+)_/);
                                if (statusMatch) statusCodes.add(statusMatch[1]);
                                if (cacheMatch) cacheStatuses.add(cacheMatch[1]);
                            });
                        });
                    }
                    return { type: 'apiMeta', statusCodes, cacheStatuses };
                }).catch((err: any) => {
                    console.error("Failed to fetch API metadata", err);
                    return { type: 'apiMeta', statusCodes: new Set(), cacheStatuses: new Set() };
                }));
            }

            const results = await Promise.all(promises);
            let jobIds = new Set<string>();
            let statusCodes = new Set<string>();
            let cacheStatuses = new Set<string>();

            results.forEach((res: any) => {
                if (res.type === 'jobIds') jobIds = res.data;
                if (res.type === 'apiMeta') {
                    statusCodes = res.statusCodes;
                    cacheStatuses = res.cacheStatuses;
                }
            });

            setAvailableJobIds(Array.from(jobIds).sort());
            if (panel.isApiEvent) {
                setAvailableStatusCodes(Array.from(statusCodes).sort((a, b) => Number(a) - Number(b)));
                setAvailableCacheStatuses(Array.from(cacheStatuses).sort());
            }

        } catch (error) {
            console.error("Error fetching available options:", error);
            toast({
                title: "Error fetching options",
                description: "Could not load Job IDs or metadata. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoadingJobIds(false);
        }
    };



    // Load events and site details from APIs
    useEffect(() => {
        const loadApiData = async () => {
            try {
                // Load events for this feature
                const events = await apiService.getEventsList(featureId);
                setAvailableEvents(events);

                // Load site details for POS
                const sites = await apiService.getSiteDetails(parseInt(featureId) || undefined);
                setSiteDetails(sites);
            } catch (error) {
                console.error('Failed to load API data:', error);
            }
        };

        loadApiData();
    }, [featureId]);

    // Load initial profile if editing
    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);

            if (initialProfileId) {
                const profile = await mockService.getProfile(initialProfileId);
                if (profile) {
                    setProfileName(profile.profileName);
                    
                    // Preserve DB IDs for proper upsert (UPDATE not INSERT)
                    if ((profile as any)._dbProfileId) {
                        setDbProfileId((profile as any)._dbProfileId);
                    }
                    if ((profile as any)._dbPanelIds) {
                        setDbPanelIds((profile as any)._dbPanelIds);
                    }
                    // Convert to extended format - load saved filterConfig if available
                    const extendedPanels: ExtendedPanelConfig[] = profile.panels.map(p => {
                        // Check if filterConfig was saved
                        const savedConfig = (p as any).filterConfig;

                        // Preserve the type if it's alerts panel or special
                        const panelType = (p as any).type === 'alerts' ? 'alerts' :
                            (p as any).type === 'special' ? 'special' :
                                (p.type || 'separate');

                        const basePanel: any = {
                            ...p,
                            type: panelType as 'separate' | 'combined' | 'alerts' | 'special',
                            // Preserve _dbPanelId for proper DB upsert
                            _dbPanelId: (p as any)._dbPanelId,
                            filters: savedConfig ? {
                                events: savedConfig.events || [],
                                platforms: savedConfig.platforms || [0],
                                pos: savedConfig.pos || [2],
                                sources: savedConfig.sources || [],
                                sourceStr: savedConfig.sourceStr || [] // Job IDs
                            } : {
                                // Fallback to defaults
                                events: p.events.map(e => parseInt(e.eventId)).filter(id => !isNaN(id)),
                                platforms: [0], // Chrome Extension
                                pos: [2],       // Flipkart
                                sources: [],    // All sources
                                sourceStr: []   // No job filter by default
                            },
                            graphType: (savedConfig?.graphType || 'line') as 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow',
                            dateRange: savedConfig?.dateRange ? {
                                from: new Date(savedConfig.dateRange.from),
                                to: new Date(savedConfig.dateRange.to)
                            } : {
                                from: subDays(new Date(), 7),
                                to: new Date()
                            },
                            showHourlyStats: savedConfig?.showHourlyStats !== false, // Default to true
                            // Default deviation curve to enabled unless explicitly disabled
                            dailyDeviationCurve: savedConfig?.dailyDeviationCurve !== false,
                            // Load API event flag - preserve from filterConfig OR detect from events
                            isApiEvent: (() => {
                                // First priority: explicit saved config
                                if (savedConfig?.isApiEvent !== undefined) return savedConfig.isApiEvent;
                                // Second priority: check if all events are API events (disabled for now to avoid errors)
                                // Auto-detection would require access to availableEvents which isn't in scope here
                                return false;
                            })()
                        };

                        // Restore percentageConfig if it exists
                        if (savedConfig?.percentageConfig) {
                            basePanel.percentageConfig = savedConfig.percentageConfig;
                        }

                        // Restore funnelConfig if it exists
                        if (savedConfig?.funnelConfig) {
                            basePanel.funnelConfig = savedConfig.funnelConfig;
                        }

                        // Restore userFlowConfig if it exists
                        if (savedConfig?.userFlowConfig) {
                            basePanel.userFlowConfig = savedConfig.userFlowConfig;
                        }

                        // Load per-panel critical alert configuration
                        if ((p as any).alertsConfig) {
                            const alertsConfig = (p as any).alertsConfig;
                            basePanel.criticalAlertConfig = {
                                enabled: alertsConfig.enabled !== false,
                                alertEventFilters: alertsConfig.filterByEvents?.map((id: string) => parseInt(id)) || [],
                                alertsIsApi: typeof alertsConfig.isApi === 'number' ? alertsConfig.isApi : (alertsConfig.isApi ? 1 : 0),
                                alertsIsHourly: alertsConfig.isHourly || false
                            };
                        } else {
                            // Initialize default critical alert config if not present
                            basePanel.criticalAlertConfig = {
                                enabled: true,
                                alertEventFilters: [],
                                alertsIsApi: 0,
                                alertsIsHourly: false
                            };
                        }

                        return basePanel;
                    });

                    // Check if profile already has alerts panel, if not add one at beginning
                    const hasAlertsPanel = extendedPanels.some(p => p.type === 'alerts');
                    // Load alert config from profile
                    setAlertEventFilters(profile.criticalAlerts?.filterByEvents?.map(id => parseInt(id)) || []);
                    // Handle both boolean (legacy) and number values for isApi
                    const savedIsApi = profile.criticalAlerts?.isApi;
                    setAlertsIsApi(typeof savedIsApi === 'number' ? savedIsApi : (savedIsApi ? 1 : 0));
                    setAlertsIsHourly(profile.criticalAlerts?.isHourly !== false); // Default to true

                    if (!hasAlertsPanel) {
                        const alertsPanel: ExtendedPanelConfig = {
                            panelId: 'panel_alerts',
                            panelName: 'Critical Alerts',
                            type: 'alerts',
                            position: { row: 1, col: 1, width: 12, height: 2 },
                            events: [],
                            filters: {
                                events: [],
                                platforms: [],
                                pos: [],
                                sources: [],
                                sourceStr: []
                            },
                            graphType: 'line',
                            dateRange: {
                                from: subDays(new Date(), 7),
                                to: new Date()
                            },
                            showHourlyStats: false,
                            visualizations: {
                                lineGraph: { enabled: false, aggregationMethod: 'sum', showLegend: false, yAxisLabel: '' },
                                pieCharts: []
                            }
                        };
                        setPanels([alertsPanel, ...extendedPanels]);
                    } else {
                        setPanels(extendedPanels);
                    }
                }
            } else {
                // Initialize with Critical Alerts panel as Panel 0 by default
                const alertsPanel: ExtendedPanelConfig = {
                    panelId: 'panel_alerts_0',
                    panelName: 'Critical Alerts Monitor',
                    type: 'alerts', // Special type for alerts panel
                    position: { row: 0, col: 1, width: 12, height: 4 },
                    events: [],
                    filters: {
                        events: [], // All events
                        platforms: [], // All platforms
                        pos: [], // All POS
                        sources: [], // All sources
                        sourceStr: [] // All job IDs
                    },
                    graphType: 'line',
                    dateRange: {
                        from: subDays(new Date(), 7),
                        to: new Date()
                    },
                    showHourlyStats: false,
                    visualizations: {
                        lineGraph: { enabled: false, aggregationMethod: 'sum', showLegend: false, yAxisLabel: '' },
                        pieCharts: []
                    }
                };
                setPanels([alertsPanel]);
                setAlertsIsApi(0);
            }

            setLoading(false);
        };

        loadProfile();
    }, [initialProfileId]);

    // Create options for dropdowns
    const eventOptions = availableEvents.map(e => ({
        value: e.eventId, // String numeric ID like "1", "2"
        label: e.eventName
    }));

    const platformOptions = PLATFORMS.map(p => ({
        value: p.id.toString(),
        label: p.name
    }));

    const posOptions = siteDetails.map(s => ({
        value: s.id.toString(),
        label: `${s.name} (${s.id})`
    }));

    const sourceOptions = SOURCES.map(s => ({
        value: s.id.toString(),
        label: s.name
    }));

    const handleAddPanel = () => {
        // Get first event ID as default
        const defaultEventId = availableEvents.length > 0 ? parseInt(availableEvents[0].eventId) : 1;
        const defaultEvent = availableEvents[0] || { eventId: '1', eventName: 'Event', color: '#4ECDC4' };

        const newPanel: ExtendedPanelConfig = {
            panelId: `panel_${Date.now()}`,
            panelName: 'New Panel',
            type: 'separate',
            position: { row: panels.length + 1, col: 1, width: 12, height: 6 },
            events: [defaultEvent],
            filters: {
                events: [defaultEventId],
                platforms: [0],  // Chrome Extension
                pos: siteDetails.find(s => s.id === 2)?.id ? [2] : (siteDetails[0]?.id ? [siteDetails[0].id] : [2]), // Flipkart or first
                sources: [],    // All sources
                sourceStr: []   // No job filter by default
            },
            graphType: 'line',
            dateRange: {
                from: subDays(new Date(), 7),
                to: new Date()
            },
            showHourlyStats: false,  // Unchecked by default
            dailyDeviationCurve: true,  // Checked by default - user wants 8-Day Overlay
            isApiEvent: false, // Default to regular events
            visualizations: {
                lineGraph: { enabled: true, aggregationMethod: 'sum', showLegend: true, yAxisLabel: 'Count' },
                pieCharts: [
                    { type: 'platform', enabled: true, aggregationMethod: 'sum' },
                    { type: 'pos', enabled: true, aggregationMethod: 'sum' },
                    { type: 'source', enabled: true, aggregationMethod: 'sum' }
                ]
            },
            // Initialize per-panel critical alert configuration
            criticalAlertConfig: {
                enabled: true,
                alertEventFilters: [], // Empty = monitor all events
                alertsIsApi: 0, // Default to regular events
                alertsIsHourly: false // Default to daily
            }
        };
        setPanels([...panels, newPanel]);
        setCurrentPanelIndex(panels.length); // Navigate to the new panel
    };

    const deletePanel = (panelId: string) => {
        setPanels(panels.filter(p => p.panelId !== panelId));
    };

    const updatePanelFilter = (panelId: string, filterType: keyof ExtendedPanelConfig['filters'], values: string[]) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                // sourceStr is string array, others are numeric
                const filterValues = filterType === 'sourceStr'
                    ? values
                    : values.map(v => parseInt(v)).filter(id => !isNaN(id));

                const updatedFilters = { ...p.filters, [filterType]: filterValues };

                // Update events array based on selected event IDs
                if (filterType === 'events') {
                    const numericValues = filterValues as number[];
                    const selectedEvents = availableEvents.filter(e => numericValues.includes(parseInt(e.eventId)));
                    
                    // Auto-sync critical alert event filters for API panels
                    const updatedCriticalAlertConfig = p.isApiEvent && p.criticalAlertConfig
                        ? {
                            ...p.criticalAlertConfig,
                            alertEventFilters: numericValues, // Auto-sync event IDs to alert config
                            alertsIsApi: 1, // Ensure API mode is set
                            alertsIsHourly: p.criticalAlertConfig.alertsIsHourly ?? true // Keep hourly or default to true
                        }
                        : p.isApiEvent && !p.criticalAlertConfig
                            ? {
                                enabled: true,
                                alertEventFilters: numericValues,
                                alertsIsApi: 1,
                                alertsIsHourly: true
                            }
                            : p.criticalAlertConfig;
                    
                    return {
                        ...p,
                        filters: updatedFilters,
                        events: selectedEvents.length > 0 ? selectedEvents : p.events,
                        type: selectedEvents.length > 1 ? 'combined' as const : 'separate' as const,
                        criticalAlertConfig: updatedCriticalAlertConfig
                    };
                }

                return { ...p, filters: updatedFilters };
            }
            return p;
        }));
    };

    const updatePanelGraphType = (panelId: string, graphType: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow') => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                const updated = { ...p, graphType };

                // Initialize config for special graph types
                if (graphType === 'percentage' && !(p as any).percentageConfig) {
                    (updated as any).percentageConfig = {
                        parentEvents: [],
                        childEvents: [],
                        filters: {},
                        showCombinedPercentage: true
                    };
                }

                if (graphType === 'funnel' && !(p as any).funnelConfig) {
                    (updated as any).funnelConfig = {
                        stages: [{ eventId: '', eventName: '' }],
                        multipleChildEvents: []
                    };
                }

                if (graphType === 'user_flow' && !(p as any).userFlowConfig) {
                    (updated as any).userFlowConfig = {
                         stages: [],
                         showDropOffs: true
                    };
                }

                return updated;
            }
            return p;
        }));
    };

    const updatePanelDateRange = (panelId: string, dateRange: DateRange | undefined) => {
        if (dateRange?.from && dateRange?.to) {
            setPanels(panels.map(p => p.panelId === panelId ? {
                ...p,
                dateRange: { from: dateRange.from!, to: dateRange.to! }
            } : p));
        }
    };

    const updatePanelName = (panelId: string, name: string) => {
        setPanels(panels.map(p => p.panelId === panelId ? { ...p, panelName: name } : p));
    };

    const togglePieChart = (panelId: string, pieType: 'platform' | 'pos' | 'source' | 'status' | 'cacheStatus') => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                const updatedPies = p.visualizations.pieCharts.map(pie =>
                    pie.type === pieType ? { ...pie, enabled: !pie.enabled } : pie
                );
                return {
                    ...p,
                    visualizations: { ...p.visualizations, pieCharts: updatedPies }
                };
            }
            return p;
        }));
    };

    const toggleHourlyStats = (panelId: string) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                return { ...p, showHourlyStats: !p.showHourlyStats };
            }
            return p;
        }));
    };

    const toggleApiEvent = (panelId: string) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                const newIsApiEvent = !p.isApiEvent;
                // Clear event filters when switching modes to avoid ID conflicts
                // Update pie charts to match the event type
                const newPieCharts = newIsApiEvent
                    ? [
                        { type: 'status' as const, enabled: true, aggregationMethod: 'count' as const },
                        { type: 'cacheStatus' as const, enabled: true, aggregationMethod: 'count' as const }
                    ]
                    : [
                        { type: 'platform' as const, enabled: true, aggregationMethod: 'count' as const },
                        { type: 'pos' as const, enabled: true, aggregationMethod: 'count' as const },
                        { type: 'source' as const, enabled: false, aggregationMethod: 'count' as const }
                    ];

                // When switching to API events, add default critical alert config if not present
                const updatedCriticalAlertConfig = newIsApiEvent && !p.criticalAlertConfig
                    ? {
                        enabled: true,
                        alertEventFilters: p.filters.events.length > 0 ? p.filters.events : [], // Use panel's event IDs
                        alertsIsApi: 1, // API mode
                        alertsIsHourly: true // Hourly by default
                    }
                    : (newIsApiEvent && p.criticalAlertConfig
                        ? {
                            ...p.criticalAlertConfig,
                            alertsIsApi: 1, // Update to API mode
                            alertEventFilters: p.filters.events.length > 0 ? p.filters.events : p.criticalAlertConfig.alertEventFilters
                        }
                        : p.criticalAlertConfig);

                return {
                    ...p,
                    isApiEvent: newIsApiEvent,
                    filters: { ...p.filters, events: [] },
                    visualizations: { ...p.visualizations, pieCharts: newPieCharts },
                    criticalAlertConfig: updatedCriticalAlertConfig
                };
            }
            return p;
        }));
    };

    // Helper functions for updating per-panel critical alert configuration
    const updatePanelAlertEvents = (panelId: string, eventIds: number[]) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                return {
                    ...p,
                    criticalAlertConfig: {
                        ...(p.criticalAlertConfig || { enabled: true, alertEventFilters: [], alertsIsApi: 0, alertsIsHourly: false }),
                        alertEventFilters: eventIds
                    }
                };
            }
            return p;
        }));
    };

    const updatePanelAlertIsApi = (panelId: string, isApi: number) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                return {
                    ...p,
                    criticalAlertConfig: {
                        ...(p.criticalAlertConfig || { enabled: true, alertEventFilters: [], alertsIsApi: 0, alertsIsHourly: false }),
                        alertsIsApi: isApi
                    }
                };
            }
            return p;
        }));
    };

    const updatePanelAlertIsHourly = (panelId: string, isHourly: boolean) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                return {
                    ...p,
                    criticalAlertConfig: {
                        ...(p.criticalAlertConfig || { enabled: true, alertEventFilters: [], alertsIsApi: 0, alertsIsHourly: false }),
                        alertsIsHourly: isHourly
                    }
                };
            }
            return p;
        }));
    };

    const togglePanelAlertEnabled = (panelId: string) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                return {
                    ...p,
                    criticalAlertConfig: {
                        ...(p.criticalAlertConfig || { enabled: true, alertEventFilters: [], alertsIsApi: 0, alertsIsHourly: false }),
                        enabled: !(p.criticalAlertConfig?.enabled ?? true)
                    }
                };
            }
            return p;
        }));
    };

    const handleCombinePanels = (sourcePanelId: string, targetPanelId: string) => {
        const source = panels.find(p => p.panelId === sourcePanelId);
        const target = panels.find(p => p.panelId === targetPanelId);

        if (source && target) {
            // Merge events (unique by eventId)
            const mergedEvents = [...target.events];
            const existingEventIds = new Set(mergedEvents.map(e => e.eventId));
            source.events.forEach(e => {
                if (!existingEventIds.has(e.eventId)) {
                    mergedEvents.push(e);
                }
            });

            // Merge ALL filters - combine arrays with unique values
            const mergeUniqueNumbers = (arr1: number[], arr2: number[]): number[] => {
                return [...new Set([...arr1, ...arr2])].sort((a, b) => a - b);
            };

            const mergeUniqueStrings = (arr1: string[], arr2: string[]): string[] => {
                return [...new Set([...arr1, ...arr2])].sort();
            };

            const mergedFilters = {
                events: mergeUniqueNumbers(target.filters.events, source.filters.events),
                platforms: mergeUniqueNumbers(target.filters.platforms, source.filters.platforms),
                pos: mergeUniqueNumbers(target.filters.pos, source.filters.pos),
                sources: mergeUniqueNumbers(target.filters.sources, source.filters.sources),
                sourceStr: mergeUniqueStrings(target.filters.sourceStr, source.filters.sourceStr)
            };

            const updatedTarget: ExtendedPanelConfig = {
                ...target,
                panelName: `${target.panelName} + ${source.panelName}`,
                events: mergedEvents,
                type: 'combined',
                filters: mergedFilters,
                graphType: target.graphType,
                dateRange: {
                    // Use the wider date range
                    from: target.dateRange.from < source.dateRange.from ? target.dateRange.from : source.dateRange.from,
                    to: target.dateRange.to > source.dateRange.to ? target.dateRange.to : source.dateRange.to
                }
            };

            setPanels(panels.filter(p => p.panelId !== sourcePanelId)
                .map(p => p.panelId === targetPanelId ? updatedTarget : p));
        }

        setCombineModalOpen(false);
        setCombiningPanel(null);
    };

    const handleSaveProfile = async () => {
        // Check if alerts panel exists (for criticalAlerts.enabled flag)
        const hasAlertsPanel = panels.some(p => p.type === 'alerts');

        // Filter out alerts panels before saving - alerts are stored via criticalAlerts config, not as regular panels
        const regularPanels: PanelConfig[] = panels
            .filter(p => p.type !== 'alerts')
            .map(p => {
                const isPercentageGraph = p.graphType === 'percentage';
                const isFunnelGraph = p.graphType === 'funnel';
                const isUserFlowGraph = p.graphType === 'user_flow';
                const panelType = (isPercentageGraph || isFunnelGraph || isUserFlowGraph) ? 'special' : p.type;

                const filterConfig: any = {
                    events: p.filters.events,
                    platforms: p.filters.platforms,
                    pos: p.filters.pos,
                    sources: p.filters.sources,
                    sourceStr: p.filters.sourceStr || [], // Save job IDs
                    graphType: p.graphType,
                    dateRange: {
                        from: p.dateRange.from.toISOString(),
                        to: p.dateRange.to.toISOString()
                    },
                    showHourlyStats: p.showHourlyStats,
                    dailyDeviationCurve: p.dailyDeviationCurve,
                    isApiEvent: p.isApiEvent || false // Save API event flag
                };

                // Save percentageConfig for percentage graphs
                if (isPercentageGraph && (p as any).percentageConfig) {
                    filterConfig.percentageConfig = (p as any).percentageConfig;
                }

                // Save funnelConfig for funnel graphs
                if (isFunnelGraph && (p as any).funnelConfig) {
                    filterConfig.funnelConfig = (p as any).funnelConfig;
                }

                // Save userFlowConfig for user flow graphs
                if (isUserFlowGraph && (p as any).userFlowConfig) {
                    filterConfig.userFlowConfig = (p as any).userFlowConfig;
                }

                // For special graphs (percentage, funnel, user_flow), disable lineGraph
                const visualizations = (isPercentageGraph || isFunnelGraph || isUserFlowGraph)
                    ? {
                        ...p.visualizations,
                        lineGraph: { ...p.visualizations.lineGraph, enabled: false }
                    }
                    : p.visualizations;

                return {
                    panelId: p.panelId,
                    panelName: p.panelName,
                    type: panelType,
                    position: p.position,
                    events: p.events,
                    visualizations,
                    // Store filter config in panel for persistence
                    filterConfig,
                    // Preserve _dbPanelId for proper DB upsert (UPDATE not INSERT)
                    _dbPanelId: (p as any)._dbPanelId,
                    // Store per-panel critical alert configuration
                    alertsConfig: p.criticalAlertConfig ? {
                        enabled: p.criticalAlertConfig.enabled,
                        position: 'top',
                        refreshInterval: 30,
                        maxAlerts: 5,
                        filterByPOS: [],
                        filterByEvents: p.criticalAlertConfig.alertEventFilters.map(id => id.toString()),
                        isApi: p.criticalAlertConfig.alertsIsApi,
                        isHourly: p.criticalAlertConfig.alertsIsHourly
                    } : undefined
                } as any;
            });

        const profile: DashboardProfile = {
            profileId: initialProfileId || `profile_${Date.now()}`,
            profileName,
            featureId,
            createdBy: String(user?.id || 'unknown'),
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: 1,
            isActive: true,
            panels: regularPanels,
            filters: {
                platform: {
                    type: 'multi-select',
                    options: platformOptions.map(p => p.value),
                    defaultValue: ['0']
                },
                pos: {
                    type: 'multi-select',
                    options: posOptions.map(p => p.value),
                    defaultValue: ['2']
                },
                source: {
                    type: 'multi-select',
                    options: sourceOptions.map(s => s.value),
                    defaultValue: ['1']
                },
                event: {
                    type: 'multi-select',
                    options: eventOptions.map(e => e.value),
                    defaultValue: eventOptions.length > 0 ? [eventOptions[0].value] : ['1']
                }
            },
            defaultSettings: {
                timeRange: { preset: 'last_7_days', granularity: 'hourly' },
                autoRefresh: 60
            },
            criticalAlerts: {
                enabled: hasAlertsPanel,
                refreshInterval: 30,
                position: 'top',
                maxAlerts: 5,
                filterByPOS: [],
                filterByEvents: alertEventFilters.map(id => id.toString()),
                isApi: alertsIsApi,
                isHourly: alertsIsHourly,
            }
        };

        // Add DB IDs for proper upsert behavior (UPDATE instead of INSERT)
        if (dbProfileId) {
            (profile as any)._dbProfileId = dbProfileId;
        }
        if (Object.keys(dbPanelIds).length > 0) {
            (profile as any)._dbPanelIds = dbPanelIds;
        }

        await mockService.saveProfile(profile);
        onSave?.();
        onCancel();
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Loading profile...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b pb-4" id="profile-builder-header">
                <div className="flex items-center gap-4">
                    <Input
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="text-lg font-bold w-64"
                    />
                    <span className="text-sm text-muted-foreground">
                        Feature: {getFeatureName(featureId)}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={startTutorial} className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
                        <Activity className="mr-2 h-4 w-4" />
                        Quick Tutorial
                    </Button>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSaveProfile}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                    </Button>
                </div>
            </div>

            <Tabs value={workflowMode} onValueChange={(v) => setWorkflowMode(v as 'quick' | 'template')} className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="quick" className="gap-2">
                        <Layers className="h-4 w-4" />
                        Quick Builder
                    </TabsTrigger>
                    <TabsTrigger value="template" className="gap-2">
                        <Layers className="h-4 w-4" />
                        Template Builder
                    </TabsTrigger>
                </TabsList>

                {/* Quick Builder Mode */}
                <TabsContent value="quick" className="flex-1 flex flex-col mt-4">
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {panels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <p className="mb-4">No panels yet. Add your first panel!</p>
                                <Button onClick={handleAddPanel} size="lg" className="gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add First Panel
                                </Button>
                            </div>
                        ) : (
                            <>
                                {panels.map((panel) => (
                                    <Card key={panel.panelId} className="relative group">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base">{panel.panelName}</CardTitle>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1"
                                                        onClick={() => {
                                                            setCombiningPanel(panel);
                                                            setCombineModalOpen(true);
                                                        }}
                                                    >
                                                        <Combine className="h-4 w-4" />
                                                        Combine
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => deletePanel(panel.panelId)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="text-sm text-muted-foreground">
                                                    Type: <span className="font-medium">{panel.type}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {panel.events.map(e => (
                                                        <span
                                                            key={e.eventId}
                                                            className="text-sm font-medium px-3 py-1.5 rounded bg-secondary"
                                                            style={{ borderLeft: `4px solid ${e.color}` }}
                                                            title={e.eventName}
                                                        >
                                                            {e.eventName}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>

                                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                                            <Button
                                                onClick={handleAddPanel}
                                                size="sm"
                                                className="rounded-full h-8 w-8 p-0 shadow-lg"
                                                title="Add panel below"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}

                                <div className="flex justify-center py-8">
                                    <Button onClick={handleAddPanel} size="lg" className="gap-2">
                                        <Plus className="h-5 w-5" />
                                        Add New Panel
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* Template Builder Mode */}
                <TabsContent value="template" className="flex-1 flex flex-col mt-4">
                    <div className="flex-1 overflow-y-auto space-y-6">
                        {panels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <p className="mb-4">No panels configured. Start by adding a panel!</p>
                                <Button onClick={handleAddPanel} size="lg" className="gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add First Panel
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Panel Navigation Header */}
                                <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-lg border-2 border-violet-200 dark:border-violet-500/30">
                                    <div className="flex items-center gap-3">
                                        <LayoutDashboard className="h-5 w-5 text-violet-600" />
                                        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                                            Panel {currentPanelIndex + 1} of {panels.filter(p => p.type !== 'alerts').length}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPanelIndex(Math.max(0, currentPanelIndex - 1))}
                                            disabled={currentPanelIndex === 0}
                                            className="h-8"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Prev
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPanelIndex(Math.min(panels.filter(p => p.type !== 'alerts').length - 1, currentPanelIndex + 1))}
                                            disabled={currentPanelIndex >= panels.filter(p => p.type !== 'alerts').length - 1}
                                            className="h-8"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddPanel}
                                            className="h-8 bg-violet-600 text-white hover:bg-violet-700 border-violet-600"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Panel
                                        </Button>
                                    </div>
                                </div>

                                {/* Current Panel Display */}
                                {(() => {
                                    const regularPanels = panels.filter(p => p.type !== 'alerts');
                                    const panel = regularPanels[currentPanelIndex];
                                    
                                    if (!panel) return null;

                                    return (
                                        <Card key={panel.panelId} className="relative">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div id="panel-name-input">
                                                                    <Input
                                                                        value={panel.panelName}
                                                                        onChange={(e) => updatePanelName(panel.panelId, e.target.value)}
                                                                        className="text-lg font-semibold w-auto max-w-md"
                                                                    />
                                                                </div>
                                                                <InfoTooltip content="Give your panel a descriptive name to identify it on the dashboard." />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {regularPanels.length > 1 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setCombiningPanel(panel);
                                                                    setCombineModalOpen(true);
                                                                }}
                                                            >
                                                                <Combine className="h-4 w-4 mr-1" />
                                                                Combine
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                deletePanel(panel.panelId);
                                                                if (currentPanelIndex >= regularPanels.length - 1) {
                                                                    setCurrentPanelIndex(Math.max(0, currentPanelIndex - 1));
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-8">
                                                {/* SECTION 1: Critical Alert Configuration for this Panel */}
                                                <div className="space-y-4 p-6 bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-900/10 dark:to-orange-900/5 rounded-lg border-2 border-red-200 dark:border-red-500/30">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                                                                <Bell className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-bold text-red-700 dark:text-red-300">Critical Alert Monitor</h3>
                                                                <p className="text-xs text-muted-foreground">Configure alerts specific to this panel</p>
                                                            </div>
                                                        </div>
                                                        <Switch
                                                            checked={panel.criticalAlertConfig?.enabled ?? true}
                                                            onCheckedChange={() => togglePanelAlertEnabled(panel.panelId)}
                                                        />
                                                    </div>

                                                    {(panel.criticalAlertConfig?.enabled ?? true) && (
                                                        <>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                                    <div className="text-2xl font-bold text-red-600">
                                                                        {panel.criticalAlertConfig?.alertEventFilters?.length || '∞'}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">Events Monitored</div>
                                                                </div>
                                                                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                                                    <div className="text-2xl font-bold text-orange-600">∞</div>
                                                                    <div className="text-xs text-muted-foreground">POS Monitored</div>
                                                                </div>
                                                                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                                    <div className="text-2xl font-bold text-purple-600">7d</div>
                                                                    <div className="text-xs text-muted-foreground">Default Range</div>
                                                                </div>
                                                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                                    <div className="text-2xl font-bold text-blue-600">✓</div>
                                                                    <div className="text-xs text-muted-foreground">Enabled</div>
                                                                </div>
                                                            </div>

                                                            <div className="p-4 bg-muted/20 rounded-lg">
                                                                <div className="flex items-center justify-between gap-4 mb-3">
                                                                    <Label className="font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">Event Type</Label>
                                                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-[280px] gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updatePanelAlertIsApi(panel.panelId, 0)}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                (panel.criticalAlertConfig?.alertsIsApi ?? 0) === 0
                                                                                    ? "bg-green-600 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            REGULAR
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updatePanelAlertIsApi(panel.panelId, 1)}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                (panel.criticalAlertConfig?.alertsIsApi ?? 0) === 1
                                                                                    ? "bg-purple-600 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            API
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updatePanelAlertIsApi(panel.panelId, 2)}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                (panel.criticalAlertConfig?.alertsIsApi ?? 0) === 2
                                                                                    ? "bg-amber-500 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            PERCENT
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4 mb-4">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <Label className="font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">Granularity</Label>
                                                                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">Requires range ≤ 7 days</span>
                                                                    </div>
                                                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-[200px]">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updatePanelAlertIsHourly(panel.panelId, false)}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                !(panel.criticalAlertConfig?.alertsIsHourly ?? false)
                                                                                    ? "bg-blue-600 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            DAILY
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updatePanelAlertIsHourly(panel.panelId, true)}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                (panel.criticalAlertConfig?.alertsIsHourly ?? false)
                                                                                    ? "bg-orange-500 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            HOURLY
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <Label className="mb-3 font-semibold">
                                                                    {(panel.criticalAlertConfig?.alertsIsApi ?? 0) === 2 ? 'Panel ID' : 'Monitor Specific Events'}
                                                                </Label>
                                                                {(panel.criticalAlertConfig?.alertsIsApi ?? 0) === 2 ? (
                                                                    // For PERCENT mode, show panel ID - auto-selected
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex-1 h-10 px-4 flex items-center rounded-md border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-mono text-sm font-bold">
                                                                            Panel: {(panel as any)._dbPanelId || 'Will be assigned on save'}
                                                                        </div>
                                                                        <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-lg font-medium">
                                                                            ✓ Auto-selected for PERCENT alerts
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    // Regular mode - show events dropdown
                                                                    <MultiSelectDropdown
                                                                        options={(() => {
                                                                            // Filter events based on alertsIsApi: 0=REGULAR, 1=API, 2=PERCENT
                                                                            const alertsIsApi = panel.criticalAlertConfig?.alertsIsApi ?? 0;
                                                                            if (alertsIsApi === 1) {
                                                                                // API events only
                                                                                return availableEvents
                                                                                    .filter(e => e.isApiEvent === true)
                                                                                    .map(e => ({
                                                                                        value: e.eventId,
                                                                                        label: e.host && e.url ? `${e.host} - ${e.url}` : e.eventName
                                                                                    }));
                                                                            } else {
                                                                                // Regular events only (for REGULAR)
                                                                                return availableEvents
                                                                                    .filter(e => e.isApiEvent !== true)
                                                                                    .map(e => ({
                                                                                        value: e.eventId,
                                                                                        label: e.eventName
                                                                                    }));
                                                                            }
                                                                        })()}
                                                                        selected={(panel.criticalAlertConfig?.alertEventFilters || []).map(id => id.toString())}
                                                                        onChange={(values: string[]) => {
                                                                            updatePanelAlertEvents(panel.panelId, values.map(v => parseInt(v)));
                                                                        }}
                                                                        placeholder="Select events to monitor"
                                                                    />
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    {(panel.criticalAlertConfig?.alertsIsApi ?? 0) === 2 
                                                                        ? 'Panel ID is used automatically for percentage/funnel critical alerts'
                                                                        : 'Select specific events to monitor, or leave empty to monitor all events'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* SECTION 2: Dashboard Panel Configuration */}
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3 pb-3 border-b">
                                                        <LayoutDashboard className="h-5 w-5 text-violet-600" />
                                                        <h3 className="text-lg font-bold text-violet-700 dark:text-violet-300">Dashboard Configuration</h3>
                                                    </div>

                                                    {/* API Events Toggle */}
                                                    <div className={cn(
                                                        "flex items-center justify-between p-4 rounded-lg border",
                                                        availableEvents.filter(e => e.isApiEvent === true).length > 0 && panel.graphType !== 'percentage' && panel.graphType !== 'funnel'
                                                            ? "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-500/30"
                                                            : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-60"
                                                    )}>
                                                        <div className="flex flex-col">
                                                            <Label className="font-semibold text-base">Event Type</Label>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {panel.graphType === 'percentage' || panel.graphType === 'funnel'
                                                                    ? "Event type selection disabled for special graphs"
                                                                    : availableEvents.filter(e => e.isApiEvent === true).length === 0
                                                                        ? "No API events available for this feature"
                                                                        : panel.isApiEvent
                                                                            ? "Monitoring API events (host/url/callUrl)"
                                                                            : "Monitoring regular feature events"}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2" id="api-event-toggle">
                                                            <span className="text-sm font-medium flex items-center gap-1.5">
                                                                {panel.isApiEvent ? 'API Events' : 'Regular Events'}
                                                                <InfoTooltip content="Switch to API Events to track technical metrics like status codes, cache hits, and response times." />
                                                            </span>
                                                            <Switch
                                                                checked={panel.isApiEvent || false}
                                                                onCheckedChange={() => toggleApiEvent(panel.panelId)}
                                                                disabled={
                                                                    availableEvents.filter(e => e.isApiEvent === true).length === 0 ||
                                                                    panel.graphType === 'percentage' ||
                                                                    panel.graphType === 'funnel' ||
                                                              	panel.graphType === 'user_flow'
                                                                }
                                                            />
                                                        </div>
                                                    </div>


                                                    {/* Filters Grid - Row 1: Events, Platform, POS */}
                                                    <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Events ({getFeatureShortName(featureId)})</Label>
                                                                <div id="event-dropdown">
                                                                    <MultiSelectDropdown
                                                                        options={availableEvents
                                                                            .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                            .map(e => ({
                                                                                value: e.eventId,
                                                                                label: e.isApiEvent
                                                                                    ? `${e.host} - ${e.url}`
                                                                                    : e.eventName
                                                                            }))}
                                                                        selected={panel.filters.events.map(id => id.toString())}
                                                                        onChange={(values) => updatePanelFilter(panel.panelId, 'events', values)}
                                                                        placeholder={
                                                                            panel.graphType === 'percentage' || panel.graphType === 'funnel' || panel.graphType === 'user_flow'
                                                                                ? "Disabled for special graphs"
                                                                                : panel.isApiEvent
                                                                                    ? "Select API events"
                                                                                    : "Select events"
                                                                        }
                                                                        disabled={panel.graphType === 'percentage' || panel.graphType === 'funnel' || panel.graphType === 'user_flow'}
                                                                        className={panel.graphType === 'percentage' || panel.graphType === 'funnel' || panel.graphType === 'user_flow' ? 'opacity-50 cursor-not-allowed' : ''}
                                                                    />
                                                                    {panel.graphType === 'percentage' || panel.graphType === 'funnel' || panel.graphType === 'user_flow' ? (
                                                                        <p className="text-xs text-amber-600 dark:text-amber-400">
                                                                            {panel.graphType === 'user_flow' ? 'Events configured in flow stages below' : 'Events configured in graph settings below'}
                                                                        </p>
                                                                    ) : panel.isApiEvent && panel.filters.events.length > 0 ? (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {(() => {
                                                                                const selectedEvent = availableEvents.find(e => e.eventId === panel.filters.events[0]?.toString());
                                                                                return selectedEvent?.callUrl ? `Call URL: ${selectedEvent.callUrl}` : '';
                                                                            })()}
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                            {!panel.isApiEvent && (
                                                                <>
                                                                    <div className="space-y-2">
                                                                        <Label>Platform</Label>
                                                                        <div id="platform-dropdown">
                                                                            <MultiSelectDropdown
                                                                                options={platformOptions}
                                                                                selected={panel.filters.platforms.map(id => id.toString())}
                                                                                onChange={(values) => updatePanelFilter(panel.panelId, 'platforms', values)}
                                                                                placeholder="Select platforms"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label>POS</Label>
                                                                        <div id="pos-dropdown">
                                                                            <MultiSelectDropdown
                                                                                options={posOptions}
                                                                                selected={panel.filters.pos.map(id => id.toString())}
                                                                                onChange={(values) => updatePanelFilter(panel.panelId, 'pos', values)}
                                                                                placeholder="Select POS"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Row 2: Source, Date Range */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {!panel.isApiEvent && (
                                                                <div className="space-y-2">
                                                                    <Label>Source</Label>
                                                                    <div id="source-dropdown">
                                                                        <MultiSelectDropdown
                                                                            options={sourceOptions}
                                                                            selected={panel.filters.sources.map(id => id.toString())}
                                                                            onChange={(values) => updatePanelFilter(panel.panelId, 'sources', values)}
                                                                            placeholder="Select sources"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="space-y-2">
                                                                <Label>Date Range</Label>
                                                                <div id="date-range-picker">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className="w-full justify-start text-left font-normal h-10"
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {panel.dateRange?.from && panel.dateRange?.to ? (
                                                                                    <span className="text-xs">
                                                                                        {format(panel.dateRange.from, "MMM d")} - {format(panel.dateRange.to, "MMM d, yyyy")}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span>Pick dates</span>
                                                                                )}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="start">
                                                                            <Calendar
                                                                                initialFocus
                                                                                mode="range"
                                                                                defaultMonth={panel.dateRange?.from}
                                                                                selected={{ from: panel.dateRange?.from, to: panel.dateRange?.to }}
                                                                                onSelect={(range) => updatePanelDateRange(panel.panelId, range)}
                                                                                numberOfMonths={2}
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Show info for API events about status/cacheStatus filtering */}
                                                        {panel.isApiEvent && (
                                                            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                                                                <p className="text-sm text-muted-foreground">
                                                                    <span className="font-semibold">API Events Note:</span> API events use <code className="px-1 bg-white dark:bg-gray-800 rounded">status</code> and <code className="px-1 bg-white dark:bg-gray-800 rounded">cacheStatus</code> for breakdown instead of platform/pos/source filters. Chart will display metrics like response time, bytes transferred, and error rates by status code.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Job ID Filter Row - Full width */}
                                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-500/20" id="job-id-section">
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="font-semibold flex items-center gap-1.5">
                                                                        Job ID Filter (sourceStr)
                                                                        <InfoTooltip content="Filter data by specific Job IDs (e.g., 'job_123'). Useful for debugging specific process runs." />
                                                                    </Label>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => fetchAvailableJobIds(panel.panelId)}
                                                                        disabled={loadingJobIds || panel.filters.events.length === 0}
                                                                        className="h-7 text-xs"
                                                                    >
                                                                        {loadingJobIds ? (
                                                                            <>
                                                                                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                                Loading...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <RefreshCw className="mr-1 h-3 w-3" />
                                                                                Fetch Job IDs
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                                <MultiSelectDropdown
                                                                    options={availableJobIds.map(id => ({ value: id, label: id }))}
                                                                    selected={panel.filters.sourceStr || []}
                                                                    onChange={(values) => updatePanelFilter(panel.panelId, 'sourceStr', values)}
                                                                    placeholder={availableJobIds.length > 0 ? "Select Job IDs or leave empty for all" : "Click 'Fetch Job IDs' to load options"}
                                                                    searchable={true}
                                                                />
                                                                <p className="text-xs text-muted-foreground">
                                                                    {availableJobIds.length > 0
                                                                        ? `${availableJobIds.length} job ID(s) available. Leave empty to show all jobs.`
                                                                        : 'Select at least one event, then click "Fetch Job IDs" to load options.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Graph Type & Pie Charts */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="graph-type-selector">
                                                        <div className="space-y-3">
                                                            <Label className="flex items-center gap-1.5">
                                                                Graph Type
                                                                <InfoTooltip content="Select the visualization that best represents your data goals." />
                                                            </Label>
                                                            <RadioGroup
                                                                value={panel.graphType}
                                                                onValueChange={(val) => updatePanelGraphType(panel.panelId, val as 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow')}
                                                                className="flex flex-col gap-3"
                                                            >
                                                                <div className="flex items-center space-x-2" id="line-radio-item">
                                                                    <RadioGroupItem value="line" id={`${panel.panelId}-line`} />
                                                                    <Label htmlFor={`${panel.panelId}-line`} className="flex items-center gap-2 cursor-pointer">
                                                                        <LineChart className="h-4 w-4" />
                                                                        Line Chart
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2" id="bar-radio-item">
                                                                    <RadioGroupItem value="bar" id={`${panel.panelId}-bar`} />
                                                                    <Label htmlFor={`${panel.panelId}-bar`} className="flex items-center gap-2 cursor-pointer">
                                                                        <BarChart3 className="h-4 w-4" />
                                                                        Bar Chart
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2" id="percentage-radio-item">
                                                                    <RadioGroupItem value="percentage" id={`${panel.panelId}-percentage`} />
                                                                    <Label htmlFor={`${panel.panelId}-percentage`} className="flex items-center gap-2 cursor-pointer">
                                                                        <span className="h-4 w-4">%</span>
                                                                        Percentage Graph
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2" id="funnel-radio-item">
                                                                    <RadioGroupItem value="funnel" id={`${panel.panelId}-funnel`} />
                                                                    <Label htmlFor={`${panel.panelId}-funnel`} className="flex items-center gap-2 cursor-pointer">
                                                                        <span className="h-4 w-4">▼</span>
                                                                        Funnel Graph
                                                                    </Label>
                                                                </div>
                                                                <div className="flex items-center space-x-2" id="userflow-radio-item">
                                                                    <RadioGroupItem value="user_flow" id={`${panel.panelId}-user_flow`} />
                                                                    <Label htmlFor={`${panel.panelId}-user_flow`} className="flex items-center gap-2 cursor-pointer">
                                                                        <GitBranch className="h-4 w-4" />
                                                                        User Flow
                                                                    </Label>
                                                                </div>
                                                            </RadioGroup>
                                                        </div>

                                                        {/* Granularity Toggle for Line and Bar Charts */}
                                                        {(panel.graphType === 'line' || panel.graphType === 'bar') && (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <Label className="font-semibold uppercase text-[11px] tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                                            Data Granularity
                                                                            <InfoTooltip content="Choose hourly (≤7 days) for detailed analysis or daily for broader trends" />
                                                                        </Label>
                                                                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                                                            Hourly requires range ≤ 7 days
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-[200px]">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPanels(prev => prev.map(p =>
                                                                                p.panelId === panel.panelId
                                                                                    ? { ...p, showHourlyStats: false }
                                                                                    : p
                                                                            ))}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                !panel.showHourlyStats
                                                                                    ? "bg-blue-600 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            DAILY
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPanels(prev => prev.map(p =>
                                                                                p.panelId === panel.panelId
                                                                                    ? { ...p, showHourlyStats: true }
                                                                                    : p
                                                                            ))}
                                                                            className={cn(
                                                                                "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                panel.showHourlyStats
                                                                                    ? "bg-orange-500 text-white shadow-md"
                                                                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                            )}
                                                                        >
                                                                            HOURLY
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Conditional configuration based on graph type */}
                                                        {panel.graphType === 'percentage' ? (
                                                            /* Percentage Graph Configuration */
                                                            <div className="space-y-3 col-span-2">
                                                                <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-500/50">
                                                                    <Label className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 block">
                                                                        📊 Percentage Graph Configuration
                                                                    </Label>
                                                                    <p className="text-xs text-muted-foreground mb-4">
                                                                        Calculate: (Child Events Count / Parent Events Count) × 100
                                                                    </p>

                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-medium">Parent Events (Multiple)</Label>
                                                                            <MultiSelectDropdown
                                                                                options={availableEvents
                                                                                    .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                    .map(e => ({
                                                                                        value: e.eventId,
                                                                                        label: e.isApiEvent && e.host && e.url
                                                                                            ? `${e.host} - ${e.url}`
                                                                                            : e.eventName
                                                                                    }))}
                                                                                selected={(panel as any).percentageConfig?.parentEvents || []}
                                                                                onChange={(values) => {
                                                                                    setPanels(prev => prev.map(p =>
                                                                                        p.panelId === panel.panelId
                                                                                            ? { ...p, percentageConfig: { ...(p as any).percentageConfig, parentEvents: values } }
                                                                                            : p
                                                                                    ));
                                                                                }}
                                                                                placeholder="Select parent events"
                                                                                className="h-9"
                                                                            />
                                                                            <p className="text-xs text-muted-foreground">Events to use as denominator</p>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Label className="text-xs font-medium">Child Events (Multiple)</Label>
                                                                            <MultiSelectDropdown
                                                                                options={availableEvents
                                                                                    .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                    .map(e => ({
                                                                                        value: e.eventId,
                                                                                        label: e.isApiEvent && e.host && e.url
                                                                                            ? `${e.host} - ${e.url}`
                                                                                            : e.eventName
                                                                                    }))}
                                                                                selected={(panel as any).percentageConfig?.childEvents || []}
                                                                                onChange={(values) => {
                                                                                    setPanels(prev => prev.map(p =>
                                                                                        p.panelId === panel.panelId
                                                                                            ? { ...p, percentageConfig: { ...(p as any).percentageConfig, childEvents: values } }
                                                                                            : p
                                                                                    ));
                                                                                }}
                                                                                placeholder="Select child events"
                                                                                className="h-9"
                                                                            />
                                                                            <p className="text-xs text-muted-foreground">Events to use as numerator</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Child Events Grouping Toggle */}
                                                                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-500/30">
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <Label className="font-semibold uppercase text-[11px] tracking-wider text-muted-foreground">Child Events Display</Label>
                                                                                <span className="text-[9px] text-muted-foreground">How to display multiple child events</span>
                                                                            </div>
                                                                            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 w-[250px] gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPanels(prev => prev.map(p =>
                                                                                        p.panelId === panel.panelId
                                                                                            ? { ...p, percentageConfig: { ...(p as any).percentageConfig, groupChildEvents: true } }
                                                                                            : p
                                                                                    ))}
                                                                                    className={cn(
                                                                                        "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                        (panel as any).percentageConfig?.groupChildEvents !== false
                                                                                            ? "bg-purple-600 text-white shadow-md"
                                                                                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                                    )}
                                                                                >
                                                                                    SINGLE GRAPH
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPanels(prev => prev.map(p =>
                                                                                        p.panelId === panel.panelId
                                                                                            ? { ...p, percentageConfig: { ...(p as any).percentageConfig, groupChildEvents: false } }
                                                                                            : p
                                                                                    ))}
                                                                                    className={cn(
                                                                                        "flex-1 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200",
                                                                                        (panel as any).percentageConfig?.groupChildEvents === false
                                                                                            ? "bg-amber-500 text-white shadow-md"
                                                                                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                                                                    )}
                                                                                >
                                                                                    SEPARATE GRAPHS
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* API Event filters for status code and cache status */}
                                                                    {panel.isApiEvent && (
                                                                        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-500/30">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <Label className="text-xs font-medium flex items-center gap-2">
                                                                                    <Activity className="h-3 w-3" />
                                                                                    API Filters (Optional)
                                                                                </Label>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => fetchAvailableJobIds(panel.panelId)}
                                                                                    disabled={loadingJobIds || panel.filters.events.length === 0}
                                                                                    className="h-7 text-xs bg-purple-50 hover:bg-purple-100 border-purple-300"
                                                                                >
                                                                                    {loadingJobIds ? (
                                                                                        <>
                                                                                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                                                                            Loading...
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <RefreshCw className="mr-1 h-3 w-3" />
                                                                                            Fetch API Filters
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-xs text-muted-foreground">Status Codes</Label>
                                                                                    <MultiSelectDropdown
                                                                                        options={availableStatusCodes.map(code => ({ value: code, label: code }))}
                                                                                        selected={(panel as any).percentageConfig?.filters?.statusCodes || []}
                                                                                        onChange={(values) => {
                                                                                            setPanels(prev => prev.map(p =>
                                                                                                p.panelId === panel.panelId
                                                                                                    ? {
                                                                                                        ...p,
                                                                                                        percentageConfig: {
                                                                                                            ...(p as any).percentageConfig,
                                                                                                            filters: {
                                                                                                                ...((p as any).percentageConfig?.filters || {}),
                                                                                                                statusCodes: values
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                    : p
                                                                                            ));
                                                                                        }}
                                                                                        placeholder={availableStatusCodes.length > 0 ? "Select status codes" : "Click 'Fetch API Filters'"}
                                                                                        className="h-8"
                                                                                        disabled={availableStatusCodes.length === 0}
                                                                                    />
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {availableStatusCodes.length > 0
                                                                                            ? `${availableStatusCodes.length} codes available`
                                                                                            : 'Click "Fetch API Filters" to load'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-xs text-muted-foreground">Cache Status</Label>
                                                                                    <MultiSelectDropdown
                                                                                        options={availableCacheStatuses.map(status => ({ value: status, label: status }))}
                                                                                        selected={(panel as any).percentageConfig?.filters?.cacheStatus || []}
                                                                                        onChange={(values) => {
                                                                                            setPanels(prev => prev.map(p =>
                                                                                                p.panelId === panel.panelId
                                                                                                    ? {
                                                                                                        ...p,
                                                                                                        percentageConfig: {
                                                                                                            ...(p as any).percentageConfig,
                                                                                                            filters: {
                                                                                                                ...((p as any).percentageConfig?.filters || {}),
                                                                                                                cacheStatus: values
                                                                                                            }
                                                                                                        }
                                                                                                    }
                                                                                                    : p
                                                                                            ));
                                                                                        }}
                                                                                        placeholder={availableCacheStatuses.length > 0 ? "Select cache statuses" : "Click 'Fetch API Filters'"}
                                                                                        className="h-8"
                                                                                        disabled={availableCacheStatuses.length === 0}
                                                                                    />
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {availableCacheStatuses.length > 0
                                                                                            ? `${availableCacheStatuses.length} statuses available`
                                                                                            : 'Click "Fetch API Filters" to load'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : panel.graphType === 'funnel' ? (
                                                            /* Funnel Graph Configuration */
                                                            <div className="space-y-3 col-span-2">
                                                                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-500/50">
                                                                    <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 block">
                                                                        🔽 Funnel Graph Configuration
                                                                    </Label>
                                                                    <p className="text-xs text-muted-foreground mb-4">
                                                                        Define conversion stages: e1 (parent) → e2 → e3 → ... → last (multiple children)
                                                                    </p>

                                                                    {/* Funnel Stages */}
                                                                    <div className="space-y-3">
                                                                        {((panel as any).funnelConfig?.stages || []).map((stage: any, index: number) => (
                                                                            <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-500/30">
                                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 w-8">e{index + 1}</span>
                                                                                <select
                                                                                    value={stage.eventId || ''}
                                                                                    onChange={(e) => {
                                                                                        const eventId = e.target.value;
                                                                                        const selectedEvent = availableEvents.find(ev => ev.eventId === eventId);
                                                                                        const eventName = selectedEvent?.isApiEvent && selectedEvent?.host && selectedEvent?.url
                                                                                            ? `${selectedEvent.host} - ${selectedEvent.url}`
                                                                                            : selectedEvent?.eventName || '';
                                                                                        setPanels(prev => prev.map(p => {
                                                                                            if (p.panelId === panel.panelId) {
                                                                                                const stages = [...((p as any).funnelConfig?.stages || [])];
                                                                                                stages[index] = { eventId, eventName };
                                                                                                return { ...p, funnelConfig: { ...(p as any).funnelConfig, stages } };
                                                                                            }
                                                                                            return p;
                                                                                        }));
                                                                                    }}
                                                                                    className="flex-1 h-8 px-2 rounded border text-xs bg-white dark:bg-slate-700 border-blue-300 dark:border-blue-600"
                                                                                >
                                                                                    <option value="">Select event</option>
                                                                                    {availableEvents
                                                                                        .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                        .map(e => (
                                                                                            <option key={e.eventId} value={e.eventId}>
                                                                                                {e.isApiEvent && e.host && e.url ? `${e.host} - ${e.url}` : e.eventName}
                                                                                            </option>
                                                                                        ))}
                                                                                </select>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                        setPanels(prev => prev.map(p => {
                                                                                            if (p.panelId === panel.panelId) {
                                                                                                const stages = [...((p as any).funnelConfig?.stages || [])];
                                                                                                stages.splice(index, 1);
                                                                                                return { ...p, funnelConfig: { ...(p as any).funnelConfig, stages } };
                                                                                            }
                                                                                            return p;
                                                                                        }));
                                                                                    }}
                                                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        ))}

                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setPanels(prev => prev.map(p => {
                                                                                    if (p.panelId === panel.panelId) {
                                                                                        const stages = [...((p as any).funnelConfig?.stages || []), { eventId: '', eventName: '' }];
                                                                                        return { ...p, funnelConfig: { ...(p as any).funnelConfig, stages } };
                                                                                    }
                                                                                    return p;
                                                                                }));
                                                                            }}
                                                                            className="w-full h-8 text-xs"
                                                                        >
                                                                            <Plus className="h-3 w-3 mr-1" />
                                                                            Add Stage
                                                                        </Button>
                                                                    </div>

                                                                    {/* Last Stage (Multiple Children) */}
                                                                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-500/30">
                                                                        <Label className="text-xs font-medium mb-2 block">Final Stage (Multiple Events)</Label>
                                                                        <MultiSelectDropdown
                                                                            options={availableEvents
                                                                                .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                .map(e => ({
                                                                                    value: e.eventId,
                                                                                    label: e.isApiEvent && e.host && e.url
                                                                                        ? `${e.host} - ${e.url}`
                                                                                        : e.eventName
                                                                                }))}
                                                                            selected={(panel as any).funnelConfig?.multipleChildEvents || []}
                                                                            onChange={(values) => {
                                                                                setPanels(prev => prev.map(p =>
                                                                                    p.panelId === panel.panelId
                                                                                        ? { ...p, funnelConfig: { ...(p as any).funnelConfig, multipleChildEvents: values } }
                                                                                        : p
                                                                                ));
                                                                            }}
                                                                            placeholder="Select final stage events"
                                                                            className="h-9"
                                                                        />
                                                                        <p className="text-xs text-muted-foreground mt-1">These events will be shown with different colors in the final bar</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : panel.graphType === 'user_flow' ? (
                                                            /* User Flow Graph Configuration */
                                                            <div className="space-y-3 col-span-2">
                                                                <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-lg border-2 border-violet-300 dark:border-violet-500/50">
                                                                    <Label className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3 block">
                                                                        <div className="flex items-center gap-2">
                                                                            <GitBranch className="h-4 w-4" />
                                                                            User Flow Configuration
                                                                        </div>
                                                                    </Label>
                                                                    <p className="text-xs text-muted-foreground mb-4">
                                                                        Define flow stages. Each stage can contain multiple events (e.g., "Login" stage = "login_success" + "login_attempt").
                                                                    </p>

                                                                    <div className="space-y-4">
                                                                        {((panel as any).userFlowConfig?.stages || []).map((stage: any, index: number) => (
                                                                            <div key={stage.id || index} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-violet-200 dark:border-violet-500/30 shadow-sm relative group">
                                                                                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                                            onClick={() => {
                                                                                                setPanels(prev => prev.map(p => {
                                                                                                    if (p.panelId === panel.panelId) {
                                                                                                        const stages = [...((p as any).userFlowConfig?.stages || [])];
                                                                                                        stages.splice(index, 1);
                                                                                                        return { ...p, userFlowConfig: { ...(p as any).userFlowConfig, stages } };
                                                                                                    }
                                                                                                    return p;
                                                                                                }));
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="h-3 w-3" />
                                                                                        </Button>
                                                                                 </div>
                                                                                 
                                                                                 <div className="flex items-center gap-2 mb-2">
                                                                                     <div className="flex items-center justify-center bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 h-5 w-5 rounded-full text-[10px] font-bold">
                                                                                         {index + 1}
                                                                                     </div>
                                                                                     <Input 
                                                                                        className="h-7 text-xs font-semibold border-transparent hover:border-violet-200 focus:border-violet-400 px-1 w-[200px]" 
                                                                                        value={stage.label || ''} 
                                                                                        placeholder={`Stage ${index + 1} Label`}
                                                                                        onChange={(e) => {
                                                                                            setPanels(prev => prev.map(p => {
                                                                                                if (p.panelId === panel.panelId) {
                                                                                                    const stages = [...((p as any).userFlowConfig?.stages || [])];
                                                                                                    stages[index] = { ...stages[index], label: e.target.value };
                                                                                                    return { ...p, userFlowConfig: { ...(p as any).userFlowConfig, stages } };
                                                                                                }
                                                                                                return p;
                                                                                            }));
                                                                                        }}
                                                                                     />
                                                                                 </div>

                                                                                <div className="pl-7">
                                                                                    <MultiSelectDropdown
                                                                                        options={availableEvents
                                                                                            .filter(e => panel.isApiEvent ? e.isApiEvent === true : e.isApiEvent !== true)
                                                                                            .map(e => ({
                                                                                                value: e.eventId,
                                                                                                label: e.isApiEvent && e.host && e.url
                                                                                                    ? `${e.host} - ${e.url}`
                                                                                                    : e.eventName
                                                                                            }))}
                                                                                        selected={stage.eventIds || []}
                                                                                        onChange={(values) => {
                                                                                             setPanels(prev => prev.map(p =>
                                                                                                p.panelId === panel.panelId
                                                                                                    ? { 
                                                                                                        ...p, 
                                                                                                        userFlowConfig: { 
                                                                                                            ...(p as any).userFlowConfig, 
                                                                                                            stages: ((p as any).userFlowConfig?.stages || []).map((s: any, i: number) => 
                                                                                                                i === index ? { ...s, eventIds: values } : s
                                                                                                            )
                                                                                                        } 
                                                                                                    }
                                                                                                    : p
                                                                                             ));
                                                                                        }}
                                                                                        placeholder="Select events for this stage"
                                                                                        className="h-8 text-xs"
                                                                                    />
                                                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                                                         {(stage.eventIds || []).map((eid: string) => {
                                                                                             const ev = availableEvents.find(e => e.eventId === eid);
                                                                                             return ev ? (
                                                                                                <span key={eid} className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded border border-violet-100 dark:border-violet-800">
                                                                                                    {ev.eventName}
                                                                                                </span>
                                                                                             ) : null;
                                                                                         })}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}

                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setPanels(prev => prev.map(p => {
                                                                                    if (p.panelId === panel.panelId) {
                                                                                        const stages = [...((p as any).userFlowConfig?.stages || [])];
                                                                                        stages.push({ 
                                                                                            id: `stage-${Date.now()}`, 
                                                                                            label: `Stage ${stages.length + 1}`,
                                                                                            eventIds: [] 
                                                                                        });
                                                                                        return { ...p, userFlowConfig: { ...(p as any).userFlowConfig, stages } };
                                                                                    }
                                                                                    return p;
                                                                                }));
                                                                            }}
                                                                            className="w-full h-8 text-xs border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                                                                        >
                                                                            <Plus className="h-3 w-3 mr-1" />
                                                                            Add Flow Stage
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* Regular Line/Bar Chart Configuration */
                                                            <>
                                                                <div className="space-y-3">
                                                                    <Label>Pie Charts</Label>
                                                                    <div className="space-y-2">
                                                                        {panel.isApiEvent ? (
                                                                            /* API Event Pie Charts - Status and Cache Status */
                                                                            <>
                                                                                {['status', 'cacheStatus'].map((type) => {
                                                                                    const pieConfig = panel.visualizations.pieCharts.find(p => p.type === type);
                                                                                    return (
                                                                                        <div key={type} className="flex items-center space-x-2">
                                                                                            <Checkbox
                                                                                                id={`${panel.panelId}-pie-${type}`}
                                                                                                checked={pieConfig?.enabled || (type === 'status' || type === 'cacheStatus')} // Auto-enable for API
                                                                                                onCheckedChange={() => togglePieChart(panel.panelId, type as any)}
                                                                                            />
                                                                                            <Label htmlFor={`${panel.panelId}-pie-${type}`} className="cursor-pointer capitalize">
                                                                                                {type === 'status' ? 'HTTP Status Codes' : 'Cache Status'} Distribution
                                                                                            </Label>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                                                                    ⚡ API-specific distributions
                                                                                </p>
                                                                            </>
                                                                        ) : (
                                                                            /* Regular Event Pie Charts - Platform, POS, Source */
                                                                            ['platform', 'pos', 'source'].map((type) => {
                                                                                const pieConfig = panel.visualizations.pieCharts.find(p => p.type === type);
                                                                                return (
                                                                                    <div key={type} className="flex items-center space-x-2">
                                                                                        <Checkbox
                                                                                            id={`${panel.panelId}-pie-${type}`}
                                                                                            checked={pieConfig?.enabled}
                                                                                            onCheckedChange={() => togglePieChart(panel.panelId, type as 'platform' | 'pos' | 'source')}
                                                                                        />
                                                                                        <Label htmlFor={`${panel.panelId}-pie-${type}`} className="cursor-pointer capitalize">
                                                                                            {type} Distribution
                                                                                        </Label>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <Label>Additional Visualizations</Label>
                                                                    <div className="space-y-2">
                                                                        {panel.isApiEvent ? (
                                                                            /* API Event Visualizations */
                                                                            <>
                                                                                <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30">
                                                                                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                                                                                        🚀 API Performance Metrics
                                                                                    </p>
                                                                                    <ul className="text-xs text-muted-foreground space-y-1">
                                                                                        <li>• Response Time (avg, median, mode)</li>
                                                                                        <li>• Data Transfer (bytes in/out)</li>
                                                                                        <li>• Server/Cloud/User Timing Breakdown</li>
                                                                                        <li>• Status Code Distribution</li>
                                                                                        <li>• Cache Hit/Miss Analysis</li>
                                                                                    </ul>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <Checkbox
                                                                                        id={`${panel.panelId}-daily-deviation`}
                                                                                        checked={panel.dailyDeviationCurve}
                                                                                        onCheckedChange={() => {
                                                                                            setPanels(prev => prev.map(p =>
                                                                                                p.panelId === panel.panelId
                                                                                                    ? { ...p, dailyDeviationCurve: !p.dailyDeviationCurve }
                                                                                                    : p
                                                                                            ));
                                                                                        }}
                                                                                    />
                                                                                    <Label htmlFor={`${panel.panelId}-daily-deviation`} className="cursor-pointer">
                                                                                        8-Day Overlay Comparison (≤8 day ranges)
                                                                                    </Label>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            /* Regular Event Visualizations */
                                                                            <>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <Checkbox
                                                                                        id={`${panel.panelId}-hourly-stats`}
                                                                                        checked={panel.showHourlyStats}
                                                                                        onCheckedChange={() => toggleHourlyStats(panel.panelId)}
                                                                                    />
                                                                                    <Label htmlFor={`${panel.panelId}-hourly-stats`} className="cursor-pointer">
                                                                                        Hourly Stats Card (for ≤8 day ranges)
                                                                                    </Label>
                                                                                </div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <Checkbox
                                                                                        id={`${panel.panelId}-daily-deviation`}
                                                                                        checked={panel.dailyDeviationCurve}
                                                                                        onCheckedChange={() => {
                                                                                            setPanels(prev => prev.map(p =>
                                                                                                p.panelId === panel.panelId
                                                                                                    ? { ...p, dailyDeviationCurve: !p.dailyDeviationCurve }
                                                                                                    : p
                                                                                            ));
                                                                                        }}
                                                                                    />
                                                                                    <Label htmlFor={`${panel.panelId}-daily-deviation`} className="cursor-pointer">
                                                                                        Daily Deviation Curve (8-Day Overlay for ≤8 day ranges)
                                                                                    </Label>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <Label>Event Combination</Label>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`${panel.panelId}-combine-events`}
                                                                                checked={panel.type === 'combined'}
                                                                                onCheckedChange={() => {
                                                                                    setPanels(prev => prev.map(p =>
                                                                                        p.panelId === panel.panelId
                                                                                            ? { ...p, type: p.type === 'combined' ? 'separate' : 'combined' }
                                                                                            : p
                                                                                    ));
                                                                                }}
                                                                            />
                                                                            <Label htmlFor={`${panel.panelId}-combine-events`} className="cursor-pointer">
                                                                                Show All Event Types Together (Count, Error, Avg in one chart)
                                                                            </Label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Live Graph Preview */}
                                                    <PanelPreview
                                                        events={panel.events}
                                                        filters={panel.filters}
                                                        graphType={panel.graphType}
                                                        dateRange={panel.dateRange}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Tutorial Overlay */}
            <TutorialOverlay
                steps={tutorialSteps}
                currentStep={currentStep}
                onNext={nextStep}
                onPrevious={prevStep}
                onExit={exitTutorial}
                isOpen={isTutorialOpen}
            />

            {/* Combine Modal */}
            {combiningPanel && combiningPanel.type !== 'alerts' && (
                <PanelCombineModal
                    isOpen={combineModalOpen}
                    onClose={() => {
                        setCombineModalOpen(false);
                        setCombiningPanel(null);
                    }}
                    sourcePanel={combiningPanel as PanelConfig}
                    availablePanels={panels.filter(p => p.type !== 'alerts') as PanelConfig[]}
                    onCombine={handleCombinePanels}
                />
            )}
        </div>
    );
}
