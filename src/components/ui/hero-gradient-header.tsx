import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccentTheme } from '@/contexts/AccentThemeContext';

interface HeroGradientHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    stats?: Array<{
        label: string;
        value: string | number;
    }>;
    actions?: ReactNode;
    className?: string;
    children?: ReactNode;
}

export function HeroGradientHeader({
    title,
    subtitle,
    icon,
    stats,
    actions,
    className,
    children,
}: HeroGradientHeaderProps) {
    const { isAutosnipe } = useTheme();
    const { t } = useAccentTheme();
    
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl md:rounded-3xl',
                'bg-gradient-to-r shadow-xl',
                isAutosnipe 
                    ? 'from-[#0a0a0a] via-[#052e16] to-[#0a0a0a] shadow-green-500/10 border border-green-500/20' 
                    : t.headerGradient,
                className
            )}
        >
            {/* Glassmorphic background layers */}
            <div className="absolute inset-0 overflow-hidden">
                {isAutosnipe ? (
                    <>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl" />
                        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-green-400/10 rounded-full blur-2xl" />
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
                    </>
                ) : (
                    <>
                        {/* Soft gradient orbs for depth */}
                        <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                        {/* Subtle top highlight */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    </>
                )}
            </div>

            {/* Content container with padding */}
            <div className="relative z-10 p-5 md:p-7">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div
                                className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center",
                                    "backdrop-blur-xl shadow-lg border",
                                    isAutosnipe 
                                        ? "bg-green-500/20 border-green-500/40 shadow-green-500/10" 
                                        : "bg-white/15 border-white/20 shadow-white/5"
                                )}
                            >
                                {icon}
                            </div>
                        )}
                        <div>
                            <h1
                                className={cn(
                                    "text-xl md:text-2xl lg:text-3xl font-bold tracking-tight",
                                    isAutosnipe ? "text-green-400" : "text-white"
                                )}
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p
                                    className={cn(
                                        "text-sm md:text-base mt-0.5 font-medium",
                                        isAutosnipe ? "text-green-300/70" : "text-white/70"
                                    )}
                                >
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {actions && (
                        <div className="flex flex-wrap items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                {stats && stats.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className={cn(
                                    "rounded-xl p-3 md:p-4 border transition-all duration-200",
                                    "backdrop-blur-xl",
                                    isAutosnipe
                                        ? "bg-green-500/10 border-green-500/25 hover:border-green-400/40 hover:bg-green-500/15"
                                        : "bg-white/10 border-white/15 hover:border-white/25 hover:bg-white/15"
                                )}
                            >
                                <p className={cn(
                                    "text-[10px] md:text-xs uppercase tracking-wider font-semibold",
                                    isAutosnipe ? "text-green-300/60" : "text-white/60"
                                )}>
                                    {stat.label}
                                </p>
                                <p className={cn(
                                    "text-lg md:text-xl lg:text-2xl font-bold mt-0.5",
                                    isAutosnipe ? "text-green-400" : "text-white"
                                )}>
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Children content */}
                {children}
            </div>
        </div>
    );
}

// Compact version for smaller areas
export function HeroGradientBanner({
    title,
    subtitle,
    icon,
    className,
}: Omit<HeroGradientHeaderProps, 'stats' | 'actions' | 'children'>) {
    const { t } = useAccentTheme();
    
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl px-4 py-3 md:px-5 md:py-4',
                'bg-gradient-to-r shadow-lg',
                t.headerGradient,
                className
            )}
        >
            {/* Background orb */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>

            <div className="relative z-10 flex items-center gap-3">
                {icon && (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-base md:text-lg font-semibold text-white">{title}</h3>
                    {subtitle && (
                        <p className="text-white/65 text-sm">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
