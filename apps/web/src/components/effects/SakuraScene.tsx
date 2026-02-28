import { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  petalCount: 60,
  mouseRadius: 2.5,
  mouseStrength: 1.5,
  spawnWidth: 16,
  spawnHeight: 14,
  spawnDepth: 6,
}

// ─── Petal data (non-mesh state) ─────────────────────────────
interface PetalState {
  vx: number
  vy: number
  vz: number
  rx: number
  ry: number
  rz: number
  swayPhase: number
  swayFreq: number
  swayAmp: number
  fallSpeed: number
  windSensitivity: number
  baseOpacity: number
}

function createPetalState(): PetalState {
  return {
    vx: 0,
    vy: 0,
    vz: 0,
    rx: (Math.random() - 0.5) * 0.25,
    ry: (Math.random() - 0.5) * 0.15,
    rz: (Math.random() - 0.5) * 0.3,
    swayPhase: Math.random() * Math.PI * 2,
    swayFreq: 0.15 + Math.random() * 0.15,
    swayAmp: 0.1 + Math.random() * 0.15,
    fallSpeed: 0.1 + Math.random() * 0.08,
    windSensitivity: 0.15 + Math.random() * 0.15,
    baseOpacity: 0.75 + Math.random() * 0.15,
  }
}

function randomPosition(initialSpawn: boolean): [number, number, number] {
  const x = (Math.random() - 0.5) * CONFIG.spawnWidth
  const y = initialSpawn
    ? Math.random() * CONFIG.spawnHeight - 4
    : 8 + Math.random() * 2
  const z = (Math.random() - 0.5) * CONFIG.spawnDepth - 2
  return [x, y, z]
}

// ─── Petal geometry (shared) ─────────────────────────────────
function createPetalGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.08, 0.06, 0.12, 0.22, 0.07, 0.35)
  shape.bezierCurveTo(0.04, 0.42, 0, 0.45, 0, 0.45)
  shape.bezierCurveTo(0, 0.45, -0.04, 0.42, -0.07, 0.35)
  shape.bezierCurveTo(-0.12, 0.22, -0.08, 0.06, 0, 0)

  const geometry = new THREE.ShapeGeometry(shape, 5)
  const positions = geometry.attributes.position as THREE.BufferAttribute | undefined
  if (!positions) return geometry
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    positions.setZ(i, Math.sin((y / 0.45) * Math.PI) * 0.04)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

// ─── Petal texture (shared) ──────────────────────────────────
function createPetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 220, 230, 0.95)')
  gradient.addColorStop(0.6, 'rgba(244, 114, 182, 0.9)')
  gradient.addColorStop(1, 'rgba(219, 39, 119, 0.85)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 32, 32)

  return new THREE.CanvasTexture(canvas)
}

