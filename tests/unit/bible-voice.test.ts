// tests/unit/bible-voice.test.ts — the Bible voice setting (mw-82lb97i.6, src/settings/definitions/bibleVoice.ts) and the rule that reads it
// (src/speech/recordedVoice.ts wantsRecording): which recording, if any, the Bible is read in, given the choice and the kind of connection (src/speech/connection.ts,
// faked through its setter). And, against the real committed timings of the recorded voice, which chapters are offered the recording.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillChapter, type Chapter } from '../../src/data/chapter';
import { forgetTimings, loadBookTimings } from '../../src/data/audioTimings';
import { bibleVoiceSetting } from '../../src/settings/definitions';
import { setConnectionForTests, type ConnectionKind } from '../../src/speech/connection';
import type { PlanVerse } from '../../src/speech/readAloud';
import { recordingFor, resetRecordedVoice, setBibleVoice, wantsRecording } from '../../src/speech/recordedVoice';

/** A navigator.connection of this kind: null is a phone that has none. */
const connectionOf = (kind: ConnectionKind) => (kind === null ? null : { type: kind === 'wifi' ? 'wifi' : 'cellular' });

afterEach(() => {
  setConnectionForTests(undefined);
  resetRecordedVoice();
});

describe('the Bible voice setting', () => {
  it('is Recording (David) to start, with the three choices keyed by the voice id', () => {
    expect(bibleVoiceSetting.key).toBe('bibleVoice');
    expect(bibleVoiceSetting.default).toBe('msb-david');
    expect(bibleVoiceSetting.section).toBe('voices');
    expect(bibleVoiceSetting.label).toBe('Bible voice');
    expect(bibleVoiceSetting.allowed).toEqual({
      kind: 'choice',
      values: [
        { value: 'msb-david', label: 'Recording (David)' },
        { value: 'msb-david-wifi', label: 'Recording on Wi-Fi only' },
        { value: 'phone', label: 'Phone voice' },
      ],
    });
  });

  it('has a hint of at most 90 characters, and a help that opens with the credit line', () => {
    expect(bibleVoiceSetting.hint).toBe('The MSB read by David, streamed, where Lampas has it (John so far); else the phone voice.');
    expect(bibleVoiceSetting.hint.length).toBeLessThanOrEqual(90);
    expect(bibleVoiceSetting.help).toMatch(/^Recording: Majority Standard Bible, read by David, streamed from openbible\.com/);
    expect(bibleVoiceSetting.help).toContain('internet');
    expect(bibleVoiceSetting.help).toContain('John');
  });

  it('reads a saved value that is not a choice as the default', () => {
    expect(bibleVoiceSetting.parse('msb-david-wifi')).toBe('msb-david-wifi');
    expect(bibleVoiceSetting.parse('phone')).toBe('phone');
    expect(bibleVoiceSetting.parse('nonsense')).toBe('msb-david');
    expect(bibleVoiceSetting.parse(undefined)).toBe('msb-david');
  });
});

describe('wantsRecording', () => {
  const kinds: ConnectionKind[] = ['wifi', 'other', null];

  it.each(kinds)("'msb-david' wants the recording whatever the connection (%s)", (kind) => {
    setConnectionForTests(connectionOf(kind));
    setBibleVoice('msb-david');
    expect(wantsRecording()).toBe('msb-david');
  });

  it.each([
    ['wifi', 'msb-david'],
    ['other', null],
    [null, null],
  ] as const)("'msb-david-wifi' on a %s connection wants %s", (kind, wanted) => {
    setConnectionForTests(connectionOf(kind));
    setBibleVoice('msb-david-wifi');
    expect(wantsRecording()).toBe(wanted);
  });

  it.each(kinds)("'phone' never wants the recording (%s)", (kind) => {
    setConnectionForTests(connectionOf(kind));
    setBibleVoice('phone');
    expect(wantsRecording()).toBeNull();
  });

  it('follows the connection as it changes, for the Wi-Fi choice', () => {
    setBibleVoice('msb-david-wifi');
    setConnectionForTests({ type: 'wifi' });
    expect(wantsRecording()).toBe('msb-david');
    setConnectionForTests({ type: 'cellular' });
    expect(wantsRecording()).toBeNull();
  });

  it('is the recording before any choice is told (the setting starts at Recording (David))', () => {
    expect(wantsRecording()).toBe('msb-david');
  });
});

describe("the real timings of the recorded voice (public/data/audio/msb-david, mw-82lb97i.2)", () => {
  const read = (path: string): string => readFileSync(`public/${path}`, 'utf8');
  const chapterOf = (key: string): Chapter => fillChapter(JSON.parse(read(`data/${key}.json`)) as Chapter);
  const english = (chapter: Chapter): PlanVerse[] =>
    chapter.verses.map((v) => ({ n: v.n, runs: [{ text: v.e.map((c) => c.t).join(' '), language: 'english' as const }] }));

  beforeEach(() => {
    forgetTimings();
    setBibleVoice('msb-david');
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/data/audio/msb-david/')) return Promise.resolve(new Response(read(url.slice(1)), { status: 200 }));
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    forgetTimings();
  });

  it('offers John 3 the recording and Acts 1 none', async () => {
    await loadBookTimings('jhn');
    await loadBookTimings('act');
    const john = chapterOf('jhn/3');
    const acts = chapterOf('act/1');
    expect(recordingFor('jhn', john, english(john))?.audio).toMatch(/^https:\/\/openbible\.com\//);
    expect(recordingFor('act', acts, english(acts))).toBeUndefined();
  });

  it('offers John 3 nothing when the Bible voice is the phone voice', async () => {
    await loadBookTimings('jhn');
    setBibleVoice('phone');
    const john = chapterOf('jhn/3');
    expect(recordingFor('jhn', john, english(john))).toBeUndefined();
  });
});
