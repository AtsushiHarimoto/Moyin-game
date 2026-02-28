import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfirmationModalProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onClose?: () => void
  onConfirm?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfirmationModal({
  open,
  title,
  children,
  confirmLabel = '確認重置',
  cancelLabel = '取消',
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  const previousOverflowRef = useRef('')

  useEffect(() => {
    if (open) {
      previousOverflowRef.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousOverflowRef.current
    }
    return () => {
      document.body.style.overflow = previousOverflowRef.current
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-2xl border"
            style={{
              background: 'var(--ui-panel, #1f2937)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              borderColor: 'rgba(244, 114, 182, 0.3)',
            }}
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Header */}
            <header
              className="flex items-center gap-2 px-6 py-5"
              style={{ borderBottom: '1px solid var(--ui-border)' }}
            >
              <svg
                className="h-6 w-6 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#ec4899' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.768 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="m-0 text-xl font-bold" style={{ color: '#ec4899' }}>
                {title}
              </h2>
            </header>

            {/* Content */}
            <main className="flex-1 px-6 py-6 leading-relaxed" style={{ color: 'var(--ui-text)' }}>
              {children}
            </main>

            {/* Footer */}
            <footer
              className="flex justify-end gap-3 px-6 py-4"
              style={{
                borderTop: '1px solid var(--ui-border)',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <button
                type="button"
                className="cursor-pointer rounded-lg border-none px-4 py-2 font-semibold transition-colors"
                style={{ background: 'var(--ui-panel-subtle)', color: 'var(--ui-muted)' }}
                onClick={onClose}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border-none px-4 py-2 font-semibold text-white transition-colors"
                style={{
                  background: '#db2777',
                  boxShadow: '0 4px 10px rgba(219, 39, 119, 0.3)',
                }}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
