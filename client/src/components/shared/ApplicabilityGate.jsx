import { useState } from 'react';

function ArticleBadge({ articleRef }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold shrink-0"
      style={{ backgroundColor: '#E2E8F0', color: '#334155', fontFamily: 'Inter, sans-serif' }}
    >
      {articleRef}
    </span>
  );
}

function CitedChip({ citation }) {
  if (!citation) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
      style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}
    >
      {citation}
    </span>
  );
}

export default function ApplicabilityGate({ notApplicableObligations }) {
  const [expanded, setExpanded] = useState(false);

  if (!notApplicableObligations || notApplicableObligations.length === 0) {
    return null;
  }

  const count = notApplicableObligations.length;

  return (
    <div
      className="mt-8 rounded-lg border overflow-hidden"
      style={{ borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex justify-between items-center text-left transition-colors hover:bg-slate-100"
      >
        <span
          className="text-sm font-medium"
          style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}
        >
          {count} obligation{count !== 1 ? 's' : ''} scoped out — not applicable to this system
        </span>
        <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          {notApplicableObligations.map((ob) => (
            <div
              key={ob.clauseId}
              className="flex items-start gap-3 py-2.5 border-t"
              style={{ borderColor: '#E2E8F0' }}
            >
              <ArticleBadge articleRef={ob.articleRef} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: '#334155', fontFamily: 'Inter, sans-serif' }}
                >
                  {ob.obligationTitle}
                </p>
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: '#64748B' }}
                >
                  {ob.reason}
                </p>
              </div>
              <CitedChip citation={ob.citedBasis} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
