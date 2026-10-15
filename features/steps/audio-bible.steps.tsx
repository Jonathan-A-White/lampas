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

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const AUDIBLE_PAGE = 'https://www.audible.com/pd/B003UC45I8';

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

  Scenario("Tapping Listen in Audible asks the phone to open the Audible app, with the book's page as the fallback", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', async (_, name: string) => {
      link = await within(verseView()).findByRole('link', { name: new RegExp(`^${name}`) });
      // jsdom follows no link; the tap is what arms the wait
      link.addEventListener('click', (e) => e.preventDefault());
      await user.click(link);
    });
    Then(
      'the link\'s address is the Android intent for the Audible app searching {string}, falling back to {string}',
      (_, query: string, fallback: string) => {
        expect(link?.getAttribute('href')).toBe(
          `intent:#Intent;action=android.media.action.MEDIA_PLAY_FROM_SEARCH;package=com.audible.application;S.query=${encodeURIComponent(query)};S.browser_fallback_url=${encodeURIComponent(fallback)};end`,
        );
        expect(fallback).toBe(AUDIBLE_PAGE);
      },
    );
  });

  Scenario("The book's page opens only when the phone stays on Lampas", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', async (_, name: string) => {
      const a = await within(verseView()).findByRole('link', { name: new RegExp(`^${name}`) });
      a.addEventListener('click', (e) => e.preventDefault());
      await user.click(a);
    });
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('the address {string} was opened', (_, url: string) => {
      expect(opened).toEqual([url]);
    });
  });

  Scenario("The book's page does not open when Audible took the tap", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Audio Bible on', () => openWith({ audioBible: 'word-of-promise' }));
    When('he opens the Verse view of Luke 15:11', openLuke15Verse11);
    And('he taps {string}', async (_, name: string) => {
      const a = await within(verseView()).findByRole('link', { name: new RegExp(`^${name}`) });
      a.addEventListener('click', (e) => e.preventDefault());
      await user.click(a);
    });
    And('the page goes away', () => {
      for (const l of [...leave]) l();
    });
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('no address was opened', () => {
      expect(opened).toEqual([]);
    });
  });
});
