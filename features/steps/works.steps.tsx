// features/steps/works.steps.tsx — runs features/works.feature: Settings > Study resources > Works, the switches for the commentaries and books of his Logos
// library (src/resources/works.ts), kept in the settings store as he taps.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { getWorks } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openApp(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

async function openSettings(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}

const feature = await loadFeature('features/works.feature');

describeFeature(feature, ({ Scenario }) => {
  const listedAs = (checked: boolean) => async (_: unknown, title: string, author: string) => {
    const list = await screen.findByRole('list', { name: 'Works in your Logos library' });
    const item = within(list).getByRole('switch', { name: title }).closest('li') as HTMLElement;
    expect(item).toHaveTextContent(title);
    expect(item).toHaveTextContent(`by ${author}`);
    expect(within(item).getByRole('switch', { name: title })).toHaveAttribute('aria-checked', String(checked));
  };

  const listedOff = listedAs(false);
  const listedOn = listedAs(true);

  const noWorks = async () => {
    localStorage.clear();
    await db.open();
    await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
    await seedHisWords();
    await openApp();
  };

  Scenario('Works lists each work by its full title and author, all off', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with no works switched on', noWorks);
    When('he opens Settings', openSettings);
    Then('Settings lists the work {string} by {string}, off', listedOff);
    And('Settings also lists the work {string} by {string}, off', listedOff);
    And('Settings lists as well the work {string} by {string}, off', listedOff);
  });

  Scenario('A work he switches on is kept across a reload', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with no works switched on', noWorks);
    When('he opens Settings', openSettings);
    And('he switches on the work {string}', async (_, title: string) => {
      const box = await screen.findByRole('switch', { name: title });
      await user.click(box);
      await waitFor(() => expect(box).toHaveAttribute('aria-checked', 'true'));
    });
    Then('the works kept are {string}', async (_, ids: string) => {
      await waitFor(async () => expect((await getWorks()).join(',')).toBe(ids));
    });
    When('Lampas is opened again and he opens Settings', async () => {
      await openApp();
      await openSettings();
    });
    Then('Settings lists the work {string} by {string}, on', listedOn);
    And('Settings also lists the work {string} by {string}, off', listedOff);
  });
});
