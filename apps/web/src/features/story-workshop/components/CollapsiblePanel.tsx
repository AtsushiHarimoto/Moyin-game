import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CollapsiblePanelProps {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  className?: string
  headerClassName?: string
  children: React.ReactNode
  testId?: string
}

const COLLAPSE_TRANSITION = { duration: 0.2, ease: [0.4, 0, 0.2, 1] } as const

export function CollapsiblePanel({
  title,
  icon,
  defaultOpen = true,
  className,
  headerClassName,
  children,
  testId,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className={cn('flex flex-col overflow-hidden', className)}
      data-testid={testId}
    >
      <button
        type="button"
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors',
          'hover:bg-[color-mix(in_srgb,var(--ui-primary)_8%,transparent)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--ui-primary)]',
          headerClassName,
        )}
        style={{
          color: 'var(--ui-muted)',
          borderBottom: '1px solid var(--ui-border)',
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="flex-1 text-left">{title}</span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE_TRANSITION}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
