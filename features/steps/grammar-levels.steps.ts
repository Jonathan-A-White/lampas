// features/steps/grammar-levels.steps.ts — runs features/grammar-levels.feature: a grammar answer on the schedule moves an
// idea between solid, frontier and not yet (src/data/repositories/grammarLevels.ts).
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { DAY } from '../../src/data/schedule';
import { LADDER } from '../../src/data/grammar/ladder';
import { getLevel, recordGrammarAnswer, scheduleIdea, seedLevelsIfFirstOpen, setLevel } from '../../src/data/repositories/grammarLevels';

afterAll(() => db.close());

const DAY0 = Date.UTC(2026, 9, 8, 9, 0, 0);
const day = (n: number) => DAY0 + n * DAY;
/** The day of the last answer in a scenario: a later answer or the seed is on the day after it. */
let today = 0;

async function reset(): Promise<void> {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.grammarKnown.clear(), db.reviews.clear(), db.meta.clear()]);
  today = 0;
}

const levelOf = async (id: string) => (await getLevel(id))?.level;
const genitiveIdea = () => LADDER.find((idea) => idea.terms.includes('genitive'))?.id ?? '';

const feature = await loadFeature('features/grammar-levels.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('An idea I keep getting right turns solid', ({ Given, When, Then }) => {
    Given('the idea {string} is at the frontier', async (_, id: string) => {
      await reset();
      await setLevel(id, 'frontier', 'placement', day(0));
    });
    When('he gets {string} right on {int} days in a row', async (_, id: string, days: number) => {
      for (let i = 1; i <= days; i += 1) await recordGrammarAnswer(id, true, day(i));
      today = days;
    });
    Then('{string} is solid', async (_, id: string) => expect(await levelOf(id)).toBe('solid'));
  });

  Scenario('One I slip on comes back to the frontier', ({ Given, When, Then, And }) => {
    Given('the idea {string} is solid', async (_, id: string) => {
      await reset();
      await setLevel(id, 'solid', 'sheet', day(0));
      await scheduleIdea(id, 'solid', day(0));
    });
    When('he gets {string} wrong', async (_, id: string) => {
      today = 31;
      await recordGrammarAnswer(id, false, day(today));
    });
    Then('{string} is at the frontier', async (_, id: string) => expect(await levelOf(id)).toBe('frontier'));
    And('{string} comes back tomorrow', async (_, id: string) => expect((await db.reviews.get(['grammar', id]))?.due).toBe(day(today + 1)));
  });

  Scenario('An idea I have not met starts at the frontier when I first answer it', ({ Given, When, Then }) => {
    Given('the idea {string} is not yet known', async (_, id: string) => {
      await reset();
      await setLevel(id, 'notYet', 'placement', day(0));
    });
    When('he gets {string} right on {int} day in a row', async (_, id: string, days: number) => {
      for (let i = 1; i <= days; i += 1) await recordGrammarAnswer(id, true, day(i));
    });
    Then('{string} is at the frontier', async (_, id: string) => expect(await levelOf(id)).toBe('frontier'));
  });

  Scenario('A term I marked I know this makes its idea solid', ({ Given, When, Then, And }) => {
    Given('he marked the term {string} I know this', async (_, term: string) => {
      await reset();
      await db.grammarKnown.put({ term, since: 1 });
    });
    When('Lampas is opened after the upgrade', async () => void (await seedLevelsIfFirstOpen(day(0))));
    Then('the genitive idea is solid', async () => expect(await levelOf(genitiveIdea())).toBe('solid'));
    And('it comes back in 30 days', async () => expect((await db.reviews.get(['grammar', genitiveIdea()]))?.due).toBe(day(30)));
  });
});
