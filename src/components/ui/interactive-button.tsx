import type { ReactNode } from 'react';
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group',
        'hover:scale-[1.02] active:scale-[0.98]',
        variants[variant],
        sizes[size],
        glow && 'animate-glow-pulse',
        className
      )}
    >
      {/* Content */}
      <span className="relative flex items-center gap-[inherit]">
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span>{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <span>{icon}</span>
        )}
      </span>
    </button>
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
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:scale-110 active:scale-90',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon}
    </button>
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
  className,
}: FABProps) {
  const positions = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed z-50 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-2xl shadow-purple-500/40 flex items-center justify-center group',
        'hover:scale-110 active:scale-95 transition-transform duration-150',
        positions[position],
        className
      )}
    >
      <span className="relative z-10">{icon}</span>
    </button>
  );
}
