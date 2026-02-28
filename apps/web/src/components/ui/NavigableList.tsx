import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

interface NavigableItem {
  index: number
}

interface NavigableListProps {
  items?: NavigableItem[]
  orientation?: 'vertical' | 'horizontal' | 'grid'
  loop?: boolean
  columns?: number
  disabledIndexes?: number[]
  activeIndex?: number
  onActiveChange?: (index: number) => void
  onConfirm?: (index: number) => void
  onCancel?: () => void
  renderItem: (props: {
    index: number
    active: boolean
    tabIndex: number
  }) => ReactNode
  className?: string
}

export default function NavigableList({
  items = [],
  orientation = 'vertical',
  loop = true,
  columns = 1,
  disabledIndexes = [],
  activeIndex: controlledIndex,
  onActiveChange,
  onConfirm,
  onCancel,
  renderItem,
  className,
}: NavigableListProps) {
  const [internalIndex, setInternalIndex] = useState(controlledIndex ?? 0)
  const activeIndex = controlledIndex ?? internalIndex
  const containerRef = useRef<HTMLDivElement>(null)

  const count = items.length

  useEffect(() => {
    if (controlledIndex !== undefined) {
      setInternalIndex(controlledIndex)
    }
  }, [controlledIndex])

  const isDisabled = useCallback(
    (idx: number) => disabledIndexes.includes(idx),
    [disabledIndexes],
  )

  const focusIndex = useCallback(
    (idx: number) => {
      const clamped = loop
        ? ((idx % count) + count) % count
        : Math.max(0, Math.min(idx, count - 1))

      if (isDisabled(clamped)) return

      setInternalIndex(clamped)
      onActiveChange?.(clamped)
    },
    [count, loop, isDisabled, onActiveChange],
  )

  const handleKeydown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      let nextIndex = activeIndex

      if (orientation === 'vertical' || orientation === 'grid') {
        if (event.key === 'ArrowDown') {
          nextIndex = activeIndex + (orientation === 'grid' ? columns : 1)
          event.preventDefault()
        } else if (event.key === 'ArrowUp') {
          nextIndex = activeIndex - (orientation === 'grid' ? columns : 1)
          event.preventDefault()
        }
      }

      if (orientation === 'horizontal' || orientation === 'grid') {
        if (event.key === 'ArrowRight') {
          nextIndex = activeIndex + 1
          event.preventDefault()
        } else if (event.key === 'ArrowLeft') {
          nextIndex = activeIndex - 1
          event.preventDefault()
        }
      }

      if (event.key === 'Home') {
        nextIndex = 0
        event.preventDefault()
      } else if (event.key === 'End') {
        nextIndex = count - 1
        event.preventDefault()
      }

      if (nextIndex !== activeIndex) {
        focusIndex(nextIndex)
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onConfirm?.(activeIndex)
        return
      }

      if (event.key === 'Escape') {
        onCancel?.()
      }
    },
    [activeIndex, orientation, columns, count, focusIndex, onConfirm, onCancel],
  )

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col', className)}
      role="list"
      tabIndex={-1}
      onKeyDown={handleKeydown}
    >
      {items.map((item) =>
        renderItem({
          index: item.index,
          active: item.index === activeIndex,
          tabIndex: item.index === activeIndex ? 0 : -1,
        }),
      )}
    </div>
  )
}
