/**
 * Story Pack Registry Store (Zustand)
 * Manages CRUD operations for imported story packs.
 * - Loads and caches story packs from IndexedDB
 * - Provides add/remove/query operations
 * - Auto-migrates legacy localStorage data to IndexedDB
 *
 * Design pattern: Repository pattern (data access layer)
 * Persistence: IndexedDB (primary) + localStorage (legacy compat)
 */
import { create } from 'zustand'

/* ========================================
 * Types
 * ======================================== */

export interface StoryPack {
  /** Story unique identifier */
  storyKey: string
  /** Pack version number */
  packVersion: string
  /** Schema version (string format) */
  schemaVersion: string
  /** Import timestamp (ms) */
  importedAt: number
  /** Status: valid or invalid */
  status: 'valid' | 'invalid'
  /** Story pack data payload */
  payload: unknown
  /** Checksum (optional) */
  checksum?: string
  /** Story title (optional) */
  title?: string
}

interface PackRegistryState {
  /** Loaded story packs (in-memory cache) */
  packs: StoryPack[]
  /** Whether initialization has run */
  initialized: boolean
}

interface PackRegistryActions {
  /**
   * Load packs from IndexedDB and run one-time localStorage migration.
   */
  init: () => Promise<void>

  /**
   * Force reload from IndexedDB (bypasses initialized guard).
   */
  refresh: () => Promise<void>

  /**
   * List all packs.
   */
  listPacks: () => StoryPack[]

  /**
   * Check whether a pack exists (async, reads IndexedDB).
   */
  exists: (storyKey: string, packVersion: string) => Promise<boolean>

  /**
   * Sync check from in-memory cache.
   */
  existsSync: (storyKey: string, packVersion: string) => boolean

  /**
   * Commit (add or update) a story pack.
   */
  commit: (pack: StoryPack) => Promise<void>

  /**
   * Remove all versions of a storyKey.
   */
  removePack: (storyKey: string) => Promise<void>

  /**
   * Remove a specific version.
   */
  remove: (storyKey: string, packVersion: string) => Promise<void>

  /**
   * Get a specific version.
   */
  get: (storyKey: string, packVersion: string) => Promise<StoryPack | undefined>

  /**
   * Get latest version by storyKey.
   */
  getByStoryKey: (storyKey: string) => Promise<StoryPack | undefined>

  /**
   * Clear all data (debug/reset).
   */
  clearAll: () => Promise<void>
}

/* ========================================
 * Constants
 * ======================================== */

const LEGACY_STORAGE_KEY = 'moyin_story_packs'

function buildPackId(storyKey: string, packVersion: string) {
  return `${storyKey}@${packVersion}`
}

/* ========================================
 * IndexedDB helpers (simple wrapper using native API)
 * ======================================== */

const DB_NAME = 'moyin_db'
const DB_VERSION = 1
const STORE_NAME = 'storyPacks'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'packId' })
        store.createIndex('storyKey', 'storyKey', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

interface StoryPackRow {
  packId: string
  storyKey: string
  packVersion: string
  schemaVersion: number
  title: string | null
  status: 'active' | 'disabled'
  importedAt: string
  updatedAt: string
  payload: unknown
  checksum: string | null
}

function toRow(pack: StoryPack): StoryPackRow {
  return {
    packId: buildPackId(pack.storyKey, pack.packVersion),
    storyKey: pack.storyKey,
    packVersion: pack.packVersion,
    schemaVersion: Number(pack.schemaVersion) || 1,
    title: pack.title ?? null,
    status: pack.status === 'valid' ? 'active' : 'disabled',
    importedAt: new Date(pack.importedAt).toISOString(),
    updatedAt: new Date().toISOString(),
    payload: pack.payload,
    checksum: pack.checksum ?? null,
  }
}

function fromRow(row: StoryPackRow): StoryPack {
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

async function dbGetAll(): Promise<StoryPackRow[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result ?? [])
    request.onerror = () => reject(request.error)
  })
}

