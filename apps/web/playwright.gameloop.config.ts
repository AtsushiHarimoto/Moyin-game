import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'game-loop.spec.ts',
  outputDir: './test-results-gameloop',
  reporter: [['list']],
  use: {
    headless: true,
    baseURL: 'http://localhost:8001',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  // LLM responses can be slow (ollama local inference)
  timeout: 120_000,
  expect: { timeout: 60_000 },
  workers: 1,
  webServer: {
    command: 'pnpm dev',
    port: 8001,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
