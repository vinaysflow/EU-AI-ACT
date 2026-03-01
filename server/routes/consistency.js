import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { verifyCitation } from '../utils/citationVerifier.js';
import { validateEvaluationResponse } from '../utils/schemaValidator.js';
import {
  shouldRunConsistencyCheck,
  analyseVerdictDivergence,
  analyseSeverityDivergence,
  computeConsistencyOutcome,
} from '../utils/consistencyUtils.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export {
  shouldRunConsistencyCheck,
  analyseVerdictDivergence,
  analyseSeverityDivergence,
  computeConsistencyOutcome,
};

/* ─── Second-pass prompt builder ─────────────────────────────────────────── */

function buildSecondPassPrompt(obligationId, evidence, tier1, bridgeContext) {
  const obligationOutwardInstruction =
    'OBLIGATION-OUTWARD INSTRUCTION: Begin from what the legal text requires and then test the evidence against those requirements. Do not begin from the evidence description.';
  const bridgeSection = bridgeContext.length > 0
    ? `\n\nSUPPORTING CONTEXT (Tier 2-4):\n${bridgeContext.map(c => `[${c.id}] ${c.chunk_text}`).join('\n\n')}`
    : '';

  return `You are evaluating whether a legal obligation's requirements are satisfied by the described controls.

PRIMARY LEGAL TEXT (Tier 1 — authoritative source):
[${tier1.id}] ${tier1.chunk_text}${bridgeSection}

OBLIGATION: ${obligationId}

EVIDENCE PROVIDED BY DEPLOYER:
- Control Description: ${evidence.controlDescription}
- Evidence Reference: ${evidence.evidenceReference || 'Not provided'}
- Evidence Type: ${evidence.evidenceType || 'Not specified'}
- Confidence: ${evidence.confidenceQualifier || 'Not specified'}

Evaluate the evidence against the legal text. You MUST respond with valid JSON only (no markdown fences). Use this exact structure:

{
  "verdict": "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "INSUFFICIENT_EVIDENCE",
  "reasoning": "Detailed legal reasoning...",
  "requirementsSummary": "What the article requires...",
  "verdictRationale": "Why this verdict was reached...",
  "gapDescription": "Description of gaps found (null if compliant)...",
  "remediationGuidance": "Specific steps to remediate (null if compliant)...",
  "sourceCitation": {
    "quotedText": "Exact verbatim quote from the legal text (minimum 40 characters)...",
    "chunkId": "${tier1.id}",
    "articleRef": "${tier1.article_ref || ''}",
    "sourceDocument": "EU AI Act (Regulation 2024/1689)",
    "authorityTier": "TIER_1"
  },
  "legalCertainty": "CLEAR_TEXT" | "ESTABLISHED_INTERPRETATION" | "CONTESTED" | "UNRESOLVED",
  "riskSeverity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "requiresLegalAdvice": false,
  "flags": []
}

${obligationOutwardInstruction}

CRITICAL RULES:
- The quotedText MUST be copied VERBATIM from the PRIMARY LEGAL TEXT above — minimum 40 characters
- The chunkId MUST be "${tier1.id}"
- Never say "is compliant", "fully complies", or similar absolute statements
- If evidence is vague or unverifiable, verdict must be INSUFFICIENT_EVIDENCE
- Be specific about gaps and remediation`;
}

function stripMarkdownFences(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

/* ─── Main exported function ─────────────────────────────────────────────── */

export async function runConsistencyCheck(obligationId, evidence, firstPassResult, retrievedChunks) {
  const tier1 = retrievedChunks.tier1;
  const bridgeContext = retrievedChunks.bridgeContext || [];

  const firstPass = {
    verdict: firstPassResult.verdict,
    confidence: firstPassResult.confidence ?? null,
    legalCertainty: firstPassResult.legalCertainty,
    riskSeverity: firstPassResult.riskSeverity,
  };

  if (firstPass.verdict === 'CITATION_FAILED') {
    return {
      firstPass,
      secondPass: null,
      consistent: false,
      consistencyFlag: 'SKIPPED_CITATION_FAILED',
      divergences: {
        verdict: null,
        severity: null,
      },
      note: 'Consistency check skipped because the first pass had a citation failure.',
      recommendation: null,
    };
  }

  try {
    const prompt = buildSecondPassPrompt(obligationId, evidence, tier1, bridgeContext);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content[0].text;
    const cleanText = stripMarkdownFences(rawText);
    const secondPassResult = JSON.parse(cleanText);

    const validation = validateEvaluationResponse(secondPassResult);
    if (!validation.valid) {
      throw new Error(`Second-pass schema validation failed: ${JSON.stringify(validation)}`);
    }

    let citationVerified = false;
    if (secondPassResult.sourceCitation?.quotedText && secondPassResult.sourceCitation?.chunkId) {
      const cvResult = verifyCitation(
        secondPassResult.sourceCitation.quotedText,
        secondPassResult.sourceCitation.chunkId,
        retrievedChunks.chunkTextById,
      );
      citationVerified = cvResult.verified;
      if (!cvResult.verified) {
        secondPassResult.verdict = 'CITATION_FAILED';
      }
    }

    const secondPass = {
      verdict: secondPassResult.verdict,
      confidence: secondPassResult.confidence ?? null,
      legalCertainty: secondPassResult.legalCertainty,
      riskSeverity: secondPassResult.riskSeverity,
      citationVerified,
    };

    return computeConsistencyOutcome(firstPass, secondPass);
  } catch (err) {
    console.error('[consistency] Second pass error:', err.message);
    return {
      firstPass,
      secondPass: null,
      consistent: false,
      consistencyFlag: 'SKIPPED_CITATION_FAILED',
      divergences: {
        verdict: null,
        severity: null,
      },
      note: `Consistency check failed: ${err.message}`,
      recommendation: 'Treat this finding as unverified. Consultant review required.',
    };
  }
}

/* ─── HTTP router (kept for backward compatibility) ──────────────────────── */

router.post('/', async (req, res) => {
  try {
    const { obligationId, evidence, firstPassResult, retrievedChunks } = req.body;
    if (!obligationId || !firstPassResult) {
      return res.status(400).json({ error: 'obligationId and firstPassResult are required' });
    }
    const result = await runConsistencyCheck(obligationId, evidence, firstPassResult, retrievedChunks);
    res.json(result);
  } catch (err) {
    res.locals.error = err.message;
    res.status(503).json({ error: err.message });
  }
});

export default router;
