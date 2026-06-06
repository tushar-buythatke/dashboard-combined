/**
 * Shared chart theming for Recharts — premium UI upgrade (Foundation).
 *
 * Reads the design tokens defined in `src/index.css` at runtime so charts stay
 * in sync with the active accent theme (and light/dark). Use `useChartColors()`
 * inside chart components; it re-resolves whenever the accent theme changes.
 */
import { useMemo } from 'react';
import { useAccentTheme } from '@/contexts/AccentThemeContext';
import { useTheme } from '@/components/theme/theme-provider';

/** Fallback ordered palette (matches the CSS `--chart-color-*` defaults). */
export const FALLBACK_CHART_PALETTE = [
    '#6c47ff', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#a855f7', '#f97316', '#84cc16', '#ec4899', '#3b82f6',
] as const;

export interface ChartColors {
    /** Ordered multi-series palette (vivid, never muddy). */
    palette: string[];
    /** Active accent ramp as ready-to-use `hsl(...)` strings. */
    accentPrimary: string;
    accentSecondary: string;
    accentTertiary: string;
    /** Amber average-line color. */
    avg: string;
    /** Faint grid line color (theme-aware). */
    grid: string;
    /** Muted axis label color (theme-aware). */
    axis: string;
    /** Surface color used for donut segment gap strokes. */
    surface: string;
}

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
    const v = styles.getPropertyValue(name).trim();
    return v || fallback;
}

/** Wrap an `H S% L%` triplet token as a usable `hsl()` color. */
function hslVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
    const v = styles.getPropertyValue(name).trim();
    return v ? `hsl(${v})` : fallback;
}

/**
 * Resolve the current chart colors from CSS variables. Returns sensible
 * fallbacks during SSR / before mount.
 */
export function resolveChartColors(): ChartColors {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return {
            palette: [...FALLBACK_CHART_PALETTE],
            accentPrimary: '#6c47ff',
            accentSecondary: '#a855f7',
            accentTertiary: '#ec4899',
            avg: '#f59e0b',
            grid: 'rgba(0,0,0,0.06)',
            axis: 'rgba(0,0,0,0.42)',
            surface: '#ffffff',
        };
    }

    const styles = getComputedStyle(document.documentElement);
    const palette = FALLBACK_CHART_PALETTE.map((fallback, i) =>
        readVar(styles, `--chart-color-${i + 1}`, fallback),
    );
    const isDark = document.documentElement.classList.contains('dark');

    return {
        palette,
        accentPrimary: hslVar(styles, '--accent-primary', '#6c47ff'),
        accentSecondary: hslVar(styles, '--accent-secondary', '#a855f7'),
        accentTertiary: hslVar(styles, '--accent-tertiary', '#ec4899'),
        avg: readVar(styles, '--chart-avg', '#f59e0b'),
        grid: readVar(styles, '--chart-grid', isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
        axis: readVar(styles, '--chart-axis', isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)'),
        surface: readVar(styles, '--dash-card-bg', isDark ? '#0f172a' : '#ffffff'),
    };
}

/**
 * Hook returning the active chart colors. Re-resolves when the accent theme or
 * light/dark mode changes, so a theme switch recolors every chart cohesively.
 */
export function useChartColors(): ChartColors {
    const { actualTheme } = useAccentTheme();
    const { mode } = useTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => resolveChartColors(), [actualTheme, mode]);
}

/** Shared Recharts axis style (muted, small). */
export const AXIS_TICK_STYLE = { fontSize: 11, fontWeight: 400 } as const;

/** Standard grid props: faint, dashed, horizontal-only. */
export function gridProps(grid: string) {
    return { vertical: false, strokeDasharray: '4 4', stroke: grid } as const;
}

/**
 * Build the `<stop>` pairs for a 30%→0% vertical area-fill gradient.
 * Pair with a `<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">`.
 */
export const AREA_FILL_TOP_OPACITY = 0.3;
export const AREA_FILL_BOTTOM_OPACITY = 0;
