// features/steps/variants-reader.steps.tsx — runs features/variants-reader.feature: the Reader's variants (mw-9ji6ek0.5), the braces after the marked words and the header's
// chip that turns them on and off (a tap) and opens the filter sheet (a long press). fetch is stubbed with the committed public/data/rev/3.json and gen/1.json; the
// counts expected are read from the chapter file's own changesEnglish and witness, not from the Reader's filter.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const REV3 = JSON.parse(readFileSync('public/data/rev/3.json', 'utf8')) as Chapter;
const UNITS = REV3.variants ?? [];
const CHANGING = UNITS.filter((u) => u.changesEnglish).length;
const BYZ = UNITS.filter((u) => u.witness === 'byz').length;
const BYZ_NA = UNITS.filter((u) => u.witness !== 'ecm').length;

const user = userEvent.setup();

const PLACES = { 'Revelation 3': '#/?b=rev&c=3', 'Genesis 1': '#/?b=gen&c=1' } as const;

async function open(place: keyof typeof PLACES, saved: Record<string, string> = {}): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.words.clear()]);
  for (const [key, value] of Object.entries(saved)) await db.settings.put({ key, value });
  window.history.replaceState(null, '', `/${PLACES[place]}`);
  stubChapterFetch();
  render(<App />);
  await screen.findByRole('heading', { name: place, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const chip = (): HTMLElement => screen.getByRole('button', { name: /^Variants,/ });
const chipCount = (): number => Number((chip().textContent ?? '').replace(/\D+/g, ''));
const braces = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-brace]')];
const savedAs = (value: string) => waitFor(async () => expect((await db.settings.get('variants'))?.value).toBe(value));
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Variants' });

async function longPress(target: HTMLElement): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target });
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
  await user.pointer({ keys: '[/MouseLeft]', target });
}

