import { test, expect } from '@playwright/test';
import { seedLocalStorage, stubApiRoutes } from './helpers.js';

test.describe('Gap Synthesis Flow', () => {
  test('synthesis phase shows tooltip when locked', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-synthesis"]').click();
    await expect(page.locator('[data-testid="phase-tooltip-synthesis"]')).toBeVisible();
  });

  test('evidence pack phase is accessible with evaluated obligations', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-evidencePack"]').click();
    await expect(page.locator('[data-testid="phase-step-evidencePack"]')).toHaveAttribute('aria-current', 'step');
  });
});
