// features/steps/reading-history.steps.ts — runs features/reading-history.feature: every reading kept in the history, and the
// tally of the sounds (Greek) or words (English) he misreads over his last five readings (src/data/repositories/readings.ts).
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { getMissTally, getVerseReading, keepVerseReading, listReadingHistory, type FixWord } from '../../src/data/repositories/readings';

afterAll(() => db.close());

const T0 = Date.UTC(2026, 9, 12, 9, 0, 0);
let clock = 0;

/** One minute after the last reading, so the readings have an order. */
const nextAt = (): number => T0 + 60_000 * clock++;
const fix = (word: string, chunks: string[]): FixWord => ({ word, chunks, tip: 'Say it slowly.' });

async function reset(): Promise<void> {
  await db.open();
  await Promise.all([db.readings.clear(), db.readingHistory.clear(), db.missTally.clear()]);
  clock = 0;
}

const tallyOf = async (lang: string): Promise<Record<string, number>> =>
  Object.fromEntries((await getMissTally(lang)).map((row) => [row.unit, row.count]));

const feature = await loadFeature('features/reading-history.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(reset);

  Scenario('Two readings of one verse leave two history rows and the last result', ({ Given, When, Then, And }) => {
    Given('he has read Romans 8:28 in English and the mill sent back one word to fix', async () => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix('Blessed', ['bless', 'ed'])], 'One word.', 'en', nextAt());
    });
    When('he reads Romans 8:28 in English again and the mill sent back no word to fix', async () => {
      await keepVerseReading('rom.8.28', 'well-read', [], 'Well done.', 'en', nextAt());
    });
    Then('the history holds {int} readings of {string}', async (_, count: number, ref: string) => {
      expect(await listReadingHistory(ref)).toHaveLength(count);
    });
    And('the last result of Romans 8:28 in English is well read, as it was kept before', async () => {
      expect(await getVerseReading('rom.8.28')).toEqual({ ref: 'rom.8.28', verdict: 'well-read', words: [], note: 'Well done.', when: T0 + 60_000 });
      expect(await db.readings.count()).toBe(1);
    });
  });

  Scenario('A Greek word whose chunks hold ου tallies the ου sound', ({ When, Then, And }) => {
    When('he reads Romans 8:28 in Greek and the mill marks {string} in the chunks {string}, {string}, {string}', async (_, word: string, a: string, b: string, c: string) => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix(word, [a, b, c])], 'One word.', 'el', nextAt());
    });
    Then('the Greek tally holds {string} once', async (_, unit: string) => expect((await tallyOf('el'))[unit]).toBe(1));
    And('the Greek tally holds nothing else', async () => expect(Object.keys(await tallyOf('el'))).toEqual(['diphthong-ou']));
  });

  Scenario('A consonant pair that falls across two chunks is tallied', ({ When, Then }) => {
    When('he reads Romans 8:28 in Greek and the mill marks {string} in the chunks {string}, {string}, {string}', async (_, word: string, a: string, b: string, c: string) => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix(word, [a, b, c])], 'One word.', 'el', nextAt());
    });
    Then('the Greek tally holds {string} once', async (_, unit: string) => expect((await tallyOf('el'))[unit]).toBe(1));
  });

  Scenario('Two vowels that are two sounds are not a diphthong', ({ When, Then }) => {
    When('he reads Romans 8:28 in Greek and the mill marks {string} in the chunks {string}, {string}, {string}, {string}', async (_, word: string, a: string, b: string, c: string, d: string) => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix(word, [a, b, c, d])], 'One word.', 'el', nextAt());
    });
    Then('the Greek tally holds nothing', async () => expect(await tallyOf('el')).toEqual({}));
  });

  Scenario('Two words of one reading that hold the same sound tally the reading once', ({ When, Then }) => {
    When('he reads Romans 8:28 in Greek and the mill marks {string} and {string} in one reading', async (_, a: string, b: string) => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix(a, ['οὐ', 'ρα', 'νοῦ']), fix(b, ['οὖν'])], 'Two words.', 'el', nextAt());
    });
    Then('the Greek tally holds {string} once', async (_, unit: string) => expect((await tallyOf('el'))[unit]).toBe(1));
  });

  Scenario('An English word he misread tallies the word', ({ When, Then, And }) => {
    When('he reads Romans 8:28 in English and the mill marks {string} in the chunks {string}, {string}', async (_, word: string, a: string, b: string) => {
      await keepVerseReading('rom.8.28', 'some-to-fix', [fix(word, [a, b])], 'One word.', 'en', nextAt());
    });
    Then('the English tally holds {string} once', async (_, unit: string) => expect((await tallyOf('en'))[unit]).toBe(1));
    And('the Greek tally holds nothing', async () => expect(await tallyOf('el')).toEqual({}));
  });

  Scenario('A reading older than his last five no longer counts', ({ Given, Then, And }) => {
    Given('he has read {int} verses in English, the first marking {string} and the others marking nothing', async (_, verses: number, word: string) => {
      for (let i = 0; i < verses; i += 1) {
        await keepVerseReading(`rom.8.${i + 20}`, i === 0 ? 'some-to-fix' : 'well-read', i === 0 ? [fix(word, [word])] : [], 'Note.', 'en', nextAt());
      }
    });
    Then('the English tally holds nothing', async () => expect(await tallyOf('en')).toEqual({}));
    And('the history holds {int} readings', async (_, count: number) => expect(await db.readingHistory.count()).toBe(count));
  });

  Scenario('A miss within his last five readings still counts', ({ Given, Then }) => {
    Given('he has read {int} verses in English, the first marking {string} and the others marking nothing', async (_, verses: number, word: string) => {
      for (let i = 0; i < verses; i += 1) {
        await keepVerseReading(`rom.8.${i + 20}`, i === 0 ? 'some-to-fix' : 'well-read', i === 0 ? [fix(word, [word])] : [], 'Note.', 'en', nextAt());
      }
    });
    Then('the English tally holds {string} once', async (_, unit: string) => expect((await tallyOf('en'))[unit]).toBe(1));
  });
});
