// features/steps/hebrew-words.steps.tsx — runs features/hebrew-words.feature: Hebrew words taught while he reads (mw-gdcyf98.19). Genesis 1 (the copy in tests/fixtures/data/gen/1.json) at the
// Hebrew dial's Learning step offers its commonest Hebrew words on the teach sheet (drawn right to left, respelt, heard in the Hebrew voice); Got it keeps a Hebrew word that Words, the Quick test,
// Review and the Parsing drill then ask in Hebrew. Speech is voice-kit's honest fake (tests/support/fake-speech.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { forgetFrequency } from '../../src/data/frequency';
import { SEED_WORDS_HBO } from '../../src/data/seed-words-hbo';
import { forgetSkipped } from '../../src/data/skipped';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { chosenHebrewPronunciation } from '../../src/speech/pronunciation';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const user = userEvent.setup();
let synth: FakeSynth | undefined;

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const nfc = (s: string): string => s.normalize('NFC');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Phone {
  /** the Greek and Hebrew dials: 0 to 5 (3 is Learning) */
  greek: number;
  hebrew: number;
  newWords?: number;
  speaks?: boolean;
  words?: { lemma: string; lang: 'grc' | 'hbo'; gloss: string }[];
}

/** Opens the app on a chapter with the dials, the pace and the words given. */
async function openOn(title: string, phone: Phone): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  forgetSkipped();
  forgetFrequency();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = phone.speaks ? stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]) : undefined;
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear()]);
  await db.settings.put({ key: 'greekInterest', value: String(phone.greek) });
  await db.settings.put({ key: 'hebrewInterest', value: String(phone.hebrew) });
  if (phone.newWords !== undefined) await db.settings.put({ key: 'newWordsADay', value: String(phone.newWords) });
  const now = Date.now();
  for (const w of phone.words ?? []) {
    await db.words.put({ lemma: nfc(w.lemma), lang: w.lang, lemmas: [nfc(w.lemma)], gloss: w.gloss, lesson: 0, source: 'frontier', state: 'learning', since: now });
    await db.reviews.put({ kind: 'word', id: nfc(w.lemma), step: 0, due: now - 1000, lastWhen: 0, lapses: 0, rights: 0 });
  }
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const HEBREW_LEARNING = { greek: 0, hebrew: 3, newWords: 3 };
const strip = () => screen.findByTestId('new-words');
const sheet = () => screen.getByRole('dialog', { name: 'New word' });
const openSheet = async (): Promise<void> => {
  await user.click(await strip());
  await screen.findByRole('dialog', { name: 'New word' });
};
const shows = (lemma: string) => waitFor(() => expect(nfc(within(sheet()).getByTestId('teach-lemma').textContent ?? '')).toBe(nfc(lemma)));
const goTo = async (hash: string, name: string): Promise<void> => {
  window.location.hash = hash;
  await screen.findByRole('heading', { name, level: 1 });
};
const takeWithGotIt = async (): Promise<void> => {
  await openSheet();
  await user.click(within(sheet()).getByRole('button', { name: 'Got it', exact: true }));
  await waitFor(async () => expect(await db.words.count()).toBe(1));
  await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
};
const hebrewFace = (el: HTMLElement): void => {
  expect(el).toHaveAttribute('lang', 'he');
  expect(el).toHaveAttribute('dir', 'rtl');
  expect(el).toHaveClass('script-he');
};
const wordRow = (lemma: string) => document.querySelector<HTMLElement>(`[data-lemma="${nfc(lemma)}"]`);
const segment = () => screen.getByRole('group', { name: /language/i });

const feature = await loadFeature('features/hebrew-words.feature');

