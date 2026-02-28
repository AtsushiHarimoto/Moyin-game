import { useEffect, useRef } from 'react'

/**
 * MatrixRain - "Hacker Terminal" canvas background effect.
 * Renders falling matrix-style characters on a 2D canvas.
 */

const FONT_SIZE = 16
const CHARS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ23456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(
    '',
  )

export default function MatrixRain() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const dropsRef = useRef<number[]>([])
  const frameIdRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    container.appendChild(canvas)
    canvasRef.current = canvas

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx

    function initMatrix() {
      const cols = Math.floor(canvas.width / FONT_SIZE)
      const drops: number[] = []
      for (let i = 0; i < cols; i++) {
        drops[i] = Math.random() * -100
      }
      dropsRef.current = drops
    }

    function draw() {
      const ctx = ctxRef.current
      if (!ctx || !canvasRef.current) return

      // Fading trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${FONT_SIZE}px monospace`
      const drops = dropsRef.current

      for (let i = 0; i < drops.length; i++) {
        const text = CHARS[Math.floor(Math.random() * CHARS.length)] ?? 'A'
        const x = i * FONT_SIZE
        const drop = drops[i] ?? 0
        const y = drop * FONT_SIZE

        ctx.save()
        if (Math.random() > 0.95) {
          ctx.fillStyle = '#fff'
          ctx.shadowColor = '#fff'
          ctx.shadowBlur = 12
        } else {
          ctx.fillStyle = '#00ff41'
          ctx.shadowColor = '#00ff41'
          ctx.shadowBlur = 8
        }
        ctx.fillText(text, x, y)
        ctx.restore()

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i] = (drops[i] ?? 0) + 1
      }

      frameIdRef.current = requestAnimationFrame(draw)
    }

    function handleResize() {
      if (!canvasRef.current) return
      canvasRef.current.width = window.innerWidth
      canvasRef.current.height = window.innerHeight
      initMatrix()
    }

    initMatrix()
    draw()
    window.addEventListener('resize', handleResize)

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current)
      }
      window.removeEventListener('resize', handleResize)
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current)
      }
      canvasRef.current = null
      ctxRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0"
      style={{ background: 'transparent' }}
    />
  )
}
