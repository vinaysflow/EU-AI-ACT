import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an EU AI Act compliance analyst producing a strategic gap synthesis
for General Counsel and Board stakeholders. You receive structured assessment
data covering system classification and per-obligation evaluation results.
YOUR JOB: Synthesise across ALL obligations to produce a prioritised gap
register, cross-cutting patterns, a risk posture determination, an executive
summary, and a critical remediation path.
RULES:
- gapRegister entries ONLY from NON_COMPLIANT, PARTIALLY_COMPLIANT,
  INSUFFICIENT_EVIDENCE, or CITATION_FAILED verdicts.
- Carry forward citationVerified and requiresManualVerification exactly as
  provided in the input data.
- Severity must be one of: CRITICAL, HIGH, MEDIUM, LOW.
- Effort: S (small), M (medium), L (large).
- overallRiskPosture derived from worst-case obligation verdicts.
- executiveSummaryOpening: 2-3 formal sentences for GC/Board.
- ONLY reference data present in the input. No external knowledge.
OUTPUT FORMAT: JSON only. Shape:
{
  "overallRiskPosture": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "riskPostureRationale": "string",
  "executiveSummaryOpening": "string",
  "keyInsight": "string",
  "systemicIssueDescription": "string" | null,
  "criticalPath": ["string"],
  "patterns": [
    {
      "id": "string",
      "description": "string",
      "rootCause": "string",
      "affectedArticles": ["string"]
    }
  ],
  "gapRegister": [
    {
      "obligationId": "string",
      "articleRef": "string",
      "gapDescription": "string",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "effort": "S" | "M" | "L",
      "requiresLegalReview": true | false,
      "citationVerified": true | false | null,
      "requiresManualVerification": true | false | null
    }
  ]
}`;

function stripMarkdownFences(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

const REQUIRED_FIELDS = ['overallRiskPosture', 'gapRegister', 'patterns', 'criticalPath'];

function buildContextPayload(assessmentState) {
  const { system, classification, obligations } = assessmentState;

  const systemContext = system
    ? { name: system.name, sector: system.primarySector, purpose: system.intendedPurpose, vendor: system.vendor }
    : null;

  const classificationContext = classification?.rulesEngineResult
    ? { finalClassification: classification.rulesEngineResult.finalClassification, flags: classification.rulesEngineResult.flags }
    : null;

  const obligationDetails = (obligations || []).map((o) => {
    const ev = o.evaluationResult || {};
    return {
      obligationId: o.obligationId || o.id,
      articleRef: ev.articleRef || o.articleRef || o.obligationId || o.id,
      verdict: ev.verdict || o.consultantVerdict || 'NOT_EVALUATED',
      riskSeverity: ev.riskSeverity || null,
      legalCertainty: ev.legalCertainty || null,
      gapDescription: ev.gapDescription || null,
      remediationGuidance: ev.remediationGuidance || null,
      requiresLegalAdvice: Boolean(ev.requiresLegalAdvice),
      citationVerified: o.citationVerified ?? ev.citationVerified ?? null,
      requiresManualVerification: o.requiresManualVerification ?? ev.requiresManualVerification ?? null,
      consistencyFlag: o.consistencyResult?.consistencyFlag || null,
      consultantOverride: o.consultantVerdict || null,
    };
  });

  return { systemContext, classificationContext, obligationDetails };
}

function buildUserMessage(assessmentState) {
  const payload = buildContextPayload(assessmentState);
  return `ASSESSMENT DATA:
${JSON.stringify(payload, null, 2)}

Produce the strategic gap synthesis. Respond with JSON only.`;
}

export async function runSynthesisAgent(assessmentState) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(assessmentState) }],
  });

  const rawText = message.content?.[0]?.text || '';
  const cleaned = stripMarkdownFences(rawText);

  let synthesis;
  try {
    synthesis = JSON.parse(cleaned);
  } catch (parseErr) {
    const error = new Error(`Synthesis JSON parse failed: ${parseErr.message}`);
    error.statusCode = 422;
    throw error;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !(f in synthesis));
  if (missing.length > 0) {
    const error = new Error(`Synthesis response missing required fields: ${missing.join(', ')}`);
    error.statusCode = 422;
    throw error;
  }

  return synthesis;
}
