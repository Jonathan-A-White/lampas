// tests/unit/readAloud.test.ts — read aloud (mw-5r3p30.21): what is read is exactly what is shown, a woven verse changes
// voice with its language, Read from the top runs to the chapter's end, Pause and Stop. The engine is a fake that records.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters } from '../../src/data/chapter';
import { clearBus, latest, subscribe } from '../../src/events/bus';
import type { Chapter, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { continueReading, getReading, pauseReading, planOf, resumeReading, runsOf, startReading, stopReading } from '../../src/speech/readAloud';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = (n: number): Verse => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const joined = (parts: string[]) => parts.join(' ').replace(/\s+/g, ' ').trim();
const englishOf = (v: Verse) => joined(v.e.map((c) => c.t));
const greekOf = (v: Verse) => joined(v.g.map((w) => w.t));

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  stopReading();
  vi.unstubAllGlobals();
});

const plan = (view: 'english' | 'greek', solid: string[] = []) =>
  planOf(chapter.verses, view, solid.length ? chapter.verses.map((v) => weaveVerse(v, { solid: new Set(solid) })) : null);

describe('what is read is what is shown', () => {
  it('the English view reads the English chunks in order, in en-US', () => {
    const v = verse(1);
    const runs = runsOf(v, 'english', null);
    expect(runs.every((r) => r.language === 'english')).toBe(true);
    expect(joined(runs.map((r) => r.text))).toBe(englishOf(v));
    startReading({ chapter: 8, plan: plan('english'), from: 1, continuous: false });
    expect(synth.spoken.length).toBeGreaterThanOrEqual(1);
    expect(synth.spoken.every((u) => u.lang === 'en-US')).toBe(true);
    synth.finishAll();
    expect(joined(synth.spoken.map((u) => u.text))).toBe(englishOf(v));
  });

  it('the Greek view reads the Greek words in Greek order, in el-GR', () => {
    const v = verse(1);
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: false });
    synth.finishAll();
    expect(synth.spoken.every((u) => u.lang === 'el-GR')).toBe(true);
    expect(joined(synth.spoken.map((u) => u.text))).toBe(greekOf(v));
    expect(synth.spoken[0].voice).toBe(GREEK_VOICE);
  });

  it('a woven verse reads the woven chunk in Greek and its neighbours in English, in runs', () => {
    const v = verse(1);
    const woven = weaveVerse(v, { solid: new Set(['Χριστός']) });
    const at = woven.findIndex(Boolean);
    expect(at).toBeGreaterThan(0);
    const runs = runsOf(v, 'english', woven);
    const greekRuns = runs.filter((r) => r.language === 'greek');
    expect(greekRuns).toHaveLength(1);
    expect(greekRuns[0].text).toBe((woven[at]?.words ?? []).map((w) => w.t).join(' '));
    // the voice changes only where the language does
    runs.forEach((r, i) => i > 0 && expect(r.language).not.toBe(runs[i - 1].language));
    // in order: the English before the woven chunk, the woven chunk, the English after it
    expect(runs.map((r) => r.language)).toEqual(['english', 'greek', 'english']);
    const before = joined(v.e.slice(0, at).map((c) => c.t));
    const after = joined(v.e.slice(at + 1).map((c) => c.t));
    expect(runs[0].text).toBe(before);
    expect(runs[2].text).toBe(after);

    startReading({ chapter: 8, plan: plan('english', ['Χριστός']), from: 1, continuous: false });
    synth.finishAll();
    expect(synth.spoken.map((u) => u.lang)).toEqual(['en-US', 'el-GR', 'en-US']);
    expect(synth.spoken.map((u) => u.text)).toEqual(runs.map((r) => r.text));
  });
});

