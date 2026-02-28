import { useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import GameIcon from '@/components/ui/GameIcon'
import { cn } from '@/lib/cn'

interface ModalDialogProps {
  open: boolean
  title?: string
  maxWidth?: string
  children: ReactNode
  footer?: ReactNode
  header?: ReactNode
  className?: string
  onClose: () => void
}

export default function ModalDialog({
  open,
  title = '',
  maxWidth = '600px',
  children,
  footer,
  header,
  className,
  onClose,
}: ModalDialogProps) {
  // ESC key listener
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    },
    [open, onClose],
  )

  // Body scroll lock and ESC listener
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEsc)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [open, handleEsc])

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[9999] flex items-center justify-center p-5',
            className,
          )}
          style={{
            background: 'var(--ui-overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl border"
            style={{
              maxWidth,
              background: 'var(--ui-dialog-bg, var(--ui-panel))',
              borderColor: 'var(--ui-border)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            }}
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || header) && (
              <header
                className="flex items-center justify-between border-b px-6 py-4"
                style={{ borderColor: 'var(--ui-border)' }}
              >
                {header ?? (
                  <h2
                    className="m-0 text-xl font-bold"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    {title}
                  </h2>
                )}
                <button
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-all duration-200 hover:rotate-90 hover:bg-[#fff5f7]"
                  style={{ color: 'var(--ui-muted)' }}
                  title="關閉"
                  onClick={onClose}
                >
                  <GameIcon name="close" size={20} />
                </button>
              </header>
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>

            {/* Footer */}
            {footer && (
              <footer
                className="flex justify-end gap-3 border-t px-6 py-4"
                style={{ borderColor: 'var(--ui-border)' }}
              >
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(dialog, document.body)
}
