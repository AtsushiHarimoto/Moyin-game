import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff, User } from 'lucide-react'
import { useStoryWorkshopStore } from '../stores/useStoryWorkshopStore'

/** 已知素材 key 對應的 fallback 路徑 */
const ASSET_FALLBACKS: Record<string, string> = {
  school: '/img/school.png',
  classroom: '/img/school.png',
  girl: '/img/girl.png',
  user: '/img/user.png',
  narrator: '/img/user.png',
}

/** 用途：將素材 key 解析為可用的圖片 URL，若無法解析則回傳 null */
function resolveAsset(key: string | undefined): string | null {
  if (!key) return null
  if (key.startsWith('http') || key.startsWith('/')) return key
  return ASSET_FALLBACKS[key.toLowerCase()] ?? null
}

interface CharacterEntry {
  name: string
  imgUrl: string | null
}

interface SceneData {
  bgUrl: string | null
  characters: CharacterEntry[]
}

/** 用途：從 parsedJson 提取第一個場景的背景與角色資訊 */
function extractSceneData(
  parsedJson: Record<string, unknown> | null,
): SceneData | null {
  if (!parsedJson) return null

  const scenes = parsedJson.scenes as
    | Array<Record<string, unknown>>
    | undefined
  if (!scenes || scenes.length === 0) return null

  const firstScene = scenes[0]
  const bgKey =
    (firstScene.background as string) ??
    (firstScene.bg as string) ??
    (firstScene.bgUrl as string)

  const characters = parsedJson.characters as
    | Array<Record<string, unknown>>
    | undefined
  const charList = (characters ?? []).slice(0, 3).map((c) => ({
    name: (c.name as string) ?? (c.id as string) ?? 'Unknown',
    imgUrl: resolveAsset(
      (c.image as string) ?? (c.avatar as string) ?? (c.id as string),
    ),
  }))

  return { bgUrl: resolveAsset(bgKey), characters: charList }
}

export function WorkshopScenePreview(): React.JSX.Element {
  const { t } = useTranslation()
  const parsedJson = useStoryWorkshopStore((s) => s.parsedJson)
  const [bgError, setBgError] = useState(false)

  const sceneData = useMemo(
    () => extractSceneData(parsedJson),
    [parsedJson],
  )

  if (!sceneData) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 p-8"
        style={{ color: 'var(--ui-muted)' }}
      >
        <ImageOff size={40} style={{ opacity: 0.4 }} />
        <p className="m-0 text-center text-xs">
          {t(
            'message.workshop_no_preview',
            'Load a story JSON to see scene preview',
          )}
        </p>
      </div>
    )
  }

  const showBgImage = sceneData.bgUrl && !bgError

  return (
    <div data-testid="preview-panel">
      {/* 16:9 場景預覽視窗 */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: '16/9',
          background: 'var(--ui-bg)',
          borderRadius: 'var(--ui-radius-sm)',
          border: '1px solid var(--ui-border)',
        }}
      >
        {showBgImage ? (
          <img
            src={sceneData.bgUrl!}
            alt="Scene background"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setBgError(true)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--ui-primary) 15%, var(--ui-bg)) 0%, var(--ui-bg) 100%)',
            }}
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
          }}
        />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-4 px-4 pb-2">
          {sceneData.characters.map((char, i) => (
            <CharacterThumb key={`${char.name}-${i}`} character={char} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CharacterThumb({ character }: { character: CharacterEntry }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1">
      {character.imgUrl ? (
        <img
          src={character.imgUrl}
          alt={character.name}
          className="h-20 w-auto max-w-[60px] object-contain drop-shadow-lg"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--ui-primary) 20%, transparent)',
            border: '2px solid var(--ui-primary)',
          }}
        >
          <User size={20} style={{ color: 'var(--ui-primary)' }} />
        </div>
      )}
      <span className="max-w-[80px] truncate text-[10px] font-medium text-white drop-shadow">
        {character.name}
      </span>
    </div>
  )
}
