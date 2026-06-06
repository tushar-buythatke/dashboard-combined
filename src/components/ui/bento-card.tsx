import { cn } from '@/lib/utils'
import { useAccentTheme } from '@/contexts/AccentThemeContext'

interface BentoCardProps {
  children: React.ReactNode
  className?: string
  accent?: 'purple' | 'cyan' | 'pink' | 'emerald'
  narrative?: string
  trend?: { label: string; direction: 'up' | 'down' }
}

const ACCENT_SHADOWS = {
  purple: 'var(--shadow-ambient-purple)',
  cyan: 'var(--shadow-ambient-cyan)',
  pink: 'var(--shadow-ambient-pink)',
  emerald: 'var(--shadow-ambient-emerald)',
}

export function BentoCard({
  children,
  className,
  accent = 'purple',
  narrative,
  trend,
}: BentoCardProps) {
  const { t: themeClasses } = useAccentTheme()

  return (
    <div
      className={cn(
        'bento-card relative',
        className,
      )}
      style={{ boxShadow: ACCENT_SHADOWS[accent] }}
    >
      {/* Top accent bar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r z-10',
        themeClasses.buttonGradient,
      )} />

      {/* Narrative layer */}
      {(narrative || trend) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {narrative && (
            <p className="narrative-headline text-muted-foreground max-w-md truncate">
              {narrative}
            </p>
          )}
          {trend && (
            <span className={cn(
              'trend-badge spring-transition',
              trend.direction === 'up' ? 'trend-badge-up' : 'trend-badge-down',
            )}>
              {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn(narrative || trend ? 'px-5 pb-5' : '')}>
        {children}
      </div>
    </div>
  )
}

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bento-grid', className)}>
      {children}
    </div>
  )
}
