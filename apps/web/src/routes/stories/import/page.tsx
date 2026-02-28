import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'
import GameIcon from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { StoryFlowCanvas } from '@/features/story-preview/components'
import type { StoryPackJson } from '@/features/story-preview/components'
import {
  useStoryImportStore,
  selectCanConfirm,
  buildPreviewSummaryFromJson,
  type StoryPreviewSummary,
} from '@/features/story-import/stores/useStoryImportStore'
import { useStoryWorkshopStore } from '@/features/story-workshop/stores/useStoryWorkshopStore'
import { usePackRegistryStore } from '@/features/story-import/stores/usePackRegistryStore'

/**
 * StoryImportPage - Multi-step story JSON file import wizard.
 *
 * Flow:
 *   Step 1: File upload zone (drag & drop or browse)
 *   Step 2: Validation preview (show parsed info, errors, warnings)
 *   Step 3: Success feedback -> navigate to /stories
 *
 * Uses useStoryImportStore for state management.
 * On confirm, data goes through useStoryWorkshopStore -> usePackRegistryStore.
 */
export default function StoryImportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const step = useStoryImportStore((s) => s.step)
  const isParsing = useStoryImportStore((s) => s.isParsing)
  const errors = useStoryImportStore((s) => s.errors)
  const warnings = useStoryImportStore((s) => s.warnings)
  const importResult = useStoryImportStore((s) => s.importResult)
  const parsedJson = useStoryImportStore((s) => s.parsedJson)

  const selectFile = useStoryImportStore((s) => s.selectFile)
  const reset = useStoryImportStore((s) => s.reset)
  const confirmImport = useStoryImportStore((s) => s.confirmImport)

  const canConfirm = useStoryImportStore(selectCanConfirm)
  const preview = useMemo(
    () => buildPreviewSummaryFromJson(parsedJson),
    [parsedJson],
  )

  // Reset import state on mount
  useEffect(() => {
    reset()
  }, [reset])

  // On success, auto-save to registry then navigate
  const handleConfirmAndSave = useCallback(async () => {
    // First call confirmImport to fill WorkshopStore
    await confirmImport()

    // Then save to registry via WorkshopStore
    const workshop = useStoryWorkshopStore.getState()
    const saved = await workshop.saveToRegistry()

    if (saved) {
      // Refresh pack registry in-memory cache
      await usePackRegistryStore.getState().refresh()
    }
  }, [confirmImport])

  // Navigate to library on success
  const handleGoToLibrary = useCallback(() => {
    reset()
    navigate('/stories')
  }, [reset, navigate])

  // Step indicators
  const steps = [
    { label: t('message.import_step_1', '1. Select'), step: 1 },
    { label: t('message.import_step_2', '2. Verify'), step: 2 },
    { label: t('message.import_step_3', '3. Finish'), step: 3 },
  ]

  let currentStepIndex = 0
  if (importResult === 'success') currentStepIndex = 2
  else if (step === 2) currentStepIndex = 1

  return (
    <div className="flex h-full w-full flex-col gap-8 overflow-y-auto p-8 max-sm:p-4">
      {/* Header — V1 horizontal layout */}
      <header className="flex items-center justify-between">
        <h1
          className="m-0 text-[clamp(1.5rem,4vw,2.5rem)] font-bold tracking-tight"
          style={{
            color: 'var(--ui-text)',
            textShadow:
              '0 0 30px color-mix(in srgb, var(--ui-primary) 20%, transparent)',
          }}
        >
          {t('message.import_story_title', 'Import New Story')}
        </h1>
        <button
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-panel-glass)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-muted)',
          }}
          onClick={() => {
            reset()
            navigate('/stories')
          }}
        >
          <GameIcon name="back" size={16} />
          {t('message.btn_back', 'Back')}
        </button>
      </header>

      {/* Step Indicator — plain text centered */}
      <div className="flex items-center justify-center gap-6">
        {steps.map((s, i) => (
          <span
            key={s.step}
            className="text-sm font-medium transition-colors"
            style={{
              color:
                i <= currentStepIndex
                  ? 'var(--ui-primary)'
                  : 'var(--ui-muted)',
              opacity: i <= currentStepIndex ? 1 : 0.5,
            }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Content Area */}
      <div className={cn("mx-auto w-full", importResult !== 'success' && "max-w-[800px]")}>
        <AnimatePresence mode="wait">
          {importResult === 'success' ? (
            /* Step 3: Flow Canvas Preview */
            <motion.div
              key="flow-preview"
              className="h-[600px] w-full overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--ui-border)',
                background: 'var(--ui-panel)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <StoryFlowCanvas
                storyPack={(parsedJson as StoryPackJson) ?? { storyKey: 'unknown', title: 'Untitled' }}
                readOnly
                onBack={handleGoToLibrary}
              />
            </motion.div>
          ) : step === 1 ? (
            /* Step 1: File Upload */
            <DropZone
              key="dropzone"
              isParsing={isParsing}
              onFileSelected={selectFile}
            />
          ) : (
            /* Step 2: Validation / Preview */
            <ValidationPanel
              key="validation"
              preview={preview}
              errors={errors}
              warnings={warnings}
              canConfirm={canConfirm}
              parsedJson={parsedJson}
              onConfirm={handleConfirmAndSave}
              onReset={reset}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function DropZone({
  isParsing,
  onFileSelected,
}: {
  isParsing: boolean
  onFileSelected: (file: File) => Promise<void>
}) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        onFileSelected(droppedFile)
      }
    },
    [onFileSelected],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) {
        onFileSelected(selected)
      }
    },
    [onFileSelected],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      {/* Glass panel outer container */}
      <div
        className="flex flex-col gap-6 rounded-[1.5rem] border p-8"
        style={{
          background: 'var(--ui-panel-glass)',
          borderColor: 'var(--ui-border)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--ui-shadow-soft)',
        }}
      >
        {/* Title & subtitle above dashed area */}
        <div className="text-center">
          <h2
            className="m-0 text-xl font-bold"
            style={{ color: 'var(--ui-text)' }}
          >
            {t('message.import_drop_title', 'Drag & Drop Story Package Here')}
          </h2>
          <p
            className="m-0 mt-2 text-sm"
            style={{ color: 'var(--ui-muted)' }}
          >
            {t('message.import_drop_sub', 'Supports .zip, .json (Moyin v1.0+)')}
          </p>
        </div>

        {/* Dashed drop area */}
        <div
          className={cn(
            'relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed p-8 text-center transition-all',
            isDragOver && 'scale-[1.01]',
          )}
          style={{
            borderColor: isDragOver
              ? 'var(--ui-imperial-gold)'
              : 'var(--ui-border)',
            background: 'transparent',
            boxShadow: isDragOver
              ? 'var(--ui-imperial-gold-glow)'
              : undefined,
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          {isParsing ? (
            <Loader2
              size={48}
              className="animate-spin"
              style={{ color: 'var(--ui-primary)' }}
            />
          ) : (
            <>
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full transition-all"
                style={{
                  background:
                    'color-mix(in srgb, var(--ui-imperial-gold) 10%, transparent)',
                  color: 'var(--ui-imperial-gold)',
                }}
              >
                <GameIcon name="cloud-upload" size={48} />
              </div>

              <button
                className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{
                  background: 'var(--ui-panel-glass)',
                  borderColor:
                    'color-mix(in srgb, var(--ui-imperial-gold) 40%, transparent)',
                  color: 'var(--ui-imperial-gold)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                {t('message.import_browse_btn', 'Browse Files')}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ValidationPanel({
  preview,
  errors,
  warnings,
  canConfirm,
  parsedJson,
  onConfirm,
  onReset,
}: {
  preview: StoryPreviewSummary | null
  errors: { id: string; message: string; type: 'error' | 'warning' }[]
  warnings: { id: string; message: string; type: 'error' | 'warning' }[]
  canConfirm: boolean
  parsedJson: Record<string, unknown> | null
  onConfirm: () => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }, [onConfirm])

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      {/* Validation Success Badge — V1 style */}
      {parsedJson && errors.length === 0 && (
        <div
          className="flex items-center gap-2 rounded-xl border p-4"
          style={{
            background:
              'color-mix(in srgb, var(--ui-success) 10%, var(--ui-panel))',
            borderColor:
              'color-mix(in srgb, var(--ui-success) 20%, transparent)',
          }}
        >
          <CheckCircle2 size={18} style={{ color: 'var(--ui-success)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ui-success)' }}
          >
            {t('message.import_json_validated', 'JSON Value Validated')}
          </span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{
            background:
              'color-mix(in srgb, var(--ui-danger) 5%, var(--ui-panel))',
            borderColor:
              'color-mix(in srgb, var(--ui-danger) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <XCircle size={18} style={{ color: 'var(--ui-danger)' }} />
            <h3
              className="m-0 text-sm font-bold"
              style={{ color: 'var(--ui-danger)' }}
            >
              {t('message.errors_title', 'Errors')} ({errors.length})
            </h3>
          </div>
          {errors.map((err) => (
            <div
              key={err.id}
              className="rounded-lg border px-4 py-2.5 text-xs"
              style={{
                background: 'var(--ui-panel)',
                borderColor:
                  'color-mix(in srgb, var(--ui-danger) 15%, transparent)',
                color: 'var(--ui-text)',
              }}
            >
              <span
                className="mr-2 font-mono text-[10px] font-bold"
                style={{ color: 'var(--ui-danger)' }}
              >
                [{err.id}]
              </span>
              {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5"
          style={{
            background:
              'color-mix(in srgb, var(--ui-warning) 5%, var(--ui-panel))',
            borderColor:
              'color-mix(in srgb, var(--ui-warning) 20%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--ui-warning)' }}>
              <GameIcon name="warning" size={18} />
            </span>
            <h3
              className="m-0 text-sm font-bold"
              style={{ color: 'var(--ui-warning)' }}
            >
              {t('message.warnings_title', 'Warnings')} ({warnings.length})
            </h3>
          </div>
          {warnings.map((warn) => (
            <div
              key={warn.id}
              className="rounded-lg border px-4 py-2.5 text-xs"
              style={{
                background: 'var(--ui-panel)',
                borderColor:
                  'color-mix(in srgb, var(--ui-warning) 15%, transparent)',
                color: 'var(--ui-text)',
              }}
            >
              <span
                className="mr-2 font-mono text-[10px] font-bold"
                style={{ color: 'var(--ui-warning)' }}
              >
                [{warn.id}]
              </span>
              {warn.message}
            </div>
          ))}
        </div>
      )}

      {/* Preview Summary — V1 style */}
      {preview && (
        <div
          className="rounded-xl border p-6"
          style={{
            background: 'color-mix(in srgb, black 20%, transparent)',
            borderColor: 'color-mix(in srgb, white 5%, transparent)',
          }}
        >
          <h3
            className="m-0 mb-4 border-b pb-2 text-sm font-semibold"
            style={{
              color: 'var(--ui-text)',
              borderColor: 'color-mix(in srgb, white 10%, transparent)',
            }}
          >
            {t('message.preview_title', 'Preview Summary')}
          </h3>

          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <PreviewField
              label={t('message.label_title', 'Title')}
              value={preview.title}
            />
            <PreviewField
              label={t('message.label_key', 'Key')}
              value={preview.storyKey}
              mono
            />
            <PreviewField
              label={t('message.label_version', 'Version')}
              value={preview.packVersion}
              mono
            />
            <PreviewField
              label={t('message.label_scenes', 'Scenes')}
              value={String(preview.sceneCount ?? 0)}
            />
          </div>
        </div>
      )}

      {/* Actions — V1 style right-aligned */}
      <div className="flex items-center justify-end gap-4">
        <button
          className="flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-panel-glass)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-muted)',
          }}
          onClick={onReset}
        >
          <GameIcon name="back" size={16} />
          {t('message.btn_back', 'Back')}
        </button>

        <button
          className={cn(
            'flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]',
            !canConfirm && 'cursor-not-allowed opacity-50',
          )}
          style={{
            background: canConfirm
              ? 'var(--ui-gradient-primary)'
              : 'var(--ui-panel-glass)',
            borderColor: canConfirm ? 'transparent' : 'var(--ui-border)',
            color: canConfirm ? 'var(--ui-inverse)' : 'var(--ui-muted)',
            boxShadow: canConfirm
              ? '0 4px 15px color-mix(in srgb, var(--ui-primary) 40%, transparent)'
              : undefined,
          }}
          disabled={!canConfirm || isConfirming}
          onClick={handleConfirm}
        >
          {isConfirming ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          {warnings.length > 0 && canConfirm
            ? t(
                'message.import_confirm_with_warnings',
                'Confirm (with Warnings)',
              )
            : t('message.import_confirm_btn', 'Confirm Import')}
        </button>
      </div>
    </motion.div>
  )
}

function PreviewField({
  label,
  value,
  mono,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className="m-0 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--ui-muted)' }}
      >
        {label}
      </p>
      <p
        className={cn(
          'm-0 text-sm font-semibold',
          mono && 'font-mono text-xs',
        )}
        style={{ color: 'var(--ui-text)' }}
      >
        {value || '-'}
      </p>
    </div>
  )
}
