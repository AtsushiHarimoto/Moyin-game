import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

// ---------------------------------------------------------------------------
// Neon glow style
// ---------------------------------------------------------------------------

const NEON_STYLE: React.CSSProperties = {
  stroke: 'var(--ui-primary, #a855f7)',
  strokeWidth: 2,
  filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NeonEdge(props: EdgeProps): React.JSX.Element {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })

  return <BaseEdge path={edgePath} style={NEON_STYLE} />
}
