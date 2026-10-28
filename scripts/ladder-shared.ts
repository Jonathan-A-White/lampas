// scripts/ladder-shared.ts — what the three reading ladders (ladder-el.ts, ladder-en.ts, ladder-he.ts; docs/reading-ladder.md) have in common: the entry,
// the short reasons, walking every verse of public/data in canonical order, and writing the list easiest first.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
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
  ladders?: Record<string, string>;
}
export interface ChapterFile {
  verses: { n: number; g: { t: string; tr?: string }[]; e: { t: string }[] }[];
}

/** Which books a ladder walks: the Greek ones (the New Testament; el and en), or the Hebrew ones (the Old Testament; he). */
export type LadderSource = 'grc' | 'hbo';

/** Scores every verse of the books of `source` under `dataDir` (the New Testament by default) and writes the ladder to `outFile`: easiest first, a tie by canonical order. */
export function buildLadderWith(dataDir: string, outFile: string, score: (verse: ChapterFile['verses'][number], ref: string) => { score: number; why: string[] }, source: LadderSource = 'grc'): LadderEntry[] {
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8')) as IndexFile;
  const entries: LadderEntry[] = [];
  for (const book of index.books) {
    if ((book.lang ?? 'grc') !== source) continue; // el and en are New Testament only; the Old Testament's chapters (mw-uqlxea.1) are he's
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      const file = JSON.parse(readFileSync(join(dataDir, book.code, `${chapter}.json`), 'utf8')) as ChapterFile;
      for (const verse of file.verses) entries.push({ ref: `${book.code}.${chapter}.${verse.n}`, ...score(verse, `${book.code}.${chapter}.${verse.n}`) });
    }
  }
  // entries are in canonical order, and a sort is stable: equal scores keep it
  const ladder = entries.map((e, i) => ({ e, i })).sort((a, b) => a.e.score - b.e.score || a.i - b.i).map(({ e }) => e);
  mkdirSync(dirname(outFile), { recursive: true });
  const text = JSON.stringify(ladder);
  writeFileSync(outFile, text);
  stampFingerprint(dataDir, outFile, text);
  return ladder;
}

/**
 * A list written to <dataDir>/ladder/<lang>.json gets its fingerprint in <dataDir>/index.json (`ladders.<lang>`: the first 12 hex characters of the SHA-256 of the
 * bytes written), which the phone asks the list for it by (src/data/chapter.ts ladderUrl), so a rescored list is fetched again. A list written anywhere else (a test's) leaves the index alone.
 */
function stampFingerprint(dataDir: string, outFile: string, text: string): void {
  if (resolve(dirname(outFile)) !== resolve(dataDir, 'ladder')) return;
  const lang = basename(outFile, '.json');
  const path = join(dataDir, 'index.json');
  const index = JSON.parse(readFileSync(path, 'utf8')) as IndexFile;
  const fingerprint = createHash('sha256').update(text).digest('hex').slice(0, 12);
  if (index.ladders?.[lang] === fingerprint) return;
  index.ladders = { ...index.ladders, [lang]: fingerprint };
  writeFileSync(path, JSON.stringify(index));
}
