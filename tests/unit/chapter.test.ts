// src/data/chapter.ts fed the committed public/data/rom/8.json through a stubbed fetch.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { type EnglishChunk, englishRuns, forgetChapters, loadChapter, markSupplied, wordGloss, wordLemma, wordParse } from '../../src/data/chapter';

const rom8 = readFileSync('public/data/rom/8.json', 'utf8');

function stubFetch(body = rom8, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  forgetChapters();
  vi.unstubAllGlobals();
});

describe('loadChapter', () => {
  it('fetches /data/<book>/<chapter>.json and returns the chapter', async () => {
    const fetchMock = stubFetch();
    const chapter = await loadChapter('rom', 8);
    expect(fetchMock).toHaveBeenCalledWith('/data/rom/8.json');
    expect(chapter.book).toBe('Romans');
    expect(chapter.chapter).toBe(8);
    expect(chapter.verses).toHaveLength(39);
  });

  it('keeps one request in flight per chapter, and the chapter in memory afterwards', async () => {
    const fetchMock = stubFetch();
    const [a, b] = await Promise.all([loadChapter('rom', 8), loadChapter('rom', 8)]);
    expect(a).toBe(b);
    expect(await loadChapter('rom', 8)).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await loadChapter('rom', 7).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failure: the next call asks again', async () => {
    const failing = stubFetch('nope', 404);
    await expect(loadChapter('rom', 8)).rejects.toThrow(/404/);
    expect(failing).toHaveBeenCalledTimes(1);
    const working = stubFetch();
    expect((await loadChapter('rom', 8)).chapter).toBe(8);
    expect(working).toHaveBeenCalledTimes(1);
  });
});

describe('the word helpers, on Romans 8:1', () => {
  it("read ἄρα's lemma, gloss and parsing without touching the raw keys", async () => {
    stubFetch();
    const chapter = await loadChapter('rom', 8);
    const verse1 = chapter.verses[0];
    expect(verse1.n).toBe(1);
    const ara = verse1.g.find((w) => w.t === 'ἄρα');
    if (!ara) throw new Error('no ἄρα in Romans 8:1');
    expect(wordLemma(ara)).toBe('ἄρα');
    expect(wordGloss(chapter, ara)).toBe('therefore');
    expect(wordParse(chapter, ara)).toBe('particle');
    const walking = verse1.g.find((w) => w.p === 'V-PAP-DPM');
    if (!walking) throw new Error('no participle in Romans 8:1');
    expect(wordParse(chapter, walking)).toBe('verb, present active participle, dative plural masculine');
  });
});

describe('englishRuns and markSupplied on a chunk of the old shape (mw-5r3p30.112)', () => {
  // Before mw-5r3p30.102 a chunk said `s: 1` for "the whole chunk is supplied"; a phone's cache can still hold such a chapter.
  const old = (s: unknown) => ({ t: 'was king', g: [0], s }) as unknown as EnglishChunk;

  it('takes s: 1 as the whole chunk supplied, and does not throw', () => {
    expect(englishRuns(old(1))).toEqual([{ text: 'was king', supplied: true }]);
    expect(markSupplied(old(1))).toBe('*was king*');
  });

  it('reads a list of positions as before', () => {
    expect(englishRuns(old([0]))).toEqual([
      { text: 'was', supplied: true },
      { text: 'king', supplied: false },
    ]);
    expect(markSupplied(old([0]))).toBe('*was* king');
  });

  it('takes any other non-list as nothing supplied or the whole chunk, never an error', () => {
    expect(() => englishRuns(old('yes'))).not.toThrow();
    expect(englishRuns(old(true))).toEqual([{ text: 'was king', supplied: true }]);
    expect(englishRuns(old(0))).toEqual([{ text: 'was king', supplied: false }]);
    expect(englishRuns({ t: 'was king', g: [0] })).toEqual([{ text: 'was king', supplied: false }]);
    expect(markSupplied({ t: ' was king ', g: [0] })).toBe('was king');
  });
});
