import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string
  label: string
}

interface TalkTemplate {
  id: string
  title: string
  prefix: string
}

interface CommandComposerProps {
  disabled?: boolean
  activeTab: 'action' | 'talk'
  actionWhitelist?: ActionItem[]
  selectedActionId: string | null
  talkText: string
  talkTemplates?: TalkTemplate[]
  disabledTalk?: boolean
  talkDisabledHint?: string
  onSwitchTab: (tab: 'action' | 'talk') => void
  onSelectAction: (id: string) => void
  onUpdateTalk: (text: string) => void
  onSelectTemplate?: (text: string) => void
  onSubmit: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandComposer({
  disabled = false,
  activeTab,
  actionWhitelist = [],
  selectedActionId,
  talkText,
  talkTemplates = [],
  disabledTalk = false,
  talkDisabledHint,
  onSwitchTab,
  onSelectAction,
  onUpdateTalk,
  onSelectTemplate,
  onSubmit,
  onCancel,
}: CommandComposerProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastClickRef = useRef<{ id: string; time: number } | null>(null)

  // Focus textarea when switching to talk tab
  useEffect(() => {
    if (activeTab === 'talk' && textareaRef.current && !disabledTalk) {
      textareaRef.current.focus()
    }
  }, [activeTab, disabledTalk])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // Only submit from action tab or if textarea is not focused
        const isTextareaFocused = document.activeElement === textareaRef.current
        if (activeTab === 'action' && selectedActionId) {
          e.preventDefault()
          onSubmit()
        } else if (activeTab === 'talk' && isTextareaFocused && talkText.trim()) {
          e.preventDefault()
          onSubmit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, activeTab, selectedActionId, talkText, onSubmit, onCancel])

  // Determine if submit is allowed
  const canSubmit =
    !disabled &&
    ((activeTab === 'action' && selectedActionId !== null) ||
      (activeTab === 'talk' && talkText.trim().length > 0 && !disabledTalk))

