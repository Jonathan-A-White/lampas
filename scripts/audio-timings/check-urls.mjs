// scripts/audio-timings/check-urls.mjs: asks the publisher (HEAD) for every chapter's MP3 that public/data/audio/msb-david lists, and prints each that does not answer 200.
// Not in the gate (it needs the network): node scripts/audio-timings/check-urls.mjs  (exit 1 when any chapter's file is missing; mw-zbgo4ep.38)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { indexText } from '../audio-index.mjs';

const dir = resolve(import.meta.dirname, '../../public/data/audio/msb-david');
const index = JSON.parse(indexText(dir)); // the index is made from the book files (scripts/audio-index.mjs), not read from a committed file
let checked = 0;
const bad = [];
for (const [book, chapters] of Object.entries(index.books)) {
  const file = JSON.parse(readFileSync(resolve(dir, `${book}.json`), 'utf8'));
  for (const n of chapters) {
    const url = file.chapters[String(n)]?.audio;
    if (!url) {
      bad.push(`${book} ${n}: no audio address in ${book}.json`);
      continue;
    }
    checked += 1;
    const status = await fetch(url, { method: 'HEAD' }).then((r) => r.status, () => 0);
    if (status !== 200) bad.push(`${book} ${n}: ${status} ${url}`);
  }
}
console.log(`${checked} chapters checked, ${bad.length} not answering 200`);
for (const line of bad) console.log(line);
process.exit(bad.length === 0 ? 0 : 1);
