// features/steps/memorize-session.steps.tsx — runs features/memorize-session.feature: the Memorize session (src/memorize/MemorizeSession.tsx) over fake-indexeddb, voice-kit's honest speech and the
// fake recogniser; the chapter is the committed John 1.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review } from '../../src/data/db';
import { setGreekInterest } from '../../src/data/repositories';
import { memorize, recallsOf } from '../../src/data/repositories/memorize';
import { RARE_STEP } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openMemorizeSession } from '../../tests/support/routes';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { closeDatabase } from './close-database';

const WORDS = ['From', 'His', 'fullness', 'we', 'have', 'all', 'received', 'grace', 'upon', 'grace.'];
const LAST_WHEN = 1_700_000_000_000;

afterAll(async () => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  await closeDatabase();
});

let ref = '';

/** Each step is a test of its own, so a scenario starts here: in its first Given. */
async function begin(verse: string, step: number): Promise<void> {
  stopReading();
  cleanup();
  clearBus();
  forgetTrail();
  forgetChapters();
  stubChapterFetch();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubRecognizer();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear()]);
  await setGreekInterest(5);
  window.history.replaceState(null, '', '/#/today');
  ref = verse;
  await memorize(ref, ['en'], LAST_WHEN);
  await db.reviews.where('[kind+id]').equals(['verse', `en:${ref}`]).modify({ step, due: Date.now() - 1000, lastWhen: LAST_WHEN } satisfies Partial<Review>);
}

const verse = () => screen.getByTestId('memorize-verse');
const shownWords = () => [...verse().querySelectorAll('[data-token]:not([data-blank])')].map((t) => t.textContent ?? '');

/** Holds the bar and says `words`, then lets go. */
async function holdAndSay(words: string): Promise<void> {
  const before = FakeRecognizer.instances.length;
  fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
  const recogniser = FakeRecognizer.last();
  recogniser.open();
  recogniser.say([result(words, false)]);
  fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
}
const text = (t: string) => screen.getByText(new RegExp(t));

const feature = await loadFeature('features/memorize-session.feature');

describeFeature(feature, ({ Scenario }) => {
  const opens = (When: (text: string, fn: () => Promise<void>) => void) =>
    When('I open its Memorize session', async () => {
      openMemorizeSession(ref, 'en');
      render(<MemorizeScreen />);
      await screen.findByTestId('memorize-verse');
    });

  Scenario('A new verse starts with read and say', ({ Given, When, Then, And }) => {
    Given('the verse {string} is new in English', (_, v: string) => begin(v, 0));
    opens(When);
    Then('the session says {string}', (_, words: string) => {
      expect(text(words)).toBeTruthy();
    });
    And('every word of the verse is shown', () => {
      expect(verse().querySelectorAll('[data-blank]')).toHaveLength(0);
      expect([...verse().querySelectorAll('[data-token]')].map((t) => t.textContent)).toEqual(WORDS);
    });
  });

  Scenario('A verse I know starts with more words gone', ({ Given, When, Then, And }) => {
    Given('the verse {string} is at step 3 in English', (_, v: string) => begin(v, 3));
    opens(When);
    Then('the session says {string}', (_, words: string) => {
      expect(text(words)).toBeTruthy();
    });
    And('{int} of its {int} words are blanks', (_, gone: number, all: number) => {
      expect(verse().querySelectorAll('[data-token]')).toHaveLength(all);
      expect(verse().querySelectorAll('[data-blank]')).toHaveLength(gone);
    });
  });

  Scenario('The long check is from nothing', ({ Given, When, Then, And }) => {
    Given('the verse {string} is at the 90-day check in English', (_, v: string) => begin(v, RARE_STEP));
    opens(When);
    Then('the session says {string}', (_, words: string) => {
      expect(text(words)).toBeTruthy();
    });
    And('no word of the verse is shown', () => {
      expect(verse().textContent).toBe('');
    });
  });

  Scenario('I miss a word and it comes back tomorrow', ({ Given, When, Then, And }) => {
    Given('the verse {string} is at step 2 in English', (_, v: string) => begin(v, 2));
    opens(When);
    And('I hold the bar and say the verse without the words {string} and {string}', async (_, one: string, two: string) => {
      fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      const recogniser = FakeRecognizer.last();
      recogniser.open();
      recogniser.say([result(WORDS.filter((w) => w !== one && w !== two).join(' '), false)]);
      fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
    });
    Then('the session says {string}', async (_, words: string) => {
      expect((await screen.findByText(words)).textContent).toBe(words);
    });
    And('the words {string} and {string} are marked', (_, one: string, two: string) => {
      expect([...verse().querySelectorAll('[data-missed]')].map((t) => t.textContent)).toEqual([one, two]);
    });
    And('the session says {string}', (_, words: string) => {
      expect(screen.getByText(words)).toBeTruthy();
    });
    And('the recall is kept as said with a score of {number}', async (_, score: number) => {
      const [recall] = await recallsOf(ref, 'en');
      expect(recall.how).toBe('said');
      expect(recall.score).toBeCloseTo(score);
    });
  });

  Scenario('A long passage is learned in pieces, one commandment at a time, and then joined', ({ Given, When, Then, And }) => {
    Given('the passage {string} is new in English', (_, v: string) => begin(v, 0));
    opens(When);
    Then('the session offers {string} as piece {int} of {int}', async (_, heading: string, piece: number, of: number) => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading);
      expect(text(`Piece ${piece} of ${of} · English`)).toBeTruthy();
    });
    And('only the words of verses {int} and {int} are shown', (_, first: number, last: number) => {
      expect(first).toBe(1);
      expect(last).toBe(2);
      // Exodus 20:1-2: 'And God spoke all these words, saying: I am the LORD your God, who brought you out of the land of Egypt, out of the house of slavery.'
      const words = shownWords();
      expect(words.slice(0, 3)).toEqual(['And', 'God', 'spoke']);
      expect(words.join(' ')).toContain('out of the house of slavery.');
      expect(words.length).toBeLessThan(40);
    });
    When('I say each piece in turn and go on', async () => {
      for (let piece = 1; piece <= 11; piece++) {
        await screen.findByText(new RegExp(`Piece ${piece} of 11`));
        await holdAndSay(shownWords().join(' '));
        await screen.findByTestId('judgement');
        fireEvent.click(await screen.findByRole('button', { name: piece === 11 ? 'Join the pieces' : 'Next piece' }));
        await waitFor(() => expect(screen.queryByTestId('judgement')).toBeNull());
      }
    });
    Then('the session offers {string} with all {int} pieces together', (_, heading: string, count: number) => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading);
      expect(text(`All ${count} pieces together · English`)).toBeTruthy();
    });
    And('every word of the passage is shown', () => {
      expect(verse().querySelectorAll('[data-blank]')).toHaveLength(0);
      expect(shownWords().length).toBeGreaterThan(200);
    });
    When('I hold the bar and say the whole passage', async () => {
      await holdAndSay(shownWords().join(' '));
    });
    Then('the judgement starts with {string}', async (_, words: string) => {
      expect((await screen.findByTestId('judgement')).textContent).toMatch(new RegExp(`^${words}`));
    });
    And('the passage has one recall kept, on its one schedule row', async () => {
      expect(await recallsOf(ref, 'en')).toHaveLength(1);
      expect(await db.reviews.where('kind').equals('verse').count()).toBe(1);
    });
  });
});
