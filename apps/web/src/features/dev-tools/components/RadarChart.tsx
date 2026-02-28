import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RadarAxis {
  key: string
  label: string
  max: number
}

interface RadarSeries {
  key: string
  label: string
  color: string
  values: Record<string, number | null>
}

interface RadarChartProps {
  axes: RadarAxis[]
  series: RadarSeries[]
  className?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIEW_SIZE = 100
const CENTER = VIEW_SIZE / 2
const RADIUS = 34
const LABEL_OFFSET = 8
const GRID_LEVELS = [0.25, 0.5, 0.75, 1]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RadarChart({ axes, series, className }: RadarChartProps) {
  const axisAngles = useMemo(() => {
    const count = Math.max(axes.length, 1)
    return axes.map((_, i) => (Math.PI * 2 * i) / count - Math.PI / 2)
  }, [axes])

  const gridPolygonPoints = useMemo(
    () =>
      GRID_LEVELS.map((scale) =>
        axisAngles
          .map((angle) => {
            const x = CENTER + Math.cos(angle) * RADIUS * scale
            const y = CENTER + Math.sin(angle) * RADIUS * scale
            return `${x},${y}`
          })
          .join(' '),
      ),
    [axisAngles],
  )

  const seriesPolygons = useMemo(
    () =>
      series.map((serie) => {
        const points = axisAngles
          .map((angle, i) => {
            const axis = axes[i]
            const raw = serie.values[axis.key]
            const value = raw === null || raw === undefined ? 0 : raw
            const ratio = axis.max === 0 ? 0 : Math.min(1, value / axis.max)
            const x = CENTER + Math.cos(angle) * RADIUS * ratio
            const y = CENTER + Math.sin(angle) * RADIUS * ratio
            return `${x},${y}`
          })
          .join(' ')
        return { key: serie.key, color: serie.color, points }
      }),
    [axes, series, axisAngles],
  )

  const axisLabels = useMemo(
    () =>
      axisAngles.map((angle, i) => {
        const axis = axes[i]
        return {
          key: axis.key,
          label: axis.label,
          x: CENTER + Math.cos(angle) * (RADIUS + LABEL_OFFSET),
          y: CENTER + Math.sin(angle) * (RADIUS + LABEL_OFFSET),
        }
      }),
    [axes, axisAngles],
  )

  return (
    <div
      className={className}
      style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        role="img"
        aria-hidden="true"
      >
        {/* Grid rings */}
        <g>
          {gridPolygonPoints.map((points, i) => (
            <polygon
              key={`grid-${i}`}
              points={points}
              fill="transparent"
              stroke="var(--ui-border)"
              strokeWidth={0.6}
            />
          ))}
          {/* Axis lines */}
          {axisAngles.map((angle, i) => (
            <line
              key={`axis-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + Math.cos(angle) * RADIUS}
              y2={CENTER + Math.sin(angle) * RADIUS}
              stroke="var(--ui-border)"
              strokeWidth={0.6}
            />
          ))}
        </g>

        {/* Series fills */}
        <g>
          {seriesPolygons.map((s) => (
            <polygon
              key={s.key}
              points={s.points}
              fill={s.color}
              opacity={0.18}
            />
          ))}
          {seriesPolygons.map((s) => (
            <polygon
              key={`${s.key}-stroke`}
              points={s.points}
              fill="transparent"
              stroke={s.color}
              strokeWidth={1.4}
            />
          ))}
        </g>

        {/* Labels */}
        <g>
          {axisLabels.map((label) => (
            <text
              key={label.key}
              x={label.x}
              y={label.y}
              fill="var(--ui-muted)"
              fontSize={4}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}