async function dbGet(packId: string): Promise<StoryPackRow | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(packId)
    request.onsuccess = () => resolve(request.result ?? undefined)
    request.onerror = () => reject(request.error)
  })
}

async function dbPut(row: StoryPackRow): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(row)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function dbDelete(packId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(packId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function dbClear(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function dbGetByStoryKey(storyKey: string): Promise<StoryPackRow[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('storyKey')
    const request = index.getAll(storyKey)
    request.onsuccess = () => resolve(request.result ?? [])
    request.onerror = () => reject(request.error)
  })
}

/* ========================================
 * Store
 * ======================================== */

export const usePackRegistryStore = create<PackRegistryState & PackRegistryActions>()(
  (set, get) => ({
    packs: [],
    initialized: false,

    async init() {
      if (get().initialized) return

      // 1. Migrate legacy localStorage
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (stored) {
        try {
          const legacyPacks: StoryPack[] = JSON.parse(stored)
          if (Array.isArray(legacyPacks) && legacyPacks.length > 0) {
            console.log(
              `[PackRegistry] Migrating ${legacyPacks.length} packs from localStorage`,
            )
            for (const pack of legacyPacks) {
              const packId = buildPackId(pack.storyKey, pack.packVersion)
              const existing = await dbGet(packId)
              if (!existing) {
                await dbPut(toRow(pack))
              }
            }
            localStorage.removeItem(LEGACY_STORAGE_KEY)
            console.log('[PackRegistry] Migration complete')
          } else {
            localStorage.removeItem(LEGACY_STORAGE_KEY)
          }
        } catch (e) {
          console.error('[PackRegistry] Migration failed', e)
        }
      }

      // 2. Load from IndexedDB
      const rows = await dbGetAll()
      const packs = rows.filter((r) => r.status === 'active').map(fromRow)
      set({ packs, initialized: true })
      console.log('[PackRegistry] init complete, packs:', packs.length)
    },

    async refresh() {
      const rows = await dbGetAll()
      const packs = rows.filter((r) => r.status === 'active').map(fromRow)
      set({ packs })
      console.log('[PackRegistry] refresh complete, packs:', packs.length)
    },

    listPacks() {
      return get().packs
    },

    async exists(storyKey, packVersion) {
      const row = await dbGet(buildPackId(storyKey, packVersion))
      return !!row && row.status === 'active'
    },

    existsSync(storyKey, packVersion) {
      return get().packs.some(
        (p) => p.storyKey === storyKey && p.packVersion === packVersion,
      )
    },

    async commit(pack) {
      console.log('[PackRegistry] commit:', pack.storyKey, pack.packVersion)
      await dbPut(toRow(pack))

      set((state) => {
        const idx = state.packs.findIndex(
          (p) =>
            p.storyKey === pack.storyKey &&
            p.packVersion === pack.packVersion,
        )
        const next = [...state.packs]
        if (idx !== -1) {
          next[idx] = pack
        } else {
          next.push(pack)
        }
        return { packs: next }
      })
    },

    async removePack(storyKey) {
      const rows = await dbGetByStoryKey(storyKey)
      for (const row of rows) {
        await dbDelete(row.packId)
      }
      set((state) => ({
        packs: state.packs.filter((p) => p.storyKey !== storyKey),
      }))
    },

    async remove(storyKey, packVersion) {
      await dbDelete(buildPackId(storyKey, packVersion))
      set((state) => ({
        packs: state.packs.filter(
          (p) =>
            !(p.storyKey === storyKey && p.packVersion === packVersion),
        ),
      }))
    },

    async get(storyKey, packVersion) {
      const row = await dbGet(buildPackId(storyKey, packVersion))
      return row ? fromRow(row) : undefined
    },

    async getByStoryKey(storyKey) {
      const rows = await dbGetByStoryKey(storyKey)
      const active = rows
        .filter((r) => r.status === 'active')
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      const latest = active[active.length - 1]
      return latest ? fromRow(latest) : undefined
    },

    async clearAll() {
      await dbClear()
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      set({ packs: [], initialized: true })
      console.log('[PackRegistry] Cleared all data')
    },
  }),
)
