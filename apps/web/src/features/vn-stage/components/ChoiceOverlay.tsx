import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChoiceOption {
  optionId: string
  text: string
}

interface ChoiceView {
  options: ChoiceOption[]
}

interface ChoiceOverlayProps {
  view: ChoiceView | null
  disabled?: boolean
  timerEnabled?: boolean
  timerProgress?: number // 0-100
  timerSeconds?: number // Remaining seconds
  onChoose?: (optionId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChoiceOverlay({
  view,
  disabled = false,
  timerEnabled = false,
  timerProgress = 0,
  timerSeconds = 0,
  onChoose,
}: ChoiceOverlayProps) {
  const { t } = useTranslation()

  const formattedTime = useMemo(() => {
    const seconds = timerSeconds ?? 0
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const ms = Math.floor((seconds % 1) * 100)
    return `${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }, [timerSeconds])

  return (
    <AnimatePresence>
      {view && (
        <motion.div
          className="absolute inset-0 z-[1000] flex flex-col items-center justify-center p-5"
          data-testid="choice-overlay"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Heavy Blur Background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'color-mix(in srgb, var(--ui-bg) 70%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          />

          {/* Content Container */}
          <motion.div
            className="relative z-[1] flex w-full max-w-[800px] flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Header Section */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className="mb-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: 'color-mix(in srgb, var(--ui-imperial-gold) 80%, transparent)' }}
              >
                {/* Warning icons */}
                <svg className="h-[18px] w-[18px] opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4m0 4h.01M3 20h18L12 4 3 20z" />
                </svg>
                <span>{t('message.vn_stage_critical_directive', 'Critical Directive')}</span>
                <svg className="h-[18px] w-[18px] opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4m0 4h.01M3 20h18L12 4 3 20z" />
                </svg>
              </div>
              <h2
                className="m-0 text-3xl font-bold tracking-[0.02em] md:text-4xl"
                style={{
                  color: 'var(--ui-text)',
                  textShadow: '0 4px 12px color-mix(in srgb, var(--ui-bg) 50%, transparent)',
                }}
              >
                {t('message.vn_stage_choose_branch', '選擇路線')}
              </h2>
              <div
                className="mt-2 h-px w-24"
                style={{
                  background: 'linear-gradient(to right, transparent, var(--ui-imperial-gold), transparent)',
                }}
              />
            </div>

            {/* Timer Bar (Optional) */}
            {timerEnabled && timerProgress > 0 && (
              <div className="mx-auto flex w-full max-w-[600px] flex-col gap-2">
                <div className="flex items-end justify-between px-1">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'color-mix(in srgb, var(--ui-text) 70%, transparent)' }}
                  >
                    {t('message.vn_choice_decision_window')}
                  </span>
                  <span
                    className="animate-pulse text-xs"
                    style={{
                      fontFamily: 'var(--ui-font-mono)',
                      color: 'var(--ui-imperial-gold)',
                    }}
                  >
                    {formattedTime}
                  </span>
                </div>
                <div
                  className="relative h-1.5 w-full overflow-hidden rounded-full"
                  style={{
                    background: 'var(--ui-panel-subtle)',
                    border: '1px solid color-mix(in srgb, var(--ui-text) 10%, transparent)',
                    boxShadow: 'inset 0 2px 4px color-mix(in srgb, var(--ui-bg) 30%, transparent)',
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-100"
                    style={{
                      width: `${timerProgress}%`,
                      background: 'linear-gradient(to right, var(--ui-imperial-gold), var(--ui-primary))',
                      boxShadow: '0 0 10px color-mix(in srgb, var(--ui-imperial-gold) 50%, transparent)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Choices Container */}
            <div className="mt-4 flex w-full flex-col gap-4">
              {view.options.map((option) => (
                <button
                  key={option.optionId}
                  type="button"
                  className="group relative min-h-[80px] w-full cursor-pointer overflow-hidden rounded-lg border p-0
                    transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                    hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg
                    active:enabled:translate-y-0
                    disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: 'var(--ui-imperial-gold)',
                    background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                  disabled={disabled}
                  aria-disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChoose?.(option.optionId)
                  }}
                >
                  {/* Tech Pattern Overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--ui-imperial-gold) 10%, transparent) 1px, transparent 0)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Left Tech Decoration */}
                  <div className="absolute left-0 top-0 flex h-full w-16 items-center justify-center opacity-70 transition-all duration-300 group-hover:enabled:opacity-100"
                    style={{ color: 'var(--ui-imperial-gold)' }}
                  >
                    <svg viewBox="0 0 60 60" fill="none" preserveAspectRatio="none" className="h-full w-full">
                      <path d="M0 0V60H10L20 45V15L10 0H0Z" fill="currentColor" fillOpacity="0.1" />
                      <path d="M15 15L15 45" stroke="currentColor" strokeWidth="1" />
                      <circle cx="15" cy="30" r="2" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Right Tech Decoration */}
                  <div className="absolute right-0 top-0 flex h-full w-16 rotate-180 items-center justify-center opacity-70 transition-all duration-300 group-hover:enabled:opacity-100"
                    style={{ color: 'var(--ui-imperial-gold)' }}
                  >
                    <svg viewBox="0 0 60 60" fill="none" preserveAspectRatio="none" className="h-full w-full">
                      <path d="M0 0V60H10L20 45V15L10 0H0Z" fill="currentColor" fillOpacity="0.1" />
                      <path d="M15 15L15 45" stroke="currentColor" strokeWidth="1" />
                      <circle cx="15" cy="30" r="2" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="relative z-[1] flex min-h-[80px] items-center justify-center px-8 py-4">
                    <span
                      className="text-center text-lg font-semibold leading-relaxed tracking-[0.03em]"
                      style={{
                        color: 'var(--ui-text)',
                        textShadow: '0 2px 4px color-mix(in srgb, var(--ui-bg) 30%, transparent)',
                      }}
                    >
                      {option.text}
                    </span>
                  </div>

                  {/* Hover Glow Overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:enabled:opacity-100"
                    style={{ background: 'color-mix(in srgb, var(--ui-primary) 5%, transparent)' }}
                  />
                </button>
              ))}
            </div>

            {/* Footer Status */}
            <div className="mt-5 flex justify-center">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: 'color-mix(in srgb, var(--ui-bg) 40%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ui-text) 5%, transparent)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ background: 'var(--ui-success)' }}
                />
                <span
                  className="text-xs uppercase tracking-[0.1em]"
                  style={{ color: 'color-mix(in srgb, var(--ui-text) 50%, transparent)' }}
                >
                  {t('message.vn_choice_system_online')}
                </span>
                <span
                  className="mx-2 h-3 w-px"
                  style={{ background: 'color-mix(in srgb, var(--ui-text) 20%, transparent)' }}
                />
                <span className="text-xs" style={{ color: 'var(--ui-imperial-gold)' }}>
                  {t('message.vn_stage_brand')}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
