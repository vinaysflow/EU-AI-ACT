export default function ManualVerificationBadge({ requiresManualVerification }) {
  if (!requiresManualVerification) return null;

  return (
    <span className="relative inline-flex items-center">
      <span className="group inline-flex items-center rounded-full bg-[#D97706] px-2 py-1 text-[12px] font-semibold text-white">
        ⚠ Manual verification required
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg leading-relaxed group-hover:block">
          The tool could not automatically verify this citation. A consultant must
          manually check the source document before this finding can be relied upon.
          This is a tool limitation, not a legal advice question.
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      </span>
    </span>
  );
}
