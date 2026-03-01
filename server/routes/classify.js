import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { runClassificationTree } from '../classification/rulesEngine.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REQUIRED_TOP_LEVEL = ['systemPurpose', 'deploymentContext', 'primarySector', 'systemType'];

const REQUIRED_NESTED = {
  annex3Responses: [
    'isRemoteBiometricID', 'isEmotionRecognition', 'isBiometricCategorisation',
    'isRecruitmentOrHrDecisions', 'isPerformanceManagement', 'isCreditScoring',
    'isCreditFraudDetection', 'isInsuranceRiskPricing', 'isPublicBenefitsEligibility',
    'isLawEnforcement', 'isBorderControl', 'isEducationAdmissions',
    'isJudicialAdministration', 'isElectionInfluence', 'isCriticalInfrastructure',
  ],
  art5Responses: [
    'usesSubliminalTechniques', 'exploitsVulnerabilities', 'createsSocialScore',
    'assessesCriminalRiskByProfilingOnly', 'createsFacialRecognitionDatabase',
    'infersEmotionsAtWorkOrSchool', 'biometricCategorisesByProtectedAttributes',
    'isRealTimeRBILawEnforcement',
  ],
  art6_3Responses: [
    'performsProfilingOfPersons', 'materiallyInfluencesDecisionOutcome',
    'humanMakesFinalDecision', 'consequenceOfIncorrectOutput',
  ],
  roleResponses: [
    'builtInhouse', 'purchasedNoCustomisation',
    'significantlyCustomised', 'accessedViaAPIInOwnProduct',
  ],
};

function validateSystemFacts(facts) {
  const missing = [];
  for (const field of REQUIRED_TOP_LEVEL) {
    const value = facts[field];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      missing.push(field);
    }
  }
  for (const [group, keys] of Object.entries(REQUIRED_NESTED)) {
    if (!facts[group] || typeof facts[group] !== 'object') {
      for (const key of keys) {
        missing.push(`${group}.${key}`);
      }
      continue;
    }
    for (const key of keys) {
      if (facts[group][key] === undefined) {
        missing.push(`${group}.${key}`);
      }
    }
  }
  return missing;
}

const EXPLANATION_SYSTEM_PROMPT = `You are a senior EU AI Act specialist explaining a classification decision.
You will receive structured facts about an AI system and a deterministic
classification result produced by a rules engine.
YOUR ONLY JOB: Explain in plain English WHY this system received this
classification, with specific reference to the Annex III domains and
Art. 6(3) factors that drove the result.
For CLASSIFICATION_CONTESTED: explain what the Art. 6(3) argument is,
why it might succeed, and why it might fail.
DO NOT second-guess the rules engine result. Explain it.
DO NOT use legalese without defining terms.
OUTPUT FORMAT: JSON only. Shape:
{ "explanation": "string", "keyFactors": ["string"], "contestedEdges": ["string"]|null,
  "legalReviewReason": "string"|null }`;

function stripMarkdownFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function buildExplanationUserMessage(systemFacts, rulesEngineResult) {
  const summary = {
    systemPurpose: systemFacts.systemPurpose,
    deploymentContext: systemFacts.deploymentContext,
    primarySector: systemFacts.primarySector,
    systemType: systemFacts.systemType,
  };
  return `SYSTEM FACTS SUMMARY:\n${JSON.stringify(summary, null, 2)}\n\nRULES ENGINE RESULT:\n${JSON.stringify(rulesEngineResult, null, 2)}\n\nExplain this classification. Respond with JSON only.`;
}

async function fetchExplanation(systemFacts, rulesEngineResult) {
  const EXPLANATION_TIMEOUT_MS = 15_000;

  const apiCall = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    temperature: 0,
    system: EXPLANATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildExplanationUserMessage(systemFacts, rulesEngineResult) }],
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Explanation timed out after 15s')), EXPLANATION_TIMEOUT_MS),
  );

  const message = await Promise.race([apiCall, timeoutPromise]);
  const rawText = message.content[0].text;
  const cleaned = stripMarkdownFences(rawText);
  return JSON.parse(cleaned);
}

function buildResponse(rulesEngineResult, explanation) {
  return {
    rulesEngineResult,
    result: rulesEngineResult,
    explanation: explanation || null,
    finalClassification: rulesEngineResult.finalClassification,
    requiresLegalReview: rulesEngineResult.requiresLegalReview,
    flags: rulesEngineResult.flags,
    classifiedAt: new Date().toISOString(),
  };
}

router.post('/', async (req, res) => {
  try {
    const { systemFacts, requestExplanation } = req.body;

    if (!systemFacts || typeof systemFacts !== 'object') {
      return res.status(400).json({
        error: 'Request body must include a systemFacts object.',
        missingFields: ['systemFacts'],
      });
    }

    const missingFields = validateSystemFacts(systemFacts);
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required systemFacts fields: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    const rulesEngineResult = runClassificationTree(systemFacts);

    if (rulesEngineResult.finalClassification === 'PROHIBITED') {
      return res.json(buildResponse(rulesEngineResult, null));
    }

    let explanation = null;
    if (requestExplanation) {
      try {
        explanation = await fetchExplanation(systemFacts, rulesEngineResult);
      } catch (err) {
        console.error('[classify] Explanation failed (non-blocking):', err.message);
      }
    }

    res.json(buildResponse(rulesEngineResult, explanation));
  } catch (err) {
    console.error('[classify] Error:', err.message);
    res.locals.error = err.message;
    res.status(500).json({ error: err.message });
  }
});

export default router;
