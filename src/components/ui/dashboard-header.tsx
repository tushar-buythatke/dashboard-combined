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
        'relative overflow-hidden rounded-xl md:rounded-2xl mb-4 md:mb-6',
        gradient
          ? 'bg-gradient-to-r from-indigo-600 via-blue-500 to-violet-500 text-white shadow-xl shadow-indigo-500/10'
          : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/60 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/30',
        className
      )}
    >
      {/* Glassmorphic background effects */}
      {gradient ? (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-indigo-100/40 dark:bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-100/40 dark:bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      )}

      <div className="relative z-10 p-4 md:p-6 lg:p-7">
        {/* Header Top */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 md:mb-5">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            {icon && (
              <div
                className={cn(
                  'flex-shrink-0 h-11 w-11 md:h-13 md:w-13 lg:h-14 lg:w-14 rounded-xl md:rounded-2xl flex items-center justify-center',
                  gradient
                    ? 'bg-white/15 backdrop-blur-xl border border-white/20 shadow-lg shadow-white/5'
                    : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25'
                )}
              >
                {icon}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className={cn(
                  'text-lg md:text-xl lg:text-2xl font-bold tracking-tight truncate',
                  gradient ? 'text-white' : 'text-gray-800 dark:text-gray-100'
                )}>
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p
                  className={cn(
                    'text-sm md:text-base font-medium',
                    gradient ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
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
          <div className={cn(
            "pt-4 md:pt-5",
            gradient 
              ? "border-t border-white/15" 
              : "border-t border-gray-200/80 dark:border-gray-700/60"
          )}>
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
        'flex items-center justify-between gap-3 p-3 md:p-4',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border-b border-gray-200/80 dark:border-gray-700/60',
        'sticky top-0 z-40 shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            {icon}
          </div>
        )}
        <h1 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
