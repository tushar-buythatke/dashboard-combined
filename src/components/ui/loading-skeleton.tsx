import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'circle' | 'chart';
}

export function Skeleton({
  className,
  variant = 'default',
}: SkeletonProps) {
  const variants = {
    default: 'h-4 w-full',
    card: 'h-32 w-full rounded-xl',
    text: 'h-4 w-3/4',
    circle: 'h-12 w-12 rounded-full',
    chart: 'h-64 w-full rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-muted/50 rounded-md relative overflow-hidden animate-pulse',
        variants[variant],
        className
      )}
    />
  );
}

// Card Skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/2" />
              <Skeleton variant="text" className="w-3/4" />
            </div>
          </div>
          <Skeleton variant="chart" />
        </div>
      ))}
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg p-4 space-y-2"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Chart Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="h-10 w-10" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton variant="chart" className="h-80" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4"
        >
          <Skeleton variant="circle" className="h-8 w-8" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/5" />
        </div>
      ))}
    </div>
  );
}
