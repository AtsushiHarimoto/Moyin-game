/**
 * useVnEngine - Hook bridging @moyin/vn-engine with React state.
 * Implements the core game loop: submitTalk → LLM → frames → display.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BacklogItem,
  CharacterState,
  Frame,
  TurnResult,
} from '@moyin/vn-engine'
import {
  createSessionFromPack as dbCreateSession,
  appendTurnCommit,
  saveGame,
  loadGameFork,
  listSaveSlots,
  deleteSaveSlot as dbDeleteSlot,
  renameSaveSlot as dbRenameSaveSlot,
  unlockEndingIfNeeded,
  getSessionById,
  getLatestSessionByStoryKey,
  listSnapshotsBySessionId,
  getSaveSlot,
  getTurnsBySessionId,
  getCommitsBySessionId,
} from '@moyin/vn-engine'
import { IS_MOCK_VN_STAGE } from '@/config/env'
import type {
  ChoiceView,
  SaveSlotRow,
  StageFrame,
  VnMode,
  VnPhase,
} from '../store'
import {
  buildSystemPrompt,
  buildHistorySummary,
  callGatewayTurn,
  applyProposals,
  normalizeStageHintPortraits,
  extractPackManifest,
  detectEndingFromEventSignals,
  resolveChoiceView,
  buildStageViewFromScene,
} from './gameLoopHelpers'
import { ResourceManager } from '../runtime/ResourceManager'
import { SceneManager } from '../runtime/SceneManager'

export interface VnEngineRuntime {
  // --- Reactive state ---
  phase: VnPhase
  mode: VnMode
  sessionId: string | null
  activeSceneId: string | null
  activeChapterId: string | null
  endingId: string | null
  targetCharId: string | null
  playerId: string
  isHydrating: boolean
  isDirty: boolean

  stageView: StageFrame | null
  choiceView: ChoiceView | null
  currentFrame: Frame | null
  frameQueue: Frame[]
  playheadIndex: number
  turnCountWithinScene: number

  backlogItems: BacklogItem[]
  saveSlots: SaveSlotRow[]

  charactersById: Record<string, CharacterState>
  assetsBaseUrl: string
  assetUrlByKey: (key?: string) => string

  flagsSet: Set<string>
  eventsDone: Set<string>
  sessionMeta: Record<string, unknown>
  llmConversationId: string | null
  llmResponseId: string | null
  currentLaneKey: string | null
  relationship: Record<string, number | Record<string, number> | { value: number }>
  packPayload: unknown

  excludePlayerFromActiveCastUI: boolean

  // --- Actions ---
  next: () => { status: string; code?: string }
  selectChar: (id: string | null) => void
  choose: (choiceId: string, optionId: string) => Promise<void>
  submitTalk: (text: string) => Promise<TurnResult | Record<string, unknown>>
  submitAction: (chipId: string) => Promise<TurnResult | Record<string, unknown>>
  reset: () => void

  startSessionFromPack: (pack: unknown) => Promise<void>
  restoreSessionFromPack: (pack: unknown, sessionId?: string) => Promise<boolean>
  startReplayFromSlot: (pack: unknown, slotId: string, revision?: number) => Promise<void>
  startReplayFromSession: (pack: unknown, sessionId: string, revision?: number) => Promise<void>

  loadSlot: (slotId: string) => Promise<void>
  saveSlot: (title?: string) => Promise<void>
  deleteSlot: (slotId: string) => Promise<void>
  renameSlot: (slotId: string, newTitle: string) => Promise<void>
  refreshSaveSlots: () => void

  getTraceEvents?: () => unknown[]
}

type LlmCursorState = {
  conversationId: string | null
  responseId: string | null
  laneKey: string | null
}

type LaneCursor = {
  conversationId: string | null
  responseId: string | null
}

function toNonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveLatestLlmCursor(
  turns: Array<Record<string, unknown>>,
  fallbackConversationId: string | null = null,
): LlmCursorState {
  let conversationId = fallbackConversationId
  let responseId: string | null = null
  let laneKey: string | null = null

  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]
    const turnConversationId =
      typeof turn.llmConversationId === 'string' && turn.llmConversationId.trim().length > 0
        ? turn.llmConversationId
        : null
    const turnResponseId =
      typeof turn.llmResponseId === 'string' && turn.llmResponseId.trim().length > 0
        ? turn.llmResponseId
        : null
    const turnLaneKey =
      typeof turn.laneKey === 'string' && turn.laneKey.trim().length > 0
        ? turn.laneKey
        : null

    if (!conversationId && turnConversationId) conversationId = turnConversationId
    if (!responseId && turnResponseId) responseId = turnResponseId
    if (!laneKey && turnLaneKey) laneKey = turnLaneKey

    if (conversationId && responseId && laneKey) break
  }

  return { conversationId, responseId, laneKey }
}

function buildLaneCursorMap(
  session: Record<string, unknown> | null | undefined,
  turns: Array<Record<string, unknown>>,
): Record<string, LaneCursor> {
  const laneMap: Record<string, LaneCursor> = {}

  const lanesFromSession = session?.conversationLanes
  if (lanesFromSession && typeof lanesFromSession === 'object') {
    for (const [key, value] of Object.entries(lanesFromSession as Record<string, unknown>)) {
      if (!key) continue
      const lane = value as { conversationId?: string | null }
      laneMap[key] = {
        conversationId: toNonEmpty(lane?.conversationId),
        responseId: null,
      }
    }
  }

  for (const turn of turns) {
    const laneKey = toNonEmpty(turn.laneKey)
    if (!laneKey) continue
    const conversationId = toNonEmpty(turn.llmConversationId)
    const responseId = toNonEmpty(turn.llmResponseId)
    const prev = laneMap[laneKey] ?? { conversationId: null, responseId: null }
    laneMap[laneKey] = {
      conversationId: conversationId ?? prev.conversationId,
      responseId: responseId ?? prev.responseId,
    }
  }

  if (!Object.keys(laneMap).length) {
    const fallbackConversationId = toNonEmpty(session?.llmConversationId)
    if (fallbackConversationId) {
      laneMap.default = {
        conversationId: fallbackConversationId,
        responseId: null,
      }
    }
  }

  return laneMap
}

export function useVnEngine(): VnEngineRuntime {
  const [phase, setPhase] = useState<VnPhase>('playing')
  const [mode, setMode] = useState<VnMode>('play')
  const [sessionId, setSessionId] = useState<string | null>(
    IS_MOCK_VN_STAGE ? 'mock-session-001' : null,
  )
  const [activeSceneId, setActiveSceneId] = useState<string | null>(
    IS_MOCK_VN_STAGE ? 'mock-scene-001' : null,
  )
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [targetCharId, setTargetCharId] = useState<string | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [stageView, setStageView] = useState<StageFrame | null>(
    IS_MOCK_VN_STAGE
      ? { bgUrl: '/img/school.png', characters: [] }
      : null,
  )
  const [choiceView, setChoiceView] = useState<ChoiceView | null>(null)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(
    IS_MOCK_VN_STAGE
      ? { id: 'sc_prologue_001', speaker: '旁白', text: '櫻花樹下', canNext: true }
      : null,
  )
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([])
  const [saveSlots, setSaveSlots] = useState<SaveSlotRow[]>([])
  const [charactersById, setCharactersById] = useState<Record<string, CharacterState>>(
    IS_MOCK_VN_STAGE
      ? {
          narrator: { charId: 'narrator', displayName: '旁白', assets: { portraits: {} } },
          c_sakura: { charId: 'c_sakura', displayName: '小櫻', assets: { portraits: { default: '/img/girl.png' } } },
        }
      : {},
  )
  const [flagsSet, setFlagsSet] = useState<Set<string>>(new Set())
  const [eventsDone, setEventsDone] = useState<Set<string>>(new Set())
  const [sessionMeta, setSessionMeta] = useState<Record<string, unknown>>({})
  const [packPayload, setPackPayload] = useState<unknown>(null)
  const [frameQueue, setFrameQueue] = useState<Frame[]>([])
  const [llmConversationId, setLlmConversationId] = useState<string | null>(null)
  const [llmResponseId, setLlmResponseId] = useState<string | null>(null)
  const [relationship, setRelationship] = useState<
    Record<string, number | Record<string, number> | { value: number }>
  >({})
  const [turnCountWithinScene, setTurnCountWithinScene] = useState(0)
  const [replaySteps, setReplaySteps] = useState<Array<{ turn: Record<string, unknown>; commit: Record<string, unknown> | null }>>([])
  const [replayIndex, setReplayIndex] = useState(0)
  const [currentLaneKey, setCurrentLaneKey] = useState<string | null>(null)
  const [laneCursorByKey, setLaneCursorByKey] = useState<Record<string, LaneCursor>>({})

  // Refs for stable access in callbacks without re-creating them
  const backlogRef = useRef(backlogItems)
  backlogRef.current = backlogItems
  const frameQueueRef = useRef(frameQueue)
  frameQueueRef.current = frameQueue
  const isSubmittingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const submitRequestSeqRef = useRef(0)
  // Refs for next() — avoid excessive dependency recreation
  const modeRef = useRef(mode)
  modeRef.current = mode
  const replayStepsRef = useRef(replaySteps)
  replayStepsRef.current = replaySteps
  const replayIndexRef = useRef(replayIndex)
  replayIndexRef.current = replayIndex
  const endingIdRef = useRef(endingId)
  endingIdRef.current = endingId
  const packPayloadRef = useRef(packPayload)
  packPayloadRef.current = packPayload
  const activeSceneIdRef = useRef(activeSceneId)
  activeSceneIdRef.current = activeSceneId
  const flagsSetRef = useRef(flagsSet)
  flagsSetRef.current = flagsSet
  const choiceViewRef = useRef(choiceView)
  choiceViewRef.current = choiceView
  const stageViewRef = useRef(stageView)
  stageViewRef.current = stageView
  const stageResourceManagerRef = useRef<ResourceManager | null>(null)
  const stageSceneManagerRef = useRef<SceneManager | null>(null)

  if (!stageResourceManagerRef.current) {
    stageResourceManagerRef.current = new ResourceManager()
  }
  if (!stageSceneManagerRef.current) {
    stageSceneManagerRef.current = new SceneManager()
  }

  useEffect(() => {
    if (!stageView) return
    const resourceManager = stageResourceManagerRef.current
    const sceneManager = stageSceneManagerRef.current
    if (!resourceManager || !sceneManager) return

    sceneManager
      .loadScene({
        stageView,
        resourceManager,
      })
      .catch((error) => {
        console.warn('[VnEngine] Stage resource preload failed:', error)
      })
  }, [stageView])

  const playerId = 'player'
  // V1 parity: assetsBaseUrl from pack manifest (vnSessionManager.ts:721)
  const assetsBaseUrlRef = useRef('')
  const assetsByKeyRef = useRef<Record<string, { path?: string; url?: string }>>({})

  const syncAssetResolverFromPayload = useCallback((payload: Record<string, unknown> | null) => {
    const assets = (payload?.assets as Record<string, unknown> | undefined) ?? undefined
    const baseFromPayload = (payload?.assetsBaseUrl as string)
      || (assets?.baseUrl as string)
      || ''
    assetsBaseUrlRef.current = baseFromPayload.replace(/\/$/, '')

    const nextMap: Record<string, { path?: string; url?: string }> = {}
    const items = Array.isArray(assets?.items) ? (assets.items as Array<Record<string, unknown>>) : []
    for (const item of items) {
      const assetKey = typeof item.assetKey === 'string' ? item.assetKey.trim() : ''
      if (!assetKey) continue
      nextMap[assetKey] = {
        path: typeof item.path === 'string' ? item.path : undefined,
        url: typeof item.url === 'string' ? item.url : undefined,
      }
    }
    assetsByKeyRef.current = nextMap
  }, [])

  const assetUrlByKey = useCallback((key?: string) => {
    if (!key) return ''
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('data:') || key.startsWith('/')) {
      return key
    }

    const mapped = assetsByKeyRef.current[key]
    if (mapped) {
      const raw = (typeof mapped.path === 'string' && mapped.path) || (typeof mapped.url === 'string' && mapped.url) || ''
      if (!raw) return ''
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
        return raw
      }
      const base = assetsBaseUrlRef.current
      const rel = raw.replace(/^\//, '')
      return base ? `${base}/${rel}` : raw
    }

    // Keep plain relative file paths, but treat unresolved keys as empty to match V1 behavior.
    const looksLikePath = key.includes('/') || /\.[a-zA-Z0-9]{2,6}($|\?)/.test(key)
    if (!looksLikePath) return ''

    const base = assetsBaseUrlRef.current
    const rel = key.replace(/^\//, '')
    return base ? `${base}/${rel}` : key
  }, [])

  const resolveAssetReference = useCallback((reference?: string) => {
    if (!reference) return ''
    return assetUrlByKey(reference)
  }, [assetUrlByKey])

  const updateLaneCursor = useCallback(
    (laneKey: string, conversationId?: string | null, responseId?: string | null) => {
      if (!laneKey) return
      setLaneCursorByKey((prev) => {
        const current = prev[laneKey] ?? { conversationId: null, responseId: null }
        const nextConversationId = conversationId ?? current.conversationId
        const nextResponseId = responseId ?? current.responseId
        if (
          current.conversationId === nextConversationId &&
          current.responseId === nextResponseId
        ) {
          return prev
        }
        return {
          ...prev,
          [laneKey]: {
            conversationId: nextConversationId,
            responseId: nextResponseId,
          },
        }
      })
    },
    [],
  )

  const next = useCallback(() => {
    // ═══ REPLAY MODE: two-level advancement (intra-turn + inter-turn) ═══
    if (modeRef.current === 'replay') {
      const queue = frameQueueRef.current
      const steps = replayStepsRef.current
      const idx = replayIndexRef.current

      const loadReplayStep = (stepIdx: number): boolean => {
        if (stepIdx < 0 || stepIdx >= steps.length) return false
        const step = steps[stepIdx]
        const turnData = step.turn as Record<string, unknown>
        const hasOutput = turnData.output && typeof turnData.output === 'object'
        const turnOutput = hasOutput
          ? (turnData.output as Record<string, unknown>)
          : turnData
        const stepFrames: Frame[] = (turnOutput.frames as Frame[]) || []

        // Apply stageView if present (V1 parity: vnReplayEngine.ts:80-98)
        const stepStageView = turnOutput.stageView as StageFrame | undefined
        if (stepStageView) setStageView(stepStageView)

        // Apply choiceView if present (V1 parity: vnReplayEngine.ts:100)
        setChoiceView((turnOutput.choiceView as ChoiceView) ?? null)

        setReplayIndex(stepIdx)
        if (stepFrames.length > 0) {
          setCurrentFrame(stepFrames[0])
          setFrameQueue(stepFrames.slice(1))
          setPhase('playing')
        }
        return true
      }

      const finishReplay = () => {
        const lastStep = steps[steps.length - 1]
        if (lastStep) {
          const lastTurn = lastStep.turn as Record<string, unknown>
          const hasOutput = lastTurn.output && typeof lastTurn.output === 'object'
          const lastEndingId = hasOutput
            ? ((lastTurn.output as Record<string, unknown>).endingId as string)
            : (lastTurn.endingId as string)
          if (lastEndingId) setEndingId(lastEndingId)
        }
        setPhase('ended')
      }

      // Intra-turn: advance within current turn's frames
      if (queue.length > 0) {
        const [nextFrame, ...rest] = queue
        setCurrentFrame(nextFrame)
        setFrameQueue(rest)
        if (rest.length === 0) {
          // Current turn exhausted → try next turn
          if (!loadReplayStep(idx + 1)) finishReplay()
        }
        return { status: 'ok' }
      }
      // No frames, try next step
      if (!loadReplayStep(idx + 1)) finishReplay()
      return { status: 'ok', code: steps.length ? 'replay_step' : 'replay_ended' }
    }

    // ═══ PLAY MODE ═══
    const resolvePhaseAfterFrames = () => {
      if (endingIdRef.current) { setPhase('ended'); return }
      // Check if choiceView was already set (by submitTalk/submitAction)
      if (choiceViewRef.current) { setPhase('await_choice'); return }
      // Try to resolve choice view from pack scene
      const choice = resolveChoiceView(
        packPayloadRef.current, activeSceneIdRef.current, flagsSetRef.current,
      )
      if (choice) {
        setChoiceView(choice)
        setPhase('await_choice')
        return
      }
      setPhase('await_input')
    }

    const queue = frameQueueRef.current
    if (queue.length > 0) {
      const [nextFrame, ...rest] = queue
      setCurrentFrame(nextFrame)
      setFrameQueue(rest)
      if (rest.length === 0) {
        resolvePhaseAfterFrames()
      }
      return { status: 'ok' }
    }
    resolvePhaseAfterFrames()
    return { status: 'ok', code: 'queue_empty' }
  }, [])

  const selectChar = useCallback((id: string | null) => {
    setTargetCharId(id)
  }, [])

  const choose = useCallback(async (choiceId: string, optionId: string) => {
    if (!choiceView) return
    if (!activeSceneId) return
    if (!sessionId) return

    const pack = packPayload as {
      scenes?: Array<{
        sceneId: string
        title?: string
        chapterId?: string
        choicePoints?: Array<{
          choiceId: string
          options?: Array<{
            optionId: string
            text?: string
            targetSceneId?: string
            sideEffects?: {
              flagsSet?: string[]
              eventsDone?: string[]
            }
          }>
        }>
      }>
      endings?: Array<{ endingId: string; terminalSceneId?: string }>
    } | null

    // Step 1: Look up the choice point and selected option from pack
    const scene = pack?.scenes?.find((s) => s.sceneId === activeSceneId)
    const choicePoint = scene?.choicePoints?.find((c) => c.choiceId === choiceId)
    const option = choicePoint?.options?.find((o) => o.optionId === optionId)
    const targetSceneId = option?.targetSceneId || activeSceneId
    const sceneChanged = targetSceneId !== activeSceneId

    setPhase('busy')

    // Step 2: Apply side effects (flags, events)
    const nextFlags = new Set(flagsSet)
    const nextEvents = new Set(eventsDone)
    if (option?.sideEffects?.flagsSet) {
      for (const flag of option.sideEffects.flagsSet) nextFlags.add(flag)
    }
    if (option?.sideEffects?.eventsDone) {
      for (const evt of option.sideEffects.eventsDone) nextEvents.add(evt)
    }
    setFlagsSet(nextFlags)
    setEventsDone(nextEvents)

    // Step 3: Handle scene change
    // Use local variables to avoid stale closure issues (Finding 3)
    let detectedEndingId: string | null = null
    let nextChapterId = activeChapterId
    const entryFrames: Frame[] = []
    let resolvedChoiceStageView: StageFrame | null = stageViewRef.current
    if (sceneChanged) {
      setActiveSceneId(targetSceneId)
      const nextScene = pack?.scenes?.find((s) => s.sceneId === targetSceneId)
      const ending = pack?.endings?.find((e) => e.terminalSceneId === targetSceneId)
      if (ending) detectedEndingId = ending.endingId

      if (nextScene) {
        const entryFrame: Frame = {
          id: `${targetSceneId}_entry`,
          speaker: '旁白',
          text: (nextScene.title as string) || targetSceneId,
          canNext: true,
        }
        setCurrentFrame(entryFrame)
        entryFrames.push(entryFrame)
        setFrameQueue([])
        setTurnCountWithinScene(0)
        if (nextScene.chapterId) {
          nextChapterId = nextScene.chapterId
          setActiveChapterId(nextScene.chapterId)
        }
        // Rebuild stageView for target scene (V1 parity: vnContext.ts:1003)
        const nextStageView = buildStageViewFromScene(
          nextScene as { bgKey?: string; activeCast?: string[] },
          charactersById,
          resolveAssetReference,
          stageViewRef.current,
        )
        resolvedChoiceStageView = nextStageView
        setStageView(nextStageView)
      }
    } else {
      const ending = pack?.endings?.find((e) => e.terminalSceneId === targetSceneId)
      if (ending) detectedEndingId = ending.endingId
    }

    // Step 4: Resolve choice view for target scene (or clear if ending)
    const newChoice = detectedEndingId
      ? null
      : resolveChoiceView(pack, targetSceneId, nextFlags)
    setChoiceView(newChoice)

    // Step 5: Handle ending / choice / continue
    // If scene changed with entry frame, always play it first (V1 parity).
    // next() will transition to await_choice when frames are exhausted.
    if (detectedEndingId) {
      setEndingId(detectedEndingId)
      const { storyKey, packVersion } = extractPackManifest(packPayload)
      if (storyKey && sessionId) {
        unlockEndingIfNeeded({ sessionId, storyKey, packVersion, endingId: detectedEndingId })
          .catch(e => console.warn('[VnEngine] Ending unlock failed:', e))
      }
      setPhase('ended')
    } else if (sceneChanged) {
      // Entry frame was set → play it first; next() resolves to await_choice/await_input
      setPhase('playing')
    } else if (newChoice) {
      setPhase('await_choice')
    } else {
      setPhase('await_input')
    }

    // Step 6: Add choice to backlog
    setBacklogItems((prev) => [
      ...prev,
      {
        id: `bl-choice-${Date.now()}`,
        type: 'dialogue' as const,
        speaker: playerId,
        text: option?.text || `[${optionId}]`,
        timestamp: new Date().toISOString(),
      },
    ])

    // Step 7: Persist the choice turn
    try {
      await appendTurnCommit({
        sessionId: sessionId!,
        turnInput: { inputType: 'choice', choiceId, optionId },
        turnOutput: {
          frames: entryFrames,
          endingId: detectedEndingId ?? undefined,
          choiceView: (newChoice ?? undefined) as never,
          stageView: (resolvedChoiceStageView ?? undefined) as never,
        },
        activeSceneId: targetSceneId,
        phase: detectedEndingId ? 'ended' : sceneChanged ? 'playing' : newChoice ? 'await_choice' : 'await_input',
        endingId: detectedEndingId ?? undefined,
        snapshot: {
          activeChapterId: nextChapterId ?? '',
          activeSceneId: targetSceneId,
          phase: detectedEndingId ? 'ended' : sceneChanged ? 'playing' : newChoice ? 'await_choice' : 'await_input',
          endingId: detectedEndingId ?? undefined,
          playerId: 'player',
          flags: Array.from(nextFlags),
          eventsDone: Array.from(nextEvents),
          relationship: relationship as Record<string, number | Record<string, number>>,
          targetCharId: targetCharId ?? undefined,
          frames: entryFrames,
        },
      })
    } catch (e) { console.warn('[VnEngine] Choice turn persist failed:', e) }

    setIsDirty(true)
  }, [sessionId, activeSceneId, activeChapterId, choiceView, packPayload,
      flagsSet, eventsDone, relationship, targetCharId])

  // Shared turn submission logic for both talk and action
  const submitTurn = useCallback(async (
    text: string,
    inputType: 'talk' | 'action',
  ): Promise<TurnResult | Record<string, unknown>> => {
    if (isSubmittingRef.current) return {}
    if (!sessionId || !activeSceneId) return {}
    const requestSeq = submitRequestSeqRef.current + 1
    submitRequestSeqRef.current = requestSeq
    isSubmittingRef.current = true
    abortRef.current?.abort()
    const abortController = new AbortController()
    abortRef.current = abortController
    setPhase('busy')

    try {
      const targetChar = targetCharId ? charactersById[targetCharId] : null
      const systemPrompt = buildSystemPrompt(packPayload, activeSceneId, targetChar)
      const historySummary = buildHistorySummary(backlogRef.current)

      // Resolve active cast from current scene
      const pack = packPayload as { scenes?: Array<{ sceneId: string; activeCast?: string[] }> } | null
      const scene = pack?.scenes?.find((s) => s.sceneId === activeSceneId)
      const activeCast = scene?.activeCast

      // Update lane key (P2-6: sceneId:targetCharId)
      const laneKey = `${activeSceneId}:${targetCharId || ''}`
      setCurrentLaneKey(laneKey)
      const laneCursor = laneCursorByKey[laneKey]
      const isCurrentLane = currentLaneKey === laneKey
      const laneConversationId =
        laneCursor?.conversationId ?? (isCurrentLane ? llmConversationId : null)
      const laneResponseId = laneCursor?.responseId ?? (isCurrentLane ? llmResponseId : null)

      // Add player's message to backlog first
      setBacklogItems((prev) => [
        ...prev,
        {
          id: `bl-${inputType}-${Date.now()}`,
          type: 'dialogue' as const,
          speaker: playerId,
          text: inputType === 'action' ? `[${text}]` : text,
          timestamp: new Date().toISOString(),
        },
      ])

      // Call moyin-gateway /v1/game/turn
      const result = await callGatewayTurn(systemPrompt, text, {
        historySummary,
        conversationId: laneConversationId,
        responseId: laneResponseId,
        laneKey,
        activeCast,
        signal: abortController.signal,
      })

      if (submitRequestSeqRef.current !== requestSeq || abortController.signal.aborted) {
        return { status: 'aborted' }
      }

      const { frames, meta, proposals, stageHints } = result

      // Detect ending from event signals
      const detectedEndingId = detectEndingFromEventSignals(
        proposals, packPayload as { endings?: Array<{ endingId: string; terminalSceneId?: string }> } | null, activeSceneId,
      )
      if (detectedEndingId) {
        setEndingId(detectedEndingId)
        const { storyKey, packVersion } = extractPackManifest(packPayload)
        if (storyKey && sessionId) {
          unlockEndingIfNeeded({ sessionId, storyKey, packVersion, endingId: detectedEndingId })
            .catch(e => console.warn('[VnEngine] Ending unlock failed:', e))
        }
      }

      // Persist conversation context for follow-up turns
      if (meta?.conversation_id) {
        setLlmConversationId(meta.conversation_id)
      }
      if (meta?.response_id) {
        setLlmResponseId(meta.response_id)
      }
      if (meta?.conversation_id || meta?.response_id) {
        updateLaneCursor(
          laneKey,
          meta?.conversation_id ?? undefined,
          meta?.response_id ?? undefined,
        )
      }

      if (frames.length > 0) {
        setCurrentFrame(frames[0])
        setFrameQueue(frames.slice(1))

        // Add LLM frames to backlog
        setBacklogItems((prev) => [
          ...prev,
          ...frames.map((f) => ({
            id: `bl-${f.id}`,
            type: 'dialogue' as const,
            speaker: f.speaker,
            text: f.text,
            timestamp: new Date().toISOString(),
          })),
        ])
      }

      // Apply stageHints (background, portraits)
      // Compute resolved stageView explicitly for both state update and persistence
      let resolvedStageView: StageFrame | null = stageViewRef.current
      if (stageHints?.bgKey || stageHints?.portraits) {
        const normalizedCharacters = stageHints?.portraits
          ? normalizeStageHintPortraits(stageHints.portraits, {
              charactersById,
              activeCast,
              resolveAssetUrl: resolveAssetReference,
            })
          : null
        const nextBgUrl = stageHints?.bgKey
          ? resolveAssetReference(stageHints.bgKey)
          : ''

        resolvedStageView = {
          bgUrl: nextBgUrl || resolvedStageView?.bgUrl || '',
          characters: normalizedCharacters ?? resolvedStageView?.characters ?? [],
        }
        setStageView(resolvedStageView)
      }

      // Apply proposals (relationship deltas, flags)
      applyProposals(proposals, { setFlagsSet, setRelationship })

      // Compute resolved flags (after proposals) for choice view resolution
      let resolvedFlags = flagsSet
      if (proposals) {
        const addedFlags = proposals.flatMap(p => p.flagSet || [])
        if (addedFlags.length) resolvedFlags = new Set([...flagsSet, ...addedFlags])
      }

      // Resolve choice view for current scene (P0-1)
      const choice = detectedEndingId ? null : resolveChoiceView(packPayload, activeSceneId, resolvedFlags)
      setChoiceView(choice)

      // Determine phase: if frames exist, always play them first (V1 parity).
      // next() will transition to await_choice/await_input when frames are exhausted.
      const resolvedPhase: VnPhase = detectedEndingId
        ? 'ended'
        : frames.length > 0
          ? 'playing'
          : choice
            ? 'await_choice'
            : 'await_input'

      // Persist turn to IndexedDB
      const turnInput = inputType === 'action'
        ? { inputType: 'action' as const, chipId: text, targetCharId: targetCharId ?? undefined }
        : { inputType: 'talk' as const, inputText: text, targetCharId: targetCharId ?? undefined }
      try {
        await appendTurnCommit({
          sessionId: sessionId!,
          turnInput,
          turnOutput: {
            frames,
            endingId: detectedEndingId ?? undefined,
            stageView: (resolvedStageView ?? undefined) as never,
            choiceView: (choice ?? undefined) as never,
          },
          llmMeta: meta ? {
            conversationId: meta.conversation_id ?? undefined,
            responseId: meta.response_id ?? undefined,
          } : undefined,
          activeSceneId: activeSceneId ?? undefined,
          phase: resolvedPhase,
          endingId: detectedEndingId ?? undefined,
          snapshot: {
            activeChapterId: activeChapterId ?? '',
            activeSceneId: activeSceneId ?? '',
            phase: resolvedPhase,
            endingId: detectedEndingId ?? undefined,
            playerId: 'player',
            flags: Array.from(resolvedFlags),
            eventsDone: Array.from(eventsDone),
            relationship: relationship as Record<string, number | Record<string, number>>,
            targetCharId: targetCharId ?? undefined,
            frames,
          },
        })
      } catch (e) { console.warn('[VnEngine] Turn persist failed:', e) }

      setTurnCountWithinScene((prev) => prev + 1)
      setIsDirty(true)
      setPhase(resolvedPhase)

      return { status: 'ok', frames }
    } catch (err) {
      const isAbortError = err instanceof Error && err.name === 'AbortError'
      if (isAbortError) {
        return { status: 'aborted' }
      }
      console.error(`[VnEngine] submit${inputType === 'action' ? 'Action' : 'Talk'} failed:`, err)
      if (submitRequestSeqRef.current === requestSeq) {
        setPhase('await_input')
      }
      return { status: 'error', message: String(err) }
    } finally {
      if (submitRequestSeqRef.current === requestSeq) {
        isSubmittingRef.current = false
        if (abortRef.current === abortController) {
          abortRef.current = null
        }
      }
    }
  }, [sessionId, activeSceneId, activeChapterId, targetCharId, charactersById,
      packPayload, llmConversationId, llmResponseId, laneCursorByKey, currentLaneKey, resolveAssetReference,
      endingId, flagsSet, eventsDone, relationship, updateLaneCursor])

  const submitTalk = useCallback(
    async (text: string) => submitTurn(text, 'talk'),
    [submitTurn],
  )

  const submitAction = useCallback(
    async (chipId: string) => submitTurn(chipId, 'action'),
    [submitTurn],
  )

  const reset = useCallback(() => {
    submitRequestSeqRef.current += 1
    isSubmittingRef.current = false
    abortRef.current?.abort()
    abortRef.current = null
    setPhase('playing')
    setMode('play')
    setSessionId(null)
    setActiveSceneId(null)
    setActiveChapterId(null)
    setEndingId(null)
    setTargetCharId(null)
    setIsHydrating(false)
    setIsDirty(false)
    setStageView(null)
    setChoiceView(null)
    setCurrentFrame(null)
    setFrameQueue([])
    setBacklogItems([])
    setSaveSlots([])
    setCharactersById({})
    setFlagsSet(new Set())
    setEventsDone(new Set())
    setSessionMeta({})
    setPackPayload(null)
    setLlmConversationId(null)
    setLlmResponseId(null)
    setRelationship({})
    setTurnCountWithinScene(0)
    setReplaySteps([])
    setReplayIndex(0)
    setCurrentLaneKey(null)
    setLaneCursorByKey({})
    stageResourceManagerRef.current?.clear()
  }, [])

  const startSessionFromPack = useCallback(async (pack: unknown) => {
    submitRequestSeqRef.current += 1
    isSubmittingRef.current = false
    abortRef.current?.abort()
    abortRef.current = null

    if (!pack) {
      setPhase('playing')
      setMode('play')
      return
    }

    const payload = pack as Record<string, unknown>

    if (!payload.scenes || !Array.isArray(payload.scenes) || payload.scenes.length === 0) {
      console.warn('[VnEngine] No scenes in pack, keeping current state')
      setPhase('playing')
      setMode('play')
      return
    }

    // Find entry scene (from lore.opening or first scene)
    const lore = payload.lore as Record<string, unknown> | undefined
    const opening = lore?.opening as Record<string, unknown> | undefined
    const entrySceneId = (opening?.introSceneId as string) || payload.scenes[0].sceneId
    const scene = payload.scenes.find((s: Record<string, unknown>) => s.sceneId === entrySceneId) || payload.scenes[0]

    // Build characters map from pack (must precede stageView build)
    const charMap: Record<string, CharacterState> = {
      narrator: { charId: 'narrator', displayName: '旁白', assets: { portraits: {} } },
    }
    if (Array.isArray(payload.characters)) {
      for (const c of payload.characters) {
        charMap[c.charId] = {
          charId: c.charId,
          displayName: c.displayName,
          assets: c.assets || { portraits: {} },
        }
      }
    }
    setCharactersById(charMap)

    // Sync asset resolver from pack manifest (V1 parity: vnContext.assetUrlByKey)
    syncAssetResolverFromPayload(payload)

    // Build stageView from scene data (V1 parity: vnContext.ts:224)
    const initStageView = buildStageViewFromScene(
      scene as { bgKey?: string; activeCast?: string[] },
      charMap,
      assetUrlByKey,
    )
    setStageView(initStageView)

    const firstText = scene.title || ''
    setCurrentFrame({
      id: `${scene.sceneId}_001`,
      speaker: '旁白',
      text: firstText,
      canNext: true,
    })

    setActiveSceneId(scene.sceneId)
    setActiveChapterId(scene.chapterId || null)
    // Persist session to IndexedDB
    const { storyKey, packVersion, protocolVersion } = extractPackManifest(payload)
    let persistedSessionId = 'session-' + Date.now()
    try {
      persistedSessionId = await dbCreateSession({
        storyKey, packVersion, protocolVersion,
        entryChapterId: scene.chapterId || 'ch_default',
        entrySceneId: scene.sceneId,
        phase: 'playing',
        playerId: 'player',
      })
    } catch (e) { console.warn('[VnEngine] Session persist failed, using fallback ID:', e) }
    setSessionId(persistedSessionId)
    setPackPayload(payload)
    setFrameQueue([])
    setLlmConversationId(null)
    setLlmResponseId(null)
    setCurrentLaneKey(null)
    setLaneCursorByKey({})
    setRelationship({})
    setTurnCountWithinScene(0)

    // P1-4: Write system turn so saveGame can find headCommitId
    try {
      await appendTurnCommit({
        sessionId: persistedSessionId,
        turnInput: { inputType: 'system', inputText: 'Game Start' },
        turnOutput: { frames: [{ id: `${scene.sceneId}_001`, speaker: '旁白', text: firstText, canNext: true }] },
        activeSceneId: scene.sceneId,
        phase: 'playing',
        snapshot: {
          activeChapterId: scene.chapterId || '',
          activeSceneId: scene.sceneId,
          phase: 'playing',
          playerId: 'player',
          flags: [],
          eventsDone: [],
          relationship: {},
          frames: [{ id: `${scene.sceneId}_001`, speaker: '旁白', text: firstText, canNext: true }],
        },
      })
    } catch (e) { console.warn('[VnEngine] System turn persist failed:', e) }

    // Resolve choice view for entry scene (shown after first frame is played)
    const entryChoice = resolveChoiceView(payload, scene.sceneId, new Set())
    setChoiceView(entryChoice)
    setPhase('playing')
    setMode('play')
  }, [])

  const restoreSessionFromPack = useCallback(async (pack: unknown, targetSessionId?: string) => {
    if (!pack) return false

    const payload = pack as Record<string, unknown>
    const { storyKey, packVersion } = extractPackManifest(payload)

    setIsHydrating(true)

    try {
      // Step 1: Find session
      let session: Record<string, unknown> | null | undefined = null
      if (targetSessionId) {
        session = await getSessionById(targetSessionId) as Record<string, unknown> | undefined
      } else if (storyKey) {
        session = await getLatestSessionByStoryKey(storyKey) as Record<string, unknown> | null
      }

      if (!session) return false

      const restoredSessionId = session.sessionId as string

      // Step 2: Set session-level state
      setSessionId(restoredSessionId)
      setLlmConversationId((session.llmConversationId as string) ?? null)
      setLlmResponseId(null)
      setCurrentLaneKey(null)
      setLaneCursorByKey({})
      setActiveChapterId((session.activeChapterId as string) ?? null)
      setActiveSceneId((session.activeSceneId as string) ?? null)
      setEndingId((session.endingId as string) ?? null)
      setTargetCharId((session.targetCharId as string) ?? null)
      setPackPayload(payload)
      setSessionMeta({ storyKey, packVersion })

      // Step 3: Build characters map from pack
      const charMap: Record<string, CharacterState> = {
        narrator: { charId: 'narrator', displayName: '旁白', assets: { portraits: {} } },
      }
      if (Array.isArray(payload.characters)) {
        for (const c of payload.characters as Array<Record<string, unknown>>) {
          charMap[c.charId as string] = {
            charId: c.charId as string,
            displayName: c.displayName as string,
            assets: (c.assets as CharacterState['assets']) || { portraits: {} },
          }
        }
      }
      setCharactersById(charMap)

      // Step 4: Find latest snapshot
      const snapshots = await listSnapshotsBySessionId(restoredSessionId) as Array<Record<string, unknown>>
      const sorted = [...snapshots].sort((a, b) => ((b.revision as number) ?? 0) - ((a.revision as number) ?? 0))
      const headSnapshot = sorted[0] ?? null

      if (headSnapshot) {
        setActiveSceneId((headSnapshot.activeSceneId as string) ?? null)
        setActiveChapterId((headSnapshot.activeChapterId as string) ?? null)
        setFlagsSet(new Set((headSnapshot.flags as string[]) || []))
        setEventsDone(new Set((headSnapshot.eventsDone as string[]) || []))
        setRelationship(((headSnapshot.relationship as Record<string, number | Record<string, number> | { value: number }>) || {}))
        setEndingId((headSnapshot.endingId as string) ?? null)
        setTargetCharId((headSnapshot.targetCharId as string) ?? null)

        let restoredPhase = (headSnapshot.phase as string) || (headSnapshot.endingId ? 'ended' : 'await_input')

        // Rebuild choiceView when restoring to await_choice (V1 parity: vnSessionManager.ts:628-641)
        if (restoredPhase === 'await_choice') {
          const restoredSceneId = (headSnapshot.activeSceneId as string) ?? null
          const restoredFlags = new Set((headSnapshot.flags as string[]) || [])
          const choice = resolveChoiceView(payload, restoredSceneId, restoredFlags)
          if (choice) {
            setChoiceView(choice)
          } else {
            console.warn('[VnEngine] Failed to restore choiceView, fallback to await_input')
            restoredPhase = 'await_input'
          }
        }
        setPhase(restoredPhase as VnPhase)

        const restoredFrames = (headSnapshot.frames as Frame[]) || []
        if (restoredFrames.length > 0) {
          setCurrentFrame(restoredFrames[restoredFrames.length - 1])
          setFrameQueue(restoredFrames.slice(0, -1))
        }
      } else {
        const scenes = payload.scenes as Array<Record<string, unknown>> | undefined
        const restoredSceneId = (session.activeSceneId as string) ?? null
        if (restoredSceneId && scenes) {
          const scene = scenes.find((s) => s.sceneId === restoredSceneId)
          if (scene) {
            setCurrentFrame({
              id: `${scene.sceneId}_restore`,
              speaker: '旁白',
              text: (scene.title as string) || '',
              canNext: true,
            })
          }
        }
        setPhase('await_input')
      }

      // Step 5: Restore backlog from turns
      try {
        const turns = await getTurnsBySessionId(restoredSessionId) as Array<Record<string, unknown>>
        const restoredBacklog: BacklogItem[] = turns
          .filter((t) => (t.frames as Frame[] | undefined)?.length)
          .flatMap((t) =>
            ((t.frames as Frame[]) || []).map((f) => ({
              id: `bl-${f.id}`,
              type: 'dialogue' as const,
              speaker: f.speaker,
              text: f.text,
              timestamp: (t.createdAt as string) || new Date().toISOString(),
            }))
          )
        setBacklogItems(restoredBacklog)

        const restoredCursor = resolveLatestLlmCursor(
          turns,
          (session.llmConversationId as string) ?? null,
        )
        const restoredLaneMap = buildLaneCursorMap(session, turns)
        setLaneCursorByKey(restoredLaneMap)

        const preferredLaneKey =
          restoredCursor.laneKey && restoredLaneMap[restoredCursor.laneKey]
            ? restoredCursor.laneKey
            : null
        const preferredLaneCursor = preferredLaneKey
          ? restoredLaneMap[preferredLaneKey]
          : null

        setCurrentLaneKey(preferredLaneKey ?? restoredCursor.laneKey)
        setLlmConversationId(preferredLaneCursor?.conversationId ?? restoredCursor.conversationId)
        setLlmResponseId(preferredLaneCursor?.responseId ?? restoredCursor.responseId)
      } catch (err) {
        console.warn('[VnEngine] Failed to restore backlog:', err)
      }

      // Rebuild stageView from active scene (V1 parity: vnSessionManager.ts:600)
      syncAssetResolverFromPayload(payload)
      const restoredSceneData = (payload.scenes as Array<Record<string, unknown>> | undefined)
        ?.find(s => s.sceneId === (session!.activeSceneId as string))
      setStageView(buildStageViewFromScene(
        restoredSceneData as { bgKey?: string; activeCast?: string[] } | null,
        charMap,
        assetUrlByKey,
      ))
      setIsDirty(false)
      setTurnCountWithinScene(0)
      setMode('play')

      return true
    } catch (err) {
      console.error('[VnEngine] restoreSessionFromPack failed:', err)
      return false
    } finally {
      setIsHydrating(false)
    }
  }, [])

  const startReplayFromSession = useCallback(async (pack: unknown, targetSessionId: string, targetRevision?: number) => {
    const session = await getSessionById(targetSessionId) as Record<string, unknown> | undefined
    if (!session) throw new Error(`Replay session not found: ${targetSessionId}`)

    const payload = pack as Record<string, unknown>
    const { storyKey, packVersion } = extractPackManifest(payload)

    setIsHydrating(true)

    try {
      // Step 1: Set session meta
      setSessionId(session.sessionId as string)
      setLlmConversationId((session.llmConversationId as string) ?? null)
      setLlmResponseId(null)
      setCurrentLaneKey(null)
      setLaneCursorByKey({})
      setPackPayload(payload)
      setSessionMeta({ storyKey, packVersion })

      // Step 2: Build characters map
      const charMap: Record<string, CharacterState> = {
        narrator: { charId: 'narrator', displayName: '旁白', assets: { portraits: {} } },
      }
      if (Array.isArray(payload.characters)) {
        for (const c of payload.characters as Array<Record<string, unknown>>) {
          charMap[c.charId as string] = {
            charId: c.charId as string,
            displayName: c.displayName as string,
            assets: (c.assets as CharacterState['assets']) || { portraits: {} },
          }
        }
      }
      setCharactersById(charMap)

      // Step 3: Load session data in parallel
      const [snapshots, commits, turns] = await Promise.all([
        listSnapshotsBySessionId(session.sessionId as string) as Promise<Array<Record<string, unknown>>>,
        getCommitsBySessionId(session.sessionId as string) as Promise<Array<Record<string, unknown>>>,
        getTurnsBySessionId(session.sessionId as string) as Promise<Array<Record<string, unknown>>>,
      ])

      const revisionLimit = targetRevision ?? (session.headRevision as number) ?? 0

      // Step 4: Find base snapshot
      const baseSnapshot = [...snapshots]
        .filter(row => ((row.revision as number) ?? 0) <= revisionLimit)
        .sort((a, b) => ((b.revision as number) ?? 0) - ((a.revision as number) ?? 0))[0] || null

      // Step 5: Apply base snapshot or session fields
      if (baseSnapshot) {
        setActiveSceneId((baseSnapshot.activeSceneId as string) ?? null)
        setActiveChapterId((baseSnapshot.activeChapterId as string) ?? null)
        setFlagsSet(new Set((baseSnapshot.flags as string[]) || []))
        setEventsDone(new Set((baseSnapshot.eventsDone as string[]) || []))
        setRelationship(((baseSnapshot.relationship as Record<string, number | Record<string, number> | { value: number }>) || {}))
        setTargetCharId((baseSnapshot.targetCharId as string) ?? null)

        const restoredFrames = (baseSnapshot.frames as Frame[]) || []
        if (restoredFrames.length > 0) {
          setCurrentFrame(restoredFrames[restoredFrames.length - 1])
          setFrameQueue(restoredFrames.slice(0, -1))
        }
      } else {
        setActiveChapterId((session.activeChapterId as string) ?? null)
        setActiveSceneId((session.activeSceneId as string) ?? null)
        setTargetCharId((session.targetCharId as string) ?? null)
      }

      // Step 6: Build replay steps
      const commitByTurnId = new Map<string, Record<string, unknown>>()
      commits.forEach(commit => {
        commitByTurnId.set(commit.turnId as string, commit)
      })

      const steps = turns
        .filter(turn => {
          const rev = (turn.revisionTo as number) ?? 0
          return rev > 0 && rev <= revisionLimit
        })
        .sort((a, b) => ((a.revisionTo as number) ?? 0) - ((b.revisionTo as number) ?? 0))
        .map(turn => ({
          turn,
          commit: commitByTurnId.get(turn.turnId as string) || null,
        }))

      setReplaySteps(steps)
      setReplayIndex(0)

      // Step 7: Restore backlog
      const restoredBacklog: BacklogItem[] = turns
        .filter(t => ((t.revisionTo as number) ?? 0) <= revisionLimit)
        .filter(t => (t.frames as Frame[] | undefined)?.length)
        .flatMap(t =>
          ((t.frames as Frame[]) || []).map(f => ({
            id: `bl-${f.id}`,
            type: 'dialogue' as const,
            speaker: f.speaker,
            text: f.text,
            timestamp: (t.createdAt as string) || new Date().toISOString(),
          }))
        )
      setBacklogItems(restoredBacklog)

      const replayCursor = resolveLatestLlmCursor(
        turns.filter(turn => ((turn.revisionTo as number) ?? 0) <= revisionLimit),
        (session.llmConversationId as string) ?? null,
      )
      const replayTurns = turns.filter(turn => ((turn.revisionTo as number) ?? 0) <= revisionLimit)
      const replayLaneMap = buildLaneCursorMap(session, replayTurns)
      setLaneCursorByKey(replayLaneMap)
      const replayLaneKey =
        replayCursor.laneKey && replayLaneMap[replayCursor.laneKey]
          ? replayCursor.laneKey
          : null
      const replayLaneCursor = replayLaneKey ? replayLaneMap[replayLaneKey] : null
      setCurrentLaneKey(replayLaneKey ?? replayCursor.laneKey)
      setLlmConversationId(replayLaneCursor?.conversationId ?? replayCursor.conversationId)
      setLlmResponseId(replayLaneCursor?.responseId ?? replayCursor.responseId)

      // Step 8: Set replay mode — rebuild stageView from scene (V1 parity)
      syncAssetResolverFromPayload(payload)
      const replaySceneId = baseSnapshot
        ? (baseSnapshot.activeSceneId as string)
        : (session.activeSceneId as string)
      const replayScene = (payload.scenes as Array<Record<string, unknown>> | undefined)
        ?.find(s => s.sceneId === replaySceneId)
      setStageView(buildStageViewFromScene(
        replayScene as { bgKey?: string; activeCast?: string[] } | null,
        charMap,
        assetUrlByKey,
      ))
      setEndingId(null)
      setIsDirty(false)
      setTurnCountWithinScene(0)
      setMode('replay')

      // Step 9: Load first replay step (V1 parity: apply stageView + choiceView + frames)
      if (steps.length > 0) {
        const firstStep = steps[0]
        const firstTurn = firstStep.turn as Record<string, unknown>
        const hasFirstOutput = firstTurn.output && typeof firstTurn.output === 'object'
        const firstOutput = hasFirstOutput
          ? (firstTurn.output as Record<string, unknown>)
          : firstTurn
        const stepFrames = (firstOutput.frames as Frame[]) || []

        // Apply stageView if present
        const stepStageView = firstOutput.stageView as StageFrame | undefined
        if (stepStageView) setStageView(stepStageView)

        // Apply choiceView if present
        setChoiceView((firstOutput.choiceView as ChoiceView) ?? null)

        if (stepFrames.length > 0) {
          setCurrentFrame(stepFrames[0])
          setFrameQueue(stepFrames.slice(1))
          setPhase('playing')
        }
      } else {
        setPhase('await_input')
      }
    } finally {
      setIsHydrating(false)
    }
  }, [])

  const startReplayFromSlot = useCallback(async (pack: unknown, slotId: string, revision?: number) => {
    const slot = await getSaveSlot(slotId) as Record<string, unknown> | undefined
    if (!slot) throw new Error(`Replay slot not found: ${slotId}`)
    await startReplayFromSession(pack, slot.sessionId as string, revision ?? (slot.baseRevision as number))
  }, [startReplayFromSession])

  const doRefreshSaveSlots = useCallback(async () => {
    const { storyKey, packVersion } = extractPackManifest(packPayload)
    if (!storyKey) return
    const slots = await listSaveSlots({ storyKey, packVersion })
    setSaveSlots(slots as unknown as SaveSlotRow[])
  }, [packPayload])

  const loadSlot = useCallback(async (slotId: string) => {
    if (!packPayload) return
    const { sessionId: newSid, snapshot } = await loadGameFork(slotId, packPayload)
    setSessionId(newSid)
    setActiveSceneId(snapshot.activeSceneId)
    setActiveChapterId(snapshot.activeChapterId)
    // Rebuild choiceView from pack for loaded state (V1 parity)
    const loadedFlags = new Set(snapshot.flags || [])
    const loadedChoice = resolveChoiceView(packPayload, snapshot.activeSceneId, loadedFlags)
    setChoiceView(loadedChoice)
    if (snapshot.phase === 'ended') {
      setPhase('ended')
    } else if (loadedChoice) {
      setPhase('await_choice')
    } else {
      setPhase('await_input')
    }
    setEndingId(snapshot.endingId ?? null)
    setTargetCharId(snapshot.targetCharId ?? null)
    setFlagsSet(new Set(snapshot.flags || []))
    setEventsDone(new Set(snapshot.eventsDone || []))
    setRelationship((snapshot.relationship || {}) as Record<string, number | Record<string, number> | { value: number }>)
    const sf = snapshot.frames || []
    setCurrentFrame(sf[0] ?? null)
    setFrameQueue(sf.slice(1))
    // Rebuild stageView from loaded scene (V1 parity: vnSessionManager.ts:600)
    const loadPayload = packPayload as Record<string, unknown>
    const loadedScene = (loadPayload.scenes as Array<Record<string, unknown>> | undefined)
      ?.find(s => s.sceneId === snapshot.activeSceneId)
    setStageView(buildStageViewFromScene(
      loadedScene as { bgKey?: string; activeCast?: string[] } | null,
      charactersById,
      assetUrlByKey,
      stageViewRef.current,
    ))
    try {
      const turns = await getTurnsBySessionId(newSid) as Array<Record<string, unknown>>
      const loadedCursor = resolveLatestLlmCursor(turns, null)
      const loadedSession = await getSessionById(newSid) as Record<string, unknown> | undefined
      const loadedLaneMap = buildLaneCursorMap(loadedSession, turns)
      setLaneCursorByKey(loadedLaneMap)
      const loadedLaneKey =
        loadedCursor.laneKey && loadedLaneMap[loadedCursor.laneKey]
          ? loadedCursor.laneKey
          : null
      const loadedLaneCursor = loadedLaneKey ? loadedLaneMap[loadedLaneKey] : null
      setCurrentLaneKey(loadedLaneKey ?? loadedCursor.laneKey)
      setLlmConversationId(loadedLaneCursor?.conversationId ?? loadedCursor.conversationId)
      setLlmResponseId(loadedLaneCursor?.responseId ?? loadedCursor.responseId)
    } catch (err) {
      console.warn('[VnEngine] Failed to restore LLM cursor from loaded slot:', err)
      setLlmConversationId(null)
      setLlmResponseId(null)
      setCurrentLaneKey(null)
      setLaneCursorByKey({})
    }
    setIsDirty(false)
    setTurnCountWithinScene(0)
  }, [packPayload, charactersById, assetUrlByKey])

  const saveSlot = useCallback(async (title?: string) => {
    if (!sessionId) return
    const lastText = backlogRef.current[backlogRef.current.length - 1]?.text || ''
    await saveGame({
      sessionId,
      title,
      preview: { textSnippet: lastText.slice(0, 100), endingId: endingId ?? undefined },
      snapshot: {
        activeChapterId: activeChapterId ?? '',
        activeSceneId: activeSceneId ?? '',
        phase: phase as 'playing' | 'await_input' | 'ended' | 'idle' | 'busy' | 'await_choice',
        endingId: endingId ?? undefined,
        playerId: 'player',
        flags: Array.from(flagsSet),
        eventsDone: Array.from(eventsDone),
        relationship: relationship as Record<string, number | Record<string, number>>,
        targetCharId: targetCharId ?? undefined,
        frames: currentFrame ? [currentFrame, ...frameQueue] : [],
      },
    })
    await doRefreshSaveSlots()
  }, [sessionId, activeChapterId, activeSceneId, phase, endingId,
      flagsSet, eventsDone, relationship, targetCharId, currentFrame, frameQueue, doRefreshSaveSlots])

  const deleteSlot = useCallback(async (slotId: string) => {
    await dbDeleteSlot(slotId)
    await doRefreshSaveSlots()
  }, [doRefreshSaveSlots])

  const renameSlot = useCallback(async (slotId: string, newTitle: string) => {
    await dbRenameSaveSlot(slotId, newTitle)
    await doRefreshSaveSlots()
  }, [doRefreshSaveSlots])

  const refreshSaveSlots = useCallback(() => {
    doRefreshSaveSlots().catch(e => console.warn('[VnEngine] refreshSaveSlots failed:', e))
  }, [doRefreshSaveSlots])

  return useMemo(() => ({
    phase,
    mode,
    sessionId,
    activeSceneId,
    activeChapterId,
    endingId,
    targetCharId,
    playerId,
    isHydrating,
    isDirty,
    stageView,
    choiceView,
    currentFrame,
    frameQueue,
    playheadIndex: 0,
    turnCountWithinScene,
    backlogItems,
    saveSlots,
    charactersById,
    assetsBaseUrl: assetsBaseUrlRef.current,
    assetUrlByKey,
    flagsSet,
    eventsDone,
    sessionMeta,
    llmConversationId,
    llmResponseId,
    currentLaneKey,
    relationship,
    packPayload,
    excludePlayerFromActiveCastUI: true,
    next,
    selectChar,
    choose,
    submitTalk,
    submitAction,
    reset,
    startSessionFromPack,
    restoreSessionFromPack,
    startReplayFromSlot,
    startReplayFromSession,
    loadSlot,
    saveSlot,
    deleteSlot,
    renameSlot,
    refreshSaveSlots,
  }), [
    phase,
    mode,
    sessionId,
    activeSceneId,
    activeChapterId,
    endingId,
    targetCharId,
    playerId,
    isHydrating,
    isDirty,
    stageView,
    choiceView,
    currentFrame,
    frameQueue,
    turnCountWithinScene,
    backlogItems,
    saveSlots,
    charactersById,
    assetUrlByKey,
    flagsSet,
    eventsDone,
    sessionMeta,
    llmConversationId,
    llmResponseId,
    relationship,
    packPayload,
    currentLaneKey,
    next,
    selectChar,
    choose,
    submitTalk,
    submitAction,
    reset,
    startSessionFromPack,
    restoreSessionFromPack,
    startReplayFromSlot,
    startReplayFromSession,
    loadSlot,
    saveSlot,
    deleteSlot,
    renameSlot,
    refreshSaveSlots,
  ])
}
