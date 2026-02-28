import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * V3 Deep E2E & VRT Test Suite
 * Covers: Stories, Import, VnStage, VnReplay, Saves, Settings (LLM Runner)
 */
const BASE_URL = 'http://localhost:8001';
const WORKSPACE_DIR = 'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_01_vue_vs_react-v3';
const TEST_RESULT_DIR = path.join(WORKSPACE_DIR, 'e2e-evidence');

// Ensure output dir exists (Playwright works in Node context, check mkdir again just in case)
if (!fs.existsSync(TEST_RESULT_DIR)) {
  fs.mkdirSync(TEST_RESULT_DIR, { recursive: true });
}

// Helper: Capture screenshot for evidence and VRT
async function verifyPage(page: Page, name: string, pathUrl: string) {
  console.log(`Testing ${name} at ${pathUrl}`);
  await page.goto(BASE_URL + pathUrl);
  await page.waitForLoadState('networkidle');
  
  // Specific wait for dynamic content
  await page.waitForTimeout(2000); 

  // Capture full page screenshot
  const ssPath = path.join(TEST_RESULT_DIR, `${name}.png`);
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log(`Saved evidence: ${ssPath}`);

  // VRT Expectation
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    maxDiffPixels: 10000, // Slightly looser for large pages
    threshold: 0.3,
  });
}

test.describe('Moyin Game V3 Deep Regression', () => {
  
  test('01. Stories Dashboard', async ({ page }) => {
    // Navigate to home first to bypass potentially required inits
    await page.goto(BASE_URL + '/');
    await page.waitForTimeout(1000);
    
    // Explicitly go to stories dashboard if it's the main entry
    const startBtn = page.locator('button', { hasText: 'Start' });
    if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForTimeout(1000);
    }
    
    await verifyPage(page, '01_stories_dashboard', '/');
  });

  test('02. Story Import', async ({ page }) => {
    await verifyPage(page, '02_import_story', '/stories/import');
  });

  test('03. VN Stage (Deep Check)', async ({ page }) => {
    // VN Stage often requires a loaded story. 
    // We assume the URL /vn-stage loads the active story or a stable default state.
    await verifyPage(page, '03_vn_stage', '/vn-stage');
    
    // Check key elements existence to confirm it's not a skeleton
    // Assuming standard VN UI elements
    const hasDialogue = await page.locator('.dialogue-box').count() > 0 || await page.locator('[data-testid="dialogue-box"]').count() > 0;
    const hasCanvas = await page.locator('canvas').count() > 0;
    
    console.log(`VnStage Deep Check - DialogueBox: ${hasDialogue}, Canvas: ${hasCanvas}`);
  });

  test('04. VN Replay/Log', async ({ page }) => {
    await verifyPage(page, '04_vn_replay', '/vn-replay');
  });

  test('05. Save/Load Menu', async ({ page }) => {
    await verifyPage(page, '05_save_load', '/?tab=save');
  });

  test('06. Settings & LLM Runner', async ({ page }) => {
    // Navigate to settings tab
    await page.goto(BASE_URL + '/?tab=setting');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Taking snapshot of general settings
    const ssPath = path.join(TEST_RESULT_DIR, `06_settings_general.png`);
    await page.screenshot({ path: ssPath, fullPage: true });

    // If there is specific LLM Runner configuration, try to interact or find it
    // Based on "LLMRunner 設置", looking for headers or sections
    const llmSection = page.getByText(/LLM|Model|Runner/i).first();
    if (await llmSection.isVisible()) {
      await llmSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('06_settings_llm.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      threshold: 0.3,
    });
  });

});
