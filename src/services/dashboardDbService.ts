/**
 * Dashboard Database Service
 * Handles all CRUD operations for dashboard profiles and panels
 * using the custom MySQL database APIs.
 * 
 * This service works alongside Firebase, with DB as primary storage
 * and Firebase as fallback for reads.
 */

import type { PanelConfig } from '@/types/analytics';

// API Base URL for dashboard endpoints
const DASHBOARD_API_BASE_URL = 'https://ext1.buyhatke.com/feature-tracking/dashboardConfig';

// ============ Database Types ============

export interface DbProfile {
    id: number;
    name: string;
    featureId: number;
    status: number;
    createdTime: string;
    updateTime: string;
}

export interface DbPanel {
    id: number;
    profileId: number;
    json: PanelConfig;
    status: number;
    createdTime: string;
    updateTime: string;
}

export interface DbApiResponse<T = unknown> {
    status: number;
    message: string;
    data?: T;
    err?: string;
}

// ============ Dashboard Database Service ============

class DashboardDbService {
    // Mutex to prevent concurrent auto-sync calls
    private autoSyncLocks: Map<number, Promise<boolean>> = new Map();

    // ==================== PROFILES ====================

    /**
     * Get all profiles for a feature
     * @param featureId - Feature ID (numeric)
     * @returns Array of profiles or empty array on error
     */
    async getProfiles(featureId: number): Promise<DbProfile[]> {
        try {
            const response = await fetch(
                `${DASHBOARD_API_BASE_URL}/profile?featureId=${featureId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                console.error(`❌ DB getProfiles failed: ${response.status} ${response.statusText}`);
                return [];
            }

            const result: DbApiResponse<{ profileList: Record<string, DbProfile> }> = await response.json();

            if (result.status !== 1 || !result.data?.profileList) {
                console.warn('⚠️ DB getProfiles returned no data:', result.message || result.err);
                return [];
            }

            // Convert object to array
            const profiles = Object.values(result.data.profileList);
            console.log(`✅ DB: Loaded ${profiles.length} profiles for feature ${featureId}`);
            return profiles;
        } catch (error) {
            console.error('❌ DB getProfiles error:', error);
            return [];
        }
    }

    /**
     * Create or update a profile
     * @param profileId - Profile ID (0 or undefined for new profile)
     * @param profileName - Profile name
     * @param featureId - Feature ID
     * @returns Created/updated profile ID or null on error
     */
    async saveProfile(
        profileId: number | undefined,
        profileName: string,
        featureId: number
    ): Promise<number | null> {
        try {
            const body = {
                profileId: profileId || 0,
                profileName,
                featureId,
            };

            const response = await fetch(`${DASHBOARD_API_BASE_URL}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`❌ DB saveProfile failed: ${response.status} ${response.statusText}`);
                return null;
            }

            const result: DbApiResponse<{ profileId: number }> = await response.json();

            if (result.status !== 1 || !result.data?.profileId) {
                console.error('❌ DB saveProfile error:', result.message || result.err);
                return null;
            }

            console.log(`✅ DB: Profile saved with ID ${result.data.profileId}`);
            return result.data.profileId;
        } catch (error) {
            console.error('❌ DB saveProfile error:', error);
            return null;
        }
    }

    /**
     * Soft delete a profile (sets status = -1)
     * @param profileId - Profile ID to delete
     * @param featureId - Feature ID for verification
     * @returns true on success, false on error
     */
    async deleteProfile(profileId: number, featureId: number): Promise<boolean> {
        try {
            const body = {
                profileId,
                featureId,
            };

            const response = await fetch(`${DASHBOARD_API_BASE_URL}/deleteProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`❌ DB deleteProfile failed: ${response.status} ${response.statusText}`);
                return false;
            }

            const result: DbApiResponse<{ profileId: number }> = await response.json();

            if (result.status !== 1) {
                console.error('❌ DB deleteProfile error:', result.message || result.err);
                return false;
            }

            console.log(`✅ DB: Profile ${profileId} deleted`);
            return true;
        } catch (error) {
            console.error('❌ DB deleteProfile error:', error);
            return false;
        }
    }

    // ==================== PANELS ====================

    /**
     * Get all panels for a profile
     * @param profileId - Profile ID (numeric)
     * @returns Array of panels or empty array on error
     */
    async getPanels(profileId: number): Promise<DbPanel[]> {
        try {
            const response = await fetch(
                `${DASHBOARD_API_BASE_URL}/pannel?profileId=${profileId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                console.error(`❌ DB getPanels failed: ${response.status} ${response.statusText}`);
                return [];
            }

            const result: DbApiResponse<{ pannelList: Record<string, DbPanel> }> = await response.json();

            if (result.status !== 1 || !result.data?.pannelList) {
                console.warn('⚠️ DB getPanels returned no data:', result.message || result.err);
                return [];
            }

            // Convert object to array and parse JSON if needed
            const panels = Object.values(result.data.pannelList).map(panel => ({
                ...panel,
                json: typeof panel.json === 'string' ? JSON.parse(panel.json) : panel.json,
            }));

            console.log(`✅ DB: Loaded ${panels.length} panels for profile ${profileId}`);
            return panels;
        } catch (error) {
            console.error('❌ DB getPanels error:', error);
            return [];
        }
    }

    /**
     * Normalize event feature IDs in a panel config
     * This ensures events from migrated features use the correct current feature ID
     * @param panel - Panel configuration to normalize
     * @param featureId - Target feature ID to set on all events
     * @returns Normalized panel configuration
     */
    private normalizeEventFeatureIds(panel: PanelConfig, featureId: number): PanelConfig {
        // Deep clone to avoid mutating original
        const normalizedPanel = JSON.parse(JSON.stringify(panel)) as PanelConfig;

        // Normalize events array
        if (normalizedPanel.events && Array.isArray(normalizedPanel.events)) {
            normalizedPanel.events = normalizedPanel.events.map(event => ({
                ...event,
                feature: featureId, // Override with correct feature ID
            }));
        }

        // Also normalize filterConfig.events if present (these are numeric IDs, not objects)
        // The feature mapping is handled at the event object level

        console.log(`🔄 Normalized ${normalizedPanel.events?.length || 0} events to feature ID ${featureId}`);
        return normalizedPanel;
    }

    /**
     * Create or update a panel
     * @param pannelId - Panel ID (0 or undefined for new panel)
     * @param profileId - Profile ID this panel belongs to
     * @param json - Panel configuration object
     * @param featureId - Optional feature ID to normalize events to
     * @returns Created/updated panel ID or null on error
     */
    async savePanel(
        pannelId: number | undefined,
        profileId: number,
        json: PanelConfig,
        featureId?: number
    ): Promise<number | null> {
        try {
            // Normalize event feature IDs if featureId is provided
            const normalizedJson = featureId 
                ? this.normalizeEventFeatureIds(json, featureId)
                : json;

            const body = {
                pannelId: pannelId || 0,
                profileId,
                json: normalizedJson,
            };

            const response = await fetch(`${DASHBOARD_API_BASE_URL}/pannel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`❌ DB savePanel failed: ${response.status} ${response.statusText}`);
                return null;
            }

            const result: DbApiResponse<{ pannelId: number }> = await response.json();

            if (result.status !== 1 || !result.data?.pannelId) {
                console.error('❌ DB savePanel error:', result.message || result.err);
                return null;
            }

            console.log(`✅ DB: Panel saved with ID ${result.data.pannelId}`);
            return result.data.pannelId;
        } catch (error) {
            console.error('❌ DB savePanel error:', error);
            return null;
        }
    }

    /**
     * Soft delete a panel (sets status = -1)
     * @param pannelId - Panel ID to delete
     * @param profileId - Profile ID for verification
     * @returns true on success, false on error
     */
    async deletePanel(pannelId: number, profileId: number): Promise<boolean> {
        try {
            const body = {
                pannelId,
                profileId,
            };

            const response = await fetch(`${DASHBOARD_API_BASE_URL}/deletePannel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`❌ DB deletePanel failed: ${response.status} ${response.statusText}`);
                return false;
            }

            const result: DbApiResponse<{ pannelId: number }> = await response.json();

            if (result.status !== 1) {
                console.error('❌ DB deletePanel error:', result.message || result.err);
                return false;
            }

            console.log(`✅ DB: Panel ${pannelId} deleted`);
            return true;
        } catch (error) {
            console.error('❌ DB deletePanel error:', error);
            return false;
        }
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Save all panels for a profile (for bulk sync)
     * Saves each panel and returns mapping of panelId -> dbId
     * @param profileId - Database profile ID
     * @param panels - Array of panel configurations
     * @param featureId - Optional feature ID to normalize events to (for migrated features)
     * @returns Mapping of panel IDs to database IDs
     */
    async savePanelsBulk(
        profileId: number,
        panels: PanelConfig[],
        featureId?: number
    ): Promise<Record<string, number>> {
        const mapping: Record<string, number> = {};

        if (featureId) {
            console.log(`🔄 Bulk saving ${panels.length} panels with feature ID normalization to ${featureId}`);
        }

        for (const panel of panels) {
            // Check if panel already has a dbId stored (for updates)
            const existingDbId = (panel as any)._dbPanelId;

            // Pass featureId to normalize events in each panel
            const dbId = await this.savePanel(existingDbId, profileId, panel, featureId);
            if (dbId) {
                mapping[panel.panelId] = dbId;
            }
        }

        console.log(`✅ DB: Bulk saved ${Object.keys(mapping).length}/${panels.length} panels`);
        return mapping;
    }

    /**
     * Check if the database service is available
     * @returns true if service is reachable
     */
    async checkConnection(): Promise<boolean> {
        try {
            // Try to fetch profiles for a non-existent feature just to check connectivity
            const response = await fetch(
                `${DASHBOARD_API_BASE_URL}/profile?featureId=0`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            return response.ok;
        } catch (error) {
            console.error('❌ DB connection check failed:', error);
            return false;
        }
    }

    /**
     * Auto-sync API events: Creates/updates API profile with panels for all API events
     * This runs automatically when profiles are loaded
     * @param featureId - Feature ID
     * @param apiEvents - Array of API events from eventMapApi
     * @returns true if sync successful
     */
    async autoSyncApiPanels(featureId: number, apiEvents: any[]): Promise<boolean> {
        if (!apiEvents || apiEvents.length === 0) {
            return true; // No API events, nothing to sync
        }

        // Check if sync is already in progress for this feature
        const existingLock = this.autoSyncLocks.get(featureId);
        if (existingLock) {
            console.log(`⏳ Auto-sync already in progress for feature ${featureId}, waiting...`);
            return await existingLock;
        }

        // Create new lock promise
        const syncPromise = this._performAutoSync(featureId, apiEvents);
        this.autoSyncLocks.set(featureId, syncPromise);

        try {
            const result = await syncPromise;
            return result;
        } finally {
            // Remove lock after completion
            this.autoSyncLocks.delete(featureId);
        }
    }

    /**
     * Internal method that performs the actual auto-sync logic
     * @private
     */
    private async _performAutoSync(featureId: number, apiEvents: any[]): Promise<boolean> {
        try {
            console.log(`🔄 Auto-syncing ${apiEvents.length} API events for feature ${featureId}...`);

            // 1. Get existing profiles for this feature from database
            const profiles = await this.getProfiles(featureId);
            
            // Check for existing "APIs" profile (case-insensitive)
            const apiProfile = profiles.find(p => p.name?.toLowerCase() === 'apis');

            let profileId: number;

            // 2. Create "APIs" profile ONLY if it doesn't exist
            if (!apiProfile) {
                console.log('📝 No existing "APIs" profile found, creating new one...');
                const newProfileId = await this.saveProfile(undefined, 'APIs', featureId);
                if (!newProfileId) {
                    console.error('❌ Failed to create APIs profile');
                    return false;
                }
                profileId = newProfileId;
                console.log(`✅ Created new "APIs" profile with ID ${profileId}`);
            } else {
                profileId = apiProfile.id;
                console.log(`✅ Found existing "APIs" profile with ID ${profileId}, updating panels...`);
            }

            // 3. Get existing panels for this profile
            const existingPanels = await this.getPanels(profileId);
            const existingPanelEventIds = new Set(
                existingPanels.map(p => p.json?.filterConfig?.events?.[0]).filter(Boolean)
            );

            // 4. Create panels for new API events
            let newPanelsCreated = 0;
            for (const apiEvent of apiEvents) {
                const apiEventId = parseInt(apiEvent.eventId.replace('api_', ''));
                
                // Skip if panel already exists for this event
                if (existingPanelEventIds.has(apiEventId)) {
                    continue;
                }

                // Create panel config matching the pattern
                const panelConfig: any = {
                    type: 'special',
                    panelId: `api_${apiEventId}`,
                    panelName: apiEvent.eventName,
                    position: {
                        row: existingPanels.length * 4 + newPanelsCreated * 4,
                        col: 1,
                        width: 12,
                        height: 6
                    },
                    events: [{
                        eventId: apiEvent.eventId,
                        eventName: apiEvent.eventName,
                        color: apiEvent.color,
                        isApiEvent: true,
                        host: apiEvent.host,
                        url: apiEvent.url,
                        callUrl: apiEvent.callUrl,
                        feature: apiEvent.feature,
                        org: 0,
                        isErrorEvent: 0,
                        isAvgEvent: 0
                    }],
                    filterConfig: {
                        events: [apiEventId],
                        platforms: [],
                        pos: [],
                        sources: [],
                        sourceStr: [],
                        graphType: 'percentage',
                        isApiEvent: true,
                        showHourlyStats: true,
                        dailyDeviationCurve: true,
                        dateRange: {
                            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            to: new Date().toISOString()
                        },
                        percentageConfig: {
                            parentEvents: [String(apiEventId)],
                            childEvents: [String(apiEventId)],
                            showCombinedPercentage: true,
                            filters: {
                                statusCodes: ['200'],
                                cacheStatus: []
                            }
                        }
                    },
                    visualizations: {
                        lineGraph: {
                            enabled: false,
                            aggregationMethod: 'sum',
                            showLegend: false,
                            yAxisLabel: ''
                        },
                        pieCharts: []
                    },
                    alertsConfig: {
                        enabled: true,
                        isApi: 1,
                        isHourly: true,
                        position: 'top',
                        maxAlerts: 5,
                        filterByPOS: [],
                        filterByEvents: [String(apiEventId)],
                        refreshInterval: 30
                    }
                };

                // Save panel to database
                const panelId = await this.savePanel(undefined, profileId, panelConfig);
                if (panelId) {
                    newPanelsCreated++;
                    console.log(`✅ Created panel for ${apiEvent.eventName}`);
                } else {
                    console.error(`❌ Failed to create panel for ${apiEvent.eventName}`);
                }
            }

            if (newPanelsCreated > 0) {
                console.log(`✅ Auto-sync complete: Created ${newPanelsCreated} new API panels`);
            } else {
                console.log(`✅ Auto-sync complete: All API events already have panels`);
            }

            return true;
        } catch (error) {
            console.error('❌ Auto-sync API panels failed:', error);
            return false;
        }
    }
}

// Export singleton instance
export const dashboardDbService = new DashboardDbService();

// Export class for testing
export { DashboardDbService };
