import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BacklogItem {
  turnId?: string
  speaker?: string
  text?: string
  type?: string
  timestamp?: string
}

interface BacklogPanelProps {
  open: boolean
  items: BacklogItem[]
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BacklogPanel({ open, items, onClose }: BacklogPanelProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when opened or items change
  useEffect(() => {
    if (open && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      })
    }
  }, [open, items.length])

  // Escape key to close
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Click outside (on backdrop) to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1500]"
          style={{
            background: 'color-mix(in srgb, var(--ui-bg) 40%, transparent)',
          }}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Slide-in panel */}
          <motion.div
            className="absolute left-0 top-0 flex h-full w-full max-w-[400px] flex-col border-r"
            style={{
              background: 'var(--ui-panel-glass, color-mix(in srgb, var(--ui-bg) 85%, transparent))',
              borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '4px 0 24px color-mix(in srgb, var(--ui-bg) 50%, transparent)',
            }}
            data-testid="backlog-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-5 py-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
              }}
            >
              <div className="flex items-center gap-3">
                {/* History icon */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--ui-imperial-gold)' }}
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <h2
                  className="m-0 text-base font-bold tracking-[0.1em]"
                  style={{
                    color: 'var(--ui-text)',
                    fontFamily: 'var(--ui-font-display)',
                  }}
                >
                  {t('message.vn_stage_history', 'History')}
                </h2>
              </div>

              {/* Close button */}
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent transition-colors hover:bg-white/10"
                style={{ color: 'var(--ui-muted)' }}
                onClick={onClose}
                aria-label={t('message.btn_close', 'Close')}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable list */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'color-mix(in srgb, var(--ui-text) 20%, transparent) transparent',
              }}
            >
              {items.length === 0 ? (
                <div
                  className="flex h-full items-center justify-center text-sm"
                  style={{ color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}
                >
                  {t('message.vn_backlog_empty', 'No history yet.')}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {items.map((item, index) => (
                    <div
                      key={item.turnId ?? index}
                      className="flex flex-col gap-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5"
                      style={{
                        borderLeft: '2px solid color-mix(in srgb, var(--ui-imperial-gold) 30%, transparent)',
                      }}
                    >
                      {/* Speaker + timestamp row */}
                      <div className="flex items-center justify-between gap-2">
                        {item.speaker && (
                          <span
                            className="text-xs font-bold uppercase tracking-[0.06em]"
                            style={{
                              color: 'var(--ui-imperial-gold)',
                            }}
                          >
                            {item.speaker}
                          </span>
                        )}
                        {item.timestamp && (
                          <span
                            className="text-[10px]"
                            style={{
                              color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)',
                              fontFamily: 'var(--ui-font-mono)',
                            }}
                          >
                            {item.timestamp}
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      {item.text && (
                        <p
                          className="m-0 text-sm leading-relaxed"
                          style={{
                            color: 'color-mix(in srgb, var(--ui-text) 85%, transparent)',
                          }}
                        >
                          {item.text}
                        </p>
                      )}

                      {/* Type badge (for non-dialogue entries) */}
                      {item.type && item.type !== 'dialogue' && (
                        <span
                          className="mt-1 self-start rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                          style={{
                            background: 'color-mix(in srgb, var(--ui-primary) 15%, transparent)',
                            color: 'var(--ui-primary)',
                          }}
                        >
                          {item.type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex shrink-0 items-center justify-center border-t px-5 py-3"
              style={{
                borderColor: 'color-mix(in srgb, var(--ui-text) 8%, transparent)',
              }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.1em]"
                style={{ color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)' }}
              >
                {t('message.vn_backlog_count', '{{count}} entries', { count: items.length })}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