describeFeature(feature, ({ Scenario }) => {
  const learning = 'Lampas is opened on Genesis 1 with Hebrew chosen at Learning and 3 new words a day';
  const learningWithVoice = `${learning} on a phone with a Hebrew voice`;
  const both = 'Lampas is opened on Genesis 1 with both languages chosen and a Greek and a Hebrew word he is learning';
  const taken = 'he has taken {string} on the teach sheet with Got it';
  const bothWords = [
    { lemma: 'λόγος', lang: 'grc' as const, gloss: 'word' },
    { lemma: 'אֵת', lang: 'hbo' as const, gloss: '[Obj.]' },
  ];

  Scenario('Genesis 1 at Hebrew Learning with 3 new words a day shows the chip and the teach sheet of the first word', ({ Given, When, Then, And }) => {
    Given(learning, () => openOn('Genesis 1', HEBREW_LEARNING));
    Then("the chip under the Reader's header reads {string}", async (_, text: string) => {
      await waitFor(async () => expect(await strip()).toHaveTextContent(text));
    });
    When('he taps New words', openSheet);
    Then('the teach sheet shows {string} large in Hebrew, right to left, with its respelling, its meaning {string} and Hear it', async (_, lemma: string, gloss: string) => {
      await shows(lemma);
      const word = within(sheet()).getByTestId('teach-lemma');
      hebrewFace(word);
      expect(word).toHaveClass('hebrew-form');
      const respelling = chosenHebrewPronunciation().respell(nfc(lemma));
      expect(respelling).not.toBe('');
      expect(within(sheet()).getByTestId('teach-translit')).toHaveTextContent(respelling);
      expect(within(sheet()).getByTestId('teach-gloss')).toHaveTextContent(gloss);
      expect(within(sheet()).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
      expect(within(sheet()).getByTestId('teach-form')).toHaveTextContent(/Direct object marker/);
    });
    And('the teach sheet shows verse {int} with {string} in Hebrew and its English in small grey beneath it', (_, n: number, lemma: string) => {
      const verse = within(sheet()).getByTestId('teach-verse');
      expect(verse).toHaveAttribute('data-verse-n', String(n));
      const marked = [...verse.querySelectorAll<HTMLElement>('[data-new]')];
      expect(marked.length).toBeGreaterThan(0);
      for (const m of marked) {
        hebrewFace(m);
        expect(squash(m.querySelector('[data-hint]')?.textContent)).not.toBe('');
      }
      expect(marked.map((m) => nfc(m.textContent ?? '')).join(' ')).toContain(nfc(lemma).replace(/[֑-֯]/g, '').slice(0, 1));
      expect(within(sheet()).getByRole('button', { name: 'Genesis 1:1' })).toBeInTheDocument();
    });
  });

  Scenario('Hear it on the teach sheet says the word in the Hebrew voice', ({ Given, When, And, Then }) => {
    Given(learningWithVoice, () => openOn('Genesis 1', { ...HEBREW_LEARNING, speaks: true }));
    When('he taps New words', openSheet);
    And('he taps Hear it on the teach sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Hear it' }));
    });
    Then('the phone says {string} in {string}', async (_, text: string, lang: string) => {
      await waitFor(() => expect(synth?.spoken.at(-1)).toMatchObject({ lang }));
      expect(nfc(synth?.spoken.at(-1)?.text ?? '')).toContain(nfc(text).replace(/[֑-֯]/g, '').slice(0, 1));
    });
  });

  Scenario('Got it puts the word in Words under Hebrew and the next one is offered', ({ Given, When, And, Then }) => {
    Given(learning, () => openOn('Genesis 1', HEBREW_LEARNING));
    When('he taps New words', openSheet);
    And('he taps Got it', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Got it', exact: true }));
    });
    Then('{string} is a learning Hebrew word from his reading, scheduled at step 0 and due now', async (_, lemma: string) => {
      await waitFor(async () => expect(await db.words.get(nfc(lemma))).toBeDefined());
      expect(await db.words.get(nfc(lemma))).toMatchObject({ lang: 'hbo', state: 'learning', lesson: 0, source: 'frontier', gloss: '[Obj.]' });
      const row = await db.reviews.get(['word', nfc(lemma)]);
      expect(row?.step).toBe(0);
      expect(row?.due).toBeLessThanOrEqual(Date.now() + 3000);
    });
    And('the teach sheet now shows {string}', (_, lemma: string) => shows(lemma));
    When('he opens Words', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await goTo('#/words', 'Words');
    });
    Then('Words lists {string} in Hebrew, right to left', async (_, lemma: string) => {
      await waitFor(() => expect(wordRow(lemma)).not.toBeNull());
      const text = wordRow(lemma)!.querySelector<HTMLElement>('[lang="he"]');
      expect(text).not.toBeNull();
      hebrewFace(text!);
      // Hebrew chosen alone: the one language, no segment
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
  });

  Scenario('Words has a Greek | Hebrew segment where both languages are chosen', ({ Given, When, Then }) => {
    Given(both, () => openOn('Genesis 1', { greek: 3, hebrew: 3, newWords: 0, words: bothWords }));
    When('he opens Words', () => goTo('#/words', 'Words'));
    Then('Words has the language segment with Greek pressed and lists {string} and not {string}', async (_, shown: string, hidden: string) => {
      await waitFor(() => expect(wordRow(shown)).not.toBeNull());
      expect(within(segment()).getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(segment()).getByRole('button', { name: 'Hebrew' })).toHaveAttribute('aria-pressed', 'false');
      expect(wordRow(hidden)).toBeNull();
    });
    When('he taps Hebrew on the segment', async () => {
      await user.click(within(segment()).getByRole('button', { name: 'Hebrew' }));
    });
    Then('Words lists {string} and not {string}', async (_, shown: string, hidden: string) => {
      await waitFor(() => expect(wordRow(shown)).not.toBeNull());
      expect(wordRow(hidden)).toBeNull();
    });
  });

  Scenario('A Quick test asks the Hebrew word among Hebrew words', ({ Given, And, When, Then }) => {
    Given(learningWithVoice, () => openOn('Genesis 1', { ...HEBREW_LEARNING, speaks: true }));
    And(taken, takeWithGotIt);
    When('he opens the Quick test', () => goTo('#/test', 'Quick test'));
    Then('the Quick test asks {string} large in Hebrew, right to left, among four glosses of Hebrew words', async (_, lemma: string) => {
      const prompt = await screen.findByTestId('prompt');
      expect(nfc(prompt.textContent ?? '')).toBe(nfc(lemma));
      hebrewFace(prompt);
      expect(prompt).toHaveClass('hebrew-form');
      const options = [...document.querySelectorAll<HTMLElement>('[data-option]')].map((o) => squash(o.textContent));
      expect(options).toHaveLength(4);
      const hebrewGlosses = new Set(SEED_WORDS_HBO.map((s) => s.gloss));
      for (const option of options) expect(hebrewGlosses.has(option), option).toBe(true);
      expect(options).toContain('[Obj.]');
    });
    When('he picks {string}', async (_, gloss: string) => {
      await user.click(screen.getByRole('button', { name: gloss }));
    });
    Then('the answer is right and the phone says {string} in {string}', async (_, text: string, lang: string) => {
      await waitFor(() => expect(screen.getByTestId('feedback')).toHaveTextContent('Right.'));
      await waitFor(() => expect(synth?.spoken.at(-1)).toMatchObject({ lang }));
      expect(nfc(synth?.spoken.at(-1)?.text ?? '')).toContain(nfc(text).replace(/[֑-֯]/g, '').slice(0, 1));
    });
  });

  Scenario('Review lists the Hebrew word due and asks it in Hebrew', ({ Given, And, When, Then }) => {
    Given(learning, () => openOn('Genesis 1', HEBREW_LEARNING));
    And(taken, takeWithGotIt);
    When('he opens Review', () => goTo('#/review', 'Review'));
    Then('Review says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
    When('he starts the round', async () => {
      await user.click(screen.getByRole('button', { name: 'Start' }));
    });
    Then('Review asks {string} in Hebrew, right to left', async (_, lemma: string) => {
      const prompt = await screen.findByTestId('prompt');
      expect(nfc(prompt.textContent ?? '')).toBe(nfc(lemma));
      hebrewFace(prompt);
    });
  });

  Scenario('Review has the Greek | Hebrew segment where both languages are chosen', ({ Given, When, Then, And }) => {
    Given(both, () => openOn('Genesis 1', { greek: 3, hebrew: 3, newWords: 0, words: bothWords }));
    When('he opens Review', () => goTo('#/review', 'Review'));
    Then('Review says {string} and has the language segment', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
      expect(within(segment()).getByRole('button', { name: 'Greek' })).toBeInTheDocument();
      expect(within(segment()).getByRole('button', { name: 'Hebrew' })).toBeInTheDocument();
    });
    When('he taps Hebrew on the segment', async () => {
      await user.click(within(segment()).getByRole('button', { name: 'Hebrew' }));
    });
    And('he starts the round', async () => {
      await user.click(screen.getByRole('button', { name: 'Start' }));
    });
    Then('Review asks {string} in Hebrew, right to left', async (_, lemma: string) => {
      const prompt = await screen.findByTestId('prompt');
      expect(nfc(prompt.textContent ?? '')).toBe(nfc(lemma));
      hebrewFace(prompt);
    });
  });

  Scenario('The Parsing drill on a Hebrew word asks its terms with the verse in Hebrew', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with Hebrew chosen at Learning and a Hebrew verb he is learning', () =>
      openOn('Genesis 1', { ...HEBREW_LEARNING, newWords: 0, words: [{ lemma: 'בָּרָא', lang: 'hbo', gloss: 'to create' }] }),
    );
    When('he opens the Parsing drill', () => goTo('#/drill', 'Parsing drill'));
    Then('the Parsing drill shows the verse in Hebrew, right to left, with {string} marked', async (_, form: string) => {
      const verse = await screen.findByTestId('drill-verse');
      hebrewFace(verse);
      expect(nfc(within(verse).getByTestId('drill-word').textContent ?? '')).toBe(nfc(form));
    });
    And('its first step is {string} and the next is {string}', async (_, first: string, second: string) => {
      const label = (text: string | null) => squash(text);
      expect(label((await screen.findByTestId('drill-step')).textContent)).toContain(first.toLowerCase());
      const options = [...document.querySelectorAll<HTMLElement>('button[data-option], ul button')].map((o) => squash(o.textContent));
      expect(options).toContain('verb');
      await user.click(screen.getByRole('button', { name: 'verb' }));
      await user.click(await screen.findByRole('button', { name: /next/i }));
      await waitFor(() => expect(squash(screen.getByTestId('drill-step').textContent)).toContain(second.toLowerCase()));
      expect(screen.getByTestId('drill-step').querySelector('[lang="he"]')).not.toBeNull();
    });
  });

  Scenario('Greek only offers no Hebrew new words on Genesis 1', ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with Greek chosen alone and 3 new words a day', () => openOn('Genesis 1', { greek: 5, hebrew: 0, newWords: 3 }));
    Then('the Reader shows no New words chip', async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.queryByTestId('new-words')).toBeNull();
    });
  });

  Scenario('At English only there is no chip on Genesis 1', ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with English only and 3 new words a day', () => openOn('Genesis 1', { greek: 0, hebrew: 0, newWords: 3 }));
    Then('the Reader shows no New words chip', async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.queryByTestId('new-words')).toBeNull();
    });
  });

  Scenario('A Greek chapter still teaches Greek words with both languages chosen', ({ Given, Then, When }) => {
    Given('Lampas is opened on Romans 8 with both languages chosen at Learning, 3 new words a day and no Hebrew words', () =>
      openOn('Romans 8', { greek: 3, hebrew: 3, newWords: 3 }),
    );
    Then("the chip under the Reader's header reads {string}", async (_, text: string) => {
      await waitFor(async () => expect(await strip()).toHaveTextContent(text));
    });
    When('he taps New words', openSheet);
    Then('the teach sheet shows {string} large in Greek with its respelling and Hear it, and takes the word as a Greek one with Got it', async (_, lemma: string) => {
      await shows(lemma);
      const word = within(sheet()).getByTestId('teach-lemma');
      expect(word).toHaveAttribute('lang', 'el');
      expect(word).toHaveClass('font-greek', 'text-5xl');
      expect(within(sheet()).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
      await user.click(within(sheet()).getByRole('button', { name: 'Got it', exact: true }));
      await waitFor(async () => expect(await db.words.get(nfc(lemma))).toMatchObject({ lang: 'grc', state: 'learning' }));
    });
  });
});
