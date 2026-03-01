import { test, expect } from '@playwright/test';
import { seedLocalStorage, stubApiRoutes } from './helpers.js';

test.describe('Assessment Flow', () => {
  test('progress bar and evaluate button are visible', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-assessment"]').click();
    await expect(page.locator('[data-testid="obligation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="evaluate-btn"]')).toBeVisible();
  });

  test('obligation heading is shown', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-assessment"]').click();
    await expect(page.getByRole('heading', { name: 'Obligation Assessment' })).toBeVisible();
  });
});
