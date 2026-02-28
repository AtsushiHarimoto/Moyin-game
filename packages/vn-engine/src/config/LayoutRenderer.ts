/**
 * Layout Renderer (Framework-Agnostic)
 * Purpose: Calculate slot positions, responsive overrides, and layer ordering
 * from StageLayoutSpec data.
 */
import type { StageLayoutSlot } from '@moyin/shared';

type Viewport = {
  width: number;
  height: number;
};

export class LayoutRenderer {
  private viewport: Viewport;
  private observer?: ResizeObserver;

  constructor(
    viewport: Viewport,
    element?: HTMLElement | null,
    onResize?: (viewport: Viewport) => void,
  ) {
    this.viewport = { ...viewport };
    if (element && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        this.viewport = { width, height };
        if (onResize) onResize(this.viewport);
      });
      this.observer.observe(element);
    }
  }

  dispose(): void {
    if (this.observer) this.observer.disconnect();
    this.observer = undefined;
  }

  setViewport(viewport: Viewport): void {
    this.viewport = { ...viewport };
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  calculateSlotPosition(slot: StageLayoutSlot): Record<string, string> {
    return calculateSlotStyle(slot, this.viewport);
  }

  updateResponsiveLayout(slot: StageLayoutSlot, breakpoint: string): StageLayoutSlot {
    return getResponsiveSlot(slot, breakpoint);
  }

  getLayerOrder(layer?: { zIndex?: number }): number {
    return getLayerZIndex(layer);
  }
}

/**
 * Calculate absolute positioning CSS from a slot definition and viewport size.
 */
export function calculateSlotStyle(
  slot: StageLayoutSlot,
  viewport: Viewport,
): Record<string, string> {
  const { width, height } = viewport;
  const size = slot.size ?? {};
  const offsetX = slot.offset?.x ?? 0;
  const offsetY = slot.offset?.y ?? 0;

  const resolvedWidth =
    size.widthPx ?? (size.widthPct ? (width * size.widthPct) / 100 : undefined);
  const resolvedHeight =
    size.heightPx ?? (size.heightPct ? (height * size.heightPct) / 100 : undefined);

  const base: Record<string, string> = {
    position: 'absolute',
    width: resolvedWidth != null ? `${resolvedWidth}px` : 'auto',
    height: resolvedHeight != null ? `${resolvedHeight}px` : 'auto',
  };

  switch (slot.anchor) {
    case 'top-left':
      base.left = `${offsetX}px`;
      base.top = `${offsetY}px`;
      break;
    case 'top-right':
      base.right = `${offsetX}px`;
      base.top = `${offsetY}px`;
      break;
    case 'bottom-left':
      base.left = `${offsetX}px`;
      base.bottom = `${offsetY}px`;
      break;
    case 'bottom-right':
      base.right = `${offsetX}px`;
      base.bottom = `${offsetY}px`;
      break;
    default:
      base.left = '50%';
      base.top = '50%';
      base.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
      break;
  }

  return base;
}

/**
 * Apply responsive overrides to a slot for the given breakpoint.
 */
export function getResponsiveSlot(
  slot: StageLayoutSlot,
  breakpoint: string,
): StageLayoutSlot {
  const override = slot.responsive?.[breakpoint] as Partial<StageLayoutSlot> | undefined;
  if (!override) return slot;

  const result: StageLayoutSlot = {
    ...slot,
    ...override,
    offset: { ...slot.offset, ...(override.offset ?? {}) },
    size: { ...slot.size, ...(override.size ?? {}) },
  };
  return result;
}

/**
 * Extract the z-index value from a layer descriptor.
 */
export function getLayerZIndex(layer?: { zIndex?: number }): number {
  return Number(layer?.zIndex ?? 0);
}
