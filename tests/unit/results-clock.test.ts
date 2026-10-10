import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import { recordReview } from '../../src/data/repositories/reviews';
import { recordAnswer } from '../../src/data/repositories/results';

const SINCE = Date.UTC(2026, 9, 8, 9, 0, 0);
const MINUTE = 60 * 1000;

const learning = () => db.words.put({ lemma: 'λέγω', lemmas: [], gloss: 'say', lesson: 1, state: 'learning', since: SINCE });

beforeEach(async () => {
  await db.open();
  await Promise.all([db.words.clear(), db.results.clear(), db.reviews.clear()]);
});
afterAll(() => db.close());

describe('the two-in-a-row count when the phone clock steps back (mw-5r3p30.144)', () => {
  it('a word read right twice becomes solid when both answers are stamped before its since', async () => {
    await learning();
    expect(await recordAnswer('λέγω', true, SINCE - 5 * MINUTE)).toBe('learning');
    expect(await recordAnswer('λέγω', true, SINCE - 4 * MINUTE)).toBe('solid');
  });

  it('a word becomes solid when only the second answer is stamped before its since', async () => {
    await learning();
    expect(await recordAnswer('λέγω', true, SINCE + MINUTE)).toBe('learning');
    expect(await recordAnswer('λέγω', true, SINCE - 10 * MINUTE)).toBe('solid');
  });

  it('a word becomes solid when the second answer is stamped before the first', async () => {
    await learning();
    await recordAnswer('λέγω', true, SINCE + 10 * MINUTE);
    expect(await recordAnswer('λέγω', true, SINCE + MINUTE)).toBe('solid');
  });

  it('two misses move a solid word to learning when the clock steps back between them', async () => {
    await db.words.put({ lemma: 'λέγω', lemmas: [], gloss: 'say', lesson: 1, state: 'solid', since: SINCE });
    await recordAnswer('λέγω', false, SINCE - 5 * MINUTE);
    expect(await recordAnswer('λέγω', false, SINCE - 6 * MINUTE)).toBe('learning');
  });

  it('a solid word that has just turned learning does not count the answers of its last window', async () => {
    await learning();
    await recordAnswer('λέγω', true, SINCE + MINUTE);
    await recordAnswer('λέγω', true, SINCE + 2 * MINUTE); // solid
    // the clock steps back; one right then does not make anything of the old rights
    expect(await recordAnswer('λέγω', false, SINCE - DAY)).toBe('solid');
    expect(await recordAnswer('λέγω', false, SINCE - DAY + MINUTE)).toBe('learning');
    expect(await recordAnswer('λέγω', true, SINCE - DAY + 2 * MINUTE)).toBe('learning');
    expect(await recordAnswer('λέγω', true, SINCE - DAY + 3 * MINUTE)).toBe('solid');
  });

  it('a review moves up a step on two rights even when the second is stamped before its lastWhen', async () => {
    await recordReview('word', 'λέγω', true, SINCE);
    const next = await recordReview('word', 'λέγω', true, SINCE - 3 * MINUTE);
    expect(next).toMatchObject({ step: 1, rights: 0 });
  });
});
