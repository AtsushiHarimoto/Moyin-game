/**
 * Transition Effect Manager (Framework-Agnostic)
 * Purpose: Register and resolve transition effects for stage elements.
 * No rendering framework dependencies - provides pure data resolution.
 */
import type { StageSkinSpec, TransitionSpec } from '@moyin/shared';
import type { PerformanceTier } from './types';

/** Minimal container interface for transition targets. */
type TransitionTarget = {
  alpha: number;
  x: number;
  y: number;
  rotation: number;
  scale: { x: number; y: number; set(x: number, y: number): void };
};

type TransitionImpl = (container: TransitionTarget, spec: TransitionSpec) => Promise<void>;

export class TransitionManager {
  private registry = new Map<string, TransitionImpl>();

  registerCustomTransition(key: string, impl: TransitionImpl): void {
    this.registry.set(key, impl);
  }

  getFallbackTransition(): TransitionSpec {
    return { id: 'fallback-fade', type: 'fade', duration: 300, easing: 'ease' };
  }

  async playTransition(
    key: string,
    container: TransitionTarget,
    spec: TransitionSpec,
  ): Promise<void> {
    const impl = this.registry.get(key) ?? this.registry.get(spec.type);
    if (!impl) return;
    await impl(container, spec);
  }

  getRegisteredKeys(): string[] {
    return Array.from(this.registry.keys());
  }

  hasTransition(key: string): boolean {
    return this.registry.has(key);
  }
}

/**
 * Resolve a transition from a skin spec by ID, adjusting for performance tier.
 * Returns null if no matching transition is found.
 */
export function resolveTransition(
  skin: StageSkinSpec | undefined,
  transitionId: string,
  tier: PerformanceTier = 'high',
): TransitionSpec | null {
  if (!skin?.transitions?.length) return null;

  const transition = skin.transitions.find((item) => item.id === transitionId);
  if (!transition) return null;

  if (tier === 'low') {
    return { ...transition, duration: 0, delay: 0 };
  }
  if (tier === 'mid') {
    return {
      ...transition,
      duration: transition.duration ? Math.round(transition.duration * 0.7) : undefined,
    };
  }
  return transition;
}

/**
 * Build a CSS transition style object from a TransitionSpec.
 */
export function buildTransitionStyle(
  transition: TransitionSpec,
): Record<string, string> {
  const duration = transition.duration ?? 300;
  const easing = transition.easing ?? 'ease';

  switch (transition.type) {
    case 'fade':
      return { transition: `opacity ${duration}ms ${easing}` };
    case 'slide':
    case 'scale':
    case 'rotate':
      return { transition: `transform ${duration}ms ${easing}` };
    case 'wipe':
      return { transition: `clip-path ${duration}ms ${easing}` };
    case 'blur':
      return { transition: `filter ${duration}ms ${easing}` };
    default:
      return { transition: `all ${duration}ms ${easing}` };
  }
}
