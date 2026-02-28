import { useCallback, useMemo, useRef, useState } from 'react'
import type { VnEngineRuntime } from '../hooks/useVnEngine'
import { moyinDb } from '@/db/moyinDb'
import { usePackRegistryStore } from '@/stores/usePackRegistryStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QaResult {
  id: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  reason?: string
  details?: Record<string, unknown>
}

interface DbStats {
  commitCount: number
  snapshotCount: number
  headRevision: number | null
  headCommitId: string | null
  lastCommitDeltaKeys: string[]
}

interface QaPanelProps {
  runtime: VnEngineRuntime
  dialogueCastIds: string[]
  playerId: string
  commandOpen: boolean
  backlogOpen: boolean
  openCommand: () => void
  setCommandOpen: (value: boolean) => void
  setBacklogOpen: (value: boolean) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QaPanel({
  runtime,
  dialogueCastIds,
  playerId,
  commandOpen,
  backlogOpen,
  openCommand,
  setCommandOpen,
  setBacklogOpen,
}: QaPanelProps) {
  const [qaResults, setQaResults] = useState<QaResult[]>([])
  const [qaRunning, setQaRunning] = useState(false)
  const [qaDbStats, setQaDbStats] = useState<DbStats>({
    commitCount: 0,
    snapshotCount: 0,
    headRevision: null,
    headCommitId: null,
    lastCommitDeltaKeys: [],
  })

  // We use a ref for the pack payload so it persists across QA runs
  const qaPackRef = useRef<unknown>(null)
  // Ref to access latest runtime values inside async callbacks without stale closures
  const runtimeRef = useRef(runtime)
  runtimeRef.current = runtime

  const qaSummary = useMemo(() => {
    const summary = { pass: 0, fail: 0, skip: 0 }
    qaResults.forEach((result) => {
      if (result.status === 'PASS') summary.pass += 1
      else if (result.status === 'FAIL') summary.fail += 1
      else summary.skip += 1
    })
    return summary
  }, [qaResults])

  // ---------------------------------------------------------------------------
  // DB helpers
  // ---------------------------------------------------------------------------

  const clearDb = useCallback(async () => {
    if (!moyinDb?.sessions) return
    await moyinDb.transaction(
      'rw',
      moyinDb.sessions,
      moyinDb.turns,
      moyinDb.commits,
      moyinDb.endingUnlocks,
      moyinDb.snapshots,
      async () => {
        await Promise.all([
          moyinDb.sessions.clear(),
          moyinDb.turns.clear(),
          moyinDb.commits.clear(),
          moyinDb.endingUnlocks.clear(),
          moyinDb.snapshots.clear(),
        ])
      },
    )
  }, [])

  const getDbStats = useCallback(async (sessionId?: string | null): Promise<DbStats> => {
    if (!sessionId) {
      return { commitCount: 0, snapshotCount: 0, headRevision: null, headCommitId: null, lastCommitDeltaKeys: [] }
    }
    const [session, commits] = await Promise.all([
      moyinDb.sessions.get(sessionId),
      moyinDb.commits.where('sessionId').equals(sessionId).sortBy('revisionTo'),
    ])
    const lastCommit = commits[commits.length - 1]
    const deltaKeys = lastCommit?.delta ? Object.keys(lastCommit.delta) : []
    const snapshotCount = await moyinDb.snapshots
      .where('sessionId')
      .equals(sessionId)
      .count()
    return {
      commitCount: commits.length,
      snapshotCount,
      headRevision: session?.headRevision ?? null,
      headCommitId: session?.headCommitId ?? null,
      lastCommitDeltaKeys: deltaKeys,
    }
  }, [])

  // ---------------------------------------------------------------------------
  // QA lifecycle helpers
  // ---------------------------------------------------------------------------

  const logQaResult = useCallback((result: QaResult, resultsAccum: QaResult[]) => {
    resultsAccum.push(result)
    setQaResults([...resultsAccum])
    console.info(`[QA] ${result.id} ${result.status}`, result.details || result.reason || '')
  }, [])

  const resetQa = useCallback(
    async (clearResults = true) => {
      if (clearResults) setQaResults([])
      setCommandOpen(false)
      setBacklogOpen(false)
      runtimeRef.current.reset()
      await clearDb()
      setQaDbStats({ commitCount: 0, snapshotCount: 0, headRevision: null, headCommitId: null, lastCommitDeltaKeys: [] })
    },
    [setCommandOpen, setBacklogOpen, clearDb],
  )

  /**
   * Wait until engine phase is no longer 'busy'.
   * Returns true if idle was reached, false on timeout.
   */
  const awaitIdle = useCallback(async (timeout = 3000) => {
    const start = Date.now()
    while (runtimeRef.current.phase === 'busy') {
      if (Date.now() - start > timeout) return false
      await wait(50)
    }
    return true
  }, [])

  /**
   * Advance frames via next() until phase is no longer 'playing'.
   */
  const advanceToStop = useCallback(async (limit = 200) => {
    let guard = limit
    while (runtimeRef.current.phase === 'playing' && guard > 0) {
      runtimeRef.current.next()
      guard -= 1
      await wait(0)
    }
    return runtimeRef.current.phase
  }, [])

  /**
   * Load the pack payload for QA from the runtime or the pack registry.
   */
  const loadPackPayload = useCallback(async (): Promise<unknown> => {
    const packRegistry = usePackRegistryStore.getState()
    const packs = packRegistry.listPacks()
    const storyKey = (runtimeRef.current.sessionMeta?.storyKey as string) || undefined
    const pack = packs.find((p) => (storyKey ? p.storyKey === storyKey : true))
    if (pack) return pack.payload
    throw new Error('[QA] No story loaded/found. Please import via Workshop.')
  }, [])

  /**
   * Initialize a fresh QA session from the pack.
   */
  const qaStart = useCallback(async () => {
    if (!qaPackRef.current) {
      qaPackRef.current = runtimeRef.current.packPayload || (await loadPackPayload())
    }
    await runtimeRef.current.startSessionFromPack(qaPackRef.current)
    await awaitIdle()
  }, [awaitIdle, loadPackPayload])

  /**
   * Run a single test case with error boundary.
   */
  const runTestCase = useCallback(
    async (
      id: string,
      fn: () => Promise<{ status: 'PASS' | 'FAIL' | 'SKIP'; reason?: string; details?: Record<string, unknown> }>,
      resultsAccum: QaResult[],
    ) => {
      try {
        const result = await fn()
        logQaResult({ id, ...result }, resultsAccum)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unhandled error'
        logQaResult({ id, status: 'FAIL', reason: message }, resultsAccum)
      }
    },
    [logQaResult],
  )

  // ---------------------------------------------------------------------------
  // QA Suite
  // ---------------------------------------------------------------------------

  const runQaSuite = useCallback(async () => {
    if (qaRunning) return
    setQaRunning(true)
    setQaResults([])
    const resultsAccum: QaResult[] = []

    const startedAt = new Date().toISOString()
    const capabilities = {
      db: Boolean(moyinDb?.sessions),
      resume: typeof runtimeRef.current.restoreSessionFromPack === 'function',
    }

    try {
      // =====================================================================
      // TC01 - Fresh start: verify entry scene, phase, UI state, char select
      // =====================================================================
      await runTestCase('TC01', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()
        openCommand()
        setBacklogOpen(true)
        await wait(0)

        const rt = runtimeRef.current
        const charSelectEl = document.querySelector('[data-testid="vn-char-select"]')
        const sceneId = rt.activeSceneId
        const pack = qaPackRef.current as Record<string, unknown> | null
        const opening = pack?.opening as Record<string, unknown> | undefined
        const lore = pack?.lore as Record<string, unknown> | undefined
        const loreOpening = lore?.opening as Record<string, unknown> | undefined
        const chapters = pack?.chapters as Array<Record<string, unknown>> | undefined
        const entry =
          (opening?.initialSceneId as string) ||
          (loreOpening?.introSceneId as string) ||
          (chapters?.[0]?.entrySceneId as string) ||
          'sc_open'
        const containsP1 = dialogueCastIds.includes(playerId)
        const details = {
          sceneId,
          phase: rt.phase,
          charSelectCount: dialogueCastIds.length,
          containsP1,
          commandOpen,
          backlogOpen,
          charSelectVisible: Boolean(charSelectEl),
        }
        const ok =
          rt.phase !== 'ended' &&
          sceneId === entry &&
          commandOpen &&
          backlogOpen &&
          Boolean(charSelectEl) &&
          !containsP1
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'UI/entry check failed', details }
      }, resultsAccum)

      // =====================================================================
      // TC02 - Talk in opening scene should NOT advance or create commits
      // =====================================================================
      await runTestCase('TC02', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        const rt = runtimeRef.current
        const statsBefore = await getDbStats(rt.sessionId)
        const sceneBefore = rt.activeSceneId
        await rt.submitTalk('\u6e2c\u8a66\u8f38\u5165')
        await awaitIdle()

        const rtAfter = runtimeRef.current
        const statsAfter = await getDbStats(rtAfter.sessionId)
        const delta = statsAfter.commitCount - statsBefore.commitCount
        const details = {
          sceneId: rtAfter.activeSceneId,
          commitCountDelta: delta,
          lastCommitDeltaKeys: statsAfter.lastCommitDeltaKeys,
        }
        const ok = delta === 0 && rtAfter.activeSceneId === sceneBefore && !rtAfter.endingId
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'Talk should not advance sc_open', details }
      }, resultsAccum)

