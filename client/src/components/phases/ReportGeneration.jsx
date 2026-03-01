import { useState, useMemo, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import LegalCertaintyBadge from '../shared/LegalCertaintyBadge';
import CitationVerifiedBadge from '../shared/CitationVerifiedBadge';
import AssessmentReportPDF from '../../pdf/AssessmentReportPDF';

/* ─── Constants ───────────────────────────────────────────────────────────── */

const CORPUS_VERSION = '2026-01';
const RETRIEVAL_MODE = 'bridgeContext';
const SOURCE_LINE = 'Source: EU AI Act (Regulation 2024/1689), OJ L 12.7.2024';
const CORPUS_LINE = `Corpus version: ${CORPUS_VERSION} | Retrieval mode: ${RETRIEVAL_MODE} (Phase 1)`;
const FOOTER_TEXT =
  'All legal text sourced from the Official Journal of the European Union (ELI: http://data.europa.eu/eli/reg/2024/1689/oj). Corpus version 2026-01.';

const CHECKLIST_ITEMS = [
  'I have verified the system description reflects the client\'s actual deployment',
  'I have reviewed all AI verdicts and confirmed or overridden as appropriate',
  'I have noted all CONTESTED and UNRESOLVED findings and discussed with client',
  'I have advised the client which findings require qualified legal review',
  'I have manually reviewed all CITATION_FAILED findings against source documents',
  'I have not represented this assessment as legal advice',
  'I understand this is a preliminary assessment for deployer obligations only',
];

const OBLIGATION_META = {
  aia_art4:      { articleRef: 'Article 4',      title: 'AI Literacy' },
  aia_art26_1:   { articleRef: 'Article 26(1)',   title: 'Use per Instructions' },
  aia_art26_2:   { articleRef: 'Article 26(2)',   title: 'Human Oversight' },
  aia_art26_4:   { articleRef: 'Article 26(4)',   title: 'Input Data Quality' },
  aia_art26_5:   { articleRef: 'Article 26(5)',   title: 'Monitoring & Incident Reporting' },
  aia_art26_6:   { articleRef: 'Article 26(6)',   title: 'Log Retention' },
  aia_art26_7:   { articleRef: 'Article 26(7)',   title: 'Worker Notification' },
  aia_art26_9:   { articleRef: 'Article 26(9)',   title: 'GDPR DPIA Bridge' },
  aia_art26_11:  { articleRef: 'Article 26(11)',  title: 'Affected Persons Transparency' },
  aia_art27_1:   { articleRef: 'Article 27(1)',   title: 'Fundamental Rights Impact Assessment' },
};

const VERDICT_COLORS = {
  COMPLIANT:             { bg: '#DCFCE7', text: '#166534' },
  PARTIALLY_COMPLIANT:   { bg: '#FEF3C7', text: '#92400E' },
  NON_COMPLIANT:         { bg: '#FEE2E2', text: '#991B1B' },
  INSUFFICIENT_EVIDENCE: { bg: '#F3F4F6', text: '#374151' },
  CITATION_FAILED:       { bg: '#FFEDD5', text: '#9A3412' },
  NOT_EVALUATED:         { bg: '#F3F4F6', text: '#6B7280' },
};

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#7F1D1D', text: '#FFFFFF' },
  HIGH:     { bg: '#FEE2E2', text: '#991B1B' },
  MEDIUM:   { bg: '#FEF3C7', text: '#92400E' },
  LOW:      { bg: '#DCFCE7', text: '#166534' },
};

const CLASSIFICATION_STEP_LABELS = {
  step1_prohibition: 'Step 1 — Article 5: Prohibited Practice Screening',
  step2_definition:  'Step 2 — Article 3(1): AI Definition Check',
  step3_annexIII:    'Step 3 — Annex III: Domain Matching',
  step4_derogation:  'Step 4 — Article 6(3): Derogation Assessment',
  step5_role:        'Step 5 — Role Determination',
};

/* ─── Data normalisation helpers ──────────────────────────────────────────── */

function normaliseObligation(o) {
  const ev = o.evaluationResult?.evaluation || o.evaluationResult || {};
  const meta = OBLIGATION_META[o.obligationId] || {};
  return {
    obligationId: o.obligationId,
    articleRef: meta.articleRef || ev.articleRef || o.obligationId,
    title: meta.title || '',
    verdict: o.consultantVerdict || ev.verdict || 'NOT_EVALUATED',
    riskSeverity: ev.riskSeverity || null,
    confidence: ev.confidence || null,
    legalCertainty: ev.legalCertainty || null,
    requirementsSummary: ev.requirementsSummary || '',
    verdictRationale: ev.verdictRationale || ev.reasoning || '',
    gapDescription: ev.gapDescription || null,
    remediationGuidance: ev.remediationGuidance || null,
    requiresLegalAdvice: Boolean(ev.requiresLegalAdvice),
    citationVerified: o.evaluationResult?.citationVerified ?? ev.citationVerified ?? null,
    requiresManualVerification: o.evaluationResult?.requiresManualVerification ?? ev.requiresManualVerification ?? null,
    consistencyResult: o.consistencyResult || o.evaluationResult?.consistencyResult || null,
    plainLanguageResult: o.plainLanguageResult || o.evaluationResult?.plainLanguage || null,
    sourceCitation: ev.sourceCitation || null,
    sourceChunks: o.evaluationResult?.sourceChunks || null,
    evidence: o.evidence || {},
    matchingArchetypes: o.matchingArchetypes || [],
    consultantVerdict: o.consultantVerdict || null,
    consultantAnnotation: o.consultantAnnotation || '',
    status: o.status || 'pending',
  };
}

