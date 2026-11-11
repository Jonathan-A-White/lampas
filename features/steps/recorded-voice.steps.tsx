// features/steps/recorded-voice.steps.tsx — runs features/recorded-voice.feature: a chapter with timings is read by the recording through one audio element
// (src/speech/recordedVoice.ts, mw-82lb97i.3). The element is tests/support/fake-audio.ts (its time moves when a step says), speech is the honest fake, and the
// timings are a stub served through fetch beside the chapters: John 3's verses ten seconds each after a three-second title, no request leaves the app.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { chapterTimingsNow, forgetTimings, type BookTimings, type ChapterTimings, type TimingsIndex } from '../../src/data/audioTimings';
import { db } from '../../src/data/db';
import { setReaderView, setSpeechRate, setWeave } from '../../src/data/repositories';
import { clearBus, latest, publish, subscribe } from '../../src/events/bus';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { recordingElement, resetRecordedVoice, setWantsRecording } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../../tests/support/fake-audio';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
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
const startOf = (n: number) => TITLE + (n - 1) * EACH;
const endOf = (n: number) => TITLE + n * EACH;
const audioOf = (chapter: number) => `https://openbible.com/audio/test/jhn-${chapter}.mp3`;
function chapterTimings(key: string, chapter: number): ChapterTimings {
  const verses = CHAPTERS[key].verses.map((v) => [v.n, startOf(v.n), endOf(v.n)] as [number, number, number]);
  return { audio: audioOf(chapter), duration: endOf(verses.length) + 2, verses };
}

let synth: FakeSynth;
let audio: FakeAudio;
let read: number[] = [];

interface Options {
  /** the chapters of John with timings */
  chapters?: number[];
  english?: number;
}

