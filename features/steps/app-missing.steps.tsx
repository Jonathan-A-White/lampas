// features/steps/app-missing.steps.tsx — runs features/app-missing.feature: the sheet that says an app is not on the phone (opened by a
// Study link whose app did not take the page in 1.5 s), and the Study links as short tiles grouped by app.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
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

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

let timers: (() => void)[] = [];
let leavers: (() => void)[] = [];
let opened: string[] = [];

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

/** The phone's UA, and the page's clock and exits under the test's hand: nothing waits for real time. */
function stubPhone(agent: string): void {
  timers = [];
  leavers = [];
  opened = [];
  Object.defineProperty(window.navigator, 'userAgent', { value: agent, configurable: true });
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = (fn) => {
    leavers.push(fn);
    return () => {
      leavers = leavers.filter((l) => l !== fn);
    };
  };
  browserEnv.open = (url) => void opened.push(url);
}

async function openWith(agent: string, ons: string[], ticked: string[] = []): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const id of ons) await db.settings.put({ key: `resource.${id}`, value: 'on' });
  if (ticked.length > 0) await db.settings.put({ key: 'resourceOption.logos', value: JSON.stringify(['bdag', ...ticked]) });
  stubPhone(agent);
  render(<App />);
  await waitForReader();
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Word' });
const studyRow = (): HTMLElement | null => within(wordSheet()).queryByRole('group', { name: 'Study' });
const missingSheet = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'App not on this phone' });
const theSheet = async (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'App not on this phone' });

const feature = await loadFeature('features/app-missing.feature');

describeFeature(feature, ({ Scenario }) => {
  const taps = async (_: unknown, text: string, verse: number): Promise<void> => {
    await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
    await screen.findByRole('dialog', { name: 'Word' });
  };
  const tapsLink = async (_: unknown, name: string): Promise<void> => {
    const row = studyRow();
    if (!row) throw new Error('no Study row');
    // The tap follows the link's href in a phone; jsdom only needs the click, which arms the wait.
    await user.click(within(row).getByRole('link', { name }));
  };
  const waits = (): void => {
    act(() => {
      for (const fn of [...timers]) fn();
    });
  };
  const leaves = (): void => {
    act(() => {
      for (const fn of [...leavers]) fn();
    });
  };
  const sheetSays = async (_: unknown, text: string): Promise<void> => {
    expect(within(await theSheet()).getByText(text)).toBeInTheDocument();
  };
  const noSheet = (): void => expect(missingSheet()).toBeNull();
  const stillHasLink = (_: unknown, name: string): void => {
    const row = studyRow();
    if (!row) throw new Error('no Study row');
    expect(within(row).getByRole('link', { name })).toBeInTheDocument();
  };
  const android = (): Promise<void> => openWith(ANDROID, ['accordance']);

  Scenario('Accordance does not open, so the sheet says it is not on this phone', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    Then('a sheet says {string}', sheetSays);
    And('the sheet has a {string} link to the Play Store', async (_, name: string) => {
      const href = within(await theSheet()).getByRole('link', { name }).getAttribute('href') ?? '';
      expect(href).toBe('https://play.google.com/store/apps/details?id=com.accordancebible.accordance');
    });
    And('the sheet has a {string} button', async (_, name: string) => {
      expect(within(await theSheet()).getByRole('button', { name })).toBeInTheDocument();
    });
  });

  Scenario('On an iPhone Get Accordance goes to the App Store', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an iPhone', () => openWith(IPHONE, ['accordance']));
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    Then('a sheet says {string}', sheetSays);
    And('the sheet has a {string} link to the App Store', async (_, name: string) => {
      const href = within(await theSheet()).getByRole('link', { name }).getAttribute('href') ?? '';
      expect(href).toBe('itms-apps://apps.apple.com/app/id411970514');
    });
  });

  Scenario('The wait is about one and a half seconds', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    Then('the wait for an app to open is {int} milliseconds', (_, ms: number) => {
      expect(browserEnv.waitMs).toBe(ms);
    });
  });

  Scenario('Turn off Accordance switches it off and its link leaves the word sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    And('he taps {string} on the sheet', async (_, name: string) => {
      await user.click(within(await theSheet()).getByRole('button', { name }));
    });
    Then('the sheet is closed', async () => {
      await waitFor(() => expect(missingSheet()).toBeNull());
    });
    And('the word sheet has no Study row', async () => {
      await waitFor(() => expect(studyRow()).toBeNull());
    });
    And('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('Done leaves Accordance on', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    And('he taps Done on the sheet', async () => {
      await user.click(within(await theSheet()).getByRole('button', { name: 'Done' }));
    });
    Then('the sheet is closed', async () => {
      await waitFor(() => expect(missingSheet()).toBeNull());
    });
    And('the Study row still has the link {string}', stillHasLink);
  });

  Scenario('Back closes the sheet and leaves the word sheet open', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    And("he taps the phone's Back", async () => {
      await theSheet();
      act(() => window.history.back());
    });
    Then('the sheet is closed', async () => {
      await waitFor(() => expect(missingSheet()).toBeNull());
    });
    And('the Study row still has the link {string}', stillHasLink);
  });

  Scenario('When the app takes the page away there is no sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Accordance on and the phone is an Android phone', android);
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the app takes the page away', leaves);
    And('the page stays in front for the wait', waits);
    Then('there is no sheet about a missing app', noSheet);
  });

  Scenario('A Logos link opens its https address and shows no sheet', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on and the phone is an Android phone', () => openWith(ANDROID, ['logos']));
    When('he taps the word {string} in verse {int}', taps);
    And('he taps the Study link {string}', tapsLink);
    And('the page stays in front for the wait', waits);
    Then('the address {string} was opened', (_, url: string) => {
      expect(opened).toEqual([url]);
    });
    And('there is no sheet about a missing app', noSheet);
  });

  Scenario('The Study links are short tiles grouped by app', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos and Accordance on and Lexham ticked', () =>
      openWith(ANDROID, ['logos', 'accordance'], ['lexhamtheolwordbk']),
    );
    When('he taps the word {string} in verse {int}', taps);
    const tiles = (group: string): string[] => {
      const row = studyRow();
      if (!row) throw new Error('no Study row');
      return within(within(row).getByRole('group', { name: group })).getAllByRole('link').map((a) => a.textContent ?? '');
    };
    Then('the Study group {string} has the tiles {string}, {string}, {string}', (_, group: string, a: string, b: string, c: string) => {
      expect(tiles(group)).toEqual([a, b, c]);
    });
    And('the Study group {string} has the tiles {string}', (_, group: string, a: string) => {
      expect(tiles(group)).toEqual([a]);
    });
    And('the tile {string} is still named {string}', (_, tile: string, name: string) => {
      const row = studyRow();
      if (!row) throw new Error('no Study row');
      expect(within(row).getByRole('link', { name })).toHaveTextContent(tile);
    });
  });
});
