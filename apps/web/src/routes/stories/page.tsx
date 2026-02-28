import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  usePackRegistryStore,
  type StoryPack,
} from '@/features/story-import/stores/usePackRegistryStore'
import Icon from '@/components/ui/Icon'
import { DISABLE_ANIMATIONS } from '@/config/env'
import './stories-carousel.css'

/* ========================================
 * Helpers
 * ======================================== */

function resolveAssetUrlByKey(assetKey: string, pack: StoryPack): string {
  const payload = pack.payload as Record<string, unknown> | null
  const assetsObj = payload?.assets as Record<string, unknown> | undefined
  const assetItems = Array.isArray(assetsObj?.items) ? (assetsObj.items as Record<string, unknown>[]) : []
  const assetsByKey: Record<string, Record<string, unknown>> = {}
  for (const item of assetItems) {
    if (item?.assetKey) assetsByKey[item.assetKey as string] = item
  }

  const asset = assetsByKey[assetKey]
  if (!asset) return ''

  const rawPath = (asset.path || asset.url || '') as string
  if (!rawPath) return ''
  if (rawPath.startsWith('http') || rawPath.startsWith('/')) return rawPath

  const baseUrl = ((assetsObj?.baseUrl as string) || '')
  if (!baseUrl) return rawPath

  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const rel = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath
  return `${base}/${rel}`
}

function getCharacterImages(pack: StoryPack | null): string[] {
  if (!pack) return ['/img/school.png']

  const fallbackImg = '/img/school.png'
  const maxImgNum = 4
  const payload = pack.payload as Record<string, unknown> | null
  const assetsObj = payload?.assets as Record<string, unknown> | undefined
  const baseUrl = (assetsObj?.baseUrl as string) || ''

  // 1. Story level avatar from manifest
  const manifest = payload?.manifest as Record<string, unknown> | undefined
  const avatar = manifest?.avatar as string | undefined
  if (avatar) {
    const resolvedUrl = resolveAssetUrlByKey(avatar, pack)
    if (resolvedUrl) return [resolvedUrl]
    if (avatar.startsWith('http') || avatar.startsWith('/')) return [avatar]
  }

  // 2. Show characters
  const characters = (payload?.characters || []) as Record<string, unknown>[]
  if (characters.length > 0) {
    const images = characters
      .slice(0, maxImgNum)
      .map((char) => {
        const assets = (char?.assets || {}) as Record<string, string>
        const charAvatar = assets.avatarUrl || assets.avatar || ''
        if (!charAvatar) return ''
        if (charAvatar.startsWith('http') || charAvatar.startsWith('/')) return charAvatar

        const resolvedUrl = resolveAssetUrlByKey(charAvatar, pack)
        if (resolvedUrl) return resolvedUrl

        const prefix = (char.imgPrefix as string) || baseUrl || '/img/'
        const cleanPrefix = prefix.endsWith('/') ? prefix : prefix + '/'
        return `${cleanPrefix}${charAvatar}`
      })
      .filter(Boolean)

    if (images.length > 0) return images
  }

  return [fallbackImg]
}

function getPackGenre(pack: StoryPack | null): string {
  if (!pack) return ''
  const payload = pack.payload as Record<string, unknown> | null
  const manifest = payload?.manifest as Record<string, unknown> | undefined
  return (manifest?.genre as string) || (manifest?.category as string) || 'Visual Novel'
}

function getPackDescription(pack: StoryPack | null, fallback: string): string {
  if (!pack) return ''
  const payload = pack.payload as Record<string, unknown> | null
  const manifest = payload?.manifest as Record<string, unknown> | undefined
  return (manifest?.description as string) || fallback
}

function getPackSceneCount(pack: StoryPack | null): number {
  if (!pack) return 0
  const payload = pack.payload as Record<string, unknown> | null
  return Array.isArray(payload?.scenes) ? (payload.scenes as unknown[]).length : 0
}

/* ========================================
 * Sub-components
 * ======================================== */

