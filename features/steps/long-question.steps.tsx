// features/steps/long-question.steps.tsx — runs features/long-question.feature: a long question pasted into the Talk sheet's box or the Verse view's
// Ask the tutor is kept whole, sent whole up to 4000 characters, and past that stays in the box with the reason it cannot go. Postern is a fake
// (tests/support/fake-postern.ts); a paste is user-event's paste, which hands the box the whole text at once.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
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

const feature = await loadFeature('features/long-question.feature');

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
    await user.click(within(composerIn(viewEl())).getByRole('button', { name: 'Send' }));
  };
  const askHolds = (_: unknown, length: number) =>
    expect((within(composerIn(viewEl())).getByRole('textbox', { name: 'Your question' }) as HTMLTextAreaElement).value).toBe(prayer(length));
  const receivedWhole = async (kind: string, length: number) => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind });
    const question = fake.received[0].input.question as string;
    expect(question.length).toBe(prayer(length).trim().length);
    expect(question).toBe(prayer(length).trim());
  };
  const nothingSent = async () => {
    // give a send that should not happen the time to happen
    await new Promise((r) => setTimeout(r, 100));
    expect(fake.received).toHaveLength(0);
  };

  Scenario('A 3000-character prayer pasted into Talk is sent whole', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he opens the Talk sheet', openTalk);
    And("he pastes a prayer of {number} characters into the Talk sheet's message box", pasteIntoTalk);
    Then("the Talk sheet's message box holds all {number} characters", talkHolds);
    When('he taps Send in the Talk sheet', async () => {
      await user.click(talkSend());
    });
    Then('the mill received one bible-talk grist whose question is the whole prayer of {number} characters', (_, length: number) => receivedWhole('bible-talk', length));
  });

  Scenario('A 4500-character prayer pasted into Talk is kept, counted in the warning colour and not sent', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he opens the Talk sheet', openTalk);
    And("he pastes a prayer of {number} characters into the Talk sheet's message box", pasteIntoTalk);
    Then("the Talk sheet's message box holds all {number} characters", talkHolds);
    And('the Talk sheet shows {string} in the warning colour', (_, count: string) => {
      const shown = within(sheet()).getByText(count, { exact: false });
      expect(shown.className).toMatch(/\btext-bad\b/);
    });
    And("the Talk sheet's Send is off and says the question is too long", () => {
      expect(talkSend()).toBeDisabled();
      const why = talkSend().getAttribute('aria-describedby');
      expect(why).toBeTruthy();
      expect(document.getElementById(why as string)).toHaveTextContent(/too long/i);
    });
    And('the mill received no grist', nothingSent);
  });

  Scenario('A 3000-character prayer pasted into Ask the tutor is sent whole', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he pastes a prayer of {number} characters into the Ask the tutor box and taps Send', pasteIntoAsk);
    Then('the mill received one bible-talk grist whose question is the whole prayer of {number} characters', (_, length: number) => receivedWhole('bible-talk', length));
  });

  Scenario('A 4500-character prayer pasted into Ask the tutor is kept and not sent', ({ Given, When, Then, And }) => {
    Given(opened, open);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he pastes a prayer of {number} characters into the Ask the tutor box and taps Send', pasteIntoAsk);
    Then('the Ask the tutor box holds all {number} characters', askHolds);
    And('Ask the tutor says {string} and that the question is too long', async (_, count: string) => {
      const note = await within(composerIn(viewEl())).findByRole('alert');
      expect(note).toHaveTextContent(count);
      expect(note).toHaveTextContent(/too long/i);
    });
    And('the mill received no grist', nothingSent);
  });
});
