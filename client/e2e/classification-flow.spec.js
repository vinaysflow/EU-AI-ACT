import { test, expect } from '@playwright/test';
import { seedLocalStorage, stubApiRoutes } from './helpers.js';

test.describe('Classification Flow', () => {
  test('happy-path state unlocks registration through assessment', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    const earlyPhases = ['registration', 'classification', 'assessment'];

    for (const step of earlyPhases) {
      const btn = page.locator(`[data-testid="phase-step-${step}"]`);
      await btn.click();
      await expect(btn).toHaveAttribute('aria-current', 'step');
    }
  });

  test('seeded classification shows result card after navigating to classification', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-classification"]').click();
    await expect(page.locator('[data-testid="classification-result-card"]')).toBeVisible();
    await expect(page.getByText('High Risk')).toBeVisible();
  });
});
