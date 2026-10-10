// features/steps/teach.steps.tsx — runs features/teach.feature: the 'New N' chip in the Reader's row under the header and the teach sheet
// it opens (src/TeachSheet.tsx): the first new word of the chapter with its help, Got it, I know this, Not now and Ask the tutor.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter, wordParse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { forgetFrequency } from '../../src/data/frequency';
import { forgetSkipped } from '../../src/data/skipped';
import { STEP_DAYS, DAY } from '../../src/data/schedule';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { pronunciationOf } from '../../src/speech/pronunciation';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const chapter8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let taught: EventOf<'frontier-taught'>[] = [];
let startedAt = 0;
/** The Laptop's wall clock steps back by about a second now and then: a bound on a stored time allows for it. */
const CLOCK_SLACK = 3000;

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  forgetSkipped();
  forgetFrequency();
  taught = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  subscribe('frontier-taught', (event) => taught.push(event));
  startedAt = Date.now();
}

/** The first new word of Romans 8 with his seed: the commonest word of the chapter he has not got (docs/frontier.md). */
const FIRST = 'αὐτός';
const strip = () => screen.getByTestId('new-words');
const sheet = () => screen.getByRole('dialog', { name: 'New word' });
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const nfc = (s: string): string => s.normalize('NFC');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function shows(lemma: string): Promise<void> {
  await waitFor(() => expect(nfc(within(sheet()).getByTestId('teach-lemma').textContent ?? '')).toBe(nfc(lemma)));
}
/** Opens the sheet and waits for the word his seed leaves first (the seed lands a moment after the first paint). */
async function openSheet(): Promise<void> {
  await user.click(await screen.findByTestId('new-words'));
  await screen.findByRole('dialog', { name: 'New word' });
  await shows(FIRST);
}
const firstWordOf = (lemma: string) => {
  for (const verse of chapter8.verses) {
    const word = verse.g.find((w) => nfc(w.l) === nfc(lemma));
    if (word) return { word, verse: verse.n };
  }
  throw new Error(`${lemma} is not in Romans 8`);
};
const wordRow = async (lemma: string) => db.words.get(nfc(lemma));
const reviewRow = async (lemma: string) => db.reviews.get(['word', nfc(lemma)]);

