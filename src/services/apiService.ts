// Real API service for analytics dashboard
import type { AnalyticsDataResponse, EventConfig } from '@/types/analytics';

// Direct API URLs - backend now handles CORS
const API_BASE_URL = 'https://ext1.buyhatke.com/feature-tracking/dashboard';
const POS_API_BASE_URL = import.meta.env.DEV 
    ? 'http://localhost:8096/buyhatkeAdDashboard/ads'
    : 'https://search-new.bitbns.com/buyhatkeAdDashboard/ads';

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
    { id: -1, name: 'Not Applicable' }, // Sends -1 to API
];

// POS sites loaded dynamically
export interface SiteDetail {
    id: number;
    name: string;
    image: string;
}

// Cache for site details
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let cachedSiteDetails: SiteDetail[] | null = null;

// ============ DYNAMIC FEATURE DATA ============
// Cached features from API
let cachedFeatures: FeatureInfo[] | null = null;
let featuresFetchPromise: Promise<FeatureInfo[]> | null = null;
let cachedFeaturesOrgId: number | null = null; // Track which org the cached features are for

// Cached organizations from API
let cachedOrganizations: OrganizationInfo[] | null = null;
let organizationsFetchPromise: Promise<OrganizationInfo[]> | null = null;

// Dynamic feature maps (populated from API)
let dynamicFeatureNames: Record<number, string> = {};
let dynamicFeatureShortNames: Record<string, string> = {};

