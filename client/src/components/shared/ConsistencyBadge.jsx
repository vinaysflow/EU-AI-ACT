import { useState } from 'react';

function formatLabel(flag) {
  return String(flag || '').replace(/_/g, ' ');
}

function passSummary(pass) {
  if (!pass) return 'Not available';
  return `Verdict: ${pass.verdict || 'N/A'} | Severity: ${pass.riskSeverity || 'N/A'}`;
}

export default function ConsistencyBadge({ result }) {
  const [open, setOpen] = useState(false);
  const flag = result?.consistencyFlag;

  if (!result || flag === 'CONSISTENT' || flag === 'SKIPPED_CITATION_FAILED') {
    return null;
  }

  const both = flag === 'MODEL_AND_SEVERITY_INCONSISTENT';
  const badgeClass = both
    ? 'bg-red-100 text-red-800 border-red-300'
    : 'bg-amber-100 text-amber-800 border-amber-300';

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-semibold rounded border ${badgeClass}`}
      >
        Consistency: {formatLabel(flag)}
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 p-3 rounded border border-gray-200 bg-white text-xs text-gray-700 max-w-xl">
          <p className="mb-1"><strong>Pass 1:</strong> {passSummary(result.firstPass)}</p>
          <p className="mb-1"><strong>Pass 2:</strong> {passSummary(result.secondPass)}</p>
          {result.divergences?.verdict && (
            <p className="mb-1"><strong>Verdict divergence:</strong> {result.divergences.verdict}</p>
          )}
          {result.divergences?.severity && (
            <p className="mb-1"><strong>Severity divergence:</strong> {result.divergences.severity}</p>
          )}
          {result.note && <p className="mb-1"><strong>Note:</strong> {result.note}</p>}
          {result.recommendation && (
            <p><strong>Recommendation:</strong> {result.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
}
