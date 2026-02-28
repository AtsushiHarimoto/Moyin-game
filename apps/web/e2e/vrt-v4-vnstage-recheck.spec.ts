import { test, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const V1_BASE = 'http://localhost:8088'
const V2_BASE = 'http://localhost:8001'
const OUT_DIR = path.resolve(
  'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_02_vue_vs_react-v4',
)

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

test.describe('VN Stage Recheck (after asset fix)', () => {
  test('VN Stage V1 vs V2', async ({ browser }) => {
    const ssDir = path.join(OUT_DIR, 'screenshots')
    ensureDir(ssDir)

    // V1
    const v1Page = await browser.newPage()
    await v1Page.goto(V1_BASE + '/vn-stage', { waitUntil: 'networkidle', timeout: 30000 })
    await v1Page.waitForTimeout(2000)
    await freezeAndCapture(v1Page, path.join(ssDir, '05_vn_stage-v1-recheck.png'))
    await v1Page.close()

    // V2
    const v2Page = await browser.newPage()
    await v2Page.goto(V2_BASE + '/vn-stage', { waitUntil: 'networkidle', timeout: 30000 })
    await v2Page.waitForTimeout(2000)
    await freezeAndCapture(v2Page, path.join(ssDir, '05_vn_stage-v2-recheck.png'))
    await v2Page.close()
  })

  test('Homepage Title V1 vs V2 (dark theme)', async ({ browser }) => {
    const ssDir = path.join(OUT_DIR, 'screenshots')
    ensureDir(ssDir)

    // V1
    const v1Page = await browser.newPage()
    await v1Page.goto(V1_BASE + '/', { waitUntil: 'networkidle', timeout: 30000 })
    await v1Page.waitForTimeout(1500)
    await freezeAndCapture(v1Page, path.join(ssDir, '01_homepage_title-v1-dark.png'))
    await v1Page.close()

    // V2 - Force dark theme to compare layout
    const v2Page = await browser.newPage()
    await v2Page.goto(V2_BASE + '/', { waitUntil: 'networkidle', timeout: 30000 })
    await v2Page.waitForTimeout(500)
    // Set dark theme via localStorage before reload
    await v2Page.evaluate(() => {
      localStorage.setItem('user-theme', 'dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    await v2Page.reload({ waitUntil: 'networkidle' })
    await v2Page.waitForTimeout(1500)
    await freezeAndCapture(v2Page, path.join(ssDir, '01_homepage_title-v2-dark.png'))
    await v2Page.close()
  })
})
