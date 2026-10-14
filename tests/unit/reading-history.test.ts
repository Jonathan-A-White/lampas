// The readingHistory and missTally tables (mw-neuq78.3): the upgrade from version 16 keeps his readings, and the history
// and tally start empty (features/reading-history.feature covers what a reading writes).
import Dexie from 'dexie';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getMissTally, getVerseReading, keepVerseReading, listReadingHistory } from '../../src/data/repositories/readings';

afterAll(() => db.close());

describe('the upgrade from version 16', () => {
  it('adds the history and tally tables and keeps the readings he had', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(16).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
    });
    await old.open();
    const english = { ref: 'rom.8.28', verdict: 'some-to-fix', words: [{ word: 'Blessed', chunks: ['bless', 'ed'], tip: 'Say it slowly.' }], note: 'One word.', when: 5 };
    const greek = { ref: 'rom.8.28:el', verdict: 'well-read', words: [], note: 'Well done.', when: 6 };
    await old.table('readings').bulkPut([english, greek]);
    old.close();

    await db.open();
    expect(db.verno).toBe(20);
    expect(await getVerseReading('rom.8.28')).toEqual(english);
    expect(await getVerseReading('rom.8.28', 'el')).toEqual(greek);
    expect(await listReadingHistory()).toEqual([]);
    expect(await getMissTally('en')).toEqual([]);

    // the next reading is kept as before, and the history starts with it
    await keepVerseReading('rom.8.28', 'some-to-fix', english.words, 'Again.', 'en', 9);
    expect((await getVerseReading('rom.8.28'))?.when).toBe(9);
    expect(await listReadingHistory('rom.8.28')).toEqual([{ id: 1, ref: 'rom.8.28', lang: 'en', verdict: 'some-to-fix', words: english.words, at: 9 }]);
    expect(await getMissTally('en')).toEqual([{ lang: 'en', unit: 'blessed', count: 1 }]);
  });
});

describe('how far a reading reached (mw-neuq78.7)', () => {
  const next = { word: 'all', index: 4, chunks: ['all'], tip: 'Open your mouth.' };
  const keep = (reached: number, at: number, verdict: 'partial' | 'well-read' = 'partial') =>
    keepVerseReading('rom.8.28', verdict, [], 'Good start.', 'en', at, undefined, { reached, total: 8, ...(verdict === 'partial' ? { next } : {}) });

  it('keeps the reached index, the word count and the next word on the result, and the first two on the history row', async () => {
    await db.open();
    await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
    await keep(3, 100);
    expect(await getVerseReading('rom.8.28')).toEqual({ ref: 'rom.8.28', verdict: 'partial', words: [], note: 'Good start.', when: 100, reached: 3, total: 8, next });
    expect(await listReadingHistory('rom.8.28')).toEqual([{ id: expect.any(Number), ref: 'rom.8.28', lang: 'en', verdict: 'partial', words: [], at: 100, reached: 3, total: 8 }]);
  });

  it('says further than last time only when the new reading reached past the one before', async () => {
    await db.open();
    await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
    await keep(3, 100);
    expect((await getVerseReading('rom.8.28'))?.further).toBeUndefined();
    await keep(5, 200);
    expect((await getVerseReading('rom.8.28'))?.further).toBe(true);
    await keep(5, 300);
    expect((await getVerseReading('rom.8.28'))?.further).toBeUndefined();
    await keep(2, 400);
    expect((await getVerseReading('rom.8.28'))?.further).toBeUndefined();
  });

  it('does not compare readings of another verse or another language', async () => {
    await db.open();
    await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
    await keepVerseReading('rom.8.29', 'partial', [], 'x', 'en', 50, undefined, { reached: 6, total: 8, next });
    await keepVerseReading('rom.8.28', 'partial', [], 'x', 'el', 60, undefined, { reached: 6, total: 8, next });
    await keep(3, 100);
    expect((await getVerseReading('rom.8.28'))?.further).toBeUndefined();
  });

  it('counts the misses in the part read toward the tally, and not the word he stopped at', async () => {
    await db.open();
    await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
    await keepVerseReading('rom.8.28', 'partial', [{ word: 'know', index: 2, chunks: ['know'], tip: 'Silent k.' }], 'x', 'en', 10, undefined, { reached: 3, total: 8, next });
    expect(await getMissTally('en')).toEqual([{ lang: 'en', unit: 'know', count: 1 }]);
  });
});
