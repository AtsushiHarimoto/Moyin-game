import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import GameIcon from '@/components/ui/GameIcon'

export interface SaveData {
  title: string
  subtitle?: string
  timestamp?: string
  screenshotUrl?: string
  meta?: Record<string, unknown>
}

interface SaveSlotCardProps {
  mode: 'save' | 'load'
  slotIndex: number
  data?: SaveData | null
  disabled?: boolean
  isCurrent?: boolean
  showReplay?: boolean
  replayDisabled?: boolean
  className?: string
  onClick?: () => void
  onSave?: () => void
  onLoad?: () => void
  onDelete?: () => void
  onReplay?: () => void
  onEdit?: () => void
}

export default function SaveSlotCard({
  mode,
  slotIndex,
  data = null,
  disabled = false,
  isCurrent = false,
  showReplay = false,
  replayDisabled = false,
  className,
  onClick,
  onSave,
  onLoad,
  onDelete,
  onReplay,
  onEdit,
}: SaveSlotCardProps) {
  const hasData = Boolean(data)
  const canReplay = showReplay && hasData && !replayDisabled && !disabled

  const slotLabel = `Slot #${String(slotIndex + 1).padStart(2, '0')}`

  const displayTitle = useMemo(() => {
    if (!data?.title) return `Save #${slotIndex + 1}`
    return data.title
  }, [data, slotIndex])

  const chapterLabel = useMemo(() => {
    return String(data?.meta?.chapter ?? '')
  }, [data])

  const formattedDate = useMemo(() => {
    if (!data?.timestamp) return ''
    const date = new Date(data.timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [data])

  const formattedTime = useMemo(() => {
    if (!data?.timestamp) return ''
    const date = new Date(data.timestamp)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }, [data])

  const coverStyle = useMemo(() => {
    if (data?.screenshotUrl) {
      return { backgroundImage: `url(${data.screenshotUrl})` }
    }
    return {
      background:
        'linear-gradient(135deg, var(--ui-primary) 0%, var(--ui-secondary) 100%)',
    }
  }, [data])

  function handleCardClick() {
    if (disabled) return
    onClick?.()
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    onSave?.()
  }

  function handleLoad(e: React.MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    onLoad?.()
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    onDelete?.()
  }

  function handleReplay(e: React.MouseEvent) {
    e.stopPropagation()
    if (!canReplay) return
    onReplay?.()
  }

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    if (disabled) return
    onEdit?.()
  }

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300',
        hasData
          ? 'border-[color-mix(in_srgb,var(--ui-text)_10%,transparent)]'
          : 'border-dashed border-[var(--ui-border)] bg-transparent',
        isCurrent && 'border-[color-mix(in_srgb,var(--ui-primary)_50%,transparent)]',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      style={{
        background: hasData
          ? 'var(--ui-panel-glass)'
          : undefined,
        backdropFilter: hasData ? 'blur(10px)' : undefined,
        WebkitBackdropFilter: hasData ? 'blur(10px)' : undefined,
        boxShadow: 'var(--ui-shadow-soft)',
      }}
      tabIndex={0}
      role="button"
      aria-disabled={disabled}
      onClick={handleCardClick}
    >
      {/* Cover area */}
      <div
        className="relative h-[180px] w-full overflow-hidden"
        style={{ borderBottom: '1px solid var(--ui-panel-glass-border)' }}
      >
        {hasData ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={coverStyle}
            />
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background: 'linear-gradient(to top, var(--ui-background) 0%, transparent 60%)',
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center transition-colors duration-300">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-500"
              style={{
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-muted)',
              }}
            >
              <GameIcon name="plus" size={32} />
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 z-[1] flex gap-2">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{
              background: hasData
                ? 'color-mix(in srgb, var(--ui-background) 60%, transparent)'
                : 'color-mix(in srgb, var(--ui-background) 40%, transparent)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--ui-panel-glass-border)',
              color: hasData ? 'var(--ui-text)' : 'var(--ui-muted)',
            }}
          >
            {slotLabel}
          </span>
          {isCurrent && hasData && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em]"
              style={{
                background: 'var(--ui-primary)',
                color: 'var(--ui-inverse)',
                boxShadow: '0 0 15px color-mix(in srgb, var(--ui-primary) 40%, transparent)',
              }}
            >
              Current
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        className={cn(
          'flex flex-1 flex-col gap-4 p-5',
          !hasData && 'items-center justify-center text-center',
        )}
      >
        {hasData ? (
          <>
            {/* Info */}
            <div className="flex flex-col gap-2">
              <h3
                className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold transition-colors duration-300 group-hover:text-[var(--ui-primary)]"
                style={{ color: 'var(--ui-text)' }}
              >
                {displayTitle}
              </h3>
              <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--ui-muted)' }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--ui-primary)' }}>{formattedDate}</span>
                  <span className="opacity-30">|</span>
                  <span>{formattedTime}</span>
                </div>
                {chapterLabel && (
                  <div className="text-[10px] uppercase tracking-[0.1em] opacity-70">
                    {chapterLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div
              className="mt-auto grid grid-cols-3 gap-2.5 border-t pt-4"
              style={{ borderColor: 'var(--ui-panel-glass-border)' }}
            >
              <button
                type="button"
                className="flex h-10 cursor-pointer items-center justify-center gap-1 rounded-lg border-none text-xs font-bold transition-all duration-300 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'var(--ui-primary)',
                  color: 'var(--ui-inverse)',
                  boxShadow: '0 0 15px color-mix(in srgb, var(--ui-primary) 40%, transparent)',
                }}
                disabled={disabled}
                onClick={handleLoad}
              >
                <GameIcon name="play" size={16} />
                Load
              </button>

              {showReplay && canReplay ? (
                <button
                  type="button"
                  className="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: 'color-mix(in srgb, var(--ui-panel) 50%, transparent)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-muted)',
                  }}
                  disabled={disabled}
                  onClick={handleReplay}
                >
                  Replay
                </button>
              ) : (
                <button
                  type="button"
                  className="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: 'color-mix(in srgb, var(--ui-panel) 50%, transparent)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-muted)',
                  }}
                  disabled={disabled}
                  onClick={handleRename}
                >
                  Rename
                </button>
              )}

              <button
                type="button"
                className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-xs font-bold transition-all duration-300 hover:bg-[color-mix(in_srgb,var(--ui-danger)_10%,transparent)] hover:text-[var(--ui-danger)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: 'var(--ui-muted)' }}
                disabled={disabled}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h3
                className="m-0 text-lg font-bold tracking-[0.1em]"
                style={{ color: 'var(--ui-muted)' }}
              >
                Empty Slot
              </h3>
              <p className="m-0 text-xs opacity-60" style={{ color: 'var(--ui-muted)' }}>
                No save data
              </p>
            </div>
            {mode === 'save' && (
              <button
                type="button"
                className="mt-auto h-10 w-full cursor-pointer rounded-lg border text-xs font-bold uppercase tracking-[0.1em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'color-mix(in srgb, var(--ui-panel) 50%, transparent)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-muted)',
                }}
                disabled={disabled}
                onClick={handleSave}
              >
                Save New
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
