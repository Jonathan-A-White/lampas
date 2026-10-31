// features/steps/tutor-requests.steps.tsx — runs features/tutor-requests.feature: the requests he sent to the factory (src/data/repositories/requests.ts)
// ride in the bible-talk requests as `requests`, and the tutor's answer about them (a fake Postern's, as the grind is read by the mill)
// is shown, with the setting offer an adopted idea gets. The wire is read from the grist the fake mill opened.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { applyRequestStatus, keepRequest, type StatusRecord, type RequestStatus } from '../../src/data/repositories/requests';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { messageBox, typeQuestion } from '../../tests/support/composer';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { openTutor } from './open-tutor';

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

const txidOf = (summary: string): string => `direct:${Array.from(summary, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64)}`;

/** The wire's line for a table cell like 'version 0.1.86', 'reason because' or 'setting Settings > Theme'; '-' is none. */
function detailOf(detail: string): { field?: 'version' | 'reason' | 'setting'; value?: string } {
  const found = /^(version|reason|setting) (.+)$/.exec(detail);
  return found ? { field: found[1] as 'version' | 'reason' | 'setting', value: found[2] } : {};
}

async function resetApp(address: string): Promise<void> {
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
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear(), db.requests.clear()]);
}

/** Keeps one request as the factory has it: sent, then moved by the status record the mill would send. */
async function keepWith(summary: string, status: string, detail: string, sentAt: number): Promise<void> {
  const txid = txidOf(summary);
  await keepRequest({ txid, kind: 'tutor-ask', summary, app_version: '0.1.80', sentAt });
  if (status === 'sent') return;
  const { field, value } = detailOf(detail);
  const record: StatusRecord = { request: txid, status: status as RequestStatus, ts: sentAt + 1000, bead: 'mw-x.1', ...(field && value ? { [field]: value } : {}) };
  if (status === 'landed') Object.assign(record, { commit: '0123456789abcdef', url: 'https://github.com/Jonathan-A-White/lampas/commit/0123456789abcdef' });
  await applyRequestStatus(record);
}

async function openGoal(): Promise<void> {
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

const sheet = () => screen.getByRole('dialog', { name: /^(Ask the tutor: |Talk about )/ });

async function askFromGoal(question: string, answer: Record<string, unknown>): Promise<void> {
  fake.received.length = 0;
  fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, words: [], ...answer } };
  await openTutor();
  await user.type(await messageBox(user, sheet()), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

/** The `requests` of the one grist the mill opened, of the kind asked for. */
async function requestsSent(kind: string): Promise<{ summary: string; status: string; version?: string; reason?: string; setting?: string }[] | undefined> {
  await waitFor(() => expect(fake.received).toHaveLength(1));
  expect(fake.received[0].grist).toMatchObject({ kind });
  return fake.received[0].input.requests as never;
}

/** What the one request on the wire should read for a table row: the summary, the status and the one field that status carries. */
function expectOne(sent: Awaited<ReturnType<typeof requestsSent>>, summary: string, status: string, detail: string): void {
  const { field, value } = detailOf(detail);
  expect(sent).toEqual([{ summary, status, ...(field && value ? { [field]: value } : {}) }]);
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });

