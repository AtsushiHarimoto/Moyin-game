/**
 * Game Loop Helpers
 * Pure functions for building prompts, calling the moyin-gateway,
 * parsing responses, and applying game state proposals.
 *
 * Primary path: moyin-gateway `/v1/game/turn`
 *   - Enforces JSON output, auto-repair, retry
 *   - Returns structured frames, proposals, stageHints
 *   - Vite proxy: `/api/v1/game/turn` → `localhost:9009/v1/game/turn`
 */

import type { BacklogItem, CharacterState, Frame } from '@moyin/vn-engine'
import { fetchRequest } from '@moyin/net-client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_STORAGE_KEY = 'moyin_api_token'
const DEFAULT_PROVIDER = 'ollama'
const DEFAULT_MODEL = 'qwen2.5:14b-instruct'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PackPayload = {
  lore?: {
    setting?: string
    worldSetting?: string
    synopsis?: string
    premise?: string
    tone?: string
    opening?: { narration?: string }
    [key: string]: unknown
  }
  characters?: Array<{
    charId: string
    displayName?: string
    personality?: string
    background?: string
    speechStyle?: string
    [key: string]: unknown
  }>
  scenes?: Array<{
    sceneId: string
    title?: string
    description?: string
    activeCast?: string[]
    [key: string]: unknown
  }>
  game?: {
    player?: { displayName?: string; persona?: string }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type GatewayTurnResponse = {
  meta?: {
    conversation_id?: string
    response_id?: string
    candidate_id?: string
    protocolVersion?: string
  }
  frames?: Array<{
    id?: string
    speaker?: string
    text?: string
    canNext?: boolean
  }>
  proposals?: Array<{
    relationshipDelta?: Array<{
      fromWho: string
      toWho: string
      trackKey: string
      delta: number
    }>
    flagSet?: string[]
    eventSignals?: string[]
  }>
  stageHints?: GatewayStageHints
  provider?: string
  model?: string
}

export type GatewayPortraitHint = string | {
  id?: string
  poseKey?: string
  poseUrl?: string
  position?: string
}

export type GatewayStageHints = {
  bgKey?: string
  bgmKey?: string
  portraits?: GatewayPortraitHint[]
}

export type GatewayTurnResult = {
  frames: Frame[]
  meta?: GatewayTurnResponse['meta']
  proposals?: GatewayTurnResponse['proposals']
  stageHints?: GatewayTurnResponse['stageHints']
}

type ProposalHandlers = {
  setFlagsSet: (updater: (prev: Set<string>) => Set<string>) => void
  setRelationship: (
    updater: (
      prev: Record<string, number | Record<string, number> | { value: number }>,
    ) => Record<string, number | Record<string, number> | { value: number }>,
  ) => void
}

export type NormalizedStageCharacter = {
  id: string
  poseUrl: string
  position?: 'left' | 'center' | 'right'
}

type NormalizeStageHintPortraitsOptions = {
  charactersById: Record<string, CharacterState>
  activeCast?: string[]
  fallback?: NormalizedStageCharacter[]
  resolveAssetUrl: (reference?: string) => string
}

// ---------------------------------------------------------------------------
// Auth Token
// ---------------------------------------------------------------------------

function getAuthToken(): string {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (stored) return stored
  const envToken = import.meta.env.VITE_GATEWAY_AUTH_TOKEN as string | undefined
  if (envToken) return envToken
  return ''
}

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  packPayload: unknown,
  activeSceneId: string | null,
  targetChar: CharacterState | null,
): string {
  const pack = packPayload as PackPayload | null
  if (!pack) return '你是一個視覺小說中的角色。請以角色身份回應玩家。'

  const parts: string[] = []

  // World setting
  const worldSetting = pack.lore?.worldSetting || pack.lore?.setting
  if (worldSetting) {
    parts.push(`【世界觀】\n${worldSetting}`)
  }
  const synopsis = pack.lore?.premise || pack.lore?.synopsis
  if (synopsis) {
    parts.push(`【故事概要】\n${synopsis}`)
  }
  if (pack.lore?.tone) {
    parts.push(`【基調】${pack.lore.tone}`)
  }

  // Player info
  if (pack.game?.player) {
    const p = pack.game.player
    const playerParts = [`【玩家角色】${p.displayName || '玩家'}`]
    if (p.persona) playerParts.push(`設定：${p.persona}`)
    parts.push(playerParts.join('\n'))
  }

  // Current scene context
  const scene = pack.scenes?.find((s) => s.sceneId === activeSceneId)
  if (scene) {
    parts.push(`【當前場景】${scene.title || scene.sceneId}\n${scene.description || ''}`)
  }

  // Target character details
  if (targetChar) {
    const charDef = pack.characters?.find((c) => c.charId === targetChar.charId)
    if (charDef) {
      const charParts = [`【你扮演的角色】${charDef.displayName || charDef.charId}`]
      if (charDef.personality) charParts.push(`性格：${charDef.personality}`)
      if (charDef.background) charParts.push(`背景：${charDef.background}`)
      if (charDef.speechStyle) charParts.push(`說話風格：${charDef.speechStyle}`)
      parts.push(charParts.join('\n'))
    }
  }

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// History Summary Builder
// ---------------------------------------------------------------------------

export function buildHistorySummary(backlogItems: BacklogItem[]): string {
  if (backlogItems.length === 0) return ''

  const recent = backlogItems.slice(-10)
  return recent
    .map((item) => {
      const speaker = item.speaker || '旁白'
      return `${speaker}：${item.text}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Gateway `/v1/game/turn` Call
// ---------------------------------------------------------------------------

export async function callGatewayTurn(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    historySummary?: string
    conversationId?: string | null
    responseId?: string | null
    laneKey?: string | null
    sceneContext?: string[]
    activeCast?: string[]
    provider?: string
    model?: string
    signal?: AbortSignal
  },
): Promise<GatewayTurnResult> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const requestBody = {
    provider: options?.provider || DEFAULT_PROVIDER,
    model: options?.model || DEFAULT_MODEL,
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    history_summary: options?.historySummary,
    conversation_id: options?.conversationId,
    response_id: options?.responseId,
    laneKey: options?.laneKey || undefined,
    scene_context: options?.sceneContext,
    active_cast: options?.activeCast,
  }

  const { data } = await fetchRequest<GatewayTurnResponse>({
    method: 'POST',
    url: '/api/v1/game/turn',
    headers,
    body: requestBody,
    signal: options?.signal,
    timeoutMs: 120_000,
  })

  const frames: Frame[] = (data.frames ?? []).map((f) => ({
    id: f.id || `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    speaker: f.speaker || '旁白',
    text: f.text || '',
    canNext: f.canNext !== false,
  }))

  return {
    frames,
    meta: data.meta,
    proposals: data.proposals,
    stageHints: data.stageHints,
  }
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizePosition(value?: string): 'left' | 'center' | 'right' | undefined {
  if (value === 'left' || value === 'center' || value === 'right') return value
  return undefined
}

function getFirstPortraitReference(character?: CharacterState): string | undefined {
  if (!character) return undefined
  const portraits = character.assets?.portraits || {}
  const first = Object.values(portraits)[0]
  return toNonEmptyString(first) || toNonEmptyString(character.assets?.avatar)
}

function resolveCharacterPoseReference(character: CharacterState | undefined, reference?: string): string | undefined {
  if (!character || !reference) return undefined
  const portraits = character.assets?.portraits || {}
  if (typeof portraits[reference] === 'string' && portraits[reference]) {
    return portraits[reference]
  }
  for (const value of Object.values(portraits)) {
    if (value === reference) return value
  }
  if (character.assets?.avatar === reference) return reference
  return undefined
}

type PortraitMatch = { id: string; poseRef?: string }

function findPortraitMatch(
  reference: string,
  charactersById: Record<string, CharacterState>,
  activeCast: string[],
): PortraitMatch | null {
  const preferred = new Set(activeCast)
  const candidateIds = [
    ...activeCast,
    ...Object.keys(charactersById).filter((id) => !preferred.has(id)),
  ]

  for (const id of candidateIds) {
    const character = charactersById[id]
    if (!character) continue
    if (id === reference) {
      return { id, poseRef: getFirstPortraitReference(character) }
    }
    const resolved = resolveCharacterPoseReference(character, reference)
    if (resolved) {
      return { id, poseRef: resolved }
    }
  }

  return null
}

export function normalizeStageHintPortraits(
  portraits: GatewayPortraitHint[] | undefined,
  options: NormalizeStageHintPortraitsOptions,
): NormalizedStageCharacter[] {
  if (!Array.isArray(portraits)) return options.fallback ?? []

  const { charactersById, resolveAssetUrl } = options
  const activeCast = (options.activeCast ?? []).filter(Boolean)

  return portraits.map((hint, index) => {
    if (typeof hint === 'string') {
      const reference = toNonEmptyString(hint)
      const matched = reference
        ? findPortraitMatch(reference, charactersById, activeCast)
        : null
      const id = matched?.id ?? `hint-${index}`
      const poseRef = matched?.poseRef ?? reference
      return {
        id,
        poseUrl: resolveAssetUrl(poseRef),
      }
    }

    const hintId = toNonEmptyString(hint?.id)
    const hintPoseKey = toNonEmptyString(hint?.poseKey)
    const hintPoseUrl = toNonEmptyString(hint?.poseUrl)
    const hintPosition = normalizePosition(toNonEmptyString(hint?.position))

    let resolvedId = hintId
    let resolvedPoseRef: string | undefined

    if (resolvedId && charactersById[resolvedId]) {
      const character = charactersById[resolvedId]
      if (hintPoseUrl) {
        resolvedPoseRef = hintPoseUrl
      } else if (hintPoseKey) {
        resolvedPoseRef = resolveCharacterPoseReference(character, hintPoseKey) ?? hintPoseKey
      } else {
        resolvedPoseRef = getFirstPortraitReference(character)
      }
    } else {
      const matchRef = hintPoseKey || hintPoseUrl || hintId
      const matched = matchRef
        ? findPortraitMatch(matchRef, charactersById, activeCast)
        : null
      if (!resolvedId) {
        resolvedId = matched?.id
      }
      if (hintPoseUrl) {
        resolvedPoseRef = hintPoseUrl
      } else if (hintPoseKey) {
        resolvedPoseRef = matched?.poseRef ?? hintPoseKey
      } else {
        resolvedPoseRef = matched?.poseRef
      }
    }

    return {
      id: resolvedId ?? `hint-${index}`,
      poseUrl: resolveAssetUrl(resolvedPoseRef),
      position: hintPosition,
    }
  })
}

// ---------------------------------------------------------------------------
// Stage View Builder (port from V1 VnContext.buildStageView)
// ---------------------------------------------------------------------------

/**
 * Build a StageFrame from scene data + character definitions.
 * Used in choose() scene switch, startSession, restore, replay, and loadSlot.
 * V1 parity: vnContext.ts:224 — buildStageView(state, scene, hints?)
 */
export function buildStageViewFromScene(
  scene: { bgKey?: string; activeCast?: string[] } | null,
  charactersById: Record<string, CharacterState>,
  resolveAssetUrl: (reference?: string) => string,
  currentStageView?: { bgUrl: string; characters?: Array<{ id: string; poseUrl: string; position?: string }> } | null,
): { bgUrl: string; characters: Array<{ id: string; poseUrl: string; position: 'left' | 'center' | 'right' }> } {
  // Background: scene.bgKey → resolve, else keep existing
  const bgUrl = scene?.bgKey
    ? resolveAssetUrl(scene.bgKey)
    : (currentStageView?.bgUrl || '')

  // Characters from activeCast with auto-layout (V1 parity: vnContext.ts:262-275)
  const cast = scene?.activeCast || []
  const characters = cast.map((charId, idx) => {
    const char = charactersById[charId]
    const poseRef = getFirstPortraitReference(char)
    const poseUrl = poseRef ? resolveAssetUrl(poseRef) : ''

    // Auto-layout: 1 char = center, 2 chars = left/right, 3+ = left/center/right
    let position: 'left' | 'center' | 'right'
    if (cast.length === 1) position = 'center'
    else if (cast.length === 2) position = idx === 0 ? 'left' : 'right'
    else position = idx === 0 ? 'left' : idx === 1 ? 'center' : 'right'

    return { id: charId, poseUrl, position }
  })

  return { bgUrl, characters }
}

// ---------------------------------------------------------------------------
// Choice View Resolution (port from V1 VnContext.resolveChoiceView)
// ---------------------------------------------------------------------------

export function resolveChoiceView(
  packPayload: unknown,
  activeSceneId: string | null,
  flags: Set<string>,
  options?: { enforceConditions?: boolean },
): { choiceId: string; options: Array<{ optionId: string; text: string }> } | null {
  if (!activeSceneId) return null

  const pack = packPayload as {
    scenes?: Array<{
      sceneId: string
      choicePoints?: Array<{
        choiceId?: string
        options?: Array<{
          optionId?: string
          text?: string
          targetSceneId?: string
        }>
        unlockConditions?: {
          requireFlags?: string | string[]
          forbidFlags?: string | string[]
        }
      }>
    }>
  } | null

  const scene = pack?.scenes?.find(s => s.sceneId === activeSceneId)
  if (!scene) return null

  const choicePoints = scene.choicePoints
  if (!Array.isArray(choicePoints) || !choicePoints.length) return null

  const shouldEnforce = options?.enforceConditions !== false

  const toFlagArray = (v?: string | string[]): string[] => {
    if (!v) return []
    return Array.isArray(v) ? v : [v]
  }

  const isUnlockSatisfied = (cond?: { requireFlags?: string | string[]; forbidFlags?: string | string[] }) => {
    if (!cond) return true
    const req = toFlagArray(cond.requireFlags)
    const forbid = toFlagArray(cond.forbidFlags)
    return req.every(f => flags.has(f)) && !forbid.some(f => flags.has(f))
  }

  const resolved = choicePoints.find(cp => {
    if (!cp?.choiceId || !Array.isArray(cp.options) || !cp.options.length) return false
    if (!shouldEnforce) return true
    return isUnlockSatisfied(cp.unlockConditions)
  })

  if (!resolved) return null

  const validOptions = (resolved.options || []).filter(
    (opt): opt is { optionId: string; text: string; targetSceneId: string } =>
      typeof opt?.optionId === 'string' && typeof opt?.text === 'string' && typeof opt?.targetSceneId === 'string',
  )

  if (!validOptions.length) return null

  return {
    choiceId: resolved.choiceId!,
    options: validOptions.map(opt => ({
      optionId: opt.optionId,
      text: opt.text,
    })),
  }
}

// ---------------------------------------------------------------------------
// Pack Manifest Extractor
// ---------------------------------------------------------------------------

export function extractPackManifest(packPayload: unknown): {
  storyKey: string
  packVersion: string
  protocolVersion: string
} {
  const pack = packPayload as Record<string, unknown> | null
  const m = (pack?.manifest as Record<string, unknown>) ?? {}
  return {
    storyKey: (m.storyKey as string) || '',
    packVersion: (m.packVersion as string) || '1.0.0',
    protocolVersion: String(m.protocolVersionPin ?? m.schemaVersion ?? '1'),
  }
}

// ---------------------------------------------------------------------------
// Ending Detection from Event Signals
// ---------------------------------------------------------------------------

export function detectEndingFromEventSignals(
  proposals: GatewayTurnResponse['proposals'],
  pack: { endings?: Array<{ endingId: string; terminalSceneId?: string }> } | null,
  activeSceneId: string | null,
): string | null {
  if (!proposals || !pack?.endings?.length) return null
  const signals = proposals
    .flatMap(p => p.eventSignals ?? [])
    .filter((s): s is string => typeof s === 'string')

  // 1. "ending:happy_end" prefix convention
  for (const s of signals) {
    if (s.startsWith('ending:')) {
      const eid = s.slice(7)
      if (pack.endings.some(e => e.endingId === eid)) return eid
    }
  }
  // 2. terminalSceneId match + story_end signal
  if (activeSceneId) {
    for (const e of pack.endings) {
      if (e.terminalSceneId === activeSceneId &&
          (signals.includes('story_end') || signals.includes('ending_reached')))
        return e.endingId
    }
  }
  // 3. Direct endingId match
  for (const s of signals) {
    const match = pack.endings.find(e => e.endingId === s)
    if (match) return match.endingId
  }
  return null
}

// ---------------------------------------------------------------------------
// Apply Proposals (relationship + flags)
// ---------------------------------------------------------------------------

export function applyProposals(
  proposals: GatewayTurnResponse['proposals'],
  handlers: ProposalHandlers,
): void {
  if (!Array.isArray(proposals)) return

  for (const proposal of proposals) {
    // Apply flags
    if (Array.isArray(proposal.flagSet)) {
      handlers.setFlagsSet((prev) => {
        const next = new Set(prev)
        for (const flag of proposal.flagSet!) {
          next.add(flag)
        }
        return next
      })
    }

    // Apply relationship deltas
    if (Array.isArray(proposal.relationshipDelta)) {
      handlers.setRelationship((prev) => {
        const next = { ...prev }
        for (const delta of proposal.relationshipDelta!) {
          const key = `${delta.fromWho}->${delta.toWho}:${delta.trackKey}`
          const current = typeof next[key] === 'number' ? next[key] : 0
          next[key] = current + delta.delta
        }
        return next
      })
    }
  }
}
