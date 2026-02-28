import { useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CharacterSlot {
  id: string
  poseUrl: string
  position?: 'left' | 'center' | 'right'
}

interface CharacterLayerProps {
  characters?: CharacterSlot[]
  enableBreath?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  imageErrorFallback?: 'none' | 'silhouette'
}

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

const positionClasses: Record<string, string> = {
  left: 'left-[-5%]',
  center: 'left-[25%]',
  right: 'right-[-5%]',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CharacterLayer({
  characters = [],
  enableBreath = true,
  selectedId = null,
  onSelect,
  imageErrorFallback = 'none',
}: CharacterLayerProps) {
  const safeCharacters = useMemo(() => characters ?? [], [characters])
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())

  const handleImgError = (id: string) => {
    setFailedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 bottom-[22%] z-[1] flex justify-center"
      data-testid="stage-character-layer"
    >
      {safeCharacters.map((character, idx) => {
        const hasPoseUrl = typeof character.poseUrl === 'string' && character.poseUrl.trim().length > 0
        const imgFailed = failedIds.has(character.id)
        const showImage = hasPoseUrl && (imageErrorFallback === 'none' || !imgFailed)
        const showSilhouette = imageErrorFallback === 'silhouette' && hasPoseUrl && imgFailed

        return (
          <div
            key={character.id}
            className={`absolute bottom-0 flex h-full w-1/2 items-end justify-center
              pointer-events-auto transition-all duration-500 ease-in-out
              ${positionClasses[character.position || 'center'] ?? positionClasses.center}`}
          >
            <div className="relative flex h-full w-full items-end justify-center">
              <div
                className={`relative flex h-full w-full cursor-pointer items-end justify-center
                  will-change-transform pointer-events-auto
                  ${enableBreath ? (idx % 2 === 0 ? 'animate-breath-a' : 'animate-breath-b') : ''}
                  ${selectedId === character.id ? 'vn-char-selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(character.id)
                }}
              >
                {showImage ? (
                  <img
                    src={character.poseUrl}
                    alt={character.id}
                    onError={() => handleImgError(character.id)}
                    className={`pointer-events-none max-h-[92%] max-w-[92%] select-none object-contain
                      drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]
                      ${selectedId === character.id
                        ? 'drop-shadow-[0_0_14px_rgba(244,114,182,0.9)] drop-shadow-[0_0_28px_rgba(244,114,182,0.6)]'
                        : ''
                      }`}
                  />
                ) : showSilhouette ? (
                  <div
                    className={`relative h-[80%] max-h-[90%] w-[min(34%,420px)] opacity-50
                      rounded-[60px_60px_10px_10px] border-2 backdrop-blur-sm
                      bg-gradient-to-b from-white/12 to-white/3
                      ${selectedId === character.id
                        ? 'border-white/35 shadow-[0_0_0_2px_rgba(255,255,255,0.15),0_0_14px_rgba(255,255,255,0.12)]'
                        : 'border-white/12'
                      }`}
                    data-testid={`silhouette-${character.id}`}
                  >
                    {/* Head circle placeholder */}
                    <div className="absolute left-1/2 top-[4%] h-[25%] w-[40%] -translate-x-1/2 rounded-full bg-white/10" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
