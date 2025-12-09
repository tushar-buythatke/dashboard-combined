import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useOrganization } from './OrganizationContext';

// Organization theme mapping
export const ORGANIZATION_THEMES: Record<string, string> = {
    'Buyhatke': 'violet',      // Purple theme for Buyhatke
    'Cab Comparison': 'amber', // Warm orange for Cab Comparison
    'Grocery': 'emerald',      // Green for Grocery
    'Autosnipe': 'autosnipe',  // Matrix green/neon for Autosnipe
};

// Theme color palettes for programmatic access
export const THEME_PALETTES = {
    violet: {
        primary: '#8b5cf6',
        primaryLight: '#a78bfa',
        primaryDark: '#7c3aed',
        accent: '#c4b5fd',
        gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
        glow: 'rgba(139, 92, 246, 0.4)',
        bgGradient: 'from-violet-50 via-white to-purple-50',
        darkBgGradient: 'from-violet-900/20 via-slate-900 to-purple-900/20',
    },
    autosnipe: {
        primary: '#22c55e',
        primaryLight: '#4ade80',
        primaryDark: '#16a34a',
        accent: '#86efac',
        gradient: 'from-green-500 via-emerald-500 to-teal-500',
        glow: 'rgba(34, 197, 94, 0.5)',
        bgGradient: 'from-green-950 via-gray-950 to-emerald-950',
        darkBgGradient: 'from-green-950 via-gray-950 to-emerald-950',
        // Autosnipe specific
        neonGreen: '#00ff00',
        matrixGreen: '#39ff14',
        darkBg: '#0a0a0a',
    },
    emerald: {
        primary: '#10b981',
        primaryLight: '#34d399',
        primaryDark: '#059669',
        accent: '#6ee7b7',
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        glow: 'rgba(16, 185, 129, 0.4)',
        bgGradient: 'from-emerald-50 via-white to-green-50',
        darkBgGradient: 'from-emerald-900/20 via-slate-900 to-green-900/20',
    },
    amber: {
        primary: '#f59e0b',
        primaryLight: '#fbbf24',
        primaryDark: '#d97706',
        accent: '#fcd34d',
        gradient: 'from-amber-500 via-orange-500 to-yellow-500',
        glow: 'rgba(245, 158, 11, 0.4)',
        bgGradient: 'from-amber-50 via-white to-orange-50',
        darkBgGradient: 'from-amber-900/20 via-slate-900 to-orange-900/20',
    },
};

interface ThemeContextType {
    currentTheme: string;
    isAutosnipe: boolean;
    themePalette: typeof THEME_PALETTES.violet;
    setManualTheme: (theme: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { selectedOrganization } = useOrganization();
    const [manualTheme, setManualTheme] = useState<string | null>(null);
    const [currentTheme, setCurrentTheme] = useState<string>('violet');

    // Determine theme based on organization or manual override
    useEffect(() => {
        let theme = 'violet'; // Default

        if (manualTheme) {
            theme = manualTheme;
        } else if (selectedOrganization) {
            theme = ORGANIZATION_THEMES[selectedOrganization.name] || 'violet';
        }

        setCurrentTheme(theme);

        // Apply theme to document root
        document.documentElement.setAttribute('data-theme', theme);

        // For Autosnipe, also add dark mode class
        if (theme === 'autosnipe') {
            document.documentElement.classList.add('dark');
        }

        console.log(`🎨 Theme applied: ${theme} for org: ${selectedOrganization?.name}`);
    }, [selectedOrganization, manualTheme]);

    const isAutosnipe = currentTheme === 'autosnipe';
    const themePalette = THEME_PALETTES[currentTheme as keyof typeof THEME_PALETTES] || THEME_PALETTES.violet;

    return (
        <ThemeContext.Provider value={{
            currentTheme,
            isAutosnipe,
            themePalette,
            setManualTheme,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    // Return default values if context is not available (graceful fallback)
    if (context === undefined) {
        return {
            currentTheme: 'violet',
            isAutosnipe: false,
            themePalette: THEME_PALETTES.violet,
            setManualTheme: () => {},
        };
    }
    return context;
}
