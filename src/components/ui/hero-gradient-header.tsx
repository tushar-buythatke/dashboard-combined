import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Zap } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface HeroGradientHeaderProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    stats?: Array<{
        label: string;
        value: string | number;
    }>;
    actions?: ReactNode;
    variant?: 'indigo' | 'purple' | 'blue' | 'gradient' | 'autosnipe';
    className?: string;
    children?: ReactNode;
}

const GRADIENT_VARIANTS = {
    indigo: 'from-[#4F46E5] via-[#6366F1] to-[#818CF8]',
    purple: 'from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA]',
    blue: 'from-[#3B82F6] via-[#6366F1] to-[#8B5CF6]',
    gradient: 'from-[#4F46E5] via-[#7C3AED] to-[#EC4899]',
    autosnipe: 'from-[#0a0a0a] via-[#052e16] to-[#0a0a0a]',
};

export function HeroGradientHeader({
    title,
    subtitle,
    icon,
    stats,
    actions,
    variant = 'gradient',
    className,
    children,
}: HeroGradientHeaderProps) {
    const { isAutosnipe } = useTheme();
    const effectiveVariant = isAutosnipe ? 'autosnipe' : variant;
    
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-3xl p-6 md:p-8',
                'bg-gradient-to-r',
                GRADIENT_VARIANTS[effectiveVariant],
                isAutosnipe 
                    ? 'shadow-[0_10px_40px_rgba(34,197,94,0.2)] border border-green-500/30' 
                    : 'shadow-xl',
                className
            )}
        >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                {isAutosnipe ? (
                    <>
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl" />
                        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-green-400/10 rounded-full blur-xl" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-60" />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-40" />
                    </>
                ) : (
                    <>
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                    </>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div
                                className={cn(
                                    "w-14 h-14 rounded-2xl backdrop-blur-sm flex items-center justify-center shadow-lg",
                                    isAutosnipe 
                                        ? "bg-green-500/30 border border-green-500/50 shadow-green-500/20" 
                                        : "bg-white/20"
                                )}
                            >
                                {icon}
                            </div>
                        )}
                        <div>
                            <h1
                                className={cn(
                                    "text-2xl md:text-3xl font-bold flex items-center gap-2",
                                    isAutosnipe ? "text-green-400" : "text-white"
                                )}
                            >
                                {title}
                                {isAutosnipe ? (
                                    <Zap className="w-5 h-5 text-green-400" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-white/70" />
                                )}
                            </h1>
                            {subtitle && (
                                <p
                                    className={cn(
                                        "text-sm md:text-base mt-1",
                                        isAutosnipe ? "text-green-300/80" : "text-white/80"
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className={cn(
                                    "backdrop-blur-sm rounded-xl p-3 md:p-4 border transition-all duration-150 hover:scale-[1.02]",
                                    isAutosnipe
                                        ? "bg-green-500/10 border-green-500/30 hover:border-green-400/50"
                                        : "bg-white/15 border-white/10"
                                )}
                            >
                                <p className={cn(
                                    "text-xs uppercase tracking-wide font-medium",
                                    isAutosnipe ? "text-green-300/70" : "text-white/70"
                                )}>
                                    {stat.label}
                                </p>
                                <p className={cn(
                                    "text-xl md:text-2xl font-bold mt-1",
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
    variant = 'gradient',
    className,
}: Omit<HeroGradientHeaderProps, 'stats' | 'actions' | 'children'>) {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl px-5 py-4 shadow-lg',
                'bg-gradient-to-r',
                GRADIENT_VARIANTS[variant],
                className
            )}
        >
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10 flex items-center gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    {subtitle && (
                        <p className="text-white/70 text-sm">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
