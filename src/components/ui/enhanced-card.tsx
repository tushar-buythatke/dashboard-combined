import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'bordered' | 'glow' | 'solid';
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function EnhancedCard({
  children,
  className,
  variant = 'default',
  hover = true,
  glow = false,
  onClick
}: EnhancedCardProps) {
  const variants = {
    'default': 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/50 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/30',
    'glass': 'backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200/50 dark:border-gray-700/40 shadow-lg shadow-gray-200/40 dark:shadow-gray-900/20',
    'gradient': 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 dark:from-indigo-950/30 dark:via-gray-900 dark:to-blue-950/30 border border-indigo-200/50 dark:border-indigo-700/30 backdrop-blur-xl shadow-lg shadow-indigo-200/30 dark:shadow-indigo-900/20',
    'bordered': 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700',
    'glow': 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-indigo-300/50 dark:border-indigo-600/40 shadow-lg shadow-indigo-200/30 dark:shadow-indigo-900/20',
    'solid': 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg'
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 md:p-5 relative group overflow-hidden transition-all duration-300",
        variants[variant],
        hover && "hover:shadow-xl hover:border-indigo-200/80 dark:hover:border-indigo-600/50",
        glow && "ring-2 ring-indigo-500/20 dark:ring-indigo-400/20",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      {/* Subtle gradient orb in background */}
      {(variant === 'gradient' || variant === 'glow') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-100/30 dark:bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-100/30 dark:bg-blue-500/10 rounded-full blur-2xl" />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  iconGradient?: string;
}

export function CardHeader({
  icon,
  title,
  subtitle,
  actions,
  badge,
  iconGradient = "from-indigo-500 to-blue-600"
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div
            className={cn(
              "h-10 w-10 md:h-11 md:w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md flex-shrink-0 transition-transform duration-200 hover:scale-105",
              iconGradient
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0 ml-2">
          {actions}
        </div>
      )}
    </div>
  );
}

interface StatsRowProps {
  stats: {
    label: string;
    value: string | number;
    trend?: {
      value: number;
      positive?: boolean;
    };
    icon?: ReactNode;
  }[];
  className?: string;
}

export function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3",
      className
    )}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/40 hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 truncate uppercase tracking-wide">{stat.label}</span>
            {stat.icon}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{stat.value}</span>
            {stat.trend && (
              <span className={cn(
                "text-xs font-semibold",
                stat.trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              )}>
                {stat.trend.positive ? '+' : ''}{stat.trend.value}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
