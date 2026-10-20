// features/steps/clean-gloss.steps.tsx — runs features/clean-gloss.feature: πνεῦμα on Words and on its word sheet reads 'spirit, breath'
// (the Governor's screenshot of 2026-10-14, mw-5r3p30.384), a gloss kept before this version in the dictionary's form is cleaned when
// Lampas opens, and his example table's 'dat: in, by, with' is imported as 'in, by, with (dative)'. fetch is the committed public/data.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { addLemmaToLearn } from '../../src/data/answerWord';
import { loadChapter } from '../../src/data/chapter';
import { db, type Word } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { openSettingsGroup } from '../../tests/support/settings-pages';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

function startAt(hash: string): void {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  stubChapterFetch();
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
}

async function openWithNoWords(): Promise<void> {
  startAt('#/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  render(<App />);
}

/** The phone as version 21 of the store left it, with these words in it; then Lampas opens on it. */
async function keptBefore(words: Array<[lemma: string, gloss: string]>): Promise<void> {
  startAt('#/');
  db.close();
  await Dexie.delete('lampas');
  const old = new Dexie('lampas');
  old.version(21).stores({
    words: 'lemma, lesson, state, *lemmas',
    meta: 'key',
    settings: 'key',
    results: '++id, [lemma+when]',
    answers: '++id, [ref+when]',
    talks: '++id, [ref+when]',
    drills: '++id, lemma, [lemma+step]',
    readings: 'ref',
    grammarKnown: 'term',
    reviews: '[kind+id], due, kind',
    grammarLevels: 'id, level',
    usage: 'key, day, name',
    tips: 'id, status',
    talkPictures: '++id, turnId',
    shares: 'id, createdAt',
    requests: 'txid, sentAt, status',
    readingHistory: '++id, ref, [lang+at]',
    missTally: '[lang+unit], lang',
    ladder: 'lang',
    drillRuns: '++id, ideaId, at',
  });
  await old.open();
  await old.table<Word, string>('words').bulkPut(words.map(([lemma, gloss]): Word => ({ lemma, lemmas: [lemma], gloss, lesson: 1, state: 'solid', since: 1 })));
  old.close();
  await db.open();
  render(<App />);
}

async function openWords(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await openSettingsGroup(user, 'account');
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
}

async function openImport(): Promise<void> {
  await openWords();
  await user.click(screen.getAllByRole('button', { name: 'Import' })[0]);
  await screen.findByRole('heading', { name: 'Import' });
}

async function showsGloss(lemma: string, gloss: string): Promise<void> {
  await waitFor(() => expect(document.querySelector(`[data-lemma="${lemma}"]`)).not.toBeNull());
  const row = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`)!;
  // the gloss line itself, so a gloss that only begins with the words looked for does not pass
  expect([...row.querySelectorAll('span')].map((s) => s.textContent)).toContain(gloss);
}

const feature = await loadFeature('features/clean-gloss.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('πνεῦμα added to his words reads "spirit, breath" on Words', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with no words', openWithNoWords);
    And('{string} is added to his words from the lexicon', async (_, lemma: string) => {
      const chapter = await loadChapter('rom', 8);
      expect(await addLemmaToLearn({ title: 'Romans 8', chapter, verse: null }, lemma)).toMatchObject({ result: 'added' });
    });
    When('he opens Words', openWords);
    Then('Words shows {string} with the gloss {string}', async (_, lemma: string, gloss: string) => showsGloss(lemma, gloss));
  });

  Scenario('The word sheet of πνεῦμα reads "spirit, breath"', ({ Given, Then }) => {
    Given('Lampas is opened on the link {string}', async (_, hash: string) => {
      startAt(hash);
      await db.open();
      await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
      render(<App />);
    });
    Then('the word sheet shows {string} meaning {string}', async (_, lemma: string, gloss: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(sheet).getByTestId('sheet-word')).toHaveTextContent(lemma);
      expect(within(sheet).getByTestId('sheet-gloss').textContent).toBe(gloss);
    });
  });

  Scenario('A word kept before this version in the dictionary\'s form reads clean', ({ Given, When, Then, And }) => {
    Given('his phone kept {string} as {string} and {string} as {string} before this version', async (_, a: string, ga: string, b: string, gb: string) =>
      keptBefore([[a, ga], [b, gb]]),
    );
    When('he opens Words', openWords);
    Then('Words shows {string} with the gloss {string}', async (_, lemma: string, gloss: string) => showsGloss(lemma, gloss));
    And('Words also shows {string} with the gloss {string}', async (_, lemma: string, gloss: string) => showsGloss(lemma, gloss));
  });

  Scenario('A row of his example table with a case before the meanings is imported clean', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with no words', openWithNoWords);
    And('he opens Import', openImport);
    When('he pastes the line {string}', async (_, line: string) => {
      await user.click(screen.getByRole('textbox'));
      await user.paste(line);
      await waitFor(() => expect(screen.getByTestId('import-summary')).toHaveTextContent('1 word to add'));
    });
    And('he taps Add', async () => {
      await user.click(screen.getByRole('button', { name: /^Add / }));
      await screen.findByRole('heading', { name: 'Words' });
    });
    Then('Words shows {string} with the gloss {string}', async (_, lemma: string, gloss: string) => showsGloss(lemma, gloss));
  });
});
