// The data under the timeline (mw-fnvjof.17.317.1, docs/timeline.md): scripts/timeline-import.ts reads Theographic Bible Metadata at a pinned commit, lays
// data/timeline/corrections.json over it and writes one compact file per book (src/timeline/data/), which src/timeline/timelineData.ts loads. The first half
// reads the committed files; the second runs the import on small real cuts of Theographic's CSVs (tests/fixtures/timeline/), never the network.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { THEOGRAPHIC_COMMIT, THEOGRAPHIC_FILES, parseCsv, runTimelineImport, type Correction } from '../../scripts/timeline-import';
import { canonBookOf } from '../../src/data/canon';
import { TIMELINE_CREDIT, chapterSpan, endYearOf, eventsOfChapter, loadTimeline, spanOf, yearsOf, type BookTimeline } from '../../src/timeline/timelineData';

const CREDIT = 'Theographic Bible Metadata, Robert Rouse, CC BY-SA 4.0; traditional dating (Floyd Nolen Jones, after Ussher)';
const DATA_DIR = 'src/timeline/data';
const CORRECTIONS = 'data/timeline/corrections.json';

const committed = (): BookTimeline[] =>
  readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8')) as BookTimeline);

describe('the committed timeline: Isaiah 1', () => {
  it('resolves to Isaiah’s own time, the 8th century BC, not 2100 BC, and lists its events', async () => {
    const isaiah = await loadTimeline('isa');
    const events = eventsOfChapter(isaiah, 1);
    expect(events.map((e) => e.title)).toEqual(['Prophecies of Isaiah']);
    const span = chapterSpan(isaiah, 1);
    expect(span).toEqual({ from: -759, to: -697 });
    expect(span?.from).toBeGreaterThanOrEqual(-800);
    expect(span?.from).toBeLessThanOrEqual(-701);
    const [prophecies] = events;
    expect(prophecies).toMatchObject({ id: 217, year: -759, duration: '62Y', people: ['isaiah_617'] });
    expect(prophecies.verses[0]).toEqual([1, 1, 31]);
    expect(isaiah.people.isaiah_617).toEqual({ name: 'Isaiah' });
  });

  it('shows the credit and licence line with the data, whether the book has events or none', async () => {
    expect(TIMELINE_CREDIT).toBe(CREDIT);
    expect((await loadTimeline('isa')).credit).toBe(CREDIT);
    // 3 John has no event and names nobody Theographic dates: no file, an empty timeline that still carries the credit
    const none = await loadTimeline('3jn');
    expect(none).toEqual({ book: '3jn', credit: CREDIT, events: [], people: {}, places: {} });
    expect(chapterSpan(none, 1)).toBeNull();
  });
});

describe('the committed files', () => {
  it('are one file for each book that has an event or a dated person, each complete and naming everyone its events name', () => {
    const files = committed();
    expect(files.length).toBeGreaterThan(30);
    for (const data of files) {
      const book = canonBookOf(data.book);
      expect(book, data.book).toBeDefined();
      expect(data.credit, data.book).toBe(CREDIT);
      let before = Number.NEGATIVE_INFINITY;
      for (const event of data.events) {
        expect(event.year, `${data.book} ${event.title}`).toBeGreaterThanOrEqual(before);
        before = event.year;
        expect(event.year, event.title).not.toBe(0);
        expect(Number.isFinite(yearsOf(event.duration)), event.title).toBe(true);
        expect(event.verses.length, event.title).toBeGreaterThan(0);
        for (const [chapter, from, to] of event.verses) {
          expect(chapter >= 1 && chapter <= (book?.chapters ?? 0) && from >= 1 && to >= from, `${data.book} ${event.title} ${chapter}:${from}-${to}`).toBe(true);
        }
        for (const id of event.people) expect(data.people[id]?.name, `${data.book} ${event.title} ${id}`).toBeTruthy();
        for (const id of event.places) expect(data.places[id], `${data.book} ${event.title} ${id}`).toBeTruthy();
      }
    }
  });

  it('stay small enough to load a book at a time: no file over 60 KB, all under 250 KB', () => {
    const sizes = readdirSync(DATA_DIR).map((f) => readFileSync(join(DATA_DIR, f)).length);
    expect(Math.max(...sizes)).toBeLessThan(60_000);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan(250_000);
  });

  it('have the correction applied: the Death of Moses stands in Deuteronomy 34 and not in Genesis 34', async () => {
    const titles = async (book: string, chapter: number) => eventsOfChapter(await loadTimeline(book), chapter).map((e) => e.title);
    expect(await titles('gen', 34)).not.toContain('Death of Moses');
    expect(await titles('deu', 34)).toContain('Death of Moses');
  });

  it('hold the people Theographic dates, with their birth and death years as the app counts them (no year 0)', async () => {
    const kings = await loadTimeline('1ki');
    expect(kings.people.david_994).toEqual({ name: 'David', born: -1085, died: -1015 });
  });
});

