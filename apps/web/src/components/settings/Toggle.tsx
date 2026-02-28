import { useCallback, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  disabled?: boolean
  label?: string
  className?: string
  onChange: (checked: boolean) => void
}

export default function Toggle({
  checked,
  disabled = false,
  label,
  className,
  onChange,
}: ToggleProps) {
  const handleToggle = useCallback(() => {
    if (disabled) return
    onChange(!checked)
  }, [disabled, checked, onChange])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === ' ') {
        event.preventDefault()
        handleToggle()
      }
    },
    [handleToggle],
  )

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
      tabIndex={disabled ? -1 : 0}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      {/* Track */}
      <div
        className="relative box-border h-[31px] w-[51px] rounded-full p-0.5 transition-colors duration-300"
        style={{
          backgroundColor: checked ? 'var(--ui-primary)' : 'var(--ui-toggle-track, #e9e9ea)',
        }}
      >
        {/* Thumb */}
        <div
          className="h-[27px] w-[27px] rounded-full bg-white transition-transform duration-300"
          style={{
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06)',
            transitionTimingFunction: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
          }}
        />
      </div>

      {/* Label */}
      {label && (
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--ui-text)' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
