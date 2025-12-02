// Real API service for analytics dashboard
import type { AnalyticsDataResponse, EventConfig } from '@/types/analytics';

// Use Vite proxy to avoid CORS issues
const API_BASE_URL = '/api';

// Platform mappings (fixed values)
export const PLATFORMS = [
    { id: 0, name: 'Chrome Extension' },
    { id: 1, name: 'Android App' },
    { id: 2, name: 'iOS App' },
    { id: 3, name: 'Mobile Extension' },
    { id: 4, name: 'Edge Extension' },
    { id: 5, name: 'Safari Extension' },
    { id: 6, name: 'Firefox Extension' },
    { id: 7, name: 'Mail' },
    { id: 8, name: 'Graph' },
];

// Source mappings (fixed values)
export const SOURCES = [
    { id: 1, name: 'Spidy' },
    { id: 2, name: 'Kafka' },
    { id: 3, name: 'Self' },
    { id: 8, name: 'Graph' },
];

// POS sites loaded dynamically
export interface SiteDetail {
    id: number;
    name: string;
    image: string;
}

// Cache for site details
let cachedSiteDetails: SiteDetail[] | null = null;

// Feature to API key mapping
export const FEATURE_API_MAP: Record<string, string> = {
    'price_alert': 'PA',
    'auto_coupon': 'AC',
    'spend_lens': 'SPEND'
};

// Reverse mappings for display
export const PLATFORM_NAMES: Record<number, string> = {
    0: 'Chrome Extension',
    1: 'Android App',
    2: 'iOS App',
    3: 'Mobile Extension',
    4: 'Edge Extension',
    5: 'Safari Extension',
    6: 'Firefox Extension',
    7: 'Mail',
    8: 'Graph',
};

export const SOURCE_NAMES: Record<number, string> = {
    1: 'Spidy',
    2: 'Kafka',
    3: 'Self',
    8: 'Graph',
};

interface GraphAPIRequest {
    filter: {
        eventId: number[];
        pos: number[];
        platform: number[];
        source: number[];
    };
    startTime: string; // YYYY-MM-DD
    endTime: string; // YYYY-MM-DD
    isHourly: boolean;
}

interface GraphAPIResponse {
    status: number;
    message: string;
    data: Array<{
        platform: number;
        pos: number;
        timestamp: string;
        eventId: number;
        source: number;
        count: number;
        successCount: number;
        failCount: number;
        avgDelay?: number | null;
        medianDelay?: number | null;
        modeDelay?: number | null;
    }>;
}

interface PieChartAPIResponse {
    status: number;
    message: string;
    data: {
        platform: Record<string, any>;
        source: Record<string, any>;
        pos: Record<string, any>;
    };
}

interface EventsListAPIResponse {
    status: number;
    message: string;
    data: {
        eventMap: Record<string, string>;
    };
}

// Critical Alerts API interfaces
interface AlertAPIRequest {
    filter: {
        eventId: number[];
        pos: number[];
        platform: number[];
        source: number[];
    };
    startTime: string;
    endTime: string;
    isHourly: boolean;
}

interface CriticalAlert {
    id: number;
    eventId: number;
    pos: number;
    platform: number;
    source: number;
    details: string;
    create_time: string;
    update_time: string;
    status: number;
}

interface AlertAPIResponse {
    status: number;
    message: string;
    data: Record<string, CriticalAlert> | CriticalAlert[];
}

export class APIService {
    private siteDetailsCache: SiteDetail[] | null = null;
    private siteDetailsMap: Record<number, string> = {};

