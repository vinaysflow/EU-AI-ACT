import { useState } from 'react';

const CONFIG = {
  CLEAR_TEXT: {
    label: '\u2713 Clear Text',
    bg: 'bg-green-100',
    text: 'text-green-800',
    tooltip: 'The legal text is unambiguous. Findings based on this provision can be relied upon with high confidence.',
  },
  ESTABLISHED_INTERPRETATION: {
    label: 'Established',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    tooltip: 'Regulatory guidance or settled practice supports this interpretation, though the text itself leaves some room for debate.',
  },
  CONTESTED: {
    label: '\u26A0 Contested',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    tooltip: 'Legal scholars and regulators disagree on the scope of this provision. Findings should be reviewed by qualified legal counsel before reliance.',
  },
  UNRESOLVED: {
    label: '\u26A0 Unresolved',
    bg: 'bg-red-100',
    text: 'text-red-800',
    tooltip: 'No authoritative interpretation exists yet. Findings are preliminary and must not be relied upon without independent legal advice.',
  },
};

export default function LegalCertaintyBadge({ certainty }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const c = CONFIG[certainty] || CONFIG.CLEAR_TEXT;

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full cursor-default ${c.bg} ${c.text}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {c.label}
      {showTooltip && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg leading-relaxed pointer-events-none">
          {c.tooltip}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}