describe('reading a chapter', () => {
  it('Read from the top speaks verse 1 to the last verse in order and publishes verse-reading for each', () => {
    const seen: number[] = [];
    subscribe('verse-reading', (e) => seen.push(e.verse));
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: true });
    expect(getReading().status).toBe('reading');
    expect(getReading().verse).toBe(1);
    synth.finishAll();
    expect(seen).toEqual(chapter.verses.map((v) => v.n));
    expect(joined(synth.spoken.map((u) => u.text))).toBe(joined(chapter.verses.map(greekOf)));
    expect(getReading().status).toBe('idle');
    expect(latest('reading-stopped')).toBeDefined();
  });

  it('reads from a chosen verse to the end', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 30, continuous: true });
    synth.finishAll();
    expect(synth.spoken[0].text).toBe(greekOf(verse(30)));
    expect(synth.spoken).toHaveLength(chapter.verses.filter((v) => v.n >= 30).length);
  });

  it('one verse alone stops at its end', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 3, continuous: false });
    synth.finishAll();
    expect(synth.spoken.map((u) => u.text)).toEqual([greekOf(verse(3))]);
    expect(getReading().status).toBe('idle');
  });

  it('Stop mid-chapter speaks nothing more', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: true });
    synth.finish();
    synth.finish();
    const before = synth.spoken.length;
    stopReading();
    expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
    expect(getReading().status).toBe('idle');
    expect(getReading().verse).toBeNull();
    expect(synth.spoken).toHaveLength(before);
    expect(() => synth.finish()).toThrow();
  });

  it('a finished utterance that arrives after Stop starts nothing', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: true });
    const u = synth.spoken[0];
    stopReading();
    u.utterance.onend?.({} as never);
    expect(synth.spoken).toHaveLength(1);
  });

  it('Pause then resume continues from the same verse', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: true });
    synth.finish();
    synth.finish();
    expect(getReading().verse).toBe(3);
    pauseReading();
    expect(getReading().status).toBe('paused');
    expect(getReading().verse).toBe(3);
    const count = synth.spoken.length;
    resumeReading();
    expect(getReading().status).toBe('reading');
    expect(synth.spoken).toHaveLength(count + 1);
    expect(synth.spoken[count].text).toBe(greekOf(verse(3)));
    synth.finish();
    expect(synth.spoken[count + 1].text).toBe(greekOf(verse(4)));
  });

  it('starting a new reading cancels the old one first', () => {
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: true });
    startReading({ chapter: 8, plan: plan('greek'), from: 5, continuous: false });
    expect(synth.calls.slice(-2)).toEqual(['cancel', `speak ${greekOf(verse(5))}`]);
    expect(getReading().verse).toBe(5);
  });

  it('a phone with no Greek voice says so once and still speaks with lang el-GR', () => {
    vi.unstubAllGlobals();
    synth = stubSpeech([ENGLISH_VOICE]);
    startReading({ chapter: 8, plan: plan('greek'), from: 1, continuous: false });
    expect(getReading().notice).toBe('This phone has no Greek voice: Greek is read with the default voice');
    expect(synth.spoken[0].lang).toBe('el-GR');
    expect(synth.spoken[0].text).toBe(greekOf(verse(1)));
  });

  it('English alone needs no Greek voice and shows no notice', () => {
    vi.unstubAllGlobals();
    synth = stubSpeech([ENGLISH_VOICE]);
    startReading({ chapter: 8, plan: plan('english'), from: 1, continuous: false });
    expect(getReading().notice).toBeNull();
  });
});

