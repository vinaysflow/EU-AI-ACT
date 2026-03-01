import { useState } from 'react';

const CONFIG = {
  HIGH: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  LOW: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const TOOLTIP_TEXT =
  'How well the described evidence addresses the stated requirement';

export default function ConfidenceBadge({ confidence }) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!confidence) return null;

  const c = CONFIG[confidence] || CONFIG.MEDIUM;

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded cursor-default ${c.bg} ${c.text}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      Evidence Fit: {confidence}
      {showTooltip && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg leading-relaxed pointer-events-none">
          {TOOLTIP_TEXT}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}
