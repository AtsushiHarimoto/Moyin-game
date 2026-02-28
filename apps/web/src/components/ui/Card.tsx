import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardProps {
  /** Front-side images */
  frontImages?: string[]
  /** Back-side avatar images */
  backImages?: string[]
  /** Display title */
  title?: string
  /** Whether there is save history to continue */
  hasHistory?: boolean
  className?: string
  onCreate?: () => void
  onLoad?: () => void
  onCheckHistory?: () => void
  /** Optional children for extra content on the front face */
  children?: ReactNode
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashKeyToIndex(key: string, length: number): number {
  if (!key || length <= 0) return 0
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return hash % length
}

const GRADIENTS = [
  'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
  'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
  'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
  'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Card({
  frontImages = [],
  backImages = [],
  title = '',
  hasHistory = false,
  className,
  onCreate,
  onLoad,
  onCheckHistory,
  children,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const containerWidth = useMemo(() => {
    if (frontImages.length <= 1) return '250px'
    return `${Math.floor(125 * frontImages.length)}px`
  }, [frontImages.length])

  const bgStyle = useMemo(() => {
    const index = hashKeyToIndex(title, GRADIENTS.length)
    return { background: GRADIENTS[index] }
  }, [title])

  const titleFontSize = useMemo(() => {
    const len = title.length
    if (len <= 4) return '30px'
    if (len <= 8) return '24px'
    return '18px'
  }, [title])

  return (
    <div
      className={cn(
        'relative rounded-xl',
        className,
      )}
      style={{
        width: containerWidth,
        height: 'var(--ui-story-card-height, 360px)',
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Front face */}
      <div
        className="absolute inset-0 overflow-hidden rounded-xl border p-2"
        style={{
          ...bgStyle,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: isHovered ? 'rotateY(-180deg)' : 'rotateY(0deg)',
          transformStyle: 'preserve-3d',
          borderColor: 'color-mix(in srgb, var(--ui-border) 85%, transparent)',
          boxShadow: 'var(--ui-shadow-soft)',
        }}
      >
        <div className="flex h-full w-full overflow-hidden">
          {frontImages.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="block h-full object-cover"
              style={{
                width: `${100 / Math.max(frontImages.length, 1)}%`,
                borderRadius:
                  frontImages.length <= 1
                    ? 'var(--ui-radius-md)'
                    : i === 0
                      ? 'var(--ui-radius-md) 0 0 var(--ui-radius-md)'
                      : i === frontImages.length - 1
                        ? '0 var(--ui-radius-md) var(--ui-radius-md) 0'
                        : '0',
              }}
            />
          ))}
        </div>
        {children}
      </div>

      {/* Back face */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border p-2"
        style={{
          ...bgStyle,
          backfaceVisibility: 'hidden',
          transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: isHovered ? 'rotateY(0deg)' : 'rotateY(180deg)',
          transformStyle: 'preserve-3d',
          borderColor: 'color-mix(in srgb, var(--ui-border) 85%, transparent)',
          boxShadow: 'var(--ui-shadow-soft)',
        }}
      >
        <div className="flex">
          {backImages.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              className="h-[140px] w-[140px] rounded-full border-2 object-cover p-1.5"
              style={{
                background: 'var(--ui-primary-soft)',
                borderColor: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
                boxShadow: '0 10px 18px color-mix(in srgb, var(--ui-primary) 30%, transparent)',
                cursor: 'pointer',
              }}
              onClick={onLoad}
            />
          ))}
        </div>

        <div className="mt-2 flex w-full flex-col items-center text-center">
          <div
            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
            style={{
              fontSize: titleFontSize,
              color: 'var(--ui-primary)',
              maxWidth: containerWidth,
            }}
          >
            {title}
          </div>

          <div className="mt-3 grid w-full auto-cols-fr grid-flow-col gap-3 px-3">
            <button
              type="button"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border px-3 py-3 transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--ui-panel-glass)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--ui-panel-glass-border)',
                color: 'var(--ui-primary)',
                boxShadow: 'var(--ui-shadow-soft)',
              }}
              onClick={onCreate}
            >
              <span className="text-sm font-medium">New Story</span>
            </button>
            {hasHistory && (
              <button
                type="button"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border px-3 py-3 transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--ui-panel-glass)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'var(--ui-panel-glass-border)',
                  color: 'var(--ui-primary)',
                  boxShadow: 'var(--ui-shadow-soft)',
                }}
                onClick={onCheckHistory}
              >
                <span className="text-sm font-medium">Continue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
