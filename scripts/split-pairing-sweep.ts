// scripts/split-pairing-sweep.ts — npm run split:sweep [-- --raw <dir>] [--out <file>] (story mw-5r3p30.1130; src/reader/split/splitPairing.ts, docs/split-pairing-sweep.md)
// The Reader's dock pairs a verse of the passage (Lampas's, the Hebrew Old Testament's numbering) with a verse of the Septuagint, and a Septuagint verse with a Lampas verse. This sweeps every verse of every
// book of Swete's Old Testament both ways, by the same map the build puts in each verse's `ref` (TVTMS, scripts/data/lxxChapter.ts lampasRefs) and the same pairing the dock draws (pairVerses):
//   - Greek verses with no Lampas verse (an Addition, a Psalm's extra title, a verse past the end of Lampas's chapter): the dock draws them with their own number alone;
//   - Lampas verses with no Greek verse: the dock draws '<n> · Not in the Septuagint' at their place.
// It writes docs/split-pairing-sweep.md: the counts per book and the totals, and the chapters of each book with an unpaired Lampas verse. A second run on the same files writes the same bytes. The raw downloads
// are the build's (data/raw, git-ignored, fetched when absent); no paid API is called.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Verse } from '../src/data/chapter';
import { pairVerses } from '../src/reader/split/splitPairing';
import { lampasCodeOf, lampasRefs, type LampasVerses } from './data/lxxChapter';
import { buildMaps, ensureTvtms, parseTvtms, type TvtmsMaps } from './data/tvtms';
import { OLD_TESTAMENT } from './lxx/report';
import { SWETE, SWETE_VERSIFICATION, SWETE_WORDS, pinnedPath } from './lxx/sources';
import { sweteVerses } from './lxx/versesets';

export const SWEEP_DOC = join('docs', 'split-pairing-sweep.md');
/** How many chapters with an unpaired Lampas verse a book's line names before saying how many more there are. */
const CHAPTER_CAP = 12;

export interface BookSweep {
  /** Swete's code and the book's name */
  code: string;
  name: string;
  greekVerses: number;
  /** Greek verses no Lampas verse answers */
  greekUnpaired: number;
  lampasVerses: number;
  /** Lampas verses no Greek verse answers */
  lampasUnpaired: number;
  /** the Lampas chapters with an unpaired verse, with how many: 'Psalms 10 (7)' as [10, 7] */
  chapters: Array<[chapter: number, unpaired: number]>;
}

/**
 * One book: `greek` is Swete's numbered verses by Greek chapter (`Map<chapter, verse numbers>`), `counts` Lampas's verse count per chapter of the book. Every Greek verse is given the Lampas verse(s) the build
 * gives it; each Lampas chapter is then paired as the dock pairs it, from the Greek verses with a verse in that chapter.
 */
export function sweepBook(code: string, name: string, greek: ReadonlyMap<number, readonly number[]>, counts: readonly number[], maps: TvtmsMaps, lampasCounts: LampasVerses): BookSweep {
  const lampas = lampasCodeOf(code);
  const sweep: BookSweep = { code, name, greekVerses: 0, greekUnpaired: 0, lampasVerses: counts.reduce((sum, n) => sum + n, 0), lampasUnpaired: 0, chapters: [] };
  if (lampas === undefined) return sweep;
  const dock: Verse[][] = counts.map(() => []);
  for (const chapter of [...greek.keys()].sort((a, b) => a - b)) {
    for (const verse of [...(greek.get(chapter) ?? [])].sort((a, b) => a - b)) {
      sweep.greekVerses++;
      const refs = lampasRefs(code, chapter, verse, maps, lampasCounts);
      if (refs.length === 0) {
        sweep.greekUnpaired++;
        continue;
      }
      const stub: Verse = { n: verse, ref: refs[0], ...(refs.length > 1 ? { refs: refs.slice(1) } : {}), g: [], e: [] };
      for (const at of new Set(refs.map((r) => r.chapter))) dock[at - 1]?.push(stub);
    }
  }
  counts.forEach((count, i) => {
    const rows = pairVerses(Array.from({ length: count }, (_, k) => k + 1), dock[i], lampas, i + 1);
    const missing = rows.filter((row) => row.kind === 'missing').length;
    sweep.lampasUnpaired += missing;
    if (missing > 0) sweep.chapters.push([i + 1, missing]);
  });
  return sweep;
}

