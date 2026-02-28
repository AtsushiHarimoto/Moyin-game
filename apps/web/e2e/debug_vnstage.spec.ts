import { test, expect } from '@playwright/test';

test('Debug VnStage Console Errors', async ({ page }) => {
  // Listen for console logs
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

  console.log('Navigating to /vn-stage...');
  await page.goto('http://localhost:8001/vn-stage');
  await page.waitForTimeout(3000);
  
  // Take a screenshot to see what state we are in
  await page.screenshot({ path: 'debug-vnstage.png' });
});
