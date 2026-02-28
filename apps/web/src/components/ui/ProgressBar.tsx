import { useMemo } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  variant?: Variant
  showValue?: boolean
  inline?: boolean
  className?: string
}

const variantFillStyles: Record<Variant, string> = {
  primary: 'var(--ui-gradient-primary)',
  secondary: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-light))',
  accent: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
  danger: 'linear-gradient(135deg, var(--color-error), var(--color-warning))',
}

export default function ProgressBar({
  value,
  max = 100,
  label = '',
  variant = 'primary',
  showValue = false,
  inline = false,
  className,
}: ProgressBarProps) {
  const clampedValue = useMemo(() => {
    const safeMax = Math.max(max, 0)
    return Math.min(Math.max(value, 0), safeMax)
  }, [value, max])

  const percentage = useMemo(() => {
    if (max <= 0) return 0
    return Math.round((clampedValue / max) * 100)
  }, [clampedValue, max])

  const displayValue = `${clampedValue}/${max}`

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        inline && 'flex-row items-center gap-4',
        className,
      )}
      style={{
        fontFamily: 'var(--font-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-4">
          {label && (
            <span
              className="text-sm font-semibold"
              style={{ fontSize: 'var(--font-size-sm)' }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              className="text-xs"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {displayValue}
            </span>
          )}
        </div>
      )}

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full border"
        style={{
          background: 'var(--ui-hud-track)',
          borderColor: 'var(--ui-border)',
          boxShadow: 'var(--shadow-inset)',
        }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Fill bar */}
        <div
          className="h-full rounded-[inherit] transition-[width] duration-300 ease-out"
          style={{
            width: `${percentage}%`,
            background: variantFillStyles[variant],
          }}
        />
        {/* Shine animation */}
        <div
          className="pointer-events-none absolute inset-0 animate-[progress-shine_2.2s_ease-in-out_infinite]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)',
            opacity: 0.4,
          }}
        />
      </div>
    </div>
  )
}
