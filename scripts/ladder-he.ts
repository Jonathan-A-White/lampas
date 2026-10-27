// scripts/ladder-he.ts — the Hebrew reading ladder (mw-gdcyf98.14, docs/reading-ladder.md 'Hebrew'): scores every verse of the Old Testament in public/data for how hard it is to SAY
// aloud (not to understand), from its words' syllabified transliteration, and writes public/data/ladder/he.json in el.json's shape, easiest first. Run by `npm run ladder` (after
// ladder-el.ts and ladder-en.ts), never at runtime. Deterministic: the same data gives the same bytes. The weights are a first guess (src/data/ladderScore.ts HEBREW_WEIGHTS).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HEBREW_WEIGHTS, scoreHebrewWords, unsyllabifiedHebrew } from '../src/data/ladderScore';
import { buildLadderWith, type LadderEntry } from './ladder-shared';

export type { LadderEntry };
export { HEBREW_WEIGHTS, scoreHebrewWords };

/** A verse with a word the scorer cannot syllabify (an unpointed form, a ketiv, a paragraph sign): it is scored on the words that can be, and listed. */
export interface Unsyllabified {
  ref: string;
  forms: string[];
}

/** Scores every Old Testament verse under `dataDir` and writes the ladder to `outFile`: easiest first, a tie by canonical order. `unsyllabified`, when given, is filled (in canonical order)
 * with the verses that had a word with no vowel to say, so the sweep is counted and listed, never dropped silently. */
export function buildLadder(dataDir: string, outFile: string, unsyllabified: Unsyllabified[] = []): LadderEntry[] {
  unsyllabified.length = 0;
  return buildLadderWith(
    dataDir,
    outFile,
    (verse, ref) => {
      const trs = verse.g.map((w) => w.tr ?? '');
      const forms = unsyllabifiedHebrew(verse.g);
      if (forms.length > 0) unsyllabified.push({ ref, forms });
      return scoreHebrewWords(trs);
    },
    'hbo',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const unsyllabified: Unsyllabified[] = [];
  const ladder = buildLadder('public/data', 'public/data/ladder/he.json', unsyllabified);
  console.log(`${ladder.length} verses, easiest ${ladder[0].ref} (${ladder[0].score}), hardest ${ladder[ladder.length - 1].ref} (${ladder[ladder.length - 1].score})`);
  console.log(`${unsyllabified.length} verses have a word the scorer cannot syllabify (scored on the rest): ${unsyllabified.map((u) => `${u.ref} [${u.forms.join(' ')}]`).join(', ')}`);
}
