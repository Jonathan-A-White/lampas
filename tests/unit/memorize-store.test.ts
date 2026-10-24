// tests/unit/memorize-store.test.ts — verses on the schedule (mw-fu7dqf.4): kind 'verse', one row per verse per language, and the recalls table that keeps every recall.
import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus, latest } from '../../src/events/bus';
import { db } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import {
  VERSE_KIND,
  countDueVerses,
  listDueVerses,
  listMemorized,
  memorize,
  memorizedOf,
  parseVerseId,
  recordRecall,
  unmemorize,
  verseId,
} from '../../src/data/repositories/memorize';

const NOW = Date.UTC(2026, 9, 24, 9, 0, 0);
const ref = 'Rom.8.28';

beforeEach(async () => {
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

const recall = (score: number, over: Partial<Parameters<typeof recordRecall>[0]> = {}) =>
  ({ ref, lang: 'en' as const, rung: 0, score, missed: [], asked: [{ token: 'all', lang: 'en' }], how: 'said' as const, ...over });

describe('the ids of a verse on the schedule', () => {
  it('is the language, a colon and the reference, and reads back', () => {
    expect(VERSE_KIND).toBe('verse');
    expect(verseId(ref, 'el')).toBe('el:Rom.8.28');
    expect(parseVerseId('weave:Ps.62.1-2')).toEqual({ lang: 'weave', ref: 'Ps.62.1-2' });
    expect(parseVerseId('nothing')).toBeUndefined();
    expect(parseVerseId('fr:Rom.8.28')).toBeUndefined();
  });
});

describe('memorize and unmemorize', () => {
  it('memorize makes one verse row per language, step 0, due now', async () => {
    await memorize(ref, ['en'], NOW);
    expect(await db.reviews.toArray()).toEqual([{ kind: 'verse', id: 'en:Rom.8.28', step: 0, due: NOW, lastWhen: NOW, lapses: 0, rights: 0 }]);
  });

  it('memorize again with more languages adds only the new row and leaves the first alone', async () => {
    await memorize(ref, ['en'], NOW);
    await recordRecall(recall(1), NOW + DAY);
    const before = await db.reviews.get(['verse', 'en:Rom.8.28']);
    await memorize(ref, ['en', 'el'], NOW + 2 * DAY);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toEqual(before);
    expect(await db.reviews.get(['verse', 'el:Rom.8.28'])).toMatchObject({ step: 0, due: NOW + 2 * DAY });
    expect(await db.reviews.count()).toBe(2);
  });

  it('unmemorize with a language removes that row alone; without one, all of the verse', async () => {
    await memorize(ref, ['en', 'el'], NOW);
    await memorize('John.3.16', ['en'], NOW);
    await unmemorize(ref, 'el');
    expect((await db.reviews.toArray()).map((r) => r.id).sort()).toEqual(['en:John.3.16', 'en:Rom.8.28']);
    await memorize(ref, ['el'], NOW);
    await unmemorize(ref);
    expect((await db.reviews.toArray()).map((r) => r.id)).toEqual(['en:John.3.16']);
  });

  it('unmemorize keeps the recalls: they are evidence', async () => {
    await memorize(ref, ['en'], NOW);
    await recordRecall(recall(1), NOW);
    await unmemorize(ref);
    expect(await db.recalls.count()).toBe(1);
  });

  it('memorizedOf gives the languages per reference, in the order en, el, weave, and leaves out a reference that is not memorized', async () => {
    await memorize(ref, ['weave', 'en'], NOW);
    await memorize('John.3.16', ['el'], NOW);
    const map = await memorizedOf([ref, 'John.3.16', 'Ps.23.1']);
    expect([...map.entries()]).toEqual([
      [ref, ['en', 'weave']],
      ['John.3.16', ['el']],
    ]);
  });

  it('listMemorized gives every row with its ref, language, step, due and last time', async () => {
    await memorize(ref, ['en', 'el'], NOW);
    expect(await listMemorized()).toEqual(
      expect.arrayContaining([
        { ref, lang: 'en', step: 0, due: NOW, lastWhen: NOW },
        { ref, lang: 'el', step: 0, due: NOW, lastWhen: NOW },
      ]),
    );
    expect(await listMemorized()).toHaveLength(2);
  });
});

describe('what is due', () => {
  it('lists only due verse rows, longest overdue first', async () => {
    await memorize('John.3.16', ['en'], NOW - 2 * DAY);
    await memorize(ref, ['en'], NOW - 5 * DAY);
    await memorize('Ps.23.1', ['en'], NOW + DAY);
    await db.reviews.put({ kind: 'word', id: 'λέγω', step: 0, due: NOW - 9 * DAY, lastWhen: 0, lapses: 0, rights: 0 });
    expect((await listDueVerses(NOW)).map((r) => r.id)).toEqual(['en:Rom.8.28', 'en:John.3.16']);
    expect(await countDueVerses(NOW)).toBe(2);
  });
});

describe('recordRecall', () => {
  it('moves the row as nextReview does: right twice is step 1', async () => {
    await memorize(ref, ['en'], NOW);
    await recordRecall(recall(1), NOW);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toMatchObject({ step: 0, rights: 1, due: NOW + DAY });
    await recordRecall(recall(1), NOW + DAY);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toMatchObject({ step: 1, rights: 0, due: NOW + 4 * DAY });
  });

  it('passes at 90%: 0.9 moves the row up as a right, 0.8 drops it and makes it due tomorrow', async () => {
    await memorize(ref, ['en'], NOW);
    await recordRecall(recall(0.9), NOW);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toMatchObject({ rights: 1, lapses: 0 });
    await recordRecall(recall(0.8), NOW + DAY);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toMatchObject({ step: 0, rights: 0, lapses: 1, due: NOW + 2 * DAY });
  });

  it('keeps the recall: score, missed words, asked tokens with their languages, rung, how, and the gap in days', async () => {
    await memorize(ref, ['weave'], NOW);
    const asked = [
      { token: 'we', lang: 'en' },
      { token: 'οἴδαμεν', lang: 'el' },
    ];
    await recordRecall({ ref, lang: 'weave', rung: 2, score: 0.5, missed: ['οἴδαμεν'], asked, how: 'mill' }, NOW);
    await recordRecall({ ref, lang: 'weave', rung: 3, score: 1, missed: [], asked, how: 'typed' }, NOW + 2 * DAY);
    const rows = await db.recalls.orderBy('when').toArray();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ ref, lang: 'weave', when: NOW, rung: 2, score: 0.5, missed: ['οἴδαμεν'], asked, gap: 0, how: 'mill' });
    expect(rows[1]).toMatchObject({ when: NOW + 2 * DAY, rung: 3, score: 1, gap: 2, how: 'typed' });
  });

  it('the gap is of that language: the first recall of another language of the verse has gap 0', async () => {
    await memorize(ref, ['en', 'el'], NOW);
    await recordRecall(recall(1), NOW);
    await recordRecall(recall(1, { lang: 'el' }), NOW + 3 * DAY);
    expect((await db.recalls.toArray()).filter((r) => r.lang === 'el').map((r) => r.gap)).toEqual([0]);
  });

  it('tells the bus how many verses are due', async () => {
    await memorize(ref, ['en'], NOW);
    await memorize('John.3.16', ['en'], NOW);
    await recordRecall(recall(1), NOW);
    expect(latest('memorize-due-changed')).toEqual({ kind: 'memorize-due-changed', due: 1 });
  });

  it('puts a verse that was not on the schedule on it, as the one recall of it', async () => {
    await recordRecall(recall(1), NOW);
    expect(await db.reviews.get(['verse', 'en:Rom.8.28'])).toMatchObject({ rights: 1 });
  });
});
