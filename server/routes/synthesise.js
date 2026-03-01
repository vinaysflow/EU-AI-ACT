import { Router } from 'express';
import { runSynthesisAgent } from '../agents/synthesisAgent.js';

const router = Router();
const SYNTHESIS_TIMEOUT_MS = 45000;

function withTimeout(promise, ms) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error('Synthesis timed out');
      err.statusCode = 504;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function buildObligationSummary(assessmentState) {
  const obligations = assessmentState?.obligations || [];
  return obligations.map((o) => {
    const ev = o.evaluationResult?.evaluation || o.evaluationResult || {};
    return {
      id: o.obligationId || o.id,
      articleRef: ev.articleRef || o.articleRef || null,
      obligationTitle: o.obligationTitle || o.title || null,
      verdict: ev.verdict || o.consultantVerdict || null,
      riskSeverity: ev.riskSeverity || null,
      gapDescription: ev.gapDescription || null,
      requiresLegalAdvice: Boolean(ev.requiresLegalAdvice),
      citationVerified: o.evaluationResult?.citationVerified ?? ev.citationVerified ?? null,
      requiresManualVerification: o.evaluationResult?.requiresManualVerification ?? ev.requiresManualVerification ?? null,
      consistencyFlag: o.consistencyResult?.consistencyFlag || null,
      consultantVerdict: o.consultantVerdict || null,
      consultantAnnotation: o.consultantAnnotation || null,
    };
  });
}

function validateSynthesisShape(synthesis) {
  const required = [
    'overallRiskPosture',
    'riskPostureRationale',
    'executiveSummaryOpening',
    'keyInsight',
    'criticalPath',
    'gapRegister',
  ];
  return required.filter((k) => !(k in synthesis));
}

const GAP_VERDICTS = new Set([
  'NON_COMPLIANT',
  'PARTIALLY_COMPLIANT',
  'INSUFFICIENT_EVIDENCE',
  'CITATION_FAILED',
]);

function buildFallbackGapRegister(assessmentState) {
  const obligations = assessmentState?.obligations || [];
  const gaps = [];

  obligations.forEach((o) => {
    const ev = o.evaluationResult?.evaluation || o.evaluationResult || {};
    const verdict = ev.verdict || o.consultantVerdict || null;
    const isMissing = !verdict || verdict === 'NOT_EVALUATED';
    const shouldInclude = isMissing || GAP_VERDICTS.has(verdict);
    if (!shouldInclude) return;

    let gapDescription = ev.gapDescription;
    if (!gapDescription) {
      if (verdict === 'CITATION_FAILED') {
        gapDescription = 'Citation could not be verified for this obligation.';
      } else {
        gapDescription = 'Insufficient evidence was provided to assess compliance for this obligation.';
      }
    }

    let severity = ev.riskSeverity;
    if (!severity) {
      if (verdict === 'NON_COMPLIANT') severity = 'HIGH';
      else if (verdict === 'PARTIALLY_COMPLIANT') severity = 'MEDIUM';
      else severity = 'LOW';
    }

    gaps.push({
      obligationId: o.obligationId || o.id,
      articleRef: ev.articleRef || o.articleRef || o.obligationId || o.id,
      gapDescription,
      severity,
      effort: 'M',
      requiresLegalReview: Boolean(ev.requiresLegalAdvice),
      citationVerified: o.evaluationResult?.citationVerified ?? ev.citationVerified ?? null,
      requiresManualVerification: o.evaluationResult?.requiresManualVerification ?? ev.requiresManualVerification ?? null,
    });
  });

  return gaps;
}

function mergeGapRegisters(primary, fallback) {
  const primaryList = Array.isArray(primary) ? primary : [];
  if (!fallback || fallback.length === 0) return primaryList;

  const seen = new Set(primaryList.map((g) => g.obligationId));
  const merged = [...primaryList];
  fallback.forEach((g) => {
    if (!seen.has(g.obligationId)) merged.push(g);
  });
  return merged;
}

router.post('/', async (req, res) => {
  const { assessmentState } = req.body;
  const obligations = assessmentState?.obligations || [];

  if (!assessmentState) {
    return res.status(400).json({ error: 'assessmentState is required' });
  }
  if (!Array.isArray(obligations) || obligations.length === 0) {
    return res.status(400).json({ error: 'assessmentState.obligations is required and must be non-empty' });
  }

  try {
    const summary = buildObligationSummary(assessmentState);
    res.locals.synthContext = {
      systemName: assessmentState.system?.name || null,
      primarySector: assessmentState.system?.primarySector || null,
      classification: assessmentState.classification?.rulesEngineResult || null,
      obligations: summary,
    };

    const synthesis = await withTimeout(
      runSynthesisAgent(assessmentState),
      SYNTHESIS_TIMEOUT_MS,
    );

    const missing = validateSynthesisShape(synthesis);
    if (missing.length > 0) {
      return res.status(422).json({ error: `Synthesis response missing required fields: ${missing.join(', ')}` });
    }

    const fallbackGaps = buildFallbackGapRegister(assessmentState);
    synthesis.gapRegister = mergeGapRegisters(synthesis.gapRegister, fallbackGaps);

    res.json({ synthesis, synthesisedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[synthesise] Error:', err.message);
    res.locals.error = err.message;

    if (err.statusCode === 422) {
      return res.status(422).json({ error: err.message });
    }
    if (err.statusCode === 504) {
      return res.status(504).json({ error: err.message });
    }
    res.status(503).json({ error: err.message });
  }
});

export default router;