const feature = await loadFeature('features/tutor-requests.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  ScenarioOutline('The Bible talk is sent how his request stands, and shows the tutor\'s answer', ({ Given, When, Then, And }, row) => {
    Given('Lampas is opened on #/goal behind a fake Postern with the request {string} <status> <detail>', async (_, summary: string) => {
      await resetApp('#/goal');
      await keepWith(summary, row.status, row.detail, 1_780_000_000_000);
      await openGoal();
    });
    When('he asks the tutor about this screen {string} and the tutor answers "<reply>"', (_, question: string) => askFromGoal(question, { answer: row.reply }));
    Then('the grist carried 1 request, {string}, as <status> <detail>', async (_, summary: string) => {
      expectOne(await requestsSent('bible-talk'), summary, row.status, row.detail);
    });
    And('the Talk sheet shows the answer "<reply>"', async () => {
      expect(await within(sheet()).findByText(row.reply)).toBeInTheDocument();
    });
  });

  Scenario('The tutor offers to switch on an adopted setting and a tap does it', ({ Given, When, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern with the request {string} adopted-as-setting setting Settings > Appearance > Theme', async (_, summary: string) => {
      await resetApp('#/goal');
      await keepWith(summary, 'adopted-as-setting', 'setting Settings > Appearance > Theme', 1_780_000_000_000);
      await openGoal();
    });
    When('he asks the tutor about this screen {string} and the tutor answers {string} with the offer to change Theme to Dark', (_, question: string, answer: string) =>
      askFromGoal(question, { answer, setting_offer: { key: 'theme', value: 'dark' } }),
    );
    Then('the Talk sheet shows the offer {string}', async (_, text: string) => {
      expect(await within(sheet()).findByRole('button', { name: text })).toBeInTheDocument();
    });
    When('he taps the offer {string}', async (_, text: string) => {
      await user.click(within(sheet()).getByRole('button', { name: text }));
    });
    Then('the setting {string} is saved as {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('Only the 10 newest requests are sent, newest first', ({ Given, When, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern with {int} requests, {string} the oldest', async (_, count: number) => {
      await resetApp('#/goal');
      for (let i = 1; i <= count; i++) await keepWith(`Idea ${i}`, 'filed', '-', 1_780_000_000_000 + i * 60_000);
      await openGoal();
    });
    When('he asks the tutor about this screen {string} and the tutor answers {string}', (_, question: string, answer: string) => askFromGoal(question, { answer }));
    Then('the grist carried {int} requests, {string} first and {string} last', async (_, count: number, first: string, last: string) => {
      const sent = (await requestsSent('bible-talk')) ?? [];
      expect(sent).toHaveLength(count);
      expect(sent[0].summary).toBe(first);
      expect(sent[sent.length - 1].summary).toBe(last);
    });
  });

  Scenario('With no request kept the grist carries no requests', ({ Given, When, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern with {int} requests', async () => {
      await resetApp('#/goal');
      await openGoal();
    });
    When('he asks the tutor about this screen {string} and the tutor answers {string}', (_, question: string, answer: string) => askFromGoal(question, { answer }));
    Then('the grist carried no requests', async () => {
      await requestsSent('bible-talk');
      expect('requests' in fake.received[0].input).toBe(false);
    });
  });

  Scenario("The Verse view's Ask the tutor is sent his requests too", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen behind a fake Postern with the request {string} landed version 0.1.86', async (_, summary: string) => {
      await resetApp('#/');
      await keepWith(summary, 'landed', 'version 0.1.86', 1_780_000_000_000);
      await setReaderView('english');
      await setWeave('off');
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => h.textContent?.includes('Walking by the Spirit'));
      if (!heading) throw new Error('no heading');
      await user.click(within(heading).getByRole('button'));
      await screen.findByRole('region', { name: 'Verse view' });
      await user.click(within(viewEl()).getByRole('button', { name: 'Ask the tutor', exact: true }));
      await within(viewEl()).findByTestId('composer');
    });
    When('he asks {string} by the composer and the tutor answers {string}', async (_, question: string, answer: string) => {
      fake.received.length = 0;
      fake.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, answer, words: [] } };
      await typeQuestion(user, viewEl(), question);
    });
    Then('the bible-talk grist carried 1 request, {string}, as landed version 0.1.86', async (_, summary: string) => {
      expectOne(await requestsSent('bible-talk'), summary, 'landed', 'version 0.1.86');
    });
    And('the Talk sheet shows the answer {string}', async (_, text: string) => {
      const sheet = await screen.findByRole('dialog', { name: /^Talk about / });
      expect(await within(sheet).findByText(text)).toBeInTheDocument();
    });
  });
});
