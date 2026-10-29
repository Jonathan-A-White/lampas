// features/steps/offline-copy.steps.tsx — runs features/offline-copy.feature: Settings > Reading > Keep on this phone (none | nt | all), the row that starts the offline copy
// (src/data/offlineCopy.ts) and tells how it stands. The fetch is a fake that answers five chapters and holds the rest until the step lets them arrive; the data cache is a fake
// whose entries a step can read back, so "nothing was deleted" is checked on the cache itself.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { offlineRunning, offlineUrls, stopOfflineCopy } from '../../src/data/offlineCopy';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  stopOfflineCopy();
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();
const NAME = 'Keep on this phone';
/** the first chapters are 200 KB each (five make the 1 MB the row shows); the rest are small, so the whole run is quick on a loaded host */
const CHAPTER_BYTES = 200_000;
/** how many chapters the fake fetch answers at once; the rest wait for `arrive()` */
const ANSWERED = 5;

let fetched: string[] = [];
let held: Array<() => void> = [];
let arrivedAll = false;
let entries = new Set<string>();
let deleted: string[] = [];

/** The fake fetch: the first ANSWERED chapters of the copy at once, the others when `arrive()` is called; everything else the app asks for is answered as the other features do. */
function stubOfflineFetch(): void {
  // fetches the last scenario left waiting are let go, so its stopped run ends
  held.splice(0).forEach((release) => release());
  fetched = [];
  held = [];
  arrivedAll = false;
  stubChapterFetch();
  const app = globalThis.fetch;
  const copy = new Set(offlineUrls('all'));
  const answered = new Set(offlineUrls('nt').slice(0, ANSWERED));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!copy.has(url)) return app(input, init);
      fetched.push(url);
      if (!answered.has(url) && !arrivedAll) await new Promise<void>((release) => held.push(release));
      return new Response('x'.repeat(answered.has(url) ? CHAPTER_BYTES : 100), { status: 200 });
    }),
  );
}

/** A data cache: `match` answers an address in `entries`, `delete` is recorded. */
function stubDataCache(kept: string[] = []): void {
  entries = new Set(kept);
  deleted = [];
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (url: string) => (entries.has(url) ? new Response('kept') : undefined),
      delete: async (url: string) => void deleted.push(url),
    }),
  });
}

async function arrive(): Promise<void> {
  arrivedAll = true;
  await act(async () => held.splice(0).forEach((release) => release()));
}

async function showReading(): Promise<void> {
  window.history.replaceState(null, '', '/#/settings?group=reading');
  render(<App />);
  await screen.findByRole('group', { name: NAME });
}

async function openReading(options: { kept?: string[]; saved?: Record<string, string> } = {}): Promise<void> {
  stopOfflineCopy();
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear(), db.readingSets.clear()]);
  for (const [key, value] of Object.entries(options.saved ?? {})) await db.settings.put({ key, value });
  stubOfflineFetch();
  // the run the last scenario stopped has ended, so the row's own check can start
  await waitFor(() => expect(offlineRunning()).toBe(false));
  stubDataCache(options.kept);
  await showReading();
}

const rowEl = async (): Promise<HTMLElement> => {
  const row = (await screen.findByRole('group', { name: NAME })).closest<HTMLElement>('[data-setting]');
  if (!row) throw new Error('no row for Keep on this phone');
  return row;
};
const statusOf = async (): Promise<string> => (await rowEl()).querySelector('[data-offline-status]')?.textContent ?? '';
const labels = async (): Promise<string[]> => within(await screen.findByRole('group', { name: NAME })).getAllByRole('button').map((b) => b.textContent ?? '');
const chosen = async (): Promise<string[]> =>
  within(await screen.findByRole('group', { name: NAME }))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
const savedAs = (key: string, value: string) => waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));

