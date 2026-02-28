import { useRef, useCallback } from 'react'
import { RecordingLayer } from '@moyin/llm-sdk'
import type { RecordQueryOptions, LLMRecord, QualityRating, Result, LlmError } from '@moyin/llm-sdk'

/**
 * React hook wrapping the llm-sdk RecordingLayer.
 * Provides record listing and manual rating capabilities.
 */
export function useLlmRecording() {
  const recorderRef = useRef<RecordingLayer | null>(null)
  if (!recorderRef.current) recorderRef.current = new RecordingLayer()

  /**
   * Retrieve a filtered list of LLM call records.
   */
  const listRecords = useCallback(
    async (options?: RecordQueryOptions): Promise<LLMRecord[]> => {
      return recorderRef.current!.list(options)
    },
    [],
  )

  /**
   * Attach a manual quality rating to an existing record.
   */
  const addManualRating = useCallback(
    async (
      recordId: string,
      score: 1 | 2 | 3 | 4 | 5,
      tags?: string[],
      notes?: string,
    ): Promise<Result<QualityRating, LlmError>> => {
      return recorderRef.current!.recordRating({ recordId, score, tags, notes })
    },
    [],
  )

  return { listRecords, addManualRating } as const
}
