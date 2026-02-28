import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AggregatedStats {
  key: string
  provider: string
  model: string
  sampleCount: number
  jsonSuccessRate: number
  avgRoleplay: number | null
  avgInstruction: number | null
  avgContextMemory: number | null
}

interface StatsViewProps {
  stats: AggregatedStats[]
  loading?: boolean
  error?: string | null
  onExportCsv?: () => void
  onExportJson?: () => void
  /** Slot for custom chart rendering */
  renderCharts?: () => ReactNode
  /** Slot for custom filters */
  renderFilters?: () => ReactNode
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatScore(value: number | null): string {
  return value === null ? '--' : value.toFixed(1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatsView({
  stats,
  loading = false,
  error,
  onExportCsv,
  onExportJson,
  renderCharts,
  renderFilters,
}: StatsViewProps) {
  const hasData = stats.length > 0

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
        className="flex items-center justify-between gap-4 px-4 py-4"
        style={{ borderBottom: '2px solid var(--ui-panel-subtle)' }}
      >
        <h2
          className="flex items-center gap-2 text-lg font-bold"
          style={{ color: 'var(--ui-text)' }}
        >
          Statistics Dashboard
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--ui-panel-subtle)]"
            style={{ color: 'var(--ui-text)' }}
            onClick={onExportCsv}
          >
            CSV
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-[var(--ui-panel-subtle)]"
            style={{ color: 'var(--ui-text)' }}
            onClick={onExportJson}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="border-b p-4 text-sm"
          style={{
            color: 'var(--ui-danger)',
            background: 'var(--ui-panel-subtle)',
            borderColor: 'var(--ui-border)',
          }}
        >
          {error}
        </div>
      )}

      {/* Filters */}
      {renderFilters && (
        <div
          className="border-b p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          {renderFilters()}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col gap-6 overflow-auto p-4">
        {/* Table */}
        <div
          className="rounded-md border p-4"
          style={{ background: 'var(--ui-panel)', borderColor: 'var(--ui-border)' }}
        >
          {loading ? (
            <div className="py-6 text-center" style={{ color: 'var(--ui-muted)' }}>
              Loading...
            </div>
          ) : hasData ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['Provider/Model', 'Samples', 'JSON %', 'Roleplay', 'Instruction', 'Context'].map(
                    (header) => (
                      <th
                        key={header}
                        className="border-b p-2 text-left font-bold"
                        style={{ color: 'var(--ui-muted)', borderColor: 'var(--ui-border)' }}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.map((row) => (
                  <tr key={row.key}>
                    <td className="border-b p-2 font-mono" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {row.provider}/{row.model}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {row.sampleCount}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {formatPercent(row.jsonSuccessRate)}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {formatScore(row.avgRoleplay)}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {formatScore(row.avgInstruction)}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}>
                      {formatScore(row.avgContextMemory)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center" style={{ color: 'var(--ui-muted)' }}>
              No statistics available
            </div>
          )}
        </div>

        {/* Charts slot */}
        {renderCharts?.()}
      </div>
    </div>
  )
}
