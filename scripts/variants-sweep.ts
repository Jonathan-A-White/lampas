// scripts/variants-sweep.ts — `npm run variants:sweep [-- --write]`: re-judges changesEnglish of every committed variant unit in the verse (src/data/variantVerse.ts,
// mw-9ji6ek0.14) and reports the units that flip. A unit that changed the English by its own snippet and no longer does by its verse flips shown -> hidden under
// 'Those that change the English'; the other way round must not happen. --write sets the new value in public/data (the same bytes otherwise) and stamps the
// chapter's new fingerprint in public/data/index.json, so a phone fetches the chapter again.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { BookIndex, Chapter } from '../src/data/chapter';
import { chapterFingerprint } from './data/chapterWriter';
import { wordOrderOnly } from '../src/data/variantVerse';
import { changesEnglish } from './data/variantEnglish';

const write = process.argv.includes('--write');
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const hidden: string[] = [];
const shown: string[] = [];
let units = 0;
const byOrder: string[] = [];
const byOrderShown: string[] = [];
for (const dir of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(`public/data/${dir.name}`).filter((f) => /^\d+\.json$/.test(f))) {
    const path = `public/data/${dir.name}/${file}`;
    const chapter = JSON.parse(readFileSync(path, 'utf8')) as Chapter;
    let changed = false;
    for (const unit of chapter.variants ?? []) {
      units++;
      const now = changesEnglish(unit.english, chapter.verses.find((v) => v.n === unit.v), unit.w, unit);
      // the other reading is the same words in another order: still hidden when its English is the model's or reads the same in the verse; shown when it is the MSB footnote's and the verse differs (mw-9ji6ek0.42)
      if (unit.alts.length > 0 && unit.alts.every((a) => wordOrderOnly(unit.base, a.text)))
        (now ? byOrderShown : byOrder).push(`${chapter.book} ${chapter.chapter}:${unit.v} ${unit.base} / ${unit.alts.map((a) => a.text).join(' / ')} (${unit.english.base} / ${unit.english.alts.join(' / ')})`);
      if (now === unit.changesEnglish) continue;
      const alt = unit.english.alts.map((a) => `'${a}'`).join(' / ');
      (unit.changesEnglish ? hidden : shown).push(`${chapter.book} ${chapter.chapter}:${unit.v} w${unit.w[0]}-${unit.w[unit.w.length - 1]} '${unit.english.base}' -> ${alt}`);
      unit.changesEnglish = now;
      changed = true;
    }
    if (write && changed) {
      writeFileSync(path, JSON.stringify(chapter));
      const book = index.books.find((b) => b.code === chapter.code);
      if (book) book.fingerprints[chapter.chapter - 1] = chapterFingerprint(chapter);
    }
  }
}
if (write) writeFileSync('public/data/index.json', JSON.stringify(index));
console.log(`${units} units; shown -> hidden ${hidden.length}; hidden -> shown ${shown.length}`);
for (const line of hidden) console.log(`  hidden: ${line}`);
for (const line of shown) console.log(`  SHOWN: ${line}`);
console.log(`word order only: ${byOrder.length} units hidden under 'Those that change the English' (the other reading is the same words in another order, its English the model's or the same in the verse); ${byOrderShown.length} shown (the MSB footnote's English differs in the verse)`);
for (const line of byOrder.slice(0, 5)) console.log(`  e.g. ${line}`);
