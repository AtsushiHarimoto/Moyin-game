import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface Choice {
  id: string | number
  text: string
  disabled?: boolean
}

interface ChoiceListProps {
  choices: Choice[]
  className?: string
  onSelect: (choice: Choice) => void
}

export default function ChoiceList({
  choices,
  className,
  onSelect,
}: ChoiceListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const firstEnabledIndex = useCallback((): number => {
    const idx = choices.findIndex((item) => !item.disabled)
    return idx === -1 ? 0 : idx
  }, [choices])

  const moveActive = useCallback(
    (delta: number) => {
      if (!choices.length) return
      const total = choices.length
      let next = activeIndex
      for (let i = 0; i < total; i += 1) {
        next = (next + delta + total) % total
        if (!choices[next]?.disabled) {
          setActiveIndex(next)
          break
        }
      }
    },
    [activeIndex, choices],
  )

  const handleSelect = useCallback(
    (index: number) => {
      const choice = choices[index]
      if (!choice || choice.disabled) return
      setActiveIndex(index)
      onSelect(choice)
    },
    [choices, onSelect],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!choices.length) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveActive(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveActive(-1)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        handleSelect(activeIndex)
      }
    },
    [choices.length, moveActive, handleSelect, activeIndex],
  )

  // Reset active index when choices change
  useEffect(() => {
    setActiveIndex(firstEnabledIndex())
  }, [choices, firstEnabledIndex])

  // Auto-focus on mount
  useEffect(() => {
    listRef.current?.focus()
  }, [])

  return (
    <div
      ref={listRef}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 outline-none',
        className,
      )}
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-border)',
        boxShadow: 'var(--ui-shadow-soft)',
      }}
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          className={cn(
            'flex w-full cursor-pointer rounded-lg border px-4 py-3 text-left font-semibold transition-all duration-200',
            'hover:enabled:shadow-md',
            'active:enabled:translate-y-px',
            index === activeIndex && 'border-[var(--ui-primary)] bg-[var(--ui-choice-active)]',
            choice.disabled && 'cursor-not-allowed opacity-60',
          )}
          style={{
            background:
              index === activeIndex
                ? 'var(--ui-choice-active)'
                : 'var(--ui-panel-subtle)',
            borderColor:
              index === activeIndex
                ? 'var(--ui-primary)'
                : 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
          disabled={choice.disabled}
          onClick={() => handleSelect(index)}
        >
          <span className="flex-1">{choice.text}</span>
        </button>
      ))}
    </div>
  )
}
