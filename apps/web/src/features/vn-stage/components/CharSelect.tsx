import { useCallback, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CharSelectProps {
  value: string | null
  activeCastIds: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely-typed external data
  charactersById: Record<string, any>
  assetsBaseUrl?: string
  assetUrlByKey?: ((key?: string) => string) | null
  highlightedId?: string | null
  emptyLabel?: string
  onChange?: (id: string | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CharSelect({
  value,
  activeCastIds,
  charactersById,
  assetsBaseUrl = '',
  assetUrlByKey = null,
  highlightedId = null,
  emptyLabel = '無可對話對象',
  onChange,
}: CharSelectProps) {
  // ---- Helpers ----

  const resolveName = useCallback(
    (id: string) => {
      return charactersById?.[id]?.displayName || id || '角色'
    },
    [charactersById],
  )

  const resolveAvatarUrl = useCallback(
    (id: string) => {
      const char = charactersById?.[id]
      const avatarKey = char?.assets?.avatar
      if (assetUrlByKey) return assetUrlByKey(avatarKey) || '/img/user.png'
      const base = assetsBaseUrl || ''
      const itemUrl = char?.assets?.avatarUrl || ''
      if (itemUrl?.startsWith('http')) return itemUrl
      return base ? `${base}${itemUrl}` : itemUrl || '/img/user.png'
    },
    [charactersById, assetUrlByKey, assetsBaseUrl],
  )

  // ---- Default selection ----

  useEffect(() => {
    if ((!value || !activeCastIds.includes(value)) && activeCastIds[0]) {
      onChange?.(activeCastIds[0])
    }
  }, [activeCastIds, value, onChange])

  // ---- Render ----

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-white/15 bg-black/40 p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[10px]"
      data-testid="vn-char-select"
    >
      {activeCastIds.length > 0 ? (
        activeCastIds.map((id) => (
          <div
            key={id}
            className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-1.5
              transition-all duration-200 ease-in-out
              hover:-translate-y-0.5 hover:bg-white/10
              ${value === id ? 'border-pink-400/60 bg-pink-400/20' : 'border-transparent'}
              ${highlightedId === id ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.45)]' : ''}`}
            data-testid={`vn-char-${id}`}
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(id)
            }}
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/25">
              <img
                src={resolveAvatarUrl(id)}
                alt={resolveName(id)}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="max-w-[120px] truncate text-[13px] font-semibold text-white">
              {resolveName(id)}
            </div>
          </div>
        ))
      ) : (
        <div
          className="flex cursor-default items-center gap-2 rounded-[10px] border border-white/15 bg-white/[0.06] px-2.5 py-1.5"
          data-testid="vn-char-empty"
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/25">
            <img
              src="/img/user.png"
              alt={emptyLabel}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="max-w-[120px] truncate text-[13px] font-semibold text-white">
            {emptyLabel}
          </div>
        </div>
      )}
    </div>
  )
}
