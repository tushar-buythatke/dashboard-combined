/**
 * Firebase Configuration Context
 * Provides centralized access to Firebase-stored configurations.
 * Optimized to avoid excessive API calls and re-renders.
 * 
 * ============================================================================
 * FIREBASE DISABLED: This context is currently disabled as all data is now
 * stored in the custom database. The context remains for type compatibility.
 * 
 * TO RE-ENABLE: Set ENABLE_FIREBASE=true in firebase.ts and uncomment the
 * FirebaseConfigProvider wrapper in src/pages/Analytics.tsx
 * ============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { firebaseConfigService } from '../services/firebaseConfigService';
import { useAnalyticsAuth } from './AnalyticsAuthContext';
import { useOrganization } from './OrganizationContext';
import { ENABLE_FIREBASE } from '../../firebase';
import type {
  GlobalAppConfig,
  FeatureConfig,
  DashboardProfileConfig,
  EventDefinitionConfig,
  PanelTemplateConfig,
} from '../types/firebaseConfig';
import { DEFAULT_GLOBAL_CONFIG } from '../types/firebaseConfig';

// Global singleton to track if Firebase connection has been checked
let globalConnectionChecked = false;
let globalIsConnected = false;

interface FirebaseConfigContextType {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Global config
  globalConfig: GlobalAppConfig;

  // Features
  features: FeatureConfig[];
  selectedFeature: FeatureConfig | null;
  setSelectedFeature: (feature: FeatureConfig | null) => void;

  // Profiles
  profiles: DashboardProfileConfig[];
  selectedProfile: DashboardProfileConfig | null;
  setSelectedProfile: (profile: DashboardProfileConfig | null) => void;

  // Events
  events: EventDefinitionConfig[];

  // Panel templates
  panelTemplates: PanelTemplateConfig[];

  // Admin actions (only available for admin users)
  isAdmin: boolean;
  saveProfile: (profile: DashboardProfileConfig) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  saveFeature: (feature: FeatureConfig) => Promise<boolean>;
  deleteFeature: (featureId: string) => Promise<boolean>;
  saveEvent: (event: EventDefinitionConfig) => Promise<boolean>;
  savePanelTemplate: (template: PanelTemplateConfig) => Promise<boolean>;
  updateGlobalConfig: (config: Partial<GlobalAppConfig>) => Promise<boolean>;
  setDefaultProfile: (profileId: string) => Promise<boolean>;
  cloneProfile: (sourceProfileId: string, newName: string) => Promise<DashboardProfileConfig | null>;

  // Refresh methods
  refreshFeatures: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const FirebaseConfigContext = createContext<FirebaseConfigContextType | undefined>(undefined);

export function useFirebaseConfig() {
  const context = useContext(FirebaseConfigContext);
  if (context === undefined) {
    throw new Error('useFirebaseConfig must be used within a FirebaseConfigProvider');
  }
  return context;
}

interface FirebaseConfigProviderProps {
  children: ReactNode;
}

export function FirebaseConfigProvider({ children }: FirebaseConfigProviderProps) {
  const { user } = useAnalyticsAuth();
  const { selectedOrganization } = useOrganization();

  // Connection state
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [isLoading, setIsLoading] = useState(!globalConnectionChecked);
  const [error, setError] = useState<string | null>(null);

  // Track if we've initialized
  const initializedRef = useRef(false);

  // Config state
  const [globalConfig, setGlobalConfig] = useState<GlobalAppConfig>(DEFAULT_GLOBAL_CONFIG);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [profiles, setProfiles] = useState<DashboardProfileConfig[]>([]);
  const [events, setEvents] = useState<EventDefinitionConfig[]>([]);
  const [panelTemplates, setPanelTemplates] = useState<PanelTemplateConfig[]>([]);

  // Selection state
  const [selectedFeature, setSelectedFeature] = useState<FeatureConfig | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DashboardProfileConfig | null>(null);

  const isAdmin = user?.role === 1;
  const orgId = selectedOrganization?.id?.toString() || 'default';

  // Initialize connection ONCE (uses global singleton to prevent re-checking)
  // FIREBASE DISABLED: Skip connection check when Firebase is disabled
  useEffect(() => {
    // Skip if already initialized in this component instance
    if (initializedRef.current) return;
    initializedRef.current = true;

    // FIREBASE DISABLED: Skip all Firebase operations
    if (!ENABLE_FIREBASE) {
      console.log('🔥 Firebase is DISABLED - skipping connection check');
      globalConnectionChecked = true;
      globalIsConnected = false;
      setIsConnected(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If already checked globally, use cached result
    if (globalConnectionChecked) {
      setIsConnected(globalIsConnected);
      setIsLoading(false);

      // Load global config if connected
      if (globalIsConnected) {
        firebaseConfigService.getGlobalConfig().then(result => {
          if (result.success && result.data) {
            setGlobalConfig(result.data);
          }
        });
      }
      return;
    }

    // First time - check connection
    const initializeConnection = async () => {
      setIsLoading(true);
      try {
        console.log('🔥 Checking Firebase connection (one-time)...');
        const connected = await firebaseConfigService.checkConnection();

        // Store globally to prevent re-checking
        globalConnectionChecked = true;
        globalIsConnected = connected;

        setIsConnected(connected);

        if (connected) {
          const configResult = await firebaseConfigService.getGlobalConfig();
          if (configResult.success && configResult.data) {
            setGlobalConfig(configResult.data);
          }
        }
        setError(null);
      } catch (err) {
        console.error('Firebase connection error:', err);
        globalConnectionChecked = true;
        globalIsConnected = false;
        setError('Failed to connect to configuration service');
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeConnection();
  }, []);

  // Load features when organization changes (NO real-time subscription)
  const refreshFeatures = useCallback(async () => {
    if (!isConnected || !orgId) return;

    try {
      const result = await firebaseConfigService.getFeatures(orgId);
      if (result.success) {
        setFeatures(result.items);
      }
    } catch (err) {
      console.error('Error loading features:', err);
    }
  }, [isConnected, orgId]);

  // Only refresh features when orgId changes, not on every render
  const prevOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isConnected && orgId && orgId !== prevOrgIdRef.current) {
      prevOrgIdRef.current = orgId;
      refreshFeatures();
    }
  }, [isConnected, orgId, refreshFeatures]);

  // Load profiles when feature changes (NO real-time subscription)
  const refreshProfiles = useCallback(async () => {
    if (!isConnected || !selectedFeature || !orgId) {
      setProfiles([]);
      return;
    }

    try {
      const result = await firebaseConfigService.getProfiles(selectedFeature.featureId, orgId);
      if (result.success) {
        setProfiles(result.items);

        // Auto-select default profile
        const defaultProfile = result.items.find(p => p.isDefault);
        if (defaultProfile && !selectedProfile) {
          setSelectedProfile(defaultProfile);
        }
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  }, [isConnected, selectedFeature, orgId, selectedProfile]);

  // Only refresh profiles when selectedFeature changes
  const prevFeatureIdRef = useRef<string | null>(null);
  useEffect(() => {
    const featureId = selectedFeature?.featureId || null;
    if (isConnected && featureId && featureId !== prevFeatureIdRef.current) {
      prevFeatureIdRef.current = featureId;
      refreshProfiles();
    } else if (!featureId) {
      prevFeatureIdRef.current = null;
      setProfiles([]);
    }
  }, [isConnected, selectedFeature, refreshProfiles]);

  // Load events when feature changes
  const refreshEvents = useCallback(async () => {
    if (!isConnected || !selectedFeature || !orgId) {
      setEvents([]);
      return;
    }

    try {
      const result = await firebaseConfigService.getEvents(selectedFeature.featureId, orgId);
      if (result.success) {
        setEvents(result.items);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }, [isConnected, selectedFeature, orgId]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Load panel templates when feature changes
  useEffect(() => {
    const loadTemplates = async () => {
      if (!isConnected || !selectedFeature || !orgId) {
        setPanelTemplates([]);
        return;
      }

      try {
        const result = await firebaseConfigService.getPanelTemplates(selectedFeature.featureId, orgId);
        if (result.success) {
          setPanelTemplates(result.items);
        }
      } catch (err) {
        console.error('Error loading panel templates:', err);
      }
    };

    loadTemplates();
  }, [isConnected, selectedFeature, orgId]);

  // Clear profile selection when feature changes
  useEffect(() => {
    setSelectedProfile(null);
  }, [selectedFeature]);

  // Admin actions
  const saveProfile = useCallback(async (profile: DashboardProfileConfig): Promise<boolean> => {
    if (!isAdmin || !user) {
      console.error('Unauthorized: Only admins can save profiles');
      return false;
    }

    try {
      const result = await firebaseConfigService.saveProfile(profile, user.username);
      if (result.success) {
        await refreshProfiles();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving profile:', err);
      return false;
    }
  }, [isAdmin, user, refreshProfiles]);

  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (!isAdmin) {
      console.error('Unauthorized: Only admins can delete profiles');
      return false;
    }

    try {
      const result = await firebaseConfigService.deleteProfile(profileId);
      if (result.success) {
        if (selectedProfile?.profileId === profileId) {
          setSelectedProfile(null);
        }
        await refreshProfiles();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting profile:', err);
      return false;
    }
  }, [isAdmin, selectedProfile, refreshProfiles]);

  const saveFeature = useCallback(async (feature: FeatureConfig): Promise<boolean> => {
    if (!isAdmin) {
      console.error('Unauthorized: Only admins can save features');
      return false;
    }

    try {
      const result = await firebaseConfigService.saveFeature(feature);
      if (result.success) {
        await refreshFeatures();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving feature:', err);
      return false;
    }
  }, [isAdmin, refreshFeatures]);

  const deleteFeature = useCallback(async (featureId: string): Promise<boolean> => {
    if (!isAdmin) {
      console.error('Unauthorized: Only admins can delete features');
      return false;
    }

    try {
      const result = await firebaseConfigService.deleteFeature(featureId);
      if (result.success) {
        if (selectedFeature?.featureId === featureId) {
          setSelectedFeature(null);
        }
        await refreshFeatures();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting feature:', err);
      return false;
    }
  }, [isAdmin, selectedFeature, refreshFeatures]);

  const saveEvent = useCallback(async (event: EventDefinitionConfig): Promise<boolean> => {
    if (!isAdmin) {
      console.error('Unauthorized: Only admins can save events');
      return false;
    }

    try {
      const result = await firebaseConfigService.saveEvent(event);
      if (result.success) {
        await refreshEvents();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving event:', err);
      return false;
    }
  }, [isAdmin, refreshEvents]);

  const savePanelTemplate = useCallback(async (template: PanelTemplateConfig): Promise<boolean> => {
    if (!isAdmin || !user) {
      console.error('Unauthorized: Only admins can save panel templates');
      return false;
    }

    try {
      const result = await firebaseConfigService.savePanelTemplate(template, user.username);
      return result.success;
    } catch (err) {
      console.error('Error saving panel template:', err);
      return false;
    }
  }, [isAdmin, user]);

  const updateGlobalConfig = useCallback(async (config: Partial<GlobalAppConfig>): Promise<boolean> => {
    if (!isAdmin || !user) {
      console.error('Unauthorized: Only admins can update global config');
      return false;
    }

    try {
      const result = await firebaseConfigService.updateGlobalConfig(config, user.username);
      return result.success;
    } catch (err) {
      console.error('Error updating global config:', err);
      return false;
    }
  }, [isAdmin, user]);

  const setDefaultProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (!isAdmin || !selectedFeature) {
      console.error('Unauthorized or no feature selected');
      return false;
    }

    try {
      const result = await firebaseConfigService.setDefaultProfile(
        profileId,
        selectedFeature.featureId,
        orgId
      );
      if (result.success) {
        await refreshProfiles();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error setting default profile:', err);
      return false;
    }
  }, [isAdmin, selectedFeature, orgId, refreshProfiles]);

  const cloneProfile = useCallback(async (
    sourceProfileId: string,
    newName: string
  ): Promise<DashboardProfileConfig | null> => {
    if (!isAdmin || !user) {
      console.error('Unauthorized: Only admins can clone profiles');
      return null;
    }

    try {
      const result = await firebaseConfigService.cloneProfile(sourceProfileId, newName, user.username);
      if (result.success && result.data) {
        await refreshProfiles();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Error cloning profile:', err);
      return null;
    }
  }, [isAdmin, user, refreshProfiles]);

  const value: FirebaseConfigContextType = {
    // Connection state
    isConnected,
    isLoading,
    error,

    // Global config
    globalConfig,

    // Features
    features,
    selectedFeature,
    setSelectedFeature,

    // Profiles
    profiles,
    selectedProfile,
    setSelectedProfile,

    // Events
    events,

    // Panel templates
    panelTemplates,

    // Admin actions
    isAdmin,
    saveProfile,
    deleteProfile,
    saveFeature,
    deleteFeature,
    saveEvent,
    savePanelTemplate,
    updateGlobalConfig,
    setDefaultProfile,
    cloneProfile,

    // Refresh methods
    refreshFeatures,
    refreshProfiles,
    refreshEvents,
  };

  return (
    <FirebaseConfigContext.Provider value={value}>
      {children}
    </FirebaseConfigContext.Provider>
  );
}
