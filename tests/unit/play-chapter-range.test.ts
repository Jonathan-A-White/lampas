// tests/unit/play-chapter-range.test.ts — a chapter range or a whole chapter reaches the passage player whole (mw-fnvjof.18): the Share sheet's 'Judges 1–5' was handed on as Judges 1:1
// alone, because the range's last chapter was dropped where the picture's references were checked and the player read one chapter's verses. Each place that plays a reference (Share to Lampas,
// a saved list's Play all, the reference card's Play) is shown handing the player every verse of the chapters named. The engine is the honest fake on a manual clock.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetChapters, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { listedOf } from '../../src/lists/canonical';
import { playableOf } from '../../src/lists/passageOf';
import { cardOf } from '../../src/markdown/verseLinks';
import { listReferences } from '../../src/nav/refsInText';
import { checkedReferences } from '../../src/share/findRefs';
import { getPassagePlayer, playPassages, stopPassage, type PassageRef } from '../../src/speech/passagePlayer';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { ASYNC_WAIT_MS } from '../support/timeouts';
import { spokenReference } from '../../src/speech/spokenReference';

const timeout = ASYNC_WAIT_MS;
const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
const chapterOf = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const englishOf = (book: string, chapter: number, verse: number): string =>
  flat(
    chapterOf(book, chapter)
      .verses.find((v) => v.n === verse)!
      .e.map((c) => c.t)
      .join(' '),
  );

let synth: FakeSynth;
beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  forgetChapters();
  await Promise.all(db.tables.map((table) => table.clear()));
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  stopPassage();
  stopReading();
  vi.unstubAllGlobals();
});

/** Lets the voice run on until the player has nothing more to say, a speech at a time. */
async function listenToTheEnd(): Promise<void> {
  for (let i = 0; i < 20000 && getPassagePlayer().state !== 'idle'; i++) {
    await vi.waitFor(() => expect(synth.speaking || getPassagePlayer().state === 'idle').toBe(true), { timeout });
    if (synth.speaking) synth.finishAll();
    await Promise.resolve();
  }
  expect(getPassagePlayer().state).toBe('idle');
}

/** The sheet's references for what a picture's page printed, as the player is handed them (the grist keeps the first verse in `ref`, and the range whole in `printed`). */
const sharedPassages = (printed: string[], ref: (p: string) => string): PassageRef[] =>
  listReferences(
    checkedReferences(printed.map((p) => ({ printed: p, ref: ref(p) }))),
    'page',
  ).map(playableOf);

const versesOf = (spoken: string[], book: string, chapter: number, last: number): number[] => {
  const all = spoken.join(' ');
  return Array.from({ length: last }, (_, i) => i + 1).filter((v) => all.includes(englishOf(book, chapter, v).slice(0, 40)));
};

describe('a chapter range is handed to the player whole', () => {
  it("Share to Lampas: 'Judges 1–5' and '1 Samuel 12–17' are read from their first verse to their last", async () => {
    const passages = sharedPassages(['Judges 1–5', '1 Samuel 12–17'], (p) => (p.startsWith('Judges') ? 'Judg.1' : '1Sam.12'));
    expect(passages.map((p) => p.heading)).toEqual(['Judges 1-5', '1 Samuel 12-17']);
    playPassages(passages);
    await listenToTheEnd();
    const said = synth.spoken.map((s) => flat(s.text));
    const all = said.join(' ');
    // the first and the last verse of every chapter of both ranges were spoken
    for (const [book, chapters] of [
      ['jdg', [1, 2, 3, 4, 5]],
      ['1sa', [12, 13, 14, 15, 16, 17]],
    ] as const) {
      for (const n of chapters) {
        const verses = chapterOf(book, n).verses;
        expect(all, `${book} ${n}:1`).toContain(englishOf(book, n, 1).slice(0, 40));
        expect(all, `${book} ${n}:${verses.at(-1)!.n}`).toContain(englishOf(book, n, verses.at(-1)!.n).slice(0, 40));
      }
    }
    // Judges 1:1 to 5:31 and 1 Samuel 12:1 to 17:58, in that order, with each heading before its passage
    expect(all.indexOf(spokenReference('Judges 1-5'))).toBeLessThan(all.indexOf(englishOf('jdg', 1, 1).slice(0, 40)));
    expect(all.indexOf(englishOf('jdg', 5, 31).slice(0, 40))).toBeLessThan(all.indexOf(spokenReference('1 Samuel 12-17')));
    expect(all.indexOf(spokenReference('1 Samuel 12-17'))).toBeLessThan(all.indexOf(englishOf('1sa', 12, 1).slice(0, 40)));
    expect(all.indexOf(englishOf('1sa', 12, 1).slice(0, 40))).toBeLessThan(all.indexOf(englishOf('1sa', 17, 58).slice(0, 40)));
  }, 120_000);

  it("the sheet's 'Judges 1–5' keeps its last chapter as the references list holds it, and a saved list gives it back whole", () => {
    const [judges, samuel] = listReferences(
      checkedReferences([
        { printed: 'Judges 1–5', ref: 'Judg.1' },
        { printed: '1 Samuel 12–17', ref: '1Sam.12' },
      ]),
      'page',
    );
    expect(judges).toMatchObject({ ref: 'Judg.1', chapter: 1, lastChapter: 5 });
    expect(samuel).toMatchObject({ ref: '1Sam.12', chapter: 12, lastChapter: 17 });
    expect(playableOf(judges)).toMatchObject({ heading: 'Judges 1-5', through: 5, held: { book: 'jdg', chapter: 1, first: 1 } });
    // saved as a list the range is one string and comes back the same
    const back = listedOf('Judg.1-5');
    expect(back).toMatchObject({ ref: 'Judg.1', chapter: 1, lastChapter: 5 });
    expect(playableOf(back!)).toMatchObject({ heading: 'Judges 1-5', through: 5 });
  });

  it("a whole chapter ('1 Samuel 8') is read whole, not as its first verse", async () => {
    const [eight] = sharedPassages(['1 Samuel 8'], () => '1Sam.8');
    expect(eight).toMatchObject({ heading: '1 Samuel 8', through: 8 });
    playPassages([eight]);
    await listenToTheEnd();
    const verses = chapterOf('1sa', 8).verses.length;
    expect(versesOf(synth.spoken.map((s) => flat(s.text)), '1sa', 8, verses)).toHaveLength(verses);
  }, 60_000);

  it("the reference card's Play on 'Judges 1-5' hands the player the five chapters", async () => {
    const card = cardOf('Judges 1-5', true)!;
    expect(card).toMatchObject({ heading: 'Judges 1-5', through: 5 });
    playPassages([card]);
    await listenToTheEnd();
    const all = synth.spoken.map((s) => flat(s.text)).join(' ');
    expect(all).toContain(englishOf('jdg', 1, 1).slice(0, 40));
    expect(all).toContain(englishOf('jdg', 5, 31).slice(0, 40));
  }, 60_000);
});
