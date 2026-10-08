// features/steps/study-resources.steps.tsx — runs features/study-resources.feature: the Study resources section of Settings
// (a switch per registered resource, a name field for Logos' and Accordance's lexicon) and the Study row of the word sheet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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
const lexicon = (name: string): Promise<HTMLElement> => screen.findByRole('checkbox', { name });
const ticks = async (_: unknown, name: string): Promise<void> => {
  const box = await lexicon(name);
  if (box.getAttribute('aria-checked') !== 'true') await user.click(box);
  await waitFor(() => expect(box).toHaveAttribute('aria-checked', 'true'));
};
const listNames = (): string[] =>
  within(screen.getByRole('group', { name: 'Logos lexicons' }))
    .queryAllByRole('checkbox')
    .map((c) => c.textContent?.replace('✓', '').trim() ?? '');
const typesSearch = async (_: unknown, text: string): Promise<void> => {
  await user.type(await screen.findByRole('searchbox', { name: 'Search Logos lexicons' }), text);
};
const listShows = async (_: unknown, name: string): Promise<void> => {
  expect(await screen.findByRole('checkbox', { name })).toBeInTheDocument();
};
const listLacks = (_: unknown, name: string): void => {
  expect(screen.queryByRole('checkbox', { name })).toBeNull();
};
const listCount = (_: unknown, n: number): void => {
  expect(listNames()).toHaveLength(n);
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
    Then('the Study row has a link {string} to {string}', hasLink);
  });

  Scenario('With Logos on, BDAG is ticked and the word sheet shows Open in Logos: BDAG and Bible Word Study in Logos', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    Then('the Logos lexicon {string} is ticked', async (_, name: string) => {
      expect(await lexicon(name)).toHaveAttribute('aria-checked', 'true');
    });
    And('the Logos lexicon {string} is not ticked', async (_, name: string) => {
      expect(await lexicon(name)).toHaveAttribute('aria-checked', 'false');
    });
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
    And('he ticks the Logos lexicon {string}', ticks);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
    And('the Study row also has a link {string} to {string}', hasLink);
    And('the Study row has one more link {string} to {string}', hasLink);
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

  Scenario('With Accordance on, the word sheet shows Open in Accordance built from the lemma', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he taps Back on the Settings screen', goBack);
    And('he taps the word {string} in verse {int}', taps);
    Then('the Study row has a link {string} to {string}', hasLink);
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
    And('he also switches on the study resource {string}', switchOn);
    And('he ticks the Logos lexicon {string}', ticks);
    And('Lampas is opened again', mount);
    And('he opens Settings again', openSettings);
    Then('the study resource {string} is switched on', async (_, name: string) => {
      expect(await switchOf(name)).toHaveAttribute('aria-checked', 'true');
    });
    And('the study resource {string} is switched off', async (_, name: string) => {
      expect(await switchOf(name)).toHaveAttribute('aria-checked', 'false');
    });
    And('the Logos lexicon {string} is ticked', async (_, name: string) => {
      expect(await lexicon(name)).toHaveAttribute('aria-checked', 'true');
    });
    And('the Logos lexicon {string} stays ticked', async (_, name: string) => {
      expect(await lexicon(name)).toHaveAttribute('aria-checked', 'true');
    });
  });

  Scenario('Searching the Logos lexicons narrows the list, and clearing the search brings every lexicon back', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he types {string} in the Logos lexicons search', typesSearch);
    Then('the Logos lexicons list shows {string}', listShows);
    And('the Logos lexicons list does not show {string}', listLacks);
    And('the Logos lexicons list also does not show {string}', listLacks);
    When('he clears the Logos lexicons search', async () => {
      await user.clear(screen.getByRole('searchbox', { name: 'Search Logos lexicons' }));
    });
    Then('the Logos lexicons list is back with {string}', listShows);
    And('the Logos lexicons list also shows {string}', listShows);
    And('the Logos lexicons list holds {int} lexicons', listCount);
  });

  Scenario('A search with no match says so', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he types {string} in the Logos lexicons search', typesSearch);
    Then('the Logos lexicons list holds {int} lexicons', listCount);
    And('the Logos lexicons list says {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
  });

  Scenario('Ticking a lexicon found by search is saved as before', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he types {string} in the Logos lexicons search', typesSearch);
    And('he ticks the Logos lexicon {string}', ticks);
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('Ticked lexicons are listed first', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with no study resources on', openFresh);
    When("he taps the gear in the reader's header", openSettings);
    And('he switches on the study resource {string}', switchOn);
    And('he ticks the Logos lexicon {string}', ticks);
    And('Lampas is opened again', mount);
    And('he opens Settings again', openSettings);
    Then('the Logos lexicons list starts with {string}, {string}, {string}', async (_, a: string, b: string, c: string) => {
      await screen.findByRole('checkbox', { name: a });
      expect(listNames().slice(0, 3)).toEqual([a, b, c]);
    });
  });
});
