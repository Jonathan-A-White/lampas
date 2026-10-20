// features/steps/paradigm-drill.steps.tsx — runs features/paradigm-drill.feature: 'Drill this table' on a table puts it on the schedule as the kind
// 'paradigm' (src/review/kinds.ts PARADIGM), and Review asks a few of its available cells by name among four forms of the same table.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db, type GrammarLevelName } from '../../src/data/db';
import { cellsOf, paradigmById, PARADIGMS, type Levels } from '../../src/data/paradigms';
import { drawCellQuestions } from '../../src/data/paradigms/cells';
import { mulberry32 } from '../../src/data/quiz';
import { countDue } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { grammarRandom } from '../../src/review/kinds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton } from '../../tests/support/find-button';

afterAll(async () => {
  cleanup();
  clearBus();
  // App's cleanup drops the usage log's pending writes; let them land before the file closes the db
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();

/** The feature's Background: where each idea stands. An idea not listed has no level (not yet). */
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

/** The seed the app's random starts from; a scenario that needs one cell first looks for it. */
let seed = 7;

async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  // a held licence and an empty store would start the welcome
  localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  seed = 7;
  asked.length = 0;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await db.grammarLevels.bulkPut(Object.entries(FIXTURE).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' as const })));
}

function openAt(hash: string): void {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App newRandom={() => mulberry32(seed)} />);
}

let levels: Levels = new Map(Object.entries(FIXTURE).map(([id, level]) => [id, { level }]));

/** Every question of the round the scenario answered: its prompt and options. */
const asked: Array<{ prompt: string; options: string[] }> = [];

const optionButtons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const optionTexts = (): string[] => optionButtons().map((o) => o.textContent ?? '');
const prompt = (): string => screen.getByTestId('grammar-prompt').textContent ?? '';
const optionNamed = (form: string): HTMLElement => {
  const found = optionButtons().find((o) => o.textContent === form);
  if (!found) throw new Error(`no option ${form} on screen`);
  return found;
};

const feature = await loadFeature('features/paradigm-drill.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given(
      'his grammar levels are the article, the nominative, the singular and nouns solid, the genitive and the feminine at the frontier, the masculine solid, the dative, the accusative, the plural and the neuter not yet',
      freshStore,
    );
  });

  Scenario('Drill this table puts the article in Review', ({ Given, When, Then, And }) => {
    Given('the round would ask {string} first', (_, wanted: string) => {
      const table = paradigmById('article')!;
      for (let s = 1; s < 500; s += 1) {
        if (drawCellQuestions(table, levels, grammarRandom(mulberry32(s)))[0]?.prompt !== wanted) continue;
        seed = s;
        return;
      }
      throw new Error(`no seed asks ${wanted} first`);
    });
    When('he opens the table {string}', async (_, name: string) => {
      openAt('#/paradigms');
      const row = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-paradigm="${PARADIGMS.find((p) => p.name === name)?.id}"]`);
        if (!found) throw new Error(`no row "${name}" on the list`);
        return found;
      });
      await user.click(row);
      await screen.findByRole('heading', { name, level: 1 });
    });
    And('he taps {string}', async (_, label: string) => {
      await user.click(await findButton(label));
    });
    Then('the button now reads {string}', async (_, label: string) => {
      expect(await findButton(label)).toBeTruthy();
    });
    When('he opens Review', async () => {
      openAt('#/review');
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    Then('the Review screen says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
    When('he starts the review', async () => {
      await user.click(await screen.findByRole('button', { name: 'Start' }));
      await screen.findByTestId('grammar-prompt');
    });
    Then('the round asks {string} with four forms, the right {string} among them', (_, wanted: string, right: string) => {
      expect(prompt()).toBe(wanted);
      expect(optionTexts().length).toBe(4);
      expect(optionTexts()).toContain(right);
    });
    When('he taps the form {string}', async (_, form: string) => {
      await user.click(optionNamed(form));
    });
    Then('the form {string} turns green', async (_, form: string) => {
      await waitFor(() => expect(optionNamed(form)).toHaveAttribute('data-result', 'right'));
    });
    And('the review {string} {string} has {int} right and no lapse', async (_, kind: string, id: string, rights: number) => {
      await waitFor(async () => {
        const row = await db.reviews.get([kind, id]);
        expect(row?.rights).toBe(rights);
        expect(row?.lapses).toBe(0);
      });
    });
  });

  Scenario('A locked cell is never asked', ({ Given, When, And, Then }) => {
    Given('the table {string} is on the schedule and due', async (_, id: string) => {
      const now = Date.now();
      await db.reviews.put({ kind: 'paradigm', id, step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
    });
    When('he opens Review', async () => {
      openAt('#/review');
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    And('he starts the review', async () => {
      await user.click(await screen.findByRole('button', { name: 'Start' }));
      await screen.findByTestId('grammar-prompt');
    });
    And('he answers every question of the round', async () => {
      for (;;) {
        asked.push({ prompt: prompt(), options: optionTexts() });
        await user.click(optionButtons()[0]);
        const next = await screen.findByTestId('next');
        const last = next.textContent === 'Finish';
        await user.click(next);
        if (last) break;
        await waitFor(() => expect(screen.getByTestId('grammar-prompt').textContent).not.toBe(asked[asked.length - 1].prompt));
      }
      // the end card is the round's last write: the file must not close the store under it
      await screen.findByTestId('score');
    });
    Then('the round asked at most {int} cells', (_, most: number) => {
      expect(asked.length).toBeGreaterThan(0);
      expect(asked.length).toBeLessThanOrEqual(most);
    });
    And('every cell asked is one of the {int} available article forms', (_, n: number) => {
      const table = paradigmById('article')!;
      const open = new Set(
        table.rows.flatMap((row) =>
          row.cells.flatMap((cell, c) => {
            const ok = cell.ideas.every((id) => levels.get(id)?.level === 'solid' || levels.get(id)?.level === 'frontier');
            const name = [row.group, row.label, table.columns[c].group, table.columns[c].label].filter(Boolean).join(' ');
            return ok ? [name.toLowerCase()] : [];
          }),
        ),
      );
      expect(open.size).toBe(n);
      for (const { prompt: p } of asked) expect(open.has(p.replace(/ of the article$/, '').toLowerCase())).toBe(true);
    });
    And('every option is a form of the article', () => {
      const forms = new Set(cellsOf(paradigmById('article')!).map((c) => c.form));
      for (const { options } of asked) {
        expect(options.length).toBe(4);
        for (const o of options) expect(forms.has(o)).toBe(true);
      }
    });
  });

  Scenario('A table with no form available cannot be drilled', ({ Given, When, Then, And }) => {
    Given('he has no grammar level', async () => {
      await db.grammarLevels.clear();
      levels = new Map();
    });
    When('he opens the table {string}', async (_, name: string) => {
      openAt(`#/paradigms?t=${PARADIGMS.find((p) => p.name === name)?.id}`);
      await screen.findByRole('heading', { name, level: 1 });
    });
    Then('the table says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('table-available')).toHaveTextContent(text));
    });
    And('the button {string} is disabled', async (_, label: string) => {
      await waitFor(async () => expect(await findButton(label)).toBeDisabled());
    });
    And('the schedule holds no {string} row', async (_, kind: string) => {
      expect(await db.reviews.where('kind').equals(kind).count()).toBe(0);
    });
  });

  Scenario('A due table with no form available is not counted and Start says nothing is due', ({ Given, When, Then, And }) => {
    Given('he has no grammar level', async () => {
      await db.grammarLevels.clear();
      levels = new Map();
    });
    And('the table {string} is on the schedule and due', async (_, id: string) => {
      const now = Date.now();
      await db.reviews.put({ kind: 'paradigm', id, step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
    });
    And('he has no words', async () => {
      await db.words.clear();
    });
    When('he opens Review', async () => {
      openAt('#/review');
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    Then('the Review screen says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
    And('nothing is counted as due', async () => {
      expect(await countDue()).toBe(0);
    });
    When('he starts the review', async () => {
      await user.click(await screen.findByRole('button', { name: 'Start' }));
    });
    Then('Review says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('nothing-to-ask')).toHaveTextContent(text));
    });
  });
});
