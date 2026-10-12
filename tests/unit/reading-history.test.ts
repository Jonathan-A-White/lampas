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
    expect(db.verno).toBe(18);
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
