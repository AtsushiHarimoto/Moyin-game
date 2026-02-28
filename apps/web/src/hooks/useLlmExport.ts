import { useRef, useCallback } from 'react'
import { ExportService } from '@moyin/llm-sdk'
import type { ExportOptions, ExportResult, Result, LlmError } from '@moyin/llm-sdk'

/**
 * React hook wrapping the llm-sdk ExportService.
 * Provides a single `exportRecords` function that returns
 * a Result containing an ExportResult (Blob + metadata).
 */
export function useLlmExport() {
  const exporterRef = useRef<ExportService | null>(null)
  if (!exporterRef.current) exporterRef.current = new ExportService()

  /**
   * Export LLM records in the requested format.
   */
  const exportRecords = useCallback(
    async (options: ExportOptions): Promise<Result<ExportResult, LlmError>> => {
      return exporterRef.current!.export(options)
    },
    [],
  )

  return { exportRecords } as const
}
