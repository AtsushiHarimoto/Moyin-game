/**
 * Config module barrel export.
 * Re-exports all configuration-related modules.
 */
export {
  BindingResolver,
  resolveBindingValue,
  resolveComponentBinding,
  resolveEventBinding,
  resolveStateBinding,
} from './BindingResolver';

export { ConfigEngine } from './ConfigEngine';

export type { PerformanceTier, FxFilter } from './types';

export {
  TransitionManager,
  resolveTransition,
  buildTransitionStyle,
} from './TransitionManager';

export {
  FxManager,
  resolveFxPreset,
} from './FxManager';

export {
  LayoutRenderer,
  calculateSlotStyle,
  getResponsiveSlot,
  getLayerZIndex,
} from './LayoutRenderer';
