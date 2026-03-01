const CORPUS_VERSION = '2026-01';
const RETRIEVAL_MODE = 'bridgeContext';
const SOURCE_URI = 'http://data.europa.eu/eli/reg/2024/1689/oj';
const SOURCE_LINE = 'Regulation (EU) 2024/1689, OJ L 12.7.2024';

function getEvaluationResult(obligation) {
  return obligation?.evaluationResult?.evaluation || obligation?.evaluationResult || {};
}

function normaliseObligation(obligation) {
  const ev = getEvaluationResult(obligation);
  return {
    obligationId: obligation?.obligationId || obligation?.id || null,
    obligationTitle: obligation?.obligationTitle || obligation?.title || null,
    articleRef: ev.articleRef || obligation?.articleRef || null,
    verdict: obligation?.consultantVerdict || ev.verdict || 'NOT_EVALUATED',
    riskSeverity: ev.riskSeverity || null,
    legalCertainty: ev.legalCertainty || null,
    requirementsSummary: ev.requirementsSummary || null,
    verdictRationale: ev.verdictRationale || ev.reasoning || null,
    gapDescription: ev.gapDescription || null,
    remediationGuidance: ev.remediationGuidance || null,
    requiresLegalAdvice: Boolean(ev.requiresLegalAdvice),
    citationVerified: obligation?.evaluationResult?.citationVerified ?? ev.citationVerified ?? null,
    requiresManualVerification: obligation?.evaluationResult?.requiresManualVerification ?? ev.requiresManualVerification ?? null,
    consistencyFlag: obligation?.consistencyResult?.consistencyFlag || null,
    consultantVerdict: obligation?.consultantVerdict || null,
    consultantAnnotation: obligation?.consultantAnnotation || null,
    plainLanguageResult: obligation?.plainLanguageResult || obligation?.evaluationResult?.plainLanguage || null,
    sourceCitation: ev.sourceCitation || null,
    sourceChunks: obligation?.evaluationResult?.sourceChunks || null,
    evidence: obligation?.evidence || {},
    matchingArchetypes: obligation?.matchingArchetypes || [],
  };
}

function normaliseObligations(assessmentState) {
  return (assessmentState?.obligations || []).map(normaliseObligation);
}

