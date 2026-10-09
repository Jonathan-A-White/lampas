// features/steps/paradigms.steps.tsx — runs features/paradigms.feature: the Paradigms list (#/paradigms), a table in Study and
// Review mode, the cells locked by his grammar levels, and Ask the tutor, which opens the Reader on the open chapter and sends the
// table's name and the revealed forms to a fake Postern (tests/support/fake-postern.ts) as the bible-talk grind's paradigm focus.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db, type GrammarLevelName } from '../../src/data/db';
import { forgetRevealed } from '../../src/data/paradigms/revealed';
import { setLevel } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

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

  Scenario("Settings reaches the Paradigms screen and a table opens from the list", ({ Given, When, And, Then }) => {
    Given('Lampas is open on Settings', () => openAt('#/settings'));
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
      await setLevel(id, 'frontier', 'marked');
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
    And('a reader request for the table {string} was published', (_, table: string) => {
      expect(latest('reader-requested')).toMatchObject({ action: 'paradigm', table, book: 'rom', chapter: 8 });
    });
  });
});
