// scripts/data/chapterWriter.ts — what turns a verse of a word table into a verse of a chapter file, and writes the files: shared by the New Testament build
// (scripts/data-build.ts) and the Old Testament build (scripts/data-build-ot.ts). The shape is in docs/data.md and src/data/chapter.ts.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CANON } from '../../src/data/canon';
import type { BookIndex, BookInfo, Chapter, EnglishChunk, GreekWord, SourceLanguage, Verse } from '../../src/data/chapter';
import { PARAGRAPH_OPENER, marked, suppliedWords, tidy, unmarked, type TableVerse, type TableWord } from './bereanTable';

/** A word of a verse as the chapter file keeps it, before the English is aligned to it. */
export type SourceWord = Omit<GreekWord, 'e'>;

// A fixed key order, so the output bytes never depend on the order the keys were set in.
const ordered = (w: GreekWord): GreekWord => {
  const out: GreekWord = { t: w.t, tr: w.tr, s: w.s, l: w.l, p: w.p };
  if (w.gl !== undefined) out.gl = w.gl;
  if (w.e !== undefined) out.e = w.e;
  return out;
};

/**
 * One verse: the source words in source order, the English chunks in English order, and each word's `e` and each chunk's `g` pointing at the other.
 * `source` gives a table word its keys (the NT build looks the lemma up in TBESG, the OT build in TBESH).
 */
export function buildVerse(v: TableVerse, source: (w: TableWord, v: TableVerse) => SourceWord): Verse {
  const inSourceOrder = [...v.words].sort((a, b) => a.sourceSort - b.sourceSort);
  const g: GreekWord[] = inSourceOrder.map((w) => source(w, v));
  const sourceIndex = new Map(inSourceOrder.map((w, i) => [w, i]));

  // English order: a word with '-' or 'vvv' has no English of its own; one with '. . .' is rendered by the
  // chunk that completes it, which comes later in English order. Quotes and punctuation they carry move to
  // the chunk before (punctuation) or after (opening quotes).
  const e: Array<{ t: string; g: number[] }> = [];
  let ellipsis: number[] = [];
  let opening = '';
  for (const w of [...v.words].sort((a, b) => a.englishSort - b.englishSort)) {
    const raw = w.english.trim();
    const gi = sourceIndex.get(w)!;
    const tail = marked(w.tail);
    if (raw === '' || raw === '-' || raw === 'vvv' || raw === '. . .') {
      if (raw === '. . .') ellipsis.push(gi);
      opening += tidy(w.begQ);
      if (tail) {
        if (e.length) e[e.length - 1].t += tail;
        else opening += tail;
      }
      continue;
    }
    e.push({ t: opening + tidy(w.begQ) + marked(raw) + tail, g: [...ellipsis, gi] });
    ellipsis = [];
    opening = '';
  }
  if (ellipsis.length && e.length) e[e.length - 1].g.push(...ellipsis);

  const english: EnglishChunk[] = e.map((c, j) => {
    c.g.sort((a, b) => a - b);
    c.g.forEach((i) => (g[i].e = j));
    const chunk: EnglishChunk = { t: tidy(unmarked(c.t)), g: c.g };
    const supplied = suppliedWords(tidy(c.t));
    if (supplied.length) chunk.s = supplied;
    return chunk;
  });
  const first = [...v.words].sort((a, b) => a.englishSort - b.englishSort)[0];
  // A fixed key order: n, h, p, g, e.
  return {
    n: v.n,
    ...(v.heading ? { h: v.heading } : {}),
    ...(first && PARAGRAPH_OPENER.test(first.par) ? { p: 1 as const } : {}),
    g: g.map(ordered),
    e: english,
  };
}

/** The first 12 hex characters of the SHA-256 of the bytes a chapter file holds: index.json keeps one per chapter so a phone re-fetches only a chapter whose fingerprint changed. */
export const chapterFingerprint = (chapter: Chapter): string =>
  createHash('sha256').update(JSON.stringify(chapter)).digest('hex').slice(0, 12);

export const sortedKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** Strong's numbers by their number, whatever the letter: 'G686' before 'G2532'. */
export const numeric = (a: string, b: string): number => Number(a.slice(1)) - Number(b.slice(1));

// ---------------------------------------------------------------- the index

/**
 * index.json lists the 66 books in canon order. Each build writes the books of its own language and keeps the other language's from the index
 * already on disk, so building one Testament never loses the other's entries; a book neither has is left out (a test slice).
 */
export function mergeIndex(existing: BookIndex | undefined, built: readonly BookInfo[], lang: SourceLanguage): BookIndex {
  const books: BookInfo[] = [];
  for (const canon of CANON) {
    const mine = built.find((b) => b.code === canon.code);
    if (mine) {
      books.push({ code: mine.code, name: mine.name, chapters: mine.chapters, verses: mine.verses, fingerprints: mine.fingerprints, lang });
      continue;
    }
    const kept = canon.lang === lang ? undefined : existing?.books.find((b) => b.code === canon.code);
    if (kept) books.push({ code: kept.code, name: kept.name, chapters: kept.chapters, verses: kept.verses, fingerprints: kept.fingerprints, lang: kept.lang ?? 'grc' });
  }
  // the ladder fingerprints belong to scripts/ladder-shared.ts: a data build keeps them
  return existing?.ladders ? { books, ladders: existing.ladders } : { books };
}

export function readIndex(outDir: string): BookIndex | undefined {
  const path = join(outDir, 'index.json');
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as BookIndex) : undefined;
}

// ---------------------------------------------------------------- files

export async function fetchTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

/** Writes the file unless it holds these very bytes already; true when it wrote. */
export function writeIfChanged(path: string, text: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return true;
}

/** Removes the .json files under outDir that `owned` says a build made and `made` does not hold: what an earlier build left. ladder/ is scripts/ladder-el.ts's and is never touched. */
export function removeStale(outDir: string, made: ReadonlySet<string>, owned: (path: string) => boolean): void {
  if (!existsSync(outDir)) return;
  for (const p of readdirSync(outDir, { recursive: true }).map(String)) {
    const path = p.split('\\').join('/');
    if (path.endsWith('.json') && !path.startsWith('ladder/') && owned(path) && !made.has(path)) rmSync(join(outDir, p));
  }
}
