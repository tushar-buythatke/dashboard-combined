import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass' | 'gradient' | 'bordered';
  hover?: boolean;
  delay?: number;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-auto",
      className
    )}>
      {children}
    </div>
  );
}

export function BentoCard({ 
  children, 
  className, 
  span = 'md',
  variant = 'default',
  hover = true,
}: BentoCardProps) {
  const spanClasses = {
    'sm': 'md:col-span-1',
    'md': 'md:col-span-2',
    'lg': 'md:col-span-2 lg:col-span-3',
    'xl': 'md:col-span-2 lg:col-span-3 xl:col-span-4',
    'full': 'col-span-full'
  };

  const variantClasses = {
    'default': 'bg-card border border-border/50 shadow-md hover:shadow-xl',
    'glass': 'glass-card backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/10 shadow-xl',
    'gradient': 'bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950/20 dark:via-slate-900 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-500/20 shadow-lg',
    'bordered': 'bg-card border-2 border-border hover:border-primary/50 shadow-md'
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4 md:p-6 overflow-hidden relative group transition-all duration-150",
        spanClasses[span],
        variantClasses[variant],
        hover && "hover:-translate-y-1 hover:ring-2 hover:ring-primary/20",
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Stats Card for Bento Grid
interface BentoStatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
  iconColor?: string;
  delay?: number;
}

export function BentoStatsCard({ 
  title, 
  value, 
  icon, 
  trend, 
  className,
  iconColor = "from-purple-500 to-violet-600",
}: BentoStatsCardProps) {
  return (
    <BentoCard span="sm" hover className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 truncate">
            {value}
          </h3>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={cn(
                "font-semibold",
                trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div 
          className={cn(
            "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            iconColor
          )}
        >
          {icon}
        </div>
      </div>
    </BentoCard>
  );
}

// Chart Card for Bento Grid
interface BentoChartCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
  span?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  actions?: ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'bordered';
  delay?: number;
}

export function BentoChartCard({ 
  title, 
  subtitle, 
  icon, 
  children, 
  span = 'md',
  actions,
  variant = 'default',
}: BentoChartCardProps) {
  return (
    <BentoCard span={span} variant={variant} hover>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0 ml-2">
            {actions}
          </div>
        )}
      </div>
      <div className="mt-4">
        {children}
      </div>
    </BentoCard>
  );
}
