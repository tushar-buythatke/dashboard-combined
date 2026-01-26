import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type AccentTheme = 'indigo' | 'aurora' | 'sunset' | 'forest';

// Theme classes that can be used directly in components
interface ThemeClasses {
    // Primary button/gradient - the main CTA gradient
    buttonGradient: string;
    buttonHover: string;
    
    // Header gradient - main hero sections
    headerGradient: string;
    headerGradientVia: string; // For 3-color gradients
    
    // Sidebar active state
    sidebarActive: string;
    sidebarActiveDark: string;
    sidebarActiveText: string;
    sidebarActiveTextDark: string;
    
    // Background orbs for glassmorphism
    orbPrimary: string;
    orbSecondary: string;
    orbTertiary: string;
    orbPrimaryDark: string;
    orbSecondaryDark: string;
    orbTertiaryDark: string;
    
    // Text colors
    textPrimary: string;
    textPrimaryDark: string;
    textSecondary: string;
    textSecondaryDark: string;
    
    // Borders
    borderAccent: string;
    borderAccentDark: string;
    borderHover: string;
    borderHoverDark: string;
    
    // Rings/Focus
    ringAccent: string;
    
    // Badges/Pills
    badgeBg: string;
    badgeBgDark: string;
    badgeText: string;
    badgeTextDark: string;
    
    // Icon containers
    iconGradient: string;
    iconBg: string;
    iconBgDark: string;
    
    // Card accents
    cardHoverBorder: string;
    cardHoverBorderDark: string;
    cardAccentBg: string;
    cardAccentBgDark: string;
    
    // Stats/metrics colors
    statPositive: string;
    statNegative: string;
    
    // Feature cards on home page
    featureCardBorder: string;
    featureCardBorderDark: string;
    featureCardHover: string;
    featureCardHoverDark: string;
    
    // Link/action colors
    linkColor: string;
    linkColorDark: string;
    linkHover: string;
    linkHoverDark: string;
}

