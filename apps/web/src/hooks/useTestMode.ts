import { useMemo } from 'react'

// ---------------------------------------------------------------------------
// Module-level init — read URL param once
// ---------------------------------------------------------------------------

const testModeEnabled: boolean =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('test-mode') === 'true'

if (testModeEnabled) {
  console.log('[TEST MODE] Enabled: animations disabled, random seed fixed')
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface TestModeValues {
  isTestMode: boolean
  animationDuration: string | undefined
  randomSeed: number
  fixedTime: Date | null
  disableTransition: string | undefined
  disableAnimation: string | undefined
}

export function useTestMode(): TestModeValues {
  return useMemo<TestModeValues>(() => {
    if (!testModeEnabled) {
      return {
        isTestMode: false,
        animationDuration: undefined,
        randomSeed: Date.now(),
        fixedTime: null,
        disableTransition: undefined,
        disableAnimation: undefined,
      }
    }
    return {
      isTestMode: true,
      animationDuration: '0ms',
      randomSeed: 42,
      fixedTime: new Date('2026-01-23T12:00:00Z'),
      disableTransition: 'none',
      disableAnimation: 'none',
    }
  }, [])
}

// ---------------------------------------------------------------------------
// Seeded random generator (deterministic for VRT)
// ---------------------------------------------------------------------------

export function getSeededRandom(seed: number = 42): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}
