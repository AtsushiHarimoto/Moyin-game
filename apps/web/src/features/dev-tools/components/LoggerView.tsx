import { useCallback, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogEntryData {
  id: string
  timestamp: number
  type: 'success' | 'error'
  provider: string
  model: string
  scenario: string
  latencyMs: number
  request: Record<string, unknown>
  response: Record<string, unknown>
  autoScore: { jsonValid: boolean }
  manualScore?: {
    roleplay: number | null
    instruction: number | null
    contextMemory: number | null
    note: string
  } | null
}

interface LoggerViewProps {
  logs: LogEntryData[]
  error?: string | null
  onClear?: () => void
  onExport?: () => void
  renderScorePanel?: (log: LogEntryData) => ReactNode
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoggerView({
  logs,
  error,
  onClear,
  onExport,
  renderScorePanel,
}: LoggerViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden rounded-xl border"
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-panel-glass-border)',
        boxShadow: 'var(--ui-shadow-soft)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{
          borderBottom: '2px solid var(--ui-panel-subtle)',
          background: 'var(--ui-panel)',
        }}
      >
        <h2
          className="flex items-center gap-2 text-lg font-bold"
          style={{ color: 'var(--ui-text)' }}
        >
          Log Viewer
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'var(--ui-panel-subtle)', color: 'var(--ui-muted)' }}
          >
            {logs.length} records
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border-none bg-transparent p-2 transition-colors hover:bg-[var(--ui-choice-hover)]"
            style={{ color: 'var(--ui-primary)' }}
            title="Export JSON"
            onClick={onExport}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-md border-none bg-transparent p-2 transition-colors hover:bg-red-500/20"
            style={{ color: 'var(--ui-danger)' }}
            title="Clear logs"
            onClick={onClear}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        style={{ background: 'var(--ui-bg)' }}
      >
        {error && (
          <div
            className="rounded-md border p-3 text-sm"
            style={{
              background: 'var(--ui-panel-subtle)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-danger)',
            }}
          >
            {error}
          </div>
        )}

        {logs.length === 0 && (
          <div className="py-10 text-center opacity-70" style={{ color: 'var(--ui-muted)' }}>
            No logs yet
          </div>
        )}

        {logs.map((log) => {
          const isExpanded = expandedId === log.id
          return (
            <div
              key={log.id}
              className={cn(
                'shrink-0 overflow-hidden rounded-md border transition-all',
                'hover:-translate-y-px hover:border-[var(--ui-primary)]',
                isExpanded && 'border-[var(--ui-primary)]',
              )}
              style={{
                background: 'var(--ui-panel)',
                borderColor: isExpanded ? 'var(--ui-primary)' : 'var(--ui-border)',
                boxShadow: isExpanded ? '0 4px 12px rgba(244, 114, 182, 0.15)' : 'var(--ui-shadow-soft)',
              }}
            >
              {/* Summary row */}
              <div
                className="flex min-h-[48px] cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--ui-panel-subtle)]"
                onClick={() => toggleExpand(log.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: log.type === 'success' ? 'var(--ui-success)' : 'var(--ui-danger)',
                    }}
                  />
                  <span className="w-[60px] font-mono text-[11px]" style={{ color: 'var(--ui-muted)' }}>
                    {formatTime(log.timestamp)}
                  </span>
                  <span
                    className="rounded bg-[var(--ui-panel-subtle)] px-2 py-0.5 text-[13px] font-semibold"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    {log.provider} / {log.model}
                  </span>
                  <span
                    className="rounded-sm bg-[var(--ui-panel-subtle)] px-2 py-0.5 text-xs"
                    style={{ color: 'var(--ui-muted)' }}
                  >
                    {log.scenario}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      'rounded-sm border px-1.5 py-0.5 text-xs font-semibold',
                      log.autoScore.jsonValid
                        ? 'border-[var(--ui-success)] text-[var(--ui-success)]'
                        : 'border-[var(--ui-danger)] text-[var(--ui-danger)]',
                    )}
                    style={{ background: 'var(--ui-panel-subtle)' }}
                  >
                    {log.autoScore.jsonValid ? 'JSON Valid' : 'JSON Invalid'}
                  </span>
                  <span
                    className={cn('font-mono text-[11px]', log.latencyMs > 1000 && 'font-bold text-amber-600')}
                    style={{ color: log.latencyMs > 1000 ? undefined : 'var(--ui-muted)' }}
                  >
                    {log.latencyMs}ms
                  </span>
                  <svg
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180 text-[var(--ui-primary)]')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: isExpanded ? undefined : 'var(--ui-muted)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div
                  className="flex flex-col gap-4 p-4 font-mono text-xs"
                  style={{
                    borderTop: '1px solid var(--ui-border)',
                    background: 'var(--ui-panel-subtle)',
                  }}
                >
                  {renderScorePanel?.(log)}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div
                        className="mb-1.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: 'var(--ui-muted)' }}
                      >
                        Request Payload
                      </div>
                      <pre
                        className="max-h-[300px] overflow-auto whitespace-pre-wrap break-all rounded-sm border p-3"
                        style={{
                          background: 'var(--ui-panel)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                          lineHeight: 1.5,
                        }}
                      >
                        {JSON.stringify(log.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div
                        className="mb-1.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: 'var(--ui-muted)' }}
                      >
                        Response Data
                      </div>
                      <pre
                        className={cn(
                          'max-h-[300px] overflow-auto whitespace-pre-wrap break-all rounded-sm border p-3',
                          log.type !== 'success' && 'border-red-200 bg-red-50 text-[var(--ui-danger)]',
                        )}
                        style={
                          log.type === 'success'
                            ? { background: 'var(--ui-panel)', borderColor: 'var(--ui-border)', color: 'var(--ui-text)', lineHeight: 1.5 }
                            : { lineHeight: 1.5 }
                        }
                      >
                        {JSON.stringify(log.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
