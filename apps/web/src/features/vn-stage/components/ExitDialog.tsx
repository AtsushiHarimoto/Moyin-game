import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExitDialogProps {
  open: boolean
  isDirty: boolean
  onClose?: () => void
  onExitNoSave?: () => void
  onExitSave?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExitDialog({
  open,
  isDirty,
  onClose,
  onExitNoSave,
  onExitSave,
}: ExitDialogProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-[var(--ui-panel)] p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal
          >
            <h2 className="mb-2 text-lg font-bold" style={{ color: 'var(--ui-text)' }}>
              {t('message.confirm_exit_title')}
            </h2>

            <p className="mb-6 text-gray-200">
              {isDirty
                ? t('message.confirm_exit_desc')
                : t('message.confirm_exit_title')}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 font-semibold text-white transition-colors"
                style={{ background: 'var(--ui-primary)' }}
                data-testid="btn-confirm-exit-save"
                onClick={onExitSave}
              >
                {t('message.confirm_exit_btn_save')}
              </button>

              <button
                type="button"
                className="rounded-md border border-white/20 px-4 py-2 font-semibold text-white/80 transition-colors hover:bg-white/10"
                data-testid="btn-confirm-exit-no-save"
                onClick={onExitNoSave}
              >
                {isDirty
                  ? t('message.confirm_exit_btn_no_save')
                  : t('message.confirm')}
              </button>

              <button
                type="button"
                className="rounded-md px-4 py-2 text-white/60 transition-colors hover:text-white"
                onClick={onClose}
              >
                {t('message.cancel')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
