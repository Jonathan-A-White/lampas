// features/steps/turn-pages.steps.tsx — runs features/turn-pages.feature: Settings > Reading, Scroll | Turn pages, and the Reader laid out in pages
// (src/reader/usePages.ts). jsdom has no layout: how the pages look and turn at 390x844 is tests/e2e/turn-pages.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { leaveSettings, openSettingsGroup } from '../../tests/support/settings-pages';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

async function openReader(): Promise<void> {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await screen.findByTestId('reader-chips');
  // the first open seeds the grammar levels: let it finish before the scenario ends and the database closes
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

async function open(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.talks.clear(), db.tips.clear()]);
  await openReader();
}

/** Closes the app and opens it again on the Reader: what a reload does (the settings store stays). */
async function reopen(): Promise<void> {
  cleanup();
  clearBus();
  window.location.hash = '';
  await openReader();
}

const reader = () => document.querySelector<HTMLElement>('[data-reader]');
const placeLine = () => document.querySelector<HTMLElement>('[data-place-line]');

async function openSettings(): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await openSettingsGroup(user, 'reading');
  return screen.findByRole('group', { name: 'Reading' });
}

const feature = await loadFeature('features/turn-pages.feature');

describeFeature(feature, ({ Scenario }) => {
  const paged = async () => {
    await waitFor(() => expect(reader()).toHaveAttribute('data-paging', 'pages'));
    expect(reader()?.querySelector('[data-pages]')).not.toBeNull();
  };

  Scenario('Settings > Reading offers Scroll and Turn pages, and Scroll is the default', ({ Given, When, Then }) => {
    let group: HTMLElement | undefined;
    Given('Lampas is opened on Romans 8 with nothing chosen', open);
    When('he opens Settings', async () => {
      group = await openSettings();
    });
    Then('the Reading row offers Scroll and Turn pages, with Scroll chosen', async () => {
      const g = group as HTMLElement;
      expect(within(g).getAllByRole('button').map((b) => b.textContent)).toEqual(['Scroll', 'Turn pages']);
      await waitFor(() => expect(within(g).getByRole('button', { name: 'Scroll' })).toHaveAttribute('aria-pressed', 'true'));
      expect(within(g).getByRole('button', { name: 'Turn pages' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('Choosing Turn pages lays the chapter out in pages, and it is kept', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with nothing chosen', open);
    When('he opens Settings and chooses Turn pages', async () => {
      const group = await openSettings();
      await user.click(within(group).getByRole('button', { name: 'Turn pages' }));
      await waitFor(async () => expect((await db.settings.get('readingMode'))?.value).toBe('pages'));
      await waitFor(() => expect(within(group).getByRole('button', { name: 'Turn pages' })).toHaveAttribute('aria-pressed', 'true'));
    });
    And('he goes back to the Reader', async () => {
      await leaveSettings(user);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    Then('the chapter is laid out in pages', paged);
    And('the place line under the text reads "Romans 8 · Page 1 of 1"', async () => {
      await waitFor(() => expect(placeLine()).toHaveTextContent(/^Romans 8 · Page 1 of 1$/));
    });
    When('Lampas is closed and opened again on Romans 8', reopen);
    Then('the chapter is still laid out in pages', paged);
  });

  Scenario('With Scroll the chapter scrolls and there is no page line', ({ Given, Then, And }) => {
    Given('Lampas is opened on Romans 8 with nothing chosen', open);
    Then('the chapter scrolls as one long text', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(reader()).toHaveAttribute('data-paging', 'scroll');
      expect(reader()?.querySelector('[data-pages]')).toBeNull();
    });
    And('there is no place line', () => {
      expect(placeLine()).toBeNull();
    });
  });
});