const THEME_CLASSES: Record<AccentTheme, ThemeClasses> = {
    // Clean professional blue/indigo
    indigo: {
        buttonGradient: 'from-indigo-500 via-blue-500 to-cyan-400',
        buttonHover: 'hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-500',
        headerGradient: 'from-indigo-600 via-blue-500 to-cyan-400',
        headerGradientVia: 'via-blue-500',
        sidebarActive: 'bg-indigo-50',
        sidebarActiveDark: 'dark:bg-indigo-500/15',
        sidebarActiveText: 'text-indigo-700',
        sidebarActiveTextDark: 'dark:text-indigo-300',
        orbPrimary: 'bg-indigo-200/50',
        orbSecondary: 'bg-blue-200/40',
        orbTertiary: 'bg-cyan-200/30',
        orbPrimaryDark: 'bg-indigo-500/15',
        orbSecondaryDark: 'bg-blue-500/10',
        orbTertiaryDark: 'bg-cyan-500/10',
        textPrimary: 'text-indigo-600',
        textPrimaryDark: 'text-indigo-400',
        textSecondary: 'text-blue-600',
        textSecondaryDark: 'text-blue-400',
        borderAccent: 'border-indigo-200',
        borderAccentDark: 'border-indigo-600/40',
        borderHover: 'hover:border-indigo-300',
        borderHoverDark: 'dark:hover:border-indigo-500/50',
        ringAccent: 'ring-indigo-500/25',
        badgeBg: 'bg-indigo-50',
        badgeBgDark: 'bg-indigo-500/20',
        badgeText: 'text-indigo-700',
        badgeTextDark: 'text-indigo-300',
        iconGradient: 'from-indigo-500 to-blue-500',
        iconBg: 'bg-indigo-100',
        iconBgDark: 'bg-indigo-500/20',
        cardHoverBorder: 'hover:border-indigo-300',
        cardHoverBorderDark: 'dark:hover:border-indigo-500/40',
        cardAccentBg: 'bg-indigo-50/50',
        cardAccentBgDark: 'bg-indigo-500/5',
        statPositive: 'text-emerald-600',
        statNegative: 'text-red-500',
        featureCardBorder: 'border-indigo-100',
        featureCardBorderDark: 'dark:border-indigo-500/20',
        featureCardHover: 'hover:border-indigo-300 hover:shadow-indigo-100',
        featureCardHoverDark: 'dark:hover:border-indigo-500/40',
        linkColor: 'text-indigo-600',
        linkColorDark: 'text-indigo-400',
        linkHover: 'hover:text-indigo-700',
        linkHoverDark: 'dark:hover:text-indigo-300',
    },
    
    // Vibrant purple-pink aurora (the sexy one!)
    aurora: {
        buttonGradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
        buttonHover: 'hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600',
        headerGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
        headerGradientVia: 'via-fuchsia-500',
        sidebarActive: 'bg-fuchsia-50',
        sidebarActiveDark: 'dark:bg-fuchsia-500/15',
        sidebarActiveText: 'text-fuchsia-700',
        sidebarActiveTextDark: 'dark:text-fuchsia-300',
        orbPrimary: 'bg-purple-200/50',
        orbSecondary: 'bg-fuchsia-200/40',
        orbTertiary: 'bg-pink-200/30',
        orbPrimaryDark: 'bg-purple-500/15',
        orbSecondaryDark: 'bg-fuchsia-500/10',
        orbTertiaryDark: 'bg-pink-500/10',
        textPrimary: 'text-fuchsia-600',
        textPrimaryDark: 'text-fuchsia-400',
        textSecondary: 'text-purple-600',
        textSecondaryDark: 'text-purple-400',
        borderAccent: 'border-fuchsia-200',
        borderAccentDark: 'border-fuchsia-600/40',
        borderHover: 'hover:border-fuchsia-300',
        borderHoverDark: 'dark:hover:border-fuchsia-500/50',
        ringAccent: 'ring-fuchsia-500/25',
        badgeBg: 'bg-fuchsia-50',
        badgeBgDark: 'bg-fuchsia-500/20',
        badgeText: 'text-fuchsia-700',
        badgeTextDark: 'text-fuchsia-300',
        iconGradient: 'from-purple-500 to-pink-500',
        iconBg: 'bg-fuchsia-100',
        iconBgDark: 'bg-fuchsia-500/20',
        cardHoverBorder: 'hover:border-fuchsia-300',
        cardHoverBorderDark: 'dark:hover:border-fuchsia-500/40',
        cardAccentBg: 'bg-fuchsia-50/50',
        cardAccentBgDark: 'bg-fuchsia-500/5',
        statPositive: 'text-emerald-600',
        statNegative: 'text-red-500',
        featureCardBorder: 'border-fuchsia-100',
        featureCardBorderDark: 'dark:border-fuchsia-500/20',
        featureCardHover: 'hover:border-fuchsia-300 hover:shadow-fuchsia-100',
        featureCardHoverDark: 'dark:hover:border-fuchsia-500/40',
        linkColor: 'text-fuchsia-600',
        linkColorDark: 'text-fuchsia-400',
        linkHover: 'hover:text-fuchsia-700',
        linkHoverDark: 'dark:hover:text-fuchsia-300',
    },
    
    // Warm sunset orange/amber
    sunset: {
        buttonGradient: 'from-orange-500 via-amber-500 to-yellow-400',
        buttonHover: 'hover:from-orange-600 hover:via-amber-600 hover:to-yellow-500',
        headerGradient: 'from-orange-500 via-amber-500 to-yellow-400',
        headerGradientVia: 'via-amber-500',
        sidebarActive: 'bg-amber-50',
        sidebarActiveDark: 'dark:bg-amber-500/15',
        sidebarActiveText: 'text-amber-700',
        sidebarActiveTextDark: 'dark:text-amber-300',
        orbPrimary: 'bg-orange-200/50',
        orbSecondary: 'bg-amber-200/40',
        orbTertiary: 'bg-yellow-200/30',
        orbPrimaryDark: 'bg-orange-500/15',
        orbSecondaryDark: 'bg-amber-500/10',
        orbTertiaryDark: 'bg-yellow-500/10',
        textPrimary: 'text-amber-600',
        textPrimaryDark: 'text-amber-400',
        textSecondary: 'text-orange-600',
        textSecondaryDark: 'text-orange-400',
        borderAccent: 'border-amber-200',
        borderAccentDark: 'border-amber-600/40',
        borderHover: 'hover:border-amber-300',
        borderHoverDark: 'dark:hover:border-amber-500/50',
        ringAccent: 'ring-amber-500/25',
        badgeBg: 'bg-amber-50',
        badgeBgDark: 'bg-amber-500/20',
        badgeText: 'text-amber-700',
        badgeTextDark: 'text-amber-300',
        iconGradient: 'from-orange-500 to-amber-500',
        iconBg: 'bg-amber-100',
        iconBgDark: 'bg-amber-500/20',
        cardHoverBorder: 'hover:border-amber-300',
        cardHoverBorderDark: 'dark:hover:border-amber-500/40',
        cardAccentBg: 'bg-amber-50/50',
        cardAccentBgDark: 'bg-amber-500/5',
        statPositive: 'text-emerald-600',
        statNegative: 'text-red-500',
        featureCardBorder: 'border-amber-100',
        featureCardBorderDark: 'dark:border-amber-500/20',
        featureCardHover: 'hover:border-amber-300 hover:shadow-amber-100',
        featureCardHoverDark: 'dark:hover:border-amber-500/40',
        linkColor: 'text-amber-600',
        linkColorDark: 'text-amber-400',
        linkHover: 'hover:text-amber-700',
        linkHoverDark: 'dark:hover:text-amber-300',
    },
    
    // Soft parrot green/lime
    forest: {
        buttonGradient: 'from-lime-500 via-green-500 to-emerald-400',
        buttonHover: 'hover:from-lime-600 hover:via-green-600 hover:to-emerald-500',
        headerGradient: 'from-lime-500 via-green-500 to-emerald-400',
        headerGradientVia: 'via-green-500',
        sidebarActive: 'bg-lime-50',
        sidebarActiveDark: 'dark:bg-lime-500/15',
        sidebarActiveText: 'text-lime-700',
        sidebarActiveTextDark: 'dark:text-lime-300',
        orbPrimary: 'bg-lime-200/30',
        orbSecondary: 'bg-green-200/25',
        orbTertiary: 'bg-emerald-200/20',
        orbPrimaryDark: 'bg-lime-500/10',
        orbSecondaryDark: 'bg-green-500/8',
        orbTertiaryDark: 'bg-emerald-500/8',
        textPrimary: 'text-lime-600',
        textPrimaryDark: 'text-lime-400',
        textSecondary: 'text-green-600',
        textSecondaryDark: 'text-green-400',
        borderAccent: 'border-lime-200',
        borderAccentDark: 'border-lime-600/40',
        borderHover: 'hover:border-lime-300',
        borderHoverDark: 'dark:hover:border-lime-500/50',
        ringAccent: 'ring-lime-500/25',
        badgeBg: 'bg-lime-50',
        badgeBgDark: 'bg-lime-500/20',
        badgeText: 'text-lime-700',
        badgeTextDark: 'text-lime-300',
        iconGradient: 'from-lime-500 to-green-500',
        iconBg: 'bg-lime-100',
        iconBgDark: 'bg-lime-500/20',
        cardHoverBorder: 'hover:border-lime-300',
        cardHoverBorderDark: 'dark:hover:border-lime-500/40',
        cardAccentBg: 'bg-lime-50/30',
        cardAccentBgDark: 'bg-lime-500/5',
        statPositive: 'text-green-600',
        statNegative: 'text-red-500',
        featureCardBorder: 'border-lime-100',
        featureCardBorderDark: 'dark:border-lime-500/20',
        featureCardHover: 'hover:border-lime-300 hover:shadow-lime-100',
        featureCardHoverDark: 'dark:hover:border-lime-500/40',
        linkColor: 'text-lime-600',
        linkColorDark: 'text-lime-400',
        linkHover: 'hover:text-lime-700',
        linkHoverDark: 'dark:hover:text-lime-300',
    },
};

