// features/steps/unsent-draft.steps.tsx — runs features/unsent-draft.feature: a long question pasted into the Talk sheet's box or the Verse view's
// Ask the tutor and not sent is put back when the sheet is opened again, and gone once it is sent. Postern is a fake (tests/support/fake-postern.ts);
// a paste is user-event's paste, which hands the box the whole text at once.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { composerIn, messageBox, questionField } from '../../tests/support/composer';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { openTutor } from './open-tutor';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

/** A prayer of exactly `length` characters, in several paragraphs, ending in a full stop (a trailing space would be trimmed from what is sent). */
const prayer = (length: number): string => {
  const paragraph = 'Lord, guard me against envy, pride and anger, and make me patient with those I love. ';
  return Array.from({ length: Math.ceil(length / (paragraph.length + 1)) }, () => paragraph).join('\n').slice(0, length - 1) + '.';
};

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, ...TALK_ANSWER } };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.talks.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const talkField = () => within(sheet()).getByRole('textbox', { name: 'Your message' }) as HTMLTextAreaElement;
const talkSend = () => within(sheet()).getByRole('button', { name: 'Send' });
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const headingEl = (text: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
  if (!found) throw new Error(`no heading ${text}`);
  return found;
};

const feature = await loadFeature('features/unsent-draft.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = 'Lampas is opened on Romans 8 with a tutor behind a fake Postern';
  const openTalk = async () => {
    await openTutor();
    await screen.findByRole('dialog', { name: /^Talk about / });
    await messageBox(user, sheet());
  };
  const pasteIntoTalk = async (_: unknown, length: number) => {
    await user.click(talkField());
    await user.paste(prayer(length));
  };
  const talkHolds = (_: unknown, length: number) => expect(talkField().value).toBe(prayer(length));
  const pressBack = async () => {
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  };
  const tapHeading = async (_: unknown, text: string) => {
    await user.click(within(headingEl(text)).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const choose = async (_: unknown, action: string) => {
    await user.click(within(viewEl()).getByRole('button', { name: action, exact: true }));
  };
  const pasteIntoAsk = async (_: unknown, length: number) => {
    const box = await questionField(user, viewEl());
    await user.click(box);
    await user.paste(prayer(length));
  };
  const pasteIntoAskAndSend = async (_: unknown, length: number) => {
    await pasteIntoAsk(_, length);
    await user.click(within(composerIn(viewEl())).getByRole('button', { name: 'Send' }));
  };
  const askBox = () => within(composerIn(viewEl())).getByRole('textbox', { name: 'Your question' }) as HTMLTextAreaElement;
  const askHolds = async (_: unknown, length: number) => {
    await waitFor(() => expect(askBox().value).toBe(prayer(length)));
  };
  const receivedWhole = async (kind: string, length: number) => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind });
    expect(fake.received[0].input.question).toBe(prayer(length).trim());
  };
  const nothingSent = async () => {
    // give a send that should not happen the time to happen
    await new Promise((r) => setTimeout(r, 100));
    expect(fake.received).toHaveLength(0);
  };
  const talkClosed = async () => {
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
  };
  const verseViewClosed = async () => {
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
  };
  const tapDone = async () => {
    await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
    await talkClosed();
  };

  Scenario("A prayer in the Talk box is still there when Talk is opened again after Back", ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he opens the Talk sheet', openTalk);
    And("he pastes a prayer of {number} characters into the Talk sheet's message box", pasteIntoTalk);
    And('he presses Back', pressBack);
    Then('the Talk sheet is closed', talkClosed);
    When('he opens the Talk sheet again', openTalk);
    Then("the Talk sheet's message box holds all {number} characters", talkHolds);
    And('the mill received no grist', nothingSent);
  });

  Scenario('A prayer in the Talk box survives Done and is gone once it is sent', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he opens the Talk sheet', openTalk);
    And("he pastes a prayer of {number} characters into the Talk sheet's message box", pasteIntoTalk);
    And('he taps Done on the Talk sheet', tapDone);
    And('he opens the Talk sheet again', openTalk);
    Then("the Talk sheet's message box holds all {number} characters", talkHolds);
    When('he taps Send in the Talk sheet', async () => {
      await user.click(talkSend());
    });
    Then('the mill received one bible-talk grist whose question is the whole prayer of {number} characters', (_, length: number) => receivedWhole('bible-talk', length));
    When('he taps Done on the Talk sheet again', tapDone);
    And('he opens the Talk sheet a third time', openTalk);
    Then("the Talk sheet's message box is empty", () => expect(talkField().value).toBe(''));
  });

  Scenario('A prayer in Ask the tutor is still there when it is opened again after Back', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he pastes a prayer of {number} characters into the Ask the tutor box', pasteIntoAsk);
    And('he presses Back', pressBack);
    Then('the Verse view is closed', verseViewClosed);
    When('he taps the heading {string} again', tapHeading);
    And('he chooses {string} again', choose);
    Then('the Ask the tutor box holds all {number} characters', askHolds);
    And('the mill received no grist', nothingSent);
  });

  Scenario('A refused over-long question in Ask the tutor is still there when it is opened again', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he pastes a prayer of {number} characters into the Ask the tutor box and taps Send', pasteIntoAskAndSend);
    And('he presses Back', pressBack);
    And('he taps the heading {string} again', tapHeading);
    And('he chooses {string} again', choose);
    Then('the Ask the tutor box holds all {number} characters', askHolds);
  });

  Scenario('A prayer in Ask the tutor is gone once it is sent', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he pastes a prayer of {number} characters into the Ask the tutor box and taps Send', pasteIntoAskAndSend);
    Then('the mill received one bible-talk grist whose question is the whole prayer of {number} characters', (_, length: number) => receivedWhole('bible-talk', length));
    When('he presses Back', pressBack);
    And('he taps the heading {string} again', tapHeading);
    And('he chooses {string} again', choose);
    Then('the Ask the tutor box is empty', async () => {
      await new Promise((r) => setTimeout(r, 50));
      expect(within(composerIn(viewEl())).queryByRole('textbox', { name: 'Your question' })).toBeNull();
    });
  });
});
