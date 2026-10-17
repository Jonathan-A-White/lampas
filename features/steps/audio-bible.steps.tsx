// features/steps/audio-bible.steps.tsx — runs features/audio-bible.feature: Settings > Study resources > Audio Bible, and the Verse view's
// 'Listen in Audible' link (src/resources/audioBible.ts) that opens the book in the Audible app and says which chapter to pick.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ISSUER_PUB } from '../../tests/support/licence-chain';

const user = userEvent.setup();

let timers: (() => void)[] = [];
let leave: (() => void)[] = [];
let opened: string[] = [];
let link: HTMLElement | undefined;
/** the time before each tap, and the annotation_time_utc each tap wrote into the link */
let tappedAt: number[] = [];
let stamps: number[] = [];

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openWith(settings: Record<string, string>, { licence }: { licence: boolean } = { licence: true }): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  localStorage.setItem('lampas.welcome', 'done');
  vi.unstubAllGlobals();
  stubChapterFetch();
  timers = [];
  leave = [];
  opened = [];
  link = undefined;
  tappedAt = [];
  stamps = [];
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = (fn) => {
    leave.push(fn);
    return () => {
      leave = leave.filter((l) => l !== fn);
    };
  };
  browserEnv.open = (url) => void opened.push(url);
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  if (licence) render(<App />);
  else {
    // a phone with no licence: the whole app under the provider with a check that finds none
    render(
      <LicenceProvider issuer={ISSUER_PUB} now={() => Date.now()} check={() => Promise.resolve({ state: 'none', checkedAt: new Date().toISOString() })}>
        <App />
      </LicenceProvider>,
    );
  }
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openLuke15Verse11(): Promise<void> {
  window.history.pushState(null, '', '/#/?b=luk&c=15&v=11');
  window.dispatchEvent(new PopStateEvent('popstate'));
  await screen.findByRole('region', { name: 'Verse view' });
}

const verseView = (): HTMLElement => screen.getByRole('region', { name: 'Verse view' });
/** Taps the link as a phone does: jsdom follows no link, so the click is stopped once it has run Lampas's own handler. */
async function tapListen(_: unknown, name: string): Promise<void> {
  link = await within(verseView()).findByRole('link', { name: new RegExp(`^${name}`) });
  link.addEventListener('click', (e) => e.preventDefault(), { once: true });
  tappedAt.push(Date.now());
  await user.click(link);
  stamps.push(Number(new URL(link.getAttribute('href') ?? '').searchParams.get('annotation_time_utc')));
}

const group = (): HTMLElement => screen.getByRole('group', { name: 'Audio Bible' });

const feature = await loadFeature('features/audio-bible.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings offers an Audio Bible, Off to start', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with the Audio Bible Off', () => openWith({}));
    When('he opens Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('the Audio Bible shows the choices {string} and {string}', async (_, off: string, promise: string) => {
      const choices = await within(await screen.findByRole('group', { name: 'Audio Bible' })).findAllByRole('button');
      expect(choices.map((c) => c.textContent)).toEqual([off, promise]);
    });
    And('{string} is the one chosen', async (_, name: string) => {
      const chosen = within(group()).getAllByRole('button', { pressed: true });
      expect(chosen.map((c) => c.textContent)).toEqual([name]);
    });
  });

  Scenario('Settings writes the name Audio Bible above the choices', ({ Given, When, Then }) => {
    Given('Lampas is opened with the Audio Bible Off', () => openWith({}));
    When('he opens Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('the Audio Bible row writes its name {string} in its own text', async (_, name: string) => {
      await screen.findByRole('group', { name });
      const row = document.querySelector<HTMLElement>('[data-setting="audioBible"]');
      // the row's text, not the choices group's accessible name
      expect(within(row as HTMLElement).getByText(name)).toBeTruthy();
    });
  });

  Scenario('Choosing The Word of Promise in Settings keeps it', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible Off', () => openWith({}));
    When('he opens Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    And('he chooses {string} for the Audio Bible', async (_, name: string) => {
      await user.click(await within(await screen.findByRole('group', { name: 'Audio Bible' })).findByRole('button', { name }));
    });
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('With the Audio Bible Off the Verse view has no Listen in Audible', ({ Given, When, Then }) => {
    Given('Lampas is opened with the Audio Bible Off', () => openWith({}));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    Then('there is no {string} link', async (_, name: string) => {
      await screen.findByText(/Tap Play to hear/);
      expect(within(verseView()).queryByRole('link', { name: new RegExp(name) })).toBeNull();
    });
  });

  Scenario('With it on the Verse view of Luke 15:11 says which chapter to pick, with the credit, and needs no licence', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with no licence and the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }, { licence: false }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    Then('the Verse view shows the link {string}', async (_, name: string) => {
      expect(await within(verseView()).findByRole('link', { name: new RegExp(`^${name}`) })).toBeTruthy();
    });
    And('the line {string} is shown', (_, text: string) => {
      expect(within(verseView()).getByText(text)).toBeTruthy();
    });
    And('the credit line {string} is shown', (_, text: string) => {
      expect(within(verseView()).getByText(text)).toBeTruthy();
    });
  });

  Scenario('The link is named for a screen reader and the credit is plain text under it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    Then('the link is named {string}', async (_, name: string) => {
      link = await within(verseView()).findByRole('link', { name });
    });
    And('the credit line is plain text under the link, not part of it', () => {
      const credit = within(verseView()).getByText('The Word of Promise, Thomas Nelson. Needs the book in your Audible library.');
      expect(link?.contains(credit)).toBe(false);
      expect(credit.closest('a')).toBeNull();
      expect(link?.compareDocumentPosition(credit)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  Scenario("Tapping Listen in Audible opens Audible's own link at the start of the chapter", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', tapListen);
    Then(
      "the link's address is Audible's smart link for {string} at {int} ms, stamped with the time of the tap",
      (_, asin: string, ms: number) => {
        const url = new URL(link?.getAttribute('href') ?? '');
        expect(url.origin + url.pathname).toBe('https://audible.smart.link/aexglzp2n');
        expect(url.searchParams.get('asin')).toBe(asin);
        expect(url.searchParams.get('position_from_start')).toBe(String(ms));
        expect(url.searchParams.get('autoplay')).toBe('true');
        const stamp = Number(url.searchParams.get('annotation_time_utc'));
        expect(stamp).toBeGreaterThanOrEqual(tappedAt[0]);
        expect(stamp).toBeLessThanOrEqual(Date.now());
      },
    );
  });

  Scenario('Each tap stamps the link with its own time', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', tapListen);
    And('a second goes by', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
    And('he taps {string} again', tapListen);
    Then("the second tap's time is later than the first's", () => {
      expect(stamps).toHaveLength(2);
      expect(stamps[1]).toBeGreaterThan(stamps[0]);
    });
  });

  Scenario("Audible's own link needs no fallback page from Lampas", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', tapListen);
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('no address was opened', () => {
      expect(opened).toEqual([]);
    });
  });
});
