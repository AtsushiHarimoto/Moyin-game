import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogEntry {
  id: string
  timestamp: string
  type: 'success' | 'error'
  request: Record<string, unknown>
  response: Record<string, unknown>
  latencyMs: number
  laneKey?: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'moyin_test_logs'
const MAX_LOGS = 50

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export function useLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const initialized = useRef(false)

  // Load logs from localStorage on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    try {
      const parsed: LogEntry[] = JSON.parse(stored)
      setLogs(parsed)
    } catch {
      // Corrupted storage — ignore
    }
  }, [])

  const persist = useCallback((entries: LogEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [])

  const addLog = useCallback(
    (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
      setLogs((prev) => {
        const newLog: LogEntry = {
          ...entry,
          id: generateId(),
          timestamp: new Date().toISOString(),
        }
        const next = [newLog, ...prev].slice(0, MAX_LOGS)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const clearLogs = useCallback(() => {
    setLogs([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const exportLogs = useCallback(() => {
    const dataStr = JSON.stringify(logs, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `moyin_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [logs])

  return { logs, addLog, clearLogs, exportLogs } as const
}
