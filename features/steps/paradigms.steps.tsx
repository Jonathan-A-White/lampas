// features/steps/paradigms.steps.tsx — runs features/paradigms.feature: the Paradigms list (#/paradigms), a table in Study and
// Review mode, the cells locked by his grammar levels, and Ask the tutor, which opens the Reader on the open chapter and sends the
// table's name and the revealed forms to a fake Postern (tests/support/fake-postern.ts) as the bible-talk grind's paradigm focus.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db, type GrammarLevelName } from '../../src/data/db';
import { cellsOf, paradigmById } from '../../src/data/paradigms';
import { forgetRevealed } from '../../src/data/paradigms/revealed';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { expectLatest } from '../../tests/support/published';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern | undefined;

/** The fixture of the feature's Background: where each idea stands. An idea not listed has no level (not yet). */
const FIXTURE: Record<string, GrammarLevelName> = {
  article: 'solid',
  noun: 'solid',
  'case-nominative': 'solid',
  'number-singular': 'solid',
  'gender-masculine': 'solid',
  'case-genitive': 'frontier',
  'gender-feminine': 'frontier',
  'case-dative': 'notYet',
  'case-accusative': 'notYet',
  'number-plural': 'notYet',
  'gender-neuter': 'notYet',
};

async function freshStore(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  forgetRevealed();
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  fake = undefined;
  vi.unstubAllGlobals();
  tutorTimings.pollMs = 20;
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.talks.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await db.grammarLevels.bulkPut(Object.entries(FIXTURE).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' as const })));
}

/** Puts the fake Postern in front of the Postern origin and leaves the chapter files to the stub. */
function behindFakePostern(): void {
  const postern = makeFakePostern();
  postern.autoReply = { status: 'answered', answer: TALK_ANSWER };
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init),
  );
  fake = postern;
}

function openAt(hash: string): void {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
}

