// features/steps/feedback-offer.steps.tsx — runs features/feedback-offer.feature: an answer that carries a feedback_offer shows 'Send this to
// the makers' under it; the tap sends one 'feedback' grist (src/services/feedback.ts) and the turn says Sent. A fake Postern answers a talk with
// the tutor's answer and a feedback grist with {"status":"sent"} (kindReplies).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
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
const CONTROL = 'Ask the tutor about this screen';
const BUTTON = 'Send this to the makers';
const SUMMARY = 'He wants Lampas to work with the Olive Tree app.';
const OFFER_ANSWER = {
  answer: 'Lampas does not work with Olive Tree. I can pass your wish to the makers; I cannot promise they will build it.',
  words: [],
  feedback_offer: { summary: SUMMARY },
};
const feedbackSchema = JSON.parse(readFileSync('grinds/feedback.input.schema.json', 'utf8')) as Schema;
let fake: FakePostern;

async function openAt(address: string, offers: boolean): Promise<void> {
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
  fake.autoReply = { status: 'answered', answer: offers ? OFFER_ANSWER : TALK_ANSWER };
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  render(<App />);
  await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
}

const sheet = () => screen.getByRole('dialog', { name: /^(Ask the tutor: |Talk about )/ });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const taps = async () => {
  await user.click(await screen.findByRole('button', { name: CONTROL }));
};
async function send(question: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}
const offerButton = () => within(sheet()).queryByRole('button', { name: BUTTON });
const tapOffer = async () => {
  await user.click(await within(sheet()).findByRole('button', { name: BUTTON }));
};
const feedbackGrist = () => {
  const got = fake.received.find((g) => g.grist.kind === 'feedback');
  if (!got) throw new Error('the mill received no feedback grist');
  return got;
};
const closeSheet = async () => {
  await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
};
async function seesSent(): Promise<void> {
  const turn = await waitFor(() => {
    expect(turns()).toHaveLength(1);
    return turns()[0];
  });
  expect(await within(turn).findByText('Sent')).toBeInTheDocument();
  expect(within(turn).getByText('The answer will come back.')).toBeInTheDocument();
}

const feature = await loadFeature('features/feedback-offer.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('From a screen, an answer with an offer shows Send this to the makers and a tap sends one feedback grist', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', () => openAt('#/goal', true));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the button {string}', async (_, name: string) => {
      expect(name).toBe(BUTTON);
      expect(await within(sheet()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the mill received {int} grists for the lampas app, kind bible-talk', (_, count: number) => {
      expect(fake.received).toHaveLength(count);
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
    });
    When('he taps Send this to the makers', tapOffer);
    Then('the mill received {int} grists for the lampas app, the second of kind feedback', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(fake.received[1].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
    });
    And('the feedback grist carries his words {string}, the tutor\'s summary and the screen {string}', (_, words: string, name: string) => {
      expect(feedbackGrist().input).toMatchObject({ kind: 'tutor-ask', text: words, summary: SUMMARY, screen: name, reference: name, app_version: __APP_VERSION__ });
    });
    And('the feedback grist carries only fields the feedback input schema allows', () => {
      expect(validate(feedbackGrist().input, feedbackSchema)).toEqual([]);
    });
    And('the turn shows {string} and {string}', async () => {
      await seesSent();
    });
    And('the bus has heard feedback-sent for tutor-ask', async () => {
      await waitFor(() => expect(latest('feedback-sent')).toEqual({ kind: 'feedback-sent', feedback: 'tutor-ask' }));
    });
  });

  Scenario('An answer without an offer has no such button and nothing is sent by itself', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor does not offer feedback', () => openAt('#/goal', false));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows no button {string}', async () => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(offerButton()).toBeNull();
    });
    And('the mill received {int} grists for the lampas app, kind bible-talk', (_, count: number) => {
      expect(fake.received).toHaveLength(count);
    });
  });

  Scenario('In the Reader the offer is the same and names the verse', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Reader behind a fake Postern whose tutor offers feedback', async () => {
      await openAt('', true);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    When('he opens the Talk sheet on the chapter and sends {string}', async (_, question: string) => {
      await taps();
      await send(question);
    });
    And('he taps Send this to the makers', tapOffer);
    Then('the mill received {int} grists for the lampas app, the second of kind feedback', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(fake.received[1].grist).toMatchObject({ app: 'lampas', kind: 'feedback', v: '1' });
    });
    And('the feedback grist is for the screen {string} and the reference {string}', (_, name: string, reference: string) => {
      expect(feedbackGrist().input).toMatchObject({ kind: 'tutor-ask', screen: name, reference });
      expect(validate(feedbackGrist().input, feedbackSchema)).toEqual([]);
    });
    And('the turn shows {string} and {string}', async () => {
      await seesSent();
    });
  });

  Scenario('A mill that is down shows Could not reach the tutor and Retry, and Sent stays after the sheet is reopened', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on #/goal behind a fake Postern whose tutor offers feedback', () => openAt('#/goal', true));
    When('he taps the Ask the tutor control', taps);
    And('he sends {string}', (_, question: string) => send(question));
    And('the mill goes down and he taps Send this to the makers', async () => {
      await within(sheet()).findByRole('button', { name: BUTTON });
      fake.down = true;
      await user.click(within(sheet()).getByRole('button', { name: BUTTON }));
    });
    Then('the turn shows {string} and a Retry button', async (_, title: string) => {
      expect(await within(sheet()).findByText(title)).toBeInTheDocument();
      expect(within(turns()[0]).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    When('the mill is back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(turns()[0]).getByRole('button', { name: 'Retry' }));
    });
    Then('the turn shows {string} and {string}', async () => {
      await seesSent();
    });
    When('he closes the Talk sheet and opens it again', async () => {
      await closeSheet();
      await taps();
    });
    Then('the turn shows {string} and no button {string}', async () => {
      await seesSent();
      expect(offerButton()).toBeNull();
    });
  });
});
