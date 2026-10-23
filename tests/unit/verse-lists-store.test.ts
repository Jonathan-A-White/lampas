// tests/unit/verse-lists-store.test.ts — the verse lists' store (mw-9q8wp1.1): the Dexie table `verseLists` added at version 28, and the repository that owns it.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList, listVerseLists, removeVerseList, renameVerseList, restoreVerseList, setVerseListRefs, verseListCount } from '../../src/data/repositories';

beforeEach(async () => {
  await db.open();
  await db.verseLists.clear();
});
afterAll(() => db.close());

describe('the verseLists table', () => {
  it('is keyed by an automatic id and holds name, refs, created and updated', async () => {
    expect(db.verno).toBe(29);
    expect(db.verseLists.schema.primKey.auto).toBe(true);
    expect(db.verseLists.schema.primKey.name).toBe('id');
    expect(db.verseLists.schema.idxByName['created']).toBeDefined();
  });
});

describe('create', () => {
  it('keeps the name, the references in the order given, and when it was made', async () => {
    const row = await createVerseList('Refuge', ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3'], 1000);
    expect(row).toMatchObject({ name: 'Refuge', refs: ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3'], created: 1000, updated: 1000 });
    expect(typeof row.id).toBe('number');
    expect(await getVerseList(row.id)).toEqual(row);
  });

  it('trims the name, and a blank one is called Untitled list', async () => {
    expect((await createVerseList('  Peace  ', [])).name).toBe('Peace');
    expect((await createVerseList('   ', [])).name).toBe('Untitled list');
  });

  it('lists the newest first and counts them', async () => {
    const a = await createVerseList('A', [], 1);
    const b = await createVerseList('B', [], 2);
    expect((await listVerseLists()).map((l) => l.id)).toEqual([b.id, a.id]);
    expect(await verseListCount()).toBe(2);
  });
});

describe('rename', () => {
  it('changes the name, keeps the references and moves updated', async () => {
    const row = await createVerseList('Old', ['Rom.8.28'], 1);
    const renamed = await renameVerseList(row.id, '  New  ', 5);
    expect(renamed).toMatchObject({ name: 'New', refs: ['Rom.8.28'], created: 1, updated: 5 });
    expect((await getVerseList(row.id))?.name).toBe('New');
  });

  it('refuses a blank name and a list that is not there, changing nothing', async () => {
    const row = await createVerseList('Keep', [], 1);
    expect(await renameVerseList(row.id, '   ')).toBeUndefined();
    expect((await getVerseList(row.id))?.name).toBe('Keep');
    expect(await renameVerseList(row.id + 99, 'X')).toBeUndefined();
  });
});

describe('setRefs', () => {
  it('replaces the references, in the order given, and moves updated', async () => {
    const row = await createVerseList('L', ['Rom.8.28'], 1);
    const next = await setVerseListRefs(row.id, ['Isa.30.21', 'Heb.7.24-25'], 9);
    expect(next).toMatchObject({ refs: ['Isa.30.21', 'Heb.7.24-25'], updated: 9, created: 1 });
    expect((await getVerseList(row.id))?.refs).toEqual(['Isa.30.21', 'Heb.7.24-25']);
  });

  it('does nothing for a list that is not there', async () => {
    expect(await setVerseListRefs(404, ['Rom.8.28'])).toBeUndefined();
    expect(await verseListCount()).toBe(0);
  });
});

describe('remove and restore', () => {
  it('remove gives back the row it removed, and restore puts it back exactly, id and all', async () => {
    const row = await createVerseList('Gone', ['Rom.8.28'], 3);
    const removed = await removeVerseList(row.id);
    expect(removed).toEqual(row);
    expect(await getVerseList(row.id)).toBeUndefined();
    expect(await verseListCount()).toBe(0);
    await restoreVerseList(removed!);
    expect(await getVerseList(row.id)).toEqual(row);
  });

  it('remove of a list that is not there gives back nothing', async () => {
    expect(await removeVerseList(404)).toBeUndefined();
  });
});

describe('the upgrade from version 27', () => {
  it('adds the verseLists table and keeps what was there', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(27).stores({
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
    });
    await old.open();
    const kept = { ref: 'rom.8', q: 'What is σάρξ?', a: 'Flesh.', words: [], when: 5 };
    await old.table('talks').put({ ...kept });
    old.close();

    await db.open();
    expect(db.verno).toBe(29);
    expect((await db.talks.toArray()).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id')))).toEqual([kept]);
    expect(await verseListCount()).toBe(0);
    const row = await createVerseList('After the upgrade', ['Rom.8.28'], 1);
    expect((await getVerseList(row.id))?.refs).toEqual(['Rom.8.28']);
  });
});
