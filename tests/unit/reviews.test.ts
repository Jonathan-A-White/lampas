import Dexie from 'dexie';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus, latest } from '../../src/events/bus';
import { db } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import { countDue, ensureScheduled, listDue, recordReview, seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { setWordState } from '../../src/data/repositories/words';
import { recordAnswer } from '../../src/data/repositories/results';

const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);

/** Lists these lemmas as words he is learning: only a listed word, not dropped, is due. */
const listWords = (...lemmas: string[]) => db.words.bulkPut(lemmas.map((lemma) => ({ lemma, lemmas: [], gloss: 'g', lesson: 1, state: 'learning' as const, since: 0 })));

beforeEach(async () => {
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.results.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

describe('the reviews repository', () => {
  it('ensureScheduled adds only the items not yet on the schedule, at step 0, due now', async () => {
    await recordReview('word', 'λέγω', true, NOW);
    const before = await db.reviews.get(['word', 'λέγω']);
    const added = await ensureScheduled('word', ['λέγω', 'ἄνθρωπος', 'θεός'], NOW + DAY);
    expect(added).toBe(2);
    expect(await db.reviews.get(['word', 'λέγω'])).toEqual(before);
    expect(await db.reviews.get(['word', 'θεός'])).toEqual({ kind: 'word', id: 'θεός', step: 0, due: NOW + DAY, lastWhen: NOW + DAY, lapses: 0, rights: 0 });
    expect(await ensureScheduled('word', ['θεός'], NOW + DAY)).toBe(0);
  });

  it('keeps kinds apart: the same id in another kind is another item', async () => {
    await ensureScheduled('word', ['x'], NOW);
    expect(await ensureScheduled('grammar', ['x'], NOW)).toBe(1);
  });

  it('listDue returns only the due ones, the earliest first, and can filter by kind', async () => {
    await listWords('a', 'b', 'c');
    await ensureScheduled('word', ['c'], NOW + 3 * DAY);
    await ensureScheduled('word', ['b'], NOW - 2 * DAY);
    await ensureScheduled('word', ['a'], NOW - 5 * DAY);
    await ensureScheduled('grammar', ['g'], NOW - DAY);
    expect((await listDue(undefined, NOW)).map((r) => r.id)).toEqual(['a', 'b', 'g']);
    expect((await listDue('word', NOW)).map((r) => r.id)).toEqual(['a', 'b']);
    expect((await listDue('grammar', NOW)).map((r) => r.id)).toEqual(['g']);
  });

  it('countDue matches listDue', async () => {
    await listWords('a', 'b', 'c');
    await ensureScheduled('word', ['a', 'b'], NOW - DAY);
    await ensureScheduled('word', ['c'], NOW + DAY);
    expect(await countDue(NOW)).toBe(2);
    expect(await countDue(NOW + 2 * DAY)).toBe(3);
    expect(await countDue(NOW, 'grammar')).toBe(0);
  });

  it('does not count or list a dropped word, nor a word that is not listed, and counts it again once taken up', async () => {
    await listWords('a', 'b');
    await ensureScheduled('word', ['a', 'b', 'ghost'], NOW - DAY);
    await ensureScheduled('grammar', ['g'], NOW - DAY);
    expect(await countDue(NOW)).toBe(3);
    await setWordState('b', 'dropped', NOW);
    expect(await countDue(NOW)).toBe(2);
    expect((await listDue(undefined, NOW)).map((r) => r.id).sort()).toEqual(['a', 'g']);
    expect(await countDue(NOW, 'word')).toBe(1);
    // taken up again, it comes back on the schedule it kept
    await setWordState('b', 'learning', NOW);
    expect(await countDue(NOW, 'word')).toBe(2);
    expect(await db.reviews.get(['word', 'b'])).toMatchObject({ step: 0, due: NOW - DAY });
  });

  it('recordReview moves the item by the rule and says the due count changed', async () => {
    await recordReview('word', 'λέγω', true, NOW);
    expect(await db.reviews.get(['word', 'λέγω'])).toMatchObject({ step: 0, due: NOW + DAY, rights: 1 });
    await recordReview('word', 'λέγω', true, NOW + DAY);
    expect(await db.reviews.get(['word', 'λέγω'])).toMatchObject({ step: 1, due: NOW + 4 * DAY });
    expect(latest('review-due-changed')).toEqual({ kind: 'review-due-changed', due: 0 });
  });

  it('a Quick test answer writes a review row for the word, and none for a word that is not listed', async () => {
    await db.words.put({ lemma: 'λέγω', lemmas: [], gloss: 'say', lesson: 1, state: 'learning', since: 0 });
    await recordAnswer('λέγω', false, NOW);
    await recordAnswer('ἄγνωστος', true, NOW);
    expect(await db.reviews.toArray()).toEqual([{ kind: 'word', id: 'λέγω', step: 0, due: NOW + DAY, lastWhen: NOW, lapses: 1, rights: 0 }]);
  });
});

describe('the upgrade from version 9', () => {
  it('puts his solid words on the 30-day step spread over the month and his learning words due now', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(9).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
    });
    await old.open();
    const words = [
      ...Array.from({ length: 40 }, (_, i) => ({ lemma: `s${String(i).padStart(2, '0')}`, lemmas: [], gloss: 'g', lesson: 1, state: 'solid', since: 0 })),
      ...Array.from({ length: 5 }, (_, i) => ({ lemma: `l${i}`, lemmas: [], gloss: 'g', lesson: 10, state: 'learning', since: 0 })),
      { lemma: 'd', lemmas: [], gloss: 'g', lesson: 1, state: 'dropped', since: 0 },
    ];
    await old.table('words').bulkPut(words);
    await old.table('meta').put({ key: 'wordsSeeded', value: '1' });
    old.close();

    await db.open();
    expect(db.verno).toBe(14);
    expect(await db.reviews.count()).toBe(0);
    expect(await seedScheduleIfFirstOpen(NOW)).toBe(true);

    const rows = await db.reviews.toArray();
    expect(rows).toHaveLength(45);
    expect(rows.find((r) => r.id === 'd')).toBeUndefined();
    for (const r of rows.filter((r) => r.id.startsWith('l'))) expect(r).toMatchObject({ kind: 'word', step: 0, due: NOW });
    const solid = rows.filter((r) => r.id.startsWith('s'));
    for (const r of solid) expect(r.step).toBe(4);
    const days = solid.map((r) => (r.due - NOW) / DAY);
    expect(Math.min(...days)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...days)).toBeLessThanOrEqual(30);
    // spread: no day holds more than two of the 40
    const perDay = new Map<number, number>();
    for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(2);
    expect(await countDue(NOW)).toBe(5);

    // once only
    await db.reviews.clear();
    expect(await seedScheduleIfFirstOpen(NOW)).toBe(false);
    expect(await db.reviews.count()).toBe(0);
  });

  it('waits until the words are seeded, so a first open does not mark the schedule seeded early', async () => {
    await db.meta.clear();
    expect(await seedScheduleIfFirstOpen(NOW)).toBe(false);
    await db.meta.put({ key: 'wordsSeeded', value: '1' });
    await db.words.put({ lemma: 'λέγω', lemmas: [], gloss: 'say', lesson: 10, state: 'learning', since: 0 });
    expect(await seedScheduleIfFirstOpen(NOW)).toBe(true);
    expect(await db.reviews.count()).toBe(1);
  });
});
