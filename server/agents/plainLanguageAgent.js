import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a compliance communications specialist. Your audience is
General Counsel and Board directors who are NOT subject-matter experts on the
EU AI Act. Translate the legal evaluation finding below into plain English.
RULES:
- Never say "is compliant", "fully complies", or similar absolutes.
- Avoid legal jargon unless quoting the Act directly.
- Focus on: (1) what the obligation means in business terms, (2) what the gap
  implies for the organisation, (3) what the recommended next step is.
- Keep it concise (3-5 sentences max per field).
OUTPUT FORMAT: JSON only. Shape:
{
  "obligationExplainer": "string",
  "gapImplication": "string",
  "recommendedAction": "string"
}`;

function stripMarkdownFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function buildUserMessage(obligationId, obligationTitle, evaluationResult, systemName) {
  return `OBLIGATION: ${obligationTitle} (${obligationId})
SYSTEM: ${systemName || 'Unnamed system'}

EVALUATION:
- Verdict: ${evaluationResult.verdict}
- Risk Severity: ${evaluationResult.riskSeverity}
- Legal Certainty: ${evaluationResult.legalCertainty || 'Not specified'}
- Gap: ${evaluationResult.gapDescription || 'None identified'}
- Remediation: ${evaluationResult.remediationGuidance || 'None provided'}

Translate this finding into plain English for a GC/Board audience. Respond with JSON only.`;
}

export async function runPlainLanguageAgent(obligationId, obligationTitle, evaluationResult, systemName) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(obligationId, obligationTitle, evaluationResult, systemName) }],
    });

    const rawText = message.content?.[0]?.text || '';
    const cleaned = stripMarkdownFences(rawText);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[plainLanguageAgent] Failed (non-blocking):', err.message);
    return null;
  }
}
