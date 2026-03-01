import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  EU_AI_ACT_ARTICLES,
  EU_AI_ACT_RECITALS,
  EU_AI_ACT_ANNEXES,
  CONTESTED_PROVISIONS,
} from '@eu-ai-act/knowledge';

const AUTHORITY_RANKS = { TIER_1: 1, TIER_2: 2, TIER_3: 3, TIER_4: 4 };
const VALID_AUTHORITIES = new Set(Object.keys(AUTHORITY_RANKS));
const DEFAULT_SOURCE_URI = 'http://data.europa.eu/eli/reg/2024/1689/oj';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function deriveChunkType(chunk) {
  if (chunk.id.startsWith('aia_recital')) return 'RECITAL';
  if (chunk.id.startsWith('aia_annex')) return 'ANNEX';
  if (chunk.authority === 'TIER_3' || chunk.authority === 'TIER_4') return 'GUIDANCE';
  return 'ARTICLE';
}

export function buildCorpus() {
  const allChunks = [
    ...EU_AI_ACT_ARTICLES,
    ...EU_AI_ACT_RECITALS,
    ...EU_AI_ACT_ANNEXES,
    ...CONTESTED_PROVISIONS,
  ];

  const seen = new Set();
  const uniqueChunks = [];
  for (const chunk of allChunks) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    uniqueChunks.push(chunk);
  }

  const dbRecords = [];

  for (const chunk of uniqueChunks) {
    if (!chunk.id || !chunk.text || !chunk.authority) {
      console.error(`Validation failed — missing field on chunk: ${JSON.stringify(chunk)}`);
      process.exit(1);
    }
    if (!VALID_AUTHORITIES.has(chunk.authority)) {
      console.error(`Invalid authority "${chunk.authority}" on chunk ${chunk.id}`);
      process.exit(1);
    }

    dbRecords.push({
      id: chunk.id,
      corpus_version: '2026-01',
      chunk_text: chunk.text,
      chunk_type: deriveChunkType(chunk),
      authority: chunk.authority,
      authority_rank: AUTHORITY_RANKS[chunk.authority],
      article_ref: chunk.article,
      source_uri: chunk.source_uri || DEFAULT_SOURCE_URI,
      source_locator: chunk.source_locator || chunk.article,
      text_hash: sha256(chunk.text),
      visibility: 'PUBLIC',
      embedding: null,
    });
  }

  const manifestChunks = {};
  for (const rec of dbRecords) {
    manifestChunks[rec.id] = {
      hash: rec.text_hash,
      articleRef: rec.article_ref,
      authority: rec.authority,
      authorityRank: rec.authority_rank,
    };
  }

  const sortedIds = Object.keys(manifestChunks).sort();
  const concatenatedHashes = sortedIds.map((id) => manifestChunks[id].hash).join('');
  const manifestHash = sha256(concatenatedHashes);

  const manifest = {
    corpusVersion: '2026-01',
    embeddingModel: 'nomic-embed-text-v1.5',
    generatedAt: new Date().toISOString(),
    chunks: manifestChunks,
    manifestHash,
  };

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  writeFileSync(join(scriptDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  return { dbRecords, manifest };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { dbRecords, manifest } = buildCorpus();
  console.log(`Corpus build complete.`);
  console.log(`  Chunks: ${dbRecords.length}`);
  console.log(`  Manifest hash: ${manifest.manifestHash}`);
  console.log(`  Written to: scripts/manifest.json`);
}
