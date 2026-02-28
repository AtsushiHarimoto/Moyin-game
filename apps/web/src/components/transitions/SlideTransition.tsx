import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right'

interface SlideTransitionProps {
  show: boolean
  direction?: Direction
  distance?: number
  duration?: number
  className?: string
  children: ReactNode
}

function getOffset(direction: Direction, distance: number): { x: number; y: number } {
  switch (direction) {
    case 'up':
      return { x: 0, y: distance }
    case 'down':
      return { x: 0, y: -distance }
    case 'left':
      return { x: distance, y: 0 }
    case 'right':
      return { x: -distance, y: 0 }
  }
}

export default function SlideTransition({
  show,
  direction = 'up',
  distance = 20,
  duration = 0.3,
  className,
  children,
}: SlideTransitionProps) {
  const offset = getOffset(direction, distance)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, x: offset.x, y: offset.y }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: offset.x, y: offset.y }}
          transition={{ duration, ease: [0.25, 0.8, 0.25, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
