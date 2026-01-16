/**
 * Firebase Configuration Service
 * Handles all CRUD operations for dashboard configurations in Firestore.
 * This service provides centralized configuration management that syncs
 * across all builds and deployments in real-time.
 * 
 * Now with dual-write support: writes go to custom DB first, then Firebase.
 * Reads use DB as primary with Firebase as fallback.
 * 
 * FIREBASE DISABLED: This service now only uses the custom database.
 */

import { dashboardDbService } from './dashboardDbService';
import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  reconnectFirestore,
  firebaseConfig,
  ENABLE_FIREBASE
} from '../../firebase';

import type {
  GlobalAppConfig,
  OrganizationConfig,
  FeatureConfig,
  DashboardProfileConfig,
  EventDefinitionConfig,
  PanelTemplateConfig,
  UserPreferencesConfig,
  ConfigOperationResult,
  ConfigListResult,
} from '../types/firebaseConfig';

import {
  FIREBASE_COLLECTIONS,
  DEFAULT_GLOBAL_CONFIG,
} from '../types/firebaseConfig';

type UnsubscribeFunction = () => void;

// Simple cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 60000; // 60 seconds - cache for faster repeated loads
const CACHE_TTL_SHORT = 5000; // 5 seconds - for less frequently accessed data
const cache: {
  allProfiles?: CacheEntry<DashboardProfileConfig[]>;
  profilesByFeature: Map<string, CacheEntry<DashboardProfileConfig[]>>; // Per-feature profile cache
  features: Map<string, CacheEntry<FeatureConfig[]>>;
} = {
  profilesByFeature: new Map(),
  features: new Map()
};

class FirebaseConfigService {
  private listeners: Map<string, UnsubscribeFunction> = new Map();

  // Helper to check if Firebase is available
  private isFirebaseEnabled(): boolean {
    return ENABLE_FIREBASE && db !== null;
  }

  // ==================== GLOBAL CONFIG ====================

