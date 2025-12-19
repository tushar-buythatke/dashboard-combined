import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  className?: string;
  gradient?: boolean;
}

export function DashboardHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  stats,
  className,
  gradient = false,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 mb-4 md:mb-6',
        gradient
          ? 'bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 text-white'
          : 'bg-card border border-border/50',
        className
      )}
    >
      {/* Static background pattern */}
      {gradient && (
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      )}

      <div className="relative z-10">
        {/* Header Top */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            {icon && (
              <div
                className={cn(
                  'flex-shrink-0 h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg',
                  gradient
                    ? 'bg-white/10 backdrop-blur-sm border border-white/20'
                    : 'bg-gradient-to-br from-purple-500 to-violet-600'
                )}
              >
                {icon}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 md:mb-2 flex-wrap">
                <h1 className={cn(
                  'text-xl md:text-2xl lg:text-3xl font-bold truncate',
                  gradient ? 'text-white' : 'text-foreground'
                )}>
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p
                  className={cn(
                    'text-sm md:text-base',
                    gradient ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="border-t border-white/10 pt-4 md:pt-6">
            {stats}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact mobile header variant
export function CompactDashboardHeader({
  title,
  icon,
  actions,
  className,
}: {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40',
        className
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md">
            {icon}
          </div>
        )}
        <h1 className="text-base md:text-lg font-semibold text-foreground truncate">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
