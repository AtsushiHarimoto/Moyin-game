import { useCallback, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Orientation = 'vertical' | 'horizontal' | 'grid'

export interface UseRovingFocusOptions {
  count: number
  loop?: boolean
  orientation?: Orientation
  disabledIndexes?: number[]
  columns?: number
  initialIndex?: number
}

const EMPTY_INDEXES: number[] = []

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRovingFocus(options: UseRovingFocusOptions) {
  const {
    count,
    loop = true,
    orientation = 'vertical',
    disabledIndexes = EMPTY_INDEXES,
    columns = 1,
    initialIndex = 0,
  } = options

  const [activeIndex, setActiveIndex] = useState(initialIndex)

  const validIndexes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => i).filter(
        (i) => !disabledIndexes.includes(i),
      ),
    [count, disabledIndexes],
  )

  const focusIndex = useCallback(
    (index: number) => {
      if (!validIndexes.includes(index)) return
      setActiveIndex(index)
    },
    [validIndexes],
  )

  const focusFirst = useCallback(() => {
    focusIndex(validIndexes[0] ?? 0)
  }, [focusIndex, validIndexes])

  const focusLast = useCallback(() => {
    focusIndex(validIndexes[validIndexes.length - 1] ?? 0)
  }, [focusIndex, validIndexes])

  const move = useCallback(
    (delta: number) => {
      if (validIndexes.length === 0) return
      let next = activeIndex
      for (let i = 0; i < validIndexes.length; i += 1) {
        next = (next + delta + count) % count
        if (validIndexes.includes(next)) {
          focusIndex(next)
          break
        }
      }
    },
    [activeIndex, count, validIndexes, focusIndex],
  )

  const moveGrid = useCallback(
    (delta: number, rowDelta: number) => {
      if (validIndexes.length === 0) return
      let next = activeIndex
      const cols = Math.max(columns, 1)
      for (let i = 0; i < validIndexes.length; i += 1) {
        const candidate = next + delta + rowDelta * cols
        if (candidate < 0 || candidate >= count) {
          if (!loop) break
          next = (candidate + count) % count
        } else {
          next = candidate
        }
        if (validIndexes.includes(next)) {
          focusIndex(next)
          break
        }
      }
    },
    [activeIndex, columns, count, loop, validIndexes, focusIndex],
  )

  const handleKeydown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!count) return
      const { key } = event

      if (orientation === 'grid') {
        if (key === 'ArrowRight') move(1)
        if (key === 'ArrowLeft') move(-1)
        if (key === 'ArrowDown') moveGrid(0, 1)
        if (key === 'ArrowUp') moveGrid(0, -1)
      } else if (orientation === 'horizontal') {
        if (key === 'ArrowRight') move(1)
        if (key === 'ArrowLeft') move(-1)
      } else {
        if (key === 'ArrowDown') move(1)
        if (key === 'ArrowUp') move(-1)
      }

      if (key === 'Home') focusFirst()
      if (key === 'End') focusLast()
    },
    [count, orientation, move, moveGrid, focusFirst, focusLast],
  )

  const getTabIndex = useCallback(
    (index: number) => (index === activeIndex ? 0 : -1),
    [activeIndex],
  )

  return {
    activeIndex,
    focusIndex,
    focusFirst,
    focusLast,
    handleKeydown,
    getTabIndex,
  } as const
}
