// features/steps/sermons-ask.steps.tsx — runs features/sermons-ask.feature: Ask for a preacher at the foot of the Sermons sheet (src/sermons/AskForPreacher.tsx), sending a 'feedback' grist
// (grinds/feedback.json) of the kind preacher through the one sender, proven against the fake Postern. The sermons are the tests' own (tests/support/test-sermons.ts); Romans 5 is the committed chapter.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceContext } from '../../src/gate/licenceContext';
import { forgetTrail } from '../../src/nav/lastRoute';
import { closeSermons } from '../../src/sermons/openSermons';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';
import { forgetTestSermons, registerTestSermons } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';
import '../../tests/support/grinds-in-graph';

afterAll(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestThemes();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const feedbackSchema = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
let fake: FakePostern;

/** Opens Romans 5, taps verse 8 and its Sermons door, behind a fake Postern that answers a feedback grist as the mill does; `licensed: false` is a phone with no licence. */
async function openSheet(licensed: boolean): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/?b=rom&c=5');
  tutorTimings.pollMs = 20;
  tutorTimings.contactLostMs = 0;
  registerTestSermons();
  registerTestThemes({ none: true });
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.requests.clear(), db.library.clear()]);
  render(
    licensed ? (
      <App />
    ) : (
      <LicenceContext.Provider value={{ licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => undefined }}>
        <App />
      </LicenceContext.Provider>
    ),
  );
  await screen.findByRole('heading', { name: 'Romans 5', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await user.click(await screen.findByRole('button', { name: 'Verse 8', exact: true }));
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(await within(view).findByRole('button', { name: /^Sermons · \d/ }));
  await screen.findByRole('dialog', { name: 'Sermons for Romans 5:8' });
}

const sermons = (): HTMLElement => screen.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
const form = (): HTMLElement => screen.getByRole('dialog', { name: 'Ask for a preacher' });
const sendButton = () => within(form()).getByRole('button', { name: /^Send/ });
const askRow = () => within(sermons()).getByRole('button', { name: /^Ask for a preacher/ });

const feature = await loadFeature('features/sermons-ask.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('He asks for a preacher from Romans 5:8 and the makers get his words with the verse and the sources', ({ Given, When, Then, And }) => {
    Given('Lampas is open on the Sermons sheet for {string} behind a fake Postern', () => openSheet(true));
    When('he taps {string}', async () => {
      await user.click(askRow());
      await screen.findByRole('dialog', { name: 'Ask for a preacher' });
    });
    Then('Send is disabled', () => {
      expect(sendButton()).toBeDisabled();
    });
    When('he types the preacher {string}, the reason {string} and the link {string}', async (_, name: string, why: string, link: string) => {
      await user.type(within(form()).getByRole('textbox', { name: 'Which preacher or collection?' }), name);
      await user.type(within(form()).getByRole('textbox', { name: 'Why would it help?' }), why);
      await user.type(within(form()).getByRole('textbox', { name: 'A link' }), link);
    });
    And('he taps Send', async () => {
      await user.click(sendButton());
    });
    Then('the mill received one feedback grist of kind preacher that names {string}, the verse {string} and the source {string}', async (_, name: string, verse: string, source: string) => {
      const grists = () => fake.received.filter((r) => r.grist.kind === 'feedback');
      await waitFor(() => expect(grists()).toHaveLength(1));
      expect(grists()[0].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
      const input = grists()[0].input as { kind: string; name: string; text: string; url: string; app_version: string };
      expect(validate(input, feedbackSchema)).toEqual([]);
      expect(input).toEqual({
        kind: 'preacher',
        name,
        text: `His Romans series\n\nHe was reading ${verse}.\nSermon sources On: ${source}.`,
        url: 'https://mljtrust.org',
        app_version: __APP_VERSION__,
      });
    });
    And('the form says {string}', async (_, words: string) => {
      expect(await within(form()).findByText(words)).toBeInTheDocument();
    });
    And('the phone keeps one request of kind preacher with the words {string}', async (_, words: string) => {
      await waitFor(async () => expect(await db.requests.count()).toBe(1));
      expect(await db.requests.toArray()).toEqual([expect.objectContaining({ txid: fake.txids[0], kind: 'preacher', text: words, status: 'sent' })]);
    });
  });

  Scenario('Without a licence the row is greyed and says it needs one', ({ Given, Then, And }) => {
    Given('Lampas is open on the Sermons sheet for {string} behind a fake Postern with no licence', () => openSheet(false));
    Then('the row {string} is disabled and says {string}', (_, row: string, says: string) => {
      const button = within(sermons()).getByRole('button', { name: new RegExp(`^${row}`) });
      expect(button).toBeDisabled();
      expect(button.textContent).toContain(says);
    });
    And('the mill has received no grist', () => {
      expect(fake.received).toHaveLength(0);
    });
  });
});
