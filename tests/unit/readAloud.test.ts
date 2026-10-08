// tests/unit/readAloud.test.ts — read aloud (mw-5r3p30.21): what is read is exactly what is shown, a woven verse changes
// voice with its language, Read from the top runs to the chapter's end, Pause and Stop. The engine is a fake that records.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBus, latest, subscribe } from '../../src/events/bus';
import type { Chapter, Verse } from '../../src/data/chapter';
import { weaveVerse } from '../../src/data/weave';
import { getReading, pauseReading, planOf, resumeReading, runsOf, startReading, stopReading } from '../../src/speech/readAloud';
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
  planOf(chapter.verses, view, solid.length ? chapter.verses.map((v) => weaveVerse(v, new Set(solid))) : null);

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
    const woven = weaveVerse(v, new Set(['Χριστός']));
    const at = woven.findIndex(Boolean);
    expect(at).toBeGreaterThan(0);
    const runs = runsOf(v, 'english', woven);
    const greekRuns = runs.filter((r) => r.language === 'greek');
    expect(greekRuns).toHaveLength(1);
    expect(greekRuns[0].text).toBe((woven[at] ?? []).map((w) => w.t).join(' '));
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
    u.onend?.();
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
