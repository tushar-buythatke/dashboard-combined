import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAccentTheme } from '@/contexts/AccentThemeContext';

interface StatWidgetCardProps {
    label: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        label?: string;
    };
    sparklineData?: number[];
    variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

// Fallback variants for non-default themes
const ICON_GRADIENTS_STATIC = {
    success: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    warning: 'from-amber-500 to-orange-600 shadow-amber-500/20',
    info: 'from-blue-500 to-cyan-600 shadow-blue-500/20',
    purple: 'from-violet-500 to-purple-600 shadow-violet-500/20',
};

const BORDER_HOVER_STATIC = {
    success: 'hover:border-emerald-200 dark:hover:border-emerald-600/40',
    warning: 'hover:border-amber-200 dark:hover:border-amber-600/40',
    info: 'hover:border-blue-200 dark:hover:border-blue-600/40',
    purple: 'hover:border-violet-200 dark:hover:border-violet-600/40',
};

const SPARKLINE_COLORS_STATIC = {
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
};

// Accent theme sparkline colors
const ACCENT_SPARKLINE_COLORS: Record<string, string> = {
    indigo: '#6366F1',
    aurora: '#D946EF',
    sunset: '#F97316',
    forest: '#10B981',
};

// Simple inline sparkline SVG - static, no animations
function MiniSparkline({
    data,
    color,
    height = 32
}: {
    data: number[];
    color: string;
    height?: number
}) {
    if (!data || data.length < 2) return null;

    const width = 80;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 2;

    const points = data
        .map((value, index) => {
            const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((value - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle
                cx={width - padding}
                cy={height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)}
                r="3"
                fill={color}
            />
        </svg>
    );
}

export function StatWidgetCard({
    label,
    value,
    icon,
    trend,
    sparklineData,
    variant = 'default',
    size = 'md',
    className,
}: StatWidgetCardProps) {
    const { t, accentTheme } = useAccentTheme();
    const isPositiveTrend = trend && trend.value > 0;
    const isNegativeTrend = trend && trend.value < 0;

    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
    };

    const valueSizes = {
        sm: 'text-lg',
        md: 'text-xl md:text-2xl',
        lg: 'text-2xl md:text-3xl',
    };

    // Get classes based on variant - use theme for default
    const getIconGradient = () => {
        if (variant === 'default') {
            return cn(t.buttonGradient);
        }
        return ICON_GRADIENTS_STATIC[variant];
    };

    const getBorderHover = () => {
        if (variant === 'default') {
            return cn(t.cardHoverBorder, t.cardHoverBorderDark);
        }
        return BORDER_HOVER_STATIC[variant];
    };

    const getSparklineColor = () => {
        if (variant === 'default') {
            return ACCENT_SPARKLINE_COLORS[accentTheme] || '#6366F1';
        }
        return SPARKLINE_COLORS_STATIC[variant];
    };

    return (
        <div
            className={cn(
                'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
                'border border-gray-200/60 dark:border-gray-700/50',
                'rounded-2xl',
                'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/30',
                'transition-all duration-300 hover:shadow-xl',
                getBorderHover(),
                sizeClasses[size],
                className
            )}
        >
            {/* Header with icon */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold truncate">
                        {label}
                    </p>
                </div>
                {icon && (
                    <div
                        className={cn(
                            'w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center',
                            'bg-gradient-to-br shadow-md',
                            getIconGradient()
                        )}
                    >
                        {icon}
                    </div>
                )}
            </div>

            {/* Value and trend */}
            <div className="flex items-end justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p
                        className={cn(
                            'font-bold text-gray-800 dark:text-gray-100 truncate',
                            valueSizes[size]
                        )}
                    >
                        {value}
                    </p>

                    {trend && (
                        <div
                            className={cn(
                                'inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-lg',
                                isPositiveTrend && 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                                isNegativeTrend && 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400',
                                !isPositiveTrend && !isNegativeTrend && 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            )}
                        >
                            {isPositiveTrend && <TrendingUp className="w-3 h-3" />}
                            {isNegativeTrend && <TrendingDown className="w-3 h-3" />}
                            <span>
                                {isPositiveTrend && '+'}
                                {trend.value}%
                                {trend.label && <span className="ml-1 opacity-70">{trend.label}</span>}
                            </span>
                        </div>
                    )}
                </div>

                {/* Sparkline */}
                {sparklineData && sparklineData.length > 1 && (
                    <div className="flex-shrink-0">
                        <MiniSparkline
                            data={sparklineData}
                            color={getSparklineColor()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Grid layout helper for stat widgets
export function StatWidgetGrid({
    children,
    columns = 4,
    className,
}: {
    children: ReactNode;
    columns?: 2 | 3 | 4;
    className?: string;
}) {
    const gridCols = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-4',
    };

    return (
        <div className={cn('grid gap-3', gridCols[columns], className)}>
            {children}
        </div>
    );
}