// Dynamic color palette for features
const FEATURE_COLORS = [
    { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30', icon: 'text-blue-400' },
    { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30', icon: 'text-emerald-400' },
    { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-500/30', icon: 'text-amber-400' },
    { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-500/30', icon: 'text-pink-400' },
    { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-500/30', icon: 'text-purple-400' },
    { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-500/30', icon: 'text-cyan-400' },
    { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-500/30', icon: 'text-rose-400' },
    { bg: 'bg-indigo-100 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-500/30', icon: 'text-indigo-400' },
    { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-500/30', icon: 'text-teal-400' },
    { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-500/30', icon: 'text-orange-400' },
];

// Get feature color by index (cycles through colors)
export const getFeatureColor = (featureId: string | number): typeof FEATURE_COLORS[0] => {
    const id = typeof featureId === 'string' ? parseInt(featureId) : featureId;
    // Find index in cached features, or use id directly
    const index = cachedFeatures?.findIndex(f => f.id === id) ?? (id - 1);
    return FEATURE_COLORS[Math.abs(index) % FEATURE_COLORS.length];
};

// Get feature name dynamically
export const getFeatureName = (featureId: number | string): string => {
    const id = typeof featureId === 'string' ? parseInt(featureId) : featureId;
    if (isNaN(id)) return String(featureId);
    return dynamicFeatureNames[id] || `Feature ${id}`;
};

// Get feature short name dynamically
export const getFeatureShortName = (featureId: string): string => {
    return dynamicFeatureShortNames[featureId] || featureId.toUpperCase().slice(0, 4);
};

// Update dynamic feature data (called after fetching from API)
export const updateFeatureData = (features: FeatureInfo[]) => {
    cachedFeatures = features;
    dynamicFeatureNames = {};
    dynamicFeatureShortNames = {};
    features.forEach(f => {
        dynamicFeatureNames[f.id] = f.name;
        // Generate short names: "Price Alert" -> "PA", "Auto Coupons" -> "AC"
        const shortName = f.name.split(' ').map(w => w[0]?.toUpperCase() || '').join('');
        dynamicFeatureShortNames[f.id.toString()] = shortName;
    });
};

// Get cached features (returns null if not loaded yet)
export const getCachedFeatures = (): FeatureInfo[] | null => cachedFeatures;

// Clear features cache (call when organization changes)
export const clearFeaturesCache = () => {
    cachedFeatures = null;
    featuresFetchPromise = null;
    cachedFeaturesOrgId = null;
    dynamicFeatureNames = {};
    dynamicFeatureShortNames = {};
};

// Get cached organizations
export const getCachedOrganizations = (): OrganizationInfo[] | null => cachedOrganizations;

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
        sourceStr: string[]; // Client-side filter - always send empty array to server
        status?: number[]; // For API events - status code filter
        cacheStatus?: string[]; // For API events - cache status filter
    };
    startTime: string; // YYYY-MM-DD
    endTime: string; // YYYY-MM-DD
    isHourly: boolean;
    isApi?: number; // 0=Regular, 1=API, 2=Funnel/Percent
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
        sourceStr: string; // Source string identifier (for client-side filtering)
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

interface PieChartApiResponse {
    status: number;
    message: string;
    data: {
        status: Record<string, {
            eventId: number;
            count: number;
            status: number;
            successCount: number;
            failCount: number;
        }>;
        cacheStatus: Record<string, {
            eventId: number;
            count: number;
            cacheStatus: string;
            successCount: number;
            failCount: number;
        }>;
    };
}

interface EventsListAPIResponse {
    status: number;
    message: string;
    data: {
        eventMap: Record<string, {
            id: number;
            eventName: string;
            feature: number;
            org: number;
            isErrorEvent: number;
            isAvgEvent: number;
        }>;
        eventMapApi: Record<string, {
            id: number;
            host: string;
            url: string;
            callUrl: string;
            feature: number;
        }>;
    };
}

interface FeaturesListAPIResponse {
    status: number;
    message: string;
    data: {
        featureMap: Record<string, string>;
    };
}

interface OrganizationsListAPIResponse {
    status: number;
    message: string;
    data: {
        organizationMap: Record<string, string>;
    };
}

export interface OrganizationInfo {
    id: number;
    name: string;
}

export interface FeatureInfo {
    id: number;
    name: string;
}

// Critical Alerts API interfaces
interface AlertAPIRequest {
    filter: {
        eventId: number[];
        pos: number[];
        platform: number[];
        source: number[];
        sourceStr: string[];
    };
    startTime: string;
    endTime: string;
    isHourly: boolean;
    isApi?: number; // 0=Regular, 1=API, 2=Funnel/Percent (uses panelId)
    panelId?: number; // DB panel ID for isApi=2 (percent/funnel alerts)
}

interface CriticalAlertDetails {
    metric: string;
    eventName: string;
    threshold: number;
    timestamp: string;
    currentValue: number;
    expectedValue: number;
}

interface CriticalAlert {
    id: number;
    eventId: number;
    pos: number;
    platform: number;
    source: number;
    sourceStr: string;
    details: CriticalAlertDetails;
    create_time: string;
    update_time: string;
    status: number;
}

interface AlertAPIResponse {
    status: number;
    message: string;
    data: {
        alerts: CriticalAlert[];
    };
}

export class APIService {
    private siteDetailsCache: SiteDetail[] | null = null;
    private siteDetailsMap: Record<number, string> = {};

    /**
     * Fetch events list for a feature from API
     * @param feature - Feature ID (numeric string like "1", "2", etc.)
     * @param organizationId - Organization ID (default: 0)
     */
    async getEventsList(feature: string, organizationId: number = 0): Promise<EventConfig[]> {
        // Convert feature to numeric featureId - now expects numeric string IDs directly
        const featureId = parseInt(feature) || 1;

        // console.log(`📋 Fetching events list for feature: ${feature} -> featureId: ${featureId}, orgId: ${organizationId}`);

        try {
            // Use /api proxy to avoid CORS issues
            const response = await fetch(
                `${API_BASE_URL}/eventsList?featureId=${featureId}&organizationId=${organizationId}`
            );

            if (!response.ok) {
                console.error(`❌ Events API HTTP error: ${response.status} ${response.statusText}`);
                throw new Error(`Failed to fetch events: ${response.statusText}`);
            }

            const result: EventsListAPIResponse = await response.json();
            // console.log(`📋 Events API response:`, result);

            if (result.status !== 1) {
                console.error(`❌ Events API returned error:`, result);
                throw new Error(result.message || 'Failed to fetch events');
            }

            // Transform to EventConfig format
            const colors = [
                '#0891B2', // Cyan - cool, calm
                '#DC2626', // Red - warm accent
                '#F59E0B', // Amber - warm mid-tone
                '#0F766E', // Teal - cool deep
                '#EA580C', // Orange - warm vibrant
                '#10B981', // Emerald - cool fresh
                '#EC4899', // Pink - warm accent
                '#84CC16', // Lime - bright accent
                '#06B6D4'  // Light cyan - cool highlight
            ];

            // Regular events from eventMap
            const regularEvents = Object.entries(result.data.eventMap).map(([id, eventData]: [string, any], index) => ({
                eventId: id, // Numeric string ID like "1", "2", etc.
                eventName: eventData.eventName,
                color: colors[index % colors.length],
                feature: eventData.feature,
                org: eventData.org,
                isErrorEvent: eventData.isErrorEvent,
                isAvgEvent: eventData.isAvgEvent,
                isApiEvent: false
            }));

            // API events from eventMapApi - prefix ID to prevent collision with regular events
            const apiEvents = Object.entries(result.data.eventMapApi || {}).map(([id, eventData]: [string, any], index) => ({
                eventId: `api_${id}`,
                eventName: `${eventData.host} - ${eventData.url}`, // Combined display name
                color: colors[(regularEvents.length + index) % colors.length],
                feature: eventData.feature,
                isApiEvent: true,
                host: eventData.host,
                url: eventData.url,
                callUrl: eventData.callUrl,
                org: 0,
                isErrorEvent: 0,
                isAvgEvent: 0
            }));

            const events = [...regularEvents, ...apiEvents];

            // console.log(`✅ Loaded ${regularEvents.length} regular events and ${apiEvents.length} API events`);
            return events;
        } catch (error) {
            console.error(`❌ Failed to fetch events:`, error);
            throw error;
        }
    }

    /**
     * Fetch features list from API (with caching per organization)
     * @param organizationId - Organization ID (default: 0)
     */
    async getFeaturesList(organizationId: number = 0): Promise<FeatureInfo[]> {
        // If cached for same org, return cached
        if (cachedFeatures && cachedFeaturesOrgId === organizationId) {
            // console.log(`📋 Returning cached features for org ${organizationId} (${cachedFeatures.length} features)`);
            return cachedFeatures;
        }

        // If org changed, clear cache
        if (cachedFeaturesOrgId !== null && cachedFeaturesOrgId !== organizationId) {
            // console.log(`📋 Organization changed from ${cachedFeaturesOrgId} to ${organizationId}, clearing cache`);
            clearFeaturesCache();
        }

        // If already fetching for same org, return the existing promise
        if (featuresFetchPromise && cachedFeaturesOrgId === organizationId) {
            // console.log(`📋 Waiting for existing features fetch...`);
            return featuresFetchPromise;
        }

        // console.log(`📋 Fetching features list for orgId: ${organizationId}`);
        cachedFeaturesOrgId = organizationId;

        // Create and store the promise
        featuresFetchPromise = (async () => {
            try {
                // Use /api proxy to avoid CORS issues
                const response = await fetch(
                    `${API_BASE_URL}/featuresList?organizationId=${organizationId}`
                );

                if (!response.ok) {
                    console.error(`❌ Features API HTTP error: ${response.status} ${response.statusText}`);
                    throw new Error(`Failed to fetch features: ${response.statusText}`);
                }

                const result: FeaturesListAPIResponse = await response.json();
                // console.log(`📋 Features API response:`, result);

                if (result.status !== 1) {
                    console.error(`❌ Features API returned error:`, result);
                    throw new Error(result.message || 'Failed to fetch features');
                }

                // Transform to FeatureInfo format
                const features = Object.entries(result.data.featureMap).map(([id, name]) => ({
                    id: parseInt(id),
                    name: name
                }));

                // Cache and update dynamic data
                cachedFeatures = features;
                updateFeatureData(features);

                // console.log(`✅ Loaded ${features.length} features`);
                return features;
            } catch (error) {
                console.error(`❌ Failed to fetch features:`, error);
                featuresFetchPromise = null; // Reset so it can be retried
                throw error;
            }
        })();

        return featuresFetchPromise;
    }

    /**
     * Fetch POS data from coupon config JSON (for feature ID 2 - Auto Coupons)
     * Returns sites parsed from the ALL_CONFIG_COUPON.json
     */
    private async getCouponConfigPosData(): Promise<SiteDetail[]> {
        // In development, use Vite proxy. In production, use CORS proxy.
        const isDev = import.meta.env.DEV;
        const DIRECT_URL = 'https://search-new.bitbns.com/extension/configs-coupons/prod/ALL_CONFIG_COUPON.json';
        const COUPON_CONFIG_URL = isDev 
            ? '/coupon-config'  // Vite proxy (defaults to ALL_CONFIG_COUPON.json)
            : '/api/coupon-config';  // Same-origin serverless proxy on Vercel

        // console.log('📋 Fetching POS from coupon config...', { isDev, url: COUPON_CONFIG_URL });

        try {
            const response = await fetch(COUPON_CONFIG_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch coupon config: ${response.statusText}`);
            }

            const data = await response.json();

            // Parse the config - key is POS ID, extract name from first URL
            const sites: SiteDetail[] = [];
            const seenIds = new Set<number>();

            Object.entries(data).forEach(([id, config]: [string, any]) => {
                const posId = parseInt(id);
                if (isNaN(posId) || seenIds.has(posId)) return;

                // Get name from first URL, removing www. prefix
                const urls = config?.url || [];
                if (urls.length === 0) return;

                let name = urls[0];
                // Remove www. prefix and extract domain
                name = name.replace(/^www\./, '');
                // Remove trailing path if any (e.g., "lenovo.com/in" -> "lenovo.com")
                const slashIndex = name.indexOf('/');
                if (slashIndex > 0) {
                    name = name.substring(0, slashIndex);
                }

                seenIds.add(posId);
                this.siteDetailsMap[posId] = name;
                sites.push({
                    id: posId,
                    name,
                    image: '' // Coupon config doesn't have images
                });
            });

            // console.log(`✅ Loaded ${sites.length} sites from coupon config`);
            return sites;
        } catch (error) {
            console.error('Failed to fetch coupon config POS:', error);
            throw error;
        }
    }

    /**
     * Fetch site details for POS options
     * For feature ID 2 (Auto Coupons), merges coupon config with siteDetails API
     */
    async getSiteDetails(featureId?: number): Promise<SiteDetail[]> {
        // First, ensure we have the base siteDetails
        if (!this.siteDetailsCache) {
            // console.log(`📋 Fetching site details for POS options`);

            try {
                const response = await fetch(`${POS_API_BASE_URL}/siteDetails`);

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

                // Add special POS values at the beginning
                const specialSites: SiteDetail[] = [
                    { id: 0, name: 'Default', image: '' },
                    { id: -1, name: 'Others', image: '' },
                    ...sites
                ];

                this.siteDetailsCache = specialSites;
                cachedSiteDetails = sites;
                // console.log(`✅ Loaded ${sites.length} sites from siteDetails API`);
            } catch (error) {
                console.error('Failed to fetch site details:', error);
                // Set fallback cache with special POS values
                this.siteDetailsCache = [
                    { id: 0, name: 'Default', image: '' },
                    { id: -1, name: 'Others', image: '' },
                    { id: 2, name: 'Flipkart', image: '' }
                ];
            }
        }

        // For feature 2, also fetch and merge coupon config sites
        if (featureId === 2) {
            try {
                const couponSites = await this.getCouponConfigPosData();
                if (couponSites.length > 0) {
                    // Merge: add coupon sites not already in siteDetails
                    const existingIds = new Set(this.siteDetailsCache!.map(s => s.id));
                    const newSites = couponSites.filter(s => !existingIds.has(s.id));

                    if (newSites.length > 0) {
                        // console.log(`✅ Adding ${newSites.length} new sites from coupon config`);
                        const merged = [...this.siteDetailsCache!, ...newSites];
                        // Sort by name for easier search
                        merged.sort((a, b) => a.name.localeCompare(b.name));
                        return merged;
                    }
                }
            } catch (error) {
                // console.log('⚠️ Coupon config fetch failed, using siteDetails only');
            }
        }

        return this.siteDetailsCache || [];
    }

    /**
     * Fetch critical alerts
     * @param panelId - Optional DB panel ID for isApi=2 (percent/funnel) alerts
     */
    async getAlerts(
        eventIds: number[],
        startTime: string,
        endTime: string,
        isHourly: boolean,
        isApi: number | boolean, // Accept boolean or number
        limit: number = 1000,
        page: number = 0,
        platforms: number[] = [],  // Optional filters
        pos: number[] = [],
        sources: number[] = [],
        sourceStr: string[] = [],
        panelId?: number // DB panel ID for isApi=2 (percent/funnel alerts)
    ): Promise<any> {
        const isApiVal = typeof isApi === 'boolean' ? (isApi ? 1 : 0) : isApi;
        
        const body: any = {
            filter: {
                eventId: eventIds,
                platform: platforms,
                pos: pos,
                source: sources,
                sourceStr: sourceStr
            },
            startTime,
            endTime,
            isHourly,
            limit,
            page,
            isApi: isApiVal
        };

        // For isApi=2 (percent/funnel), add panelId if provided
        if (isApiVal === 2 && panelId) {
            body.panelId = panelId;
            console.log('🎯 Alerts: Using panelId', panelId, 'for isApi=2');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.error(`Alerts fetch failed: ${response.status} ${response.statusText}`);
                return { alerts: [], summary: {} };
            }

            const result = await response.json();
            if (result.status === 1 && result.data) {
                return result.data; // Expected { alerts: [], summary: {} }
            }
            return { alerts: [], summary: {} };
        } catch (error) {
            console.error("Error fetching alerts:", error);
            return { alerts: [], summary: {} };
        }
    }

    /**
     * Fetch list of alert counts per event
     * Endpoint: /dashboard/alertList
     */
    async getAlertList(
        eventIds: (number | string)[],
        startDate: Date,
        endDate: Date,
        isHourly: boolean = true,
        isApi: number | boolean = 0
    ): Promise<Record<string, number>> {
        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) =>
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
                .filter(id => !isNaN(id) && id !== null);

        const body = {
            eventId: toNumbers(eventIds),
            startTime: this.formatDate(startDate, false), // YYYY-MM-DD 00:00:01
            endTime: this.formatDate(endDate, true), // YYYY-MM-DD 23:59:59
            isHourly,
            isApi: typeof isApi === 'boolean' ? (isApi ? 1 : 0) : isApi
        };

        try {
            const response = await fetch(`${API_BASE_URL}/alertList`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                return {};
            }

            const result = await response.json();
            // Expected response: { status: 1, data: { alertsList: { "29": 10 } } }
            if (result.status === 1 && result.data && result.data.alertsList) {
                return result.data.alertsList;
            }
            return {};
        } catch (error) {
            console.error("Error fetching alert list:", error);
            return {};
        }
    }

    /**
     * Get POS name by ID
     */
    getPosName(posId: number): string {
        return this.siteDetailsMap[posId] || `POS ${posId}`;
    }

    /**
     * Fetch available sourceStr options for given event IDs
     * POST /sourceStr with eventId array
     * Returns array of sourceStr values (job IDs)
     */
    async fetchSourceStr(eventIds: number[]): Promise<string[]> {
        if (!eventIds || eventIds.length === 0) {
            return [];
        }

        try {
            // console.log('📋 Fetching sourceStr options for events:', eventIds);

            const response = await fetch(`${API_BASE_URL}/sourceStr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventId: eventIds }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch sourceStr: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.status !== 1) {
                console.warn('SourceStr API returned non-success status:', result);
                return [];
            }

            const sourceStrs = result.data || [];
            // console.log(`✅ Loaded ${sourceStrs.length} sourceStr options`);
            return sourceStrs.filter((s: string) => s && s.trim() !== ''); // Filter out empty strings
        } catch (error) {
            console.error('Failed to fetch sourceStr:', error);
            return [];
        }
    }

    /**
     * Fetch graph data from the backend API
     * Uses graphV2 (pre-aggregated) first, falls back to graph (granular) on error
     * All parameters are now numeric IDs
     */
    async getGraphData(
        eventIds: (number | string)[],
        platformIds: (number | string)[],
        posIds: (number | string)[],
        sourceIds: (number | string)[],
        sourceStrs: string[],
        startDate: Date,
        endDate: Date,
        isApiEvent: boolean = false,
        preferV1: boolean = false, // Force v1 API if needed
        isHourlyOverride: boolean | null = null // Allow overriding hourly/daily logic
    ): Promise<AnalyticsDataResponse> {
        // Determine if hourly based on date range (<=7 days = hourly)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // Use override if provided, otherwise fallback to date-based logic
        const isHourly = isHourlyOverride !== null ? isHourlyOverride : daysDiff <= 7;

        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) =>
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
                .filter(id => !isNaN(id) && id !== null);

        const requestBody: GraphAPIRequest = {
            filter: {
                eventId: toNumbers(eventIds),
                pos: toNumbers(posIds),
                platform: toNumbers(platformIds),
                source: toNumbers(sourceIds),
                sourceStr: sourceStrs || [],
                // For API events, send empty arrays to get ALL status codes and cache statuses
                // Backend needs these fields to return data broken down by status
                ...(isApiEvent ? { status: [], cacheStatus: [] } : {})
            },
            startTime: this.formatDate(startDate, false),
            endTime: this.formatDate(endDate, true),
            isHourly,
            isApi: isApiEvent ? 1 : 0 // Pass isApi flag for API events (converted to number)
        };

        // Transform response data helper
        const transformResponse = (result: GraphAPIResponse): AnalyticsDataResponse => {
            const transformedData = result.data.map(record => ({
                timestamp: record.timestamp,
                platform: record.platform,
                eventId: record.eventId,
                source: record.source,
                sourceStr: record.sourceStr || '', // Include sourceStr for client-side filtering
                pos: record.pos,
                count: record.count || 0,
                successCount: record.successCount || 0,
                failCount: record.failCount || 0,
                avgDelay: record.avgDelay || 0,
                medianDelay: record.medianDelay || 0,
                modeDelay: record.modeDelay || 0,
                // API event specific fields
                status: (record as any).status,
                cacheStatus: (record as any).cacheStatus,
                avgBytesIn: (record as any).avgBytesIn,
                avgBytesOut: (record as any).avgBytesOut,
                avgServerToUser: (record as any).avgServerToUser,
                avgServerToCloud: (record as any).avgServerToCloud,
                avgCloudToUser: (record as any).avgCloudToUser,
                medianBytesIn: (record as any).medianBytesIn,
                medianBytesOut: (record as any).medianBytesOut
            })) as any[];

            return {
                data: transformedData,
                metadata: {
                    totalEvents: transformedData.reduce((acc, r) => acc + r.count, 0),
                    timeRange: `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`
                }
            };
        };

        // Try graphV2 first (unless preferV1 is set)
        if (!preferV1) {
            try {
                // console.log('📊 Trying graphV2 API (pre-aggregated)...');
                const responseV2 = await fetch(`${API_BASE_URL}/graphV2`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                if (responseV2.ok) {
                    const resultV2: GraphAPIResponse = await responseV2.json();
                    if (resultV2.status === 1) {
                        // console.log(`✅ Using graphV2 API - ${resultV2.data.length} records`);
                        return transformResponse(resultV2);
                    }
                }
                // console.log('⚠️ graphV2 returned non-success, falling back to graph...');
            } catch (error) {
                // console.log('⚠️ graphV2 failed, falling back to graph:', error);
            }
        }

        // Fallback to original graph API
        // console.log('📊 Using graph API (v1)...');
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

        console.log(`✅ Using graph API (v1) - ${result.data.length} records`);
        return transformResponse(result);
    }

    /**
     * Fetch pie chart data (regular or API)
     */
    async getPieChartData(
        eventIds: (number | string)[],
        platformIds: (number | string)[],
        posIds: (number | string)[],
        sourceIds: (number | string)[],
        sourceStrs: string[],
        startDate: Date,
        endDate: Date,
        isApiEvent: boolean = false // Added for API events
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
                source: toNumbers(sourceIds),
                sourceStr: sourceStrs || [] // Filter by sourceStr
            },
            startTime: this.formatDate(startDate, false),
            endTime: this.formatDate(endDate, true),
            isHourly
        };

        // console.log('PieChart API Request:', requestBody);

        // Use different endpoint for API events
        const endpoint = isApiEvent ? `${API_BASE_URL}/pieChartApi` : `${API_BASE_URL}/pieChart`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        if (isApiEvent) {
            const result: PieChartApiResponse = await response.json();
            if (result.status !== 1) {
                throw new Error(result.message || 'Failed to fetch pie chart data');
            }
            return result;
        }

        const result: PieChartAPIResponse = await response.json();

        if (result.status !== 1) {
            throw new Error(result.message || 'Failed to fetch pie chart data');
        }

        // Transform to component format with proper names
        // Handle special "others" key which aggregates remaining data
        const transformPieData = (data: any, type: 'platform' | 'pos' | 'source') => {
            if (!data) return [];

            const pickMetric = (item: any) => {
                const count = Number(item?.count || 0);
                if (count > 0) return { value: count, metricType: 'count' };
                const avgDelay = Number(item?.avgDelay);
                if (!Number.isNaN(avgDelay) && avgDelay > 0) return { value: avgDelay, metricType: 'avgDelay' };
                const medianDelay = Number(item?.medianDelay);
                if (!Number.isNaN(medianDelay) && medianDelay > 0) return { value: medianDelay, metricType: 'medianDelay' };
                const modeDelay = Number(item?.modeDelay);
                if (!Number.isNaN(modeDelay) && modeDelay > 0) return { value: modeDelay, metricType: 'modeDelay' };
                return { value: 0, metricType: 'count' };
            };

            return Object.entries(data).map(([key, item]: [string, any]) => {
                const metric = pickMetric(item);
                // Handle "others" key specially
                if (key === 'others') {
                    return {
                        id: 'others',
                        name: 'Others',
                        value: metric.value,
                        metricType: metric.metricType,
                        successCount: item.successCount,
                        failCount: item.failCount
                    };
                }
                // Normal entries
                if (type === 'platform') {
                    return {
                        id: item.platform,
                        name: PLATFORM_NAMES[item.platform] || 'Unknown',
                        value: metric.value,
                        metricType: metric.metricType,
                        successCount: item.successCount,
                        failCount: item.failCount
                    };
                } else if (type === 'pos') {
                    return {
                        id: item.pos,
                        name: this.siteDetailsMap[item.pos] || (item.pos === 0 ? 'Unknown' : `POS ${item.pos}`),
                        value: metric.value,
                        metricType: metric.metricType,
                        successCount: item.successCount,
                        failCount: item.failCount
                    };
                } else {
                    return {
                        id: item.source,
                        name: SOURCE_NAMES[item.source] || (item.source === -1 ? 'Unknown' : 'Unknown'),
                        value: metric.value,
                        metricType: metric.metricType,
                        successCount: item.successCount,
                        failCount: item.failCount
                    };
                }
            });
        };

        return {
            platform: transformPieData(result.data.platform, 'platform'),
            pos: transformPieData(result.data.pos, 'pos'),
            source: transformPieData(result.data.source, 'source')
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
        endDate: Date,
        limit: number = 10,
        page: number = 0,
        isApi: number = 0, // 0 = Regular events, 1 = API events, 2 = Funnel/Percent (uses panelId)
        isHourly: boolean | null = null, // null means calculate based on range
        panelId?: number // DB panel ID for isApi=2 (percent/funnel alerts)
    ): Promise<CriticalAlert[]> {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const finalIsHourly = isHourly !== null ? isHourly : (daysDiff <= 7);

        // Convert all IDs to numbers and filter out invalid ones
        const toNumbers = (arr: (number | string)[]) =>
            arr.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
                .filter(id => !isNaN(id) && id !== null);

        const requestBody: AlertAPIRequest = {
            filter: {
                eventId: toNumbers(eventIds),
                pos: toNumbers(posIds),
                platform: toNumbers(platformIds),
                source: toNumbers(sourceIds),
                sourceStr: [] // Always send empty array
            },
            startTime: this.formatDate(startDate, false),
            endTime: this.formatDate(endDate, true),
            isHourly: finalIsHourly,
            isApi // Add isApi field
        };

        // For isApi=2 (percent/funnel), add panelId if provided
        if (isApi === 2 && panelId) {
            requestBody.panelId = panelId;
            console.log('🎯 Critical Alerts: Using panelId', panelId, 'for isApi=2');
        }

        console.log('Alert API Request:', requestBody);

        const response = await fetch(`${API_BASE_URL}/alert?limit=${limit}&page=${page}`, {
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

        // Handle the new response format with alerts array inside data
        return result.data?.alerts || [];
    }

    /**
     * Get platform name by ID
     */
    getPlatformName(platformId: number): string {
        return PLATFORM_NAMES[platformId] || `Platform ${platformId}`;
    }
    /**
     * Upload child config for percentage / funnel graphs
     * Sends config object with panelId as key and child/parent relationships as array
     * Format: { config: { "panelId": [{ child: "eventId", parent: ["eventId1", "eventId2"] }] } }
     * @param panelId - The DB panel ID (used as the config key)
     * @param childParentMappings - Array of child/parent event ID mappings
     */
    async uploadChildConfig(
        panelId: number | string,
        childParentMappings: Array<{ child: string; parent: string[] }>
    ): Promise<void> {
        try {
            // Format: { config: { "2": [{ child: "204", parent: ["84", "92"] }] } }
            const config: Record<string, Array<{ child: string; parent: string[] }>> = {
                [String(panelId)]: childParentMappings
            };

            console.log('📤 Uploading child config for panelId:', panelId, config);

            const response = await fetch(`${API_BASE_URL}/uploadChildConfig`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });

            if (!response.ok) {
                throw new Error(`Upload child config failed: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.status !== 1 && result.status !== 200) {
                throw new Error(result.message || 'Failed to upload child config');
            }
            
            console.log('✅ Child config uploaded successfully for panelId:', panelId);
        } catch (error) {
            console.error('Failed to upload child config:', error);
            // Don't throw - this is a non-critical operation
        }
    }

    /**
     * Format date to YYYY-MM-DD HH:MM:SS
     * Start dates get 00:00:01, end dates get 23:59:59
     */
    private formatDate(date: Date | string, isEndDate: boolean = false): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const time = isEndDate ? '23:59:59' : '00:00:01';
        return `${year}-${month}-${day} ${time}`;
    }

    /**
     * Fetch organizations list from API (with caching)
     */
    async getOrganizationsList(): Promise<OrganizationInfo[]> {
        // Return cached if available
        if (cachedOrganizations) {
            console.log(`🏢 Returning cached organizations (${cachedOrganizations.length} orgs)`);
            return cachedOrganizations;
        }

        // If already fetching, return the existing promise
        if (organizationsFetchPromise) {
            console.log(`🏢 Waiting for existing organizations fetch...`);
            return organizationsFetchPromise;
        }

        console.log(`🏢 Fetching organizations list`);

        // Create and store the promise
        organizationsFetchPromise = (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/organizationsList`);

                if (!response.ok) {
                    console.error(`❌ Organizations API HTTP error: ${response.status} ${response.statusText}`);
                    throw new Error(`Failed to fetch organizations: ${response.statusText}`);
                }

                const result: OrganizationsListAPIResponse = await response.json();
                console.log(`🏢 Organizations API response:`, result);

                if (result.status !== 1) {
                    console.error(`❌ Organizations API returned error:`, result);
                    throw new Error(result.message || 'Failed to fetch organizations');
                }

                // Transform to OrganizationInfo format
                const organizations = Object.entries(result.data.organizationMap).map(([id, name]) => ({
                    id: parseInt(id),
                    name: name
                }));

                // Cache the result
                cachedOrganizations = organizations;

                console.log(`✅ Loaded ${organizations.length} organizations`);
                return organizations;
            } catch (error) {
                console.error(`❌ Failed to fetch organizations:`, error);
                organizationsFetchPromise = null; // Reset so it can be retried
                throw error;
            }
        })();

        return organizationsFetchPromise;
    }
}

export const apiService = new APIService();
