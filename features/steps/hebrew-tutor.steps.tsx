// features/steps/hebrew-tutor.steps.tsx — runs features/hebrew-tutor.feature: Ask the tutor on Jonah 1:10 (the copy of the built chapter in tests/fixtures/data/jon/1.json) sends the verse's Hebrew
// words to a fake Postern whose mill records the grist, the answer draws a Hebrew word right to left, and Quiz me is not in the row (mw-5vvlay.3).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const jonah = JSON.parse(readFileSync('tests/fixtures/data/jon/1.json', 'utf8')) as Chapter;
const verse10 = jonah.verses.find((v) => v.n === 10);
if (!verse10) throw new Error('no verse 10');
const HEBREW_ANSWER = {
  answer: 'The Hebrew word behind "fear" here is יָרֵא yare, "to fear", in the form וַיִּירְאוּ: they feared.',
  words: [],
};
let fake: FakePostern;

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

/** Opens Jonah 1 with a licence (the device key) and a fake Postern whose mill answers every ask with HEBREW_ANSWER. */
async function openJonah(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  tutorTimings.pollMs = 20;
  stubRecognizer();
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: HEBREW_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  window.history.replaceState(null, '', '/#/?b=jon&c=1');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear()]);
  render(<App />);
  await screen.findByRole('heading', { name: 'Jonah 1', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const viewEl = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
const received = () => {
  expect(fake.received).toHaveLength(1);
  return fake.received[0];
};

const feature = await loadFeature('features/hebrew-tutor.feature');

describeFeature(feature, ({ Scenario }) => {
  const openAndTap = async (n: number): Promise<void> => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const asks = async (_: unknown, question: string): Promise<void> => {
    await user.click(within(viewEl()).getByRole('button', { name: 'Ask the tutor', exact: true }));
    await screen.findByRole('region', { name: 'Ask the tutor' });
    await user.click(await within(viewEl()).findByRole('button', { name: 'Type a question' }));
    await user.type(await within(viewEl()).findByRole('textbox', { name: 'Your question' }), question);
    await user.click(within(viewEl()).getByRole('button', { name: 'Send' }));
  };
  const phone = 'Lampas is opened on Jonah 1 with a licence and a tutor behind a fake Postern';

  Scenario('Ask the tutor on Jonah 1:10 sends the Hebrew words with the English', ({ Given, When, And, Then }) => {
    Given(phone, openJonah);
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    And('he asks the tutor {string}', asks);
    Then('the mill received one verse-ask grist whose input carries the English of verse 10 and no Greek', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      const { grist, input } = received();
      expect(grist).toMatchObject({ app: 'lampas', kind: 'verse-ask', v: '1' });
      expect(input.reference).toBe('Jonah 1:10');
      expect(String(input.english)).toContain('The men knew that he was fleeing');
      expect(input.greek).toBe('');
      expect(input.greek_words).toBeUndefined();
    });
    And('its input carries the verse in Hebrew, pointed', () => {
      const hebrew = String(received().input.hebrew);
      expect(hebrew).toContain('הָאֲנָשִׁים');
      expect(hebrew.split(' ')).toHaveLength(verse10.g.length);
    });
    And('its input carries the Hebrew word {string} with the lemma {string}, the gloss {string} and its parsing in plain words', (_, form: string, lemma: string, gloss: string) => {
      const words = received().input.hebrew_words as { form: string; lemma: string; gloss: string; parse: string }[];
      const word = words.find((w) => w.form === form);
      expect(word).toMatchObject({ lemma, gloss });
      expect(word?.parse).toContain('Verb - Qal - Consecutive imperfect - third person masculine plural');
    });
  });

  Scenario("The tutor's answer draws its Hebrew right to left", ({ Given, When, And, Then }) => {
    Given(phone, openJonah);
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    And('he asks the tutor {string}', asks);
    Then('the answer shows under verse 10', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-answers-for="10"] [data-answer]')).toHaveLength(1));
    });
    And('the answer draws the Hebrew word {string} right to left', (_, word: string) => {
      const run = [...document.querySelectorAll<HTMLElement>('[data-answers-for="10"] [data-answer-text] [lang="he"]')].find((el) => el.textContent?.includes(word));
      expect(run, word).toBeDefined();
      expect(run?.getAttribute('dir')).toBe('rtl');
      expect(run?.classList.contains('script-he')).toBe(true);
    });
  });

  Scenario('Quiz me is not offered on Jonah 1:10, and Ask the tutor is', ({ Given, When, Then, And }) => {
    Given(phone, openJonah);
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    Then('the Verse view offers the actions {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => {
      const names = within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('button').map((x) => x.textContent?.trim() ?? '');
      expect(names).toEqual([a, b, c, d]);
    });
    And('the Verse view has no {string} and no {string}', (_, a: string, b: string) => {
      for (const name of [a, b]) expect(within(viewEl()).queryByRole('button', { name, exact: true }), name).toBeNull();
    });
  });
});
