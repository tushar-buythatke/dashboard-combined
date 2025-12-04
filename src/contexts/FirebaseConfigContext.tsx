/**
 * Firebase Configuration Context
 * Provides centralized access to Firebase-stored configurations
 * with real-time updates across all dashboard components.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { firebaseConfigService } from '../services/firebaseConfigService';
import { useAnalyticsAuth } from './AnalyticsAuthContext';
import { useOrganization } from './OrganizationContext';
import type {
  GlobalAppConfig,
  FeatureConfig,
  DashboardProfileConfig,
  EventDefinitionConfig,
  PanelTemplateConfig,
} from '../types/firebaseConfig';
import { DEFAULT_GLOBAL_CONFIG } from '../types/firebaseConfig';

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
  const { user, isAuthenticated } = useAnalyticsAuth();
  const { selectedOrganization } = useOrganization();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [globalConfig, setGlobalConfig] = useState<GlobalAppConfig>(DEFAULT_GLOBAL_CONFIG);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [profiles, setProfiles] = useState<DashboardProfileConfig[]>([]);
  const [events, setEvents] = useState<EventDefinitionConfig[]>([]);
  const [panelTemplates, setPanelTemplates] = useState<PanelTemplateConfig[]>([]);

  // Selection state
  const [selectedFeature, setSelectedFeature] = useState<FeatureConfig | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DashboardProfileConfig | null>(null);

  const isAdmin = user?.role === 0;
  const orgId = selectedOrganization?.id?.toString() || 'default';

  // Initialize connection and load global config
  useEffect(() => {
    let isMounted = true;
    let unsubscribeGlobal: (() => void) | null = null;
    
    const initializeConnection = async () => {
      setIsLoading(true);
      try {
        const connected = await firebaseConfigService.checkConnection();
        if (!isMounted) return;
        
        setIsConnected(connected);

        if (connected) {
          const configResult = await firebaseConfigService.getGlobalConfig();
          if (isMounted && configResult.success && configResult.data) {
            setGlobalConfig(configResult.data);
          }
          
          // Only subscribe after successful connection
          unsubscribeGlobal = firebaseConfigService.subscribeToGlobalConfig((config) => {
            if (isMounted) setGlobalConfig(config);
          });
        }
        if (isMounted) setError(null);
      } catch (err) {
        console.error('Firebase connection error:', err);
        if (isMounted) {
          setError('Failed to connect to configuration service');
          setIsConnected(false);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeConnection();

    return () => {
      isMounted = false;
      if (unsubscribeGlobal) unsubscribeGlobal();
    };
  }, []);

  // Load features when organization changes
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

  useEffect(() => {
    let unsubscribeFeatures: (() => void) | null = null;
    
    if (isConnected && orgId) {
      refreshFeatures();
      
      // Subscribe to feature changes
      unsubscribeFeatures = firebaseConfigService.subscribeToFeatures(orgId, (newFeatures) => {
        setFeatures(newFeatures);
      });
    }
    
    return () => {
      if (unsubscribeFeatures) unsubscribeFeatures();
    };
  }, [isConnected, orgId, refreshFeatures]);

  // Load profiles when feature changes
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

  useEffect(() => {
    let unsubscribeProfiles: (() => void) | null = null;
    
    if (isConnected && selectedFeature && orgId) {
      refreshProfiles();
      
      // Subscribe to profile changes
      unsubscribeProfiles = firebaseConfigService.subscribeToProfiles(
        selectedFeature.featureId,
        orgId,
        (newProfiles) => {
          setProfiles(newProfiles);
        }
      );
    }
    
    return () => {
      if (unsubscribeProfiles) unsubscribeProfiles();
    };
  }, [isConnected, selectedFeature, orgId, refreshProfiles]);

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