const feature = await loadFeature('features/offline-copy.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const choose = async (_: unknown, choice: string, name: string) => {
    await user.click(within(await screen.findByRole('group', { name })).getByRole('button', { name: choice, exact: true }));
  };
  const reopen = async () => {
    stopOfflineCopy();
    cleanup();
    clearBus();
    forgetTrail();
    stubOfflineFetch();
    await waitFor(() => expect(offlineRunning()).toBe(false));
    await showReading();
  };
  const rowReads = (_: unknown, text: string) => waitFor(async () => expect(await statusOf()).toContain(text));
  const upToDate = () => waitFor(async () => expect(await statusOf()).toMatch(/Up to date · checked \S/));
  const noProgress = async () => {
    expect(await statusOf()).toBe('');
  };

  Scenario('Settings offers three choices with their sizes, Nothing extra to start', ({ Given, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    Then('Keep on this phone offers {string}, {string} and {string} with {string} chosen', async (_, a: string, b: string, c: string, current: string) => {
      expect(await labels()).toEqual([a, b, c]);
      expect(await chosen()).toEqual([current]);
    });
    And('the row says nothing about progress', noProgress);
  });

  Scenario('Choosing New Testament starts the run and the row shows progress', ({ Given, When, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses {string} in the group {string}', choose);
    Then('the row reads {string}', rowReads);
    And('the row says {string}', rowReads);
    And('the setting {string} is kept as {string}', (_, key: string, value: string) => savedAs(key, value));
  });

  Scenario('The row says Up to date with the time of the check when every chapter is kept', ({ Given, When, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses {string} in the group {string}', choose);
    And('the rest of the chapters arrive', arrive);
    Then('the row reads {string} and a time', upToDate);
    And('the row no longer says {string}', async (_, text: string) => {
      expect(await statusOf()).not.toContain(text);
    });
  });

  Scenario('The row says Paused: offline while the phone is offline and goes on when it is back', ({ Given, When, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses {string} in the group {string}', choose);
    And('the phone goes offline', async () => {
      await screen.findByText(/5 of 260 chapters/);
      await act(async () => void window.dispatchEvent(new Event('offline')));
    });
    Then('the row says {string}', rowReads);
    When('the phone is back online', async () => {
      await act(async () => void window.dispatchEvent(new Event('online')));
    });
    And('the rest of the chapters arrive', arrive);
    Then('the row reads {string} and a time', upToDate);
  });

  Scenario('Choosing Nothing extra stops the run and deletes nothing', ({ Given, When, Then, And }) => {
    Given('Settings is open at Reading with a chapter already kept', () => openReading({ kept: [offlineUrls('nt')[0]] }));
    When('he chooses {string} in the group {string}', choose);
    And('he chooses {string} in the group {string}', choose);
    Then('no more chapters are fetched', async () => {
      // Nothing extra is saved and the run stopped before the fetches held back are let go
      await savedAs('offlineCopy', 'none');
      await new Promise((resolve) => setTimeout(resolve, 20));
      await arrive();
      const count = fetched.length;
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(fetched.length).toBe(count);
      expect(count).toBeLessThan(offlineUrls('nt').length - 1);
    });
    And('the chapter already kept is still kept and nothing was deleted', () => {
      expect(entries.has(offlineUrls('nt')[0])).toBe(true);
      expect(deleted).toEqual([]);
    });
    And('the setting {string} is kept as {string}', (_, key: string, value: string) => savedAs(key, value));
    And('the row says nothing about progress', noProgress);
  });

  ScenarioOutline('The choice is there after a reload', ({ Given, When, Then }, row) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses <choice> in the group "Keep on this phone"', () => choose(null, row.choice, NAME));
    Then('the setting "offlineCopy" is kept as <kept>', () => savedAs('offlineCopy', row.kept));
    When('Settings is opened again at Reading', reopen);
    Then('Keep on this phone has <choice> chosen', async () => {
      expect(await chosen()).toEqual([row.choice]);
    });
  });

  Scenario('A phone that kept the New Testament checks it again when Settings opens', ({ Given, Then }) => {
    Given('Settings is open at Reading with the New Testament chosen and every chapter kept', () => openReading({ saved: { offlineCopy: 'nt' }, kept: offlineUrls('nt') }));
    Then('the row reads {string} and a time', upToDate);
  });
});
