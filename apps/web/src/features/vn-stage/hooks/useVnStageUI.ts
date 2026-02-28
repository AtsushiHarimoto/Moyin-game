import { useMemo } from 'react'
import type { Frame } from '@moyin/vn-engine'
import type { VnEngineRuntime } from './useVnEngine'
import type { StageViewportFrame } from '../components/StageViewport'
import type { EndingInfo } from '../store'

// ---------------------------------------------------------------------------
// Local types for pack payload data extraction (packPayload is `unknown`)
// ---------------------------------------------------------------------------

type PackScene = {
  sceneId?: string
  activeCast?: string[]
  [key: string]: unknown
}

type PackEnding = {
  endingId?: string
  title?: string
  type?: string
  subtitle?: string
  [key: string]: unknown
}

export interface VnStageUIValues {
  phase: string
  currentFrame: Frame | null
  currentScene: PackScene | null
  dialogueCastIds: string[]
  talkTargets: string[]
  displaySpeaker: string
  speakerHighlightId: string | null
  showEndingPanel: boolean
  currentEndingInfo: EndingInfo | null
  stageFrame: StageViewportFrame
  hasDialogueTargets: boolean
  talkDisabledHint: string
}

export function useVnStageUI(
  runtime: VnEngineRuntime,
  t: (key: string, fallback?: string) => string,
): VnStageUIValues {
  const phase = runtime.phase
  const currentFrame = runtime.currentFrame
  const playerId = runtime.playerId || 'player'
  const excludePlayer = runtime.excludePlayerFromActiveCastUI

  const currentScene = useMemo(() => {
    const scenes = (runtime.packPayload as { scenes?: PackScene[] } | null)?.scenes
    return scenes?.find((s) => s.sceneId === runtime.activeSceneId) ?? null
  }, [runtime.packPayload, runtime.activeSceneId])

  const dialogueCastIds = useMemo(() => {
    const scene = currentScene
    const ids: string[] = scene?.activeCast?.length
      ? scene.activeCast
      : (runtime.stageView?.characters ?? []).map((p) => p.id)
    const unique = Array.from(new Set(ids || []))
    const npcIds = unique.filter(
      (id) => id && id !== playerId && runtime.charactersById[id],
    )
    if (!npcIds.length) return []
    const allowPlayer = !excludePlayer && unique.includes(playerId)
    return unique.filter((id) => {
      if (!id) return false
      if (id === playerId) return allowPlayer
      return Boolean(runtime.charactersById[id])
    })
  }, [currentScene, runtime.stageView, playerId, excludePlayer, runtime.charactersById])

  const talkTargets = useMemo(() => {
    const ids: string[] = currentScene?.activeCast ?? []
    const unique = Array.from(new Set(ids || []))
    return unique.filter(
      (id) => id && id !== playerId && runtime.charactersById[id],
    )
  }, [currentScene, playerId, runtime.charactersById])

  const displaySpeaker = useMemo(() => {
    const speaker = currentFrame?.speaker
    if (!speaker || speaker === 'NARRATOR' || speaker === '旁白') {
      return speaker ? t('message.vn_stage_narrator', 'Narrator') : ''
    }
    if (speaker === playerId) return t('message.vn_stage_player_default_name', 'You')
    return runtime.charactersById[speaker]?.displayName || '—'
  }, [currentFrame, playerId, runtime.charactersById, t])

  const speakerHighlightId = useMemo(() => {
    const speaker = currentFrame?.speaker
    if (speaker && dialogueCastIds.includes(speaker)) return speaker
    return null
  }, [currentFrame, dialogueCastIds])

  const showEndingPanel = useMemo(() => {
    return phase === 'ended' || (!!runtime.endingId && !currentFrame)
  }, [phase, runtime.endingId, currentFrame])

  const currentEndingInfo = useMemo(() => {
    const endingId = runtime.endingId
    if (!endingId) return null
    const endings = (runtime.packPayload as { endings?: PackEnding[] } | null)?.endings ?? []
    return endings.find((e) => e.endingId === endingId) ?? { title: 'The End', type: 'good' }
  }, [runtime.endingId, runtime.packPayload])

  const stageFrame = useMemo<StageViewportFrame>(() => {
    const view = runtime.stageView
    return {
      bgUrl: view?.bgUrl || '/img/school.png',
      characters: (view?.characters ?? []).map((portrait) => ({
        id: portrait.id,
        poseUrl: portrait.poseUrl || '/img/girl.png',
        position: portrait.position || 'center',
      })),
    }
  }, [runtime.stageView])

  const hasDialogueTargets = talkTargets.length > 0
  const talkDisabledHint = hasDialogueTargets ? '' : t('message.vn_stage_no_targets', 'No dialogue targets')

  return useMemo(() => ({
    phase,
    currentFrame,
    currentScene,
    dialogueCastIds,
    talkTargets,
    displaySpeaker,
    speakerHighlightId,
    showEndingPanel,
    currentEndingInfo,
    stageFrame,
    hasDialogueTargets,
    talkDisabledHint,
  }), [
    phase,
    currentFrame,
    currentScene,
    dialogueCastIds,
    talkTargets,
    displaySpeaker,
    speakerHighlightId,
    showEndingPanel,
    currentEndingInfo,
    stageFrame,
    hasDialogueTargets,
    talkDisabledHint,
  ])
}