// ─── Single Petal component ──────────────────────────────────
function Petal({
  geometry,
  texture,
  state,
  initialPosition,
  mouseRef,
  windRef,
}: {
  geometry: THREE.ShapeGeometry
  texture: THREE.CanvasTexture
  state: PetalState
  initialPosition: [number, number, number]
  mouseRef: React.MutableRefObject<{ position: THREE.Vector3; active: boolean }>
  windRef: React.MutableRefObject<{ x: number; z: number }>
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const scaleValue = useMemo(() => 0.8 + Math.random() * 0.6, [])

  useFrame((frameState, delta) => {
    const dt = Math.min(delta, 0.05)
    const time = frameState.clock.getElapsedTime()
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return

    const pos = mesh.position
    const mouse = mouseRef.current
    const wind = windRef.current

    // Mouse repulsion
    if (mouse.active) {
      const dx = pos.x - mouse.position.x
      const dy = pos.y - mouse.position.y
      const dz = pos.z - mouse.position.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < CONFIG.mouseRadius && distance > 0.01) {
        const force =
          (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius
        const strength = force * force * CONFIG.mouseStrength
        const nx = dx / distance
        const ny = dy / distance
        const nz = dz / distance

        state.vx += nx * strength * dt * 10
        state.vy += ny * strength * dt * 10
        state.vz += nz * strength * dt * 10
      }
    }

    // Gravity
    state.vy -= state.fallSpeed * dt

    // Wind
    state.vx += wind.x * state.windSensitivity * dt
    state.vz += wind.z * state.windSensitivity * dt

    // Sway
    const sway =
      Math.sin(time * state.swayFreq + state.swayPhase) *
      state.swayAmp *
      dt
    state.vx += sway

    // Air resistance
    state.vx *= 0.95
    state.vy *= 0.98
    state.vz *= 0.95

    // Apply velocity
    pos.x += state.vx
    pos.y += state.vy
    pos.z += state.vz

    // Rotation
    mesh.rotation.x += state.rx * dt
    mesh.rotation.y += state.ry * dt
    mesh.rotation.z += state.rz * dt

    // Fade out near bottom
    if (pos.y < -4) {
      material.opacity = state.baseOpacity * Math.max(0, (pos.y + 7) / 3)
    } else {
      material.opacity = state.baseOpacity
    }

    // Reset when out of bounds
    if (pos.y < -7 || Math.abs(pos.x) > 12 || pos.z < -8) {
      const [nx, ny, nz] = randomPosition(false)
      pos.set(nx, ny, nz)
      state.vx = 0
      state.vy = 0
      state.vz = 0
      state.swayPhase = Math.random() * Math.PI * 2
      material.opacity = state.baseOpacity
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={initialPosition}
      rotation={[
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ]}
      scale={scaleValue}
    >
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        opacity={state.baseOpacity}
      />
    </mesh>
  )
}

// ─── Wind updater (runs each frame) ─────────────────────────
function WindUpdater({
  windRef,
}: {
  windRef: React.MutableRefObject<{ x: number; z: number }>
}) {
  const windState = useRef({
    targetX: 0,
    targetZ: 0,
    timer: 0,
  })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const ws = windState.current

    ws.timer += dt
    if (ws.timer > 8 + Math.random() * 6) {
      ws.timer = 0
      const strength = Math.random() > 0.75 ? 0.4 : 0.2
      ws.targetX = (Math.random() - 0.5) * strength
      ws.targetZ = (Math.random() - 0.5) * strength * 0.5
    }

    windRef.current.x += (ws.targetX - windRef.current.x) * 0.005
    windRef.current.z += (ws.targetZ - windRef.current.z) * 0.005
  })

  return null
}

// ─── Mouse interaction handler ──────────────────────────────
function MouseHandler({
  mouseRef,
}: {
  mouseRef: React.MutableRefObject<{ position: THREE.Vector3; active: boolean }>
}) {
  const planeRef = useRef<THREE.Mesh>(null!)

  const handlePointerMove = useCallback(
    (e: THREE.Event & { clientX?: number; clientY?: number; uv?: THREE.Vector2 }) => {
      if (!planeRef.current) return
      // The event from R3F gives us intersection point directly
      const intersection = (e as unknown as { point: THREE.Vector3 }).point
      if (intersection) {
        mouseRef.current.position.copy(intersection)
        mouseRef.current.active = true
      }
    },
    [mouseRef],
  )

  const handlePointerLeave = useCallback(() => {
    mouseRef.current.active = false
  }, [mouseRef])

  return (
    <mesh
      ref={planeRef}
      position={[0, 0, 0]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <planeGeometry args={[30, 20]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

// ─── Scene content ──────────────────────────────────────────
function SakuraSceneContent() {
  const geometry = useMemo(() => createPetalGeometry(), [])
  const texture = useMemo(() => createPetalTexture(), [])

  const mouseRef = useRef({ position: new THREE.Vector3(0, -100, 0), active: false })
  const windRef = useRef({ x: 0, z: 0 })

  const petals = useMemo(() => {
    return Array.from({ length: CONFIG.petalCount }, () => ({
      state: createPetalState(),
      position: randomPosition(true) as [number, number, number],
    }))
  }, [])

  return (
    <>
      <ambientLight intensity={1} />
      <WindUpdater windRef={windRef} />
      <MouseHandler mouseRef={mouseRef} />

      {petals.map((petal, i) => (
        <Petal
          key={i}
          geometry={geometry}
          texture={texture}
          state={petal.state}
          initialPosition={petal.position}
          mouseRef={mouseRef}
          windRef={windRef}
        />
      ))}
    </>
  )
}

// ─── Main exported component ────────────────────────────────
export default function SakuraScene() {
  return (
    <div className="pointer-events-auto absolute inset-0 z-[1] opacity-90">
      <Canvas
        camera={{ fov: 60, position: [0, 0, 6], near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        resize={{ scroll: false }}
        dpr={[1, 2]}
      >
        <SakuraSceneContent />
      </Canvas>
    </div>
  )
}
