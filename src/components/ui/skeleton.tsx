import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('e-skeleton rounded-[14px]', className)}
      {...props}
    />
  )
}

export { Skeleton }
