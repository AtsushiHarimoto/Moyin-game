import { useCallback, useState } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StarRatingProps {
  value: number | null
  onChange?: (value: number | null) => void
  max?: number
  readonly?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StarRating({
  value,
  onChange,
  max = 5,
  readonly = false,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const displayValue = hovered ?? value ?? 0

  const handleSelect = useCallback(
    (index: number) => {
      if (readonly) return
      onChange?.(index)
    },
    [readonly, onChange],
  )

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {Array.from({ length: max }, (_, i) => {
        const starIndex = i + 1
        const isActive = displayValue >= starIndex

        return (
          <button
            key={starIndex}
            type="button"
            className={cn(
              'h-7 w-7 border-none bg-transparent p-0 transition-colors',
              'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-primary)] focus-visible:rounded-full',
              isActive ? 'text-[var(--ui-warning)]' : 'text-[var(--ui-border)]',
              !isActive && !readonly && 'hover:text-[var(--ui-primary)]',
            )}
            aria-label={`${starIndex} star`}
            aria-pressed={isActive}
            onMouseEnter={() => setHovered(starIndex)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(starIndex)}
            onBlur={() => setHovered(null)}
            onClick={() => handleSelect(starIndex)}
          >
            <svg className="h-full w-full" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3.5l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.8 6.44 20.62 7.5 14.42 3 10.03l6.22-.9L12 3.5z"
                fill={isActive ? 'currentColor' : 'transparent'}
                stroke="currentColor"
                strokeWidth={1.5}
              />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
