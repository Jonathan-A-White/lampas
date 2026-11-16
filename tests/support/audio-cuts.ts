// What the two tests of the recorded voice's cuts share (mw-ar5k42b.3): the committed files of scripts/audio-timings/ read as data. No Python, no audio, no model.
//   player-slop.json                 the seconds David's player may be off by, the ONE file the maker, the judge and these tests read
//   player-margin.json               the player's measured margin (mw-ar5k42b.2): its inside.tail, how far BEFORE a verse's end it may stop, is read from it, never copied
//   quiet/<edition>-<book>.json      what the maker measured: the aligner's letters of each verse, and the quiet of each boundary by the recording's level
//   listen/<edition>-<book>.json     the listen list: the edges the recording leaves no room for, for the Governor's ear
//   judged/<edition>-<book>.json     the judge's report of the timings file, with the file's sha256
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TIMINGS_EDITION } from '../../src/data/audioTimings';

const root = resolve(__dirname, '../..');
const TOOLS = 'scripts/audio-timings';

export const cutsPath = (kind: 'quiet' | 'listen' | 'judged', book: string): string => `${TOOLS}/${kind}/${TIMINGS_EDITION}-${book}.json`;
export const hasCutsFile = (kind: 'quiet' | 'listen' | 'judged', book: string): boolean => existsSync(resolve(root, cutsPath(kind, book)));
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

export interface Slop {
  /** The seconds the player may start early or late. */
  lead: number;
  /** The seconds the player may stop late. */
  tail: number;
  /** The seconds the player may stop EARLY: it stops END_SLACK before the end after a FADE (player-margin.json inside.tail, mw-ar5k42b.9). */
  insideTail: number;
}

/** The player's worst case: lead and tail from the one file, the early stop from the measured margin (align.py and judge.py read_slop read the same). */
export function readSlop(): Slop {
  const raw = readJson(`${TOOLS}/player-slop.json`) as { lead: number; tail: number };
  const margin = readJson(`${TOOLS}/player-margin.json`) as { inside: { tail: number } };
  return { lead: raw.lead, tail: raw.tail, insideTail: margin.inside.tail };
}

/** An edge of a verse: its first sound, its last, or (a judge's `text-differs`) a word in its middle. */
export type Edge = 'head' | 'tail' | 'text';

export interface ListenEntry {
  /** 'chapter:verse'. */
  verse: string;
  edge: Edge;
  /** Why no cut is clean here, in words: the maker's, from the sound. */
  reason: string;
  /** The seconds of quiet the recording leaves at this edge (0: the narrator reads on). */
  room?: number;
  /** The second the edge was cut at. */
  cut?: number;
  /** What the judge hears at the chosen cut: 'ok', or its flags of this edge, copied from the judged report. */
  judge: 'ok' | JudgeFlag[];
}

export interface ListenFile {
  v: 1;
  edition: string;
  book: string;
  slop: Slop;
  verses: ListenEntry[];
}

/** The book's listen list; a book with none has no edges to listen to. */
export function readListen(book: string): ListenFile {
  if (!hasCutsFile('listen', book)) return { v: 1, edition: TIMINGS_EDITION, book, slop: readSlop(), verses: [] };
  return readJson(cutsPath('listen', book)) as ListenFile;
}

export const listenKey = (verse: string, edge: Edge): string => `${verse} ${edge}`;

export interface JudgeFlag {
  kind: 'head-extra' | 'head-clipped' | 'tail-extra' | 'tail-clipped' | 'text-differs';
  [more: string]: unknown;
}

export interface JudgedFile {
  v: 1;
  edition: string;
  book: string;
  timings: { file?: string; sha256: string };
  slop: Slop;
  summary: { verses: number; ok: number; flagged: number; flags: Record<string, number> };
  chapters: Record<string, { verses: Array<{ n: number; verdict: 'ok' | 'flagged'; flags?: JudgeFlag[] }> }>;
}

export const readJudged = (book: string): JudgedFile => readJson(cutsPath('judged', book)) as JudgedFile;

/** The edge a judge's flag is of. */
export const edgeOf = (kind: JudgeFlag['kind']): Edge => (kind === 'text-differs' ? 'text' : kind.startsWith('head') ? 'head' : 'tail');

