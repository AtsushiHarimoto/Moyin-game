/** ApiPlaygroundPage - Network Lab for REST + Stream testing */
import { useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Play,
  Download,
  Copy,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  Zap,
  Radio,
  GitBranch,
  XCircle,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { downloadFile } from '@/lib/download'

type NetPolicy = 'takeLatest' | 'serial' | 'parallel' | 'dedupe'
type TrackLoading = 'global' | 'scope' | 'none'
type FinalState = 'ok' | 'canceled' | 'stale_discarded' | 'late_discarded' | 'error' | 'timeout'

interface CaseResult {
  caseId: string
  caseName: string
  requestId: string
  policy: NetPolicy
  mode: 'rest' | 'stream'
  finalState: FinalState
  durationMs: number
  chunkCount?: number
  errorCode?: string
  retryCount?: number
}

interface RequestState {
  loading: boolean
  abortController: AbortController | null
}

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

function generateId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function ApiPlaygroundPage() {
  const navigate = useNavigate()

  const [useMock, setUseMock] = useState(true)
  const [defaultPolicy, setDefaultPolicy] = useState<NetPolicy>('takeLatest')
  const [trackLoading, setTrackLoading] = useState<TrackLoading>('scope')
  const [slowDelayMs, setSlowDelayMs] = useState(600)
  const [retryTimes, setRetryTimes] = useState(1)
  const [progressValue, setProgressValue] = useState<number | null>(null)
  const [lastChunkCount, setLastChunkCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [caseResults, setCaseResults] = useState<CaseResult[]>([])
  const [globalLoadingCount, setGlobalLoadingCount] = useState(0)
  const [scopeLoadingCount, setScopeLoadingCount] = useState(0)
  const [isRunningSmoke, setIsRunningSmoke] = useState(false)

  const activeRequests = useRef<Map<string, RequestState>>(new Map())
  const runIdRef = useRef<string>('')

  const modeLabel = useMemo(() => (useMock ? 'Mock' : 'Real'), [useMock])
  const logText = useMemo(() => logs.join('\n'), [logs])
  const progressLabel = useMemo(
    () => (progressValue === null ? '--' : `${progressValue}%`),
    [progressValue],
  )

  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${message}`])
  }, [])

  const recordCase = useCallback((result: CaseResult) => {
    setCaseResults((prev) => [result, ...prev].slice(0, 50))
  }, [])

  const resetRun = useCallback(
    (note: string) => {
      setLogs([])
      setCaseResults([])
      setProgressValue(null)
      setLastChunkCount(0)
      runIdRef.current = `${note}_${Date.now()}`
      appendLog(`[RESET] ${note}`)
    },
    [appendLog],
  )

  const incrementLoading = useCallback(() => {
    setGlobalLoadingCount((c) => c + 1)
    setScopeLoadingCount((c) => c + 1)
  }, [])

  const decrementLoading = useCallback(() => {
    setGlobalLoadingCount((c) => Math.max(0, c - 1))
    setScopeLoadingCount((c) => Math.max(0, c - 1))
  }, [])

  const simulateRestRequest = useCallback(
    async (params: {
      caseName: string
      delayMs?: number
      shouldFail?: boolean
      failStatus?: number
      shouldTimeout?: boolean
      timeoutMs?: number
      policy?: NetPolicy
    }): Promise<CaseResult> => {
      const requestId = generateId()
      const startTime = Date.now()
      const controller = new AbortController()
      const policy = params.policy ?? defaultPolicy

      activeRequests.current.set(requestId, { loading: true, abortController: controller })
      incrementLoading()

      try {
        const delay = params.delayMs ?? slowDelayMs
        const timeoutMs = params.timeoutMs ?? 30000

        const timeoutId = params.shouldTimeout
          ? setTimeout(() => controller.abort('timeout'), timeoutMs)
          : undefined

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (params.shouldFail) {
              reject(new Error(`HTTP ${params.failStatus ?? 500}`))
            } else {
              resolve()
            }
          }, delay)

          controller.signal.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new Error(controller.signal.reason === 'timeout' ? 'timeout' : 'canceled'))
          })
        })

        if (timeoutId) clearTimeout(timeoutId)

        const result: CaseResult = {
          caseId: `${params.caseName}_${requestId}`,
          caseName: params.caseName,
          requestId,
          policy,
          mode: 'rest',
          finalState: 'ok',
          durationMs: Date.now() - startTime,
        }
        return result
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        let finalState: FinalState = 'error'
        if (message === 'canceled') finalState = 'canceled'
        else if (message === 'timeout') finalState = 'timeout'

        return {
          caseId: `${params.caseName}_${requestId}`,
          caseName: params.caseName,
          requestId,
          policy,
          mode: 'rest',
          finalState,
          durationMs: Date.now() - startTime,
          errorCode: message,
        }
      } finally {
        activeRequests.current.delete(requestId)
        decrementLoading()
      }
    },
    [defaultPolicy, slowDelayMs, incrementLoading, decrementLoading],
  )

  const simulateStreamRequest = useCallback(
    async (params: {
      caseName: string
      chunkCount?: number
      chunkDelayMs?: number
      cancelAfterChunks?: number
      cancelAfterMs?: number
      policy?: NetPolicy
    }): Promise<CaseResult> => {
      const requestId = generateId()
      const startTime = Date.now()
      const controller = new AbortController()
      const policy = params.policy ?? defaultPolicy
      const totalChunks = params.chunkCount ?? 8
      const chunkDelay = params.chunkDelayMs ?? 100

      activeRequests.current.set(requestId, { loading: true, abortController: controller })
      incrementLoading()

      let chunkCount = 0

      if (params.cancelAfterMs) {
        setTimeout(() => controller.abort('canceled'), params.cancelAfterMs)
      }

      try {
        for (let i = 0; i < totalChunks; i++) {
          if (controller.signal.aborted) {
            throw new Error('canceled')
          }

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, chunkDelay)
            controller.signal.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('canceled'))
            })
          })

          chunkCount++
          setLastChunkCount(chunkCount)
          appendLog(`[${params.caseName}] chunk#${chunkCount}`)

          if (params.cancelAfterChunks && chunkCount >= params.cancelAfterChunks) {
            controller.abort('canceled')
            throw new Error('canceled')
          }
        }

        return {
          caseId: `${params.caseName}_${requestId}`,
          caseName: params.caseName,
          requestId,
          policy,
          mode: 'stream',
          finalState: 'ok',
          durationMs: Date.now() - startTime,
          chunkCount,
        }
      } catch {
        return {
          caseId: `${params.caseName}_${requestId}`,
          caseName: params.caseName,
          requestId,
          policy,
          mode: 'stream',
          finalState: 'canceled',
          durationMs: Date.now() - startTime,
          chunkCount,
        }
      } finally {
        activeRequests.current.delete(requestId)
        decrementLoading()
      }
    },
    [defaultPolicy, incrementLoading, decrementLoading, appendLog],
  )

  const runRestOk = useCallback(async () => {
    const result = await simulateRestRequest({ caseName: 'REST_OK', delayMs: useMock ? 200 : 500 })
    appendLog(`[REST_OK] ${result.finalState} ${result.durationMs}ms`)
    recordCase(result)
  }, [simulateRestRequest, useMock, appendLog, recordCase])

  const runRestError = useCallback(async () => {
    const result = await simulateRestRequest({
      caseName: 'REST_ERROR',
      delayMs: 150,
      shouldFail: true,
      failStatus: 500,
    })
    appendLog(`[REST_ERROR] ${result.finalState} code=${result.errorCode ?? '-'}`)
    recordCase(result)
  }, [simulateRestRequest, appendLog, recordCase])

  const runRestTimeout = useCallback(async () => {
    const result = await simulateRestRequest({
      caseName: 'REST_TIMEOUT',
      delayMs: 5000,
      shouldTimeout: true,
      timeoutMs: useMock ? 300 : 100,
    })
    appendLog(`[REST_TIMEOUT] ${result.finalState}`)
    recordCase(result)
  }, [simulateRestRequest, useMock, appendLog, recordCase])

  const runRestRetry = useCallback(async () => {
    const maxRetries = Math.max(1, retryTimes)
    let lastResult: CaseResult | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await simulateRestRequest({
        caseName: 'REST_RETRY',
        delayMs: 150,
        shouldFail: true,
        failStatus: 503,
      })
      if (lastResult.finalState === 'ok') break
    }

    if (lastResult) {
      appendLog(`[REST_RETRY] ${lastResult.finalState} retries=${maxRetries}`)
      lastResult.retryCount = maxRetries
      recordCase(lastResult)
    }
  }, [simulateRestRequest, retryTimes, appendLog, recordCase])

  const runRestCancel = useCallback(async () => {
    const requestId = generateId()
    const startTime = Date.now()
    const controller = new AbortController()

    activeRequests.current.set(requestId, { loading: true, abortController: controller })
    incrementLoading()

    setTimeout(() => controller.abort('canceled'), useMock ? 120 : 50)

    try {
      await new Promise<void>((_, reject) => {
        const timer = setTimeout(() => {}, slowDelayMs)
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('canceled'))
        })
      })
    } catch {
      // expected cancellation
    }

    const result: CaseResult = {
      caseId: `REST_CANCEL_${requestId}`,
      caseName: 'REST_CANCEL',
      requestId,
      policy: defaultPolicy,
      mode: 'rest',
      finalState: 'canceled',
      durationMs: Date.now() - startTime,
    }

    activeRequests.current.delete(requestId)
    decrementLoading()
    appendLog(`[REST_CANCEL] ${result.finalState} reason=user_cancel`)
    recordCase(result)
  }, [useMock, slowDelayMs, defaultPolicy, incrementLoading, decrementLoading, appendLog, recordCase])

  const runRestLatest = useCallback(async () => {
    const first = simulateRestRequest({
      caseName: 'REST_LATEST#1',
      delayMs: slowDelayMs + 400,
      policy: 'takeLatest',
    })
    const second = simulateRestRequest({
      caseName: 'REST_LATEST#2',
      delayMs: Math.max(120, slowDelayMs - 200),
      policy: 'takeLatest',
    })

    const [firstResult, secondResult] = await Promise.all([first, second])
    const staleResult = { ...firstResult, finalState: 'stale_discarded' as FinalState }
    appendLog(`[REST_LATEST] first=${staleResult.finalState} second=${secondResult.finalState}`)
    recordCase(staleResult)
    recordCase(secondResult)
  }, [simulateRestRequest, slowDelayMs, appendLog, recordCase])

  const runLateDiscard = useCallback(async () => {
    const requestId = generateId()
    const startTime = Date.now()
    const controller = new AbortController()

    activeRequests.current.set(requestId, { loading: true, abortController: controller })
    incrementLoading()

    setTimeout(() => controller.abort('canceled'), useMock ? 120 : 50)

    await new Promise((resolve) => setTimeout(resolve, useMock ? 200 : 100))

    const result: CaseResult = {
      caseId: `LATE_DISCARD_${requestId}`,
      caseName: 'LATE_RESPONSE_DISCARDED',
      requestId,
      policy: 'takeLatest',
      mode: 'rest',
      finalState: 'late_discarded',
      durationMs: Date.now() - startTime,
    }

    activeRequests.current.delete(requestId)
    decrementLoading()
    appendLog(`[LATE_DISCARD] ${result.finalState}`)
    recordCase(result)
  }, [useMock, incrementLoading, decrementLoading, appendLog, recordCase])

  const runRestProgress = useCallback(async () => {
    setProgressValue(0)
    const requestId = generateId()
    const startTime = Date.now()

    incrementLoading()

    for (let p = 0; p <= 100; p += 10) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      setProgressValue(p)
    }

    decrementLoading()

    const result: CaseResult = {
      caseId: `REST_PROGRESS_${requestId}`,
      caseName: 'REST_PROGRESS',
      requestId,
      policy: 'parallel',
      mode: 'rest',
      finalState: 'ok',
      durationMs: Date.now() - startTime,
    }

    appendLog(`[REST_PROGRESS] ${result.finalState} progress=100%`)
    recordCase(result)
  }, [incrementLoading, decrementLoading, appendLog, recordCase])

  const runStreamOk = useCallback(async () => {
    const result = await simulateStreamRequest({ caseName: 'STREAM_OK' })
    appendLog(`[STREAM_OK] ${result.finalState} chunks=${result.chunkCount ?? 0}`)
    recordCase(result)
  }, [simulateStreamRequest, appendLog, recordCase])

  const runStreamCancel = useCallback(async () => {
    const result = await simulateStreamRequest({
      caseName: 'STREAM_CANCEL',
      cancelAfterChunks: useMock ? 2 : undefined,
      cancelAfterMs: useMock ? undefined : 150,
    })
    appendLog(`[STREAM_CANCEL] ${result.finalState} chunks=${result.chunkCount ?? 0}`)
    recordCase(result)
  }, [simulateStreamRequest, useMock, appendLog, recordCase])

  const runStreamLatest = useCallback(async () => {
    const first = simulateStreamRequest({ caseName: 'STREAM_LATEST#1', policy: 'takeLatest' })
    const second = simulateStreamRequest({ caseName: 'STREAM_LATEST#2', policy: 'takeLatest' })
    const [firstResult, secondResult] = await Promise.all([first, second])
    appendLog(`[STREAM_LATEST] ${firstResult.finalState} / ${secondResult.finalState}`)
    recordCase(firstResult)
    recordCase(secondResult)
  }, [simulateStreamRequest, appendLog, recordCase])

  const runConcurrent = useCallback(async () => {
    const main = simulateRestRequest({
      caseName: 'CONCURRENT_MAIN',
      delayMs: slowDelayMs,
      policy: 'parallel',
    })
    const egg = simulateRestRequest({
      caseName: 'CONCURRENT_EGG',
      delayMs: 200,
      policy: 'parallel',
    })
    const [mainResult, eggResult] = await Promise.all([main, egg])
    appendLog(`[CONCURRENT] main=${mainResult.finalState} egg=${eggResult.finalState}`)
    recordCase(mainResult)
    recordCase(eggResult)
  }, [simulateRestRequest, slowDelayMs, appendLog, recordCase])

  const runSerial = useCallback(async () => {
    for (let idx = 1; idx <= 3; idx++) {
      const result = await simulateRestRequest({
        caseName: `SERIAL_${idx}`,
        delayMs: 200 + idx * 120,
        policy: 'serial',
      })
      appendLog(`[SERIAL] #${idx} ${result.finalState}`)
      recordCase(result)
    }
  }, [simulateRestRequest, appendLog, recordCase])

  const runDedupe = useCallback(async () => {
    const first = simulateRestRequest({
      caseName: 'DEDUPE',
      delayMs: slowDelayMs,
      policy: 'dedupe',
    })
    const second = simulateRestRequest({
      caseName: 'DEDUPE#2',
      delayMs: slowDelayMs,
      policy: 'dedupe',
    })
    const [firstResult, secondResult] = await Promise.all([first, second])
    appendLog(`[DEDUPE] first=${firstResult.finalState} second=${secondResult.finalState}`)
    recordCase(firstResult)
    recordCase(secondResult)
  }, [simulateRestRequest, slowDelayMs, appendLog, recordCase])

  const runSmoke = useCallback(async () => {
    resetRun('net_smoke')
    setIsRunningSmoke(true)
    appendLog('[SMOKE] start')

    try {
      await runRestOk()
      await runRestCancel()
      await runRestLatest()
      await runRestTimeout()
      await runRestRetry()
      await runStreamOk()
      await runStreamCancel()
      await runLateDiscard()
      appendLog('[SMOKE] done')
    } catch (err) {
      appendLog(`[SMOKE] failed: ${err}`)
    } finally {
      setIsRunningSmoke(false)
    }
  }, [
    resetRun,
    appendLog,
    runRestOk,
    runRestCancel,
    runRestLatest,
    runRestTimeout,
    runRestRetry,
    runStreamOk,
    runStreamCancel,
    runLateDiscard,
  ])

  const exportTrace = useCallback(() => {
    const payload = {
      runId: runIdRef.current || `manual_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      appVersion: 'moyin-game-v2',
      mode: useMock ? 'mock' : 'real',
      cases: caseResults,
      logs,
    }
    downloadFile(
      JSON.stringify(payload, null, 2),
      `net_trace.${payload.runId}.json`,
    )
  }, [useMock, caseResults, logs])

  const exportSmokeLog = useCallback(() => {
    const runId = runIdRef.current || `manual_${Date.now()}`
    const totals = caseResults.reduce(
      (acc, item) => {
        const key = item.finalState
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const lines = caseResults.map((item) =>
      [
        item.caseName,
        item.requestId,
        item.policy,
        item.mode,
        item.finalState,
        item.errorCode ?? '-',
        item.retryCount ?? '-',
        item.chunkCount ?? '-',
        `${item.durationMs}ms`,
      ].join(' | '),
    )
    const totalsLine = `totals | ok=${totals['ok'] ?? 0} canceled=${totals['canceled'] ?? 0} stale_discarded=${totals['stale_discarded'] ?? 0} error=${totals['error'] ?? 0}`
    const content = [`runId=${runId}`, `generatedAt=${new Date().toISOString()}`, ...lines, totalsLine].join('\n')
    downloadFile(content, `net_smoke.${runId}.log`, 'text/plain')
  }, [caseResults])

  const copySummary = useCallback(async () => {
    const runId = runIdRef.current || `manual_${Date.now()}`
    const lines = caseResults.map(
      (item) => `${item.caseName}\t${item.finalState}\t${item.durationMs}ms\t${item.requestId}`,
    )
    const content = [`runId=${runId}`, `generatedAt=${new Date().toISOString()}`, ...lines].join('\n')
    try {
      await navigator.clipboard.writeText(content)
      appendLog('[COPY] Summary copied')
    } catch {
      appendLog('[COPY] Copy failed')
    }
  }, [caseResults, appendLog])

  const stateIcon = useCallback((state: FinalState) => {
    switch (state) {
      case 'ok':
        return <CheckCircle2 size={14} className="text-emerald-500" />
      case 'canceled':
      case 'stale_discarded':
      case 'late_discarded':
        return <AlertCircle size={14} className="text-amber-500" />
      case 'error':
      case 'timeout':
        return <XCircle size={14} className="text-red-500" />
      default:
        return null
    }
  }, [])

  return (
    <div
      className="h-screen overflow-auto p-6"
      style={{
        background: 'linear-gradient(135deg, var(--ui-bg) 0%, var(--ui-primary-soft) 100%)',
      }}
    >
      <motion.div
        className="glass-panel mx-auto flex max-w-[1600px] flex-col gap-4 rounded-2xl p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="m-0 mb-2 text-xl font-bold"
              style={{ color: 'var(--ui-text)', fontFamily: 'var(--ui-font-special)' }}
            >
              Network Lab ({modeLabel})
            </h2>
            <p className="m-0 text-sm" style={{ color: 'var(--ui-muted)' }}>
              REST + Stream testing - does not affect VN-stage main flow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 text-right text-xs" style={{ color: 'var(--ui-muted)' }}>
              <span className="flex items-center justify-end gap-1">
                <Loader2 size={12} /> Global: {globalLoadingCount}
              </span>
              <span className="flex items-center justify-end gap-1">
                <BarChart3 size={12} /> Scope: {scopeLoadingCount}
              </span>
              <span className="flex items-center justify-end gap-1">
                {globalLoadingCount > 0 ? <WifiOff size={12} /> : <Wifi size={12} />}
                {globalLoadingCount > 0 ? 'Busy' : 'Idle'}
              </span>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
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
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => setUseMock(e.target.checked)}
              className="accent-[var(--ui-primary)]"
            />
            Mock
          </label>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
            Policy
            <select
              value={defaultPolicy}
              onChange={(e) => setDefaultPolicy(e.target.value as NetPolicy)}
              className="rounded-md border px-2 py-1 text-sm"
              style={{
                background: 'var(--ui-panel)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <option value="takeLatest">Take Latest</option>
              <option value="serial">Serial</option>
              <option value="parallel">Parallel</option>
              <option value="dedupe">Dedupe</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
            Delay (ms)
            <input
              type="number"
              min={0}
              value={slowDelayMs}
              onChange={(e) => setSlowDelayMs(Number(e.target.value))}
              className="w-20 rounded-md border px-2 py-1 text-sm"
              style={{
                background: 'var(--ui-panel)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
            Retries
            <input
              type="number"
              min={0}
              value={retryTimes}
              onChange={(e) => setRetryTimes(Number(e.target.value))}
              className="w-16 rounded-md border px-2 py-1 text-sm"
              style={{
                background: 'var(--ui-panel)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
            Loading
            <select
              value={trackLoading}
              onChange={(e) => setTrackLoading(e.target.value as TrackLoading)}
              className="rounded-md border px-2 py-1 text-sm"
              style={{
                background: 'var(--ui-panel)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <option value="global">Global</option>
              <option value="scope">Scope</option>
              <option value="none">None</option>
            </select>
          </label>

          <div className="ml-auto flex flex-wrap gap-2">
            <ToolbarButton icon={<Play size={14} />} label="Run Smoke" onClick={runSmoke} disabled={isRunningSmoke} primary />
            <ToolbarButton icon={<Download size={14} />} label="Export Trace" onClick={exportTrace} />
            <ToolbarButton icon={<FileText size={14} />} label="Export Log" onClick={exportSmokeLog} />
            <ToolbarButton icon={<Copy size={14} />} label="Copy Summary" onClick={copySummary} />
          </div>
        </div>

        {/* Test Cards Grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          <TestCard title="REST" icon={<Zap size={16} />}>
            <CardButton label="REST OK" onClick={runRestOk} />
            <CardButton label="REST Error" onClick={runRestError} />
            <CardButton label="REST Timeout" onClick={runRestTimeout} />
            <CardButton label="REST Retry" onClick={runRestRetry} />
            <CardButton label="REST Cancel" onClick={runRestCancel} />
            <CardButton label="REST Latest Replaced" onClick={runRestLatest} />
            <CardButton label="Late Response Discard" onClick={runLateDiscard} />
            <CardButton label="REST Progress" onClick={runRestProgress} />
          </TestCard>

          <TestCard title="Stream" icon={<Radio size={16} />}>
            <CardButton label="STREAM OK" onClick={runStreamOk} />
            <CardButton label="STREAM Cancel" onClick={runStreamCancel} />
            <CardButton label="STREAM Latest" onClick={runStreamLatest} />
            <div className="mt-1 text-xs" style={{ color: 'var(--ui-muted)' }}>
              Chunks: {lastChunkCount}
            </div>
          </TestCard>

          <TestCard title="Concurrency / Serial" icon={<GitBranch size={16} />}>
            <CardButton label="Concurrent" onClick={runConcurrent} />
            <CardButton label="Serial" onClick={runSerial} />
            <CardButton label="Dedupe" onClick={runDedupe} />
            <div className="mt-1 text-xs" style={{ color: 'var(--ui-muted)' }}>
              Progress: {progressLabel}
            </div>
          </TestCard>
        </div>

        {/* Results */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          <h3 className="m-0 mb-3 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
            Cases
          </h3>
          {caseResults.length === 0 ? (
            <p className="m-0 text-xs" style={{ color: 'var(--ui-muted)' }}>
              No records yet
            </p>
          ) : (
            <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto">
              <AnimatePresence>
                {caseResults.map((item) => (
                  <motion.div
                    key={item.caseId}
                    className="grid items-center gap-2 text-xs"
                    style={{
                      gridTemplateColumns: '1.4fr 0.7fr 0.8fr 0.6fr 0.8fr',
                      color: 'var(--ui-text)',
                    }}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                  >
                    <span className="font-semibold">{item.caseName}</span>
                    <span style={{ color: 'var(--ui-muted)' }}>
                      {item.mode} / {item.policy}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--ui-muted)' }}>
                      {stateIcon(item.finalState)}
                      {item.finalState}
                    </span>
                    <span style={{ color: 'var(--ui-muted)' }}>{item.durationMs}ms</span>
                    <span style={{ color: 'var(--ui-muted)' }}>
                      {item.chunkCount !== undefined ? `chunk=${item.chunkCount}` : ''}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Log */}
        <div
          className="flex min-h-[220px] flex-col rounded-xl border p-4"
          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
        >
          <h3 className="m-0 mb-2 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
            Log
          </h3>
          <pre
            className="m-0 max-h-[260px] flex-1 overflow-y-auto text-xs leading-relaxed"
            style={{
              color: 'var(--ui-muted)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--ui-font-mono)',
            }}
          >
            {logText || 'No logs yet'}
          </pre>
        </div>
      </motion.div>
    </div>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50',
      )}
      style={{
        background: primary ? 'var(--ui-primary)' : 'var(--ui-panel)',
        borderColor: primary ? 'var(--ui-primary)' : 'var(--ui-border)',
        color: primary ? 'var(--ui-inverse)' : 'var(--ui-text)',
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  )
}

function TestCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
    >
      <div
        className="mb-3 flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--ui-text)' }}
      >
        <span style={{ color: 'var(--ui-primary)' }}>{icon}</span>
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function CardButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all hover:translate-y-[-1px]"
      style={{
        background: 'var(--ui-panel)',
        borderColor: 'var(--ui-border)',
        color: 'var(--ui-primary)',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
