import { useMemo } from 'react'
import { cn } from '@/lib/cn'

interface GameLoadingProps {
  size?: number | string
  label?: string
  inline?: boolean
  className?: string
}

export default function GameLoading({
  size = 48,
  label = '',
  inline = false,
  className,
}: GameLoadingProps) {
  const sizeToken = useMemo(() => {
    if (typeof size === 'number') return `${size}px`
    const raw = String(size ?? '').trim()
    if (!raw) return '48px'
    return /^\d+$/.test(raw) ? `${raw}px` : raw
  }, [size])

  const ariaLabel = label || 'Loading'

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-2',
        inline && 'flex-row',
        className,
      )}
      style={{
        fontFamily: 'var(--font-primary)',
        color: 'var(--color-text-primary)',
        // @ts-expect-error CSS custom property
        '--game-loading-size': sizeToken,
      }}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <span
        className="relative inline-flex items-center justify-center"
        style={{
          width: 'var(--game-loading-size)',
          height: 'var(--game-loading-size)',
        }}
        aria-hidden="true"
      >
        {/* Outer ring */}
        <span
          className="absolute inset-0 animate-spin rounded-full"
          style={{
            border: '3px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            borderTopColor: 'var(--color-primary)',
            boxShadow: '0 0 14px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            animationDuration: '1.2s',
            animationTimingFunction: 'linear',
          }}
        />
        {/* Inner ring */}
        <span
          className="absolute animate-spin rounded-full"
          style={{
            inset: '22%',
            border: '2px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            borderTopColor: 'var(--color-primary-light)',
            animationDuration: '0.9s',
            animationTimingFunction: 'linear',
            animationDirection: 'reverse',
          }}
        />
        {/* Spark glow */}
        <span
          className="absolute animate-pulse rounded-full"
          style={{
            inset: '-18%',
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 60%)',
            filter: 'blur(1px)',
          }}
        />
      </span>

      {label && (
        <span
          className="text-sm tracking-wide"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
