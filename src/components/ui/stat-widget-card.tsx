import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

const ICON_GRADIENTS = {
    default: 'from-indigo-500 to-purple-600 shadow-indigo-500/25',
    success: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    warning: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    info: 'from-blue-500 to-cyan-600 shadow-blue-500/25',
    purple: 'from-purple-500 to-pink-600 shadow-purple-500/25',
};

const BORDER_COLORS = {
    default: 'hover:border-indigo-200/50 dark:hover:border-indigo-500/30',
    success: 'hover:border-emerald-200/50 dark:hover:border-emerald-500/30',
    warning: 'hover:border-amber-200/50 dark:hover:border-amber-500/30',
    info: 'hover:border-blue-200/50 dark:hover:border-blue-500/30',
    purple: 'hover:border-purple-200/50 dark:hover:border-purple-500/30',
};

const SPARKLINE_COLORS = {
    default: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#A855F7',
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
    const isPositiveTrend = trend && trend.value > 0;
    const isNegativeTrend = trend && trend.value < 0;

    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4 md:p-5',
        lg: 'p-5 md:p-6',
    };

    const valueSizes = {
        sm: 'text-lg md:text-xl',
        md: 'text-xl md:text-2xl',
        lg: 'text-2xl md:text-3xl',
    };

    return (
        <div
            className={cn(
                'bg-white dark:bg-slate-900/90',
                'border border-slate-200/80 dark:border-slate-700/50',
                'rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]',
                'transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-lg',
                BORDER_COLORS[variant],
                sizeClasses[size],
                className
            )}
        >
            {/* Header with icon */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium truncate">
                        {label}
                    </p>
                </div>
                {icon && (
                    <div
                        className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            'bg-gradient-to-br shadow-lg',
                            ICON_GRADIENTS[variant]
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
                            'font-bold text-slate-900 dark:text-white truncate',
                            valueSizes[size]
                        )}
                    >
                        {value}
                    </p>

                    {trend && (
                        <div
                            className={cn(
                                'inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full',
                                isPositiveTrend && 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                                isNegativeTrend && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
                                !isPositiveTrend && !isNegativeTrend && 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            )}
                        >
                            {isPositiveTrend && <TrendingUp className="w-3 h-3" />}
                            {isNegativeTrend && <TrendingDown className="w-3 h-3" />}
                            <span>
                                {isPositiveTrend && '+'}
                                {trend.value}%
                                {trend.label && <span className="ml-1 opacity-80">{trend.label}</span>}
                            </span>
                        </div>
                    )}
                </div>

                {/* Sparkline */}
                {sparklineData && sparklineData.length > 1 && (
                    <div className="flex-shrink-0">
                        <MiniSparkline
                            data={sparklineData}
                            color={SPARKLINE_COLORS[variant]}
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
        <div className={cn('grid gap-4', gridCols[columns], className)}>
            {children}
        </div>
    );
}
