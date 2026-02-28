/**
 * Scene Configuration Engine (Framework-Agnostic)
 * Purpose: Load, validate, cache, and resolve stage layout + skin configurations.
 * Uses types from @moyin/shared for StageLayoutSpec and StageSkinSpec.
 */
import type { StageLayoutSpec, StageSkinSpec } from '@moyin/shared';
import type { PerformanceTier } from './types';

type RetryOptions = {
  maxRetries: number;
  baseDelayMs: number;
  backoffFactor: number;
};

type ResolvedConfig = {
  layout: StageLayoutSpec;
  skin: StageSkinSpec;
  currentPerfTier: PerformanceTier;
};

type ConfigEngineOptions = {
  retry?: Partial<RetryOptions>;
  validateLayout?: (layout: unknown) => boolean;
  validateSkin?: (skin: unknown) => boolean;
};

export class ConfigEngine {
  private cache = new Map<string, ResolvedConfig>();
  private currentConfig: ResolvedConfig | null = null;
  private lastLayout?: StageLayoutSpec;
  private lastSkin?: StageSkinSpec;
  private perfTier: PerformanceTier = 'high';
  private retry: RetryOptions;
  private externalValidateLayout?: (layout: unknown) => boolean;
  private externalValidateSkin?: (skin: unknown) => boolean;

  constructor(options?: ConfigEngineOptions) {
    this.retry = {
      maxRetries: options?.retry?.maxRetries ?? 2,
      baseDelayMs: options?.retry?.baseDelayMs ?? 200,
      backoffFactor: options?.retry?.backoffFactor ?? 2,
    };
    this.externalValidateLayout = options?.validateLayout;
    this.externalValidateSkin = options?.validateSkin;
  }

  validateLayout(layout: unknown): layout is StageLayoutSpec {
    if (this.externalValidateLayout) {
      return this.externalValidateLayout(layout);
    }
    const candidate = layout as Record<string, unknown>;
    if (!candidate || typeof candidate !== 'object') return false;
    if (typeof candidate.layoutKey !== 'string') return false;
    if (!Array.isArray(candidate.layers)) return false;
    return true;
  }

  validateSkin(skin: unknown): skin is StageSkinSpec {
    if (this.externalValidateSkin) {
      return this.externalValidateSkin(skin);
    }
    const candidate = skin as Record<string, unknown>;
    if (!candidate || typeof candidate !== 'object') return false;
    if (typeof candidate.skinKey !== 'string') return false;
    if (typeof candidate.layoutRef !== 'string') return false;
    return true;
  }

  loadLayout(layout: StageLayoutSpec): StageLayoutSpec {
    if (!this.validateLayout(layout)) {
      throw new Error('[ConfigEngine] StageLayoutSpec validation failed.');
    }
    this.lastLayout = layout;
    return layout;
  }

  loadSkin(skin: StageSkinSpec): StageSkinSpec {
    if (!this.validateSkin(skin)) {
      throw new Error('[ConfigEngine] StageSkinSpec validation failed.');
    }
    this.lastSkin = skin;
    return skin;
  }

  async loadConfig(
    layoutId: string,
    skinId: string,
    perfTier?: PerformanceTier,
  ): Promise<ResolvedConfig> {
    const cacheKey = `${layoutId}:${skinId}:${perfTier ?? 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.currentConfig = cached;
      return cached;
    }

    const [layoutJson, skinJson] = await Promise.all([
      this.fetchJson(`/config/stage/layouts/${layoutId}.json`),
      this.fetchJson(`/config/stage/skins/${skinId}.json`),
    ]);

    if (!this.validateLayout(layoutJson)) {
      throw new Error(`[ConfigEngine] StageLayoutSpec validation failed for layout: ${layoutId}`);
    }
    if (!this.validateSkin(skinJson)) {
      throw new Error(`[ConfigEngine] StageSkinSpec validation failed for skin: ${skinId}`);
    }

    const resolved = this.resolveConfig(layoutJson, skinJson, perfTier);
    this.cache.set(cacheKey, resolved);
    this.currentConfig = resolved;
    return resolved;
  }

  loadConfigFromJson(
    layout: StageLayoutSpec,
    skin: StageSkinSpec,
    perfTier?: PerformanceTier,
  ): ResolvedConfig {
    this.loadLayout(layout);
    this.loadSkin(skin);
    const resolved = this.resolveConfig(layout, skin, perfTier);
    this.currentConfig = resolved;
    return resolved;
  }

  setPerfTier(tier: PerformanceTier): void {
    this.perfTier = tier;
    if (this.currentConfig) {
      this.currentConfig.currentPerfTier = tier;
    }
  }

  getPerfTier(): PerformanceTier {
    return this.perfTier;
  }

  clearCache(): void {
    this.cache.clear();
    this.lastLayout = undefined;
    this.lastSkin = undefined;
    this.currentConfig = null;
  }

  getCurrentConfig(): ResolvedConfig {
    if (!this.currentConfig) {
      throw new Error('[ConfigEngine] No config loaded. Call loadConfig() first.');
    }
    return this.currentConfig;
  }

  getLayout(): StageLayoutSpec | undefined {
    return this.lastLayout;
  }

  getSkin(): StageSkinSpec | undefined {
    return this.lastSkin;
  }

  private resolveConfig(
    layout: StageLayoutSpec,
    skin: StageSkinSpec,
    perfTier?: PerformanceTier,
  ): ResolvedConfig {
    const currentPerfTier = perfTier ?? skin.performanceTier ?? this.perfTier;
    return { layout, skin, currentPerfTier };
  }

  private async fetchJson(path: string): Promise<unknown> {
    let attempt = 0;
    while (true) {
      const response = await fetch(path).catch((err: unknown) => {
        if (attempt >= this.retry.maxRetries) throw err;
        return null;
      });

      if (response && response.ok) {
        return response.json();
      }

      if (response && !response.ok) {
        const error = new Error(`[ConfigEngine] Failed to load ${path}: ${response.statusText}`);
        if (attempt >= this.retry.maxRetries) throw error;
      }

      if (attempt >= this.retry.maxRetries) {
        throw new Error(`[ConfigEngine] Failed to load ${path} after ${this.retry.maxRetries} retries.`);
      }

      const delay = Math.max(
        0,
        this.retry.baseDelayMs * Math.pow(this.retry.backoffFactor, attempt),
      );
      attempt += 1;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}
