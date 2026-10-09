// features/steps/old-testament.steps.tsx — runs features/old-testament.feature: the chapter picker also lists the Old Testament, whose
// chapters open in Logos (the app's own scheme, ref.ly only when the page stays in front), and Settings > Bible in Logos picks the Bible.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

let timers: (() => void)[] = [];
let opened: string[] = [];
let asked: string[] = [];

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const waitForReader = async (): Promise<void> => {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
};

async function openWith(settings: Record<string, string>): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  timers = [];
  opened = [];
  asked = [];
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = () => () => {};
  browserEnv.open = (url) => void opened.push(url);
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  render(<App />);
  await waitForReader();
}

const openSettings = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
};

const reopenAtSettings = async (): Promise<void> => {
  cleanup();
  clearBus();
  render(<App />);
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
};

const openPicker = async (): Promise<void> => {
  await user.click(within(screen.getByRole('heading', { level: 1 })).getByRole('button'));
  await screen.findByRole('dialog', { name: 'Choose a chapter' });
};
const picker = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose a chapter' });
const chooseBook = async (name: string): Promise<void> => {
  await user.click(within(picker()).getByRole('button', { name: new RegExp(`^${name}`) }));
};
const chapters = (): number[] => [...picker().querySelectorAll('[data-chapter]')].map((el) => Number(el.getAttribute('data-chapter')));
const group = (): HTMLElement => screen.getByRole('group', { name: 'Bible in Logos' });
const resourceId = (): HTMLInputElement => within(group()).getByRole('textbox', { name: 'Resource ID' });

