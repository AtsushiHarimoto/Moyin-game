import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import type { SaveSlotRow } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKind = 'save' | 'load'

interface QuickSaveLoadDrawerProps {
  open?: boolean
  activeTab?: TabKind
  slots?: SaveSlotRow[]
  busy?: boolean
  saving?: boolean
  loadingSlotId?: string | null
  error?: string | null
  isDirty?: boolean
  onClose?: () => void
  onUpdateActiveTab?: (tab: TabKind) => void
  onSave?: (title?: string) => void
  onLoad?: (slotId: string) => void
  onDelete?: (slotId: string) => void
  onRename?: (slotId: string, newTitle: string) => void
  onReplay?: (slotId: string) => void
}

interface DialogResult {
  confirmed?: boolean
}

interface WindowWithDialog extends Window {
  $dialog?: {
    open?: (options: Record<string, unknown>) => Promise<DialogResult> | undefined
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: string): string {
  const d = new Date(ts)
  return (
    d.toLocaleDateString() +
    ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )
}

function getCoverStyle(slot: SaveSlotRow): React.CSSProperties {
  if (slot.preview?.screenshotUrl) {
    return { backgroundImage: `url(${slot.preview.screenshotUrl})` }
  }
  return {
    background:
      'linear-gradient(135deg, var(--ui-bg) 0%, var(--ui-panel) 100%)',
  }
}

async function confirmDialog(options: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}): Promise<boolean> {
  const win = window as WindowWithDialog
  const dialog = win.$dialog?.open?.(options)
  if (dialog) {
    return await dialog.then((r: DialogResult) => r?.confirmed ?? false)
  }
  return window.confirm(`${options.title}\n${options.message}`)
}

