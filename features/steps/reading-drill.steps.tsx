// features/steps/reading-drill.steps.tsx — runs features/reading-drill.feature: the drill the reading panel offers for a sound (Greek) or words (English) he misses
// in two of his last five readings (src/ReadingDrill.tsx, src/data/readingDrill.ts), its review kind `sound` (src/review/kinds.ts) and the Review screen asking it.
// The readings go through a fake Postern whose mill opens the grist (tests/support/fake-postern.ts) and a fake recorder.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { scoreWords } from '../../src/data/ladderScore';
import { forgetFrequency } from '../../src/data/frequency';
import { keepVerseReading, setReaderView, type FixWord } from '../../src/data/repositories';
import { mulberry32 } from '../../src/data/quiz';
import { STEP_DAYS, DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, POSTERN_ORIGIN, WELL_READ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
const T0 = Date.UTC(2026, 9, 12, 9, 0, 0);

let fake: FakePostern;
let clock = 0;

/** One minute after the last reading he made, so the readings have an order. */
const nextAt = (): number => T0 + 60_000 * clock++;
const fix = (word: string, chunks: string[]): FixWord => ({ word, chunks, tip: 'Say it slowly.' });

async function open(startView: 'english' | 'greek', hash = ''): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = hash;
  stubRecorder();
  FakeRecorder.denied = false;
  FakeRecorder.durationMs = 2000;
  tutorTimings.pollMs = 20;
  clock = 0;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  stubChapterFetch();
  forgetFrequency();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear(), db.readingHistory.clear(), db.missTally.clear(), db.ladder.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await setReaderView(startView);
  render(<App newRandom={() => mulberry32(7)} />);
  if (hash === '') {
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  }
}

/** Five readings in Greek in all, the newest `misses` of them marking a word with ου in it. */
async function greekMisses(misses: number): Promise<void> {
  const total = 5;
  for (let i = 0; i < total; i++) {
    const missed = i >= total - misses;
    await keepVerseReading(`rom.8.${i + 1}`, missed ? 'some-to-fix' : 'well-read', missed ? [fix('οὐρανοῦ', ['οὐ', 'ρα', 'νοῦ'])] : [], 'A reading.', 'el', nextAt());
  }
}

async function englishMisses(word: string, misses: number): Promise<void> {
  for (let i = 0; i < misses; i++) await keepVerseReading(`rom.8.${clock + 1}`, 'some-to-fix', [fix(word, [word.slice(0, 4), word.slice(4)])], 'A reading.', 'en', nextAt());
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });
const drill = () => screen.getByRole('dialog', { name: 'Reading drill' });

async function openReadCheck(): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28', exact: true });
  await user.click(number);
  const region = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(region).getByRole('button', { name: 'Read it aloud', exact: true }));
  await screen.findByRole('region', { name: 'Reading check' });
}

const offered = (name: string) => within(panel()).queryByRole('button', { name, exact: true });

/** The word on the drill's card now. */
const wordNow = (): string => drill().querySelector('[data-drill-word]')?.textContent ?? '';

async function holdBarOfWord(): Promise<HTMLElement> {
  return within(drill()).findByRole('button', { name: /^Hold to read / });
}

async function readWord(): Promise<void> {
  const bar = await holdBarOfWord();
  FakeRecorder.durationMs = 1500;
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
  await waitFor(() => expect(drill()).toHaveTextContent('Well read'));
}

const stripped = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');

const tap = async (_: unknown, name: string): Promise<void> => {
  const where = screen.queryByRole('dialog', { name: 'Reading drill' }) ? drill() : document.body;
  await user.click(await within(where).findByRole('button', { name, exact: true }));
};

const feature = await loadFeature('features/reading-drill.feature');

