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
import { recordingElement, resetRecordedVoice, wantsRecording } from '../../src/speech/recordedVoice';
import { bibleVoiceSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubAudio, type FakeAudio } from '../../tests/support/fake-audio';
import { stubMediaSession, type FakeMediaSession } from '../../tests/support/fake-media-session';
import { resetMediaSession } from '../../src/speech/mediaSession';
import { speakWord } from '../../src/speech/greek';
import { askTranscriber } from '../../src/speech/askTranscriber';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, stubRecognizer } from '../../tests/support/fake-recognizer';
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
let session: FakeMediaSession;
let read: number[] = [];
/** whether the recording was playing at each moment the phone's voice was handed a word */
let playingWhenSpoken: boolean[] = [];
/** the second the recording was paused at by the last interruption or Pause */
let heldAt = 0;

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
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  resetMediaSession();
  session = stubMediaSession();
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
  playingWhenSpoken = [];
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

const speakingBars = () => Array.from(document.querySelectorAll<HTMLElement>("[data-testid='speaking-bar']"));
const speakingBar = () => screen.getByRole('region', { name: 'Speaking' });
const barLabels = () => within(speakingBar()).getAllByRole('button').map((b) => b.textContent);
const onSpeakingBar = (name: string) => user.click(within(speakingBar()).getByRole('button', { name, exact: true }));
const passageVerse = (n: number): HTMLElement => {
  const el = viewEl().querySelector<HTMLElement>(`[data-passage-verse="${n}"]`);
  if (!el) throw new Error(`no passage verse ${n}`);
  return el;
};
/** A press of a word: the finger stays down past the long press (src/ui/longPress.ts), then lifts. */
/** From here on, whether the recording plays is noted at every moment the phone's voice is handed something. */
const watchSpeak = () => {
  const phone = window.speechSynthesis;
  const speak = phone.speak.bind(phone);
  phone.speak = (utterance) => {
    playingWhenSpoken.push(audio.playing() !== null);
    return speak(utterance);
  };
};
const holdWord = async (word: HTMLElement) => {
  watchSpeak();
  const at = { clientX: 100, clientY: 100 };
  await user.pointer({ keys: '[MouseLeft>]', target: word, coords: at });
  await act(async () => {
    // a real-time wait: the finger must stay down past LONG_PRESS_MS (the app times a press by the page's clock)
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  await user.pointer({ keys: '[/MouseLeft]', target: word, coords: at });
};
const goTo = async (hash: string) => {
  await act(async () => {
    window.location.hash = hash;
  });
};

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
      } else if (condition === 'the Bible voice is Phone voice') {
        await setSetting(bibleVoiceSetting, 'phone');
        await waitFor(() => expect(wantsRecording()).toBeNull());
      }
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
  const barPlaying = () => {
    const bar = speakingBar();
    expect(bar).toHaveAttribute('data-testid', 'speaking-bar');
    expect(bar).toHaveAttribute('data-state', 'playing');
    expect(barLabels()).toEqual(['Previous verse', 'Pause', 'Restart', 'Next verse', 'Stop']);
  };
  const firstIsResume = async () => {
    await waitFor(() => expect(barLabels()).toEqual(['Previous verse', 'Resume', 'Restart', 'Next verse', 'Stop']));
    const first = within(speakingBar()).getByRole('button', { name: 'Resume', exact: true });
    expect(first).toHaveAttribute('data-primary', 'true');
    expect(first).toHaveAttribute('data-action', 'resume');
    expect(speakingBar()).toHaveAttribute('data-state', 'paused');
  };
  const onBar = async (_: unknown, name: string) => {
    await onSpeakingBar(name);
  };
  const pausedHere = async () => {
    await waitFor(() => expect(audio.playing()).toBeNull());
    heldAt = element().currentTime;
  };
  const playsOnFromHeld = async () => {
    await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
    expect(audio.playedAt.at(-1)).toBe(heldAt);
    expect(element().currentTime).toBe(heldAt);
  };
  const playsFromStartOf = async (_: unknown, n: number) => {
    await waitFor(() => expect(audio.playing()).toBe(recordingElement()));
    expect(element().currentTime).toBe(n === 1 ? 0 : startOf(n));
  };
  const tapListen = async (_: unknown, name: string) => {
    await user.click(within(footEl()).getByRole('button', { name, exact: true }));
  };
  const tapSectionHeading = async (_: unknown, text: string) => {
    await user.click(within(headingEl(text)).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const noBar = () => expect(speakingBars()).toHaveLength(0);

  Scenario('The speaking bar holds a recorded reading: Pause, Resume from the same second, and Stop', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    Then('the speaking bar is playing and shows Previous verse, Pause, Restart, Next verse and Stop', () => barPlaying());
    And('the header shows no Pause or Stop', () => {
      expect(screen.getAllByRole('button', { name: 'Pause' })).toEqual([within(speakingBar()).getByRole('button', { name: 'Pause' })]);
      expect(screen.getAllByRole('button', { name: 'Stop' })).toEqual([within(speakingBar()).getByRole('button', { name: 'Stop' })]);
      expect(getReading().onBar).toBe(true);
    });
    When('he taps "Pause" on the speaking bar', async () => {
      heldAt = element().currentTime;
      await onBar(null, 'Pause');
    });
    Then('the audio element is paused', paused);
    And('the reading bar says {string}', async (_, text: string) => {
      await waitFor(() => expect(bar()).toHaveTextContent(text));
    });
    And("the speaking bar offers Resume in place of Pause", firstIsResume);
    When('he taps "Resume" on the speaking bar', () => onBar(null, 'Resume'));
    Then('the audio element plays on from the second it was paused at', playsOnFromHeld);
    When('he taps "Stop" on the speaking bar', () => onBar(null, 'Stop'));
    Then('the audio element is paused again', paused);
    And('the reading is idle', async () => {
      await waitFor(() => expect(getReading().status).toBe('idle'));
    });
    And('there is no speaking bar', noBar);
  });

  Scenario('Restart goes back to the start of the verse being read', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the recording plays {int} seconds into verse {int}', (_, seconds: number, n: number) => {
      act(() => audio.advanceTo(startOf(n) + seconds));
      expect(getReading().verse).toBe(n);
    });
    And('he taps "Restart" on the speaking bar', () => onBar(null, 'Restart'));
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
  });

  Scenario("Restart on a Listen of a section goes back to the section's first verse", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps the heading {string}', tapSectionHeading);
    And('he taps {string} in the Verse view', tapListen);
    And('the recording passes the end of verse {int}', passes);
    And('he taps "Restart" on the speaking bar', () => onBar(null, 'Restart'));
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
  });

  Scenario('A word said alone while the recording plays pauses it first, and Resume goes on from the same second', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('a Greek word is said alone, as a speaker beside it says one', () => {
      watchSpeak();
      act(() => {
        speakWord('λόγος', 'greek');
      });
    });
    Then('the audio element was paused before the word was spoken', async () => {
      await waitFor(() => expect(playingWhenSpoken.length).toBeGreaterThan(0));
      expect(playingWhenSpoken.every((playing) => !playing)).toBe(true);
      await pausedHere();
    });
    And("the speaking bar offers Resume in place of Pause", firstIsResume);
    When('the phone finishes the word', () => {
      act(() => synth.finish());
    });
    Then('the audio element is paused', paused);
    And('the speaking bar still offers Resume', firstIsResume);
    When('he taps "Resume" on the speaking bar', () => onBar(null, 'Resume'));
    Then('the audio element plays on from the second it was paused at', playsOnFromHeld);
  });

  Scenario('A word held while a recorded Listen plays pauses it and the Listen goes on by itself when the word ends', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps the heading {string}', tapSectionHeading);
    And('he taps {string} in the Verse view', tapListen);
    And('the recording passes the end of verse {int}', passes);
    And('he long presses the first word of verse {int} in the passage', async (_, n: number) => {
      await holdWord(within(passageVerse(n)).getAllByRole('button')[0]);
    });
    Then('the audio element was paused before the word was spoken', async () => {
      await waitFor(() => expect(playingWhenSpoken.length).toBeGreaterThan(0));
      expect(playingWhenSpoken.every((playing) => !playing)).toBe(true);
      await pausedHere();
    });
    And("the speaking bar offers Resume in place of Pause", firstIsResume);
    When('the phone finishes the word', () => {
      act(() => synth.finish());
    });
    Then('the audio element plays on from the second it was paused at', playsOnFromHeld);
    And('the speaking bar is playing and shows Previous verse, Pause, Restart, Next verse and Stop', () => barPlaying());
  });

  Scenario('A hold to ask pauses the recording and a Listen goes on when the hold ends', ({ Given, When, Then, And }) => {
    let session: { stop(): Promise<unknown> } | null = null;
    Given(opened, () => open());
    When('he taps the heading {string}', tapSectionHeading);
    And('he taps {string} in the Verse view', tapListen);
    And('the recording passes the end of verse {int}', passes);
    And('a hold to ask begins', () => {
      stubRecognizer();
      const started = askTranscriber.start({ lang: 'en-US' });
      if (!started.ok) throw new Error('the hold did not start');
      session = started.session;
      FakeRecognizer.last().open();
    });
    Then('the audio element was paused', pausedHere);
    And("the speaking bar offers Resume in place of Pause", firstIsResume);
    When('the hold to ask ends', async () => {
      const ended = session?.stop();
      act(() => FakeRecognizer.last().onend?.());
      await ended;
    });
    Then('the audio element plays on from the second it was paused at', playsOnFromHeld);
  });

  const goesHidden = () => {
    heldAt = element().currentTime;
    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };
  const lockScreenSays = (_: unknown, title: string, playbackState: string) => {
    expect(session.metadata?.title).toBe(title);
    expect(session.metadata?.artist).toBe('Majority Standard Bible, read by David');
    expect(session.metadata?.album).toBe('Lampas');
    expect(session.playbackState).toBe(playbackState);
  };

  Scenario('A page that hides does not pause the recording: the verse marked follows the recording and the lock screen shows the chapter', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the page goes hidden', goesHidden);
    Then('the audio element is still playing', () => expect(audio.playing()).toBe(recordingElement()));
    And('the reading is not paused', () => expect(getReading().status).toBe('reading'));
    And('the lock screen says {string} and {word}', lockScreenSays);
    When('the recording goes on past the end of verse {int}', passes);
    Then('verse {int} is marked as being read', marked);
    When('the page comes back', () => {
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    });
    Then('the audio element still plays', () => expect(audio.playing()).toBe(recordingElement()));
    And('verse {int} is still the verse marked', marked);
    And('the speaking bar is playing and shows Previous verse, Pause, Restart, Next verse and Stop', () => barPlaying());
  });

  Scenario("The lock screen's Pause and Play steer a recorded reading while the page is hidden", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the page goes hidden', goesHidden);
    And('he presses Pause on the lock screen', () => {
      heldAt = element().currentTime;
      act(() => session.handlers.pause?.());
    });
    Then('the audio element is paused', paused);
    And('the lock screen says {string} and {word}', lockScreenSays);
    When('he presses Play on the lock screen', () => {
      act(() => session.handlers.play?.());
    });
    Then('the audio element plays on from the second it was paused at', playsOnFromHeld);
    And('the lock screen then says {string} and {word}', lockScreenSays);
  });

  Scenario('Hidden, Play to End of the book turns to John 4 and the lock screen says John 4', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he selects verse {int} and taps {string}', selectAndReadFromHere);
    And('the page goes hidden', goesHidden);
    And('the recording passes the end of verse {int}', passes);
    Then('the Reader shows John 4', async () => {
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
    });
    And('the audio element plays the recording of John 4 from its start', async () => {
      await waitFor(() => expect(audio.sources).toEqual([audioOf(3), audioOf(4)]));
      expect(audio.playing()).toBe(recordingElement());
      expect(element().src).toBe(audioOf(4));
      expect(audio.playedAt).toEqual([startOf(36), 0]);
    });
    And('verse {int} is marked as being read', marked);
    And('the lock screen says {string} and {word}', lockScreenSays);
  });

  Scenario('Leaving the Reader pauses the recording and opening another chapter ends it', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('he opens Settings', () => goTo('#/settings'));
    Then('the audio element is paused', paused);
    And('the reading is paused', () => expect(getReading().status).toBe('paused'));
    When('he opens John 3 again', async () => {
      await goTo('#/?b=jhn&c=3');
      await screen.findByRole('heading', { name: 'John 3', level: 1 });
    });
    Then("the speaking bar offers Resume in place of Pause", firstIsResume);
    When('he opens John 4 by hand', async () => {
      await goTo('#/?b=jhn&c=4');
      await screen.findByRole('heading', { name: 'John 4', level: 1 });
    });
    Then('the reading is idle', async () => {
      await waitFor(() => expect(getReading().status).toBe('idle'));
      expect(audio.playing()).toBeNull();
    });
    And('there is no speaking bar', noBar);
  });

  Scenario('There is only one speaking bar', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('he taps "Pause" on the speaking bar', () => onBar(null, 'Pause'));
    Then('the page holds exactly one speaking bar', async () => {
      await firstIsResume();
      expect(speakingBars()).toHaveLength(1);
    });
  });

  // Skip a verse (mw-82lb97i.19)
  const plays = () => expect(audio.playing()).toBe(recordingElement());
  const noSkipOnLockScreen = () => {
    expect(session.handlers.previoustrack ?? null).toBeNull();
    expect(session.handlers.nexttrack ?? null).toBeNull();
  };
  const secondsInto = (_: unknown, seconds: number | string, n: number) => {
    act(() => audio.advanceTo(startOf(n) + Number(seconds)));
    expect(getReading().verse).toBe(n);
  };
  const pausedAtStartOf = async (_: unknown, n: number) => {
    await waitFor(() => expect(audio.playing()).toBeNull());
    expect(element().currentTime).toBe(startOf(n));
  };
  const showsJohn4 = async () => {
    await screen.findByRole('heading', { name: 'John 4', level: 1 });
  };
  const john4FromStart = async () => {
    await waitFor(() => expect(audio.sources).toEqual([audioOf(3), audioOf(4)]));
    plays();
    expect(audio.playedAt).toEqual([startOf(36), 0]);
  };
  const lockScreenHasSkip = () => {
    expect(session.handlers.previoustrack).toBeTypeOf('function');
    expect(session.handlers.nexttrack).toBeTypeOf('function');
  };

  Scenario('Next verse skips to the start of the verse after the one being read and the reading plays on', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the recording plays {int} seconds into verse {int}', secondsInto);
    And('he taps "Next verse" on the speaking bar', () => onBar(null, 'Next verse'));
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
    When('the recording passes the end of verse {int}', passes);
    Then('verse {int} is marked as being read', marked);
  });

  ScenarioOutline('Previous verse goes to the start of the verse before, however far into this one the reading is', ({ Given, When, Then, And }, row) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the recording plays <seconds> seconds into verse 5', () => secondsInto(null, row.seconds, 5));
    And('he taps "Previous verse" on the speaking bar', () => onBar(null, 'Previous verse'));
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
  });

  Scenario('Next verse on a paused reading leaves it paused at the start of the next verse', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    And('the recording plays {int} seconds into verse {int}', secondsInto);
    And('he taps "Pause" on the speaking bar', () => onBar(null, 'Pause'));
    And('he taps "Next verse" on the speaking bar', () => onBar(null, 'Next verse'));
    Then('the audio element is paused at the start of verse {int}', pausedAtStartOf);
    And('verse {int} is marked as being read', marked);
    And('the reading is paused', () => expect(getReading().status).toBe('paused'));
    And('the speaking bar offers Resume in place of Pause', firstIsResume);
  });

  Scenario("Previous verse at the chapter's first verse changes nothing", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording plays {int} seconds into verse {int}', secondsInto);
    And('he taps "Previous verse" on the speaking bar', () => onBar(null, 'Previous verse'));
    Then('nothing changes: the recording plays on 4 seconds into verse 1', () => {
      plays();
      expect(audio.playedAt).toEqual([0]);
      expect(element().currentTime).toBe(startOf(1) + 4);
      expect(getReading()).toMatchObject({ status: 'reading', verse: 1 });
    });
  });

  Scenario('Next verse at the last verse of John 3 during Play to End plays John 4 from its first verse', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he selects verse {int} and taps {string}', selectAndReadFromHere);
    And('he taps "Next verse" on the speaking bar', () => onBar(null, 'Next verse'));
    Then('the Reader shows John 4', showsJohn4);
    And('the audio element plays the recording of John 4 from its start', john4FromStart);
    And('verse {int} is marked as being read', marked);
  });

  Scenario('A Listen of a section never leaves its section: Next verse at its last verse does nothing', ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps the heading {string}', tapSectionHeading);
    And('he taps {string} in the Verse view', tapListen);
    And('the recording passes the end of verse {int}', passes);
    And('he taps "Next verse" on the speaking bar', () => onBar(null, 'Next verse'));
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
    When('he taps "Next verse" on the speaking bar', () => onBar(null, 'Next verse'));
    Then('nothing changes: the recording plays on at the start of verse 21', () => {
      plays();
      expect(element().currentTime).toBe(startOf(21));
      expect(getReading()).toMatchObject({ status: 'reading', verse: 21, crossing: null });
    });
  });

  Scenario("The lock screen's previous and next track skip a verse like the buttons and are cleared when the reading ends", ({ Given, When, Then, And }) => {
    Given(opened, () => open());
    When('he taps {string}', tapHeader);
    And('the recording passes the end of verse {int}', passes);
    Then('the lock screen offers previous and next track', lockScreenHasSkip);
    When('he presses Next on the lock screen', () => {
      act(() => session.handlers.nexttrack?.());
    });
    Then('the audio element plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is marked as being read', marked);
    When('he presses Previous on the lock screen', () => {
      act(() => session.handlers.previoustrack?.());
    });
    Then('the audio element then plays on from the start of verse {int}', playsFromStartOf);
    And('verse {int} is then marked as being read', marked);
    When('he taps "Stop" on the speaking bar', () => onBar(null, 'Stop'));
    Then('the lock screen has no previous or next track', noSkipOnLockScreen);
  });

  Scenario("The phone's voice has no skip buttons on its bar and no previous or next track", ({ Given, And, When, Then }) => {
    Given(opened, () => open());
    And('the Bible voice is Phone voice', async () => {
      await setSetting(bibleVoiceSetting, 'phone');
      await waitFor(() => expect(wantsRecording()).toBeNull());
    });
    When('he taps {string}', tapHeader);
    Then("the phone's voice bar has no Previous verse or Next verse", async () => {
      await screen.findByRole('region', { name: 'Speaking' });
      const names = barLabels();
      expect(names.length).toBeGreaterThan(0);
      expect(names).not.toContain('Previous verse');
      expect(names).not.toContain('Next verse');
    });
    And('the lock screen has no previous or next track', noSkipOnLockScreen);
  });
});
