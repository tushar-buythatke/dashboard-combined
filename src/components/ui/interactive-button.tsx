import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  glow?: boolean;
}

export function InteractiveButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className,
  type = 'button',
  glow = false,
}: InteractiveButtonProps) {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    gradient: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/30',
    outline: 'border-2 border-border hover:bg-accent hover:border-primary/50',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group',
        variants[variant],
        sizes[size],
        glow && 'animate-glow-pulse',
        className
      )}
    >
      {/* Shimmer effect */}
      <span className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100" />
      
      {/* Content */}
      <span className="relative flex items-center gap-[inherit]">
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <motion.span
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <motion.span
            initial={{ rotate: 0 }}
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.span>
        )}
      </span>
    </motion.button>
  );
}

// Icon Button with hover effects
interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  className?: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onClick,
  variant = 'default',
  size = 'md',
  tooltip,
  className,
  disabled = false,
}: IconButtonProps) {
  const variants = {
    default: 'bg-card border border-border hover:bg-accent',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-accent',
    danger: 'hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
  };

  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      title={tooltip}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon}
    </motion.button>
  );
}

// Floating Action Button
interface FABProps {
  icon: ReactNode;
  onClick?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  label?: string;
  className?: string;
}

export function FAB({
  icon,
  onClick,
  position = 'bottom-right',
  label,
  className,
}: FABProps) {
  const positions = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={cn(
        'fixed z-50 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-2xl shadow-purple-500/40 flex items-center justify-center group',
        positions[position],
        className
      )}
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-violet-400 opacity-0 group-hover:opacity-20 blur-sm"
      />
      <span className="relative z-10">{icon}</span>
      {label && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: -60 }}
          className="absolute right-16 whitespace-nowrap px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium shadow-lg"
        >
          {label}
        </motion.span>
      )}
    </motion.button>
  );
}
