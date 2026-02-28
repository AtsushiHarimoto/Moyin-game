import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

// ─── Brand Colors ──────────────────────────────────────
const C = {
  sakuraPink: '#ffc0d3',
  darkSakura: '#e8b4d4',
  darkViolet: '#1a1625',
  lightViolet: '#2d2433',
  skin: '#ffe0d0',
  skinShadow: '#f0c8b8',
  hairDark: '#2d1f3d',
  hairHighlight: '#e8b4d4',
  eyeWhite: '#ffffff',
  eyeIris: '#8844aa',
  eyePupil: '#1a1020',
  lipPink: '#ff8fab',
  blush: '#ffaac4',
}

// ─── Head ──────────────────────────────────────────────
function Head() {
  return (
    <group position={[0, 1.05, 0]}>
      {/* Main head */}
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={C.skin} roughness={0.7} />
      </mesh>

      {/* Eyes */}
      <group position={[0, 0.02, 0.24]}>
        {/* Left eye */}
        <group position={[-0.1, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color={C.eyeWhite} />
          </mesh>
          <mesh position={[0, -0.01, 0.04]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color={C.eyeIris} />
          </mesh>
          <mesh position={[0, -0.01, 0.06]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color={C.eyePupil} />
          </mesh>
          <mesh position={[0.02, 0.02, 0.065]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>

        {/* Right eye */}
        <group position={[0.1, 0, 0]}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color={C.eyeWhite} />
          </mesh>
          <mesh position={[0, -0.01, 0.04]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color={C.eyeIris} />
          </mesh>
          <mesh position={[0, -0.01, 0.06]}>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color={C.eyePupil} />
          </mesh>
          <mesh position={[-0.02, 0.02, 0.065]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      </group>

      {/* Blush */}
      <mesh position={[-0.18, -0.04, 0.2]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={C.blush}
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh position={[0.18, -0.04, 0.2]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={C.blush}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, -0.1, 0.28]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.03, 0.006, 8, 16, Math.PI]} />
        <meshStandardMaterial color={C.lipPink} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.02, 0.3]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={C.skinShadow} />
      </mesh>
    </group>
  )
}

// ─── Hair ──────────────────────────────────────────────
function Hair() {
  return (
    <group position={[0, 1.05, 0]}>
      {/* Hair cap */}
      <mesh position={[0, 0.1, 0]} scale={[1.1, 0.9, 1.05]}>
        <sphereGeometry
          args={[0.33, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]}
        />
        <meshStandardMaterial color={C.hairDark} roughness={0.6} />
      </mesh>

      {/* Bangs */}
      {[-0.15, -0.07, 0, 0.07, 0.15].map((x, i) => (
        <mesh
          key={`bang-${i}`}
          position={[x, 0.15, 0.28]}
          rotation={[0.3, 0, x * 0.5]}
        >
          <capsuleGeometry args={[0.04, 0.15, 4, 8]} />
          <meshStandardMaterial
            color={i === 2 ? C.hairHighlight : C.hairDark}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Side hair – left */}
      <mesh position={[-0.3, -0.15, 0.05]} rotation={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color={C.hairDark} roughness={0.5} />
      </mesh>
      <mesh position={[-0.25, -0.3, 0.1]} rotation={[0.1, 0, 0.1]}>
        <capsuleGeometry args={[0.04, 0.4, 4, 8]} />
        <meshStandardMaterial color={C.hairHighlight} roughness={0.5} />
      </mesh>

      {/* Side hair – right */}
      <mesh position={[0.3, -0.15, 0.05]} rotation={[0, 0, -0.15]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color={C.hairDark} roughness={0.5} />
      </mesh>
      <mesh position={[0.25, -0.3, 0.1]} rotation={[0.1, 0, -0.1]}>
        <capsuleGeometry args={[0.04, 0.4, 4, 8]} />
        <meshStandardMaterial color={C.hairHighlight} roughness={0.5} />
      </mesh>

      {/* Back hair */}
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh
          key={`back-${i}`}
          position={[x, -0.3, -0.2]}
          rotation={[0.2, 0, x * 0.3]}
        >
          <capsuleGeometry args={[0.05, 0.7, 4, 8]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? C.hairDark : C.hairHighlight}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Hair clips */}
      <mesh position={[-0.28, 0.1, 0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.28, 0.1, 0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  )
}

// ─── Torso & Outfit ────────────────────────────────────
function Torso() {
  return (
    <group position={[0, 0.35, 0]}>
      {/* Neck */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.12, 16]} />
        <meshStandardMaterial color={C.skin} roughness={0.7} />
      </mesh>

      {/* Upper torso */}
      <mesh position={[0, 0.22, 0]} scale={[1, 1, 0.7]}>
        <capsuleGeometry args={[0.18, 0.15, 8, 16]} />
        <meshStandardMaterial
          color={C.darkViolet}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Chest contour */}
      <mesh position={[-0.08, 0.25, 0.08]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={C.darkViolet}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0.08, 0.25, 0.08]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={C.darkViolet}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Waist */}
      <mesh position={[0, 0.05, 0]} scale={[1, 1, 0.7]}>
        <cylinderGeometry args={[0.14, 0.12, 0.15, 16]} />
        <meshStandardMaterial
          color={C.darkViolet}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Tech belt */}
      <mesh position={[0, 0, 0]} scale={[1, 1, 0.75]}>
        <torusGeometry args={[0.13, 0.015, 8, 32]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Skirt */}
      <mesh position={[0, -0.12, 0]} scale={[1, 1, 0.8]}>
        <coneGeometry args={[0.25, 0.3, 16, 1, true]} />
        <meshStandardMaterial
          color={C.lightViolet}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Skirt hem accent */}
      <mesh position={[0, -0.2, 0]} scale={[1, 1, 0.85]}>
        <torusGeometry args={[0.22, 0.01, 8, 32]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Neckline accent */}
      <mesh position={[0, 0.32, 0.12]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.06, 0.008, 8, 16, Math.PI]} />
        <meshStandardMaterial
          color={C.darkSakura}
          emissive={C.darkSakura}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Shoulder accents */}
      <mesh position={[-0.2, 0.35, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.3}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0.2, 0.35, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={0.3}
          metalness={0.5}
        />
      </mesh>
    </group>
  )
}

// ─── Arms ──────────────────────────────────────────────
function Arms() {
  return (
    <group position={[0, 0.35, 0]}>
      {/* Left arm – raised */}
      <group position={[-0.25, 0.3, 0]} rotation={[0, 0, 0.8]}>
        <mesh>
          <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
          <meshStandardMaterial color={C.skin} roughness={0.7} />
        </mesh>
        <group position={[0, 0.2, 0]} rotation={[0, 0, -0.5]}>
          <mesh>
            <capsuleGeometry args={[0.035, 0.18, 4, 8]} />
            <meshStandardMaterial color={C.skin} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.04, 0.008, 8, 16]} />
            <meshStandardMaterial
              color={C.sakuraPink}
              emissive={C.sakuraPink}
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={C.skin} roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Right arm – different pose */}
      <group position={[0.25, 0.3, 0]} rotation={[-0.2, 0, -1.0]}>
        <mesh>
          <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
          <meshStandardMaterial color={C.skin} roughness={0.7} />
        </mesh>
        <group position={[0, 0.2, 0]} rotation={[0.3, 0, 0.3]}>
          <mesh>
            <capsuleGeometry args={[0.035, 0.18, 4, 8]} />
            <meshStandardMaterial color={C.skin} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.04, 0.008, 8, 16]} />
            <meshStandardMaterial
              color={C.sakuraPink}
              emissive={C.sakuraPink}
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={C.skin} roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ─── Legs ──────────────────────────────────────────────
function Legs() {
  return (
    <group position={[0, -0.05, 0]}>
      {/* Left leg */}
      <group position={[-0.08, 0, 0]} rotation={[0, 0, 0.05]}>
        <mesh position={[0, -0.05, 0]}>
          <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
          <meshStandardMaterial color={C.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.045, 0.25, 4, 8]} />
          <meshStandardMaterial
            color={C.darkViolet}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <torusGeometry args={[0.05, 0.006, 8, 16]} />
          <meshStandardMaterial
            color={C.sakuraPink}
            emissive={C.sakuraPink}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, -0.48, 0.02]} scale={[1, 0.6, 1.3]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial
            color={C.darkViolet}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
      </group>

      {/* Right leg */}
      <group position={[0.08, 0, 0]} rotation={[0, 0, -0.05]}>
        <mesh position={[0, -0.05, 0]}>
          <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
          <meshStandardMaterial color={C.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.045, 0.25, 4, 8]} />
          <meshStandardMaterial
            color={C.darkViolet}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <torusGeometry args={[0.05, 0.006, 8, 16]} />
          <meshStandardMaterial
            color={C.sakuraPink}
            emissive={C.sakuraPink}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, -0.48, 0.02]} scale={[1, 0.6, 1.3]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial
            color={C.darkViolet}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
      </group>
    </group>
  )
}

