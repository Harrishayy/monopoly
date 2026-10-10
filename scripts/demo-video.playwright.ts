import { expect, test } from '@playwright/test';

/**
 * Walks the Loom shot list at a readable pace. The live phone call is not automated.
 *
 *   pnpm demo
 *   pnpm exec playwright test -c scripts/playwright.config.ts
 */
test('60-second video sequence', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Video run' })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare and begin' }).click();
  await expect(page.getByRole('heading', { name: 'Architecture' })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(5_000);

  await page.goto('/cases/LIVE-DEMO?tab=conversation');
  await expect(page.getByRole('heading', { name: /No heating/ })).toBeVisible();
  await expect(page.getByText('two-year-old')).toBeVisible();
  await expect(page.getByText(/error code/i).first()).toBeVisible();
  await page.waitForTimeout(8_000);

  await page.getByRole('tab', { name: /Review messages/ }).click();
  await expect(page.getByText(/needs a person/i).first()).toBeVisible();
  await page.waitForTimeout(4_000);

  await page.getByRole('button', { name: 'Call tenant' }).waitFor({ state: 'visible' });
});
