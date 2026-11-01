// scripts/lxx/english.ts — npm run lxx:english -- --book <code> (mw-u2w5klk.9, the Septuagint epic R1): prints a book of Brenton's English (LXX2012) verse by verse,
// each with the Greek reference it stands at, the Lampas reference(s) it answers and the state of that step, for R2 to consume:
//   psa 22:T = psa 22:1 -> psa 23:1 part
//   dan 3:24 = dan 3:91 -> dan 3:24 one
//   est 1:1 -> est 1:1 same [bracketed]
// States (scripts/data/tvtms.ts VerseState): same, one, range (the Greek verse is several Lampas verses), part (it is a part of one), none (no Lampas verse:
// the Additions, the Song of the Three, Jeremiah's verses the Hebrew lacks). `--book all` is the sweep: per book the verse count, the verses with no counterpart,
// the references a Lampas verse cannot take (the USFM has a reference TVTMS does not move into Lampas's numbering) and the Lampas verses no Brenton verse reaches.
// Options: --raw <dir> (default data/raw; the sources are fetched into <dir>/lxx/ unless present).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carriedAsGreek, ensureLxx2012, parseUsfm, usfmFileOf, type UsfmBook } from '../data/lxx2012';
import { buildMaps, ensureTvtms, parseTvtms, refOf, OT_BOOKS, type TvtmsMaps, type VerseState } from '../data/tvtms';

export interface ReportLine {
  /** the reference as the USFM numbers it (a Psalm's title is `T`) */
  usfm: string;
  /** the Greek references it stands at, when they differ from the USFM's */
  greek: string[];
  /** the Lampas references it answers; empty for `none` */
  lampas: string[];
  state: VerseState;
  /** the verse holds a bracketed Addition */
  bracketed: boolean;
}

const RANK: Record<VerseState, number> = { none: 0, same: 1, one: 2, part: 3, range: 4 };

/** Walks one verse's reference through the two maps: the USFM's to the Greek's, the Greek's to Lampas's. */
function walk(usfm: string, carried: string, maps: TvtmsMaps): Omit<ReportLine, 'bracketed'> {
  const first = maps.lxx2012ToGreek(carried);
  const greek = first.refs;
  const steps = greek.map((g) => maps.toLampas(g));
  const lampas = [...new Set(steps.flatMap((s) => s.refs))];
  let state: VerseState = 'none';
  if (first.state !== 'none' && lampas.length > 0) {
    state = lampas.length > 1 ? 'range' : [first.state, ...steps.map((s) => s.state)].sort((a, b) => RANK[b] - RANK[a])[0];
  }
  return { usfm, greek: greek.length === 1 && greek[0] === usfm ? [] : greek, lampas, state };
}

/** Every verse of the book (and each Psalm title) as a line, in the USFM's order. */
export function bookReport(book: UsfmBook, maps: TvtmsMaps): ReportLine[] {
  const lines: ReportLine[] = [];
  for (const chapter of book.chapters) {
    if (chapter.title !== undefined) {
      const ref = refOf(book.code, chapter.chapter, 'T');
      lines.push({ ...walk(ref, ref, maps), bracketed: false });
    }
    for (const verse of chapter.verses) {
      const g = carriedAsGreek(book.code, verse.chapter, verse.verse);
      const ref = refOf(book.code, verse.chapter, verse.verse);
      lines.push({ ...walk(ref, refOf(book.code, g.chapter, g.verse), maps), bracketed: verse.bracketed });
    }
  }
  return lines;
}

export function formatLine(line: ReportLine): string {
  const greek = line.greek.length > 0 ? ` = ${line.greek.join(', ')}` : '';
  const lampas = line.lampas.length > 0 ? line.lampas.join(', ') : '-';
  return `${line.usfm}${greek} -> ${lampas} ${line.state}${line.bracketed ? ' [bracketed]' : ''}`;
}

// ---------------------------------------------------------------- the sweep

