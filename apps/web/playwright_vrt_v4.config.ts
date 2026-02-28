import { defineConfig } from '@playwright/test'
import path from 'path'

const OUT_DIR = path.resolve(
  'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_02_vue_vs_react-v4',
)

export default defineConfig({
  testDir: './e2e',
  testMatch: 'vrt-v4-dark-theme.spec.ts',
  outputDir: path.join(OUT_DIR, 'test-results'),
  reporter: [['json', { outputFile: path.join(OUT_DIR, 'results.json') }], ['list']],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  timeout: 90000,
  workers: 1,
})
