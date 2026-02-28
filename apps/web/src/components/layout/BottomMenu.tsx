import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tab {
  value: string
  name: string
}

interface BottomMenuProps {
  tabs: Tab[]
  selected?: string
  onSelect?: (value: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BottomMenu({
  tabs,
  selected: controlledSelected,
  onSelect,
  className,
}: BottomMenuProps) {
  const [internalSelected, setInternalSelected] = useState(controlledSelected ?? '')
  const selected = controlledSelected ?? internalSelected
  const navRef = useRef<HTMLElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: '0px', width: '0px', opacity: 0 })

  // Sync controlled value
  useEffect(() => {
    if (controlledSelected !== undefined) {
      setInternalSelected(controlledSelected)
    }
  }, [controlledSelected])

  const updateIndicator = useCallback(() => {
    if (!selected || !navRef.current) {
      setIndicatorStyle({ left: '0px', width: '0px', opacity: 0 })
      return
    }

    const activeItem = navRef.current.querySelector<HTMLElement>(
      `[data-tab-value="${selected}"]`,
    )
    if (!activeItem) {
      setIndicatorStyle({ left: '0px', width: '0px', opacity: 0 })
      return
    }

    setIndicatorStyle({
      left: `${activeItem.offsetLeft}px`,
      width: `${activeItem.offsetWidth}px`,
      opacity: 1,
    })
  }, [selected])

  // Update indicator on mount, selected change, and resize
  useEffect(() => {
    updateIndicator()

    const observer = new ResizeObserver(() => updateIndicator())
    if (navRef.current) {
      observer.observe(navRef.current)
    }
    return () => observer.disconnect()
  }, [updateIndicator])

  const selectTab = useCallback(
    (value: string) => {
      if (selected === value) return
      setInternalSelected(value)
      onSelect?.(value)
    },
    [selected, onSelect],
  )

  const handleKeydown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = (index + 1) % tabs.length
        const nextEl = navRef.current?.querySelector<HTMLElement>(
          `[data-tab-value="${tabs[nextIndex].value}"]`,
        )
        nextEl?.focus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = (index - 1 + tabs.length) % tabs.length
        const prevEl = navRef.current?.querySelector<HTMLElement>(
          `[data-tab-value="${tabs[prevIndex].value}"]`,
        )
        prevEl?.focus()
      }
    },
    [tabs],
  )

  return (
    <div
      className={cn('flex h-full w-full items-center justify-center', className)}
      data-testid="bottom-menu"
    >
      <nav
        ref={navRef}
        className="relative flex h-[70px] w-[80vw] items-center justify-center rounded-[35px] border px-5"
        style={{
          background: 'var(--ui-nav-bg)',
          backdropFilter: 'var(--ui-nav-blur)',
          WebkitBackdropFilter: 'var(--ui-nav-blur)',
          borderColor: 'var(--ui-nav-border)',
          boxShadow: 'var(--ui-nav-shadow)',
          fontFamily: 'var(--ui-nav-font)',
          marginBottom: '25px',
        }}
      >
        {/* Sliding indicator */}
        <div
          className="absolute top-[10px] bottom-[10px] z-10 rounded-[25px]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: indicatorStyle.opacity,
            background: 'var(--ui-nav-selected-bg)',
            transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
            boxShadow: 'var(--ui-nav-shadow)',
          }}
        />

        {/* Tab items */}
        {tabs.map((tab, index) => {
          const isActive = selected === tab.value
          return (
            <div
              key={tab.value}
              data-tab-value={tab.value}
              data-testid={`tab-${tab.value}`}
              className={cn(
                'relative z-20 mx-2.5 flex h-[50px] flex-1 cursor-pointer flex-col items-center justify-center rounded-[25px] border-none bg-transparent transition-all',
                isActive && 'font-bold',
              )}
              style={{
                color: isActive ? 'var(--ui-inverse)' : 'var(--ui-nav-text)',
              }}
              tabIndex={0}
              role="button"
              aria-label={tab.name}
              aria-pressed={isActive}
              onClick={() => selectTab(tab.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  selectTab(tab.value)
                } else {
                  handleKeydown(e, index)
                }
              }}
            >
              <span
                className="whitespace-nowrap"
                style={{
                  fontSize: 'var(--ui-font-lg)',
                  fontWeight: isActive ? 'var(--ui-weight-bold)' : undefined,
                }}
              >
                {tab.name}
              </span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
