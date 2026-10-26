// features/steps/hebrew-reader.steps.tsx — runs features/hebrew-reader.feature: the Reader reads an Old Testament chapter in the Hebrew (Genesis 1 is the copy in
// tests/fixtures/data/gen/1.json, scripts/fixture-chapter.mjs): the switch reads English | Hebrew, the Hebrew view is drawn right to left with every word a tap, the weave
// lays the English against the Hebrew in the Hebrew order, a long press and Read from the top speak Hebrew. Speech is voice-kit's honest fake (tests/support/fake-speech.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stripCantillation } from '../../src/speech/schemes/hebrew-israeli';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../../tests/support/fake-speech';

const genesis1 = JSON.parse(readFileSync('tests/fixtures/data/gen/1.json', 'utf8')) as Chapter;
const user = userEvent.setup();
let synth: FakeSynth | undefined;

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Opens the app on a chapter (the address names it) with these settings saved, these lemmas solid and, when voices are given, a phone that speaks. */
async function openOn(title: string, settings: Record<string, string> = {}, solid: string[] = [], voices?: FakeVoice[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  stubChapterFetch();
  synth = voices ? stubSpeech(voices) : undefined;
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  await db.words.bulkPut(solid.map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid' as const, since: Date.now() })));
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const ALL_VOICES = [ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE];
const NO_HEBREW = [ENGLISH_VOICE, GREEK_VOICE];

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const verseText = (n: number): string => squash(verseEl(n).querySelector('[data-text]')?.textContent);
const wordEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-word]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no Hebrew word "${text}" in verse ${verse}`);
  return found;
};
const chunkEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-chunk]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no chunk "${text}" in verse ${verse}`);
  return found;
};
const switchEl = (): HTMLElement => screen.getByRole('group', { name: 'Language' });
const choice = (name: string): HTMLElement => within(switchEl()).getByRole('button', { name });
const lastSpoken = () => (synth?.spoken ?? [])[(synth?.spoken ?? []).length - 1];

async function longPress(target: HTMLElement): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target });
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
  await user.pointer({ keys: '[/MouseLeft]', target });
}

const hebrewOfVerse1 = (): string => stripCantillation(genesis1.verses[0].g.map((w) => w.t).join(' '));

const feature = await loadFeature('features/hebrew-reader.feature');

