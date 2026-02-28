import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Save,
  FileDown,
  BookOpen,
  Film,
  Users,
  Tag,
  Hash,
} from 'lucide-react'
import { CollapsiblePanel } from './CollapsiblePanel'
import {
  useStoryWorkshopStore,
  selectCanConfirm,
  selectIsDirty,
} from '../stores/useStoryWorkshopStore'

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

interface ToolbarBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  testId?: string
}

type StatusType = 'error' | 'warn' | 'valid'

const STATUS_CONFIG: Record<StatusType, {
  Icon: typeof AlertCircle
  colorVar: string
  label: string
}> = {
  error: { Icon: AlertCircle, colorVar: 'var(--ui-danger)', label: 'Error' },
  warn: { Icon: AlertTriangle, colorVar: 'var(--ui-warning)', label: 'Warning' },
  valid: { Icon: CheckCircle, colorVar: 'var(--ui-success)', label: 'Valid' },
}

function getStatusType(hasParseError: boolean, hasErrors: boolean, hasWarnings: boolean): StatusType {
  if (hasParseError || hasErrors) return 'error'
  if (hasWarnings) return 'warn'
  return 'valid'
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--ui-muted)' }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
          {label}
        </span>
      </div>
      <span className="text-xs font-semibold" style={{ color: 'var(--ui-text)' }}>
        {value}
      </span>
    </div>
  )
}

function ToolbarBtn({ icon, label, onClick, disabled, primary, testId }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all
        hover:shadow-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]
        disabled:pointer-events-none disabled:opacity-40"
      style={{
        background: primary ? 'var(--ui-gradient-primary)' : 'var(--ui-panel)',
        color: primary ? 'var(--ui-inverse)' : 'var(--ui-text)',
        border: '1px solid var(--ui-border)',
      }}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {icon}
      {label}
    </button>
  )
}

export function WorkshopToolbar() {
  const { t } = useTranslation()
  const canConfirm = useStoryWorkshopStore(selectCanConfirm)
  const isDirty = useStoryWorkshopStore(selectIsDirty)
  const parseError = useStoryWorkshopStore((s) => s.parseError)
  const errors = useStoryWorkshopStore((s) => s.errors)
  const warnings = useStoryWorkshopStore((s) => s.warnings)
  const preview = useStoryWorkshopStore((s) => s.preview)
  const editorDraft = useStoryWorkshopStore((s) => s.editorDraft)

  async function handleSave() {
    const ok = await useStoryWorkshopStore.getState().saveToRegistry()
    if (ok) {
      console.log('[Workshop] Saved successfully')
    }
  }

  function handleExport() {
    useStoryWorkshopStore.getState().downloadDraft()
  }

  const hasParseError = !!parseError
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const statusType = getStatusType(hasParseError, hasErrors, hasWarnings)
  const { Icon: StatusIcon, colorVar, label: statusLabel } = STATUS_CONFIG[statusType]

  return (
    <aside
      className="flex w-[220px] min-w-[180px] flex-col overflow-y-auto border-r max-md:w-full max-md:border-b max-md:border-r-0"
      style={{
        background: 'var(--ui-panel-subtle)',
        borderColor: 'var(--ui-border)',
      }}
      data-testid="workshop-toolbar"
    >
      <CollapsiblePanel
        title={t('message.workshop_status', 'Status')}
        testId="workshop-status-section"
      >
        <div className="flex flex-col gap-2 p-3">
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2"
            style={{
              background: `color-mix(in srgb, ${colorVar} 10%, transparent)`,
            }}
            data-testid={`status-badge-${statusType}`}
          >
            <StatusIcon size={16} style={{ color: colorVar }} />
            <span
              className="text-xs font-semibold uppercase"
              style={{ color: colorVar }}
            >
              {statusLabel}
            </span>
          </div>

          {hasParseError && (
            <p className="m-0 text-xs" style={{ color: 'var(--ui-danger)' }}>
              {parseError}
            </p>
          )}

          {hasErrors && (
            <p className="m-0 text-xs" style={{ color: 'var(--ui-danger)' }}>
              {errors.length} {t('message.workshop_errors', 'error(s)')}
            </p>
          )}

          {hasWarnings && (
            <p className="m-0 text-xs" style={{ color: 'var(--ui-warning)' }}>
              {warnings.length} {t('message.workshop_warnings', 'warning(s)')}
            </p>
          )}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('message.workshop_statistics', 'Statistics')}
        testId="workshop-stats-section"
      >
        <div className="flex flex-col gap-1 p-3">
          <StatRow
            icon={<Tag size={14} />}
            label={t('message.workshop_version', 'Version')}
            value={preview?.packVersion ?? '-'}
          />
          <StatRow
            icon={<BookOpen size={14} />}
            label={t('message.workshop_chapters', 'Chapters')}
            value={String(preview?.chapterCount ?? 0)}
          />
          <StatRow
            icon={<Film size={14} />}
            label={t('message.workshop_scenes', 'Scenes')}
            value={String(preview?.sceneCount ?? 0)}
          />
          <StatRow
            icon={<Users size={14} />}
            label={t('message.workshop_characters', 'Characters')}
            value={String(preview?.characterCount ?? 0)}
          />
          <StatRow
            icon={<Hash size={14} />}
            label={t('message.workshop_storykey', 'Key')}
            value={preview?.storyKey ?? '-'}
          />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('message.workshop_actions', 'Actions')}
        testId="workshop-actions-section"
      >
        <div className="flex flex-col gap-2 p-3">
          <ToolbarBtn
            icon={<Save size={16} />}
            label={t('message.workshop_save', 'Save to DB')}
            onClick={handleSave}
            disabled={!canConfirm || !isDirty}
            primary
            testId="btn-save"
          />
          <ToolbarBtn
            icon={<FileDown size={16} />}
            label={t('message.workshop_export', 'Export JSON')}
            onClick={handleExport}
            disabled={!editorDraft}
            testId="btn-export"
          />
        </div>
      </CollapsiblePanel>
    </aside>
  )
}
