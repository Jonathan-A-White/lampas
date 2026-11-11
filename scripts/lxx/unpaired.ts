// scripts/lxx/unpaired.ts — npm run lxx:unpaired [-- --book <code>] [--no-morpheus] (story mw-u2w5klk.349.1; docs/lxx-align.md, 'The unpaired English')
// The sweep of the pairing epic (mw-u2w5klk.349, the Governor's report of 2026-11-10: "I tap 'removed' and get this", Genesis 20:1): per Septuagint book and chapter the ship ships, how many of the
// English CONTENT words of Brenton's English sit where a tap opens no Greek word. It runs the same ship as `npm run lxx:align` (the choices, the model pass's files under data/lxx/align) into a temporary
// directory and reads the chapters that ship wrote, so it counts what the Reader is given. A word is unpaired when it is in
//   - a remainder chunk (y 'align?': the aligner could not pair it and no model session has cut it), or
//   - a chunk with no Greek word that is not the model's (g empty; septuagintChunkLinked is false), the tap that opens the Verse view;
// and a function word (one list, FUNCTION_WORDS) is never counted. English the model pass settled as rendering no Greek (a model chunk, y 'model', with g empty: the supplied 'there', 'of' after a noun
// in the genitive) is counted apart as 'No Greek by the model': it is a settled answer, not a gap. This command REPORTS and does not fail on a gap; a later story makes a gap a failing test once the batches
// have finished a book. Network only as the ship fetches the pinned sources; no paid API is called.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Chapter, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { lettersOf } from './align';
import { OLD_TESTAMENT } from './report';
import type { ShipOptions } from './ship';

/**
 * The English words that are not counted: articles, conjunctions, prepositions, pronouns, the verbs 'to be', 'to have' and 'to do' (and their auxiliaries), and the particles Brenton's English is
 * stitched with. Lower case letters only, as `lettersOf` makes a token. One list; tests/unit/lxx-unpaired.test.ts holds it. Brenton's archaic forms (thou, thy, hath, unto) are in it.
 */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set(
  (
    'a an the and or nor but yet so for if then than that this these those such as ' +
    'of in on upon to from by with into onto unto over under above below before after at about against among between through toward towards within without out up down off ' +
    'i me my mine myself we us our ours ourselves you your yours yourself ye thou thee thy thine thyself he him his himself she her hers herself it its itself they them their theirs themselves ' +
    'who whom whose which what whatsoever whosoever whomsoever whichsoever when whence where whither while whereas wherefore ' +
    'be am is are was were been being let shall will would should may might can could must ' +
    'have has had hath having do does did doth done ' +
    'not no there here now also even yea yes thus all any each every both either neither some ' +
    'o oh lo behold ah'
  ).split(' '),
);

/** The content words of a piece of English: its tokens, as lower case letters (the possessive 's and the marks gone), without the function words. */
export function contentWordsOf(text: string): string[] {
  return text
    .split(/\s+/)
    .map(lettersOf)
    .filter((w) => w.length > 0 && !FUNCTION_WORDS.has(w));
}

/** The count for a verse, a chapter or a book. */
export interface UnpairedCount {
  /** the English content words in all */
  content: number;
  /** the content words in a remainder chunk or a chunk with no Greek word: the gaps */
  gaps: number;
  /** the content words in a model chunk with no Greek word: the model settled that they render none */
  model: number;
}

/** Counts a verse: each chunk's content words go to the gaps where a tap on it opens no word and the model did not settle it, to `model` where the model did, and to neither where it is paired. */
export function countVerse(verse: Verse): UnpairedCount {
  const count: UnpairedCount = { content: 0, gaps: 0, model: 0 };
  for (const chunk of verse.e) {
    const words = contentWordsOf(chunk.t).length;
    count.content += words;
    if (septuagintChunkLinked(chunk)) continue;
    if (chunk.y === 'model') count.model += words;
    else count.gaps += words;
  }
  return count;
}

export function countChapter(chapter: Chapter): UnpairedCount {
  const count: UnpairedCount = { content: 0, gaps: 0, model: 0 };
  for (const verse of chapter.verses) {
    const c = countVerse(verse);
    count.content += c.content;
    count.gaps += c.gaps;
    count.model += c.model;
  }
  return count;
}

/** One chapter of the table. */
export interface UnpairedRow extends UnpairedCount {
  /** Swete's code, lower case */
  code: string;
  book: string;
  chapter: number;
}

