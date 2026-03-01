import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildCorpus } from './corpus-build.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(scriptDir, 'manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  console.error(`Missing manifest — run "npm run corpus:build" first.`);
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const { dbRecords } = buildCorpus();

const BATCH_SIZE = 500;
let upserted = 0;

for (let i = 0; i < dbRecords.length; i += BATCH_SIZE) {
  const batch = dbRecords.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from('chunks')
    .upsert(batch, { onConflict: 'id' });

  if (error) {
    console.error(`Upsert error at batch ${i}:`, error.message);
    process.exit(1);
  }
  upserted += batch.length;
}

console.log(`Upserted ${upserted} chunks into "chunks" table.`);

const { error: manifestError } = await supabase
  .from('corpus_manifest')
  .insert({
    corpus_version: manifest.corpusVersion,
    source_name: 'EU AI Act Corpus',
    source_uri: 'http://data.europa.eu/eli/reg/2024/1689/oj',
    verified_date: new Date().toISOString().slice(0, 10),
    chunk_count: dbRecords.length,
    manifest_hash: manifest.manifestHash,
    notes: `Built ${manifest.generatedAt}, model ${manifest.embeddingModel}`,
  });

if (manifestError) {
  console.error('corpus_manifest insert error:', manifestError.message);
  process.exit(1);
}

console.log(`Inserted corpus_manifest row (version: ${manifest.corpusVersion}).`);
console.log('Seed complete.');