describeFeature(feature, ({ Scenario }) => {
  const WEAVE = { weave: 'solid' };
  const sheet = (name: string): HTMLElement | null => screen.queryByRole('dialog', { name });
  const readFromTop = () => user.click(screen.getByRole('button', { name: 'Read from the top' }));
  const chosen = async (_: unknown, name: string): Promise<void> => {
    await waitFor(() => expect(choice(name)).toHaveAttribute('aria-pressed', 'true'));
  };
  const switchOffers = (_: unknown, a: string, b: string): void => {
    expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]);
  };
  const stillShowing = async (): Promise<void> => {
    expect(screen.getByRole('heading', { level: 1, name: 'Genesis 1' })).toBeInTheDocument();
    expect(document.querySelector('[data-verse="1"]')).not.toBeNull();
  };

  Scenario('On Genesis 1 the switch reads English | Hebrew', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with nothing saved', () => openOn('Genesis 1'));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('{string} is the chosen language', chosen);
  });

  Scenario('Choosing Hebrew opens the Hebrew view and is saved as the one source view', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with nothing saved', () => openOn('Genesis 1'));
    When('he chooses {string} in the language switch', async (_, name: string) => user.click(choice(name)));
    Then('{string} is the chosen language', chosen);
    And('the saved view is {string}', async (_, view: string) => {
      await waitFor(async () => expect((await db.settings.get('readerView'))?.value).toBe(view));
    });
  });

  Scenario('The Hebrew view\'s first verse starts with בְּרֵאשִׁ֖ית and the row runs right to left', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { readerView: view }));
    Then('{string} is the chosen language', chosen);
    And('the first word of verse {int} is {string}', (_, n: number, word: string) => {
      expect(squash(verseEl(n).querySelector('[data-word="0"]')?.textContent)).toBe(word);
    });
    And('verse {int} has {int} words, each a tap numbered from {int}', (_, n: number, count: number, from: number) => {
      const words = [...verseEl(n).querySelectorAll<HTMLElement>('[data-word]')];
      expect(words.map((w) => w.getAttribute('data-word'))).toEqual(Array.from({ length: count }, (_, i) => String(from + i)));
      for (const w of words) expect(w).toHaveAttribute('role', 'button');
    });
    And('verse {int} is a row of Hebrew, right to left, in the Hebrew face', (_, n: number) => {
      const row = verseEl(n);
      expect(row).toHaveAttribute('dir', 'rtl');
      expect(row).toHaveAttribute('lang', 'he');
      expect(row.classList.contains('script-he')).toBe(true);
    });
    And('the heading {string} stands before verse {int}', (_, text: string, n: number) => {
      expect(screen.getByText(text).compareDocumentPosition(verseEl(n)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario('The Hebrew view is drawn the same in the paragraph layout', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} and the Layout {string}', (_, view: string, layout: string) =>
      openOn('Genesis 1', { readerView: view, layout }),
    );
    Then('the first word of verse {int} is {string}', (_, n: number, word: string) => {
      expect(squash(verseEl(n).querySelector('[data-word="0"]')?.textContent)).toBe(word);
    });
    And('the paragraph holding verse {int} is a row of Hebrew, right to left, in the Hebrew face', (_, n: number) => {
      const row = verseEl(n).closest<HTMLElement>('[data-paragraph]') as HTMLElement;
      expect(row).toHaveAttribute('dir', 'rtl');
      expect(row).toHaveAttribute('lang', 'he');
      expect(row.classList.contains('script-he')).toBe(true);
    });
  });

  Scenario('A tap on a Hebrew word opens the English word sheet of its chunk', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { readerView: view }));
    When('he taps the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => user.click(wordEl(n, word)));
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'English word' });
      expect(within(dialog).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('the reader is still showing Genesis 1', stillShowing);
  });

  Scenario('A Hebrew word the English has no chunk for opens nothing and nothing breaks', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string}', (_, view: string) => openOn('Genesis 1', { readerView: view }));
    When('he taps the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => user.click(wordEl(n, word)));
    Then('no word sheet opens', () => {
      expect(sheet('English word')).toBeNull();
      expect(sheet('Word')).toBeNull();
    });
    And('the reader is still showing Genesis 1', stillShowing);
  });

  Scenario('The English view still opens the English word sheet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with nothing saved', () => openOn('Genesis 1'));
    When('he taps the chunk {string} of verse {int}', async (_, text: string, n: number) => user.click(chunkEl(n, text)));
    Then('the English word sheet opens headed {string}', async (_, word: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'English word' });
      expect(within(dialog).getByTestId('english-word')).toHaveTextContent(word);
    });
    And('the Hebrew word sheet is not opened', () => {
      expect(sheet('Word')).toBeNull();
    });
  });

  const weaveOpen = (_: unknown, a: string, b: string) => openOn('Genesis 1', WEAVE, [a, b]);
  const readsAs = async (_: unknown, n: number, text: string): Promise<void> => {
    await waitFor(() => expect(verseText(n)).toBe(text));
  };
  const toast = async (_: unknown, words: string): Promise<void> => {
    await waitFor(() => expect(screen.getAllByRole('status').some((e) => e.textContent === words)).toBe(true));
  };
  const english = (_: unknown, n: number): void => {
    expect(verseEl(n).getAttribute('dir')).not.toBe('rtl');
    expect(verseEl(n)).toHaveAttribute('lang', 'en');
  };

  Scenario('The weave lays the English against the Hebrew, in the English order to start', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words {string} and {string}', weaveOpen);
    Then('the language switch offers {string}, {string} and {string}', (_, a: string, b: string, c: string) => {
      expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c]);
    });
    And('{string} is the chosen language', chosen);
    And('verse {int} reads {string}', readsAs);
    And('verse {int} is a row of English, left to right', english);
    And('the weave count is a number of words in Hebrew', () => {
      expect(screen.getByTestId('weave-count').textContent).toMatch(/^\d+ words in Hebrew$/);
    });
  });

  Scenario('A long press on Weave lays the verse out in the Hebrew word order, right to left', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words {string} and {string}', weaveOpen);
    When('he long presses {string} in the language switch', async (_, name: string) => longPress(choice(name)));
    Then('a toast says {string}', toast);
    And('verse {int} reads {string}', readsAs);
    And('verse {int} is laid out right to left', async (_, n: number) => {
      await waitFor(() => expect(verseEl(n)).toHaveAttribute('dir', 'rtl'));
    });
    And('{string} is the chosen language', chosen);
  });

  Scenario('A second long press puts the English order back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words {string} and {string}', weaveOpen);
    And('he has long pressed {string} in the language switch', async (_, name: string) => {
      await longPress(choice(name));
      await waitFor(() => expect(verseEl(1)).toHaveAttribute('dir', 'rtl'));
    });
    When('he long presses {string} in the language switch', async (_, name: string) => longPress(choice(name)));
    Then('a toast says {string}', toast);
    And('verse {int} reads {string}', readsAs);
    And('verse {int} is a row of English, left to right', english);
  });

  Scenario('A long press on a Hebrew word says it in Hebrew', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} on a phone with an English, a Greek and a Hebrew voice', (_, view: string) =>
      openOn('Genesis 1', { readerView: view }, [], ALL_VOICES),
    );
    When('he long presses the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => longPress(wordEl(n, word)));
    Then('the phone says {string} in {string}', (_, text: string, lang: string) => {
      expect(lastSpoken()).toMatchObject({ text, lang });
      expect(lastSpoken().voice).toBe(HEBREW_VOICE);
    });
    And('no word sheet opens', () => {
      expect(sheet('English word')).toBeNull();
      expect(sheet('Word')).toBeNull();
    });
  });

  Scenario('Read from the top reads the Hebrew pieces in the Hebrew voice', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} on a phone with an English, a Greek and a Hebrew voice', (_, view: string) =>
      openOn('Genesis 1', { readerView: view }, [], ALL_VOICES),
    );
    When('he taps Read from the top', readFromTop);
    Then('the phone speaks the Hebrew of verse {int} without its cantillation marks in {string}', async (_, n: number, lang: string) => {
      await waitFor(() => expect(synth?.spoken.length).toBeGreaterThan(0));
      expect(n).toBe(1);
      expect(synth?.spoken[0]).toMatchObject({ text: hebrewOfVerse1(), lang });
    });
    And('verse {int} is highlighted as being read', (_, n: number) => expect(verseEl(n).hasAttribute('data-reading')).toBe(true));
    And('every voice asked for so far is Hebrew', () => {
      for (const u of synth?.spoken ?? []) {
        expect(u.lang).toBe('he-IL');
        expect(u.voice).toBe(HEBREW_VOICE);
      }
    });
  });

  Scenario('Read from the top in the weave reads each piece in its own language', ({ Given, When, Then }) => {
    Given(
      'Lampas is opened on Genesis 1 with the Weave on Solid words and the solid Hebrew words {string} and {string} on a phone with an English, a Greek and a Hebrew voice',
      (_, a: string, b: string) => openOn('Genesis 1', WEAVE, [a, b], ALL_VOICES),
    );
    When('he taps Read from the top', readFromTop);
    Then('the phone speaks {string} in {string} and then {string} in {string}', async (_, first: string, firstLang: string, then: string, thenLang: string) => {
      await waitFor(() => expect(synth?.spoken.length).toBeGreaterThan(0));
      synth?.finishAll();
      const heard = (synth?.spoken ?? []).map((u) => [u.text, u.lang]);
      expect(heard.slice(0, 2)).toEqual([[first, firstLang], [then, thenLang]]);
    });
  });

  Scenario('With no Hebrew voice on the phone the reading says so and nothing breaks', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} on a phone with an English and a Greek voice', (_, view: string) =>
      openOn('Genesis 1', { readerView: view }, [], NO_HEBREW),
    );
    When('he taps Read from the top', readFromTop);
    Then('the reading says {string}', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
    And('the reader is still showing Genesis 1', stillShowing);
  });

  Scenario('With no Hebrew voice a long press on a Hebrew word says nothing and nothing breaks', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the saved view {string} on a phone with an English and a Greek voice', (_, view: string) =>
      openOn('Genesis 1', { readerView: view }, [], NO_HEBREW),
    );
    When('he long presses the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => longPress(wordEl(n, word)));
    Then('the phone is asked to say nothing', () => {
      expect(synth?.spoken).toEqual([]);
    });
    And('the reader is still showing Genesis 1', stillShowing);
  });

  Scenario('A Greek chapter still reads English | Greek and the saved view opens it in Greek', ({ Given, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the saved view {string}', (_, view: string) => openOn('Romans 8', { readerView: view }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('{string} is the chosen language', chosen);
    And('verse {int} is a row of Greek, left to right', (_, n: number) => {
      expect(verseEl(n)).toHaveAttribute('lang', 'el');
      expect(verseEl(n).getAttribute('dir')).not.toBe('rtl');
    });
  });
});
