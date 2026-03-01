import { useState } from 'react';

const TIER_COLORS = {
  TIER_1: '#1B4B82',
  TIER_2: '#475569',
  TIER_3: '#94A3B8',
};

const TIER_LABELS = {
  TIER_1: 'Primary Law',
  TIER_2: 'Delegated / Implementing',
  TIER_3: 'Guidance',
};

function VerificationLabel({ verified, requiresManualVerification }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
        &#x2713; Source verified
      </span>
    );
  }
  if (requiresManualVerification) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
        &#x26A0; Manual verification required &mdash; human review of source document needed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
      Citation unverified
    </span>
  );
}

export default function CitationBlock({
  quotedText,
  articleRef,
  sourceDocument,
  authorityTier,
  verified,
  requiresManualVerification,
}) {
  if (!quotedText) return null;

  const borderColor = TIER_COLORS[authorityTier] || TIER_COLORS.TIER_1;
  const tierLabel = TIER_LABELS[authorityTier] || authorityTier;

  return (
    <div
      className="relative mb-4 pl-4 py-3 pr-3 bg-gray-50 rounded-r-lg"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      {authorityTier && (
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: borderColor }}
        >
          {tierLabel}
        </span>
      )}

      <p className="text-sm text-gray-800 italic leading-relaxed pr-24">
        &ldquo;{quotedText}&rdquo;
      </p>

      <p className="mt-2 text-[11px] text-gray-500" style={{ fontVariant: 'small-caps' }}>
        Reg. (EU) 2024/1689, {articleRef || sourceDocument || 'source'}, OJ L 12.7.2024
      </p>

      <div className="mt-2">
        <VerificationLabel
          verified={verified}
          requiresManualVerification={requiresManualVerification}
        />
      </div>
    </div>
  );
}
