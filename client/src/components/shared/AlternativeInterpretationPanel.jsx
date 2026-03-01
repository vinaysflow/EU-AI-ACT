import { useState } from 'react';
import LegalCertaintyBadge from './LegalCertaintyBadge';

export default function AlternativeInterpretationPanel({
  alternativeInterpretations,
  legalCertainty,
  articleRef,
}) {
  const [open, setOpen] = useState(false);
  const hasAlternative = Boolean(alternativeInterpretations && alternativeInterpretations.trim());
  const isRelevant = legalCertainty === 'CONTESTED' || legalCertainty === 'UNRESOLVED';

  if (!hasAlternative || !isRelevant) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-amber-900"
      >
        <span>⚠ Alternative interpretation exists — {articleRef}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-amber-900">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              What the interpretation dispute is:
            </div>
            <p className="mt-1 whitespace-pre-wrap">
              {alternativeInterpretations}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              What this means for this assessment:
            </div>
            <p className="mt-1">
              This finding has been assessed under the interpretation most supported by
              the primary text (TIER_1). The alternative interpretation may lead to a different
              conclusion. A qualified legal professional should review this finding before
              it is relied upon for compliance purposes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LegalCertaintyBadge certainty={legalCertainty} />
          </div>
          <div className="pt-2 text-xs text-amber-800">
            Source: Regulation (EU) 2024/1689. This tool does not determine the
            correct interpretation of contested provisions.
          </div>
        </div>
      )}
    </div>
  );
}