const feature = await loadFeature('features/variants-reader.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With Variants Off the chip is dim and no brace is drawn', ({ Given, Then, And }) => {
    Given('Lampas is opened on Revelation 3 with nothing saved', () => open('Revelation 3'));
    Then('the header has the variants chip, not pressed', async () => {
      await waitFor(() => expect(chip()).toHaveAttribute('aria-pressed', 'false'));
      expect(chip().textContent).toMatch(/^⁑\s*\d+$/);
    });
    And('it counts the units that change the English', () => {
      expect(chipCount()).toBe(CHANGING);
    });
    And('no brace is drawn', () => {
      expect(braces()).toHaveLength(0);
      expect(document.querySelectorAll('[data-variant]')).toHaveLength(0);
    });
  });

  Scenario('A tap on the chip turns Variants on to Those that change the English, and braces follow the units', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Revelation 3 with nothing saved', () => open('Revelation 3'));
    When('he taps the variants chip', async () => {
      await user.click(await screen.findByRole('button', { name: /^Variants,/ }));
    });
    Then('Variants is saved as {string}', (_, value: string) => savedAs(value));
    And('the variants chip is pressed', async () => {
      await waitFor(() => expect(chip()).toHaveAttribute('aria-pressed', 'true'));
    });
    And('a brace is drawn after each unit that changes the English, as many as the chip counts', async () => {
      await waitFor(() => expect(braces()).toHaveLength(CHANGING));
      expect(chipCount()).toBe(CHANGING);
      // each brace follows a marked word of its verse
      for (const brace of braces()) expect(brace.closest('[data-verse]')?.querySelector('[data-variant]')).not.toBeNull();
    });
    And('the brace of verse 2 holds {string} with the chip {string}', (_, reading: string, witness: string) => {
      const brace = document.querySelector('[data-verse="2"] [data-brace]');
      const first = brace?.querySelector('[data-brace-reading]');
      expect(first?.querySelector('[data-brace-text]')?.textContent).toBe(reading);
      expect([...(first?.querySelectorAll('[data-witness]') ?? [])].map((c) => c.textContent)).toEqual([witness]);
    });
  });

  Scenario('A second tap turns Variants off and a third puts back the value it had', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Revelation 3 with Variants {string}', (_, value: string) => open('Revelation 3', { variants: value }));
    When('he taps the variants chip', async () => {
      await user.click(await screen.findByRole('button', { name: /^Variants,/ }));
    });
    Then('Variants is saved as {string}', (_, value: string) => savedAs(value));
    And('no brace is drawn', async () => {
      await waitFor(() => expect(braces()).toHaveLength(0));
    });
    When('he taps the variants chip again', async () => {
      await user.click(chip());
    });
    Then('Variants is saved again as {string}', (_, value: string) => savedAs(value));
    And('a brace is drawn for every unit of the chapter', async () => {
      await waitFor(() => expect(braces()).toHaveLength(UNITS.length));
      expect(chipCount()).toBe(UNITS.length);
    });
  });

  Scenario('A long press opens the filter sheet; Byzantine splits only leaves the Byzantine units', ({ Given, When, Then }) => {
    Given('Lampas is opened on Revelation 3 with Variants {string}', (_, value: string) => open('Revelation 3', { variants: value }));
    When('he long presses the variants chip', async () => {
      await longPress(await screen.findByRole('button', { name: /^Variants,/ }));
    });
    Then(
      'a sheet {string} offers {string} and {string}, and {string}, {string} and {string}',
      async (_, name: string, english: string, all: string, byz: string, na: string, ecm: string) => {
        const dialog = await screen.findByRole('dialog', { name });
        expect(within(within(dialog).getByRole('group', { name: 'Variants' })).getAllByRole('button').map((b) => b.textContent)).toEqual([english, all]);
        expect(within(within(dialog).getByRole('group', { name: 'Witnesses' })).getAllByRole('button').map((b) => b.textContent)).toEqual([byz, na, ecm]);
        expect(within(dialog).getByRole('button', { name: all })).toHaveAttribute('aria-pressed', 'true');
      },
    );
    When('he chooses {string} in the sheet', async (_, name: string) => {
      await user.click(within(sheet()).getByRole('button', { name }));
    });
    Then('the chip counts the Byzantine units, and as many braces are drawn, each with the chip {string} alone', async (_, witness: string) => {
      await waitFor(() => expect(chipCount()).toBe(BYZ));
      expect(braces()).toHaveLength(BYZ);
      for (const brace of braces()) expect(new Set([...brace.querySelectorAll('[data-witness]')].map((c) => c.textContent))).toEqual(new Set([witness]));
    });
    When('he then chooses {string} in the sheet', async (_, name: string) => {
      await user.click(within(sheet()).getByRole('button', { name }));
    });
    Then('the chip counts the Byzantine and Nestle-Aland units', async () => {
      await waitFor(() => expect(chipCount()).toBe(BYZ_NA));
      expect(braces()).toHaveLength(BYZ_NA);
    });
  });

  Scenario("The sheet's link opens Settings at Variants", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Revelation 3 with Variants {string}', (_, value: string) => open('Revelation 3', { variants: value }));
    When('he long presses the variants chip', async () => {
      await longPress(await screen.findByRole('button', { name: /^Variants,/ }));
    });
    And('he taps {string} in the sheet', async (_, name: string) => {
      await user.click(within(await screen.findByRole('dialog', { name: 'Variants' })).getByRole('button', { name }));
    });
    Then('Settings opens at the Variants row', async () => {
      // the page of the group the row is in, Reading
      await screen.findByRole('heading', { name: 'Reading', level: 1 });
      await waitFor(() => expect(document.querySelector('[data-setting="variants"]')).toHaveAttribute('data-highlighted', ''));
      expect(window.location.hash).toBe('#/settings?setting=variants');
    });
  });

  Scenario('A chapter with no variants has no chip', ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with Variants {string}', (_, value: string) => open('Genesis 1', { variants: value }));
    Then('the header has no variants chip', async () => {
      // the settings the chip waits for are read by then: Variants all draws its chip at once on a chapter that has units
      await waitFor(async () => expect((await db.settings.get('variants'))?.value).toBe('all'));
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.queryByRole('button', { name: /^Variants,/ })).toBeNull();
    });
  });

  Scenario("Weave's long press still flips the word order beside the chip", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Revelation 3 with Variants {string} and the Weave on', (_, value: string) => open('Revelation 3', { variants: value, weave: 'solid' }));
    When('he long presses {string} in the language switch', async (_, name: string) => {
      await longPress(within(await screen.findByRole('group', { name: 'Language' })).getByRole('button', { name, exact: true }));
    });
    Then('a toast says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.getAllByRole('status').some((e) => e.textContent === words)).toBe(true));
      await waitFor(async () => expect((await db.settings.get('weaveOrder'))?.value).toBe('greek'));
    });
    And('the variants chip is pressed', () => {
      expect(chip()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('dialog', { name: 'Variants' })).toBeNull();
    });
  });

  Scenario('The Immersive reader shows no braces and no chip', ({ Given, Then, And }) => {
    Given('Lampas is opened on Revelation 3 with Variants {string} and the Immersive reader on', (_, value: string) => open('Revelation 3', { variants: value, immersiveReader: 'on' }));
    Then('no brace is drawn', async () => {
      await screen.findByRole('group', { name: 'Language' });
      expect(braces()).toHaveLength(0);
      expect(document.querySelectorAll('[data-variant]')).toHaveLength(0);
    });
    And('the header has no variants chip', () => {
      expect(screen.queryByRole('button', { name: /^Variants,/ })).toBeNull();
    });
  });
});
