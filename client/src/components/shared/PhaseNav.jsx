import { useRef, useState } from 'react';

function formatStepNumber(order) {
  return order === 0 ? '✱' : String(order);
}

export default function PhaseNav({ phases, currentPhase, unlockedPhases, onPhaseSelect }) {
  const [tooltip, setTooltip] = useState({ phaseId: null, text: '' });
  const timerRef = useRef(null);

  const handlePhaseClick = (phase, index) => {
    if (!unlockedPhases?.has(phase.id)) {
      const prev = phases[index - 1];
      const text = prev ? `Complete ${prev.label} to unlock` : 'Complete previous phase to unlock';
      setTooltip({ phaseId: phase.id, text });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setTooltip({ phaseId: null, text: '' });
      }, 2000);
      return;
    }
    onPhaseSelect(phase.id);
  };

  const current = phases.find((p) => p.id === currentPhase);
  const currentOrder = current?.order ?? 1;

  return (
    <nav data-testid="phase-nav" className="w-full px-6">
      <div className="flex items-center justify-between h-16">
        {phases.map((phase, idx) => {
          const isActive = phase.id === currentPhase;
          const isLocked = !unlockedPhases?.has(phase.id);
          const isCompleted = !isActive && phase.order < currentOrder && !isLocked;

          const circleClass = isCompleted
            ? 'bg-green-500 text-white'
            : isActive
              ? 'bg-[#1B4B82] text-white'
              : 'border border-gray-300 text-gray-400 bg-white';

          const connectorClass = isCompleted
            ? 'bg-[#1B4B82]'
            : 'bg-gray-300';

          return (
            <div key={phase.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative min-w-[120px]">
                <button
                  type="button"
                  data-testid={`phase-step-${phase.id}`}
                  onClick={() => handlePhaseClick(phase, idx)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${circleClass}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? '✓' : formatStepNumber(phase.order)}
                </button>
                <span className="mt-1 text-[11px] text-gray-700 text-center leading-tight">
                  {phase.label}
                </span>
                {tooltip.phaseId === phase.id && (
                  <div data-testid={`phase-tooltip-${phase.id}`} className="absolute top-full mt-1 px-2 py-1 rounded bg-gray-900 text-white text-[10px] whitespace-nowrap">
                    {tooltip.text}
                  </div>
                )}
              </div>
              {idx < phases.length - 1 && (
                <div className={`h-0.5 flex-1 ${connectorClass}`} />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
