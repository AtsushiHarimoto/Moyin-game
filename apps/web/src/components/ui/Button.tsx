import { useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  disabled?: boolean
  loading?: boolean
  block?: boolean
  children: ReactNode
  className?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--ui-gradient-primary)',
    color: 'var(--ui-inverse)',
    borderColor: 'transparent',
    boxShadow: '0 12px 24px color-mix(in srgb, var(--ui-primary) 35%, transparent)',
  },
  secondary: {
    background: 'var(--ui-panel)',
    color: 'var(--ui-text)',
    borderColor: 'var(--ui-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ui-primary)',
    borderColor: 'var(--ui-primary)',
    boxShadow: 'none',
  },
  danger: {
    background: 'var(--ui-danger)',
    color: 'var(--ui-inverse)',
    borderColor: 'var(--ui-danger)',
    boxShadow: '0 10px 18px color-mix(in srgb, var(--ui-danger) 35%, transparent)',
  },
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-4 text-sm',
  md: 'h-10 px-5 text-base',
  lg: 'h-12 px-6 text-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  block = false,
  children,
  className,
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    },
    [isDisabled, onClick],
  )

  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex min-w-[96px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border font-semibold leading-none outline-none',
        'transition-all duration-200 ease-out',
        'hover:scale-105 hover:shadow-lg',
        'active:scale-98 active:shadow-sm active:translate-y-px',
        'focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)] focus-visible:ring-offset-2',
        sizeClasses[size],
        block && 'w-full',
        isDisabled && 'cursor-not-allowed opacity-70 saturate-50',
        className,
      )}
      style={{
        ...variantStyles[variant],
        fontFamily: 'var(--ui-font-main)',
        boxShadow: variantStyles[variant].boxShadow ?? 'var(--ui-shadow-soft)',
      }}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {loading && (
        <span
          className="absolute left-3 h-[18px] w-[18px] animate-spin rounded-full border-2 border-t-[var(--ui-inverse)]"
          style={{
            borderColor: 'color-mix(in srgb, var(--ui-inverse) 35%, transparent)',
            borderTopColor: 'var(--ui-inverse)',
          }}
          aria-hidden="true"
        />
      )}
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  )
}
