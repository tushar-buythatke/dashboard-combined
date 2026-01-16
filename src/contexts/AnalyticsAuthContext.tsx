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

    // Auto-refresh user data to check for approval status changes
    // This ensures users who were approved get their status updated automatically
    useEffect(() => {
        if (!user?.id) return;

        // Initial refresh on mount
        refreshUser();

        // Set up periodic refresh every 30 seconds if user has pending status
        if (user.pending_status === 1) {
            console.log('👀 User has pending request - setting up auto-refresh');
            const intervalId = setInterval(() => {
                console.log('🔄 Auto-checking approval status...');
                refreshUser();
            }, 30000); // Check every 30 seconds

            return () => {
                console.log('🛑 Stopping auto-refresh');
                clearInterval(intervalId);
            };
        }
    }, [user?.id, user?.pending_status]); // Re-run if user ID or pending status changes

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

    const logout = () => {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // Force redirect to auth page to prevent component errors
        window.location.href = '/auth';
    };

    // Standardized setUser wrapper for persistence
    const loginUser = (userData: User | null) => {
        setUser(userData);
        if (userData) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                user: userData,
                expiry: Date.now() + SESSION_EXPIRY
            }));
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
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
                // Backend returns: { approved, userId, userName, type, permissions, pending_status, pending_permissions }
                const backendData = data.data;
                
                // CRITICAL FIX: Handle both 'approved' flag and 'pending_status'
                // When user is approved: approved=true, pending_status=0
                // When user is pending: approved=false, pending_status=1
                const isApproved = backendData.approved === true;
                const finalPendingStatus = isApproved ? 0 : (backendData.pending_status ?? 1);
                
                // Update local state with fresh data from DB
                const freshUser: User = {
                    ...user,
                    role: backendData.type ?? user.role, // Map type to role
                    permissions: backendData.permissions || user.permissions,
                    // FIX: Use calculated pending_status based on approved flag
                    pending_status: finalPendingStatus,
                    pending_permissions: backendData.pending_permissions ?? null
                };

                // Detect approval status change
                const wasApproved = user.pending_status === 0;
                const nowApproved = finalPendingStatus === 0;
                const statusChanged = wasApproved !== nowApproved;

                // Only update if something changed to avoid loop
                if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
                    if (statusChanged && nowApproved) {
                        console.log('🎉 USER APPROVED! Status changed from pending to approved', {
                            userId: user.id,
                            username: user.username,
                            oldPendingStatus: user.pending_status,
                            newPendingStatus: finalPendingStatus,
                            permissions: freshUser.permissions
                        });
                    } else {
                        console.log('✅ Refreshing user data from backend', {
                            approved: isApproved,
                            oldPendingStatus: user.pending_status,
                            newPendingStatus: finalPendingStatus,
                            permissions: freshUser.permissions
                        });
                    }
                    
                    setUser(freshUser);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                        user: freshUser,
                        expiry: Date.now() + SESSION_EXPIRY
                    }));
                }
            } else {
                console.warn('⚠️ Invalid response from checkApproval API:', data);
            }
        } catch (e) {
            // Silently fail if backend is unreachable to prevent UI crash
            console.warn("❌ Failed to refresh user data (backend might be offline):", e);
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