async function open({ chapters = [3, 4], english }: Options = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  resetRecordedVoice();
  forgetTimings();
  setWantsRecording('msb-david');
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  stubChapterFetch();
  const index: TimingsIndex = { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: chapters } };
  const book: BookTimings = { v: 1, edition: 'msb-david', book: 'jhn', chapters: Object.fromEntries(chapters.map((c) => [String(c), chapterTimings(`jhn/${c}`, c)])) };
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('http')) throw new Error(`the app asked the network for ${url}`);
    if (url === '/data/audio/msb-david/index.json') return Promise.resolve(Response.json(index));
    if (url === '/data/audio/msb-david/jhn.json') return Promise.resolve(Response.json(book));
    return chapterFetch(input, init);
  });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
  if (english !== undefined) await setSpeechRate('english', english);
  read = [];
  window.location.hash = '#/?b=jhn&c=3';
  render(<App />);
  await screen.findByRole('heading', { name: 'John 3', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  // the Reader warms the book's timings when the chapter opens: the tap must find them loaded
  await waitFor(() => expect(chapterTimingsNow('jhn', 3)).not.toBeNull());
  if (english !== undefined) await waitFor(() => expect(latest('rates-changed')?.rates.english).toBe(english));
  subscribe('verse-reading', (e) => read.push(e.verse));
}

afterAll(async () => {
  cleanup();
  stopReading();
  resetRecordedVoice();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
  await closeDatabase();
});

const user = userEvent.setup();
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-reader] [data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const bar = () => document.querySelector<HTMLElement>('[data-reading-bar]');
const spokenTexts = () => synth.spoken.map((s) => squash(s.text));
/** The phone's voice was handed `english` and nothing else (the package hands it a sentence at a time). */
const handedOnly = async (english: string) => {
  await waitFor(() => expect(spokenTexts().join(' ')).toBe(english));
};
const element = (): HTMLMediaElement => {
  const el = recordingElement();
  if (!el) throw new Error('no recording element');
  return el;
};
const headingEl = (text: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
  if (!found) throw new Error(`no heading ${text}`);
  return found;
};
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const footEl = () => viewEl().querySelector<HTMLElement>('[data-verse-bar]') as HTMLElement;

const feature = await loadFeature('features/recorded-voice.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const opened = 'John 3 is open in English with the recorded voice chosen';
  const tapHeader = async (_: unknown, name: string) => {
    await user.click(screen.getByRole('button', { name, exact: true }));
  };
  const passes = (_: unknown, n: number) => {
    act(() => audio.advanceTo(endOf(n) + 0.01));
  };
  const marked = async (_: unknown, n: number) => {
    await waitFor(() => expect(verseEl(n).hasAttribute('data-reading')).toBe(true));
    expect(getReading().verse).toBe(n);
  };
  const paused = async () => {
    await waitFor(() => expect(audio.playing()).toBeNull());
    expect(audio.last()).toBe(recordingElement());
  };
  const idle = async () => {
    await waitFor(() => expect(getReading().status).toBe('idle'));
    expect(bar()).toBeNull();
  };
  const selectAndReadFromHere = async (_: unknown, n: number) => {
    await user.click(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` }));
    await user.click(screen.getByRole('button', { name: 'Read from here' }));
  };

  Scenario('Play reads John 3 from the recording and the verse being read follows its timings', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    Then('the audio element plays the recording of John 3 with no crossorigin attribute', async () => {
      await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
      expect(element().src).toBe(audioOf(3));
      expect(element().hasAttribute('crossorigin')).toBe(false);
      expect(element().crossOrigin).toBeNull();
      expect(audio.sources).toEqual([audioOf(3)]);
    });
    And("the phone's voice is handed nothing", () => {
      expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
    });
    And('verse 1 is marked as being read', () => marked(null, 1));
    When('the recording passes the end of verse 1', () => passes(null, 1));
    Then('verse 2 is marked as being read', () => marked(null, 2));
    When('the recording passes the end of verse 2', () => passes(null, 2));
    Then('verse 3 is marked as being read', () => marked(null, 3));
    And('a verse-reading event was published for verses 1, 2 and 3', async () => {
      await waitFor(() => expect(read).toEqual([1, 2, 3]));
      expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
    });
  });

  Scenario("The header's Pause holds the recording, Play goes on from the same second and Stop ends it", ({ Given, When, Then, And }) => {
    let pausedAt = 0;
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('he taps "Pause" in the header', async () => {
      await tapHeader(null, 'Pause');
      pausedAt = element().currentTime;
    });
    Then('the audio element is paused', paused);
    And('the reading bar says {string}', async (_, text: string) => {
      await waitFor(() => expect(bar()).toHaveTextContent(text));
    });
    When('he taps "Play" in the header', () => tapHeader(null, 'Play'));
    Then('the audio element plays on from the second it was paused at', async () => {
      await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
      expect(audio.playedAt).toEqual([0, pausedAt]);
      expect(element().currentTime).toBe(pausedAt);
      expect(getReading()).toMatchObject({ status: 'reading', verse: 2 });
    });
    When('he taps "Stop" in the header', () => tapHeader(null, 'Stop'));
    Then('the audio element is paused again', paused);
    And('the reading is idle', idle);
  });

  Scenario("A verse's play button reads that verse of the recording and stops at its end", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps the play button of verse {int}', async (_, n: number) => {
      await user.click(within(verseEl(n)).getByRole('button', { name: 'Hear the verse' }));
    });
    Then('the audio element plays the recording from the start of verse {int}', async (_, n: number) => {
      await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
      expect(audio.playedAt).toEqual([startOf(n)]);
    });
    And('verse {int} is marked as being read', marked);
    When('the recording passes the end of verse {int}', passes);
    Then('the audio element is paused', paused);
    And('the reading is idle', async () => {
      await idle();
      expect(read).toEqual([16]);
      expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
    });
  });

  Scenario('A Listen on a section reads the section from the recording and offers Play again', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps the heading {string}', async (_, text: string) => {
      await user.click(within(headingEl(text)).getByRole('button'));
      await screen.findByRole('region', { name: 'Verse view' });
    });
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(footEl()).getByRole('button', { name, exact: true }));
    });
    Then('the audio element plays the recording from its start', async () => {
      await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
      expect(audio.playedAt).toEqual([0]);
      expect(getReading().verse).toBe(1);
    });
    When('the recording passes the end of verse {int}', (_, n: number) => {
      act(() => audio.advanceTo(endOf(n) - 1));
      expect(getReading()).toMatchObject({ status: 'reading', verse: n });
      act(() => audio.advanceTo(endOf(n) + 0.01));
    });
    Then('the audio element is paused', paused);
    And('the reading is idle', async () => {
      await idle();
      expect(read).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    });
    And('the Listen foot offers {string}', async (_, label: string) => {
      await waitFor(() => expect(within(footEl()).getByRole('button', { name: label, exact: true })).toBeInTheDocument());
    });
  });

  Scenario('Play to End of the book turns to John 4 and plays its recording from its first verse', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he selects verse {int} and taps {string}', selectAndReadFromHere);
    And('the recording passes the end of verse {int}', passes);
    Then('the Reader shows John 4', async () => {
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
    });
    And('the audio element plays the recording of John 4 from its start', async () => {
      await waitFor(() => expect(audio.sources).toEqual([audioOf(3), audioOf(4)]));
      expect(audio.playing()).toBe(recordingElement());
      expect(audio.playedAt).toEqual([startOf(36), 0]);
      expect(synth.calls.filter((c) => c.startsWith('speak'))).toEqual([]);
    });
    And('verse {int} is marked as being read', marked);
  });

  Scenario("Play to End of the book goes on in the phone's voice into a chapter with no timings", ({ Given, When, Then, And }) => {
    Given('John 3 is open in English with the recorded voice chosen and John 4 has no timings', () => open({ chapters: [3] }));
    When('he selects verse {int} and taps {string}', selectAndReadFromHere);
    And('the recording passes the end of verse {int}', passes);
    Then('the Reader shows John 4', async () => {
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
    });
    And("the phone's voice is handed the English of John 4:1", async () => {
      await handedOnly(englishIn('jhn/4', 1));
      expect(audio.playing()).toBeNull();
      expect(audio.sources).toEqual([audioOf(3)]);
    });
  });

  Scenario("A recording that fails hands the verse in hand to the phone's voice", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the audio element reports an error', () => {
      act(() => audio.fail());
    });
    Then("the phone's voice is handed the English of John 3:2", async () => {
      await handedOnly(englishIn('jhn/3', 2));
      expect(getReading()).toMatchObject({ status: 'reading', verse: 2 });
    });
    And('the line says {string}', async (_, text: string) => {
      await waitFor(() => expect(within(bar()?.parentElement ?? document.body).getByRole('status')).toHaveTextContent(text));
    });
  });

  ScenarioOutline("The phone's voice reads when the recording cannot be used", ({ Given, And, When, Then }, row) => {
    Given(opened, () => open());
    And('<condition>', async () => {
      const condition = row.condition;
      if (condition === 'the phone is offline') vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      else if (condition === 'the weave is on') {
        await seedHisWords();
        await setWeave('solid');
        await waitFor(() => expect(document.querySelector('[data-reader] [data-woven]')).not.toBeNull());
      } else if (condition === 'the Greek view is shown') {
        await setReaderView('greek');
        await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
      } else if (condition === 'the recorded voice is left at its default') setWantsRecording(null);
      else throw new Error(`no such condition: ${condition}`);
    });
    When('he taps {string}', tapHeader);
    Then("the phone's voice is handed verse 1", async () => {
      await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
      expect(getReading()).toMatchObject({ status: 'reading', verse: 1, notice: null });
    });
    And('the audio element was given no recording', () => {
      expect(audio.sources).toEqual([]);
      expect(recordingElement()?.getAttribute('src') ?? null).toBeNull();
    });
  });

  Scenario('The recording plays at his English speed and follows a change of it', ({ Given, When, Then }) => {
    Given('John 3 is open in English with the recorded voice chosen and his English speed is 1.5', () => open({ english: 1.5 }));
    When('he taps {string}', tapHeader);
    Then("the audio element's playback rate is 1.5 and it keeps its pitch", async () => {
      await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
      expect(element().playbackRate).toBe(1.5);
      expect((element() as HTMLMediaElement & { preservesPitch?: boolean }).preservesPitch).toBe(true);
    });
    When('his English speed changes to 0.8 while it plays', () => {
      const rates = latest('rates-changed')?.rates;
      if (!rates) throw new Error('no rates were published');
      act(() => publish({ kind: 'rates-changed', rates: { ...rates, english: 0.8 } }));
    });
    Then("the audio element's playback rate is 0.8", () => {
      expect(element().playbackRate).toBe(0.8);
      expect(audio.playing()).toBe(recordingElement());
    });
  });
});
