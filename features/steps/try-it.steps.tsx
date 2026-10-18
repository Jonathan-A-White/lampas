// features/steps/try-it.steps.tsx — runs features/try-it.feature: the Try it step of a Hard sounds lesson (src/hardSounds/TryIt.tsx). The recorder is the
// one Read it aloud uses, replaced at its seam by tests/support/fake-recorder.ts; the audio element, the object URLs and the Greek voice are the honest fakes.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { chooseAccent, DEFAULT_ACCENT } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubAudio, type FakeAudio } from '../../tests/support/fake-audio';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { asSpoken } from '../../tests/support/spoken-word';

const user = userEvent.setup();
const AT = { clientX: 100, clientY: 700 };
/** The bytes FakeRecorder's clip holds. */
const CLIP_BYTES = [1, 2, 3, 4, 5, 6, 7, 8];
/** The tapped r lesson's Try it step is its fifth (from 0: 4). */
const TRY_STEP = 4;

let synth: FakeSynth;
let audio: FakeAudio;
/** Object URLs made from blobs, by URL, and the ones let go. */
const urls = new Map<string, Blob>();
let revoked: string[] = [];
let urlCount = 0;
/** What the Greek voice had been handed when each clip began to play. */
let spokenAtPlay: number[] = [];
let fetched: string[] = [];
/** How many requests had been made when he began to hold. */
let fetchedBefore = 0;

afterAll(() => {
  cleanup();
  stopSpeaking();
  chooseAccent(DEFAULT_ACCENT);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  db.close();
});

const bytesOf = (blob: Blob): Promise<number[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

/** Whether a stored value holds a recording: a Blob, bytes, or a clip's mime. */
const holdsClip = (value: unknown): boolean =>
  value instanceof Blob || value instanceof ArrayBuffer || ArrayBuffer.isView(value) || (typeof value === 'string' && value.startsWith('audio/')) ||
  (typeof value === 'object' && value !== null && Object.values(value).some(holdsClip));

/** Opens the app on a lesson's step with every store emptied, the recorder faked and, with `denied`, the microphone turned off. */
async function open(title: string, denied = false): Promise<void> {
  expect(title).toBe('The tapped r');
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  fetched = [];
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    fetched.push(String(input));
    return chapterFetch(input, init);
  });
  audio = stubAudio();
  spokenAtPlay = [];
  audio.onPlay = () => spokenAtPlay.push(synth.spoken.length);
  urls.clear();
  revoked = [];
  urlCount = 0;
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    const url = `blob:lampas-test/${++urlCount}`;
    urls.set(url, blob as Blob);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
  stubRecorder();
  FakeRecorder.denied = denied;
  localStorage.clear();
  chooseAccent(DEFAULT_ACCENT);
  window.history.replaceState(null, '', `/#/sounds?l=tapped-r&s=${TRY_STEP}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  render(<App />);
  const lesson = await screen.findByTestId('sound-lesson');
  expect(within(lesson).getByRole('heading', { level: 2 })).toHaveTextContent('Try it');
}

const lesson = () => screen.getByTestId('sound-lesson');
const status = () => screen.getByTestId('try-status');

/** Holds the bar to say `word` for `seconds` (the fake recorder says the clip lasted that long), then lets go. */
async function holdsToSay(word: string, seconds: number): Promise<void> {
  FakeRecorder.durationMs = seconds * 1000;
  fetchedBefore = fetched.length;
  await user.click(within(lesson()).getByRole('button', { name: `Say ${word}`, exact: true }));
  const bar = within(lesson()).getByRole('button', { name: `Hold to say ${word}`, exact: true });
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
}

const feature = await loadFeature('features/try-it.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('He holds to say a word, then hears his try and the Greek voice, and Again', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the {string} step of the lesson {string}', async (_, __: string, title: string) => {
      await open(title);
    });
    When('he holds the bar to say {string} for {number} seconds', (_, word: string, seconds: number) => holdsToSay(word, seconds));
    Then('he hears his try, a clip that holds the recording', async () => {
      await waitFor(() => expect(audio.played).toHaveLength(1));
      expect(audio.played[0]).toMatch(/^blob:/);
      const blob = urls.get(audio.played[0]);
      expect(blob?.type).toBe('audio/webm');
      expect(await bytesOf(blob as Blob)).toEqual(CLIP_BYTES);
      expect(synth.spoken).toHaveLength(0);
      expect(status()).toHaveTextContent('Your try');
    });
    When('his try ends', () => {
      audio.end();
    });
    Then('the Greek voice is handed {string} after his try', async (_, word: string) => {
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual([asSpoken(word)]));
      expect(synth.spoken[0].lang).toBe('el-GR');
      expect(spokenAtPlay).toEqual([0]);
    });
    And('the step says {string}', async (_, text: string) => {
      await waitFor(() => expect(status()).toHaveTextContent(text));
    });
    When('he taps {string}', async (_, name: string) => {
      synth.finishAll();
      await user.click(await within(lesson()).findByRole('button', { name, exact: true }));
    });
    Then('he hears his try again, then the Greek voice again', async () => {
      await waitFor(() => expect(audio.played).toHaveLength(2));
      expect(audio.played[1]).toBe(audio.played[0]);
      expect(synth.spoken).toHaveLength(1);
      audio.end();
      await waitFor(() => expect(synth.spoken).toHaveLength(2));
      expect(synth.spoken[1].text).toBe(synth.spoken[0].text);
    });
  });

  Scenario('Nothing leaves the device, and the recording is dropped when the step closes', ({ Given, When, Then }) => {
    Given('Lampas is opened on the {string} step of the lesson {string}', async (_, __: string, title: string) => {
      await open(title);
    });
    When('he holds the bar to say {string} for {number} seconds', (_, word: string, seconds: number) => holdsToSay(word, seconds));
    Then('nothing was sent from the phone and nothing of the recording is kept', async () => {
      await waitFor(() => expect(audio.played).toHaveLength(1));
      expect(fetched.slice(fetchedBefore)).toEqual([]);
      for (const table of db.tables) expect((await table.toArray()).some(holdsClip), `table ${table.name}`).toBe(false);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(lesson()).getByRole('button', { name, exact: true }));
    });
    Then('his try is dropped: its sound stopped and its address let go', async () => {
      await screen.findByRole('heading', { name: 'Read a verse', level: 2 });
      await waitFor(() => expect(revoked).toEqual([audio.played[0]]));
      expect(audio.playing()).toBeNull();
    });
  });

  Scenario('A microphone that is turned off says so, and the Greek voice still plays', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the {string} step of the lesson {string} with the microphone turned off', async (_, __: string, title: string) => {
      await open(title, true);
    });
    When('he holds the bar to say {string} for {number} seconds', (_, word: string, seconds: number) => holdsToSay(word, seconds));
    Then('the step says the microphone is turned off', async () => {
      expect(await within(lesson()).findByRole('alert')).toHaveTextContent('The microphone is turned off for this page');
    });
    And('the Greek voice is handed {string} with no try before it', async (_, word: string) => {
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual([asSpoken(word)]));
      expect(audio.played).toEqual([]);
    });
  });
});
