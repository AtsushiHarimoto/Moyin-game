import { test, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * VRT V4 Round 2: V1 vs V2 same-theme + same-language + same-data comparison.
 * Theme: dark (霓虹夜紫 / Neon Violet)
 * Language: zh-TW (繁體中文)
 * Data: story_triangle_love.json injected into both V1 and V2's IndexedDB
 *
 * V1 routes: /Saves, /Setting, /stories, /stories/import, /vn-stage
 * V2 routes: /?tab=save, /settings, /, /vn-stage
 */

const V1_BASE = 'http://localhost:8088'
const V2_BASE = 'http://localhost:8001'
const OUT_DIR = path.resolve(
  'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_02_vue_vs_react-v4',
)
const SS_DIR = path.join(OUT_DIR, 'screenshots-dark-r2')

// Load story JSON once
const STORY_JSON_PATH = path.resolve('d:/AI-Novel-Projects/Moyin/workspace/output/story_triangle_love.json')
const STORY_JSON = JSON.parse(fs.readFileSync(STORY_JSON_PATH, 'utf-8'))

interface PageDef {
  name: string
  v1Path: string
  v2Path: string
  desc: string
  /** True = show title screen (don't set has_seen_title) */
  isTitleScreen?: boolean
}

const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  canvas { opacity: 0 !important; }
`

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function freezeAndCapture(page: Page, filePath: string) {
  await page.addStyleTag({ content: FREEZE_CSS })
  await page.waitForTimeout(500)
  // Use viewport-clipped screenshot (1280x720) for consistent dimensions across V1/V2
  await page.screenshot({ path: filePath, fullPage: false })
  const stat = fs.statSync(filePath)
  console.log(`  Saved: ${path.basename(filePath)} (${(stat.size / 1024).toFixed(0)}KB)`)
}

/** Force theme=dark + locale=zh-TW via localStorage; optionally skip title screen */
async function forceThemeAndLocale(page: Page, skipTitle: boolean) {
  await page.evaluate((skip) => {
    localStorage.setItem('user-theme', 'dark')
    localStorage.setItem('user-locale', 'zh-TW')
    if (skip) {
      sessionStorage.setItem('has_seen_title', 'true')
    }
    document.documentElement.setAttribute('data-theme', 'dark')
  }, skipTitle)
}

/**
 * Inject story into MoyinVnDb IndexedDB.
 * Opens at current version (no version conflict with running Dexie).
 * Falls back to creating DB if storyPacks store doesn't exist.
 */
async function injectStoryToIndexedDB(page: Page, storyJson: Record<string, unknown>) {
  await page.evaluate(async (data) => {
    const manifest = data.manifest as { storyKey: string; packVersion: string; schemaVersion?: number; title?: string }
    const packId = `${manifest.storyKey}@${manifest.packVersion}`
    const row = {
      packId,
      storyKey: manifest.storyKey,
      packVersion: manifest.packVersion,
      schemaVersion: manifest.schemaVersion || 1,
      protocolVersionPin: null,
      title: manifest.title || null,
      status: 'active',
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload: data,
      rawPayload: null,
      checksum: null,
      warnings: null,
      errors: null,
    }

    // Helper: write row to an open DB
    function writeRow(db: IDBDatabase): Promise<void> {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('storyPacks', 'readwrite')
        const store = tx.objectStore('storyPacks')
        store.put(row)
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      })
    }

    // Try 1: Open without version (current version, no upgrade)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('MoyinVnDb')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).catch(() => null)

    if (db && db.objectStoreNames.contains('storyPacks')) {
      await writeRow(db)
      return
    }
    if (db) db.close()

    // Try 2: DB exists but no storyPacks store, or DB doesn't exist.
    // Create with version bump or fresh version 1.
    const currentVersion = db ? db.version : 0
    const newVersion = currentVersion + 1

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('MoyinVnDb', newVersion)
      req.onupgradeneeded = () => {
        const upgradeDb = req.result
        if (!upgradeDb.objectStoreNames.contains('storyPacks')) {
          const store = upgradeDb.createObjectStore('storyPacks', { keyPath: 'packId' })
          store.createIndex('storyKey', 'storyKey', { unique: false })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('importedAt', 'importedAt', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
      req.onsuccess = () => writeRow(req.result).then(resolve, reject)
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('DB blocked by active connection'))
    })
  }, storyJson)
}

/**
 * Inject story into V2 via localStorage legacy migration.
 * V2's usePackRegistryStore.init() calls migrateLegacyStorage() which reads
 * from localStorage key 'moyin_story_packs' and writes to Dexie IndexedDB.
 * This is more reliable than raw IndexedDB injection which can conflict with Dexie connections.
 */
async function injectStoryViaLocalStorage(page: Page, storyJson: Record<string, unknown>) {
  await page.evaluate((data) => {
    const manifest = data.manifest as { storyKey: string; packVersion: string; schemaVersion?: number; title?: string }
    // StoryPack format expected by migrateLegacyStorage
    const pack = {
      storyKey: manifest.storyKey,
      packVersion: manifest.packVersion,
      schemaVersion: String(manifest.schemaVersion || 1),
      importedAt: Date.now(),
      status: 'valid',
      payload: data,
      title: manifest.title || undefined,
    }
    localStorage.setItem('moyin_story_packs', JSON.stringify([pack]))
    console.log('[VRT] Injected story via localStorage:', manifest.storyKey)
  }, storyJson)
}

/** Setup a page: navigate to base, set theme/locale, inject story, then go to target */
async function setupAndCapture(
  browser: import('@playwright/test').Browser,
  baseUrl: string,
  targetPath: string,
  filePath: string,
  storyJson: Record<string, unknown>,
  skipTitle: boolean,
  label: string,
) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await ctx.newPage()
  try {
    // 1. Navigate to base to initialize app & IndexedDB (networkidle ensures full load)
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000) // Wait for Dexie DB init

    // 2. Set theme, locale, title screen bypass
    await forceThemeAndLocale(page, skipTitle)

    // 3. Inject story data
    if (baseUrl === V2_BASE) {
      // V2: Use localStorage injection (Dexie migrateLegacyStorage picks it up on next load)
      await injectStoryViaLocalStorage(page, storyJson)
    } else {
      // V1: Use raw IndexedDB injection
      await injectStoryToIndexedDB(page, storyJson)
    }

    // 4. Navigate to target page (full reload picks up localStorage + DB)
    await page.goto(baseUrl + targetPath, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2500) // Wait for rendering + data loading

    // 5. For V2: verify pack registry loaded data
    if (baseUrl === V2_BASE) {
      const packCount = await page.evaluate(async () => {
        return await new Promise<number>((resolve) => {
          const req = indexedDB.open('MoyinVnDb')
          req.onsuccess = () => {
            const db = req.result
            if (!db.objectStoreNames.contains('storyPacks')) {
              db.close()
              resolve(-1)
              return
            }
            const tx = db.transaction('storyPacks', 'readonly')
            const store = tx.objectStore('storyPacks')
            const countReq = store.count()
            countReq.onsuccess = () => {
              db.close()
              resolve(countReq.result)
            }
            countReq.onerror = () => {
              db.close()
              resolve(-2)
            }
          }
          req.onerror = () => resolve(-3)
        })
      })
      console.log(`  [${label}] IndexedDB storyPacks count: ${packCount}`)
    }

    // 6. Capture
    await freezeAndCapture(page, filePath)
  } catch (e) {
    console.error(`[${label}] failed:`, e)
    await page.setContent(`<html><body style="background:#111;color:#fff"><h1>${label} Capture Failed</h1><pre>${e}</pre></body></html>`)
    await page.screenshot({ path: filePath })
  }
  await ctx.close()
}

const PAGES: PageDef[] = [
  {
    name: '01_homepage_title',
    v1Path: '/',
    v2Path: '/',
    desc: 'Homepage Title Screen',
    isTitleScreen: true,
  },
  {
    name: '02_stories_dashboard',
    v1Path: '/',
    v2Path: '/',
    desc: 'Stories Dashboard',
  },
  {
    name: '03_saves',
    v1Path: '/Saves',
    v2Path: '/?tab=save',
    desc: 'Saves Page',
  },
  {
    name: '04_settings',
    v1Path: '/Setting',
    v2Path: '/settings',
    desc: 'Settings Page',
  },
  {
    name: '05_vn_stage',
    v1Path: '/vn-stage',
    v2Path: '/vn-stage',
    desc: 'VN Stage',
  },
  {
    name: '06_stories_list',
    v1Path: '/stories',
    v2Path: '/stories',
    desc: 'Stories List',
  },
  {
    name: '07_story_import',
    v1Path: '/stories/import',
    v2Path: '/stories/import',
    desc: 'Story Import',
  },
]

test.describe('VRT V4 Round 2 — Dark + zh-TW + Same Data Parity', () => {
  test.beforeAll(() => {
    ensureDir(SS_DIR)
  })

  for (const pg of PAGES) {
    test(`${pg.desc}`, async ({ browser }) => {
      const v1File = path.join(SS_DIR, `${pg.name}-v1.png`)
      const v2File = path.join(SS_DIR, `${pg.name}-v2.png`)
      const skipTitle = !pg.isTitleScreen

      // V1 screenshot
      await setupAndCapture(browser, V1_BASE, pg.v1Path, v1File, STORY_JSON, skipTitle, `V1:${pg.desc}`)

      // V2 screenshot
      await setupAndCapture(browser, V2_BASE, pg.v2Path, v2File, STORY_JSON, skipTitle, `V2:${pg.desc}`)
    })
  }
})