// ---------------------------------------------------------------------------
// Inline Icons
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function SpinIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ color: 'var(--ui-imperial-gold)' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickSaveLoadDrawer({
  open = false,
  activeTab = 'save',
  slots = [],
  busy = false,
  saving: _saving = false,
  loadingSlotId = null,
  error: _error = null,
  isDirty: _isDirty = true,
  onClose,
  onUpdateActiveTab,
  onSave,
  onLoad,
  onDelete,
  onRename,
  onReplay: _onReplay,
}: QuickSaveLoadDrawerProps) {
  const { t } = useTranslation()

  const handleSaveNew = useCallback(() => {
    if (busy) return
    onSave?.()
  }, [busy, onSave])

  const confirmOverwrite = useCallback(
    async (slot: SaveSlotRow) => {
      if (busy) return
      const confirmed = await confirmDialog({
        title: t('message.confirm_overwrite_title'),
        message: t('message.confirm_overwrite_msg', { title: slot.title }),
        confirmText: t('message.vn_quick_save_overwrite_btn'),
        cancelText: t('message.cancel'),
      })
      if (confirmed) {
        onDelete?.(slot.slotId)
        setTimeout(() => {
          onSave?.(slot.title || `Save ${new Date().toLocaleString()}`)
        }, 100)
      }
    },
    [busy, t, onDelete, onSave],
  )

  const handleLoad = useCallback(
    (slotId: string) => {
      if (busy) return
      onLoad?.(slotId)
    },
    [busy, onLoad],
  )

  const handleDelete = useCallback(
    async (slotId: string) => {
      const confirmed = await confirmDialog({
        title: t('message.confirm_delete_title'),
        message: t('message.confirm_delete_msg'),
        confirmText: t('message.delete'),
        cancelText: t('message.cancel'),
      })
      if (confirmed) onDelete?.(slotId)
    },
    [t, onDelete],
  )

  const confirmRenameSlot = useCallback(
    async (slot: SaveSlotRow) => {
      const newTitle = window.prompt(t('message.rename_prompt'), slot.title)
      if (newTitle && newTitle.trim() !== slot.title) {
        onRename?.(slot.slotId, newTitle.trim())
      }
    },
    [t, onRename],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex justify-end"
          data-testid="vn-quick-save-drawer"
          role="dialog"
          aria-modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'var(--ui-vn-overlay-bg)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative flex h-full w-full max-w-[500px] flex-col border-l"
            style={{
              background: 'var(--ui-panel)',
              borderColor: 'var(--ui-imperial-gold-soft)',
              boxShadow: '-10px 0 40px color-mix(in srgb, var(--ui-bg) 60%, transparent)',
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Decorative Top Border */}
            <div
              className="absolute left-0 right-0 top-0 h-0.5 opacity-70"
              style={{ background: 'linear-gradient(90deg, transparent, var(--ui-imperial-gold), transparent)' }}
            />

            {/* Header */}
            <div className="flex flex-col gap-4 px-6 pb-4 pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1
                    className="m-0 text-2xl font-bold tracking-[0.15em]"
                    style={{
                      color: 'var(--ui-imperial-gold)',
                      fontFamily: 'var(--ui-font-display)',
                      textShadow: '0 0 10px color-mix(in srgb, var(--ui-imperial-gold) 30%, transparent)',
                    }}
                  >
                    {t('message.vn_quick_save_title')}
                  </h1>
                  <p
                    className="mt-1 text-xs font-medium uppercase tracking-[0.1em]"
                    style={{ color: 'var(--ui-imperial-gold-soft)' }}
                  >
                    {t('message.vn_quick_save_subtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border bg-transparent transition-all hover:shadow-md"
                  style={{ borderColor: 'var(--ui-imperial-gold-soft)', color: 'var(--ui-imperial-gold)' }}
                  onClick={onClose}
                >
                  <CloseIcon />
                </button>
              </div>

              {/* Tech connection line */}
              <div className="flex items-center gap-2 opacity-60">
                <div className="h-2 w-2 rounded-full" style={{ background: 'var(--ui-primary)', boxShadow: '0 0 5px var(--ui-primary)' }} />
                <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--ui-primary) 50%, transparent), transparent)' }} />
                <div className="text-[10px] tracking-[0.1em]" style={{ color: 'var(--ui-primary)', fontFamily: 'var(--ui-font-mono)' }}>
                  {t('message.vn_quick_save_connected')}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b px-6 pb-5" style={{ borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)' }}>
              <div className="relative flex">
                {/* Active indicator */}
                <div
                  className="absolute -bottom-px h-0.5 w-1/2 transition-all duration-300"
                  style={{
                    left: activeTab === 'save' ? '0%' : '50%',
                    background: 'var(--ui-imperial-gold)',
                    boxShadow: '0 -2px 10px color-mix(in srgb, var(--ui-imperial-gold) 50%, transparent)',
                  }}
                />
                <button
                  type="button"
                  className={`flex-1 border-none bg-transparent py-3 text-sm font-bold tracking-[0.2em] cursor-pointer transition-all
                    ${activeTab === 'save' ? '' : ''}`}
                  style={{
                    color: activeTab === 'save'
                      ? 'var(--ui-imperial-gold)'
                      : 'color-mix(in srgb, var(--ui-text) 50%, transparent)',
                    textShadow: activeTab === 'save'
                      ? '0 0 10px color-mix(in srgb, var(--ui-imperial-gold) 30%, transparent)'
                      : 'none',
                  }}
                  onClick={() => onUpdateActiveTab?.('save')}
                >
                  {t('message.vn_quick_save_tab_save')}
                </button>
                <button
                  type="button"
                  className="flex-1 border-none bg-transparent py-3 text-sm font-bold tracking-[0.2em] cursor-pointer transition-all"
                  style={{
                    color: activeTab === 'load'
                      ? 'var(--ui-imperial-gold)'
                      : 'color-mix(in srgb, var(--ui-text) 50%, transparent)',
                    textShadow: activeTab === 'load'
                      ? '0 0 10px color-mix(in srgb, var(--ui-imperial-gold) 30%, transparent)'
                      : 'none',
                  }}
                  onClick={() => onUpdateActiveTab?.('load')}
                >
                  {t('message.vn_quick_save_tab_load')}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto px-6 py-5">
              {/* Busy overlay */}
              {busy && (
                <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'color-mix(in srgb, var(--ui-bg) 70%, transparent)' }}>
                  <SpinIcon />
                </div>
              )}

              {/* SAVE TAB */}
              {activeTab === 'save' && (
                <div className="flex flex-col gap-4">
                  <div
                    className="mb-3 text-[10px] font-bold tracking-[0.1em]"
                    style={{ color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}
                  >
                    {t('message.vn_quick_save_overwrite_label')}
                  </div>

                  {slots.length > 0 ? (
                    slots.map((slot, idx) => (
                      <div
                        key={slot.slotId}
                        data-testid="save-slot-card"
                        className="group relative flex cursor-pointer gap-4 overflow-hidden rounded-md border p-3 transition-all hover:shadow-md"
                        style={{
                          background: 'color-mix(in srgb, var(--ui-bg) 20%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
                        }}
                        onClick={() => confirmOverwrite(slot)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-[120px] shrink-0 overflow-hidden rounded-md border" style={{ aspectRatio: '16/9', borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)' }}>
                          <div className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={getCoverStyle(slot)} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--ui-bg) 60%, transparent), transparent)' }} />
                        </div>
                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-[0.1em] transition-colors" style={{ fontFamily: 'var(--ui-font-mono)', color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}>
                              SLOT #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[10px]" style={{ color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)' }}>
                              {formatDate(slot.updatedAt)}
                            </span>
                          </div>
                          <h3 className="m-0 truncate text-sm font-semibold transition-colors" style={{ color: 'color-mix(in srgb, var(--ui-text) 90%, transparent)' }}>
                            {slot.title || t('message.slot_no_title')}
                          </h3>
                          <p className="m-0 mt-1 truncate text-[10px]" style={{ color: 'color-mix(in srgb, var(--ui-text) 50%, transparent)' }}>
                            {slot.preview?.textSnippet || t('message.slot_no_snippet')}
                          </p>
                          <div className="mt-1 flex justify-end">
                            <span
                              className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] opacity-0 transition-opacity group-hover:opacity-100"
                              style={{
                                color: 'var(--ui-primary)',
                                borderColor: 'color-mix(in srgb, var(--ui-primary) 30%, transparent)',
                                background: 'color-mix(in srgb, var(--ui-primary) 10%, transparent)',
                              }}
                            >
                              {t('message.vn_quick_save_overwrite_btn')}
                            </span>
                          </div>
                        </div>
                        {/* Corner decorations */}
                        <div className="absolute right-0 top-0 h-2 w-2 border-r border-t opacity-30 transition-opacity group-hover:opacity-100" style={{ borderColor: 'var(--ui-imperial-gold)' }} />
                        <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l opacity-30 transition-opacity group-hover:opacity-100" style={{ borderColor: 'var(--ui-imperial-gold)' }} />
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs italic" style={{ color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)' }}>
                      {t('message.vn_quick_save_no_saves')}
                    </div>
                  )}

                  {/* New save button */}
                  <button
                    type="button"
                    className="flex items-center gap-4 rounded-md border border-dashed bg-transparent p-3 cursor-pointer transition-all hover:border-solid"
                    style={{ borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)' }}
                    disabled={busy}
                    onClick={handleSaveNew}
                  >
                    <div
                      className="flex w-[120px] items-center justify-center rounded-md"
                      style={{
                        aspectRatio: '16/9',
                        background: 'color-mix(in srgb, var(--ui-text) 5%, transparent)',
                        color: 'var(--ui-imperial-gold)',
                      }}
                    >
                      <PlusIcon />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <h3 className="m-0 text-sm font-semibold" style={{ color: 'color-mix(in srgb, var(--ui-text) 90%, transparent)' }}>
                        {t('message.vn_quick_save_new_save')}
                      </h3>
                      <p className="m-0 mt-1 text-[10px]" style={{ color: 'color-mix(in srgb, var(--ui-text) 50%, transparent)' }}>
                        {t('message.vn_quick_save_new_hint')}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* LOAD TAB */}
              {activeTab === 'load' && (
                <div className="flex flex-col gap-4">
                  {slots.length > 0 ? (
                    slots.map((slot, idx) => (
                      <div
                        key={slot.slotId}
                        data-testid="save-slot-card"
                        className={`group relative flex cursor-pointer gap-4 overflow-hidden rounded-md border p-3 transition-all hover:shadow-md
                          ${loadingSlotId === slot.slotId ? 'opacity-60' : ''}`}
                        style={{
                          background: 'color-mix(in srgb, var(--ui-bg) 20%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
                        }}
                        onClick={() => handleLoad(slot.slotId)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-[120px] shrink-0 overflow-hidden rounded-md border" style={{ aspectRatio: '16/9', borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)' }}>
                          <div className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={getCoverStyle(slot)} />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--ui-bg) 60%, transparent), transparent)' }} />
                        </div>
                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-[0.1em]" style={{ fontFamily: 'var(--ui-font-mono)', color: 'color-mix(in srgb, var(--ui-text) 40%, transparent)' }}>
                              SLOT #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[10px]" style={{ color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)' }}>
                              {formatDate(slot.updatedAt)}
                            </span>
                          </div>
                          <h3 className="m-0 truncate text-sm font-semibold" style={{ color: 'color-mix(in srgb, var(--ui-text) 90%, transparent)' }}>
                            {slot.title || t('message.slot_no_title')}
                          </h3>
                          <p className="m-0 mt-1 truncate text-[10px]" style={{ color: 'color-mix(in srgb, var(--ui-text) 50%, transparent)' }}>
                            {slot.preview?.textSnippet || t('message.slot_no_snippet')}
                          </p>
                        </div>
                        {/* Delete / Rename actions */}
                        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100" style={{ transform: 'translateY(4px)' }}>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md border cursor-pointer transition-all hover:bg-[var(--ui-text)] hover:text-[var(--ui-bg)]"
                            style={{
                              background: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--ui-text) 20%, transparent)',
                              color: 'var(--ui-text)',
                            }}
                            title={t('message.edit')}
                            onClick={(e) => { e.stopPropagation(); confirmRenameSlot(slot) }}
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md border cursor-pointer transition-all hover:border-red-500 hover:bg-red-500 hover:text-white"
                            style={{
                              background: 'color-mix(in srgb, var(--ui-text) 10%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--ui-text) 20%, transparent)',
                              color: 'var(--ui-text)',
                            }}
                            title={t('message.delete')}
                            onClick={(e) => { e.stopPropagation(); handleDelete(slot.slotId) }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        {/* Corners */}
                        <div className="absolute right-0 top-0 h-2 w-2 border-r border-t opacity-30 transition-opacity group-hover:opacity-100" style={{ borderColor: 'var(--ui-imperial-gold)' }} />
                        <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l opacity-30 transition-opacity group-hover:opacity-100" style={{ borderColor: 'var(--ui-imperial-gold)' }} />
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs italic" style={{ color: 'color-mix(in srgb, var(--ui-text) 30%, transparent)' }}>
                      {t('message.vn_quick_save_no_data')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-5" style={{ borderColor: 'color-mix(in srgb, var(--ui-text) 10%, transparent)', background: 'color-mix(in srgb, var(--ui-bg) 20%, transparent)' }}>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-transparent px-3 py-3 text-xs font-bold tracking-[0.1em] transition-all hover:bg-white/5"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--ui-text) 20%, transparent)',
                    color: 'color-mix(in srgb, var(--ui-text) 70%, transparent)',
                  }}
                >
                  {/* Cloud upload icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 16l-4-4-4 4M12 12v9" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                  {t('message.vn_quick_save_cloud_sync')}
                </button>
                <button
                  type="button"
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-3 text-xs font-bold tracking-[0.1em] transition-all"
                  style={{
                    borderColor: 'var(--ui-imperial-gold)',
                    background: 'color-mix(in srgb, var(--ui-imperial-gold) 10%, transparent)',
                    color: 'var(--ui-imperial-gold)',
                    boxShadow: '0 0 10px color-mix(in srgb, var(--ui-imperial-gold) 20%, transparent)',
                  }}
                  disabled={busy}
                  onClick={handleSaveNew}
                >
                  {/* Save icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {t('message.vn_quick_save_quick_save')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
