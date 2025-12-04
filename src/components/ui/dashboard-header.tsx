import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 mb-4 md:mb-6',
        gradient
          ? 'bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 text-white'
          : 'bg-card border border-border/50',
        className
      )}
    >
      {/* Animated background pattern */}
      {gradient && (
        <>
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </>
      )}

      <div className="relative z-10">
        {/* Header Top */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            {icon && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={cn(
                  'flex-shrink-0 h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg',
                  gradient
                    ? 'bg-white/10 backdrop-blur-sm border border-white/20'
                    : 'bg-gradient-to-br from-purple-500 to-violet-600'
                )}
              >
                {icon}
              </motion.div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 md:mb-2 flex-wrap">
                <h1 className={cn(
                  'text-xl md:text-2xl lg:text-3xl font-bold truncate',
                  gradient ? 'text-white' : 'text-foreground'
                )}>
                  {title}
                </h1>
                {badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    {badge}
                  </motion.div>
                )}
              </div>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    'text-sm md:text-base',
                    gradient ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              {actions}
            </motion.div>
          )}
        </div>

        {/* Stats Row */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border-t border-white/10 pt-4 md:pt-6"
          >
            {stats}
          </motion.div>
        )}
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between gap-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40',
        className
      )}
    >
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {icon && (
          <motion.div
            whileHover={{ rotate: 5 }}
            className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md"
          >
            {icon}
          </motion.div>
        )}
        <h1 className="text-base md:text-lg font-semibold text-foreground truncate">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">{actions}</div>}
    </motion.div>
  );
}
