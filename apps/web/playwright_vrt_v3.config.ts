import { defineConfig } from '@playwright/test';
import path from 'path';

// Target directory for results in workspace
const WORKSPACE_DIR = 'd:/AI-Novel-Projects/Moyin/workspace/issues/DOING/ISSUE-109-MOYINGAME-REFACTOR-SWITCH-REACT/2026-02-08_01_vue_vs_react-v3';

export default defineConfig({
  testDir: './e2e',
  snapshotDir: path.join(WORKSPACE_DIR, 'snapshots'),
  outputDir: path.join(WORKSPACE_DIR, 'test-results'),
  reporter: [['json', { outputFile: path.join(WORKSPACE_DIR, 'results.json') }], ['list']],
  use: {
    headless: true, 
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  timeout: 60000,
});
