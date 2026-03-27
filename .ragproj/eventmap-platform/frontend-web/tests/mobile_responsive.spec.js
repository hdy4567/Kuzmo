import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13 Pro'],
});

test('Mobile UI Responsiveness Check', async ({ page }) => {
  // 1. Navigate to the app
  await page.goto('http://localhost:9005/NewEventMap/');
  
  // 2. Wait for bootstrap
  await page.waitForTimeout(3000);
  
  // 3. Check Top Panel
  const topPanel = page.locator('.top-panel-container');
  await expect(topPanel).toBeVisible();
  
  // 4. Check Mode Switcher
  const modeSwitcher = page.locator('.mode-switcher-wrap');
  await expect(modeSwitcher).toBeVisible();
  
  // 5. Check Country Selector Slider Logic
  const countryTabs = page.locator('.country-tab');
  await expect(countryTabs).toHaveCount(3);
  
  // 6. Navigate to Japan and check indicator
  await countryTabs.nth(1).click();
  await page.waitForTimeout(500);
  const indicator = page.locator('#tab-indicator');
  const transform = await indicator.evaluate(el => window.getComputedStyle(el).transform);
  console.log('Indicator Transform (JP):', transform);
  
  // 7. Check Detail Sheet (Simulate a click or just check initial state)
  // Since we don't have markers easily, we can't click one without more logic.
  // But we can check if it's hidden by default.
  const detailSheet = page.locator('#detail-sheet');
  await expect(detailSheet).not.toHaveClass(/active/);
  
  // 8. Open AI Chat
  const chatFab = page.locator('#chat-fab');
  await chatFab.click();
  await page.waitForTimeout(1000);
  const chatPanel = page.locator('#chat-panel');
  await expect(chatPanel).toBeVisible();
  
  // Check if it takes full width/height on mobile
  const chatWidth = await chatPanel.evaluate(el => el.clientWidth);
  const viewportWidth = page.viewportSize().width;
  console.log(`Chat Width: ${chatWidth}, Viewport Width: ${viewportWidth}`);
  
  // 9. Switch to MEMOREAL mode
  const lockerTab = page.locator('#mode-locker');
  await lockerTab.click();
  await page.waitForTimeout(1000);
  
  // Verify body class
  const bodyClass = await page.evaluate(() => document.body.className);
  console.log('Body Class:', bodyClass);
  expect(bodyClass).toContain('view-locker');
  
  // 10. Check Locker Layout
  const lockerPanel = page.locator('#locker-panel');
  await expect(lockerPanel).toBeVisible();
  
  // Take a screenshot for visual confirmation
  await page.screenshot({ path: 'mobile_ui_check.png', fullPage: true });
});
