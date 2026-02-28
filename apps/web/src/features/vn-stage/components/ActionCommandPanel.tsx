import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string
  label: string
  keywords?: string[]
}

interface ActionCommandPanelProps {
  actions?: ActionItem[]
  selectedId?: string | null
  disabled?: boolean
  onSelect: (id: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionCommandPanel({
  actions = [],
  selectedId = null,
  disabled = false,
  onSelect,
}: ActionCommandPanelProps) {
  const { t } = useTranslation()

  if (actions.length === 0) {
    return (
      <div
        className="py-6 text-center text-sm"
        style={{ color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}
      >
        {t('message.vn_command_no_actions', 'No actions available.')}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col" data-testid="action-command-panel">
      {/* Section label */}
      <h2
        className="mb-3 ml-1 text-[0.65rem] font-bold uppercase tracking-[0.15em]"
        style={{ color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}
      >
        {t('message.vn_command_select_directive', 'Select Directive')}
      </h2>

      {/* Action chip grid */}
      <div className="grid max-h-[200px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
        {actions.map((action) => {
          const isSelected = selectedId === action.id
          return (
            <button
              key={action.id}
              type="button"
              className="relative flex items-center justify-between overflow-hidden rounded-md px-3 py-3 text-[0.8rem] font-bold uppercase tracking-[0.05em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: isSelected
                  ? 'color-mix(in srgb, var(--ui-tech-neon, #a413ec) 25%, transparent)'
                  : 'color-mix(in srgb, var(--ui-royal-purple, #302839) 50%, transparent)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isSelected
                  ? 'var(--ui-tech-neon, #a413ec)'
                  : 'color-mix(in srgb, var(--ui-imperial-gold, #D4AF37) 30%, transparent)',
                color: isSelected
                  ? '#fff'
                  : 'rgba(255, 255, 255, 0.85)',
                boxShadow: isSelected
                  ? '0 0 15px color-mix(in srgb, var(--ui-tech-neon, #a413ec) 40%, transparent)'
                  : 'none',
              }}
              disabled={disabled}
              data-testid={`action-chip-${action.id}`}
              onClick={() => onSelect(action.id)}
            >
              <span className="relative z-10">{action.label}</span>
              <span
                className="relative z-10 text-sm transition-opacity duration-300"
                style={{
                  opacity: isSelected ? 1 : 0,
                  color: 'var(--ui-tech-neon, #a413ec)',
                }}
              >
                &#8594;
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
