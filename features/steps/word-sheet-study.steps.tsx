// features/steps/word-sheet-study.steps.tsx — runs features/word-sheet-study.feature: the word sheet's Study row at scale (docs/design/library-at-scale.md 3.5): the pinned lexicons,
// Bible Word Study and the door "All N lexicons ›", the sheet behind it (search, pinned first, a row opens the entry, Manage), and no door while only a few are On.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setKind, setState } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { LEXICONS } from '../../src/resources/logos';
import { resourceLink } from '../../src/resources/logosRes';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

/** Logos on, `on` of its lexicons On (the first ones) and the last `pinned` of those Pinned, so the pinned ones are not the first in the catalogue's order. */
async function openWith(_: unknown, on: number, pinned: number): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.put({ key: 'resource.logos', value: 'on' });
  // setState takes the old keys first; clearing the kind then leaves only what is set here
  await setKind('lexicon', 'off');
  const chosen = LEXICONS.slice(0, on);
  for (const l of chosen) await setState(l.resource, 'on');
  for (const l of chosen.slice(on - pinned)) await setState(l.resource, 'pinned');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${verse}"]`);
  if (!el) throw new Error(`no verse ${verse}`);
  await user.click(within(el).getByRole('button', { name: text }));
  const dialog = await screen.findByRole('dialog', { name: 'Word' });
  await within(dialog).findByRole('group', { name: 'Study', exact: true });
};
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Word' });
const study = (): HTMLElement => within(sheet()).getByRole('group', { name: 'Study', exact: true });
const tiles = (): HTMLElement[] => within(study()).getAllByRole('link');
const door = (): HTMLElement | null => within(study()).queryByRole('button', { name: /^All \d+ lexicons/ });
const all = (): HTMLElement => screen.getByRole('dialog', { name: 'All lexicons' });
const rows = (): HTMLElement[] => within(all()).getAllByRole('link');
const pinnedNames = (on: number, pinned: number): string[] => LEXICONS.slice(0, on).slice(on - pinned).map((l) => l.short);

const tapsDoor = async (): Promise<void> => {
  const button = door();
  if (!button) throw new Error('no door');
  await user.click(button);
  await screen.findByRole('dialog', { name: 'All lexicons' });
};

const feature = await loadFeature('features/word-sheet-study.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'Lampas is opened with {int} Logos lexicons On and {int} of them pinned';
  const WHEN = 'he taps the word {string} in verse {int}';

  Scenario('Two pinned and twenty-one On draw the two, Bible Word Study and the door', ({ Given, When, Then, And }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    Then('the Study row has {int} tiles and a door', (_, n: number) => {
      expect(tiles()).toHaveLength(n);
      expect(door()).not.toBeNull();
    });
    And('the first Study tiles are the pinned lexicons', () => {
      expect(tiles().slice(0, 2).map((t) => t.textContent)).toEqual(pinnedNames(21, 2));
    });
    And('the Study tile {string} is there', (_, title: string) => {
      expect(tiles().map((t) => t.textContent)).toContain(title);
    });
    And('the door says {string}', (_, text: string) => {
      expect(door()?.textContent).toBe(text);
    });
  });

  Scenario('Three On and none pinned draw the three and no door', ({ Given, When, Then }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    Then('the Study row has {int} tiles and no door', (_, n: number) => {
      expect(tiles()).toHaveLength(n);
      expect(tiles().map((t) => t.textContent)).toEqual([...LEXICONS.slice(0, 3).map((l) => l.short), 'Bible Word Study']);
      expect(door()).toBeNull();
    });
  });

  Scenario('The sheet lists the pinned lexicons first and then every one that is On', ({ Given, When, Then, And }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    And('he taps the door', tapsDoor);
    Then('the sheet {string} is over the word sheet, a direct child of its overlay', (_, name: string) => {
      const dialog = screen.getByRole('dialog', { name });
      expect(dialog.parentElement?.classList.contains('fixed')).toBe(true);
      expect(dialog.parentElement?.classList.contains('inset-0')).toBe(true);
    });
    And('the sheet lists {int} lexicons, the pinned ones first', (_, n: number) => {
      expect(rows()).toHaveLength(n);
      const names = rows().map((r) => r.getAttribute('data-lexicon'));
      expect(names.slice(0, 2)).toEqual(pinnedNames(21, 2));
      expect(new Set(names).size).toBe(n);
    });
    And('every row is at least 44 px tall', () => {
      for (const row of rows()) expect(row.className).toMatch(/min-h-1[12]/);
    });
    And('the sheet has Manage at its foot', () => {
      const manage = within(all()).getByRole('button', { name: 'Manage' });
      const last = rows()[rows().length - 1]!;
      expect(last.compareDocumentPosition(manage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario("A row opens the word's entry in that lexicon", ({ Given, When, And, Then }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    And('he taps the door', tapsDoor);
    Then('the row {string} opens the entry for {string} in that lexicon', (_, name: string, lemma: string) => {
      const lexicon = LEXICONS.find((l) => l.short === name)!;
      const row = rows().find((r) => r.getAttribute('data-lexicon') === name);
      expect(row, `no row for ${name}`).toBeDefined();
      expect(row?.getAttribute('href')).toBe(resourceLink(lexicon.resource, `hw=${encodeURIComponent(lemma)}`).url);
      expect(row?.textContent).toContain(lemma);
    });
  });

  Scenario('The search narrows the rows', ({ Given, When, And, Then }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    And('he taps the door', tapsDoor);
    And('he searches the sheet for {string}', async (_, text: string) => {
      await user.type(within(all()).getByRole('searchbox'), text);
    });
    Then('the sheet lists only the lexicons that say {string}', async (_, text: string) => {
      await waitFor(() => expect(rows().length).toBeLessThan(21));
      expect(rows().length).toBeGreaterThan(0);
      for (const row of rows()) expect(row.textContent?.toLowerCase()).toContain(text.toLowerCase());
    });
  });

  Scenario('Manage opens the Lexicons page', ({ Given, When, And, Then }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    And('he taps the door', tapsDoor);
    And('he taps Manage on the sheet', async () => {
      await user.click(within(all()).getByRole('button', { name: 'Manage' }));
    });
    Then('the Lexicons page of the Library is open', async () => {
      await screen.findByRole('heading', { name: 'Lexicons', level: 1 });
      expect(window.location.hash).toBe('#/library?kind=lexicon');
    });
  });

  Scenario('Back closes the sheet and leaves the word sheet', ({ Given, When, And, Then }) => {
    Given(GIVEN, openWith);
    When(WHEN, taps);
    And('he taps the door', tapsDoor);
    And('he presses Back', async () => {
      act(() => window.history.back());
    });
    Then('the sheet {string} is gone', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name })).toBeNull());
    });
    And('the word sheet is still there', () => {
      expect(screen.getByRole('dialog', { name: 'Word' })).toBeDefined();
    });
  });
});
