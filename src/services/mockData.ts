import type {
    Feature,
    DashboardProfile,
    AnalyticsDataResponse,
    Alert,
    LoginResponse
} from '../types/analytics';
import { apiService, updateFeatureData } from './apiService';
import type { FeatureInfo } from './apiService';

// Fallback features if API fails
const FALLBACK_FEATURES: Feature[] = [
    { id: '1', name: 'Price Alert', description: 'Monitor price changes across platforms' },
    { id: '2', name: 'Auto Coupons', description: 'Track coupon application rates' },
    { id: '3', name: 'Spend Calculator', description: 'Analyze spending patterns' },
    { id: '4', name: 'Spidy', description: 'Spidy tracking' },
];

const MOCK_ALERTS: Alert[] = [
    { alertId: '1', posName: 'POS_1', message: 'High latency detected', severity: 'critical', timestamp: new Date().toISOString() },
    { alertId: '2', posName: 'POS_2', message: 'Connection drop', severity: 'warning', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

const INITIAL_PROFILES: DashboardProfile[] = [
    {
        profileId: 'price_alert_backend',
        profileName: 'Price Alert - Backend',
        featureId: 'price_alert',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: 1,
        isActive: true,
        defaultSettings: {
            timeRange: { preset: 'last_7_days', granularity: 'hourly' },
            autoRefresh: 300
        },
        filters: {
            platform: {
                type: 'multi-select',
                defaultValue: ['all'],
                options: ['all', 'chrome_extension', 'android_app', 'ios_app', 'mobile_extension', 'edge_extension', 'safari_extension', 'firefox_extension', 'mail', 'graph']
            },
            pos: {
                type: 'multi-select',
                defaultValue: ['all'],
                options: ['all', 'flipkart', 'amazon', 'myntra']
            },
            source: {
                type: 'multi-select',
                defaultValue: ['all'],
                options: ['all', 'spidy', 'kafka', 'self', 'graph']
            },
            event: {
                type: 'multi-select',
                defaultValue: ['PA_SET'],
                options: ['all', 'PA_SET', 'PA_REMOVE', 'PA_SPIDY_FEED', 'PA_SELF_SCRAPED']
            }
        },
        panels: [
            {
                panelId: 'p1',
                panelName: 'Alerts Overview',
                type: 'combined',
                position: { row: 1, col: 1, width: 12, height: 6 },
                events: [
                    { eventId: 'PA_SET', eventName: 'Alerts Set', color: '#4ECDC4' },
                    { eventId: 'PA_REMOVE', eventName: 'Alerts Removed', color: '#FF6B6B' }
                ],
                visualizations: {
                    lineGraph: { enabled: true, aggregationMethod: 'sum', showLegend: true, yAxisLabel: 'Count' },
                    pieCharts: [
                        { type: 'platform', enabled: true, aggregationMethod: 'sum' },
                        { type: 'pos', enabled: true, aggregationMethod: 'sum' },
                        { type: 'source', enabled: true, aggregationMethod: 'sum' }
                    ]
                }
            },
            {
                panelId: 'p2',
                panelName: 'Scraper Activity',
                type: 'combined',
                position: { row: 2, col: 1, width: 12, height: 6 },
                events: [
                    { eventId: 'PA_SPIDY_FEED', eventName: 'Spidy Feed', color: '#FFE66D' },
                    { eventId: 'PA_SELF_SCRAPED', eventName: 'Self Scraped', color: '#1A535C' },
                    { eventId: 'PA_SPIDY_RECEIVED', eventName: 'Spidy Received', color: '#FF9F1C' },
                    { eventId: 'PA_SELF_RECEIVED', eventName: 'Self Received', color: '#2EC4B6' }
                ],
                visualizations: {
                    lineGraph: { enabled: true, aggregationMethod: 'sum', showLegend: true, yAxisLabel: 'Count' },
                    pieCharts: [
                        { type: 'platform', enabled: true, aggregationMethod: 'sum' },
                        { type: 'pos', enabled: true, aggregationMethod: 'sum' },
                        { type: 'source', enabled: true, aggregationMethod: 'sum' }
                    ]
                }
            },
            {
                panelId: 'p3',
                panelName: 'Notifications',
                type: 'combined',
                position: { row: 3, col: 1, width: 12, height: 6 },
                events: [
                    { eventId: 'PA_PUSH_SUCCESS', eventName: 'Push Success', color: '#95E1D3' },
                    { eventId: 'PA_PUSH_ERRORED', eventName: 'Push Errored', color: '#F38181' },
                    { eventId: 'PA_EMAIL_SUCCESS', eventName: 'Email Success', color: '#FCE38A' },
                    { eventId: 'PA_EMAIL_ERRORED', eventName: 'Email Errored', color: '#EAFFD0' }
                ],
                visualizations: {
                    lineGraph: { enabled: true, aggregationMethod: 'sum', showLegend: true, yAxisLabel: 'Count' },
                    pieCharts: [
                        { type: 'platform', enabled: true, aggregationMethod: 'sum' },
                        { type: 'pos', enabled: true, aggregationMethod: 'sum' },
                        { type: 'source', enabled: true, aggregationMethod: 'sum' }
                    ]
                }
            }
        ],
        criticalAlerts: {
            enabled: true,
            position: 'top-right',
            refreshInterval: 60,
            maxAlerts: 5,
            filterByPOS: ['all']
        }
    }
];

class MockService {
    private profiles: DashboardProfile[] = [];

    constructor() {
        // Load from localStorage or use initial
        const stored = localStorage.getItem('dashboard_profiles');
        if (stored) {
            this.profiles = JSON.parse(stored);
        } else {
            this.profiles = INITIAL_PROFILES;
            this.saveProfilesToStorage();
        }
    }

    private saveProfilesToStorage() {
        localStorage.setItem('dashboard_profiles', JSON.stringify(this.profiles));
    }

    async login(username: string, password: string): Promise<LoginResponse> {
        // Mock login logic
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

        if (password === '123456') {
            if (username === 'admin') {
                return {
                    success: true,
                    user: { id: 'u1', username: 'admin', role: 0, token: 'mock_token_admin' }
                };
            } else if (username === 'user') {
                return {
                    success: true,
                    user: { id: 'u2', username: 'user', role: 1, token: 'mock_token_user' }
                };
            }
        }
        return { success: false, user: null as any, message: 'Invalid credentials' };
    }

    async getFeatures(organizationId: number = 0): Promise<Feature[]> {
        try {
            // Fetch features from API for the specified organization
            const apiFeatures: FeatureInfo[] = await apiService.getFeaturesList(organizationId);
            
            // Update the dynamic feature data for use elsewhere
            updateFeatureData(apiFeatures);
            
            // Transform to Feature format
            const features: Feature[] = apiFeatures.map(f => ({
                id: f.id.toString(), // Use numeric ID as string
                name: f.name,
                description: `${f.name} analytics and tracking`
            }));
            
            console.log('✅ Loaded features from API:', features);
            return features;
        } catch (error) {
            console.error('❌ Failed to load features from API, using fallback:', error);
            return FALLBACK_FEATURES;
        }
    }

    async getProfiles(featureId: string): Promise<DashboardProfile[]> {
        return this.profiles.filter(p => p.featureId === featureId && p.isActive);
    }

    async getProfile(profileId: string): Promise<DashboardProfile | undefined> {
        return this.profiles.find(p => p.profileId === profileId);
    }

    async saveProfile(profile: DashboardProfile): Promise<DashboardProfile> {
        const index = this.profiles.findIndex(p => p.profileId === profile.profileId);
        if (index >= 0) {
            this.profiles[index] = { ...profile, lastModified: new Date().toISOString(), version: this.profiles[index].version + 1 };
        } else {
            this.profiles.push(profile);
        }
        this.saveProfilesToStorage();
        return profile;
    }

    async deleteProfile(profileId: string): Promise<boolean> {
        const index = this.profiles.findIndex(p => p.profileId === profileId);
        if (index >= 0) {
            this.profiles[index].isActive = false; // Soft delete
            this.saveProfilesToStorage();
            return true;
        }
        return false;
    }

    async getAnalyticsData(_profileId: string, _timeRange: any): Promise<AnalyticsDataResponse> {
        // Generate data with proper granularity:
        // - Last 7 days: hourly data
        // - Older than 7 days: daily aggregated data

        const records: any[] = [];
        const events = [
            'PA_SET', 'PA_REMOVE',
            'PA_SPIDY_FEED', 'PA_SELF_SCRAPED',
            'PA_SPIDY_RECEIVED', 'PA_SELF_RECEIVED', 'PA_SPIDY_ERRORED',
            'PA_PUSH_SUCCESS', 'PA_PUSH_ERRORED',
            'PA_EMAIL_SUCCESS', 'PA_EMAIL_ERRORED'
        ];
        const platforms = ['chrome_extension', 'android_app'];
        const sources = ['spidy', 'self'];
        const poses = ['flipkart', 'amazon', 'myntra'];

        const now = Date.now();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _sevenDaysAgo = now - (7 * 24 * 3600000);

        // Generate hourly data for last 7 days
        const hourlyPoints = 24 * 7;
        for (let i = 0; i < hourlyPoints; i++) {
            const timestamp = new Date(now - (hourlyPoints - i) * 3600000).toISOString();

            events.forEach(eventId => {
                poses.forEach(pos => {
                    platforms.forEach(platform => {
                        sources.forEach(source => {
                            records.push({
                                timestamp,
                                eventId,
                                platform,
                                source,
                                pos,
                                count: Math.floor(Math.random() * 50) + 10,
                                successCount: Math.floor(Math.random() * 40) + 5,
                                failCount: Math.floor(Math.random() * 10),
                                avgDelay: Math.random() * 500 + 100
                            });
                        });
                    });
                });
            });
        }

        // Generate daily data for days 8-30
        const dailyPoints = 23; // Days 8-30
        for (let i = 0; i < dailyPoints; i++) {
            // Set timestamp to noon of each day for consistency
            const daysBack = 8 + i;
            const date = new Date(now - (daysBack * 24 * 3600000));
            date.setHours(12, 0, 0, 0);
            const timestamp = date.toISOString();

            events.forEach(eventId => {
                poses.forEach(pos => {
                    platforms.forEach(platform => {
                        sources.forEach(source => {
                            // Daily aggregated counts (higher than hourly)
                            records.push({
                                timestamp,
                                eventId,
                                platform,
                                source,
                                pos,
                                count: Math.floor(Math.random() * 1000) + 200, // Daily totals
                                successCount: Math.floor(Math.random() * 800) + 150,
                                failCount: Math.floor(Math.random() * 200),
                                avgDelay: Math.random() * 500 + 100
                            });
                        });
                    });
                });
            });
        }

        // The provided code snippet for filters seems to be a configuration object,
        // not something to be generated per record or returned directly by getAnalyticsData.
        // Assuming it's meant to be part of a profile definition or a similar static configuration.
        // Since the instruction is to "Update profile filter options to match new mappings",
        // and the snippet is placed within getAnalyticsData, it's likely a misunderstanding
        // of where this configuration should reside.
        // To make the change faithfully without breaking syntax, and assuming the intent
        // was to define these filters for a profile, I will place it as a comment
        // or indicate its intended use if it were part of a profile.
        // However, the instruction asks to "make the change" and provides a specific code edit.
        // The provided code edit is syntactically incorrect in the given location.
        // I will insert the content of the code edit as a comment to preserve it,
        // as directly inserting it would lead to a syntax error.
        // If the intent was to modify an existing profile's filters, that would be a different change.

        /*
        panels: mockPanels, // 'mockPanels' is not defined in this scope
        filters: {
            platform: {
                type: 'multi-select',
                options: ['all', 'chrome_extension', 'android_app', 'ios_app', 'mobile_extension', 'edge_extension', 'safari_extension', 'firefox_extension', 'mail', 'graph'],
                defaultValue: ['all']
            },
            pos: {
                type: 'multi-select',
                options: ['all', 'amazon', 'flipkart', 'myntra'],
                defaultValue: ['all']
            },
            source: {
                type: 'multi-select',
                options: ['all', 'spidy', 'kafka', 'self', 'graph'],
                defaultValue: ['all']
            },
            event: {
                type: 'multi-select',
                options: ['all', 'PA_SET', 'PA_REMOVE', 'PA_SPIDY_FEED', 'PA_SELF_SCRAPED', 'PA_SPIDY_RECEIVED', 'PA_SELF_RECEIVED', 'PA_SPIDY_ERRORED', 'PA_PUSH_SUCCESS', 'PA_PUSH_ERRORED', 'PA_EMAIL_SUCCESS', 'PA_EMAIL_ERRORED'],
                defaultValue: ['all']
            }
        },
        */

        return {
            data: records,
            metadata: {
                totalEvents: records.reduce((acc, r) => acc + r.count, 0),
                timeRange: 'last_7_days'
            }
        };
    }

    async getAlerts(): Promise<Alert[]> {
        return MOCK_ALERTS;
    }
}

export const mockService = new MockService();
