// tests/unit/hebrew-parse-terms.test.ts — the Hebrew parsing terms (mw-gdcyf98.12): the words of the BSB table's parse strings ('Verb - Qal - Perfect - third person masculine singular'), each
// belonging to one idea of the Hebrew ladder (src/data/grammar/hebrew/terms.ts), each explained on the Grammar sheet (grammar-concepts.ts HEBREW_CONCEPTS) and cut out of a parsing by
// hebrewParseSegments. A term met in the Genesis 1 and Jonah 1 fixtures with no idea fails here and is added to the table, never skipped.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { HEBREW_CONCEPTS, hebrewConceptOf } from '../../src/data/grammar-concepts';
import { grammarExamples } from '../../src/data/grammarExamples';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';
import { HEBREW_TERMS, HEBREW_TERM_IDEA } from '../../src/data/grammar/hebrew/terms';
import { ladderFor } from '../../src/data/grammar/ladders';
import { hebrewParseSegments, parseSegments } from '../../src/data/parseCode';

const words = (text: string): number => text.trim().split(/\s+/).length;
const gen1 = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
const jon1 = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;

describe('the Hebrew terms table', () => {
  it('gives each term one idea, an idea of the Hebrew ladder that lists it, and the ladder answers with the terms', () => {
    expect(new Set(HEBREW_TERMS).size).toBe(HEBREW_TERMS.length);
    expect(Object.keys(HEBREW_TERM_IDEA).sort()).toEqual([...HEBREW_TERMS].sort());
    const hbo = ladderFor('hbo');
    expect(hbo.terms).toEqual(HEBREW_TERMS);
    for (const term of HEBREW_TERMS) {
      const id = HEBREW_TERM_IDEA[term];
      expect(id.startsWith('he-'), `${term} -> ${id}`).toBe(true);
      expect(HEBREW_LADDER.filter((i) => i.terms.includes(term)).map((i) => i.id), term).toEqual([id]);
      expect(hbo.ideaOfTerm(term)).toBe(id);
    }
    expect(HEBREW_LADDER.flatMap((i) => i.terms).sort()).toEqual([...HEBREW_TERMS].sort());
  });

  it('keeps the two tables apart: a Hebrew term resolves to a Hebrew idea in the Hebrew table, and a term both languages write is the Greek idea\'s in the Greek one', () => {
    const greek = ladderFor('grc');
    for (const term of HEBREW_TERMS) expect(greek.ideaOfTerm(term)?.startsWith('he-') ?? false, term).toBe(false);
    expect(HEBREW_TERM_IDEA['Qal']).toBe('he-qal');
    expect(HEBREW_TERM_IDEA['singular']).toBe('he-number');
    expect(greek.ideaOfTerm('singular')).toBe('number-singular');
  });

  it('names the terms the story lists', () => {
    for (const term of ['Noun', 'proper', 'feminine', 'singular', 'construct', 'Verb', 'Qal', 'Piel', 'Perfect', 'Imperfect', 'Imperative', 'Participle', 'Infinitive', 'Consecutive imperfect', 'first person']) {
      expect(HEBREW_TERMS, term).toContain(term);
    }
  });
});

describe('the Hebrew concepts', () => {
  it('has an entry for each term and for no other word, in plain words: an explanation of at most 60 words, a Hebrew note of at most 40 with Hebrew in it, related terms that exist', () => {
    expect(Object.keys(HEBREW_CONCEPTS).sort()).toEqual([...HEBREW_TERMS].sort());
    for (const term of HEBREW_TERMS) {
      const entry = hebrewConceptOf(term);
      expect(entry, `no entry for ${term}`).toBeDefined();
      if (!entry) continue;
      expect(entry.term).toBe(term);
      expect(entry.explanation.trim(), term).not.toBe('');
      expect(words(entry.explanation), `${term} explanation`).toBeLessThanOrEqual(60);
      expect(words(entry.hebrew), `${term} hebrew`).toBeLessThanOrEqual(40);
      expect(entry.hebrew, `${term} hebrew has a Hebrew form`).toMatch(/[א-ת]/);
      expect(entry.related.length, term).toBeGreaterThan(0);
      for (const other of entry.related) {
        expect(HEBREW_CONCEPTS[other], `${term} relates to ${other}`).toBeDefined();
        expect(other).not.toBe(term);
      }
    }
  });

  it('is not the Greek concept: the Hebrew table is its own', () => {
    expect(hebrewConceptOf('Qal')?.hebrew).toMatch(/[א-ת]/);
    expect(hebrewConceptOf('aorist')).toBeUndefined();
  });
});

describe('hebrewParseSegments: a Hebrew parsing cut into its terms', () => {
  it('cuts a verb into its terms, the longest first, and keeps the text between', () => {
    const decoded = 'Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular';
    const segments = hebrewParseSegments(decoded);
    expect(segments.filter((s) => s.term).map((s) => s.term)).toEqual(['Conjunctive waw', 'Verb', 'Qal', 'Consecutive imperfect', 'third person', 'masculine', 'singular']);
    expect(segments.map((s) => s.text).join('')).toBe(decoded);
    expect(hebrewParseSegments('Preposition-l | Verb - Qal - Infinitive construct').filter((s) => s.term).map((s) => s.term)).toEqual(['Preposition-l', 'Verb', 'Qal', 'Infinitive construct']);
    expect(hebrewParseSegments('')).toEqual([]);
  });

  it('is cut the same way by parseSegments for a Hebrew word, which the word sheet links (mw-gdcyf98.20)', () => {
    const decoded = 'Verb - Qal - Perfect - third person masculine singular';
    expect(parseSegments(decoded, 'hbo')).toEqual(hebrewParseSegments(decoded));
  });

  it('cuts every parse string of Genesis 1 and Jonah 1 into terms and separators alone, each term with an idea', () => {
    const unknown = new Set<string>();
    let strings = 0;
    for (const chapter of [gen1, jon1]) {
      for (const decoded of Object.values(chapter.parse)) {
        strings++;
        const segments = hebrewParseSegments(decoded);
        expect(segments.map((s) => s.text).join(''), decoded).toBe(decoded);
        for (const s of segments) {
          if (s.term) expect(ladderFor('hbo').ideaOfTerm(s.term), `${decoded}: ${s.term}`).toBeDefined();
          else if (!/^[\s,|-]+$/.test(s.text)) unknown.add(`${s.text}  (in ${decoded})`);
        }
      }
    }
    expect(strings).toBeGreaterThan(190);
    expect([...unknown]).toEqual([]);
  });
});

describe('grammarExamples for a Hebrew chapter', () => {
  it('gives three Qal words of Genesis 1, one for each lemma, each with a parsing that has the term', () => {
    const examples = grammarExamples(gen1, 'Qal');
    expect(examples).toHaveLength(3);
    expect(new Set(examples.map((e) => e.word.l)).size).toBe(3);
    for (const e of examples) {
      expect(gen1.parse[e.word.p]).toContain('Qal');
      expect(gen1.verses.find((v) => v.n === e.verse)?.g).toContain(e.word);
    }
  });

  it('matches a whole term: Perfect finds no Imperfect word, and a Greek term finds nothing in a Hebrew chapter', () => {
    for (const e of grammarExamples(jon1, 'Perfect')) expect(hebrewParseSegments(jon1.parse[e.word.p]).some((s) => s.term === 'Perfect')).toBe(true);
    expect(grammarExamples(gen1, 'aorist')).toEqual([]);
    expect(grammarExamples(gen1, 'Piel')[0]?.word.p).toContain('Piel');
  });
});
