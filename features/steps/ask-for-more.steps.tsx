// features/steps/ask-for-more.steps.tsx — runs features/ask-for-more.feature: Settings > More > Ask for more, the page that leads with Ask the tutor
// (a talk opened with the ask begun in its composer) and offers a short form for each kind of ask that grows the app, each sending one
// 'feedback' grist (grinds/feedback.json), proven in the whole app against the fake Postern.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { LicenceContext } from '../../src/gate/licenceContext';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openRequests } from '../../src/nav/route';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
/** The four asks under Or fill in a form: three are forms, and A study resource opens Ask for a book (features/ask-for-book.feature). */
const KINDS = ['An approach or programme', 'A study resource', 'A text', 'A translation'];
const feedbackSchema = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
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
  await Promise.all([db.meta.clear(), db.settings.clear(), db.talks.clear(), db.requests.clear()]);
  const unlicensed = { licence: 'not-licensed' as const, locked: null, publicKeyHex: '', checkAgain: () => {} };
  render(licensed ? <App /> : <LicenceContext.Provider value={unlicensed}><App /></LicenceContext.Provider>);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

async function openPage(): Promise<void> {
  await openAt('#/askmore');
  await screen.findByRole('heading', { name: 'Ask for more', level: 1 });
}

const form = (name: string) => screen.getByRole('form', { name });
let opened = '';
const send = () => within(form(opened)).getByRole('button', { name: /^(Send|Retry)$/ });
/** The form's fields in screen order: what he wants, why, and the link. */
const fields = () => within(form(opened)).getAllByRole('textbox');

async function openForm(name: string): Promise<void> {
  opened = name;
  await user.click(await screen.findByRole('button', { name }));
  await screen.findByRole('form', { name });
}

async function fillIn(name: string, why: string, link: string): Promise<void> {
  const [what, reason, url] = fields();
  await user.type(what, name);
  await user.type(reason, why);
  expect(url).toHaveAccessibleName('Link');
  await user.type(url, link);
}

const tapSend = async () => {
  await user.click(send());
};
const says = async (_: unknown, line: string) => {
  expect(await within(form(opened)).findByText(line)).toBeInTheDocument();
};

const OFFER_ANSWER = {
  answer: 'Lampas does not have that. I can pass your wish to the makers; I cannot promise they will build it.',
  words: [],
  feedback_offer: { summary: 'He wants Lampas to have the Polis method.' },
};

const feature = await loadFeature('features/ask-for-more.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
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
    And('under it {string} offers the four asks', (_, heading: string) => {
      const main = screen.getByRole('main');
      const kinds = within(main).getAllByRole('button').slice(1);
      const title = within(main).getByRole('heading', { name: heading });
      expect(title.compareDocumentPosition(within(main).getByRole('button', { name: 'Ask the tutor' })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
      expect(kinds).toHaveLength(KINDS.length);
      kinds.forEach((button, i) => {
        expect(button).toHaveAccessibleName(KINDS[i]);
        expect(title.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });
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

  ScenarioOutline('Each form sends one feedback grist with its kind and fields', ({ Given, When, Then, And }, row) => {
    Given('the Ask for more page is open in the app', openPage);
    When('he opens the form "<form>"', () => openForm(row.form));
    Then('its Send button is disabled', () => {
      expect(send()).toBeDisabled();
    });
    When('he fills in the name "<name>", the reason "<why>" and the link "<link>"', () => fillIn(row.name, row.why, row.link));
    And('he taps Send on the form', tapSend);
    Then('the form says "Sent: the factory has it"', () => says(undefined, 'Sent: the factory has it'));
    And('the mill received one feedback grist of kind "<kind>" with the name "<name>", the reason "<why>", the link "https://<link>" and the app version', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
      const input = fake.received[0].input;
      expect(input).toEqual({ kind: row.kind, name: row.name, text: row.why, url: `https://${row.link}`, app_version: __APP_VERSION__ });
      expect(validate(input, feedbackSchema)).toEqual([]);
    });
    And('the bus has heard feedback-sent for "<kind>"', async () => {
      await waitFor(() => expect(latest('feedback-sent')).toEqual({ kind: 'feedback-sent', feedback: row.kind }));
    });
    And('the phone keeps one request of kind "<kind>" with the words "<name>: <why>"', async () => {
      await waitFor(async () => expect(await db.requests.toArray()).toHaveLength(1));
      const [kept] = await db.requests.toArray();
      expect(kept).toMatchObject({ txid: fake.txids[0], kind: row.kind, text: `${row.name}: ${row.why}`, status: 'sent' });
    });
    And('Your requests lists it as "<label>"', async () => {
      act(() => openRequests('settings'));
      await screen.findByRole('heading', { name: 'Your requests', level: 1 });
      expect(await screen.findByText(new RegExp(`^${row.label} · `))).toBeInTheDocument();
      expect(screen.getByText(`${row.name}: ${row.why}`)).toBeInTheDocument();
    });
  });

  Scenario('A form sends with the name alone', ({ Given, When, And, Then }) => {
    Given('the Ask for more page is open in the app', openPage);
    When('he opens the form {string}', (_, name: string) => openForm(name));
    And('he types only the name {string}', async (_, name: string) => {
      await user.type(fields()[0], name);
    });
    And('he taps Send on the form', tapSend);
    Then('the mill received one feedback grist of kind {string} with the name {string} alone and the app version', async (_, kind: string, name: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      const input = fake.received[0].input;
      expect(input).toEqual({ kind, name, app_version: __APP_VERSION__ });
      expect(validate(input, feedbackSchema)).toEqual([]);
    });
  });

  Scenario('A mill that is down shows Could not reach the tutor and Retry', ({ Given, When, And, Then }) => {
    Given('the Ask for more page is open in the app and the mill is down', async () => {
      await openPage();
      fake.down = true;
    });
    When('he opens the form {string}', (_, name: string) => openForm(name));
    And('he types only the name {string}', async (_, name: string) => {
      await user.type(fields()[0], name);
    });
    And('he taps Send on the form', tapSend);
    Then('the form shows {string} and a Retry button', async (_, title: string) => {
      expect(await within(form(opened)).findByText(title)).toBeInTheDocument();
      expect(within(form(opened)).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    When('the mill is back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(form(opened)).getByRole('button', { name: 'Retry' }));
    });
    Then('the form says {string}', says);
  });

  Scenario('With no licence the page says asking needs one, and offers no tutor and no form', ({ Given, Then, And }) => {
    Given('the Ask for more page is open on a phone with no licence', async () => {
      await openAt('#/askmore', false);
      await screen.findByRole('heading', { name: 'Ask for more', level: 1 });
    });
    Then('the page shows {string}', (_, label: string) => {
      expect(within(screen.getByRole('main')).getByRole('button', { name: label })).toBeInTheDocument();
    });
    And('it has no {string} button and no form', (_, label: string) => {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
      for (const kind of KINDS) expect(screen.queryByRole('button', { name: kind })).toBeNull();
    });
  });
});
