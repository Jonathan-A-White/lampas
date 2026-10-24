// features/steps/study-resources.steps.tsx — runs features/study-resources.feature: the Study resources section of Settings
// (a switch per registered resource, a name field for Logos' lexicon) and the Study row of the word sheet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { getStudyResources, setState, stateOf } from '../../src/data/repositories';
import { LEXICONS } from '../../src/resources/logos';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup, leaveSettings } from '../../tests/support/settings-pages';

const user = userEvent.setup();

// A tap on a Study link arms a wait for the page to stay in front: nothing here waits for real time or leaves the page.
const real = { ...browserEnv };
browserEnv.after = () => () => {};

afterAll(() => {
  Object.assign(browserEnv, real);
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
  await seedHisWords();
  render(<App />);
  await waitForReader();
}

async function openFresh(): Promise<void> {
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await mount();
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const openSettings = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'study');
};
const goBack = async (): Promise<void> => {
  await leaveSettings(user);
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
// The lexicons he uses are the books On in Your Logos library (mw-rfjjzd.5): Settings lists none, so a step turns one on, or asks, through the shelf.
const lexiconNamed = (name: string) => {
  const found = LEXICONS.find((l) => l.short === name || l.name === name);
  if (!found) throw new Error(`no lexicon ${name}`);
  return found;
};
const turnsOn = async (_: unknown, name: string): Promise<void> => {
  expect(await setState(lexiconNamed(name).resource, 'on')).toEqual({ ok: true });
};
const isOn = async (_: unknown, name: string): Promise<void> => {
  await waitFor(async () => expect(await stateOf(lexiconNamed(name).resource)).not.toBe('off'));
};
const isNotOn = async (_: unknown, name: string): Promise<void> => {
  await waitFor(async () => expect(await stateOf(lexiconNamed(name).resource)).toBe('off'));
};
const link = (label: string): HTMLElement | null => {
  const row = studyRow();
  if (!row) throw new Error('no Study row');
  return within(row).queryByRole('link', { name: label });
};
const hasLink = (_: unknown, label: string, href: string): void => {
  const found = link(label);
  if (!found) throw new Error(`no link ${label}`);
  expect(found).toHaveAttribute('href', href);
};
const tapWord = async (text: string, verse: number): Promise<HTMLElement> => {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  return screen.findByRole('dialog', { name: 'Word' });
};
// The sheet mounts before its study resources are read (a liveQuery answers later, later still on a loaded host): when a resource is On,
// wait for the Study row before a step looks for its links (same race as mw-5r3p30.135).
const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
  const dialog = await tapWord(text, verse);
  await within(dialog).findByRole('group', { name: 'Study' });
};
// With none On there is no row to wait for: let the sheet's own read of the resources finish (it began first, so ours ends after it).
const tapsWithNoneOn = async (_: unknown, text: string, verse: number): Promise<void> => {
  await tapWord(text, verse);
  await act(async () => {
    await getStudyResources();
  });
};
const studyRow = () => within(screen.getByRole('dialog', { name: 'Word' })).queryByRole('group', { name: 'Study' });

const feature = await loadFeature('features/study-resources.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("Settings lists Strong's and Logos, all switched off", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    Then("the Study resources section lists Strong's and Logos", async () => {
      const section = await screen.findByRole('region', { name: 'Study resources' });
      // The switches are drawn once the resources are read (a liveQuery answers later): wait for them.
      await waitFor(() =>
        expect(within(section).getAllByRole('switch').filter((s) => !s.closest('ul')).map((s) => s.getAttribute('aria-label'))).toEqual(["Strong's", 'Logos']),
      );
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
    Then('the Study row has a link {string} to {string}', hasLink);
  });

  Scenario('With Logos on, BDAG is ticked and the word sheet shows Open in Logos: BDAG and Bible Word Study in Logos', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    Then('the Logos lexicon {string} is on in his library', isOn);
    And('the Logos lexicon {string} is not on in his library', isNotOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
    And('the Study row also has a link {string} to {string}', hasLink);
    And('the Study row has no link {string}', (_, label: string) => expect(link(label)).toBeNull());
  });

  Scenario('Each ticked Logos lexicon gives its own Open link', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he turns on the Logos lexicon {string}', turnsOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
    And('the Study row also has a link {string} to {string}', hasLink);
    And('the Study row has one more link {string} to {string}', hasLink);
  });

  Scenario('With EDNT ticked, Open in Logos: EDNT carries the Resource ID Logos prints for EDNT', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he turns on the Logos lexicon {string}', turnsOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
    And('the Study link {string} has the fallback {string}', (_, label: string, fallback: string) => {
      expect(link(label)).toHaveAttribute('data-fallback', fallback);
    });
  });

  Scenario('Bible Word Study in Logos names Jesus by his Logos lemma, and the BDAG link is unchanged', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
    And('the Study row also has a link {string} to {string}', hasLink);
    And('the Study link {string} has the fallback {string}', (_, label: string, fallback: string) => {
      expect(link(label)).toHaveAttribute('data-fallback', fallback);
    });
  });

  Scenario('A Logos link carries its https address for the case the app cannot be opened', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study link {string} has the fallback {string}', (_, label: string, fallback: string) => {
      expect(link(label)).toHaveAttribute('data-fallback', fallback);
    });
  });

  Scenario("With Strong's on, the Strong's number shows once on the word sheet", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('{string} appears once on the word sheet', (_, text: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Word' });
      expect(sheet.textContent?.split(text).length).toBe(2);
    });
  });

  Scenario('With none on, the word sheet has no Study row', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When('he taps the word {string} in verse {int}', tapsWithNoneOn);
    Then('the word sheet has no Study row', () => expect(studyRow()).toBeNull());
  });

  Scenario('The switches survive a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he also switches on the study resource {string}', switchOn);
    And('he turns on the Logos lexicon {string}', turnsOn);
    And('Lampas is opened again', mount);
    And('he opens Settings again', openSettings);
    Then('the study resource {string} is switched on', async (_, name: string) => {
      expect(await switchOf(name)).toHaveAttribute('aria-checked', 'true');
    });
    And('the Logos lexicon {string} is on in his library', isOn);
    And('the Logos lexicon {string} stays on in his library', isOn);
  });
});
