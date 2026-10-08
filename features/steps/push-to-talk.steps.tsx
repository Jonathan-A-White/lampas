// features/steps/push-to-talk.steps.tsx — runs features/push-to-talk.feature: hold the Talk button (or a verse number) and
// speak, his words live in the sheet, sent on release. The phone's recogniser is a fake (tests/support/fake-recognizer.ts),
// Postern a fake (tests/support/fake-postern.ts), the press is user-event pointer input held for real time (the half
// second is the app's), speechSynthesis a fake engine where a scenario reads aloud.
import '@testing-library/react/dont-cleanup-after-each';
import { act, fireEvent, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, stubSpeech } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;

async function open(options: { recogniser?: boolean; speaks?: boolean } = {}): Promise<void> {
  const { recogniser = true, speaks = false } = options;
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  if (recogniser) stubRecognizer();
  FakeRecognizer.instances = [];
  if (speaks) stubSpeech([ENGLISH_VOICE]);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const talkButton = () => screen.getByRole('button', { name: 'Talk', exact: true });
const verseNumber = (n: number) => screen.getByRole('button', { name: `Verse ${n}`, exact: true });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const holdInSheet = () => within(sheet()).getByRole('button', { name: 'Hold to talk' });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const live = () => sheet().querySelector<HTMLElement>('[data-talk-live]');

async function pressDown(el: HTMLElement): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target: el, coords: AT });
}
async function letGo(el: HTMLElement, at = AT): Promise<void> {
  await user.pointer({ keys: '[/MouseLeft]', target: el, coords: at });
}
async function hold(el: HTMLElement): Promise<void> {
  await pressDown(el);
  await sleep(HOLD_MS);
}
const says = (...words: string[]) => act(() => words.forEach((w) => FakeRecognizer.last().say([result(w, false)])));

const expectOpenAndListening = (title: string, listening: boolean) => async () => {
  await screen.findByRole('dialog', { name: title });
  expect(within(sheet()).getByRole('heading', { name: title })).toBeInTheDocument();
  await waitFor(() => expect(FakeRecognizer.instances.length > 0 && FakeRecognizer.last().startFn.mock.calls.length > 0).toBe(listening));
  if (listening) expect(live()).not.toBeNull();
  else expect(live()).toBeNull();
};

const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};

const nothingSent = async () => {
  await sleep(150);
  expect(fake.received).toHaveLength(0);
  await waitFor(() => expect(live()).toBeNull());
  expect(sheet().querySelector('[data-talk-pending]')).toBeNull();
};

const feature = await loadFeature('features/push-to-talk.feature');

