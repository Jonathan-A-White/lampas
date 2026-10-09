// features/steps/preface.steps.tsx — runs features/preface.feature: the Preface page, reached from the chapter picker and from About.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { PREFACE_LINKS } from '../../src/preface';
import { screenContextNow } from '../../src/tutor/screenContext';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openFresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openPreface(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', '/#/preface');
  render(<App />);
  await screen.findByRole('heading', { name: 'Preface', level: 1 });
}

async function back(): Promise<void> {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

const picker = () => screen.queryByRole('dialog', { name: 'Choose a chapter' });

async function openPicker(): Promise<void> {
  await user.click(within(screen.getByRole('heading', { level: 1 })).getByRole('button'));
  await screen.findByRole('dialog', { name: 'Choose a chapter' });
}

const pageLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('main a')];

const feature = await loadFeature('features/preface.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The chapter picker opens the Preface from above Matthew', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    When('he taps the title', openPicker);
    Then('the picker shows {string} above {string}', (_, first: string, second: string) => {
      const dialog = within(picker() as HTMLElement);
      const a = dialog.getByRole('button', { name: first });
      const b = dialog.getByRole('button', { name: second });
      expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    When('he taps {string} in the picker', async (_, label: string) => {
      await user.click(within(picker() as HTMLElement).getByRole('button', { name: label }));
    });
    Then('the screen is headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    And('the address is {string}', (_, hash: string) => {
      expect(window.location.hash).toBe(hash);
    });
    And('the picker is closed', () => {
      expect(picker()).toBeNull();
    });
  });

  Scenario('About links to the Preface and Back returns', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
      await screen.findByRole('heading', { name: 'About', level: 1 });
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('the screen is headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
    When('he goes back', back);
    Then('he is back on the screen headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
  });

  Scenario('The Preface names its sources and links to them', ({ Given, Then, And }) => {
    Given('Lampas is opened on the Preface', openPreface);
    Then('the page names {string} and {string}', (_, a: string, b: string) => {
      const text = document.querySelector('main')?.textContent ?? '';
      expect(text).toContain(a);
      expect(text).toContain(b);
    });
    And('it links to the Robinson essay {string} at {string}', (_, name: string, url: string) => {
      const link = screen.getByRole('link', { name: new RegExp(name) });
      expect(link).toHaveAttribute('href', url);
    });
    And('it links to the Majority Standard Bible at {string}', (_, url: string) => {
      expect(pageLinks().map((a) => a.getAttribute('href'))).toContain(url);
    });
    And('every link opens in a new tab with rel {string}', (_, rel: string) => {
      expect(pageLinks().length).toBeGreaterThanOrEqual(2);
      for (const a of pageLinks()) {
        expect(a).toHaveAttribute('target', '_blank');
        expect(a.getAttribute('rel')?.split(' ')).toContain(rel);
      }
    });
    And('every address on the page is one of the listed sources', () => {
      const listed = PREFACE_LINKS.map((l) => l.url).sort();
      expect(pageLinks().map((a) => a.getAttribute('href')).sort()).toEqual(listed);
      for (const url of listed) expect(url).toMatch(/^https?:\/\/[^\s]+$/);
    });
    And("the tutor is told the page's facts", () => {
      const context = screenContextNow();
      expect(context?.name).toBe('Preface');
      expect(context?.facts.length).toBeGreaterThan(0);
    });
  });

  Scenario('Back from the Preface returns to the Reader', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    And('he opens the Preface from the picker', async () => {
      await openPicker();
      await user.click(within(picker() as HTMLElement).getByRole('button', { name: 'Preface' }));
      await screen.findByRole('heading', { name: 'Preface', level: 1 });
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
  });
});
