// features/steps/reopen.steps.tsx — runs features/reopen.feature: the reader's state lives in the address, and an
// address that names a verse and a view opens the reader there.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { readerOf } from '../../src/nav/route';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const selectedVerses = () => [...document.querySelectorAll('[data-verse][data-selected="true"]')].map((el) => Number(el.getAttribute('data-verse')));
const view = () => document.querySelector('[data-reader]')?.getAttribute('data-view');

const feature = await loadFeature('features/reopen.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The reader writes the verse, view and weave he chose into the address', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8', () => openAt(''));
    When('he switches to Greek', () => user.click(screen.getByRole('button', { name: 'Greek' })));
    And('he selects verse 28', () => user.click(screen.getByRole('button', { name: 'Verse 28' })));
    Then('the address says Romans chapter 8, the Greek view, no weave and verse 28', async () => {
      await waitFor(() => expect(readerOf(window.location.hash)).toEqual({ book: 'rom', chapter: 8, view: 'greek', weave: 'off', verse: 28 }));
      expect(window.location.hash).toBe('#/?b=rom&c=8&view=greek&weave=off&v=28');
    });
    When('he taps verse 28 again', () => user.click(screen.getByRole('button', { name: 'Verse 28' })));
    Then('the address names no verse', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/?b=rom&c=8&view=greek&weave=off'));
    });
  });

  Scenario('An address that names a verse and a view opens the reader there', ({ Given, Then }) => {
    Given('Lampas is opened at the address {string}', (_, hash: string) => openAt(hash));
    Then('verse 28 is selected and the reader shows Greek', async () => {
      await waitFor(() => expect(view()).toBe('greek'));
      expect(selectedVerses()).toEqual([28]);
    });
  });

  Scenario('Back to an earlier place of the reader puts its verse back', ({ Given, When, Then }) => {
    Given('Lampas is opened at the address {string}', (_, hash: string) => openAt(hash));
    When('he goes to the Words screen and then back', async () => {
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
      await screen.findByRole('heading', { name: 'Words', level: 1 });
      window.history.back(); // Settings
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      window.history.back();
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    Then('verse 5 is selected and the reader shows English', async () => {
      await waitFor(() => expect(selectedVerses()).toEqual([5]));
      expect(view()).toBe('english');
    });
  });

  Scenario("Leaving the reader for another screen keeps that screen's address", ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8', () => openAt(''));
    When('he goes to the Words screen', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
    });
    Then('the address is {string}', (_, hash: string) => {
      expect(window.location.hash).toBe(hash);
    });
  });
});
