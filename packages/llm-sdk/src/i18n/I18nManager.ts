import type { SupportedLocale } from './config'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './config'

/**
 * 類：國際化管理器
 * 用途：管理語言包加載、切換、翻譯
 *
 * 功能說明：
 * - 動態加載語言包
 * - 嵌套鍵值訪問（如 'game.ui.start'）
 * - 變量替換
 * - 回退機制
 *
 * 遷移說明：移除了 localStorage 硬依賴，
 * 改為安全檢查 typeof localStorage。可在 Node.js 環境中使用。
 */
export class I18nManager {
  private messages = new Map<SupportedLocale, Record<string, unknown>>()
  private currentLocale: SupportedLocale = DEFAULT_LOCALE

  /**
   * 函數用途：加載語言包
   * 參數說明：
   * - locale: 語言代碼
   * - messages: 語言包對象
   * 返回值：無
   * 副作用：存儲語言包到 messages Map
   */
  loadMessages(locale: SupportedLocale, messages: Record<string, unknown>): void {
    this.messages.set(locale, messages)
  }

  /**
   * 函數用途：批量加載語言包
   * 參數說明：locales - 語言包對象（鍵為語言代碼）
   * 返回值：無
   * 副作用：循環調用 loadMessages
   */
  loadBatch(locales: Record<SupportedLocale, Record<string, unknown>>): void {
    Object.entries(locales).forEach(([locale, messages]) => {
      this.loadMessages(locale as SupportedLocale, messages)
    })
  }

  /**
   * 函數用途：切換當前語言
   * 參數說明：locale - 目標語言代碼
   * 返回值：無
   * 副作用：更新 currentLocale、保存到 localStorage（如可用）
   */
  setLocale(locale: SupportedLocale): void {
    this.currentLocale = locale
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale)
      } catch {
        // localStorage 不可用時靜默忽略
      }
    }
  }

  /**
   * 函數用途：獲取當前語言
   * 參數說明：無
   * 返回值：當前語言代碼
   * 副作用：無
   */
  getLocale(): SupportedLocale {
    return this.currentLocale
  }

  /**
   * 函數用途：翻譯文本（支持嵌套鍵值和變量替換）
   * 參數說明：
   * - key: 翻譯鍵（支持 'a.b.c' 格式）
   * - params: 變量對象（可選）
   * - locale: 語言（可選，默認使用 currentLocale）
   * 返回值：翻譯後的文本
   * 副作用：無
   *
   * 算法：
   * 1. 按 '.' 分割鍵名
   * 2. 遞歸查找嵌套對象
   * 3. 找到後替換 {variable}
   * 4. 找不到則返回鍵名（回退機制）
   */
  t(key: string, params?: Record<string, unknown>, locale?: SupportedLocale): string {
    const targetLocale = locale || this.currentLocale
    const messages = this.messages.get(targetLocale)

    if (!messages) {
      console.warn(`Locale ${targetLocale} not loaded`)
      return key
    }

    // 嵌套鍵值查找
    const keys = key.split('.')
    let value: unknown = messages

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k]
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    // 變量替換
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match
      })
    }

    return String(value)
  }

  /**
   * 函數用途：從 localStorage 恢復語言設置
   * 參數說明：無
   * 返回值：無
   * 副作用：讀取 localStorage、更新 currentLocale
   */
  restore(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null
      if (saved && this.messages.has(saved)) {
        this.currentLocale = saved
      }
    } catch {
      // localStorage 不可用時靜默忽略
    }
  }

  /**
   * 函數用途：檢查語言包是否已加載
   * 參數說明：locale - 語言代碼
   * 返回值：是否已加載
   * 副作用：無
   */
  hasLocale(locale: SupportedLocale): boolean {
    return this.messages.has(locale)
  }

  /**
   * 函數用途：獲取所有已加載的語言
   * 參數說明：無
   * 返回值：語言代碼數組
   * 副作用：無
   */
  getLoadedLocales(): SupportedLocale[] {
    return Array.from(this.messages.keys())
  }
}

/**
 * 單例實例：全局 i18n 管理器
 * 用途：提供全局訪問點
 */
export const i18n = new I18nManager()

/**
 * 簡寫函數：翻譯快捷方式
 * 用途：簡化調用
 *
 * 使用示例：
 * import { t } from '@moyin/llm-sdk'
 * const text = t('game.ui.start')
 */
export const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params)
