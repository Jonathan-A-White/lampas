// The requests table (mw-vy3ghg.2): each feedback request Lampas sent, kept with its grist id (txid) so a status can be matched to it later.
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { keepRequest, listRequests } from '../../src/data/repositories/requests';

beforeEach(async () => {
  await db.open();
  await db.requests.clear();
});
afterAll(() => db.close());

describe('the requests repository', () => {
  it('keeps a sent request with status sent and lists the newest first', async () => {
    await keepRequest({ txid: 'direct:aa', kind: 'tutor-ask', summary: 'He wants Olive Tree.', app_version: '0.1.90 · x', sentAt: 1000 });
    await keepRequest({ txid: 'direct:bb', kind: 'grammar-approach', text: 'Teach the cases with colours.', app_version: '0.1.90 · x', sentAt: 2000 });
    expect(await listRequests()).toEqual([
      { txid: 'direct:bb', kind: 'grammar-approach', text: 'Teach the cases with colours.', app_version: '0.1.90 · x', sentAt: 2000, status: 'sent' },
      { txid: 'direct:aa', kind: 'tutor-ask', summary: 'He wants Olive Tree.', app_version: '0.1.90 · x', sentAt: 1000, status: 'sent' },
    ]);
  });

  it('keeps one row for one grist: the same txid twice is one row', async () => {
    await keepRequest({ txid: 'direct:aa', kind: 'tutor-ask', summary: 's', app_version: 'v', sentAt: 1 });
    await keepRequest({ txid: 'direct:aa', kind: 'tutor-ask', summary: 's', app_version: 'v', sentAt: 1 });
    expect(await db.requests.count()).toBe(1);
  });
});

describe('the upgrade from version 15', () => {
  it('adds the requests table and leaves the data he had as it was', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(15).stores({
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
    });
    await old.open();
    const word = { lemma: 'λύω', lemmas: [], gloss: 'say', lesson: 1, state: 'solid', since: 5 };
    const talk = { ref: 'rom.8', q: 'Why?', a: 'Because.', words: [], when: 7 };
    await old.table('words').put(word);
    await old.table('settings').put({ key: 'theme', value: 'dark' });
    await old.table('talks').put(talk);
    old.close();

    await db.open();
    expect(db.verno).toBe(30);
    expect(await db.words.toArray()).toEqual([word]);
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' });
    expect(await db.talks.toArray()).toEqual([{ ...talk, id: 1 }]);
    expect(await db.requests.count()).toBe(0);
  });
});
