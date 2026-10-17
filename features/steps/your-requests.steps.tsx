// features/steps/your-requests.steps.tsx — runs features/your-requests.feature: the Your requests screen (#/requests), which pulls the
// request-status records the mill seals to this phone (docs/protocol.md section 19 in Postern) and shows where each request stands,
// proven against the fake Postern (tests/support/fake-postern.ts). Real timers: the screen's poll is shortened to 20 ms.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivateKey } from '@bsv/sdk';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { About } from '../../src/About';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getRequestsCursor, keepRequest, listRequests } from '../../src/data/repositories/requests';
import { clearBus } from '../../src/events/bus';
import { RequestsScreen } from '../../src/RequestsScreen';
import { useRoute } from '../../src/nav/route';
import { requestTimings } from '../../src/services/requestStatus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const STRANGER_KEY = '00'.repeat(31) + '09';
const PHONE_PUBLIC = PrivateKey.fromHex(PHONE_KEY).toPublicKey().toString();
const COMMIT_URL = 'https://github.com/Jonathan-A-White/lampas/commit/0123456789abcdef0123456789abcdef01234567';

let fake: FakePostern;
let txids = new Map<string, string>();
let clock = 0;

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const txidOf = (summary: string): string => `direct:${Array.from(summary, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64)}`;

/** The record the mill seals: a request-status plaintext (protocol section 19) with the time one second after the last. */
function statusFor(txid: string, status: string, more: Record<string, unknown> = {}): Record<string, unknown> {
  clock += 1000;
  return { kind: 'request-status', request: txid, bead: 'mw-x.1', status, ts: 1_790_000_000_000 + clock, ...more };
}

async function openWith(summaries: string[], pollMs = 20): Promise<void> {
  cleanup();
  // the screen of the last scenario may be in the middle of a pull: let it end before the tables are cleared
  await new Promise((r) => setTimeout(r, 100));
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/requests');
  requestTimings.pollMs = pollMs;
  clock = 0;
  fake = makeFakePostern();
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : Promise.resolve(new Response('{}', { status: 404 })),
  );
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear()]);
  txids = new Map();
  let sentAt = 1_780_000_000_000;
  for (const summary of summaries) {
    txids.set(summary, txidOf(summary));
    await keepRequest({ txid: txidOf(summary), kind: 'tutor-ask', summary, app_version: '0.1.80', sentAt: (sentAt += 60_000) });
  }
  render(<RequestsScreen />);
  await screen.findByRole('heading', { name: 'Your requests', level: 1 });
}

const row = (summary: string): HTMLElement => {
  const found = screen.getByText(summary).closest('[data-request]');
  if (!found) throw new Error(`no row for ${summary}`);
  return found as HTMLElement;
};
const lineOf = (summary: string): HTMLElement => row(summary).querySelector('[data-request-status]') as HTMLElement;

const sendStatus = (summary: string, status: string, more: Record<string, unknown> = {}, sealedBy?: string): void =>
  fake.sendStatus(PHONE_PUBLIC, statusFor(txids.get(summary) as string, status, more), sealedBy);

const readsAs = async (summary: string, line: string): Promise<void> => {
  await waitFor(() => expect(lineOf(summary)).toHaveTextContent(new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)));
};

/** Waits until the screen has pulled at least `count` more times than `before`. */
const pulledSince = (before: number, count = 1): Promise<void> => waitFor(() => expect(fake.sinces.length).toBeGreaterThanOrEqual(before + count));

/** The phone hides or shows the app: document.hidden and visibilityState say so, and visibilitychange fires. */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Back to jsdom's own (always visible) document. */
function forgetVisibility(): void {
  Reflect.deleteProperty(document, 'hidden');
  Reflect.deleteProperty(document, 'visibilityState');
}

const LONG_REQUEST = 'Let me hear the Greek at half speed, and also the English, and then the next verse after it, and keep going to the end of the chapter, one tap, every time I open the app';
const SHORT_REQUEST = 'Add a sepia theme';

