import { test, expect } from '@playwright/test';
import { seedLocalStorage, stubApiRoutes } from './helpers.js';

test.describe('Report Generation Flow', () => {
  test('report phase is locked when not all obligations evaluated', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);
    await page.goto('/');

    await page.locator('[data-testid="phase-step-report"]').click();
    await expect(page.locator('[data-testid="phase-tooltip-report"]')).toBeVisible();
  });

  test('consultant gate renders when report is accessed directly via seeded complete state', async ({ page }) => {
    await seedLocalStorage(page, 'happyPath');
    await stubApiRoutes(page);

    await page.addInitScript(() => {
      const state = JSON.parse(window.localStorage.getItem('eu_ai_act_assessment'));
      if (!state) return;

      const allOblIds = [
        'aia_art4', 'aia_art26_1', 'aia_art26_2', 'aia_art26_4',
        'aia_art26_5', 'aia_art26_6', 'aia_art26_7', 'aia_art26_9',
        'aia_art26_11', 'aia_art27_1',
      ];

      const existingMap = {};
      for (const ob of state.obligations || []) {
        existingMap[ob.obligationId] = ob;
      }

      state.obligations = allOblIds.map((id) => existingMap[id] || {
        obligationId: id,
        status: 'evaluated',
        evidence: {
          controlDescription: 'Synthetic control.',
          evidenceReference: 'Policy v1',
          evidenceType: 'Policy',
          confidenceQualifier: 'confirmed',
        },
        evaluationResult: {
          evaluation: {
            verdict: 'COMPLIANT',
            riskSeverity: 'LOW',
            gapDescription: null,
            legalCertainty: 'CLEAR_TEXT',
            confidence: 'HIGH',
            reasoning: 'Met per synthetic data.',
            requirementsSummary: 'Obligation met.',
            requiresLegalAdvice: false,
          },
          citationVerified: true,
          requiresManualVerification: false,
        },
      });

      window.localStorage.setItem('eu_ai_act_assessment', JSON.stringify(state));
    });

    await page.goto('/');

    await page.locator('[data-testid="phase-step-report"]').click();
    await expect(page.locator('[data-testid="phase-step-report"]')).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('[data-testid="consultant-gate"]')).toBeVisible();
  });
});
