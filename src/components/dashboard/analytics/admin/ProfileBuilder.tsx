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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PanelCombineModal } from './PanelCombineModal';
import { PanelPreview } from './PanelPreview';
import { Save, Trash2, Plus, Combine, Layers, BarChart3, LineChart, CalendarIcon, Bell, AlertTriangle } from 'lucide-react';
import { useAnalyticsAuth } from '@/contexts/AnalyticsAuthContext';
import { format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface ProfileBuilderProps {
    featureId: string;
    onCancel: () => void;
    onSave?: () => void;
    initialProfileId?: string | null;
}

// Extended panel config with filters using numeric IDs
interface ExtendedPanelConfig extends Omit<PanelConfig, 'type'> {
    type: 'separate' | 'combined' | 'alerts'; // Extended type to include alerts panel
    filters: {
        events: number[];      // Numeric event IDs
        platforms: number[];   // Numeric platform IDs
        pos: number[];         // Numeric POS IDs
        sources: number[];     // Numeric source IDs
    };
    graphType: 'line' | 'bar';
    dateRange: {
        from: Date;
        to: Date;
    };
    showHourlyStats: boolean;
}

export function ProfileBuilder({ featureId, onCancel, onSave, initialProfileId }: ProfileBuilderProps) {
    const { user } = useAnalyticsAuth();
    const [profileName, setProfileName] = useState('New Profile');
    const [panels, setPanels] = useState<ExtendedPanelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [workflowMode, setWorkflowMode] = useState<'quick' | 'template'>('template');
    const [combineModalOpen, setCombineModalOpen] = useState(false);
    const [combiningPanel, setCombiningPanel] = useState<ExtendedPanelConfig | null>(null);
    
    // Data loaded from APIs
    const [availableEvents, setAvailableEvents] = useState<EventConfig[]>([]);
    const [siteDetails, setSiteDetails] = useState<SiteDetail[]>([]);

    // Load events and site details from APIs
    useEffect(() => {
        const loadApiData = async () => {
            try {
                // Load events for this feature
                const events = await apiService.getEventsList(featureId);
                setAvailableEvents(events);
                
                // Load site details for POS
                const sites = await apiService.getSiteDetails();
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
                    // Convert to extended format - load saved filterConfig if available
                    const extendedPanels: ExtendedPanelConfig[] = profile.panels.map(p => {
                        // Check if filterConfig was saved
                        const savedConfig = (p as any).filterConfig;
                        
                        // Preserve the type if it's alerts panel
                        const panelType = (p as any).type === 'alerts' ? 'alerts' : (p.type || 'separate');
                        
                        return {
                            ...p,
                            type: panelType as 'separate' | 'combined' | 'alerts',
                            filters: savedConfig ? {
                                events: savedConfig.events || [],
                                platforms: savedConfig.platforms || [0],
                                pos: savedConfig.pos || [2],
                                sources: savedConfig.sources || [1]
                            } : {
                                // Fallback to defaults
                                events: p.events.map(e => parseInt(e.eventId)).filter(id => !isNaN(id)),
                                platforms: [0], // Chrome Extension
                                pos: [2],       // Flipkart
                                sources: [1]    // Spidy
                            },
                            graphType: (savedConfig?.graphType || 'line') as 'line' | 'bar',
                            dateRange: savedConfig?.dateRange ? {
                                from: new Date(savedConfig.dateRange.from),
                                to: new Date(savedConfig.dateRange.to)
                            } : {
                                from: subDays(new Date(), 7),
                                to: new Date()
                            },
                            showHourlyStats: savedConfig?.showHourlyStats !== false // Default to true
                        };
                    });
                    
                    // Check if profile already has alerts panel, if not add one at beginning
                    const hasAlertsPanel = extendedPanels.some(p => p.type === 'alerts');
                    if (!hasAlertsPanel) {
                        const alertsPanel: ExtendedPanelConfig = {
                            panelId: 'panel_alerts_0',
                            panelName: 'Critical Alerts Monitor',
                            type: 'alerts',
                            position: { row: 0, col: 1, width: 12, height: 4 },
                            events: [],
                            filters: {
                                events: [],
                                platforms: [],
                                pos: [],
                                sources: []
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
                        sources: [] // All sources
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
                sources: [1]    // Spidy
            },
            graphType: 'line',
            dateRange: {
                from: subDays(new Date(), 7),
                to: new Date()
            },
            showHourlyStats: true,
            visualizations: {
                lineGraph: { enabled: true, aggregationMethod: 'sum', showLegend: true, yAxisLabel: 'Count' },
                pieCharts: [
                    { type: 'platform', enabled: true, aggregationMethod: 'sum' },
                    { type: 'pos', enabled: true, aggregationMethod: 'sum' },
                    { type: 'source', enabled: true, aggregationMethod: 'sum' }
                ]
            }
        };
        setPanels([...panels, newPanel]);
    };

    const deletePanel = (panelId: string) => {
        setPanels(panels.filter(p => p.panelId !== panelId));
    };

    const updatePanelFilter = (panelId: string, filterType: keyof ExtendedPanelConfig['filters'], values: string[]) => {
        setPanels(panels.map(p => {
            if (p.panelId === panelId) {
                const numericValues = values.map(v => parseInt(v)).filter(id => !isNaN(id));
                const updatedFilters = { ...p.filters, [filterType]: numericValues };

                // Update events array based on selected event IDs
                if (filterType === 'events') {
                    const selectedEvents = availableEvents.filter(e => numericValues.includes(parseInt(e.eventId)));
                    return {
                        ...p,
                        filters: updatedFilters,
                        events: selectedEvents.length > 0 ? selectedEvents : p.events,
                        type: selectedEvents.length > 1 ? 'combined' as const : 'separate' as const
                    };
                }

                return { ...p, filters: updatedFilters };
            }
            return p;
        }));
    };

    const updatePanelGraphType = (panelId: string, graphType: 'line' | 'bar') => {
        setPanels(panels.map(p => p.panelId === panelId ? { ...p, graphType } : p));
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

    const togglePieChart = (panelId: string, pieType: 'platform' | 'pos' | 'source') => {
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

            const mergedFilters = {
                events: mergeUniqueNumbers(target.filters.events, source.filters.events),
                platforms: mergeUniqueNumbers(target.filters.platforms, source.filters.platforms),
                pos: mergeUniqueNumbers(target.filters.pos, source.filters.pos),
                sources: mergeUniqueNumbers(target.filters.sources, source.filters.sources)
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
            .map(p => ({
                panelId: p.panelId,
                panelName: p.panelName,
                type: p.type,
                position: p.position,
                events: p.events,
                visualizations: p.visualizations,
                // Store filter config in panel for persistence
                filterConfig: {
                    events: p.filters.events,
                    platforms: p.filters.platforms,
                    pos: p.filters.pos,
                    sources: p.filters.sources,
                    graphType: p.graphType,
                    dateRange: {
                        from: p.dateRange.from.toISOString(),
                        to: p.dateRange.to.toISOString()
                    },
                    showHourlyStats: p.showHourlyStats
                }
            } as any));

        const profile: DashboardProfile = {
            profileId: initialProfileId || `profile_${Date.now()}`,
            profileName,
            featureId,
            createdBy: user?.id || 'unknown',
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
            criticalAlerts: { enabled: hasAlertsPanel, refreshInterval: 30, position: 'top', maxAlerts: 5, filterByPOS: [] }
        };

        await mockService.saveProfile(profile);
        onSave?.();
        onCancel();
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Loading profile...</div>;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
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
                                                <div className="flex flex-wrap gap-1">
                                                    {panel.events.map(e => (
                                                        <span
                                                            key={e.eventId}
                                                            className="text-xs px-2 py-1 rounded bg-secondary"
                                                            style={{ borderLeft: `3px solid ${e.color}` }}
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
                            {panels.map((panel) => (
                                <Card key={panel.panelId} className={cn(
                                    "relative",
                                    panel.type === 'alerts' && "border-2 border-red-200 dark:border-red-500/30 bg-gradient-to-br from-red-50/30 to-orange-50/20 dark:from-red-900/10 dark:to-orange-900/5"
                                )}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {panel.type === 'alerts' && (
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                                                        <Bell className="h-4 w-4 text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <Input
                                                        value={panel.panelName}
                                                        onChange={(e) => updatePanelName(panel.panelId, e.target.value)}
                                                        className="text-lg font-semibold w-auto max-w-md"
                                                    />
                                                    {panel.type === 'alerts' && (
                                                        <p className="text-xs text-muted-foreground mt-1">Panel 0 - Critical Alerts Monitor (removable)</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {panel.type !== 'alerts' && panels.filter(p => p.type !== 'alerts').length > 1 && (
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
                                                {/* All panels including alerts can be deleted */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => deletePanel(panel.panelId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Alert Panel - Special minimal config */}
                                        {panel.type === 'alerts' ? (
                                            <div className="p-4 bg-white/50 dark:bg-gray-800/30 rounded-lg border border-red-100 dark:border-red-500/20">
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-500" />
                                                    This panel monitors critical alerts. Filters can be adjusted at runtime in the dashboard.
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                        <div className="text-2xl font-bold text-red-600">∞</div>
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
                                                        <div className="text-xs text-muted-foreground">Collapsible</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                        /* Regular Panel - Full filter configuration */
                                        <>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/20 rounded-lg">
                                            <div className="space-y-2">
                                                <Label>Events ({getFeatureShortName(featureId)})</Label>
                                                <MultiSelectDropdown
                                                    options={eventOptions}
                                                    selected={panel.filters.events.map(id => id.toString())}
                                                    onChange={(values) => updatePanelFilter(panel.panelId, 'events', values)}
                                                    placeholder="Select events"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Platform</Label>
                                                <MultiSelectDropdown
                                                    options={platformOptions}
                                                    selected={panel.filters.platforms.map(id => id.toString())}
                                                    onChange={(values) => updatePanelFilter(panel.panelId, 'platforms', values)}
                                                    placeholder="Select platforms"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>POS</Label>
                                                <MultiSelectDropdown
                                                    options={posOptions}
                                                    selected={panel.filters.pos.map(id => id.toString())}
                                                    onChange={(values) => updatePanelFilter(panel.panelId, 'pos', values)}
                                                    placeholder="Select POS"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Source</Label>
                                                <MultiSelectDropdown
                                                    options={sourceOptions}
                                                    selected={panel.filters.sources.map(id => id.toString())}
                                                    onChange={(values) => updatePanelFilter(panel.panelId, 'sources', values)}
                                                    placeholder="Select sources"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date Range</Label>
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

                                        {/* Graph Type & Pie Charts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label>Graph Type</Label>
                                                <RadioGroup
                                                    value={panel.graphType}
                                                    onValueChange={(val) => updatePanelGraphType(panel.panelId, val as 'line' | 'bar')}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="line" id={`${panel.panelId}-line`} />
                                                        <Label htmlFor={`${panel.panelId}-line`} className="flex items-center gap-2 cursor-pointer">
                                                            <LineChart className="h-4 w-4" />
                                                            Line Chart
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="bar" id={`${panel.panelId}-bar`} />
                                                        <Label htmlFor={`${panel.panelId}-bar`} className="flex items-center gap-2 cursor-pointer">
                                                            <BarChart3 className="h-4 w-4" />
                                                            Bar Chart
                                                        </Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>

                                            <div className="space-y-3">
                                                <Label>Pie Charts</Label>
                                                <div className="space-y-2">
                                                    {['platform', 'pos', 'source'].map((type) => {
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
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label>Additional Visualizations</Label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${panel.panelId}-hourly-stats`}
                                                            checked={panel.showHourlyStats}
                                                            onCheckedChange={() => toggleHourlyStats(panel.panelId)}
                                                        />
                                                        <Label htmlFor={`${panel.panelId}-hourly-stats`} className="cursor-pointer">
                                                            Hourly Stats Card (for ≤7 day ranges)
                                                        </Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Live Graph Preview */}
                                        <PanelPreview
                                            events={panel.events}
                                            filters={panel.filters}
                                            graphType={panel.graphType}
                                        />
                                        </>
                                        )}
                                    </CardContent>

                                    {/* Add Panel Button Below */}
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
                            </>
                        )}

                        {/* Final Add Button */}
                        {panels.length > 0 && (
                            <div className="flex justify-center py-8">
                                <Button onClick={handleAddPanel} size="lg" className="gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add New Panel Configuration
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

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
