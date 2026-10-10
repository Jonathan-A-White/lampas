// features/steps/tutor-aloud.steps.tsx — runs features/tutor-aloud.feature: the tutor's responses (the reading check's verdict, the answer to Ask the
// tutor) read aloud by themselves, and the Settings switch that turns it off. speech synthesis is the honest fake of tests/support/fake-speech.ts,
// the Postern is tests/support/fake-postern.ts and the recorder tests/support/fake-recorder.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReadTutor } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { getReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse28 = chapter.verses.find((v) => v.n === 28);
if (!verse28) throw new Error('no verse 28');
const ENGLISH_28 = verse28.e.map((c) => c.t.trim()).join(' ');

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
const SWITCH = "Read the tutor's responses aloud";
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let fake: FakePostern;
let synth: FakeSynth;
/** everything the phone was asked to say, in order, once a response was heard to the end */
let said: { text: string; lang: string }[] = [];

async function open({ aloud, hash = '', reply }: { aloud: boolean; hash?: string; reply: 'reading' | 'answer' }): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = hash;
  stubRecorder();
  FakeRecorder.denied = false;
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: reply === 'reading' ? READING_ANSWER : SYNERGEI_ANSWER };
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  said = [];
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear(), db.answers.clear()]);
  if (!aloud) await setReadTutor('off');
  render(<App />);
  if (hash === '') {
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  }
}

async function openVerse28(action: 'Read it aloud' | 'Ask the tutor'): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28', exact: true });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view).getByRole('button', { name: action, exact: true }));
  await screen.findByRole('region', { name: action === 'Read it aloud' ? 'Reading check' : 'Ask the tutor' });
}

async function holdAndLetGo(): Promise<void> {
  FakeRecorder.durationMs = 2000;
  const bar = screen.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
}

const askBox = () => screen.getByRole('region', { name: 'Ask the tutor' });
async function ask(question: string): Promise<void> {
  await user.type(within(askBox()).getByRole('textbox', { name: 'Your question' }), question);
  await user.click(within(askBox()).getByRole('button', { name: 'Ask' }));
}

/** Waits for the speech to begin and lets every utterance run to its end, noting each as it was asked of the engine. */
async function hearAll(): Promise<void> {
  await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
  for (let i = 0; i < 60; i++) {
    if (!synth.speaking) await sleep(30);
    if (!synth.speaking) break;
    synth.finish();
    await sleep(5);
  }
  said = synth.spoken.map((u) => ({ text: u.text, lang: u.lang }));
}

const everything = () => said.map((s) => s.text).join(' ');
const stopped = async () => {
  await waitFor(() => expect(getReading().status).toBe('idle'));
  expect(synth.speaking).toBe(false);
  expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
};
const speaking = async () => {
  await waitFor(() => expect(synth.speaking).toBe(true));
  expect(getReading().status).toBe('reading');
};
const groupSwitch = async () => within(await screen.findByRole('group', { name: SWITCH }));

const feature = await loadFeature('features/tutor-aloud.feature');

