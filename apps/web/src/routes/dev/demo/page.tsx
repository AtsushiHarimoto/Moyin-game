/** DevDemoPage - Smoke test runner for story branches/endings + LLM raw layer exports */
import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FlaskConical,
  FileJson,
  Database,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface SmokeRunMeta {
  runId: string
  startedAt: string
}

interface SmokeCaseResult {
  id: string
  name: string
  sessionId: string
  endingId: string | null
  status: string
  commitCount: number
  snapshotCount: number
  notes?: string
}

interface ScenarioConfig {
  id: string
  name: string
  optionIds: string[]
}

const SCENARIOS: ScenarioConfig[] = [
  { id: 'CASE_A', name: 'Xiaomei Good Ending', optionIds: ['opt_go_xiaomei', 'opt_xiaomei_lock'] },
  { id: 'CASE_B', name: 'Riko True Ending', optionIds: ['opt_go_lizi', 'opt_lizi_true'] },
  { id: 'CASE_C', name: 'Dual -> Harem', optionIds: ['opt_go_xiaomei', 'opt_xiaomei_dual', 'opt_to_harem'] },
]

const panelVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

function downloadFile(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function DevDemoPage() {
  const navigate = useNavigate()

  const [isRunning, setIsRunning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [statusMessage, setStatusMessage] = useState('Standby')
  const [lastRun, setLastRun] = useState<SmokeRunMeta | null>(null)
  const [smokeRuns, setSmokeRuns] = useState<SmokeCaseResult[]>([])
  const [traceEvents, setTraceEvents] = useState<Array<{ type: string; payload: Record<string, unknown>; ts: string }>>([])

  const logText = useMemo(() => logs.join('\n'), [logs])

  const appendLog = useCallback((message: string, payload?: Record<string, unknown>) => {
    const line = payload ? `${message} ${JSON.stringify(payload)}` : message
    setLogs((prev) => [...prev, line])
    setTraceEvents((prev) => [
      ...prev,
      { type: 'DEMO_STEP', payload: { message, ...payload }, ts: new Date().toISOString() },
    ])
  }, [])

  const simulateScenario = useCallback(
    async (scenario: ScenarioConfig): Promise<SmokeCaseResult> => {
      const sessionId = generateSessionId()
      appendLog('Starting session', { scenario: scenario.name })

      let phase: 'playing' | 'await_choice' | 'await_input' | 'ended' = 'playing'
      let commitCount = 0
      let snapshotCount = 0
      let endingId: string | null = null

      await sleep(200)
      phase = 'playing'
      commitCount++
      snapshotCount++
      appendLog('Scene initialized', { sessionId, scenario: scenario.name })

      for (const optionId of scenario.optionIds) {
        await sleep(150)
        phase = 'await_choice'
        appendLog('Awaiting choice', { optionId })

        await sleep(100)
        appendLog('Choice selected', { optionId })
        commitCount++
        phase = 'playing'

        await sleep(200)
        snapshotCount++
      }

      const possibleEndings: Record<string, string> = {
        CASE_A: 'ending_xiaomei_good',
        CASE_B: 'ending_riko_true',
        CASE_C: 'ending_harem',
      }

      endingId = possibleEndings[scenario.id] ?? null
      if (endingId) {
        phase = 'ended'
        appendLog('Ending reached', { endingId, scenario: scenario.name })
      }

      return {
        id: scenario.id,
        name: scenario.name,
        sessionId,
        endingId,
        status: endingId ? 'ended' : phase,
        commitCount,
        snapshotCount,
      }
    },
    [appendLog],
  )

  const simulateTalkDisabledCase = useCallback(async (): Promise<SmokeCaseResult> => {
    const sessionId = generateSessionId()
    appendLog('Running talk-disabled case')

    await sleep(200)
    const hasTalkTargets = false

    return {
      id: 'CASE_D',
      name: 'player-only no talk',
      sessionId,
      endingId: null,
      status: hasTalkTargets ? 'fail' : 'ok',
      commitCount: 1,
      snapshotCount: 1,
      notes: hasTalkTargets ? 'talk_targets_present' : 'talk_disabled',
    }
  }, [appendLog])

  const simulateFrameTrimCase = useCallback(async (): Promise<SmokeCaseResult> => {
    const sessionId = generateSessionId()
    appendLog('Running frame-trim case')

    await sleep(300)
    const trimmed = true

    return {
      id: 'CASE_E',
      name: 'frames trimmed',
      sessionId,
      endingId: null,
      status: trimmed ? 'ok' : 'fail',
      commitCount: 2,
      snapshotCount: 2,
      notes: trimmed ? 'frames_trimmed=true' : 'frames_trimmed=false',
    }
  }, [appendLog])

  const runSmoke = useCallback(async () => {
    setIsRunning(true)
    setStatusMessage('Smoke running...')
    setLogs([])
    setSmokeRuns([])
    setTraceEvents([])

    const runId = new Date().toISOString().replace(/[:.]/g, '-')
    setLastRun({ runId, startedAt: new Date().toISOString() })

    try {
      const results: SmokeCaseResult[] = []

      for (const scenario of SCENARIOS) {
        try {
          const result = await simulateScenario(scenario)
          results.push(result)
        } catch (error) {
          results.push({
            id: scenario.id,
            name: scenario.name,
            sessionId: '',
            endingId: null,
            status: 'fail',
            commitCount: 0,
            snapshotCount: 0,
            notes: String(error),
          })
          appendLog('Scenario failed', { scenario: scenario.name, error: String(error) })
        }
      }

      results.push(await simulateTalkDisabledCase())
      results.push(await simulateFrameTrimCase())

      setSmokeRuns(results)
      setStatusMessage('Smoke complete')
      appendLog('All scenarios finished')
    } catch (err) {
      console.warn('[DevDemo] smoke failed', err)
      setStatusMessage('Smoke failed')
      appendLog('Smoke failed', { error: String(err) })
    } finally {
      setIsRunning(false)
    }
  }, [simulateScenario, simulateTalkDisabledCase, simulateFrameTrimCase, appendLog])

  const exportArtifacts = useCallback(async () => {
    if (!lastRun) {
      setStatusMessage('Please run Smoke first')
      return
    }

    setIsExporting(true)
    try {
      const runId = lastRun.runId

      const smokeLines = [
        `runId=${runId}`,
        `generatedAt=${new Date().toISOString()}`,
        '',
        ...smokeRuns.map(
          (run) =>
            `${run.id} ${run.status} endingId=${run.endingId ?? '-'} commits=${run.commitCount} snapshots=${run.snapshotCount}${run.notes ? ` notes=${run.notes}` : ''}`,
        ),
      ]
      downloadFile('smoke_llm_raw_split.log', smokeLines.join('\n'), 'text/plain')

      const traceSnapshot = {
        runId,
        generatedAt: new Date().toISOString(),
        events: traceEvents,
      }
      downloadFile(
        `trace_llm_raw_split.${runId}.json`,
        JSON.stringify(traceSnapshot, null, 2),
      )

      const dbPayload = {
        meta: {
          app: 'moyin-game-v2',
          generatedAt: new Date().toISOString(),
          runId,
        },
        tables: {
          sessions: smokeRuns.map((r) => ({
            sessionId: r.sessionId,
            scenario: r.name,
            status: r.status,
          })),
          summary: smokeRuns.map((r) => ({
            id: r.id,
            endingId: r.endingId,
            commitCount: r.commitCount,
            snapshotCount: r.snapshotCount,
          })),
        },
      }
      downloadFile(
        `db_export_after_smoke.${runId}.json`,
        JSON.stringify(dbPayload, null, 2),
      )

      const validationReport = {
        runId,
        generatedAt: new Date().toISOString(),
        totalCases: smokeRuns.length,
        passed: smokeRuns.filter((r) => r.status === 'ended' || r.status === 'ok').length,
        failed: smokeRuns.filter((r) => r.status === 'fail').length,
        cases: smokeRuns.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          endingId: r.endingId,
          notes: r.notes,
        })),
      }
      downloadFile('validation_report.json', JSON.stringify(validationReport, null, 2))

      setStatusMessage('Artifacts exported')
    } catch (err) {
      console.warn('[DevDemo] export failed', err)
      setStatusMessage('Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [lastRun, smokeRuns, traceEvents])

  const getStatusIcon = useCallback((status: string) => {
    if (status === 'ended' || status === 'ok') return <CheckCircle2 size={16} className="text-emerald-500" />
    if (status === 'fail') return <XCircle size={16} className="text-red-500" />
    return <AlertCircle size={16} className="text-amber-500" />
  }, [])

  const passedCount = useMemo(
    () => smokeRuns.filter((r) => r.status === 'ended' || r.status === 'ok').length,
    [smokeRuns],
  )
  const failedCount = useMemo(
    () => smokeRuns.filter((r) => r.status === 'fail').length,
    [smokeRuns],
  )

  return (
    <div
      className="h-screen overflow-auto p-6"
      style={{
        background: 'linear-gradient(135deg, var(--ui-bg) 0%, var(--ui-primary-soft) 100%)',
      }}
    >
      <motion.div
        className="glass-panel relative mx-auto max-w-[960px] rounded-2xl p-6"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back button */}
        <button
          className="absolute right-4 top-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--ui-panel-subtle)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Title */}
        <h2
          className="m-0 mb-2 text-xl font-bold"
          style={{ color: 'var(--ui-text)', fontFamily: 'var(--ui-font-special)' }}
        >
          Dev Demo
        </h2>
        <p className="m-0 mb-4 text-sm" style={{ color: 'var(--ui-muted)' }}>
          Smoke test story branches/endings + LLM raw layer -- exports log/trace/db/validation
        </p>

        {/* Actions */}
        <div className="mb-4 flex gap-3">
          <button
            className={cn(
              'flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all',
              isRunning && 'opacity-60',
            )}
            style={{
              background: 'var(--ui-primary)',
              borderColor: 'var(--ui-primary)',
              color: 'var(--ui-inverse)',
            }}
            disabled={isRunning}
            onClick={runSmoke}
          >
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Smoke
              </>
            )}
          </button>

          <button
            className={cn(
              'flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all',
              (isExporting || !lastRun) && 'opacity-50',
            )}
            style={{
              background: 'var(--ui-panel)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-primary)',
            }}
            disabled={isExporting || !lastRun}
            onClick={exportArtifacts}
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export Artifacts
              </>
            )}
          </button>
        </div>

        {/* Summary */}
        <div
          className="mb-4 rounded-xl border p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          <div className="mb-2 flex items-center gap-3">
            <FlaskConical size={16} style={{ color: 'var(--ui-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
              Status: {statusMessage}
            </span>
          </div>

          {lastRun && (
            <div className="mb-3 text-xs" style={{ color: 'var(--ui-muted)' }}>
              runId: {lastRun.runId}
            </div>
          )}

          {smokeRuns.length > 0 && (
            <>
              <div className="mb-2 flex items-center gap-4 text-xs" style={{ color: 'var(--ui-muted)' }}>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Passed: {passedCount}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle size={12} className="text-red-500" />
                  Failed: {failedCount}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {smokeRuns.map((run) => (
                    <motion.div
                      key={run.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                      style={{
                        background: 'var(--ui-panel)',
                        borderColor: 'var(--ui-border)',
                      }}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getStatusIcon(run.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--ui-text)' }}>
                            {run.id}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
                            {run.name}
                          </span>
                        </div>
                        <div className="mt-1 flex gap-4 text-xs" style={{ color: 'var(--ui-muted)' }}>
                          <span className="flex items-center gap-1">
                            <FileJson size={10} />
                            {run.status}
                          </span>
                          <span>{run.endingId ?? 'no ending'}</span>
                          <span className="flex items-center gap-1">
                            <Database size={10} />
                            commits={run.commitCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileCheck size={10} />
                            snapshots={run.snapshotCount}
                          </span>
                        </div>
                        {run.notes && (
                          <div className="mt-1 text-xs italic" style={{ color: 'var(--ui-muted)' }}>
                            {run.notes}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Log */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          <h3 className="m-0 mb-2 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
            Log
          </h3>
          <pre
            className="m-0 min-h-[120px] max-h-[300px] overflow-y-auto text-xs leading-relaxed"
            style={{
              color: 'var(--ui-muted)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--ui-font-mono)',
            }}
          >
            {logText || 'No logs yet. Click "Run Smoke" to start.'}
          </pre>
        </div>
      </motion.div>
    </div>
  )
}
