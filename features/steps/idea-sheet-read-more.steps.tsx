// features/steps/idea-sheet-read-more.steps.tsx — runs features/idea-sheet-read-more.feature: Read more on the idea sheet reads his shelf (the Pinned grammars, then the On ones; a grammar with no
// sections table never appears) and 'Ask for a grammar ›' opens the one ask with the kind Grammar (mw-rfjjzd.16).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { getGrammarBooks, getStudyResources, shelfOf, type ShelfState } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { IdeaSheet } from '../../src/IdeaSheet';
import { CATALOGUE } from '../../src/resources/catalogue';
import { browserEnv } from '../../src/resources/openApp';
import type { GrammarBook } from '../../src/resources/types';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

const real = { ...browserEnv };
browserEnv.after = () => () => {};

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

/** Seven books of the test's own, each teaching The noun in one section. */
const NAMES = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const testBook = (id: string): GrammarBook => ({
  id,
  lang: 'grc',
  short: `Book ${id}`,
  name: `The book called ${id}`,
  resource: `LLS:TEST${id.toUpperCase()}`,
  source: 'the test',
  sections: [{ title: `Chapter ${id}`, ref: 'Page.p_1', ideas: ['noun'] }],
});
const SEVEN = NAMES.map(testBook);
const shortOf = (id: string): string => `Book ${id}`;
const list = (text: string): string[] => text.split(',').map((s) => s.trim());

/** Empties the store, keeps Logos on, and puts `rows` on the shelf as the Library keeps them (the old keys say nothing is ticked, so the shelf takes nothing from them). */
async function keep(rows: readonly (readonly [string, ShelfState])[]): Promise<void> {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.settings.clear(), db.grammarLevels.clear(), db.library.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
    { key: 'resource.logos', value: 'on' },
  ]);
  // the shelf takes the old keys a moment after it is first read, and replaces the books those keys own (Black among them): wait for that before the rows are put
  await shelfOf();
  await waitFor(async () => expect(await db.library.get('#taken')).toBeDefined());
  await db.library.bulkPut(rows.map(([resource, state]) => ({ id: resource, kind: 'grammar', state: state as 'on' | 'pinned', since: 1 })));
}

const grammarNamed = (short: string) => CATALOGUE.find((e) => e.kind === 'grammar' && e.short === short) ?? expect.unreachable(`no grammar ${short}`);

const ideaSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Idea' });
const readMore = (): HTMLElement | null => within(ideaSheet()).queryByRole('region', { name: 'Read more' });
/** The book lines in view (a folded line is hidden). */
const lines = (): string[] => within(readMore()!).queryAllByRole('group').map((l) => l.getAttribute('aria-label') ?? '');

async function opens(id: string, books?: readonly GrammarBook[]): Promise<void> {
  render(<IdeaSheet idea={ideaOf(id)} onClose={() => undefined} onWord={() => undefined} books={books} />);
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
  await act(async () => {
    await getStudyResources();
    await getGrammarBooks();
  });
}

const feature = await loadFeature('features/idea-sheet-read-more.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Two Pinned grammars come first, then the On ones, and the rest wait under More books', ({ Given, When, Then }) => {
    Given(
      'Lampas has Logos on and a shelf of seven test grammars, {string} Pinned and {string} On, each teaching {string}',
      (_, pinned: string, on: string, idea: string) => {
        for (const b of SEVEN) expect(b.sections[0].ideas).toContain(idea);
        const byId = new Map(SEVEN.map((b) => [b.id, b.resource]));
        return keep([...list(pinned).map((id) => [byId.get(id)!, 'pinned'] as const), ...list(on).map((id) => [byId.get(id)!, 'on'] as const)]);
      },
    );
    When('he opens the idea sheet of {string} with the seven test grammars', (_, id: string) => opens(id, SEVEN));
    Then('the idea sheet shows Read more with the book lines {string} and a button {string}', async (_, ids: string, label: string) => {
      await within(ideaSheet()).findByRole('region', { name: 'Read more' });
      await waitFor(() => expect(lines()).toEqual(list(ids).map(shortOf)));
      expect(within(readMore()!).getByRole('button', { name: label })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(readMore()!).getByRole('button', { name: label }));
    });
    Then('the idea sheet shows Read more with the book lines {string} and no More books button', async (_, ids: string) => {
      await waitFor(() => expect(lines()).toEqual(list(ids).map(shortOf)));
      expect(within(readMore()!).queryByRole('button', { name: /^More books/ })).toBeNull();
    });
  });

  Scenario('A grammar with no sections table is on the shelf and never appears', ({ Given, When, Then }) => {
    Given('Lampas has Logos on and a shelf holding {string} and {string}, both Pinned', async (_, a: string, b: string) => {
      const [first, second] = [grammarNamed(a), grammarNamed(b)];
      expect(first.sections).toBeUndefined();
      expect(second.sections).toBeDefined();
      await keep([
        [first.resource, 'pinned'],
        [second.resource, 'pinned'],
      ]);
      expect((await shelfOf('grammar')).map((r) => r.id)).toContain(first.resource);
    });
    When('he opens the idea sheet of {string}', (_, id: string) => opens(id));
    Then('the idea sheet shows Read more with the book lines {string} and no More books button', async (_, short: string) => {
      await within(ideaSheet()).findByRole('region', { name: 'Read more' });
      expect(lines()).toEqual([short]);
      expect(within(readMore()!).queryByRole('button', { name: /^More books/ })).toBeNull();
    });
  });

  Scenario('Ask for a grammar opens the one ask with the kind Grammar', ({ Given, When, And, Then }) => {
    Given('Lampas has Logos on and a licence', () => keep([]));
    When('he opens the idea sheet of {string}', (_, id: string) => opens(id));
    And('he taps {string} on the idea sheet', async (_, label: string) => {
      await user.click(await within(ideaSheet()).findByRole('button', { name: label }));
    });
    Then('the sheet {string} is open with the kind {string}', async (_, name: string, kind: string) => {
      const box = await screen.findByRole('dialog', { name });
      const select = await within(box).findByRole('combobox', { name: 'Kind of book' });
      expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe(kind);
    });
  });
});
