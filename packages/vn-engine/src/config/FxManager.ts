/**
 * FX Effect Manager (Framework-Agnostic)
 * Purpose: Register, enable/disable, and build visual effect filters.
 * No direct pixi-filters dependency - consumers register their own FX implementations.
 */
import type { FxPresetSpec } from '@moyin/shared';
import type { FxFilter, PerformanceTier } from './types';

type FxFactory = () => FxFilter;

export class FxManager {
  private registry = new Map<string, FxFactory>();
  private activeFx = new Set<string>();
  private filterCache = new Map<string, FxFilter>();
  private perfTier: PerformanceTier = 'high';

  registerCustomFx(key: string, factory: FxFactory): void {
    this.registry.set(key, factory);
  }

  enableFx(key: string): void {
    this.activeFx.add(key);
  }

  disableFx(key: string): void {
    this.activeFx.delete(key);
    this.filterCache.delete(key);
  }

  setPerfTier(tier: PerformanceTier): void {
    this.perfTier = tier;
  }

  getPerfTier(): PerformanceTier {
    return this.perfTier;
  }

  getActiveFx(): string[] {
    return Array.from(this.activeFx);
  }

  buildFilters(): FxFilter[] {
    if (this.perfTier === 'low') return [];

    return this.getActiveFx()
      .map((key) => {
        const cached = this.filterCache.get(key);
        if (cached) return cached;

        const factory = this.registry.get(key);
        if (!factory) return null;

        const filter = factory();
        this.filterCache.set(key, filter);
        return filter;
      })
      .filter((f): f is NonNullable<typeof f> => f != null);
  }

  clear(): void {
    this.activeFx.clear();
    this.filterCache.clear();
  }
}

/**
 * Resolve an FX preset, adjusting effects based on performance tier.
 * - low: strips all effects
 * - mid: reduces intensity by 30%
 * - high: returns enabled effects as-is
 */
export function resolveFxPreset(
  preset: FxPresetSpec,
  tier: PerformanceTier,
): FxPresetSpec {
  const effects = (preset.effects ?? []).filter((effect) => effect.enabled !== false);

  if (tier === 'low') {
    return { ...preset, effects: [] };
  }
  if (tier === 'mid') {
    return {
      ...preset,
      effects: effects.map((effect) => ({
        ...effect,
        intensity: effect.intensity != null ? effect.intensity * 0.7 : effect.intensity,
      })),
    };
  }
  return { ...preset, effects };
}
