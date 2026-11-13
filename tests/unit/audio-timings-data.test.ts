// The committed verse timings of the recorded voice (mw-82lb97i.2): what scripts/audio-timings/align.py wrote under public/data/audio/msb-david/ holds the contract
// against the chapter files it was aligned to. Reads only committed files; no Python and no audio runs in the gate.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBookTimings, isTimingsIndex, TIMINGS_EDITION } from '../../src/data/audioTimings';

const root = resolve(__dirname, '../..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

/** The publisher's file name parts of each book that has timings: its number and three-letter code (MSB_<nn>_<Abc>_<ccc>_D.mp3). A book with timings and no line here fails its test. */
const FILE_NAME: Record<string, { nn: string; abc: string }> = { jhn: { nn: '43', abc: 'Jhn' } };

/** The most the recordings may run on after the last verse: a closing line of the narrator's, in seconds. */
const MAX_TAIL_SECONDS = 10;

interface ChapterFile {
  verses: { n: number }[];
}

const index = readJson(`public/data/audio/${TIMINGS_EDITION}/index.json`);

describe('the index of the recorded voice\'s timings', () => {
  it('passes its guard', () => {
    expect(isTimingsIndex(index)).toBe(true);
  });

  it('lists John with at most 2 of its 21 chapters left out (the others read in the phone voice)', () => {
    if (!isTimingsIndex(index)) throw new Error('index fails its guard');
    const john = index.books.jhn ?? [];
    expect(john.length).toBeGreaterThanOrEqual(19);
    expect(john.every((n) => n >= 1 && n <= 21)).toBe(true);
  });
});

describe('the timing files the index lists', () => {
  if (!isTimingsIndex(index)) throw new Error('index fails its guard');
  for (const [book, chapters] of Object.entries(index.books)) {
    describe(book, () => {
      const timings = readJson(`public/data/audio/${TIMINGS_EDITION}/${book}.json`);

      it('passes isBookTimings and holds exactly the chapters the index lists', () => {
        expect(isBookTimings(timings)).toBe(true);
        if (!isBookTimings(timings)) return;
        expect(timings.book).toBe(book);
        expect(Object.keys(timings.chapters).map(Number).sort((a, b) => a - b)).toEqual(chapters);
      });

      for (const chapter of chapters) {
        it(`chapter ${chapter}: the verses are the chapter file's, in order, each start < end, none overlapping, the last end near the duration, the audio the publisher's file`, () => {
          if (!isBookTimings(timings)) throw new Error('book file fails its guard');
          const timed = timings.chapters[String(chapter)];
          const text = readJson(`public/data/${book}/${chapter}.json`) as ChapterFile;
          expect(timed.verses.map(([n]) => n)).toEqual(text.verses.map((v) => v.n));
          let previousEnd = 0;
          for (const [n, start, end] of timed.verses) {
            expect(start, `verse ${n} starts before it ends`).toBeLessThan(end);
            expect(start, `verse ${n} starts after the verse before it ends`).toBeGreaterThanOrEqual(previousEnd);
            previousEnd = end;
          }
          expect(previousEnd).toBeLessThanOrEqual(timed.duration);
          expect(timed.duration - previousEnd, 'seconds the recording runs on after the last verse').toBeLessThanOrEqual(MAX_TAIL_SECONDS);
          const name = FILE_NAME[book];
          if (!name) throw new Error(`no publisher file name for book ${book}: add it to FILE_NAME`);
          expect(timed.audio).toBe(`https://openbible.com/audio/msb/MSB_${name.nn}_${name.abc}_${String(chapter).padStart(3, '0')}_D.mp3`);
        });
      }
    });
  }
});

// mw-82lb97i.27: his John 1:50 in David's voice still let the first 'th' of verse 51's 'Then' through. The narrator's recording is digital silence between two verses, and
// the gap pass of scripts/audio-timings/align.py measured each gap from the recording's energy (scripts/audio-timings/quiet/<edition>-<book>.json: for each verse but a
// chapter's last, the second its last sound has died away and the second the next verse's first sound begins). Each verse's end must lie IN that quiet, at its start
// (so a stop that comes late on a phone has the whole of the quiet before the next verse's sound) and never nearer than 50 ms to the next verse's first sound.
interface QuietFile {
  v: 1;
  edition: string;
  book: string;
  chapters: Record<string, Array<[number, number | null, number | null]>>;
}

/** The least quiet, in seconds, between a verse's end and the next verse's first sound. */
const MIN_BEFORE_ONSET = 0.05;
/** A verse ends this long after its last sound died away (align.py END_AFTER_SOUND), to the timings' two decimals. */
const END_AFTER_SOUND = 0.05;
const ROUNDING = 0.005 + 1e-9;

/** The verses the narrator reads on from into the next with no quiet at all (the sentence runs across the verse number): they keep the aligner's end, the next verse's start. A new one fails until it is listed here. */
const READS_ON: Record<string, string[]> = { jhn: ['2:9', '5:28', '9:18'] };

describe("each verse's end lies in the quiet before the next verse's first sound, by the recording's energy", () => {
  if (!isTimingsIndex(index)) throw new Error('index fails its guard');
  for (const book of Object.keys(index.books)) {
    const timings = readJson(`public/data/audio/${TIMINGS_EDITION}/${book}.json`);
    const quiet = readJson(`scripts/audio-timings/quiet/${TIMINGS_EDITION}-${book}.json`) as QuietFile;
    if (!isBookTimings(timings)) throw new Error('book file fails its guard');

    /** Every pair of a verse and the next: the verse's end, the next start, and what was measured of the gap between them. */
    const pairs = Object.entries(timings.chapters).flatMap(([chapter, timed]) => {
      const rows = new Map((quiet.chapters[chapter] ?? []).map((row) => [row[0], row]));
      return timed.verses.slice(0, -1).map(([n, , end], i) => ({ at: `${chapter}:${n}`, end, nextStart: timed.verses[i + 1][1], row: rows.get(n) }));
    });

    it(`${book}: every pair of verses was measured, and the quiet file is this book's`, () => {
      expect(quiet).toMatchObject({ v: 1, edition: TIMINGS_EDITION, book });
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs.filter((p) => !p.row).map((p) => p.at)).toEqual([]);
      expect(Object.keys(quiet.chapters)).toEqual(Object.keys(timings.chapters));
    });

    it(`${book}: only the listed verses are read on from with no quiet, and each of those ends where the next verse starts`, () => {
      const readsOn = pairs.filter((p) => p.row && p.row[1] === null);
      expect(readsOn.map((p) => p.at)).toEqual(READS_ON[book] ?? []);
      for (const p of readsOn) expect(p.end, p.at).toBe(p.nextStart);
    });

    it(`${book}: no verse's end is within 50 ms of the next verse's first sound (the sweep: zero)`, () => {
      const near = pairs.filter((p) => p.row && p.row[2] !== null && p.row[2] - p.end < MIN_BEFORE_ONSET - 1e-9);
      expect(near.map((p) => `${p.at} ends ${p.end}, the next verse sounds at ${p.row?.[2]}`)).toEqual([]);
    });

    it(`${book}: every end lies in the quiet, after the verse's last sound has died away and no more than 50 ms into it`, () => {
      const inSound: string[] = [];
      const deep: string[] = [];
      for (const p of pairs) {
        const [, quietStart, onset] = p.row ?? [0, null, null];
        if (quietStart === null || onset === null) continue;
        expect(quietStart, p.at).toBeLessThan(onset);
        if (p.end < quietStart - 1e-9) inSound.push(`${p.at} ends ${p.end}, its sound dies at ${quietStart}`);
        if (p.end > quietStart + END_AFTER_SOUND + ROUNDING) deep.push(`${p.at} ends ${p.end}, its sound dies at ${quietStart}`);
      }
      expect(inSound).toEqual([]);
      expect(deep).toEqual([]);
    });

    it(`${book}: John 1:50 ends in the quiet 0.4 s before the 'Then' of verse 51`, () => {
      if (book !== 'jhn') return;
      const pair = pairs.find((p) => p.at === '1:50');
      expect(pair?.row?.[2]).toBeCloseTo(371.66, 1);
      expect((pair?.row?.[2] ?? 0) - (pair?.end ?? 0)).toBeGreaterThanOrEqual(0.4);
    });
  }
});
