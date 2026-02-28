import { useRef, useCallback } from 'react'
import { QualityScorer } from '@moyin/llm-sdk'
import type { AutoScoreResult, LlmResponse } from '@moyin/llm-sdk'

/**
 * React hook wrapping the llm-sdk QualityScorer.
 * Provides rule-based automatic scoring of LLM responses.
 */
export function useLlmQuality() {
  const scorerRef = useRef<QualityScorer | null>(null)
  if (!scorerRef.current) scorerRef.current = new QualityScorer()

  /**
   * Compute an automatic quality score for the given LLM response.
   */
  const autoScore = useCallback(
    (response: LlmResponse): AutoScoreResult => {
      return scorerRef.current!.autoScore(response)
    },
    [],
  )

  return { autoScore } as const
}
