import { useTranslation } from 'react-i18next'

/**
 * LoginPage - Placeholder login page.
 * Migrated from Vue Login.vue (which was an empty stub).
 */
export default function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-xl border p-8 text-center"
        style={{
          background: 'var(--ui-panel-glass)',
          borderColor: 'var(--ui-panel-glass-border)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <h1
          className="mb-4 text-2xl font-bold"
          style={{ color: 'var(--ui-text)' }}
        >
          {t('message.route_title_home')}
        </h1>
        <p style={{ color: 'var(--ui-muted)' }}>
          {t('message.login_placeholder', 'Login functionality coming soon.')}
        </p>
      </div>
    </div>
  )
}
