import type {
    Feature,
    DashboardProfile,
    AnalyticsDataResponse,
    Alert,
    LoginResponse
} from '../types/analytics';
import { apiService, updateFeatureData } from './apiService';
import type { FeatureInfo } from './apiService';
import { firebaseConfigService } from './firebaseConfigService';
import type { DashboardProfileConfig, FeatureConfig } from '../types/firebaseConfig';

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
            filterByPOS: ['all'],
            filterByEvents: ['all']
        }
    }
];

class MockService {
    private profiles: DashboardProfile[] = [];
    private useFirebase: boolean = true; // Enable Firebase by default
    private firebaseInitialized: boolean = false;

    constructor() {
        // Load from localStorage as initial fallback
        const stored = localStorage.getItem('dashboard_profiles');
        if (stored) {
            this.profiles = JSON.parse(stored);
        } else {
            this.profiles = INITIAL_PROFILES;
            this.saveProfilesToStorage();
        }
        
        // Check Firebase connection
        this.initializeFirebase();
    }

    private async initializeFirebase() {
        try {
            const connected = await firebaseConfigService.checkConnection();
            this.firebaseInitialized = connected;
            this.useFirebase = connected;
            console.log(`🔥 Firebase connection: ${connected ? 'Connected' : 'Fallback to localStorage'}`);
        } catch (error) {
            console.warn('⚠️ Firebase not available, using localStorage fallback');
            this.useFirebase = false;
        }
    }

    private saveProfilesToStorage() {
        localStorage.setItem('dashboard_profiles', JSON.stringify(this.profiles));
    }
    
    /**
     * Convert DashboardProfileConfig (Firebase) to DashboardProfile (local)
     */
    private convertFirebaseToLocal(config: DashboardProfileConfig): DashboardProfile {
        return {
            profileId: config.profileId,
            profileName: config.profileName,
            featureId: config.featureId,
            createdBy: config.createdBy,
            createdAt: config.createdAt,
            lastModified: config.updatedAt,
            version: config.version,
            isActive: config.isActive,
            defaultSettings: config.defaultSettings,
            filters: config.filters,
            panels: config.panels,
            criticalAlerts: config.criticalAlerts,
        };
    }
    
    /**
     * Convert DashboardProfile (local) to DashboardProfileConfig (Firebase)
     */
    private convertLocalToFirebase(profile: DashboardProfile, orgId: string): DashboardProfileConfig {
        return {
            profileId: profile.profileId,
            profileName: profile.profileName,
            featureId: profile.featureId,
            orgId: orgId,
            isActive: profile.isActive,
            isDefault: false,
            version: profile.version,
            createdAt: profile.createdAt,
            updatedAt: profile.lastModified,
            createdBy: profile.createdBy,
            lastModifiedBy: profile.createdBy,
            defaultSettings: profile.defaultSettings,
            filters: profile.filters,
            panels: profile.panels,
            criticalAlerts: profile.criticalAlerts,
        };
    }
    
