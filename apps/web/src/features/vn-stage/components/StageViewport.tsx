import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { StageBackground } from './StageBackground'
import { CharacterLayer } from './CharacterLayer'
import { PixiRenderManager, type PixiRenderInstance } from '../runtime/PixiRenderManager'
import { PixiTextureManager } from '../runtime/PixiTextureManager'
import { PixiSceneManager } from '../runtime/PixiSceneManager'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StageViewportFrame {
  bgUrl: string
  characters?: Array<{
    id: string
    poseUrl: string
    position?: 'left' | 'center' | 'right'
  }>
}

interface StageViewportProps {
  frame: StageViewportFrame | null
  selectedCharacterId?: string | null
  onSelectCharacter?: (id: string) => void
  onClick?: () => void
  /** Content rendered inside the scene frame (dialogue box, char select, etc.) */
  frameOverlay?: ReactNode
  /** Content rendered outside the scene frame (modals, drawers, etc.) */
  children?: ReactNode
}

const PIXI_STAGE_KEY = 'vn-stage-main'
const pixiRenderManager = new PixiRenderManager()
const pixiTextureManager = new PixiTextureManager()
const pixiSceneManager = new PixiSceneManager()

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StageViewport({
  frame,
  selectedCharacterId,
  onSelectCharacter,
  onClick,
  frameOverlay,
  children,
}: StageViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderReadyRef = useRef<Promise<PixiRenderInstance> | null>(null)
  const pixiStageFrame = useMemo(
    () => ({
      bgUrl: frame?.bgUrl || '',
      characters: frame?.characters ?? [],
    }),
    [frame?.bgUrl, frame?.characters],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderReadyRef.current = pixiRenderManager.acquire(PIXI_STAGE_KEY, canvas)

    return () => {
      renderReadyRef.current = null
      pixiRenderManager.release(PIXI_STAGE_KEY)
      pixiSceneManager.clear()
      pixiTextureManager.clear()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const renderStage = async () => {
      if (!renderReadyRef.current) return
      const instance = await renderReadyRef.current
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const viewport = {
        width: Math.max(1, Math.round(rect.width || canvas.clientWidth || 1280)),
        height: Math.max(1, Math.round(rect.height || canvas.clientHeight || 720)),
      }

      const scene = await pixiSceneManager.loadScene({
        stageView: pixiStageFrame,
        textureManager: pixiTextureManager,
        viewport,
      })
      if (cancelled) return

      const sceneLayer = instance.layers.scene
      sceneLayer.removeChildren()
      sceneLayer.addChild(scene)
    }

    renderStage().catch((error) => {
      console.warn('[StageViewport] Pixi stage render failed:', error)
    })

    return () => {
      cancelled = true
    }
  }, [pixiStageFrame])

  return (
    <section
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-0"
      style={{ background: 'var(--ui-gradient-page-bg)' }}
      data-testid="vn-stage-viewport"
      onClick={onClick}
    >
      <div
        className="relative z-[1] h-full w-full overflow-hidden bg-transparent"
        data-testid="scene-frame"
      >
        {/* PixiJS stage canvas */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
          data-testid="pixi-stage"
        />

        <StageBackground bgUrl={frame?.bgUrl} />

        <CharacterLayer
          characters={frame?.characters}
          selectedId={selectedCharacterId}
          onSelect={onSelectCharacter}
        />

        {/* Inner Frame Overlay (dialogue box, char select, quick actions) */}
        {frameOverlay}
      </div>

      {/* HUD items rendered outside the frame to avoid overflow clipping */}
      {children}
    </section>
  )
}
