// tests/unit/aorist-gloss-upgrade.test.ts — Dexie v29 (mw-bsf54t.15): a word taught before 0.1.419 is stored with the gloss it had ('to come/go'); the upgrade gives
// it the aorist note withAoristNote gives every gloss as it comes in (mw-bsf54t.12), so Review and the word list agree with the word sheet.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';

afterAll(() => db.close());

describe('the v29 upgrade of the stored glosses', () => {
  it('adds the aorist note to ἔρχομαι, leaves λύω as it was, and does not double the note on a second open', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(28).stores({
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
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
      talkSummaries: 'ref',
      library: 'id, kind',
      exportRows: 'resource',
      verseLists: '++id, created',
    });
    await old.open();
    await old.table('words').bulkPut([
      { lemma: 'ἔρχομαι', lemmas: ['ἔρχομαι'], gloss: 'to come/go', lesson: 0, source: 'frontier', state: 'learning', since: 1 },
      { lemma: 'λύω', lemmas: ['λύω'], gloss: 'to loose', lesson: 0, state: 'learning', since: 2 },
      { lemma: 'λέγω', lemmas: ['λέγω'], gloss: 'to say (aorist εἶπον)', lesson: 0, state: 'learning', since: 3 },
      { lemma: 'ἄγω', lemmas: ['ἄγω'], gloss: '', lesson: 0, state: 'learning', since: 4 },
    ]);
    old.close();

    await db.open();
    expect(db.verno).toBe(29);
    const gloss = async (lemma: string) => (await db.words.get(lemma))?.gloss;
    expect(await gloss('ἔρχομαι')).toBe('to come/go (aorist ἦλθον)');
    expect(await gloss('λύω')).toBe('to loose');
    expect(await gloss('λέγω')).toBe('to say (aorist εἶπον)');
    // a word with no gloss yet stays without one, so addWordToLearn can still fill it
    expect(await gloss('ἄγω')).toBe('');

    db.close();
    await db.open();
    expect(await gloss('ἔρχομαι')).toBe('to come/go (aorist ἦλθον)');
    expect(await gloss('λύω')).toBe('to loose');
  });
});
