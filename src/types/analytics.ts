export type UserRole = 0 | 1; // 0 = Admin, 1 = Viewer

export interface User {
    id: string;
    username: string;
    role: UserRole;
    token: string;
}

export interface Feature {
    id: string;
    name: string;
    description?: string;
}

export type Granularity = 'hourly' | 'daily';
export type TimeRangePreset = 'last_7_days' | 'last_30_days' | 'custom';

export interface TimeSettings {
    preset: TimeRangePreset;
    customStart?: string;
    customEnd?: string;
    granularity: Granularity;
}

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterConfig {
    type: 'multi-select' | 'single-select';
    defaultValue: string[];
    options: string[]; // For mock data, these are just IDs. In real app, might be objects.
}

export interface EventConfig {
    eventId: string;
    eventName: string;
    color: string;
    feature?: number;
    org?: number;
    isErrorEvent?: number;
    isAvgEvent?: number;
    // API Event specific fields
    isApiEvent?: boolean;
    host?: string;
    url?: string;
    callUrl?: string;
}

export type AggregationMethod = 'sum' | 'average' | 'count';

// New graph type configurations
export interface PercentageGraphConfig {
    type: 'percentage';
    parentEvents: string[]; // Multiple parent events to sum
    childEvents: string[]; // Multiple child events to sum
    filters?: {
        statusCodes?: string[]; // For API events
        cacheStatus?: string[]; // For API events
    };
    showCombinedPercentage: boolean; // Show overall percentage in legend
}

export interface FunnelGraphConfig {
    type: 'funnel';
    stages: {
        eventId: string;
        eventName: string;
        color?: string;
    }[];
    multipleChildEvents: string[]; // Last stage can have multiple events
}

export type SpecialGraphType = PercentageGraphConfig | FunnelGraphConfig;

export interface VisualizationConfig {
    lineGraph: {
        enabled: boolean;
        aggregationMethod: AggregationMethod;
        showLegend: boolean;
        yAxisLabel: string;
    };
    pieCharts: {
        type: 'platform' | 'pos' | 'source' | 'status' | 'cacheStatus';
        enabled: boolean;
        aggregationMethod: AggregationMethod;
        position?: string;
    }[];
}

export interface PanelConfig {
    panelId: string;
    panelName: string;
    type: 'combined' | 'separate' | 'special'; // Add 'special' for new graph types
    position: {
        row: number;
        col: number;
        width: number;
        height: number;
    };
    events: EventConfig[];
    visualizations: VisualizationConfig;
    // Special graph configuration (mutually exclusive with regular visualizations)
    specialGraph?: SpecialGraphType;
    // Filter config for persistence (numeric IDs)
    filterConfig?: {
        events: number[];
        platforms: number[];
        pos: number[];
        sources: number[];
        sourceStr?: string[]; // Job IDs (client-side filter)
        graphType: 'line' | 'bar' | 'percentage' | 'funnel'; // Add new graph types
        dailyDeviationCurve?: boolean; // For <7 days: show 7-day overlay comparison
        isApiEvent?: boolean; // Toggle for API events vs regular events
    };
}

export interface CriticalAlertsConfig {
    enabled: boolean;
    position: string;
    refreshInterval: number;
    maxAlerts: number;
    filterByPOS: string[];
    filterByEvents: string[]; // Event IDs to monitor for alerts
    isApi?: boolean;
}

export interface DashboardProfile {
    profileId: string;
    profileName: string;
    featureId: string;
    createdBy: string;
    createdAt: string;
    lastModified: string;
    version: number;
    isActive: boolean;

    defaultSettings: {
        timeRange: TimeSettings;
        autoRefresh: number; // seconds
    };

    filters: {
        platform: FilterConfig;
        pos: FilterConfig;
        source: FilterConfig;
        event: FilterConfig;
    };

    panels: PanelConfig[];

    criticalAlerts: CriticalAlertsConfig;
}

// Mock Data Response Interfaces
export interface LoginResponse {
    user: User;
    success: boolean;
    message?: string;
}

export interface AnalyticsRecord {
    platform: string | number;
    platformName?: string;
    source: string | number;
    sourceName?: string;
    pos: string | number;
    posName?: string;
    timestamp: string;
    eventId: string | number;
    count: number;
    successCount: number;
    failCount: number;
    avgDelay: number;
    medianDelay: number;
    modeDelay: number;
}

export interface AnalyticsDataResponse {
    data?: AnalyticsRecord[];
    records?: AnalyticsRecord[]; // Legacy support
    graphData?: any[];
    pieChartData?: any;
    metadata: {
        totalEvents: number;
        timeRange: string;
    };
}

export interface Alert {
    alertId: string;
    posName: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
    type?: string;
}
