// tests/unit/readings-redrawn.test.ts — a kept Greek reading (readings, readingHistory) of a verse whose Greek words the RP 2026 overlay moved or removed (Philemon 1:1's swap,
// Revelation 13:14's one word fewer; mw-9ji6ek0.11) holds word indexes (FixWord.index, reached, next, total) that no longer stand where they did: it is not shown, and its history row feeds no
// index to any screen. Every overlay entry is marked `moved` in REDRAWN (src/data/repositories/diagrams.ts), is spelling only, or is named here as one the chapter already read so.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { REDRAWN } from '../../src/data/repositories/diagrams';
import { getVerseReading, keepVerseReading, listReadingHistory, readingKey, reachOf } from '../../src/data/repositories/readings';
import type { FixWord } from '../../src/data/db';

type Entry = { book: string; chapter: number; verse: number; from: string[]; to: string[] };
const overlay = JSON.parse(readFileSync('data/rp2026-overlay.json', 'utf8')) as Entry[];
const refOf = (e: Entry): string => `${e.book} ${e.chapter}:${e.verse}`;

/** Entries whose verse the committed chapter read in the 2026 words before the overlay (docs/greek-edition.md): the overlay left its Greek as it was. */
const READ_SO_ALREADY = ['Romans 13:9', 'Revelation 11:16'];

/** Entries that only respell words where they stand (Matthew 26:29: γεννήματος to γενηματος, the same three words in the same places): a word index of the verse kept before still stands. */
const SPELLING_ONLY = ['Matthew 26:29'];

const word = (w: string, index: number): FixWord => ({ word: w, index, chunks: [w], tip: 'say it' });

beforeEach(async () => {
  await db.open();
  await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
});
afterAll(() => db.close());

describe('the overlay entries and REDRAWN', () => {
  it('marks as moved the verse of every entry that changes where a word stands, except those the chapter already read so', () => {
    const moved = new Set(REDRAWN.filter((r) => r.moved).map((r) => `${r.book} ${r.chapter}:${r.verse}`));
    const missing = overlay.filter((e) => !SPELLING_ONLY.includes(refOf(e)) && !READ_SO_ALREADY.includes(refOf(e)) && !moved.has(refOf(e))).map(refOf);
    expect(missing).toEqual([]);
  });

  it('names as spelling only an entry that keeps its words in their places, and not one that is marked moved', () => {
    for (const ref of SPELLING_ONLY) {
      const e = overlay.find((o) => refOf(o) === ref);
      expect(e?.from.length).toBe(e?.to.length);
    }
    expect(REDRAWN.filter((r) => r.moved && SPELLING_ONLY.includes(`${r.book} ${r.chapter}:${r.verse}`))).toEqual([]);
  });

  it('marks as moved only a verse the overlay changes, and not one the chapter read so already', () => {
    const moved = REDRAWN.filter((r) => r.moved).map((r) => `${r.book} ${r.chapter}:${r.verse}`);
    expect(moved.every((ref) => overlay.map(refOf).includes(ref))).toBe(true);
    expect(moved.filter((ref) => READ_SO_ALREADY.includes(ref))).toEqual([]);
  });
});

/** What a reading kept before the overlay looked like: the bare key, indexes of the old words. */
const keptBefore = async (ref: string, lang: string, total: number): Promise<void> => {
  await db.readings.put({ ref: lang === 'en' ? ref : `${ref}:${lang}`, verdict: 'partial', words: [word('x', 2)], note: 'old', when: 1, reached: total - 1, total, next: word('y', total - 1) });
  await db.readingHistory.add({ ref, lang, verdict: 'partial', words: [word('x', 2)], at: 1, reached: total - 1, total });
};

describe('a Greek reading kept before the overlay moved the verse’s words', () => {
  it('is not shown for Revelation 13:14 (which would say “of 38 words”) or Philemon 1:1, nor for a passage holding one', async () => {
    await keptBefore('rev.13.14', 'el', 38);
    await keptBefore('phm.1.1', 'el', 20);
    await keptBefore('rev.13.13-14', 'el', 60);
    await keptBefore('phm.1.1-2', 'el', 40);
    for (const ref of ['rev.13.14', 'phm.1.1', 'rev.13.13-14', 'phm.1.1-2']) expect(await getVerseReading(ref, 'el')).toBeUndefined();
  });

  it('is kept for another verse, and an English reading of the same verse is kept too', async () => {
    await keptBefore('rev.13.13', 'el', 30);
    await keptBefore('rev.13.15', 'el', 30);
    await keptBefore('mat.26.29', 'el', 20);
    await keptBefore('rev.13.14', 'en', 38);
    for (const [ref, lang] of [['rev.13.13', 'el'], ['rev.13.15', 'el'], ['mat.26.29', 'el'], ['rev.13.14', 'en']] as const) expect((await getVerseReading(ref, lang))?.note).toBe('old');
  });

  it('is replaced by the reading made now, which is shown, with the total of the words now', async () => {
    await keptBefore('rev.13.14', 'el', 38);
    await keepVerseReading('rev.13.14', 'partial', [word('z', 1)], 'new', 'el', 5, undefined, reachOf('partial', 37, { reached: 4 }));
    const shown = await getVerseReading('rev.13.14', 'el');
    expect(shown).toMatchObject({ note: 'new', total: 37, reached: 4 });
    expect(readingKey('rev.13.14', 'el')).not.toBe('rev.13.14:el');
    expect(readingKey('rev.13.13', 'el')).toBe('rev.13.13:el');
    expect(readingKey('rev.13.14', 'en')).toBe('rev.13.14');
  });
});

describe('the history rows of a verse whose words moved', () => {
  it('give no reached, total or word index to a screen', async () => {
    await keptBefore('rev.13.14', 'el', 38);
    await keepVerseReading('rev.13.14', 'partial', [word('z', 1)], 'new', 'el', 5, undefined, reachOf('partial', 37, { reached: 4 }));
    const [old, fresh] = await listReadingHistory('rev.13.14');
    expect(old).toMatchObject({ verdict: 'partial', at: 1 });
    expect(old).not.toHaveProperty('reached');
    expect(old).not.toHaveProperty('total');
    expect(old.words.map((w) => w.index)).toEqual([undefined]);
    expect(fresh).toMatchObject({ reached: 4, total: 37 });
    expect(fresh.words.map((w) => w.index)).toEqual([1]);
  });

  it('do not decide that a new reading went further', async () => {
    await keptBefore('rev.13.14', 'el', 38);
    await keepVerseReading('rev.13.14', 'partial', [], 'new', 'el', 5, undefined, reachOf('partial', 37, { reached: 10 }));
    expect((await getVerseReading('rev.13.14', 'el'))?.further).toBeUndefined();
  });

  it('are listed as they were for another verse', async () => {
    await keptBefore('rev.13.13', 'el', 30);
    expect(await listReadingHistory('rev.13.13')).toMatchObject([{ reached: 29, total: 30 }]);
  });
});
