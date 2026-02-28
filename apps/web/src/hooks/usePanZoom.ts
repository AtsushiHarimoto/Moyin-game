import { useCallback, useMemo, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanZoomConfig {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
}

interface Point {
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<PanZoomConfig> = {
  minZoom: 0.25,
  maxZoom: 2,
  zoomStep: 0.1,
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePanZoom(config: PanZoomConfig = {}) {
  const { minZoom, maxZoom, zoomStep } = { ...DEFAULT_CONFIG, ...config }

  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoomRaw] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<Point>({ x: 0, y: 0 })

  // Computed values
  const transformStyle = useMemo(
    () => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: '0 0' as const,
    }),
    [pan, zoom],
  )

  const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom])

  // Clamp helper
  const clampZoom = useCallback(
    (value: number) => Math.max(minZoom, Math.min(maxZoom, value)),
    [minZoom, maxZoom],
  )

  // Pan handlers
  const startPan = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, input, textarea, a')) return

      setIsPanning(true)
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      }
    },
    [pan],
  )

  const onPan = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      e.preventDefault()
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      })
    },
    [isPanning],
  )

  const endPan = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Zoom handler
  const onZoom = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep
      setZoomRaw((prev) => clampZoom(prev + delta))
    },
    [zoomStep, clampZoom],
  )

  // Utility setters
  const setZoom = useCallback(
    (value: number) => setZoomRaw(clampZoom(value)),
    [clampZoom],
  )

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 })
    setZoomRaw(1)
  }, [])

  return {
    pan,
    zoom,
    isPanning,
    transformStyle,
    zoomPercent,
    startPan,
    onPan,
    endPan,
    onZoom,
    resetView,
    setZoom,
    setPan,
  } as const
}
