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
import { openMemorizeSession } from '../../src/nav/route';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const WORDS = ['From', 'His', 'fullness', 'we', 'have', 'all', 'received', 'grace', 'upon', 'grace.'];
const LAST_WHEN = 1_700_000_000_000;

afterAll(() => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
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
});
