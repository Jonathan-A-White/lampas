// The requests table (mw-vy3ghg.2): each feedback request Lampas sent, kept with its grist id (txid) so a status can be matched to it later.
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { applyRequestStatus, keepRequest, listRequests, recordOf, requestStore } from '../../src/data/repositories/requests';

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

describe('his words on a tutor-ask (mw-5r3p30.794)', () => {
  const ask = { txid: 'direct:aa', kind: 'tutor-ask', summary: 'He wants Olive Tree.', words: 'Can this work with Olive Tree, the way it does with Logos?', app_version: 'v', sentAt: 1000 };
  const filed = { kind: 'request-status' as const, request: 'direct:aa', status: 'filed' as const, bead: 'mw-x.1', ts: 5000 };

  it('keeps his words beside the summary and lists both', async () => {
    await keepRequest(ask);
    expect(await listRequests()).toEqual([{ ...ask, status: 'sent' }]);
  });

  it('keeps his words through a status update, with the date and the bead the status brings', async () => {
    await keepRequest(ask);
    expect(await applyRequestStatus(filed)).toBe(true);
    expect(await db.requests.get('direct:aa')).toEqual({ ...ask, status: 'filed', statusAt: 5000, bead: 'mw-x.1' });
    expect(await applyRequestStatus({ ...filed, status: 'building', ts: 6000 })).toBe(true);
    expect((await db.requests.get('direct:aa'))?.words).toBe(ask.words);
  });

  it('lists a row kept before this (no words) with its summary only, and a status leaves it so', async () => {
    const before = { ...ask, words: undefined };
    delete before.words;
    await keepRequest(before);
    expect(await listRequests()).toEqual([{ ...before, status: 'sent' }]);
    await applyRequestStatus(filed);
    expect(await db.requests.get('direct:aa')).toEqual({ ...before, status: 'filed', statusAt: 5000, bead: 'mw-x.1' });
  });

  it('hands the kit his words in the record of a row, the summary for a row with none, and none of them in the store\'s list', async () => {
    expect(recordOf({ ...ask, status: 'sent' })).toMatchObject({ words: ask.words, summary: ask.summary });
    const before = { ...ask, words: undefined };
    delete before.words;
    expect(recordOf({ ...before, status: 'sent' })).toMatchObject({ words: ask.summary, summary: ask.summary });
    await keepRequest(ask);
    expect((await requestStore('v').all()).map((r) => r.words)).toEqual(['']);
  });

  it('keeps his words when the store files a tutor-ask the table does not hold yet', async () => {
    await requestStore('v').put({ id: 'direct:cc', kind: 'tutor-ask', words: ask.words, summary: ask.summary, talkId: 't', who: 'grown-up', sentAt: 9, day: '1970-01-01', status: 'sent' });
    expect(await db.requests.get('direct:cc')).toMatchObject({ kind: 'tutor-ask', summary: ask.summary, words: ask.words });
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
    expect(db.verno).toBe(33);
    expect(await db.words.toArray()).toEqual([{ ...word, lang: 'grc' }]) // v32 stamps the language;
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' });
    expect(await db.talks.toArray()).toEqual([{ ...talk, id: 1 }]);
    expect(await db.requests.count()).toBe(0);
  });
});