describe('the Read aloud span', () => {
  const rom9 = JSON.parse(readFileSync('public/data/rom/9.json', 'utf8')) as Chapter;
  const chapter9 = (headingOnFirst: boolean): Chapter => ({
    ...rom9,
    verses: rom9.verses.map((v, i) => (i === 0 && !headingOnFirst ? { ...v, h: undefined } : v)),
  });
  const stubNext = (next: Chapter) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(next), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    );
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const spokenVerses: number[] = [];
  beforeEach(() => {
    forgetChapters();
    spokenVerses.length = 0;
    subscribe('verse-reading', (e) => spokenVerses.push(e.verse));
    window.location.hash = '';
  });
  const at = (n: number, span: 'verse' | 'passage' | 'chapter' | 'book', continuous = true) =>
    startReading({ book: 'rom', chapter: 8, plan: plan('english'), from: n, continuous, span });

  it('Verse reads the verse started from; Passage reads to the next heading; Chapter to the end', () => {
    at(9, 'verse');
    synth.finishAll();
    expect(spokenVerses).toEqual([9]);
    spokenVerses.length = 0;
    at(9, 'passage');
    synth.finishAll();
    expect(spokenVerses).toEqual([9, 10, 11]);
    spokenVerses.length = 0;
    at(37, 'chapter');
    synth.finishAll();
    expect(spokenVerses).toEqual([37, 38, 39]);
    expect(getReading().status).toBe('idle');
  });

  it('a verse button reading stays one verse whatever the span', () => {
    at(9, 'book', false);
    synth.finishAll();
    expect(spokenVerses).toEqual([9]);
  });

  it('a Passage ends at the chapter break when the next chapter opens with a heading', async () => {
    stubNext(chapter9(true));
    at(36, 'passage');
    synth.finishAll();
    await settle();
    expect(spokenVerses).toEqual([36, 37, 38, 39]);
    expect(getReading().status).toBe('idle');
    expect(window.location.hash).toBe('');
  });

  it('a Passage goes on across a chapter break when the next chapter has no heading before its first verse', async () => {
    stubNext(chapter9(false));
    at(36, 'passage');
    synth.finishAll();
    await settle();
    expect(getReading()).toMatchObject({ status: 'reading', verse: null, crossing: { book: 'rom', chapter: 9 } });
    expect(window.location.hash).toContain('c=9');
    // the Reader that opens Romans 9 hands over its plan, and the voice starts verse 1 at once
    const count = synth.spoken.length;
    continueReading({ book: 'rom', chapter: 9, plan: planOf(rom9.verses, 'english', null) });
    expect(synth.spoken).toHaveLength(count + 1);
    expect(spokenVerses).toEqual([36, 37, 38, 39, 1]);
    expect(getReading()).toMatchObject({ verse: 1, crossing: null });
    // and goes on to the next heading of Romans 9 (verse 6) only
    synth.finishAll();
    expect(spokenVerses).toEqual([36, 37, 38, 39, 1, 2, 3, 4, 5]);
  });

  it('Book crosses at once, and a plan for another chapter is not taken', async () => {
    stubNext(chapter9(true));
    at(39, 'book');
    synth.finishAll();
    await settle();
    expect(getReading().crossing).toEqual({ book: 'rom', chapter: 9 });
    const count = synth.spoken.length;
    continueReading({ book: 'rom', chapter: 10, plan: planOf(rom9.verses, 'english', null) });
    expect(synth.spoken).toHaveLength(count);
    continueReading({ book: 'rom', chapter: 9, plan: planOf(rom9.verses, 'english', null) });
    expect(synth.spoken).toHaveLength(count + 1);
  });

  it('Stop while crossing ends the reading and the Reader\'s plan then starts nothing', async () => {
    stubNext(chapter9(true));
    at(39, 'book');
    synth.finishAll();
    await settle();
    stopReading();
    expect(getReading().status).toBe('idle');
    const count = synth.spoken.length;
    continueReading({ book: 'rom', chapter: 9, plan: planOf(rom9.verses, 'english', null) });
    expect(synth.spoken).toHaveLength(count);
  });

  it('Pause while crossing waits, and Play lets the next chapter go on', async () => {
    stubNext(chapter9(true));
    at(39, 'book');
    synth.finishAll();
    await settle();
    pauseReading();
    continueReading({ book: 'rom', chapter: 9, plan: planOf(rom9.verses, 'english', null) });
    expect(getReading().status).toBe('paused');
    resumeReading();
    expect(getReading().status).toBe('reading');
    continueReading({ book: 'rom', chapter: 9, plan: planOf(rom9.verses, 'english', null) });
    expect(spokenVerses[spokenVerses.length - 1]).toBe(1);
  });

  it('a reading that has no book never leaves its chapter', async () => {
    startReading({ chapter: 8, plan: plan('english'), from: 39, continuous: true, span: 'book' });
    synth.finishAll();
    await settle();
    expect(getReading().status).toBe('idle');
  });
});