describeFeature(feature, ({ Scenario }) => {
  const withRecogniser = 'Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser';
  const mill = 'the mill received {int} grists for the lampas app, kind bible-talk';
  const millSteps = async (_: unknown, count: number) => {
    await waitFor(() => expect(fake.received).toHaveLength(count));
    for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
  };
  const grist = (_: unknown, reference: string, question: string) => {
    expect(received(0).input.reference).toBe(reference);
    expect(received(0).input.question).toBe(question);
  };

  Scenario('Holding Talk and saying a question sends it on release about the chapter', ({ Given, When, Then, And }) => {
    Given(withRecogniser, () => open());
    When('he holds the Talk button', () => hold(talkButton()));
    Then('the Talk sheet is open, titled {string}, and the phone is listening', (_, title: string) => expectOpenAndListening(title, true)());
    When('he says {string} and then {string}', (_, a: string, b: string) => says(a, b));
    Then('the sheet shows his words {string} while he holds', async (_, words: string) => {
      await waitFor(() => expect(live()).toHaveTextContent(words));
      expect(fake.received).toHaveLength(0);
    });
    When('he lets go of the Talk button', () => letGo(talkButton()));
    Then(mill, millSteps);
    And('the first grist carries the reference {string} and the question {string}', grist);
    And('the sheet shows the answer under his question', async () => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(turns()[0]).toHaveTextContent(TALK_ANSWER.answer);
    });
  });

  Scenario('Long-pressing verse 28 and speaking sends a turn about 8:28', ({ Given, When, Then, And }) => {
    Given(withRecogniser, () => open());
    When('he long-presses the number of verse {int}', (_, n: number) => hold(verseNumber(n)));
    Then('the Talk sheet is open, titled {string}, and the phone is listening', (_, title: string) => expectOpenAndListening(title, true)());
    When('he says {string}', (_, words: string) => says(words));
    And('he lets go of the number of verse {int}', (_, n: number) => letGo(verseNumber(n)));
    Then(mill, millSteps);
    And('the first grist carries the reference {string} and the question {string}', grist);
    And('verse {int} was not selected by the press', (_, n: number) => {
      expect(verseNumber(n)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('A tap under 500 ms only opens the sheet', ({ Given, When, Then, And }) => {
    Given(withRecogniser, () => open());
    When('he taps the Talk button quickly', () => user.click(talkButton()));
    Then('the Talk sheet is open, titled {string}, and the phone is not listening', (_, title: string) => expectOpenAndListening(title, false)());
    And('no recogniser was started', async () => {
      await sleep(HOLD_MS);
      expect(FakeRecognizer.instances).toHaveLength(0);
    });
  });

  Scenario('Pressing while a verse is being read stops the reading', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern, a recogniser and a phone that speaks English', () => open({ speaks: true }));
    And('verse {int} is being read aloud', async (_, n: number) => {
      await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${n}"]`) as HTMLElement).getByRole('button', { name: 'Hear the verse' }));
      expect(getReading().status).toBe('reading');
    });
    When('he presses the Talk button', () => pressDown(talkButton()));
    Then('the reading has stopped', () => expect(getReading().status).toBe('idle'));
    And('the Talk button has not yet opened the sheet', () => {
      expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull();
    });
  });

  Scenario('Sliding the finger off the button drops what he said', ({ Given, When, And, Then }) => {
    Given(withRecogniser, () => open());
    When('he holds the Talk button', () => hold(talkButton()));
    And('he says {string}', (_, words: string) => says(words));
    And('he slides his finger off the Talk button and lets go', async () => {
      const away = { clientX: 100, clientY: 500 };
      await user.pointer({ target: talkButton(), coords: away });
      await letGo(talkButton(), away);
    });
    Then('nothing was sent and the phone is not listening', nothingSent);
    And('the sheet shows no turns yet', () => expect(turns()).toHaveLength(0));
  });

  Scenario('The browser cancelling the press drops what he said', ({ Given, When, And, Then }) => {
    Given(withRecogniser, () => open());
    When('he holds the Talk button', () => hold(talkButton()));
    And('he says {string}', (_, words: string) => says(words));
    And('the browser cancels the press', () => act(() => void fireEvent.pointerCancel(talkButton())));
    Then('nothing was sent and the phone is not listening', nothingSent);
  });

  Scenario("The hold button in the sheet's composer listens at once and sends on release", ({ Given, When, And, Then }) => {
    Given(withRecogniser, () => open());
    When('he taps the Talk button quickly', () => user.click(talkButton()));
    And('he presses the hold-to-talk button in the sheet', async () => {
      await screen.findByRole('dialog', { name: /^Talk about / });
      await pressDown(holdInSheet());
    });
    Then('the phone is listening', async () => {
      await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
      expect(live()).not.toBeNull();
    });
    When('he says {string}', (_, words: string) => says(words));
    And('he lets go of the hold-to-talk button', () => letGo(holdInSheet()));
    Then(mill, millSteps);
    And('the first grist carries the reference {string} and the question {string}', grist);
  });

  Scenario('A phone that denies the microphone is told what to do, and the sheet stays usable', ({ Given, When, Then, And }) => {
    Given(withRecogniser, () => open());
    When('he holds the Talk button', () => hold(talkButton()));
    And('the phone refuses the microphone', () =>
      act(() => {
        FakeRecognizer.last().onerror?.({ error: 'not-allowed' });
        FakeRecognizer.last().onend?.();
      }),
    );
    Then('the sheet says the microphone is not allowed, with the steps in Settings', async () => {
      const alert = await within(sheet()).findByRole('alert');
      expect(alert).toHaveTextContent('The microphone is not allowed for Lampas');
      expect(alert).toHaveTextContent(/Settings.*Permissions.*Microphone.*Allow/);
    });
    And('nothing was sent and the phone is not listening', nothingSent);
    And('the typed field and Send are still there', () => {
      expect(within(sheet()).getByRole('textbox', { name: 'Your message' })).toBeEnabled();
      expect(within(sheet()).getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });
  });

  Scenario('Letting go with nothing heard says so and sends nothing', ({ Given, When, Then, And }) => {
    Given(withRecogniser, () => open());
    When('he holds the Talk button', () => hold(talkButton()));
    And('he lets go of the Talk button', () => letGo(talkButton()));
    Then('the sheet says {string}', async (_, words: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
    });
    And('nothing was sent and the phone is not listening', nothingSent);
  });

  Scenario('A phone with no recogniser falls back to the typed field', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern and no recogniser', () => open({ recogniser: false }));
    When('he holds the Talk button', () => hold(talkButton()));
    Then('the Talk sheet is open, titled {string}, and the phone is not listening', (_, title: string) => expectOpenAndListening(title, false)());
    And('the sheet says this phone cannot turn speech into text, and the typed field is focused', async () => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent('This phone cannot turn speech into text');
      await waitFor(() => expect(document.activeElement).toBe(within(sheet()).getByRole('textbox', { name: 'Your message' })));
    });
  });
});
