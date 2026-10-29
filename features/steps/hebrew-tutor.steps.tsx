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

/** What a reader's phone holds before the app opens: the dials, his words, the levels of his Hebrew ideas. */
interface Seed {
  settings: Record<string, string>;
  words: { lemma: string; lang: 'grc' | 'hbo'; state: 'solid' | 'learning' }[];
  levels: { id: string; level: 'solid' | 'frontier' }[];
}

/** Opens Jonah 1 with a licence (the device key) and a fake Postern whose mill answers every ask with HEBREW_ANSWER. */
async function openJonah(): Promise<void> {
  await openChapter('#/?b=jon&c=1', 'Jonah 1');
}

/** Opens the chapter at `hash` (headed `title`) with a licence and a fake Postern, after `seed` is written to the phone. */
async function openChapter(hash: string, title: string, seed?: Seed): Promise<void> {
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
  window.history.replaceState(null, '', `/${hash}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  if (seed) {
    const now = Date.now();
    await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
    await db.settings.bulkPut(Object.entries(seed.settings).map(([key, value]) => ({ key, value })));
    await db.words.bulkPut(seed.words.map((w) => ({ ...w, lemmas: [], gloss: 'g', lesson: 0, since: w.state === 'solid' ? 0 : now - 3_600_000 })));
    await db.grammarLevels.bulkPut(seed.levels.map((l) => ({ ...l, since: now - 86_400_000, how: 'sheet' as const })));
  }
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** The answer is the Talk sheet's (mw-5r3p30.842): the sheet the Verse view's Ask opens. */
const sheetEl = (): HTMLElement => screen.getByRole('dialog', { name: /^Talk about / });
const viewEl = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
const received = () => {
  expect(fake.received).toHaveLength(1);
  return fake.received[0];
};

const HEBREW_WORDS: Seed['words'] = [
  { lemma: 'אֶרֶץ', lang: 'hbo', state: 'solid' },
  { lemma: 'בָּרָא', lang: 'hbo', state: 'solid' },
  { lemma: 'מַיִם', lang: 'hbo', state: 'learning' },
];
const HEBREW_READER: Seed = {
  settings: { greekInterest: '0', hebrewInterest: '3' },
  words: HEBREW_WORDS,
  levels: [
    { id: 'he-alphabet', level: 'solid' },
    { id: 'he-gender', level: 'solid' },
    { id: 'he-article', level: 'frontier' },
  ],
};
const GREEK_ONLY_READER: Seed = {
  settings: { greekInterest: '5', hebrewInterest: '0' },
  words: [...HEBREW_WORDS, { lemma: 'θεός', lang: 'grc', state: 'solid' }],
  levels: [],
};
const learnerLine = (): string => String(received().input.learner);

const feature = await loadFeature('features/hebrew-tutor.feature');

describeFeature(feature, ({ Scenario }) => {
  const openAndTap = async (n: number): Promise<void> => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const asks = async (_: unknown, question: string): Promise<void> => {
    // the Talk sheet holds the Hebrew from the Hebrew dial's Curious up (mw-gdcyf98.3); a reader who chose a dial keeps it
    if (!(await db.settings.get('hebrewInterest'))) await db.settings.put({ key: 'hebrewInterest', value: '1' });
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
    Then('the mill received one bible-talk grist whose input carries the English of verse 10 and no Greek', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      const { grist, input } = received();
      expect(grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(input.reference).toBe('Jonah 1:10');
      expect(String(input.english)).toContain('The men knew that he was fleeing');
      expect(input.greek).toBeUndefined();
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
    Then('the answer shows in the Talk sheet about Jonah 1:10', async () => {
      await waitFor(() => expect(sheetEl().querySelectorAll('[data-turn]')).toHaveLength(1));
    });
    And('the answer draws the Hebrew word {string} right to left', (_, word: string) => {
      const run = [...sheetEl().querySelectorAll<HTMLElement>('[data-turn] [lang="he"]')].find((el) => el.textContent?.includes(word));
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

  Scenario('The tutor on Genesis 1 is told his Hebrew words and his place on the Hebrew ladder', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with a licence, a tutor behind a fake Postern, and a reader of Hebrew with three Hebrew words and two ideas', () => openChapter('#/?b=gen&c=1', 'Genesis 1', HEBREW_READER));
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    And('he asks the tutor {string}', asks);
    Then('the mill received one bible-talk grist whose learner line tells his Hebrew words: 2 solid, learning {string}', async (_, word: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received().grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      expect(learnerLine()).toContain(`Hebrew: solid 2 words; learning: ${word}`);
    });
    And('its learner line puts him on the Hebrew ladder with 2 ideas known, {string} being learned and a next idea', (_, learning: string) => {
      expect(learnerLine()).toMatch(new RegExp(`ladder: 2 of \\d+ ideas known \\(.*\\); learning: ${learning}; next: \\S`));
    });
    And('its solid words are the Hebrew lemmas {string} and {string}', (_, a: string, b: string) => {
      expect((received().input.solid_words as string[]).sort()).toEqual([a, b].sort());
      expect(received().input.solid_count).toBe(2);
    });
  });

  Scenario("A Greek-only reader's request carries no Hebrew summary", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with a licence, a tutor behind a fake Postern, and a Greek-only reader who has kept three Hebrew words', () => openChapter('#/?b=gen&c=1', 'Genesis 1', GREEK_ONLY_READER));
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    And('he asks the tutor {string}', asks);
    Then('the mill received one bible-talk grist whose learner line is the Greek line {string}', async (_, line: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(learnerLine()).toBe(line);
    });
    And('its learner line says nothing of Hebrew or of a ladder', () => {
      expect(learnerLine()).not.toMatch(/Hebrew|ladder|אֶרֶץ/);
    });
  });

  Scenario("The ask's Hebrew word is drawn in the Hebrew face and opens its word sheet", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with a licence and a tutor behind a fake Postern whose answer lists the Hebrew word {string}', async (_, word: string) => {
      await openChapter('#/?b=gen&c=1', 'Genesis 1');
      fake.autoReply = { status: 'answered', answer: { answer: `The verb is ${word}.`, words: [{ greek: word, lemma: word, note: 'verb, Qal perfect, third person masculine singular', language: 'he' }] } };
    });
    When('he taps the number of verse {int}', (_, n: number) => openAndTap(n));
    And('he asks the tutor {string}', asks);
    Then('the answer lists the Hebrew word {string} with the lemma {string}, right to left in the Hebrew face', async (_, form: string, lemma: string) => {
      const list = await waitFor(() => {
        const found = sheetEl().querySelector<HTMLElement>('[data-turn] dl');
        if (!found) throw new Error('the answer has not arrived');
        return found;
      });
      const button = within(list).getByRole('button', { name: form });
      expect(button.getAttribute('lang')).toBe('he');
      expect(button.getAttribute('dir')).toBe('rtl');
      expect(button.classList.contains('script-he')).toBe(true);
      const lemmaSpan = [...list.querySelectorAll<HTMLElement>('dd [lang="he"]')].find((el) => el.textContent === lemma);
      expect(lemmaSpan?.classList.contains('script-he')).toBe(true);
    });
    When('he taps the Hebrew word {string} of the answer', async (_, form: string) => {
      await user.click(within(sheetEl().querySelector<HTMLElement>('[data-turn] dl')!).getByRole('button', { name: form }));
    });
    Then('the word sheet opens on the Hebrew word {string}', async (_, form: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Word' });
      expect(dialog).toHaveTextContent(form);
    });
  });
});
