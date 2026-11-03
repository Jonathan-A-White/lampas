// scripts/check-msb-chunk-pairs.ts — run by hand: node scripts/check-msb-chunk-pairs.ts [--list] [--tsv <msb_nt_tables.tsv>]
// Not part of the gate. Counts, over the built New Testament (public/data/<book>/<chapter>.json), the English chunks whose first
// Greek word is a pronoun (parse P-...) and whose next is an article (T-...): the shape of Luke 20:20's 'to the' holding αὐτὸν τῇ
// while 'to hand Him over' holds παραδοῦναι alone (mw-5r3p30.993). The cause was the build's reading of the table's '. . .' English
// (a word with '. . .' joins the NEXT chunk in English order) when the table meant the chunk BEFORE (its English is already inside the
// previous chunk: 'to hand Him over'). mw-5r3p30.997 fixed it for P- and F- words (scripts/data/chapterWriter.ts buildVerse); what this
// finds in a built tree now is the 'other way round' shape (an article or noun joined to the chunk after a pronoun) and the rare right one.
// With --tsv it also counts, in the published table itself, the '. . .' rows by the part of speech and by whether the English of
// the chunk before them (in English order) holds an English pronoun (him, her, it, them, ...).
// Docs: docs/sources/msb-chunk-pairs.md.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface Word { t: string; p: string; e?: number }
interface Chunk { t: string; g: number[] }
interface Verse { n: number; g: Word[]; e: Chunk[] }
interface Chapter { book: string; chapter: number; verses: Verse[] }
interface Index { books: { code: string; chapters: number; lang?: string }[] }

const args = process.argv.slice(2);
const list = args.includes('--list');
const tsvAt = args.includes('--tsv') ? args[args.indexOf('--tsv') + 1] : '';
const dir = new URL('../public/data/', import.meta.url).pathname;
const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as Index;

const isPronoun = (p: string) => p.startsWith('P-') || p.startsWith('F-') || p.startsWith('S-');
const isArticle = (p: string) => p.startsWith('T-');

let chunks = 0;
let hits = 0;
const hitVerses = new Set<string>();
const rows: string[] = [];
for (const book of index.books) {
  if (book.lang && book.lang !== 'grc') continue;
  for (let c = 1; c <= book.chapters; c++) {
    const file = join(dir, book.code, `${c}.json`);
    if (!existsSync(file)) continue;
    const chapter = JSON.parse(readFileSync(file, 'utf8')) as Chapter;
    for (const v of chapter.verses) {
      for (const [j, chunk] of v.e.entries()) {
        chunks++;
        if (chunk.g.length < 2) continue;
        const first = v.g[chunk.g[0]];
        const second = v.g[chunk.g[1]];
        if (!first || !second || !isPronoun(first.p) || !isArticle(second.p)) continue;
        hits++;
        const ref = `${book.code} ${c}:${v.n}`;
        hitVerses.add(ref);
        const before = v.e[j - 1];
        rows.push(`${ref}\t[${chunk.g.map((i) => v.g[i].t).join(' ')}] "${chunk.t}"\tbefore: [${before ? before.g.map((i) => v.g[i].t).join(' ') : ''}] "${before?.t ?? ''}"`);
      }
    }
  }
}
console.log(`English chunks read: ${chunks}`);
console.log(`Chunks whose first Greek word is a pronoun and whose second is an article: ${hits} in ${hitVerses.size} verses`);
if (list) console.log(rows.join('\n'));
else console.log('(--list prints every hit; the first 40:)\n' + rows.slice(0, 40).join('\n'));

if (tsvAt) {
  const lines = readFileSync(tsvAt, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1);
  const byGroup = new Map<string, string[][]>();
  for (const line of lines) {
    const f = line.split('\t');
    if (f[4] !== 'Greek' || !f[6]) continue;
    const group = byGroup.get(f[3]) ?? [];
    group.push(f);
    byGroup.set(f[3], group);
  }
  const PRONOUN = /\b(him|his|her|hers|it|its|them|their|they|he|she|me|my|us|our|you|your|himself|themselves|whom|who|that|this|these|those)\b/i;
  const noEnglish = (f: string[]) => ['', '-', 'vvv'].includes(f[18].trim());
  let dots = 0;
  let pronounRows = 0;
  let onlyBefore = 0;
  let onlyAfter = 0;
  let bothSides = 0;
  let neitherSide = 0;
  let pronounThenArticle = 0;
  const wrongVerses = new Set<string>();
  for (const [group, rowsOfVerse] of byGroup) {
    const ordered = [...rowsOfVerse].sort((a, b) => Number(a[2]) - Number(b[2]) || Number(a[1]) - Number(b[1]));
    ordered.forEach((f, i) => {
      if (f[18].trim() !== '. . .') return;
      dots++;
      if (!f[8].startsWith('P-')) return;
      pronounRows++;
      let k = i - 1;
      while (k >= 0 && (noEnglish(ordered[k]) || ordered[k][18].trim() === '. . .')) k--;
      let m = i + 1;
      while (m < ordered.length && (noEnglish(ordered[m]) || ordered[m][18].trim() === '. . .')) m++;
      const before = k >= 0 && PRONOUN.test(ordered[k][18]);
      const after = m < ordered.length && PRONOUN.test(ordered[m][18]);
      if (before && after) bothSides++;
      else if (before) onlyBefore++;
      else if (after) onlyAfter++;
      else neitherSide++;
      if (before && !after) wrongVerses.add(group);
      if (m < ordered.length && ordered[m][8].startsWith('T-') && ordered[m][18].trim() !== '. . .') pronounThenArticle++;
    });
  }
  console.log(`\nIn the published table (${tsvAt}):`);
  console.log(`  rows whose English is '. . .': ${dots}`);
  console.log(`  of them pronouns (P-...): ${pronounRows}`);
  console.log(`  pronoun '. . .' rows, by where an English pronoun stands in the nearest chunk with English before and after (before mw-5r3p30.997 the build joined the row to the one AFTER; the counts are of the table, so a fix does not change them):`);
  console.log(`    only before: ${onlyBefore} in ${wrongVerses.size} verses (the rows the old rule put with the wrong chunk)  only after: ${onlyAfter}  both: ${bothSides}  neither: ${neitherSide}`);
  console.log(`  pronoun '. . .' rows whose nearest chunk after is an article row: ${pronounThenArticle}`);
}