export interface LampasVerses {
  [code: string]: number[];
}

const exists = (lampas: LampasVerses, ref: string): boolean => {
  const m = /^(\S+) (\d+):(\d+)$/.exec(ref);
  return !!m && (lampas[m[1]]?.[Number(m[2]) - 1] ?? 0) >= Number(m[3]);
};

export interface Sweep {
  code: string;
  /** verses in the USFM (a Psalm's title not counted) and the titles */
  verses: number;
  titles: number;
  /** lines with no Lampas counterpart */
  none: number;
  /** lines whose Lampas reference is not a verse of Lampas's book: a reference TVTMS does not move to Lampas's numbering */
  unknown: string[];
  /** Lampas verses with a Greek counterpart that no Brenton verse of the book reaches */
  unreached: string[];
}

export function sweepBook(book: UsfmBook, maps: TvtmsMaps, lampas: LampasVerses): Sweep {
  const lines = bookReport(book, maps);
  const reached = new Set<string>();
  const unknown: string[] = [];
  for (const line of lines) {
    for (const ref of line.lampas) {
      if (exists(lampas, ref)) reached.add(ref);
      else unknown.push(`${line.usfm} -> ${ref}`);
    }
  }
  // a Lampas verse is reached when a Brenton verse answers it; one whose Greek counterpart is `none` needs none
  const unreached: string[] = [];
  (lampas[book.code] ?? []).forEach((count, i) => {
    for (let v = 1; v <= count; v++) {
      const ref = refOf(book.code, i + 1, v);
      if (!reached.has(ref) && maps.toGreek(ref).state !== 'none') unreached.push(ref);
    }
  });
  const titles = book.chapters.filter((c) => c.title !== undefined).length;
  return {
    code: book.code,
    verses: lines.length - titles,
    titles,
    none: lines.filter((l) => l.state === 'none').length,
    unknown,
    unreached,
  };
}

export function formatSweep(s: Sweep, limit = 12): string {
  const some = (list: string[]): string => (list.length === 0 ? '' : ` [${list.slice(0, limit).join('; ')}${list.length > limit ? `; ... ${list.length - limit} more` : ''}]`);
  return `${s.code}: ${s.verses} verses${s.titles ? ` + ${s.titles} titles` : ''}, ${s.none} no counterpart, ${s.unknown.length} unknown to the map${some(s.unknown)}, ${s.unreached.length} Lampas verses with no Brenton verse${some(s.unreached)}`;
}

// ---------------------------------------------------------------- the command

function option(args: string[], name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const code = option(args, '--book');
  if (!code) throw new Error('usage: npm run lxx:english -- --book <code | all> [--raw <dir>]');
  const raw = resolve(option(args, '--raw', 'data/raw') as string);
  const maps = buildMaps(parseTvtms(readFileSync(await ensureTvtms(raw), 'utf8')));
  const dir = await ensureLxx2012(raw);
  const index = JSON.parse(readFileSync(resolve('public/data/index.json'), 'utf8')) as { books: Array<{ code: string; verses: number[]; lang?: string }> };
  const lampas: LampasVerses = Object.fromEntries(index.books.filter((b) => b.lang === 'hbo').map((b) => [b.code, b.verses]));
  const readBook = (c: string): UsfmBook | undefined => {
    const file = usfmFileOf(dir, c);
    return file ? parseUsfm(readFileSync(file, 'utf8')) : undefined;
  };
  if (code === 'all') {
    for (const c of OT_BOOKS) {
      const book = readBook(c);
      console.log(book ? formatSweep(sweepBook(book, maps, lampas)) : `${c}: no LXX2012 USFM`);
    }
    for (const p of maps.problems) console.log(`TVTMS: ${p}`);
    return;
  }
  const book = readBook(code);
  if (!book) throw new Error(`LXX2012 has no book ${code}`);
  for (const line of bookReport(book, maps)) console.log(formatLine(line));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
