// features/steps/ask-for-more.steps.tsx — runs features/ask-for-more.feature: Settings > More > Ask for more, the page that leads with Ask the tutor
// (a talk opened with the ask begun in its composer; the page has no form, mw-5r3p30.726), proven in the whole app against the fake Postern.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext } from '../../src/gate/licenceContext';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import '../../tests/support/grinds-in-graph';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

/** Opens the app at `address` with a fake Postern behind it that answers a feedback grist as the mill does; `licensed` false draws it with no licence. */
async function openAt(address: string, licensed = true): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${address}`);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.talks.clear(), db.requests.clear(), db.recalls.clear()]);
  const unlicensed = { licence: 'not-licensed' as const, locked: null, publicKeyHex: '', checkAgain: () => {} };
  render(licensed ? <App /> : <LicenceContext.Provider value={unlicensed}><App /></LicenceContext.Provider>);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

async function openPage(): Promise<void> {
  await openAt('#/askmore');
  await screen.findByRole('heading', { name: 'Ask for more', level: 1 });
}

const OFFER_ANSWER = {
  answer: 'Lampas does not have that. I can pass your wish to the makers; I cannot promise they will build it.',
  words: [],
  feedback_offer: { summary: 'He wants Lampas to have the Polis method.' },
};

const feature = await loadFeature('features/ask-for-more.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings shows Ask for more, and its page leads with Ask the tutor', ({ Given, Then, When, And }) => {
    Given('Settings is open in the app behind a fake Postern', async () => {
      await openAt('#/settings?group=account');
      await screen.findByRole('heading', { name: 'More', level: 2 });
    });
    Then('Settings > More has the row {string}', (_, label: string) => {
      const section = screen.getByRole('heading', { name: 'More', level: 2 }).closest('section') as HTMLElement;
      expect(within(section).getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }));
    });
    Then('the page {string} is open', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/askmore');
    });
    And('its first button is {string}', (_, label: string) => {
      const main = screen.getByRole('main');
      expect(within(main).getAllByRole('button')[0]).toHaveTextContent(label);
    });
    And('it has no {string} section and no form', (_, heading: string) => {
      const main = screen.getByRole('main');
      expect(within(main).queryByRole('heading', { name: heading })).toBeNull();
      expect(within(main).getAllByRole('button')).toHaveLength(1);
      expect(within(main).queryByRole('form')).toBeNull();
      expect(within(main).queryByRole('textbox')).toBeNull();
    });
  });

  Scenario('Ask the tutor opens a talk with the ask begun in the composer', ({ Given, When, Then, And }) => {
    Given('the Ask for more page is open in the app', openPage);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label }));
    });
    Then('a tutor talk is open', async () => {
      expect(await screen.findByRole('dialog', { name: 'Ask the tutor: Ask for more' })).toBeInTheDocument();
    });
    And('its composer holds {string}', (_, words: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
      expect(within(sheet).getByRole('textbox', { name: 'Your message' })).toHaveValue(words);
    });
    And('nothing has been sent to the mill', () => {
      expect(fake.received).toHaveLength(0);
    });
  });

  Scenario("After the tutor's offer is sent, Sent links to Your requests, where the makers' answer comes back", ({ Given, When, Then, And }) => {
    Given('the Ask for more page is open in the app and the tutor offers to send his ask to the makers', async () => {
      await openPage();
      fake.kindReplies['bible-talk'] = { status: 'answered', answer: OFFER_ANSWER };
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label }));
    });
    And('he sends {string}', async (_, words: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Ask the tutor: Ask for more' });
      const box = within(sheet).getByRole('textbox', { name: 'Your message' });
      await user.clear(box);
      await user.type(box, words);
      await user.click(within(sheet).getByRole('button', { name: 'Send' }));
    });
    And('he taps {string}', async (_, label: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
      await user.click(await within(sheet).findByRole('button', { name: label }));
    });
    Then('the offer says {string} and {string} with a link {string}', async (_, sent: string, line: string, link: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
      const settled = await waitFor(() => {
        const found = sheet.querySelector<HTMLElement>('[data-offer-settled]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect(within(settled).getByText(sent)).toBeInTheDocument();
      expect(settled).toHaveTextContent(line);
      expect(within(settled).getByRole('button', { name: link })).toBeInTheDocument();
    });
    When('he taps the link {string}', async (_, label: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
      await user.click(within(sheet).getByRole('button', { name: label }));
    });
    Then('the talk is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
    And('the page {string} is open', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/requests');
    });
    And('its heading {string} is in view', (_, title: string) => {
      // jsdom has no layout: the page opens at its top, so its heading is the first thing in the screen box
      const heading = screen.getByRole('heading', { name: title, level: 1 });
      expect(heading).toBeVisible();
      expect(screen.getByRole('main').scrollTop).toBe(0);
    });
  });

  Scenario('With no licence the page says asking needs one, and offers no tutor', ({ Given, Then, And }) => {
    Given('the Ask for more page is open on a phone with no licence', async () => {
      await openAt('#/askmore', false);
      await screen.findByRole('heading', { name: 'Ask for more', level: 1 });
    });
    Then('the page shows {string}', (_, label: string) => {
      expect(within(screen.getByRole('main')).getByRole('button', { name: label })).toBeInTheDocument();
    });
    And('it has no {string} button', (_, label: string) => {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
      expect(screen.queryByRole('form')).toBeNull();
    });
  });
});
