/**
 * SystemErrorPage - Health check retry page.
 * Migrated from Vue SystemErrorPage.vue.
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const HEALTH_CHECK_URL = '/health'
const HEALTH_TIMEOUT_MS = 5000

export default function ErrorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const runHealthCheck = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    try {
      const response = await fetch(HEALTH_CHECK_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`health_check_http_${response.status}`)
      return true
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }, [])

  const handleRetry = useCallback(async () => {
    if (retrying) return
    setRetrying(true)
    setErrorMessage('')
    const ok = await runHealthCheck()
    setRetrying(false)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setErrorMessage(t('message.still_cannot_connect', '仍無法連線，請確認伺服器狀態後再試。'))
    }
  }, [retrying, runHealthCheck, navigate, t])

  return (
    <div
      className="flex min-h-screen items-center justify-center p-8"
      style={{ color: 'var(--ui-text)' }}
    >
      <div
        className="w-full max-w-[520px] rounded-xl border p-8 text-center"
        style={{
          background: 'var(--ui-panel-glass)',
          borderColor: 'var(--ui-panel-glass-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl font-bold"
          style={{
            borderColor: 'var(--ui-danger, #ef4444)',
            color: 'var(--ui-danger, #ef4444)',
            background: 'color-mix(in srgb, var(--ui-danger, #ef4444) 12%, transparent)',
          }}
        >
          !
        </div>

        <h1 className="mb-1.5 text-2xl font-bold">
          {t('message.server_connection_failed', '伺服器連線失敗')}
        </h1>
        <p className="mb-5" style={{ color: 'var(--ui-muted)' }}>
          {t('message.health_check_no_response', '健康檢查無回應，請稍後重試。')}
        </p>

        <div className="flex justify-center">
          <button
            disabled={retrying}
            onClick={handleRetry}
            className="rounded-full border border-transparent px-5 py-2.5 font-semibold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:translate-y-0"
            style={{
              background: 'var(--ui-primary)',
              color: 'var(--ui-inverse, #fff)',
            }}
          >
            {retrying
              ? t('message.reconnecting', '重新連線中...')
              : t('message.retry_and_go_home', '重試並返回首頁')}
          </button>
        </div>

        {errorMessage && (
          <p
            className="mt-4 text-sm"
            style={{ color: 'var(--ui-danger, #ef4444)' }}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}
