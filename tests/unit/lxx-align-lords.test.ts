// tests/unit/lxx-align-lords.test.ts — the Greek word of 'master' (story mw-u2w5klk.349.27; the Governor's report of 2026-11-10 'I tap removed and get this', found by mw-u2w5klk.349.4):
// Genesis 24:27, 35, 42 and 48 give κύριος (and κυρίου, κύριον) to 'Lord' and 'God' (TBESG's gloss for κύριος is 'lord, God'), so the 'master' of 'my master Abraam' had no Greek word and a tap on it
// opened the Verse view, and θεός had no English. The four verses are the real ones (tests/fixtures/lxx/gen-24-lords.json: Swete's words, Brenton's text, the glosses, and the model pass's rows of
// data/lxx/align/gen-24.tsv for them), so no Morpheus cache or raw download is needed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { alignChapter, alignRuns, pairLords } from '../../scripts/lxx/align';
import type { ModelRow } from '../../scripts/lxx/align-choose';

interface Fixture {
  verses: Array<{ n: number; text: string; g: Array<[string, string, string, string]> }>;
  gloss: Record<string, string>;
  rows: ModelRow[];
}
const fixture = JSON.parse(readFileSync('tests/fixtures/lxx/gen-24-lords.json', 'utf8')) as Fixture;
const gloss = (lemma: string): string => fixture.gloss[lemma] ?? '';
const chapter = (): Chapter => ({
  book: 'Genesis',
  code: 'gen',
  chapter: 24,
  verses: fixture.verses.map((v): Verse => ({ n: v.n, g: v.g.map(([t, tr, l, p]): GreekWord => ({ t, tr, s: '', l, p, y: '2', c: 0.9 })), e: [{ t: v.text, g: [] }] })),
}) as unknown as Chapter;
const shipped = (): Chapter => alignChapter(chapter(), gloss, fixture.rows).chapter;
const verseOf = (c: Chapter, n: number): Verse => c.verses.find((v) => v.n === n)!;
/** The Greek of the chunk whose words are `text`: the forms of the words it points at. */
const greekOf = (v: Verse, text: string): string[] => v.e.find((c) => c.t === text)!.g.map((k) => v.g[k].t);

describe('the aligner pairs κύριος to the English that renders it, and θεός to God', () => {
  it('shows the fault first: before the stage, the aligner gives κύριόν of 24:35 the "Lord" that Κύριος renders, and κυρίου of 24:42 the "God" that θεὸς renders, so the "master" of each has no Greek word', () => {
    const was = alignRuns(chapter(), gloss).chapter;
    const v42 = verseOf(was, 42);
    expect(v42.e.find((c) => c.t === 'God')!.g.map((k) => v42.g[k].t)).toEqual(['κυρίου']);
    const v35 = verseOf(was, 35);
    expect(v35.e.find((c) => c.t === 'Lord')!.g.map((k) => v35.g[k].t)).toEqual(['κύριόν']);
    expect(v35.g[0].e).toBeUndefined();
  });

  it('gives Genesis 24:35 "Lord" to Κύριος and "master" to κύριόν', () => {
    const v = verseOf(shipped(), 35);
    expect(greekOf(v, 'Lord')).toEqual(['Κύριος']);
    expect(greekOf(v, 'master')).toEqual(['κύριόν']);
  });

  it('gives Genesis 24:42 "Lord" to Κύριε, "God" to θεὸς and "master" to κυρίου', () => {
    const v = verseOf(shipped(), 42);
    expect(greekOf(v, 'Lord')).toEqual(['Κύριε']);
    expect(greekOf(v, 'God')).toEqual(['θεὸς']);
    expect(greekOf(v, 'master')).toEqual(['κυρίου']);
  });

  it('gives Genesis 24:48 "master" to κυρίου and "God" to θεὸν, the two "Lord"s to Κυρίῳ and Κύριον', () => {
    const v = verseOf(shipped(), 48);
    expect(greekOf(v, 'Lord,')).toEqual(['Κυρίῳ,']);
    expect(greekOf(v, 'Lord')).toEqual(['Κύριον']);
    expect(greekOf(v, 'God')).toEqual(['θεὸν']);
    expect(greekOf(v, 'master')).toEqual(['κυρίου']);
  });

  it('gives every "Lord", "master" and "lord" of Genesis 24:27 its Greek word, in order, and "God" θεὸς', () => {
    const v = verseOf(shipped(), 27);
    const named = v.e.filter((c) => ['Lord', 'God', 'master', 'master,', 'lord.'].includes(c.t)).map((c) => [c.t, ...c.g.map((k) => v.g[k].t)]);
    expect(named).toEqual([['Lord', 'Κύριος'], ['God', 'θεὸς'], ['master', 'κυρίου'], ['master,', 'κυρίου'], ['Lord', 'Κύριος'], ['lord.', 'κυρίου']]);
  });

  it('leaves no chunk of these verses with a "master", "Lord" or "God" and no Greek word, and every Greek word it paired still paired once', () => {
    const c = shipped();
    for (const n of [27, 35, 42, 48]) {
      const v = verseOf(c, n);
      for (const chunk of v.e) if (/^(my )?(master|Lord|God)[,.]?$/.test(chunk.t)) expect(septuagintChunkLinked(chunk), `24:${n} ${chunk.t}`).toBe(true);
      const seen = new Set<number>();
      v.e.forEach((chunk, i) =>
        chunk.g.forEach((k) => {
          expect(seen.has(k), `24:${n} word ${k} in two chunks`).toBe(false);
          seen.add(k);
          expect(v.g[k].e, `24:${n} word ${k} points at its chunk`).toBeDefined();
          expect(v.e[v.g[k].e!].g, `24:${n} word ${k}`).toContain(k);
          expect(i).toBeGreaterThanOrEqual(0);
        }),
      );
      expect([...seen].sort((a, b) => a - b), `24:${n}`).toEqual(v.g.map((w, k) => (w.e !== undefined ? k : -1)).filter((k) => k >= 0));
    }
  });

  it('keeps the English whole: the chunks of each verse join to Brenton, word for word', () => {
    const c = shipped();
    for (const v of fixture.verses) expect(verseOf(c, v.n).e.map((x) => x.t).join(' ')).toBe(v.text);
  });

  it('is a stage of its own: a verse with no κύριος, or whose count of κύριος and of lord words differ, or whose displaced English has no free word to go to, is left as it was', () => {
    const c = shipped();
    for (const v of c.verses) expect(pairLords(v)).toEqual(v);
    const v35 = verseOf(c, 35);
    const odd: Verse = { ...v35, e: [...v35.e, { t: 'lord', g: [], y: 'model', c: 0.8 }] };
    expect(pairLords(odd)).toEqual(odd);
  });
});
