// features/steps/bible-voice-setting.steps.tsx — runs features/bible-voice-setting.feature: the Bible voice row of Settings > Listening
// (src/settings/definitions/bibleVoice.ts, src/settings/controls/voice.tsx BibleVoiceControl) and what the choice does to Play in John 3 (src/speech/recordedVoice.ts).
// The connection is src/speech/connection.ts's setter, the audio element is tests/support/fake-audio.ts, speech is the honest fake, and the timings are a stub
// served through fetch beside the chapters (John 3's and 4's verses ten seconds each after a three-second title): no request leaves the app.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { chapterListedNow, chapterTimingsNow, forgetTimings, type BookTimings, type ChapterTimings, type TimingsIndex } from '../../src/data/audioTimings';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus, publish } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { bibleVoiceSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { setConnectionForTests } from '../../src/speech/connection';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { recordingElement, resetRecordedVoice, wantsRecording } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../../tests/support/fake-audio';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { closeDatabase } from './close-database';

const fileOf = (path: string): Chapter => JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter;
const CHAPTERS: Record<string, Chapter> = { 'jhn/3': fileOf('jhn/3'), 'jhn/4': fileOf('jhn/4') };
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const englishIn = (key: string, n: number): string => {
  const v = CHAPTERS[key].verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n} in ${key}`);
  return squash(v.e.map((c) => c.t).join(' '));
};

/** A three-second title, then each verse ten seconds, each verse ending where the next starts. */
const TITLE = 3;
const EACH = 10;
const endOf = (n: number) => TITLE + n * EACH;
const audioOf = (chapter: number) => `https://openbible.com/audio/test/jhn-${chapter}.mp3`;
function chapterTimings(key: string, chapter: number): ChapterTimings {
  const verses = CHAPTERS[key].verses.map((v) => [v.n, TITLE + (v.n - 1) * EACH, endOf(v.n)] as [number, number, number]);
  return { audio: audioOf(chapter), duration: endOf(verses.length) + 2, verses };
}

let synth: FakeSynth;
let audio: FakeAudio;

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(async () => {
  cleanup();
  stopReading();
  resetRecordedVoice();
  setConnectionForTests(undefined);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  await closeDatabase();
});

const user = userEvent.setup();

/** A connection of this type: "none" is a phone with no navigator.connection type at all. */
const connect = (type: string): void => setConnectionForTests(type === 'none' ? null : { type });

/** Forgets the last scenario and clears the settings (the Bible voice saved before the App renders is put in with `saved`). */
async function fresh(saved?: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  resetRecordedVoice();
  forgetTimings();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear(), db.library.clear()]);
  if (saved !== undefined) await db.settings.put({ key: bibleVoiceSetting.key, value: saved });
}

/** Renders Settings at the Listening page, keeping what the settings store holds (a reload keeps it). */
async function openListening(type: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  connect(type);
  window.history.replaceState(null, '', '/#/settings');
  stubChapterFetch();
  render(<App />);
  await openSettingsGroup(user, 'listening');
}

