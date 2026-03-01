const MIN_QUOTE_LENGTH = 40;

function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

export function verifyCitation(quotedText, chunkId, chunkTextById) {
  if (!quotedText || quotedText.length < MIN_QUOTE_LENGTH) {
    return { verified: false, reason: 'QUOTE_TOO_SHORT', message: `Quoted text must be at least ${MIN_QUOTE_LENGTH} characters (got ${quotedText?.length || 0})` };
  }

  if (!chunkId || !chunkTextById[chunkId]) {
    return { verified: false, reason: 'CHUNK_NOT_FOUND', message: `Chunk "${chunkId}" not found in retrieved chunks` };
  }

  const normalizedQuote = normalizeWhitespace(quotedText);
  const normalizedChunk = normalizeWhitespace(chunkTextById[chunkId]);

  if (normalizedChunk.includes(normalizedQuote)) {
    return { verified: true };
  }

  return { verified: false, reason: 'QUOTE_NOT_IN_CHUNK', message: `Quoted text not found verbatim in chunk "${chunkId}"` };
}

export function applyVerificationResult(evaluationResult, verificationResult) {
  if (!verificationResult.verified) {
    evaluationResult.verdict = 'CITATION_FAILED';
    evaluationResult.requiresManualVerification = true;
    if (!evaluationResult.flags) evaluationResult.flags = [];
    evaluationResult.flags.push(verificationResult.reason);
  }
  return evaluationResult;
}
