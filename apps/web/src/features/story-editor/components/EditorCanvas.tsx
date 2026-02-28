import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StageLayoutSlot, StageLayoutSpec, FxPresetSpec } from '../store'

interface EditorCanvasProps {
  layoutSpec: StageLayoutSpec
  selectedSlotId: string
  fxPreset?: FxPresetSpec | null
  perfTier?: 'low' | 'mid' | 'high'
  onSelectSlot: (id: string) => void
  onUpdateSlot: (payload: { id: string; offset?: { x: number; y: number }; size?: { widthPx?: number; heightPx?: number } }) => void
}

export default function EditorCanvas({
  layoutSpec,
  selectedSlotId,
  onSelectSlot,
  onUpdateSlot,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const pixiCanvasRef = useRef<HTMLCanvasElement>(null)
  const [, setDragging] = useState<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null)
  const [, setResizing] = useState<{ id: string; startX: number; startY: number; originW: number; originH: number } | null>(null)

  const viewport = useMemo(() => ({
    width: layoutSpec.viewport?.width ?? 1280,
    height: layoutSpec.viewport?.height ?? 720,
  }), [layoutSpec.viewport])

  const slots = useMemo(
    () => layoutSpec.layers.flatMap((layer) => layer.slots),
    [layoutSpec.layers],
  )

  const stageStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    aspectRatio: `${viewport.width} / ${viewport.height}`,
    position: 'relative',
    maxWidth: 960,
    background: 'var(--ui-panel, #1a1a2e)',
    borderRadius: 'var(--radius-md, 8px)',
    border: '1px solid var(--ui-border, #333)',
    boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,.15))',
    overflow: 'hidden',
  }), [viewport])

  const slotStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    slots.forEach((slot) => {
      const anchor = slot.anchor ?? 'center'
      const offsetX = slot.offset?.x ?? 0
      const offsetY = slot.offset?.y ?? 0
      const w = slot.size?.widthPx
      const h = slot.size?.heightPx
      const wPct = slot.size?.widthPct
      const hPct = slot.size?.heightPct

      const style: React.CSSProperties = {
        position: 'absolute',
        left: anchor.includes('right') ? undefined : `${offsetX}px`,
        right: anchor.includes('right') ? `${-offsetX}px` : undefined,
        top: anchor.includes('bottom') ? undefined : `${offsetY}px`,
        bottom: anchor.includes('bottom') ? `${-offsetY}px` : undefined,
        width: w ? `${w}px` : wPct ? `${wPct}%` : '200px',
        height: h ? `${h}px` : hPct ? `${hPct}%` : '200px',
      }
      styles[slot.id] = style
    })
    return styles
  }, [slots])

  // ---- Drag handlers ----
  const handleDrag = useCallback((e: PointerEvent) => {
    setDragging((prev) => {
      if (!prev) return prev
      const deltaX = e.clientX - prev.startX
      const deltaY = e.clientY - prev.startY
      onUpdateSlot({ id: prev.id, offset: { x: prev.originX + deltaX, y: prev.originY + deltaY } })
      return prev
    })
  }, [onUpdateSlot])

  const stopDrag = useCallback(() => {
    setDragging(null)
    window.removeEventListener('pointermove', handleDrag)
    window.removeEventListener('pointerup', stopDrag)
  }, [handleDrag])

  const startDrag = useCallback((e: React.PointerEvent, slot: StageLayoutSlot) => {
    if ((e.target as HTMLElement).classList.contains('editor-canvas__handle')) return
    setDragging({
      id: slot.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: slot.offset?.x ?? 0,
      originY: slot.offset?.y ?? 0,
    })
    window.addEventListener('pointermove', handleDrag)
    window.addEventListener('pointerup', stopDrag)
  }, [handleDrag, stopDrag])

  // ---- Resize handlers ----
  const handleResize = useCallback((e: PointerEvent) => {
    setResizing((prev) => {
      if (!prev) return prev
      const deltaX = e.clientX - prev.startX
      const deltaY = e.clientY - prev.startY
      onUpdateSlot({
        id: prev.id,
        size: {
          widthPx: Math.max(80, prev.originW + deltaX),
          heightPx: Math.max(80, prev.originH + deltaY),
        },
      })
      return prev
    })
  }, [onUpdateSlot])

  const stopResize = useCallback(() => {
    setResizing(null)
    window.removeEventListener('pointermove', handleResize)
    window.removeEventListener('pointerup', stopResize)
  }, [handleResize])

  const startResize = useCallback((e: React.PointerEvent, slot: StageLayoutSlot) => {
    e.stopPropagation()
    setResizing({
      id: slot.id,
      startX: e.clientX,
      startY: e.clientY,
      originW: slot.size?.widthPx ?? 200,
      originH: slot.size?.heightPx ?? 200,
    })
    window.addEventListener('pointermove', handleResize)
    window.addEventListener('pointerup', stopResize)
  }, [handleResize, stopResize])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleDrag)
      window.removeEventListener('pointerup', stopDrag)
      window.removeEventListener('pointermove', handleResize)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [handleDrag, stopDrag, handleResize, stopResize])

  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed p-4"
      style={{ background: 'var(--ui-panel-subtle, #111)' }}
    >
      <div ref={canvasRef} style={stageStyle}>
        <canvas
          ref={pixiCanvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none"
          data-testid="pixi-editor"
        />
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`cursor-move rounded-sm border p-1.5 box-border ${
              slot.id === selectedSlotId
                ? 'border-blue-500 shadow-lg'
                : 'border-blue-500/40'
            }`}
            style={{
              ...slotStyles[slot.id],
              background: slot.id === selectedSlotId
                ? 'rgba(59,130,246,0.15)'
                : 'rgba(59,130,246,0.07)',
            }}
            onPointerDown={(e) => startDrag(e, slot)}
            onClick={(e) => { e.stopPropagation(); onSelectSlot(slot.id) }}
          >
            <span className="text-xs text-gray-400">{slot.name}</span>
            <span
              className="editor-canvas__handle absolute right-1 bottom-1 h-3 w-3 cursor-nwse-resize rounded bg-blue-500"
              onPointerDown={(e) => startResize(e, slot)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
