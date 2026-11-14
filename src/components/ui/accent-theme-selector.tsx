import { useAccentTheme, THEME_INFO, type AccentTheme, PREMIUM_THEMES } from '@/contexts/AccentThemeContext';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';

/* ─────────────────────────────────────────────────
   Keyframe injected once into <head> (avoids a
   separate CSS file while staying Tailwind-friendly).
   Respects prefers-reduced-motion via the media query
   wrapping the spin animation.
───────────────────────────────────────────────── */
const STYLE_ID = 'accent-theme-selector-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
@keyframes ats-slide-down {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes ats-conic-spin {
  to { transform: rotate(360deg); }
}
.ats-popup {
  animation: ats-slide-down 200ms cubic-bezier(0.16,1,0.3,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .ats-popup { animation: none; }
  .ats-auto-swatch:hover .ats-conic { animation: none !important; }
}
.ats-auto-swatch:hover .ats-conic {
  animation: ats-conic-spin 1.4s linear infinite;
}
`;
    document.head.appendChild(style);
}

export function AccentThemeSelector({ className }: { className?: string }) {
    const { accentTheme, setAccentTheme, isAutoRotate } = useAccentTheme();
    const { mode } = useTheme();

    // Filter themes: hide premium themes in light mode
    const visibleThemes = (
        Object.entries(THEME_INFO) as [
            Exclude<AccentTheme, 'auto'>,
            (typeof THEME_INFO)[Exclude<AccentTheme, 'auto'>],
        ][]
    ).filter(([key]) => {
        if (mode === 'light' && PREMIUM_THEMES.includes(key)) return false;
        return true;
    });

    const isDark = mode === 'dark';

    return (
        <DropdownMenu>
            {/* ── Trigger ── */}
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        'rounded-full h-8 w-8',
                        'border border-gray-200 dark:border-gray-700',
                        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
                        'shadow-sm hover:scale-105 hover:shadow-md',
                        'transition-all duration-200',
                        className,
                    )}
                >
                    <Palette className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </Button>
            </DropdownMenuTrigger>

            {/* ── Popup ── */}
            <DropdownMenuContent
                align="end"
                sideOffset={8}
                /* Frosted glass popup — overrides shadcn defaults via inline style
                   so we don't rely on Tailwind's JIT for arbitrary backdrop values */
                style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    background: isDark ? 'rgba(20,20,30,0.85)' : 'rgba(255,255,255,0.85)',
                    border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.50)'}`,
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
                className="ats-popup w-56 p-3 z-[110]"
            >
                {/* Section label */}
                <div className="text-[10px] uppercase tracking-widest font-semibold px-1 pb-2.5 text-gray-400 dark:text-gray-500 select-none">
                    Accent Theme
                </div>

                {/* ── Swatch grid ── */}
                <div className="grid grid-cols-4 gap-2.5 px-0.5">

                    {/* Auto-rotate swatch */}
                    <button
                        type="button"
                        aria-label="Auto-rotate themes"
                        onClick={() => setAccentTheme('auto')}
                        className={cn(
                            'ats-auto-swatch',
                            'group relative flex flex-col items-center gap-1 rounded-lg p-1 pt-1.5',
                            'transition-colors duration-150 cursor-pointer',
                            'hover:bg-white/40 dark:hover:bg-white/5',
                        )}
                    >
                        {/* Swatch circle */}
                        <div className="relative flex-shrink-0">
                            {/* Glow ring — only visible when active */}
                            {isAutoRotate && (
                                <span
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        boxShadow: '0 0 0 2.5px rgba(139,111,248,0.90)',
                                        borderRadius: '50%',
                                    }}
                                />
                            )}
                            {/* Conic circle — static, spins on hover via CSS */}
                            <div
                                className="ats-conic w-9 h-9 rounded-full"
                                style={{
                                    background: 'conic-gradient(#6366f1 0deg, #a855f7 72deg, #ec4899 144deg, #f97316 216deg, #22c55e 288deg, #6366f1 360deg)',
                                }}
                            />
                            {/* Active checkmark badge */}
                            {isAutoRotate && (
                                <span
                                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(139,111,248,1)' }}
                                >
                                    {/* Mini SVG tick — avoids importing lucide just for this */}
                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                                        <path d="M1.5 4L3.2 5.8L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none text-center select-none">
                            Auto
                        </span>
                    </button>

                    {/* Theme swatches */}
                    {visibleThemes.map(([key, theme]) => {
                        const isActive = !isAutoRotate && accentTheme === key;
                        // Build glow color from the first color in the palette
                        const glowColor = theme.colors[0];

                        return (
                            <button
                                key={key}
                                type="button"
                                aria-label={`${theme.name} theme`}
                                onClick={() => setAccentTheme(key)}
                                className={cn(
                                    'group relative flex flex-col items-center gap-1 rounded-lg p-1 pt-1.5',
                                    'transition-colors duration-150 cursor-pointer',
                                    'hover:bg-white/40 dark:hover:bg-white/5',
                                )}
                            >
                                {/* Swatch circle */}
                                <div className="relative flex-shrink-0">
                                    {/* Active glow ring */}
                                    {isActive && (
                                        <span
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                boxShadow: `0 0 0 2.5px ${glowColor}`,
                                                borderRadius: '50%',
                                            }}
                                        />
                                    )}

                                    {/* Gradient circle with hover scale + glow */}
                                    <div
                                        className={cn(
                                            'w-9 h-9 rounded-full',
                                            'transition-[transform,box-shadow] duration-200',
                                            'group-hover:scale-[1.15]',
                                        )}
                                        style={{
                                            background: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 50%, ${theme.colors[2]} 100%)`,
                                        }}
                                        /* Hover glow is applied via a pseudo approach: we use a JS-driven
                                           inline style on a sibling element to avoid Tailwind arbitrary
                                           opacity issues with dynamic colors. Instead we use CSS group-hover
                                           and a transparent initial box-shadow that blooms on hover. */
                                    />

                                    {/* Hover glow overlay (CSS group-hover via Tailwind is limited with
                                        dynamic colors, so we use a data-attribute trick on the wrapper) */}
                                    <span
                                        className={cn(
                                            'absolute inset-0 rounded-full pointer-events-none',
                                            'opacity-0 group-hover:opacity-100',
                                            'transition-opacity duration-200',
                                        )}
                                        style={{
                                            boxShadow: `0 4px 14px 0 ${glowColor}88`,
                                        }}
                                    />

                                    {/* Active checkmark badge */}
                                    {isActive && (
                                        <span
                                            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                            style={{ background: glowColor }}
                                        >
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
                                                <path d="M1.5 4L3.2 5.8L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </span>
                                    )}
                                </div>

                                <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-none text-center select-none">
                                    {theme.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
