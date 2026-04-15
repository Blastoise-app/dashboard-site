#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

import { parseOverview } from './lib/parse-overview.mjs';
import { parseClusters } from './lib/parse-clusters.mjs';
import { parseGeoTracker } from './lib/parse-geo-tracker.mjs';
import { parseRoadmap } from './lib/parse-roadmap.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PARSERS = {
  overview: parseOverview,
  clusters: parseClusters,
  geoTracker: parseGeoTracker,
  roadmap: parseRoadmap
};

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/fetch-sheet.mjs <client-slug>');
    process.exit(1);
  }

  const configPath = resolve(ROOT, 'clients', `${slug}.json`);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  console.log(`[fetch] client=${slug} sheet=${config.sheetId}`);

  const out = {
    slug: config.slug,
    title: config.title,
    subtitle: config.subtitle,
    brand: config.brand || null,
    lastUpdated: new Date().toISOString()
  };

  for (const [tabKey, tabCfg] of Object.entries(config.tabs)) {
    const url = `https://docs.google.com/spreadsheets/d/${config.sheetId}/export?format=csv&gid=${tabCfg.gid}`;
    process.stdout.write(`[fetch] ${tabKey} (gid=${tabCfg.gid}) ... `);
    const csv = await fetchCsv(url);
    const { data: rows } = Papa.parse(csv, { skipEmptyLines: false });
    const parser = PARSERS[tabKey];
    if (!parser) {
      console.log(`no parser — skipped`);
      continue;
    }
    out[tabKey] = parser(rows);
    console.log(`ok (${rows.length} rows)`);
  }

  const outDir = resolve(ROOT, 'docs', slug);
  await mkdir(outDir, { recursive: true });
  const dataPath = resolve(outDir, 'data.json');
  await writeFile(dataPath, JSON.stringify(out, null, 2) + '\n');
  await writeFile(resolve(outDir, 'last-updated.txt'), out.lastUpdated + '\n');
  console.log(`[fetch] wrote ${dataPath}`);
}

async function fetchCsv(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
