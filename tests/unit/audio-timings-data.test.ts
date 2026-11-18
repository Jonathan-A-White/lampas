// The committed verse timings of the recorded voice (mw-82lb97i.2): what scripts/audio-timings/align.py wrote under public/data/audio/msb-david/ holds the contract
// against the chapter files it was aligned to, and to the cut rule (mw-ar5k42b.3). Reads only committed files; no model and no audio runs in the gate.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBookTimings, isTimingsIndex, TIMINGS_EDITION } from '../../src/data/audioTimings';
import { headQuiet, listenKey, readListen, readQuiet, readSlop, ruledEnd, ruledStart, tailQuiet } from '../support/audio-cuts';

const root = resolve(__dirname, '../..');
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

/**
 * The publisher's file name parts of each book: its number and three-letter code (MSB_<nn>_<Abc>_<ccc>_D.mp3). The one table is align.py's BOOKS (read from the publisher's
 * own file names, docs/data.md 'The book table'); the timing maker writes the audio address from it, so the test reads the same table and checks the files against it.
 */
const ALIGN = 'scripts/audio-timings/align.py';
const alignSource = readFileSync(resolve(root, ALIGN), 'utf8');
const FILE_NAME: Record<string, { nn: string; abc: string }> = {};
for (const [, code, nn, abc] of (alignSource.match(/^BOOKS = \{[\s\S]*?^\}/m)?.[0] ?? '').matchAll(/'(\w+)': \((\d+), '(\w+)'\)/g)) {
  FILE_NAME[code] = { nn: nn.padStart(2, '0'), abc };
}

/** The most the recordings may run on after the last verse: a closing line of the narrator's, in seconds. */
const MAX_TAIL_SECONDS = 10;

interface ChapterFile {
  verses: { n: number }[];
}

const index = readJson(`public/data/audio/${TIMINGS_EDITION}/index.json`);

describe("align.py's book table", () => {
  const books = (readJson('public/data/index.json') as { books: { code: string; chapters: number }[] }).books;

  it('holds all 66 Lampas books, in the canon\'s order, numbered 1 to 66 as the publisher numbers them', () => {
    expect(books).toHaveLength(66);
    expect(Object.keys(FILE_NAME)).toEqual(books.map((b) => b.code));
    expect(Object.values(FILE_NAME).map((f) => Number(f.nn))).toEqual(books.map((_, i) => i + 1));
  });

  it('gives each book its publisher\'s three-letter code (Titus is Tts there, not Tit)', () => {
    for (const [code, { abc }] of Object.entries(FILE_NAME)) expect(abc, code).toMatch(/^[1-3]?[A-Za-z]{2,3}$/);
    expect(FILE_NAME.tit).toEqual({ nn: '56', abc: 'Tts' });
    expect(FILE_NAME.jhn).toEqual({ nn: '43', abc: 'Jhn' });
    expect(FILE_NAME.psa).toEqual({ nn: '19', abc: 'Psa' });
  });
});

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

  it('lists Genesis, every chapter of its 50 timed but those left out (named in the story\'s closing comment)', () => {
    if (!isTimingsIndex(index)) throw new Error('index fails its guard');
    const genesis = index.books.gen ?? [];
    expect(genesis.length).toBeGreaterThanOrEqual(45);
    expect(genesis.every((n) => n >= 1 && n <= 50)).toBe(true);
  });

  it('lists only books of the table, with chapters the book has', () => {
    if (!isTimingsIndex(index)) throw new Error('index fails its guard');
    const books = new Map((readJson('public/data/index.json') as { books: { code: string; chapters: number }[] }).books.map((b) => [b.code, b.chapters]));
    for (const [book, chapters] of Object.entries(index.books)) {
      expect(FILE_NAME[book], `${book} has no line in align.py's BOOKS`).toBeDefined();
      expect(chapters.every((n) => n >= 1 && n <= (books.get(book) ?? 0)), book).toBe(true);
    }
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
          if (!name) throw new Error(`no publisher file name for book ${book}: add it to align.py's BOOKS`);
          expect(timed.audio).toBe(`https://openbible.com/audio/msb/MSB_${name.nn}_${name.abc}_${String(chapter).padStart(3, '0')}_D.mp3`);
        });
      }
    });
  }
});

