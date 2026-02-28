import type {
  MultiLocalePromptTemplate,
  CompiledPrompt,
  PromptVariables
} from './types'

/**
 * 類：Prompt 模板管理器
 * 用途：加載、編譯、管理 Prompt 模板
 *
 * 功能說明：
 * - 動態加載 JSON 模板
 * - 變量替換與驗證
 * - 多語言支持
 * - 模板緩存
 */
export class PromptManager {
  private templates = new Map<string, MultiLocalePromptTemplate>()
  private currentLocale = 'zh-TW'

  /**
   * 函數用途：設置當前語言
   * 參數說明：locale - 語言代碼（zh-TW/en-US/ja-JP）
   * 返回值：無
   * 副作用：更新 currentLocale 狀態
   */
  setLocale(locale: string): void {
    this.currentLocale = locale
  }

  /**
   * 函數用途：獲取當前語言
   * 參數說明：無
   * 返回值：當前語言代碼
   * 副作用：無
   */
  getLocale(): string {
    return this.currentLocale
  }

  /**
   * 函數用途：註冊模板到管理器
   * 參數說明：template - 模板對象（JSON 解析後）
   * 返回值：無
   * 副作用：將模板存儲到 templates Map
   */
  registerTemplate(template: unknown): void {
    if (
      !template ||
      typeof template !== 'object' ||
      !('id' in template) ||
      typeof (template as { id: unknown }).id !== 'string'
    ) {
      throw new Error('Invalid template: must have a string id property')
    }
    const t = template as MultiLocalePromptTemplate
    this.templates.set(t.id, t)
  }

  /**
   * 函數用途：批量註冊模板
   * 參數說明：templates - 模板數組（支持 JSON 導入）
   * 返回值：無
   * 副作用：循環調用 registerTemplate
   */
  registerBatch(templates: unknown[]): void {
    templates.forEach((t) => this.registerTemplate(t))
  }

  /**
   * 函數用途：編譯 Prompt 模板
   * 參數說明：
   * - id: 模板 ID
   * - variables: 變量對象
   * - locale: 語言（可選，默認使用 currentLocale）
   * 返回值：編譯後的 Prompt 對象
   * 副作用：無
   *
   * 算法：
   * 1. 查找模板
   * 2. 驗證必需變量
   * 3. 替換模板中的 {variable}
   * 4. 返回 system + user prompt
   *
   * 錯誤處理：模板不存在或變量缺失時拋出異常
   */
  compile(
    id: string,
    variables: PromptVariables,
    locale?: string
  ): CompiledPrompt {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Prompt template not found: ${id}`)
    }

    const targetLocale = locale || this.currentLocale
    const localeData = template.locales[targetLocale]

    if (!localeData) {
      throw new Error(`Locale ${targetLocale} not found for template ${id}`)
    }

    // 合併默認值
    const finalVars = { ...template.defaults, ...variables }

    // 驗證必需變量
    const missingVars = template.variables.filter((v: string) => !(v in finalVars))
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`)
    }

    // 替換變量
    const userPrompt = this.replaceVariables(localeData.template, finalVars)

    return {
      system: localeData.systemPrompt,
      user: userPrompt,
      locale: targetLocale
    }
  }

  /**
   * 函數用途：替換模板中的變量佔位符
   * 參數說明：
   * - template: 模板字符串
   * - variables: 變量對象
   * 返回值：替換後的字符串
   * 副作用：無
   *
   * 算法：使用正則表達式 /\{(\w+)\}/g 匹配 {variable} 並替換
   */
  private replaceVariables(
    template: string,
    variables: PromptVariables
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key]
      return value !== undefined ? String(value) : match
    })
  }

  /**
   * 函數用途：列出指定類別的所有模板
   * 參數說明：category - 模板類別（可選）
   * 返回值：模板 ID 數組
   * 副作用：無
   */
  list(category?: string): string[] {
    const templates = Array.from(this.templates.values())
    return templates
      .filter((t) => !category || t.category === category)
      .map((t) => t.id)
  }

  /**
   * 函數用途：獲取模板詳情
   * 參數說明：id - 模板 ID
   * 返回值：模板對象（如果存在）
   * 副作用：無
   */
  getTemplate(id: string): MultiLocalePromptTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * 函數用途：檢查模板是否存在
   * 參數說明：id - 模板 ID
   * 返回值：是否存在
   * 副作用：無
   */
  hasTemplate(id: string): boolean {
    return this.templates.has(id)
  }

  /**
   * 函數用途：清空所有模板
   * 參數說明：無
   * 返回值：無
   * 副作用：清空 templates Map
   */
  clear(): void {
    this.templates.clear()
  }
}

/**
 * 單例實例：全局 Prompt 管理器
 * 用途：提供全局訪問點
 */
export const promptManager = new PromptManager()
