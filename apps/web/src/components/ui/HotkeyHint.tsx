import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface HotkeyHintProps {
  keys: string[]
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'sm' | 'md'
  inline?: boolean
  disabled?: boolean
  children?: ReactNode
  className?: string
}

export default function HotkeyHint({
  keys,
  variant = 'default',
  size = 'sm',
  inline = false,
  disabled = false,
  children,
  className,
}: HotkeyHintProps) {
  const keyClasses = cn(
    'inline-flex min-w-[34px] items-center justify-center rounded-full border text-center text-[11px]',
    'px-2.5 py-1',
    size === 'md' && 'px-3 py-1.5 text-xs',
    variant === 'default' && 'border-[var(--ui-border)] bg-[var(--ui-panel-subtle)] shadow-sm',
    variant === 'primary' && 'border-[var(--ui-primary)] bg-[var(--ui-primary-soft)] text-[var(--ui-primary)]',
    variant === 'ghost' && 'border-transparent bg-transparent text-[var(--ui-primary)]',
  )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold',
        inline && 'inline-flex',
        disabled && 'opacity-50',
        className,
      )}
      style={{ color: 'var(--ui-text)' }}
    >
      <span className="inline-flex items-center gap-1.5">
        {keys.map((key, index) => (
          <span key={`${key}-${index}`}>
            <span className={keyClasses}>{key}</span>
            {index < keys.length - 1 && (
              <span
                className="mx-0.5"
                style={{ color: 'var(--ui-muted)' }}
                aria-hidden="true"
              >
                +
              </span>
            )}
          </span>
        ))}
      </span>
      {children}
    </div>
  )
}