// THE CUT RULE (mw-ar5k42b.3; docs/data.md 'The cut rule'). Both edges of every verse are placed from the recording's level, with the player's margin
// (scripts/audio-timings/player-slop.json). The maker keeps what it measured in scripts/audio-timings/quiet/<edition>-<book>.json: `aligned`, the aligner's letters of
// each verse, and `chapters`, each chapter's boundaries (one more than its verses: before the first, between each two, after the last) as
// [the verse before, the second the sound before has died, the second the sound after begins]. These tests hold every committed timing to the rule by that measure,
// so a number changed by hand fails here as well as at the lock (tests/unit/audio-judged.test.ts). The story folds in mw-82lb97i.27 (John 1:50 let the 'th' of verse 51
// through), mw-82lb97i.41 (John 2:9 alone ended with 'and s') and mw-82lb97i.36 (four verses started after their own first sound).
const slop = readSlop();
const thousandths = (seconds: number): number => Math.round(seconds * 1000);
/** The most the maker moves an edge when it rounds to the timings' two decimals: the end up, the start down. */
const ROUNDING_MS = 10;

describe("the cut rule: both edges of every verse lie where the recording's level and the player's margin put them", () => {
  if (!isTimingsIndex(index)) throw new Error('index fails its guard');
  for (const book of Object.keys(index.books)) {
    const timings = readJson(`public/data/audio/${TIMINGS_EDITION}/${book}.json`);
    const quiet = readQuiet(book);
    if (!isBookTimings(timings)) throw new Error('book file fails its guard');
    const listen = readListen(book);
    const onList = new Set(listen.verses.map((entry) => listenKey(entry.verse, entry.edge)));

    /** Every verse with the quiet at each of its edges, and the verse after it. */
    const verses = Object.entries(timings.chapters).flatMap(([chapter, timed]) => {
      const rows = quiet.chapters?.[chapter] ?? [];
      return timed.verses.map(([n, start, end], i) => ({
        at: `${chapter}:${n}`,
        chapter,
        first: i === 0,
        start,
        end,
        duration: timed.duration,
        next: timed.verses[i + 1] as [number, number, number] | undefined,
        head: rows[i] ? headQuiet(rows[i]) : undefined,
        tail: rows[i + 1] ? tailQuiet(rows[i + 1]) : undefined,
      }));
    });
    const pairs = verses.filter((v) => v.next);

    it(`${book}: the quiet file is this book's, cut at the player's margin in force, with the aligner's letters and every boundary of every chapter`, () => {
      expect(quiet).toMatchObject({ v: 2, edition: TIMINGS_EDITION, book, slop });
      expect(Object.keys(quiet.chapters)).toEqual(Object.keys(timings.chapters));
      expect(Object.keys(quiet.aligned)).toEqual(Object.keys(timings.chapters));
      for (const [chapter, timed] of Object.entries(timings.chapters)) {
        expect(quiet.chapters[chapter].map((row) => row[0]), `chapter ${chapter}: a boundary before the first verse and one after each`).toEqual([0, ...timed.verses.map(([n]) => n)]);
        expect(quiet.aligned[chapter].map((row) => row[0]), `chapter ${chapter}: the letters of each verse`).toEqual(timed.verses.map(([n]) => n));
      }
    });

    it(`${book}: every verse's END is where the rule puts it: the tail slop after its last sound has died; the middle of a quiet too short for the margin; the quietest instant where the narrator reads on`, () => {
      const wrong = verses.filter((v) => !v.tail || v.end !== ruledEnd(v.tail, v.duration, slop).at).map((v) => `${v.at} ends ${v.end}, the rule says ${v.tail ? ruledEnd(v.tail, v.duration, slop).at : 'nothing: no boundary'}`);
      expect(wrong).toEqual([]);
    });

    it(`${book}: every verse's START is where the rule puts it: the lead slop before its first sound begins; the middle of a quiet too short for the margin; the quietest instant where the narrator reads on`, () => {
      const wrong = verses.filter((v) => !v.head || v.start !== ruledStart(v.head, slop).at).map((v) => `${v.at} starts ${v.start}, the rule says ${v.head ? ruledStart(v.head, slop).at : 'nothing: no boundary'}`);
      expect(wrong).toEqual([]);
    });

    it(`${book}: each verse's start is at or before its first sound (mw-82lb97i.36), and by the lead slop wherever it is not on the listen list`, () => {
      const firstSound = (v: (typeof verses)[number]): number => v.head?.cut ?? v.head?.onset ?? Number.NaN;
      expect(verses.filter((v) => !(v.start <= firstSound(v) + 1e-9)).map((v) => `${v.at} starts ${v.start}, its first sound is at ${firstSound(v)}`)).toEqual([]);
      const near = verses.filter((v) => !onList.has(listenKey(v.at, 'head')) && thousandths(firstSound(v)) - thousandths(v.start) < thousandths(slop.lead) && v.start > 0);
      expect(near.map((v) => `${v.at} starts ${v.start}, its first sound is at ${firstSound(v)}`)).toEqual([]);
    });

    it(`${book}: no verse's clip, started the lead slop early, holds the last sound of the verse before or of the announcement, unless it is on the listen list`, () => {
      const holds = verses.filter((v) => !onList.has(listenKey(v.at, 'head')) && v.head?.died != null && thousandths(v.start) - thousandths(slop.lead) < thousandths(v.head.died));
      expect(holds.map((v) => `${v.at} starts ${v.start}, the sound before it dies at ${v.head?.died}`)).toEqual([]);
      // verse 1 of every chapter: the announcement ('Audio Bible, John, chapter one') has died before its clip at its longest begins
      const firsts = verses.filter((v) => v.first);
      expect(firsts.length).toBe(Object.keys(timings.chapters).length);
      for (const v of firsts) expect(v.head?.died ?? -1, `${v.at}: the announcement's last sound`).toBeLessThanOrEqual(v.start - slop.lead);
    });

    it(`${book}: no verse's end is after the next verse's start (mw-82lb97i.41)`, () => {
      expect(pairs.filter((v) => v.next && v.end > v.next[1]).map((v) => `${v.at} ends ${v.end}, the next verse starts ${v.next?.[1]}`)).toEqual([]);
    });

    it(`${book}: no verse's end is within the tail slop of the next verse's start, unless it is on the listen list (mw-82lb97i.41)`, () => {
      // Both edges keep their own margin only in a quiet of tail + tail + lead or more; in a shorter one that still has room (none in John or Genesis) the end is
      // held to the next verse's first SOUND instead, which is what the margin is for.
      // The maker rounds the end UP and the start DOWN to the timings' two decimals, each by up to 10 ms, so a quiet within 20 ms of that (Leviticus 11:29: 150 ms,
      // end 202.79, start 202.83) is short too: its end keeps its own margin to the first sound, and the start keeps its own (mw-zbgo4ep.48).
      const near: string[] = [];
      for (const v of pairs) {
        if (onList.has(listenKey(v.at, 'tail')) || !v.next || !v.tail) continue;
        const { died, onset } = v.tail;
        const short = died !== null && onset !== null && thousandths(onset) - thousandths(died) < thousandths(2 * slop.tail + slop.lead) + 2 * ROUNDING_MS;
        const limit = short && onset !== null ? onset : v.next[1];
        if (thousandths(limit) - thousandths(v.end) < thousandths(slop.tail)) near.push(`${v.at} ends ${v.end}, the next verse ${short ? 'sounds' : 'starts'} at ${limit}`);
      }
      expect(near).toEqual([]);
    });

    it(`${book}: no verse's end is within the tail slop of the next sound, and none is before its own last sound has died by the tail slop, unless it is on the listen list`, () => {
      const wrong: string[] = [];
      for (const v of verses) {
        if (onList.has(listenKey(v.at, 'tail')) || !v.tail || v.tail.died === null) continue;
        if (thousandths(v.end) - thousandths(slop.tail) < thousandths(v.tail.died)) wrong.push(`${v.at} ends ${v.end}, its last sound dies at ${v.tail.died}`);
        if (v.tail.onset !== null && thousandths(v.end) + thousandths(slop.tail) > thousandths(v.tail.onset)) wrong.push(`${v.at} ends ${v.end}, the next sound begins at ${v.tail.onset}`);
      }
      expect(wrong).toEqual([]);
    });

    it(`${book}: the listen list holds every edge the recording leaves no room for, by the maker's measure`, () => {
      const missing: string[] = [];
      for (const v of verses) {
        if (v.tail && ruledEnd(v.tail, v.duration, slop).listed && !onList.has(listenKey(v.at, 'tail'))) missing.push(`${v.at} tail`);
        if (v.head && ruledStart(v.head, slop).listed && !onList.has(listenKey(v.at, 'head'))) missing.push(`${v.at} head`);
      }
      expect(missing).toEqual([]);
    });

    it.skipIf(book !== 'jhn')("John 1:50 ends in the quiet 0.4 s before the 'Then' of verse 51 (mw-82lb97i.27)", () => {
      const verse = verses.find((v) => v.at === '1:50');
      expect(verse?.tail?.onset).toBeCloseTo(371.66, 1);
      expect((verse?.tail?.onset ?? 0) - (verse?.end ?? 0)).toBeGreaterThanOrEqual(0.4);
    });

    it.skipIf(book !== 'jhn')("John 2:9 ends at the quietest instant between 'aside' and the 'and' of verse 10, where the narrator reads on (mw-82lb97i.41: it ended 30 ms later, in 'and')", () => {
      const verse = verses.find((v) => v.at === '2:9');
      expect(verse?.tail?.cut).toBeCloseTo(71.41, 2);
      expect(verse?.end).toBe(71.41);
      expect(verse?.next?.[1]).toBe(71.41);
      expect(onList.has('2:9 tail') && onList.has('2:10 head')).toBe(true);
    });

    it.skipIf(book !== 'jhn')('John 10:14, 10:30, 17:23 and 18:8 start the lead slop before their own first sound (mw-82lb97i.36: they started 20 to 70 ms after it)', () => {
      for (const at of ['10:14', '10:30', '17:23', '18:8']) {
        const verse = verses.find((v) => v.at === at);
        expect(verse?.head?.onset, at).toBeDefined();
        expect(thousandths(verse?.head?.onset ?? 0) - thousandths(verse?.start ?? 0), at).toBeGreaterThanOrEqual(thousandths(slop.lead));
        expect(thousandths(verse?.head?.onset ?? 0) - thousandths(verse?.start ?? 0), at).toBeLessThan(thousandths(slop.lead) + 10);
      }
    });

    it.skipIf(book !== 'jhn')("John 9:40's first sound is its word 'Some', not the click 75 ms before it (mw-ar5k42b.6: the quiet file gave 9:39's next onset as 313.57, the click's)", () => {
      const verse = verses.find((v) => v.at === '9:40');
      expect(verse?.head?.onset).toBeGreaterThanOrEqual(313.63);
      expect(verse?.head?.onset).toBeLessThan(313.7); // the aligner's first letter of 'Some' starts at 313.72
      expect(verses.find((v) => v.at === '9:39')?.tail?.onset).toBe(verse?.head?.onset);
      expect(thousandths(verse?.head?.onset ?? 0) - thousandths(verse?.start ?? 0)).toBeGreaterThanOrEqual(thousandths(slop.lead));
      expect(thousandths(verse?.head?.onset ?? 0) - thousandths(verse?.start ?? 0)).toBeLessThan(thousandths(slop.lead) + 10);
    });
  }
});

