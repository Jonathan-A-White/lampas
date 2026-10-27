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

type Seed = { kind: string; text: string; sentAt: number; words?: string };

async function openWith(summaries: string[], pollMs = 20): Promise<void> {
  let sentAt = 1_780_000_000_000;
  await openWithRows(summaries.map((summary) => ({ kind: 'tutor-ask', text: summary, sentAt: (sentAt += 60_000) })), pollMs);
}

/** Opens the screen over `seeds`: a tutor-ask keeps its words as the summary, every other kind as its text, as src/services/feedback.ts keeps them. */
async function openWithRows(seeds: Seed[], pollMs = 20): Promise<void> {
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
  for (const { kind, text, sentAt, words } of seeds) {
    txids.set(text, txidOf(text));
    await keepRequest({ txid: txidOf(text), kind, ...(kind === 'tutor-ask' ? { summary: text, ...(words ? { words } : {}) } : { text }), app_version: '0.1.80', sentAt });
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

// `<date>` in a line stands for the date the status was set, which reads by the locale
const readsAs = async (summary: string, line: string): Promise<void> => {
  const pattern = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('<date>', '.+');
  await waitFor(() => expect(lineOf(summary)).toHaveTextContent(new RegExp(`^${pattern}$`)));
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

const HIS_WORDS = 'Can the Greek be read to me at half speed, one tap, every time I open the app?';
const SUMMARY = 'He wants the Greek at half speed in one tap.';
const OLD_ASK = 'Add a sepia evening theme';
const feature = await loadFeature('features/your-requests.feature');

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  const open = 'Your requests is open behind a fake Postern with the request {string}';

  AfterEachScenario(() => {
    forgetVisibility();
  });

  Scenario('A request nobody has answered yet reads Sent', ({ Given, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A tap on any request opens it, and a second tap folds it again', ({ Given, When, Then }) => {
    // a folded row shows his words, not the summary, so the first ask is found by them
    const rowOf = (summary: string): HTMLElement => row(summary === SUMMARY ? HIS_WORDS : summary);
    const toggleOf = (summary: string): HTMLElement => rowOf(summary).querySelector('[data-request-toggle]') as HTMLElement;
    const wordsOf = (summary: string): HTMLElement => rowOf(summary).querySelector('[data-request-words]') as HTMLElement;
    const detailOf = (summary: string): HTMLElement | null => rowOf(summary).querySelector('[data-request-detail]');
    Given('Your requests is open with one ask that keeps his words and one kept before the phone kept them', async () => {
      await openWithRows([
        { kind: 'tutor-ask', text: SUMMARY, words: HIS_WORDS, sentAt: 1_780_000_060_000 },
        { kind: 'tutor-ask', text: OLD_ASK, sentAt: 1_780_000_000_000 },
      ]);
      await screen.findByText(HIS_WORDS);
    });
    Then('both requests are buttons, folded to three lines', () => {
      for (const summary of [SUMMARY, OLD_ASK]) {
        expect(toggleOf(summary)).toHaveAttribute('aria-expanded', 'false');
        expect(wordsOf(summary).className).toContain('line-clamp-3');
        expect(detailOf(summary)).toBeNull();
      }
      expect(wordsOf(SUMMARY)).toHaveTextContent(HIS_WORDS); // his words are the line, not the summary
    });
    When('he taps the ask that keeps his words', () => user.click(toggleOf(SUMMARY)));
    Then("it shows his words, the tutor's summary and the kind, and is open", () => {
      expect(toggleOf(SUMMARY)).toHaveAttribute('aria-expanded', 'true');
      expect(wordsOf(SUMMARY).className).not.toContain('line-clamp-3');
      expect(wordsOf(SUMMARY)).toHaveTextContent(HIS_WORDS);
      expect(detailOf(SUMMARY)).toHaveTextContent(SUMMARY);
      expect(rowOf(SUMMARY)).toHaveTextContent('Asked the tutor');
    });
    When('he taps it again', () => user.click(toggleOf(SUMMARY)));
    Then('it is folded to three lines and shows no summary of its own', () => {
      expect(toggleOf(SUMMARY)).toHaveAttribute('aria-expanded', 'false');
      expect(wordsOf(SUMMARY).className).toContain('line-clamp-3');
      expect(detailOf(SUMMARY)).toBeNull();
    });
    When('he taps the ask kept before', () => user.click(toggleOf(OLD_ASK)));
    Then("it shows its summary in full and no tutor's summary of its own", () => {
      expect(toggleOf(OLD_ASK)).toHaveAttribute('aria-expanded', 'true');
      expect(wordsOf(OLD_ASK)).toHaveTextContent(OLD_ASK);
      expect(wordsOf(OLD_ASK).className).not.toContain('line-clamp-3');
      expect(detailOf(OLD_ASK)?.textContent ?? '').not.toContain("The tutor's summary");
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
      const link = screen.getByRole('link', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('<date>', '.+')}$`) });
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

  Scenario('A request built another way reads Built another way with the reason', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string} because {string}', (_, status: string, summary: string, reason: string) =>
      sendStatus(summary, status, { reason }),
    );
    Then('the request {string} reads {string}', (_, summary: string, line: string) => readsAs(summary, line));
  });

  Scenario('A request moved into another story reads Now part of another story', ({ Given, When, Then }) => {
    Given(open, (_, summary: string) => openWith([summary]));
    When('the mill sends the status {string} for {string}', (_, status: string, summary: string) => sendStatus(summary, status));
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

  const T0 = 1_780_000_000_000;
  const LIBRARY_LINE = 'My Logos library: 198 of 4597 books';
  const BOOKS = ['Guzik on Romans', 'Wuest Word Studies', 'Robertson Word Pictures'];
  const mixed = (): Promise<void> =>
    openWithRows([
      ...BOOKS.map((text, i) => ({ kind: 'book', text, sentAt: T0 + (i + 1) * 60_000 })),
      { kind: 'library', text: LIBRARY_LINE, sentAt: T0 + 4 * 60_000 },
      { kind: 'tutor-ask', text: 'Add a sepia theme', sentAt: T0 + 5 * 60_000 },
      { kind: 'tutor-ask', text: 'Slow the Greek down', sentAt: T0 + 6 * 60_000 },
    ]);
  const headers = (): string[] => Array.from(document.querySelectorAll('[data-request-group] > h2')).map((h) => h.textContent ?? '');
  const groupOf = (title: string): HTMLElement => {
    const found = Array.from(document.querySelectorAll('[data-request-group]')).find((g) => g.querySelector('h2')?.textContent === title);
    if (!found) throw new Error(`no group ${title}`);
    return found as HTMLElement;
  };
  const texts = (parent: ParentNode): string[] => Array.from(parent.querySelectorAll('[data-request]')).map((r) => r.querySelector('[data-request-words]')?.textContent ?? '');
  const many = (count: number, books: number, bookName = (i: number) => `Book number ${i}`): Promise<void> =>
    openWithRows(
      Array.from({ length: count }, (_, i) =>
        i < books ? { kind: 'book', text: bookName(i), sentAt: T0 + i * 1000 } : { kind: 'tutor-ask', text: `Idea number ${i}`, sentAt: T0 + i * 1000 },
      ),
    );
  const search = (): HTMLElement | null => screen.queryByRole('searchbox');

  Scenario('Requests are grouped by kind, each group with its count, the newest first within a group', ({ Given, Then, And }) => {
    Given('Your requests is open with 3 books, 2 asks of the tutor and a library request', mixed);
    Then('the groups read {string}, {string} and {string}, the group holding the newest request first', async (_, a: string, b: string, c: string) => {
      await screen.findByText('Add a sepia theme');
      expect(headers()).toEqual([a, b, c]);
    });
    And('within {string} the newest book is listed first', (_, title: string) => {
      expect(texts(groupOf(title))).toEqual(['Robertson Word Pictures', 'Wuest Word Studies', 'Guzik on Romans']);
    });
  });

  Scenario('A library request is one row with its count', ({ Given, Then }) => {
    Given('Your requests is open with 3 books, 2 asks of the tutor and a library request', mixed);
    Then('the {string} group holds one row reading {string}', async (_, title: string, line: string) => {
      await screen.findByText(LIBRARY_LINE);
      expect(texts(groupOf(`${title} (1)`))).toEqual([line]);
    });
  });

  Scenario('Twenty requests show no search field', ({ Given, Then }) => {
    Given('Your requests is open with 20 requests', () => many(20, 5));
    Then('there is no search field', async () => {
      await screen.findByText('Idea number 19');
      expect(search()).toBeNull();
    });
  });

  Scenario('Twenty-one requests show a search field that filters by words', ({ Given, Then, When, And }) => {
    Given('Your requests is open with 21 requests, 14 of them books', () => many(21, 14, (i) => (i < 2 ? `Guzik volume ${i}` : `Book number ${i}`)));
    Then('there is a search field for 21 requests', async () => {
      const field = await screen.findByRole('searchbox', { name: 'Search your requests' });
      expect(field).toHaveAttribute('placeholder', 'Search 21 requests');
      expect(headers()).toEqual(['Asked the tutor (7)', 'Books (14)']);
    });
    When('he types {string} in the search field', async (_, words: string) => {
      const field = screen.getByRole('searchbox', { name: 'Search your requests' });
      await user.clear(field);
      await user.type(field, words);
    });
    Then('only the requests with {string} in them are listed', (_, words: string) => {
      expect(texts(document.body)).toEqual(['Guzik volume 1', 'Guzik volume 0']);
      expect(texts(document.body).every((t) => t.toLowerCase().includes(words))).toBe(true);
    });
    And('the group headers count what is shown', () => {
      expect(headers()).toEqual(['Books (2)']);
    });
    When('he clears it and types {string}', async (_, words: string) => {
      const field = screen.getByRole('searchbox', { name: 'Search your requests' });
      await user.clear(field);
      await user.type(field, words);
    });
    Then('the screen says no request matches', async () => {
      expect(await screen.findByText('No request matches')).toBeVisible();
      expect(document.querySelectorAll('[data-request]')).toHaveLength(0);
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
      window.location.hash = '#/settings?group=account';
      await db.open();
      await db.settings.clear();
      render(<SettingsScreen />);
      await screen.findByRole('heading', { name: 'Account', level: 1 });
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
    // Settings opens on the Account page, where Your requests is
    window.history.replaceState(null, '', hash === '#/about' ? `/${hash}` : `/${hash}?group=account`);
    await db.open();
    await db.settings.clear();
    render(<Screens />);
    await screen.findByRole('heading', { name: hash === '#/about' ? 'About' : 'Account', level: 1 });
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
      await screen.findByRole('heading', { name: 'Account', level: 1 });
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
