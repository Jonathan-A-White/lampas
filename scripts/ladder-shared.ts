// scripts/ladder-shared.ts — what the two reading ladders (ladder-el.ts, ladder-en.ts; docs/reading-ladder.md) have in common: the entry,
// the short reasons, walking every verse of public/data in canonical order, and writing the list easiest first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface LadderEntry {
  /** 'jhn.11.35' */
  ref: string;
  score: number;
  /** up to three short reasons, the heaviest first */
  why: string[];
}

/** The reasons in the order a tie between them is broken: the first listed wins. */
export function reasons(parts: [number, string][]): string[] {
  return parts
    .map(([points, text], order) => ({ points, text, order }))
    .filter((p) => p.points > 0)
    .sort((a, b) => b.points - a.points || a.order - b.order)
    .slice(0, 3)
    .map((p) => p.text);
}

interface IndexFile {
  books: { code: string; chapters: number }[];
}
export interface ChapterFile {
  verses: { n: number; g: { t: string }[]; e: { t: string }[] }[];
}

/** Scores every verse under `dataDir` and writes the ladder to `outFile`: easiest first, a tie by canonical order. */
export function buildLadderWith(dataDir: string, outFile: string, score: (verse: ChapterFile['verses'][number]) => { score: number; why: string[] }): LadderEntry[] {
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')) as IndexFile;
  const entries: LadderEntry[] = [];
  for (const book of index.books) {
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
