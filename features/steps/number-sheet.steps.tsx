// features/steps/number-sheet.steps.tsx — runs features/number-sheet.feature: the Number sheet a compound number opens (mw-5r3p30.1127). fetch is stubbed with the committed chapters.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { putAtLevels } from './levels';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { unstubRangeRects } from '../../tests/support/fake-layout';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openOn(book: string, chapter: number, title: string): Promise<void> {
  cleanup();
  stubChapterFetch();
  unstubRangeRects();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  // the source words are drawn from Curious up: the Number sheet is a sheet of them (at Just English an English tap opens the small English sheet)
  await putAtLevels({ hebrew: 5, greek: 5 });
  window.location.hash = `#/?b=${book}&c=${chapter}&view=english`;
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('english'));
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const chunkEl = (text: string, verse: number): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-chunk]')].find((el) => el.textContent?.replace(/\s+/g, ' ').trim() === text);
  if (!found) throw new Error(`no chunk "${text}" in verse ${verse}`);
  return found;
};
const numberSheet = () => screen.findByRole('dialog', { name: 'Number' });
const wordSheet = () => screen.findByRole('dialog', { name: 'Word' });
const words = async (): Promise<HTMLElement[]> => within(await numberSheet()).getAllByRole('listitem');

const feature = await loadFeature('features/number-sheet.feature');

describeFeature(feature, ({ Scenario }) => {

  const listed = async (_: unknown, ...rest: (string | number)[]): Promise<void> => {
    const half = rest.length / 2;
    const forms = rest.slice(0, half) as string[];
    const values = rest.slice(half).map(String);
    const items = await words();
    expect(items.map((li) => li.querySelector('[lang]')?.textContent)).toEqual(forms);
    expect(items.map((li) => within(li).queryByTestId('number-value')?.textContent)).toEqual(values);
  };

  Scenario('"the 318" in Genesis 14:14 opens the Number sheet with the four Hebrew words and 8 + 10 + 300 = 318', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 14 in English', () => openOn('gen', 14, 'Genesis 14'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => user.click(chunkEl(text, verse)));
    Then('the Number sheet shows the number {string}', async (_, sum: string) => expect(within(await numberSheet()).getByTestId('number-sum')).toHaveTextContent(sum));
    And('it lists the words {string}, {string}, {string} and {string} with the values {int}, {int}, {int} and {int}', (_, a: string, b: string, c: string, d: string, e: number, f: number, g: number, h: number) =>
      listed(_, a, b, c, d, e, f, g, h),
    );
    And('it shows the line {string}', async (_, line: string) => expect(within(await numberSheet()).getByTestId('number-line')).toHaveTextContent(line));
  });

  Scenario('A word of the Number sheet opens its own word sheet, and closing that brings the Number sheet back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 14 in English', () => openOn('gen', 14, 'Genesis 14'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => user.click(chunkEl(text, verse)));
    And('he taps the word {string} in the Number sheet', async (_, form: string) => {
      const item = (await words()).find((li) => li.querySelector('[lang]')?.textContent === form);
      await user.click(within(item!).getByRole('button'));
    });
    Then('the word sheet shows the lemma {string}', async (_, lemma: string) => expect(within(await wordSheet()).getByTestId('sheet-lemma')).toHaveTextContent(lemma));
    When('he closes the word sheet', async () => user.click(within(await wordSheet()).getByRole('button', { name: 'Done' })));
    Then('the Number sheet shows the number {string}', async (_, sum: string) => expect(within(await numberSheet()).getByTestId('number-sum')).toHaveTextContent(sum));
  });

  Scenario('"trained men" holds numeral words but says no number: the word sheet', ({ Given, When, Then }) => {
    Given('Lampas is opened on Genesis 14 in English', () => openOn('gen', 14, 'Genesis 14'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => user.click(chunkEl(text, verse)));
    Then('the word sheet opens and no Number sheet', async () => {
      await wordSheet();
      expect(screen.queryByRole('dialog', { name: 'Number' })).toBeNull();
    });
  });

  Scenario('A number of one word, "a hundred" in Genesis 17:17, opens the word sheet', ({ Given, When, Then }) => {
    Given('Lampas is opened on Genesis 17 in English', () => openOn('gen', 17, 'Genesis 17'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => user.click(chunkEl(text, verse)));
    Then('the word sheet opens and no Number sheet', async () => {
      await wordSheet();
      expect(screen.queryByRole('dialog', { name: 'Number' })).toBeNull();
    });
  });

  Scenario('"153" in John 21:11 opens the Number sheet with 100 + 50 + 3 = 153', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on John 21 in English', () => openOn('jhn', 21, 'John 21'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => user.click(chunkEl(text, verse)));
    Then('the Number sheet shows the number {string}', async (_, sum: string) => expect(within(await numberSheet()).getByTestId('number-sum')).toHaveTextContent(sum));
    And('it lists the words {string}, {string} and {string} with the values {int}, {int} and {int}', (_, a: string, b: string, c: string, d: number, e: number, f: number) => listed(_, a, b, c, d, e, f));
    And('it shows the line {string}', async (_, line: string) => expect(within(await numberSheet()).getByTestId('number-line')).toHaveTextContent(line));
  });
});
