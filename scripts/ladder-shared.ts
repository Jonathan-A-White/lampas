// scripts/ladder-shared.ts — what the two reading ladders (ladder-el.ts, ladder-en.ts; docs/reading-ladder.md) have in common: the entry,
// the short reasons, walking every verse of public/data in canonical order, and writing the list easiest first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { reasons } from '../src/data/ladderScore';

export interface LadderEntry {
  /** 'jhn.11.35' */
  ref: string;
  score: number;
  /** up to three short reasons, the heaviest first */
  why: string[];
}

export { reasons };

interface IndexFile {
  books: { code: string; chapters: number; lang?: string }[];
}
export interface ChapterFile {
  verses: { n: number; g: { t: string }[]; e: { t: string }[] }[];
}

/** Scores every verse under `dataDir` and writes the ladder to `outFile`: easiest first, a tie by canonical order. */
export function buildLadderWith(dataDir: string, outFile: string, score: (verse: ChapterFile['verses'][number]) => { score: number; why: string[] }): LadderEntry[] {
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')) as IndexFile;
  const entries: LadderEntry[] = [];
  for (const book of index.books) {
    if (book.lang === 'hbo') continue; // the ladders are Greek: the Old Testament's chapters (mw-uqlxea.1) are not scored
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const file = JSON.parse(readFileSync(join(dataDir, book.code, `${chapter}.json`), 'utf8')) as ChapterFile;
      for (const verse of file.verses) entries.push({ ref: `${book.code}.${chapter}.${verse.n}`, ...score(verse) });
    }
  }
  // entries are in canonical order, and a sort is stable: equal scores keep it
  const ladder = entries.map((e, i) => ({ e, i })).sort((a, b) => a.e.score - b.e.score || a.i - b.i).map(({ e }) => e);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(ladder));
  return ladder;
}
