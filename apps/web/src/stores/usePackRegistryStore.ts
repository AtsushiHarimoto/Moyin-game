import { create } from 'zustand'
import { moyinDb } from '@/db/moyinDb'
import type { StoryPackRow } from '@moyin/vn-engine'

// ── Legacy compat type ──────────────────────────────────────

export interface StoryPack {
  storyKey: string
  packVersion: string
  schemaVersion: string
  importedAt: number
  status: 'valid' | 'invalid'
  payload: unknown
  checksum?: string
  title?: string
}

// ── State & Actions ─────────────────────────────────────────

export interface PackRegistryState {
  packs: StoryPack[]
  initialized: boolean
}

export interface PackRegistryActions {
  init: () => Promise<void>
  refresh: () => Promise<void>
  commit: (pack: StoryPack) => Promise<void>
  remove: (storyKey: string, packVersion: string) => Promise<void>
  removePack: (storyKey: string) => Promise<void>
  get: (storyKey: string, packVersion: string) => Promise<StoryPack | undefined>
  getByStoryKey: (storyKey: string) => Promise<StoryPack | undefined>
  exists: (storyKey: string, packVersion: string) => Promise<boolean>
  existsSync: (storyKey: string, packVersion: string) => boolean
  listPacks: () => StoryPack[]
  clearAll: () => Promise<void>
}

// ── Conversion helpers ──────────────────────────────────────

const LEGACY_STORAGE_KEY = 'moyin_story_packs'

function nowIso(): string {
  return new Date().toISOString()
}

function buildPackId(storyKey: string, packVersion: string): string {
  return `${storyKey}@${packVersion}`
}

function toStoryPackRow(pack: StoryPack): StoryPackRow {
  return {
    packId: buildPackId(pack.storyKey, pack.packVersion),
    storyKey: pack.storyKey,
    packVersion: pack.packVersion,
    schemaVersion: Number(pack.schemaVersion) || 1,
    protocolVersionPin: null,
    title: pack.title ?? null,
    status: pack.status === 'valid' ? 'active' : 'disabled',
    importedAt: new Date(pack.importedAt).toISOString(),
    updatedAt: nowIso(),
    payload: pack.payload,
    rawPayload: null,
    checksum: pack.checksum ?? null,
    warnings: null,
    errors: null,
  }
}

function toStoryPack(row: StoryPackRow): StoryPack {
  return {
    storyKey: row.storyKey,
    packVersion: row.packVersion,
    schemaVersion: String(row.schemaVersion),
    importedAt: new Date(row.importedAt).getTime(),
    status: row.status === 'active' ? 'valid' : 'invalid',
    payload: row.payload,
    checksum: row.checksum ?? undefined,
    title: row.title ?? undefined,
  }
}

// ── Migration ───────────────────────────────────────────────

async function migrateLegacyStorage(): Promise<void> {
  const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!stored) return

  try {
    const legacyPacks: StoryPack[] = JSON.parse(stored)
    if (!Array.isArray(legacyPacks) || legacyPacks.length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      return
    }

    console.log(
      `[PackRegistry] Migrating ${legacyPacks.length} packs from localStorage to IndexedDB`,
    )

    for (const pack of legacyPacks) {
      const packId = buildPackId(pack.storyKey, pack.packVersion)
      const existing = await moyinDb.storyPacks.get(packId)
      if (!existing) {
        await moyinDb.storyPacks.add(toStoryPackRow(pack))
      }
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY)
    console.log('[PackRegistry] Migration complete, localStorage cleared')
  } catch (e) {
    console.error('[PackRegistry] Failed to migrate from localStorage', e)
  }
}

// ── Store ───────────────────────────────────────────────────

export const usePackRegistryStore = create<PackRegistryState & PackRegistryActions>()(
  (set, get) => ({
    // --- State ---
    packs: [],
    initialized: false,

    // --- Actions ---

    init: async () => {
      if (get().initialized) return

      await migrateLegacyStorage()

      const rows = await moyinDb.storyPacks.toArray()
      const packs = rows.filter((r) => r.status === 'active').map(toStoryPack)
      set({ packs, initialized: true })
      console.log('[PackRegistry] init complete, packs:', packs.length)
    },

    refresh: async () => {
      const rows = await moyinDb.storyPacks.toArray()
      const packs = rows.filter((r) => r.status === 'active').map(toStoryPack)
      set({ packs })
      console.log('[PackRegistry] refresh complete, packs:', packs.length)
    },

    commit: async (pack) => {
      console.log('[PackRegistry] commit called:', pack.storyKey, pack.packVersion)
      const row = toStoryPackRow(pack)
      await moyinDb.storyPacks.put(row)

      set((state) => {
        const idx = state.packs.findIndex(
          (p) => p.storyKey === pack.storyKey && p.packVersion === pack.packVersion,
        )
        if (idx !== -1) {
          const next = [...state.packs]
          next[idx] = pack
          console.log('[PackRegistry] updated existing pack at index:', idx)
          return { packs: next }
        }
        console.log('[PackRegistry] added new pack, total:', state.packs.length + 1)
        return { packs: [...state.packs, pack] }
      })
    },

    remove: async (storyKey, packVersion) => {
      const packId = buildPackId(storyKey, packVersion)
      await moyinDb.storyPacks.delete(packId)
      set((state) => ({
        packs: state.packs.filter(
          (p) => !(p.storyKey === storyKey && p.packVersion === packVersion),
        ),
      }))
    },

    removePack: async (storyKey) => {
      const all = await moyinDb.storyPacks.where('storyKey').equals(storyKey).toArray()
      for (const row of all) {
        await moyinDb.storyPacks.delete(row.packId)
      }
      set((state) => ({
        packs: state.packs.filter((p) => p.storyKey !== storyKey),
      }))
    },

    get: async (storyKey, packVersion) => {
      const packId = buildPackId(storyKey, packVersion)
      const row = await moyinDb.storyPacks.get(packId)
      return row ? toStoryPack(row) : undefined
    },

    getByStoryKey: async (storyKey) => {
      const rows = await moyinDb.storyPacks
        .where('storyKey')
        .equals(storyKey)
        .filter((r) => r.status === 'active')
        .sortBy('updatedAt')
      const latest = rows[rows.length - 1]
      return latest ? toStoryPack(latest) : undefined
    },

    exists: async (storyKey, packVersion) => {
      const packId = buildPackId(storyKey, packVersion)
      const row = await moyinDb.storyPacks.get(packId)
      return !!row && row.status === 'active'
    },

    existsSync: (storyKey, packVersion) => {
      return get().packs.some(
        (p) => p.storyKey === storyKey && p.packVersion === packVersion,
      )
    },

    listPacks: () => {
      return get().packs
    },

    clearAll: async () => {
      await moyinDb.storyPacks.clear()
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      set({ packs: [], initialized: true })
      console.log('[PackRegistry] Database and localStorage cleared')
    },
  }),
)
