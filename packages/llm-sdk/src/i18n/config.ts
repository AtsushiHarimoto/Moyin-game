/**
 * 國際化配置
 * 用途：定義支持的語言和相關元信息
 */

/**
 * 類型定義：支持的語言代碼
 * 用途：限制可用的語言選項
 */
export type SupportedLocale = 'zh-TW' | 'en-US' | 'ja-JP'

/**
 * 接口定義：語言配置信息
 * 用途：描述語言的顯示信息
 *
 * 字段說明：
 * - name: 英文名稱
 * - nativeName: 本地語言名稱
 * - flag: 旗幟標識
 */
export interface LocaleConfig {
  name: string
  nativeName: string
  flag: string
}

/**
 * 常量定義：語言配置映射
 * 用途：提供語言元信息
 */
export const LOCALE_CONFIG: Record<SupportedLocale, LocaleConfig> = {
  'zh-TW': {
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    flag: 'TW'
  },
  'en-US': {
    name: 'English',
    nativeName: 'English',
    flag: 'US'
  },
  'ja-JP': {
    name: 'Japanese',
    nativeName: '日本語',
    flag: 'JP'
  }
}

/**
 * 常量定義：默認語言
 */
export const DEFAULT_LOCALE: SupportedLocale = 'zh-TW'

/**
 * 常量定義：語言存儲鍵
 * 用途：持久化存儲中保存語言設置的鍵名
 */
export const LOCALE_STORAGE_KEY = 'moyin_locale'