const feature = await loadFeature('features/old-testament.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The picker lists the Old Testament before Matthew, each book marked as opening in Logos', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When('he taps the title', openPicker);
    Then('the picker lists the 39 Old Testament books from {string} to {string} in order, before {string}', (_, first: string, last: string, nt: string) => {
      const rows = [...picker().querySelectorAll('[data-ot-book], [data-book]')];
      const ot = rows.slice(0, 39);
      expect(ot.every((r) => r.hasAttribute('data-ot-book'))).toBe(true);
      expect(ot.map((r) => r.querySelector('[data-book-name]')?.textContent)).toHaveLength(39);
      expect(ot[0].querySelector('[data-book-name]')?.textContent).toBe(first);
      expect(ot[38].querySelector('[data-book-name]')?.textContent).toBe(last);
      expect(rows[39].textContent).toContain(nt);
      expect(rows).toHaveLength(66);
    });
    And('every Old Testament book is marked as opening in Logos', () => {
      const rows = [...picker().querySelectorAll('[data-ot-book]')];
      expect(rows).toHaveLength(39);
      for (const row of rows) expect(row.querySelector('[data-in-logos]')?.textContent).toMatch(/Logos/);
    });
    And('no New Testament book is marked as opening in Logos', () => {
      const rows = [...picker().querySelectorAll('[data-book]')];
      expect(rows).toHaveLength(27);
      for (const row of rows) expect(row.querySelector('[data-in-logos]')).toBeNull();
    });
  });

  Scenario('Genesis 1 opens in Logos in his default Bible and Lampas stays on Romans 8', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    Then('the picker lists chapters {int} to {int}', async (_, from: number, to: number) => {
      await waitFor(() => expect(chapters()).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i)));
    });
    When('he picks chapter {int}', async (_, n: number) => {
      const link = within(picker()).getByRole('link', { name: `Chapter ${n}` });
      asked.push(link.getAttribute('href') ?? '');
      await user.click(link);
    });
    Then('Logos is asked for {string}', (_, url: string) => {
      expect(asked).toEqual([url]);
    });
    And('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
    And('the address names no other book', () => {
      expect(window.location.hash).not.toMatch(/b=gen/);
      expect(localStorage.getItem('lampas.chapter') ?? '').not.toMatch(/gen/);
    });
  });

  Scenario('The https address is the fallback only when the phone cannot open the app', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he picks chapter {int}', async (_, n: number) => {
      await user.click(await within(picker()).findByRole('link', { name: `Chapter ${n}` }));
    });
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('the address {string} was opened', (_, url: string) => {
      expect(opened).toEqual([url]);
    });
  });

  Scenario('The Bible he chose in Settings is the one that opens', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on and the Bible in Logos {string}', (_, id: string) =>
      openWith({ 'resource.logos': 'on', logosBible: id }),
    );
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he picks chapter {int}', async (_, n: number) => {
      const link = await within(picker()).findByRole('link', { name: `Chapter ${n}` });
      asked.push(link.getAttribute('href') ?? '');
      await user.click(link);
    });
    Then('Logos is asked for {string}', (_, url: string) => {
      expect(asked).toEqual([url]);
    });
  });

  Scenario('With Logos off the books still show, and picking one says so and turns Logos on in one tap', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos off', () => openWith({}));
    When('he taps the title', openPicker);
    Then('the picker lists the 39 Old Testament books from {string} to {string} in order, before {string}', (_, first: string, last: string) => {
      const rows = [...picker().querySelectorAll('[data-ot-book]')];
      expect(rows).toHaveLength(39);
      expect(rows[0].querySelector('[data-book-name]')?.textContent).toBe(first);
      expect(rows[38].querySelector('[data-book-name]')?.textContent).toBe(last);
    });
    When('he chooses the book {string}', (_, name: string) => chooseBook(name));
    Then('the picker says {string}', async (_, text: string) => {
      expect(await within(picker()).findByRole('status')).toHaveTextContent(text);
    });
    And('no chapter is offered', () => {
      expect(chapters()).toEqual([]);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(picker()).getByRole('button', { name }));
    });
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
    And('the picker lists chapters {int} to {int}', async (_, from: number, to: number) => {
      await waitFor(() => expect(chapters()).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i)));
    });
    And('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });

  Scenario('Settings has Bible in Logos, the Legacy Standard Bible to start', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When("he taps the gear in the reader's header", openSettings);
    Then('Bible in Logos shows {string}', async (_, name: string) => {
      const select = await within(await screen.findByRole('group', { name: 'Bible in Logos' })).findByRole('combobox', { name: 'Bible' });
      expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe(name);
    });
    And('the Resource ID field holds {string}', (_, id: string) => {
      expect(resourceId().value).toBe(id);
    });
  });

  Scenario('A Bible picked from the short list is kept across a close', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When("he taps the gear in the reader's header", openSettings);
    And('he picks the Bible {string} for Logos', async (_, name: string) => {
      await user.selectOptions(await within(await screen.findByRole('group', { name: 'Bible in Logos' })).findByRole('combobox', { name: 'Bible' }), name);
    });
    And('the app is closed and opened again at the Settings address', async () => {
      await waitFor(async () => expect((await db.settings.get('logosBible'))?.value).toBe('LLS:1.0.710'));
      await reopenAtSettings();
    });
    Then('Bible in Logos shows {string}', async (_, name: string) => {
      const select = await within(await screen.findByRole('group', { name: 'Bible in Logos' })).findByRole('combobox', { name: 'Bible' });
      expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe(name);
    });
  });

  Scenario('A typed Resource ID is kept across a close, and a malformed one is not', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openWith({ 'resource.logos': 'on' }));
    When("he taps the gear in the reader's header", openSettings);
    And('he types the Resource ID {string}', async (_, id: string) => {
      await screen.findByRole('group', { name: 'Bible in Logos' });
      await user.clear(resourceId());
      await user.type(resourceId(), id);
    });
    Then('the Resource ID field says {string}', (_, text: string) => {
      expect(group()).toHaveTextContent(text);
    });
    And('the setting {string} holds nothing', async (_, key: string) => {
      expect((await db.settings.get(key))?.value).toBeUndefined();
    });
    When('he types the Resource ID {string}', async (_, id: string) => {
      await user.clear(resourceId());
      await user.type(resourceId(), id);
    });
    And('the app is closed and opened again at the Settings address', async () => {
      await waitFor(async () => expect((await db.settings.get('logosBible'))?.value).toBe('LLS:1.0.91'));
      await reopenAtSettings();
    });
    Then('Bible in Logos shows {string}', async (_, name: string) => {
      const select = await within(await screen.findByRole('group', { name: 'Bible in Logos' })).findByRole('combobox', { name: 'Bible' });
      expect((select as HTMLSelectElement).selectedOptions[0].textContent).toBe(name);
    });
    And('the Resource ID field holds {string}', async (_, id: string) => {
      await waitFor(() => expect(resourceId().value).toBe(id));
    });
  });
});
