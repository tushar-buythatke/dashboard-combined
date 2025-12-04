/**
 * Firebase Configuration Types
 * These types define the structure of data stored in Firebase Firestore
 * for centralized configuration management across all dashboard builds.
 */

import type { PanelConfig, FilterConfig, CriticalAlertsConfig, TimeSettings, EventConfig } from './analytics';

// ============ Organization Config ============
export interface OrganizationConfig {
  orgId: string;
  orgName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings: {
    defaultTheme: 'light' | 'dark' | 'system';
    logoUrl?: string;
    primaryColor?: string;
  };
}

// ============ Feature Config ============
export interface FeatureConfig {
  featureId: string;
  featureName: string;
  description: string;
  orgId: string;
  isActive: boolean;
  order: number; // Display order
  icon?: string; // Lucide icon name
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============ Dashboard Profile Config ============
export interface DashboardProfileConfig {
  profileId: string;
  profileName: string;
  featureId: string;
  orgId: string;
  isActive: boolean;
  isDefault: boolean; // Default profile for this feature
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  
  // Default settings
  defaultSettings: {
    timeRange: TimeSettings;
    autoRefresh: number; // seconds, 0 = disabled
  };
  
  // Filter configurations
  filters: {
    platform: FilterConfig;
    pos: FilterConfig;
    source: FilterConfig;
    event: FilterConfig;
  };
  
  // Panel configurations
  panels: PanelConfig[];
  
  // Critical alerts configuration
  criticalAlerts: CriticalAlertsConfig;
}

// ============ Event Definition Config ============
export interface EventDefinitionConfig {
  eventId: string;
  eventName: string;
  description?: string;
  featureId: string;
  orgId: string;
  defaultColor: string;
  isErrorEvent: boolean;
  isAvgEvent: boolean;
  category?: string; // For grouping events
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Panel Template Config ============
export interface PanelTemplateConfig {
  templateId: string;
  templateName: string;
  description: string;
  featureId: string;
  orgId: string;
  isGlobal: boolean; // Available to all features
  panelConfig: Omit<PanelConfig, 'panelId'>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============ User Preferences (per-user overrides) ============
export interface UserPreferencesConfig {
  userId: string;
  orgId: string;
  theme: 'light' | 'dark' | 'system';
  defaultFeatureId?: string;
  defaultProfileId?: string;
  sidebarCollapsed: boolean;
  favoriteProfiles: string[];
  recentProfiles: string[];
  customPanelLayouts?: Record<string, PanelConfig[]>; // profileId -> custom layout
  updatedAt: string;
}

// ============ Global App Config ============
export interface GlobalAppConfig {
  configId: 'global';
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowedDomains: string[];
  features: {
    darkMode: boolean;
    criticalAlerts: boolean;
    exportData: boolean;
    userPreferences: boolean;
  };
  defaultOrganization: string;
  updatedAt: string;
  updatedBy: string;
}

// ============ Firestore Collection Names ============
export const FIREBASE_COLLECTIONS = {
  GLOBAL_CONFIG: 'globalConfig',
  ORGANIZATIONS: 'organizations',
  FEATURES: 'features',
  PROFILES: 'profiles',
  EVENTS: 'events',
  PANEL_TEMPLATES: 'panelTemplates',
  USER_PREFERENCES: 'userPreferences',
} as const;

// ============ Default Configurations ============
export const DEFAULT_GLOBAL_CONFIG: GlobalAppConfig = {
  configId: 'global',
  appName: 'Dashboard Analytics',
  appVersion: '1.0.0',
  maintenanceMode: false,
  allowedDomains: ['*'],
  features: {
    darkMode: true,
    criticalAlerts: true,
    exportData: true,
    userPreferences: true,
  },
  defaultOrganization: 'default',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  type: 'multi-select',
  defaultValue: ['all'],
  options: ['all'],
};

export const DEFAULT_CRITICAL_ALERTS: CriticalAlertsConfig = {
  enabled: true,
  position: 'top-right',
  refreshInterval: 60,
  maxAlerts: 5,
  filterByPOS: ['all'],
};

// ============ Helper Types ============
export type FirebaseConfigType = 
  | GlobalAppConfig 
  | OrganizationConfig 
  | FeatureConfig 
  | DashboardProfileConfig 
  | EventDefinitionConfig 
  | PanelTemplateConfig 
  | UserPreferencesConfig;

export interface ConfigChangeEvent<T extends FirebaseConfigType> {
  type: 'added' | 'modified' | 'removed';
  data: T;
  timestamp: string;
}

// ============ API Response Types ============
export interface ConfigOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConfigListResult<T> {
  success: boolean;
  items: T[];
  total: number;
  error?: string;
}