function deriveGapRows(synthesis, obligations) {
  if (synthesis?.gapRegister?.length) {
    return synthesis.gapRegister.map((g, idx) => ({
      priority: idx + 1,
      ...g,
    }));
  }
  const GAP_VERDICTS = new Set(['NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'INSUFFICIENT_EVIDENCE', 'CITATION_FAILED']);
  return obligations
    .filter((o) => GAP_VERDICTS.has(o.verdict))
    .map((o, idx) => ({
      priority: idx + 1,
      obligationId: o.obligationId,
      articleRef: o.articleRef,
      obligationTitle: o.obligationTitle,
      gapDescription: o.gapDescription || 'Gap identified — details pending evaluation.',
      severity: o.riskSeverity || 'MEDIUM',
      effort: 'M',
      requiresLegalReview: o.requiresLegalAdvice,
      citationVerified: o.citationVerified === true,
      requiresManualVerification: o.requiresManualVerification === true,
      consistencyFlag: o.consistencyFlag || null,
    }));
}

export function formatArtefactA(assessmentState) {
  const system = assessmentState?.system || {};
  const classification = assessmentState?.classification?.rulesEngineResult || null;
  const roleDetermination = classification?.step5_role || null;
  return {
    system: {
      name: system.name || null,
      vendor: system.vendor || null,
      modelVersion: system.modelVersion || null,
      intendedPurpose: system.intendedPurpose || null,
      providerStatedPurpose: system.providerStatedPurpose || null,
      deploymentContext: system.deploymentContext || null,
      primarySector: system.primarySector || null,
      systemType: system.systemType || null,
    },
    assessmentDate: assessmentState?.meta?.assessmentDate || null,
    corpusVersion: CORPUS_VERSION,
    retrievalMode: RETRIEVAL_MODE,
    classificationResult: classification,
    roleDetermination,
  };
}

export function formatArtefactB(assessmentState) {
  const system = assessmentState?.system || {};
  const classification = assessmentState?.classification?.rulesEngineResult || null;
  return {
    systemFacts: {
      systemPurpose: system.intendedPurpose || null,
      deploymentContext: system.deploymentContext || null,
      primarySector: system.primarySector || null,
      systemType: system.systemType || null,
      annex3Responses: system.annex3Responses || {},
      art5Responses: system.art5Responses || {},
      art6_3Responses: system.art6_3Responses || {},
      roleResponses: system.roleResponses || {},
    },
    rulesEngineResult: classification,
    explanationResult: assessmentState?.classification?.explanationResult || null,
  };
}

export function formatArtefactC(assessmentState) {
  const obligations = normaliseObligations(assessmentState);
  return obligations.map((o) => ({
    obligationId: o.obligationId,
    articleRef: o.articleRef,
    obligationTitle: o.obligationTitle,
    requirementsSummary: o.requirementsSummary,
    evidenceDescribed: [o.evidence?.controlDescription, o.evidence?.evidenceReference]
      .filter(Boolean)
      .join(' — ') || null,
    verdict: o.verdict,
    riskSeverity: o.riskSeverity,
    gapDescription: o.gapDescription,
    quotedText: o.sourceCitation?.quotedText || null,
    legalCertainty: o.legalCertainty,
    citationVerified: o.citationVerified,
    requiresManualVerification: o.requiresManualVerification,
    consistencyFlag: o.consistencyFlag,
    consultantOverride: o.consultantVerdict ? {
      verdict: o.consultantVerdict,
      annotation: o.consultantAnnotation || null,
    } : null,
  }));
}

export function formatArtefactD(assessmentState) {
  const obligations = normaliseObligations(assessmentState);
  const gapRows = deriveGapRows(assessmentState?.synthesis || null, obligations);
  return gapRows.map((g) => ({
    priority: g.priority,
    articleRef: g.articleRef,
    obligationTitle: g.obligationTitle || null,
    gapDescription: g.gapDescription,
    severity: g.severity,
    effort: g.effort,
    suggestedOwner: g.suggestedOwner || null,
    targetDate: g.targetDate || null,
    requiresLegalReview: g.requiresLegalReview ?? null,
    citationVerified: g.citationVerified ?? null,
    requiresManualVerification: g.requiresManualVerification ?? null,
    consistencyFlag: g.consistencyFlag || null,
    archetypeTemplate: g.archetypeTemplate || null,
  }));
}

export function formatArtefactE(assessmentState) {
  const obligations = normaliseObligations(assessmentState);
  const synthesis = assessmentState?.synthesis || null;
  const contestedCount = obligations.filter((o) => ['CONTESTED', 'UNRESOLVED'].includes(o.legalCertainty)).length;
  const citationFailedCount = obligations.filter((o) => o.verdict === 'CITATION_FAILED').length;
  const highCriticalFindings = obligations.filter((o) => o.verdict === 'NON_COMPLIANT' && ['HIGH', 'CRITICAL'].includes(o.riskSeverity));
  return {
    executiveSummaryOpening: synthesis?.executiveSummaryOpening || null,
    keyInsight: synthesis?.keyInsight || null,
    highCriticalFindings: highCriticalFindings.map((o) => ({
      obligationId: o.obligationId,
      articleRef: o.articleRef,
      plainLanguageResult: o.plainLanguageResult || null,
    })),
    contestedCount,
    citationFailedCount,
  };
}

export function formatArtefactF(assessmentState) {
  const obligations = normaliseObligations(assessmentState);
  return obligations.map((o) => ({
    obligationId: o.obligationId,
    articleRef: o.articleRef,
    obligationTitle: o.obligationTitle,
    tier1Text: o.sourceChunks?.tier1?.chunk_text || null,
    supportingChunks: (o.sourceChunks?.bridgeContext || []).map((c) => ({
      id: c.id,
      text: c.chunk_text,
      authority: c.authority || null,
      articleRef: c.article_ref || null,
    })),
    quotedText: o.sourceCitation?.quotedText || null,
    quotedChunkId: o.sourceCitation?.chunkId || null,
    citationVerified: o.citationVerified,
    requiresManualVerification: o.requiresManualVerification,
    sourceLine: SOURCE_LINE,
    corpusLine: `Corpus version: ${CORPUS_VERSION} | Retrieval mode: ${RETRIEVAL_MODE} (Phase 1)`,
    sourceUri: SOURCE_URI,
  }));
}

export function formatAllArtefacts(assessmentState) {
  return {
    A: formatArtefactA(assessmentState),
    B: formatArtefactB(assessmentState),
    C: formatArtefactC(assessmentState),
    D: formatArtefactD(assessmentState),
    E: formatArtefactE(assessmentState),
    F: formatArtefactF(assessmentState),
  };
}
