/**
 * 品質評分器
 * 用途：提供自動品質評分（規則式）。
 */
import type { LlmResponse } from '../shared/llm-types'
import type { AutoScoreResult, QualityFlag } from './types'

const clampScore = (value: number): number => Math.max(0, Math.min(100, value))

/**
 * 類：QualityScorer
 * 用途：評估回應格式與內容品質。
 */
export class QualityScorer {
  /**
   * 自動評分
   * 用途：基於簡易規則估算品質分數
   *
   * @param response LLM 回應
   * @returns AutoScoreResult
   */
  autoScore(response: LlmResponse): AutoScoreResult {
    const frames = Array.isArray(response.frames) ? response.frames : []
    const text = frames.map((frame) => frame.text).join(' ')
    const totalLength = text.length

    const formatCompliance =
      frames.length > 0 && frames.every((frame) => typeof frame.text === 'string')
        ? 100
        : frames.length > 0
          ? 60
          : 0

    const responseLength =
      totalLength < 30 ? 30 : totalLength > 800 ? 50 : 100

    const characterConsistency = frames.some((frame) => !!frame.speaker) ? 80 : 60
    const contextRelevance =
      response.stageHints || (Array.isArray(response.proposals) && response.proposals.length)
        ? 80
        : 60
    const narrativeQuality = totalLength > 60 ? 80 : 60

    const flags: QualityFlag[] = []
    if (totalLength < 30) flags.push('too_short')
    if (totalLength > 800) flags.push('too_long')
    if (formatCompliance < 50) flags.push('format_error')

    const overall =
      (formatCompliance +
        characterConsistency +
        contextRelevance +
        narrativeQuality +
        responseLength) /
      5

    return {
      overall: clampScore(Math.round(overall)),
      dimensions: {
        formatCompliance: clampScore(formatCompliance),
        characterConsistency: clampScore(characterConsistency),
        contextRelevance: clampScore(contextRelevance),
        narrativeQuality: clampScore(narrativeQuality),
        responseLength: clampScore(responseLength)
      },
      flags,
      raw: response
    }
  }
}
