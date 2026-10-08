// features/steps/words.steps.tsx — runs features/words.feature: the seeded word list, the Words screen,
// the tap-to-change states with the drop confirm, the Import screen, and the headword normaliser.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { normaliseLemma, type NormalisedLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';

afterAll(() => {
  cleanup();
  db.close();
});

const user = userEvent.setup();

async function openLampasFresh(): Promise<void> {
  cleanup();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear()]);
  window.location.hash = '';
  render(<App />);
}

async function openWords(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
  await waitFor(() => expect(document.querySelectorAll('[data-lemma]').length).toBeGreaterThan(0));
}

async function openImport(): Promise<void> {
  await openWords();
  await user.click(screen.getByRole('button', { name: 'Import' }));
  await screen.findByRole('heading', { name: 'Import' });
}

const wordRow = (lemma: string): HTMLElement => {
  const row = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`);
  if (!row) throw new Error(`no row for ${lemma}`);
  return row;
};

const countLine = () => screen.getByTestId('word-counts');

async function tapWord(lemma: string): Promise<void> {
  await user.click(wordRow(lemma));
}

async function expectState(lemma: string, state: string): Promise<void> {
  await waitFor(() => expect(wordRow(lemma).getAttribute('data-state')).toBe(state));
}

async function expectCountLine(text: string): Promise<void> {
  await waitFor(() => expect(countLine()).toHaveTextContent(text));
}

async function paste(lines: string): Promise<void> {
  await user.click(screen.getByRole('textbox'));
  await user.paste(lines);
}

const feature = await loadFeature('features/words.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('First open seeds 63 words, 54 solid and 9 learning', ({ Given, When, Then, And }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens Words', openWords);
    Then('the count line reads {string}', async (_, text: string) => expectCountLine(text));
    And('{int} words are listed', (_, n: number) => {
      expect(document.querySelectorAll('[data-lemma]')).toHaveLength(n);
    });
  });

  Scenario('The Words screen lists them by lesson', ({ Given, When, Then, And }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens Words', openWords);
    Then('the lessons are headed from Lesson 1 to Lesson 10 in order', () => {
      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(Array.from({ length: 10 }, (_, i) => `Lesson ${i + 1}`));
    });
    And('Lesson 1 lists δέ, εἰ, ἐν and καί', () => {
      const section = screen.getByRole('region', { name: 'Lesson 1' });
      const lemmas = [...section.querySelectorAll('[data-lemma]')].map((r) => r.getAttribute('data-lemma'));
      expect(lemmas.sort()).toEqual(['δέ', 'εἰ', 'ἐν', 'καί'].sort());
    });
    And('Lesson 10 lists {int} words, all learning', (_, n: number) => {
      const rows = [...screen.getByRole('region', { name: 'Lesson 10' }).querySelectorAll('[data-lemma]')];
      expect(rows).toHaveLength(n);
      expect(rows.every((r) => r.getAttribute('data-state') === 'learning')).toBe(true);
    });
  });

  Scenario('Tapping a solid word makes it learning, tapping again drops it after a confirm', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    And('he opens Words', openWords);
    When('he taps the word {string}', async (_, w: string) => tapWord(w));
    Then('{string} is learning', async (_, w: string) => expectState(w, 'learning'));
    When('he taps {string} again', async (_, w: string) => tapWord(w));
    Then('he is asked to confirm dropping {string}', async (_, w: string) => {
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toHaveTextContent(w);
    });
    And('{string} is still learning', async (_, w: string) => expectState(w, 'learning'));
    When('he confirms', async () => {
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Drop' }));
    });
    Then('{string} is dropped', async (_, w: string) => expectState(w, 'dropped'));
    And('the count line reads {string}', async (_, text: string) => expectCountLine(text));
  });

  Scenario('Keeping a word at the drop confirm leaves it learning', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    And('he opens Words', openWords);
    When('he taps the word {string}', async (_, w: string) => tapWord(w));
    And('he taps {string} again', async (_, w: string) => tapWord(w));
    And('he chooses to keep it', async () => {
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Keep' }));
    });
    Then('{string} is still learning', async (_, w: string) => {
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      await expectState(w, 'learning');
    });
  });

  const wordWithGloss = async (lemma: string, state: string, gloss: string) => {
    await expectState(lemma, state);
    expect(wordRow(lemma)).toHaveTextContent(gloss);
  };

  Scenario('Importing two pasted lines adds two words as learning and shows them', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    And('he opens Import', openImport);
    When('he pastes these lines', async (_, lines: string) => paste(lines));
    Then('the preview shows {int} words to add', async (_, n: number) => {
      await waitFor(() => expect(screen.getByTestId('import-summary')).toHaveTextContent(`${n} words to add`));
    });
    When('he taps Add', async () => {
      await user.click(screen.getByRole('button', { name: /^Add / }));
      await screen.findByRole('heading', { name: 'Words' });
    });
    Then('Words shows {string} as learning with the gloss {string}', async (_, l: string, g: string) => wordWithGloss(l, 'learning', g));
    And('Words shows {string} as learning with the gloss {string}', async (_, l: string, g: string) => wordWithGloss(l, 'learning', g));
    And('the count line reads {string}', async (_, text: string) => expectCountLine(text));
  });

  Scenario('A pasted line that is not a Greek word is flagged and not added', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    And('he opens Import', openImport);
    When('he pastes these lines', async (_, lines: string) => paste(lines));
    Then('the preview shows {int} word to add', async (_, n: number) => {
      await waitFor(() => expect(screen.getByTestId('import-summary')).toHaveTextContent(`${n} word to add`));
    });
    And('the preview flags {string} with {string}', (_, line: string, reason: string) => {
      const flagged = screen.getByText(line).closest('li');
      expect(flagged).toHaveTextContent(reason);
    });
  });

  Scenario('Import accepts a pasted row of the example table', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    And('he opens Import', openImport);
    When('he pastes these lines', async (_, lines: string) => paste(lines));
    Then('the preview shows {int} word to add', async (_, n: number) => {
      await waitFor(() => expect(screen.getByTestId('import-summary')).toHaveTextContent(`${n} word to add`));
    });
    When('he taps Add', async () => {
      await user.click(screen.getByRole('button', { name: /^Add / }));
      await screen.findByRole('heading', { name: 'Words' });
    });
    Then('Words shows {string} as learning with the gloss {string}', async (_, l: string, g: string) => wordWithGloss(l, 'learning', g));
  });

  ScenarioOutline('Normalising the BMA headwords', ({ Given, When, Then, And }, row) => {
    let result: NormalisedLemma;
    let shown = '';
    Given('the BMA lemma "<shown>"', () => {
      shown = row.shown;
    });
    When('it is normalised', () => {
      result = normaliseLemma(shown);
    });
    Then('the headword is "<headword>"', () => {
      expect(result.headword).toBe(row.headword.normalize('NFC'));
    });
    And('the lexicon lemmas are "<lemmas>"', () => {
      expect(result.lemmas).toEqual(row.lemmas.split(',').map((l) => l.normalize('NFC')));
    });
  });

  Scenario('No row of the seed yields an empty lemma', ({ Given, When, Then, And }) => {
    let results: NormalisedLemma[] = [];
    Given('the {int} words of the seed', (_, n: number) => {
      expect(SEED_WORDS).toHaveLength(n);
    });
    When('every one is normalised', () => {
      results = SEED_WORDS.map((w) => normaliseLemma(w.lemma));
    });
    Then('no headword is empty and no lexicon lemma list is empty', () => {
      for (const r of results) {
        expect(r.headword.trim()).not.toBe('');
        expect(r.lemmas.length).toBeGreaterThan(0);
        expect(r.lemmas.every((l) => l.trim() !== '')).toBe(true);
      }
    });
    And('the headwords are all different', () => {
      expect(new Set(results.map((r) => r.headword)).size).toBe(results.length);
    });
  });
});
