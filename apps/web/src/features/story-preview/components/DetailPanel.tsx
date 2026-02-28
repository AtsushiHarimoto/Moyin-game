import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Node } from '@xyflow/react'

import type { StoryPackJson, ChapterJson, FlowNodeData } from './flowHelpers'
import { resolveCharacterName, getEndingsForScene } from './flowHelpers'
import type { SceneNodeData } from './nodes/SceneNode'
import type { ChapterNodeData } from './nodes/ChapterNode'

interface DetailPanelProps {
  selectedNode: Node | null
  storyPack: StoryPackJson
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

function findChaptersForScene(targetSceneId: string, chapters: ChapterJson[]): ChapterJson[] {
  return chapters.filter((ch) => ch.sceneIds?.includes(targetSceneId))
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '...'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReadonlyField({ label, value, mono }: { label: string; value?: string; mono?: boolean }): React.JSX.Element {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-[#6d5091]">{label}</div>
      <div className={`text-sm text-[#f3f0ff] ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '\u2014'}
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="mb-3 mt-5 border-b border-[#3b2166] pb-1 text-xs uppercase tracking-wide text-[#a78bfa]">
      {title}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview content (selectedNode === null OR story-pack)
// ---------------------------------------------------------------------------

function OverviewContent({ storyPack }: { storyPack: StoryPackJson }): React.JSX.Element {
  const { t } = useTranslation()
  const characters = storyPack.characters ?? []
  const scenes = storyPack.scenes ?? []
  const chapters = storyPack.chapters ?? []
  const endings = storyPack.endings ?? []
  const sceneIdSet = useMemo(
    () => new Set(scenes.map((s) => s.sceneId ?? s.id).filter(Boolean)),
    [scenes],
  )

  return (
    <>
      <ReadonlyField label={t('message.flow_chapters')} value={String(chapters.length)} />
      <ReadonlyField label={t('message.flow_scenes')} value={String(scenes.length)} />
      <ReadonlyField label={t('message.flow_characters')} value={String(characters.length)} />
      <ReadonlyField label={t('message.flow_endings')} value={String(endings.length)} />

      {characters.length > 0 && (
        <>
          <SectionHeader title={t('message.flow_characters')} />
          {characters.map((char, i) => {
            const charName = char.displayName ?? char.name ?? char.charId ?? char.id ?? 'Unknown'
            const personality = char.personality ? truncate(char.personality, 60) : undefined
            return (
              <div key={char.charId ?? char.id ?? i} className="mb-3">
                <div className="text-sm font-semibold text-[#f3f0ff]">{charName}</div>
                {personality && <div className="mt-0.5 text-xs text-[#6d5091]">{personality}</div>}
              </div>
            )
          })}
        </>
      )}

      {endings.length > 0 && (
        <>
          <SectionHeader title={t('message.flow_endings')} />
          {endings.map((ending, i) => {
            const endingTitle = ending.title ?? ending.endingId ?? ending.id ?? 'Untitled'
            const endingType = ending.type
            const terminal = ending.terminalSceneId
            const terminalMissing = terminal != null && !sceneIdSet.has(terminal)
            return (
              <div key={ending.endingId ?? ending.id ?? i} className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#f3f0ff]">{endingTitle}</span>
                  {endingType && (
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-[#a78bfa]">
                      {endingType}
                    </span>
                  )}
                </div>
                {terminal && (
                  <div className={`mt-0.5 font-mono text-xs ${terminalMissing ? 'text-amber-400' : 'text-[#6d5091]'}`}>
                    {terminalMissing && <span aria-hidden="true">{'\u26a0'} </span>}
                    -&gt; {terminal}
                    {terminalMissing && (
                      <span className="ml-1 font-sans text-amber-400/70">{t('message.flow_warn_missing_terminal')}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Scene detail content
// ---------------------------------------------------------------------------

function SceneDetailContent({ node, storyPack }: { node: Node; storyPack: StoryPackJson }): React.JSX.Element {
  const { t } = useTranslation()
  const chapters = useMemo(() => storyPack.chapters ?? [], [storyPack.chapters])
  const charIdSet = useMemo(
    () => new Set((storyPack.characters ?? []).map((c) => c.charId ?? c.id).filter(Boolean)),
    [storyPack.characters],
  )
  const data = node.data as SceneNodeData
  const nodeSceneId = data.id ?? ''
  const sceneTitle = data.name ?? nodeSceneId
  const description = data.description
  const activeCast = data.activeCast ?? []

  const matchedChapters = useMemo(() => findChaptersForScene(nodeSceneId, chapters), [nodeSceneId, chapters])
  const relatedEndings = useMemo(() => getEndingsForScene(nodeSceneId, storyPack), [nodeSceneId, storyPack])

  const chapterLabel = matchedChapters.length > 0
    ? matchedChapters.map((ch) => ch.title ?? ch.name ?? ch.chapterId ?? ch.id ?? 'Unknown').join(', ')
    : '\u2014'

  return (
    <>
      <ReadonlyField label={t('message.flow_title')} value={sceneTitle} />
      <ReadonlyField label={t('message.flow_lbl_id')} value={nodeSceneId} mono />
      <ReadonlyField label={t('message.flow_lbl_chapter')} value={chapterLabel} />
      {description && <ReadonlyField label={t('message.flow_lbl_description')} value={description} />}

      <SectionHeader title={t('message.flow_active_cast')} />
      {activeCast.length > 0 ? (
        activeCast.map((cid) => {
          const charName = resolveCharacterName(cid, storyPack)
          const isMissing = !charIdSet.has(cid)
          return (
            <div key={cid} className={`mb-2 text-sm ${isMissing ? 'text-amber-400' : 'text-[#f3f0ff]'}`}>
              {isMissing && <span aria-hidden="true">{'\u26a0'} </span>}
              {charName}
              {charName !== cid && (
                <span className="ml-2 font-mono text-xs text-[#6d5091]">({cid})</span>
              )}
              {isMissing && (
                <span className="ml-1 text-xs text-amber-400/70">{t('message.flow_warn_unknown_char')}</span>
              )}
            </div>
          )
        })
      ) : (
        <div className="text-sm text-[#6d5091]">{t('message.flow_none')}</div>
      )}

      <SectionHeader title={t('message.flow_related_endings')} />
      {relatedEndings.length > 0 ? (
        relatedEndings.map((ending, i) => (
          <div key={ending.endingId ?? ending.id ?? i} className="mb-2 text-sm text-[#f3f0ff]">
            {ending.title ?? ending.endingId ?? ending.id ?? 'Untitled'}
          </div>
        ))
      ) : (
        <div className="text-sm text-[#6d5091]">{t('message.flow_none')}</div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Chapter detail content
// ---------------------------------------------------------------------------

function ChapterDetailContent({ node, storyPack }: { node: Node; storyPack: StoryPackJson }): React.JSX.Element {
  const { t } = useTranslation()
  const scenes = useMemo(() => storyPack.scenes ?? [], [storyPack.scenes])
  const data = node.data as ChapterNodeData
  const nodeChapterId = data.id ?? ''
  const chapterTitle = data.title ?? nodeChapterId
  const entrySceneId = data.entrySceneId
  const hasInvalidEntry = data.hasInvalidEntry === true
  const sceneIds = data.sceneIds ?? []
  const resolvedScenes = sceneIds.map((sid) => {
    const scene = scenes.find((s) => (s.sceneId ?? s.id) === sid)
    return { id: sid, title: scene?.title ?? scene?.name ?? sid }
  })

  return (
    <>
      <ReadonlyField label={t('message.flow_title')} value={chapterTitle} />
      <ReadonlyField label={t('message.flow_lbl_id')} value={nodeChapterId} mono />
      <ReadonlyField label={t('message.flow_entry_scene')} value={entrySceneId ?? '\u2014'} mono />
      {hasInvalidEntry && entrySceneId && (
        <div className="mb-3 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
          {'\u26a0'} {t('message.flow_warn_invalid_entry')}
        </div>
      )}
      <ReadonlyField label={t('message.flow_scenes')} value={String(sceneIds.length)} />

      <SectionHeader title={t('message.flow_scene_list')} />
      {resolvedScenes.length > 0 ? (
        resolvedScenes.map((scene, i) => (
          <div key={scene.id} className="mb-2 text-sm text-[#f3f0ff]">
            <span className="mr-2 text-xs text-[#6d5091]">{i + 1}.</span>
            {scene.title}
          </div>
        ))
      ) : (
        <div className="text-sm text-[#6d5091]">{t('message.flow_none')}</div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// DetailPanel — Main component
// ---------------------------------------------------------------------------

/**
 * 用途：唯讀側邊面板，顯示選中節點的詳細資訊（場景/章節/總覽模式）
 *
 * @param selectedNode 當前選中的 ReactFlow 節點，null 時顯示總覽
 * @param storyPack    故事包資料，用於解析角色名稱與結局
 * @param onClose      關閉面板的回調函式
 */
export default function DetailPanel({ selectedNode, storyPack, onClose }: DetailPanelProps): React.JSX.Element {
  const { t } = useTranslation()

  const NODE_TYPE_LABELS: Record<string, string> = {
    'story-pack': t('message.flow_story_overview'),
    chapter: t('message.flow_chapter_details'),
    scene: t('message.flow_scene_details'),
  }

  const nodeType = selectedNode
    ? (selectedNode.data as FlowNodeData).type ?? null
    : null
  const typeLabel = nodeType ? (NODE_TYPE_LABELS[nodeType] ?? t('message.flow_details')) : t('message.flow_story_overview')
  const isOverview = !selectedNode || nodeType === 'story-pack'
  const isScene = nodeType === 'scene'
  const isChapter = nodeType === 'chapter'

  return (
    <div role="complementary" aria-label={t('message.flow_details')} className="flex w-[300px] flex-col border-l border-[#3b2166] bg-[rgba(20,10,35,0.98)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#3b2166] p-4">
        <span className="flex-1 text-sm font-semibold text-[#f3f0ff]">{typeLabel}</span>
        <button
          type="button"
          className="border-none bg-transparent p-1 text-[#6d5091] transition-colors hover:text-purple-500"
          onClick={onClose}
          aria-label={t('message.close')}
        >
          {'\u2715'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isOverview && <OverviewContent storyPack={storyPack} />}
        {isScene && selectedNode && <SceneDetailContent node={selectedNode} storyPack={storyPack} />}
        {isChapter && selectedNode && <ChapterDetailContent node={selectedNode} storyPack={storyPack} />}
      </div>
    </div>
  )
}