/** jsdom has no layout: a box that is cut short (line-clamp-3 on a text over 100 characters) reports a scrollHeight taller than its clientHeight,
 * as a phone's would; tests/e2e/your-requests.spec.ts proves the real thing. Returns the undo. */
function stubClampedLayout(): () => void {
  const clamped = (el: HTMLElement): boolean => el.classList.contains('line-clamp-3') && (el.textContent ?? '').length > 100;
  const box = HTMLElement.prototype;
  Object.defineProperty(box, 'scrollHeight', { configurable: true, get(this: HTMLElement) { return clamped(this) ? 200 : 72; } });
  Object.defineProperty(box, 'clientHeight', { configurable: true, get() { return 72; } });
  return () => {
    Reflect.deleteProperty(box, 'scrollHeight');
    Reflect.deleteProperty(box, 'clientHeight');
  };
}
let undoLayout: (() => void) | undefined;

const feature = await loadFeature('features/your-requests.feature');

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  const open = 'Your requests is open behind a fake Postern with the request {string}';

  AfterEachScenario(() => {
    forgetVisibility();
    undoLayout?.();
    undoLayout = undefined;
  });

  Scenario('A request nobody has answered yet reads Sent', ({ Given, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A tap on a long request shows the whole of it, and a second tap folds it again', ({ Given, When, Then, And }) => {
    const longRequest = (): HTMLElement => screen.getByRole('button', { name: LONG_REQUEST });
    Given('Your requests is open with one long request and one short one', async () => {
      undoLayout = stubClampedLayout();
      await openWith([LONG_REQUEST, SHORT_REQUEST]);
    });
    Then('the short request is plain text, not a button', async () => {
      expect(await screen.findByText(SHORT_REQUEST)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: SHORT_REQUEST })).toBeNull();
    });
    And('the long request is cut short and can be opened', async () => {
      await waitFor(() => expect(longRequest()).toHaveAttribute('aria-expanded', 'false'));
      expect(longRequest().className).toContain('line-clamp-3');
    });
    When('he taps the long request', () => user.click(longRequest()));
    Then('the long request shows all of its text', () => {
      expect(longRequest()).toHaveAttribute('aria-expanded', 'true');
      expect(longRequest().className).not.toContain('line-clamp-3');
      expect(longRequest()).toHaveTextContent(LONG_REQUEST);
    });
    When('he taps the long request again', () => user.click(longRequest()));
    Then('the long request is cut short and can be opened', () => {
      expect(longRequest()).toHaveAttribute('aria-expanded', 'false');
      expect(longRequest().className).toContain('line-clamp-3');
    });
  });

  Scenario('A filed request reads Filed', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A request being built reads Being built', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A landed request reads Adopted in the version and links to the commit', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} in version {string} for {string}', (_, status: string, version: string, summary: string) =>
      sendStatus(summary, status, { version, commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }),
    );
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
    And('{string} is a link to the commit the record names', (_, name: string) => {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', COMMIT_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    });
  });

  Scenario('A declined request reads Declined with the reason', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string} because {string}', (_, status: string, summary: string, reason: string) =>
      sendStatus(summary, status, { reason }),
    );
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A request adopted as a setting reads Now a setting with its name', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string} naming the setting {string}', (_, status: string, summary: string, setting: string) =>
      sendStatus(summary, status, { setting }),
    );
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('The newest status by its time wins, whatever order the records arrive in', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When(
      'the mill sends the status {string} at a later time and then the status {string} at an earlier time for {string}',
      (_, later: string, earlier: string, summary: string) => {
        const first = statusFor(txids.get(summary) as string, later);
        const second = { ...statusFor(txids.get(summary) as string, earlier), ts: (first.ts as number) - 5000 };
        fake.sendStatus(PHONE_PUBLIC, first);
        fake.sendStatus(PHONE_PUBLIC, second);
      },
    );
    Then('the request {string} reads {string}', async (_, summary: string, line: string) => {
      await readsAs(summary, line);
      // both records were pulled: the screen kept the newer one, it did not just miss the other
      await waitFor(() => expect(fake.sinces.at(-1)).toBe(2));
      await readsAs(summary, line);
    });
  });

  Scenario('A status for a request this phone did not send changes nothing', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends a status for a request this phone never sent', () => {
      fake.sendStatus(PHONE_PUBLIC, statusFor(txidOf('Somebody else'), 'declined', { reason: 'not now' }));
    });
    And('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
    And('the phone keeps only the one request', async () => {
      expect((await listRequests()).map((r) => r.summary)).toEqual(['Add a sepia theme']);
    });
  });

  Scenario("A status sealed by any key but the mill's changes nothing", ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('another key sends the status {string} for {string}', (_, status: string, summary: string) =>
      sendStatus(summary, status, { reason: 'forged' }, STRANGER_KEY),
    );
    And('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', async (_, summary: string, line: string) => {
      await readsAs(summary, line);
      expect((await db.requests.get(txids.get(summary) as string))?.reason).toBeUndefined();
    });
  });

  Scenario('A record that is not a request status changes nothing', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends a record that is an answer, not a request status', () => {
      fake.sendStatus(PHONE_PUBLIC, { re: txids.get('Add a sepia theme'), status: 'answered', answer: { status: 'sent' }, grind: { app: 'lampas', kind: 'feedback', v: '1' } });
    });
    And('the mill sends a status the screen has no words for', () => sendStatus('Add a sepia theme', 'celebrated'));
    And('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('The list pulls when it opens and again while it is up, from a kept cursor', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    Then('the first pull asked from the start', async () => {
      await pulledSince(0);
      expect(fake.sinces[0]).toBe(0);
    });
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
    And('every later pull asked from the kept cursor, never from the start', async () => {
      const before = fake.sinces.length;
      await pulledSince(before, 2);
      expect(fake.sinces).toEqual([...fake.sinces].sort((a, b) => a - b));
      expect(fake.sinces.at(-1)).toBe(1);
    });
    And('the kept cursor is {number}', async (_, cursor: number) => {
      expect(await getRequestsCursor()).toBe(cursor);
    });
  });

  Scenario('A record already applied is not applied twice', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    And('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
    And('the phone\'s row for {string} is changed to building by hand', async (_, summary: string) => {
      await db.requests.update(txids.get(summary) as string, { status: 'building', statusAt: undefined });
    });
    Then('after another pull the request {string} still reads {string}', async (_, summary: string, line: string) => {
      await pulledSince(fake.sinces.length, 3);
      await readsAs(summary, line);
    });
  });

  Scenario('Opening the screen again goes on from the kept cursor', ({ Given, When, Then, And }) => {
    let before = 0;
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    And('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
    And('he leaves the screen and opens it again', async () => {
      cleanup();
      await new Promise((r) => setTimeout(r, 60));
      before = fake.sinces.length;
      render(<RequestsScreen />);
    });
    Then('the first pull of the new visit asked from the kept cursor', async () => {
      await pulledSince(before);
      expect(fake.sinces[before]).toBe(await getRequestsCursor());
      expect(fake.sinces[before]).toBeGreaterThan(0);
    });
  });

  Scenario('The pulling stops when he leaves the screen', ({ Given, When, Then }) => {
    let calls = 0;
    Given(open, (_, summary: string) => openWith([summary]));
    When('he leaves the screen', async () => {
      await pulledSince(0);
      cleanup();
      await new Promise((r) => setTimeout(r, 100));
      calls = fake.calls.length;
    });
    Then('the backend is not asked again', async () => {
      await new Promise((r) => setTimeout(r, 200));
      expect(fake.calls.length).toBe(calls);
    });
  });

  Scenario('Coming back to the app pulls at once, not at the next tick', ({ Given, When, Then, And }) => {
    let before = 0;
    Given('Your requests is open behind a fake Postern with the request {string}, pulling only once a minute', (_, summary: string) =>
      openWith([summary], 60_000),
    );
    And('the first pull has been made', async () => {
      await pulledSince(0);
      // let that pull end (it reads the empty page and writes nothing), so the next one is the visible page's
      await new Promise((r) => setTimeout(r, 100));
    });
    When('the phone hides Lampas', () => setHidden(true));
    And('the mill sends the status {string} for {string}', (_, status: string, summary: string) => {
      before = fake.sinces.length;
      sendStatus(summary, status);
    });
    And('the phone shows Lampas again', () => setHidden(false));
    Then('one pull is made at once', async () => {
      // the next tick is a minute away: only becoming visible can explain a pull now
      await pulledSince(before);
      await new Promise((r) => setTimeout(r, 200));
      // one pull reads pages until one is empty: the page with the record, then the empty page after it
      expect(fake.sinces.slice(before)).toEqual([0, 1]);
    });
    And('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('While the app is hidden the screen pulls nothing', ({ Given, When, Then, And }) => {
    let calls = 0;
    Given(open, (_, summary: string) => openWith([summary]));
    And('the first pull has been made', () => pulledSince(0));
    When('the phone hides Lampas', async () => {
      setHidden(true);
      // a pull already on its way when the page was hidden may end; none starts after it
      await new Promise((r) => setTimeout(r, 100));
      calls = fake.calls.length;
    });
    And('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
    Then('the backend is not asked while the app is hidden', async () => {
      await new Promise((r) => setTimeout(r, 300));
      expect(fake.calls.length).toBe(calls);
    });
    And('the request {string} still reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('With no request sent the screen says so', ({ Given, Then }) => {
    Given('Your requests is open behind a fake Postern with no request', () => openWith([]));
    Then('the screen says nothing has been sent yet', async () => {
      expect(await screen.findByText(/Nothing sent yet/)).toBeVisible();
    });
  });

  Scenario('The newest request is first', ({ Given, Then }) => {
    Given('Your requests is open behind a fake Postern with the requests {string} and {string}', (_, older: string, newer: string) => openWith([older, newer]));
    Then('{string} is listed above {string}', async (_, newer: string, older: string) => {
      await screen.findByText(newer);
      const rows = Array.from(document.querySelectorAll('[data-request]')).map((r) => r.textContent ?? '');
      expect(rows.findIndex((t) => t.includes(newer))).toBeLessThan(rows.findIndex((t) => t.includes(older)));
    });
  });

  Scenario('A backend that cannot be reached leaves the list as it was and says so', ({ Given, When, Then, And }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the backend goes down', () => {
      fake.down = true;
    });
    Then('the screen says it could not check for news', async () => {
      expect(await screen.findByRole('status')).toHaveTextContent(/Could not check for news/);
    });
    And('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('Settings has a Your requests row', ({ Given, When, Then }) => {
    Given('Settings is open', async () => {
      cleanup();
      window.localStorage.clear();
      window.location.hash = '#/settings';
      await db.open();
      await db.settings.clear();
      render(<SettingsScreen />);
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    When('he taps Your requests', async () => {
      await user.click(await screen.findByRole('button', { name: /^Your requests/ }));
    });
    Then('the Your requests screen is open', () => {
      expect(window.location.hash).toBe('#/requests');
    });
  });

  Scenario('About has a Your requests button', ({ Given, When, Then }) => {
    Given('About is open', async () => {
      cleanup();
      vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 404 })));
      window.location.hash = '#/about';
      await db.open();
      render(<About />);
      await screen.findByRole('heading', { name: 'About', level: 1 });
    });
    When('he taps Your requests', async () => {
      await user.click(await screen.findByRole('button', { name: /^Your requests/ }));
    });
    Then('the Your requests screen is open', () => {
      expect(window.location.hash).toBe('#/requests?from=about');
    });
  });

  // The screens behind the hash, as App picks them, so a back button really goes somewhere.
  function Screens() {
    const route = useRoute();
    return route === 'requests' ? <RequestsScreen /> : route === 'about' ? <About /> : <SettingsScreen />;
  }

  async function openFrom(hash: '#/about' | '#/settings'): Promise<void> {
    cleanup();
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 404 })));
    window.localStorage.clear();
    window.history.replaceState(null, '', `/${hash}`);
    await db.open();
    await db.settings.clear();
    render(<Screens />);
    await screen.findByRole('heading', { name: hash === '#/about' ? 'About' : 'Settings', level: 1 });
  }

  const headerButton = async (): Promise<HTMLElement> => {
    const header = (await screen.findByRole('heading', { name: 'Your requests', level: 1 })).closest('header') as HTMLElement;
    return header.querySelector('button') as HTMLElement;
  };

  Scenario('Opened from About, the back button goes back to About', ({ Given, When, Then, And }) => {
    Given('About is open', () => openFrom('#/about'));
    When('he taps Your requests', async () => {
      await user.click(await screen.findByRole('button', { name: /^Your requests/ }));
    });
    Then('the Your requests screen is open', () => {
      expect(window.location.hash).toBe('#/requests?from=about');
    });
    And('the header button reads {string}', async (_ctx, label: string) => {
      expect((await headerButton()).textContent).toBe(label);
    });
    When('he taps the header button', async () => {
      await user.click(await headerButton());
    });
    Then('About is open again', async () => {
      await screen.findByRole('heading', { name: 'About', level: 1 });
      expect(window.location.hash).toBe('#/about');
    });
  });

  Scenario('Opened from Settings, the back button goes back to Settings', ({ Given, When, Then }) => {
    Given('Settings is open', () => openFrom('#/settings'));
    When('he taps Your requests', async () => {
      await user.click(await screen.findByRole('button', { name: /^Your requests/ }));
    });
    Then('the header button reads {string}', async (_ctx, label: string) => {
      expect((await headerButton()).textContent).toBe(label);
    });
    When('he taps the header button', async () => {
      await user.click(await headerButton());
    });
    Then('Settings is open again', async () => {
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      expect(window.location.hash).toBe('#/settings');
    });
  });

  Scenario('A double tap on the Settings row adds one history entry', ({ Given, When, Then, And }) => {
    let before = 0;
    Given('Settings is open', async () => {
      // Settings alone, so the row is still under his finger for the second tap (the screen has not been drawn over it yet)
      await openFrom('#/settings');
      cleanup();
      render(<SettingsScreen />);
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    When('he double taps Your requests', async () => {
      before = window.history.length;
      const rowButton = await screen.findByRole('button', { name: /^Your requests/ });
      fireEvent.click(rowButton, { detail: 1 });
      fireEvent.click(rowButton, { detail: 2 });
    });
    Then('the Your requests screen is open', () => {
      expect(window.location.hash).toBe('#/requests');
    });
    And('one history entry was added', () => {
      expect(window.history.length).toBe(before + 1);
    });
  });

  Scenario('A double tap on the back button does not skip past Settings', ({ Given, When, Then, And }) => {
    Given('Settings is open', () => openFrom('#/settings'));
    When('he taps Your requests', async () => {
      await user.click(await screen.findByRole('button', { name: /^Your requests/ }));
    });
    And('he double taps the header button', async () => {
      // the first tap leaves for Settings; the second lands on whatever Settings draws at the same spot (its own back button)
      fireEvent.click(await headerButton(), { detail: 1 });
      const settingsBack = (await screen.findByRole('heading', { name: 'Settings', level: 1 })).closest('header')!.querySelector('button') as HTMLElement;
      fireEvent.click(settingsBack, { detail: 2 });
    });
    Then('Settings is open again', async () => {
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      expect(window.location.hash).toBe('#/settings');
    });
  });
});
