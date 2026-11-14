// THE LOCK (mw-ar5k42b.3): no timings file of the recorded voice ships unjudged. For every book public/data/audio/msb-david/index.json lists (so every book David reads):
//   - scripts/audio-timings/judged/msb-david-<book>.json exists: the judge (scripts/audio-timings/judge.py, docs/audio-judge.md) has heard every verse of it;
//   - the report's sha256 is the timings file's: a number changed by hand, or a file made again and not judged again, fails here;
//   - the report was judged at the player's margin in force (scripts/audio-timings/player-slop.json);
//   - every flag in it is on that book's listen list (scripts/audio-timings/listen/msb-david-<book>.json): the edges the recording leaves no room for, which are for the
//     Governor's ear. A flag anywhere else is a fault of a cut, and the book does not ship with it.
// And the listen list cannot be padded to pass: an edge is on it only where the maker's own measure of the recording (scripts/audio-timings/quiet/) shows no room for the
// margin, and what it says the judge hears is the report's. Reads only committed files: no Python, no audio, no model runs in the gate.
// The way out of a failure is never an edit here: run the maker's cut pass, the judge, then the maker's listen pass (docs/data.md 'The cut rule'), or take the book out of index.json.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBookTimings, isTimingsIndex, TIMINGS_EDITION } from '../../src/data/audioTimings';
import { cutsPath, edgeOf, hasCutsFile, hasRoom, listenKey, readJudged, readListen, readQuiet, readSlop, type Boundary, type JudgeFlag } from '../support/audio-cuts';

const root = resolve(__dirname, '../..');
const index: unknown = JSON.parse(readFileSync(resolve(root, `public/data/audio/${TIMINGS_EDITION}/index.json`), 'utf8'));
if (!isTimingsIndex(index)) throw new Error('index fails its guard');
const slop = readSlop();

/** The most verses of John the listen list may hold (the story's bar: more means the cut rule is not right yet). */
const JOHN_MOST = 8;

describe('the lock: no timings file ships unjudged', () => {
  it('reads the player\'s margin from the one file', () => {
    expect(slop.lead).toBeGreaterThan(0);
    expect(slop.tail).toBeGreaterThan(0);
  });

  for (const book of Object.keys(index.books)) {
    describe(book, () => {
      const timingsPath = `public/data/audio/${TIMINGS_EDITION}/${book}.json`;
      const bytes = readFileSync(resolve(root, timingsPath));
      const timings: unknown = JSON.parse(bytes.toString('utf8'));
      if (!isBookTimings(timings)) throw new Error(`${timingsPath} fails its guard`);
      const judged = hasCutsFile('judged', book) ? readJudged(book) : null;
      const listen = readListen(book);
      const listed = new Map(listen.verses.map((entry) => [listenKey(entry.verse, entry.edge), entry]));

      /** The judge's flags of each edge it flagged, by 'chapter:verse edge'. */
      const flagged = new Map<string, JudgeFlag[]>();
      for (const [chapter, { verses }] of Object.entries(judged?.chapters ?? {})) {
        for (const verse of verses) {
          for (const flag of verse.flags ?? []) {
            const key = listenKey(`${chapter}:${verse.n}`, edgeOf(flag.kind));
            flagged.set(key, [...(flagged.get(key) ?? []), flag]);
          }
        }
      }

      it(`has a judged report (${cutsPath('judged', book)}): run judge.py --book ${book}, or take ${book} out of index.json`, () => {
        expect(judged, `${book} is in index.json and was never judged`).not.toBeNull();
        expect(judged).toMatchObject({ v: 1, edition: TIMINGS_EDITION, book });
      });

      it('was judged as it ships: the report\'s sha256 is the timings file\'s (a timings file changed since, by hand or by the maker, is judged again)', () => {
        expect(judged?.timings.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      });

      it('was judged at the player\'s margin in force (player-slop.json), and cut for it', () => {
        expect(judged?.slop).toEqual(slop);
        expect(listen.slop).toEqual(slop);
      });

      it('has a verdict for every verse of every chapter of the timings file', () => {
        expect(Object.keys(judged?.chapters ?? {})).toEqual(Object.keys(timings.chapters));
        for (const [chapter, timed] of Object.entries(timings.chapters)) {
          expect(judged?.chapters[chapter]?.verses.map((v) => v.n), `chapter ${chapter}`).toEqual(timed.verses.map(([n]) => n));
        }
        expect(judged?.summary.verses).toBe(Object.values(timings.chapters).reduce((sum, timed) => sum + timed.verses.length, 0));
      });

      it('has no flag outside its listen list: every edge the judge flags is one the recording leaves no room for', () => {
        expect(listen).toMatchObject({ v: 1, edition: TIMINGS_EDITION, book });
        const outside = [...flagged.entries()].filter(([key]) => !listed.has(key)).map(([key, flags]) => `${key}: ${flags.map((f) => f.kind).join(', ')}`);
        expect(outside).toEqual([]);
      });

      it('lists an edge only where the maker measured no room for the margin (or the judge heard another word than the text), each with its reason', () => {
        const quiet = hasCutsFile('quiet', book) ? readQuiet(book) : null;
        const unfounded: string[] = [];
        for (const entry of listen.verses) {
          expect(entry.reason.length, `${entry.verse} ${entry.edge}: the reason`).toBeGreaterThan(10);
          if (entry.edge === 'text') {
            if (!flagged.has(listenKey(entry.verse, 'text'))) unfounded.push(`${entry.verse} text: the judge has no text-differs there`);
            continue;
          }
          const [chapter, n] = entry.verse.split(':');
          const at = timings.chapters[chapter]?.verses.findIndex(([verse]) => verse === Number(n)) ?? -1;
          const rows: Boundary[] = quiet?.chapters[chapter] ?? [];
          const row = at < 0 ? undefined : rows[entry.edge === 'head' ? at : at + 1]; // boundary 0 is before the first verse
          if (!row) {
            unfounded.push(`${entry.verse} ${entry.edge}: no such boundary in the quiet file`);
            continue;
          }
          const [, died, onset] = row;
          const margin = entry.edge === 'head' ? slop.lead : slop.tail;
          const readsOn = died === null && onset === null && row.length === 4;
          const tight = died !== null && onset !== null && !hasRoom(died, onset, margin);
          const fileEnds = entry.edge === 'tail' && died !== null && onset === null && timings.chapters[chapter].duration - died < margin;
          if (!readsOn && !tight && !fileEnds) unfounded.push(`${entry.verse} ${entry.edge}: the quiet there is ${JSON.stringify(row)}, room enough for a margin of ${margin}`);
        }
        expect(unfounded).toEqual([]);
        expect(new Set(listen.verses.map((entry) => listenKey(entry.verse, entry.edge))).size, 'an edge is listed once').toBe(listen.verses.length);
      });

      it('says of each listed edge what the judge hears at the chosen cut: the report\'s own flags of it, or ok', () => {
        for (const entry of listen.verses) {
          expect(entry.judge, `${entry.verse} ${entry.edge}`).toEqual(flagged.get(listenKey(entry.verse, entry.edge)) ?? 'ok');
        }
      });

      it.skipIf(book !== 'jhn')(`John's listen list holds at most ${JOHN_MOST} verses`, () => {
        expect(new Set(listen.verses.map((entry) => entry.verse)).size).toBeLessThanOrEqual(JOHN_MOST);
      });
    });
  }
});
