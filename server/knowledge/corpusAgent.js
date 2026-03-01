import { supabase } from '../db/supabase.js';
import {
  EU_AI_ACT_ARTICLES,
  EU_AI_ACT_RECITALS,
  EU_AI_ACT_ANNEXES,
  CONTESTED_PROVISIONS,
} from '@eu-ai-act/knowledge';

function getAllCorpusChunks() {
  return [
    ...EU_AI_ACT_ARTICLES,
    ...EU_AI_ACT_RECITALS,
    ...EU_AI_ACT_ANNEXES,
    ...CONTESTED_PROVISIONS,
  ];
}

function normalizeInMemoryChunk(chunk) {
  return {
    ...chunk,
    chunk_text: chunk.text,
    article_ref: chunk.article,
  };
}

function buildChunkTextMap(chunks) {
  const map = {};
  for (const c of chunks) {
    if (c && c.id) {
      map[c.id] = c.chunk_text || c.text;
    }
  }
  return map;
}

export async function retrieveChunks(obligationId, systemContext = {}) {
  const retrievalMetadata = {
    corpusVersion: '2026-01',
    retrievedAt: new Date().toISOString(),
    tier1Found: false,
    tier1Id: obligationId,
    bridgeCount: 0,
    semanticCount: 0,
    retrievalMode: 'deterministic',
    flags: [],
    businessLine: systemContext?.businessLine || null,
  };

  let tier1 = null;
  let relatedTier1 = [];
  let bridgeContext = [];
  const semanticContext = [];

  try {
    const { data: tier1Data, error: tier1Error } = await supabase
      .from('chunks')
      .select('*')
      .eq('id', obligationId)
      .eq('visibility', 'PUBLIC')
      .single();

    if (tier1Error || !tier1Data) {
      console.warn(`[corpusAgent] Tier 1 miss for "${obligationId}": ${tier1Error?.message || 'not found'}`);
      return buildFallbackResult(obligationId, retrievalMetadata);
    }

    tier1 = tier1Data;
    retrievalMetadata.tier1Found = true;

    // relatedTier1 always empty — no related_ids column
    relatedTier1 = [];

    // Tier 2-4: bridge context
    if (tier1.article_ref) {
      const articlePrefix = tier1.article_ref.replace(/\(.*$/, '').trim();
      const { data: bridgeData, error: bridgeError } = await supabase
        .from('chunks')
        .select('*')
        .gte('authority_rank', 2)
        .eq('visibility', 'PUBLIC')
        .like('article_ref', `${articlePrefix}%`)
        .order('authority_rank', { ascending: true })
        .limit(5);

      if (!bridgeError && bridgeData) {
        bridgeContext = bridgeData;
        retrievalMetadata.bridgeCount = bridgeContext.length;
        if (bridgeContext.length > 0) {
          retrievalMetadata.retrievalMode = 'bridgeContext';
        }
      }
    }
  } catch (err) {
    console.warn(`[corpusAgent] Supabase error: ${err.message}. Falling back to in-memory corpus.`);
    return buildFallbackResult(obligationId, retrievalMetadata);
  }

  const allChunks = [tier1, ...relatedTier1, ...bridgeContext, ...semanticContext].filter(Boolean);
  const chunkTextById = buildChunkTextMap(allChunks);
  const allChunksText = allChunks.map(c => c.chunk_text || c.text).filter(Boolean);

  return {
    tier1,
    relatedTier1,
    bridgeContext,
    semanticContext,
    chunkTextById,
    allChunksText,
    retrievalMetadata,
  };
}

function buildFallbackResult(obligationId, retrievalMetadata) {
  retrievalMetadata.flags.push('CORPUS_FALLBACK');

  const allCorpus = getAllCorpusChunks();
  const rawTier1 = allCorpus.find(c => c.id === obligationId);

  const tier1 = rawTier1 ? normalizeInMemoryChunk(rawTier1) : null;
  retrievalMetadata.tier1Found = !!tier1;

  let relatedTier1 = [];
  if (tier1 && tier1.article_ref) {
    const prefix = tier1.article_ref.replace(/\(.*$/, '').trim();
    relatedTier1 = allCorpus
      .filter(c => c.id !== obligationId && c.article && c.article.startsWith(prefix))
      .slice(0, 10)
      .map(normalizeInMemoryChunk);
  }

  const allChunks = [tier1, ...relatedTier1].filter(Boolean);
  const chunkTextById = buildChunkTextMap(allChunks);
  const allChunksText = allChunks.map(c => c.chunk_text).filter(Boolean);

  return {
    tier1,
    relatedTier1,
    bridgeContext: [],
    semanticContext: [],
    chunkTextById,
    allChunksText,
    retrievalMetadata,
  };
}

export async function retrieveClassificationCorpus() {
  const targetIds = ['aia_art3_1', 'aia_art6_1', 'aia_art6_2', 'aia_art6_3'];

  try {
    const { data: articles, error: artError } = await supabase
      .from('chunks')
      .select('*')
      .in('id', targetIds)
      .eq('visibility', 'PUBLIC');

    const { data: annexes, error: annexError } = await supabase
      .from('chunks')
      .select('*')
      .like('article_ref', 'Annex III%')
      .eq('visibility', 'PUBLIC');

    if (artError || annexError) {
      throw new Error(artError?.message || annexError?.message);
    }

    return { articles: articles || [], annexes: annexes || [] };
  } catch (err) {
    console.warn(`[corpusAgent] Classification corpus fallback: ${err.message}`);
    const allCorpus = getAllCorpusChunks();
    const articles = allCorpus.filter(c => targetIds.includes(c.id)).map(normalizeInMemoryChunk);
    const annexes = allCorpus.filter(c => c.article && c.article.startsWith('Annex III')).map(normalizeInMemoryChunk);
    return { articles, annexes };
  }
}

export async function retrieveDeployerObligations() {
  try {
    const { data, error } = await supabase
      .from('chunks')
      .select('*')
      .or('article_ref.like.Article 4%,article_ref.like.Article 26%,article_ref.like.Article 27%')
      .eq('visibility', 'PUBLIC');

    if (error) throw new Error(error.message);
    return data || [];
  } catch (err) {
    console.warn(`[corpusAgent] Deployer obligations fallback: ${err.message}`);
    const allCorpus = getAllCorpusChunks();
    return allCorpus
      .filter(c => c.article && (c.article.startsWith('Article 4') || c.article.startsWith('Article 26') || c.article.startsWith('Article 27')))
      .map(normalizeInMemoryChunk);
  }
}
