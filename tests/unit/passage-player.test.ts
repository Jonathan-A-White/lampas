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
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';

const refOf = (written: string): PassageRef => {
  const card = cardOf(written);
  if (!card) throw new Error(`not a reference: ${written}`);
  return card;
};
/** A reference to a book Lampas holds no data for: every book is held today (books.ts isHeld), so the card is made by hand, as cardOf makes it for a book without data. */
const unheldOf = (heading: string): PassageRef => ({ heading, held: null });
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
    await vi.waitFor(() => expect(synth.speaking || getPassagePlayer().state === 'idle').toBe(true), { timeout });
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
    expect(synth.spoken.map((s) => flat(s.text))).toEqual(expect.arrayContaining(['Hebrews 7:1-2', 'Romans 8:1']));
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
    expect(synth.spoken.length).toBeGreaterThan(1);
    // the heading is English; the verses are Greek
    expect(synth.spoken.slice(1).every((s) => s.lang === 'el-GR')).toBe(true);
  });
});

const flat = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('a New Testament reference is announced by its heading first (mw-9q8wp1.9)', () => {
  it('says the heading in English, then the verses, and a book with no data only its skip line', async () => {
    playPassages([refOf('John 10:27'), unheldOf('Psalm 62:1-2'), refOf('Heb 7:24-25')]);
    await listenToTheEnd();
    const said = synth.spoken.map((s) => flat(s.text));
    const john = said.indexOf('John 10:27');
    const skip = said.indexOf('Psalm 62:1-2: skipping, no Old Testament present');
    const heb = said.indexOf('Hebrews 7:24-25');
    expect(john).toBe(0);
    expect(synth.spoken[john].lang).toBe('en-US');
    expect(said.slice(john + 1, skip).join(' ')).toContain(englishOf('jhn', 10, 27).slice(0, 40));
    expect(skip).toBeGreaterThan(john);
    expect(heb).toBe(skip + 1);
    expect(said.slice(heb + 1).join(' ')).toContain(englishOf('heb', 7, 24).slice(0, 40));
    expect(said.slice(heb + 1).join(' ')).toContain(englishOf('heb', 7, 25).slice(0, 40));
    expect(said.filter((t) => t === 'Psalm 62:1-2')).toEqual([]);
    expect(changes.at(-1)).toEqual(['idle', null]);
  });

  it('is said in English even when the Reader reads Greek, and the verses follow in Greek', async () => {
    await setReaderView('greek');
    playPassages([refOf('Rom 8:1')]);
    await listenToTheEnd();
    expect(synth.spoken[0]).toMatchObject({ text: 'Romans 8:1', lang: 'en-US' });
    expect(synth.spoken.slice(1).every((s) => s.lang === 'el-GR')).toBe(true);
  });

  it('keeps the heading and the verses one reference: the end of the heading does not move on to the next', async () => {
    playPassages([refOf('Rom 8:1'), refOf('Heb 7:1')]);
    await vi.waitFor(() => expect(synth.spoken.length).toBe(1), { timeout });
    expect(flat(synth.spoken[0].text)).toBe('Romans 8:1');
    expect(getPassagePlayer()).toMatchObject({ state: 'playing', current: { heading: 'Romans 8:1' } });
    synth.finish();
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(1), { timeout });
    expect(flat(synth.spoken[1].text)).toContain(englishOf('rom', 8, 1).slice(0, 40));
    expect(getPassagePlayer()).toMatchObject({ state: 'playing', current: { heading: 'Romans 8:1' } });
    expect(changes.map(([, h]) => h)).not.toContain('Hebrews 7:1');
  });

  it('Pause during a heading pauses; Resume reads on into the verses', async () => {
    playPassages([refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    expect(flat(synth.spoken[0].text)).toBe('Romans 8:1');
    pausePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('paused'), { timeout });
    expect(getSpeech().status).toBe('paused');
    expect(getPassagePlayer().current?.heading).toBe('Romans 8:1');
    resumePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
    await listenToTheEnd();
    expect(synth.spoken.map((s) => flat(s.text)).join(' ')).toContain(englishOf('rom', 8, 1).slice(0, 40));
  });

  it('Stop during a heading ends the player, and the verses are never said', async () => {
    playPassages([refOf('Rom 8:1'), refOf('Heb 7:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    expect(flat(synth.spoken[0].text)).toBe('Romans 8:1');
    stopPassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'idle', current: null });
    await quiet();
    expect(synth.speaking).toBe(false);
    expect(synth.spoken.map((s) => flat(s.text))).toEqual(['Romans 8:1']);
  });

  it('the player bar names the reference whose heading is being said', async () => {
    playPassages([refOf('John 10:27'), refOf('Heb 7:24-25')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    expect(flat(synth.spoken.at(-1)!.text)).toBe('John 10:27');
    expect(getPassagePlayer().current?.heading).toBe('John 10:27');
    await finishUntil(() => synth.spoken.some((s) => flat(s.text) === 'Hebrews 7:24-25'));
    expect(getPassagePlayer().current?.heading).toBe('Hebrews 7:24-25');
  });
});

describe('a reference to a book Lampas holds no data for', () => {
  it('is announced as skipped, and the player goes on to the next one', async () => {
    playPassages([unheldOf('Isaiah 30:21'), refOf('Rom 8:1')]);
    await listenToTheEnd();
    expect(synth.spoken[0].text).toBe('Isaiah 30:21: skipping, no Old Testament present');
    expect(synth.spoken[0].lang).toBe('en-US');
    expect(synth.spoken.slice(1).map((s) => s.text).join(' ')).toContain(englishOf('rom', 8, 1).slice(0, 40));
  });

  it('speaks only the announcement when it is the whole list', async () => {
    playPassages([unheldOf('Psalm 62:1-2')]);
    await listenToTheEnd();
    expect(synth.spoken.map((s) => s.text)).toEqual(['Psalm 62:1-2: skipping, no Old Testament present']);
  });

  it('is read like any other when Lampas holds the book (mw-5r3p30.840)', async () => {
    playPassages([refOf('Isa 30:21')]);
    await listenToTheEnd();
    expect(synth.spoken[0]).toMatchObject({ text: 'Isaiah 30:21', lang: 'en-US' });
    expect(synth.spoken.slice(1).map((s) => s.text).join(' ')).toContain(englishOf('isa', 30, 21).slice(0, 30));
  });
});

/** Holds the answer to one chapter's fetch open until `release()`; `requested()` is true once the player has asked for it. */
function holdChapter(path: string): { requested: () => boolean; release: () => void } {
  const real = globalThis.fetch;
  let asked = false;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(path)) {
      asked = true;
      await gate;
    }
    return real(input, init);
  });
  return { requested: () => asked, release };
}

