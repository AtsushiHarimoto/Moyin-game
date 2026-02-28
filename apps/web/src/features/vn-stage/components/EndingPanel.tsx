import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EndingInfo {
  endingId?: string
  type?: string
  title?: string
  subtitle?: string
}

interface EndingPanelProps {
  info: EndingInfo | null
  isReplay?: boolean
  endingSaved?: boolean
  onReturn?: () => void
  onSave?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EndingPanel({
  info,
  isReplay = false,
  endingSaved = false,
  onReturn,
  onSave,
}: EndingPanelProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/85 text-center text-white backdrop-blur-lg"
      data-testid="ending-panel"
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="max-w-[400px] p-10">
        {/* Badge */}
        <div
          className="mb-4 inline-block rounded-full px-3 py-1 text-[0.8rem] font-extrabold tracking-[0.1em]"
          style={{ background: 'var(--ui-primary)' }}
        >
          {info?.type?.toUpperCase() || 'GOOD'} END
        </div>

        {/* Title */}
        <h2
          className="mb-2 bg-gradient-to-br from-white to-[var(--ui-primary)] bg-clip-text text-[2.5rem] font-extrabold"
          style={{ WebkitTextFillColor: 'transparent' }}
        >
          {info?.title || 'The End'}
        </h2>

        {/* Subtitle */}
        <p className="mb-8 opacity-80">
          {info?.subtitle || t('message.ending_reached')}
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-4 py-2 font-semibold text-white transition-colors"
            style={{ background: 'var(--ui-primary)' }}
            onClick={onReturn}
          >
            {/* Arrow back icon */}
            <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7-7 7 7 7" />
            </svg>
            {t('message.btn_return_home')}
          </button>

          {!isReplay && !endingSaved && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-white/30 px-4 py-2 font-semibold text-white/90 transition-colors hover:bg-white/10"
              onClick={onSave}
            >
              {/* Save icon */}
              <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {t('message.btn_save', '保存')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
