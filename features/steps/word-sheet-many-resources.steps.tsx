// features/steps/word-sheet-many-resources.steps.tsx — runs features/word-sheet-many-resources.feature: the word sheet's Study row with every
// Logos lexicon ticked (mw-5r3p30.135): full-title tiles, one scroll box, a fade while more is below, a Close under the box.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { logos } from '../../src/resources/logos';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openWithEveryLexicon(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await db.settings.bulkPut([
    { key: 'resource.logos', value: 'on' },
    { key: 'resourceOption.logos', value: JSON.stringify(logos.choices?.items.map((i) => i.id)) },
  ]);
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${verse}"]`);
  if (!el) throw new Error(`no verse ${verse}`);
  await user.click(within(el).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
};
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Word' });
const study = (): HTMLElement => within(sheet()).getByRole('group', { name: 'Study', exact: true });
const tiles = (): HTMLElement[] => within(study()).getAllByRole('link');
const scrollBox = (): HTMLElement => {
  const box = sheet().querySelector<HTMLElement>('[data-testid="sheet-scroll"]');
  if (!box) throw new Error('no scroll box');
  return box;
};
const fade = (): HTMLElement | null => sheet().querySelector<HTMLElement>('[data-testid="sheet-scroll-fade"]');

const feature = await loadFeature('features/word-sheet-many-resources.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Every Logos tile is on the sheet and says which book it opens', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with every Logos lexicon ticked', openWithEveryLexicon);
    When('he taps the word {string} in verse {int}', taps);
    Then('the Study row has {int} tiles', (_, n: number) => {
      expect(tiles()).toHaveLength(n);
    });
    And('the Study tile {string} is there in full', (_, title: string) => {
      const tile = tiles().find((t) => t.textContent === title);
      expect(tile, `no tile says "${title}"`).toBeDefined();
      // never cut off: no truncating class on the tile's words
      expect(tile?.querySelector('.truncate')).toBeNull();
    });
    And('the Study tile {string} is also there in full', (_, title: string) => {
      expect(tiles().some((t) => t.textContent === title)).toBe(true);
    });
    And('the Study tile {string} is there in full too', (_, title: string) => {
      expect(tiles().some((t) => t.textContent === title)).toBe(true);
    });
    And('the Study tile {string} is one more there in full', (_, title: string) => {
      expect(tiles().some((t) => t.textContent === title)).toBe(true);
    });
    And('no two Study tiles say the same', () => {
      const words = tiles().map((t) => t.textContent);
      expect(new Set(words).size).toBe(words.length);
    });
  });

  Scenario("The tiles are in the sheet's scroll box, and Close sits under the box", ({ Given, When, Then, And }) => {
    Given('Lampas is opened with every Logos lexicon ticked', openWithEveryLexicon);
    When('he taps the word {string} in verse {int}', taps);
    Then("every Study tile is inside the sheet's scroll box", () => {
      const box = scrollBox();
      expect(box.className).toContain('overflow-y-auto');
      for (const t of tiles()) expect(box.contains(t)).toBe(true);
    });
    And('the sheet has a Close button under the scroll box', () => {
      const close = within(sheet()).getByRole('button', { name: 'Close' });
      expect(scrollBox().contains(close)).toBe(false);
      expect(scrollBox().compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario('A fade tells him there is more below until he reaches the end', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with every Logos lexicon ticked', openWithEveryLexicon);
    When('he taps the word {string} in verse {int}', taps);
    And("the sheet's scroll box holds more than it shows", async () => {
      const box = scrollBox();
      // jsdom has no layout: the box is given the sizes a phone would give it
      Object.defineProperty(box, 'clientHeight', { value: 400, configurable: true });
      Object.defineProperty(box, 'scrollHeight', { value: 1200, configurable: true });
      await act(async () => {
        fireEvent.scroll(box);
      });
    });
    Then('the sheet shows a fade at the foot of the scroll box', async () => {
      await waitFor(() => expect(fade()).not.toBeNull());
    });
    When("he scrolls the sheet's scroll box to its end", async () => {
      const box = scrollBox();
      box.scrollTop = 800;
      await act(async () => {
        fireEvent.scroll(box);
      });
    });
    Then('the sheet shows no fade at the foot of the scroll box', async () => {
      await waitFor(() => expect(fade()).toBeNull());
    });
  });

  Scenario('Close closes the sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with every Logos lexicon ticked', openWithEveryLexicon);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps Close on the sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Close' }));
    });
    Then('the word sheet is gone', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
    });
  });
});
