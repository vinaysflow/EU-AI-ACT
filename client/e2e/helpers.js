import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, '../../scripts/synthetic-assessment-data.js');

let _syntheticModule;

async function loadSyntheticData() {
  if (!_syntheticModule) {
    _syntheticModule = await import(dataPath);
  }
  return _syntheticModule;
}

export async function seedLocalStorage(page, variant = 'happyPath') {
  const data = await loadSyntheticData();
  const map = {
    happyPath: data.happyPathAssessment,
    unhappyPath: data.unhappyPathAssessment,
    edgeCase: data.edgeCaseAssessment,
  };
  const state = map[variant] || data.happyPathAssessment;

  await page.addInitScript((serialised) => {
    window.localStorage.setItem('eu_ai_act_assessment', serialised);
  }, JSON.stringify(state));
}

export async function stubApiRoutes(page) {
  await page.route('**/api/synthesise', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        synthesis: {
          riskPosture: 'MEDIUM',
          keyInsights: ['Synthetic test insight.'],
          patternAnalysis: 'No critical patterns detected in synthetic data.',
          gapRegister: [],
          remediationPhases: [],
        },
        synthesisedAt: new Date().toISOString(),
      }),
    }),
  );

  await page.route('**/api/report', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ artefactData: {}, reportMetadata: {} }),
    }),
  );

  await page.route('**/api/evaluate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        obligationId: 'test',
        evaluationResult: {
          verdict: 'COMPLIANT',
          riskSeverity: 'LOW',
          gapDescription: 'None',
          legalCertainty: 'CLEAR_TEXT',
          confidenceLevel: 'HIGH',
          quotedText: 'Test quote.',
          sourceChunkId: 'test_chunk',
          requiresLegalAdvice: false,
          requiresManualVerification: false,
        },
      }),
    }),
  );

  await page.route('**/api/classify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rulesEngineResult: {
          finalClassification: 'HIGH_RISK',
          step1_prohibition: { isProhibited: false, matchedProvisions: [], flags: [] },
          step2_definition: { possiblyExcluded: false, reason: null },
          step3_annexIII: { anyMatch: true, matchedDomains: ['5b_credit'], matchDetails: {} },
          step4_derogation: { profilingDetected: false, derogationPossible: false, flags: [] },
          step5_role: { primaryRole: 'DEPLOYER', providerRisk: false, flags: [] },
          requiresLegalReview: false,
          flags: [],
        },
      }),
    }),
  );
}