/** Lets the voice finish what it says until `done()`, the player fetching the next reference in between. */
async function finishUntil(done: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !done(); i++) {
    if (synth.speaking) synth.finishAll();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
  expect(done()).toBe(true);
}

const quiet = () => new Promise((r) => setTimeout(r, 50));

describe('Pause or Stop pressed in a wait between two references (mw-9q8wp1.7)', () => {
  it('waiting for the next chapter to load: Pause holds the player on the next reference, and Resume reads it from its start', async () => {
    const chapter = holdChapter('/data/rom/8.json');
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await finishUntil(chapter.requested);
    pausePassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'paused', current: { heading: 'Romans 8:1' } });
    chapter.release();
    const heard = synth.spoken.length;
    await quiet();
    expect(synth.spoken.length).toBe(heard);
    expect(synth.speaking).toBe(false);
    expect(getPassagePlayer().state).toBe('paused');
    resumePassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'playing', current: { heading: 'Romans 8:1' } });
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    // the reference starts from its heading
    expect(flat(synth.spoken[heard].text)).toBe('Romans 8:1');
    await listenToTheEnd();
    expect(synth.spoken.slice(heard + 1).map((s) => flat(s.text)).join(' ')).toContain(englishOf('rom', 8, 1).slice(0, 40));
  });

  it('waiting for the next chapter to load: Resume before it arrives reads it when it does', async () => {
    const chapter = holdChapter('/data/rom/8.json');
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await finishUntil(chapter.requested);
    pausePassage();
    resumePassage();
    expect(getPassagePlayer().state).toBe('playing');
    const heard = synth.spoken.length;
    await quiet();
    expect(synth.spoken.length).toBe(heard);
    chapter.release();
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    await listenToTheEnd();
  });

  it('waiting for the next chapter to load: Stop ends the player and the next reference is never spoken', async () => {
    const chapter = holdChapter('/data/rom/8.json');
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await finishUntil(chapter.requested);
    stopPassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'idle', current: null });
    chapter.release();
    const heard = synth.spoken.length;
    await quiet();
    expect(synth.spoken.length).toBe(heard);
    expect(getPassagePlayer().state).toBe('idle');
  });

  it('waiting for the next chapter to load: Pause then Stop ends the player and the next reference is never spoken', async () => {
    const chapter = holdChapter('/data/rom/8.json');
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await finishUntil(chapter.requested);
    pausePassage();
    stopPassage();
    chapter.release();
    const heard = synth.spoken.length;
    await quiet();
    expect(synth.spoken.length).toBe(heard);
    expect(getPassagePlayer()).toMatchObject({ state: 'idle', current: null });
  });

  it('the Old Testament announcement: Pause holds the voice, Resume goes on, and Stop ends the list', async () => {
    playPassages([unheldOf('Isaiah 30:21'), refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    pausePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('paused'), { timeout });
    expect(getSpeech().status).toBe('paused');
    resumePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
    stopPassage();
    await quiet();
    expect(getPassagePlayer().state).toBe('idle');
    // the paused announcement may be said again from its start on Resume; the next reference is never said
    expect(new Set(synth.spoken.map((s) => s.text))).toEqual(new Set(['Isaiah 30:21: skipping, no Old Testament present']));
  });

  it('the hand-off to an Old Testament reference: Pause just as one ends holds its announcement until Resume', async () => {
    playPassages([unheldOf('Isaiah 30:21'), unheldOf('Psalm 62:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    synth.finishAll();
    pausePassage();
    expect(getPassagePlayer()).toMatchObject({ state: 'paused', current: { heading: 'Psalm 62:1' } });
    await quiet();
    expect(synth.spoken.map((s) => s.text)).toEqual(['Isaiah 30:21: skipping, no Old Testament present']);
    resumePassage();
    await vi.waitFor(() => expect(synth.spoken.length).toBe(2), { timeout });
    expect(synth.spoken[1].text).toBe('Psalm 62:1: skipping, no Old Testament present');
    await listenToTheEnd();
  });

  it('the hand-off to an Old Testament reference: Stop just as one ends means the next is never spoken', async () => {
    playPassages([unheldOf('Isaiah 30:21'), unheldOf('Psalm 62:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    synth.finishAll();
    stopPassage();
    await quiet();
    expect(getPassagePlayer().state).toBe('idle');
    expect(synth.spoken.map((s) => s.text)).toEqual(['Isaiah 30:21: skipping, no Old Testament present']);
  });
});

describe('Pause, Resume and Stop', () => {
  it('pauses the voice, and goes on from where it was', async () => {
    playPassages([refOf('Heb 7:1-2')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    expect(getPassagePlayer().state).toBe('playing');
    pausePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('paused'), { timeout });
    expect(getSpeech().status).toBe('paused');
    expect(changes.at(-1)).toEqual(['paused', 'Hebrews 7:1-2']);
    resumePassage();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
    expect(getSpeech().status).toBe('playing');
    await listenToTheEnd();
  });

  it('stops for good: the speech is cancelled and the rest of the list is not read', async () => {
    playPassages([refOf('Heb 7:1'), refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
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
    playPassages([unheldOf('Isaiah 30:21'), refOf('Rom 8:1')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    synth.finishAll();
    stopPassage();
    await new Promise((r) => setTimeout(r, 50));
    expect(synth.spoken.map((s) => s.text)).toEqual(['Isaiah 30:21: skipping, no Old Testament present']);
  });

  it('is over for the player when something else takes the voice', async () => {
    playPassages([refOf('Heb 7:1-2')]);
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    stopReading();
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('idle'), { timeout });
  });
});
