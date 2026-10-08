// src/data/chapter.ts fed the committed public/data/rom/8.json through a stubbed fetch.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { forgetChapters, loadChapter, wordGloss, wordLemma, wordParse } from '../../src/data/chapter';

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