const pct = (part: number, whole: number): string => (whole === 0 ? '—' : `${((100 * part) / whole).toFixed(1)}%`);
const num = (n: number): string => n.toLocaleString('en-US');

/** The table as text: a row for each chapter, the book's total after its chapters, books in the order of the Old Testament's list; the last line sums all. */
export function renderUnpaired(rows: readonly UnpairedRow[]): string {
  const order = (code: string): number => {
    const at = OLD_TESTAMENT.findIndex(([c]) => c.toLowerCase() === code);
    return at < 0 ? OLD_TESTAMENT.length : at;
  };
  const sorted = [...rows].sort((a, b) => order(a.code) - order(b.code) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0) || a.chapter - b.chapter);
  const table: string[][] = [['Book', 'Chapter', 'English content words', 'Unpaired', 'No Greek by the model', 'Share']];
  const line = (book: string, chapter: string, c: UnpairedCount): string[] => [book, chapter, num(c.content), num(c.gaps), num(c.model), pct(c.gaps, c.content)];
  const sum = (list: readonly UnpairedCount[]): UnpairedCount => list.reduce((a, c) => ({ content: a.content + c.content, gaps: a.gaps + c.gaps, model: a.model + c.model }), { content: 0, gaps: 0, model: 0 });
  const books = new Map<string, UnpairedRow[]>();
  for (const r of sorted) books.set(r.code, [...(books.get(r.code) ?? []), r]);
  for (const list of books.values()) {
    for (const r of list) table.push(line(r.book, String(r.chapter), r));
    table.push(line(list[0].book, 'total', sum(list)));
  }
  const widths = table[0].map((_, i) => Math.max(...table.map((r) => r[i].length)));
  // text on the left, numbers on the right
  const text = table.map((r) => r.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]))).join('  '));
  const total = sum(rows);
  const chapters = `${rows.length} chapter${rows.length === 1 ? '' : 's'} in ${books.size} book${books.size === 1 ? '' : 's'}`;
  return [text[0], '-'.repeat(text[0].length), ...text.slice(1), '', `${chapters}: ${num(total.content)} English content words, ${num(total.gaps)} unpaired (${pct(total.gaps, total.content)}), ${num(total.model)} settled by the model as rendering no Greek.`].join('\n');
}

// ---------------------------------------------------------------- the command

const USAGE = 'usage: npm run lxx:unpaired [-- --book <code>] [--no-morpheus]';

export interface UnpairedArgs {
  /** only this book, Swete's code in lower case */
  book?: string;
  /** read the Morpheus caches (default); `--no-morpheus` leaves them off */
  morpheus: boolean;
}

export function parseUnpairedArgs(argv: readonly string[]): UnpairedArgs {
  const args: UnpairedArgs = { morpheus: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-morpheus') args.morpheus = false;
    else if (argv[i] === '--book') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(USAGE);
      args.book = value.toLowerCase();
    } else throw new Error(USAGE);
  }
  return args;
}

/** Ships into a temporary directory (as `lxx:align` does), counts every chapter it shipped, and prints the table through `log`; returns the rows. A gap is reported, never an error. */
export async function runUnpaired(argv: readonly string[], options: ShipOptions = {}): Promise<UnpairedRow[]> {
  const { log = () => undefined, scratch = tmpdir(), ...ship } = options;
  const args = parseUnpairedArgs(argv);
  const books = (ship.books ?? OLD_TESTAMENT).filter(([code]) => args.book === undefined || code.toLowerCase() === args.book);
  if (books.length === 0) throw new Error(`no book '${args.book}' in the Old Testament's list; ${USAGE}`);
  const dir = mkdtempSync(join(scratch, 'lampas-lxx-unpaired-'));
  try {
    // ship.ts reaches align.ts through the build, so it is loaded when it is needed
    const { runShip } = await import('./ship');
    const shipped = await runShip(['--out', dir, ...(args.morpheus ? [] : ['--no-morpheus'])], { ...ship, books, scratch });
    const rows = shipped.aligned.map((share): UnpairedRow => {
      const chapter = JSON.parse(readFileSync(join(dir, share.code, `${share.chapter}.json`), 'utf8')) as Chapter;
      return { code: share.code, book: share.book, chapter: share.chapter, ...countChapter(chapter) };
    });
    log(renderUnpaired(rows));
    return rows;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runUnpaired(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
