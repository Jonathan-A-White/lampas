// tests/unit/grammar-books.test.ts — the grammar books an idea sheet's Read more links to (mw-5r3p30.381, src/resources/grammarBooks.ts): each
// book's map names only ladder ideas, Black teaches every idea his table of contents names, and every link is the Logos scheme with the ref.ly fallback.
import { describe, expect, it } from 'vitest';
import { APPROACHES } from '../../src/approaches';
import { LADDER } from '../../src/data/grammar/ladder';
import { settingOf } from '../../src/settings/registry';
import { DEFAULT_GRAMMAR_BOOKS, GRAMMAR_BOOKS, bookLink, readMoreFor, sectionsFor } from '../../src/resources/grammarBooks';
import type { GrammarBook } from '../../src/resources/types';

const LADDER_IDS = new Set(LADDER.map((i) => i.id));
const black = GRAMMAR_BOOKS.find((b) => b.id === 'black');

/** The ideas Black's table of contents names (Google Books, the third edition: lesson titles and pages; docs/resources.md): each must open a lesson. */
const BLACK_TEACHES = [
  'alphabet', 'diphthongs', 'breathings', 'accents',
  'verb', 'tense-present', 'tense-future', 'voice-active', 'mood-indicative',
  'noun', 'declension-2', 'case-nominative', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative',
  'gender-masculine', 'gender-feminine', 'gender-neuter', 'number-singular', 'number-plural', 'stem-and-ending', 'article',
  'declension-1', 'adjective', 'tense-imperfect', 'tense-aorist', 'augment', 'preposition',
  'pronoun', 'pronoun-personal', 'person-1st', 'person-2nd', 'person-3rd', 'tense-perfect', 'tense-pluperfect', 'reduplication',
  'pronoun-demonstrative', 'voice-middle', 'voice-passive', 'voice-middle-or-passive', 'declension-3', 'numeral',
  'contract-verbs', 'mood-participle', 'principal-parts',
];

describe('grammar books', () => {
  it("has Black's Learn to Read New Testament Greek, by the Resource ID his Logos library lists", () => {
    expect(black).toBeDefined();
    expect(black?.resource).toBe('LLS:LRNTOREADNTGRK');
    expect(black?.startsTicked).toBe(true);
    expect(DEFAULT_GRAMMAR_BOOKS).toEqual(['black']);
  });

  it('every ladder idea Black teaches has at least one section mapped', () => {
    for (const id of BLACK_TEACHES) expect(sectionsFor(black!, id).length, id).toBeGreaterThan(0);
  });

  it('every mapped idea id exists in ladder.ts, in every book', () => {
    for (const book of GRAMMAR_BOOKS) for (const section of book.sections) for (const id of section.ideas) expect(LADDER_IDS.has(id), `${book.id}: ${id}`).toBe(true);
  });

  it('book ids are unique and every section has a title and a reference', () => {
    expect(new Set(GRAMMAR_BOOKS.map((b) => b.id)).size).toBe(GRAMMAR_BOOKS.length);
    for (const book of GRAMMAR_BOOKS) {
      expect(book.resource, book.id).toMatch(/^LLS:[A-Z0-9.]+$/);
      for (const section of book.sections) {
        expect(section.title.trim(), book.id).not.toBe('');
        expect(section.ref, `${book.id}: ${section.title}`).toMatch(/^[A-Za-z]+\.\S+$/);
      }
    }
  });

  it('every link is built with the logosres: scheme and the ref.ly fallback', () => {
    for (const book of GRAMMAR_BOOKS)
      for (const section of book.sections) {
        const link = bookLink(book, section);
        expect(link.url).toBe(`logosres:${book.resource};ref=${section.ref}`);
        expect(link.fallback).toBe(`https://ref.ly/logosres/${encodeURIComponent(book.resource)}?ref=${section.ref}`);
      }
  });

  it("opens Black's lesson 4 at its first page for The noun", () => {
    const [line] = readMoreFor('noun', ['black']);
    expect(line.book.id).toBe('black');
    expect(line.links[0]).toEqual({
      label: `Open in Logos: ${black!.short}, Lesson 4: Nouns of the Second Declension`,
      tile: 'Lesson 4: Nouns of the Second Declension',
      url: 'logosres:LLS:LRNTOREADNTGRK;ref=Page.p+26',
      fallback: 'https://ref.ly/logosres/LLS%3ALRNTOREADNTGRK?ref=Page.p+26',
    });
  });

  it('gives one line a ticked book that maps the idea, in the books’ order, and none for an unticked book or an unmapped idea', () => {
    const book = (id: string, ideas: string[]): GrammarBook => ({ id, short: id.toUpperCase(), name: id, resource: `LLS:${id.toUpperCase()}`, source: 'test', sections: [{ title: 'One', ref: 'Page.p+1', ideas }] });
    const books = [book('a', ['noun']), book('b', ['verb']), book('c', ['noun'])];
    expect(readMoreFor('noun', ['c', 'a', 'b'], books).map((l) => l.book.id)).toEqual(['a', 'c']);
    expect(readMoreFor('noun', ['b'], books)).toEqual([]);
    expect(readMoreFor('hebrew', ['a', 'b', 'c'], books)).toEqual([]);
  });

  it('is a reference inside the learning, never a grammar approach', () => {
    const names = new Set(GRAMMAR_BOOKS.flatMap((b) => [b.id, b.short, b.name]));
    for (const a of APPROACHES) {
      expect(names.has(a.id)).toBe(false);
      expect(names.has(a.name)).toBe(false);
    }
    const allowed = settingOf('grammarApproach')?.allowed;
    const values = allowed?.kind === 'choice' ? allowed.values : [];
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(names.has(v.value) || names.has(v.label)).toBe(false);
  });
});
