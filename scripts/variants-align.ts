// scripts/variants-align.ts — `npm run variants:align [-- --write]`: pairs the English of every committed variant reading word by word with the reading's Greek (english.align,
// scripts/data/variantAlign.ts, mw-9ji6ek0.37) and reports how many readings are paired. The data build does the same after it tags the readings' words; this does it on the committed
// public/data without the download. --write sets `align` in public/data (the same bytes otherwise) and stamps each changed chapter's fingerprint in public/data/index.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { BookIndex, Chapter } from '../src/data/chapter';
import { chapterFingerprint } from './data/chapterWriter';
import { alignIndex, alignReport, alignUnits } from './data/variantAlign';

const write = process.argv.includes('--write');
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const files: Array<{ path: string; chapter: Chapter; before: string }> = [];
for (const dir of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(`public/data/${dir.name}`).filter((f) => /^\d+\.json$/.test(f))) {
    const path = `public/data/${dir.name}/${file}`;
    const before = readFileSync(path, 'utf8');
    files.push({ path, chapter: JSON.parse(before) as Chapter, before });
  }
}
const chapters = files.map((f) => f.chapter);
const tally = alignUnits(chapters, alignIndex(chapters.filter((c) => (c.lang ?? 'grc') === 'grc')));
let changed = 0;
for (const { path, chapter, before } of files) {
  const now = JSON.stringify(chapter);
  if (now === before) continue;
  changed++;
  if (!write) continue;
  writeFileSync(path, now);
  const book = index.books.find((b) => b.code === chapter.code);
  if (book) book.fingerprints[chapter.chapter - 1] = chapterFingerprint(chapter);
}
if (write) writeFileSync('public/data/index.json', JSON.stringify(index));
console.log(`${changed} chapters ${write ? 'written' : 'would change'}`);
for (const line of alignReport(tally)) console.log(line);
