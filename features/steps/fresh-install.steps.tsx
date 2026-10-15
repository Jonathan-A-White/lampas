// features/steps/fresh-install.steps.tsx — runs features/fresh-install.feature (mw-5r3p30.385): a new install starts with none of
// the Governor's progress, and a phone that already has data keeps every row of it.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { listLevels, setLevel } from '../../src/data/repositories/grammarLevels';
import { seedLevelsIfFirstOpen } from '../../src/data/repositories/grammarLevels';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { setTermKnown } from '../../src/data/repositories/grammar';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  db.close();
});

const user = userEvent.setup();

const TABLES = ['words', 'reviews', 'grammarLevels', 'grammarKnown', 'meta', 'settings'] as const;

async function wipe(): Promise<void> {
  cleanup();
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
  window.localStorage.clear();
  // the welcome of a new licensed reader is not what this file is about (mw-yrmkdf.3)
  window.localStorage.setItem('lampas.welcome', 'done');
  window.location.hash = '';
}

/** Every row of the tables a first open may touch, sorted so two snapshots compare. */
async function snapshot(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const name of TABLES) out[name] = JSON.stringify(await db.table(name).toArray());
  return out;
}

let before: Record<string, string> = {};

/** Lets the first-open seeding chain run to its end: it is a few small transactions, started by App's first effect. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function openFresh(): Promise<void> {
  await wipe();
  render(<App />);
  await screen.findByRole('button', { name: 'Settings' });
  await settle();
}

async function openWords(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
  await screen.findByTestId('word-counts');
}

const feature = await loadFeature('features/fresh-install.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A new install has no words, no schedule and no grammar levels', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with nothing on it', openFresh);
    When('he opens Words', openWords);
    Then('the count line reads {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('word-counts')).toHaveTextContent(text));
    });
    And('no word is listed', async () => {
      expect(document.querySelectorAll('[data-lemma]')).toHaveLength(0);
      expect(await db.words.count()).toBe(0);
    });
    And('nothing is scheduled for review', async () => {
      expect(await db.reviews.count()).toBe(0);
    });
    And('no grammar idea has a level', async () => {
      expect(await db.grammarLevels.count()).toBe(0);
      expect((await listLevels()).size).toBe(0);
    });
  });

  Scenario('Words on a new install says so and points to Placement and Import', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with nothing on it', openFresh);
    When('he opens Words', openWords);
    Then('Words says he has no words yet', async () => {
      expect(await screen.findByTestId('words-empty')).toHaveTextContent('No words yet');
    });
    And('Words offers Placement and Import', async () => {
      const empty = screen.getByTestId('words-empty');
      expect(within(empty).getByRole('button', { name: 'Placement' })).toBeInTheDocument();
      await user.click(within(empty).getByRole('button', { name: 'Import' }));
      await screen.findByRole('heading', { name: 'Import' });
    });
  });

  Scenario('Review on a new install has nothing due', ({ Given, When, Then }) => {
    Given('Lampas is opened on a phone with nothing on it', openFresh);
    When('he opens Review', async () => {
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Review' }));
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    Then('Review says nothing is due', async () => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent('Due today: 0 words'));
      expect(await db.reviews.count()).toBe(0);
    });
  });

  Scenario('A phone that was seeded the old way keeps every row', ({ Given, When, Then }) => {
    Given('a phone seeded the old way, with a word he dropped and an idea he marked', async () => {
      await wipe();
      const t0 = Date.UTC(2026, 8, 1);
      await seedHisWords(t0);
      await seedScheduleIfFirstOpen(t0);
      await setTermKnown('genitive', true, t0);
      await seedLevelsIfFirstOpen(t0);
      await db.words.update('ἀγαθός', { state: 'dropped', since: t0 + 1 });
      await setLevel('case-dative', 'frontier', 'placement', t0 + 2);
      await db.settings.put({ key: 'readerView', value: 'greek' });
      expect(await db.words.count()).toBe(63);
      expect(await db.reviews.count()).toBeGreaterThan(0);
      expect(await db.grammarLevels.count()).toBeGreaterThan(0);
      before = await snapshot();
    });
    When('Lampas is opened', async () => {
      render(<App />);
      await screen.findByRole('button', { name: 'Settings' });
      await settle();
    });
    Then('every row of the words, the schedule, the grammar levels, the settings and the flags is as it was', async () => {
      expect(await snapshot()).toEqual(before);
    });
  });

  Scenario('A phone with only one word of its own gets no seed on top', ({ Given, When, Then }) => {
    Given('a phone with one word of his own and no flags', async () => {
      await wipe();
      await db.words.put({ lemma: 'ἀγαπάω', lemmas: ['ἀγαπάω'], gloss: 'I love', lesson: 3, state: 'learning', since: 5 });
      before = await snapshot();
    });
    When('Lampas is opened', async () => {
      render(<App />);
      await screen.findByRole('button', { name: 'Settings' });
      await settle();
    });
    Then('every word, review and level row is as it was', async () => {
      const after = await snapshot();
      expect({ ...after, meta: '' }).toEqual({ ...before, meta: '' });
    });
  });
});
