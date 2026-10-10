// features/steps/my-reading.steps.tsx — runs features/my-reading.feature: 'Play my reading' on the reading check's result, Developer mode found by 7 taps on the
// version number on About, and 'Download my recording' once it is on. The recorder and the mill are fakes; the audio element, the object URLs and the save are stubbed.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { downloadSeam } from '../../src/audio/clip';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { keepVerseReading, setDeveloper } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, TIMED_READING_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;

/** The bytes FakeRecorder's clip holds. */
const CLIP_BYTES = [1, 2, 3, 4, 5, 6, 7, 8];

/** Object URLs made from blobs, by URL. */
const urls = new Map<string, Blob>();
let urlCount = 0;
let played: HTMLMediaElement[] = [];
let paused: HTMLMediaElement[] = [];
let saved: { name: string; blob: Blob }[] = [];
/** Milliseconds the clock has been moved on by 'N seconds go by'. */
let skew = 0;
const realNow = Date.now.bind(Date);

const bytesOf = (blob: Blob): Promise<number[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

async function start(hash: string): Promise<void> {
  cleanup();
  clearBus();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = hash;
  skew = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => realNow() + skew);
  urls.clear();
  urlCount = 0;
  played = [];
  paused = [];
  saved = [];
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    const url = `blob:lampas-test/${++urlCount}`;
    urls.set(url, blob as Blob);
    return url;
  };
  URL.revokeObjectURL = () => undefined;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    played.push(this);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    paused.push(this);
  });
  downloadSeam.save = (name, blob) => {
    saved.push({ name, blob });
  };
  stubRecorder();
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: READING_ANSWER };
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear()]);
}

async function openReadingCheck(): Promise<void> {
  render(<App />);
  const number = await screen.findByRole('button', { name: 'Verse 28', exact: true });
  await user.click(number);
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view).getByRole('button', { name: 'Read it aloud', exact: true }));
  await screen.findByRole('region', { name: 'Reading check' });
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });

/** The true position of the clip when pause() came under the coarse clock: what he heard up to; and what the element's clock showed then. */
let heardTo = -1;
let shownAtPause = -1;
let coarseTimer: ReturnType<typeof setTimeout> | undefined;
/** A phone's audio element (mw-5r3p30.139): the sound plays in real time, but currentTime moves only when a timeupdate comes, every `step`
 * seconds, the first `first` seconds in; 'playing' comes as the sound starts, with currentTime right at that moment, as the element has it.
 * pause() keeps where the sound was. */
function coarseClock(step: number, first: number): void {
  let position = () => 0;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    played.push(this);
    const from = this.currentTime;
    const playedAt = performance.now();
    position = () => from + (performance.now() - playedAt) / 1000;
    setTimeout(() => {
      this.currentTime = position();
      this.dispatchEvent(new Event('playing'));
    }, 0);
    const update = () => {
      this.currentTime = position();
      this.dispatchEvent(new Event('timeupdate'));
      coarseTimer = setTimeout(update, step * 1000);
    };
    coarseTimer = setTimeout(update, first * 1000);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    heardTo = position();
    shownAtPause = this.currentTime;
    clearTimeout(coarseTimer);
    paused.push(this);
  });
}
const audio = () => panel().querySelector<HTMLAudioElement>('audio[data-my-reading]');

async function readVerse28(): Promise<void> {
  await openReadingCheck();
  FakeRecorder.durationMs = 2000;
  const bar = screen.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await user.pointer([
    { keys: '[MouseLeft>]', target: bar, coords: AT },
    { keys: '[/MouseLeft]', target: bar, coords: AT },
  ]);
  await waitFor(() => expect(panel().querySelector('[data-reading-result]')).not.toBeNull());
}


