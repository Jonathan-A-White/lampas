// features/steps/pictures.steps.tsx — runs features/pictures.feature: the memory picture on a word's card in
// Words and beside the word in the Quick test, and nothing for a word that has none.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';

afterAll(() => {
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');

async function resetStores(): Promise<void> {
  cleanup();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(rom8)));
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  window.location.hash = '';
  localStorage.removeItem('lampas.round');
}

async function openLampasFresh(): Promise<void> {
  await resetStores();
  render(<App />);
}

/** The words store holds this one word, and the seed is marked as done so it is not added back. */
async function openLampasHolding(lemma: string): Promise<void> {
  await resetStores();
  await db.words.put({ lemma, lemmas: [lemma], gloss: 'a test gloss', lesson: 1, state: 'learning', since: Date.now() });
  await db.meta.put({ key: 'wordsSeeded', value: '1' });
  render(<App newRandom={() => mulberry32(7)} />);
}

async function openWords(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
  await waitFor(() => expect(document.querySelectorAll('[data-lemma]').length).toBeGreaterThan(0));
}

async function openQuickTest(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await user.click(await screen.findByRole('button', { name: 'Test' }));
  await screen.findByRole('heading', { name: 'Quick test' });
  await screen.findByTestId('prompt');
}

const card = (lemma: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`);
  if (!el) throw new Error(`no card for ${lemma}`);
  return el;
};

const feature = await loadFeature('features/pictures.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A word with a picture shows it on its Words card', ({ Given, When, Then, And }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens Words', openWords);
    Then('the card for "ἀγαπάω" shows a picture', () => {
      const img = card('ἀγαπάω').querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('/pictures/agapao.svg');
    });
    And('that picture has no alt text, the gloss being on the card already', () => {
      expect(card('ἀγαπάω').querySelector('img')?.getAttribute('alt')).toBe('');
      expect(card('ἀγαπάω')).toHaveTextContent('to love, cherish');
    });
  });

  Scenario('A word with no picture shows none on its Words card', ({ Given, When, Then, And }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens Words', openWords);
    Then('the card for "γάρ" shows no picture', () => {
      expect(card('γάρ').querySelector('img')).toBeNull();
    });
    And('the card for "γάρ" still shows its gloss and state', () => {
      expect(card('γάρ')).toHaveTextContent('for, since');
      expect(card('γάρ').getAttribute('data-state')).toBe('solid');
    });
  });

  Scenario('A word with a picture shows it in the quick test', ({ Given, When, Then }) => {
    Given('Lampas holds only the word "ἀγαπάω"', () => openLampasHolding('ἀγαπάω'));
    When('he opens the Quick test', openQuickTest);
    Then('the question shows a picture beside the word', () => {
      const img = screen.getByTestId('picture');
      expect(img.getAttribute('src')).toBe('/pictures/agapao.svg');
      expect(img.getAttribute('alt')).toBe('');
      expect(screen.getByTestId('prompt')).toBeInTheDocument();
    });
  });

  Scenario('A word with no picture shows none in the quick test', ({ Given, When, Then, And }) => {
    Given('Lampas holds only the word "ἀνάστασις"', () => openLampasHolding('ἀνάστασις'));
    When('he opens the Quick test', openQuickTest);
    Then('the question shows no picture', () => {
      expect(screen.queryByTestId('picture')).toBeNull();
    });
    And('he can still answer the question', async () => {
      const options = [...document.querySelectorAll<HTMLElement>('[data-option]')];
      expect(options).toHaveLength(4);
      await user.click(options[0]);
      await screen.findByTestId('next');
    });
  });
});
