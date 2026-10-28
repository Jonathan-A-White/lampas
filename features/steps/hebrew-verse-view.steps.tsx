// features/steps/hebrew-verse-view.steps.tsx — runs features/hebrew-verse-view.feature: the Verse view of an Old Testament verse reads in the Hebrew when the Reader does (Jonah 1 is the copy in
// tests/fixtures/data/jon/1.json): the Hebrew big and right to left, Listen in the Hebrew voice, the weave as the Reader's, English at Hebrew 0, Read it aloud on the English only; a Review card's
// verse and Tap to hear in Hebrew; Today's Read in Lampas on an Old Testament plan chapter. Speech is voice-kit's honest fake (tests/support/fake-speech.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import type { Chapter } from '../../src/data/chapter';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import type { Question } from '../../src/data/quiz';
import { setReaderView } from '../../src/data/repositories';
import { startPlan } from '../../src/data/repositories/readingPlan';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stopReading } from '../../src/speech/readAloud';
import { stripCantillation } from '../../src/speech/schemes/hebrew-israeli';
import { tutorTimings } from '../../src/services/tutor';
import { WordQuestion } from '../../src/WordQuestion';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER } from '../../tests/support/fake-postern';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../../tests/support/fake-speech';
import { sheetEntriesGone } from '../../tests/support/sheet-history';

const jonah1 = JSON.parse(readFileSync('tests/fixtures/data/jon/1.json', 'utf8')) as Chapter;
const user = userEvent.setup();
const real = { ...browserEnv };
let synth: FakeSynth | undefined;
const PHONE_KEY = '00'.repeat(31) + '02';

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const ALL_VOICES = [ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE];
const NO_HEBREW = [ENGLISH_VOICE, GREEK_VOICE];
const hebrewOfVerse1 = (): string => stripCantillation(jonah1.verses[0].g.map((w) => w.t).join(' '));

interface Phone {
  voices?: FakeVoice[];
  licensed?: boolean;
  /** Hebrew at 0 (the dial the Reader reads an Old Testament chapter by) instead of All in */
  hebrew0?: boolean;
}

