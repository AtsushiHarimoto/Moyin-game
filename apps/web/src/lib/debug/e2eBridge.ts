/**
 * Moyin Game V2 - White-box E2E Testing Bridge
 *
 * Only active in development mode. Exposes internal state and controls
 * at window.__MOYIN_TEST__ for Playwright to use during E2E tests.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BridgeDeps {
  resetRegistry: () => Promise<void>
  resetSession: () => Promise<void>
  injectPack: (json: Record<string, unknown>) => Promise<void>
  getSessionState: () => Record<string, unknown> | undefined
  getPhase: () => string
  getSceneId: () => string
  forceNext: () => void
}

export type MoyinTestBridge = BridgeDeps

// ---------------------------------------------------------------------------
// Bridge factory — lazy-initialized so stores are available
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __MOYIN_TEST__?: MoyinTestBridge
  }
}

export function initE2EBridge(deps: BridgeDeps): void {
  if (import.meta.env.PROD) return

  const bridge: MoyinTestBridge = {
    async resetRegistry() {
      await deps.resetRegistry()
      console.log('[E2E-Bridge] Registry reset complete')
    },

    async resetSession() {
      await deps.resetSession()
      console.log('[E2E-Bridge] Session reset (soft)')
    },

    async injectPack(json) {
      await deps.injectPack(json)
      console.log('[E2E-Bridge] Pack injected')
    },

    getSessionState() {
      return deps.getSessionState()
    },

    getPhase() {
      return deps.getPhase()
    },

    getSceneId() {
      return deps.getSceneId()
    },

    forceNext() {
      deps.forceNext()
    },
  }

  window.__MOYIN_TEST__ = bridge
  console.log('[E2E-Bridge] Bridge initialized at window.__MOYIN_TEST__')
}
