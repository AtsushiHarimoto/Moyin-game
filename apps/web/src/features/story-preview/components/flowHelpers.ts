import type { Node, Edge } from '@xyflow/react'

import type { StoryPackNodeData } from './nodes/StoryPackNode'
import type { CharacterNodeData } from './nodes/CharacterNode'
import type { SceneNodeData } from './nodes/SceneNode'
import type { ChapterNodeData } from './nodes/ChapterNode'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_TYPES = {
  STORY_PACK: 'story-pack',
  CHAPTER: 'chapter',
  SCENE: 'scene',
} as const

const EDGE_TYPES = { NEON: 'neon' } as const

const LAYOUT = {

  HORIZONTAL_GAP: 400,
  VERTICAL_GAP: 120,
  GROUP_GAP: 240,
  INITIAL_Y: 200,
  /** Layer 0 (Root) x-position */
  LAYER_0_X: 120,
  /** Layer 1 (Chapters) x-position */
  LAYER_1_X: 520,
  /** Layer 2 (Scenes) x-position */
  LAYER_2_X: 920,
} as const

const UNASSIGNED_CHAPTER_ID = '__unassigned__'

// ---------------------------------------------------------------------------
// Shared JSON types (support both legacy and E2E formats)
// ---------------------------------------------------------------------------

/**
 * 用途：故事包 JSON 的頂層結構定義，支援 E2E 與 Legacy 雙格式
 */
