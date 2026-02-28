import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface GameSidebarProps {
  title?: string
  subtitle?: string
  compact?: boolean
  header?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

export default function GameSidebar({
  title = '',
  subtitle = '',
  compact = false,
  header,
  footer,
  children,
  className,
}: GameSidebarProps) {
  const showHeader = title || subtitle || header

  return (
    <aside
      className={cn(
        'flex min-w-[240px] flex-col gap-4 rounded-xl border p-6',
        'backdrop-blur-[16px]',
        compact && 'min-w-[200px] gap-3 p-4',
        className,
      )}
      style={{
        background: 'var(--ui-panel-glass)',
        borderColor: 'var(--ui-panel-glass-border)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--color-text-primary)',
      }}
    >
      {showHeader && (
        <header className="flex flex-col gap-1.5">
          {header ?? (
            <>
              {title && (
                <div
                  className="text-lg font-semibold"
                  style={{ fontSize: 'var(--font-size-lg)' }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  className="text-sm"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </>
          )}
        </header>
      )}

      <div className="flex flex-col gap-2">{children}</div>

      {footer && (
        <footer className="mt-auto flex justify-end gap-2">{footer}</footer>
      )}
    </aside>
  )
}
