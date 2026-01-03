import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/analytics';
import { mockService } from '../services/mockData';

interface AnalyticsAuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
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
            const storedUser = localStorage.getItem('analytics_user_v2');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(false); // Already checked synchronously above

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await mockService.login(username, password);
            if (response.success && response.user) {
                setUser(response.user);
                localStorage.setItem('analytics_user_v2', JSON.stringify(response.user));
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
        localStorage.removeItem('analytics_user_v2');
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
    };

    return (
        <AnalyticsAuthContext.Provider value={value}>
            {children}
        </AnalyticsAuthContext.Provider>
    );
}
