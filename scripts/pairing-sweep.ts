// scripts/pairing-sweep.ts — npm run pairing:sweep [-- --glosses [--all] | --dots] (mw-fnvjof.17.210). --glosses prints the chunks two words' English crossed on (none once each is fixed or read: MISPLACED_READ_RIGHT; --all adds the read ones);
// --dots lists the '. . .' words that wait for the chunk after (with their English before and after) and the ones in the Genesis 21:11 shape still joined before. Not part of the gate; it reads data/raw/bsb_tables.tsv and tbesh.txt as data:build:ot does.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLines } from './data/bereanTable';
import { BSB_FILE, TBESH_FILE, MISPLACED_READ_RIGHT, buildOt, dotsRows, misplacedChunks, otLexicon } from './data-build-ot';

const mode = process.argv[2] ?? '--glosses';
const raw = 'data/raw';
if (!existsSync(join(raw, BSB_FILE)) || !existsSync(join(raw, TBESH_FILE))) throw new Error('run npm run data:build:ot first: it downloads data/raw/bsb_tables.tsv and tbesh.txt');
const lex = otLexicon(readFileSync(join(raw, TBESH_FILE), 'utf8'));
const lines: string[] = [];
let n = 0;
await buildOt(readLines(join(raw, BSB_FILE)), lex, () => undefined, {
  onVerse: (table, built) => {
    if (mode === '--glosses') {
      for (const m of misplacedChunks(`${table.book} ${table.chapter}:${table.n}`, built, (s) => lex.get(s)?.gloss ?? '').filter((m) => process.argv.includes('--all') || !MISPLACED_READ_RIGHT.has(m.ref))) {
        n++;
        lines.push(`${m.ref}\t${m.strongs} ${m.word} (${m.gloss})\t"${m.chunk}"\tin "${m.holder}"`);
      }
    }
    if (mode === '--dots') {
      for (const m of dotsRows(`${table.book} ${table.chapter}:${table.n}`, table.words, (s) => lex.get(s)?.gloss ?? '')) {
        n++;
        lines.push(`${m.ref}\t${m.kind}\t${m.strongs} ${m.word} (${m.gloss})\t"${m.before}"\t"${m.after}"`);
      }
    }
  },
});
console.log(lines.join('\n'));
console.log(`${n} chunks`);