  // Handle action chip click (single = select, double = select + submit)
  const handleActionClick = useCallback(
    (id: string) => {
      const now = Date.now()
      const last = lastClickRef.current

      onSelectAction(id)

      if (last && last.id === id && now - last.time < 400) {
        // Double-click: submit
        lastClickRef.current = null
        // Use setTimeout so the selection state updates first
        setTimeout(() => onSubmit(), 0)
      } else {
        lastClickRef.current = { id, time: now }
      }
    },
    [onSelectAction, onSubmit],
  )

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: TalkTemplate) => {
      const prefixed = template.prefix ? `${template.prefix} ` : ''
      onUpdateTalk(prefixed)
      onSelectTemplate?.(prefixed)
      textareaRef.current?.focus()
    },
    [onUpdateTalk, onSelectTemplate],
  )

  return (
    <motion.div
      className="flex w-full max-w-[600px] flex-col overflow-hidden rounded-xl border"
      style={{
        background: 'var(--ui-panel-glass, color-mix(in srgb, var(--ui-bg) 85%, transparent))',
        borderColor: 'color-mix(in srgb, var(--ui-text) 12%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px color-mix(in srgb, var(--ui-bg) 50%, transparent)',
      }}
      data-testid="command-composer"
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
    >
      {/* Tab Switcher */}
      <div
        className="flex border-b"
        style={{ borderColor: 'color-mix(in srgb, var(--ui-text) 8%, transparent)' }}
      >
        {(['action', 'talk'] as const).map((tab) => {
          const isActive = activeTab === tab
          const label =
            tab === 'action'
              ? t('message.vn_command_action', 'Action')
              : t('message.vn_command_talk', 'Talk')
          return (
            <button
              key={tab}
              type="button"
              className="relative flex-1 cursor-pointer border-none bg-transparent px-4 py-3 text-sm font-medium tracking-[0.04em] transition-colors"
              style={{
                color: isActive
                  ? 'var(--ui-text)'
                  : 'color-mix(in srgb, var(--ui-text) 45%, transparent)',
              }}
              disabled={tab === 'talk' && disabledTalk}
              onClick={() => onSwitchTab(tab)}
            >
              {label}
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] w-full"
                  style={{ background: 'var(--ui-imperial-gold)' }}
                  layoutId="command-tab-indicator"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {/* ---- Action Tab ---- */}
        {activeTab === 'action' && (
          <div className="flex flex-col gap-3">
            {actionWhitelist.length === 0 ? (
              <div
                className="py-6 text-center text-sm"
                style={{ color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}
              >
                {t('message.vn_command_no_actions', 'No actions available.')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {actionWhitelist.map((action) => {
                  const isSelected = selectedActionId === action.id
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="cursor-pointer rounded-lg border px-3 py-2.5 text-sm font-medium tracking-[0.02em] transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--ui-imperial-gold) 15%, transparent)'
                          : 'color-mix(in srgb, var(--ui-text) 5%, transparent)',
                        borderColor: isSelected
                          ? 'var(--ui-imperial-gold)'
                          : 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
                        color: isSelected
                          ? 'var(--ui-imperial-gold)'
                          : 'var(--ui-text)',
                        boxShadow: isSelected
                          ? '0 0 12px color-mix(in srgb, var(--ui-imperial-gold) 25%, transparent)'
                          : 'none',
                      }}
                      disabled={disabled}
                      onClick={() => handleActionClick(action.id)}
                    >
                      {action.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- Talk Tab ---- */}
        {activeTab === 'talk' && (
          <div className="flex flex-col gap-3">
            {/* Disabled hint */}
            {disabledTalk && talkDisabledHint && (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{
                  background: 'color-mix(in srgb, var(--ui-warning, #f59e0b) 10%, transparent)',
                  color: 'var(--ui-warning, #f59e0b)',
                  border: '1px solid color-mix(in srgb, var(--ui-warning, #f59e0b) 20%, transparent)',
                }}
              >
                {talkDisabledHint}
              </div>
            )}

            {/* Template suggestions */}
            {talkTemplates.length > 0 && !disabledTalk && (
              <div className="flex flex-wrap gap-1.5">
                {talkTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="cursor-pointer rounded-full border bg-transparent px-3 py-1 text-xs transition-colors hover:bg-white/10"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--ui-text) 15%, transparent)',
                      color: 'color-mix(in srgb, var(--ui-text) 70%, transparent)',
                    }}
                    onClick={() => handleTemplateSelect(tpl)}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="w-full resize-none rounded-lg border bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors placeholder:opacity-40 focus:border-[var(--ui-imperial-gold)]"
              style={{
                color: 'var(--ui-text)',
                borderColor: 'color-mix(in srgb, var(--ui-text) 15%, transparent)',
                minHeight: '80px',
              }}
              placeholder={t('message.vn_command_talk_placeholder', 'Type what you want to say...')}
              value={talkText}
              disabled={disabled || disabledTalk}
              onChange={(e) => onUpdateTalk(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Footer: Submit + Cancel buttons */}
      <div
        className="flex items-center justify-end gap-2 border-t px-4 py-3"
        style={{ borderColor: 'color-mix(in srgb, var(--ui-text) 8%, transparent)' }}
      >
        <button
          type="button"
          className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium tracking-[0.02em] transition-colors hover:bg-white/10"
          style={{ color: 'var(--ui-muted)' }}
          onClick={onCancel}
        >
          {t('message.btn_cancel', 'Cancel')}
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-lg border-none px-5 py-2 text-sm font-bold tracking-[0.04em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: canSubmit
              ? 'var(--ui-primary)'
              : 'color-mix(in srgb, var(--ui-text) 15%, transparent)',
            color: canSubmit
              ? 'var(--ui-primary-fg, #fff)'
              : 'color-mix(in srgb, var(--ui-text) 40%, transparent)',
            boxShadow: canSubmit
              ? '0 2px 12px color-mix(in srgb, var(--ui-primary) 30%, transparent)'
              : 'none',
          }}
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {t('message.btn_submit', 'Submit')}
        </button>
      </div>
    </motion.div>
  )
}