/** The marked word's own span: its word button, its speaker and, with times, its Me button. */
const markSpan = (word: string): HTMLElement => {
  const mark = Array.from(panel().querySelectorAll<HTMLElement>('[data-fix]')).find((m) => m.textContent === word);
  expect(mark, `a marked word ${word}`).toBeDefined();
  return (mark as HTMLElement).parentElement as HTMLElement;
};
/** The button in a marked word's span with this visible text ('Me' or 'Stop'), or null. */
const meButton = (word: string, text: string): HTMLElement | null =>
  Array.from(markSpan(word).querySelectorAll<HTMLElement>('button')).find((b) => b.textContent === text) ?? null;

const versionNumber = () => screen.getByTestId('build-version');
const settingsGroup = () => screen.queryByRole('group', { name: 'Developer mode' });

async function goToSettings(): Promise<void> {
  window.location.hash = '#/settings';
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}

async function tapVersion(times: number): Promise<void> {
  await screen.findByRole('heading', { name: 'About', level: 1 });
  for (let i = 0; i < times; i++) await user.click(versionNumber());
}

const feature = await loadFeature('features/my-reading.feature');

describeFeature(feature, ({ Scenario }) => {
  const justMade = 'Lampas is opened on Romans 8 with a reading check he has just made';

  Scenario('After a check, Play my reading plays the clip he recorded', ({ Given, When, Then, And }) => {
    const tap = async (_: unknown, name: string) => {
      await user.click(within(panel()).getByRole('button', { name, exact: true }));
    };
    Given(justMade, async () => {
      await start('');
      await readVerse28();
    });
    Then('the result has {string}', async (_, name: string) => {
      expect(await within(panel()).findByRole('button', { name, exact: true })).toBeVisible();
    });
    When('he taps {string}', tap);
    Then('an audio element plays a blob that holds the recording', async () => {
      await waitFor(() => expect(played).toHaveLength(1));
      const element = audio();
      expect(element).not.toBeNull();
      expect(played[0]).toBe(element);
      const blob = urls.get(element?.getAttribute('src') ?? '');
      expect(blob).toBeDefined();
      expect(blob?.type).toBe('audio/webm');
      expect(await bytesOf(blob as Blob)).toEqual(CLIP_BYTES);
    });
    And('the button now says {string}', async (_, name: string) => {
      expect(await within(panel()).findByRole('button', { name, exact: true })).toBeVisible();
    });
    When('he stops it with {string}', tap);
    Then('the audio element is paused and the button says {string}', async (_, name: string) => {
      expect(paused).toContain(audio());
      expect(await within(panel()).findByRole('button', { name, exact: true })).toBeVisible();
    });
  });

  Scenario('Download my recording is hidden until Developer mode is on', ({ Given, Then }) => {
    Given(justMade, async () => {
      await start('');
      await readVerse28();
    });
    Then('the result has no {string}', async (_, name: string) => {
      await within(panel()).findByRole('button', { name: 'Play my reading', exact: true });
      expect(within(panel()).queryByRole('button', { name })).toBeNull();
    });
  });

  Scenario('With Developer mode on, Download my recording saves the clip as lampas-ref-time.webm', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a reading of verse 28 kept at 12:00 UTC on 9 October 2026', async () => {
      await start('');
      const bytes = new Uint8Array(CLIP_BYTES).buffer;
      await keepVerseReading('rom.8.28', 'some-to-fix', [], 'Nearly there.', 'en', Date.UTC(2026, 9, 9, 12, 0, 0), { bytes, mime: 'audio/webm' });
    });
    And('Developer mode is on', async () => {
      await setDeveloper('on');
      await openReadingCheck();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the phone is given the file {string} holding the recording', async (_, name: string) => {
      await waitFor(() => expect(saved).toHaveLength(1));
      expect(saved[0].name).toBe(name);
      expect(saved[0].blob.type).toBe('audio/webm');
      expect(await bytesOf(saved[0].blob)).toEqual(CLIP_BYTES);
    });
  });

  Scenario('Seven taps within 3 seconds on the version number on About turn Developer mode on', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on About', async () => {
      await start('#/about');
      render(<App />);
    });
    When('he taps the version number {int} times', async (_, times: number) => {
      await tapVersion(times);
    });
    Then('About says {string}', async (_, text: string) => {
      // About's Check for updates (src/whatsNew/) has a status of its own, empty until he checks: find the one that says it
      await waitFor(() => expect(screen.getAllByRole('status').map((s) => s.textContent ?? '').some((t) => t.includes(text))).toBe(true));
    });
    And('Settings has the switch {string} set to {string}', async (_, name: string, value: string) => {
      await goToSettings();
      const group = await screen.findByRole('group', { name });
      expect(within(group).getByRole('button', { name: value, exact: true })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  Scenario('Fewer than seven taps, or taps spread over more than 3 seconds, do nothing', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on About', async () => {
      await start('#/about');
      render(<App />);
    });
    When('he taps the version number {int} times', async (_, times: number) => {
      await tapVersion(times);
    });
    And('{int} seconds go by', (_, seconds: number) => {
      skew += seconds * 1000;
    });
    And('he taps the version number {int} times again', async (_, times: number) => {
      await tapVersion(times);
    });
    Then('Settings has no {string}', async (_, name: string) => {
      await goToSettings();
      await screen.findByRole('group', { name: 'Theme' });
      expect(screen.queryByRole('group', { name })).toBeNull();
      expect(settingsGroup()).toBeNull();
    });
  });

  Scenario('Developer mode stays after the app is opened again, and can be switched off', ({ Given, And, When, Then }) => {
    const switchIs = async (_: unknown, name: string, value: string) => {
      const group = await screen.findByRole('group', { name });
      await waitFor(() => expect(within(group).getByRole('button', { name: value, exact: true })).toHaveAttribute('aria-pressed', 'true'));
    };
    Given('Lampas is opened on About', async () => {
      await start('#/about');
      render(<App />);
    });
    And('he taps the version number {int} times', async (_, times: number) => {
      await tapVersion(times);
      await waitFor(async () => expect((await db.settings.get('developerMode'))?.value).toBe('on'));
    });
    When('Lampas is opened again on Settings', async () => {
      cleanup();
      window.location.hash = '#/settings';
      render(<App />);
    });
    Then('Settings has the switch {string} set to {string}', switchIs);
    When('he sets {string} to {string}', async (_, name: string, value: string) => {
      const group = await screen.findByRole('group', { name });
      await user.click(within(group).getByRole('button', { name: value, exact: true }));
    });
    Then('the switch {string} reads {string}', switchIs);
  });

  const timedGiven = 'Lampas is opened on Romans 8 with a reading check he has just made, the mill timing {string} from {number} to {number} seconds and not {string}';
  const timedStart = async () => {
    await start('');
    fake.autoReply = { status: 'answered', answer: TIMED_READING_ANSWER };
    await readVerse28();
  };
  const hasMe = async (_: unknown, word: string, speaker: string) => {
    await waitFor(() => expect(markSpan(word)).toBeDefined());
    expect(within(markSpan(word)).getByRole('button', { name: speaker, exact: true })).toBeVisible();
    expect(meButton(word, 'Me')).not.toBeNull();
    // Me sits right after the speaker, in the same span
    const buttons = Array.from(markSpan(word).querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent)).toEqual([word, '', 'Me']);
  };
  const hasNoMe = async (_: unknown, word: string, speaker: string) => {
    await waitFor(() => expect(markSpan(word)).toBeDefined());
    expect(within(markSpan(word)).getByRole('button', { name: speaker, exact: true })).toBeVisible();
    expect(meButton(word, 'Me')).toBeNull();
  };
  const tapBeside = async (_: unknown, text: string, word: string) => {
    const button = meButton(word, text);
    expect(button, `${text} beside ${word}`).not.toBeNull();
    await user.click(button as HTMLElement);
  };
  /** the audio element is paused, and the word's button reads Me again */
  const stoppedAgain = async (_: unknown, word: string) => {
    await waitFor(() => expect(meButton(word, 'Me')).not.toBeNull());
    expect(paused).toContain(audio());
  };

  Scenario('A flagged word the mill timed has Me beside its speaker, and one it did not time has none', ({ Given, Then, And }) => {
    Given(timedGiven, timedStart);
    Then('{string} is marked with its speaker {string} and {string} right beside it', (ctx, word: string, speaker: string) => hasMe(ctx, word, speaker));
    And('{string} is marked with its speaker {string} and no {string}', (ctx, word: string, speaker: string) => hasNoMe(ctx, word, speaker));
  });

  Scenario('Me plays only the clip of that word, from its start to its end', ({ Given, When, Then, And }) => {
    Given(timedGiven, timedStart);
    When('he taps {string} beside {string}', tapBeside);
    Then('the audio element plays the recording from {number} seconds', async (_, from: number) => {
      await waitFor(() => expect(played).toHaveLength(1));
      expect(played[0]).toBe(audio());
      expect(audio()?.currentTime).toBeCloseTo(from);
      expect(urls.get(audio()?.getAttribute('src') ?? '')?.type).toBe('audio/webm');
    });
    And('the button beside {string} now says {string}', async (_, word: string, text: string) => {
      await waitFor(() => expect(meButton(word, text)).not.toBeNull());
    });
    When('the recording reaches {number} seconds', async (_, at: number) => {
      const element = audio() as HTMLAudioElement;
      expect(paused).not.toContain(element);
      element.currentTime = at;
    });
    Then('the audio element is paused and the button beside {string} says {string}', (ctx, word: string) => stoppedAgain(ctx, word));
  });

  Scenario("Me stops at the word's end on a phone that moves the clip's clock only at its timeupdate events", ({ Given, When, Then, And }) => {
    Given(timedGiven, timedStart);
    And("the phone moves the clip's clock only at its timeupdate events, {number} seconds apart, the first {number} seconds in", (_, step: number, first: number) => coarseClock(step, first));
    When('he taps {string} beside {string}', tapBeside);
    Then("the clip is paused once the word has ended at {number} seconds, ahead of the phone's clock, and the button beside {string} says {string}", async (_, at: number, word: string, text: string) => {
      // a plain wait: polling the DOM by role would block the loop, and the player's timer with it, for tenths of a second at a time
      const began = performance.now();
      while (paused.length === 0 && performance.now() - began < 3000) await new Promise((resolve) => setTimeout(resolve, 10));
      expect(paused).toContain(audio());
      // the whole word was heard, and the stop did not wait for the phone's clock to reach the end (which would be a quarter second late);
      // how close to the end it stops is tests/unit/clip-player.test.ts's claim, on fake timers
      expect(heardTo).toBeGreaterThanOrEqual(at - 0.01);
      expect(shownAtPause).toBeLessThan(at);
      expect(heardTo).toBeLessThan(at + 0.5);
      expect(meButton(word, text)).not.toBeNull();
    });
  });

  Scenario('Me can be stopped before the word ends', ({ Given, When, Then, And }) => {
    Given(timedGiven, timedStart);
    When('he taps {string} beside {string}', tapBeside);
    And('he taps {string} beside {string}', tapBeside);
    Then('the audio element is paused and the button beside {string} says {string}', (ctx, word: string) => stoppedAgain(ctx, word));
  });

  Scenario('A reading with no clip has no Me, even for a timed word', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 with a reading of verse 28 kept with {string} timed from {number} to {number} seconds and no clip', async (_, word: string, from: number, to: number) => {
      await start('');
      await keepVerseReading('rom.8.28', 'some-to-fix', [{ word, index: 7, chunks: ['to', 'geth', 'er'], tip: 'Say the th softly.', start: from, end: to }], 'Nearly there.');
      await openReadingCheck();
    });
    Then('{string} is marked with its speaker {string} and no {string}', (ctx, word: string, speaker: string) => hasNoMe(ctx, word, speaker));
  });
});
