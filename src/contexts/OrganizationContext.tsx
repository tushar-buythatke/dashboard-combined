import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, clearFeaturesCache } from '@/services/apiService';
import type { OrganizationInfo } from '@/services/apiService';

interface OrganizationContextType {
    organizations: OrganizationInfo[];
    selectedOrganization: OrganizationInfo | null;
    setSelectedOrganization: (org: OrganizationInfo) => void;
    loading: boolean;
    error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
    const [selectedOrganization, setSelectedOrganizationState] = useState<OrganizationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load organizations on mount
    useEffect(() => {
        const loadOrganizations = async () => {
            try {
                setLoading(true);
                setError(null);
                const orgs = await apiService.getOrganizationsList();
                setOrganizations(orgs);
                
                // Load saved organization from localStorage or default to first one
                const savedOrgId = localStorage.getItem('selectedOrganizationId');
                if (savedOrgId) {
                    const savedOrg = orgs.find(o => o.id === parseInt(savedOrgId));
                    if (savedOrg) {
                        setSelectedOrganizationState(savedOrg);
                    } else {
                        setSelectedOrganizationState(orgs[0] || null);
                    }
                } else {
                    setSelectedOrganizationState(orgs[0] || null);
                }
            } catch (err) {
                console.error('Failed to load organizations:', err);
                setError('Failed to load organizations');
                // Fallback to default organization
                const defaultOrg = { id: 0, name: 'Buyhatke' };
                setOrganizations([defaultOrg]);
                setSelectedOrganizationState(defaultOrg);
            } finally {
                setLoading(false);
            }
        };

        loadOrganizations();
    }, []);

    // Handler to change organization
    const setSelectedOrganization = useCallback((org: OrganizationInfo) => {
        if (selectedOrganization?.id !== org.id) {
            console.log(`🏢 Switching organization from ${selectedOrganization?.name} to ${org.name}`);
            // Clear features cache when organization changes
            clearFeaturesCache();
            // Save to localStorage
            localStorage.setItem('selectedOrganizationId', org.id.toString());
        }
        setSelectedOrganizationState(org);
    }, [selectedOrganization]);

    return (
        <OrganizationContext.Provider value={{
            organizations,
            selectedOrganization,
            setSelectedOrganization,
            loading,
            error
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
