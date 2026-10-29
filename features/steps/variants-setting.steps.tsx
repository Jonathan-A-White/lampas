// features/steps/variants-setting.steps.tsx — runs features/variants-setting.feature: Settings > Reading > Variants (off | english | all) and its Witnesses row
// (byz | na | ecm, drawn only while Variants is not Off), each kept across a reload (src/settings/definitions/variants.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();

async function openReading(saved: Record<string, string> = {}): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  for (const [key, value] of Object.entries(saved)) await db.settings.put({ key, value });
  await showReading();
}

async function showReading(): Promise<void> {
  window.history.replaceState(null, '', '/#/settings?group=reading');
  stubChapterFetch();
  render(<App />);
  await screen.findByRole('group', { name: 'Variants' });
}

const rowOf = (name: string) => screen.findByRole('group', { name });
const labelsOf = async (name: string): Promise<string[]> => within(await rowOf(name)).getAllByRole('button').map((b) => b.textContent ?? '');
const chosenIn = async (name: string): Promise<string[]> =>
  (await labelsOf(name)).filter((_, i) => within(screen.getByRole('group', { name })).getAllByRole('button')[i].getAttribute('aria-pressed') === 'true');
/** Opens the More help of the row named `name` and gives the help it shows. */
const helpOf = async (name: string): Promise<string> => {
  const row = (await rowOf(name)).closest<HTMLElement>('[data-setting]');
  if (!row) throw new Error(`no row for ${name}`);
  await user.click(within(row).getByRole('button', { name: 'More help' }));
  return row.querySelector('[data-help-text]')?.textContent ?? '';
};
const savedAs = async (key: string, value: string) => waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));

const feature = await loadFeature('features/variants-setting.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const choose = async (_: unknown, choice: string, name: string) => {
    await user.click(within(await rowOf(name)).getByRole('button', { name: choice, exact: true }));
  };
  const reopen = async () => {
    cleanup();
    clearBus();
    forgetTrail();
    await showReading();
  };

  Scenario('Settings shows Variants Off with its help line and no Witnesses row', ({ Given, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    Then('Variants offers {string}, {string} and {string} with {string} chosen', async (_, a: string, b: string, c: string, chosen: string) => {
      expect(await labelsOf('Variants')).toEqual([a, b, c]);
      expect(await chosenIn('Variants')).toEqual([chosen]);
    });
    And('Variants has its help line', async () => {
      const text = await helpOf('Variants');
      expect(text).toContain('Those that change the English keeps readings that change it');
    });
    And('there is no Witnesses row', () => {
      expect(screen.queryByRole('group', { name: 'Witnesses' })).toBeNull();
    });
  });

  ScenarioOutline('Each Variants choice survives a reload', ({ Given, When, Then }, row) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses <choice> in the group "Variants"', () => choose(null, row.choice, 'Variants'));
    Then('the setting "variants" is kept as <kept>', () => savedAs('variants', row.kept));
    When('Settings is opened again at Reading', reopen);
    Then('Variants has <choice> chosen', async () => {
      expect(await chosenIn('Variants')).toEqual([row.choice]);
    });
  });

  Scenario('Witnesses appears once Variants is on and offers three values with every witness chosen', ({ Given, When, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses {string} in the group {string}', choose);
    Then('Witnesses offers {string}, {string} and {string} with {string} chosen', async (_, a: string, b: string, c: string, chosen: string) => {
      expect(await labelsOf('Witnesses')).toEqual([a, b, c]);
      expect(await chosenIn('Witnesses')).toEqual([chosen]);
    });
    And('Witnesses has its help line naming the Byzantine split, Nestle-Aland 27/28 and ECM', async () => {
      const text = await helpOf('Witnesses');
      expect(text).toContain('Byzantine split');
      expect(text).toContain('Nestle-Aland 27/28');
      expect(text).toContain('ECM');
    });
  });

  ScenarioOutline('Each Witnesses choice survives a reload', ({ Given, When, Then }, row) => {
    Given('Settings is open at Reading with Variants set to {string}', (_, value: string) => openReading({ variants: value }));
    When('he chooses <choice> in the group "Witnesses"', () => choose(null, row.choice, 'Witnesses'));
    Then('the setting "variantWitnesses" is kept as <kept>', () => savedAs('variantWitnesses', row.kept));
    When('Settings is opened again at Reading', reopen);
    Then('Witnesses has <choice> chosen', async () => {
      expect(await chosenIn('Witnesses')).toEqual([row.choice]);
    });
  });

  Scenario('Turning Variants Off hides the Witnesses row again', ({ Given, When, Then }) => {
    Given('Settings is open at Reading with Variants set to {string}', (_, value: string) => openReading({ variants: value }));
    When('he chooses {string} in the group {string}', choose);
    Then('there is no Witnesses row', async () => {
      await waitFor(() => expect(screen.queryByRole('group', { name: 'Witnesses' })).toBeNull());
    });
  });
  Scenario('Settings offers the lessons whatever Variants is, On to start, with a row that opens them', ({ Given, Then, And }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    Then('Offer the lessons offers {string} and {string} with {string} chosen', async (_, a: string, b: string, chosen: string) => {
      expect(await labelsOf('Offer the lessons')).toEqual([a, b]);
      expect(await chosenIn('Offer the lessons')).toEqual([chosen]);
    });
    And('there is a row {string} that opens the lessons', async (_, name: string) => {
      expect(await screen.findByRole('button', { name })).toBeTruthy();
    });
  });

  Scenario('Offer the lessons survives a reload', ({ Given, When, Then }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he chooses {string} in the group {string}', choose);
    Then('the setting {string} is kept as {string}', (_, key: string, value: string) => savedAs(key, value));
    When('Settings is opened again at Reading', reopen);
    Then('Offer the lessons has {string} chosen', async (_, choice: string) => {
      expect(await chosenIn('Offer the lessons')).toEqual([choice]);
    });
  });

  Scenario('The Lessons row opens the lessons', ({ Given, When, Then }) => {
    Given('Settings is open at Reading with nothing chosen', () => openReading());
    When('he taps the row {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('the lessons on variant readings are open', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/lessons/variants'));
    });
  });
});
