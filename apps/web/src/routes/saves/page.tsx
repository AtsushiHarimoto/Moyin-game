import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  RotateCcw,
  Image,
  Clock,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import Icon from '@/components/ui/Icon'
import { moyinDb } from '@/db/moyinDb'
import { deleteSaveSlot } from '@moyin/vn-engine'
import type { SaveSlotRow } from '@moyin/vn-engine'

/**
 * SavesPage - Save management page with grid/list view and pagination.
 * Loads save slots from moyinDb (IndexedDB) and provides Load, Delete, and Replay actions.
 */

const PAGE_SIZE = 6

/** Mapped save data for display */
interface SaveDisplayData {
  slotId: string
  storyKey: string
  packVersion: string
  title: string
  timestamp: string
  sceneId?: string
  textSnippet?: string
  screenshotUrl?: string
  endingId?: string
}

function mapSlotToDisplay(slot: SaveSlotRow): SaveDisplayData {
  const preview = slot.preview || {}
  return {
    slotId: slot.slotId,
    storyKey: slot.storyKey,
    packVersion: slot.packVersion,
    title: slot.title || `Save ${slot.slotId?.slice(-6) || ''}`,
    timestamp: slot.updatedAt || slot.createdAt,
    sceneId: preview.sceneId,
    textSnippet: preview.textSnippet,
    screenshotUrl: preview.screenshotUrl || preview.coverAssetKey,
    endingId: preview.endingId,
  }
}

function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

