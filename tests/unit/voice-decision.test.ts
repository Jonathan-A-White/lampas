// tests/unit/voice-decision.test.ts — the Bible voice explains itself (mw-zbgo4ep.30, src/speech/voiceDecision.ts): the default is Recording on Wi-Fi only, a one-time notice when mobile
// data means the phone voice, "David hasn't recorded <Book> here yet" on Wi-Fi, and, on data with Wi-Fi only on, one question about playing David over data.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { forgetTimings, loadBookTimings } from '../../src/data/audioTimings';
import { bibleVoiceSetting } from '../../src/settings/definitions';
import { setConnectionForTests } from '../../src/speech/connection';
import type { PlanVerse } from '../../src/speech/readAloud';
import { resetRecordedVoice, setBibleVoice, wantsRecording } from '../../src/speech/recordedVoice';
import { DATA_NOTICE, DATA_QUESTION, decideVoice, forgetVoiceNotices, notRecordedNotice } from '../../src/speech/voiceDecision';

const chapter = { book: 'jhn', chapter: 3, translation: 'msb', source: 'grc', verses: [] } as unknown as Chapter;
const other = { ...chapter, book: 'act', chapter: 1 } as unknown as Chapter;
const verses: PlanVerse[] = [1, 2].map((n) => ({ n, runs: [{ text: `verse ${n}`, language: 'english' as const }] }));
const index = { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [3] } };
const book = { v: 1, edition: 'msb-david', book: 'jhn', chapters: { '3': { audio: 'https://openbible.com/audio/x.mp3', duration: 30, verses: [[1, 1, 10], [2, 10, 20]] } } };

beforeEach(async () => {
  window.localStorage.clear();
  forgetTimings();
  forgetVoiceNotices();
  resetRecordedVoice();
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/index.json')) return Promise.resolve(Response.json(index));
    if (url.endsWith('/jhn.json')) return Promise.resolve(Response.json(book));
    return Promise.resolve(new Response('no', { status: 404 }));
  });
  await loadBookTimings('jhn');
  await loadBookTimings('act');
});
afterEach(() => {
  setConnectionForTests(undefined);
  vi.unstubAllGlobals();
  forgetTimings();
});

describe('the default', () => {
  it('is Recording on Wi-Fi only', () => {
    expect(bibleVoiceSetting.default).toBe('msb-david-wifi');
    expect(bibleVoiceSetting.parse(undefined)).toBe('msb-david-wifi');
    expect(bibleVoiceSetting.parse('phone')).toBe('phone');
  });
  it('plays David on Wi-Fi and on a phone that cannot tell, not on mobile data', () => {
    setBibleVoice('msb-david-wifi');
    setConnectionForTests({ type: 'wifi' });
    expect(wantsRecording()).toBe('msb-david');
    setConnectionForTests(null);
    expect(wantsRecording()).toBe('msb-david');
    setConnectionForTests({ type: 'cellular' });
    expect(wantsRecording()).toBeNull();
  });
  it('says the data use and that books arrive as they are timed, in its help', () => {
    expect(bibleVoiceSetting.help).toContain('1.4 MB a minute');
    expect(bibleVoiceSetting.help).toMatch(/as they are timed/);
  });
});

describe('on mobile data with Recording on Wi-Fi only', () => {
  beforeEach(() => {
    setBibleVoice('msb-david-wifi');
    setConnectionForTests({ type: 'cellular' });
  });
  it('asks once, in MB a minute, in a chapter that has David', () => {
    expect(DATA_QUESTION).toBe('Play David over mobile data? It uses about 1.4 MB a minute (about 86 MB an hour).');
    const first = decideVoice('jhn', chapter, verses, true);
    expect(first.ask).toBe(true);
    expect(first.recorded?.audio).toMatch(/openbible/);
    expect(first.notice).toBeUndefined();
  });
  it('never asks again once answered, and tells the one-time notice then', () => {
    decideVoice('jhn', chapter, verses, true);
    window.localStorage.setItem('lampas.dataVoiceAsked', '1');
    const again = decideVoice('jhn', chapter, verses, true);
    expect(again.ask).toBeUndefined();
    expect(again.recorded).toBeUndefined();
    expect(again.notice).toBe(DATA_NOTICE);
    expect(DATA_NOTICE).toBe('On mobile data Lampas reads in the phone voice. David plays on Wi-Fi.');
    expect(decideVoice('jhn', chapter, verses, true).notice).toBeUndefined();
  });
  it('does not ask when asking is not allowed (a crossing into the next chapter): the phone voice, with the notice', () => {
    const crossing = decideVoice('jhn', chapter, verses, false);
    expect(crossing.ask).toBeUndefined();
    expect(crossing.recorded).toBeUndefined();
    expect(crossing.notice).toBe(DATA_NOTICE);
  });
  it('gives the one-time notice, and no question, in a chapter with no David', () => {
    const none = decideVoice('act', other, verses, true);
    expect(none.ask).toBeUndefined();
    expect(none.recorded).toBeUndefined();
    expect(none.notice).toBe(DATA_NOTICE);
    expect(decideVoice('act', other, verses, true).notice).toBeUndefined();
  });
});

describe('on Wi-Fi', () => {
  beforeEach(() => setConnectionForTests({ type: 'wifi' }));
  it.each(['msb-david-wifi', 'msb-david'] as const)("with '%s' plays David where he has recorded", (voice) => {
    setBibleVoice(voice);
    expect(decideVoice('jhn', chapter, verses, true)).toEqual({ recorded: expect.objectContaining({ audio: expect.stringMatching(/openbible/) }) });
  });
  it.each(['msb-david-wifi', 'msb-david'] as const)("with '%s' says David has not recorded the book here yet, once a book a session", (voice) => {
    setBibleVoice(voice);
    expect(notRecordedNotice('Acts')).toBe("David hasn't recorded Acts here yet: the phone voice reads it.");
    expect(decideVoice('act', other, verses, true)).toEqual({ notice: "David hasn't recorded Acts here yet: the phone voice reads it." });
    expect(decideVoice('act', other, verses, true)).toEqual({});
  });
  it('says nothing for the phone voice, for Greek or when the timings are not known yet', () => {
    setBibleVoice('phone');
    expect(decideVoice('act', other, verses, true)).toEqual({});
    setBibleVoice('msb-david');
    expect(decideVoice('act', other, [{ n: 1, runs: [{ text: 'λόγος', language: 'greek' }] }], true)).toEqual({});
    forgetTimings();
    expect(decideVoice('act', other, verses, true)).toEqual({});
  });
});
