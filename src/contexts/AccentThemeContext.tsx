import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useTheme } from '@/components/theme/theme-provider';

export type AccentTheme = 'indigo' | 'aurora' | 'sunset' | 'forest' | 'midnight' | 'afterhours' | 'auto';

// Theme classes that can be used directly in components
interface ThemeClasses {
    // Primary button/gradient - the main CTA gradient
    buttonGradient: string;
    buttonHover: string;

    // Header gradient - main hero sections
    headerGradient: string;
    headerGradientVia: string; // For 3-color gradients
    landingTitleGradient: string; // New gradient specifically for the main page title

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

    // Surface colors for Skins
    pageBg: string;
    sidebarBg: string;
    cardBg: string;
    headerBg: string;
    textBase: string;
    textMuted: string;

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

const THEME_CLASSES: Record<Exclude<AccentTheme, 'auto'>, ThemeClasses> = {
    // Clean professional blue/indigo
    indigo: {
        buttonGradient: 'from-indigo-500 via-blue-500 to-cyan-400',
        buttonHover: 'hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-500',
        headerGradient: 'from-indigo-600 via-blue-500 to-cyan-400',
        headerGradientVia: 'via-blue-500',
        landingTitleGradient: 'from-indigo-600 via-blue-500 to-cyan-400',
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

        // Surfaces
        pageBg: 'bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20',
        sidebarBg: 'bg-white/80 dark:bg-gray-950/40 backdrop-blur-xl',
        cardBg: 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl',
        headerBg: 'bg-white/20 dark:bg-gray-900/20 backdrop-blur-2xl',
        textBase: 'text-slate-900 dark:text-slate-100',
        textMuted: 'text-slate-500 dark:text-slate-400',
    },

    // Vibrant purple-pink aurora (the sexy one!)
    aurora: {
        buttonGradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
        buttonHover: 'hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600',
        headerGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
        headerGradientVia: 'via-fuchsia-500',
        landingTitleGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
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

        // Surfaces
        pageBg: 'bg-gradient-to-br from-fuchsia-50/30 via-white to-purple-50/30 dark:from-gray-950 dark:via-purple-950/10 dark:to-gray-950',
        sidebarBg: 'bg-white/80 dark:bg-purple-950/20 backdrop-blur-xl',
        cardBg: 'bg-white/70 dark:bg-purple-900/20 backdrop-blur-xl',
        headerBg: 'bg-white/20 dark:bg-purple-900/10 backdrop-blur-2xl',
        textBase: 'text-slate-900 dark:text-fuchsia-50',
        textMuted: 'text-slate-500 dark:text-fuchsia-300/60',
    },

    // Warm sunset orange/amber
    sunset: {
        buttonGradient: 'from-orange-500 via-amber-500 to-yellow-400',
        buttonHover: 'hover:from-orange-600 hover:via-amber-600 hover:to-yellow-500',
        headerGradient: 'from-orange-500 via-amber-500 to-yellow-400',
        headerGradientVia: 'via-amber-500',
        landingTitleGradient: 'from-orange-500 via-amber-500 to-yellow-400',
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

        // Surfaces
        pageBg: 'bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-gray-950 dark:via-amber-950/10 dark:to-gray-950',
        sidebarBg: 'bg-white/80 dark:bg-amber-950/20 backdrop-blur-xl',
        cardBg: 'bg-white/70 dark:bg-amber-900/20 backdrop-blur-xl',
        headerBg: 'bg-white/20 dark:bg-amber-900/10 backdrop-blur-2xl',
        textBase: 'text-slate-900 dark:text-amber-50',
        textMuted: 'text-slate-500 dark:text-amber-300/60',
    },

    // Soft parrot green/lime
    forest: {
        buttonGradient: 'from-lime-500 via-green-500 to-emerald-400',
        buttonHover: 'hover:from-lime-600 hover:via-green-600 hover:to-emerald-500',
        headerGradient: 'from-lime-500 via-green-500 to-emerald-400',
        headerGradientVia: 'via-green-500',
        landingTitleGradient: 'from-lime-500 via-green-500 to-emerald-400',
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

        // Surfaces
        pageBg: 'bg-gradient-to-br from-lime-50/30 via-white to-emerald-50/30 dark:from-gray-950 dark:via-emerald-950/10 dark:to-gray-950',
        sidebarBg: 'bg-white/80 dark:bg-emerald-950/20 backdrop-blur-xl',
        cardBg: 'bg-white/70 dark:bg-emerald-900/20 backdrop-blur-xl',
        headerBg: 'bg-white/20 dark:bg-emerald-900/10 backdrop-blur-2xl',
        textBase: 'text-slate-900 dark:text-emerald-50',
        textMuted: 'text-slate-500 dark:text-emerald-300/60',
    },

    // Midnight Velvet - Deep Royal Purple & Navy (AMOLED friendly)
    midnight: {
        buttonGradient: 'from-indigo-600 via-midnight-deep to-midnight-lavender',
        buttonHover: 'hover:from-indigo-700 hover:via-indigo-900 hover:to-midnight-lavender',
        headerGradient: 'from-midnight-navy via-indigo-950 to-midnight-deep', // Reverted to dark for banner
        headerGradientVia: 'via-indigo-950',
        landingTitleGradient: 'from-indigo-300 via-purple-300 to-indigo-300', // Bright pastel for landing title
        sidebarActive: 'bg-midnight-lavender/10',
        sidebarActiveDark: 'dark:bg-midnight-lavender/15',
        sidebarActiveText: 'text-white', // Improved visibility
        sidebarActiveTextDark: 'dark:text-white',
        orbPrimary: 'bg-midnight-deep/30',
        orbSecondary: 'bg-indigo-900/25',
        orbTertiary: 'bg-midnight-lavender/20',
        orbPrimaryDark: 'bg-midnight-lavender/10',
        orbSecondaryDark: 'bg-indigo-500/10',
        orbTertiaryDark: 'bg-midnight-deep/15',
        textPrimary: 'text-midnight-lavender',
        textPrimaryDark: 'text-midnight-lavender',
        textSecondary: 'text-indigo-400',
        textSecondaryDark: 'text-indigo-300',
        borderAccent: 'border-midnight-lavender/30',
        borderAccentDark: 'border-midnight-lavender/20',
        borderHover: 'hover:border-midnight-lavender/50',
        borderHoverDark: 'dark:hover:border-midnight-lavender/40',
        ringAccent: 'ring-midnight-lavender/25',
        badgeBg: 'bg-midnight-lavender/10',
        badgeBgDark: 'bg-midnight-lavender/20',
        badgeText: 'text-midnight-lavender',
        badgeTextDark: 'text-midnight-lavender',
        iconGradient: 'from-indigo-500 to-midnight-lavender',
        iconBg: 'bg-midnight-deep',
        iconBgDark: 'bg-midnight-lavender/10',
        cardHoverBorder: 'hover:border-midnight-lavender/40',
        cardHoverBorderDark: 'dark:hover:border-midnight-lavender/30',
        cardAccentBg: 'bg-midnight-lavender/5',
        cardAccentBgDark: 'bg-midnight-lavender/5',
        statPositive: 'text-emerald-400',
        statNegative: 'text-rose-500',
        featureCardBorder: 'border-indigo-900/50',
        featureCardBorderDark: 'dark:border-indigo-500/20',
        featureCardHover: 'hover:border-midnight-lavender/40 hover:shadow-midnight-lavender/10',
        featureCardHoverDark: 'dark:hover:border-midnight-lavender/30',
        linkColor: 'text-midnight-lavender',
        linkColorDark: 'text-midnight-lavender',
        linkHover: 'hover:text-white',
        linkHoverDark: 'dark:hover:text-white',

        // Surfaces (Deep Midnight/Neutral)
        pageBg: 'bg-black dark:bg-black',
        sidebarBg: 'bg-[#0f0b1e]/95 dark:bg-[#0f0b1e]/95 backdrop-blur-3xl', // Very subtle purple tint
        cardBg: 'bg-gray-900/50 dark:bg-gray-900/50 backdrop-blur-2xl border-indigo-500/20',
        headerBg: 'bg-black/40 dark:bg-black/60 backdrop-blur-2xl',
        textBase: 'text-white', // Maximum visibility
        textMuted: 'text-gray-300',
    },

    // After Hours - Cyber Lime & Charcoal
    afterhours: {
        buttonGradient: 'from-afterhours-lime via-afterhours-slate to-afterhours-charcoal',
        buttonHover: 'hover:from-afterhours-lime hover:via-afterhours-charcoal hover:to-black',
        headerGradient: 'from-afterhours-charcoal via-afterhours-slate to-black', // Reverted to dark for banner
        headerGradientVia: 'via-afterhours-slate',
        landingTitleGradient: 'from-afterhours-lime via-emerald-200 to-afterhours-lime', // Bright lime for landing title
        sidebarActive: 'bg-afterhours-lime/10',
        sidebarActiveDark: 'dark:bg-afterhours-lime/15',
        sidebarActiveText: 'text-white', // Improved visibility
        sidebarActiveTextDark: 'dark:text-white',
        orbPrimary: 'bg-afterhours-lime/20',
        orbSecondary: 'bg-afterhours-slate/30',
        orbTertiary: 'bg-black/40',
        orbPrimaryDark: 'bg-afterhours-lime/10',
        orbSecondaryDark: 'bg-afterhours-slate/15',
        orbTertiaryDark: 'bg-black/20',
        textPrimary: 'text-afterhours-lime',
        textPrimaryDark: 'text-afterhours-lime',
        textSecondary: 'text-afterhours-slate',
        textSecondaryDark: 'text-gray-400',
        borderAccent: 'border-afterhours-lime/30',
        borderAccentDark: 'border-afterhours-lime/20',
        borderHover: 'hover:border-afterhours-lime/50',
        borderHoverDark: 'dark:hover:border-afterhours-lime/40',
        ringAccent: 'ring-afterhours-lime/25',
        badgeBg: 'bg-afterhours-lime/10',
        badgeBgDark: 'bg-afterhours-lime/20',
        badgeText: 'text-afterhours-lime',
        badgeTextDark: 'text-afterhours-lime',
        iconGradient: 'from-afterhours-lime to-afterhours-slate',
        iconBg: 'bg-afterhours-charcoal',
        iconBgDark: 'bg-afterhours-charcoal',
        cardHoverBorder: 'hover:border-afterhours-lime/40',
        cardHoverBorderDark: 'dark:hover:border-afterhours-lime/30',
        cardAccentBg: 'bg-afterhours-lime/5',
        cardAccentBgDark: 'bg-afterhours-lime/5',
        statPositive: 'text-afterhours-lime',
        statNegative: 'text-red-500',
        featureCardBorder: 'border-afterhours-slate/50',
        featureCardBorderDark: 'dark:border-afterhours-lime/20',
        featureCardHover: 'hover:border-afterhours-lime/40 hover:shadow-afterhours-lime/10',
        featureCardHoverDark: 'dark:hover:border-afterhours-lime/30',
        linkColor: 'text-afterhours-lime',
        linkColorDark: 'text-afterhours-lime',
        linkHover: 'hover:text-white',
        linkHoverDark: 'dark:hover:text-white',

        // Surfaces (Cyber/Neutral)
        pageBg: 'bg-black dark:bg-black',
        sidebarBg: 'bg-[#0a0a0a]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl',
        cardBg: 'bg-gray-900/50 dark:bg-gray-900/50 backdrop-blur-2xl border-afterhours-lime/15',
        headerBg: 'bg-black/40 dark:bg-black/60 backdrop-blur-2xl',
        textBase: 'text-white', // Maximum visibility
        textMuted: 'text-gray-300',
    },
};

// Theme display info for the selector
export const THEME_INFO: Record<Exclude<AccentTheme, 'auto'>, { name: string; colors: [string, string, string] }> = {
    indigo: { name: 'Ocean', colors: ['#6366f1', '#3b82f6', '#22d3ee'] },
    aurora: { name: 'Aurora', colors: ['#a855f7', '#d946ef', '#ec4899'] },
    sunset: { name: 'Sunset', colors: ['#f97316', '#f59e0b', '#fbbf24'] },
    forest: { name: 'Forest', colors: ['#84cc16', '#22c55e', '#10b981'] },
    midnight: { name: 'Midnight', colors: ['#1a103c', '#4338ca', '#b19cd9'] },
    afterhours: { name: 'Cyber', colors: ['#afff00', '#2d3436', '#121212'] },
};

export const CLASSIC_THEMES: Array<Exclude<AccentTheme, 'auto'>> = ['indigo', 'aurora', 'sunset', 'forest'];
export const PREMIUM_THEMES: Array<Exclude<AccentTheme, 'auto'>> = ['midnight', 'afterhours'];

interface AccentThemeContextType {
    accentTheme: AccentTheme;
    actualTheme: Exclude<AccentTheme, 'auto'>; // The real theme being displayed (resolved from auto)
    setAccentTheme: (theme: AccentTheme) => void;
    isAutoRotate: boolean;
    toggleAutoRotate: () => void;
    t: ThemeClasses;
}

const AccentThemeContext = createContext<AccentThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'dashboard-accent-theme';
const STORAGE_KEY_DATA = 'dashboard-accent-theme-data';
const ROTATION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ROTATION_THEME_ORDER = CLASSIC_THEMES;

function getNextTheme(current: Exclude<AccentTheme, 'auto'>, isDark: boolean): Exclude<AccentTheme, 'auto'> {
    // In dark mode, we rotate through ALL themes (Classic + Premium)
    // In light mode, we only rotate through Classic themes (since Premium themes force dark mode)
    const pool = isDark ? [...CLASSIC_THEMES, ...PREMIUM_THEMES] : CLASSIC_THEMES;

    const currentIndex = pool.indexOf(current as any);
    if (currentIndex === -1) return pool[0];
    const nextIndex = (currentIndex + 1) % pool.length;
    return pool[nextIndex];
}

export function AccentThemeProvider({ children }: { children: ReactNode }) {
    const { mode, setMode } = useTheme();

    // isAutoRotate: true means auto-rotate mode, false means user has manually selected a theme
    const [isAutoRotate, setIsAutoRotate] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const storedData = localStorage.getItem(STORAGE_KEY_DATA);
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData);
                    return parsed.isAutoRotate !== false; // default to true
                } catch {
                    return true;
                }
            }
        }
        return true; // Default to auto-rotate
    });

    // The actual displayed theme (resolved from auto-rotation or user selection)
    const [displayedTheme, setDisplayedTheme] = useState<Exclude<AccentTheme, 'auto'>>(() => {
        if (typeof window !== 'undefined') {
            const storedData = localStorage.getItem(STORAGE_KEY_DATA);
            if (storedData) {
                try {
                    const { theme, lastRotated, isAutoRotate: storedAuto } = JSON.parse(storedData);
                    const elapsed = Date.now() - lastRotated;
                    const actualTheme = theme === 'auto' ? 'indigo' : theme;

                    // Only auto-rotate if isAutoRotate is true
                    if (storedAuto !== false && elapsed >= ROTATION_INTERVAL_MS) {
                        const nextTheme = getNextTheme(actualTheme as Exclude<AccentTheme, 'auto'>, mode === 'dark');
                        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
                            theme: 'auto',
                            displayedTheme: nextTheme,
                            lastRotated: Date.now(),
                            isAutoRotate: true
                        }));
                        return nextTheme;
                    }
                    // Return stored displayed theme or fallback
                    return (theme === 'auto' ? (JSON.parse(storedData).displayedTheme || 'indigo') : theme) as Exclude<AccentTheme, 'auto'>;
                } catch {
                    // Fall through
                }
            }

            // Migrate from old format
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored in THEME_CLASSES) {
                localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
                    theme: stored,
                    displayedTheme: stored,
                    lastRotated: Date.now(),
                    isAutoRotate: false // Old users had manual selection
                }));
                return stored as Exclude<AccentTheme, 'auto'>;
            }
        }
        // Default - auto rotate with indigo
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
                theme: 'auto',
                displayedTheme: 'indigo',
                lastRotated: Date.now(),
                isAutoRotate: true
            }));
        }
        return 'indigo';
    });



    // The accentTheme is 'auto' when auto-rotating, otherwise the specific theme
    const accentTheme: AccentTheme = isAutoRotate ? 'auto' : displayedTheme;

    // Force dark mode for premium themes
    useEffect(() => {
        if (PREMIUM_THEMES.includes(displayedTheme) && mode !== 'dark') {
            setMode('dark');
        }
    }, [displayedTheme, mode, setMode]);

    useEffect(() => {
        // Save state
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
            theme: isAutoRotate ? 'auto' : displayedTheme,
            displayedTheme: displayedTheme,
            lastRotated: Date.now(),
            isAutoRotate
        }));
        localStorage.setItem(STORAGE_KEY, displayedTheme);
        document.documentElement.setAttribute('data-accent-theme', displayedTheme);
    }, [displayedTheme, isAutoRotate]);

    const setAccentTheme = (theme: AccentTheme) => {
        if (theme === 'auto') {
            // Enable auto-rotate
            setIsAutoRotate(true);
            // Keep current displayed theme but mark as auto
        } else {
            // User manually selected a theme - disable auto-rotate
            setIsAutoRotate(false);
            setDisplayedTheme(theme);
        }
    };

    const toggleAutoRotate = () => {
        setIsAutoRotate(prev => !prev);
    };

    const t = THEME_CLASSES[displayedTheme];

    return (
        <AccentThemeContext.Provider value={{
            accentTheme,
            actualTheme: displayedTheme,
            setAccentTheme,
            isAutoRotate,
            toggleAutoRotate,
            t
        }}>
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
