// features/steps/reader.steps.tsx — runs features/reader.feature: the Romans 8 reader, the English | Greek
// switch, the word sheet, the verse highlight. fetch is stubbed to answer with the committed public/data/rom/8.json.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter, type EnglishChunk, type Verse, wordGloss, wordParse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { stubChapterFetch, type ChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verseData = (n: number): Verse => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
let network: ChapterFetch;
let tappedChunk: EnglishChunk | undefined;
let tappedVerse = 0;

async function openFresh(): Promise<void> {
  cleanup();
  network = stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function reopen(): Promise<void> {
  cleanup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};

const sheet = () => screen.getByRole('dialog');
const sheetTexts = (id: string): string[] => within(sheet()).getAllByTestId(id).map((el) => el.textContent ?? '');
const view = () => document.querySelector<HTMLElement>('[data-reader]')?.getAttribute('data-view');

async function tapWord(text: string, verse: number): Promise<void> {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
}

async function switchTo(label: 'English' | 'Greek'): Promise<void> {
  await user.click(screen.getByRole('button', { name: label }));
  await waitFor(() => expect(view()).toBe(label.toLowerCase()));
}

const selectedVerses = () => [...document.querySelectorAll('[data-verse][data-selected="true"]')].map((el) => Number(el.getAttribute('data-verse')));
const numberButton = (n: number) => within(verseEl(n)).getByRole('button', { name: `Verse ${n}` });

const feature = await loadFeature('features/reader.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Romans 8 opens in English with 39 verses', ({ Given, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    Then('the reader is headed {string} and shows the English', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      expect(view()).toBe('english');
    });
    And('{int} verses are listed', (_, n: number) => {
      expect(document.querySelectorAll('[data-verse]')).toHaveLength(n);
    });
    And("verse 1 reads as the data's English chunks read", () => {
      const expected = verseData(1).e.map((c) => c.t).join(' ');
      expect(verseEl(1).querySelector('[data-text]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(expected);
    });
  });

  Scenario('Only the words the translators supplied are italic, not the whole chunk', ({ Given, Then, And }) => {
    const italicsIn = (verse: number, chunk: string): string[] => {
      const el = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-chunk]')].find((c) => c.textContent?.trim() === chunk);
      if (!el) throw new Error(`no chunk "${chunk}" in verse ${verse}`);
      return [...el.querySelectorAll('[data-supplied]')].map((i) => i.textContent ?? '');
    };
    Given('Lampas is opened with nothing saved', openFresh);
    Then('in verse {int} the chunk {string} shows only {string} in italics', (_, verse: number, chunk: string, words: string) => {
      expect(italicsIn(verse, chunk)).toEqual([words]);
    });
    And('in verse {int} the chunk {string} shows only {string} in italics', (_, verse: number, chunk: string, words: string) => {
      expect(italicsIn(verse, chunk)).toEqual([words]);
    });
    And('in verse {int} the chunk {string} has no italics', (_, verse: number, chunk: string) => {
      expect(italicsIn(verse, chunk)).toEqual([]);
    });
  });

  Scenario('Tapping Therefore in verse 1 shows the Greek word behind it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he taps {string} in verse {int}', async (_, text: string, verse: number) => tapWord(text, verse));
    Then('the word sheet shows the Greek word {string}', (_, w: string) => expect(sheetTexts('sheet-word')).toEqual([w]));
    And('the word sheet shows the respelling {string}', (_, w: string) => expect(sheetTexts('sheet-respelling')).toEqual([w]));
    And('the word sheet shows the lemma {string}', (_, w: string) => expect(sheetTexts('sheet-lemma')).toEqual([w]));
    And('the word sheet shows the parsing {string}', (_, w: string) => expect(sheetTexts('sheet-parse')).toEqual([w]));
    And('the word sheet shows a gloss containing {string}', (_, w: string) => expect(sheetTexts('sheet-gloss')[0]).toContain(w));
    And("the word sheet shows Strong's {string}", (_, w: string) => expect(sheetTexts('sheet-strongs')).toEqual([w]));
  });

  Scenario('Switching to Greek shows verse 1 in the Greek order', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he switches to Greek', async () => switchTo('Greek'));
    Then('the reader shows the Greek', () => expect(view()).toBe('greek'));
    And('verse 1 begins with the first {int} Greek words of the data', (_, n: number) => {
      const expected = verseData(1).g.slice(0, n).map((w) => w.t).join(' ');
      const shown = verseEl(1).querySelector('[data-text]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      expect(shown.startsWith(expected)).toBe(true);
    });
  });

  Scenario('Tapping a Greek word shows its sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he switches to Greek', async () => switchTo('Greek'));
    When('he taps {string} in verse {int}', async (_, text: string, verse: number) => tapWord(text, verse));
    Then('the word sheet shows the Greek word {string}', (_, w: string) => expect(sheetTexts('sheet-word')).toEqual([w]));
    And('the word sheet shows the lemma {string}', (_, w: string) => expect(sheetTexts('sheet-lemma')).toEqual([w]));
    And('the word sheet shows the parsing {string}', (_, w: string) => expect(sheetTexts('sheet-parse')).toEqual([w]));
    And('the word sheet shows a gloss containing {string}', (_, w: string) => expect(sheetTexts('sheet-gloss')[0]).toContain(w));
    And("the word sheet shows Strong's {string}", (_, w: string) => expect(sheetTexts('sheet-strongs')).toEqual([w]));
    And('the word sheet shows the English {string}', (_, w: string) => expect(sheetTexts('sheet-english')).toEqual([w]));
  });

  Scenario('An English chunk that renders several Greek words shows them all', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he taps the first English chunk that renders several Greek words', async () => {
      const verse = chapter.verses.find((v) => v.e.some((c) => c.g.length > 1));
      tappedChunk = verse?.e.find((c) => c.g.length > 1);
      if (!verse || !tappedChunk) throw new Error('no multi-word chunk in the data');
      const chunkIndex = verse.e.indexOf(tappedChunk);
      await user.click(verseEl(verse.n).querySelectorAll<HTMLElement>('[data-chunk]')[chunkIndex]);
      tappedVerse = verse.n;
    });
    Then('the word sheet shows every Greek word that chunk renders', () => {
      const verse = verseData(tappedVerse);
      const words = tappedChunk!.g.map((i) => verse.g[i]);
      expect(sheetTexts('sheet-word')).toEqual(words.map((w) => w.t));
      expect(sheetTexts('sheet-strongs')).toEqual(words.map((w) => w.s));
      expect(sheetTexts('sheet-parse')).toEqual(words.map((w) => wordParse(chapter, w)));
      expect(sheetTexts('sheet-gloss')).toEqual(words.map((w) => wordGloss(chapter, w)));
    });
  });

  Scenario('The word sheet closes by a tap outside it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he taps {string} in verse {int}', async (_, text: string, verse: number) => tapWord(text, verse));
    When('he taps outside the word sheet', async () => user.click(screen.getByTestId('sheet-backdrop')));
    Then('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('The word sheet closes by a swipe down', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he taps {string} in verse {int}', async (_, text: string, verse: number) => tapWord(text, verse));
    When('he swipes the word sheet down', () => {
      const handle = screen.getByTestId('sheet-handle');
      fireEvent.touchStart(handle, { touches: [{ clientY: 500 }] });
      fireEvent.touchMove(handle, { touches: [{ clientY: 560 }] });
      fireEvent.touchMove(handle, { touches: [{ clientY: 640 }] });
      fireEvent.touchEnd(handle, { changedTouches: [{ clientY: 640 }] });
    });
    Then('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('Tapping a verse number opens that verse on a screen of its own, and closing it selects nothing', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he taps the number of verse 3', async () => user.click(numberButton(3)));
    Then('verse 3 is selected and its Verse view is open', async () => {
      expect(selectedVerses()).toEqual([3]);
      await screen.findByRole('region', { name: 'Verse view' });
      expect(document.querySelector('[data-verse-view]')).toHaveAttribute('data-verse-view', '3');
    });
    When('he closes the Verse view', async () => user.click(screen.getByRole('button', { name: '‹ Reader' })));
    Then('no verse is selected', async () => {
      await waitFor(() => expect(selectedVerses()).toEqual([]));
      expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();
    });
    When('he taps the number of verse 5', async () => user.click(numberButton(5)));
    Then('verse 5 is selected and verse 3 is not', async () => {
      await screen.findByRole('region', { name: 'Verse view' });
      expect(selectedVerses()).toEqual([5]);
      expect(selectedVerses()).not.toContain(3);
    });
  });

  Scenario('The switch is remembered after reload', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he switches to Greek', async () => switchTo('Greek'));
    When('he reopens Lampas', reopen);
    Then('the reader shows the Greek', () => expect(view()).toBe('greek'));
  });

  Scenario("Reading asks for nothing but the app's own Romans 8 file", ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he taps {string} in verse {int}', async (_, text: string, verse: number) => tapWord(text, verse));
    // What's new (src/whatsNew/) asks for the app's own changelog.json once, whatever the reader does: it is not the reader's request.
    Then('the only request made was {string}', (_, url: string) => expect(network.requests.filter((r) => r !== '/changelog.json')).toEqual([url]));
  });
});
