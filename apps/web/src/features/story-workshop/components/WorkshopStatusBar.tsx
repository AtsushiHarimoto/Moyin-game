import { useTranslation } from 'react-i18next'
import { useStoryWorkshopStore, selectIsDirty } from '../stores/useStoryWorkshopStore'

export function WorkshopStatusBar(): React.JSX.Element {
  const { t } = useTranslation()
  const isDirty = useStoryWorkshopStore(selectIsDirty)
  const draft = useStoryWorkshopStore((s) => s.editorDraft)

  return (
    <div
      className="flex h-7 items-center justify-between px-4"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderTop: '1px solid var(--ui-border)',
      }}
      data-testid="workshop-statusbar"
    >
      <span className="text-xs" style={{ color: isDirty ? 'var(--ui-warning)' : 'var(--ui-muted)' }}>
        {isDirty
          ? t('message.workshop_unsaved', 'Unsaved changes')
          : t('message.workshop_saved', 'All changes saved')}
      </span>
      <span className="text-xs" style={{ color: 'var(--ui-muted)', fontFamily: 'var(--ui-font-mono)' }}>
        {t('message.workshop_chars', 'Chars')}: {draft.length.toLocaleString()}
      </span>
    </div>
  )
}
