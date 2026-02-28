import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SettingsGroupProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function SettingsGroup({
  title,
  children,
  className,
}: SettingsGroupProps) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border',
        className,
      )}
      style={{
        borderColor: 'var(--ui-border)',
        background: 'var(--ui-panel)',
        boxShadow: 'var(--ui-shadow-soft)',
      }}
    >
      {title && (
        <header
          className="border-b px-4 py-3 text-base font-bold"
          style={{
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          {title}
        </header>
      )}
      <div className="flex flex-col">{children}</div>
    </section>
  )
}
