import { useState } from 'react';

function interpolateTemplate(template, systemName, vendorName) {
  if (!template) return '';
  return template
    .replace(/\{SYSTEM_NAME\}/g, systemName || '[system]')
    .replace(/\{VENDOR\}/g, vendorName || '[vendor]');
}

export default function ArchetypePanel({ archetype, onAdopt, systemName, vendorName }) {
  const [showRemediation, setShowRemediation] = useState(false);

  if (!archetype) return null;

  const interpolatedTemplate = interpolateTemplate(
    archetype.remediationTemplate,
    systemName,
    vendorName
  );

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3">
        {'\uD83D\uDCA1'} Common Gap Pattern{archetype.title ? ` \u2014 ${archetype.title}` : ''}
      </h4>

      <div className="mb-3">
        <p className="text-xs font-medium text-amber-700 mb-1">Most common gap:</p>
        <p className="text-sm text-gray-800">{archetype.mostCommonGap}</p>
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-amber-700 mb-1">Typical evidence required:</p>
        <ul className="space-y-1.5">
          {archetype.typicalEvidence.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-0.5 accent-amber-600" readOnly />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {archetype.remediationTemplate && (
        <div className="mb-3">
          <button
            onClick={() => setShowRemediation(!showRemediation)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            <span>{showRemediation ? '\u25BC' : '\u25B6'}</span>
            Remediation template
          </button>
          {showRemediation && (
            <div className="mt-2 p-3 bg-white border border-amber-100 rounded text-sm text-gray-700 leading-relaxed">
              {interpolatedTemplate}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onAdopt}
        className="px-4 py-2 text-xs font-medium text-[#1B4B82] bg-white border border-[#1B4B82] rounded-lg hover:bg-blue-50 transition-colors"
      >
        Adopt this archetype
      </button>
    </div>
  );
}
