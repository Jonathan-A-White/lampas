// scripts/lxx/versesets.ts — npx tsx scripts/lxx/versesets.ts [--book <code>] [--raw <dir>] (mw-u2w5klk.286): the verse-set sweep of Brenton's English (LXX2012) against Swete's Greek.
// For every chapter of every LXX2012 book it walks each Brenton verse through tvtms.ts `lxx2012ToGreek` (the first Greek verse it stands at) and compares the Greek verses reached with the
// verses of Swete's chapter, printing the chapters where they differ, one line each:
//   gen 22: Brenton lands where Swete has no verse [], at a numbered verse with no word [], Swete verses with no English [16]
// - lands where Swete has no verse: Brenton's verse stands at a number Swete's chapter lacks (the map says 'same' for a chapter the two texts divide differently);
// - at a numbered verse with no word: Swete's file numbers the verse and puts no word under it (Gen 31:51, mw-u2w5klk.282); the ship note names the Brenton verse unplaced;
// - Swete verses with no English: no Brenton verse stands at it (a verse Brenton has inside the verse before it, or has not at all); the ship note names it (withoutEnglishNote).
// It finds a verse set that differs, not a shift of the same size (a verse merged here and split there), so it is a floor for the map, never the proof of it. Nothing is written.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carriedAsGreek, ensureLxx2012, parseUsfm, type UsfmBook } from '../data/lxx2012';
import { buildMaps, ensureTvtms, parseTvtms, refOf, type TvtmsMaps } from '../data/tvtms';
import { SWETE, SWETE_VERSIFICATION, SWETE_WORDS, pinnedPath } from './sources';
import { sweteTokens } from './swete';

/** Swete's verses by chapter reference (`gen 22`): the numbered ones (his versification file) and those with a word under them. */
export interface SweteVerses {
  numbered: ReadonlyMap<string, ReadonlySet<number>>;
  withWords: ReadonlyMap<string, ReadonlySet<number>>;
}

export interface ChapterGap {
  /** `gen 22` */
  chapter: string;
  /** Greek verses a Brenton verse stands at that Swete's chapter does not number */
  noSuchVerse: number[];
  /** Greek verses a Brenton verse stands at that Swete numbers with no word under it */
  noWord: number[];
  /** Swete's verses with words that no Brenton verse stands at */
  noEnglish: number[];
}

const add = (map: Map<string, Set<number>>, key: string, verse: number): void => {
  const set = map.get(key);
  if (set) set.add(verse);
  else map.set(key, new Set([verse]));
};

/** Swete's verses from the pinned versification and word files (their text). The book code is Swete's lower-case code (`sol`, not `sng`). */
export function sweteVerses(versification: string, words: string): SweteVerses {
  const numbered = new Map<string, Set<number>>();
  for (const line of versification.split(/\r?\n/)) {
    const m = /^\d+\t(\w+)\.(\d+):(\d+)$/.exec(line);
    if (m) add(numbered, `${m[1].toLowerCase()} ${m[2]}`, Number(m[3]));
  }
  const withWords = new Map<string, Set<number>>();
  for (const w of sweteTokens(versification, words).words) {
    const m = /^(\w+)\.(\d+):(\d+)$/.exec(w.verse);
    if (m) add(withWords, `${m[1].toLowerCase()} ${m[2]}`, Number(m[3]));
  }
  return { numbered, withWords };
}

/** Where Swete's code for a book is not the LXX2012's (`sol` for `sng`, and three more). */
const SWETE_CODE: Readonly<Record<string, string>> = { sng: 'sol', jol: 'joe', ezk: 'eze', nam: 'nah' };

/** The chapters of a book where the Greek verses Brenton's verses stand at are not Swete's verses; a Psalm's title (Greek verse 1) counts like any verse. */
export function verseSetGaps(book: UsfmBook, maps: TvtmsMaps, swete: SweteVerses): ChapterGap[] {
  const sweteCode = SWETE_CODE[book.code] ?? book.code;
  const reached = new Map<string, Set<number>>();
  const reach = (refs: readonly string[]): void => {
    for (const ref of refs) {
      const m = /^(\S+) (\d+):(\d+)$/.exec(ref);
      if (m) add(reached, `${m[1]} ${m[2]}`, Number(m[3]));
    }
  };
  for (const chapter of book.chapters) {
    if (chapter.title !== undefined) reach(maps.lxx2012ToGreek(refOf(book.code, chapter.chapter, 'T')).refs);
    for (const verse of chapter.verses) {
      for (let n = verse.verse; n <= (verse.through ?? verse.verse); n++) {
        const g = carriedAsGreek(book.code, verse.chapter, n);
        reach(maps.lxx2012ToGreek(refOf(book.code, g.chapter, g.verse)).refs);
      }
    }
  }
  const chapters = new Set<string>([...reached.keys(), ...[...swete.withWords.keys()].filter((k) => k.startsWith(`${sweteCode} `)).map((k) => `${book.code} ${k.split(' ')[1]}`)]);
  const byNumber = (a: number, b: number): number => a - b;
  const gaps: ChapterGap[] = [];
  for (const chapter of [...chapters].sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1]))) {
    const key = `${sweteCode} ${chapter.split(' ')[1]}`;
    const numbered = swete.numbered.get(key) ?? new Set<number>();
    const words = swete.withWords.get(key) ?? new Set<number>();
    const got = reached.get(chapter) ?? new Set<number>();
    const gap: ChapterGap = {
      chapter,
      noSuchVerse: [...got].filter((v) => !numbered.has(v)).sort(byNumber),
      noWord: [...got].filter((v) => numbered.has(v) && !words.has(v)).sort(byNumber),
      noEnglish: [...words].filter((v) => !got.has(v)).sort(byNumber),
    };
    if (gap.noSuchVerse.length || gap.noWord.length || gap.noEnglish.length) gaps.push(gap);
  }
  return gaps;
}

export const formatGap = (g: ChapterGap): string =>
  `${g.chapter}: Brenton lands where Swete has no verse [${g.noSuchVerse}], at a numbered verse with no word [${g.noWord}], Swete verses with no English [${g.noEnglish}]`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const i = args.indexOf('--raw');
  const raw = resolve(i >= 0 ? args[i + 1] : 'data/raw');
  const only = args.indexOf('--book') >= 0 ? args[args.indexOf('--book') + 1] : undefined;
  const maps = buildMaps(parseTvtms(readFileSync(await ensureTvtms(raw), 'utf8')));
  const dir = await ensureLxx2012(raw);
  const pinned = resolve(raw, 'lxx');
  const swete = sweteVerses(readFileSync(pinnedPath(pinned, SWETE, SWETE_VERSIFICATION), 'utf8'), readFileSync(pinnedPath(pinned, SWETE, SWETE_WORDS), 'utf8'));
  let chapters = 0;
  let differing = 0;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.usfm')) continue;
    const book = parseUsfm(readFileSync(resolve(dir, file), 'utf8'));
    if (!book.code || book.chapters.length === 0 || (only && book.code !== only)) continue;
    const gaps = verseSetGaps(book, maps, swete);
    chapters += book.chapters.length;
    differing += gaps.length;
    for (const gap of gaps) console.log(formatGap(gap));
  }
  console.log(`${differing} of ${chapters} LXX2012 chapters have a verse set that differs from Swete's`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
