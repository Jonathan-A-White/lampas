// tests/unit/passage-player.test.ts — the one passage player (src/speech/passagePlayer.ts, mw-9q8wp1.4): it reads each reference's verses in order through
// read aloud in the language the Reader reads in now, says '<reference>: skipping, no Old Testament present' for an Old Testament one and goes on, and has
// Pause, Resume and Stop. The engine is the honest fake on a manual clock.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { getSpeech } from 'voice-kit/speech';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { cardOf } from '../../src/markdown/verseLinks';
import { getPassagePlayer, onPassageChange, pausePassage, playPassages, resumePassage, stopPassage, type PassageRef, type PassageState } from '../../src/speech/passagePlayer';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const refOf = (written: string): PassageRef => {
  const card = cardOf(written);
  if (!card) throw new Error(`not a reference: ${written}`);
  return card;
};
const chapterOf = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const englishOf = (book: string, n: number, verse: number): string =>
  chapterOf(book, n)
    .verses.find((v) => v.n === verse)!
    .e.map((c) => c.t)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

let synth: FakeSynth;
let changes: [PassageState, string | null][];
let off: () => void;
beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  forgetChapters();
  await Promise.all(db.tables.map((table) => table.clear()));
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  changes = [];
  off = onPassageChange((state, current) => changes.push([state, current?.heading ?? null]));
});
afterEach(() => {
  stopPassage();
  stopReading();
  off();
  vi.unstubAllGlobals();
});

/** Lets the voice run until the player has nothing more to say, a reference at a time (the next one is fetched in between). */
async function listenToTheEnd(): Promise<void> {
  for (let i = 0; i < 50 && getPassagePlayer().state !== 'idle'; i++) {
    await vi.waitFor(() => expect(synth.speaking || getPassagePlayer().state === 'idle').toBe(true));
    if (synth.speaking) synth.finishAll();
    await Promise.resolve();
  }
  expect(getPassagePlayer().state).toBe('idle');
}

describe('the passage player reads references in order', () => {
  it('reads every verse of each reference, one after the other, in English', async () => {
    playPassages([refOf('Heb 7:1-2'), refOf('Rom 8:1')]);
    await listenToTheEnd();
    const said = synth.spoken.map((s) => s.text.replace(/\s+/g, ' ').trim());
    const wanted = [englishOf('heb', 7, 1), englishOf('heb', 7, 2), englishOf('rom', 8, 1)];
    // each verse is one speech or more; the lines joined must hold the verses in this order
    const all = said.join(' ');
    const at = wanted.map((w) => all.indexOf(w.slice(0, 40)));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(synth.spoken.every((s) => s.lang === 'en-US')).toBe(true);
    expect(changes.at(-1)).toEqual(['idle', null]);
  });

  it('tells which reference it is on as it goes', async () => {
    playPassages([refOf('Heb 7:2'), refOf('Rom 8:1')]);
    await listenToTheEnd();
    const heads = changes.filter(([s]) => s === 'playing').map(([, h]) => h);
    expect(heads).toContain('Hebrews 7:2');
    expect(heads).toContain('Romans 8:1');
    expect(heads.indexOf('Hebrews 7:2')).toBeLessThan(heads.indexOf('Romans 8:1'));
  });

  it('reads in Greek when the Reader is in the Greek view', async () => {
    await setReaderView('greek');
    playPassages([refOf('Rom 8:1')]);
    await listenToTheEnd();
    expect(synth.spoken.length).toBeGreaterThan(0);
    expect(synth.spoken.every((s) => s.lang === 'el-GR')).toBe(true);
  });
});

describe('an Old Testament reference', () => {
  it('is announced as skipped, and the player goes on to the New Testament one', async () => {
    playPassages([refOf('Isa 30:21'), refOf('Rom 8:1')]);
    await listenToTheEnd();
    expect(synth.spoken[0].text).toBe('Isaiah 30:21: skipping, no Old Testament present');
    expect(synth.spoken[0].lang).toBe('en-US');
    expect(synth.spoken.slice(1).map((s) => s.text).join(' ')).toContain(englishOf('rom', 8, 1).slice(0, 40));
  });

  it('speaks only the announcement when it is the whole list', async () => {
    playPassages([refOf('Ps 62:1-2')]);
    await listenToTheEnd();
    expect(synth.spoken.map((s) => s.text)).toEqual(['Psalm 62:1-2: skipping, no Old Testament present']);
  });
});

describe('Pause, Resume and Stop', () => {
  it('pauses the voice, and goes on from where it was', async () => {
    playPassages([refOf('Heb 7:1-2')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true));
    expect(getPassagePlayer().state).toBe('playing');
    pausePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('paused'));
    expect(getSpeech().status).toBe('paused');
    expect(changes.at(-1)).toEqual(['paused', 'Hebrews 7:1-2']);
    resumePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'));
    expect(getSpeech().status).toBe('playing');
    await listenToTheEnd();
  });

  it('stops for good: the speech is cancelled and the rest of the list is not read', async () => {
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true));
    stopPassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'idle', current: null });
    expect(synth.calls).toContain('cancel');
    expect(synth.speaking).toBe(false);
    const heard = synth.spoken.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(synth.spoken.length).toBe(heard);
    expect(changes.at(-1)).toEqual(['idle', null]);
  });

  it('stops while the next reference is still being fetched', async () => {
    playPassages([refOf('Isa 30:21'), refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true));
    synth.finishAll();
    stopPassage();
    await new Promise((r) => setTimeout(r, 50));
    expect(synth.spoken.map((s) => s.text)).toEqual(['Isaiah 30:21: skipping, no Old Testament present']);
  });

  it('is over for the player when something else takes the voice', async () => {
    playPassages([refOf('Heb 7:1-2')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true));
    stopReading();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('idle'));
  });
});
