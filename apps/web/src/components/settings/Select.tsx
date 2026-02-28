import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string | number
  options: SelectOption[]
  disabled?: boolean
  placeholder?: string
  className?: string
  onChange: (value: string | number) => void
}

export default function Select({
  value,
  options,
  disabled = false,
  placeholder = '選擇',
  className,
  onChange,
}: SelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const currentLabel =
    options.find((opt) => opt.value === value)?.label ?? placeholder

  const toggle = useCallback(() => {
    if (disabled) return
    setIsOpen((prev) => {
      if (!prev) {
        // Opening: set active index to current value or first enabled
        const currentIdx = options.findIndex(
          (opt) => opt.value === value && !opt.disabled,
        )
        if (currentIdx !== -1) {
          setActiveIndex(currentIdx)
        } else {
          const firstEnabled = options.findIndex((opt) => !opt.disabled)
          setActiveIndex(firstEnabled === -1 ? 0 : firstEnabled)
        }
      }
      return !prev
    })
  }, [disabled, options, value])

  const close = useCallback(() => setIsOpen(false), [])

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return
      onChange(option.value)
      close()
    },
    [onChange, close],
  )

  const moveActive = useCallback(
    (delta: number) => {
      const total = options.length
      if (!total) return
      let next = activeIndex
      for (let i = 0; i < total; i += 1) {
        next = (next + delta + total) % total
        if (!options[next]?.disabled) {
          setActiveIndex(next)
          break
        }
      }
    },
    [activeIndex, options],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return

      if (event.key === 'Escape') {
        close()
        return
      }

      if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        toggle()
        return
      }

      if (!isOpen) return

      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'ArrowDown') {
        moveActive(1)
      } else if (event.key === 'ArrowUp') {
        moveActive(-1)
      } else if (event.key === 'Enter' || event.key === ' ') {
        const option = options[activeIndex]
        if (option && !option.disabled) {
          selectOption(option)
        }
      }
    },
    [disabled, isOpen, toggle, close, moveActive, activeIndex, options, selectOption],
  )

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        close()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen, close])

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative flex w-full cursor-pointer items-center justify-between rounded-lg border px-4 py-3',
        'transition-colors duration-200',
        isOpen && 'border-[var(--ui-primary)]',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      style={{
        borderColor: isOpen ? 'var(--ui-primary)' : 'var(--ui-border)',
        background: 'var(--ui-panel-subtle)',
        color: 'var(--ui-text)',
        boxShadow: 'var(--ui-shadow-soft)',
      }}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        toggle()
      }}
      onKeyDown={handleKeyDown}
    >
      <span className="flex-1 font-semibold">{currentLabel}</span>
      <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
        &#x25BE;
      </span>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 max-h-[220px] w-full overflow-y-auto rounded-lg border"
          style={{
            background: 'var(--ui-panel)',
            borderColor: 'var(--ui-border)',
            boxShadow: 'var(--ui-shadow-strong)',
          }}
        >
          {options.map((option, idx) => (
            <div
              key={String(option.value)}
              className={cn(
                'cursor-pointer px-3.5 py-2.5 transition-colors duration-200',
                option.disabled && 'cursor-not-allowed opacity-50',
                idx === activeIndex && 'bg-[var(--ui-choice-hover)]',
              )}
              style={
                option.value === value
                  ? {
                      background: 'var(--ui-choice-active)',
                      borderLeft: '3px solid var(--ui-primary)',
                      color: 'var(--ui-text)',
                    }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation()
                selectOption(option)
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
