import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { retrieveChunks } from '../knowledge/corpusAgent.js';
import { verifyCitation, applyVerificationResult } from '../utils/citationVerifier.js';
import { validateEvaluationResponse } from '../utils/schemaValidator.js';
import { runConsistencyCheck } from './consistency.js';
import { shouldRunConsistencyCheck } from '../utils/consistencyUtils.js';
import { runInterpretationAgent } from '../agents/interpretationAgent.js';
import { runPlainLanguageAgent } from '../agents/plainLanguageAgent.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildEvaluationPrompt(obligationTitle, evidence, tier1, bridgeContext) {
  const bridgeSection = bridgeContext.length > 0
    ? `\n\nSUPPORTING CONTEXT (Tier 2-4):\n${bridgeContext.map(c => `[${c.id}] ${c.chunk_text}`).join('\n\n')}`
    : '';

  return `You are a legal compliance evaluator assessing deployer obligations under the EU AI Act (Regulation 2024/1689).

PRIMARY LEGAL TEXT (Tier 1 — authoritative source):
[${tier1.id}] ${tier1.chunk_text}${bridgeSection}

OBLIGATION: ${obligationTitle}

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

function assessEvidenceQuality(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { lowQuality: true, reason: 'empty' };
  }

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length < 12) {
    return { lowQuality: true, reason: 'too_short' };
  }

  const unique = new Set(words);
  if (unique.size < 6) {
    return { lowQuality: true, reason: 'low_variance' };
  }

  const freq = {};
  let max = 0;
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
    if (freq[w] > max) max = freq[w];
  }
  if (max / words.length > 0.5) {
    return { lowQuality: true, reason: 'repetitive' };
  }

  return { lowQuality: false, reason: null };
}

function buildInsufficientEvidenceResult(tier1, reason) {
  const quoteSource = tier1?.chunk_text || '';
  const quotedText = quoteSource.slice(0, 220);
  return {
    verdict: 'INSUFFICIENT_EVIDENCE',
    reasoning: `Evidence provided is too low-quality to assess compliance (${reason}).`,
    requirementsSummary: 'The obligation requirements cannot be assessed due to insufficient evidence.',
    verdictRationale: 'Evidence does not provide enough detail to determine compliance.',
    gapDescription: 'Insufficient evidence provided to assess this obligation.',
    remediationGuidance: 'Provide specific controls, responsibilities, and documentary references that address the obligation.',
    sourceCitation: {
      quotedText: quotedText.length >= 40 ? quotedText : quoteSource,
      chunkId: tier1?.id || '',
      articleRef: tier1?.article_ref || '',
      sourceDocument: 'EU AI Act (Regulation 2024/1689)',
      authorityTier: 'TIER_1',
    },
    legalCertainty: 'CLEAR_TEXT',
    riskSeverity: 'MEDIUM',
    requiresLegalAdvice: false,
    flags: ['LOW_QUALITY_EVIDENCE'],
  };
}

async function callClaudeAndParse(prompt, retryCount = 0) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0].text;
  const cleanText = stripMarkdownFences(rawText);
  return JSON.parse(cleanText);
}

router.post('/', async (req, res) => {
  try {
    const { obligationId, obligationTitle, evidence, systemContext, runInterpretation } = req.body;

    if (!obligationId) {
      return res.status(400).json({ error: 'obligationId is required' });
    }
    if (!evidence || !evidence.controlDescription) {
      return res.status(400).json({ error: 'evidence.controlDescription is required' });
    }

    const retrieved = await retrieveChunks(obligationId, systemContext);

    if (!retrieved.tier1) {
      return res.status(404).json({ error: `Corpus chunk not found for obligationId: ${obligationId}` });
    }

    let responseJson;
    const evidenceQuality = assessEvidenceQuality(evidence.controlDescription);
    if (evidenceQuality.lowQuality) {
      responseJson = buildInsufficientEvidenceResult(retrieved.tier1, evidenceQuality.reason);
    } else {
      const prompt = buildEvaluationPrompt(
        obligationTitle || obligationId,
        evidence,
        retrieved.tier1,
        retrieved.bridgeContext
      );
      try {
        responseJson = await callClaudeAndParse(prompt);
      } catch (parseErr) {
        try {
          responseJson = await callClaudeAndParse(prompt + '\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown fences, no extra text.');
        } catch (retryErr) {
          return res.status(422).json({
            error: 'Failed to parse Claude response as JSON after 2 attempts',
            details: retryErr.message,
          });
        }
      }
    }

    const validation = validateEvaluationResponse(responseJson);
    if (!validation.valid) {
      if (validation.bannedPhrases && validation.bannedPhrases.length > 0) {
        try {
          const retryPrompt = prompt + `\n\nCRITICAL: Your previous response contained banned phrases: ${validation.bannedPhrases.join(', ')}. Do NOT use these phrases. Rephrase your assessment.`;
          responseJson = await callClaudeAndParse(retryPrompt);
          const revalidation = validateEvaluationResponse(responseJson);
          if (!revalidation.valid) {
            return res.status(422).json({ error: 'Validation failed after retry', validation: revalidation });
          }
        } catch (retryErr) {
          return res.status(422).json({ error: 'Retry failed', validation, details: retryErr.message });
        }
      } else if (validation.missingFields && validation.missingFields.length > 0) {
        return res.status(422).json({ error: 'Response missing required fields', validation });
      }
    }

    const citationResult = verifyCitation(
      responseJson.sourceCitation?.quotedText,
      responseJson.sourceCitation?.chunkId,
      retrieved.chunkTextById
    );

    applyVerificationResult(responseJson, citationResult);

    let consistencyResult = null;
    if (shouldRunConsistencyCheck(responseJson)) {
      consistencyResult = await runConsistencyCheck(
        obligationId,
        evidence,
        responseJson,
        retrieved,
      );
      if (
        ['MODEL_INCONSISTENT', 'SEVERITY_INCONSISTENT', 'MODEL_AND_SEVERITY_INCONSISTENT']
          .includes(consistencyResult?.consistencyFlag)
      ) {
        if (!Array.isArray(responseJson.flags)) responseJson.flags = [];
        if (!responseJson.flags.includes(consistencyResult.consistencyFlag)) {
          responseJson.flags.push(consistencyResult.consistencyFlag);
        }
      }
    }

    let interpretation = null;
    if (
      runInterpretation &&
      (
        (responseJson.verdict === 'NON_COMPLIANT' && ['CRITICAL', 'HIGH'].includes(responseJson.riskSeverity)) ||
        ['CONTESTED', 'UNRESOLVED'].includes(responseJson.legalCertainty)
      )
    ) {
      interpretation = await runInterpretationAgent(obligationId, responseJson, retrieved);
    }

    let plainLanguage = null;
    if (
      responseJson.verdict === 'NON_COMPLIANT' &&
      ['CRITICAL', 'HIGH'].includes(responseJson.riskSeverity)
    ) {
      plainLanguage = await runPlainLanguageAgent(
        obligationId,
        obligationTitle || obligationId,
        responseJson,
        systemContext?.name || null,
      );
    }

    res.json({
      evaluation: responseJson,
      consistencyResult,
      interpretation,
      plainLanguage,
      sourceChunks: {
        tier1: retrieved.tier1,
        relatedTier1: retrieved.relatedTier1,
        bridgeContext: retrieved.bridgeContext,
      },
      citationVerified: citationResult.verified,
      requiresManualVerification: responseJson.requiresManualVerification || false,
      corpusVersion: retrieved.retrievalMetadata.corpusVersion,
      retrievedAt: retrieved.retrievalMetadata.retrievedAt,
    });
  } catch (err) {
    console.error('[evaluate] Error:', err.message);
    res.locals.error = err.message;

    if (err.status === 429 || err.message?.includes('rate')) {
      return res.status(503).json({ error: 'Claude API rate limit or service issue', details: err.message });
    }
    res.status(503).json({ error: 'Evaluation failed', details: err.message });
  }
});

export default router;