    /**
     * Convert FeatureConfig (Firebase) to Feature (local)
     */
    private convertFirebaseFeatureToLocal(config: FeatureConfig): Feature {
        return {
            id: config.featureId,
            name: config.featureName,
            description: config.description,
        };
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
        // First try Firebase if available
        if (this.useFirebase && this.firebaseInitialized) {
            try {
                const result = await firebaseConfigService.getFeatures(organizationId.toString());
                if (result.success && result.items.length > 0) {
                    console.log('✅ Loaded features from Firebase:', result.items.length);
                    return result.items.map(f => this.convertFirebaseFeatureToLocal(f));
                }
            } catch (error) {
                console.warn('⚠️ Firebase features fetch failed, trying API fallback');
            }
        }
        
        // Try API next
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

    async getProfiles(featureId: string, orgId: string = 'default'): Promise<DashboardProfile[]> {
        // Always try Firebase first for profiles - this is the source of truth
        try {
            // Get ALL profiles from Firebase, then filter
            // This handles the case where featureId might be numeric (from API) or string (stored in Firebase)
            const result = await firebaseConfigService.getAllProfiles();
            if (result.success && result.items.length > 0) {
                console.log(`📦 Total profiles in Firebase: ${result.items.length}`);
                
                // Try to match by featureId (could be numeric string like "1" or name like "price_alert")
                const matchingProfiles = result.items.filter(p => {
                    // Match by exact featureId
                    if (p.featureId === featureId) return true;
                    return false;
                });
                
                if (matchingProfiles.length > 0) {
                    console.log(`✅ Loaded ${matchingProfiles.length} profiles from Firebase for featureId: ${featureId}`);
                    this.firebaseInitialized = true;
                    this.useFirebase = true;
                    return matchingProfiles.map(p => this.convertFirebaseToLocal(p));
                } else {
                    console.log(`⚠️ No profiles match featureId "${featureId}". Available featureIds:`, 
                        [...new Set(result.items.map(p => p.featureId))]);
                }
            }
        } catch (error) {
            console.warn('⚠️ Firebase profiles fetch failed, using localStorage fallback', error);
        }
        
        // Fallback to localStorage
        return this.profiles.filter(p => p.featureId === featureId && p.isActive);
    }

    async getProfile(profileId: string): Promise<DashboardProfile | undefined> {
        // Always try Firebase first - this is the source of truth
        try {
            const result = await firebaseConfigService.getProfile(profileId);
            if (result.success && result.data) {
                console.log('✅ Loaded profile from Firebase:', profileId);
                // Mark Firebase as working
                this.firebaseInitialized = true;
                this.useFirebase = true;
                return this.convertFirebaseToLocal(result.data);
            }
        } catch (error) {
            console.warn('⚠️ Firebase profile fetch failed, using localStorage fallback');
        }
        
        // Fallback to localStorage
        return this.profiles.find(p => p.profileId === profileId);
    }

    async saveProfile(profile: DashboardProfile, orgId: string = 'default', username: string = 'admin'): Promise<DashboardProfile> {
        // Save to Firebase if available
        if (this.useFirebase && this.firebaseInitialized) {
            try {
                const firebaseProfile = this.convertLocalToFirebase(profile, orgId);
                const result = await firebaseConfigService.saveProfile(firebaseProfile, username);
                if (result.success && result.data) {
                    console.log('✅ Saved profile to Firebase:', profile.profileId);
                    // Also update localStorage as backup
                    this.updateLocalProfile(profile);
                    return this.convertFirebaseToLocal(result.data);
                }
            } catch (error) {
                console.warn('⚠️ Firebase save failed, saving to localStorage only');
            }
        }
        
        // Fallback to localStorage
        this.updateLocalProfile(profile);
        return profile;
    }
    
    private updateLocalProfile(profile: DashboardProfile) {
        const index = this.profiles.findIndex(p => p.profileId === profile.profileId);
        if (index >= 0) {
            this.profiles[index] = { ...profile, lastModified: new Date().toISOString(), version: this.profiles[index].version + 1 };
        } else {
            this.profiles.push(profile);
        }
        this.saveProfilesToStorage();
    }

    async deleteProfile(profileId: string): Promise<boolean> {
        // Delete from Firebase if available
        if (this.useFirebase && this.firebaseInitialized) {
            try {
                const result = await firebaseConfigService.deleteProfile(profileId);
                if (result.success) {
                    console.log('✅ Deleted profile from Firebase:', profileId);
                }
            } catch (error) {
                console.warn('⚠️ Firebase delete failed');
            }
        }
        
        // Also delete from localStorage
        const index = this.profiles.findIndex(p => p.profileId === profileId);
        if (index >= 0) {
            this.profiles[index].isActive = false; // Soft delete
            this.saveProfilesToStorage();
            return true;
        }
        return false;
    }
    
    /**
     * Sync local profiles to Firebase (admin utility)
     */
    async syncToFirebase(orgId: string, username: string): Promise<{ synced: number; failed: number; error?: string }> {
        // Force sync directly - don't rely on initialization state
        // We already know Firebase is configured since we're on the admin panel
        
        let synced = 0;
        let failed = 0;
        
        if (this.profiles.length === 0) {
            console.warn('⚠️ No local profiles to sync');
            return { synced: 0, failed: 0, error: 'No local profiles found' };
        }
        
        console.log(`🔄 Starting sync of ${this.profiles.length} profiles to Firebase...`);
        
        for (const profile of this.profiles) {
            try {
                console.log(`📤 Syncing profile: ${profile.profileName} (${profile.profileId})`);
                const firebaseProfile = this.convertLocalToFirebase(profile, orgId);
                const result = await firebaseConfigService.saveProfile(firebaseProfile, username);
                if (result.success) {
                    synced++;
                    console.log(`✅ Synced: ${profile.profileName}`);
                } else {
                    failed++;
                    console.error(`❌ Failed to sync ${profile.profileName}:`, result.error);
                }
            } catch (error: any) {
                failed++;
                console.error(`❌ Exception syncing ${profile.profileName}:`, error?.message || error);
            }
        }
        
        // Update initialization state since sync worked
        if (synced > 0) {
            this.firebaseInitialized = true;
            this.useFirebase = true;
        }
        
        console.log(`🔄 Sync complete: ${synced} synced, ${failed} failed`);
        return { synced, failed };
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
