import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TalkTemplate {
  id: string
  title: string
  prefix: string
}

interface TalkCommandPanelProps {
  value?: string
  templates?: TalkTemplate[]
  maxLength?: number
  disabled?: boolean
  disabledHint?: string
  onUpdateValue: (value: string) => void
  onSelectTemplate?: (prefix: string) => void
  onSubmit: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TalkCommandPanel({
  value = '',
  templates = [],
  maxLength = 200,
  disabled = false,
  disabledHint = '',
  onUpdateValue,
  onSelectTemplate,
  onSubmit,
}: TalkCommandPanelProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const charCount = value.length
  const isOverLimit = charCount > maxLength

  const handleSubmit = useCallback(() => {
    if (disabled || isOverLimit) return
    onSubmit()
  }, [disabled, isOverLimit, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleTemplateClick = useCallback(
    (template: TalkTemplate) => {
      const prefixed = template.prefix ? `${template.prefix} ` : ''
      onUpdateValue(prefixed)
      onSelectTemplate?.(prefixed)
      inputRef.current?.focus()
    },
    [onUpdateValue, onSelectTemplate],
  )

  const inputWrapperStyle = useMemo(
    () => ({
      background: 'color-mix(in srgb, var(--ui-royal-purple, #302839) 50%, transparent)',
      borderWidth: '1px',
      borderStyle: 'solid' as const,
      borderColor: isFocused
        ? 'var(--ui-imperial-gold, #D4AF37)'
        : 'rgba(255, 255, 255, 0.05)',
      boxShadow: isFocused
        ? '0 0 15px color-mix(in srgb, var(--ui-imperial-gold, #D4AF37) 20%, transparent)'
        : 'none',
    }),
    [isFocused],
  )

  return (
    <div className="flex flex-col gap-4" data-testid="talk-command-panel">
      {/* Manual Input Section */}
      <div className="flex flex-col gap-2">
        <label
          className="ml-1 text-[0.65rem] font-bold uppercase tracking-[0.15em]"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          {t('message.vn_command_manual_override', 'Manual Override')}
        </label>

        {/* Input wrapper */}
        <div
          className="flex h-14 items-stretch overflow-hidden rounded-lg transition-all duration-300"
          style={inputWrapperStyle}
        >
          <div className="flex items-center justify-center px-3 pl-4 text-white/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 border-none bg-transparent px-2 pr-4 text-sm tracking-[0.03em] text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t(
              'message.vn_command_talk_placeholder',
              `Enter custom decree... (max ${maxLength})`,
            )}
            value={value}
            disabled={disabled}
            data-testid="talk-input"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => onUpdateValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Meta: char count + hints */}
        <div className="flex items-center justify-between px-1 text-[0.7rem] text-white/40">
          <span
            className="font-mono"
            style={{
              color: isOverLimit ? '#ef4444' : undefined,
              fontWeight: isOverLimit ? 600 : undefined,
            }}
          >
            {charCount}/{maxLength}
          </span>
          {isOverLimit && (
            <span className="font-semibold text-red-500">
              {t('message.vn_command_over_limit', 'Over limit')}
            </span>
          )}
          {!isOverLimit && disabled && disabledHint && (
            <span className="font-semibold text-red-500">{disabledHint}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-0 my-2 h-px w-full"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent)',
        }}
      />

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2
            className="ml-1 text-[0.65rem] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          >
            {t('message.vn_command_quick_responses', 'Quick Responses')}
          </h2>

          <div className="grid max-h-[140px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="flex cursor-pointer flex-col gap-1 rounded-md p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-tech-neon,#a413ec)] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background:
                    'color-mix(in srgb, var(--ui-royal-purple, #302839) 50%, transparent)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor:
                    'color-mix(in srgb, var(--ui-imperial-gold, #D4AF37) 30%, transparent)',
                }}
                disabled={disabled}
                data-testid={`talk-template-${tpl.id}`}
                onClick={() => handleTemplateClick(tpl)}
              >
                <strong className="text-[0.8rem] font-bold text-white/85 transition-colors duration-300">
                  {tpl.title}
                </strong>
                <span className="text-[0.7rem] text-white/40 transition-colors duration-300">
                  {tpl.prefix}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