// Theme display info for the selector
export const THEME_INFO: Record<AccentTheme, { name: string; colors: [string, string, string] }> = {
    indigo: { name: 'Ocean', colors: ['#6366f1', '#3b82f6', '#22d3ee'] },
    aurora: { name: 'Aurora', colors: ['#a855f7', '#d946ef', '#ec4899'] },
    sunset: { name: 'Sunset', colors: ['#f97316', '#f59e0b', '#fbbf24'] },
    forest: { name: 'Forest', colors: ['#84cc16', '#22c55e', '#10b981'] },
};

interface AccentThemeContextType {
    accentTheme: AccentTheme;
    setAccentTheme: (theme: AccentTheme) => void;
    t: ThemeClasses;
}

const AccentThemeContext = createContext<AccentThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'dashboard-accent-theme';

export function AccentThemeProvider({ children }: { children: ReactNode }) {
    const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored in THEME_CLASSES) {
                return stored as AccentTheme;
            }
        }
        return 'indigo';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, accentTheme);
        document.documentElement.setAttribute('data-accent-theme', accentTheme);
    }, [accentTheme]);

    const setAccentTheme = (theme: AccentTheme) => {
        setAccentThemeState(theme);
    };

    const t = THEME_CLASSES[accentTheme];

    return (
        <AccentThemeContext.Provider value={{ accentTheme, setAccentTheme, t }}>
            {children}
        </AccentThemeContext.Provider>
    );
}

export function useAccentTheme() {
    const context = useContext(AccentThemeContext);
    if (!context) {
        throw new Error('useAccentTheme must be used within an AccentThemeProvider');
    }
    return context;
}
