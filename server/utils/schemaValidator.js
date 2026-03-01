const BANNED_PHRASES = [
  'is compliant',
  'fully complies',
  'is in compliance',
  'we can confirm compliance',
  'meets all requirements',
  'no issues found',
  'no concerns',
  '```json',
  '```',
];

const REQUIRED_FIELDS = [
  'verdict',
  'reasoning',
  'sourceCitation',
  'legalCertainty',
  'riskSeverity',
];

export function validateEvaluationResponse(responseJson) {
  const missingFields = [];
  const bannedPhrases = [];

  for (const field of REQUIRED_FIELDS) {
    if (responseJson[field] === undefined || responseJson[field] === null) {
      missingFields.push(field);
    }
  }

  if (responseJson.sourceCitation) {
    if (!responseJson.sourceCitation.quotedText) missingFields.push('sourceCitation.quotedText');
    if (!responseJson.sourceCitation.chunkId) missingFields.push('sourceCitation.chunkId');
  }

  const allText = JSON.stringify(responseJson).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (allText.includes(phrase.toLowerCase())) {
      bannedPhrases.push(phrase);
    }
  }

  if (responseJson.legalCertainty === 'CONTESTED' || responseJson.legalCertainty === 'UNRESOLVED') {
    responseJson.requiresLegalAdvice = true;
    if (!responseJson.flags) responseJson.flags = [];
    if (!responseJson.flags.includes('LEGAL_CERTAINTY_REQUIRES_REVIEW')) {
      responseJson.flags.push('LEGAL_CERTAINTY_REQUIRES_REVIEW');
    }
  }

  const valid = missingFields.length === 0 && bannedPhrases.length === 0;
  const result = { valid };
  if (missingFields.length > 0) result.missingFields = missingFields;
  if (bannedPhrases.length > 0) result.bannedPhrases = bannedPhrases;
  return result;
}