      // =====================================================================
      // TC03 - Xiaomei good ending path
      // =====================================================================
      await runTestCase('TC03', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }

        const beforeStats = await getDbStats(rt.sessionId)
        rt.choose('sc_open', 'opt_go_xiaomei')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase === 'await_input') {
          await rt.submitTalk('\u60f3\u548c\u4f60\u804a\u804a\u3002')
          await awaitIdle()
          await advanceToStop()
          rt = runtimeRef.current
        }
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'xiaomei choice not ready' }
        }
        rt.choose('sc_xiaomei_main', 'opt_xiaomei_lock')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const statsAfter = await getDbStats(rt.sessionId)
        const endingId = rt.endingId
        const commitsAdded = statsAfter.commitCount - beforeStats.commitCount
        const snapshotCount = statsAfter.snapshotCount
        const snapshotStatus = snapshotCount > 0 ? 'OK' : 'SKIP'
        const details = {
          endingId,
          terminalSceneId: rt.activeSceneId,
          commitsAdded,
          snapshotCount,
          snapshotStatus,
        }
        const ok = endingId === 'end_good_xiaomei' && rt.phase === 'ended'
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'ending mismatch', details }
      }, resultsAccum)

      // =====================================================================
      // TC04 - Xiaomei bad ending path
      // =====================================================================
      await runTestCase('TC04', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }
        rt.choose('sc_open', 'opt_go_xiaomei')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase === 'await_input') {
          await rt.submitTalk('\u5c0d\u4e0d\u8d77\u3002')
          await awaitIdle()
          await advanceToStop()
          rt = runtimeRef.current
        }
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'xiaomei choice not ready' }
        }
        rt.choose('sc_xiaomei_main', 'opt_xiaomei_bad')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const details = { endingId: rt.endingId }
        const ok = rt.endingId === 'end_bad_xiaomei' && rt.phase === 'ended'
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'ending mismatch', details }
      }, resultsAccum)

      // =====================================================================
      // TC05 - Lizi good ending path
      // =====================================================================
      await runTestCase('TC05', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }
        rt.choose('sc_open', 'opt_go_lizi')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase === 'await_input') {
          await rt.submitTalk('\u6211\u4f86\u4e86\u3002')
          await awaitIdle()
          await advanceToStop()
          rt = runtimeRef.current
        }
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'lizi choice not ready' }
        }
        rt.choose('sc_lizi_main', 'opt_lizi_lock')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const details = { endingId: rt.endingId }
        const ok = rt.endingId === 'end_good_lizi' && rt.phase === 'ended'
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'ending mismatch', details }
      }, resultsAccum)

      // =====================================================================
      // TC06 - Harem (true) ending path via crossroads
      // =====================================================================
      await runTestCase('TC06', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }
        rt.choose('sc_open', 'opt_go_xiaomei')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase === 'await_input') {
          await rt.submitTalk('\u6211\u5011\u90fd\u9700\u8981\u6642\u9593\u3002')
          await awaitIdle()
          await advanceToStop()
          rt = runtimeRef.current
        }
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'xiaomei choice not ready' }
        }
        rt.choose('sc_xiaomei_main', 'opt_xiaomei_dual')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase === 'await_input') {
          await rt.submitTalk('\u4e00\u8d77\u9762\u5c0d\u5427\u3002')
          await awaitIdle()
          await advanceToStop()
          rt = runtimeRef.current
        }
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'crossroads choice not ready' }
        }
        rt.choose('sc_crossroads', 'opt_to_harem')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const details = {
          endingId: rt.endingId,
          hasFlag_harem_path: rt.flagsSet.has('harem_path'),
        }
        const ok =
          rt.endingId === 'end_true_harem' &&
          rt.phase === 'ended' &&
          rt.flagsSet.has('harem_path')
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'ending mismatch', details }
      }, resultsAccum)

      // =====================================================================
      // TC07 - Talk produces relationship delta commit
      // =====================================================================
      await runTestCase('TC07', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }
        rt.choose('sc_open', 'opt_go_xiaomei')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        if (rt.phase !== 'await_input') {
          return { status: 'FAIL', reason: 'talk not available' }
        }
        await rt.submitTalk('\u4f60\u9084\u597d\u55ce\uff1f')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const sessionId = rt.sessionId
        if (!sessionId) return { status: 'SKIP', reason: 'no session' }

        const commits = await moyinDb.commits
          .where('sessionId')
          .equals(sessionId)
          .sortBy('revisionTo')
        const lastCommit = commits[commits.length - 1]
        const turn = lastCommit?.turnId
          ? await moyinDb.turns.get(lastCommit.turnId)
          : null
        const delta = (lastCommit?.delta || {}) as Record<string, unknown>
        const deltaKeys = Object.keys(delta)
        const onlyRelationship = deltaKeys.length === 1 && deltaKeys[0] === 'relationshipDelta'
        const relDelta = (delta.relationshipDelta || []) as Array<Record<string, unknown>>
        const relValue =
          (relDelta.find((item) => item?.fromWho) as Record<string, unknown> | undefined)?.delta ?? 0
        const details = { lastCommitDeltaKeys: deltaKeys, relDeltaValue: relValue }
        const ok =
          turn?.inputType === 'talk' && onlyRelationship && relDelta.length > 0
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'talk delta invalid', details }
      }, resultsAccum)

      // =====================================================================
      // TC08 - Session restore (resume) after reset
      // =====================================================================
      await runTestCase('TC08', async () => {
        await resetQa(false)
        await qaStart()
        await advanceToStop()

        let rt = runtimeRef.current
        if (rt.phase !== 'await_choice') {
          return { status: 'FAIL', reason: 'sc_open choice not ready' }
        }
        rt.choose('sc_open', 'opt_go_xiaomei')
        await awaitIdle()
        await advanceToStop()

        rt = runtimeRef.current
        const beforeStats = await getDbStats(rt.sessionId)
        const beforeSceneId = rt.activeSceneId

        rt.reset()
        const restored = await runtimeRef.current.restoreSessionFromPack(qaPackRef.current)
        if (!restored) return { status: 'SKIP', reason: 'restore not available' }

        rt = runtimeRef.current
        const afterStats = await getDbStats(rt.sessionId)
        const details = {
          beforeSceneId,
          afterSceneId: rt.activeSceneId,
          beforeRev: beforeStats.headRevision,
          afterRev: afterStats.headRevision,
        }
        const ok =
          beforeSceneId === rt.activeSceneId &&
          beforeStats.headRevision === afterStats.headRevision
        return ok ? { status: 'PASS', details } : { status: 'FAIL', reason: 'resume mismatch', details }
      }, resultsAccum)

      // =====================================================================
      // Finalize
      // =====================================================================

      const finalStats = await getDbStats(runtimeRef.current.sessionId)
      setQaDbStats(finalStats)

      const summary = {
        pass: resultsAccum.filter((r) => r.status === 'PASS').length,
        fail: resultsAccum.filter((r) => r.status === 'FAIL').length,
        skip: resultsAccum.filter((r) => r.status === 'SKIP').length,
      }
      const output = {
        suite: 'VN_STAGE_MOCK_QA',
        startedAt,
        capabilities,
        results: resultsAccum,
        summary,
      }
      console.log(JSON.stringify(output, null, 2))
    } finally {
      setQaRunning(false)
    }
  }, [
    qaRunning,
    resetQa,
    qaStart,
    advanceToStop,
    awaitIdle,
    getDbStats,
    runTestCase,
    openCommand,
    setBacklogOpen,
    dialogueCastIds,
    playerId,
    commandOpen,
    backlogOpen,
  ])

  // ---------------------------------------------------------------------------
  // Status badge color
  // ---------------------------------------------------------------------------

  const statusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'text-green-300'
      case 'fail':
        return 'text-red-300'
      case 'skip':
        return 'text-yellow-200'
      default:
        return ''
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section
      className="absolute bottom-6 left-6 z-50 flex w-[360px] flex-col gap-2 rounded-xl border border-white/15 bg-black/65 p-3 text-xs text-white"
      data-testid="qa-panel"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <strong>QA Runner</strong>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
            disabled={qaRunning}
            onClick={runQaSuite}
          >
            Run QA Suite
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
            disabled={qaRunning}
            onClick={() => resetQa()}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span>storyKey: {String(runtime.sessionMeta?.storyKey || '-')}</span>
        <span>scene: {runtime.activeSceneId || '-'}</span>
        <span>phase: {runtime.phase}</span>
        <span>ending: {runtime.endingId || '-'}</span>
        <span>target: {runtime.targetCharId || '-'}</span>
      </div>

      {/* DB Stats */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        <span>commits: {qaDbStats.commitCount}</span>
        <span>snapshots: {qaDbStats.snapshotCount}</span>
        <span>headRev: {qaDbStats.headRevision ?? '-'}</span>
      </div>

      {/* Summary */}
      <div className="font-bold tracking-wide">
        PASS {qaSummary.pass} / FAIL {qaSummary.fail} / SKIP {qaSummary.skip}
      </div>

      {/* Results */}
      <div className="flex max-h-[140px] flex-col gap-1 overflow-auto">
        {qaResults.map((result) => (
          <div key={result.id} className="grid grid-cols-[48px_52px_1fr] items-center gap-1.5">
            <span>{result.id}</span>
            <span className={statusColorClass(result.status)}>{result.status}</span>
            <span className="truncate text-white/70">{result.reason || ''}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