describeFeature(feature, ({ Scenario }) => {
  const readOn = "Lampas is opened on Romans 8 with the tutor's responses read aloud";
  const readOpen = 'he opens the reading check of verse 28';
  const holdRead = 'he holds the bar for 2 seconds and lets go';
  const askFirst = 'he asks the tutor {string} about verse 28';
  const askIt = async (_: unknown, question: string) => {
    await openVerse28('Ask the tutor');
    await ask(question);
  };

  Scenario("The reading check's verdict is read aloud, every instruction in it, and not the verse", ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'reading' }));
    And(readOpen, () => openVerse28('Read it aloud'));
    When(holdRead, holdAndLetGo);
    Then('the phone says {string}', async (_, text: string) => {
      await hearAll();
      expect(everything()).toContain(text);
    });
    And('it says {string}', (_, text: string) => expect(everything()).toContain(text));
    And('it also says {string}', (_, text: string) => expect(everything()).toContain(text));
    And('it goes on to say {string}', (_, text: string) => expect(everything()).toContain(text));
    And('it says nothing of the verse or the chunks', () => {
      expect(everything()).not.toContain(ENGLISH_28.slice(0, 40));
      expect(everything()).not.toContain('to · geth');
      expect(everything()).not.toContain('pur · pose');
    });
  });

  Scenario("The tutor's answer to a question is read aloud, its Greek in the Greek voice", ({ Given, And, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'answer' }));
    And(askFirst, askIt);
    Then("the phone says the answer's English in the English voice and {string} in the Greek voice", async (_, greek: string) => {
      await hearAll();
      expect(said.filter((s) => s.lang === 'el-GR').map((s) => s.text)).toContain(greek);
      expect(said.filter((s) => s.lang === 'en-US').map((s) => s.text).join(' ')).toContain('present active indicative');
    });
  });

  Scenario('With the switch Off nothing is read aloud by itself', ({ Given, And, When, Then }) => {
    Given("Lampas is opened on Romans 8 with the tutor's responses not read aloud", () => open({ aloud: false, reply: 'reading' }));
    And(readOpen, () => openVerse28('Read it aloud'));
    When(holdRead, holdAndLetGo);
    Then('the verdict {string} is shown and nothing is spoken', async (_, heading: string) => {
      await waitFor(() => expect(screen.getByRole('region', { name: 'Reading check' })).toHaveTextContent(heading));
      await sleep(150);
      expect(synth.spoken).toHaveLength(0);
    });
    When('he asks the tutor {string} about verse 28 instead', async (_, question: string) => {
      fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
      await user.click(within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('button', { name: 'Ask the tutor', exact: true }));
      await screen.findByRole('region', { name: 'Ask the tutor' });
      await ask(question);
    });
    Then('the answer is shown and nothing is spoken', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-answers-for="28"] [data-answer]').length).toBe(1));
      await sleep(150);
      expect(synth.spoken).toHaveLength(0);
    });
  });

  Scenario('A new question stops the speech at once', ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'answer' }));
    And(askFirst, askIt);
    And('the phone is speaking the answer', speaking);
    When('he asks the tutor {string} a second question', async (_, question: string) => {
      fake.autoReply = undefined;
      await waitFor(() => expect(within(askBox()).getByRole('button', { name: 'Ask' })).toBeDisabled());
      await ask(question);
    });
    Then('the speech has stopped', stopped);
  });

  Scenario('Leaving the screen stops the speech at once', ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'reading' }));
    And(readOpen, () => openVerse28('Read it aloud'));
    And(holdRead, holdAndLetGo);
    And('the phone is speaking the verdict', speaking);
    When("he presses the phone's Back", async () => {
      act(() => window.history.back());
      await sleep(30);
    });
    Then('the speech has stopped', stopped);
  });

  Scenario('A tap on the response stops the speech at once', ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'answer' }));
    And(askFirst, askIt);
    And('the phone is speaking the answer', speaking);
    When('he taps the answer', async () => {
      await user.click(document.querySelector('[data-answer]') as HTMLElement);
    });
    Then('the speech has stopped', stopped);
  });

  Scenario('A tap on the verdict stops the speech at once', ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'reading' }));
    And(readOpen, () => openVerse28('Read it aloud'));
    And(holdRead, holdAndLetGo);
    And('the phone is speaking the verdict', speaking);
    When('he taps the verdict', async () => {
      await user.click(document.querySelector('[data-reading-result]') as HTMLElement);
    });
    Then('the speech has stopped', stopped);
  });

  Scenario("A tap on a flagged word's speaker while the verdict is read pauses the reading and says only the word", ({ Given, And, When, Then }) => {
    Given(readOn, () => open({ aloud: true, reply: 'reading' }));
    And(readOpen, () => openVerse28('Read it aloud'));
    And(holdRead, holdAndLetGo);
    And('the phone is speaking the verdict', speaking);
    When('he taps the speaker beside the flagged word {string}', async (_, word: string) => {
      const region = await screen.findByRole('region', { name: 'Reading check' });
      await user.click(within(region).getByRole('button', { name: `Hear ${word}`, exact: true }));
    });
    Then("the verdict's reading is paused, not ended", async () => {
      await waitFor(() => expect(getReading().status).toBe('paused'));
      expect(getReading().answer).not.toBeNull();
    });
    And('the phone says only {string} and not the tip or the note', (_, text: string) => {
      const last = synth.spoken[synth.spoken.length - 1];
      expect(last.text).toBe(text);
      expect(synth.speaking).toBe(true);
      expect(synth.since.map((u) => u.text)).toEqual([text]);
    });
  });

  Scenario('The tutor\'s answer read aloud shows the same bar as every reading', ({ Given, And, When, Then }) => {
    const speakingBar = () => screen.queryByRole('region', { name: 'Speaking' });
    const buttons = () => within(speakingBar() as HTMLElement).getAllByRole('button').map((b) => b.textContent);
    const onBar = (name: string) => user.click(within(speakingBar() as HTMLElement).getByRole('button', { name }));
    Given(readOn, () => open({ aloud: true, reply: 'answer' }));
    And(askFirst, askIt);
    And('the phone is speaking the answer', speaking);
    Then('the speaking bar shows Pause, Restart and Stop', () => expect(buttons()).toEqual(['Pause', 'Restart', 'Stop']));
    When('he taps Pause on the speaking bar', () => onBar('Pause'));
    Then('the speaking bar shows Resume, Restart and Stop', () => expect(buttons()).toEqual(['Resume', 'Restart', 'Stop']));
    When('he taps Stop on the speaking bar', () => onBar('Stop'));
    Then('the speech has stopped', stopped);
    And('there is no speaking bar', async () => {
      await waitFor(() => expect(speakingBar()).toBeNull());
    });
  });

  Scenario('Settings has the switch, On until he turns it Off, and it is kept', ({ Given, When, Then, And }) => {
    const settings = () => open({ aloud: true, hash: '#/settings', reply: 'answer' });
    Given('Lampas is opened on its Settings screen', settings);
    Then('{string} is On', async (_, name: string) => {
      expect(name).toBe(SWITCH);
      expect((await groupSwitch()).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
    });
    When('he turns {string} Off', async () => {
      await user.click((await groupSwitch()).getByRole('button', { name: 'Off' }));
    });
    Then('{string} is Off', async () => {
      await waitFor(async () => expect((await groupSwitch()).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true'));
    });
    And('the bus has heard the tutor is not read aloud', () => expect(latest('read-tutor-changed')?.readTutor).toBe('off'));
    When('he reopens Lampas on its Settings screen', async () => {
      cleanup();
      clearBus();
      render(<App />);
    });
    Then('{string} is still Off', async () => {
      await waitFor(async () => expect((await groupSwitch()).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true'));
    });
  });
});
