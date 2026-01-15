import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/analytics';
import { mockService } from '../services/mockData';

const SESSION_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds per user request
const LOCAL_STORAGE_KEY = 'dashboard_combined_auth';

interface AnalyticsAuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    loginUser: (user: User) => void;
    logout: () => void;
    requestAccess: (permissions: any) => Promise<{ success: boolean; message?: string }>;
    adminAction: (userId: number | string, action: 'approve' | 'reject', permissions?: any) => Promise<{ success: boolean; message?: string }>;
    getPendingUsers: () => Promise<any[]>;
    refreshUser: () => Promise<void>;
}

const AnalyticsAuthContext = createContext<AnalyticsAuthContextType | undefined>(undefined);

export function useAnalyticsAuth() {
    const context = useContext(AnalyticsAuthContext);
    if (context === undefined) {
        throw new Error('useAnalyticsAuth must be used within an AnalyticsAuthProvider');
    }
    return context;
}

export function AnalyticsAuthProvider({ children }: { children: ReactNode }) {
    // Initialize user state synchronously from localStorage to prevent flash
    const [user, setUser] = useState<User | null>(() => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!stored) return null;
            const { user: savedUser, expiry } = JSON.parse(stored);
            if (expiry && Date.now() < expiry) {
                console.log('✅ Valid local session found for Feature Tracking');
                return savedUser;
            }
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return null;
        } catch {
            return null;
        }
    });

    // Watch for localStorage changes from other tabs or same-tab navigation
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    const { user: savedUser, expiry } = JSON.parse(stored);
                    if (expiry && Date.now() < expiry) {
                        setUser(savedUser);
                        return;
                    }
                }
                setUser(null);
            } catch (e) {
                setUser(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Refresh user data on mount (to catch DB changes like approval/role updates)
    useEffect(() => {
        if (user?.id) {
            refreshUser();
        }
    }, []); // Run once on mount

    const [isLoading, setIsLoading] = useState(false); // Already checked synchronously above

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            // Use production featureTracking API
            try {
                const response = await fetch('https://ext1.buyhatke.com/feature-tracking/auth/validateLogin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userName: username, password })
                });
                const data = await response.json();

                if (data.status === 1) {
                    // Parse permissions if string
                    if (data.user && typeof data.user.permissions === 'string') {
                        try { data.user.permissions = JSON.parse(data.user.permissions); } catch (e) { }
                    }
                    if (data.user && typeof data.user.pending_permissions === 'string') {
                        try { data.user.pending_permissions = JSON.parse(data.user.pending_permissions); } catch (e) { }
                    }

                    setUser(data.user);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                        user: data.user,
                        expiry: Date.now() + SESSION_EXPIRY
                    }));
                    return { success: true };
                } else {
                    return { success: false, message: data.message || 'Login failed' };
                }
            } catch (e) {
                console.error("Auth failed:", e);
                return { success: false, message: 'Connection failed' };
            }

            const response = await mockService.login(username, password);
            if (response.success && response.user) {
                setUser(response.user);
                localStorage.setItem('dashboard_combined_auth', JSON.stringify(response.user));
                return { success: true };
            } else {
                return { success: false, message: response.message || 'Login failed' };
            }
        } catch (error) {
            return { success: false, message: 'An error occurred' };
        } finally {
            setIsLoading(false);
        }
    };

    const loginUser = (userData: User) => {
        setUser(userData);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            user: userData,
            expiry: Date.now() + SESSION_EXPIRY
        }));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Force redirect to auth page to prevent component errors
        window.location.href = '/auth';
    };

    const requestAccess = async (permissions: any) => {
        if (!user) return { success: false, message: 'Not logged in' };
        try {
            const response = await fetch('https://ext1.buyhatke.com/feature-tracking/auth/requestAccess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, permissions })
            });
            const data = await response.json();
            if (data.status === 1) {
                // Update local user state
                const updatedUser = { ...user, pending_status: 1, pending_permissions: permissions };
                setUser(updatedUser);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                    user: updatedUser,
                    expiry: Date.now() + SESSION_EXPIRY // Also extend on activity
                }));
                return { success: true };
            }
            return { success: false, message: data.message };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Request failed' };
        }
    };

    const adminAction = async (userId: number | string, action: 'approve' | 'reject', permissions?: any) => {
        try {
            const response = await fetch('https://ext1.buyhatke.com/feature-tracking/auth/approveUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action, permissions })
            });
            const data = await response.json();
            return { success: data.status === 1, message: data.message };
        } catch (e) {
            return { success: false, message: 'Action failed' };
        }
    };

    const getPendingUsers = async () => {
        try {
            const response = await fetch('https://ext1.buyhatke.com/feature-tracking/auth/pendingUsers');
            const data = await response.json();
            if (data.status === 1) return data.data;
            return [];
        } catch (e) {
            return [];
        }
    };

    const refreshUser = async () => {
        if (!user?.id) return;
        try {
            const response = await fetch('https://ext1.buyhatke.com/feature-tracking/auth/checkApproval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json();

            if (data.status === 1 && data.data) {
                // Update local state with fresh data from DB
                const freshUser: User = {
                    ...user,
                    role: data.data.type, // Map type to role
                    permissions: data.data.permissions || user.permissions,
                    pending_status: data.data.pending_status,
                    pending_permissions: data.data.pending_permissions
                };

                // Only update if something changed to avoid loop
                if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
                    console.log('Refreshing user data from backend', freshUser);
                    setUser(freshUser);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                        user: freshUser,
                        expiry: Date.now() + SESSION_EXPIRY
                    }));
                }
            }
        } catch (e) {
            // Silently fail if backend is unreachable to prevent UI crash
            console.warn("Failed to refresh user data (backend might be offline):", e);
        }
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginUser,
        logout,
        requestAccess,
        adminAction,
        getPendingUsers,
        refreshUser
    };

    return (
        <AnalyticsAuthContext.Provider value={value}>
            {children}
        </AnalyticsAuthContext.Provider>
    );
}
