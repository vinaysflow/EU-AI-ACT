import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { verifyCitation, applyVerificationResult } from '../server/utils/citationVerifier.js';
import { validateEvaluationResponse } from '../server/utils/schemaValidator.js';
import { runClassificationTree } from '../server/classification/rulesEngine.js';
import {
  shouldRunConsistencyCheck,
  analyseVerdictDivergence,
  analyseSeverityDivergence,
  computeConsistencyOutcome,
} from '../server/utils/consistencyUtils.js';
import { evaluateApplicability } from '../server/classification/applicabilityEngine.js';
import { matchArtefact, buildEvidencePack } from '../server/evidencePack/evidencePackBuilder.js';
import {
  EU_AI_ACT_ARTICLES,
  EU_AI_ACT_RECITALS,
  EU_AI_ACT_ANNEXES,
  CONTESTED_PROVISIONS,
} from '@eu-ai-act/knowledge';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const chunkTextById = {};
for (const c of [...EU_AI_ACT_ARTICLES, ...EU_AI_ACT_RECITALS, ...EU_AI_ACT_ANNEXES, ...CONTESTED_PROVISIONS]) {
  if (!chunkTextById[c.id]) chunkTextById[c.id] = c.text;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log('\n=== EU AI Act Tool — Validation Tests ===\n');

// ---------------------------------------------------------------------------
// TEST 1: Fake quote text, real chunkId → QUOTE_NOT_IN_CHUNK
// ---------------------------------------------------------------------------
test('1. Citation: fake quote against real chunk → QUOTE_NOT_IN_CHUNK', () => {
  const result = verifyCitation(
    'This is a completely fabricated quote that does not exist anywhere in the corpus text at all',
    'aia_art4',
    chunkTextById,
  );
  assert.equal(result.verified, false);
  assert.equal(result.reason, 'QUOTE_NOT_IN_CHUNK');
});

// ---------------------------------------------------------------------------
// TEST 2: Real quote from aia_art4 but chunkId set to aia_art26_2 (chunk-bound)
// ---------------------------------------------------------------------------
test('2. Citation: real quote, wrong chunk → QUOTE_NOT_IN_CHUNK (chunk-bound)', () => {
  const art4Text = chunkTextById['aia_art4'];
  const realQuote = art4Text.substring(0, 80);
  assert.ok(realQuote.length >= 40, 'sample quote should be >= 40 chars');

  const result = verifyCitation(realQuote, 'aia_art26_2', chunkTextById);
  assert.equal(result.verified, false);
  assert.equal(result.reason, 'QUOTE_NOT_IN_CHUNK');
});

// ---------------------------------------------------------------------------
// TEST 3: Short 20-char quote → QUOTE_TOO_SHORT
// ---------------------------------------------------------------------------
test('3. Citation: short quote (20 chars) → QUOTE_TOO_SHORT', () => {
  const result = verifyCitation('only twenty chars!!.', 'aia_art4', chunkTextById);
  assert.equal(result.verified, false);
  assert.equal(result.reason, 'QUOTE_TOO_SHORT');
});

// ---------------------------------------------------------------------------
// TEST 4: Art. 5 subliminal → PROHIBITED, no Annex III data
// ---------------------------------------------------------------------------
test('4. Rules engine: Art. 5 subliminal → PROHIBITED, no further steps', () => {
  const facts = {
    systemPurpose: 'test',
    deploymentContext: 'test',
    primarySector: 'Other',
    systemType: 'ml_statistical',
    art5Responses: {
      usesSubliminalTechniques: true,
      exploitsVulnerabilities: false,
      createsSocialScore: false,
      assessesCriminalRiskByProfilingOnly: false,
      createsFacialRecognitionDatabase: false,
      infersEmotionsAtWorkOrSchool: false,
      biometricCategorisesByProtectedAttributes: false,
      isRealTimeRBILawEnforcement: false,
    },
    annex3Responses: {
      isRemoteBiometricID: false, isEmotionRecognition: false,
      isBiometricCategorisation: false, isRecruitmentOrHrDecisions: false,
      isPerformanceManagement: false, isCreditScoring: false,
      isCreditFraudDetection: false, isInsuranceRiskPricing: false,
      isPublicBenefitsEligibility: false, isLawEnforcement: false,
      isBorderControl: false, isEducationAdmissions: false,
      isJudicialAdministration: false, isElectionInfluence: false,
      isCriticalInfrastructure: false,
    },
    art6_3Responses: {
      performsProfilingOfPersons: false,
      materiallyInfluencesDecisionOutcome: false,
      humanMakesFinalDecision: true,
      consequenceOfIncorrectOutput: 'LOW',
    },
    roleResponses: {
      builtInhouse: false, purchasedNoCustomisation: true,
      significantlyCustomised: false, accessedViaAPIInOwnProduct: false,
    },
  };

  const result = runClassificationTree(facts);
  assert.equal(result.finalClassification, 'PROHIBITED');
  assert.equal(result.step3_annexIII, null, 'Annex III should be null for PROHIBITED');
  assert.equal(result.step4_derogation, null, 'Derogation should be null for PROHIBITED');
  assert.equal(result.step5_role, null, 'Role should be null for PROHIBITED');
  assert.ok(result.flags.some(f => f.includes('SUBLIMINAL')), 'Should have subliminal flag');
});

// ---------------------------------------------------------------------------
// TEST 5: Credit scoring + profiling → HIGH_RISK, derogation impossible
// ---------------------------------------------------------------------------
test('5. Rules engine: credit scoring + profiling → HIGH_RISK, no derogation', () => {
  const facts = {
    systemPurpose: 'credit assessment',
    deploymentContext: 'customer-facing',
    primarySector: 'Retail banking / credit',
    systemType: 'ml_statistical',
    art5Responses: {
      usesSubliminalTechniques: false, exploitsVulnerabilities: false,
      createsSocialScore: false, assessesCriminalRiskByProfilingOnly: false,
      createsFacialRecognitionDatabase: false, infersEmotionsAtWorkOrSchool: false,
      biometricCategorisesByProtectedAttributes: false, isRealTimeRBILawEnforcement: false,
    },
    annex3Responses: {
      isRemoteBiometricID: false, isEmotionRecognition: false,
      isBiometricCategorisation: false, isRecruitmentOrHrDecisions: false,
      isPerformanceManagement: false, isCreditScoring: true,
      isCreditFraudDetection: false, isInsuranceRiskPricing: false,
      isPublicBenefitsEligibility: false, isLawEnforcement: false,
      isBorderControl: false, isEducationAdmissions: false,
      isJudicialAdministration: false, isElectionInfluence: false,
      isCriticalInfrastructure: false,
    },
    art6_3Responses: {
      performsProfilingOfPersons: true,
      materiallyInfluencesDecisionOutcome: true,
      humanMakesFinalDecision: false,
      consequenceOfIncorrectOutput: 'SEVERE',
    },
    roleResponses: {
      builtInhouse: false, purchasedNoCustomisation: true,
      significantlyCustomised: false, accessedViaAPIInOwnProduct: false,
    },
  };

  const result = runClassificationTree(facts);
  assert.equal(result.finalClassification, 'HIGH_RISK');
  assert.equal(result.step4_derogation.derogationPossible, false, 'Profiling → no derogation');
  assert.equal(result.step4_derogation.profilingDetected, true);
  assert.ok(result.flags.includes('PROFILING_DETECTED'));
});

// ---------------------------------------------------------------------------
// TEST 6: CONTESTED legalCertainty → forces requiresLegalAdvice = true
// ---------------------------------------------------------------------------
test('6. Schema validator: CONTESTED certainty → requiresLegalAdvice = true', () => {
  const response = {
    verdict: 'PARTIALLY_COMPLIANT',
    reasoning: 'Some reasoning text.',
    sourceCitation: { quotedText: 'some quote', chunkId: 'aia_art26_2' },
    legalCertainty: 'CONTESTED',
    riskSeverity: 'MEDIUM',
    requiresLegalAdvice: false,
  };

  const result = validateEvaluationResponse(response);
  assert.equal(result.valid, true, 'Should be valid (no missing fields, no banned phrases)');
  assert.equal(response.requiresLegalAdvice, true, 'CONTESTED must force requiresLegalAdvice = true');
  assert.ok(response.flags.includes('LEGAL_CERTAINTY_REQUIRES_REVIEW'));
});

// ---------------------------------------------------------------------------
// TEST 7: Citation failure with CLEAR_TEXT → requiresLegalAdvice stays false
// ---------------------------------------------------------------------------
test('7. Citation failure: requiresLegalAdvice unchanged (stays false)', () => {
  const evaluation = {
    verdict: 'NON_COMPLIANT',
    legalCertainty: 'CLEAR_TEXT',
    requiresLegalAdvice: false,
    requiresManualVerification: false,
  };

  const verificationResult = { verified: false, reason: 'QUOTE_NOT_IN_CHUNK', message: 'Not found' };
  applyVerificationResult(evaluation, verificationResult);

  assert.equal(evaluation.verdict, 'CITATION_FAILED');
  assert.equal(evaluation.requiresManualVerification, true);
  assert.equal(evaluation.requiresLegalAdvice, false, 'requiresLegalAdvice must NOT change on citation failure');
});

// ---------------------------------------------------------------------------
// TEST 8: Banned phrase "is compliant" → valid = false
// ---------------------------------------------------------------------------
test('8. Schema validator: banned phrase → valid = false', () => {
  const response = {
    verdict: 'COMPLIANT',
    reasoning: 'The system is compliant with all requirements.',
    sourceCitation: { quotedText: 'some quote', chunkId: 'aia_art4' },
    legalCertainty: 'CLEAR_TEXT',
    riskSeverity: 'LOW',
  };

  const result = validateEvaluationResponse(response);
  assert.equal(result.valid, false);
  assert.ok(result.bannedPhrases.includes('is compliant'), 'Should detect "is compliant"');
});

// ---------------------------------------------------------------------------
// TEST 9: Corpus verify integrity (tamper → fail, restore → pass)
// ---------------------------------------------------------------------------
test('9. Corpus verify: tamper detection + integrity pass', () => {
  const corpusPath = join(ROOT, 'knowledge/corpus/primary/eu_ai_act_full.js');
  const original = readFileSync(corpusPath, 'utf8');

  try {
    const tampered = original.replace('Subject matter', 'Subject matterXXX');
    assert.notEqual(original, tampered, 'Tamper must change the file');
    writeFileSync(corpusPath, tampered, 'utf8');

    let exitCode;
    try {
      execSync('node scripts/corpus-verify.js', { cwd: ROOT, stdio: 'pipe' });
      exitCode = 0;
    } catch (e) {
      exitCode = e.status;
    }
    assert.equal(exitCode, 1, 'Tampered corpus must cause verify to exit 1');
  } finally {
    writeFileSync(corpusPath, original, 'utf8');
  }

  let exitCode;
  try {
    execSync('node scripts/corpus-verify.js', { cwd: ROOT, stdio: 'pipe' });
    exitCode = 0;
  } catch (e) {
    exitCode = e.status;
  }
  assert.equal(exitCode, 0, 'Restored corpus must cause verify to exit 0');
});

// ---------------------------------------------------------------------------
// TEST 10: Archetype data for aia_art26_2 exists with non-empty remediationTemplate
// ---------------------------------------------------------------------------
test('10. Archetype: aia_art26_2 entry exists with remediationTemplate', () => {
  const filePath = join(ROOT, 'client/src/components/phases/ObligationAssessment.jsx');
  const content = readFileSync(filePath, 'utf8');

  assert.ok(content.includes('FS_CONTROL_ARCHETYPES'), 'Must define FS_CONTROL_ARCHETYPES');
  assert.ok(content.includes('aia_art26_2'), 'Must have aia_art26_2 archetype entry');

  const match = content.match(/aia_art26_2:\s*\{[\s\S]*?remediationTemplate:\s*[`'"]([\s\S]*?)[`'"]/);
  assert.ok(match, 'aia_art26_2 must have a remediationTemplate');
  assert.ok(match[1].length > 0, 'remediationTemplate must be non-empty');
  assert.ok(!match[1].includes('{SYSTEM_NAME}'), 'Template should not contain raw {SYSTEM_NAME} placeholder');
});

// ---------------------------------------------------------------------------
// TEST 11: Consistency gate — fires only on CLEAR_TEXT + gap verdict + HIGH/CRITICAL
// ---------------------------------------------------------------------------
test('11. Consistency gate: fires for CLEAR_TEXT + NON/PARTIAL + HIGH/CRITICAL', () => {
  assert.equal(shouldRunConsistencyCheck({
    legalCertainty: 'CLEAR_TEXT',
    verdict: 'NON_COMPLIANT',
    riskSeverity: 'HIGH',
  }), true);
  assert.equal(shouldRunConsistencyCheck({
    legalCertainty: 'CLEAR_TEXT',
    verdict: 'PARTIALLY_COMPLIANT',
    riskSeverity: 'CRITICAL',
  }), true);
});

// ---------------------------------------------------------------------------
// TEST 12: Consistency gate — contested/non-target cases do not fire
// ---------------------------------------------------------------------------
test('12. Consistency gate: contested/compliant/citation-failed do not fire', () => {
  assert.equal(shouldRunConsistencyCheck({
    legalCertainty: 'CONTESTED',
    verdict: 'NON_COMPLIANT',
    riskSeverity: 'HIGH',
  }), false);
  assert.equal(shouldRunConsistencyCheck({
    legalCertainty: 'CLEAR_TEXT',
    verdict: 'COMPLIANT',
    riskSeverity: 'HIGH',
  }), false);
  assert.equal(shouldRunConsistencyCheck({
    legalCertainty: 'CLEAR_TEXT',
    verdict: 'CITATION_FAILED',
    riskSeverity: 'HIGH',
  }), false);
});

// ---------------------------------------------------------------------------
// TEST 13: Verdict divergence adjacency behavior
// ---------------------------------------------------------------------------
test('13. Verdict divergence: NON↔PARTIAL adjacent pair is consistent', () => {
  const vd = analyseVerdictDivergence('NON_COMPLIANT', 'PARTIALLY_COMPLIANT');
  assert.equal(vd.divergent, false);
});

// ---------------------------------------------------------------------------
// TEST 14: Verdict divergence crossing COMPLIANT boundary
// ---------------------------------------------------------------------------
test('14. Verdict divergence: crossing COMPLIANT boundary is MODEL_INCONSISTENT', () => {
  const vd = analyseVerdictDivergence('NON_COMPLIANT', 'COMPLIANT');
  assert.equal(vd.divergent, true);
  assert.equal(vd.type, 'MODEL_INCONSISTENT');
});

// ---------------------------------------------------------------------------
// TEST 15: Severity divergence independent from verdict divergence
// ---------------------------------------------------------------------------
test('15. Severity divergence: high/low swing is detected deterministically', () => {
  const sd = analyseSeverityDivergence('HIGH', 'LOW', 'NON_COMPLIANT', 'NON_COMPLIANT');
  assert.equal(sd.divergent, true);
  assert.equal(sd.type, 'SEVERITY_INCONSISTENT');
});

// ---------------------------------------------------------------------------
// TEST 16: Severity divergence remains independent of verdict divergence
// ---------------------------------------------------------------------------
test('16. Severity divergence: still detected when verdict differs', () => {
  const sd = analyseSeverityDivergence('HIGH', 'LOW', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT');
  assert.equal(sd.divergent, true);
});

// ---------------------------------------------------------------------------
// TEST 17: Severity MEDIUM grey-zone is ignored
// ---------------------------------------------------------------------------
test('17. Severity divergence: MEDIUM grey-zone ignored', () => {
  const sd = analyseSeverityDivergence('HIGH', 'MEDIUM', 'NON_COMPLIANT', 'NON_COMPLIANT');
  assert.equal(sd.divergent, false);
});

// ---------------------------------------------------------------------------
// TEST 18: Combined divergence flag (both dimensions)
// ---------------------------------------------------------------------------
test('18. Consistency outcome: combined verdict+severity inconsistency flag', () => {
  const outcome = computeConsistencyOutcome(
    { verdict: 'NON_COMPLIANT', riskSeverity: 'HIGH' },
    { verdict: 'COMPLIANT', riskSeverity: 'LOW' },
  );
  assert.equal(outcome.consistent, false);
  assert.equal(outcome.consistencyFlag, 'MODEL_AND_SEVERITY_INCONSISTENT');
});

// ---------------------------------------------------------------------------
// TEST 19: Evidence completeness determinism
// ---------------------------------------------------------------------------
test('19. Evidence completeness: deterministic scoring from pure helper', () => {
  const clauses = [{
    id: 'clause_art26_2',
    article_ref: 'Article 26(2)',
    obligation_title: 'Human Oversight',
    evidence_artefacts: [
      { id: 'ea_art26_2_1', required: true, matchTerms: ['oversight charter'], negativeTerms: [] },
      { id: 'ea_art26_2_2', required: true, matchTerms: ['role description'], negativeTerms: [] },
      {
        id: 'ea_art26_2_3',
        required: true,
        name: 'Competence / Training Record',
        matchTerms: ['training record'],
        negativeTerms: [],
        alsoSatisfies: ['clause_art4'],
      },
      { id: 'ea_art26_2_4', required: true, matchTerms: ['escalation protocol'], negativeTerms: [] },
    ],
  }];
  const assessmentState = {
    obligations: [{
      obligationId: 'aia_art26_2',
      evidence: {
        controlDescription: 'Oversight charter and role description are in place. Escalation protocol is documented.',
        evidenceReference: 'GOV-12',
      },
      evaluationResult: { evaluation: { verdict: 'NON_COMPLIANT' } },
    }],
  };
  const first = buildEvidencePack(assessmentState, clauses);
  const second = buildEvidencePack(assessmentState, clauses);
  assert.deepEqual(first, second, 'Deterministic helper should return stable output');
  assert.equal(first[0].completenessScore, 75);
});

// ---------------------------------------------------------------------------
// TEST 20: Applicability gate — worker notification scoped out for non-employer context
// ---------------------------------------------------------------------------
test('20. Applicability: Art. 26(7) scoped out in non-employee deployment context', () => {
  const clause = {
    id: 'clause_art26_7',
    applies_conditions: {
      logic: 'AND',
      required: [{ field: 'system.deploymentContext', op: 'includes', value: 'employee' }],
      notApplicableBasis: 'Art. 26(7) applies to deployers using AI in the workplace affecting workers.',
      notApplicableCitation: 'Article 26(7)',
    },
  };
  const result = evaluateApplicability(clause, {
    system: { deploymentContext: 'customer-facing support chat' },
  });
  assert.equal(result.applies, false);
  assert.equal(result.citedBasis, 'Article 26(7)');
});

// ---------------------------------------------------------------------------
// TEST 21: Negative-term override + cross-clause insight for ea_art26_2_3 -> Art. 4
// ---------------------------------------------------------------------------
test('21. Artefact matching: negative-term override and cross-clause insight surfaced', () => {
  const artefact = {
    id: 'ea_art26_2_3',
    matchTerms: ['training record'],
    negativeTerms: ['not yet'],
  };
  const negativeResult = matchArtefact(
    artefact,
    'Training record exists but is not yet approved for use.',
  );
  assert.equal(negativeResult.status, 'ABSENT');
  assert.equal(negativeResult.reason, 'negative_term_found');

  const clauses = [{
    id: 'clause_art26_2',
    evidence_artefacts: [{
      id: 'ea_art26_2_3',
      name: 'Competence / Training Record',
      required: true,
      matchTerms: ['training record'],
      negativeTerms: [],
      alsoSatisfies: ['clause_art4'],
    }],
  }];
  const assessmentState = {
    obligations: [{
      obligationId: 'aia_art26_2',
      evidence: { controlDescription: 'Oversight charter only.', evidenceReference: '' },
      evaluationResult: { evaluation: { verdict: 'NON_COMPLIANT' } },
    }],
  };
  const pack = buildEvidencePack(assessmentState, clauses);
  assert.equal(pack[0].crossClauseInsights.length, 1);
  assert.equal(pack[0].crossClauseInsights[0].artefactId, 'ea_art26_2_3');
  assert.equal(pack[0].crossClauseInsights[0].alsoSatisfiesTitles[0], 'AI Literacy');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log(`\n=== Results: ${passed} passed, ${failed} failed out of ${passed + failed} ===\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All validation tests passed.\n');
  process.exit(0);
}
