// src/data/grammar/gradedVerses.ts on a made-up chapter (tests/fixtures/frontier.ts), and on 1 John 1 with his seed (mw-emk3xt.1).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import type { GrammarLevel } from '../../src/data/db';
import { easiestWith, gradedVerses, gradeVerse, ideaMetBy, WORDS_SHARE } from '../../src/data/grammar/gradedVerses';
import { formPasses } from '../../src/data/grammar/formLevel';
import { ALWAYS_NEEDED, LADDER } from '../../src/data/grammar/ladder';
import { normaliseLemma } from '../../src/data/lemma';
import { SEED_WORDS } from '../../src/data/seed-words';
import { FIXTURE_CHAPTER, FIXTURE_SOLID } from '../fixtures/frontier';

const level = (id: string, at: GrammarLevel['level']): [string, GrammarLevel] => [id, { id, level: at, since: 0, how: 'marked' }];

describe('gradedVerses on the fixture', () => {
  // every form is a nominative singular masculine noun; the forms of λόγος fail, as if its grammar were not his
  const passes = (w: GreekWord) => w.l !== 'λόγος';
  const known = new Set([...FIXTURE_SOLID, 'θεός', 'λόγος', 'ἀγάπη', 'φῶς']);
  const verse = (n: number) => FIXTURE_CHAPTER.verses.find((v) => v.n === n)!;

  it('gives score 1 and atLevel to a verse whose forms all pass and whose words are all known', () => {
    const g = gradeVerse(verse(4), passes, known);
    expect(g.forms).toEqual({ pass: 3, total: 3 });
    expect(g.words).toEqual({ known: 3, total: 3 });
    expect(g.score).toBe(1);
    expect(g.atLevel).toBe(true);
    expect(g.missing).toEqual([]);
  });

  it('is not at level with a form that fails, and names the idea it needs in missing', () => {
    const met = ideaMetBy(new Map([level('noun', 'solid'), ...ALWAYS_NEEDED.map((id) => level(id, 'solid'))]), 'solid');
    const g = gradeVerse(verse(1), passes, known, { ideaMet: met });
    expect(g.forms).toEqual({ pass: 3, total: 4 });
    expect(g.atLevel).toBe(false);
    expect(g.score).toBeCloseTo(0.75);
    expect(g.missing).toContain('case-nominative');
    expect(g.missing).not.toContain('noun');
    for (const id of ALWAYS_NEEDED) expect(g.missing).not.toContain(id);
  });

  it('lists every idea of a failing form when no level test is given', () => {
    expect(gradeVerse(verse(1), passes, known).missing).toEqual(expect.arrayContaining(['noun', 'case-nominative', ...ALWAYS_NEEDED]));
  });

  it('needs WORDS_SHARE of the words known, even when every form passes', () => {
    const half = gradeVerse(verse(2), () => true, new Set(['καί', 'εἰμί'])); // 2 of 3
    expect(half.atLevel).toBe(true);
    const few = gradeVerse(verse(8), () => true, new Set(['κόσμος'])); // 1 of 3
    expect(few.words.known / few.words.total).toBeLessThan(WORDS_SHARE);
    expect(few.atLevel).toBe(false);
    expect(few.missing).toEqual([]);
  });

  it('puts the verses easiest first, then the fewer words, then the text order', () => {
    const list = gradedVerses([FIXTURE_CHAPTER], passes, known);
    expect(list.map((g) => g.score)).toEqual([...list.map((g) => g.score)].sort((a, b) => b - a));
    // verses 4, 5 and 6 and 3 score 1 with every word known; 7 and 9 have unknown words
    const ones = list.filter((g) => g.score === 1).map((g) => g.verse);
    expect(ones).toEqual([...ones].sort((a, b) => (verse(a).g.length - verse(b).g.length) || a - b));
    expect(ones.slice(0, 2)).toEqual([4, 5]); // three words, then four
  });

  it('keeps the text order for equal scores and equal lengths', () => {
    const twin: Chapter = { ...FIXTURE_CHAPTER, verses: [{ ...verse(4), n: 20 }, { ...verse(4), n: 10 }] };
    expect(gradedVerses([twin], passes, known).map((g) => g.verse)).toEqual([20, 10]);
  });

  it('finds the easiest verse at level with a form needing an idea, else the easiest with one at all', () => {
    const list = gradedVerses([FIXTURE_CHAPTER], passes, known);
    expect(easiestWith('case-nominative', list, [FIXTURE_CHAPTER])?.verse).toBe(4);
    expect(easiestWith('case-genitive', list, [FIXTURE_CHAPTER])).toBeNull();
    // nothing is at level: the easiest verse with the idea still comes back
    const none = gradedVerses([FIXTURE_CHAPTER], passes, new Set());
    expect(none.some((g) => g.atLevel)).toBe(false);
    expect(easiestWith('noun', none, [FIXTURE_CHAPTER])).toEqual(none[0]);
  });

  it('grades a verse with no Greek as not at level', () => {
    const g = gradeVerse({ n: 1, g: [], e: [] }, () => true, known);
    expect(g).toMatchObject({ score: 0, atLevel: false });
  });
});

describe('1 John 1 with his seed', () => {
  const chapter = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
  const known = new Set(
    SEED_WORDS.filter((s) => s.lesson <= 9).flatMap((s) => {
      const { headword, lemmas } = normaliseLemma(s.lemma);
      return [headword, ...lemmas].map((l) => l.normalize('NFC'));
    }),
  );
  // every idea but the verbs' is solid
  const levels = new Map<string, GrammarLevel>(LADDER.map((i) => level(i.id, i.tier === 'verbs' ? 'notYet' : 'solid')));
  const passes = (w: GreekWord) => formPasses(w.p, levels, 'solid');
  const list = gradedVerses([chapter], passes, known, ideaMetBy(levels, 'solid'));
  const hasVerb = (n: number) => chapter.verses.find((v) => v.n === n)!.g.some((w) => w.p.startsWith('V-'));

  it('grades every verse of the chapter', () => {
    expect(list).toHaveLength(chapter.verses.length);
  });

  it('has no verse with a verb at level', () => {
    for (const g of list) if (hasVerb(g.verse)) expect(g.atLevel).toBe(false);
    expect(list.filter((g) => hasVerb(g.verse)).every((g) => g.missing.includes('verb'))).toBe(true);
  });

  it('gives the genitive the highest-scoring verse that has one', () => {
    const found = easiestWith('case-genitive', list, [chapter]);
    expect(found).not.toBeNull();
    const withGenitive = list.filter((g) => chapter.verses.find((v) => v.n === g.verse)!.g.some((w) => /-\d?G[SP]/.test(w.p)));
    expect(withGenitive.length).toBeGreaterThan(0);
    expect(withGenitive).toContain(found);
    expect(found!.score).toBe(Math.max(...withGenitive.map((g) => g.score)));
  });
});

describe('gradedVerses.ts stays pure', () => {
  const source = readFileSync('src/data/grammar/gradedVerses.ts', 'utf8');
  const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  it('imports no Dexie, React or screen', () => {
    for (const from of imports) {
      expect(from).not.toMatch(/dexie|react|db$|repositories|\.tsx?$|Screen|Sheet/i);
    }
    expect(imports.length).toBeGreaterThan(0);
  });
});