const feature = await loadFeature('features/teach.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('Lampas is opened on Romans 8 with his seed words and a fake Postern', open);
  });

  Scenario('The row under the header shows the chip New 3 for Romans 8 with his seed', ({ Then }) => {
    Then("the chip under the Reader's header reads {string}", async (_, text: string) => {
      await waitFor(() => expect(strip()).toHaveTextContent(text));
    });
  });

  Scenario('The strip is hidden when no new word is left', ({ Given, Then }) => {
    Given('every word of Romans 8 is already one he has', async () => {
      await screen.findByTestId('new-words');
      const lemmas = new Set(chapter8.verses.flatMap((v) => v.g.map((w) => nfc(w.l))));
      const now = Date.now();
      await db.words.bulkPut([...lemmas].map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid' as const, since: now })));
    });
    Then("the Reader shows no New words strip", async () => {
      await waitFor(() => expect(screen.queryByTestId('new-words')).toBeNull());
    });
  });

  Scenario('The teach sheet shows the word with its help', ({ When, Then, And }) => {
    When('he taps New words', openSheet);
    Then(
      'the teach sheet shows {string} large with a speaker, its transliteration, its meaning {string} and the form of its first occurrence',
      async (_, lemma: string, gloss: string) => {
        await shows(lemma);
        const { word } = firstWordOf(lemma);
        expect(within(sheet()).getByTestId('teach-lemma')).toHaveClass('text-5xl');
        expect(within(sheet()).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
        const respelling = pronunciationOf(undefined).respell(nfc(lemma));
        expect(respelling).not.toBe('');
        expect(within(sheet()).getByTestId('teach-translit')).toHaveTextContent(respelling);
        expect(within(sheet()).getByTestId('teach-gloss')).toHaveTextContent(gloss);
        const parse = wordParse(chapter8, word);
        expect(parse).not.toBe('');
        expect(within(sheet()).getByTestId('teach-form')).toHaveTextContent(parse);
      },
    );
    And('the teach sheet has the buttons Got it, I know this, Not now and Ask the tutor, each at least 48 px tall', () => {
      for (const name of ['Got it', 'I know this', 'Not now', 'Ask the tutor']) {
        const button = within(sheet()).getByRole('button', { name, exact: true });
        expect(button.className, name).toContain('min-h-12');
      }
    });
  });

  Scenario('The sheet shows the easiest verse with the new word in Greek and its English beneath', ({ When, Then, And }) => {
    When('he taps New words', openSheet);
    Then('the sheet shows verse {int} with {string} in Greek and its English in small grey beneath it', (_, n: number, lemma: string) => {
      const verse = within(sheet()).getByTestId('teach-verse');
      expect(verse).toHaveAttribute('data-verse-n', String(n));
      const marked = verse.querySelectorAll<HTMLElement>('[data-new]');
      expect(marked.length).toBeGreaterThan(0);
      const forms = chapter8.verses[n - 1].g.filter((w) => nfc(w.l) === nfc(lemma)).map((w) => w.t);
      const shown = [...marked].map((m) => squash(m.querySelector('[data-greek]')?.textContent)).join(' ');
      expect(forms.some((form) => shown.includes(form))).toBe(true);
      for (const m of marked) {
        expect(m.querySelector('[data-greek]')).not.toBeNull();
        expect(squash(m.querySelector('[data-hint]')?.textContent)).not.toBe('');
        expect(m.querySelector('[data-hint]')).toHaveClass('text-muted', 'text-sm');
      }
      // some English stays English around it
      expect(verse.querySelectorAll('[data-plain]').length).toBeGreaterThan(0);
    });
    And('the verse number on the sheet is a link to the verse in the reader', () => {
      expect(within(sheet()).getByRole('button', { name: 'Romans 8:9' })).toBeInTheDocument();
    });
  });

  Scenario('The verse number takes him to the verse in the reader', ({ When, And, Then }) => {
    When('he taps New words', openSheet);
    And('he taps the verse number on the teach sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Romans 8:9' }));
    });
    Then('the teach sheet is gone and verse {int} is still on the reader', async (_, n: number) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New word' })).toBeNull());
      // jsdom has no layout: where the verse stands is proved by tests/e2e/teach.spec.ts
      expect(document.querySelector(`[data-verse="${n}"]`)).toHaveAttribute('data-selected', 'false');
    });
  });

  Scenario('Got it adds the word to Words as learning and schedules it due today', ({ When, And, Then }) => {
    When('he taps New words', openSheet);
    And('he taps Got it', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Got it', exact: true }));
    });
    Then('{string} is a learning word from his reading, scheduled at step 0 and due now', async (_, lemma: string) => {
      await waitFor(async () => expect(await wordRow(lemma)).toBeDefined());
      expect(await wordRow(lemma)).toMatchObject({ state: 'learning', lesson: 0, source: 'frontier' });
      const row = await reviewRow(lemma);
      expect(row?.step).toBe(0);
      expect(row?.due).toBeLessThanOrEqual(Date.now() + CLOCK_SLACK);
      expect(row?.due).toBeGreaterThanOrEqual(startedAt - DAY - CLOCK_SLACK);
    });
    And('a frontier-taught event for {string} with the outcome {string} was published', (_, lemma: string, outcome: string) => {
      expect(taught).toEqual([{ kind: 'frontier-taught', lemma: nfc(lemma), outcome }]);
    });
    And('the teach sheet now shows {string}', async (_, lemma: string) => {
      await shows(lemma);
    });
    And('Words lists {string} under From my reading', async (_, lemma: string) => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
      const heading = await screen.findByRole('heading', { name: 'From my reading' });
      const group = heading.closest('section') as HTMLElement;
      expect(group.querySelector(`[data-lemma="${nfc(lemma)}"]`)).not.toBeNull();
    });
  });

  Scenario('I know this adds the word solid at the 30-day step', ({ When, And, Then }) => {
    When('he taps New words', openSheet);
    And('he taps I know this', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'I know this', exact: true }));
    });
    Then('{string} is a solid word from his reading, scheduled at the 30-day step', async (_, lemma: string) => {
      await waitFor(async () => expect(await wordRow(lemma)).toBeDefined());
      expect(await wordRow(lemma)).toMatchObject({ state: 'solid', lesson: 0, source: 'frontier' });
      const row = await reviewRow(lemma);
      expect(row?.step).toBe(STEP_DAYS.indexOf(30));
      expect(row?.due).toBeGreaterThanOrEqual(startedAt + 30 * DAY - CLOCK_SLACK);
      expect(row?.due).toBeLessThanOrEqual(Date.now() + 30 * DAY + CLOCK_SLACK);
    });
    And('a frontier-taught event for {string} with the outcome {string} was published', (_, lemma: string, outcome: string) => {
      expect(taught).toEqual([{ kind: 'frontier-taught', lemma: nfc(lemma), outcome }]);
    });
    And('the teach sheet now shows {string}', async (_, lemma: string) => {
      await shows(lemma);
    });
  });

  Scenario('Not now shows the next word and the skipped one does not return today', ({ When, And, Then }) => {
    When('he taps New words', openSheet);
    And('he taps Not now', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Not now', exact: true }));
    });
    Then('the teach sheet now shows {string}', async (_, lemma: string) => {
      await shows(lemma);
    });
    And('{string} is not among his words', async (_, lemma: string) => {
      expect(await wordRow(lemma)).toBeUndefined();
    });
    When('he closes the teach sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New word' })).toBeNull());
    });
    And('he opens the teach sheet again', async () => {
      await user.click(await screen.findByTestId('new-words'));
      await screen.findByRole('dialog', { name: 'New word' });
    });
    Then('the teach sheet shows {string} and never {string} again', async (_, next: string, skipped: string) => {
      await shows(next);
      expect(nfc(within(sheet()).getByTestId('teach-lemma').textContent ?? '')).not.toBe(nfc(skipped));
      expect(strip()).toHaveTextContent('New 3');
    });
  });

  Scenario('Ask the tutor opens the Talk sheet on that word', ({ When, And, Then }) => {
    When('he taps New words', openSheet);
    And('he taps Ask the tutor on the teach sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Ask the tutor', exact: true }));
    });
    Then('the teach sheet is gone and the Talk sheet is titled {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New word' })).toBeNull());
      expect(talkSheet()).toHaveAccessibleName(title);
    });
    And('the grist carries a question that names {string}', async (_, lemma: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(nfc(String(fake.received[0].input.question))).toContain(nfc(lemma));
    });
  });
});