describe('data/timeline/corrections.json', () => {
  const corrections = JSON.parse(readFileSync(CORRECTIONS, 'utf8')) as Correction[];

  it('gives every fix its id, field, from, to, reason and source', () => {
    expect(corrections.length).toBeGreaterThan(0);
    for (const fix of corrections) {
      expect(Object.keys(fix).sort()).toEqual(['field', 'from', 'id', 'reason', 'source', 'to']);
      for (const part of [fix.id, fix.field, fix.reason, fix.source]) expect(part.trim().length, JSON.stringify(fix)).toBeGreaterThan(0);
      expect(fix.id).toMatch(/^(event|person|place):\S+$/);
      expect(fix.to).not.toBe(fix.from);
    }
  });
});

describe('docs/timeline.md', () => {
  it('says how to add a correction and how a sure one goes upstream, the first shown to the Governor before it is sent', () => {
    const doc = readFileSync('docs/timeline.md', 'utf8');
    expect(doc).toContain('data/timeline/corrections.json');
    expect(doc).toContain('npm run timeline:build');
    expect(doc).toMatch(/issue/);
    expect(doc).toMatch(/pull request/);
    expect(doc).toMatch(/first[^.]*shown to the Governor before it is sent/);
  });
});

describe('years and durations', () => {
  it('reads a duration in years', () => {
    expect(yearsOf('62Y')).toBe(62);
    expect(yearsOf('7Y6M')).toBe(7.5);
    expect(yearsOf('18M')).toBe(1.5);
    expect(yearsOf('1D')).toBeCloseTo(1 / 365.25);
    expect(yearsOf('2W')).toBeCloseTo(14 / 365.25);
    expect(() => yearsOf('soon')).toThrow(/soon/);
  });

  it('ends an event a duration after its start, stepping over the year 0 that does not exist', () => {
    expect(endYearOf({ year: -759, duration: '62Y' })).toBe(-697);
    expect(endYearOf({ year: -2, duration: '3Y' })).toBe(2);
    expect(endYearOf({ year: 30, duration: '1D' })).toBe(30);
  });

  it('spans a list of events from the earliest start to the latest end', () => {
    expect(spanOf([])).toBeNull();
    expect(spanOf([{ year: -20, duration: '40Y' }, { year: -5, duration: '1D' }])).toEqual({ from: -20, to: 21 });
  });
});

// --- the import, on real cuts of the pinned files ---

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const fixture = (name: string): Buffer => readFileSync(`tests/fixtures/timeline/${name.replace('.csv', '-slice.csv')}`);
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

interface Run {
  dir: string;
  outDir: string;
  rawDir: string;
  fetched: string[];
  read: (book: string) => BookTimeline;
  again: () => ReturnType<typeof runTimelineImport>;
  result: Awaited<ReturnType<typeof runTimelineImport>>;
}

async function importFixtures(corrections: unknown = []): Promise<Run> {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-timeline-'));
  made.push(dir);
  const outDir = join(dir, 'out');
  const rawDir = join(dir, 'raw');
  const correctionsFile = join(dir, 'corrections.json');
  mkdirSync(outDir);
  writeFileSync(correctionsFile, JSON.stringify(corrections));
  const fetched: string[] = [];
  const run = () =>
    runTimelineImport({
      rawDir,
      outDir,
      correctionsFile,
      pins: Object.fromEntries(THEOGRAPHIC_FILES.map((f) => [f.name, sha256(fixture(f.name))])),
      download: async (url, dest) => {
        fetched.push(url);
        mkdirSync(rawDir, { recursive: true });
        writeFileSync(dest, fixture(basename(dest)));
      },
    });
  const result = await run();
  return { dir, outDir, rawDir, fetched, result, again: run, read: (book) => JSON.parse(readFileSync(join(outDir, `${book}.json`), 'utf8')) as BookTimeline };
}

const realFix = (JSON.parse(readFileSync(CORRECTIONS, 'utf8')) as Correction[]).find((c) => c.id === 'event:129') as Correction;

describe('parseCsv', () => {
  it('reads quoted cells with commas, doubled quotes and line breaks, and drops the byte order mark', () => {
    expect(parseCsv('﻿a,b,c\r\n1,"x, ""y""\r\nz",\r\n')).toEqual([{ a: '1', b: 'x, "y"\r\nz', c: '' }]);
  });

  it('stops on a row with the wrong number of cells', () => {
    expect(() => parseCsv('a,b\n1,2,3\n')).toThrow(/row 2/);
  });
});