    /**
     * Fetch events list for a feature from API
     * @param feature - 'PA', 'AC', or 'SPEND'
     */
    async getEventsList(feature: string): Promise<EventConfig[]> {
        // Convert feature ID to API key if needed
        const apiFeature = FEATURE_API_MAP[feature] || feature;
        
        const response = await fetch(`${API_BASE_URL}/eventsList?feature=${apiFeature}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const result: EventsListAPIResponse = await response.json();

        if (result.status !== 1) {
            throw new Error(result.message || 'Failed to fetch events');
        }

        // Transform to EventConfig format
        const colors = [
            '#4ECDC4', '#FF6B6B', '#FFE66D', '#1A535C', '#FF9F1C',
            '#2EC4B6', '#E71D36', '#95E1D3', '#F38181', '#FCE38A', '#EAFFD0'
        ];

        return Object.entries(result.data.eventMap).map(([id, name], index) => ({
            eventId: id, // Numeric string ID like "1", "2", etc.
            eventName: name,
            color: colors[index % colors.length]
        }));
    }

    /**
     * Fetch site details for POS options
     */
    async getSiteDetails(): Promise<SiteDetail[]> {
        // Return cached if available
        if (this.siteDetailsCache) {
            return this.siteDetailsCache;
        }

        try {
            const response = await fetch('https://search-new.bitbns.com/buyhatkeAdDashboard/ads/siteDetails');

            if (!response.ok) {
                throw new Error(`Failed to fetch site details: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status !== 1) {
                throw new Error(result.message || 'Failed to fetch site details');
            }

            // Transform to SiteDetail format
            const sites: SiteDetail[] = Object.entries(result.data.siteDetails).map(([id, details]: [string, any]) => {
                const siteId = parseInt(id);
                this.siteDetailsMap[siteId] = details.name;
                return {
                    id: siteId,
                    name: details.name,
                    image: details.image
                };
            });

            this.siteDetailsCache = sites;
            cachedSiteDetails = sites;
            return sites;
        } catch (error) {
            console.error('Failed to fetch site details:', error);
            // Return default Flipkart if API fails
            return [{ id: 2, name: 'Flipkart', image: '' }];
        }
    }

    /**
     * Get POS name by ID
     */
    getPosName(posId: number): string {
        return this.siteDetailsMap[posId] || `POS ${posId}`;
    }

    /**
     * Fetch graph data from the backend API
     * All parameters are now numeric IDs
     */
    async getGraphData(
        eventIds: (number | string)[],
        platformIds: (number | string)[],
        posIds: (number | string)[],
        sourceIds: (number | string)[],
        startDate: Date,
        endDate: Date
    ): Promise<AnalyticsDataResponse> {
        // Determine if hourly based on date range (<=7 days = hourly)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) => 
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
               .filter(id => !isNaN(id) && id !== null);

        const requestBody: GraphAPIRequest = {
            filter: {
                eventId: toNumbers(eventIds),
                pos: toNumbers(posIds),
                platform: toNumbers(platformIds),
                source: toNumbers(sourceIds)
            },
            startTime: this.formatDate(startDate),
            endTime: this.formatDate(endDate),
            isHourly
        };

        console.log('Graph API Request:', requestBody);

        const response = await fetch(`${API_BASE_URL}/graph`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const result: GraphAPIResponse = await response.json();

        if (result.status !== 1) {
            throw new Error(result.message || 'Failed to fetch graph data');
        }

        // Pass through raw data - aggregation happens in processGraphData
        // New API returns disaggregated data with platform/eventId/source/pos per record
        const transformedData = result.data.map(record => ({
            timestamp: record.timestamp,
            platform: record.platform,
            eventId: record.eventId,
            source: record.source,
            pos: record.pos,
            count: record.count || 0,
            successCount: record.successCount || 0,
            failCount: record.failCount || 0,
            avgDelay: record.avgDelay || 0,
            medianDelay: record.medianDelay || 0,
            modeDelay: record.modeDelay || 0
        })) as any[];

        return {
            data: transformedData,
            metadata: {
                totalEvents: transformedData.reduce((acc, r) => acc + r.count, 0),
                timeRange: `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`
            }
        };
    }

    /**
     * Fetch pie chart data
     */
    async getPieChartData(
        eventIds: (number | string)[],
        platformIds: (number | string)[],
        posIds: (number | string)[],
        sourceIds: (number | string)[],
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) => 
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
               .filter(id => !isNaN(id) && id !== null);

        const requestBody: GraphAPIRequest = {
            filter: {
                eventId: toNumbers(eventIds),
                pos: toNumbers(posIds),
                platform: toNumbers(platformIds),
                source: toNumbers(sourceIds)
            },
            startTime: this.formatDate(startDate),
            endTime: this.formatDate(endDate),
            isHourly
        };

        console.log('PieChart API Request:', requestBody);

        const response = await fetch(`${API_BASE_URL}/pieChart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const result: PieChartAPIResponse = await response.json();

        if (result.status !== 1) {
            throw new Error(result.message || 'Failed to fetch pie chart data');
        }

        // Transform to component format with proper names
        return {
            platform: Object.values(result.data.platform || {}).map((item: any) => ({
                id: item.platform,
                name: PLATFORM_NAMES[item.platform] || 'Unknown',
                value: item.count,
                successCount: item.successCount,
                failCount: item.failCount
            })),
            pos: Object.values(result.data.pos || {}).map((item: any) => ({
                id: item.pos,
                name: this.siteDetailsMap[item.pos] || `POS ${item.pos}`,
                value: item.count,
                successCount: item.successCount,
                failCount: item.failCount
            })),
            source: Object.values(result.data.source || {}).map((item: any) => ({
                id: item.source,
                name: SOURCE_NAMES[item.source] || 'Unknown',
                value: item.count,
                successCount: item.successCount,
                failCount: item.failCount
            }))
        };
    }

    /**
     * Fetch critical alerts from the backend API
     */
    async getCriticalAlerts(
        eventIds: (number | string)[],
        platformIds: (number | string)[],
        posIds: (number | string)[],
        sourceIds: (number | string)[],
        startDate: Date,
        endDate: Date
    ): Promise<CriticalAlert[]> {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const isHourly = daysDiff <= 7;

        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) => 
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
               .filter(id => !isNaN(id) && id !== null);

        const requestBody: AlertAPIRequest = {
            filter: {
                eventId: toNumbers(eventIds),
                pos: toNumbers(posIds),
                platform: toNumbers(platformIds),
                source: toNumbers(sourceIds)
            },
            startTime: this.formatDate(startDate),
            endTime: this.formatDate(endDate),
            isHourly
        };

        console.log('Alert API Request:', requestBody);

        const response = await fetch(`${API_BASE_URL}/alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const result: AlertAPIResponse = await response.json();

        if (result.status !== 1) {
            throw new Error(result.message || 'Failed to fetch alerts');
        }

        // Handle both array and object response formats
        const alertsData = result.data;
        if (Array.isArray(alertsData)) {
            return alertsData;
        } else if (typeof alertsData === 'object' && alertsData !== null) {
            return Object.values(alertsData);
        }
        return [];
    }

    /**
     * Format date to YYYY-MM-DD
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export const apiService = new APIService();
