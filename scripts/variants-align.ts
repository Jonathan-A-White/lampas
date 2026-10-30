// scripts/variants-align.ts — `npm run variants:align [-- --write]`: pairs the English of every committed variant reading with its Greek word by word (`english.align`,
// scripts/data/variantAlign.ts, docs/data.md 'Variant English', mw-9ji6ek0.37) and reports how completely, by the source of the English. --write sets the pairing in public/data (the same bytes
// otherwise) and stamps each changed chapter's new fingerprint in public/data/index.json, so a phone fetches the chapter again. The chapter build (npm run data:build) lays the same pairing.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { BookIndex, Chapter, VariantUnit } from '../src/data/chapter';
import { chapterFingerprint } from './data/chapterWriter';
import { alignStats, layAlign } from './data/variantAlign';

const write = process.argv.includes('--write');
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const all: VariantUnit[] = [];
let files = 0;
for (const dir of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(`public/data/${dir.name}`).filter((f) => /^\d+\.json$/.test(f))) {
    const path = `public/data/${dir.name}/${file}`;
    const chapter = JSON.parse(readFileSync(path, 'utf8')) as Chapter;
    if (!chapter.variants?.length) continue;
    const changed = layAlign(chapter);
    all.push(...chapter.variants);
    if (write && changed) {
      writeFileSync(path, JSON.stringify(chapter));
      files++;
      const book = index.books.find((b) => b.code === chapter.code);
      if (book) book.fingerprints[chapter.chapter - 1] = chapterFingerprint(chapter);
    }
  }
}
if (write) writeFileSync('public/data/index.json', JSON.stringify(index));
const stats = alignStats(all);
console.log(`${all.length} units${write ? `, ${files} chapter files written` : ''}`);
for (const [source, s] of Object.entries(stats)) console.log(`readings with English from ${source}: fully paired ${s.full}, partly paired ${s.partly}, unpaired ${s.none}`);
