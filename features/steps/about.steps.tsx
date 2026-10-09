// features/steps/about.steps.tsx — runs features/about.feature: the About screen opened from Home.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
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
    And('it links to the licence {string} at {string}', (_, name: string, url: string) => {
      const link = within(credit('TBESG')).getByRole('link', { name });
      expect(link).toHaveAttribute('href', url);
    });
    And('it lists the changes made to the lexicon', () => {
      expect(credit('TBESG')).toHaveTextContent(/Changes: per Strong's number only the first entry is used/);
    });
    And('it says the Majority Standard Bible is public domain', () => {
      expect(credit('Majority Standard Bible')).toHaveTextContent('Public domain.');
    });
  });

  Scenario('About opens with Newton and credits by name', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Home', openHome);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('the screen is headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    And('it opens with {string}', (_, line: string) => {
      const quote = screen.getByRole('blockquote');
      expect(quote).toHaveTextContent(line);
      const first = document.querySelector('main')?.firstElementChild?.firstElementChild;
      expect(first).toContainElement(quote);
    });
    And('it attributes the line to {string}', (_, by: string) => {
      expect(screen.getByRole('blockquote')).toHaveTextContent(by);
    });
    And('every credit link is a name, never a web address', () => {
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(20);
      for (const link of links) expect(link.textContent).not.toMatch(/https?:\/\/|www\./);
    });
  });

  ScenarioOutline('About credits what the app runs on, with a licence link', ({ Given, When, Then }, row) => {
    Given('Lampas is opened on Home', openHome);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
      await screen.findByRole('heading', { name: 'About', level: 1 });
    });
    Then('it credits <name> with a link and its licence link', () => {
      const entry = screen
        .getAllByRole('listitem')
        .find((li) => within(li).queryAllByRole('link').some((a) => a.textContent === row.name));
      if (!entry) throw new Error(`no credit has a link named ${row.name}`);
      expect(within(entry).getAllByRole('link').length).toBeGreaterThanOrEqual(2);
      expect(entry).toHaveTextContent(/Licen[cs]e/);
      for (const link of within(entry).getAllByRole('link')) expect(link).toHaveAttribute('href', expect.stringMatching(/^https:/));
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
