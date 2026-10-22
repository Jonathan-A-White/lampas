// features/steps/ask-book.steps.tsx — runs features/ask-book.feature: Settings > Study resources > Logos > Grammar books > Ask for another book,
// the line that sends a 'feedback' grist of the kind grammar-book to the mill (grinds/feedback.json), proven against the fake Postern. Offline the
// request waits in the settings store ('bookRequestsWaiting') and goes on the window's 'online' event.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi, type MockInstance } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { SettingsScreen } from '../../src/SettingsScreen';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const WAITING_KEY = 'bookRequestsWaiting';
const MOUNCE = 'Mounce, Basics of Biblical Greek';
let fake: FakePostern;
let onLine: MockInstance<() => boolean> | undefined;

afterAll(() => {
  cleanup();
  clearBus();
  onLine?.mockRestore();
  vi.unstubAllGlobals();
  db.close();
});

const askBox = () => screen.getByRole('textbox', { name: 'Book title' });
const askGroup = () => screen.getByRole('group', { name: 'Ask for another book' });
const send = () => within(askGroup()).getByRole('button', { name: 'Send' });

/** Settings behind a fake Postern with Logos On, so the Grammar books are drawn; `waiting` is a request kept from before. */
async function openSettings(waiting: string[] = []): Promise<void> {
  cleanup();
  clearBus();
  onLine?.mockRestore();
  onLine = undefined;
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/settings?group=study');
  tutorTimings.pollMs = 20;
  tutorTimings.contactLostMs = 0;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : Promise.resolve(new Response('{}', { status: 404 })),
  );
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear()]);
  await db.settings.put({ key: 'resource.logos', value: 'on' });
  if (waiting.length) {
    await db.settings.put({ key: WAITING_KEY, value: JSON.stringify(waiting.map((text, i) => ({ id: `w${i}`, text, queuedAt: 1000 + i }))) });
  }
  render(<SettingsScreen />);
  await screen.findByRole('group', { name: 'Ask for another book' });
}

const goOffline = (): void => {
  onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
};

const feature = await loadFeature('features/ask-book.feature');

describeFeature(feature, ({ Scenario }) => {
  const OPEN = 'Settings is open with Logos on behind a fake Postern';
  const OPENS = 'he opens Ask for another book';
  const TYPES = 'he types {string} as the book title';
  const SENDS = 'he taps Send for the book';
  const RECEIVED = 'the mill received one grist of the kind feedback with the kind grammar-book, the title and the app version';
  const LINE = 'the line says {string}';
  const LINE_NOW = 'the line now says {string}';

  const opens = () => user.click(within(askGroup()).getByRole('button', { name: 'Ask for another book' }));
  const typed = (_: unknown, text: string) => user.type(askBox(), text);
  const received = async (): Promise<void> => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
    expect(fake.received[0].input).toEqual({ kind: 'grammar-book', text: MOUNCE, app_version: __APP_VERSION__ });
  };
  const lineSays = async (_: unknown, line: string): Promise<void> => {
    expect(await within(askGroup()).findByText(line)).toBeInTheDocument();
  };

  Scenario('Asking for a book sends one request and the line says Asked', ({ Given, When, Then, And }) => {
    Given(OPEN, () => openSettings());
    When(OPENS, opens);
    And(TYPES, typed);
    And(SENDS, () => user.click(send()));
    Then(RECEIVED, received);
    And(LINE, lineSays);
    And('the phone keeps one request row of kind grammar-book with the title, status sent', async () => {
      await waitFor(async () => expect(await db.requests.count()).toBe(1));
      expect(await db.requests.toArray()).toEqual([
        expect.objectContaining({ txid: fake.txids[0], kind: 'grammar-book', text: MOUNCE, app_version: __APP_VERSION__, status: 'sent' }),
      ]);
    });
    And('the Ask for another book box is empty', () => {
      expect(askBox()).toHaveValue('');
    });
  });

  Scenario('Send waits for a title', ({ Given, When, Then }) => {
    Given(OPEN, () => openSettings());
    When(OPENS, opens);
    Then('Send for the book is disabled', () => {
      expect(send()).toBeDisabled();
    });
    When(TYPES, typed);
    Then('Send for the book is enabled', () => {
      expect(send()).toBeEnabled();
    });
  });

  Scenario('Offline the request waits and goes when the phone is back online', ({ Given, When, Then, And }) => {
    Given(OPEN, () => openSettings());
    And('the phone is offline', goOffline);
    When(OPENS, opens);
    And(TYPES, typed);
    And(SENDS, () => user.click(send()));
    Then(LINE, lineSays);
    And('the mill has received no grist', () => {
      expect(fake.received).toHaveLength(0);
    });
    When('the phone is back online', async () => {
      onLine?.mockRestore();
      onLine = undefined;
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });
    });
    Then(RECEIVED, received);
    And(LINE_NOW, lineSays);
    And('no request waits on the phone', async () => {
      await waitFor(async () => expect(JSON.parse((await db.settings.get(WAITING_KEY))?.value ?? '[]')).toEqual([]));
    });
  });

  Scenario('A request that waits is still there when Settings is opened again', ({ Given, And, Then }) => {
    Given('a request for {string} waits on the phone', async (_, text: string) => {
      await openSettings([text]);
      cleanup();
    });
    And(OPEN, async () => {
      const waiting = (await db.settings.get(WAITING_KEY))?.value;
      await openSettings();
      if (waiting) await db.settings.put({ key: WAITING_KEY, value: waiting });
      cleanup();
      goOffline();
      render(<SettingsScreen />);
      await screen.findByRole('group', { name: 'Ask for another book' });
    });
    And('the phone is offline', () => {
      expect(window.navigator.onLine).toBe(false);
    });
    Then(LINE, lineSays);
  });

  Scenario('The mill is down: the request keeps waiting and Try again sends it', ({ Given, When, Then, And }) => {
    Given(OPEN, () => openSettings());
    And('the mill is down', () => {
      fake.down = true;
    });
    When(OPENS, opens);
    And(TYPES, typed);
    And(SENDS, () => user.click(send()));
    Then(LINE, lineSays);
    And('the line shows {string}', async (_, title: string) => {
      expect(await within(askGroup()).findByText(title)).toBeInTheDocument();
    });
    When('the mill is back and he taps Try again', async () => {
      fake.down = false;
      await user.click(within(askGroup()).getByRole('button', { name: 'Try again' }));
    });
    Then(LINE_NOW, lineSays);
    And(RECEIVED, received);
  });
});
