import { useState } from 'react';

export default function PlainLanguageToggle({ plainLanguageResult, children }) {
  const [mode, setMode] = useState('legal');

  if (!plainLanguageResult) {
    return <>{children}</>;
  }

  const isPlain = mode === 'plain';

  return (
    <div className="mt-4">
      <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('plain')}
          className={`px-3 py-1 rounded-full transition-colors ${isPlain ? 'bg-[#1B4B82] text-white' : 'text-gray-700'}`}
        >
          Plain English
        </button>
        <button
          type="button"
          onClick={() => setMode('legal')}
          className={`px-3 py-1 rounded-full transition-colors ${!isPlain ? 'bg-[#1B4B82] text-white' : 'text-gray-700'}`}
        >
          Legal Detail
        </button>
      </div>

      <div className="mt-4 transition-opacity duration-200 ease-in-out">
        {isPlain ? (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[#0F1B2D]">
              {plainLanguageResult.headline}
            </h3>
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
              {plainLanguageResult.businessConsequence}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Plain gap
              </div>
              <p className="text-sm text-gray-800 mt-1">
                {plainLanguageResult.plainGap}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Plain remediation
              </div>
              <p className="text-sm text-gray-800 mt-1">
                {plainLanguageResult.plainRemediation}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-2 py-1">
              Effort: {plainLanguageResult.effortSignal}
            </div>
          </div>
        ) : (
          <div className="opacity-100">{children}</div>
        )}
      </div>
    </div>
  );
}
