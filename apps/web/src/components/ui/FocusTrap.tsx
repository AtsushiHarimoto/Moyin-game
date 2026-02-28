import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FocusTrapProps {
  children: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FocusTrap({ children, className }: FocusTrapProps) {
  const trapRef = useRef<HTMLDivElement>(null)

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const container = trapRef.current
    if (!container) return

    const targets = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (targets.length === 0) return

    const first = targets[0]
    const last = targets[targets.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        last.focus()
        event.preventDefault()
      }
    } else if (document.activeElement === last) {
      first.focus()
      event.preventDefault()
    }
  }, [])

  useEffect(() => {
    const container = trapRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeydown)
    return () => container.removeEventListener('keydown', handleKeydown)
  }, [handleKeydown])

  return (
    <div ref={trapRef} className={cn('outline-none', className)} tabIndex={-1}>
      {children}
    </div>
  )
}
