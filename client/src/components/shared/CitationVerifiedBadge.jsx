export default function CitationVerifiedBadge({ verified, requiresManualVerification }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700">
        &#x2713; Source verified
      </span>
    );
  }

  if (requiresManualVerification) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-orange-50 text-orange-700">
        &#x26A0; Manual verification required
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-500">
      Citation status unknown
    </span>
  );
}
