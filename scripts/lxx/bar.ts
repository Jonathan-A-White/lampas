// scripts/lxx/bar.ts — the bar a book of the Septuagint derivation must pass before its annotation file is written (docs/lxx-derivation.md, 'The bar';
// the probe's 'Error checks for the full run', 1; story mw-u2w5klk.4). The bar is data: the numbers below are the probe's, each with its reason, and
// `verdict` is the one place that holds a book against them, for lxx:release (which writes the file or refuses) and lxx:report (which says where every book stands).
import type { KnownScore } from './known';

export const BAR = {
  /** known-answer lemma, at least this share of a chapter's words: the probe's John 1 scored 99.9%, and a model that misses one word in a hundred
   * has made a mistake a reader could meet in every verse */
  knownLemma: 99,
  /** known-answer lemma and full parsing, at least: the probe's John 1 scored 99.5% on both (the parsing is where two cases share an ending) */
  knownParsing: 98,
  /** no word of the book left pending: a word with no answer is not an annotation, and the build fails while any waits for a choice (probe, check 4) */
  pending: 0,
  /** guesses (a model's own lemma and parsing where the candidates held none, or none of them fit, or that it marked a guess: choices.ts isGuess), at most this share of the
   * book's words: a guessed lemma is not a dictionary form until checked, and the app draws it with a mark and never quizzes it (probe, check 3). The Governor's answer
   * (2026-11-02, "A: Count only words with no candidate", mw-u2w5klk): a choice among the candidates of a name read from its own form (support `form`) is not a guess unless the
   * model marks it one, and is not counted; only a word no source gave a candidate is */
  guesses: 3,
  /** agreement breaks (a settled article, adjective or participle that does not agree with its settled noun), at most this many per 1,000 words (probe, check 2a) */
  breaks: 5,
} as const;

/** The chapter every build is held to: the probe's known answer, with the model's choices for it made without TAGNT's answers. */
export const ALWAYS_CHAPTER = 'Jhn.1';

/**
 * The other New Testament chapter of a build is taken from this list by the build number, so that no build is held to the same second chapter as the last.
 * Its book is hidden from layers 1 and 2 as John is, and its pending words need a choices file of their own (data/lxx/known/, scripts/lxx/known.ts):
 * a chapter with none scores its pending words as wrong and the build is NOT SHIPPABLE. No chapter of John: John 1 is already held.
 */
export const SECOND_CHAPTERS: readonly string[] = [
  'Rom.8', // the chapter the first model story (M0, mw-u2w5klk.7) measures
  'Mat.5',
  'Mrk.4',
  'Luk.15',
  'Act.2',
  '1Co.13',
  'Eph.2',
  'Php.2',
  'Heb.11',
  'Jas.2',
  '1Pe.1',
  'Rev.21',
];

/** The second known-answer chapter of build `build`: the build number counts round the list. */
export function secondChapter(build: number): string {
  const n = SECOND_CHAPTERS.length;
  return SECOND_CHAPTERS[((Math.trunc(build) % n) + n) % n];
}

/** The chapters a build is held to: John 1 and the build's second chapter. */
export const chaptersOf = (build: number): string[] => [ALWAYS_CHAPTER, secondChapter(build)];

/**
 * The known-answer chapters of a build, by which chapters have a choices file (data/lxx/known, `hasFile`): John 1 always, and the build's own second chapter when it has a file, else the
 * newest OTHER chapter of SECOND_CHAPTERS that has one (the last the list holds), and `note` says so; with no second chapter having a file, John 1 alone and the note says that. A missing
 * choices file alone fails no build (mw-u2w5klk.265: with two files of twelve, holding each build to its own second chapter would fail ten builds of twelve and nothing could ship).
 * The rotation stays the aim: once a chapter has its file, the builds that rotate to it are held to it.
 */
export function knownChaptersFor(build: number, hasFile: (chapter: string) => boolean): { chapters: string[]; note?: string } {
  const own = secondChapter(build);
  if (hasFile(own)) return { chapters: [ALWAYS_CHAPTER, own] };
  const used = [...SECOND_CHAPTERS].reverse().find((c) => c !== own && hasFile(c));
  const note = `second chapter ${own}: no choices file; ${used ? `${used} used` : 'no other second chapter has one'}`;
  return { chapters: used ? [ALWAYS_CHAPTER, used] : [ALWAYS_CHAPTER], note };
}

/** The build number: the patch of package.json's version ('0.7.55' is build 55), which each landed batch raises by one. */
export function buildNumber(version: string): number {
  const m = /^\d+\.\d+\.(\d+)/.exec(version);
  if (!m) throw new Error(`no build number in the version '${version}'`);
  return Number(m[1]);
}

/** What a book is held to besides the known-answer runs. */
export interface BookFigures {
  words: number;
  /** words with no answer after the choices */
  pending: number;
  /** words of layer 3 that are guesses */
  guesses: number;
  /** agreement breaks the check found in the settled words */
  breaks: number;
}

