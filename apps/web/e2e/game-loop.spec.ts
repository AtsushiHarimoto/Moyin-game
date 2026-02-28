/**
 * E2E: Complete Game Loop Verification
 *
 * Validates: story import → start → dialogue → user input → gateway LLM → response → backlog
 *
 * Prerequisites:
 *   - Dev server running at localhost:8001
 *   - moyin-gateway running at localhost:9009
 *   - Ollama running at localhost:11434 with qwen2.5:14b-instruct
 *
 * Run: npx playwright test --config=playwright.gameloop.config.ts
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORY_FIXTURE = path.resolve(__dirname, 'fixtures/test-story-minimal.json')

/**
 * Gateway auth token — matches `api_key` in moyin-gateway setting.toml.
 * The frontend reads from localStorage('moyin_api_token') and sends as Bearer token.
 */
const GATEWAY_AUTH_TOKEN = process.env.MOYIN_E2E_AUTH_TOKEN ?? 'sk-moyin-test-key'

// Skip in CI where gateway + ollama are not available
const describeGameLoop = process.env.CI
  ? test.describe.skip
  : test.describe

describeGameLoop('Game Loop E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Log browser console for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`)
      }
    })
    page.on('pageerror', (err) => console.log(`[Page Error] ${err.message}`))
  })

  test('Step 1: Import test story via file upload', async ({ page }) => {
    await page.goto('/stories/import')

    // Wait for import page to load
    await expect(page.getByRole('heading', { name: /import|導入|导入/i })).toBeVisible({ timeout: 10_000 })

    // Upload the test story fixture
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(STORY_FIXTURE)

    // Wait for parsing to complete and validation panel to appear
    await expect(page.locator('text=/E2E Test Story/i')).toBeVisible({ timeout: 10_000 })

    // Click confirm / import button
    const confirmBtn = page.locator('button').filter({ hasText: /confirm|import|匯入|導入|导入/i }).first()
    await confirmBtn.click()

    // Wait for Step 3: Flow Canvas Preview (locale-agnostic)
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /library|故事庫|資料庫|资料库/i })).toBeVisible({ timeout: 10_000 })
  })

  test('Step 2-7: Full game loop via moyin-gateway', async ({ page }) => {
    // --- Setup: inject auth token + story pack ---
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Set gateway auth token in localStorage so submitTalk can authenticate
    await page.evaluate((token) => {
      localStorage.setItem('moyin_api_token', token)
    }, GATEWAY_AUTH_TOKEN)

    // Inject story pack into IndexedDB (must match usePackRegistryStore schema)
    const storyJson = JSON.parse(readFileSync(STORY_FIXTURE, 'utf-8'))
    await page.evaluate(async (story) => {
      const dbName = 'moyin_db'
      const dbVersion = 1
      const storeName = 'storyPacks'
      const packId = `${story.manifest.storyKey}@${story.manifest.packVersion}`

      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVersion)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'packId' })
            store.createIndex('storyKey', 'storyKey', { unique: false })
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          store.put({
            packId,
            storyKey: story.manifest.storyKey,
            packVersion: story.manifest.packVersion,
            schemaVersion: story.manifest.schemaVersion || 1,
            title: story.manifest.title,
            status: 'active',
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            payload: story,
            checksum: null,
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
        req.onerror = () => reject(req.error)
      })
    }, storyJson)

    // --- Step 2: Navigate to VN Stage and start game ---
    await page.goto('/vn-stage?storyKey=e2e_test_story&mode=new')

    const vnStage = page.locator('[data-testid="vn-stage-page"]')
    await expect(vnStage).toBeVisible({ timeout: 15_000 })

    // --- Step 2 verify: DialogueBox shows first frame (scene title) ---
    const dialogueBox = page.locator('[data-testid="dialogue-box"]')
    await expect(dialogueBox).toBeVisible({ timeout: 10_000 })
    await expect(dialogueBox).toContainText(/Welcome Scene/i, { timeout: 10_000 })

    // --- Step 3: Click to advance (next) ---
    // First frame has canNext: true, click dialogue box to advance.
    // (Avoid character-layer click interception; DialogueBox click bubbles to stage.)
    await dialogueBox.click()

    // frameQueue is empty → transitions to await_input → CommandComposer auto-opens
    const commandComposer = page.locator('[data-testid="command-composer"]')
    await expect(commandComposer).toBeVisible({ timeout: 10_000 })

    // --- Step 4: Enter text in Talk tab ---
    const talkTab = commandComposer.locator('button').filter({ hasText: /talk/i })
    if (await talkTab.isVisible()) {
      await talkTab.click()
    }

    const textarea = commandComposer.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill('你好，很高興認識你！')

    // --- Step 5: Submit → gateway /v1/game/turn → phase:busy ---
    const submitBtn = commandComposer.locator('button').filter({ hasText: /submit/i })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    await submitBtn.click()

    // CommandComposer closes after submit
    await expect(commandComposer).not.toBeVisible({ timeout: 5_000 })

    // Brief wait for busy phase + thinking bubble
    await page.waitForTimeout(500)

    // --- Step 6: Wait for gateway LLM response ---
    // Gateway calls ollama → returns structured frames → dialogue box updates
    // Allow up to 90s for ollama inference
    await expect(async () => {
      const text = await dialogueBox.innerText()
      // Should have real content (not thinking dots or initial scene title)
      expect(text.length).toBeGreaterThan(5)
      expect(text).not.toContain('Welcome Scene')
    }).toPass({ timeout: 90_000, intervals: [2_000] })

    const dialogueText = await dialogueBox.innerText()
    console.log(`[Game Loop] Gateway LLM response: ${dialogueText.slice(0, 100)}...`)

    // --- Step 7: Verify backlog contains player message + LLM response ---
    // Open backlog via keyboard shortcut (H key) — need to be in playing/await_input phase
    // First close any modals and ensure we're not in a blocked state
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Try clicking the backlog button (clock icon, top-right area)
    const backlogBtn = vnStage.locator('button').filter({ has: page.locator('svg path[d*="12 8"]') })
    if (await backlogBtn.isVisible()) {
      await backlogBtn.click()
    } else {
      await page.keyboard.press('h')
    }

    const backlogPanel = page.locator('[data-testid="backlog-panel"]')
    await expect(backlogPanel).toBeVisible({ timeout: 5_000 })

    // Backlog should contain the player's submitted text
    await expect(backlogPanel).toContainText(/你好/, { timeout: 5_000 })

    // Backlog should also have the LLM's response (more than just the player's message)
    const backlogText = await backlogPanel.innerText()
    expect(backlogText.length).toBeGreaterThan(10)
    console.log(`[Game Loop] Backlog verified: ${backlogText.slice(0, 200)}...`)

    console.log('[Game Loop] ✓ Full game loop via moyin-gateway completed successfully!')
  })

  test('Step 2-7 + save/load/ending lifecycle', async ({ page }) => {
    // --- Step 0: Setup — inject auth token + story pack ---
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Clear IndexedDB databases for clean state
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases()
      for (const db of dbs) {
        if (db.name && (db.name === 'MoyinVnDb' || db.name === 'moyin_db')) {
          indexedDB.deleteDatabase(db.name)
        }
      }
    })
    await page.waitForTimeout(500)

    // Set locale to zh-TW
    await page.evaluate(() => {
      localStorage.setItem('user-locale', 'zh-TW')
    })

    // Set gateway auth token
    await page.evaluate((token) => {
      localStorage.setItem('moyin_api_token', token)
    }, GATEWAY_AUTH_TOKEN)

    // Inject story pack into IndexedDB
    const storyJson = JSON.parse(readFileSync(STORY_FIXTURE, 'utf-8'))
    await page.evaluate(async (story) => {
      const dbName = 'moyin_db'
      const dbVersion = 1
      const storeName = 'storyPacks'
      const packId = `${story.manifest.storyKey}@${story.manifest.packVersion}`

      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVersion)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'packId' })
            store.createIndex('storyKey', 'storyKey', { unique: false })
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          store.put({
            packId,
            storyKey: story.manifest.storyKey,
            packVersion: story.manifest.packVersion,
            schemaVersion: story.manifest.schemaVersion || 1,
            title: story.manifest.title,
            status: 'active',
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            payload: story,
            checksum: null,
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
        req.onerror = () => reject(req.error)
      })
    }, storyJson)

    // --- Step 2: Navigate to VN Stage and start new game ---
    await page.goto('/vn-stage?storyKey=e2e_test_story&mode=new')

    const vnStage = page.locator('[data-testid="vn-stage-page"]')
    await expect(vnStage).toBeVisible({ timeout: 15_000 })

    // Verify first frame displays scene title
    const dialogueBox = page.locator('[data-testid="dialogue-box"]')
    await expect(dialogueBox).toBeVisible({ timeout: 10_000 })
    await expect(dialogueBox).toContainText(/Welcome Scene/i, { timeout: 10_000 })

    // Click dialogue box to advance past intro frame
    await dialogueBox.click()

    // CommandComposer should auto-open in await_input phase
    const commandComposer = page.locator('[data-testid="command-composer"]')
    await expect(commandComposer).toBeVisible({ timeout: 10_000 })

    // --- Step 2b: Submit first dialogue (real LLM) ---
    const talkTab = commandComposer.locator('button').filter({ hasText: /talk/i })
    if (await talkTab.isVisible()) {
      await talkTab.click()
    }

    const textarea = commandComposer.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill('你好，很高興認識你！')

    const submitBtn = commandComposer.locator('button').filter({ hasText: /submit|提交/i })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    await submitBtn.click()

    // Wait for LLM response
    await expect(async () => {
      const text = await dialogueBox.innerText()
      expect(text.length).toBeGreaterThan(5)
      expect(text).not.toContain('Welcome Scene')
    }).toPass({ timeout: 90_000, intervals: [2_000] })

    console.log('[Game Loop] LLM response received, proceeding to save...')

    // --- Step 3: Mid-game save ---
    // Close CommandComposer overlay first (it auto-opens on await_input and covers the FAB)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Open FAB system menu
    const fabBtn = page.locator('[data-testid="fab-menu-button"]')
    await expect(fabBtn).toBeVisible({ timeout: 5_000 })
    await fabBtn.click()

    // Click save option in system menu
    const systemMenu = page.locator('[data-testid="vn-system-menu"]')
    await expect(systemMenu).toBeVisible({ timeout: 5_000 })
    const saveMenuBtn = systemMenu.locator('button').filter({ hasText: /存檔|save/i }).first()
    await saveMenuBtn.click()

    // SaveDrawer should appear — click quick save
    const saveDrawer = page.locator('[data-testid="vn-quick-save-drawer"]')
    await expect(saveDrawer).toBeVisible({ timeout: 5_000 })

    const quickSaveBtn = saveDrawer.locator('button').filter({ hasText: /快速保存|quick save/i }).first()
    await expect(quickSaveBtn).toBeVisible({ timeout: 5_000 })
    await quickSaveBtn.click()

    // Verify a save slot appears in the drawer
    await expect(async () => {
      const slotCount = await saveDrawer.locator('[data-testid="save-slot-card"], .save-slot-item').count()
      expect(slotCount).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 10_000, intervals: [1_000] })

    console.log('[Game Loop] Save slot created successfully')

    // Close the save drawer
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // --- Step 4: Trigger ending via mocked gateway response ---
    // Mock the gateway to return ending signal
    await page.route('**/api/v1/game/turn', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          meta: { conversation_id: 'mock-ending' },
          frames: [{ id: 'ending-001', speaker: 'c_npc', text: '這是美好的結局。', canNext: false }],
          proposals: [{ eventSignals: ['ending:happy_end'] }],
        }),
      })
    })

    // After saving, phase is still 'playing' (LLM response frame not yet consumed).
    // btn-open-command only renders when phase !== 'playing' (page.tsx:557).
    // Advance through remaining frames by clicking dialogue box — when frames exhaust,
    // phase transitions playing→await_input and phase watcher auto-opens CommandComposer.
    await expect(async () => {
      if (await commandComposer.isHidden()) {
        await dialogueBox.click()
      }
      await expect(commandComposer).toBeVisible()
    }).toPass({ timeout: 15_000, intervals: [1_000] })

    const textarea2 = commandComposer.locator('textarea')
    await expect(textarea2).toBeVisible({ timeout: 5_000 })
    await textarea2.fill('帶我去結局吧')

    const submitBtn2 = commandComposer.locator('button').filter({ hasText: /submit|提交/i })
    await expect(submitBtn2).toBeEnabled({ timeout: 5_000 })
    await submitBtn2.click()

    // Wait for the ending response to be processed
    await expect(dialogueBox).toContainText(/這是美好的結局/, { timeout: 10_000 })

    // Unroute to restore real gateway
    await page.unroute('**/api/v1/game/turn')

    // --- Step 4b: Verify ending panel appears ---
    const endingPanel = page.locator('[data-testid="ending-panel"]')
    await expect(endingPanel).toBeVisible({ timeout: 10_000 })
    console.log('[Game Loop] Ending panel appeared')

    // --- Step 5: Return to home ---
    const returnHomeBtn = endingPanel.locator('button').filter({ hasText: /返回主頁|return|home/i }).first()
    if (await returnHomeBtn.isVisible()) {
      await returnHomeBtn.click()
    } else {
      // Fallback: navigate directly
      await page.goto('/')
    }

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    console.log('[Game Loop] Returned to home page')

    // --- Step 6: Load from save and continue playing ---
    await page.goto('/vn-stage?storyKey=e2e_test_story&mode=new')
    await expect(vnStage).toBeVisible({ timeout: 15_000 })

    // Wait for initial frame
    await expect(dialogueBox).toBeVisible({ timeout: 10_000 })

    // Advance past intro frame and close any overlay before accessing FAB
    await dialogueBox.click()
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Open FAB → load
    await fabBtn.click()
    await expect(systemMenu).toBeVisible({ timeout: 5_000 })
    const loadMenuBtn = systemMenu.locator('button').filter({ hasText: /讀檔|load/i }).first()
    await loadMenuBtn.click()

    // SaveDrawer load tab should appear
    await expect(saveDrawer).toBeVisible({ timeout: 5_000 })

    // Switch to load tab if needed
    const loadTab = saveDrawer.locator('button').filter({ hasText: /讀取數據|load/i }).first()
    if (await loadTab.isVisible()) {
      await loadTab.click()
    }

    // Click the save slot to load
    const slotCard = saveDrawer.locator('[data-testid="save-slot-card"], .save-slot-item').first()
    await expect(slotCard).toBeVisible({ timeout: 5_000 })
    await slotCard.click()

    // Wait for game to restore from save
    await page.waitForTimeout(2000)

    // Close drawer if still open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // --- Step 6b: Verify we can continue playing after load ---
    // Phase is await_input (restored from save). Same as Step 4: phase watcher
    // won't re-fire because prevPhaseRef is already 'await_input'.
    // Use btn-open-command to explicitly open CommandComposer.
    const openCommandBtn2 = page.locator('[data-testid="btn-open-command"]')
    await expect(openCommandBtn2).toBeVisible({ timeout: 10_000 })
    await openCommandBtn2.click()
    await expect(commandComposer).toBeVisible({ timeout: 5_000 })

    // Submit a new message to verify gameplay continues (real LLM)
    {
      const textarea3 = commandComposer.locator('textarea')
      await expect(textarea3).toBeVisible({ timeout: 5_000 })
      await textarea3.fill('存檔讀取後繼續對話')

      const submitBtn3 = commandComposer.locator('button').filter({ hasText: /submit|提交/i })
      await expect(submitBtn3).toBeEnabled({ timeout: 5_000 })
      await submitBtn3.click()

      // Wait for LLM response to verify gameplay continues
      await expect(async () => {
        const text = await dialogueBox.innerText()
        expect(text.length).toBeGreaterThan(5)
      }).toPass({ timeout: 90_000, intervals: [2_000] })

      console.log('[Game Loop] Successfully continued playing after load!')
    }

    console.log('[Game Loop] ✓ Complete save/load/ending lifecycle test passed!')
  })
})