function CardCharacters({ images }: { images: string[] }) {
  if (images.length === 0) return null
  const width = `${100 / images.length}%`

  return (
    <div className="card-characters">
      {images.map((src, idx) => (
        <img
          key={idx}
          src={src}
          className="char-img"
          style={{ width }}
          alt=""
        />
      ))}
    </div>
  )
}

function SideCard({
  pack,
  onClick,
}: {
  pack: StoryPack | null
  onClick: () => void
}) {
  if (!pack) {
    return <div className="carousel-side-card carousel-placeholder" />
  }

  const images = getCharacterImages(pack)
  const genre = getPackGenre(pack)
  const title = pack.title || pack.storyKey
  return (
    <div className="carousel-side-card" onClick={onClick}>
      <CardCharacters images={images} />
      <div className="card-overlay" />
      <div className="card-info">
        <h3>{title}</h3>
        <p>{genre}</p>
      </div>
    </div>
  )
}

function FeaturedCard({ pack }: { pack: StoryPack }) {
  const images = getCharacterImages(pack)
  const genre = getPackGenre(pack)

  return (
    <div className="carousel-featured-card">
      <CardCharacters images={images} />
      <div className="card-overlay-gradient" />
      <div className="card-shine" />
      <div className="genre-badge">
        <span className="badge-dot" />
        <span>{genre}</span>
      </div>
    </div>
  )
}

function ImportCard({
  variant,
  label,
  onClick,
}: {
  variant: 'featured' | 'side'
  label: string
  onClick: () => void
}) {
  const isFeatured = variant === 'featured'
  const className = isFeatured
    ? 'carousel-featured-card carousel-featured-import'
    : 'carousel-side-card carousel-import'

  return (
    <div className={className} onClick={onClick}>
      <div className="portal-style">
        <div className="portal-stars" />
        <div className="portal-ring" />
        <div className="portal-ring portal-ring-inner" />
        <div className="portal-center">
          <Icon name="plus" size={isFeatured ? 48 : 28} />
        </div>
        <span className="portal-text">{label}</span>
      </div>
    </div>
  )
}

/* ========================================
 * Main Page
 * ======================================== */

/**
 * StoriesPage - PS5 Carousel style story selector.
 * Ported from V1 StoryListPage.vue carousel layout.
 */
