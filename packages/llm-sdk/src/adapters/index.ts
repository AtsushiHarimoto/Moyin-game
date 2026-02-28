import { BaseLLMAdapter, type LLMProvider } from './types'
import { GeminiAdapter } from './gemini-adapter'
import { GrokAdapter } from './grok-adapter'
import { OllamaAdapter } from './ollama-adapter'
import { ChatGPTAdapter } from './chatgpt-adapter'

/**
 * 類：LLM 適配器工廠
 * 用途：根據提供商創建對應的適配器實例
 *
 * 功能說明：
 * - 統一創建接口
 * - 自動選擇適配器
 * - 管理 API Key
 */
export class LLMAdapterFactory {
  /**
   * 函數用途：創建 LLM 適配器實例
   * 參數說明：
   * - provider: 提供商類型
   * - modelId: 模型 ID
   * - apiKey: API Key（Ollama 可選）
   * - baseUrl: 基礎 URL（僅 Ollama）
   * 返回值：適配器實例
   * 副作用：無
   *
   * 算法：根據 provider 選擇對應的適配器類
   *
   * 錯誤處理：不支持的 provider 時拋出異常
   */
  static create(
    provider: LLMProvider,
    modelId: string,
    apiKey: string,
    baseUrl?: string
  ): BaseLLMAdapter {
    switch (provider) {
      case 'google':
        return new GeminiAdapter(modelId, apiKey, baseUrl)

      case 'xai':
        return new GrokAdapter(modelId, apiKey, baseUrl)

      case 'ollama':
        return new OllamaAdapter(modelId, baseUrl)

      case 'chatgpt':
        return new ChatGPTAdapter(modelId, apiKey, baseUrl || 'http://localhost:8000')

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`)
    }
  }
}

// 導出所有適配器類型
export { BaseLLMAdapter, GeminiAdapter, GrokAdapter, OllamaAdapter, ChatGPTAdapter }

// 導出基礎類型
export type {
  LLMMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamCallback,
  MessageRole,
  LLMProvider
} from './types'