const sum = (books: readonly BookSweep[], pick: (b: BookSweep) => number): number => books.reduce((n, b) => n + pick(b), 0);
const num = (n: number): string => n.toLocaleString('en-US');

/** The doc's text for the books swept. */
export function sweepDoc(books: readonly BookSweep[]): string {
  const rows = books.map((b) => {
    const named = b.chapters.slice(0, CHAPTER_CAP).map(([c, n]) => `${c} (${n})`).join(', ');
    const more = b.chapters.length > CHAPTER_CAP ? `, and ${b.chapters.length - CHAPTER_CAP} more` : '';
    return `| ${b.name} | ${num(b.greekVerses)} | ${num(b.greekUnpaired)} | ${num(b.lampasVerses)} | ${num(b.lampasUnpaired)} | ${named === '' ? '—' : named + more} |`;
  });
  const totals = `| **All ${books.length} books** | ${num(sum(books, (b) => b.greekVerses))} | ${num(sum(books, (b) => b.greekUnpaired))} | ${num(sum(books, (b) => b.lampasVerses))} | ${num(sum(books, (b) => b.lampasUnpaired))} | |`;
  return [
    '# Split pairing sweep',
    '',
    "GENERATED by `npm run split:sweep` (scripts/split-pairing-sweep.ts): do not edit. Every verse of Swete's Old Testament paired with Lampas's Hebrew Old Testament both ways, as the Reader's dock",
    "pairs a passage with the Septuagint beside it (`src/reader/split/splitPairing.ts`, mw-5r3p30.1130): a Greek verse by the `ref` the build gives it (STEPBible's TVTMS, `scripts/data/lxxChapter.ts` `lampasRefs`), a Lampas verse by the Greek verses with a `ref` in its chapter.",
    '',
    '- **Greek unpaired**: Swete numbers the verse and no Lampas verse answers it (an Addition, a Psalm\'s extra title, a verse past the end of Lampas\'s chapter): the dock draws it with its own number alone.',
    "- **Lampas unpaired**: no Greek verse answers the Lampas verse: the dock draws the muted row `<n> · Not in the Septuagint` at its place, so the dock's sequence is the passage's and nothing is blank.",
    '- **Chapters**: the Lampas chapters with an unpaired Lampas verse, and how many (the first twelve).',
    '',
    '| Book | Greek verses | Greek unpaired | Lampas verses | Lampas unpaired | Chapters (Lampas unpaired) |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...rows,
    totals,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
  const raw = resolve(option('--raw') ?? 'data/raw');
  const out = option('--out') ?? SWEEP_DOC;
  const maps = buildMaps(parseTvtms(readFileSync(await ensureTvtms(raw), 'utf8')));
  const pinned = resolve(raw, 'lxx');
  const swete = sweteVerses(readFileSync(pinnedPath(pinned, SWETE, SWETE_VERSIFICATION), 'utf8'), readFileSync(pinnedPath(pinned, SWETE, SWETE_WORDS), 'utf8'));
  const index = JSON.parse(readFileSync(join('public', 'data', 'index.json'), 'utf8')) as { books: Array<{ code: string; lang: string; verses: number[] }> };
  const lampasCounts: LampasVerses = Object.fromEntries(index.books.filter((b) => b.lang === 'hbo').map((b) => [b.code, b.verses]));
  const books = OLD_TESTAMENT.map(([code, name]) => {
    const greek = new Map<number, number[]>();
    for (const [key, verses] of swete.numbered) {
      const [book, chapter] = key.split(' ');
      if (book === code.toLowerCase()) greek.set(Number(chapter), [...verses]);
    }
    return sweepBook(code.toLowerCase(), name, greek, lampasCounts[lampasCodeOf(code.toLowerCase()) ?? ''] ?? [], maps, lampasCounts);
  });
  const text = sweepDoc(books);
  if (!existsSync(out) || readFileSync(out, 'utf8') !== text) writeFileSync(out, text);
  console.log(`${books.length} books: ${num(sum(books, (b) => b.greekUnpaired))} Greek verses with no Lampas verse, ${num(sum(books, (b) => b.lampasUnpaired))} Lampas verses with no Greek verse -> ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