const row = (key: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-setting="${key}"]`);
  if (!el) throw new Error(`no ${key} row on the page`);
  return el;
};
const voiceRow = async (): Promise<HTMLElement> => {
  await waitFor(() => expect(within(document.querySelector<HTMLElement>('[data-setting="bibleVoice"]') ?? document.body).queryByRole('group', { name: 'Bible voice' })).not.toBeNull());
  return row('bibleVoice');
};
const choicesOf = async (): Promise<string[]> => within(await voiceRow()).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed')).map((b) => b.textContent ?? '');
const chosenOf = async (): Promise<string[]> =>
  within(await voiceRow())
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
const listOf = (a: string, b?: string, c?: string): string[] => [a, b, c].filter((x): x is string => x !== undefined);

async function openReader(voice: string, connection: string, chapterN = 3, timed: number[] = [3, 4]): Promise<void> {
  await fresh(voice === 'default' ? undefined : voice);
  connect(connection);
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  stubChapterFetch();
  const index: TimingsIndex = { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: timed } };
  const book: BookTimings = { v: 1, edition: 'msb-david', book: 'jhn', chapters: Object.fromEntries(timed.map((n) => [String(n), chapterTimings(`jhn/${n}`, n)])) };
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('http')) throw new Error(`the app asked the network for ${url}`);
    if (url === '/data/audio/msb-david/index.json') return Promise.resolve(Response.json(index));
    if (url === '/data/audio/msb-david/jhn.json') return Promise.resolve(Response.json(book));
    return chapterFetch(input, init);
  });
  await setReaderView('english');
  await setWeave('off');
  window.location.hash = `#/?b=jhn&c=${chapterN}`;
  render(<App />);
  await screen.findByRole('heading', { name: `John ${chapterN}`, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  // the Bible voice is told to the speaker as the App starts, and the book's timings are warmed unless the voice is the phone's
  await waitFor(() => expect(wantsRecording()).toBe(voice === 'msb-david' || (voice !== 'phone' && connection !== 'cellular') ? 'msb-david' : null));
  if (voice !== 'phone') await waitFor(() => expect(chapterTimingsNow('jhn', timed[0])).not.toBeNull());
  // the index is in, so a chapter it does not list is known to be unrecorded
  if (voice !== 'phone') await waitFor(() => expect(chapterListedNow('jhn', chapterN)).toBe(timed.includes(chapterN)));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-reader] [data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const spokenTexts = () => synth.spoken.map((s) => squash(s.text));

const feature = await loadFeature('features/bible-voice-setting.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const hint = async (_: unknown, text: string) => {
    await waitFor(() => expect(squash((document.querySelector('[data-setting="bibleVoice"]') as HTMLElement | null)?.textContent)).toContain(text));
  };
  const helpText = () => squash(document.querySelector('[data-setting="bibleVoice"] [data-help-text]')?.textContent);
  const opensHelp = async () => {
    await user.click(within(await voiceRow()).getByRole('button', { name: 'More help' }));
    await waitFor(() => expect(helpText()).not.toBe(''));
  };
  const shows = async (_: unknown, value: string) => {
    await waitFor(async () => expect(await chosenOf()).toEqual([value]));
  };
  const offers = async (_: unknown, a: string, b?: string, c?: string) => {
    await waitFor(async () => expect(await choicesOf()).toEqual(listOf(a, b, c)));
  };

  Scenario('Bible voice stands above English voice, Recording on Wi-Fi only chosen, with its hint and its credit line', ({ Given, When, Then, And }) => {
    Given('Settings is open at the page of {string} on a phone whose connection type is {string}', async (_, _page: string, type: string) => {
      await fresh();
      await openListening(type);
    });
    Then('{string} is drawn above {string}', async (_, above: string, below: string) => {
      const keys: Record<string, string> = { 'Bible voice': 'bibleVoice', 'English voice': 'englishVoice' };
      await voiceRow();
      await waitFor(() => expect(document.querySelector(`[data-setting="${keys[below]}"]`)).not.toBeNull());
      expect(row(keys[above]).compareDocumentPosition(row(keys[below])) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    And('the {string} row shows {string} chosen', async (_, _name: string, value: string) => shows(null, value));
    And('the {string} row says {string}', async (_, _name: string, text: string) => hint(null, text));
    When('he opens the More help of the {string} row', opensHelp);
    Then('the help opens with {string}', (_, text: string) => {
      expect(helpText().startsWith(text)).toBe(true);
    });
    And('the help names the internet and John', () => {
      expect(helpText()).toContain('internet');
      expect(helpText()).toContain('John');
    });
    And('the help says it uses about 1.4 MB a minute and that books arrive as they are timed', () => {
      expect(helpText()).toContain('about 1.4 MB a minute');
      expect(helpText()).toContain('as they are timed');
    });
  });

  Scenario('On a phone that reports its connection the row offers three choices and the Wi-Fi one is kept across a reload', ({ Given, When, Then }) => {
    Given('Settings is open at the page of {string} on a phone whose connection type is {string}', async (_, _page: string, type: string) => {
      await fresh();
      await openListening(type);
    });
    Then('the {string} row offers {string}, {string} and {string}', async (_, _name: string, a: string, b: string, c: string) => offers(null, a, b, c));
    When('he chooses {string} for the {string}', async (_, value: string) => {
      await user.click(within(await voiceRow()).getByRole('button', { name: value }));
    });
    Then('the setting {string} is kept as {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
    When('Settings is opened again after a reload on a phone whose connection type is {string}', async (_, type: string) => openListening(type));
    Then('the {string} row shows {string} chosen', async (_, _name: string, value: string) => shows(null, value));
  });

  Scenario('On a phone that cannot tell, the start is shown as Recording on Wi-Fi only, with its help saying what the phone cannot tell', ({ Given, When, Then, And }) => {
    Given('Settings is open at the page of {string} on a phone with no connection type', async () => {
      await fresh();
      await openListening('none');
    });
    Then('the {string} row offers {string}, {string} and {string}', async (_, _name: string, a: string, b: string, c: string) => offers(null, a, b, c));
    And('the {string} row shows {string} chosen', async (_, _name: string, value: string) => shows(null, value));
    When('he opens the More help of the {string} row', opensHelp);
    Then('the help ends with {string}', (_, text: string) => {
      expect(helpText().endsWith(text)).toBe(true);
    });
  });

  Scenario('A Wi-Fi choice that reaches a phone that cannot tell is shown as saved, with the other two beside it', ({ Given, And, Then }) => {
    Given('the Bible voice {string} is saved', async (_, value: string) => fresh(value));
    And('Settings is open at the page of {string} on a phone with no connection type', async () => openListening('none'));
    Then('the {string} row offers {string}, {string} and {string}', async (_, _name: string, a: string, b: string, c: string) => offers(null, a, b, c));
    And('the {string} row shows {string} chosen', async (_, _name: string, value: string) => shows(null, value));
  });

  const given = 'John 3 is open in English with the Bible voice {string} on a connection of type {string}';
  const recordingGiven = async (_: unknown, element: string) => {
    await waitFor(() => expect(audio.sources).toContain(audioOf(Number(element))));
  };
  const handedVerseOne = async () => {
    await waitFor(() => expect(spokenTexts().length).toBeGreaterThan(0));
    expect(spokenTexts().join(' ')).toBe(englishIn('jhn/3', 1));
    expect(audio.sources).toEqual([]);
    expect(recordingElement()?.getAttribute('src') ?? null).toBeNull();
  };
  const tap = async (_: unknown, name: string) => {
    await user.click(screen.getByRole('button', { name, exact: true }));
  };
  const passes = (_: unknown, n: number) => {
    act(() => audio.advanceTo(endOf(n) + 0.01));
  };

  ScenarioOutline('Play in John 3 reads by the Bible voice and the connection', ({ Given, When, Then }, row) => {
    Given(given, async () => openReader(row.voice, row.connection));
    When('he taps {string}', tap);
    Then('<heard>', async () => {
      if (row.heard === 'the audio element is given the recording of John 3') {
        await waitFor(() => expect(audio.sources).toEqual([audioOf(3)]));
        expect(audio.playing()).toBe(recordingElement());
        expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
      } else if (row.heard === 'the phone\'s voice is handed verse 1 and the element has no src') await handedVerseOne();
      else throw new Error(`no such outcome: ${row.heard}`);
    });
  });

  Scenario('A chapter that began in the recording finishes in it when Wi-Fi drops, and the next chapter begins in the phone\'s voice', ({ Given, When, Then, And }) => {
    Given(given, async (_, voice: string, connection: string) => openReader(voice, connection));
    When('he selects verse {int} and taps {string}', async (_, n: number, name: string) => {
      await user.click(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` }));
      await user.click(screen.getByRole('button', { name, exact: true }));
    });
    Then('the audio element is given the recording of John {int}', async (_, chapter: number) => recordingGiven(null, String(chapter)));
    When('the connection turns {string}', (_, type: string) => connect(type));
    And('the recording passes the end of verse {int}', passes);
    Then('the audio element is still playing the recording of John {int}', async () => {
      expect(audio.playing()).toBe(recordingElement());
      expect(getReading().status).toBe('reading');
    });
    When('the recording passes the end of verse {int}', passes);
    Then('the Reader shows John 4', async () => {
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
    });
    And('the phone\'s voice is handed the English of John 4:1', async () => {
      await waitFor(() => expect(spokenTexts().join(' ')).toBe(englishIn('jhn/4', 1)));
      expect(audio.playing()).toBeNull();
    });
    And('the audio element was given only John 3', () => {
      expect(audio.sources).toEqual([audioOf(3)]);
    });
  });

  const DATA_NOTICE = 'On mobile data Lampas reads in the phone voice. David plays on Wi-Fi.';
  const question = () => screen.queryByRole('alertdialog', { name: 'Bible voice on mobile data' });
  const asked = async (_: unknown, text: string) => {
    const dialog = await screen.findByRole('alertdialog', { name: 'Bible voice on mobile data' });
    expect(squash(dialog.textContent)).toContain(text);
  };
  const notAsked = () => {
    expect(question()).toBeNull();
  };
  const readingSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(squash(document.querySelector('[data-reading-bar]')?.parentElement?.textContent)).toContain(text));
  };

  Scenario('On mobile data with the start, the first Play asks once whether to play David over data, and Play David on data plays him and sets the Bible voice', ({ Given, When, Then, And }) => {
    Given(given, async (_, voice: string, connection: string) => openReader(voice, connection));
    When('he taps {string}', tap);
    Then('he is asked {string}', asked);
    And('the phone\'s voice is handed nothing and the element has no src', () => {
      expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
      expect(audio.sources).toEqual([]);
    });
    When('he taps "Play David on data"', () => tap(null, 'Play David on data'));
    Then('the audio element is given the recording of John {int}', async (_, chapter: number) => recordingGiven(null, String(chapter)));
    And('the setting {string} is kept as {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('Keep the phone voice reads in the phone voice, says why once, and is never asked again', ({ Given, When, Then, And }) => {
    Given(given, async (_, voice: string, connection: string) => openReader(voice, connection));
    When('he taps {string}', tap);
    And('he taps "Keep the phone voice"', () => tap(null, 'Keep the phone voice'));
    Then('the phone\'s voice is handed verse 1 and the element has no src', handedVerseOne);
    And('the reading says {string}', readingSays);
    When('he taps "Stop" on the speaking bar', () => tap(null, 'Stop'));
    And('he taps "Read from the top" again', () => tap(null, 'Read from the top'));
    Then('he is not asked again', notAsked);
    And('the phone\'s voice is handed verse 1 and the element has no src', async () => {
      await waitFor(() => expect(spokenTexts().length).toBeGreaterThan(0));
      expect(audio.sources).toEqual([]);
    });
    And('the reading says nothing about the data', () => {
      expect(squash(document.querySelector('[data-reading-bar]')?.parentElement?.textContent)).not.toContain(DATA_NOTICE);
    });
  });

  const givenUntimed = 'John 4 is open in English with the Bible voice {string} on a connection of type {string} and only John 3 timed';
  Scenario('On Wi-Fi in a chapter David has not recorded yet, a line says so and the phone\'s voice reads it', ({ Given, When, Then, And }) => {
    Given(givenUntimed, async (_, voice: string, connection: string) => openReader(voice, connection, 4, [3]));
    When('he taps {string}', tap);
    Then('the reading says {string}', readingSays);
    And('the phone\'s voice is handed the English of John 4:1', async () => {
      await waitFor(() => expect(spokenTexts().join(' ')).toBe(englishIn('jhn/4', 1)));
      expect(audio.sources).toEqual([]);
    });
  });

  Scenario('On mobile data in a chapter David has not recorded yet, the one-time notice is given with no question', ({ Given, When, Then, And }) => {
    Given(givenUntimed, async (_, voice: string, connection: string) => openReader(voice, connection, 4, [3]));
    When('he taps {string}', tap);
    Then('the reading says {string}', readingSays);
    And('he is not asked again', notAsked);
  });

  Scenario('A chapter that began in the recording finishes in it when the Bible voice is changed to Phone voice, and the next Play is the phone\'s voice', ({ Given, When, Then, And }) => {
    Given(given, async (_, voice: string, connection: string) => openReader(voice, connection));
    When('he taps {string}', tap);
    Then('the audio element is given the recording of John {int}', async (_, chapter: number) => recordingGiven(null, String(chapter)));
    When('the Bible voice is changed to {string}', async (_, value: string) => {
      await setSetting(bibleVoiceSetting, value as 'phone');
      publish({ kind: 'setting-changed', key: bibleVoiceSetting.key, value });
      await waitFor(() => expect(wantsRecording()).toBeNull());
    });
    And('the recording passes the end of verse {int}', passes);
    Then('the audio element is still playing the recording of John {int}', async () => {
      expect(audio.playing()).toBe(recordingElement());
      expect(getReading().status).toBe('reading');
    });
    When('he taps "Stop" on the speaking bar', () => tap(null, 'Stop'));
    And('he taps "Read from the top" again', () => tap(null, 'Read from the top'));
    Then("the phone's voice is handed verse 1", async () => {
      await waitFor(() => expect(spokenTexts().join(' ')).toBe(englishIn('jhn/3', 1)));
      expect(audio.playing()).toBeNull();
    });
    And('the audio element was given only John 3', () => {
      expect(audio.sources).toEqual([audioOf(3)]);
    });
  });
});