describe('the import', () => {
  it('fetches Theographic’s three files at the pinned commit', async () => {
    expect(THEOGRAPHIC_COMMIT).toMatch(/^[0-9a-f]{40}$/);
    const { fetched, rawDir } = await importFixtures();
    expect(fetched).toEqual(
      ['Events.csv', 'People.csv', 'Places.csv'].map((n) => `https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/${THEOGRAPHIC_COMMIT}/CSV/${n}`),
    );
    expect(readdirSync(rawDir).filter((f) => f.endsWith('.csv')).length).toBe(3);
  });

  it('stops on bytes that are not the pinned ones', async () => {
    const { rawDir, again } = await importFixtures();
    writeFileSync(join(rawDir, 'Events.csv'), `${fixture('Events.csv').toString('utf8')}\r\n`);
    await expect(again()).rejects.toThrow(/Events\.csv.*not the pinned/s);
  });

  it('writes each event in each book it has verses in, with that book’s verses as ranges and the names of its people and places', async () => {
    const { read } = await importFixtures();
    const genesis = read('gen').events.find((e) => e.id === 7);
    expect(genesis).toMatchObject({ title: 'Birth of Seth', year: -3874, duration: '1D', verses: [[4, 25, 25], [5, 3, 3]], people: ['seth_2504', 'adam_78', 'eve_1231'], places: ['eden_354'] });
    expect(read('luk').events.find((e) => e.id === 7)?.verses).toEqual([[3, 38, 38]]);
    expect(read('1ch').events.find((e) => e.id === 7)?.verses).toEqual([[1, 1, 1]]);
    expect(read('gen').places.eden_354).toBe('Eden');
    expect(read('gen').people.adam_78).toEqual({ name: 'Adam', born: -4004, died: -3074 });
    expect(read('luk').people.eve_1231).toEqual({ name: 'Eve', born: -4004 });
  });

  it('keeps the calendar date where Theographic gives one, and the New Testament year as it is', async () => {
    const { read } = await importFixtures();
    expect(read('act').events.find((e) => e.id === 306)).toMatchObject({ year: 30, date: '0030-05-01', duration: '1D' });
    expect(read('isa').events[0]).toMatchObject({ year: -759, duration: '62Y' });
    expect(read('isa').events[0].date).toBeUndefined();
  });

  it('gives a book the dated people its verses name, even where no event of the book names them', async () => {
    const { read } = await importFixtures();
    expect(read('1ki').people.david_994).toEqual({ name: 'David', born: -1085, died: -1015 });
    expect(read('1ki').events.every((e) => !e.people.includes('david_994'))).toBe(true);
    // an undated person no event names is left out
    expect(read('act').people.david_994).toBeUndefined();
  });

  it('writes nothing on a second run, and removes the file of a book that no longer has any', async () => {
    const run = await importFixtures();
    expect(run.result.written.length).toBeGreaterThan(0);
    writeFileSync(join(run.outDir, 'rev.json'), '{}');
    const second = await run.again();
    expect(second.written).toEqual([]);
    expect(existsSync(join(run.outDir, 'rev.json'))).toBe(false);
  });
});

describe('a correction', () => {
  it('applies over the import, and the raw file stays as it was fetched', async () => {
    const without = await importFixtures();
    expect(eventsOfChapter(without.read('gen'), 34).map((e) => e.title)).toEqual(['Death of Moses']);

    const withFix = await importFixtures([realFix]);
    expect(eventsOfChapter(withFix.read('gen'), 34)).toEqual([]);
    expect(eventsOfChapter(withFix.read('deu'), 34).map((e) => e.title)).toEqual(['Death of Moses']);
    expect(readFileSync(join(withFix.rawDir, 'Events.csv'))).toEqual(fixture('Events.csv'));
    expect(withFix.result.corrections).toBe(1);
  });

  it('can set a person’s year and a place’s name', async () => {
    const { read } = await importFixtures([
      { id: 'person:david_994', field: 'birthYear', from: '-1084', to: '-1083', reason: 'a test', source: 'a test' },
      { id: 'place:eden_354', field: 'displayTitle', from: 'Eden', to: 'Eden (the garden)', reason: 'a test', source: 'a test' },
    ]);
    expect(read('1ki').people.david_994.born).toBe(-1084);
    expect(read('gen').places.eden_354).toBe('Eden (the garden)');
  });

  it.each([
    ['whose “from” is not what the file says (upstream changed it)', { ...realFix, from: 'Gen.1.1' }, /event:129 verses.*from/s],
    ['for a record the files do not have', { ...realFix, id: 'event:9999' }, /event:9999/],
    ['of a field the files do not have', { ...realFix, field: 'nonsense' }, /nonsense/],
    ['with no reason', { ...realFix, reason: ' ' }, /event:129.*reason/s],
    ['with no source', { id: realFix.id, field: realFix.field, from: realFix.from, to: realFix.to, reason: realFix.reason }, /event:129.*source/s],
    ['of an id that names no table', { ...realFix, id: '129' }, /129/],
  ])('stops the build on a fix %s', async (_what, fix, message) => {
    await expect(importFixtures([fix])).rejects.toThrow(message);
  });
});
