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
import { makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

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
      expect(await screen.findByRole('status')).toHaveTextContent(text);
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
});
