import { createElement, lazy, Suspense, useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import GameHeader, { type Tab } from '@/components/layout/GameHeader'
import SakuraScene from '@/components/effects/SakuraScene'
import brandSakuraUrl from '@/assets/icons/brand-sakura.svg'
import { DISABLE_ANIMATIONS } from '@/config/env'
import { WorkshopEditor } from '@/features/story-workshop/components'

// Lazy-load tab content pages
const StoriesPage = lazy(() => import('@/routes/stories/page'))
const SavesPage = lazy(() => import('@/routes/saves/page'))
const SettingsPage = lazy(() => import('@/routes/settings/page'))

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  custom: StoriesPage,
  save: SavesPage,
  setting: SettingsPage,
}

function TabFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--ui-primary)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

/**
 * HomePage - Main landing page with tabbed navigation.
 * Migrated from Vue Home.vue.
 *
 * Embeds StoriesPage, SavesPage, and SettingsPage as tab content.
 */
export default function HomePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showWorkshop, setShowWorkshop] = useState(false)

  const [showTitleScreen, setShowTitleScreen] = useState(
    () => !sessionStorage.getItem('has_seen_title'),
  )

  useEffect(() => {
    const handler = () => setShowWorkshop(true)
    window.addEventListener('open-workshop', handler)
    return () => window.removeEventListener('open-workshop', handler)
  }, [])

  // Open workshop when navigated with ?workshop=1 (e.g. from Settings)
  useEffect(() => {
    if (searchParams.get('workshop') === '1') {
      setShowWorkshop(true)
      searchParams.delete('workshop')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Workshop mode is active only when the editor overlay is actually open
  const isWorkshopMode = showWorkshop

  const tabs = useMemo<Tab[]>(() => {
    return [
      { value: 'custom', name: t('message.custom_mode') },
      { value: 'save', name: t('message.save_menu') },
      { value: 'setting', name: t('message.setting_menu') },
    ]
  }, [t])

  const [selected, setSelected] = useState(() => {
    const queryTab = searchParams.get('tab')
    if (queryTab && tabs.some((tab) => tab.value === queryTab)) {
      return queryTab
    }
    return tabs[0]?.value ?? 'custom'
  })

  // Sync tab selection to URL
  useEffect(() => {
    const current = searchParams.get('tab')
    if (current !== selected) {
      setSearchParams({ tab: selected }, { replace: true })
    }
  }, [selected, searchParams, setSearchParams])

  const handleTabChange = useCallback((value: string) => {
    setSelected(value)
  }, [])

  const handleEnterApp = useCallback(() => {
    setShowTitleScreen(false)
    sessionStorage.setItem('has_seen_title', 'true')
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Home-specific radial gradient overlay (particles handled by GlobalBackground in layout) */}
      {!showTitleScreen && !isWorkshopMode && selected !== 'save' && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, var(--ui-page-bg-stop-1) 0%, var(--ui-bg) 100%)'
            }}
          />
        </div>
      )}

      {/* Header (hidden during title screen, workshop mode, and saves tab to match V1) */}
      {!showTitleScreen && !isWorkshopMode && selected !== 'save' && (
        <GameHeader
          tabs={tabs}
          activeTab={selected}
          onTabChange={handleTabChange}
        />
      )}

      {/* Workshop Mode Container - replaces normal header and background */}
      {isWorkshopMode && !showTitleScreen && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundColor: 'var(--ui-bg)',
            color: 'var(--ui-text)',
            transition: 'background-color 200ms var(--ui-ease), color 200ms var(--ui-ease)'
          }}
        />
      )}

      {/* Main Content Area (full height when workshop mode is active or saves tab is shown) */}
      <main
        className={`relative flex-1 overflow-hidden ${
          !showTitleScreen && !isWorkshopMode && selected !== 'save'
            ? 'h-[calc(100vh-var(--header-height))]'
            : 'h-screen'
        }`}
        style={{ zIndex: 'calc(var(--z-page) + 1)' }}
      >
        <AnimatePresence mode="wait">
          {TAB_COMPONENTS[selected] && (
            <motion.div
              key={selected}
              className="absolute inset-0 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<TabFallback />}>
                {createElement(TAB_COMPONENTS[selected])}
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Workshop Editor Overlay */}
      {showWorkshop && (
        <WorkshopEditor onClose={() => setShowWorkshop(false)} />
      )}

      {/* Title Screen Overlay */}
      <AnimatePresence>
        {showTitleScreen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{
              background: 'radial-gradient(circle at center, var(--ui-page-bg-stop-1) 0%, var(--ui-bg) 100%)',
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            {/* Sakura particles behind content (disabled for VRT stability) */}
            {!DISABLE_ANIMATIONS && <SakuraScene />}

            {/* Glass panel card */}
            <div
              className="glass-panel relative z-10 flex flex-col items-center gap-6 px-12 py-10"
              style={{ borderRadius: 'var(--ui-radius-lg)' }}
            >
              {/* Brand logo */}
              <img
                src={brandSakuraUrl}
                alt="Moyin"
                className={`h-20 w-20 ${DISABLE_ANIMATIONS ? '' : 'logo-float'}`}
              />

              {/* Title */}
              <h1
                className={`font-bold ${DISABLE_ANIMATIONS ? '' : 'tracking-in-expand'}`}
                style={{
                  fontFamily: 'var(--ui-font-special)',
                  fontSize: 'var(--ui-font-display)',
                  letterSpacing: '0.3em',
                  color: 'var(--ui-text)',
                  textShadow: '0 0 30px color-mix(in srgb, var(--ui-primary) 60%, transparent)',
                }}
              >
                MOYIN
              </h1>

              {/* Gradient divider */}
              <div
                className={DISABLE_ANIMATIONS ? '' : 'scale-up-hor-center'}
                style={{
                  width: '120px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--ui-primary), transparent)',
                  boxShadow: '0 0 8px color-mix(in srgb, var(--ui-primary) 50%, transparent)',
                }}
              />

              {/* Subtitle */}
              <p
                className={DISABLE_ANIMATIONS ? '' : 'text-focus-in'}
                style={{
                  fontSize: 'var(--ui-font-lg)',
                  color: 'var(--ui-muted)',
                  letterSpacing: '0.15em',
                }}
              >
                {t('message.app_slogan', 'Engineering Your Inspiration')}
              </p>
            </div>

            {/* Start button */}
            <button
              className={`relative z-10 mt-8 rounded-full font-semibold uppercase transition-transform hover:scale-105 ${DISABLE_ANIMATIONS ? '' : 'fade-in-up pulse-glow-loop'}`}
              style={{
                background: 'var(--ui-gradient-primary)',
                color: 'var(--ui-inverse)',
                minWidth: '220px',
                fontSize: 'var(--ui-font-lg)',
                letterSpacing: '0.1em',
                padding: '14px 32px',
              }}
              onClick={handleEnterApp}
            >
              {t('message.start', 'Start')}
            </button>

            {/* Footer */}
            <p
              className={`absolute bottom-6 z-10 ${DISABLE_ANIMATIONS ? '' : 'fade-in'}`}
              style={{
                fontSize: 'var(--ui-font-xs)',
                color: 'var(--ui-muted)',
                opacity: 0.5,
              }}
            >
              &copy; 2026 Moyin Factory &middot; Alpha Build
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
