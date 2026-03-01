import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  EU_AI_ACT_ARTICLES,
  EU_AI_ACT_RECITALS,
  EU_AI_ACT_ANNEXES,
  CONTESTED_PROVISIONS,
} from '@eu-ai-act/knowledge';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(scriptDir, 'manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  console.error('Missing manifest.json — run "npm run corpus:build" first.');
  process.exit(1);
}

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

let mismatches = 0;

for (const chunk of uniqueChunks) {
  const expected = manifest.chunks[chunk.id];
  if (!expected) {
    console.error(`MISSING in manifest: ${chunk.id}`);
    mismatches++;
    continue;
  }

  const actual = sha256(chunk.text);
  if (actual !== expected.hash) {
    console.error(`MISMATCH ${chunk.id}: expected ${expected.hash}, got ${actual}`);
    mismatches++;
  }
}

if (mismatches > 0) {
  console.error(`\nVerification FAILED — ${mismatches} mismatch(es).`);
  process.exit(1);
} else {
  console.log(`Verification passed — ${uniqueChunks.length} chunks OK.`);
  process.exit(0);
}
