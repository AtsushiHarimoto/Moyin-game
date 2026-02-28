import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import GlobalBackground from '@/components/layout/GlobalBackground'
import { useUiStore } from '@/stores/useUiStore'

/**
 * Route title mapping for document title sync
 */
const ROUTE_TITLE_MAP: Record<string, string> = {
  '/': 'message.route_title_home',
  '/login': 'message.route_title_home',
  '/demo': 'message.route_title_demo',
  '/ui-demo': 'message.route_title_demo',
  '/saves': 'message.route_title_saves',
  '/settings': 'message.setting_menu',
  '/Setting': 'message.setting_menu',
  '/TestGrok': 'message.setting_lbl_llm_runner',
  '/vn-stage': 'message.vn_stage',
  '/vn-replay': 'message.vn_stage',
  '/stories': 'message.custom_mode',
  '/stories/import': 'message.import_story_title',
  '/admin': 'message.route_title_story_factory_console',
  '/admin/icons': 'message.route_title_story_factory_console',
  '/admin/stage-editor': 'message.route_title_story_factory_console',
  '/dev/demo': 'message.dev_demo',
  '/dev/llm-runner': 'message.setting_lbl_llm_runner',
  '/dev/api': 'message.dev_api',
  '/dev/net': 'message.dev_api',
  '/test/dialogue-box': 'message.vn_stage',
  '/error': '',
}

/**
 * Root layout component.
 * Provides: header placeholder, sidebar placeholder, background, and page title sync.
 */
export default function RootLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentTheme = useUiStore((s) => s.currentTheme)
  // VN stage routes manage their own background — hide the global one for full immersion (matches V1)
  const isImmersiveRoute = location.pathname.startsWith('/vn-stage') || location.pathname.startsWith('/vn-replay')

  // Sync theme to <html> on mount and when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  // Update document title based on current route
  useEffect(() => {
    const titleKey = ROUTE_TITLE_MAP[location.pathname] ?? ''
    const appTitle = t('message.win_title')
    const subTitle = titleKey ? ` | ${t(titleKey)}` : ''
    document.title = appTitle + subTitle
  }, [location.pathname, t])

  return (
    <div
      id="app"
      className="relative h-screen overflow-hidden"
      style={{ background: isImmersiveRoute ? 'var(--ui-vn-stage-bg, #0a0a0a)' : 'var(--ui-gradient-page-bg)' }}
    >
      {!isImmersiveRoute && (
        <GlobalBackground theme={currentTheme} />
      )}

      <main className="relative" style={{ zIndex: 'var(--z-hud)' }}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center">
                <p style={{ color: 'var(--ui-muted)' }}>
                  {t('message.loading')}
                </p>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
