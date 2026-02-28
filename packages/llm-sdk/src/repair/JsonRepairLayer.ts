/**
 * JSON 修復層
 * 用途：修復 LLM 回應中的 JSON 格式問題並驗證 Schema。
 */
import type { LlmResponse } from '../shared/llm-types'
import { createLlmError, type LlmError } from '../shared/errors'
import { err, ok, isErr, type Result } from '../shared/result'
import { validateGameSchema } from './validator'
import { extractJsonBlock } from './strategies/extractJsonBlock'
import { fixTrailingComma } from './strategies/fixTrailingComma'
import { fixUnclosedBrackets } from './strategies/fixBrackets'
import { fixSmartQuotes } from './strategies/fixQuotes'
import type { RepairAction, RepairResult } from './types'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/**
 * 類：JsonRepairLayer
 * 用途：提供 JSON 修復與 Schema 驗證能力。
 */
export class JsonRepairLayer {
  /**
   * 修復 JSON 字串並回傳解析結果
   * 用途：嘗試修復常見 JSON 問題並通過 Schema 驗證
   *
   * @param rawText 原始 LLM 回應文字
   * @returns Result：成功為 RepairResult，失敗為 LlmError
   */
  repair(rawText: string): Result<RepairResult<LlmResponse>, LlmError> {
    const repairs: RepairAction[] = []
    const original = rawText

    const attempts: Array<{ label: RepairAction; apply: (input: string) => string }> = [
      { label: { type: 'extract_json_block' }, apply: extractJsonBlock },
      { label: { type: 'fix_trailing_comma' }, apply: fixTrailingComma },
      { label: { type: 'fix_unescaped_quotes' }, apply: fixSmartQuotes }
    ]

    let current = rawText
    for (const attempt of attempts) {
      const next = attempt.apply(current)
      if (next !== current) {
        repairs.push(attempt.label)
        current = next
      }
      const parsed = this.tryParse(current)
      if (parsed.ok) {
        return this.finalizeRepair(parsed.value, original, current, repairs)
      }
    }

    const bracketFix = fixUnclosedBrackets(current)
    if (bracketFix.repaired !== current) {
      repairs.push({
        type: 'fix_unclosed_brackets',
        addedBraces: bracketFix.addedBraces,
        addedBrackets: bracketFix.addedBrackets
      })
      current = bracketFix.repaired
      const parsed = this.tryParse(current)
      if (parsed.ok) {
        return this.finalizeRepair(parsed.value, original, current, repairs)
      }
    }

    return err(
      createLlmError('JSON_REPAIR_FAILED', 'JSON repair failed', {
        repairs
      })
    )
  }

  private tryParse(input: string): Result<Record<string, unknown>, LlmError> {
    try {
      const parsed = JSON.parse(input)
      if (!isPlainObject(parsed)) {
        return err(
          createLlmError('INVALID_RESPONSE', 'JSON root is not an object')
        )
      }
      return ok(parsed)
    } catch (error) {
      return err(
        createLlmError('INVALID_RESPONSE', 'JSON parse failed', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  private finalizeRepair(
    parsed: Record<string, unknown>,
    original: string,
    repairedContent: string,
    repairs: RepairAction[]
  ): Result<RepairResult<LlmResponse>, LlmError> {
    const normalized = this.ensureRequiredFields(parsed, repairs)
    const validation = validateGameSchema(normalized)
    if (isErr(validation)) {
      return ok({
        success: false,
        original,
        repaired: repairedContent,
        repairedContent,
        parsed: normalized as LlmResponse,
        repairs,
        validationErrors: validation.error
      })
    }

    return ok({
      success: true,
      original,
      repaired: repairedContent,
      repairedContent,
      parsed: normalized as LlmResponse,
      repairs
    })
  }

  private ensureRequiredFields(
    parsed: Record<string, unknown>,
    repairs: RepairAction[]
  ): Record<string, unknown> {
    const output: Record<string, unknown> = { ...parsed }
    if (!Object.prototype.hasOwnProperty.call(output, 'frames')) {
      output.frames = []
      repairs.push({
        type: 'add_missing_field',
        field: 'frames',
        defaultValue: []
      })
    }
    if (!Object.prototype.hasOwnProperty.call(output, 'proposals')) {
      output.proposals = []
      repairs.push({
        type: 'add_missing_field',
        field: 'proposals',
        defaultValue: []
      })
    }
    if (!Object.prototype.hasOwnProperty.call(output, 'stageHints')) {
      output.stageHints = null
      repairs.push({
        type: 'add_missing_field',
        field: 'stageHints',
        defaultValue: null
      })
    }
    if (!Object.prototype.hasOwnProperty.call(output, 'provider')) {
      output.provider = 'unknown'
      repairs.push({
        type: 'add_missing_field',
        field: 'provider',
        defaultValue: 'unknown'
      })
    }
    if (!Object.prototype.hasOwnProperty.call(output, 'model')) {
      output.model = null
      repairs.push({
        type: 'add_missing_field',
        field: 'model',
        defaultValue: null
      })
    }
    const metaValue = output.meta
    if (!isPlainObject(metaValue)) {
      output.meta = {
        conversation_id: '',
        response_id: '',
        candidate_id: '',
        protocolVersion: 'v1'
      }
      repairs.push({
        type: 'add_missing_field',
        field: 'meta',
        defaultValue: output.meta
      })
    }
    return output
  }
}
