const OBLIGATION_META = {
  clause_art4:      { articleRef: 'Article 4',      title: 'AI Literacy' },
  clause_art26_1:   { articleRef: 'Article 26(1)',   title: 'Use per Instructions' },
  clause_art26_2:   { articleRef: 'Article 26(2)',   title: 'Human Oversight' },
  clause_art26_4:   { articleRef: 'Article 26(4)',   title: 'Input Data Quality' },
  clause_art26_5:   { articleRef: 'Article 26(5)',   title: 'Monitoring & Incident Reporting' },
  clause_art26_6:   { articleRef: 'Article 26(6)',   title: 'Log Retention' },
  clause_art26_7:   { articleRef: 'Article 26(7)',   title: 'Worker Notification' },
  clause_art26_9:   { articleRef: 'Article 26(9)',   title: 'GDPR DPIA Bridge' },
  clause_art26_11:  { articleRef: 'Article 26(11)',  title: 'Affected Persons Transparency' },
  clause_art27_1:   { articleRef: 'Article 27(1)',   title: 'Fundamental Rights Impact Assessment' },
};

const OBLIGATION_ID_TO_CLAUSE = {
  aia_art4: 'clause_art4',
  aia_art26_1: 'clause_art26_1',
  aia_art26_2: 'clause_art26_2',
  aia_art26_4: 'clause_art26_4',
  aia_art26_5: 'clause_art26_5',
  aia_art26_6: 'clause_art26_6',
  aia_art26_7: 'clause_art26_7',
  aia_art26_9: 'clause_art26_9',
  aia_art26_11: 'clause_art26_11',
  aia_art27_1: 'clause_art27_1',
};

function normalise(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchArtefact(artefact, evidenceText) {
  const norm = normalise(evidenceText);

  if (!norm) {
    return { status: 'UNKNOWN', reason: 'no_evidence', score: 0 };
  }

  for (const neg of artefact.negativeTerms || []) {
    if (norm.includes(normalise(neg))) {
      return { status: 'ABSENT', reason: 'negative_term_found', matchedTerm: neg, score: 0 };
    }
  }

  const matched = [];
  for (const term of artefact.matchTerms || []) {
    if (norm.includes(normalise(term))) {
      matched.push(term);
    }
  }

  if (matched.length > 0) {
    return { status: 'PRESENT', matchedTerms: matched, score: 1.0 };
  }

  return { status: 'ABSENT', reason: 'no_match_terms_found', score: 0 };
}

export function buildEvidencePack(assessmentState, clauses) {
  const obligations = assessmentState.obligations || [];
  const selectedLine = assessmentState?.system?.businessLine || '';
  const clauseMap = {};
  for (const c of clauses) {
    clauseMap[c.id] = c;
  }

  const results = [];

  for (const obl of obligations) {
    const clauseId = OBLIGATION_ID_TO_CLAUSE[obl.obligationId] || obl.obligationId;
    const clause = clauseMap[clauseId];
    if (!clause) continue;

    const allArtefacts = clause.evidence_artefacts || [];
    const artefacts = selectedLine
      ? allArtefacts.filter((a) => !a.businessLines || a.businessLines.includes(selectedLine))
      : allArtefacts;
    if (artefacts.length === 0) continue;

    const controlDesc = obl.controlDescription || obl.evidence?.controlDescription || '';
    const evidenceRef = obl.evidenceReference || obl.evidence?.evidenceReference || '';
    const evidenceText = `${controlDesc} ${evidenceRef}`;

    const ev = obl.evaluationResult?.evaluation || obl.evaluationResult || {};
    const verdict = obl.consultantVerdict || ev.verdict || 'NOT_EVALUATED';

    const artefactResults = artefacts.map((a) => ({
      ...a,
      matchResult: matchArtefact(a, evidenceText),
    }));

    const requiredArtefacts = artefactResults.filter((a) => a.required);
    const presentCount = requiredArtefacts.filter((a) => a.matchResult.status === 'PRESENT').length;
    const requiredCount = requiredArtefacts.length || 1;
    const completenessScore = Math.round((presentCount / requiredCount) * 100);

    const missingArtefacts = requiredArtefacts.filter(
      (a) => a.matchResult.status === 'ABSENT',
    );

    const crossClauseInsights = artefactResults
      .filter((a) => (a.alsoSatisfies || []).length > 0 && a.matchResult.status === 'ABSENT')
      .map((a) => ({
        artefactId: a.id,
        artefactName: a.name,
        primaryClause: clauseId,
        alsoSatisfies: a.alsoSatisfies,
        alsoSatisfiesTitles: a.alsoSatisfies.map(
          (cid) => OBLIGATION_META[cid]?.title || cid,
        ),
      }));

    const meta = OBLIGATION_META[clauseId] || {};

    results.push({
      obligationId: obl.obligationId,
      clauseId,
      articleRef: meta.articleRef || clause.article_ref || '',
      obligationTitle: meta.title || clause.obligation_title || '',
      verdict,
      evidenceArtefacts: artefactResults,
      completenessScore,
      missingArtefacts,
      crossClauseInsights,
    });
  }

  return results;
}
