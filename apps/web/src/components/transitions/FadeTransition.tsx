import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface FadeTransitionProps {
  show: boolean
  duration?: number
  className?: string
  children: ReactNode
}

export default function FadeTransition({
  show,
  duration = 0.3,
  className,
  children,
}: FadeTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
