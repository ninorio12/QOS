import * as React from 'react'

/**
 * Standardized skeleton primitives for VividFlow.
 *
 * Built on the existing `.vf-skeleton` shimmer (globals.css) so loading states
 * match across modules. These are reusable building blocks — modules can adopt
 * them incrementally.
 */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/** A single rounded shimmer block. Size it with `className`. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx('vf-skeleton rounded-md bg-soren-elevated/60', className)}
      {...props}
    />
  )
}

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines to render. Defaults to 3. */
  lines?: number
  className?: string
}

/** A stack of shimmer lines mimicking a text block. Last line is shorter. */
export function SkeletonText({ lines = 3, className, ...props }: SkeletonTextProps) {
  return (
    <div className={cx('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cx('h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/** A card-shaped placeholder: title bar + a few text lines. */
export function SkeletonCard({ className, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cx(
        'rounded-xl border border-soren-border bg-soren-card p-5',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={3} />
      </div>
    </div>
  )
}

export default Skeleton
