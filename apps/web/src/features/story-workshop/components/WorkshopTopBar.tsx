import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlignLeft, Check, Undo2 } from 'lucide-react'
import {
  useStoryWorkshopStore,
  selectIsDirty,
} from '../stores/useStoryWorkshopStore'

interface WorkshopTopBarProps {
  onBack: () => void
}

interface TopBarBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}

function TopBarBtn({ icon, label, onClick, disabled, primary }: TopBarBtnProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all
        hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]
        disabled:pointer-events-none disabled:opacity-40"
      style={{
        background: primary
          ? 'var(--ui-gradient-primary)'
          : 'color-mix(in srgb, var(--ui-panel) 60%, transparent)',
        color: primary ? 'var(--ui-inverse)' : 'var(--ui-text)',
        border: '1px solid var(--ui-border)',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className="max-sm:hidden">{label}</span>
    </button>
  )
}

export function WorkshopTopBar({ onBack }: WorkshopTopBarProps) {
  const { t } = useTranslation()
  const isDirty = useStoryWorkshopStore(selectIsDirty)
  const title = useStoryWorkshopStore(
    (s) => s.preview?.title ?? t('message.workshop_untitled', 'Untitled'),
  )

  function handleFormat() {
    const { editorDraft, updateDraft } = useStoryWorkshopStore.getState()
    try {
      const parsed = JSON.parse(editorDraft)
      updateDraft(JSON.stringify(parsed, null, 2))
    } catch {
      // JSON parse 失敗時靜默忽略，保留原文
    }
  }

  function handleApply() {
    useStoryWorkshopStore.getState().applyDraft(true)
  }

  function handleRevert() {
    const shouldRevert =
      !isDirty || window.confirm(t('message.workshop_revert_confirm', 'Discard all changes?'))
    if (shouldRevert) {
      useStoryWorkshopStore.getState().revertDraft()
    }
  }

  return (
    <header
      className="flex h-14 items-center gap-3 border-b px-4"
      style={{
        background: 'color-mix(in srgb, var(--ui-panel) 80%, transparent)',
        borderColor: 'var(--ui-border)',
        backdropFilter: 'blur(12px)',
      }}
      data-testid="workshop-topbar"
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all
          hover:bg-[color-mix(in_srgb,var(--ui-primary)_10%,transparent)]
          focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]"
        style={{ color: 'var(--ui-text)' }}
        onClick={onBack}
      >
        <ArrowLeft size={18} />
        <span className="max-sm:hidden">{t('message.btn_back', 'Back')}</span>
      </button>

      <div className="h-6 w-px" style={{ background: 'var(--ui-border)' }} />

      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <span
          className="text-xs font-bold uppercase tracking-[0.1em]"
          style={{ color: 'var(--ui-muted)' }}
        >
          WORKSHOP:
        </span>
        <span
          className="truncate text-sm font-medium"
          style={{ color: 'var(--ui-text)' }}
        >
          {title}
        </span>
        {isDirty && (
          <span
            className="ml-1 inline-block h-2 w-2 rounded-full"
            style={{ background: 'var(--ui-warning)' }}
            title="Unsaved changes"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <TopBarBtn
          icon={<AlignLeft size={16} />}
          label={t('message.workshop_format', 'Format')}
          onClick={handleFormat}
        />
        <TopBarBtn
          icon={<Check size={16} />}
          label={t('message.workshop_apply', 'Apply')}
          onClick={handleApply}
          disabled={!isDirty}
          primary
        />
        <TopBarBtn
          icon={<Undo2 size={16} />}
          label={t('message.workshop_revert', 'Revert')}
          onClick={handleRevert}
          disabled={!isDirty}
        />
      </div>
    </header>
  )
}
