import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'bordered' | 'glow';
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
    'default': 'bg-card border border-border/50',
    'glass': 'glass-card backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/20 dark:border-white/10',
    'gradient': 'bg-gradient-to-br from-purple-50/80 via-white to-pink-50/80 dark:from-purple-950/30 dark:via-slate-900 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-500/20',
    'bordered': 'bg-card border-2 border-border',
    'glow': 'bg-card border border-primary/30 shadow-lg shadow-primary/10'
  };

  return (
    <motion.div
      whileHover={hover ? { 
        y: -4,
        boxShadow: glow ? '0 20px 40px rgba(147, 51, 234, 0.15)' : '0 12px 24px rgba(0, 0, 0, 0.08)'
      } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 md:p-6 relative group overflow-hidden transition-all duration-300",
        variants[variant],
        hover && "hover:ring-2 hover:ring-primary/20",
        glow && "glow-primary",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Shimmer effect on hover */}
      {hover && (
        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  iconColor?: string;
}

export function CardHeader({ 
  icon, 
  title, 
  subtitle, 
  actions, 
  badge,
  iconColor = "from-purple-500 to-violet-600"
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4 md:mb-6">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <motion.div 
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0",
              iconColor
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {icon}
          </motion.div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h3>
            {badge}
          </div>
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
      "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4",
      className
    )}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex flex-col p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
            {stat.icon}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-bold text-foreground truncate">{stat.value}</span>
            {stat.trend && (
              <span className={cn(
                "text-xs font-semibold",
                stat.trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {stat.trend.positive ? '↑' : '↓'}{Math.abs(stat.trend.value)}%
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