export default function StoriesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const packs = usePackRegistryStore((s) => s.packs)
  const initialized = usePackRegistryStore((s) => s.initialized)
  const init = usePackRegistryStore((s) => s.init)
  const removePack = usePackRegistryStore((s) => s.removePack)

  useEffect(() => {
    if (!initialized) {
      init()
    }
  }, [initialized, init])

  const [selectedPackIndex, setSelectedPackIndex] = useState(0)

  // Derived state
  const totalItems = packs.length + 1
  const isImportSelected = selectedPackIndex >= packs.length
  const selectedPack = isImportSelected ? null : (packs[selectedPackIndex] ?? null)

  const prevPack = useMemo(() => {
    const idx = selectedPackIndex - 1
    if (idx < 0) return null
    if (idx >= packs.length) return packs[packs.length - 1] ?? null
    return packs[idx] ?? null
  }, [selectedPackIndex, packs])

  const nextPack = useMemo(() => {
    const idx = selectedPackIndex + 1
    if (idx >= totalItems) return null
    if (idx >= packs.length) return null
    return packs[idx] ?? null
  }, [selectedPackIndex, packs, totalItems])

  const showNextAsImport = selectedPackIndex >= packs.length - 1

  const selectPack = useCallback(
    (pack: StoryPack) => {
      const idx = packs.findIndex((p) => p.storyKey === pack.storyKey)
      if (idx >= 0) setSelectedPackIndex(idx)
    },
    [packs],
  )

  const handleStartStory = useCallback(
    (pack: StoryPack) => {
      navigate(`/vn-stage?storyKey=${encodeURIComponent(pack.storyKey)}&mode=new`)
    },
    [navigate],
  )

  const handleDeleteStory = useCallback(
    async (pack: StoryPack) => {
      const confirmed = window.confirm(
        `${t('message.delete_confirm_prefix')}${pack.title || pack.storyKey}${t('message.delete_confirm_suffix')}`,
      )
      if (confirmed) {
        await removePack(pack.storyKey)
        // Adjust index if needed
        setSelectedPackIndex((prev) => Math.min(prev, Math.max(0, packs.length - 2)))
      }
    },
    [removePack, t, packs.length],
  )

  const goToImport = useCallback(() => {
    navigate('/stories/import')
  }, [navigate])

  // Loading state
  if (!initialized) {
    return (
      <div className="story-list-view">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--ui-primary)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // Empty state
  if (packs.length === 0) {
    return (
      <div className="story-list-view" data-disable-animations={DISABLE_ANIMATIONS || undefined}>
        <div className="empty-state-container">
          <div className="empty-state">
            <div className="empty-illustration">&#128194;</div>
            <h2 className="empty-title">
              {t('message.empty_stories_title', 'Explore New Adventures')}
            </h2>
            <p className="empty-desc">
              {t('message.empty_stories_desc', 'No stories have been loaded yet. Import a JSON story file to start your journey.')}
            </p>
            <div className="empty-actions">
              <button className="btn-primary-action" onClick={goToImport}>
                <span>{t('message.btn_import_now', 'Import Now')}</span>
                <Icon name="plus" size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Carousel + Details
  return (
    <div className="story-list-view" data-disable-animations={DISABLE_ANIMATIONS || undefined}>
      {/* Carousel Container */}
      <div className="carousel-container">
        {/* Left Side Card */}
        <SideCard
          pack={prevPack}
          onClick={() => prevPack && selectPack(prevPack)}
        />

        {/* Center Card: Story or Import */}
        {!isImportSelected && selectedPack ? (
          <FeaturedCard pack={selectedPack} />
        ) : (
          <ImportCard
            variant="featured"
            label={t('message.import_new_story', 'Open New Story')}
            onClick={goToImport}
          />
        )}

        {/* Right Side Card */}
        {nextPack && !showNextAsImport ? (
          <SideCard
            pack={nextPack}
            onClick={() => selectPack(nextPack)}
          />
        ) : !isImportSelected ? (
          <ImportCard
            variant="side"
            label={t('message.btn_import_story', 'Import Story (JSON)')}
            onClick={() => setSelectedPackIndex(packs.length)}
          />
        ) : (
          <div className="carousel-side-card carousel-placeholder" />
        )}
      </div>

      {/* Story Details Section */}
      <div className="story-details">
        {!isImportSelected && selectedPack ? (
          <>
            <h1 className="story-title">
              {selectedPack.title || selectedPack.storyKey}
            </h1>

            {/* Meta Badges */}
            <div className="meta-badges">
              <div className="meta-divider" />
              <div className="meta-badge">
                <Icon name="play" size={14} />
                <span>
                  {getPackSceneCount(selectedPack)} {t('message.label_scenes', 'Scenes')}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="story-description">
              {getPackDescription(selectedPack, t('message.empty_preview', 'No description available.'))}
            </p>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                className="btn-primary-action"
                onClick={() => handleStartStory(selectedPack)}
              >
                <span>{t('message.start_new_story', 'Start New Story')}</span>
                <Icon name="play" size={18} />
              </button>
              <button
                className="btn-secondary-action btn-danger"
                onClick={() => handleDeleteStory(selectedPack)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="story-title">
              {t('message.btn_import_story', 'Import Story (JSON)')}
            </h1>
            <p className="story-description">
              {t('message.empty_stories_desc', 'No stories have been loaded yet. Import a JSON story file to start your journey.')}
            </p>
            <div className="action-buttons">
              <button className="btn-primary-action" onClick={goToImport}>
                <span>{t('message.btn_import_now', 'Import Now')}</span>
                <Icon name="plus" size={18} />
              </button>
            </div>
          </>
        )}

        {/* Carousel Dots */}
        <div className="carousel-dots">
          {packs.map((_, idx) => (
            <button
              key={idx}
              className={`dot${selectedPackIndex === idx ? ' active' : ''}`}
              onClick={() => setSelectedPackIndex(idx)}
            />
          ))}
          <button
            className={`dot dot-add${isImportSelected ? ' active' : ''}`}
            onClick={() => setSelectedPackIndex(packs.length)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
