import { useState, useEffect, useCallback, useRef } from 'react';
import EvidenceCompletenessBar from '../shared/EvidenceCompletenessBar';

/* ─── Risk Posture Palette ────────────────────────────────────────────────── */

const POSTURE_STYLES = {
  CRITICAL: { bg: '#7F1D1D', text: '#FFFFFF', label: 'CRITICAL' },
  HIGH:     { bg: '#DC2626', text: '#FFFFFF', label: 'HIGH' },
  MEDIUM:   { bg: '#D97706', text: '#1C1917', label: 'MEDIUM' },
  LOW:      { bg: '#16A34A', text: '#FFFFFF', label: 'LOW' },
};

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const EFFORT_LABELS = { S: 'Small', M: 'Medium', L: 'Large' };

const LOADING_STEPS = [
  'Analysing findings…',
  'Identifying patterns…',
  'Determining critical path…',
];

/* ─── Evidence completeness per obligation ────────────────────────────────── */

const OBL_ID_TO_CLAUSE = {
  aia_art4: 'clause_art4', aia_art26_1: 'clause_art26_1', aia_art26_2: 'clause_art26_2',
  aia_art26_4: 'clause_art26_4', aia_art26_5: 'clause_art26_5', aia_art26_6: 'clause_art26_6',
  aia_art26_7: 'clause_art26_7', aia_art26_9: 'clause_art26_9', aia_art26_11: 'clause_art26_11',
  aia_art27_1: 'clause_art27_1',
};

const CLAUSE_REQ_TERMS = {
  clause_art4: [['ai training policy', 'ai literacy policy', 'mandatory ai training'], ['role based training', 'training curriculum', 'training matrix'], ['annual refresher', 'refresher programme', 'periodic training']],
  clause_art26_1: [['operational procedures', 'provider instructions', 'instructions for use'], ['change management', 'instruction updates', 'change control process'], ['staff acknowledgement', 'instruction acknowledgement', 'sign off']],
  clause_art26_2: [['oversight charter', 'governance policy', 'oversight policy'], ['role description', 'job description', 'oversight person'], ['training record', 'competence assessment', 'oversight training'], ['escalation protocol', 'suspension protocol', 'suspend use']],
  clause_art26_4: [['data quality policy', 'input data quality', 'data governance policy'], ['relevance assessment', 'representativeness assessment', 'data assessment'], ['data monitoring', 'drift detection', 'data drift']],
  clause_art26_5: [['monitoring framework', 'internal monitoring', 'monitoring procedure'], ['incident detection', 'incident reporting', 'incident management'], ['market surveillance', 'authority notification', 'surveillance authority'], ['incident response plan', 'serious incident response', 'crisis management']],
  clause_art26_6: [['log retention policy', 'retention policy', 'six month retention'], ['log storage architecture', 'technical architecture', 'storage infrastructure'], ['log integrity', 'integrity verification', 'tamper detection']],
  clause_art26_7: [['worker notification', 'employee notification', 'staff notification'], ['works council', 'worker representatives', 'representative consultation'], ['information document', 'worker information', 'worker briefing']],
  clause_art26_9: [['dpia', 'data protection impact assessment', 'privacy impact assessment'], ['data processing records', 'processing activities', 'ropa updated'], ['privacy impact assessment', 'ai risk assessment', 'ai specific risks'], ['dpo sign off', 'dpo approval', 'data protection officer']],
  clause_art26_11: [['transparency notice', 'affected persons notice', 'ai transparency notice'], ['communication channel', 'disclosure mechanism', 'transparency mechanism'], ['transparency record', 'communication record', 'notification record']],
  clause_art27_1: [['fundamental rights impact assessment', 'fria', 'rights impact assessment'], ['affected categories', 'affected persons identification', 'affected groups'], ['risk mitigation measures', 'governance measures', 'complaint mechanism']],
};

function gapRowCompleteness(row, obligations) {
  const clauseId = OBL_ID_TO_CLAUSE[row.obligationId];
  const terms = CLAUSE_REQ_TERMS[clauseId];
  if (!terms) return null;

  const obl = obligations.find((o) => o.obligationId === row.obligationId);
  const text = `${obl?.controlDescription || obl?.evidence?.controlDescription || ''} ${obl?.evidenceReference || obl?.evidence?.evidenceReference || ''}`.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;

  let present = 0;
  for (const group of terms) {
    if (group.some((t) => text.includes(t))) present++;
  }
  return Math.round((present / terms.length) * 100);
}

