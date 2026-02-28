/**
 * Simple typed EventEmitter for framework-agnostic pub/sub.
 * Replaces Vue's reactive watch/computed pattern.
 */
export type EventHandler<T = unknown> = (data: T) => void;

export class EventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous handler storage
  private listeners = new Map<string, Set<EventHandler<any>>>();

  /**
   * Subscribe to an event.
   * @returns An unsubscribe function.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call).
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const wrapper: EventHandler<T> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe a specific handler from an event.
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<T = unknown>(event: string, data?: T): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventEmitter] Error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a given event, or all events if no event specified.
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
