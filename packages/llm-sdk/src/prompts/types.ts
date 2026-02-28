/**
 * Prompt 模板類型定義
 * 用途：定義 Prompt 模板的數據結構
 */

/**
 * 類型定義：Prompt 模板變量
 * 用途：定義模板中可替換的變量
 *
 * 說明：支持字符串、數字、布爾值類型
 */
export type PromptVariables = Record<string, string | number | boolean>

/**
 * 類型定義：Prompt 模板類別
 * 用途：區分不同用途的 Prompt 模板
 *
 * 可選值：
 * - story: 劇情相關（對話生成、劇情分支、情感分析）
 * - assistant: 輔助功能（選項推薦、場景描述、翻譯）
 * - meta: Meta 功能（劇本質檢、角色一致性）
 */
export type PromptCategory = 'story' | 'assistant' | 'meta'

/**
 * 接口定義：Prompt 模板結構
 * 用途：描述一個完整的 Prompt 模板
 *
 * 字段說明：
 * - id: 模板唯一標識符（如 story.dialogue.generate）
 * - category: 模板類別
 * - name: 模板名稱（用於 UI 顯示）
 * - description: 模板描述
 * - template: 模板內容（支持 {variable} 佔位符）
 * - variables: 必需的變量列表
 * - systemPrompt: 系統級提示詞（可選）
 * - locale: 語言代碼（默認 zh-TW）
 * - version: 模板版本號
 */
export interface PromptTemplate {
  id: string
  category: PromptCategory
  name: string
  description: string
  template: string
  variables: string[]
  systemPrompt?: string
  locale: string
  version: string
}

/**
 * 接口定義：多語言 Prompt 模板
 * 用途：支持多語言的 Prompt 模板（JSON 格式）
 *
 * 字段說明：
 * - id: 模板唯一標識符
 * - category: 模板類別
 * - name: 模板名稱
 * - description: 模板描述
 * - version: 模板版本號
 * - locales: 多語言內容對象（鍵為語言代碼）
 * - variables: 必需的變量列表
 * - defaults: 默認變量值（可選）
 */
export interface MultiLocalePromptTemplate {
  id: string
  category: PromptCategory
  name: string
  description: string
  version: string
  locales: Record<
    string,
    {
      systemPrompt?: string
      template: string
    }
  >
  variables: string[]
  defaults?: Record<string, string | number | boolean>
}

/**
 * 接口定義：Prompt 編譯結果
 * 用途：返回編譯後的完整 Prompt
 *
 * 字段說明：
 * - system: 系統提示詞（可選）
 * - user: 用戶提示詞
 * - locale: 使用的語言
 */
export interface CompiledPrompt {
  system?: string
  user: string
  locale: string
}