// mw-zbgo4ep.1: the timing maker's own parts that need no model and no audio (python3 reads align.py; nothing is fetched). A Psalm's title (its superscription) is stored INSIDE
// verse 1's text, the section heading in `h`; the Hebrew words say where the title ends (one Hebrew verse more than the English: Psalm 3; two more: Psalm 51).
const python = spawnSync('python3', ['-I', '-c', 'print(1)']);
const hasPython = python.status === 0;

function alignPython(code: string): unknown {
  const script = [
    'import importlib.util, json',
    `spec = importlib.util.spec_from_file_location('align', ${JSON.stringify(resolve(root, ALIGN))})`,
    'align = importlib.util.module_from_spec(spec); spec.loader.exec_module(align)',
    code,
  ].join('\n');
  const run = spawnSync('python3', ['-I', '-c', script], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`python3 failed: ${run.stderr}`);
  return JSON.parse(run.stdout);
}

describe.skipIf(!hasPython)("align.py's handling of a Psalm's title", () => {
  it('finds the title in verse 1 of Psalms 3 and 51 (one and two Hebrew verses), and none in Psalms 117 and 119 or in Genesis 1', () => {
    const counts = alignPython(
      "print(json.dumps({k: align.chapter_text(b, c)[0]['title_words'] for k, (b, c) in {'psa3': ('psa', 3), 'psa51': ('psa', 51), 'psa117': ('psa', 117), 'psa119': ('psa', 119), 'gen1': ('gen', 1)}.items()}))",
    );
    expect(counts).toEqual({ psa3: 11, psa51: 19, psa117: 0, psa119: 0, gen1: 0 }); // 'A Psalm of David, when he fled from his son Absalom.'
  });

  it('finds a title in 62 of the 150 Psalms, never more than the verse, and never in a verse but the first', () => {
    const found = alignPython(
      "r = {}\nfor c in range(1, 151):\n    vs = align.chapter_text('psa', c)\n    r[c] = [vs[0]['title_words'], len(vs[0]['words'])] + [v['title_words'] for v in vs[1:]]\nprint(json.dumps(r))",
    ) as Record<string, number[]>;
    const titled = Object.values(found).filter(([title]) => title > 0);
    expect(titled).toHaveLength(62);
    for (const [title, whole, ...rest] of Object.values(found)) {
      expect(title).toBeLessThan(whole);
      expect(rest.every((n) => n === 0)).toBe(true);
    }
  });

  it("aligns the title as the start of verse 1, and under skip_title leaves it to the opening wildcard like a heading, so verse 1 begins at the first word after it", () => {
    const items = alignPython(
      "vs = align.chapter_text('psa', 3)\nread = align.build_items(vs)\nskipped = align.build_items(vs, True)\nprint(json.dumps({'read': [read[0], read[1], read[-1]], 'skipped': [skipped[0], skipped[1], skipped[-1]], 'lens': [len(read), len(skipped)]}))",
    ) as { read: object[]; skipped: object[]; lens: number[] };
    expect(items.read).toEqual([{ star: true }, { word: 'a', verse: 1, first: true, last: false }, { star: true }]);
    expect(items.skipped).toEqual([{ star: true }, { word: 'o', verse: 1, first: true, last: false }, { star: true }]);
    expect(items.lens[0] - items.lens[1]).toBe(11);
  });

  it('puts a wildcard before a verse with a heading but not before verse 1 (the opening wildcard serves it)', () => {
    const stars = alignPython("vs = align.chapter_text('gen', 1)\nit = align.build_items(vs)\nprint(json.dumps([i for i, x in enumerate(it) if 'star' in x]))") as number[];
    expect(stars[0]).toBe(0);
    expect(stars.at(-1)).toBeGreaterThan(stars[0]);
    expect(stars.length).toBeGreaterThanOrEqual(3); // the opening, the heading before verse 3 ('The First Day'), the closing
  });
});

describe.skipIf(!hasPython)('align.py run again after a stop part way', () => {
  it('skips a chapter already in the book file, fetching nothing and loading no model, and says --redo aligns it again', () => {
    const run = spawnSync('python3', ['-I', resolve(root, ALIGN), '--book', 'jhn', '--chapters', '3', '--scratch', resolve(tmpdir(), 'lampas-audio-timings-test')], { encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('skipped, already in jhn.json');
    expect(run.stdout).toContain('requests: 0, files fetched: 0');
    const help = spawnSync('python3', ['-I', resolve(root, ALIGN), '--help'], { encoding: 'utf8' });
    expect(help.stdout).toContain('--redo');
  });

  it('knows each of the 66 books, so --book takes any code of the table', () => {
    const help = spawnSync('python3', ['-I', resolve(root, ALIGN), '--help'], { encoding: 'utf8' });
    for (const code of Object.keys(FILE_NAME)) expect(help.stdout, code).toContain(code);
  });
});
