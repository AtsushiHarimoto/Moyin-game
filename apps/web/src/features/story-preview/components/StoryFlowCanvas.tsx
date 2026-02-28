import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Node, OnNodesChange, OnEdgesChange } from '@xyflow/react'

import StoryPackNode from './nodes/StoryPackNode'
import CharacterNode from './nodes/CharacterNode'
import SceneNode from './nodes/SceneNode'
import ChapterNode from './nodes/ChapterNode'
import AssetGroupNode from './nodes/AssetGroupNode'
import NeonEdge from './edges/NeonEdge'
import EditPanel from './EditPanel'
import DetailPanel from './DetailPanel'
import { jsonToFlow, flowToJson } from './flowHelpers'
import type { StoryPackJson, FlowNodeData } from './flowHelpers'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryFlowCanvasProps {
  storyPack: StoryPackJson
  readOnly?: boolean
  onBack?: () => void
  onConfirm?: (editedJson: StoryPackJson) => void
}

// ---------------------------------------------------------------------------
// Custom node/edge type registrations
// ---------------------------------------------------------------------------

const NODE_TYPE_MAP = {
  'story-pack': StoryPackNode,
  character: CharacterNode,
  scene: SceneNode,
  chapter: ChapterNode,
  'asset-group': AssetGroupNode,
}

const EDGE_TYPE_MAP = {
  neon: NeonEdge,
}

// ---------------------------------------------------------------------------
// MiniMap colour lookup
// ---------------------------------------------------------------------------

const NODE_COLOR_MAP: Record<string, string> = {
  'story-pack': '#a855f7',
  chapter: '#6366f1',
  character: '#22c55e',
  scene: '#3b82f6',
}
const DEFAULT_NODE_COLOR = '#f59e0b'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * 用途：故事流程畫布元件，支援編輯模式與唯讀預覽模式
 *
 * @param storyPack 故事包 JSON 資料
 * @param readOnly  是否為唯讀模式（預設 false），唯讀時禁止拖曳/刪除/連接
 * @param onBack    返回/離開的回調函式
 * @param onConfirm 確認編輯的回調函式，傳入編輯後的 JSON
 */
export default function StoryFlowCanvas({
  storyPack,
  readOnly = false,
  onBack,
  onConfirm,
}: StoryFlowCanvasProps): React.JSX.Element {
  const { t } = useTranslation()
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => jsonToFlow(storyPack),
    [storyPack],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (readOnly) {
        const selectChanges = changes.filter((c) => c.type === 'select')
        if (selectChanges.length > 0) onNodesChange(selectChanges)
        return
      }
      onNodesChange(changes)
      setHasChanges(true)
    },
    [onNodesChange, readOnly],
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (readOnly) {
        const selectChanges = changes.filter((c) => c.type === 'select')
        if (selectChanges.length > 0) onEdgesChange(selectChanges)
        return
      }
      onEdgesChange(changes)
      setHasChanges(true)
    },
    [onEdgesChange, readOnly],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
    },
    [],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeUpdate = useCallback(
    (nodeId: string, changes: Record<string, unknown>) => {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) return node
          return { ...node, data: { ...node.data, ...changes } }
        }),
      )
      setHasChanges(true)
    },
    [setNodes],
  )

  const handleConfirm = useCallback(() => {
    const editedJson = flowToJson(storyPack, nodes)
    onConfirm?.(editedJson)
  }, [storyPack, nodes, onConfirm])

  const handleBack = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedDialog(true)
      return
    }
    onBack?.()
  }, [hasChanges, onBack])

  const handleConfirmLeave = useCallback(() => {
    setShowUnsavedDialog(false)
    onBack?.()
  }, [onBack])

  const projectTitle = storyPack.manifest?.title ?? storyPack.title ?? 'Untitled'

  return (
    <div className="flex h-screen w-full">
      {/* Main canvas */}
      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPE_MAP}
          edgeTypes={EDGE_TYPE_MAP}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          deleteKeyCode={readOnly ? null : 'Delete'}
          elementsSelectable
          fitView
          className="bg-[#0a0514]"
        >
          <Background color="#2a1845" gap={40} />
          <Controls className="!bg-[rgba(20,10,35,0.9)] !border-[#3b2166]" />
          <MiniMap
            nodeColor={(node) => {
              const nodeType = (node.data as FlowNodeData).type
              return (nodeType ? NODE_COLOR_MAP[nodeType] : undefined) ?? DEFAULT_NODE_COLOR
            }}
            className="!bg-[rgba(0,0,0,0.4)] !border-[#3b2166]"
          />
        </ReactFlow>

        {/* Top bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-6">
          <div className="pointer-events-auto flex items-center gap-6 rounded-full border border-white/10 bg-[rgba(20,10,35,0.85)] px-6 py-3 shadow-xl backdrop-blur-md">
            <span className="text-sm font-bold text-[#f3f0ff]">{readOnly ? t('message.flow_structure_preview') : t('message.flow_editor_mode')}</span>
            <span className="h-6 w-px bg-white/10" />
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
                {t('message.flow_project')}
              </div>
              <div className="text-xs text-gray-400">{projectTitle}</div>
            </div>
          </div>
        </div>

        {/* Bottom bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-6">
          <div className="pointer-events-auto flex items-center gap-6 rounded-full border border-white/10 bg-[rgba(20,10,35,0.85)] px-6 py-2.5 shadow-xl backdrop-blur-md">
            {readOnly ? (
              <button
                type="button"
                className="rounded-full border-none bg-pink-500 px-5 py-1.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105"
                onClick={onBack}
              >
                {t('message.btn_go_to_library')}
              </button>
            ) : (
              <>
                {hasChanges && (
                  <span className="flex items-center gap-2 text-sm text-amber-400">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
                    {t('message.flow_unsaved_changes')}
                  </span>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10"
                    onClick={handleBack}
                  >
                    {t('message.btn_back')}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border-none bg-pink-500 px-4 py-1.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleConfirm}
                  >
                    {t('message.flow_confirm_btn')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved changes confirmation dialog */}
      {showUnsavedDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowUnsavedDialog(false) }}
        >
          <div className="w-[360px] rounded-xl border border-[#3b2166] bg-[rgba(20,10,35,0.98)] p-6 shadow-2xl">
            <h3 className="m-0 mb-3 text-sm font-bold text-[#f3f0ff]">{t('message.flow_unsaved_confirm')}</h3>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10"
                onClick={() => setShowUnsavedDialog(false)}
              >
                {t('message.btn_cancel')}
              </button>
              <button
                type="button"
                className="rounded-lg border-none bg-pink-500 px-4 py-1.5 text-sm font-bold text-white transition-transform hover:scale-105"
                onClick={handleConfirmLeave}
              >
                {t('message.btn_leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side panel */}
      {readOnly ? (
        <DetailPanel
          selectedNode={selectedNode}
          storyPack={storyPack}
          onClose={() => setSelectedNode(null)}
        />
      ) : (
        <EditPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
        />
      )}
    </div>
  )
}
