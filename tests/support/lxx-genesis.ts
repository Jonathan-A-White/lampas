// tests/support/lxx-genesis.ts — a Genesis of `chapters` chapters made from the first verses of the Gen 1 fixture (tests/fixtures/lxx/swete-gen-1.csv, the translit file beside it),
// each chapter a copy of those verses under its own number (story mw-u2w5klk.265: the chapter bar, release and build all need a book with many chapters, and the fixtures hold one).
// A copy derives as the original does (layers 1 and 2 read a word and the agreement check a verse, never the chapter), so a choices file for chapter 1 is one for every chapter.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = 'tests/fixtures/lxx';

export interface SyntheticGenesis {
  /** Swete's two files in the shape deriveBook and buildLxx read them */
  versification: string;
  words: string;
  /** the SBL transliteration file of the same lines */
  translit: string;
  wordsPerChapter: number;
  chapters: number;
}

export function syntheticGenesis(chapters: number, verses = 5): SyntheticGenesis {
  const [versification, words] = readFileSync(join(FIXTURES, 'swete-gen-1.csv'), 'utf8').split('\n\n');
  const translit = readFileSync(join(FIXTURES, 'swete-translit-gen-1.csv'), 'utf8');
  const starts = versification.trimEnd().split('\n').map((l) => l.split('\t') as [string, string]);
  // the words of the first `verses` verses: the lines before the next verse's first line
  const wordsPerChapter = Number(starts[verses][0]) - 1;
  const rows = (text: string): Array<[number, string]> =>
    text.split('\n').flatMap((l) => {
      const tab = l.indexOf('\t');
      const n = Number(l.slice(0, tab));
      return tab > 0 && n >= 1 && n <= wordsPerChapter ? [[n, l.slice(tab + 1)] as [number, string]] : [];
    });
  const verseLines: string[] = [];
  const wordLines: string[] = [];
  const translitLines: string[] = [];
  for (let c = 1; c <= chapters; c++) {
    const at = (n: number): number => (c - 1) * wordsPerChapter + n;
    starts.slice(0, verses).forEach(([line, ref]) => verseLines.push(`${at(Number(line))}\tGen.${c}:${ref.split(':')[1]}`));
    for (const [n, form] of rows(words)) wordLines.push(`${at(n)}\t${form}`);
    for (const [n, text] of rows(translit)) translitLines.push(`${at(n)}\t${text}`);
  }
  return { versification: verseLines.join('\n'), words: wordLines.join('\n'), translit: translitLines.join('\n') + '\n', wordsPerChapter, chapters };
}
