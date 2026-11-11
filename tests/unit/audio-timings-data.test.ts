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