const cellAt = (place: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-cell="${place}"]`);
  if (!el) throw new Error(`no cell "${place}" on screen`);
  return el;
};
const listRow = (name: string): HTMLElement => {
  const el = Array.from(document.querySelectorAll<HTMLElement>('[data-paradigm]')).find((row) => row.querySelector('[data-testid="paradigm-name"]')?.textContent === name);
  if (!el) throw new Error(`no row "${name}" on the list`);
  return el;
};

/** Each "Name: Available forms: N of M" has to be on the list. */
const listReads = async (_: unknown, ...rows: string[]): Promise<void> => {
  for (const row of rows.slice(0, 5)) {
    const [name, count] = [row.slice(0, row.indexOf(': ')), row.slice(row.indexOf(': ') + 2)];
    await waitFor(() => expect(within(listRow(name)).getByTestId('paradigm-available')).toHaveTextContent(count));
  }
};

const shows = async (place: string, form: string): Promise<void> => {
  await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', 'shown'));
  expect(cellAt(place)).toHaveTextContent(form);
};
const showsNothing = async (place: string, state: 'locked' | 'hidden'): Promise<void> => {
  await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', state));
  // a locked or unrevealed cell holds no Greek at all
  expect(cellAt(place).textContent ?? '').not.toMatch(/\p{Script=Greek}/u);
};

const tapsCell = (place: string) => async (): Promise<void> => {
  await user.click(cellAt(place));
};

/** Puts a comma-separated list of ideas at the frontier, over the Background's levels. */
const putAtFrontier = async (_: unknown, ids: string): Promise<void> => {
  await db.grammarLevels.bulkPut(ids.split(', ').map((id) => ({ id, level: 'frontier' as const, since: Date.now(), how: 'marked' as const })));
};

const feature = await loadFeature('features/paradigms.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given(
      'his grammar levels are the article, the nominative, the singular and nouns solid, the genitive and the feminine at the frontier, the masculine solid, the dative, the accusative, the plural and the neuter not yet',
      freshStore,
    );
  });

  Scenario('The list shows each table with how many of its forms are available', ({ When, Then, And }) => {
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    Then('the list reads {string}, {string}, {string} and {string}', async (_, ...rows: string[]) => {
      for (const row of rows.slice(0, 4)) {
        const [name, count] = [row.slice(0, row.indexOf(': ')), row.slice(row.indexOf(': ') + 2)];
        await waitFor(() => expect(within(listRow(name)).getByTestId('paradigm-available')).toHaveTextContent(count));
      }
    });
    And('the progress bar of {string} is at {int} of {int}', async (_, name: string, now: number, max: number) => {
      const bar = within(listRow(name)).getByRole('progressbar');
      await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', String(now)));
      expect(bar).toHaveAttribute('aria-valuemax', String(max));
    });
  });

  Scenario("The list groups the tables by tier under the tier's title", ({ When, Then, And }) => {
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    Then('the list has the groups {string}, {string} and {string}, in that order', async (_, ...titles: string[]) => {
      await screen.findByRole('heading', { name: titles[0], level: 2 });
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(titles.slice(0, 3));
    });
    And('the group {string} holds {string}', async (_, title: string, names: string) => {
      const group = (await screen.findByRole('heading', { name: title, level: 2 })).closest('section') as HTMLElement;
      expect(within(group).getAllByTestId('paradigm-name').map((n) => n.textContent)).toEqual(names.split(', '));
    });
    And('the group {string} holds {int} tables, the first {string} and the last {string}', async (_, title: string, n: number, first: string, last: string) => {
      const group = (await screen.findByRole('heading', { name: title, level: 2 })).closest('section') as HTMLElement;
      const names = within(group).getAllByTestId('paradigm-name').map((el) => el.textContent);
      expect(names).toHaveLength(n);
      expect(names.includes(first) && names[names.length - 1] === last).toBe(true);
    });
  });

  Scenario('Opening a table keeps that he opened it', ({ When, Then, And }) => {
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    And('he taps {string} in the list', async (_, name: string) => user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) })));
    Then('the tables he has opened are {string}', async (_, ids: string) => {
      await waitFor(async () => expect(JSON.parse((await db.settings.get('paradigmsOpened'))?.value ?? '[]')).toEqual([ids]));
    });
    When('he goes back to the list and opens {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name: '‹ Paradigms' }));
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
    });
    Then('the tables he has opened are {string} and {string}', async (_, a: string, b: string) => {
      await waitFor(async () => expect(JSON.parse((await db.settings.get('paradigmsOpened'))?.value ?? '[]')).toEqual([a, b]));
    });
  });

  Scenario('The list shows the five tables of the nouns and pronouns, each with how many of its forms are available', ({ When, Then }) => {
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    Then('the list also reads {string}, {string}, {string}, {string} and {string}', listReads);
  });

  Scenario('The count follows the ideas he has, and the interrogative table stays shut while its idea is not yet', ({ Given, When, Then }) => {
    Given('the ideas {string} and {string} are at the frontier', async (_, a: string, b: string) => {
      await db.grammarLevels.bulkPut([a, b].map((id) => ({ id, level: 'frontier' as const, since: Date.now(), how: 'marked' as const })));
    });
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    Then('the list also reads {string}, {string}, {string}, {string} and {string}', listReads);
  });

  Scenario('The list shows the seven tables of the verb, with the tenses he has not met still locked', ({ Given, When, Then }) => {
    Given('the ideas {string} are at the frontier', putAtFrontier);
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    Then('the verb tables read {string}', async (_, rows: string) => {
      for (const row of rows.split(', ')) {
        const [name, count] = [row.slice(0, row.indexOf(': ')), row.slice(row.indexOf(': ') + 2)];
        await waitFor(() => expect(within(listRow(name)).getByTestId('paradigm-available')).toHaveTextContent(count));
      }
    });
  });

  Scenario('The future cells of Future and aorist stay locked, naming the future tense, while the aorist cells open', ({ Given, And, Then }) => {
    Given('the ideas {string} are at the frontier', putAtFrontier);
    And('the table {string} is open in Review mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=review`));
    Then('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    And('the cell {string} shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the {int} future cells are locked and their accessible names name {string}', async (_, count: number, idea: string) => {
      await waitFor(() => expect(document.querySelectorAll('[data-cell*="Future"][data-state="locked"]')).toHaveLength(count));
      for (const cell of document.querySelectorAll('[data-cell*="Future"]')) expect(cell.getAttribute('aria-label')?.toLowerCase()).toContain(idea.toLowerCase());
    });
    And('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
  });

  Scenario('The participle table stays shut while the participle idea is not yet, and opens with it', ({ Given, And, Then, When }) => {
    Given('every idea of the table {string} except {string} is at the frontier', async (_, id: string, except: string) => {
      const table = paradigmById(id);
      if (!table) throw new Error(`no table ${id}`);
      const ids = new Set(cellsOf(table).flatMap((cell) => cell.ideas));
      ids.delete(except);
      await db.grammarLevels.bulkPut([...ids].map((idea) => ({ id: idea, level: 'frontier' as const, since: Date.now(), how: 'marked' as const })));
    });
    And('the table {string} is open in Review mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=review`));
    Then('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    And('all {int} cells of the table are locked', async (_, count: number) => {
      await waitFor(() => expect(document.querySelectorAll('[data-cell][data-state="locked"]')).toHaveLength(count));
    });
    And('every lock names {string}', (_, idea: string) => {
      const locks = document.querySelectorAll('[data-cell][data-state="locked"]');
      expect(locks.length).toBeGreaterThan(0);
      for (const cell of locks) expect(cell.getAttribute('aria-label')?.toLowerCase()).toContain(idea.toLowerCase());
    });
    When('the idea {string} moves to frontier', async (_, id: string) => {
      await db.grammarLevels.put({ id, level: 'frontier', since: Date.now(), how: 'marked' });
    });
    Then('the table now says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    And('the cell {string} now shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} also shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} likewise shows {string}', (_, place: string, form: string) => shows(place, form));
  });

  Scenario('Opening The third declension shows its 48 cells, every one locked while its idea is not yet', ({ When, And, Then }) => {
    When('he opens the Paradigms screen', () => openAt('#/paradigms'));
    And('he taps {string} in the list', async (_, name: string) => {
      await waitFor(() => listRow(name));
      await user.click(listRow(name));
    });
    Then('the table {string} is on screen with {int} cells', async (_, name: string, count: number) => {
      await screen.findByRole('heading', { name });
      expect(document.querySelectorAll('[data-cell]')).toHaveLength(count);
    });
    And('the address is for the table {string}', (_, id: string) => {
      expect(window.location.hash).toMatch(new RegExp(`^#/paradigms\\?t=${id}(&|$)`));
    });
    And('all {int} cells of the table are locked', async (_, count: number) => {
      await waitFor(() => expect(document.querySelectorAll('[data-cell][data-state="locked"]')).toHaveLength(count));
    });
  });

  Scenario('A third declension form opens with its ideas and stays locked without them', ({ Given, Then, When, And }) => {
    Given('the table {string} is open in Review mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=review`));
    Then('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
    When('the idea {string} moves to frontier', async (_, id: string) => {
      await db.grammarLevels.put({ id, level: 'frontier', since: Date.now(), how: 'marked' });
    });
    Then('the cell {string} now shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} also shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
    And('the cell {string} is also locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
    And('the table still has {int} cells', (_, count: number) => {
      expect(document.querySelectorAll('[data-cell]')).toHaveLength(count);
    });
  });

  Scenario("Settings reaches the Paradigms screen and a table opens from the list", ({ Given, When, And, Then }) => {
    Given('Lampas is open on Settings', () => openAt('#/settings?group=account'));
    When('he taps Paradigms in Settings', async () => {
      await user.click(await screen.findByRole('button', { name: /^Paradigms/ }));
    });
    And('he taps {string} in the list', async (_, name: string) => {
      await waitFor(() => listRow(name));
      await user.click(listRow(name));
    });
    Then('the table {string} is on screen with {int} cells', async (_, name: string, count: number) => {
      await screen.findByRole('heading', { name });
      expect(document.querySelectorAll('[data-cell]')).toHaveLength(count);
    });
    And('the address is for the table {string}', (_, id: string) => {
      expect(window.location.hash).toMatch(new RegExp(`^#/paradigms\\?t=${id}(&|$)`));
    });
  });

  Scenario('A form whose idea is not yet shows locked, and is available once its idea reaches the frontier', ({ Given, Then, And, When }) => {
    Given('the table {string} is open in Review mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=review`));
    Then('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
    And('the cell {string} shows {string}', (_, place: string, form: string) => shows(place, form));
    When('the idea {string} moves to frontier', async (_, id: string) => {
      // written straight to the store, as the fixture is: this scenario is about what a level opens in the table, not about one idea at a time
      await db.grammarLevels.put({ id, level: 'frontier', since: Date.now(), how: 'marked' });
    });
    Then('the cell {string} now shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the table still has {int} cells', (_, count: number) => {
      expect(document.querySelectorAll('[data-cell]')).toHaveLength(count);
    });
  });

  Scenario('Study mode hides an available cell until it is tapped', ({ Given, Then, When, And }) => {
    Given('the table {string} is open in Study mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=study`));
    Then('the cell {string} says reveal and shows no form', async (_, place: string) => {
      await showsNothing(place, 'hidden');
      expect(cellAt(place)).toHaveTextContent('reveal');
    });
    When('he taps the cell {string}', (_, place: string) => tapsCell(place)());
    Then('the cell {string} shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} still says reveal and shows no form', async (_, place: string) => {
      await showsNothing(place, 'hidden');
      expect(cellAt(place)).toHaveTextContent('reveal');
    });
    And('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
  });

  Scenario('Review mode shows an available cell', ({ Given, When, Then, And }) => {
    Given('the table {string} is open in Study mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=study`));
    When('he taps the button to switch to Review mode', async () => {
      await user.click(await screen.findByRole('button', { name: 'Review mode' }));
    });
    Then('the cell {string} shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} also shows {string}', (_, place: string, form: string) => shows(place, form));
    And('the cell {string} is locked and shows no form', (_, place: string) => showsNothing(place, 'locked'));
    And('the address is for the table {string} in Review mode', (_, id: string) => {
      expect(window.location.hash).toBe(`#/paradigms?t=${id}&mode=review`);
    });
  });

  Scenario('With every cell locked, the Study line does not tell him to tap a cell', ({ Given, Then, And }) => {
    Given('the table {string} is open in Study mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=study`));
    Then('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    And('the Study line does not say {string}', (_, text: string) => {
      expect(screen.getByTestId('mode-help')).not.toHaveTextContent(text);
    });
    And('the Study line says {string}', (_, text: string) => {
      expect(screen.getByTestId('mode-help')).toHaveTextContent(text);
    });
  });

  Scenario('The table says how many of its forms are available', ({ Given, Then }) => {
    Given('the table {string} is open in Study mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=study`));
    Then('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
  });

  Scenario("Ask the tutor hands the table's name and the revealed forms to the tutor", ({ Given, And, When, Then }) => {
    Given('the table {string} is open in Study mode, with a fake Postern', async (_, id: string) => {
      behindFakePostern();
      openAt(`#/paradigms?t=${id}&mode=study`);
      await screen.findByTestId('paradigm-table');
    });
    And('he taps the cells {string} and {string}', async (_, a: string, b: string) => {
      await tapsCell(a)();
      await tapsCell(b)();
    });
    When('he taps Ask the tutor', async () => {
      await user.click(await screen.findByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the reader is open on Romans 8 and the Talk sheet is titled {string}', async (_, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: /^Talk about / });
      expect(sheet).toHaveAccessibleName(title);
      expect(window.location.hash).toMatch(/^#\/\?/);
    });
    And('the mill received {int} grist for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake?.received).toHaveLength(count));
      expect(fake?.received[0].grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
    });
    And('the grist carries the focus paradigm {string} with the revealed forms {string} and {string}', (_, table: string, a: string, b: string) => {
      expect(fake?.received[0].input.focus).toEqual({ kind: 'paradigm', table, revealed: [a, b] });
    });
    And('the grist question names the table {string}', (_, table: string) => {
      expect(String(fake?.received[0].input.question)).toContain(table);
    });
    And('a reader request for the table {string} was published', async (_, table: string) => {
      await expectLatest('reader-requested', (e) => expect(e).toMatchObject({ action: 'paradigm', table, book: 'rom', chapter: 8 }));
    });
  });

  // mw-svw421.25
  Scenario('A locked cell names the ideas it still needs, each with a button to its sheet', ({ Given, And, When, Then }) => {
    Given('only the idea {string} is solid', async (_, id: string) => {
      await db.grammarLevels.clear();
      await db.grammarLevels.put({ id, level: 'solid', since: Date.now(), how: 'marked' });
    });
    And('the table {string} is open in Review mode', (_, id: string) => openAt(`#/paradigms?t=${id}&mode=review`));
    When('he taps the locked cell {string}', async (_, place: string) => {
      await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', 'locked'));
      await user.click(cellAt(place));
    });
    Then('the note under the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('lock-needs')).toHaveTextContent(text));
    });
    And('the note offers {string} first and {string}', (_, first: string, other: string) => {
      const buttons = within(screen.getByTestId('lock-needs')).getAllByRole('button');
      expect(buttons[0]).toHaveTextContent(first);
      expect(buttons.map((b) => b.textContent)).toContain(other);
    });
    When('he taps the button {string}', async (_, name: string) => {
      await user.click(within(screen.getByTestId('lock-needs')).getByRole('button', { name }));
    });
    Then('the idea sheet of {string} is open over the table', async (_, title: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Idea' });
      expect(within(sheet).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(document.querySelector('[data-testid="paradigm-table"]')).not.toBeNull();
    });
    When('he goes back', async () => {
      await act(async () => {
        window.history.back();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    });
    Then('no idea sheet is open and the table {string} is on screen', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Idea' })).toBeNull());
      expect(screen.getByRole('heading', { name, level: 1 })).toBeInTheDocument();
      expect(document.querySelectorAll('[data-cell]').length).toBeGreaterThan(0);
    });
  });
});
