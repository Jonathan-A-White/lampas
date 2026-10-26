import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, type Word } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import { ensureScheduled, recordReview, seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { listSolidHeadwords } from '../../src/data/repositories/words';
import { seedExampleWords } from '../support/his-words';
import { LEARNER_MAX_CHARS, LEARNER_MAX_LEARNING, learnerSummary } from '../../src/data/learnerSummary';

const NOW = Date.UTC(2026, 9, 8, 15, 0, 0);
const TODAY = Date.UTC(2026, 9, 8, 0, 0, 0);
const HOUR = 3_600_000;

const word = (lemma: string, state: Word['state'], since: number): Word => ({ lemma, lang: 'grc', lemmas: [], gloss: 'g', lesson: 0, state, since });

beforeEach(async () => {
  await db.open();
  await Promise.all([db.words.clear(), db.reviews.clear(), db.meta.clear()]);
});
afterAll(() => db.close());

describe('learnerSummary', () => {
  it('says "due now: 0" and names no word on an empty store', async () => {
    expect(await learnerSummary(NOW)).toBe('solid 0 words; learning: none; new today: none; due now: 0');
  });

  it('counts the solid words and names the learning words newest first', async () => {
    await db.words.bulkPut([
      word('θεός', 'solid', 0),
      word('λόγος', 'solid', 0),
      word('ἀγάπη', 'learning', NOW - 5 * DAY),
      word('πνεῦμα', 'learning', NOW - 3 * DAY),
      word('σάρξ', 'learning', NOW - 4 * DAY),
      word('νόμος', 'dropped', NOW),
    ]);
    expect(await learnerSummary(NOW)).toBe('solid 2 words; learning: πνεῦμα, σάρξ, ἀγάπη; new today: none; due now: 0');
  });

  it('says "solid 1 word" for one', async () => {
    await db.words.put(word('θεός', 'solid', 0));
    expect(await learnerSummary(NOW)).toMatch(/^solid 1 word;/);
  });

  it("names today's new words, newest first, and leaves out yesterday's", async () => {
    await db.words.bulkPut([
      word('ἀγάπη', 'learning', TODAY - HOUR),
      word('πνεῦμα', 'learning', TODAY + HOUR),
      word('σάρξ', 'learning', TODAY + 2 * HOUR),
    ]);
    expect(await learnerSummary(NOW)).toBe('solid 0 words; learning: σάρξ, πνεῦμα, ἀγάπη; new today: σάρξ, πνεῦμα; due now: 0');
  });

  it('caps the learning words at 12, keeping the newest', async () => {
    await db.words.bulkPut(Array.from({ length: 20 }, (_, i) => word(`w${i}`, 'learning', NOW - (i + 1) * DAY)));
    const text = await learnerSummary(NOW);
    const learning = /learning: ([^;]*);/.exec(text)?.[1].split(', ') ?? [];
    expect(learning).toHaveLength(LEARNER_MAX_LEARNING);
    expect(learning[0]).toBe('w0');
    expect(learning[11]).toBe('w11');
  });

  it('never goes over the length cap, however long the words are', async () => {
    const long = (i: number) => `${'ἀγαπητός'.repeat(8)}${i}`;
    await db.words.bulkPut(Array.from({ length: 30 }, (_, i) => word(long(i), 'learning', NOW - i * HOUR)));
    const text = await learnerSummary(NOW);
    expect(text.length).toBeLessThanOrEqual(LEARNER_MAX_CHARS);
    expect(text).toContain('due now: 0');
    expect(text).toContain(long(0));
  });

  it('says how many are due now', async () => {
    await db.words.bulkPut([word('a', 'learning', 0), word('b', 'learning', 0)]);
    await ensureScheduled('word', ['a', 'b'], NOW - DAY);
    expect(await learnerSummary(NOW)).toMatch(/due now: 2$/);
    expect(await learnerSummary(NOW - 2 * DAY)).toMatch(/due now: 0$/);
  });
});

describe('a phone that holds only the example words it was seeded with (mw-yrmkdf.8)', () => {
  const OPENED = NOW - 3 * DAY;
  const seeded = async () => {
    await seedExampleWords(OPENED);
    await seedScheduleIfFirstOpen(OPENED);
  };

  it('is told what a new install is told, and no solid words', async () => {
    await seeded();
    expect(await db.words.count()).toBe(63);
    expect(await learnerSummary(NOW)).toBe('solid 0 words; learning: none; new today: none; due now: 0');
    expect(await listSolidHeadwords()).toEqual([]);
  });

  it('is told every word once he changes one', async () => {
    await seeded();
    await db.words.update('ἀγαπάω', { state: 'learning', since: NOW });
    expect(await learnerSummary(NOW)).toMatch(/^solid 53 words; learning: ἀγαπάω, /);
    expect((await listSolidHeadwords()).length).toBe(53);
  });

  it('is told every word once he drops one, adds one or answers one', async () => {
    await seeded();
    await db.words.update('ἀγαθός', { state: 'dropped', since: OPENED });
    expect(await learnerSummary(NOW)).toMatch(/^solid 53 words;/);
    await db.words.update('ἀγαθός', { state: 'solid', since: OPENED });
    expect(await learnerSummary(NOW)).toMatch(/^solid 0 words;/);
    await db.words.put(word('ἐλπίς', 'learning', OPENED));
    expect(await learnerSummary(NOW)).toMatch(/^solid 54 words;/);
    await db.words.delete('ἐλπίς');
    await recordReview('word', 'ἀγαπάω', true, NOW);
    expect(await learnerSummary(NOW)).toMatch(/^solid 54 words;/);
  });
});

