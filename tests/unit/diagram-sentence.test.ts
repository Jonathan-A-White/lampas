// tests/unit/diagram-sentence.test.ts — Diagram by sentence (mw-5r3p30.897): the sentence a verse belongs to (src/diagram/sentence.ts), read from the committed chapters and the table of Greek
// sentence ends (src/diagram/sentenceEnds.ts, scripts/sentences-build.ts), and the request the grind is sent for a sentence (src/diagram/request.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { MAX_REQUEST_BYTES, buildDiagramRequest, fitRequest, sentenceReference, sentenceVerses } from '../../src/diagram/request';
import { MAX_SENTENCE_WORDS, isWholeVerses, sentenceEnds, sentencesAt, sentencesOf, type Sentence } from '../../src/diagram/sentence';
import { SENTENCE_ENDS } from '../../src/diagram/sentenceEnds';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const chapterOf = (code: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${code}/${n}.json`, 'utf8')) as Chapter;
const at = (code: string, n: number, verse: number): Sentence[] => {
  const chapter = chapterOf(code, n);
  return sentencesAt(chapter, verse, sentenceEnds(chapter, SENTENCE_ENDS));
};
/** 'start.word-end.word' for each sentence: where the parts begin and end */
const spans = (sentences: Sentence[]): string[] =>
  sentences.map((s) => `${s.parts[0].verse}.${s.parts[0].from}-${s.parts[s.parts.length - 1].verse}.${s.parts[s.parts.length - 1].to}`);
const inputSchema = JSON.parse(readFileSync('grinds/sentence-diagram.input.schema.json', 'utf8')) as Schema;

describe('the sentence a verse belongs to, Greek', () => {
  it('Ephesians 1:3 is the sentence 1:3-14, and so is 1:5, from the middle of the letter\'s long sentence', () => {
    for (const verse of [3, 5, 9, 14]) {
      const found = at('eph', 1, verse);
      expect(found).toHaveLength(1);
      expect(found[0].parts.map((p) => p.verse)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
      expect(spans(found)).toEqual(['3.0-14.14']);
    }
  });

  it('Ephesians 1:1 and 1:2 are one sentence, the salutation (a raised dot ends no sentence)', () => {
    expect(spans(at('eph', 1, 1))).toEqual(['1.0-2.11']);
  });

  it('Romans 8:28 is one verse and one sentence', () => {
    const found = at('rom', 8, 28);
    expect(found).toHaveLength(1);
    expect(found[0].parts).toEqual([{ verse: 28, from: 0, to: chapterOf('rom', 8).verses.find((v) => v.n === 28)!.g.length - 1 }]);
    expect(isWholeVerses(chapterOf('rom', 8), found[0])).toBe(true);
  });

  it('John 11:35 is one verse and one sentence (ἐδάκρυσεν ὁ Ἰησοῦς, Jesus wept)', () => {
    const found = at('jhn', 11, 35);
    expect(spans(found)).toEqual(['35.0-35.2']);
  });

  it('John 2:4 holds two sentences, a question and a statement: two diagrams, each part of the verse', () => {
    const chapter = chapterOf('jhn', 2);
    const found = at('jhn', 2, 4);
    expect(found).toHaveLength(2);
    const verse = chapter.verses.find((v) => v.n === 4)!;
    expect(found[0].parts[0].from).toBe(0);
    expect(found[1].parts[0].to).toBe(verse.g.length - 1);
    expect(found[0].parts[0].to + 1).toBe(found[1].parts[0].from);
    // the first ends on the question's last word: Τί ἐμοὶ καὶ σοί, γύναι;
    expect(verse.g[found[0].parts[0].to].t).toBe('γύναι');
    expect(isWholeVerses(chapter, found[0])).toBe(false);
  });

  it('a sentence never crosses a chapter, and every word of a chapter is in exactly one sentence', () => {
    const chapter = chapterOf('eph', 1);
    const all = sentencesOf(chapter, sentenceEnds(chapter, SENTENCE_ENDS));
    const words = all.flatMap((s) => s.parts).reduce((sum, p) => sum + p.to - p.from + 1, 0);
    expect(words).toBe(chapter.verses.reduce((sum, v) => sum + v.g.length, 0));
    expect(all[all.length - 1].parts.at(-1)!.verse).toBe(chapter.verses[chapter.verses.length - 1].n);
  });

  it('no sentence of the New Testament is longer than the grind takes', () => {
    for (const code of Object.keys(SENTENCE_ENDS)) {
      for (const chapterNo of Object.keys(SENTENCE_ENDS[code]).map(Number)) {
        const chapter = chapterOf(code, chapterNo);
        for (const s of sentencesOf(chapter, sentenceEnds(chapter, SENTENCE_ENDS))) {
          expect(s.parts.reduce((sum, p) => sum + p.to - p.from + 1, 0)).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
        }
      }
    }
  });

  it('a Greek chapter the table lacks has a verse for a sentence', () => {
    const chapter = chapterOf('eph', 1);
    expect(spans(sentencesAt(chapter, 5, sentenceEnds(chapter, {})))).toEqual(['5.0-5.' + (chapter.verses.find((v) => v.n === 5)!.g.length - 1)]);
  });
});

describe('the sentence a verse belongs to, Hebrew', () => {
  it('Genesis 1:1 is one sentence, ended by its sof pasuq', () => {
    const chapter = chapterOf('gen', 1);
    const found = sentencesAt(chapter, 1, sentenceEnds(chapter, SENTENCE_ENDS));
    expect(found).toHaveLength(1);
    const verse = chapter.verses.find((v) => v.n === 1)!;
    expect(found[0].parts).toEqual([{ verse: 1, from: 0, to: verse.g.length - 1 }]);
    expect(verse.g[verse.g.length - 1].t).toContain('׃');
  });

  it('the atnach does not end a sentence: Genesis 1:2 has accents inside and one sentence', () => {
    const chapter = chapterOf('gen', 1);
    expect(sentencesAt(chapter, 2, sentenceEnds(chapter, SENTENCE_ENDS))).toHaveLength(1);
  });
});

describe('the request for a sentence', () => {
  const eph1 = chapterOf('eph', 1);
  const sentence = at('eph', 1, 5)[0];
  const verses = sentenceVerses(eph1, sentence);

  it('Ephesians 1:5 asks for 1:3-14, every Greek word of the twelve verses once, each carrying its verse', () => {
    const { request, words } = buildDiagramRequest(eph1, verses, 'greek', sentence);
    expect(request.ref).toBe('Ephesians 1:3-14');
    expect(request.words).toHaveLength(eph1.verses.filter((v) => v.n >= 3 && v.n <= 14).reduce((sum, v) => sum + v.g.length, 0));
    expect(words).toHaveLength(request.words.length);
    expect(request.words[0]).toMatchObject({ i: 0, verse: 3, text: 'Εὐλογητὸς' });
    // 203 words are more than a grist can carry with a verse on each: the verse is named on the first word of each verse only (fitRequest)
    expect(request.words.filter((w) => w.verse !== undefined).map((w) => w.verse)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(words.filter((w) => w.verse === 5).length).toBe(eph1.verses.find((v) => v.n === 5)!.g.length);
    expect(validate(request, inputSchema)).toEqual([]);
  });

  it('a verse\'s two sentences are asked for under two references, each with its own words', () => {
    const chapter = chapterOf('jhn', 2);
    const [first, second] = at('jhn', 2, 4);
    const a = buildDiagramRequest(chapter, sentenceVerses(chapter, first), 'greek', first);
    const b = buildDiagramRequest(chapter, sentenceVerses(chapter, second), 'greek', second);
    expect(a.request.ref).not.toBe(b.request.ref);
    expect(sentenceReference(chapter, first)).toBe(a.request.ref);
    expect(a.request.words.length + b.request.words.length).toBe(chapter.verses.find((v) => v.n === 4)!.g.length);
    // the words keep the verse's own indexes, so a tap finds the verse's word
    expect(b.words[0]).toMatchObject({ word: first.parts[0].to + 1 });
    expect(validate(a.request, inputSchema)).toEqual([]);
  });

  it('a sentence of one whole verse is named as the verse always was, so what was kept stays kept', () => {
    const col3 = chapterOf('col', 3);
    const [s] = sentencesAt(col3, 1, sentenceEnds(col3, SENTENCE_ENDS));
    expect(sentenceReference(col3, s)).toBe('Colossians 3:1');
    expect(buildDiagramRequest(col3, sentenceVerses(col3, s), 'greek', s).request).toEqual(buildDiagramRequest(col3, [col3.verses[0]], 'greek').request);
  });

  it('English: the chunks whose first Greek word is in the sentence, in the English order', () => {
    const chapter = chapterOf('jhn', 2);
    const [first, second] = at('jhn', 2, 4);
    const a = buildDiagramRequest(chapter, sentenceVerses(chapter, first), 'english', first).request;
    const b = buildDiagramRequest(chapter, sentenceVerses(chapter, second), 'english', second).request;
    const whole = buildDiagramRequest(chapter, [chapter.verses.find((v) => v.n === 4)!], 'english').request;
    expect(a.words.length + b.words.length).toBe(whole.words.length);
    expect(a.words.length).toBeGreaterThan(0);
    expect(b.words.length).toBeGreaterThan(0);
  });
});

describe('a request that is too big for a grist', () => {
  const eph1 = chapterOf('eph', 1);
  const sentence = at('eph', 1, 5)[0];
  const size = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

  it('English, Ephesians 1:3-14 (252 words and 203 Greek words of context) fits: the Greek is left out, the words are not', () => {
    const { request } = buildDiagramRequest(eph1, sentenceVerses(eph1, sentence), 'english', sentence);
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.words).toHaveLength(252);
    expect(request.greek).toBeUndefined();
    expect(validate(request, inputSchema)).toEqual([]);
  });

  it('a request that fits is returned as it is', () => {
    const col3 = chapterOf('col', 3);
    const { request } = buildDiagramRequest(col3, [col3.verses[0]], 'english');
    expect(fitRequest(request)).toBe(request);
    expect(request.greek).toHaveLength(17);
  });
});

describe('the grind\'s example for Ephesians 1:3-14', () => {
  it('is the request the app builds for the sentence, under 12,000 bytes of instructions', () => {
    const eph1 = chapterOf('eph', 1);
    const sentence = at('eph', 1, 5)[0];
    const example = JSON.parse(readFileSync('grinds/examples/sentence-diagram/eph-1-3-14-greek.json', 'utf8')) as { request: unknown };
    expect(example.request).toEqual(buildDiagramRequest(eph1, sentenceVerses(eph1, sentence), 'greek', sentence).request);
    expect(readFileSync('grinds/sentence-diagram.instructions.md').length).toBeLessThanOrEqual(12_000);
  });
});
