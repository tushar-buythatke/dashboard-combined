import type { DashboardProfile } from '@/types/analytics';

export interface DashboardViewerProps {
    profileId: string;
    onEditProfile?: (profile: DashboardProfile) => void;
    onAlertsUpdate?: (alerts: any[]) => void;
    onPanelActive?: (panelId: string) => void;
}

export interface FilterState {
    platforms: number[];
    pos: number[];
    sources: number[];
    events: number[];
    sourceStr?: string[];
    // New fields for togglable filters
    activeStages?: string[];
    activePercentageEvents?: string[];
    activePercentageChildEvents?: string[];
    activeFunnelChildEvents?: string[];
    percentageStatusCodes?: string[];
    percentageCacheStatus?: string[];
    apiStatusCodes?: string[];
    apiCacheStatus?: string[];
    activePercentageGroupChildEvents?: boolean; // Toggle: true = Single Graph, false = Separate Graphs
    activeIncludeEvents?: string[]; // For User Flow graph sequence
}

export interface DateRangeState {
    from: Date;
    to: Date;
}

// Event key info for chart rendering
export interface EventKeyInfo {
    eventId: string;
    eventName: string;
    eventKey: string;
    isErrorEvent?: number;
    isAvgEvent?: number;
}

// Panel-specific data storage with filters and date range
export interface PanelData {
    graphData: any[];
    eventKeys?: EventKeyInfo[];
    pieChartData: any;
    loading: boolean;
    error: string | null;
    filters: FilterState;
    dateRange: DateRangeState;
    showLegend: boolean;
    rawGraphResponse?: any;
    hasLoadedOnce?: boolean; // Prevents infinite loading loops when API returns empty data
}
