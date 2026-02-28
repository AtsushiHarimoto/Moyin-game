import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { cn } from '@/lib/cn'

interface ScrollBoxProps {
  enablePullDown?: boolean
  enablePullUp?: boolean
  threshold?: number
  damping?: number
  onRefresh?: (done: () => void) => void
  onLoadMore?: (done: () => void) => void
  children?: ReactNode
  className?: string
}

export default function ScrollBox({
  enablePullDown = false,
  enablePullUp = false,
  threshold = 60,
  damping = 0.3,
  onRefresh,
  onLoadMore,
  children,
  className,
}: ScrollBoxProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const startYRef = useRef(0)

  const pullStatusText = useMemo(() => {
    if (isRefreshing) return 'Refreshing...'
    return offset > threshold ? 'Release to refresh' : 'Pull down to refresh'
  }, [isRefreshing, offset, threshold])

  const pushStatusText = useMemo(() => {
    if (isLoadingMore) return 'Loading...'
    return -offset > threshold ? 'Release to load more' : 'Pull up to load more'
  }, [isLoadingMore, offset, threshold])

  const isAtTop = useCallback(() => {
    if (!viewportRef.current) return true
    return viewportRef.current.scrollTop <= 0
  }, [])

  const isAtBottom = useCallback(() => {
    if (!viewportRef.current || !contentRef.current) return true
    const tolerance = 1
    return (
      viewportRef.current.scrollTop + viewportRef.current.clientHeight >=
      contentRef.current.scrollHeight - tolerance
    )
  }, [])

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    startYRef.current = touch.pageY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (!isDragging) return
      const touch = e.touches[0]
      if (!touch) return
      const currentY = touch.pageY
      const diff = currentY - startYRef.current

      if (isAtTop() && diff > 0) {
        e.preventDefault()
        setOffset(diff * damping)
      } else if (isAtBottom() && diff < 0) {
        e.preventDefault()
        setOffset(diff * damping)
      } else {
        setOffset(0)
      }
    },
    [isDragging, damping, isAtTop, isAtBottom],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)

    if (enablePullDown && offset > threshold) {
      if (!isRefreshing) {
        setIsRefreshing(true)
        setOffset(threshold)
        onRefresh?.(() => {
          setIsRefreshing(false)
          setOffset(0)
        })
      }
    } else if (enablePullUp && -offset > threshold) {
      if (!isLoadingMore) {
        setIsLoadingMore(true)
        setOffset(-threshold)
        onLoadMore?.(() => {
          setIsLoadingMore(false)
          setOffset(0)
        })
      }
    } else {
      setOffset(0)
    }
  }, [enablePullDown, enablePullUp, offset, threshold, isRefreshing, isLoadingMore, onRefresh, onLoadMore])

  const contentStyle = useMemo(
    () => ({
      transform: `translateY(${offset}px)`,
      transition: isDragging
        ? 'none'
        : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
    }),
    [offset, isDragging],
  )

  return (
    <div
      ref={viewportRef}
      className={cn(
        'relative h-full w-full overflow-y-auto overflow-x-hidden',
        'overscroll-y-none scrollbar-none',
        className,
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Down Indicator */}
      {enablePullDown && offset > 0 && (
        <div
          className="absolute left-0 top-0 z-10 flex w-full -translate-y-full items-center justify-center overflow-hidden text-xs"
          style={{
            height: `${Math.max(0, offset)}px`,
            opacity: Math.min(1, offset / threshold),
            color: 'var(--ui-muted)',
          }}
        >
          <div className="flex h-[60px] items-center gap-2">
            {isRefreshing ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2"
                style={{
                  borderColor: 'var(--ui-panel-subtle)',
                  borderTopColor: 'var(--ui-primary)',
                }}
              />
            ) : null}
            <span>{pullStatusText}</span>
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        className="min-h-full w-full will-change-transform"
        style={contentStyle}
      >
        {children}
      </div>

      {/* Pull Up Indicator */}
      {enablePullUp && offset < 0 && (
        <div
          className="absolute bottom-0 left-0 z-10 flex w-full translate-y-full items-center justify-center overflow-hidden text-xs"
          style={{
            height: `${Math.max(0, -offset)}px`,
            opacity: Math.min(1, -offset / threshold),
            color: 'var(--ui-muted)',
          }}
        >
          <div className="flex h-[60px] items-center gap-2">
            {isLoadingMore ? (
              <div
                className="h-4 w-4 animate-spin rounded-full border-2"
                style={{
                  borderColor: 'var(--ui-panel-subtle)',
                  borderTopColor: 'var(--ui-primary)',
                }}
              />
            ) : null}
            <span>{pushStatusText}</span>
          </div>
        </div>
      )}
    </div>
  )
}