function deriveGapRows(synthesis, obligations) {
  if (synthesis?.gapRegister?.length) {
    return synthesis.gapRegister.map((g, i) => ({ ...g, priority: i + 1 }));
  }
  const GAP_VERDICTS = new Set(['NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'INSUFFICIENT_EVIDENCE', 'CITATION_FAILED']);
  return obligations
    .filter((o) => GAP_VERDICTS.has(o.verdict))
    .map((o, i) => ({
      obligationId: o.obligationId,
      articleRef: o.articleRef,
      gapDescription: o.gapDescription || 'Gap identified — details pending evaluation.',
      severity: o.riskSeverity || 'MEDIUM',
      effort: 'M',
      requiresLegalReview: o.requiresLegalAdvice,
      citationVerified: o.citationVerified === true,
      requiresManualVerification: o.requiresManualVerification === true,
      priority: i + 1,
    }));
}

function isInconsistentFlag(flag) {
  return [
    'MODEL_INCONSISTENT',
    'SEVERITY_INCONSISTENT',
    'MODEL_AND_SEVERITY_INCONSISTENT',
  ].includes(flag);
}

/* ─── Export helpers ──────────────────────────────────────────────────────── */


/* ─── Component ───────────────────────────────────────────────────────────── */

export default function ReportGeneration({ assessmentState, dispatch, guidance }) {
  const { meta, system, classification, obligations: rawObligations, synthesis } = assessmentState;
  const callout = guidance?.nextBestActions?.[0];

  /* ── Normalised data ───────────────────────────────────────────────────── */

  const obligations = useMemo(
    () => (rawObligations || []).map(normaliseObligation),
    [rawObligations]
  );

  const gapRows = useMemo(
    () => deriveGapRows(synthesis, obligations),
    [synthesis, obligations]
  );

  const rulesResult = classification?.rulesEngineResult || null;

  /* ── Aggregate counts for Executive Summary ────────────────────────────── */

  const contestedCount = useMemo(
    () => obligations.filter((o) => o.legalCertainty === 'CONTESTED' || o.legalCertainty === 'UNRESOLVED').length,
    [obligations]
  );

  const citationFailedCount = useMemo(
    () => obligations.filter((o) => o.verdict === 'CITATION_FAILED' || o.requiresManualVerification === true).length,
    [obligations]
  );

  const inconsistentCount = useMemo(
    () => obligations.filter((o) => {
      const flag = o.consistencyResult?.consistencyFlag;
      return isInconsistentFlag(flag);
    }).length,
    [obligations]
  );

  /* ── Scoped-out obligations (applicability gate) ─────────────────────── */

  const scopedOutObligations = useMemo(() => {
    const CONDITIONS = [
      {
        clauseId: 'clause_art26_4', articleRef: 'Article 26(4)', title: 'Input Data Quality',
        applies_conditions: {
          logic: 'OR',
          required: [
            { field: 'system.inputDataController', op: 'eq', value: 'Our organisation' },
            { field: 'system.inputDataController', op: 'eq', value: 'Mixed' },
          ],
          notApplicableBasis: 'Art. 26(4) applies only where the deployer controls the input data.',
          notApplicableCitation: 'Article 26(4)',
        },
      },
      {
        clauseId: 'clause_art26_7', articleRef: 'Article 26(7)', title: 'Worker Notification',
        applies_conditions: {
          logic: 'AND',
          required: [
            { field: 'system.deploymentContext', op: 'includes', value: 'employee' },
          ],
          notApplicableBasis: 'Art. 26(7) applies to deployers using AI in the workplace affecting workers.',
          notApplicableCitation: 'Article 26(7)',
        },
      },
      {
        clauseId: 'clause_art27_1', articleRef: 'Article 27(1)', title: 'Fundamental Rights Impact Assessment',
        applies_conditions: {
          logic: 'OR',
          required: [
            { field: 'classification.rulesEngineResult.step5_role.primaryRole', op: 'eq', value: 'PUBLIC_BODY' },
            { field: 'classification.rulesEngineResult.step3_annexIII.matchedDomains', op: 'includes', value: '5b_credit' },
            { field: 'classification.rulesEngineResult.step3_annexIII.matchedDomains', op: 'includes', value: '5c_insurance' },
          ],
          notApplicableBasis: 'Art. 27(1) applies to public bodies and credit/insurance deployers only.',
          notApplicableCitation: 'Article 27(1)',
        },
      },
    ];

    function resolve(obj, path) {
      return path.split('.').reduce((o, k) => o?.[k], obj);
    }

    const out = [];
    for (const c of CONDITIONS) {
      const results = c.applies_conditions.required.map(({ field, op, value }) => {
        const v = resolve(assessmentState, field);
        if (op === 'eq') return v === value;
        if (op === 'neq') return v !== value;
        if (op === 'includes') {
          if (typeof v === 'string') return v.toLowerCase().includes(String(value).toLowerCase());
          if (Array.isArray(v)) return v.includes(value);
          return false;
        }
        if (op === 'truthy') return !!v;
        return false;
      });
      const applies = c.applies_conditions.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
      if (!applies) {
        out.push({
          articleRef: c.articleRef,
          title: c.title,
          basis: c.applies_conditions.notApplicableBasis,
          citation: c.applies_conditions.notApplicableCitation,
        });
      }
    }
    return out;
  }, [assessmentState]);

  /* ── Executive summary editable state ──────────────────────────────────── */

  const [execSummary, setExecSummary] = useState(
    synthesis?.executiveSummaryOpening || 'No synthesis data available. Complete gap synthesis first.'
  );

  /* ── Active artefact view ──────────────────────────────────────────────── */

  const [activeArtefact, setActiveArtefact] = useState('all');

  /* ── Consultant gate state ─────────────────────────────────────────────── */

  const [checks, setChecks] = useState(() => CHECKLIST_ITEMS.map(() => false));
  const [consultantName, setConsultantName] = useState('');
  const [signed, setSigned] = useState(assessmentState.consultantReviewComplete || false);
  const [signDate] = useState(() => new Date().toISOString().split('T')[0]);

  const allChecked = checks.every(Boolean) && consultantName.trim().length > 0;

  const handleSign = useCallback(() => {
    setSigned(true);
    dispatch({ type: 'MARK_REVIEW_COMPLETE' });
  }, [dispatch]);

  /* ── Export handlers ───────────────────────────────────────────────────── */

  const reportRef = useRef(null);

  async function fetchReportArtefact(artefact, format) {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentState, artefact, format }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Report request failed (${res.status})`);
    }
    return res.json();
  }

  const ARTEFACT_TYPE_MAP = {
    full: 'ALL',
    evidence: 'EVIDENCE_REQUEST',
    'artefact-a': 'A',
    'artefact-b': 'B',
    'artefact-c': 'C',
    'artefact-d': 'D',
    'artefact-e': 'E',
    'artefact-f': 'F',
  };

  const SECTIONS_MAP = {
    ALL: ['A', 'B', 'C', 'D', 'E', 'F'],
    EVIDENCE_REQUEST: ['C', 'D'],
    A: ['A'],
    B: ['B'],
    C: ['C'],
    D: ['D'],
    E: ['E'],
    F: ['F'],
  };

  function buildPdfFilename(artefactType) {
    const base = (assessmentState.system?.name || 'assessment')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    const date = new Date().toISOString().slice(0, 10);
    const suffix = artefactType === 'ALL'
      ? 'full-report'
      : artefactType === 'EVIDENCE_REQUEST'
        ? 'evidence-request'
        : `artefact-${artefactType.toLowerCase()}`;
    return `${base}-${suffix}-${date}.pdf`;
  }

  async function exportPDF(artefactType, pdfSections) {
    const { artefactData, reportMetadata } = await fetchReportArtefact(artefactType, 'pdf');
    const blob = await pdf(
      <AssessmentReportPDF
        assessmentState={assessmentState}
        artefactData={artefactData}
        reportMetadata={reportMetadata}
        sections={pdfSections}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildPdfFilename(artefactType);
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    const payload = await fetchReportArtefact('D', 'excel');
    const binary = atob(payload.base64 || '');
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: payload.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = payload.filename || 'gap-register.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function triggerExport(type) {
    dispatch({ type: 'SET_EXPORTED', payload: new Date().toISOString() });
    try {
      if (type === 'excel') {
        await exportExcel();
        return;
      }
      const artefactType = ARTEFACT_TYPE_MAP[type];
      if (artefactType) {
        await exportPDF(artefactType, SECTIONS_MAP[artefactType]);
        return;
      }
    } catch (err) {
      console.error('[report-export] Failed:', err.message);
    }
  }

  /* HTML export builders removed - all exports now go through /api/report + AssessmentReportPDF */


  /* ── Render ─────────────────────────────────────────────────────────────── */

  const ARTEFACT_TABS = [
    { key: 'all', label: 'All Artefacts' },
    { key: 'a', label: 'A — System Register' },
    { key: 'b', label: 'B — Classification' },
    { key: 'c', label: 'C — Compliance Matrix' },
    { key: 'd', label: 'D — Gap Register' },
    { key: 'e', label: 'E — Executive Summary' },
    { key: 'f', label: 'F — Citation Appendix' },
  ];

  const show = (key) => activeArtefact === 'all' || activeArtefact === key;

  return (
    <div className="max-w-7xl mx-auto space-y-8" ref={reportRef}>

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1.75rem', fontWeight: 600 }}>
          Report Generation
        </h1>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: '#EFF6FF', color: '#1B4B82' }}>
          Corpus v{CORPUS_VERSION}
        </span>
      </div>

      {callout && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Next best action
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{callout.label}:</span> {callout.description}
          </p>
        </div>
      )}

      {/* ─── ARTEFACT TABS ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 border-b pb-1" style={{ borderColor: '#E2E8F0' }}>
        {ARTEFACT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveArtefact(tab.key)}
            className="px-3 py-1.5 text-xs font-medium rounded-t transition-colors"
            style={{
              fontFamily: 'Inter, sans-serif',
              backgroundColor: activeArtefact === tab.key ? '#0F1B2D' : 'transparent',
              color: activeArtefact === tab.key ? '#FFFFFF' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── ARTEFACT A — AI SYSTEM REGISTER ─────────────────────────────── */}
      {show('a') && (
        <ArtefactSection id="a" title="A — AI System Register">
          <DefinitionTable rows={[
            ['System Name', system.name],
            ['Vendor / Developer', system.vendor],
            ['Model Version', system.modelVersion],
            ['System Type', system.systemType],
            ['Intended Purpose', system.intendedPurpose],
            ['Provider Stated Purpose', system.providerStatedPurpose],
            ['Deployment Context', system.deploymentContext],
            ['Primary Sector', system.primarySector],
            ['Persons Affected / Month', system.personsAffectedPerMonth],
            ['Affects EU Residents', system.affectsEuResidents],
            ['Input Data Controller', system.inputDataController],
            ['Operated By', system.operatedBy],
            ['Oversight Role', system.oversightRole],
            ['Classification', rulesResult?.finalClassification || 'Not classified'],
            ['Role Determination', rulesResult?.step5_role?.primaryRole || 'Not determined'],
            ['Requires Legal Review', rulesResult?.requiresLegalReview ? 'Yes' : 'No'],
            ['Assessment Date', meta.assessmentDate || signDate],
            ['Lead Consultant', meta.leadConsultant || consultantName || '—'],
            ['Regulation Version', meta.regulationVersion],
            ['Corpus Version', CORPUS_VERSION],
            ['Retrieval Mode', RETRIEVAL_MODE],
          ]} />
          {rulesResult && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                Rules Engine Output (verbatim)
              </p>
              <pre className="text-[10px] leading-relaxed bg-gray-50 border rounded p-3 overflow-x-auto whitespace-pre-wrap" style={{ fontFamily: 'monospace', borderColor: '#E2E8F0', color: '#334155' }}>
                {JSON.stringify(rulesResult, null, 2)}
              </pre>
            </div>
          )}
          {scopedOutObligations.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                Obligations Scoped Out (Not Applicable)
              </p>
              <table className="w-full text-xs border-collapse" style={{ borderColor: '#E2E8F0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Article</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Obligation</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Scoping Basis</th>
                    <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Cited Provision</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedOutObligations.map((ob) => (
                    <tr key={ob.articleRef}>
                      <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{ob.articleRef}</td>
                      <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{ob.title}</td>
                      <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#64748B' }}>{ob.basis}</td>
                      <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9' }}>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>
                          {ob.citation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ArtefactSection>
      )}

      {/* ─── ARTEFACT B — CLASSIFICATION DECISION RECORD ─────────────────── */}
      {show('b') && (
        <ArtefactSection id="b" title="B — Risk Classification Decision Record">
          {!rulesResult ? (
            <EmptyNote>Classification not yet performed.</EmptyNote>
          ) : (
            <div className="space-y-4">
              {['step1_prohibition', 'step2_definition', 'step3_annexIII', 'step4_derogation', 'step5_role'].map((key) => {
                const step = rulesResult[key];
                if (!step && key === 'step4_derogation') return null;
                return (
                  <div key={key} className="border rounded-lg overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
                    <div className="px-4 py-2" style={{ backgroundColor: '#F8FAFC' }}>
                      <h3 className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
                        {CLASSIFICATION_STEP_LABELS[key]}
                      </h3>
                    </div>
                    <pre className="text-[10px] leading-relaxed p-3 overflow-x-auto whitespace-pre-wrap" style={{ fontFamily: 'monospace', color: '#334155' }}>
                      {JSON.stringify(step, null, 2)}
                    </pre>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                  Final Classification:
                </span>
                <ClassificationBadge value={rulesResult.finalClassification} />
              </div>
              {rulesResult.flags?.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                    Flags:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {rulesResult.flags.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {classification?.explanationResult && (
                <div className="border-l-4 rounded-r-lg p-4" style={{ borderColor: '#D97706', backgroundColor: '#FFFBEB' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#92400E' }}>
                    Classification Explanation (contested edge)
                  </p>
                  <pre className="text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap" style={{ fontFamily: 'monospace', color: '#78350F' }}>
                    {JSON.stringify(classification.explanationResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </ArtefactSection>
      )}

      {/* ─── ARTEFACT C — COMPLIANCE ASSESSMENT MATRIX ───────────────────── */}
      {show('c') && (
        <ArtefactSection id="c" title="C — Compliance Assessment Matrix">
          {obligations.length === 0 ? (
            <EmptyNote>No obligations assessed yet.</EmptyNote>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
              <table className="w-full text-[11px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F1B2D', color: '#FFFFFF' }}>
                    <th className="px-2 py-2 text-left font-semibold tracking-wider">Article</th>
                    <th className="px-2 py-2 text-left font-semibold tracking-wider">Requirement</th>
                    <th className="px-2 py-2 text-left font-semibold tracking-wider">Evidence</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Verdict</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Severity</th>
                    <th className="px-2 py-2 text-left font-semibold tracking-wider">Gap</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Legal Certainty</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Citation</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Manual Verif.</th>
                    <th className="px-2 py-2 text-center font-semibold tracking-wider">Consistency</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((o) => {
                    const consistency = o.consistencyResult?.consistencyFlag || null;
                    const isContested = o.legalCertainty === 'CONTESTED' || o.legalCertainty === 'UNRESOLVED';
                    const needsManual = o.requiresManualVerification === true;
                    const isInconsistent = isInconsistentFlag(consistency);
                    const vc = VERDICT_COLORS[o.verdict] || VERDICT_COLORS.NOT_EVALUATED;
                    return (
                      <MatrixRowGroup key={o.obligationId}>
                        <tr className="border-t" style={{ borderColor: '#E2E8F0' }}>
                          <td className="px-2 py-2 font-medium" style={{ color: '#1B4B82' }}>{o.articleRef}</td>
                          <td className="px-2 py-2 text-gray-700 max-w-[180px]">{o.requirementsSummary || o.title}</td>
                          <td className="px-2 py-2 text-gray-600 max-w-[160px] truncate">{o.evidence?.controlDescription || '—'}</td>
                          <td className="px-2 py-2 text-center">
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: vc.bg, color: vc.text }}>
                              {o.verdict}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {o.riskSeverity ? <SeverityBadge severity={o.riskSeverity} /> : '—'}
                          </td>
                          <td className="px-2 py-2 text-gray-600 max-w-[200px]">{o.gapDescription || '—'}</td>
                          <td className="px-2 py-2 text-center">
                            {o.legalCertainty ? <LegalCertaintyBadge certainty={o.legalCertainty} /> : '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <CitationVerifiedBadge verified={o.citationVerified} requiresManualVerification={o.requiresManualVerification} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            {needsManual ? (
                              <span className="text-orange-600 font-semibold text-[10px]">⚠ Required</span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center text-[10px]">
                            {consistency ? (
                              <span className={consistency === 'CONSISTENT' ? 'text-green-600' : isInconsistent ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                                {consistency}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>

                        {/* Quoted citation row */}
                        {o.sourceCitation?.quotedText && (
                          <tr style={{ backgroundColor: '#F8FAFC' }}>
                            <td colSpan={10} className="px-4 py-2">
                              <div className="pl-3 border-l-3 italic text-[10px] text-gray-600 leading-relaxed" style={{ borderLeft: '3px solid #1B4B82' }}>
                                &ldquo;{o.sourceCitation.quotedText}&rdquo;
                                <span className="ml-2 not-italic text-gray-400">
                                  — {o.sourceCitation.articleRef || o.articleRef}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Conditional notes */}
                        {isContested && (
                          <tr>
                            <td colSpan={10} className="px-4 py-1">
                              <div className="text-[10px] rounded px-3 py-1.5" style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderLeft: '3px solid #D97706' }}>
                                Legal review required — interpretation is not settled
                              </div>
                            </td>
                          </tr>
                        )}
                        {needsManual && (
                          <tr>
                            <td colSpan={10} className="px-4 py-1">
                              <div className="text-[10px] rounded px-3 py-1.5" style={{ backgroundColor: '#FFEDD5', color: '#9A3412', borderLeft: '3px solid #EA580C' }}>
                                Source document check required before relying on this finding
                              </div>
                            </td>
                          </tr>
                        )}
                        {isInconsistent && (
                          <tr>
                            <td colSpan={10} className="px-4 py-1">
                              <div className="text-[10px] rounded px-3 py-1.5" style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderLeft: '3px solid #D97706' }}>
                                Evaluations produced inconsistent results — consultant review required
                              </div>
                            </td>
                          </tr>
                        )}
                      </MatrixRowGroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ArtefactSection>
      )}

      {/* ─── ARTEFACT D — GAP REGISTER ───────────────────────────────────── */}
      {show('d') && (
        <ArtefactSection id="d" title="D — Gap Register (Excel-ready)">
          {gapRows.length === 0 ? (
            <EmptyNote>No compliance gaps identified.</EmptyNote>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
              <table className="w-full text-[11px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F1B2D', color: '#FFFFFF' }}>
                    <th className="px-2 py-2 text-left font-semibold w-10">#</th>
                    <th className="px-2 py-2 text-left font-semibold">Article</th>
                    <th className="px-2 py-2 text-left font-semibold">Gap Description</th>
                    <th className="px-2 py-2 text-center font-semibold w-20">Severity</th>
                    <th className="px-2 py-2 text-center font-semibold w-14">Effort</th>
                    <th className="px-2 py-2 text-center font-semibold w-16">Legal Review</th>
                    <th className="px-2 py-2 text-center font-semibold w-16">Citation</th>
                    <th className="px-2 py-2 text-center font-semibold w-20">Manual Verif.</th>
                    <th className="px-2 py-2 text-left font-semibold w-28">Target Date</th>
                    <th className="px-2 py-2 text-left font-semibold w-24">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {gapRows.map((g) => (
                    <tr key={g.obligationId} className="border-t hover:bg-blue-50/30" style={{ borderColor: '#E2E8F0' }}>
                      <td className="px-2 py-2 text-gray-400 font-mono">{g.priority}</td>
                      <td className="px-2 py-2 font-medium" style={{ color: '#1B4B82' }}>{g.articleRef}</td>
                      <td className="px-2 py-2 text-gray-700">{g.gapDescription}</td>
                      <td className="px-2 py-2 text-center"><SeverityBadge severity={g.severity} /></td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {g.effort}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {g.requiresLegalReview ? <span className="text-amber-600 font-semibold">⚠ Yes</span> : <span className="text-green-600">No</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {g.citationVerified === true ? <span className="text-green-600">✓</span> : g.citationVerified === false ? <span className="text-red-600 font-semibold">⚠</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {g.requiresManualVerification ? <span className="text-orange-500 font-semibold">⚠</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-2 py-2 text-gray-600">{g.targetDate || '—'}</td>
                      <td className="px-2 py-2 text-gray-600">{g.owner || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ArtefactSection>
      )}

      {/* ─── ARTEFACT E — EXECUTIVE SUMMARY ──────────────────────────────── */}
      {show('e') && (
        <ArtefactSection id="e" title="E — Executive Summary">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                Opening Statement (editable)
              </label>
              <textarea
                value={execSummary}
                onChange={(e) => setExecSummary(e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed focus:ring-2 focus:outline-none"
                style={{ fontFamily: 'Georgia, serif', borderColor: '#CBD5E1', color: '#1E293B' }}
              />
            </div>

            {/* HIGH / CRITICAL findings in plain language */}
            {obligations.some((o) => o.verdict === 'NON_COMPLIANT' || ((o.riskSeverity === 'CRITICAL' || o.riskSeverity === 'HIGH') && o.verdict === 'PARTIALLY_COMPLIANT')) && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
                  HIGH / CRITICAL Findings
                </h3>
                <ul className="space-y-2">
                  {obligations.filter((o) => o.verdict === 'NON_COMPLIANT' || ((o.riskSeverity === 'CRITICAL' || o.riskSeverity === 'HIGH') && o.verdict === 'PARTIALLY_COMPLIANT')).map((o) => (
                    <li key={o.obligationId} className="flex gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className="shrink-0 font-semibold" style={{ color: '#991B1B' }}>{o.articleRef}:</span>
                      <span className="text-gray-700">
                        {o.plainLanguageResult?.summary || o.verdictRationale || o.gapDescription || 'Details pending.'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legal certainty paragraph */}
            {contestedCount > 0 && (
              <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #D97706' }}>
                <p className="text-xs font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#92400E' }}>
                  Legal Certainty
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#78350F' }}>
                  {contestedCount} obligation{contestedCount > 1 ? 's' : ''} assessed under CONTESTED or UNRESOLVED legal certainty.
                  These findings should not be relied upon without qualified legal review of the specific provisions in question.
                </p>
              </div>
            )}

            {/* Manual verification paragraph (separate from legal) */}
            {citationFailedCount > 0 && (
              <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FFEDD5', borderLeft: '4px solid #EA580C' }}>
                <p className="text-xs font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#9A3412' }}>
                  Citation and Source Verification
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#7C2D12' }}>
                  {citationFailedCount} finding{citationFailedCount > 1 ? 's' : ''} have CITATION_FAILED verdicts or require manual source document verification.
                  These findings must be cross-checked against the authoritative legal text before reliance.
                </p>
              </div>
            )}

            {inconsistentCount > 0 && (
              <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #D97706' }}>
                <p className="text-xs font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#92400E' }}>
                  Evaluation Consistency
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#78350F' }}>
                  {inconsistentCount} obligation{inconsistentCount > 1 ? 's' : ''} produced inconsistent evaluation results.
                  Consultant review of these findings is required before reliance.
                </p>
              </div>
            )}
          </div>
        </ArtefactSection>
      )}

      {/* ─── ARTEFACT F — CITATION APPENDIX ──────────────────────────────── */}
      {show('f') && (
        <ArtefactSection id="f" title="F — Citation Appendix">
          <div className="space-y-6">
            {obligations.map((o) => (
              <div key={o.obligationId} className="border rounded-lg p-4" style={{ borderColor: '#E2E8F0' }}>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
                  {o.articleRef} — {o.title}
                </h3>

                {/* Tier 1 chunk */}
                {o.sourceChunks?.tier1?.chunk_text && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                      Tier 1 — Primary Law Text
                    </p>
                    <div className="pl-3 text-xs text-gray-700 italic leading-relaxed" style={{ borderLeft: '3px solid #1B4B82' }}>
                      {o.sourceChunks.tier1.chunk_text}
                    </div>
                  </div>
                )}

                {/* Tier 2+ bridge */}
                {o.sourceChunks?.bridgeContext?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                      Tier 2+ — Supporting Recitals / Context
                    </p>
                    {o.sourceChunks.bridgeContext.map((c, i) => (
                      <div key={i} className="pl-3 text-xs text-gray-600 leading-relaxed mb-1.5" style={{ borderLeft: '3px solid #94A3B8' }}>
                        <span className="font-medium text-gray-500 not-italic">{c.article_ref || c.id}: </span>
                        <span className="italic">{c.chunk_text || c.text || ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quoted text used */}
                {o.sourceCitation?.quotedText && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                      Quoted Text Used in Finding
                    </p>
                    <div className="pl-3 text-xs italic text-gray-700 leading-relaxed" style={{ borderLeft: '3px solid #1B4B82' }}>
                      &ldquo;{o.sourceCitation.quotedText}&rdquo;
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Chunk ID: {o.sourceCitation.chunkId || '—'}
                    </p>
                  </div>
                )}

                {/* Verification statuses */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <CitationVerifiedBadge verified={o.citationVerified} requiresManualVerification={o.requiresManualVerification} />
                </div>

                {/* Fixed source/corpus lines */}
                <p className="text-[10px] text-gray-400">{SOURCE_LINE}</p>
                <p className="text-[10px] text-gray-400">{CORPUS_LINE}</p>
              </div>
            ))}

            {obligations.length === 0 && <EmptyNote>No obligations assessed yet.</EmptyNote>}

            {/* Fixed footer */}
            <div className="pt-4 border-t text-[10px] text-gray-400 leading-relaxed" style={{ borderColor: '#E2E8F0' }}>
              {FOOTER_TEXT}
            </div>
          </div>
        </ArtefactSection>
      )}

      {/* ─── MODE-SPECIFIC OUTPUT ─────────────────────────────────────── */}
      <ModeSpecificOutputs mode={meta?.mode} assessmentState={assessmentState} obligations={obligations} gapRows={gapRows} synthesis={synthesis} />

      {/* ─── CONSULTANT REVIEW GATE ──────────────────────────────────────── */}
      <section data-testid="consultant-gate" className="border-2 rounded-lg p-6" style={{ borderColor: signed ? '#16A34A' : '#1B4B82', backgroundColor: signed ? '#F0FDF4' : '#FFFFFF' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Consultant Review Gate
        </h2>

        {signed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-lg">✓</span>
              <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>Assessment signed by {consultantName} on {signDate}</span>
            </div>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              All review checklist items were confirmed. Export controls are now available below.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={() => setChecks((prev) => prev.map((c, j) => (j === i ? !c : c)))}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#1B4B82] focus:ring-[#1B4B82] cursor-pointer"
                  />
                  <span className="text-xs leading-relaxed text-gray-700 group-hover:text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-end gap-4 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                  Consultant Name (required)
                </label>
                <input
                  data-testid="consultant-name-input"
                  type="text"
                  value={consultantName}
                  onChange={(e) => setConsultantName(e.target.value)}
                  placeholder="Full name"
                  className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  style={{ fontFamily: 'Inter, sans-serif', borderColor: '#CBD5E1' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}>
                  Date
                </label>
                <input
                  type="text"
                  value={signDate}
                  readOnly
                  className="border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  style={{ fontFamily: 'Inter, sans-serif', borderColor: '#CBD5E1', width: '130px' }}
                />
              </div>
            </div>

            <button
              disabled={!allChecked}
              onClick={handleSign}
              className="mt-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors"
              style={{
                fontFamily: 'Inter, sans-serif',
                backgroundColor: allChecked ? '#1B4B82' : '#CBD5E1',
                color: allChecked ? '#FFFFFF' : '#94A3B8',
                cursor: allChecked ? 'pointer' : 'not-allowed',
              }}
            >
              Generate and sign assessment
            </button>
          </div>
        )}
      </section>

      {/* ─── EXPORT BUTTONS ──────────────────────────────────────────────── */}
      {signed && (
        <section className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
            Export
          </h2>
          <div className="flex flex-wrap gap-3">
            <ExportButton label="Export PDF — Full report (all 6 artefacts)" onClick={() => triggerExport('full')} primary testId="export-full-pdf" />
            <ExportButton label="Export PDF — Evidence Request only" onClick={() => triggerExport('evidence')} testId="export-evidence-pdf" />
            <ExportButton label="Export Excel — Gap Register" onClick={() => triggerExport('excel')} testId="export-excel" />
            <ExportButton label="Export PDF — A: System Register" onClick={() => triggerExport('artefact-a')} small />
            <ExportButton label="Export PDF — B: Classification" onClick={() => triggerExport('artefact-b')} small />
            <ExportButton label="Export PDF — C: Compliance Matrix" onClick={() => triggerExport('artefact-c')} small />
            <ExportButton label="Export PDF — D: Gap Register" onClick={() => triggerExport('artefact-d')} small />
            <ExportButton label="Export PDF — E: Executive Summary" onClick={() => triggerExport('artefact-e')} small />
            <ExportButton label="Export PDF — F: Citation Appendix" onClick={() => triggerExport('artefact-f')} small />
          </div>
          {assessmentState.exportedAt && (
            <p className="mt-3 text-xs text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Last exported: {new Date(assessmentState.exportedAt).toLocaleString()}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function ArtefactSection({ id, title, children }) {
  return (
    <section id={`artefact-${id}`} className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E2E8F0' }}>
      <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DefinitionTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="px-3 py-2 font-semibold text-gray-500 w-1/3 align-top">{label}</td>
              <td className="px-3 py-2 text-gray-800 whitespace-pre-wrap">{value || '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <p className="text-sm text-gray-400 italic py-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      {children}
    </p>
  );
}

function ClassificationBadge({ value }) {
  const COLORS = {
    PROHIBITED:               { bg: '#DC2626', text: '#FFFFFF' },
    HIGH_RISK:                { bg: '#DC2626', text: '#FFFFFF' },
    CLASSIFICATION_CONTESTED: { bg: '#D97706', text: '#FFFFFF' },
    LIMITED_OR_MINIMAL_RISK:  { bg: '#1B4B82', text: '#FFFFFF' },
  };
  const c = COLORS[value] || { bg: '#6B7280', text: '#FFFFFF' };
  return (
    <span className="text-xs font-bold px-3 py-1 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {value || 'UNKNOWN'}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: c.bg, color: c.text }}>
      {severity}
    </span>
  );
}

function MatrixRowGroup({ children }) {
  return <>{children}</>;
}

function ExportButton({ label, onClick, primary, small, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`rounded-lg font-medium transition-colors ${small ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'}`}
      style={{
        fontFamily: 'Inter, sans-serif',
        backgroundColor: primary ? '#1B4B82' : '#FFFFFF',
        color: primary ? '#FFFFFF' : '#1B4B82',
        border: primary ? 'none' : '1px solid #1B4B82',
      }}
    >
      {label}
    </button>
  );
}

function ModeSpecificOutputs({ mode, assessmentState, obligations, gapRows, synthesis }) {
  if (!mode) return null;

  const systemName = assessmentState?.system?.name || 'AI System';
  const nonCompliant = obligations.filter((o) => o.verdict === 'NON_COMPLIANT' || o.verdict === 'PARTIALLY_COMPLIANT');
  const gapCount = gapRows?.length || 0;

  if (mode === 'founder') {
    return (
      <section className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E2E8F0' }} data-testid="mode-founder">
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Founder Mode — 90-Day Build Plan
        </h2>
        <div className="space-y-4 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Investor-Ready Trust Appendix</h3>
            <p className="text-xs text-blue-800">
              {systemName} has been assessed against EU AI Act (Regulation 2024/1689) deployer obligations.
              {gapCount === 0
                ? ' No material compliance gaps were identified. Evidence pack is complete.'
                : ` ${gapCount} gap${gapCount !== 1 ? 's' : ''} identified with remediation timelines below.`}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">90-Day Remediation Timeline</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white bg-red-600 rounded px-2 py-0.5 w-20 text-center">Day 1–30</span>
                <span className="text-xs text-gray-700">Address all NON_COMPLIANT findings. Secure Tier 1 evidence artefacts.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white bg-amber-500 rounded px-2 py-0.5 w-20 text-center">Day 31–60</span>
                <span className="text-xs text-gray-700">Resolve PARTIALLY_COMPLIANT items. Complete Tier 2 evidence artefacts.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white bg-green-600 rounded px-2 py-0.5 w-20 text-center">Day 61–90</span>
                <span className="text-xs text-gray-700">Implement monitoring, periodic review cadence, and vendor flow-down controls.</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Vendor Flow-Down Checklist</h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>Obtain Article 13 transparency documentation from AI model provider</li>
              <li>Confirm provider's instructions for use are current and version-controlled</li>
              <li>Establish contractual log access rights (minimum 6-month retention)</li>
              <li>Verify provider's conformity assessment status and CE marking (if applicable)</li>
              <li>Request data processing records for DPIA alignment</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  if (mode === 'regulator') {
    return (
      <section className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E2E8F0' }} data-testid="mode-regulator">
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Regulator Mode — Regulatory Controls Matrix
        </h2>
        <div className="space-y-4 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">Policy Lens</h3>
            <p className="text-xs text-purple-800">
              This matrix maps each deployer obligation to the evidence required, enforcement practicality, and common prohibited patterns to watch for in procurement and market surveillance.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ borderColor: '#E2E8F0' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Article</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Obligation</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Required Evidence</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Enforcement Practicality</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => (
                  <tr key={o.obligationId}>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{o.articleRef}</td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{o.title}</td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#64748B' }}>{o.requirementsSummary || '—'}</td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#64748B' }}>
                      {o.citationVerified ? 'Verifiable' : 'Requires manual review'}
                    </td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9' }}>
                      <VerdictBadge verdict={o.verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Common Prohibited Patterns to Watch</h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>Social scoring systems by public authorities or on their behalf</li>
              <li>Real-time remote biometric identification in public spaces (without exemptions)</li>
              <li>Subliminal or manipulative AI techniques causing significant harm</li>
              <li>Exploitation of vulnerabilities of specific groups (age, disability, social situation)</li>
              <li>Emotion recognition in workplace and education (unless safety-related)</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  if (mode === 'enterprise') {
    return (
      <section className="bg-white border rounded-lg p-6 shadow-sm" style={{ borderColor: '#E2E8F0' }} data-testid="mode-enterprise">
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D' }}>
          Enterprise Mode — Audit-Ready Technical File Index
        </h2>
        <div className="space-y-4 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">Controls-to-Evidence Traceability</h3>
            <p className="text-xs text-green-800">
              This index maps each obligation to its evidence artefacts, owners, approval status, and reassessment triggers for enterprise audit readiness.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ borderColor: '#E2E8F0' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Article</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Obligation</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Verdict</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Evidence Status</th>
                  <th className="text-left px-2 py-1.5 border-b font-semibold" style={{ color: '#334155', borderColor: '#E2E8F0' }}>Reassessment Trigger</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => (
                  <tr key={o.obligationId}>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{o.articleRef}</td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#334155' }}>{o.title}</td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9' }}>
                      <VerdictBadge verdict={o.verdict} />
                    </td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#64748B' }}>
                      {o.status === 'confirmed' ? 'Approved' : o.status === 'evaluated' ? 'Under review' : 'Pending'}
                    </td>
                    <td className="px-2 py-1.5 border-b" style={{ borderColor: '#F1F5F9', color: '#64748B' }}>
                      Model change / new data source / annual review
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Reassessment Triggers</h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>Material change to the AI model (retraining, fine-tuning, version upgrade)</li>
              <li>New input data sources or changes to data pipelines</li>
              <li>Expansion to new markets or EU member states</li>
              <li>Significant incident or near-miss event</li>
              <li>Regulatory update or new guidance from EU AI Office</li>
              <li>Annual periodic reassessment (minimum)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Workflow Controls</h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
              <li>All evidence artefacts must have a named owner and approval date</li>
              <li>Version history maintained for all policy and procedure documents</li>
              <li>Consultant sign-off required before report export</li>
              <li>Incident reporting runbook linked to monitoring framework</li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

function VerdictBadge({ verdict }) {
  const vc = VERDICT_COLORS[verdict] || VERDICT_COLORS.NOT_EVALUATED;
  const label = (verdict || 'NOT_EVALUATED').replace(/_/g, ' ');
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
      style={{ backgroundColor: vc.bg, color: vc.text }}
    >
      {label}
    </span>
  );
}