  /**
   * Get global application configuration
   */
  async getGlobalConfig(): Promise<ConfigOperationResult<GlobalAppConfig>> {
    // FIREBASE DISABLED GUARD
    if (!this.isFirebaseEnabled()) {
      return { success: true, data: DEFAULT_GLOBAL_CONFIG };
    }

    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.GLOBAL_CONFIG, 'global');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() as GlobalAppConfig };
      }

      // Initialize with defaults if not exists
      await this.initializeGlobalConfig();
      return { success: true, data: DEFAULT_GLOBAL_CONFIG };
    } catch (error) {
      console.error('Error fetching global config:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Initialize global config with defaults
   */
  async initializeGlobalConfig(): Promise<ConfigOperationResult<GlobalAppConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: true, data: DEFAULT_GLOBAL_CONFIG };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.GLOBAL_CONFIG, 'global');
      await setDoc(docRef, DEFAULT_GLOBAL_CONFIG);
      return { success: true, data: DEFAULT_GLOBAL_CONFIG };
    } catch (error) {
      console.error('Error initializing global config:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update global configuration (admin only)
   */
  async updateGlobalConfig(config: Partial<GlobalAppConfig>, updatedBy: string): Promise<ConfigOperationResult<GlobalAppConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.GLOBAL_CONFIG, 'global');
      const updateData = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      await updateDoc(docRef, updateData);

      const updated = await this.getGlobalConfig();
      return updated;
    } catch (error) {
      console.error('Error updating global config:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== ORGANIZATIONS ====================

  /**
   * Get all organizations
   */
  async getOrganizations(): Promise<ConfigListResult<OrganizationConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: true, items: [], total: 0 };
    }
    try {
      // Simple query - sort in memory to avoid index requirements
      const snapshot = await getDocs(collection(db, FIREBASE_COLLECTIONS.ORGANIZATIONS));
      const items = snapshot.docs
        .map((doc: any) => doc.data() as OrganizationConfig)
        .filter((org: OrganizationConfig) => org.isActive !== false)
        .sort((a: OrganizationConfig, b: OrganizationConfig) => (a.orgName || '').localeCompare(b.orgName || ''));
      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<ConfigOperationResult<OrganizationConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.ORGANIZATIONS, orgId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() as OrganizationConfig };
      }
      return { success: false, error: 'Organization not found' };
    } catch (error) {
      console.error('Error fetching organization:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create or update organization
   */
  async saveOrganization(org: OrganizationConfig): Promise<ConfigOperationResult<OrganizationConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.ORGANIZATIONS, org.orgId);
      const data = {
        ...org,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, data, { merge: true });
      return { success: true, data };
    } catch (error) {
      console.error('Error saving organization:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== FEATURES ====================

  /**
   * Get all features for an organization (with caching)
   */
  async getFeatures(orgId: string, forceRefresh: boolean = false): Promise<ConfigListResult<FeatureConfig>> {
    // FIREBASE DISABLED GUARD
    if (!this.isFirebaseEnabled()) {
      return { success: true, items: [], total: 0 };
    }

    // Check cache first
    const cacheKey = orgId;
    const cached = cache.features.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // console.log(`🔄 Returning cached features for org ${orgId} (${cached.data.length} features)`);
      return { success: true, items: cached.data, total: cached.data.length };
    }

    try {
      // Simple query without orderBy to avoid index requirements
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.FEATURES),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(q);
      // Filter and sort in memory
      const items = snapshot.docs
        .map((doc: any) => doc.data() as FeatureConfig)
        .filter((f: FeatureConfig) => f.isActive !== false)
        .sort((a: FeatureConfig, b: FeatureConfig) => (a.order || 0) - (b.order || 0));

      // Update cache
      cache.features.set(cacheKey, { data: items, timestamp: Date.now() });

      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching features:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get feature by ID
   */
  async getFeature(featureId: string): Promise<ConfigOperationResult<FeatureConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.FEATURES, featureId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() as FeatureConfig };
      }
      return { success: false, error: 'Feature not found' };
    } catch (error) {
      console.error('Error fetching feature:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create or update feature
   */
  async saveFeature(feature: FeatureConfig): Promise<ConfigOperationResult<FeatureConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.FEATURES, feature.featureId);
      const data = {
        ...feature,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, data, { merge: true });
      return { success: true, data };
    } catch (error) {
      console.error('Error saving feature:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete feature (soft delete)
   */
  async deleteFeature(featureId: string): Promise<ConfigOperationResult<void>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.FEATURES, featureId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting feature:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== PROFILES ====================

  /**
   * Get all profiles for a feature
   * DB-FIRST: Tries custom DB first, falls back to Firebase
   * Uses per-feature caching for instant repeated loads
   */
  async getProfiles(featureId: string, orgId: string): Promise<ConfigListResult<DashboardProfileConfig>> {
    const featureIdNum = parseInt(featureId);
    const cacheKey = `${featureId}_${orgId}`;

    // ========== CHECK CACHE FIRST ==========
    const cachedEntry = cache.profilesByFeature.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_TTL) {
      console.log(`⚡ CACHE HIT: Loaded ${cachedEntry.data.length} profiles for feature ${featureId} instantly`);
      return { success: true, items: cachedEntry.data, total: cachedEntry.data.length };
    }

    // ========== TRY DB FIRST ==========
    if (!isNaN(featureIdNum)) {
      try {
        const dbProfiles = await dashboardDbService.getProfiles(featureIdNum);

        if (dbProfiles.length > 0) {
          console.log(`✅ DB: Loaded ${dbProfiles.length} profiles for feature ${featureId}`);

          // Convert DB profiles to DashboardProfileConfig format
          const items: DashboardProfileConfig[] = await Promise.all(
            dbProfiles.map(async (dbProfile) => {
              // Fetch panels for this profile from DB
              const dbPanels = await dashboardDbService.getPanels(dbProfile.id);
              const panels = dbPanels.map(p => ({
                ...p.json,
                _dbPanelId: p.id, // Store DB panel ID for future reference
              }));

              return {
                profileId: `db_${dbProfile.id}`, // Use db_ prefix to identify DB profiles
                profileName: dbProfile.name,
                featureId: String(dbProfile.featureId),
                orgId: orgId || 'default',
                isActive: dbProfile.status === 1,
                isDefault: false,
                version: 1,
                createdAt: dbProfile.createdTime,
                updatedAt: dbProfile.updateTime,
                createdBy: 'system',
                lastModifiedBy: 'system',
                _dbProfileId: dbProfile.id, // Store DB profile ID
                defaultSettings: {
                  timeRange: {
                    preset: 'last_7_days' as const,
                    granularity: 'hourly' as const,
                  },
                  autoRefresh: 0,
                },
                filters: {
                  platform: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                  pos: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                  source: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                  event: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                },
                panels: panels as any[],
                criticalAlerts: {
                  enabled: true,
                  position: 'top-right',
                  refreshInterval: 60,
                  maxAlerts: 5,
                  filterByPOS: ['all'],
                  filterByEvents: ['all'],
                },
              } as DashboardProfileConfig;
            })
          );

          // Cache the results for faster subsequent loads
          cache.profilesByFeature.set(cacheKey, { data: items, timestamp: Date.now() });

          return { success: true, items, total: items.length };
        }
      } catch (dbError) {
        console.warn('⚠️ DB read failed, falling back to Firebase:', dbError);
      }
    }
    // ========================================

    // ========== FALLBACK TO FIREBASE ==========
    // Skip Firebase fallback if disabled
    if (!this.isFirebaseEnabled()) {
      console.log(`⚠️ Firebase disabled, returning empty profiles for feature ${featureId}`);
      return { success: true, items: [], total: 0 };
    }

    try {
      console.log(`🔄 Falling back to Firebase for feature ${featureId}`);

      // Simple query - filter by featureId only to avoid index requirements
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.PROFILES),
        where('featureId', '==', featureId)
      );
      const snapshot = await getDocs(q);

      // Filter in memory for orgId and isActive
      const items = snapshot.docs
        .map((doc: any) => doc.data() as DashboardProfileConfig)
        .filter((p: DashboardProfileConfig) => (p.orgId === orgId || !p.orgId || p.orgId === 'default') && p.isActive !== false);

      console.log(`✅ Firebase: Loaded ${items.length} profiles for feature ${featureId}`);
      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching profiles from Firebase:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get ALL profiles from Firebase (for admin/debugging)
   * Uses caching to avoid repeated calls
   */
  async getAllProfiles(forceRefresh: boolean = false): Promise<ConfigListResult<DashboardProfileConfig>> {
    // FIREBASE DISABLED GUARD
    if (!this.isFirebaseEnabled()) {
      return { success: true, items: [], total: 0 };
    }

    // Check cache first
    if (!forceRefresh && cache.allProfiles && Date.now() - cache.allProfiles.timestamp < CACHE_TTL) {
      // console.log(`📦 Returning cached profiles (${cache.allProfiles.data.length} profiles)`);
      return { success: true, items: cache.allProfiles.data, total: cache.allProfiles.data.length };
    }

    try {
      const snapshot = await getDocs(collection(db, FIREBASE_COLLECTIONS.PROFILES));
      const items = snapshot.docs
        .map((doc: any) => doc.data() as DashboardProfileConfig)
        .filter((p: DashboardProfileConfig) => p.isActive !== false);

      // Update cache
      cache.allProfiles = { data: items, timestamp: Date.now() };

      // console.log(`📦 Fetched ${items.length} profiles from Firebase (cached)`);
      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get profile by ID
   * Handles both DB profiles (db_XXX) and Firebase profiles
   */
  async getProfile(profileId: string): Promise<ConfigOperationResult<DashboardProfileConfig>> {
    // ========== HANDLE DB PROFILES ==========
    if (profileId.startsWith('db_')) {
      try {
        const dbId = parseInt(profileId.replace('db_', ''));
        if (!isNaN(dbId)) {
          // First get panels to figure out the featureId
          const dbPanels = await dashboardDbService.getPanels(dbId);
          if (dbPanels.length > 0) {
            const firstPanel = dbPanels[0];
            const panels = dbPanels.map(p => ({
              ...p.json,
              _dbPanelId: p.id,
            }));

            // Get featureId from panel config, not profileId
            const panelJson = firstPanel.json as any;
            const featureId = panelJson?.featureId ||
              (panelJson?.events?.[0]?.feature) ||
              firstPanel.profileId; // Last fallback

            // Now fetch the profiles for this feature to get the profile name
            let profileName = `Profile ${dbId}`;
            try {
              const featureIdNum = parseInt(String(featureId));
              if (!isNaN(featureIdNum)) {
                const dbProfiles = await dashboardDbService.getProfiles(featureIdNum);
                const matchingProfile = dbProfiles.find(p => p.id === dbId);
                if (matchingProfile) {
                  profileName = matchingProfile.name;
                  console.log(`✅ DB: Found profile name "${profileName}" for ID ${dbId}`);
                }
              }
            } catch (e) {
              console.warn('⚠️ Could not fetch profile name from DB:', e);
            }

            // Extract featureId from panel's filterConfig or events
            const derivedFeatureId = panelJson?.filterConfig?.featureId ||
              String(panelJson?.events?.[0]?.feature) ||
              String(featureId);

            // Construct profile from DB data
            const profile: DashboardProfileConfig = {
              profileId,
              profileName,
              featureId: derivedFeatureId,
              orgId: 'default',
              isActive: true,
              isDefault: false,
              version: 1,
              createdAt: firstPanel.createdTime,
              updatedAt: firstPanel.updateTime,
              createdBy: 'system',
              lastModifiedBy: 'system',
              _dbProfileId: dbId,
              defaultSettings: {
                timeRange: { preset: 'last_7_days' as const, granularity: 'hourly' as const },
                autoRefresh: 0,
              },
              filters: {
                platform: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                pos: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                source: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
                event: { type: 'multi-select' as const, defaultValue: ['all'], options: ['all'] },
              },
              panels: panels as any[],
              criticalAlerts: {
                enabled: true,
                position: 'top-right',
                refreshInterval: 60,
                maxAlerts: 5,
                filterByPOS: ['all'],
                filterByEvents: ['all'],
              },
            } as DashboardProfileConfig;

            return { success: true, data: profile };
          }
        }
      } catch (error) {
        console.warn('⚠️ DB getProfile failed, trying Firebase:', error);
      }
    }
    // ========================================

    // ========== FIREBASE FALLBACK ==========
    // Skip Firebase fallback if disabled
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Profile not found (Firebase disabled)' };
    }

    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.PROFILES, profileId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() as DashboardProfileConfig };
      }
      return { success: false, error: 'Profile not found' };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create or update profile
   * DUAL-WRITE: Saves to custom DB first, then Firebase
   */
  async saveProfile(profile: DashboardProfileConfig, modifiedBy: string): Promise<ConfigOperationResult<DashboardProfileConfig>> {
    try {
      const data: DashboardProfileConfig = {
        ...profile,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: modifiedBy,
        version: (profile.version || 0) + 1,
        createdAt: profile.createdAt || new Date().toISOString(),
        createdBy: profile.createdBy || modifiedBy,
      };

      // ========== DUAL-WRITE: DB FIRST ==========
      const featureIdNum = parseInt(profile.featureId);
      if (!isNaN(featureIdNum)) {
        try {
          // Get existing DB profile ID if this is an update
          const existingDbId = (profile as any)._dbProfileId;

          const dbProfileId = await dashboardDbService.saveProfile(
            existingDbId,
            profile.profileName,
            featureIdNum
          );

          if (dbProfileId) {
            // Store DB ID in the data for future reference
            (data as any)._dbProfileId = dbProfileId;
            console.log(`✅ DB: Profile synced with ID ${dbProfileId}`);

            // Also save panels to DB if present
            if (profile.panels && profile.panels.length > 0) {
              const panelMapping = await dashboardDbService.savePanelsBulk(dbProfileId, profile.panels);
              // Store panel DB IDs mapping
              (data as any)._dbPanelIds = panelMapping;
            }
          } else {
            console.warn('⚠️ DB profile save returned null, continuing with Firebase only');
          }
        } catch (dbError) {
          // DB write failed - log but continue with Firebase
          console.warn('⚠️ DB write failed (non-critical), continuing with Firebase:', dbError);
        }
      }
      // ========================================

      // Skip Firebase write if disabled
      if (!this.isFirebaseEnabled()) {
        console.log('⚠️ Firebase disabled, saved to DB only:', profile.profileId);
        // Invalidate profiles cache
        cache.allProfiles = undefined;
        cache.profilesByFeature.clear();
        return { success: true, data };
      }

      const docRef = doc(db, FIREBASE_COLLECTIONS.PROFILES, profile.profileId);
      await setDoc(docRef, data);

      // Invalidate profiles cache
      cache.allProfiles = undefined;
      cache.profilesByFeature.clear(); // Clear per-feature cache too

      console.log('✅ Profile saved to Firebase:', profile.profileId);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Error saving profile to Firebase:', error?.message || error);
      console.error('Profile data:', JSON.stringify(profile, null, 2));
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Delete profile (soft delete)
   * DUAL-WRITE: Deletes from custom DB first, then Firebase
   */
  async deleteProfile(profileId: string, featureId?: string): Promise<ConfigOperationResult<void>> {
    try {
      // ========== DUAL-WRITE: DB FIRST ==========
      // Try to get profile first to get DB ID and featureId
      const profileResult = await this.getProfile(profileId);
      const profile = profileResult.data;
      const dbProfileId = (profile as any)?._dbProfileId;
      const featureIdNum = parseInt(featureId || profile?.featureId || '0');

      if (dbProfileId && !isNaN(featureIdNum)) {
        try {
          await dashboardDbService.deleteProfile(dbProfileId, featureIdNum);
          console.log(`✅ DB: Profile ${dbProfileId} deleted`);
        } catch (dbError) {
          console.warn('⚠️ DB delete failed (non-critical), continuing with Firebase:', dbError);
        }
      }
      // ========================================

      // Skip Firebase update if disabled
      if (!this.isFirebaseEnabled()) {
        console.log('⚠️ Firebase disabled, deleted from DB only:', profileId);
        // Invalidate profiles cache
        cache.allProfiles = undefined;
        cache.profilesByFeature.clear();
        return { success: true };
      }

      const docRef = doc(db, FIREBASE_COLLECTIONS.PROFILES, profileId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      // Invalidate profiles cache
      cache.allProfiles = undefined;
      cache.profilesByFeature.clear(); // Clear per-feature cache too

      return { success: true };
    } catch (error) {
      console.error('Error deleting profile:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Set profile as default for a feature
   */
  async setDefaultProfile(profileId: string, featureId: string, orgId: string): Promise<ConfigOperationResult<void>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      // First, unset all other defaults for this feature
      const profiles = await this.getProfiles(featureId, orgId);
      for (const profile of profiles.items) {
        if (profile.profileId !== profileId && profile.isDefault) {
          await updateDoc(doc(db, FIREBASE_COLLECTIONS.PROFILES, profile.profileId), {
            isDefault: false,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Set the new default
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.PROFILES, profileId), {
        isDefault: true,
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting default profile:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== EVENTS ====================

  /**
   * Get all events for a feature
   */
  async getEvents(featureId: string, orgId: string): Promise<ConfigListResult<EventDefinitionConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: true, items: [], total: 0 };
    }
    try {
      // Simple query - filter and sort in memory to avoid index requirements
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.EVENTS),
        where('featureId', '==', featureId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs
        .map((doc: any) => doc.data() as EventDefinitionConfig)
        .filter((e: EventDefinitionConfig) => (e.orgId === orgId || !e.orgId || e.orgId === 'default') && e.isActive !== false)
        .sort((a: EventDefinitionConfig, b: EventDefinitionConfig) => (a.order || 0) - (b.order || 0));
      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Save event definition
   */
  async saveEvent(event: EventDefinitionConfig): Promise<ConfigOperationResult<EventDefinitionConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.EVENTS, event.eventId);
      const data = {
        ...event,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, data, { merge: true });
      return { success: true, data };
    } catch (error) {
      console.error('Error saving event:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Bulk save events
   */
  async saveEvents(events: EventDefinitionConfig[]): Promise<ConfigOperationResult<void>> {
    try {
      for (const event of events) {
        await this.saveEvent(event);
      }
      return { success: true };
    } catch (error) {
      console.error('Error bulk saving events:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== PANEL TEMPLATES ====================

  /**
   * Get panel templates
   */
  async getPanelTemplates(featureId: string, orgId: string): Promise<ConfigListResult<PanelTemplateConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: true, items: [], total: 0 };
    }
    try {
      const q = query(
        collection(db, FIREBASE_COLLECTIONS.PANEL_TEMPLATES),
        where('orgId', '==', orgId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs
        .map((doc: any) => doc.data() as PanelTemplateConfig)
        .filter((t: PanelTemplateConfig) => t.isGlobal || t.featureId === featureId);
      return { success: true, items, total: items.length };
    } catch (error) {
      console.error('Error fetching panel templates:', error);
      return { success: false, items: [], total: 0, error: String(error) };
    }
  }

  /**
   * Save panel template
   */
  async savePanelTemplate(template: PanelTemplateConfig, createdBy: string): Promise<ConfigOperationResult<PanelTemplateConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.PANEL_TEMPLATES, template.templateId);
      const data = {
        ...template,
        updatedAt: new Date().toISOString(),
        createdBy,
      };
      await setDoc(docRef, data, { merge: true });
      return { success: true, data };
    } catch (error) {
      console.error('Error saving panel template:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== USER PREFERENCES ====================

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<ConfigOperationResult<UserPreferencesConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.USER_PREFERENCES, userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() as UserPreferencesConfig };
      }
      return { success: false, error: 'User preferences not found' };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(prefs: UserPreferencesConfig): Promise<ConfigOperationResult<UserPreferencesConfig>> {
    if (!this.isFirebaseEnabled()) {
      return { success: false, error: 'Firebase is disabled' };
    }
    try {
      const docRef = doc(db, FIREBASE_COLLECTIONS.USER_PREFERENCES, prefs.userId);
      const data = {
        ...prefs,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, data, { merge: true });
      return { success: true, data };
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return { success: false, error: String(error) };
    }
  }

  // ==================== REAL-TIME LISTENERS ====================

  /**
   * Subscribe to profile changes for real-time updates
   */
  subscribeToProfiles(
    featureId: string,
    orgId: string,
    callback: (profiles: DashboardProfileConfig[]) => void
  ): UnsubscribeFunction {
    // FIREBASE DISABLED: Return no-op unsubscribe
    if (!this.isFirebaseEnabled()) {
      return () => { };
    }

    const q = query(
      collection(db, FIREBASE_COLLECTIONS.PROFILES),
      where('featureId', '==', featureId),
      where('orgId', '==', orgId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const profiles = snapshot.docs.map((doc: any) => doc.data() as DashboardProfileConfig);
      callback(profiles);
    });

    const listenerId = `profiles_${featureId}_${orgId}`;
    this.listeners.set(listenerId, unsubscribe);

    return unsubscribe;
  }

  /**
   * Subscribe to global config changes
   */
  subscribeToGlobalConfig(callback: (config: GlobalAppConfig) => void): UnsubscribeFunction {
    if (!this.isFirebaseEnabled()) {
      return () => { };
    }

    const docRef = doc(db, FIREBASE_COLLECTIONS.GLOBAL_CONFIG, 'global');

    const unsubscribe = onSnapshot(docRef, (snapshot: any) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GlobalAppConfig);
      }
    });

    this.listeners.set('globalConfig', unsubscribe);

    return unsubscribe;
  }

  /**
   * Subscribe to feature changes
   */
  subscribeToFeatures(orgId: string, callback: (features: FeatureConfig[]) => void): UnsubscribeFunction {
    if (!this.isFirebaseEnabled()) {
      return () => { };
    }

    const q = query(
      collection(db, FIREBASE_COLLECTIONS.FEATURES),
      where('orgId', '==', orgId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const features = snapshot.docs.map((doc: any) => doc.data() as FeatureConfig);
      callback(features);
    });

    const listenerId = `features_${orgId}`;
    this.listeners.set(listenerId, unsubscribe);

    return unsubscribe;
  }

  /**
   * Unsubscribe from all listeners
   */
  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  // ==================== INITIALIZATION HELPERS ====================

  /**
   * Initialize default configuration for a new organization
   */
  async initializeOrganization(
    orgId: string,
    orgName: string,
    createdBy: string
  ): Promise<ConfigOperationResult<OrganizationConfig>> {
    try {
      const org: OrganizationConfig = {
        orgId,
        orgName,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          defaultTheme: 'system',
        },
      };

      return await this.saveOrganization(org);
    } catch (error) {
      console.error('Error initializing organization:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Clone a profile to create a new one
   */
  async cloneProfile(
    sourceProfileId: string,
    newProfileName: string,
    createdBy: string
  ): Promise<ConfigOperationResult<DashboardProfileConfig>> {
    try {
      const source = await this.getProfile(sourceProfileId);
      if (!source.success || !source.data) {
        return { success: false, error: 'Source profile not found' };
      }

      const newProfile: DashboardProfileConfig = {
        ...source.data,
        profileId: `${source.data.featureId}_${Date.now()}`,
        profileName: newProfileName,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
        lastModifiedBy: createdBy,
      };

      return await this.saveProfile(newProfile, createdBy);
    } catch (error) {
      console.error('Error cloning profile:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check if Firebase is initialized and connected
   */
  async checkConnection(): Promise<boolean> {
    // FIREBASE DISABLED: Return false immediately when Firebase is disabled
    if (!ENABLE_FIREBASE) {
      return false;
    }

    try {
      // First check if Firebase config is properly loaded
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.error('❌ Firebase config missing - check .env.local file');
        console.error('   Expected: VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY');
        return false;
      }

      // console.log('🔄 Checking Firebase connection to project:', firebaseConfig.projectId);

      // Simple connection test - just try to read any collection
      // Don't use subscriptions for connection check to avoid "Target ID already exists" error
      const testQuery = query(
        collection(db, FIREBASE_COLLECTIONS.PROFILES),
      );
      await getDocs(testQuery);

      // console.log('✅ Firebase connected to project:', firebaseConfig.projectId);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);

      // If it's "Target ID already exists", Firebase is actually connected
      if (errorMessage.includes('Target ID already exists')) {
        // console.log('✅ Firebase connected (subscription already active)');
        return true;
      }

      console.error('❌ Firebase connection check failed:', errorMessage);

      // Provide helpful error messages
      if (errorMessage.includes('offline')) {
        console.error('💡 Tip: Check if Firestore is enabled in Firebase Console');
        console.error('   1. Go to https://console.firebase.google.com');
        console.error('   2. Select project:', firebaseConfig.projectId);
        console.error('   3. Go to Firestore Database');
        console.error('   4. Make sure it\'s created and not in "locked" mode');
      }

      return false;
    }
  }

  /**
   * Test write access to Firebase
   */
  async testWriteAccess(): Promise<{ canRead: boolean; canWrite: boolean; error?: string }> {
    try {
      // console.log('🔄 Testing Firebase access...');

      // Quick test - just write directly to profiles collection which we know works
      const testDocRef = doc(db, FIREBASE_COLLECTIONS.PROFILES, '_write_test_');

      // Write test document
      await setDoc(testDocRef, {
        timestamp: new Date().toISOString(),
        test: true
      });

      // Clean up
      await deleteDoc(testDocRef);

      // console.log('✅ Firebase read/write access confirmed');
      return { canRead: true, canWrite: true };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('❌ Firebase access test failed:', errorMessage);

      // Check if it's a permission error
      if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
        console.error('💡 Fix: Update Firestore Rules in Firebase Console:');
        console.error('   rules_version = \'2\';');
        console.error('   service cloud.firestore {');
        console.error('     match /databases/{database}/documents {');
        console.error('       match /{document=**} {');
        console.error('         allow read, write: if true;');
        console.error('       }');
        console.error('     }');
        console.error('   }');
        return {
          canRead: true,
          canWrite: false,
          error: 'Firestore security rules are blocking writes. Update rules in Firebase Console.'
        };
      }

      if (errorMessage.includes('offline')) {
        return {
          canRead: false,
          canWrite: false,
          error: 'Cannot connect to Firestore. Check: 1) Firestore is enabled 2) Project ID is correct 3) Network/firewall allows Firebase'
        };
      }

      return { canRead: false, canWrite: false, error: errorMessage };
    }
  }

  /**
   * Get Firebase project info for debugging
   */
  getProjectInfo(): { projectId: string | undefined; isConfigured: boolean } {
    return {
      projectId: firebaseConfig.projectId,
      isConfigured: !!(firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId)
    };
  }
}

// Export singleton instance
export const firebaseConfigService = new FirebaseConfigService();

// Export class for testing
export { FirebaseConfigService };
