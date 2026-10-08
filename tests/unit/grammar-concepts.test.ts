import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { GRAMMAR_CONCEPTS, conceptOf } from '../../src/data/grammar-concepts';
import { grammarExamples } from '../../src/data/grammarExamples';
import { decodeParse, GRAMMAR_TERMS, parseSegments } from '../../src/data/parseCode';

const words = (text: string): number => text.trim().split(/\s+/).length;
const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

describe('grammar-concepts: an entry for every term parseCode.ts can produce', () => {
  it('lists the terms of the tables, including the ones the sheet is told about first', () => {
    expect(GRAMMAR_TERMS.length).toBeGreaterThan(60);
    for (const term of ['conjunction', 'aorist', 'genitive', 'middle or passive deponent', '1st person', 'Attic form', 'verb', 'second']) {
      expect(GRAMMAR_TERMS, term).toContain(term);
    }
    expect(new Set(GRAMMAR_TERMS).size).toBe(GRAMMAR_TERMS.length);
  });

  it('has an entry for each term, with an explanation of at most 60 words, a Greek note of at most 40 and related terms that exist', () => {
    for (const term of GRAMMAR_TERMS) {
      const entry = conceptOf(term);
      expect(entry, `no entry for ${term}`).toBeDefined();
      if (!entry) continue;
      expect(entry.term).toBe(term);
      expect(entry.explanation.trim(), term).not.toBe('');
      expect(words(entry.explanation), `${term} explanation`).toBeLessThanOrEqual(60);
      expect(entry.greek.trim(), term).not.toBe('');
      expect(words(entry.greek), `${term} greek`).toBeLessThanOrEqual(40);
      expect(entry.related.length, term).toBeGreaterThan(0);
      for (const other of entry.related) {
        expect(GRAMMAR_CONCEPTS[other], `${term} relates to ${other}`).toBeDefined();
        expect(other).not.toBe(term);
      }
    }
  });

  it('has no entry for a word the parsing never writes', () => {
    expect(Object.keys(GRAMMAR_CONCEPTS).sort()).toEqual([...GRAMMAR_TERMS].sort());
  });

  it('explains conjunction plainly, with an English example', () => {
    const entry = conceptOf('conjunction');
    expect(entry?.explanation).toMatch(/joining word/);
    expect(entry?.explanation).toMatch(/Example/);
  });
});

describe('parseSegments: a decoded parsing cut into links and the text between', () => {
  it('cuts a verb into its terms, longest term first', () => {
    const segments = parseSegments('verb, present active indicative, 3rd person singular');
    expect(segments.filter((s) => s.term).map((s) => s.term)).toEqual(['verb', 'present', 'active', 'indicative', '3rd person', 'singular']);
    expect(segments.map((s) => s.text).join('')).toBe('verb, present active indicative, 3rd person singular');
    expect(parseSegments('verb, aorist middle or passive deponent participle, nominative singular masculine').filter((s) => s.term).map((s) => s.term)).toEqual([
      'verb', 'aorist', 'middle or passive deponent', 'participle', 'nominative', 'singular', 'masculine',
    ]);
    expect(parseSegments('verb, second aorist active indicative, 1st person singular').map((s) => s.term).filter(Boolean)).toContain('second');
    expect(parseSegments('conjunction')).toEqual([{ text: 'conjunction', term: 'conjunction' }]);
  });

  it('is all terms and separators for every parsing code of the New Testament, and every term it finds has an entry', () => {
    const codes = new Set<string>();
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(`public/data/${book.name}`)) {
        const c = JSON.parse(readFileSync(`public/data/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const code of Object.keys(c.parse)) codes.add(code);
      }
    }
    expect(codes.size).toBeGreaterThan(300);
    for (const code of codes) {
      const decoded = decodeParse(code);
      const segments = parseSegments(decoded);
      expect(segments.map((s) => s.text).join(''), code).toBe(decoded);
      for (const s of segments) {
        if (s.term) expect(conceptOf(s.term), `${code}: ${s.term}`).toBeDefined();
        else expect(s.text, `${code}: ${decoded}`).toMatch(/^[,\s]+$/);
      }
    }
  });
});

describe('grammarExamples: up to three words of the chapter whose parsing has the term', () => {
  it('gives three conjunctions of Romans 8 for conjunction, each with its verse and a parsing that names it', () => {
    const examples = grammarExamples(chapter, 'conjunction');
    expect(examples).toHaveLength(3);
    for (const e of examples) {
      expect(chapter.parse[e.word.p]).toContain('conjunction');
      expect(chapter.verses.find((v) => v.n === e.verse)?.g).toContain(e.word);
    }
  });

  it('gives different words, and puts the word he is looking at last or leaves it out', () => {
    const gar = chapter.verses.find((v) => v.n === 2)?.g.find((w) => w.l === 'γάρ');
    if (!gar) throw new Error('no γάρ in verse 2');
    const examples = grammarExamples(chapter, 'conjunction', gar);
    expect(new Set(examples.map((e) => e.word.l)).size).toBe(examples.length);
    expect(examples.map((e) => e.word.l)).not.toContain('γάρ');
  });

  it('gives what there is when there are fewer than three, and none when the chapter has none', () => {
    expect(grammarExamples(chapter, 'optative').length).toBeLessThanOrEqual(3);
    expect(grammarExamples(chapter, 'Aramaic word')).toEqual([]);
    expect(grammarExamples(chapter, 'noSuchTerm')).toEqual([]);
  });

  it('matches a whole term only: aorist does not find second aorist by accident, and middle is not middle or passive', () => {
    for (const e of grammarExamples(chapter, 'middle')) {
      expect(parseSegments(chapter.parse[e.word.p]).some((s) => s.term === 'middle')).toBe(true);
    }
  });
});
