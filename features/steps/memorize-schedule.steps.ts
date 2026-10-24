// features/steps/memorize-schedule.steps.ts — runs features/memorize-schedule.feature: a memorized verse moves along the back-off schedule as a word does, and Review does not count it.
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { countDueVerses, memorize, recordRecall, verseId } from '../../src/data/repositories/memorize';
import { countDue } from '../../src/data/repositories/reviews';
import { isMemorizeLang, type MemorizeLang } from '../../src/memorize/languages';
import { DAY } from '../../src/data/schedule';

afterAll(() => db.close());

/** Day 0 of every scenario. */
const DAY0 = Date.UTC(2026, 9, 24, 9, 0, 0);
const day = (n: number) => DAY0 + n * DAY;

const LANGS: Record<string, MemorizeLang> = { English: 'en', Greek: 'el', Weave: 'weave' };
const langOf = (name: string): MemorizeLang => {
  const lang = LANGS[name];
  if (!lang || !isMemorizeLang(lang)) throw new Error(`no language ${name}`);
  return lang;
};

async function start(ref: string, name: string): Promise<void> {
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear()]);
  await memorize(ref, [langOf(name)], day(0));
}

const recall = (ref: string, name: string, score: number, n: number) =>
  recordRecall({ ref, lang: langOf(name), rung: 0, score, missed: [], asked: [{ token: 'x', lang: langOf(name) }], how: 'said' }, day(n));

const row = async (ref: string, name: string) => {
  const r = await db.reviews.get(['verse', verseId(ref, langOf(name))]);
  if (!r) throw new Error(`no row for ${ref}`);
  return r;
};

const feature = await loadFeature('features/memorize-schedule.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A verse I recall twice comes back later', ({ Given, When, Then }) => {
    Given('he memorizes {string} in {word}', (_, ref: string, name: string) => start(ref, name));
    When('he recalls {string} in {word} fully on day {int}', async (_, ref: string, name: string, n: number) => void (await recall(ref, name, 1, n)));
    Then('{string} in {word} is due on day {int}', async (_, ref: string, name: string, n: number) => expect((await row(ref, name)).due).toBe(day(n)));
    When('he recalls {string} in {word} fully on day {int} again', async (_, ref: string, name: string, n: number) => void (await recall(ref, name, 1, n)));
    Then('{string} in {word} is due on day {int} and no sooner', async (_, ref: string, name: string, n: number) => expect((await row(ref, name)).due).toBe(day(n)));
  });

  Scenario('A verse I miss comes back tomorrow', ({ Given, And, When, Then }) => {
    Given('he memorizes {string} in {word}', (_, ref: string, name: string) => start(ref, name));
    And('{string} in {word} has been recalled fully twice in a row {int} times', async (_, ref: string, name: string, times: number) => {
      for (let i = 0; i < times * 2; i += 1) await recall(ref, name, 1, i);
      expect((await row(ref, name)).step).toBe(times);
    });
    When('he recalls {string} in {word} with {int} percent on day {int}', async (_, ref: string, name: string, percent: number, n: number) => void (await recall(ref, name, percent / 100, n)));
    Then('{string} in {word} is due on day {int}', async (_, ref: string, name: string, n: number) => {
      const r = await row(ref, name);
      expect(r.due).toBe(day(n));
      expect(r.step).toBe(1);
    });
    And('the recall of day {int} is kept with its score and its gap of 25 days', async (_, n: number) => {
      const kept = (await db.recalls.toArray()).find((r) => r.when === day(n));
      expect(kept).toMatchObject({ score: 0.8, gap: 25, how: 'said' });
    });
  });

  Scenario('Review does not count my verses', ({ Given, And, Then }) => {
    Given('he memorizes {string} in {word}', (_, ref: string, name: string) => start(ref, name));
    And('{string} in {word} is memorized too', async (_, ref: string, name: string) => void (await memorize(ref, [langOf(name)], day(0))));
    Then('Review counts {int} items due', async (_, n: number) => expect(await countDue(day(0))).toBe(n));
    And('Memorize counts {int} verses due', async (_, n: number) => expect(await countDueVerses(day(0))).toBe(n));
  });
});
