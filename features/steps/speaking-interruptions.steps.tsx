// features/steps/speaking-interruptions.steps.tsx — runs features/speaking-interruptions.feature: the speaking bar over the tutor's answer, and a word
// said, a hold on the Talk bar or a page that hides pausing the answer instead of ending it. speech synthesis is bsv-kit's honest fake
// (tests/support/fake-speech.ts), the Postern the fake of tests/support/fake-postern.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let fake: FakePostern;
let synth: FakeSynth;

const SENTENCES = ['The first sentence of the answer.', 'The Hebrew word צֶדֶק (tsedeq) means right.', 'The last sentence of the answer.'];
/** what the English voice is given of the second sentence: the Hebrew letters are for his eyes */
const SECOND = 'The Hebrew word (tsedeq) means right.';
const ANSWER = { answer: SENTENCES.join(' '), words: [] };

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const speakingBar = () => screen.queryByRole('region', { name: 'Speaking' });
const barButtons = () => within(speakingBar() as HTMLElement).getAllByRole('button').map((b) => b.textContent);
const onBar = (name: string) => user.click(within(speakingBar() as HTMLElement).getByRole('button', { name }));

async function reset(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE]);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function sendMessage(text: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), text);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

async function openAnswerBeingRead(): Promise<void> {
  await reset();
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
  await sendMessage('Where does righteousness come from?');
  await waitFor(() => expect(sheet().querySelector('[data-turn] [lang="he"]')).not.toBeNull());
  await waitFor(() => expect(synth.speaking).toBe(true));
}

const hebrewWord = (word: string): HTMLElement => {
  const span = Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn] [lang="he"]')).find((s) => s.textContent === word);
  const button = span?.closest('button');
  if (!button) throw new Error(`no Hebrew word button ${word}`);
  return button;
};

/** the text of the utterances asked of the phone from `from` on */
const spokenFrom = (from: number): string[] => synth.spoken.slice(from).map((u) => u.text);

const feature = await loadFeature('features/speaking-interruptions.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = "Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud";
  const firstDone = 'the phone has finished the first sentence';
  const finishFirst = () => {
    synth.finish();
  };
  const playing = 'the speaking bar shows Pause, Restart and Stop';
  const paused = 'the speaking bar shows Resume, Restart and Stop';
  const showsPlaying = () => expect(barButtons()).toEqual(['Pause', 'Restart', 'Stop']);
  const showsPaused = () => expect(barButtons()).toEqual(['Resume', 'Restart', 'Stop']);
  let mark = 0;
  const tapOnBar = (name: string) => async () => {
    mark = synth.spoken.length;
    await onBar(name);
  };
  const onFromSecond = () => {
    expect(spokenFrom(mark)).toEqual([SECOND, SENTENCES[2]]);
  };
  const stoppedAll = async () => {
    await waitFor(() => expect(getReading().status).toBe('idle'));
    expect(synth.speaking).toBe(false);
    expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
  };
  const notEnded = () => {
    expect(getReading().status).toBe('paused');
    expect(getReading().answer).not.toBeNull();
  };

  Scenario("The tutor's answer has Pause, Restart and Stop; Resume goes on from the sentence it stopped in", ({ Given, And, When, Then }) => {
    Given(opened, openAnswerBeingRead);
    And(firstDone, finishFirst);
    When('he taps Pause on the speaking bar', () => onBar('Pause'));
    Then(paused, showsPaused);
    When('he taps Resume on the speaking bar', tapOnBar('Resume'));
    Then('the phone speaks the answer on from its second sentence', onFromSecond);
    And(playing, showsPlaying);
  });

  Scenario('Restart speaks the answer from the first sentence', ({ Given, And, When, Then }) => {
    Given(opened, openAnswerBeingRead);
    And(firstDone, finishFirst);
    When('he taps Restart on the speaking bar', tapOnBar('Restart'));
    Then('the phone speaks the answer again from its first sentence', () => {
      expect(spokenFrom(mark)[0]).toBe(SENTENCES[0]);
      expect(spokenFrom(mark)).toEqual([SENTENCES[0], SECOND, SENTENCES[2]]);
    });
  });

  Scenario('Stop ends the answer and the bar goes away', ({ Given, When, Then, And }) => {
    Given(opened, openAnswerBeingRead);
    When('he taps Stop on the speaking bar', () => onBar('Stop'));
    Then('the phone has stopped speaking', stoppedAll);
    And('there is no speaking bar', async () => {
      await waitFor(() => expect(speakingBar()).toBeNull());
    });
  });

  Scenario('Tapping a Hebrew word pauses the answer, says the word, and Resume goes on from the interrupted sentence', ({ Given, And, When, Then }) => {
    Given(opened, openAnswerBeingRead);
    And(firstDone, finishFirst);
    When('he taps the Hebrew word {string}', async (_, word: string) => {
      mark = synth.spoken.length;
      await user.click(hebrewWord(word));
    });
    Then('the phone says {string} in {string}', (_, text: string, lang: string) => {
      expect(synth.since.map((u) => ({ text: u.text, lang: u.lang }))).toEqual([{ text, lang }]);
    });
    And('the answer is paused, not ended', notEnded);
    And(paused, showsPaused);
    When('he taps Resume on the speaking bar', async () => {
      synth.finishAll();
      mark = synth.spoken.length;
      await onBar('Resume');
    });
    Then('the phone speaks the answer on from its second sentence', onFromSecond);
  });

  Scenario('Holding the Talk bar to speak pauses the answer', ({ Given, When, Then }) => {
    Given(opened, openAnswerBeingRead);
    When("he holds the sheet's Hold to talk bar", async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: within(sheet()).getByRole('button', { name: 'Hold to talk' }), coords: AT });
      await sleep(100);
    });
    Then('the answer is paused, not ended', notEnded);
  });

  Scenario('A page that hides pauses the answer and coming back offers Resume at the same place', ({ Given, And, When, Then }) => {
    Given(opened, openAnswerBeingRead);
    And(firstDone, finishFirst);
    When('the page goes hidden and comes back', () => {
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      });
    });
    Then('the answer is paused, not ended', notEnded);
    And(paused, showsPaused);
    When('he taps Resume on the speaking bar', tapOnBar('Resume'));
    Then('the phone speaks the answer on from its second sentence', onFromSecond);
  });

  Scenario('A new question still ends the answer', ({ Given, When, Then, And }) => {
    Given(opened, openAnswerBeingRead);
    When('he sends another message to the tutor', async () => {
      fake.autoReply = undefined;
      await sendMessage('And what is its lemma?');
    });
    Then('the phone has stopped speaking', stoppedAll);
    And('there is no speaking bar', async () => {
      await waitFor(() => expect(speakingBar()).toBeNull());
    });
  });

  Scenario('Reading the chapter has the same Pause, Restart and Stop', ({ Given, Then, When }) => {
    Given("Lampas is opened on a phone with a Hebrew voice, and the chapter is being read from the top", async () => {
      await reset();
      await user.click(screen.getByRole('button', { name: 'Read from the top' }));
    });
    Then(playing, showsPlaying);
    When('he taps Stop on the speaking bar', () => onBar('Stop'));
    Then('there is no speaking bar', async () => {
      await waitFor(() => expect(speakingBar()).toBeNull());
    });
  });
});