function gapRowConsistency(row, obligations) {
  const obligation = obligations.find((o) => o.obligationId === row.obligationId);
  const flag =
    obligation?.consistencyResult?.consistencyFlag ||
    obligation?.evaluationResult?.consistencyResult?.consistencyFlag ||
    null;

  if (!flag || flag === 'SKIPPED_CITATION_FAILED') {
    return { label: 'Unknown', className: 'text-gray-500' };
  }
  if (flag === 'CONSISTENT') {
    return { label: 'Yes', className: 'text-green-600 font-semibold' };
  }
  return { label: 'No', className: 'text-amber-700 font-semibold' };
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function GapSynthesis({ assessmentState, dispatch, guidance }) {
  const [synthesis, setSynthesis] = useState(assessmentState.synthesis || null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const callout = guidance?.nextBestActions?.[0];

  const [gapRows, setGapRows] = useState([]);
  const [expandedPatterns, setExpandedPatterns] = useState({});

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  /* ── Fetch synthesis on mount if not already present ────────────────────── */

  useEffect(() => {
    if (synthesis) {
      setGapRows(buildGapRows(synthesis.gapRegister));
      return;
    }
    fetchSynthesis();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSynthesis() {
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 2500);

    try {
      const res = await fetch('/api/synthesise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentState,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setSynthesis(data.synthesis);
      setGapRows(buildGapRows(data.synthesis.gapRegister));
      dispatch({ type: 'SET_SYNTHESIS', payload: data.synthesis });
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  function buildGapRows(register) {
    if (!register || register.length === 0) return [];
    return register.map((gap, idx) => ({
      ...gap,
      priority: idx + 1,
      targetDate: '',
      owner: '',
    }));
  }

  /* ── Gap register edit handlers ─────────────────────────────────────────── */

  const updateGapField = useCallback((idx, field, value) => {
    setGapRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }, []);

  /* ── Drag-to-reorder ────────────────────────────────────────────────────── */

  function handleDragStart(idx) {
    dragItem.current = idx;
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    dragOverItem.current = idx;
  }

  function handleDrop() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const from = dragItem.current;
    const to = dragOverItem.current;
    if (from === to) return;

    setGapRows((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated.map((row, i) => ({ ...row, priority: i + 1 }));
    });

    dragItem.current = null;
    dragOverItem.current = null;
  }

  /* ── Pattern toggle ─────────────────────────────────────────────────────── */

  function togglePattern(id) {
    setExpandedPatterns((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ── Remediation phase grouping ─────────────────────────────────────────── */

  function groupByPhase(rows) {
    const phases = [
      { label: 'Phase 1 — Immediate (≤ 30 days)', severity: 'CRITICAL', items: [] },
      { label: 'Phase 2 — Short-term (≤ 90 days)', severity: 'HIGH', items: [] },
      { label: 'Phase 3 — Medium-term (≤ 6 months)', severity: 'MEDIUM', items: [] },
      { label: 'Phase 4 — Ongoing', severity: 'LOW', items: [] },
    ];
    for (const row of rows) {
      const sev = row.severity || 'LOW';
      const phaseIdx = SEVERITY_ORDER[sev] ?? 3;
      phases[phaseIdx].items.push(row);
    }
    return phases;
  }

  /* ── Loading State ──────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <div className="inline-block mb-6">
          <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#1B4B82' }} />
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#0F1B2D' }}>
          {LOADING_STEPS[loadingStep]}
        </p>
        <div className="flex justify-center gap-2 mt-4">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
              style={{ backgroundColor: i <= loadingStep ? '#1B4B82' : '#CBD5E1' }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error State ────────────────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
          <h3 style={{ fontFamily: 'Georgia, serif', color: '#991B1B' }} className="text-lg font-semibold mb-2">
            Synthesis Failed
          </h3>
          <p className="text-sm text-red-700 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
          <button
            onClick={fetchSynthesis}
            className="px-4 py-2 text-sm font-medium text-white rounded-md"
            style={{ backgroundColor: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
          >
            Retry Synthesis
          </button>
        </div>
      </div>
    );
  }

  if (!synthesis) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
        No synthesis data available. Complete obligation assessments first.
      </div>
    );
  }

  /* ── Computed data ──────────────────────────────────────────────────────── */

  const posture = POSTURE_STYLES[synthesis.overallRiskPosture] || POSTURE_STYLES.MEDIUM;
  const phases = groupByPhase(gapRows);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1.75rem', fontWeight: 600 }}>
          Gap Synthesis
        </h1>
        <button
          data-testid="rerun-synthesis-btn"
          onClick={fetchSynthesis}
          className="px-3 py-1.5 text-xs font-medium rounded border transition-colors hover:bg-gray-100"
          style={{ fontFamily: 'Inter, sans-serif', color: '#1B4B82', borderColor: '#1B4B82' }}
        >
          Re-run Synthesis
        </button>
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

      {/* ─── SECTION 1: OVERALL RISK POSTURE ───────────────────────────────── */}
      <div
        data-testid="risk-posture-badge"
        className="rounded-lg p-6 relative"
        style={{ backgroundColor: posture.bg, color: posture.text }}
      >
        <span
          className="absolute top-4 right-4 text-xs font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}
        >
          Corpus v2026-01
        </span>
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}
          >
            Overall Risk Posture
          </span>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 700 }}>
            {posture.label}
          </span>
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.95 }}>
          {synthesis.riskPostureRationale}
        </p>
        {synthesis.executiveSummaryOpening && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ fontFamily: 'Inter, sans-serif', opacity: 0.7 }}>
              Executive Summary
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', lineHeight: 1.7 }}>
              {synthesis.executiveSummaryOpening}
            </p>
          </div>
        )}
      </div>

      {/* ─── SECTION 2: THREE KEY INSIGHT CARDS ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard
          label="Key Finding"
          icon="◆"
          content={synthesis.keyInsight}
          accentColor="#1B4B82"
        />
        <InsightCard
          label="Systemic Issue"
          icon="⚠"
          content={synthesis.systemicIssueDescription || 'No systemic issue identified.'}
          accentColor={synthesis.systemicIssueDescription ? '#D97706' : '#6B7280'}
        />
        <InsightCard
          label="Critical Path — Top Priority"
          icon="→"
          content={synthesis.criticalPath?.[0] || 'No critical path items identified.'}
          accentColor="#DC2626"
        />
      </div>

      {/* ─── SECTION 3: PATTERN ANALYSIS ───────────────────────────────────── */}
      {synthesis.patterns && synthesis.patterns.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pattern Analysis
          </h2>
          <div className="space-y-3">
            {synthesis.patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: '#E2E8F0' }}
              >
                <button
                  onClick={() => togglePattern(pattern.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: '#0F1B2D' }}>
                    {pattern.description}
                  </span>
                  <span className="text-gray-400 text-lg">{expandedPatterns[pattern.id] ? '▲' : '▼'}</span>
                </button>
                {expandedPatterns[pattern.id] && (
                  <div className="px-5 pb-4 border-t" style={{ borderColor: '#E2E8F0' }}>
                    <div className="mt-3 space-y-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Root Cause
                        </span>
                        <p className="text-sm mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#334155' }}>
                          {pattern.rootCause}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Affected Articles
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(pattern.affectedArticles || []).map((art) => (
                            <span
                              key={art}
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#EFF6FF', color: '#1B4B82', fontFamily: 'Inter, sans-serif' }}
                            >
                              {art}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 4: GAP REGISTER TABLE ─────────────────────────────────── */}
      <section data-testid="gap-register">
        <h2 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Gap Register
        </h2>
        {gapRows.length === 0 ? (
          <div
            className="rounded-lg border p-6 text-center text-sm text-gray-500"
            style={{ fontFamily: 'Inter, sans-serif', borderColor: '#E2E8F0' }}
          >
            No compliance gaps identified — all obligations assessed as compliant.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
            <table className="w-full text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ backgroundColor: '#0F1B2D', color: '#FFFFFF' }}>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider w-16">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider w-24">Article</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider">Gap Description</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-20">Severity</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-16">Effort</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-20">Legal Review?</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-20">Citation Verified?</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-24">Manual Verification?</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-20">Consistent?</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider w-32">Target Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wider w-28">Owner</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wider w-28">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {gapRows.map((row, idx) => (
                  <tr
                    key={row.obligationId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={handleDrop}
                    className="border-t cursor-grab active:cursor-grabbing hover:bg-blue-50/30 transition-colors"
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-300">⠿</span>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: '#1B4B82' }}>
                      {row.articleRef}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs leading-relaxed">
                      {row.gapDescription}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <SeverityBadge severity={row.severity} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
                      >
                        {EFFORT_LABELS[row.effort] || row.effort}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.requiresLegalReview ? (
                        <span className="text-amber-600 font-semibold text-xs">⚠ Yes</span>
                      ) : (
                        <span className="text-green-600 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.citationVerified === true ? (
                        <span className="text-green-600 text-xs font-medium">✓</span>
                      ) : row.citationVerified === false ? (
                        <span className="text-red-600 font-semibold text-xs">⚠</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.requiresManualVerification === true ? (
                        <span className="text-orange-500 font-semibold text-xs">⚠</span>
                      ) : row.requiresManualVerification === false ? (
                        <span className="text-green-600 text-xs font-medium">✓</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {(() => {
                        const consistency = gapRowConsistency(row, assessmentState.obligations || []);
                        return <span className={consistency.className}>{consistency.label}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="date"
                        value={row.targetDate}
                        onChange={(e) => updateGapField(idx, 'targetDate', e.target.value)}
                        className="w-full text-xs border rounded px-1.5 py-1 text-gray-700 focus:ring-1 focus:ring-blue-300 focus:outline-none"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={row.owner}
                        onChange={(e) => updateGapField(idx, 'owner', e.target.value)}
                        placeholder="Assign…"
                        className="w-full text-xs border rounded px-1.5 py-1 text-gray-700 placeholder-gray-300 focus:ring-1 focus:ring-blue-300 focus:outline-none"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {(() => {
                        const score = gapRowCompleteness(row, assessmentState.obligations || []);
                        return score !== null
                          ? <EvidenceCompletenessBar score={score} size="sm" showLabel={false} />
                          : <span className="text-gray-400 text-xs">—</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── SECTION 5: REMEDIATION PHASES ─────────────────────────────────── */}
      <section>
        <h2 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Remediation Roadmap
        </h2>
        <div className="space-y-4">
          {phases.map((phase) => (
            <PhaseCard key={phase.severity} phase={phase} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function InsightCard({ label, icon, content, accentColor }) {
  return (
    <div
      className="rounded-lg border p-5 bg-white"
      style={{ borderColor: '#E2E8F0', borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accentColor, fontSize: '1rem' }}>{icon}</span>
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ fontFamily: 'Inter, sans-serif', color: '#64748B' }}
        >
          {label}
        </span>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
        {content}
      </p>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    CRITICAL: { bg: '#7F1D1D', color: '#FFFFFF' },
    HIGH:     { bg: '#FEE2E2', color: '#991B1B' },
    MEDIUM:   { bg: '#FEF3C7', color: '#92400E' },
    LOW:      { bg: '#DCFCE7', color: '#166534' },
  };
  const s = styles[severity] || styles.LOW;
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded"
      style={{ backgroundColor: s.bg, color: s.color, fontFamily: 'Inter, sans-serif' }}
    >
      {severity}
    </span>
  );
}

function PhaseCard({ phase }) {
  const PHASE_COLORS = {
    CRITICAL: { border: '#7F1D1D', bg: '#FEF2F2', badge: '#991B1B' },
    HIGH:     { border: '#DC2626', bg: '#FEF2F2', badge: '#DC2626' },
    MEDIUM:   { border: '#D97706', bg: '#FFFBEB', badge: '#92400E' },
    LOW:      { border: '#16A34A', bg: '#F0FDF4', badge: '#166534' },
  };
  const colors = PHASE_COLORS[phase.severity] || PHASE_COLORS.LOW;

  return (
    <div
      className="rounded-lg border-l-4 p-4"
      style={{ borderLeftColor: colors.border, backgroundColor: colors.bg }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0F1B2D', fontSize: '1rem', fontWeight: 600 }}>
          {phase.label}
        </h3>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{ backgroundColor: colors.border, color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}
        >
          {phase.items.length} {phase.items.length === 1 ? 'gap' : 'gaps'}
        </span>
      </div>
      {phase.items.length === 0 ? (
        <p className="text-xs text-gray-400 italic" style={{ fontFamily: 'Inter, sans-serif' }}>
          No gaps in this phase.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {phase.items.map((item) => (
            <li key={item.obligationId} className="flex items-start gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className="font-semibold shrink-0" style={{ color: colors.badge }}>{item.articleRef}</span>
              <span className="text-gray-700">{item.gapDescription}</span>
              <span className="shrink-0 text-gray-400 ml-auto">
                Effort: {EFFORT_LABELS[item.effort] || item.effort}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