/** What a Greek chapter is held to: the figures of its own words (a book's, BookFigures, over all of them). */
export type ChapterFigures = BookFigures;

export type BarKey = 'known' | 'pending' | 'guesses' | 'breaks';

export interface Failure {
  key: BarKey;
  /** the whole line, with the bar: what lxx:release prints */
  line: string;
  /** the same briefly, for a table cell */
  short: string;
}

export interface Verdict {
  shippable: boolean;
  failures: Failure[];
}

const pct = (a: number, n: number): string => (n === 0 ? '0.0' : ((100 * a) / n).toFixed(1));
const perThousand = (k: number, n: number): string => (n === 0 ? '0.0' : ((1000 * k) / n).toFixed(1));

/** The known-answer lines a chapter fails. */
function knownFailures(s: KnownScore): Failure[] {
  const out: Failure[] = [];
  const from = s.choices.file ? '' : `, no choices file ${s.chapter.toLowerCase().replace('.', '-')}.tsv`;
  if (100 * s.all.lemma < BAR.knownLemma * s.words) {
    out.push({
      key: 'known',
      line: `known-answer ${s.chapter} lemma: ${pct(s.all.lemma, s.words)}% of ${s.words} words (the bar: at least ${BAR.knownLemma}%)${from}`,
      short: `${s.chapter} lemma ${pct(s.all.lemma, s.words)}%`,
    });
  }
  if (100 * s.all.full < BAR.knownParsing * s.words) {
    out.push({
      key: 'known',
      line: `known-answer ${s.chapter} full parsing: ${pct(s.all.full, s.words)}% of ${s.words} words (the bar: at least ${BAR.knownParsing}%)${from}`,
      short: `${s.chapter} parsing ${pct(s.all.full, s.words)}%`,
    });
  }
  return out;
}

/** A book held against the bar: each line it fails, in the order known answer, pending, guesses, breaks. Shippable when it fails none. */
export function verdict(book: BookFigures, known: readonly KnownScore[]): Verdict {
  const failures: Failure[] = known.flatMap(knownFailures);
  if (book.pending > BAR.pending) {
    failures.push({
      key: 'pending',
      line: `pending: ${book.pending} word${book.pending === 1 ? '' : 's'} left without an answer (the bar: none)`,
      short: `pending: ${book.pending}`,
    });
  }
  if (100 * book.guesses > BAR.guesses * book.words) {
    failures.push({
      key: 'guesses',
      line: `guesses: ${pct(book.guesses, book.words)}% of the book's words, ${book.guesses} of ${book.words} (the bar: at most ${BAR.guesses}%)`,
      short: `guesses: ${pct(book.guesses, book.words)}%`,
    });
  }
  if (1000 * book.breaks > BAR.breaks * book.words) {
    failures.push({
      key: 'breaks',
      line: `breaks: ${perThousand(book.breaks, book.words)} per 1,000 words, ${book.breaks} in ${book.words} (the bar: at most ${BAR.breaks})`,
      short: `breaks: ${perThousand(book.breaks, book.words)} per 1,000`,
    });
  }
  return { shippable: failures.length === 0, failures };
}

export interface ChapterVerdict extends Verdict {
  /** the chapter's guesses, a figure: never a failure (the guess line is the book's) */
  guesses: number;
  /** their share of the chapter's words, in percent */
  guessShare: number;
}

/**
 * One Greek chapter held against the chapter bar (docs/lxx-derivation.md, 'The chapter bar'; mw-u2w5klk.265): SHIPPABLE when no word of it is pending and its agreement breaks are at most BAR.breaks per
 * 1,000 of its words. Its guesses are counted and shown and never fail it: the line on guesses is the book's (`verdict`), as the Governor's answer of 2026-11-02 counts it. The known-answer lines are the
 * build's, not a chapter's: lxx:release holds them once for the whole run.
 */
export function chapterVerdict(chapter: ChapterFigures): ChapterVerdict {
  const failures: Failure[] = [];
  if (chapter.pending > BAR.pending) {
    failures.push({
      key: 'pending',
      line: `pending: ${chapter.pending} word${chapter.pending === 1 ? '' : 's'} left without an answer (the bar: none)`,
      short: `pending: ${chapter.pending}`,
    });
  }
  if (1000 * chapter.breaks > BAR.breaks * chapter.words) {
    failures.push({
      key: 'breaks',
      line: `breaks: ${perThousand(chapter.breaks, chapter.words)} per 1,000 words, ${chapter.breaks} in ${chapter.words} (the bar: at most ${BAR.breaks})`,
      short: `breaks: ${perThousand(chapter.breaks, chapter.words)} per 1,000`,
    });
  }
  return { shippable: failures.length === 0, failures, guesses: chapter.guesses, guessShare: chapter.words === 0 ? 0 : (100 * chapter.guesses) / chapter.words };
}
