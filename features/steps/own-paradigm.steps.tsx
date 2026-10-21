// features/steps/own-paradigm.steps.tsx — runs features/own-paradigm.feature: a table opened from a word shows the word's own forms (This word, mw-irpgqi.4): the forms of
// the lemma the text uses (src/data/paradigms/ownForms.ts, the files scripts/build-lemma-forms.mjs makes, public/lemma-forms, here answered from the real chapters), a cell the text lacks marked
// 'not in the NT', a tap on a form saying where it is first used, and a Drill that asks only the cells that have a form.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { fileText, lemmaForms, readChapters, type LemmaFormEntry } from '../../scripts/build-lemma-forms.mjs';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { forgetDrills } from '../../src/data/paradigms/drill';
import { forgetLemmaForms } from '../../src/data/paradigms/ownForms';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { HOOK_TIMEOUT_MS } from '../../tests/support/timeouts';

const user = userEvent.setup();
const CONTRACT_IDEAS = ['verb', 'mood-indicative', 'voice-active', 'person-1st', 'person-2nd', 'person-3rd', 'number-singular', 'number-plural', 'tense-present', 'contract-verbs'];

let forms: Map<string, LemmaFormEntry[]>;
beforeAll(() => {
  forms = lemmaForms(readChapters('public/data'));
}, HOOK_TIMEOUT_MS);

afterAll(async () => {
  cleanup();
  clearBus();
  // App's cleanup drops the usage log's pending writes; let them land before the file closes the db
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

/** The chapter files from disk and a lemma's file from the real chapters (the build makes the same bytes into public/lemma-forms). */
function stubFetch(): void {
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const lemma = /^\/lemma-forms\/([^?]+)\.json/.exec(url)?.[1];
    if (lemma === undefined) return chapterFetch(input, init);
    const entries = forms.get(decodeURIComponent(lemma));
    return entries ? new Response(fileText(decodeURIComponent(lemma), entries), { status: 200 }) : new Response('not found', { status: 404 });
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
  await db.grammarLevels.bulkPut(CONTRACT_IDEAS.map((id) => ({ id, level: 'solid' as const, since: Date.now(), how: 'marked' as const })));
}

function open(table: string, word: string, lemma: string, mode: string): void {
  cleanup();
  clearBus();
  forgetTrail();
  const parse = word === 'ἀγαπῶ' || word === 'τηρῶ' ? 'V-PAI-1S' : 'V-PAI-3S';
  window.history.replaceState(null, '', `/#/paradigms?${new URLSearchParams({ t: table, mode: mode.toLowerCase(), w: word, p: parse, l: lemma }).toString()}`);
  render(<App />);
}

const cells = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));
const texts = (): string[] => cells().map((cell) => cell.textContent?.trim() ?? '');
const choose = async (_: unknown, name: string): Promise<void> => {
  await user.click(await within(await screen.findByRole('group', { name: 'Forms' })).findByRole('button', { name, exact: true }));
};

const feature = await loadFeature('features/own-paradigm.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('his grammar levels have the present active of the contract verbs solid', freshStore);
  });

  Scenario("This word shows the lemma's own forms in its own row, and The pattern gives the model verbs back", ({ When, Then, And }) => {
    When('he opens the table {string} from the word {string} of {string} in Learn', (_, table: string, word: string, lemma: string) => open(table, word, lemma, 'learn'));
    Then('the table shows {int} cells', async (_, count: number) => {
      await waitFor(() => expect(cells()).toHaveLength(count));
    });
    When('he chooses {string}', choose);
    Then('the table shows these forms: {string}', async (_, list: string) => {
      await waitFor(() => expect(texts()).toEqual(list.split(', ')));
    });
    And('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    When('he switches back to {string}', choose);
    Then("the table is the pattern's {int} cells again", async (_, count: number) => {
      await waitFor(() => expect(cells()).toHaveLength(count));
    });
  });

  Scenario('A cell the text lacks says not in the NT and holds no form', ({ When, Then, And }) => {
    When('he opens the table {string} from the word {string} of {string} in Learn', (_, table: string, word: string, lemma: string) => open(table, word, lemma, 'learn'));
    And('he chooses {string}', choose);
    Then('the table shows these forms: {string}', async (_, list: string) => {
      await waitFor(() => expect(texts()).toEqual(list.split(', ')));
    });
  });

  Scenario('A tap on a form says where the text first uses it and opens the Reader there', ({ When, Then, And }) => {
    When('he opens the table {string} from the word {string} of {string} in Learn', (_, table: string, word: string, lemma: string) => open(table, word, lemma, 'learn'));
    And('he chooses {string}', choose);
    And('he taps the form {string}', async (_, form: string) => {
      await waitFor(() => expect(cells().some((cell) => cell.textContent === form)).toBe(true));
      await user.click(cells().find((cell) => cell.textContent === form)!);
    });
    Then("the form's note says {string} and {string}", async (_, place: string, pattern: string) => {
      const note = await screen.findByTestId('own-note');
      expect(note).toHaveTextContent(place);
      expect(note).toHaveTextContent(pattern);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('the Reader is on Luke 6', async () => {
      await screen.findByRole('heading', { name: 'Luke 6' });
    });
  });

  Scenario('The Drill asks only the cells that have a form', ({ When, Then, And }) => {
    When('he opens the table {string} from the word {string} of {string} in Drill', (_, table: string, word: string, lemma: string) => open(table, word, lemma, 'drill'));
    And('he chooses {string}', choose);
    Then('{int} cells are blank to be asked and {int} say {string}', async (_, blank: number, absent: number, text: string) => {
      await waitFor(() => expect(document.querySelectorAll('[data-state="hidden"]')).toHaveLength(blank));
      expect(cells().filter((cell) => cell.textContent === text)).toHaveLength(absent);
    });
  });
});
