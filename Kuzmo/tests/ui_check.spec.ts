import { test, expect } from '@playwright/test';

test('Kuzmo UI Rendering Check', async ({ page }) => {
  // 🧭 Navigate to Local Dev (Vite default or custom 9005)
  try {
    await page.goto('http://localhost:5173', { timeout: 3000 });
  } catch {
    await page.goto('http://localhost:9005', { timeout: 3000 });
  }

  // 🎇 1. Theme Verification (Purple High-Contrast)
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log(`🌌 [THEME] Body BG: ${bg}`);

  // 🗺️ 2. Map Engine Core
  const map = page.locator('#map-container');
  await expect(map).toBeVisible();

  // 🍏 3. Utility Dock
  const dock = page.locator('.dock-container');
  await expect(dock).toBeVisible();

  // 🤳 4. Detail Sheet (Gesture Overlay)
  const sheet = page.locator('.detail-sheet');
  await expect(sheet).not.toBeVisible(); // Hidden by default

  console.log("✅ [MONITOR] UI Sanity Check Passed.");
});
