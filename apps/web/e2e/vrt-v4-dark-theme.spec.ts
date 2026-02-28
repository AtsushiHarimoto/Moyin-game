import { test, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * V4 VRT: V1 vs V2 comparison with V2 in dark theme (matching V1 default).
 * This isolates layout/structural differences from theme differences.
 */

const V1_BASE = 'http://localhost:8088'
const V2_BASE = 'http://localhost:8001'
const OUT_DIR = path.resolve(
  'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_02_vue_vs_react-v4',
)

interface PageDef {
  name: string
  v1Path: string
  v2Path: string
  desc: string
  clickStart: boolean
  v1Tab?: string
}

const PAGES: PageDef[] = [
  { name: '01_homepage_title', v1Path: '/', v2Path: '/', desc: 'Homepage Title Screen', clickStart: false },
  { name: '02_stories_dashboard', v1Path: '/', v2Path: '/?tab=custom', desc: 'Stories Dashboard', clickStart: true },
  { name: '04_settings', v1Path: '/', v2Path: '/?tab=setting', desc: 'Settings Page', clickStart: true, v1Tab: 'setting' },
  { name: '05_vn_stage', v1Path: '/vn-stage', v2Path: '/vn-stage', desc: 'VN Stage', clickStart: false },
]

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
  await page.screenshot({ path: filePath, fullPage: true })
  const stat = fs.statSync(filePath)
  console.log(`  Saved: ${path.basename(filePath)} (${(stat.size / 1024).toFixed(0)}KB)`)
}

test.describe('V1 vs V2 (Dark Theme) Layout Parity', () => {
  for (const pg of PAGES) {
    test(`${pg.desc}`, async ({ browser }) => {
      const ssDir = path.join(OUT_DIR, 'screenshots-dark')
      ensureDir(ssDir)

      const v1File = path.join(ssDir, `${pg.name}-v1.png`)
      const v2File = path.join(ssDir, `${pg.name}-v2-dark.png`)

      // --- V1 ---
      const v1Page = await browser.newPage()
      try {
        await v1Page.goto(V1_BASE + pg.v1Path, { waitUntil: 'networkidle', timeout: 30000 })
        await v1Page.waitForTimeout(1500)
        if (pg.clickStart) {
          const startBtn = v1Page.locator('button').filter({ hasText: /start|開始|スタート/i }).first()
          if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await startBtn.click()
            await v1Page.waitForTimeout(2000)
          }
          if (pg.v1Tab) {
            const tabBtn = v1Page.locator(`[data-tab="${pg.v1Tab}"], button`).filter({ hasText: new RegExp(pg.v1Tab, 'i') }).first()
            if (await tabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await tabBtn.click()
              await v1Page.waitForTimeout(1500)
            }
          }
        }
        await freezeAndCapture(v1Page, v1File)
      } catch (e) {
        console.error(`[V1] Failed: ${e}`)
        await v1Page.setContent('<html><body style="background:#111;color:#fff"><h1>V1 Fail</h1></body></html>')
        await v1Page.screenshot({ path: v1File })
      }
      await v1Page.close()

      // --- V2 (dark theme) ---
      const v2Page = await browser.newPage()
      try {
        // Set dark theme before navigating
        await v2Page.goto(V2_BASE + '/', { waitUntil: 'domcontentloaded', timeout: 15000 })
        await v2Page.evaluate(() => {
          localStorage.setItem('user-theme', 'dark')
          document.documentElement.setAttribute('data-theme', 'dark')
        })
        await v2Page.goto(V2_BASE + pg.v2Path, { waitUntil: 'networkidle', timeout: 30000 })
        await v2Page.waitForTimeout(1500)

        if (pg.clickStart && pg.name !== '01_homepage_title') {
          const startBtn = v2Page.locator('button').filter({ hasText: /start|開始|スタート/i }).first()
          if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await startBtn.click()
            await v2Page.waitForTimeout(2000)
          }
        }
        await freezeAndCapture(v2Page, v2File)
      } catch (e) {
        console.error(`[V2] Failed: ${e}`)
        await v2Page.setContent('<html><body style="background:#111;color:#fff"><h1>V2 Fail</h1></body></html>')
        await v2Page.screenshot({ path: v2File })
      }
      await v2Page.close()
    })
  }
})