// ---- Animation variants ----
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export default function SavesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [list, setList] = useState<SaveDisplayData[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)

  // Load save data from IndexedDB
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allSlots = await moyinDb.saveSlots.toArray()
      const sorted = allSlots
        .filter((slot: { deletedAt?: string | null }) => !slot.deletedAt)
        .sort(
          (a: { updatedAt: string }, b: { updatedAt: string }) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
      setList(sorted.map(mapSlotToDisplay))
    } catch (err) {
      console.error('[SavesPage] Failed to load saves:', err)
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Pagination
  const totalPages = Math.ceil(list.length / PAGE_SIZE)
  const hasPrevPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  const displayList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, currentPage])

  const visiblePages = useMemo(() => {
    const pages: (number | string)[] = []
    const total = totalPages
    const current = currentPage

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 3) pages.push('...')
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < total - 2) pages.push('...')
      pages.push(total)
    }
    return pages
  }, [totalPages, currentPage])

  const goToPage = useCallback(
    (page: number | string) => {
      if (typeof page === 'number' && page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    },
    [totalPages],
  )

  // Actions
  const handleLoad = useCallback(
    (item: SaveDisplayData) => {
      navigate(`/vn-stage?slotId=${encodeURIComponent(item.slotId)}`)
    },
    [navigate],
  )

  const handleDelete = useCallback(
    async (item: SaveDisplayData) => {
      const name = item.title || item.slotId
      const confirmed = window.confirm(
        t('message.save_delete_confirm', `Are you sure you want to delete "${name}"?`),
      )
      if (!confirmed) return

      setDeletingSlotId(item.slotId)
      try {
        await deleteSaveSlot(item.slotId)
        await loadData()
        // Reset page if needed
        const newTotal = Math.ceil((list.length - 1) / PAGE_SIZE)
        if (currentPage > newTotal && newTotal > 0) {
          setCurrentPage(newTotal)
        }
      } catch (err) {
        console.error('[SavesPage] Failed to delete save:', err)
      } finally {
        setDeletingSlotId(null)
      }
    },
    [t, loadData, list.length, currentPage],
  )

  const handleReplay = useCallback(
    (item: SaveDisplayData) => {
      navigate(
        `/vn-replay?slotId=${encodeURIComponent(item.slotId)}&replay=1`,
      )
    },
    [navigate],
  )

  return (
    <div className="flex h-full w-full flex-col gap-8 overflow-y-auto px-16 py-8 max-sm:p-4">
      {/* Header */}
      <header
        className="border-b pb-8"
        style={{ borderColor: 'var(--ui-border)' }}
      >
        <div className="flex flex-wrap items-end justify-between gap-8 max-sm:flex-col max-sm:items-start">
          <div className="flex items-start gap-4">
            <button
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-all hover:border-[var(--ui-primary)]"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-muted)',
              }}
              onClick={() => navigate(-1)}
            >
              <Icon name="back" size={20} />
            </button>

            <div className="flex flex-col gap-2">
              <div
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] opacity-80"
                style={{ color: 'var(--ui-primary)' }}
              >
                <Icon name="save" size={14} />
                <span>{t('message.saves_breadcrumb', 'Saves')}</span>
              </div>
              <h1
                className="m-0 text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight"
                style={{
                  color: 'var(--ui-text)',
                  textShadow:
                    '0 0 30px color-mix(in srgb, var(--ui-primary) 20%, transparent)',
                }}
              >
                {t('message.save_management', 'Save Management')}
              </h1>
              <p
                className="m-0 max-w-[400px] text-sm"
                style={{ color: 'var(--ui-muted)' }}
              >
                {t(
                  'message.saves_subtitle',
                  'Manage your adventure save files',
                )}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex-shrink-0 max-sm:w-full">
            <div
              className="flex rounded-lg border p-1 backdrop-blur-lg max-sm:w-full max-sm:justify-center"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-border)',
              }}
            >
              {(['grid', 'list'] as const).map((mode) => (
                <button
                  key={mode}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border-none px-4 py-2 text-[11px] font-bold transition-all',
                    viewMode === mode ? 'border shadow-sm' : 'bg-transparent',
                  )}
                  style={{
                    background:
                      viewMode === mode
                        ? 'color-mix(in srgb, var(--ui-primary) 20%, transparent)'
                        : 'transparent',
                    color:
                      viewMode === mode
                        ? 'var(--ui-primary)'
                        : 'var(--ui-muted)',
                    borderColor:
                      viewMode === mode
                        ? 'color-mix(in srgb, var(--ui-primary) 30%, transparent)'
                        : 'transparent',
                  }}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon name="menu" size={18} />
                  <span className="max-sm:hidden">{mode.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <motion.div
            className="text-sm"
            style={{ color: 'var(--ui-muted)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {t('message.loading', 'Loading...')}
          </motion.div>
        </div>
      )}

      {/* Empty State */}
      {!loading && list.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center gap-6 border px-8 py-20 text-center backdrop-blur-[20px]"
          style={{
            background: 'var(--ui-panel-glass)',
            borderColor: 'var(--ui-panel-glass-border)',
            borderRadius: 'var(--ui-radius-lg)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background:
                'color-mix(in srgb, var(--ui-primary) 10%, transparent)',
            }}
          >
            <Icon name="save" size={40} color="var(--ui-primary)" />
          </div>
          <h2
            className="m-0 font-bold"
            style={{ color: 'var(--ui-text)', fontSize: 'var(--ui-font-2xl)' }}
          >
            {t('message.empty_saves_title', 'No save records yet')}
          </h2>
          <p
            className="m-0 max-w-[440px] leading-relaxed"
            style={{ color: 'var(--ui-muted)', fontSize: 'var(--ui-font-base)' }}
          >
            {t(
              'message.empty_saves_desc',
              "You don't have any saves yet. Start a story and save during gameplay to record your best moments!",
            )}
          </p>
        </motion.div>
      )}

      {/* Save Slots Grid */}
      {!loading && list.length > 0 && (
        <div
          className={cn(
            'grid gap-5 pb-4',
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1',
          )}
        >
          <AnimatePresence mode="popLayout">
            {displayList.map((item, index) => (
              <motion.div
                key={item.slotId}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <SaveSlotCard
                  item={item}
                  viewMode={viewMode}
                  isDeleting={deletingSlotId === item.slotId}
                  onLoad={() => handleLoad(item)}
                  onDelete={() => handleDelete(item)}
                  onReplay={() => handleReplay(item)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-auto flex items-center justify-center gap-2 py-6">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent transition-all disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: 'var(--ui-muted)' }}
            disabled={!hasPrevPage}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={20} />
          </button>

          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-lg"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-border)',
            }}
          >
            {visiblePages.map((page, idx) => (
              <button
                key={idx}
                className={cn(
                  'h-8 w-8 rounded-full border-none text-sm font-bold transition-all',
                  page === currentPage && 'shadow-lg',
                  page === '...' && 'cursor-default opacity-50',
                )}
                style={{
                  background:
                    page === currentPage
                      ? 'var(--ui-primary)'
                      : 'transparent',
                  color:
                    page === currentPage
                      ? 'var(--ui-inverse)'
                      : 'var(--ui-muted)',
                  boxShadow:
                    page === currentPage
                      ? '0 0 15px color-mix(in srgb, var(--ui-primary) 50%, transparent)'
                      : undefined,
                }}
                disabled={page === '...'}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-transparent transition-all disabled:cursor-not-allowed disabled:opacity-30"
            style={{ color: 'var(--ui-muted)' }}
            disabled={!hasNextPage}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function SaveSlotCard({
  item,
  viewMode,
  isDeleting,
  onLoad,
  onDelete,
  onReplay,
}: {
  item: SaveDisplayData
  viewMode: 'grid' | 'list'
  isDeleting: boolean
  onLoad: () => void
  onDelete: () => void
  onReplay: () => void
}) {
  const { t } = useTranslation()

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border p-4 backdrop-blur-[12px] transition-all hover:shadow-lg',
          isDeleting && 'pointer-events-none opacity-50',
        )}
        style={{
          background: 'var(--ui-panel-glass)',
          borderColor: 'var(--ui-panel-glass-border)',
        }}
      >
        {/* Thumbnail */}
        <div
          className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border"
          style={{
            background: 'color-mix(in srgb, var(--ui-primary) 5%, var(--ui-panel))',
            borderColor: 'var(--ui-border)',
          }}
        >
          {item.screenshotUrl ? (
            <img
              src={item.screenshotUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              size={20}
              style={{ color: 'var(--ui-muted)', opacity: 0.4 }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className="m-0 truncate text-sm font-semibold"
            style={{ color: 'var(--ui-text)' }}
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--ui-muted)' }}>
            <span className="flex items-center gap-1">
              <BookOpen size={12} />
              {item.storyKey}
            </span>
            {item.sceneId && (
              <span className="truncate opacity-70">{item.sceneId}</span>
            )}
          </div>
          {item.textSnippet && (
            <p
              className="m-0 truncate text-xs opacity-60"
              style={{ color: 'var(--ui-muted)' }}
            >
              {item.textSnippet}
            </p>
          )}
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: 'var(--ui-muted)' }}
          >
            <Clock size={10} />
            {formatTimestamp(item.timestamp)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <SlotActionButton
            icon={<Play size={14} />}
            label={t('message.save_load', 'Load')}
            onClick={onLoad}
            variant="primary"
          />
          <SlotActionButton
            icon={<RotateCcw size={14} />}
            label={t('message.save_replay', 'Replay')}
            onClick={onReplay}
            variant="default"
          />
          <SlotActionButton
            icon={<Trash2 size={14} />}
            label={t('message.save_delete', 'Delete')}
            onClick={onDelete}
            variant="danger"
          />
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border backdrop-blur-[12px] transition-all hover:shadow-lg',
        isDeleting && 'pointer-events-none opacity-50',
      )}
      style={{
        background: 'var(--ui-panel-glass)',
        borderColor: 'var(--ui-panel-glass-border)',
      }}
    >
      {/* Screenshot / Thumbnail */}
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden border-b"
        style={{
          background:
            'color-mix(in srgb, var(--ui-primary) 5%, var(--ui-panel))',
          borderColor: 'var(--ui-border)',
        }}
      >
        {item.screenshotUrl ? (
          <img
            src={item.screenshotUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Image
              size={32}
              style={{ color: 'var(--ui-muted)', opacity: 0.3 }}
            />
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--ui-muted)', opacity: 0.4 }}
            >
              {t('message.no_preview', 'No Preview')}
            </span>
          </div>
        )}

        {/* Ending badge */}
        {item.endingId && (
          <div
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--ui-imperial-gold, var(--ui-primary)) 80%, transparent)',
              color: '#fff',
            }}
          >
            {t('message.ending', 'Ending')}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3
          className="m-0 truncate text-sm font-semibold"
          style={{ color: 'var(--ui-text)' }}
        >
          {item.title}
        </h3>

        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--ui-muted)' }}
        >
          <BookOpen size={12} />
          <span className="truncate">
            {item.storyKey}
            {item.sceneId ? ` / ${item.sceneId}` : ''}
          </span>
        </div>

        {item.textSnippet && (
          <p
            className="m-0 line-clamp-2 text-xs leading-relaxed opacity-60"
            style={{ color: 'var(--ui-muted)' }}
          >
            {item.textSnippet}
          </p>
        )}

        <div
          className="mt-auto flex items-center gap-1 pt-1 text-[10px]"
          style={{ color: 'var(--ui-muted)' }}
        >
          <Clock size={10} />
          {formatTimestamp(item.timestamp)}
        </div>
      </div>

      {/* Actions Footer */}
      <div
        className="flex items-center gap-2 border-t px-4 py-3"
        style={{ borderColor: 'var(--ui-border)' }}
      >
        <SlotActionButton
          icon={<Play size={14} />}
          label={t('message.save_load', 'Load')}
          onClick={onLoad}
          variant="primary"
          expand
        />
        <SlotActionButton
          icon={<RotateCcw size={14} />}
          label={t('message.save_replay', 'Replay')}
          onClick={onReplay}
          variant="default"
        />
        <SlotActionButton
          icon={<Trash2 size={14} />}
          label=""
          onClick={onDelete}
          variant="danger"
        />
      </div>
    </div>
  )
}

function SlotActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
  expand = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'primary' | 'danger' | 'default'
  expand?: boolean
}) {
  const bgMap = {
    primary: 'color-mix(in srgb, var(--ui-primary) 15%, transparent)',
    danger: 'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
    default: 'var(--ui-panel-subtle)',
  }
  const colorMap = {
    primary: 'var(--ui-primary)',
    danger: 'var(--ui-danger)',
    default: 'var(--ui-muted)',
  }
  const hoverBgMap = {
    primary: 'color-mix(in srgb, var(--ui-primary) 25%, transparent)',
    danger: 'color-mix(in srgb, var(--ui-danger) 20%, transparent)',
    default: 'var(--ui-panel)',
  }

  const [hovered, setHovered] = useState(false)

  return (
    <button
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
        expand && 'flex-1',
      )}
      style={{
        background: hovered ? hoverBgMap[variant] : bgMap[variant],
        borderColor: 'var(--ui-border)',
        color: colorMap[variant],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  )
}
