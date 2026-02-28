import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SettingsRowProps {
  label: string
  desc?: string
  disabled?: boolean
  children: ReactNode
  className?: string
}

export default function SettingsRow({
  label,
  desc,
  disabled = false,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-t px-5 py-4 first:border-t-0',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      style={{ borderColor: 'var(--ui-border)' }}
    >
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-semibold" style={{ color: 'var(--ui-text)' }}>
          {label}
        </span>
        {desc && (
          <p
            className="m-0 text-xs"
            style={{ color: 'var(--ui-muted)' }}
          >
            {desc}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
