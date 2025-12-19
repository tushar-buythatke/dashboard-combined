import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export function StatBadge({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  className,
}: StatBadgeProps) {
  const variants = {
    default: 'bg-card border-border',
    success: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    danger: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
  };

  const sizes = {
    sm: 'p-2 md:p-3',
    md: 'p-3 md:p-4',
    lg: 'p-4 md:p-6',
  };

  const textSizes = {
    sm: { label: 'text-xs', value: 'text-base md:text-lg' },
    md: { label: 'text-xs md:text-sm', value: 'text-lg md:text-2xl' },
    lg: { label: 'text-sm md:text-base', value: 'text-2xl md:text-3xl' },
  };

  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group',
        variants[variant],
        sizes[size],
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={cn('text-muted-foreground font-medium truncate', textSizes[size].label)}>
            {label}
          </span>
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('font-bold text-foreground truncate', textSizes[size].value)}>
            {value}
          </span>

          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0',
                isPositiveTrend && 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
                isNegativeTrend && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
                !isPositiveTrend && !isNegativeTrend && 'bg-muted text-muted-foreground'
              )}
            >
              {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
              {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
              <span className="whitespace-nowrap">
                {isPositiveTrend && '+'}
                {trend.value}%
                {trend.label && <span className="ml-1 hidden sm:inline">{trend.label}</span>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact Stat Badge for mobile
export function CompactStatBadge({
  value,
  label,
  icon,
  color = 'purple',
}: {
  value: string | number;
  label: string;
  icon?: ReactNode;
  color?: 'purple' | 'green' | 'amber' | 'blue' | 'red';
}) {
  const colors = {
    purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
    green: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium hover:scale-105 active:scale-95 transition-transform duration-150',
        colors[color]
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="font-bold">{value}</span>
      <span className="opacity-80 truncate">{label}</span>
    </div>
  );
}

// Grid of Stats
interface StatsGridProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon?: ReactNode;
    trend?: { value: number; label?: string };
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  }>;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ stats, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-3 md:gap-4', gridCols[columns], className)}>
      {stats.map((stat) => (
        <StatBadge
          key={stat.label}
          {...stat}
        />
      ))}
    </div>
  );
}
