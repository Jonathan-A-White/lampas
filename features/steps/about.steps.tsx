// features/steps/about.steps.tsx — runs features/about.feature: the About screen opened from Home.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openHome(): Promise<void> {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const credit = (name: string): HTMLElement => screen.getByText(new RegExp(name)).closest('li') as HTMLElement;

const feature = await loadFeature('features/about.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('About credits the lexicon and the Bible text', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Home', openHome);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('the screen is headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    And('it credits STEPBible and Tyndale House for the lexicon', () => {
      const lexicon = credit('TBESG');
      expect(lexicon).toHaveTextContent('STEPBible');
      expect(lexicon).toHaveTextContent('Tyndale House');
    });
    And('it links to the CC BY 4.0 licence at {string}', (_, url: string) => {
      const link = screen.getByRole('link', { name: url });
      expect(link).toHaveAttribute('href', url);
    });
    And('it lists the changes made to the lexicon', () => {
      expect(credit('TBESG')).toHaveTextContent(/Changes: per Strong's number only the first entry is used/);
    });
    And('it says the Majority Standard Bible is public domain', () => {
      expect(credit('Majority Standard Bible')).toHaveTextContent('Public domain.');
    });
  });

  Scenario('Back returns Home', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Home', openHome);
    And('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
      await screen.findByRole('heading', { name: 'About', level: 1 });
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('Home is shown again', async () => {
      expect(await screen.findByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      expect(screen.queryByRole('heading', { name: 'About', level: 1 })).toBeNull();
    });
  });
});