/**
 * One boundary of a chapter as the maker measured it: `[the verse before it (0: before the first verse), the second the sound before it has died, the second the
 * sound after it begins]`. Either second is null where there is no sound on that side (nothing before the first verse; the file ends in quiet after the last).
 * Where the narrator reads on with no quiet both are null and a fourth number is the cut: the quietest instant between the two words.
 */
export type Boundary = [number, number | null, number | null] | [number, null, null, number];

export interface QuietFile {
  v: 2;
  edition: string;
  book: string;
  slop: Slop;
  /** By chapter: each verse as `[verse, the second its first letter starts, the second its last letter ends]`, the aligner's. */
  aligned: Record<string, Array<[number, number, number]>>;
  /** By chapter: its boundaries, one more than its verses. */
  chapters: Record<string, Boundary[]>;
}

export const readQuiet = (book: string): QuietFile => readJson(cutsPath('quiet', book)) as QuietFile;

const ms = (seconds: number): number => Math.round(seconds * 1000);
/** Seconds to the timings' two decimals, never below the value (in whole milliseconds, so 12.165 is 12.17 and 12.16 stays). */
export const up2 = (seconds: number): number => (Math.ceil(ms(seconds) / 10) * 10) / 1000;
/** Seconds to the timings' two decimals, never above the value. */
export const down2 = (seconds: number): number => (Math.floor(ms(seconds) / 10) * 10) / 1000;

/** Whether a quiet from `died` to `onset` holds an edge with the player's `slop` either side of it, to the timings' two decimals. */
export const hasRoom = (died: number, onset: number, slop: number): boolean => ms(up2(died + slop)) <= ms(down2(onset - slop));

/** One edge of a verse as the maker measured it: the quiet it lies in (`died` null: nothing sounds before; `onset` null: the file ends in the quiet), or the cut of a boundary read on through. */
export interface EdgeQuiet {
  died: number | null;
  onset: number | null;
  cut: number | null;
}

/** The quiet a verse's END lies in, from the boundary after it. Where something else is spoken between two verses (a heading), the row's fourth second is where that begins. */
export const tailQuiet = (row: Boundary): EdgeQuiet => (row.length === 4 ? { died: null, onset: null, cut: row[3] } : { died: row[1], onset: (row as number[])[3] ?? row[2], cut: null });
/** The quiet a verse's START lies in, from the boundary before it; the row's fifth second is where what is spoken between ends. */
export const headQuiet = (row: Boundary): EdgeQuiet => (row.length === 4 ? { died: null, onset: null, cut: row[3] } : { died: (row as number[])[4] ?? row[1], onset: row[2], cut: null });

/** Where the cut rule puts a verse's end (align.py place_end), and whether the recording leaves no room for the margin there, so the edge is on the listen list. */
export function ruledEnd(quiet: EdgeQuiet, duration: number, slop: Slop): { at: number; listed: boolean } {
  if (quiet.cut !== null) return { at: down2(quiet.cut), listed: true };
  if (quiet.died === null) throw new Error('a verse ends with no sound before its end');
  const wanted = up2(quiet.died + slop.tail);
  if (quiet.onset === null) return { at: Math.min(wanted, down2(duration)), listed: wanted > down2(duration) };
  if (hasRoom(quiet.died, quiet.onset, slop.tail)) return { at: wanted, listed: false };
  return { at: down2(Math.floor((ms(quiet.died) + ms(quiet.onset)) / 2) / 1000), listed: true };
}

/** Where the cut rule puts a verse's start (align.py place_start), and whether the recording leaves no room for the margin there. */
export function ruledStart(quiet: EdgeQuiet, slop: Slop): { at: number; listed: boolean } {
  if (quiet.cut !== null) return { at: down2(quiet.cut), listed: true };
  if (quiet.onset === null) throw new Error('a verse starts with no sound after its start');
  const wanted = Math.max(0, down2(quiet.onset - slop.lead));
  if (quiet.died === null || hasRoom(quiet.died, quiet.onset, slop.lead)) return { at: wanted, listed: false };
  return { at: up2(Math.ceil((ms(quiet.died) + ms(quiet.onset)) / 2) / 1000), listed: true };
}
