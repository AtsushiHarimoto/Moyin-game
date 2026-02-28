/**
 * Binding Resolver (Framework-Agnostic)
 * Purpose: Resolve component, event, and state bindings.
 * Pure functions - no Vue dependencies.
 */
type Bindings = {
  components?: Record<string, unknown>;
  events?: Record<string, unknown>;
  states?: Record<string, unknown>;
};

const resolveBindingValueInternal = (
  bindings: Bindings | undefined,
  section: keyof Bindings,
  key: string,
  fallback: string,
) => {
  const resolved = (bindings?.[section] as Record<string, unknown> | undefined)?.[key];
  if (resolved === undefined) {
    const label = section === "components" ? "component" : section === "events" ? "event" : "state";
    console.warn(`[BindingResolver] Missing ${label} binding: ${key}`);
    return fallback;
  }
  return resolved;
};

export const resolveBindingValue = (
  bindings: Bindings | undefined,
  section: keyof Bindings,
  key: string,
  fallback = "",
) => resolveBindingValueInternal(bindings, section, key, fallback);

export class BindingResolver {
  constructor(private bindings: Bindings) {}

  resolveComponentBinding(key: string, fallback = "") {
    return resolveBindingValueInternal(this.bindings, "components", key, fallback);
  }

  resolveEventBinding(key: string, fallback = "") {
    return resolveBindingValueInternal(this.bindings, "events", key, fallback);
  }

  resolveStateBinding(key: string, fallback = "") {
    return resolveBindingValueInternal(this.bindings, "states", key, fallback);
  }
}

export function resolveComponentBinding(
  bindings: Bindings | undefined,
  key: string,
  fallback = "",
) {
  return resolveBindingValueInternal(bindings, "components", key, fallback);
}

export function resolveEventBinding(
  bindings: Bindings | undefined,
  key: string,
  fallback = "",
) {
  return resolveBindingValueInternal(bindings, "events", key, fallback);
}

export function resolveStateBinding(
  bindings: Bindings | undefined,
  key: string,
  fallback = "",
) {
  return resolveBindingValueInternal(bindings, "states", key, fallback);
}