export interface StoryPackJson {
  /** Legacy top-level storyKey */
  storyKey?: string
  /** Legacy top-level title */
  title?: string
  /** Legacy top-level version */
  version?: string
  /** E2E manifest block */
  manifest?: {
    storyKey: string
    packVersion?: string
    title: string
    version?: string
    author?: string
    [key: string]: unknown
  }
  characters?: CharacterJson[]
  scenes?: SceneJson[]
  chapters?: ChapterJson[]
  endings?: EndingJson[]
  lore?: {
    premise?: string
    worldSetting?: string
    tone?: string
    opening?: { introSceneId?: string }
    [key: string]: unknown
  }
  game?: {
    player?: { playerId?: string; displayName?: string; [key: string]: unknown }
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * 用途：角色資料結構
 */
export interface CharacterJson {
  /** E2E charId */
  charId?: string
  /** Legacy id */
  id?: string
  /** E2E displayName */
  displayName?: string
  /** Legacy name */
  name?: string
  personality?: string
  speechStyle?: string
  sprites?: Array<{ url: string; [key: string]: unknown }>
  [key: string]: unknown
}

/**
 * 用途：場景資料結構
 */
export interface SceneJson {
  /** E2E sceneId */
  sceneId?: string
  /** Legacy id */
  id?: string
  /** E2E title */
  title?: string
  /** Legacy name */
  name?: string
  /** E2E chapterId reference */
  chapterId?: string
  /** E2E active cast character IDs */
  activeCast?: string[]
  background?: string
  dialogues?: Array<Record<string, unknown>>
  [key: string]: unknown
}

/**
 * 用途：章節資料結構
 */
export interface ChapterJson {
  chapterId?: string
  /** Legacy id */
  id?: string
  title?: string
  /** Legacy name */
  name?: string
  sceneIds?: string[]
  entrySceneId?: string
  [key: string]: unknown
}

/**
 * 用途：結局資料結構
 */
export interface EndingJson {
  endingId?: string
  /** Legacy id */
  id?: string
  type?: string
  title?: string
  subtitle?: string
  terminalSceneId?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Node data types
// ---------------------------------------------------------------------------

export type { ChapterNodeData }

export type FlowNodeData =
  | StoryPackNodeData
  | CharacterNodeData
  | SceneNodeData
  | ChapterNodeData

/** 用途：型別守衛 — 根據 `type` 欄位判斷節點資料類型 */
export function isStoryPackData(data: unknown): data is StoryPackNodeData {
  return (data as Record<string, unknown>)?.type === 'story-pack'
}
export function isChapterData(data: unknown): data is ChapterNodeData {
  return (data as Record<string, unknown>)?.type === 'chapter'
}
export function isSceneData(data: unknown): data is SceneNodeData {
  return (data as Record<string, unknown>)?.type === 'scene'
}

// ---------------------------------------------------------------------------
// Normalisation helpers (legacy vs E2E)
// ---------------------------------------------------------------------------

/** Resolve the canonical ID for a character entry. */
function charId(c: CharacterJson): string {
  return c.charId ?? c.id ?? ''
}

/** Resolve the canonical display name for a character entry. */
function charName(c: CharacterJson): string {
  return c.displayName ?? c.name ?? charId(c)
}

/** Resolve the canonical ID for a scene entry. */
function sceneId(s: SceneJson): string {
  return s.sceneId ?? s.id ?? ''
}

/** Resolve the canonical display title for a scene entry. */
function sceneTitle(s: SceneJson): string {
  return s.title ?? s.name ?? sceneId(s)
}

/** Resolve the canonical ID for a chapter entry. */
function chapterId(ch: ChapterJson): string {
  return ch.chapterId ?? ch.id ?? ''
}

/** Resolve the canonical display title for a chapter entry. */
function chapterTitle(ch: ChapterJson): string {
  return ch.title ?? ch.name ?? chapterId(ch)
}

/**
 * Keep chapter nodes from collapsing onto the same y-position.
 */
function hasOverlap(candidate: number, placed: ReadonlyArray<number>, minGap: number): boolean {
  return placed.some((y) => Math.abs(y - candidate) < minGap)
}

function resolveChapterYWithoutOverlap(
  preferredY: number,
  placedChapterYs: ReadonlyArray<number>,
  minGap: number,
): number {
  if (!hasOverlap(preferredY, placedChapterYs, minGap)) {
    return preferredY
  }

  for (let step = 1; step <= 100; step++) {
    const downward = preferredY + step * minGap
    if (!hasOverlap(downward, placedChapterYs, minGap)) return downward

    const upward = preferredY - step * minGap
    if (!hasOverlap(upward, placedChapterYs, minGap)) return upward
  }

  return preferredY + minGap
}

// ---------------------------------------------------------------------------
// Public helper functions
// ---------------------------------------------------------------------------

/**
 * 用途：從角色列表中解析角色顯示名稱
 *
 * @param targetCharId 角色 ID
 * @param pack         故事包資料（含角色陣列）
 * @returns            角色顯示名稱，找不到時回傳 charId 本身
 */
export function resolveCharacterName(
  targetCharId: string,
  pack: StoryPackJson,
): string {
  const chars = pack.characters ?? []
  const found = chars.find((c) => charId(c) === targetCharId)
  return found ? charName(found) : targetCharId
}

/**
 * 用途：取得指定場景的所有相關結局
 *
 * @param targetSceneId 場景 ID
 * @param pack          故事包資料
 * @returns             結局陣列，無相關結局時回傳空陣列
 */
export function getEndingsForScene(
  targetSceneId: string,
  pack: StoryPackJson,
): EndingJson[] {
  const endings = pack.endings ?? []
  return endings.filter((e) => e.terminalSceneId === targetSceneId)
}

/**
 * 用途：檢查指定場景 ID 是否存在於故事包的場景列表中
 */
export function isSceneInPack(
  targetSceneId: string,
  pack: StoryPackJson,
): boolean {
  const scenes = pack.scenes ?? []
  return scenes.some((s) => sceneId(s) === targetSceneId)
}

/**
 * 用途：檢查指定角色 ID 是否存在於故事包的角色列表中
 */
export function isCharInPack(
  targetCharId: string,
  pack: StoryPackJson,
): boolean {
  const chars = pack.characters ?? []
  return chars.some((c) => charId(c) === targetCharId)
}

// ---------------------------------------------------------------------------
// jsonToFlow - Convert story JSON to React Flow 3-layer topology
// ---------------------------------------------------------------------------

/**
 * 用途：將故事包 JSON 轉換為 ReactFlow 三層拓撲結構（Root → Chapter → Scene）
 *
 * @param pack 故事包 JSON 資料
 * @returns    { nodes, edges } ReactFlow 節點與邊的陣列
 */
export function jsonToFlow(pack: StoryPackJson): {
  nodes: Node[]
  edges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const edgeIds = new Set<string>()

  // -- Normalise manifest ------------------------------------------------

  const manifest = pack.manifest ?? {
    storyKey: pack.storyKey ?? 'unknown',
    title: pack.title ?? 'Untitled',
    version: pack.version ?? '1.0.0',
  }

  const resolvedVersion =
    manifest.packVersion ?? manifest.version ?? pack.version ?? '1.0.0'

  // -- Build lookup maps -------------------------------------------------

  const characters = pack.characters ?? []
  const rawScenes = pack.scenes ?? []
  const rawChapters = pack.chapters ?? []

  // Normalize: assign collision-safe fallback IDs to entries lacking them
  const realSceneIds = new Set(rawScenes.map((s) => s.sceneId ?? s.id).filter((v): v is string => Boolean(v)))
  const realChapterIds = new Set(rawChapters.map((ch) => ch.chapterId ?? ch.id).filter((v): v is string => Boolean(v)))

  function makeFallbackAllocator(prefix: string, existing: Set<string>) {
    let seq = 0
    return function next(): string {
      let id: string
      do { id = `${prefix}${seq++}` } while (existing.has(id) && seq < 10_000)
      existing.add(id)
      return id
    }
  }

  const nextSceneId = makeFallbackAllocator('__anon_scene_', realSceneIds)
  const nextChapterId = makeFallbackAllocator('__anon_ch_', realChapterIds)

  const scenes = rawScenes.map((s): SceneJson => {
    if (s.sceneId ?? s.id) return s
    return { ...s, sceneId: nextSceneId() }
  })
  const chapters = rawChapters.map((ch): ChapterJson => {
    if (ch.chapterId ?? ch.id) return ch
    return { ...ch, chapterId: nextChapterId() }
  })

  const charLookup = new Map<string, CharacterJson>(
    characters.map((c) => [charId(c), c]),
  )
  const sceneLookup = new Map<string, SceneJson>(
    scenes.map((s) => [sceneId(s), s]),
  )

  // Track which scenes are assigned to at least one chapter
  const assignedSceneIds = new Set<string>()

  // -- Resolve chapter list (may include virtual "Unassigned") -----------

  interface ResolvedChapter {
    id: string
    title: string
    sceneIds: string[]
    entrySceneId: string | undefined
    isVirtual: boolean
  }

  const resolvedChapters: ResolvedChapter[] = []

  if (chapters.length > 0) {
    for (const ch of chapters) {
      const cid = chapterId(ch)
      const sids = ch.sceneIds ?? []
      for (const sid of sids) {
        assignedSceneIds.add(sid)
      }
      resolvedChapters.push({
        id: cid,
        title: chapterTitle(ch),
        sceneIds: sids,
        entrySceneId: ch.entrySceneId,
        isVirtual: false,
      })
    }

    // Collect unassigned scenes
    const unassigned = scenes
      .map((s) => sceneId(s))
      .filter((sid) => !assignedSceneIds.has(sid))

    if (unassigned.length > 0) {
      resolvedChapters.push({
        id: UNASSIGNED_CHAPTER_ID,
        title: 'Unassigned',
        sceneIds: unassigned,
        entrySceneId: undefined,
        isVirtual: true,
      })
    }
  } else {
    // No chapters defined -- put all scenes in a single virtual chapter
    resolvedChapters.push({
      id: UNASSIGNED_CHAPTER_ID,
      title: 'Unassigned',
      sceneIds: scenes.map((s) => sceneId(s)),
      entrySceneId: undefined,
      isVirtual: true,
    })
  }

  // -- Root node (Layer 0) -----------------------------------------------

  // Build valid entry scene IDs — only include entries within their own chapter's sceneIds (spec §6.1)
  const entrySceneIds = new Set<string>()
  const invalidEntryChapterIds = new Set<string>()
  for (const ch of resolvedChapters) {
    if (ch.entrySceneId) {
      if (ch.sceneIds.includes(ch.entrySceneId)) {
        entrySceneIds.add(ch.entrySceneId)
      } else {
        invalidEntryChapterIds.add(ch.id)
      }
    }
  }

  const rootData: StoryPackNodeData & {
    sceneCount: number
    chapterCount: number
    characterCount: number
  } = {
    type: 'story-pack',
    title: manifest.title,
    storyKey: manifest.storyKey,
    version: resolvedVersion,
    author: manifest.author as string | undefined,
    sceneCount: rawScenes.length,
    chapterCount: rawChapters.length,
    characterCount: characters.length,
  }

  nodes.push({
    id: 'root',
    type: NODE_TYPES.STORY_PACK,
    position: { x: LAYOUT.LAYER_0_X, y: LAYOUT.INITIAL_Y },
    data: rootData,
  })

  // -- Chapter + Scene nodes (Layers 1 & 2) ------------------------------

  let chapterY: number = LAYOUT.INITIAL_Y
  /** Running y-offset for scene placement across all chapter groups */
  let globalSceneY = LAYOUT.INITIAL_Y
  /** Track already-rendered scene node vertical positions for dedupe */
  const sceneNodeYById = new Map<string, number>()
  /** Track chapter y positions to prevent overlap on shared scene references */
  const chapterYPositions: number[] = []

  for (let chIdx = 0; chIdx < resolvedChapters.length; chIdx++) {
    const ch = resolvedChapters[chIdx]
    const chNodeId = `chapter-${ch.id}`
    const chapterSceneIds = Array.from(new Set(ch.sceneIds))
    const referencedSceneYs: number[] = []
    const sceneCountBeforeChapter = sceneNodeYById.size

    for (let sIdx = 0; sIdx < chapterSceneIds.length; sIdx++) {
      const sid = chapterSceneIds[sIdx]
      const scene = sceneLookup.get(sid)
      const sceneNodeId = `scene-${sid}`
      let sceneY = sceneNodeYById.get(sid)
      if (sceneY === undefined) {
        const isGhost = !scene
        const castIds = scene?.activeCast ?? []
        const castNames = castIds.map((cid: string) => {
          const c = charLookup.get(cid)
          return c ? charName(c) : cid
        })

        const sData: SceneNodeData & {
          isEntry: boolean
          isGhost: boolean
          activeCast: string[]
          activeCastNames: string[]
        } = {
          type: 'scene',
          id: sid,
          name: scene ? sceneTitle(scene) : sid,
          background: scene?.background,
          dialogueCount: scene?.dialogues?.length ?? 0,
          branchCount: 0,
          isEntry: entrySceneIds.has(sid),
          isGhost,
          activeCast: castIds,
          activeCastNames: castNames,
        }

        sceneY = globalSceneY
        nodes.push({
          id: sceneNodeId,
          type: NODE_TYPES.SCENE,
          position: { x: LAYOUT.LAYER_2_X, y: sceneY },
          data: sData,
        })
        sceneNodeYById.set(sid, sceneY)
        globalSceneY += LAYOUT.VERTICAL_GAP
      }

      referencedSceneYs.push(sceneY)

      // Edge: Chapter -> Scene (dedupe when chapter has repeated sceneIds)
      const chapterSceneEdgeId = `e-${chNodeId}-${sceneNodeId}`
      if (!edgeIds.has(chapterSceneEdgeId)) {
        edges.push({
          id: chapterSceneEdgeId,
          source: chNodeId,
          target: sceneNodeId,
          type: EDGE_TYPES.NEON,
        })
        edgeIds.add(chapterSceneEdgeId)
      }
    }

    // Position chapter by referenced scenes; fallback to current cursor
    if (referencedSceneYs.length > 0) {
      const minY = Math.min(...referencedSceneYs)
      const maxY = Math.max(...referencedSceneYs)
      chapterY = (minY + maxY) / 2
    } else {
      chapterY = globalSceneY
    }
    chapterY = resolveChapterYWithoutOverlap(
      chapterY,
      chapterYPositions,
      LAYOUT.VERTICAL_GAP,
    )
    chapterYPositions.push(chapterY)

    // -- Chapter node data --
    const chData: ChapterNodeData = {
      type: 'chapter',
      id: ch.id,
      title: ch.title,
      sceneCount: chapterSceneIds.length,
      entrySceneId: ch.entrySceneId,
      sceneIds: chapterSceneIds,
      hasInvalidEntry: invalidEntryChapterIds.has(ch.id),
      isVirtual: ch.isVirtual,
    }

    nodes.push({
      id: chNodeId,
      type: NODE_TYPES.CHAPTER,
      position: { x: LAYOUT.LAYER_1_X, y: chapterY },
      data: chData,
    })

    // Edge: Root -> Chapter
    const rootChapterEdgeId = `e-root-${chNodeId}`
    if (!edgeIds.has(rootChapterEdgeId)) {
      edges.push({
        id: rootChapterEdgeId,
        source: 'root',
        target: chNodeId,
        type: EDGE_TYPES.NEON,
      })
      edgeIds.add(rootChapterEdgeId)
    }

    // Add GROUP_GAP between chapter groups
    const chapterCreatedNewSceneNodes = sceneNodeYById.size > sceneCountBeforeChapter
    if (chIdx < resolvedChapters.length - 1 && chapterCreatedNewSceneNodes) {
      globalSceneY += LAYOUT.GROUP_GAP - LAYOUT.VERTICAL_GAP
    }
  }

  // Centre the root node vertically relative to all chapter nodes
  const chapterNodes = nodes.filter((n) => isChapterData(n.data))
  if (chapterNodes.length > 0) {
    const minY = Math.min(...chapterNodes.map((n) => n.position.y))
    const maxY = Math.max(...chapterNodes.map((n) => n.position.y))
    const rootNode = nodes.find((n) => n.id === 'root')
    if (rootNode) {
      rootNode.position.y = (minY + maxY) / 2
    }
  }

  return { nodes, edges }
}

// ---------------------------------------------------------------------------
// flowToJson - Sync edited flow back to story JSON
// ---------------------------------------------------------------------------

/**
 * 用途：將 ReactFlow 節點資料同步回故事包 JSON
 *
 * @param originalJson 原始故事包 JSON
 * @param nodes        ReactFlow 節點陣列
 * @returns            更新後的故事包 JSON 副本（不修改原始物件）
 */
export function flowToJson(
  originalJson: StoryPackJson,
  nodes: Node[],
): StoryPackJson {
  const updated = structuredClone(originalJson)

  for (const node of nodes) {
    const data = node.data as FlowNodeData

    switch (data.type) {
      case 'story-pack': {
        if (!updated.manifest) {
          updated.manifest = { storyKey: '', title: '', version: '1.0.0' }
        }
        updated.manifest.title = data.title
        updated.manifest.version = data.version
        updated.manifest.storyKey = data.storyKey
        if ('title' in updated) updated.title = data.title
        if ('version' in updated) updated.version = data.version
        if ('storyKey' in updated) updated.storyKey = data.storyKey
        break
      }

      case 'character': {
        if (!updated.characters) break
        const cData = data as CharacterNodeData & { originalId?: string }
        const originalId = cData.originalId ?? cData.id
        const idx = updated.characters.findIndex(
          (c) => (c.charId ?? c.id) === originalId,
        )
        if (idx !== -1) {
          const target = updated.characters[idx]
          // Sync to whichever key format exists
          if (target.charId !== undefined) {
            target.charId = cData.id
          } else {
            target.id = cData.id
          }
          if (target.displayName !== undefined) {
            target.displayName = cData.name
          } else {
            target.name = cData.name
          }
        }
        break
      }

      case 'chapter': {
        if (!updated.chapters) break
        const chData = data as ChapterNodeData
        if (chData.id === UNASSIGNED_CHAPTER_ID) break
        const idx = updated.chapters.findIndex(
          (ch) => (ch.chapterId ?? ch.id) === chData.id,
        )
        if (idx !== -1) {
          const target = updated.chapters[idx]
          if (target.title !== undefined) {
            target.title = chData.title
          } else {
            target.name = chData.title
          }
        }
        break
      }

      case 'scene': {
        if (!updated.scenes) break
        const sData = data as SceneNodeData & { originalId?: string }
        const originalId = sData.originalId ?? sData.id
        const idx = updated.scenes.findIndex(
          (s) => (s.sceneId ?? s.id) === originalId,
        )
        if (idx !== -1) {
          const target = updated.scenes[idx]
          // Sync to whichever key format exists
          if (target.sceneId !== undefined) {
            target.sceneId = sData.id
          } else {
            target.id = sData.id
          }
          if (target.title !== undefined) {
            target.title = sData.name
          } else {
            target.name = sData.name
          }
        }
        break
      }
    }
  }

  return updated
}