/** Opens the app on a chapter (the address names it) with these settings saved, on a phone with these voices and, when asked, a licence. */
async function openOn(title: string, settings: Record<string, string> = {}, solid: string[] = [], phone: Phone = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  stubChapterFetch();
  if (phone.licensed) {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
    tutorTimings.pollMs = 20;
    const postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
    stubRecognizer();
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
  }
  synth = phone.voices ? stubSpeech(phone.voices) : undefined;
  browserEnv.open = () => undefined;
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await db.settings.put({ key: 'hebrewInterest', value: phone.hebrew0 ? '0' : '5' });
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  await db.words.bulkPut(solid.map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid' as const, since: Date.now() })));
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const viewEl = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
const sheetVerse = (): HTMLElement => viewEl().querySelector<HTMLElement>('[data-sheet-verse]') as HTMLElement;
const actionNames = (): string[] => within(screen.getByRole('group', { name: 'Actions' })).getAllByRole('button').map((b) => b.textContent?.trim() ?? '');
const tapVerseNumber = async (_: unknown, n: number): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
  await screen.findByRole('region', { name: 'Verse view' });
};

/** A Review card's question: the Hebrew word יוֹנָה of Jonah 1:1, answered. */
const YONAH: Question = {
  lemma: 'יוֹנָה',
  prompt: 'יוֹנָה',
  form: 'יוֹנָ֥ה',
  reference: 'Jonah 1:1',
  book: 'jon',
  chapter: 1,
  verse: 1,
  gloss: 'Jonah',
  options: ['Jonah', 'saying', 'son', 'to'],
};

/** The question as a screen holds it: the answer is the screen's state. */
export function Holder() {
  const [picked, setPicked] = useState<string | null>(YONAH.gloss);
  return <WordQuestion question={YONAH} index={0} picked={picked} onPick={setPicked} />;
}

async function openToday(): Promise<void> {
  await user.click(await screen.findByTestId('today-chip'));
  await screen.findByRole('heading', { name: 'Today', level: 1 });
}

const feature = await loadFeature('features/hebrew-verse-view.feature');

describeFeature(feature, ({ Scenario }) => {
  const heading = async (_: unknown, reference: string): Promise<void> => {
    await waitFor(() => expect(within(viewEl()).getByRole('heading', { name: reference })).toBeInTheDocument());
  };
  const play = async (): Promise<void> => {
    await user.click(await within(viewEl()).findByRole('button', { name: /^Play / }));
  };
  const english = (): void => {
    const verse = sheetVerse();
    expect(squash(verse.textContent)).toContain('Now the word of the LORD came to Jonah');
    expect(verse).toHaveAttribute('lang', 'en');
    expect(verse).not.toHaveAttribute('dir', 'rtl');
    expect(verse.classList.contains('script-he')).toBe(false);
  };

  Scenario('Jonah 1:1 opened from the Hebrew view shows the Hebrew verse right to left', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string}', (_, view: string) => openOn('Jonah 1', { readerView: view }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view is headed {string}', heading);
    And('the Verse view shows the Hebrew of Jonah 1:1 in the Hebrew face, right to left', () => {
      const verse = sheetVerse();
      expect(verse).toHaveAttribute('lang', 'he');
      expect(verse).toHaveAttribute('dir', 'rtl');
      expect(verse.classList.contains('script-he')).toBe(true);
      expect(verse.classList.contains('reader-hebrew')).toBe(true);
      expect(squash(verse.querySelector('[data-text]')?.textContent)).toBe(squash(jonah1.verses[0].g.map((w) => w.t).join(' ')));
    });
    And("the Verse view's words are Hebrew words", () => {
      expect(sheetVerse().querySelectorAll('[data-word]').length).toBe(jonah1.verses[0].g.length);
    });
  });

  Scenario('A section heading opens its passage in the Hebrew, each block right to left with the verse number first', ({ Given, When, Then }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string}', (_, view: string) => openOn('Jonah 1', { readerView: view }));
    When('he taps the section heading {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name: new RegExp(name) }));
      await screen.findByRole('region', { name: 'Verse view' });
    });
    Then('the Verse view shows the passage of verses {int} to {int} in Hebrew, each block right to left', async (_, from: number, to: number) => {
      const verses = await waitFor(() => {
        const found = [...viewEl().querySelectorAll<HTMLElement>('[data-passage-verse]')];
        expect(found.length).toBeGreaterThan(0);
        return found;
      });
      expect(verses.map((v) => v.getAttribute('data-passage-verse'))).toEqual(Array.from({ length: to - from + 1 }, (_, i) => String(from + i)));
      const blocks = [...viewEl().querySelectorAll<HTMLElement>('[data-passage-text]')];
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block).toHaveAttribute('lang', 'he');
        expect(block).toHaveAttribute('dir', 'rtl');
        expect(block.classList.contains('script-he')).toBe(true);
      }
      expect(verses[0].querySelectorAll('[data-word]').length).toBeGreaterThan(0);
      expect(verses[0].firstElementChild).toHaveAttribute('data-passage-number');
    });
  });

  Scenario('Listen in the Verse view says the Hebrew in the Hebrew voice', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string} on a phone with an English, a Greek and a Hebrew voice', (_, view: string) =>
      openOn('Jonah 1', { readerView: view }, [], { voices: ALL_VOICES }),
    );
    When('he taps the number of verse {int}', tapVerseNumber);
    And('he taps Play on the Verse view', play);
    Then('the phone speaks the Hebrew of Jonah 1:1 without its cantillation marks in {string}', async (_, lang: string) => {
      await waitFor(() => expect(synth?.spoken.length).toBeGreaterThan(0));
      expect(synth?.spoken[0]).toMatchObject({ text: hebrewOfVerse1(), lang, voice: HEBREW_VOICE });
    });
  });

  Scenario('With no Hebrew voice Listen says so and nothing breaks', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string} on a phone with an English and a Greek voice', (_, view: string) =>
      openOn('Jonah 1', { readerView: view }, [], { voices: NO_HEBREW }),
    );
    When('he taps the number of verse {int}', tapVerseNumber);
    And('he taps Play on the Verse view', play);
    Then('the Verse view says {string}', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
    And('the Verse view is still open', () => {
      expect(viewEl()).toBeInTheDocument();
    });
  });

  Scenario('Jonah 1:1 opened from the English view shows the English', ({ Given, When, Then }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string}', (_, view: string) => openOn('Jonah 1', { readerView: view }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view shows the English of Jonah 1:1, left to right', english);
  });

  Scenario("With the Weave on the Verse view's verse is woven as the Reader's", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with the Weave on Solid words and the solid Hebrew words {string} and {string}', (_, a: string, b: string) =>
      openOn('Jonah 1', { weave: 'solid' }, [a, b]),
    );
    When('he taps the number of verse {int}', async (_, n: number) => {
      // the Reader's own row of verse n, read before the view opens over it
      const row = document.querySelector<HTMLElement>(`[data-verse="${n}"] [data-text]`);
      readerText = squash(row?.textContent);
      await tapVerseNumber(_, n);
    });
    Then("the Verse view's verse reads as verse 1 does in the Reader", () => {
      expect(readerText).toMatch(/[֐-׿]/);
      expect(squash(sheetVerse().querySelector('[data-text]')?.textContent)).toBe(readerText);
    });
    And("the Verse view's verse holds a Hebrew word", () => {
      expect(sheetVerse().querySelectorAll('[data-woven]').length).toBeGreaterThan(0);
    });
  });
  let readerText = '';

  Scenario('At Hebrew 0 the Verse view of an Old Testament verse is English', ({ Given, When, Then }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string} and Hebrew at 0', (_, view: string) => openOn('Jonah 1', { readerView: view }, [], { hebrew0: true }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view shows the English of Jonah 1:1, left to right', english);
  });

  Scenario('Read it aloud is offered on the English verse and on the Hebrew one', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string} and a licence', (_, view: string) => openOn('Jonah 1', { readerView: view }, [], { licensed: true }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view offers the actions {string}, {string}, {string}, {string} and {string}', async (_, a: string, b: string, c: string, d: string, e: string) => {
      // Quiz me follows the Hebrew dial, which the Verse view reads live (Hebrew 0 until it has): wait for it.
      await waitFor(() => expect(actionNames()).toEqual([a, b, c, d, e]));
    });
    When('he closes the Verse view and chooses {string} in the language switch', async (_, name: string) => {
      await user.click(within(viewEl()).getByRole('button', { name: '‹ Reader' }));
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
      await user.click(within(screen.getByRole('group', { name: 'Language' })).getByRole('button', { name }));
    });
    And('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view still offers the actions {string}, {string}, {string}, {string} and {string}', async (_, a: string, b: string, c: string, d: string, e: string) => {
      // Quiz me follows the Hebrew dial, which the Verse view reads live (Hebrew 0 until it has): wait for it.
      await waitFor(() => expect(actionNames()).toEqual([a, b, c, d, e]));
    });
  });

  Scenario('The Hebrew view does not carry Listen in Audible', ({ Given, When, Then }) => {
    Given('Lampas is opened on Jonah 1 with the saved view {string} and the Audible Bible on', (_, view: string) =>
      openOn('Jonah 1', { readerView: view, audioBible: 'word-of-promise' }),
    );
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view has no {string} link', (_, name: string) => {
      expect(within(viewEl()).queryByRole('link', { name: new RegExp(`^${name}`) })).toBeNull();
    });
  });

  Scenario("A Greek verse's Verse view is as it was", ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with the saved view {string}', (_, view: string) => openOn('Romans 8', { readerView: view }));
    When('he taps the number of verse {int}', tapVerseNumber);
    Then('the Verse view shows Greek, left to right, in the Greek face', () => {
      const verse = sheetVerse();
      expect(verse).toHaveAttribute('lang', 'el');
      expect(verse).toHaveAttribute('data-lang', 'grc');
      expect(verse).not.toHaveAttribute('dir');
      expect(verse.classList.contains('font-greek')).toBe(true);
      expect(verse.classList.contains('script-he')).toBe(false);
    });
  });

  Scenario('A Review card of Jonah 1:1 shows the Hebrew verse and its Tap to hear says the Hebrew', ({ Given, When, Then }) => {
    Given(
      'a Review card for the Hebrew word {string} in Jonah 1:1 that he has answered, with the Hebrew view saved on a phone with a Hebrew voice',
      async () => {
        cleanup();
        vi.unstubAllGlobals();
        stubChapterFetch();
        synth = stubSpeech(ALL_VOICES);
        await db.open();
        await Promise.all([db.words.clear(), db.settings.clear()]);
        await db.settings.put({ key: 'hebrewInterest', value: '5' });
        await setReaderView('greek');
        window.history.replaceState(null, '', '/#/test');
        render(<Holder />);
      },
    );
    When('he taps the reference {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} shows the Hebrew verse right to left with {string} marked', async (_, name: string, word: string) => {
      const dialog = await screen.findByRole('dialog', { name });
      await waitFor(() => expect(dialog.querySelector('[data-reference-text]')).not.toBeNull());
      const row = dialog.querySelector('[data-reference-text]') as HTMLElement;
      expect(row).toHaveAttribute('lang', 'he');
      expect(row).toHaveAttribute('dir', 'rtl');
      await waitFor(() => expect(within(dialog).queryAllByText(/\S/).length).toBeGreaterThan(0));
      const marked = [...dialog.querySelectorAll<HTMLElement>('[data-marked]')].map((m) => squash(m.textContent));
      expect(marked.map((m) => stripCantillation(m)).join(' ')).toBe(stripCantillation(word));
    });
    When('he closes the card and taps Tap to hear', async () => {
      await user.click(within(document.querySelector('[data-reference-card]') as HTMLElement).getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(document.querySelector('[data-reference-card]')).toBeNull());
      await user.click(screen.getByTestId('tap-to-hear'));
    });
    Then('the phone speaks {string} in {string}', async (_, word: string, lang: string) => {
      await waitFor(() => expect(synth?.spoken.length).toBeGreaterThan(0));
      expect(synth?.spoken[0]).toMatchObject({ text: stripCantillation(word), lang, voice: HEBREW_VOICE });
    });
  });

  Scenario("Today's Read in Lampas opens the Old Testament chapter of the plan", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Psalms 23', async () => {
      cleanup();
      await sheetEntriesGone();
      clearBus();
      forgetTrail();
      localStorage.clear();
      localStorage.setItem('lampas.welcome', 'done');
      vi.unstubAllGlobals();
      stubChapterFetch();
      browserEnv.open = () => undefined;
      window.history.replaceState(null, '', '/');
      await db.open();
      await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear()]);
      await startPlan('whole-bible', { code: 'psa', chapter: 23 });
      render(<App />);
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    When('he opens Today from the Reader', openToday);
    And('he taps Read in Lampas on Today', async () => {
      const piece = await screen.findByRole('region', { name: 'Reading plan', exact: true });
      await user.click(await within(piece).findByRole('button', { name: 'Read in Lampas' }));
    });
    Then('the Reader is showing {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
    });
  });
});
