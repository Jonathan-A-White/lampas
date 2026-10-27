// features/steps/hebrew-paradigms.steps.tsx — runs features/hebrew-paradigms.feature: the four Hebrew tables of src/data/paradigms/hebrew/ on the Paradigms screen (the list with Hebrew chosen, a table in
// Learn and Drill drawn right to left in Hebrew type, a lock naming the Hebrew ideas it needs, How much of a table), the word sheet's Paradigm row on a Hebrew word of Jonah 1, the Greek | Hebrew segment
// where both languages are chosen, and the Greek tables as they were.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db, type GrammarLevelName } from '../../src/data/db';
import { paradigmsIn } from '../../src/data/paradigms';
import { forgetDrills } from '../../src/data/paradigms/drill';
import { setLanguages } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import type { Languages } from '../../src/settings/definitions/interest';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { unstubRangeRects } from '../../tests/support/fake-layout';
import { writeSourceSegment } from '../../src/ui/sourceSegmentStore';

afterAll(async () => {
  cleanup();
  clearBus();
  // App's cleanup drops the usage log's pending writes; let them land before the file closes the db
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** The Background: where each Hebrew idea stands. An idea not listed has no level (not yet). */
const FIXTURE: Record<string, GrammarLevelName> = {
  'he-root': 'solid',
  'he-qal': 'solid',
  'he-perfect': 'solid',
  'he-number': 'solid',
  'he-person-gender-number': 'solid',
  'he-gender': 'frontier',
};

async function freshStore(languages: Languages): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  forgetDrills();
  unstubRangeRects();
  localStorage.clear();
  localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  writeSourceSegment('grc');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await db.grammarLevels.bulkPut(Object.entries(FIXTURE).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' as const })));
  await setLanguages(languages);
  // an Old Testament chapter is read by the Hebrew dial: these scenarios are of a phone with Hebrew All in
  if (languages !== 'greek') await db.settings.put({ key: 'hebrewInterest', value: '5' });
  await db.settings.put({ key: 'readerView', value: 'greek' });
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
const listNames = async (): Promise<string[]> => {
  await waitFor(() => expect(document.querySelectorAll('[data-testid="paradigm-name"]').length).toBeGreaterThan(0));
  return [...document.querySelectorAll('[data-testid="paradigm-name"]')].map((el) => el.textContent ?? '');
};
const listRow = (name: string): HTMLElement => {
  const el = [...document.querySelectorAll<HTMLElement>('[data-paradigm]')].find((row) => row.querySelector('[data-testid="paradigm-name"]')?.textContent === name);
  if (!el) throw new Error(`no row "${name}" on the list`);
  return el;
};
const extentChip = (name: string): HTMLElement => within(screen.getByRole('group', { name: 'How much of a table' })).getByRole('button', { name, exact: true });
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordEl = (verse: number, text: string): HTMLElement => {
  const found = [...verseEl(verse).querySelectorAll<HTMLElement>('[data-word]')].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no word "${text}" in verse ${verse}`);
  return found;
};
const sheet = async (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Word' });

const feature = await loadFeature('features/hebrew-paradigms.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given(
      'Hebrew is the only language chosen and his Hebrew grammar levels are the root, the qal stem, the perfect, the number and the person, gender and number solid, the gender at the frontier, the imperfect and the imperative not yet',
      () => freshStore('hebrew'),
    );
  });

  const opensList = (): void => openAt('#/paradigms');
  const opensTo = (mode: 'learn' | 'drill') => (_: unknown, id: string): void => openAt(`#/paradigms?t=${id}&mode=${mode}`);
  const holdsFour = async (_: unknown, ...names: string[]): Promise<void> => {
    const listed = await listNames();
    for (const name of names.slice(0, 4)) expect(listed, name).toContain(name);
    expect(listed).toHaveLength(4);
  };
  const showsInHebrew = async (_: unknown, place: string, form: string): Promise<void> => {
    await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', 'shown'));
    const cell = cellAt(place);
    expect(cell).toHaveTextContent(form);
    expect(cell).toHaveAttribute('lang', 'he');
    expect(cell.classList.contains('script-he')).toBe(true);
  };
  const tapsCell = async (_: unknown, place: string): Promise<void> => {
    await waitFor(() => expect(cellAt(place)).toBeTruthy());
    await user.click(cellAt(place));
  };

  Scenario('With Hebrew chosen the Paradigms list shows the four Hebrew tables', ({ When, Then, And }) => {
    When('he opens the Paradigms screen', opensList);
    Then('the list holds {string}, {string}, {string} and {string}', holdsFour);
    And('the list holds no Greek table', async () => {
      expect(document.querySelector('[data-paradigm="article"]')).toBeNull();
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
    And('the list reads {string}', async (_, row: string) => {
      const [name, count] = [row.slice(0, row.indexOf(': ')), row.slice(row.indexOf(': ') + 2)];
      await waitFor(() => expect(within(listRow(name)).getByTestId('paradigm-available')).toHaveTextContent(count));
    });
  });

  Scenario('The qal perfect opens filled in, right to left, in Hebrew type', ({ When, Then, And }) => {
    When('he opens the table {string} to Learn', opensTo('learn'));
    Then('the table is drawn right to left', async () => {
      const table = await screen.findByTestId('paradigm-table');
      expect(table).toHaveAttribute('dir', 'rtl');
    });
    And('the cell {string} shows {string} in Hebrew type', showsInHebrew);
    And('the cell {string} also shows {string} in Hebrew type', showsInHebrew);
    And('the cell {string} is locked', async (_, place: string) => {
      await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', 'locked'));
    });
  });

  Scenario('A locked cell says which Hebrew ideas it still needs', ({ When, Then, And }) => {
    When('he opens the table {string} to Learn', opensTo('learn'));
    And('he taps the cell {string}', tapsCell);
    Then('the lock says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('lock-needs')).toHaveTextContent(text));
    });
    And('the lock offers {string}', async (_, name: string) => {
      expect(within(screen.getByTestId('lock-needs')).getByRole('button', { name })).toBeTruthy();
    });
  });

  Scenario('Drill blanks the qal perfect and a tap shows a form', ({ When, Then, And }) => {
    When('he opens the table {string} to Drill', opensTo('drill'));
    Then('the cell {string} is blank', async (_, place: string) => {
      await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-state', 'hidden'));
      expect(cellAt(place).textContent?.trim() ?? '').toBe('');
    });
    When('he taps the cell {string}', tapsCell);
    Then('the cell {string} shows {string} in Hebrew type', showsInHebrew);
    When('he says {string}', async (_, grade: string) => {
      await user.click(await screen.findByRole('button', { name: grade }));
    });
    Then('the cell {string} is graded {string}', async (_, place: string, grade: string) => {
      await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-grade', grade));
    });
    let other = '';
    When('he taps another cell, {string}', async (_, place: string) => {
      other = place;
      await tapsCell(undefined, place);
    });
    And('he grades it {string}', async (_, grade: string) => {
      await user.click(await screen.findByRole('button', { name: grade }));
    });
    Then('that cell is graded {string}', async (_, grade: string) => {
      await waitFor(() => expect(cellAt(other)).toHaveAttribute('data-grade', grade));
    });
    And('the table is not put in Review', async () => {
      expect(await db.reviews.toArray()).toEqual([]);
    });
  });

  Scenario('How much of a table at its smallest shows the first persons only, at its largest the whole table', ({ When, Then, And }) => {
    When('he opens the table {string} to Learn', opensTo('learn'));
    And('he taps {string} under How much of a table', async (_, chip: string) => user.click(await waitFor(() => extentChip(chip))));
    Then('the perfect shows {string} and {string} and no other perfect cell', async (_, a: string, b: string) => {
      await waitFor(() => expect(cellAt('Perfect 3rd masculine Singular')).toHaveAttribute('data-state', 'outside'));
      expect(cellAt(a)).toHaveAttribute('data-state', 'shown');
      expect(cellAt(b)).toHaveAttribute('data-state', 'shown');
      const shown = [...document.querySelectorAll<HTMLElement>('[data-cell^="Perfect "][data-state="shown"]')].map((el) => el.dataset.cell);
      expect(shown.sort()).toEqual([a, b].sort());
      expect(cellAt('Perfect 3rd masculine Singular')).toHaveAttribute('data-state', 'outside');
    });
    When('he taps {string} under How much of a table', async (_, chip: string) => user.click(extentChip(chip)));
    Then('all 24 cells of the table show their forms', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-cell][data-state="shown"]')).toHaveLength(24));
      for (const el of document.querySelectorAll<HTMLElement>('[data-cell]')) expect(el.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  Scenario('The sheet of וַיְהִי names the qal verb and a tap opens its cell', ({ Given, When, Then }) => {
    Given('Jonah 1 is open', async () => {
      openAt('#/?b=jon&c=1');
      await screen.findByRole('heading', { name: 'Jonah 1', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    When('he taps the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => user.click(wordEl(n, word)));
    Then('the Hebrew word sheet shows {string}', async (_, text: string) => {
      const [label, name] = text.split(': ');
      const row = await within(await sheet()).findByTestId('sheet-paradigm');
      expect(row.previousElementSibling).toHaveTextContent(label);
      expect(within(row).getByRole('button', { name })).toBeTruthy();
    });
    When('he taps the Paradigm row', async () => user.click(within(await within(await sheet()).findByTestId('sheet-paradigm')).getByRole('button')));
    Then('the table {string} opens with {string} outlined', async (_, name: string, place: string) => {
      await screen.findByRole('heading', { name, level: 1 });
      await waitFor(() => expect(cellAt(place)).toHaveAttribute('data-lit', 'true'));
      expect(screen.getByTestId('word-line')).toHaveTextContent('Verb - Qal - Consecutive imperfect - third person masculine singular');
    });
  });

  Scenario('A Hebrew word no table holds has no Paradigm row', ({ Given, When, Then }) => {
    Given('Jonah 1 is open', async () => {
      openAt('#/?b=jon&c=1');
      await screen.findByRole('heading', { name: 'Jonah 1', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    When('he taps the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => user.click(wordEl(n, word)));
    Then('the Hebrew word sheet has no Paradigm row', async () => {
      await within(await sheet()).findByTestId('sheet-parse');
      expect(within(await sheet()).queryByTestId('sheet-paradigm')).toBeNull();
    });
  });

  Scenario('With both languages chosen the segment chooses the tables', ({ Given, When, Then }) => {
    Given('both languages are chosen', async () => {
      await setLanguages('both');
    });
    When('he opens the Paradigms screen', opensList);
    Then('the list holds {string} and {int} other Greek tables', async (_, name: string, others: number) => {
      const listed = await listNames();
      expect(listed[0]).toBe(name);
      expect(listed).toHaveLength(others + 1);
      expect(screen.getByTestId('source-segment')).toBeTruthy();
    });
    When('he taps {string} in the segment', async (_, name: string) => user.click(within(screen.getByTestId('source-segment')).getByRole('button', { name })));
    Then('the list holds {string}, {string}, {string} and {string}', holdsFour);
  });

  Scenario('With Greek only no Hebrew table is listed and the Greek tables are as they were', ({ Given, When, Then, And }) => {
    Given('Greek is the only language chosen', async () => {
      await setLanguages('greek');
    });
    When('he opens the Paradigms screen', opensList);
    Then('the list holds {int} Greek tables and no Hebrew table', async (_, n: number) => {
      const listed = await listNames();
      expect(listed).toHaveLength(n);
      expect([...listed].sort()).toEqual(paradigmsIn('grc').map((t) => t.name).sort());
      expect(document.querySelector('[data-paradigm^="he-"]')).toBeNull();
    });
    And('the table {string} opens to Learn left to right with its cells locked', async (_, id: string) => {
      openAt(`#/paradigms?t=${id}&mode=learn`);
      await screen.findByRole('heading', { name: 'The article', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-cell]')).toHaveLength(24));
      expect(screen.getByTestId('paradigm-table')).not.toHaveAttribute('dir');
      expect(document.querySelector('[data-cell][lang="he"]')).toBeNull();
      // a Greek cell he has not unlocked is a lock, as it was
      expect(cellAt('Nominative Singular Masculine')).toHaveAttribute('data-state', 'locked');
    });
  });
});
