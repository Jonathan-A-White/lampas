// features/steps/schedule.steps.ts — runs features/schedule.feature: the Quick test's answers move a word along the
// back-off schedule (src/data/schedule.ts), and his seeded words start on it.
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db, type Word } from '../../src/data/db';
import { recordAnswer } from '../../src/data/repositories/results';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';

afterAll(() => db.close());

/** Day 0 of every scenario. */
const DAY0 = Date.UTC(2026, 9, 8, 9, 0, 0);
const day = (n: number) => DAY0 + n * DAY;

async function reset(): Promise<void> {
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear()]);
}

const word = (lemma: string, state: Word['state'], lesson: number): Word => ({ lemma, lemmas: [], gloss: 'g', lesson, state, since: 0 });

async function inList(lemma: string): Promise<void> {
  await reset();
  await db.words.put(word(lemma, 'learning', 10));
}

const review = async (lemma: string) => {
  const r = await db.reviews.get(['word', lemma]);
  if (!r) throw new Error(`no review for ${lemma}`);
  return r;
};

const feature = await loadFeature('features/schedule.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A word I get right twice comes back later', ({ Given, When, Then }) => {
    Given('the word {string} is in his list', (_, lemma: string) => inList(lemma));
    When('he answers {string} right on day {int}', async (_, lemma: string, n: number) => void (await recordAnswer(lemma, true, day(n))));
    Then('{string} is due on day {int}', async (_, lemma: string, n: number) => expect((await review(lemma)).due).toBe(day(n)));
    When('he answers {string} right on day {int} again', async (_, lemma: string, n: number) => void (await recordAnswer(lemma, true, day(n))));
    Then('{string} is due on day {int} and no sooner', async (_, lemma: string, n: number) => expect((await review(lemma)).due).toBe(day(n)));
  });

  Scenario('A word I get wrong comes back sooner', ({ Given, And, When, Then }) => {
    Given('the word {string} is in his list', (_, lemma: string) => inList(lemma));
    And('{string} has been right twice in a row {int} times', async (_, lemma: string, times: number) => {
      for (let i = 0; i < times * 2; i += 1) await recordAnswer(lemma, true, day(i));
      expect((await review(lemma)).step).toBe(times);
    });
    When('he answers {string} wrong on day {int}', async (_, lemma: string, n: number) => void (await recordAnswer(lemma, false, day(n))));
    Then('{string} is due on day {int}', async (_, lemma: string, n: number) => {
      const r = await review(lemma);
      expect(r.due).toBe(day(n));
      expect(r.step).toBe(1);
    });
    And('{string} has lapsed once', async (_, lemma: string) => expect((await review(lemma)).lapses).toBe(1));
  });

  Scenario('His words start on the schedule', ({ Given, When, Then, And }) => {
    Given('{int} solid words and {int} learning words are in his list', async (_, solid: number, learning: number) => {
      await reset();
      await db.words.bulkPut([
        ...Array.from({ length: solid }, (_, i) => word(`s${i}`, 'solid', 1)),
        ...Array.from({ length: learning }, (_, i) => word(`l${i}`, 'learning', 10)),
      ]);
      await db.meta.put({ key: 'wordsSeeded', value: '1' });
    });
    When('Lampas is opened after the upgrade', async () => void (await seedScheduleIfFirstOpen(day(0))));
    Then('the {int} learning words are due now', async (_, n: number) => {
      const due = (await db.reviews.where('due').belowOrEqual(day(0)).toArray()).map((r) => r.id);
      expect(due).toHaveLength(n);
      expect(due.every((id) => id.startsWith('l'))).toBe(true);
    });
    And('the {int} solid words are due over the next {int} days', async (_, n: number, days: number) => {
      const solid = (await db.reviews.toArray()).filter((r) => r.id.startsWith('s'));
      expect(solid).toHaveLength(n);
      for (const r of solid) {
        expect(r.due).toBeGreaterThan(day(0));
        expect(r.due).toBeLessThanOrEqual(day(days));
      }
      expect(new Set(solid.map((r) => r.due)).size).toBeGreaterThan(days / 2);
    });
  });
});
