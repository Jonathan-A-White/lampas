// tests/unit/recorded-restart-listen.test.ts — the speaking bar's Restart on a recorded Listen (restartListen, mw-82lb97i.48): his John 1:50 played alone by the Verse view's Play
// went back on Restart to the chapter's first verse (the plan's first, the Listen of a verse being started with the whole chapter's plan) and read John 1:1. Every reach of a recorded
// Listen as src/reader/useReadFrom.ts starts it (a verse, a passage, the whole chapter), played on into its second verse and Restarted, plays again at the second it first played at:
// the start of the first verse of what was started, never before it (the whole chapter's from its announcement, as it began). The element is tests/support/fake-audio.ts.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { getReading, listenKeyOf, planOf, restartListen, startReading, stopReading, type StartOptions } from '../../src/speech/readAloud';
import { resetRecordedVoice } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/jhn/3.json', 'utf8')) as Chapter;
const plan = () => planOf(chapter.verses, 'english', null);
/** verse n's recording is 5 + 10 (n - 1) to 5 + 10 n */
const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/jhn-3.mp3',
  duration: 400,
  verses: chapter.verses.map((v, i): [number, number, number] => [v.n, 5 + i * 10, 5 + (i + 1) * 10]),
};
const startOf = (n: number): number => TIMINGS.verses.find(([v]) => v === n)![1];

let audio: FakeAudio;

beforeEach(() => {
  clearBus();
  resetRecordedVoice();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
});

afterEach(() => {
  stopReading();
  resetRecordedVoice();
  vi.restoreAllMocks();
});

const passage = (first: number, last: number) => plan().filter((v) => v.n >= first && v.n <= last);

/** Each Listen as useReadFrom starts it: listenVerse with the chapter's whole plan, listenTo with the passage's verses only (the whole chapter's with its title). */
const REACHES: Array<{ name: string; options: StartOptions; first: number; firstSecond: number }> = [
  {
    name: 'a verse (John 3:16, the Verse view’s Play)',
    options: { book: 'jhn', chapter: 3, plan: plan(), from: 16, continuous: false, span: 'verse', listen: listenKeyOf('jhn', 3, '16'), recorded: TIMINGS },
    first: 16,
    firstSecond: startOf(16),
  },
  {
    name: 'a verse at the chapter’s top (John 3:1)',
    options: { book: 'jhn', chapter: 3, plan: plan(), from: 1, continuous: false, span: 'verse', listen: listenKeyOf('jhn', 3, '1'), recorded: TIMINGS },
    first: 1,
    firstSecond: startOf(1),
  },
  {
    name: 'a passage (John 3:16–21)',
    options: { inBook: 'jhn', chapter: 3, plan: passage(16, 21), from: 16, continuous: true, span: 'chapter', title: false, listen: listenKeyOf('jhn', 3, '16'), recorded: TIMINGS },
    first: 16,
    firstSecond: startOf(16),
  },
  {
    name: 'a passage at the chapter’s top (John 3:1–15)',
    options: { inBook: 'jhn', chapter: 3, plan: passage(1, 15), from: 1, continuous: true, span: 'chapter', title: false, listen: listenKeyOf('jhn', 3, '1'), recorded: TIMINGS },
    first: 1,
    firstSecond: startOf(1),
  },
  {
    name: 'the whole chapter (John 3, from its announcement)',
    options: { inBook: 'jhn', chapter: 3, plan: plan(), from: 1, continuous: true, span: 'chapter', title: true, listen: listenKeyOf('jhn', 3, '1'), recorded: TIMINGS },
    first: 1,
    firstSecond: 0,
  },
];

describe('Restart on a recorded Listen (mw-82lb97i.48)', () => {
  it.each(REACHES)('$name plays again from the first verse of what was started, never before it', async ({ options, first, firstSecond }) => {
    startReading(options);
    await Promise.resolve();
    expect(audio.playedAt).toEqual([firstSecond]);
    const into = options.continuous ? startOf(first) + 15 : startOf(first) + 5;
    audio.advanceTo(into);
    expect(getReading().recorded).toBe(true);

    expect(restartListen()).toBe(true);
    await Promise.resolve();
    expect(audio.playedAt.at(-1), 'the second Restart plays from').toBe(firstSecond);
    expect(getReading().verse, 'the verse the bar says it reads').toBe(first);
    const element = audio.playing();
    expect(element, 'the recording plays').not.toBeNull();
    expect(element!.currentTime).toBeGreaterThanOrEqual(firstSecond);
  });
});
