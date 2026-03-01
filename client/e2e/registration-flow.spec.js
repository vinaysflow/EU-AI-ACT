import { test, expect } from '@playwright/test';

async function completeWizard(page) {
  await page.locator('label:has-text("Deployer")').click();
  await page.locator('label:has-text("Founder Mode")').click();
  await page.locator('label:has-text("AI system is placed on the EU market")').click();
  await page.locator('button:has-text("Credit scoring")').click();
  await page.locator('[data-testid="scope-wizard-submit"]').click();
}

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('eu_ai_act_assessment');
      window.localStorage.removeItem('eu_ai_act_welcome_dismissed');
    });
  });

  test('loads with scope wizard active by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="phase-step-scopeWizard"]')).toHaveAttribute('aria-current', 'step');
  });

  test('shows welcome panel on first visit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('EU AI Act Deployer Assessment')).toBeVisible();
  });

  test('completing wizard unlocks registration', async ({ page }) => {
    await page.goto('/');
    await completeWizard(page);
    await expect(page.locator('[data-testid="phase-step-registration"]')).toHaveAttribute('aria-current', 'step');
  });

  test('filling minimal registration fields and submitting unlocks classification', async ({ page }) => {
    await page.goto('/');
    await completeWizard(page);

    await page.fill('input[name="name"]', 'Test AI System');
    await page.fill('input[name="vendor"]', 'Acme Corp');
    await page.fill('input[name="modelVersion"]', 'v1.0');
    await page.selectOption('select[name="systemType"]', 'ml_statistical');

    await page.fill('textarea[name="intendedPurpose"]',
      'This system evaluates credit applications by scoring applicants based on their financial history, income statements, and transactional patterns to support lending decisions across EU markets.'
    );
    await page.fill('textarea[name="howOutputsUsed"]',
      'Scores are reviewed by credit officers before any approval or denial.'
    );
    await page.selectOption('select[name="deploymentContext"]', 'Customer-facing');
    await page.fill('textarea[name="affectedPersons"]', 'Retail banking customers across the EU');
    await page.selectOption('select[name="inputDataController"]', 'Our organisation');
    await page.selectOption('select[name="primarySector"]', 'Retail banking/credit');
    await page.selectOption('select[name="businessLine"]', 'credit_lending');

    await page.locator('input[name="affectsEuResidents"][value="yes"]').click();

    await page.locator('[data-testid="registration-submit"]').click();

    await expect(page.locator('[data-testid="phase-step-classification"]')).toHaveAttribute('aria-current', 'step');
  });

  test('clicking locked phase shows tooltip', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="phase-step-assessment"]').click();
    await expect(page.locator('[data-testid="phase-tooltip-assessment"]')).toBeVisible();
  });
});
