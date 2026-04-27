#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function main() {
  const slug = process.argv[2] ?? 'ideogram';
  const dir = resolve(ROOT, 'docs', slug);

  const [html, css, appJs, dataRaw] = await Promise.all([
    readFile(resolve(dir, 'index.html'), 'utf8'),
    readFile(resolve(dir, 'styles.css'), 'utf8'),
    readFile(resolve(dir, 'app.js'), 'utf8'),
    readFile(resolve(dir, 'data.json'), 'utf8')
  ]);

  // Validate the data is parseable JSON before embedding.
  JSON.parse(dataRaw);

  const fetchBlock = /let data;\s*try \{[\s\S]*?\} catch \(err\) \{[\s\S]*?return;\s*\}/;
  if (!fetchBlock.test(appJs)) {
    throw new Error('Could not locate the fetch(./data.json) block in app.js — did the file change?');
  }
  const inlinedJs = appJs.replace(fetchBlock, 'const data = __DATA;');

  const linkTag = '<link rel="stylesheet" href="./styles.css">';
  const scriptTag = '<script src="./app.js"></script>';
  if (!html.includes(linkTag)) throw new Error(`index.html missing expected tag: ${linkTag}`);
  if (!html.includes(scriptTag)) throw new Error(`index.html missing expected tag: ${scriptTag}`);

  const inlineStyle = `<style>\n${css}\n</style>`;
  const inlineScript = `<script>\nconst __DATA = ${dataRaw};\n${inlinedJs}\n</script>`;

  const out = html.replace(linkTag, inlineStyle).replace(scriptTag, inlineScript);

  const outPath = resolve(dir, 'standalone.html');
  await writeFile(outPath, out, 'utf8');

  const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
  console.log(`Wrote ${outPath} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
