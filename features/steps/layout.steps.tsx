// features/steps/layout.steps.tsx — runs features/layout.feature: Layout (Verse by verse | Paragraph) and Section
// headings (On | Off) in Settings, and the reader that shows paragraphs and headings from the data's p and h.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter, Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verseData = (n: number): Verse => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

const waitForVerses = () => waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));

async function openFresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitForVerses();
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const headings = () => [...document.querySelectorAll<HTMLElement>('[data-heading]')];
const paragraphOf = (n: number) => verseEl(n).closest('[data-paragraph]');

async function openSettings(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}
async function goBack(): Promise<void> {
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitForVerses();
}
async function choose(group: 'Layout' | 'Section headings', label: string): Promise<void> {
  if (!screen.queryByRole('heading', { name: 'Settings', level: 1 })) await openSettings();
  // the control draws once its saved value is read, which can be after the Settings heading
  await user.click(await within(await screen.findByRole('group', { name: group })).findByRole('button', { name: label }));
}

const feature = await loadFeature('features/layout.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Layout Paragraph runs Romans 8 verses together within a paragraph, with superscript verse numbers', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Layout to Paragraph in Settings', () => choose('Layout', 'Paragraph'));
    Then('the bus has heard the layout is paragraph', async () => {
      await waitFor(() => expect(latest('layout-changed')?.layout).toBe('paragraph'));
    });
    When('he taps Back on the Settings screen', goBack);
    Then('verses 1 to 4 of the reader run together in one paragraph', () => {
      const first = paragraphOf(1);
      expect(first).not.toBeNull();
      for (const n of [2, 3, 4]) expect(paragraphOf(n)).toBe(first);
    });
    And('verse 5 starts another paragraph', () => {
      expect(paragraphOf(5)).not.toBeNull();
      expect(paragraphOf(5)).not.toBe(paragraphOf(4));
    });
    And('the verse numbers are superscript', () => {
      const number = within(verseEl(2)).getByRole('button', { name: 'Verse 2' });
      expect(number.querySelector('sup')?.textContent).toBe('2');
    });
    And("verse 1 reads as the data's English chunks read", () => {
      const expected = verseData(1).e.map((c) => c.t).join(' ');
      expect(verseEl(1).querySelector('[data-text]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(expected);
    });
  });

  Scenario('Verse by verse shows one verse per line', ({ Given, When, Then, And }) => {
    const oneLineEach = (count: number) => {
      const verses = [...document.querySelectorAll<HTMLElement>('[data-verse]')];
      expect(verses).toHaveLength(count);
      for (const v of verses) {
        expect(v.tagName).toBe('P');
        expect(v.querySelector('sup')).toBeNull();
        expect(within(v).getByRole('button', { name: `Verse ${v.getAttribute('data-verse')}` })).toBeVisible();
      }
    };
    Given('Lampas is opened with nothing saved', openFresh);
    Then('each of the {int} verses is a line of its own with its number beside it', (_, count: number) => oneLineEach(count));
    And('no paragraph is shown', () => expect(document.querySelectorAll('[data-paragraph]')).toHaveLength(0));
    When('he sets Layout to Paragraph in Settings', () => choose('Layout', 'Paragraph'));
    And('he sets Layout to Verse by verse in Settings', () => choose('Layout', 'Verse by verse'));
    And('he taps Back on the Settings screen', goBack);
    Then('the reader again shows each of the {int} verses as a line of its own', (_, count: number) => oneLineEach(count));
  });

  Scenario('Section headings On shows the MSB heading above its verse in both views; Off hides it', ({ Given, When, Then, And }) => {
    const shownAbove = (text: string, verse: number) => {
      const heading = headings().find((h) => h.textContent === text);
      expect(heading, `heading ${text}`).toBeDefined();
      expect(heading!.compareDocumentPosition(verseEl(verse)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(heading!.nextElementSibling?.contains(verseEl(verse)) || heading!.nextElementSibling === verseEl(verse)).toBe(true);
    };
    Given('Lampas is opened with nothing saved', openFresh);
    Then('{string} is shown above verse {int}', (_, text: string, verse: number) => shownAbove(text, verse));
    And('{string} is shown above verse {int}', (_, text: string, verse: number) => shownAbove(text, verse));
    When('he switches to Greek', async () => {
      await user.click(screen.getByRole('button', { name: 'Greek' }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
    });
    Then('in Greek {string} is shown above verse {int}', (_, text: string, verse: number) => shownAbove(text, verse));
    And('the heading {string} is English', (_, text: string) => {
      const heading = headings().find((h) => h.textContent === text);
      expect(heading?.getAttribute('lang')).toBe('en');
    });
    When('he sets Section headings to Off in Settings', () => choose('Section headings', 'Off'));
    And('he taps Back on the Settings screen', goBack);
    Then('no heading is shown', () => expect(headings()).toHaveLength(0));
    When('he sets Section headings to On in Settings', () => choose('Section headings', 'On'));
    And('he goes back to the reader', goBack);
    Then('the heading {string} is back above verse {int}', (_, text: string, verse: number) => shownAbove(text, verse));
  });

  Scenario('a tap on a word in Paragraph layout still opens its word sheet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Layout to Paragraph in Settings', () => choose('Layout', 'Paragraph'));
    And('he taps Back on the Settings screen', goBack);
    And('he taps {string} in verse {int}', async (_, text: string, verse: number) => {
      await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
    });
    Then('the word sheet shows the Greek word {string}', async (_, word: string) => {
      expect(await screen.findByTestId('sheet-word')).toHaveTextContent(word);
    });
    When('he closes the word sheet', async () => {
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
    And('he taps the number of verse {int}', async (_, n: number) => {
      await user.click(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` }));
    });
    Then('verse {int} is selected and verse {int} is not', (_, a: number, b: number) => {
      expect(verseEl(a)).toHaveAttribute('data-selected', 'true');
      expect(verseEl(b)).toHaveAttribute('data-selected', 'false');
    });
    And('the Verse view is shown', async () => {
      expect(await screen.findByRole('region', { name: 'Verse view' })).toBeVisible();
    });
  });

  Scenario('Layout and Section headings survive a reload', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he sets Layout to Paragraph in Settings', () => choose('Layout', 'Paragraph'));
    And('he sets Section headings to Off in Settings', () => choose('Section headings', 'Off'));
    And('Lampas is reopened at the Settings address', async () => {
      await waitFor(async () => {
        expect((await db.settings.get('layout'))?.value).toBe('paragraph');
        expect((await db.settings.get('sectionHeadings'))?.value).toBe('off');
      });
      cleanup();
      clearBus();
      render(<App />);
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('Layout is set to {string} in Settings', async (_, label: string) => {
      const group = await screen.findByRole('group', { name: 'Layout' });
      await waitFor(() => expect(within(group).getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true'));
    });
    And('Section headings is set to {string} in Settings', async (_, label: string) => {
      const group = await screen.findByRole('group', { name: 'Section headings' });
      await waitFor(() => expect(within(group).getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true'));
    });
    When('he taps Back on the Settings screen', goBack);
    Then('verses 1 to 4 of the reader run together in one paragraph', () => {
      const first = paragraphOf(1);
      expect(first).not.toBeNull();
      for (const n of [2, 3, 4]) expect(paragraphOf(n)).toBe(first);
    });
    And('no heading is shown', () => expect(headings()).toHaveLength(0));
  });
});
