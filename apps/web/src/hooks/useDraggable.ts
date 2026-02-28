import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DragDelta {
  x: number
  y: number
}

export interface UseDraggableOptions {
  onDragStart?: () => void
  onDrag?: (delta: DragDelta) => void
  onDragEnd?: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraggable(options: UseDraggableOptions = {}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const optionsRef = useRef(options)
  optionsRef.current = options

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta: DragDelta = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    optionsRef.current.onDrag?.(delta)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    optionsRef.current.onDragEnd?.()
  }, [handleMouseMove])

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      optionsRef.current.onDragStart?.()
    },
    [handleMouseMove, handleMouseUp],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return { isDragging, startDrag } as const
}
