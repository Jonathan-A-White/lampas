// features/steps/study-resources.steps.tsx — runs features/study-resources.feature: the Study resources section of Settings
// (a switch per registered resource, a name field for Logos' and Accordance's lexicon) and the Study row of the word sheet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** Mounts the app afresh, as a reload does: the settings store (IndexedDB) stays, the screen state does not. */
async function mount(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  render(<App />);
  await waitForReader();
}

async function openFresh(): Promise<void> {
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await mount();
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const openSettings = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
};
const goBack = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
};
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const switchOf = async (name: string): Promise<HTMLElement> => screen.findByRole('switch', { name });
const switchOn = async (_: unknown, name: string): Promise<void> => {
  const control = await switchOf(name);
  if (control.getAttribute('aria-checked') !== 'true') await user.click(control);
  await waitFor(() => expect(control).toHaveAttribute('aria-checked', 'true'));
};
const nameField = (resource: string): Promise<HTMLElement> => screen.findByRole('textbox', { name: `${resource} resource` });
const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
};
const studyRow = () => within(screen.getByRole('dialog', { name: 'Word' })).queryByRole('group', { name: 'Study' });

const feature = await loadFeature('features/study-resources.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("Settings lists Strong's, Logos and Accordance, all switched off", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    Then("the Study resources section lists Strong's, Logos and Accordance", async () => {
      const section = await screen.findByRole('region', { name: 'Study resources' });
      expect(within(section).getAllByRole('switch').map((s) => s.getAttribute('aria-label'))).toEqual(["Strong's", 'Logos', 'Accordance']);
    });
    And('every study resource is switched off', () => {
      for (const s of within(screen.getByRole('region', { name: 'Study resources' })).getAllByRole('switch')) {
        expect(s).toHaveAttribute('aria-checked', 'false');
      }
    });
  });

  Scenario("With Strong's on, the word sheet shows the word's G-number as a link to its entry", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', (_, label: string, href: string) => {
      const row = studyRow();
      if (!row) throw new Error('no Study row');
      expect(within(row).getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  Scenario('With Logos on and BDAG named, the word sheet shows Open in Logos built from the lemma', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he names the Logos resource {string}', async (_, name: string) => {
      fireEvent.change(await nameField('Logos'), { target: { value: name } });
      await waitFor(async () => expect((await db.settings.get('resourceOption.logos'))?.value).toBe(name));
    });
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', (_, label: string, href: string) => {
      const row = studyRow();
      if (!row) throw new Error('no Study row');
      expect(within(row).getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  Scenario('With Accordance on, the word sheet shows Open in Accordance built from the lemma', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', (_, label: string, href: string) => {
      const row = studyRow();
      if (!row) throw new Error('no Study row');
      expect(within(row).getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  Scenario('With none on, the word sheet has no Study row', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When('he taps the word {string} in verse {int}', taps);
    Then('the word sheet has no Study row', () => expect(studyRow()).toBeNull());
  });

  Scenario('The switches survive a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he names the Logos resource {string}', async (_, name: string) => {
      fireEvent.change(await nameField('Logos'), { target: { value: name } });
      await waitFor(async () => expect((await db.settings.get('resourceOption.logos'))?.value).toBe(name));
    });
    And('Lampas is opened again', mount);
    And('he opens Settings again', openSettings);
    Then('the study resource {string} is switched on', async (_, name: string) => {
      expect(await switchOf(name)).toHaveAttribute('aria-checked', 'true');
    });
    And('the study resource {string} is switched off', async (_, name: string) => {
      expect(await switchOf(name)).toHaveAttribute('aria-checked', 'false');
    });
    And('the Logos resource is named {string}', async (_, name: string) => {
      expect(await nameField('Logos')).toHaveValue(name);
    });
  });
});