describeFeature(feature, ({ Scenario }) => {
  const opensGreek = 'Lampas is opened on Romans 8 in Greek behind a fake Postern that finds nothing to fix';
  const opensEnglish = 'Lampas is opened on Romans 8 in English behind a fake Postern that finds nothing to fix';
  const missedGreek = async (_: unknown, count: number) => greekMisses(count);
  const missedEnglish = async (_: unknown, word: string, count: number) => englishMisses(word, count);
  const sawWords: string[] = [];

  Scenario('Two misses of ου in his last five readings offer a drill of the sound', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek'));
    And('he misread an ου word in {int} of his last 5 readings in Greek', missedGreek);
    When('he opens the reading check of verse 28', openReadCheck);
    Then('the reading panel offers {string} and not {string}', async (_, yes: string, no: string) => {
      await waitFor(() => expect(offered(yes)).not.toBeNull());
      expect(offered(no)).toBeNull();
    });
  });

  Scenario('One miss shows no drill', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek'));
    And('he misread an ου word in {int} of his last 5 readings in Greek', missedGreek);
    When('he opens the reading check of verse 28', openReadCheck);
    Then('the reading panel offers neither {string} nor {string}', async (_, a: string, b: string) => {
      // the tally is read live: give it the moment it needs before saying nothing is there
      await waitFor(async () => expect((await db.missTally.toArray()).length).toBeGreaterThan(0));
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(offered(a)).toBeNull();
      expect(offered(b)).toBeNull();
    });
  });

  Scenario('The drill shows the rule and five words containing ου', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek'));
    And('he misread an ου word in {int} of his last 5 readings in Greek', missedGreek);
    When('he opens the reading check of verse 28', openReadCheck);
    And('he opens the drill with {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
      await screen.findByRole('dialog', { name: 'Reading drill' });
    });
    Then('the drill shows the rule {string} with a speaker', async (_, rule: string) => {
      expect(drill()).toHaveTextContent(rule);
      expect(within(drill()).getByRole('button', { name: 'Hear ου' })).toBeInTheDocument();
    });
    When('he taps {string}', tap);
    And('he skips through the words of the drill', async () => {
      sawWords.length = 0;
      for (let i = 0; i < 5; i++) {
        await waitFor(() => expect(wordNow()).not.toBe(''));
        sawWords.push(wordNow());
        await user.click(within(drill()).getByRole('button', { name: 'Skip this word', exact: true }));
        if (i < 4) await waitFor(() => expect(wordNow()).not.toBe(sawWords[i]));
      }
    });
    Then('the drill showed {int} different words, each containing ου', (_, count: number) => {
      expect(sawWords).toHaveLength(count);
      expect(new Set(sawWords).size).toBe(count);
      for (const word of sawWords) expect(stripped(word)).toContain('ου');
      // easiest first, by the ladder's own scoring
      const scores = sawWords.map((w) => scoreWords([w]).score);
      expect(scores).toEqual([...scores].sort((a, b) => a - b));
    });
  });

  Scenario('Finishing the drill schedules a sound review within the first step of the schedule', ({ Given, And, When, Then }) => {
    Given(opensGreek, () => open('greek'));
    And('he misread an ου word in {int} of his last 5 readings in Greek', missedGreek);
    When('he opens the reading check of verse 28', openReadCheck);
    And('he opens the drill with {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
      await screen.findByRole('dialog', { name: 'Reading drill' });
    });
    And('he taps {string}', tap);
    And('he reads each of the {int} words of the drill aloud', async (_, count: number) => {
      for (let i = 0; i < count; i++) {
        await readWord();
        await user.click(within(drill()).getByRole('button', { name: i === count - 1 ? 'Finish' : 'Next word', exact: true }));
      }
    });
    Then('the drill says {string}', async (_, text: string) => {
      await waitFor(() => expect(drill()).toHaveTextContent(text));
    });
    And('his reading history still holds only the {int} readings he made', async (_, count: number) => {
      expect(await db.readingHistory.count()).toBe(count);
    });
    And('a review of kind {string} for {string} is due within the first step of the schedule', async (_, kind: string, id: string) => {
      const row = await db.reviews.get([kind, id]);
      expect(row, 'the review is on the schedule').toBeTruthy();
      expect(row?.step).toBe(0);
      expect(row?.due).toBeGreaterThan(Date.now());
      expect(row?.due).toBeLessThanOrEqual(Date.now() + STEP_DAYS[0] * DAY);
    });
    When('he leaves the drill with {string}', tap);
    Then('the drill is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reading drill' })).toBeNull());
    });
  });

  Scenario('English offers a drill of the words he misread', ({ Given, And, When, Then }) => {
    Given(opensEnglish, () => open('english'));
    And('he misread the word {string} in {int} of his last 5 readings in English', missedEnglish);
    And('he also misread the word {string} in {int} of his last 5 readings in English', missedEnglish);
    When('he opens the reading check of verse 28', openReadCheck);
    Then('the reading panel offers {string} and not {string}', async (_, yes: string, no: string) => {
      await waitFor(() => expect(offered(yes)).not.toBeNull());
      expect(offered(no)).toBeNull();
    });
    When('he opens the drill with {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
      await screen.findByRole('dialog', { name: 'Reading drill' });
    });
    Then('the drill lists the words {string} and {string}', (_, a: string, b: string) => {
      expect(drill()).toHaveTextContent(a);
      expect(drill()).toHaveTextContent(b);
    });
  });

  Scenario('A drilled sound that is due is asked on the Review screen', ({ Given, Then, When }) => {
    Given('Lampas is opened on the Review screen with the sound {string} due', async (_, id: string) => {
      await open('greek', '#/review');
      const now = Date.now();
      await db.reviews.put({ kind: 'sound', id, step: 0, due: now - 60_000, lastWhen: now - DAY, lapses: 0, rights: 0 });
      // Review counts what is due when it opens: open it again now that the sound is on the schedule
      cleanup();
      render(<App newRandom={() => mulberry32(7)} />);
    });
    Then('Review says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name, exact: true }));
    });
    Then('Review asks about the sound {string}', async (_, glyph: string) => {
      // the exact gaps of the letters come first, then the due items: answer what comes until the sound's own card is up
      for (let i = 0; i < 10; i++) {
        const card = await screen.findByTestId('grammar-prompt').catch(() => null);
        if (card?.getAttribute('data-idea') === 'diphthong-ou') {
          const form = screen.queryByTestId('grammar-form')?.textContent ?? '';
          const options = [...document.querySelectorAll('[data-option]')].map((o) => o.textContent);
          expect([form, ...options].join(' ')).toContain(glyph);
          return;
        }
        const option = document.querySelector<HTMLElement>('[data-option]');
        if (option) await user.click(option);
        else await user.click(await screen.findByRole('button', { name: 'Show' }).catch(() => screen.getByRole('button', { name: 'Not yet' })));
        const next = await screen.findByTestId('next');
        await user.click(next);
      }
      throw new Error('the sound was never asked');
    });
  });
});