// ─── Holographic Pom-Pom ───────────────────────────────
function PomPom({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05)
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshPhysicalMaterial
          color={C.sakuraPink}
          emissive={C.sakuraPink}
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1}
        />
      </mesh>

      {/* Holographic shell */}
      <mesh>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshPhysicalMaterial
          color={C.darkSakura}
          emissive={C.darkSakura}
          emissiveIntensity={0.8}
          transparent
          opacity={0.25}
          roughness={0}
          metalness={0.8}
          clearcoat={1}
          iridescence={1}
          iridescenceIOR={2.5}
        />
      </mesh>

      <Sparkles count={15} size={2} scale={0.4} speed={0.5} color={C.sakuraPink} />
    </group>
  )
}

// ─── Character assembly with idle animation ────────────
function MobisCharacter() {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.03
  })

  return (
    <group ref={groupRef}>
      <Head />
      <Hair />
      <Torso />
      <Arms />
      <Legs />
      <PomPom position={[-0.55, 1.15, 0.1]} />
      <PomPom position={[0.5, 0.9, 0.15]} />
    </group>
  )
}

// ─── Scene ─────────────────────────────────────────────
function MobisSceneContent() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 3, 4]} intensity={1} />
      <pointLight position={[-2, 1, 3]} intensity={0.5} color={C.sakuraPink} />
      <spotLight
        position={[0, 4, 3]}
        angle={0.5}
        penumbra={0.5}
        intensity={0.8}
        color={C.darkSakura}
      />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <MobisCharacter />
      </Float>

      <Sparkles
        count={40}
        size={3}
        scale={[3, 4, 2]}
        speed={0.3}
        color={C.sakuraPink}
        opacity={0.6}
      />
    </>
  )
}

// ─── Exported component ────────────────────────────────
export default function MobisWebGLAvatar() {
  return (
    <div className="fixed bottom-6 left-6 z-50 h-80 w-64">
      <Canvas
        camera={{ fov: 45, position: [0, 0.5, 3.5], near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <MobisSceneContent />
      </Canvas>
    </div>
  )
}
