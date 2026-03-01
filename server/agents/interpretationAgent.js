import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior EU AI Act regulatory counsel providing legal context for a
compliance finding. A preliminary evaluation has identified a potential gap.
YOUR JOB: Provide regulatory context that helps a compliance consultant
understand: (1) what enforcement guidance or regulatory context surrounds
this obligation, (2) whether there are recognised safe harbours or compliance
pathways, (3) what the enforcement risk profile looks like, (4) if CONTESTED:
what the diverging interpretations are and which interpretation has stronger
textual support.
GROUND ALL CLAIMS in the source chunks provided. No external knowledge.
OUTPUT FORMAT: JSON only. Shape:
{
  "regulatoryContext": "string",
  "safePaths": ["string"] | null,
  "enforcementRisk": "string",
  "alternativeInterpretations": "string" | null,
  "sourceGrounding": "string"
}`;

function stripMarkdownFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function buildUserMessage(obligationId, evaluationResult, retrievedChunks) {
  const tier1 = retrievedChunks.tier1;
  const bridge = retrievedChunks.bridgeContext || [];

  const tier1Section = tier1
    ? `PRIMARY LEGAL TEXT (Tier 1):\n[${tier1.id}] ${tier1.chunk_text}`
    : 'No Tier 1 chunk available.';

  const bridgeSection = bridge.length > 0
    ? `\n\nSUPPORTING CONTEXT (Tier 2-4):\n${bridge.map(c => `[${c.id}] ${c.chunk_text}`).join('\n\n')}`
    : '';

  return `OBLIGATION: ${obligationId}

${tier1Section}${bridgeSection}

EVALUATION RESULT:
${JSON.stringify(evaluationResult, null, 2)}

Provide regulatory context for this finding. Respond with JSON only.`;
}

export async function runInterpretationAgent(obligationId, evaluationResult, retrievedChunks) {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(obligationId, evaluationResult, retrievedChunks) }],
    });

    const rawText = message.content?.[0]?.text || '';
    const cleaned = stripMarkdownFences(rawText);
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[interpretationAgent] Failed (non-blocking):', err.message);
    return null;
  }
}
