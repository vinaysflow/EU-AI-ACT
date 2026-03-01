export default function EvidenceCompletenessBar({ score, size = 'md', showLabel = true }) {
  const s = Math.round(score ?? 0);
  const color = s >= 70 ? '#16A34A' : s >= 40 ? '#D97706' : '#DC2626';
  const bgColor = s >= 70 ? '#DCFCE7' : s >= 40 ? '#FEF3C7' : '#FEE2E2';

  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' };
  const barH = heights[size] || heights.md;
  const showNum = size === 'md' || size === 'lg';

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className={`flex-1 rounded-full overflow-hidden ${barH}`}
        style={{ backgroundColor: bgColor }}
      >
        <div
          className={`${barH} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(s, 100)}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && showNum && (
        <span
          className="text-xs font-semibold tabular-nums whitespace-nowrap"
          style={{ color, minWidth: '2.5rem', textAlign: 'right' }}
        >
          {s}%
        </span>
      )}
    </div>
  );
}
