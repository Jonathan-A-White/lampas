// The committed verse timings of the recorded voice (mw-82lb97i.2): what scripts/audio-timings/align.py wrote under public/data/audio/msb-david/ holds the contract
// against the chapter files it was aligned to. Reads only committed files; no Python and no audio runs in the gate.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBookTimings, isTimingsIndex, TIMINGS_EDITION } from '../../src/data/audioTimings';

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

/** The verses the narrator reads on from into the next with no quiet at all (the sentence runs across the verse number): they keep the aligner's end (the next verse's start, or a little before it where the two paddings did not meet). A new one fails until it is listed here. */
const READS_ON: Record<string, string[]> = { gen: ['19:1', '23:14', '23:17', '24:64', '26:28', '48:3', '50:4'], jhn: ['2:9', '5:28', '9:18'] };

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

    it(`${book}: only the listed verses are read on from with no quiet, and each of those keeps the aligner's end: at the next verse's start, or no more than 0.4 s (the two paddings) before it`, () => {
      const readsOn = pairs.filter((p) => p.row && p.row[1] === null);
      expect(readsOn.map((p) => p.at)).toEqual(READS_ON[book] ?? []);
      for (const p of readsOn) {
        expect(p.end, p.at).toBeLessThanOrEqual(p.nextStart);
        expect(p.nextStart - p.end, p.at).toBeLessThanOrEqual(0.4 + 1e-9);
      }
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
