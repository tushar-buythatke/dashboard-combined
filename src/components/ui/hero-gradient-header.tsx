import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccentTheme } from '@/contexts/AccentThemeContext';

interface HeroGradientHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    lastUpdated?: string;
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
    lastUpdated,
    stats,
    actions,
    className,
    children,
}: HeroGradientHeaderProps) {
    const { isAutosnipe } = useTheme();
    const { t: themeClasses } = useAccentTheme();

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl',
                isAutosnipe
                    ? 'bg-gradient-to-br from-[#0a0a0a] via-[#052e16] to-[#0a0a0a]'
                    : cn('bg-gradient-to-br', themeClasses.buttonGradient),
                className
            )}
        >
            {/* Content container with padding */}
            <div className="relative p-5 md:p-7">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div
                                className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0",
                                    isAutosnipe
                                        ? "bg-green-500/20 border border-green-500/40"
                                        : "bg-white/15 border border-white/20"
                                )}
                            >
                                <span className="text-white">
                                    {icon}
                                </span>
                            </div>
                        )}
                        <div>
                            <h1
                                className={cn(
                                    "text-xl md:text-2xl font-bold tracking-tight text-white",
                                    isAutosnipe && "text-green-400"
                                )}
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p
                                    className={cn(
                                        "text-sm md:text-base mt-0.5 font-medium text-white/70",
                                        isAutosnipe && "text-green-300/70"
                                    )}
                                >
                                    {subtitle}
                                </p>
                            )}
                            {lastUpdated && (
                                <p className="text-xs font-mono text-white/60 mt-1">
                                    Last updated: {lastUpdated}
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
}: Omit<HeroGradientHeaderProps, 'stats' | 'actions' | 'children' | 'lastUpdated'>) {
    const { isAutosnipe } = useTheme();
    const { t: themeClasses } = useAccentTheme();

    return (
        <div
            className={cn(
                'relative overflow-hidden px-4 py-3 md:px-5 md:py-4 rounded-2xl',
                isAutosnipe
                    ? 'bg-gradient-to-br from-[#0a0a0a] via-[#052e16] to-[#0a0a0a]'
                    : cn('bg-gradient-to-br', themeClasses.buttonGradient),
                className
            )}
        >
            <div className="relative flex items-center gap-3">
                {icon && (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                        <span className="text-white">{icon}</span>
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
