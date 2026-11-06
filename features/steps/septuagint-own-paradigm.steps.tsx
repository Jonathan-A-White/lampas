// features/steps/septuagint-own-paradigm.steps.tsx — runs features/septuagint-own-paradigm.feature: a table opened from a Septuagint word lays the lemma's forms found in the Septuagint and in the
// New Testament, each cell saying which (mw-u2w5klk.289). The New Testament's forms come from the real chapters, the Septuagint's from a small chapter of Genesis 1 in miniature, each answered
// as the build's lemma file (scripts/build-lemma-forms.mjs), since public/data-lxx ships no chapter on the Laptop yet.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { fileText, lemmaForms, readChapters, type LemmaFormEntry } from '../../scripts/build-lemma-forms.mjs';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { cellsOf, paradigmById } from '../../src/data/paradigms';
import { forgetDrills } from '../../src/data/paradigms/drill';
import { forgetLemmaForms } from '../../src/data/paradigms/ownForms';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { HOOK_TIMEOUT_MS } from '../../tests/support/timeouts';

const user = userEvent.setup();
/** What Genesis 1:2 of Swete's Septuagint holds of ἀόρατος (the lemma file's `lxx` list): the feminine nominative singular, twice. */
const SEPTUAGINT: LemmaFormEntry[] = [['ἀόρατος', 'A-NSF', 2, 'gen', 1, 2]];

let forms: Map<string, LemmaFormEntry[]>;
beforeAll(() => {
  forms = lemmaForms(readChapters('public/data').filter((c) => c.lang !== 'hbo'));
}, HOOK_TIMEOUT_MS);

afterAll(async () => {
  cleanup();
  clearBus();
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

/** The chapter files from disk and the lemma's file as the build writes it: the New Testament's forms under f, ἀόρατος's Septuagint forms under lxx. */
function stubFetch(): void {
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const lemma = /^\/lemma-forms\/([^?]+)\.json/.exec(url)?.[1];
    if (lemma === undefined) return chapterFetch(input, init);
    const name = decodeURIComponent(lemma);
    const entries = forms.get(name);
    return entries ? new Response(fileText(name, entries, name === 'ἀόρατος' ? SEPTUAGINT : []), { status: 200 }) : new Response('not found', { status: 404 });
  });
}

async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  forgetDrills();
  forgetLemmaForms();
  localStorage.clear();
  localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  stubFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.talks.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  const ideas = new Set(cellsOf(paradigmById('adjective-endings')!).flatMap((cell) => cell.ideas));
  await db.grammarLevels.bulkPut([...ideas].map((id) => ({ id, level: 'solid' as const, since: Date.now(), how: 'marked' as const })));
}

function open(table: string, word: string, lemma: string, parse: string, septuagint: boolean): void {
  cleanup();
  clearBus();
  forgetTrail();
  const params = new URLSearchParams({ t: table, mode: 'learn', w: word, p: parse, l: lemma });
  if (septuagint) params.set('text', 'lxx');
  window.history.replaceState(null, '', `/#/paradigms?${params.toString()}`);
  render(<App />);
}

const cells = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));
const holding = (form: string): HTMLElement | undefined => cells().find((cell) => cell.querySelector('[data-found]') !== null && cell.firstChild?.textContent === form);
const choose = async (_: unknown, name: string): Promise<void> => {
  await user.click(await within(await screen.findByRole('group', { name: 'Forms' })).findByRole('button', { name, exact: true }));
};

const feature = await loadFeature('features/septuagint-own-paradigm.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('his grammar levels have every adjective ending solid', freshStore);
  });

  Scenario("The form he tapped in Genesis 1:2 has its cell, found in the Septuagint, beside the New Testament's forms", ({ When, Then, And }) => {
    When('he opens {string} from the Septuagint word {string} of {string} parsed {string} in Learn', (_, table: string, word: string, lemma: string, parse: string) => open(table, word, lemma, parse, true));
    And('he chooses {string}', choose);
    Then('the word line says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('word-lit')).toHaveTextContent(text));
    });
    And('the outlined cell holds {string} and says {string}', async (_, form: string, found: string) => {
      await waitFor(() => expect(document.querySelector('[data-lit]')).not.toBeNull());
      const lit = document.querySelector<HTMLElement>('[data-lit]')!;
      expect(lit.firstChild?.textContent).toBe(form);
      expect(lit.querySelector('[data-found]')).toHaveTextContent(found);
    });
    And('the cell holding {string} says {string}', async (_, form: string, found: string) => {
      await waitFor(() => expect(holding(form)).toBeDefined());
      expect(holding(form)!.querySelector('[data-found]')).toHaveTextContent(found);
    });
    And('no cell says {string}', (_, text: string) => {
      expect(cells().filter((cell) => cell.textContent === text)).toHaveLength(0);
    });
    And('an empty cell says {string}', (_, text: string) => {
      expect(cells().filter((cell) => cell.dataset.state === 'absent' && cell.textContent === text).length).toBeGreaterThan(0);
    });
  });

  Scenario('The form he tapped says where the Septuagint uses it, and a New Testament form where the New Testament does', ({ When, Then, And }) => {
    When('he opens {string} from the Septuagint word {string} of {string} parsed {string} in Learn', (_, table: string, word: string, lemma: string, parse: string) => open(table, word, lemma, parse, true));
    And('he chooses {string}', choose);
    Then("the form's note says {string}", async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('own-note')).toHaveTextContent(text));
    });
    When('he taps the cell holding {string}', async (_, form: string) => {
      await waitFor(() => expect(holding(form)).toBeDefined());
      await user.click(holding(form)!);
    });
    And("the form's note says {string}", async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('own-note')).toHaveTextContent(text));
    });
  });

  Scenario("The same word read in the New Testament has the New Testament's forms alone", ({ When, Then, And }) => {
    When('he opens {string} from the New Testament word {string} of {string} parsed {string} in Learn', (_, table: string, word: string, lemma: string, parse: string) => open(table, word, lemma, parse, false));
    And('he chooses {string}', choose);
    Then('the table shows these forms: {string} among its empty cells', async (_, list: string) => {
      await waitFor(() => expect(cells().filter((cell) => cell.dataset.state !== 'absent').map((cell) => cell.textContent?.trim())).toEqual(list.split(', ')));
    });
    And('no cell says {string}', (_, text: string) => {
      expect(document.querySelector('[data-found]')).toBeNull();
      expect(document.body.textContent).not.toContain(text);
    });
    And('an empty cell says {string}', (_, text: string) => {
      expect(cells().filter((cell) => cell.dataset.state === 'absent' && cell.textContent === text).length).toBeGreaterThan(0);
    });
  });
});
