import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { ALWAYS_NEEDED, ideaOf } from '../../src/data/grammar/ladder';
import { passageNeeds, progressToward, type Level } from '../../src/data/grammar/needs';
import type { BookIndex } from '../../src/data/chapter';
import type { WordState } from '../../src/data/db';

const fromDisk = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;

describe('passageNeeds for 1 John 1:1', () => {
  it('lists the sixteen lemmas, with their counts', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    expect(needs.words.map((w) => w.lemma).sort()).toEqual(
      ['ὅς', 'εἰμί', 'ἀπό', 'ἀρχή', 'ἀκούω', 'ὁράω', 'ὁ', 'ὀφθαλμός', 'ἐγώ', 'θεάομαι', 'καί', 'χείρ', 'ψηλαφάω', 'περί', 'λόγος', 'ζωή'].map((l) => l.normalize('NFC')).sort(),
    );
    const relative = needs.words.find((w) => w.lemma === 'ὅς');
    expect(relative?.count).toBe(4);
    expect(needs.words[0].lemma).toBe('ὅς');
    expect(relative?.firstRef).toBe('1jn.1.1');
    expect(relative?.gloss).not.toBe('');
    expect(needs.tokens).toBe(23);
  });

  it('lists the ideas, easy first, with an example', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    const ids = needs.ideas.map((i) => i.id);
    for (const id of ['pronoun-relative', 'tense-imperfect', 'tense-perfect', 'tense-aorist', 'case-genitive', 'case-dative', 'article']) expect(ids).toContain(id);
    expect(ids).not.toContain('mood-subjunctive');
    expect(ids).not.toContain('mood-imperative');
    expect(ids.slice(0, ALWAYS_NEEDED.length)).toEqual([...ALWAYS_NEEDED]);
    expect(needs.ideas.find((i) => i.id === 'tense-perfect')).toMatchObject({ count: 2, example: { form: 'ἀκηκόαμεν', code: 'V-2RAI-1P-ATT', ref: '1jn.1.1' } });
    const rungs = needs.ideas.slice(ALWAYS_NEEDED.length).map((i) => i.id);
    expect(rungs).toEqual([...rungs].sort((a, b) => rungOf(a) - rungOf(b)));
    expect(needs.ideas.find((i) => i.id === 'alphabet')?.count).toBe(needs.tokens);
  });
});

const rungOf = (id: string): number => ideaOf(id).rung;

describe('passageNeeds for a chapter and a book', () => {
  it('1 John 1 has the verse words and more, commonest first', async () => {
    const verse = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    const chapter = await passageNeeds({ book: '1jn', chapter: 1 }, fromDisk, index);
    const lemmas = new Set(chapter.words.map((w) => w.lemma));
    for (const w of verse.words) expect(lemmas.has(w.lemma)).toBe(true);
    expect(chapter.words.length).toBeGreaterThan(verse.words.length);
    const counts = chapter.words.map((w) => w.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(chapter.tokens).toBeGreaterThan(verse.tokens);
  });

  it('1 John loads each of its five chapters once', async () => {
    const asked: string[] = [];
    const counting = async (book: string, n: number): Promise<Chapter> => {
      asked.push(`${book}/${n}`);
      return fromDisk(book, n);
    };
    const needs = await passageNeeds({ book: '1jn' }, counting, index);
    expect(asked).toEqual(['1jn/1', '1jn/2', '1jn/3', '1jn/4', '1jn/5']);
    expect(needs.words.length).toBeGreaterThan(100);
  });
});

describe('progressToward', () => {
  it('counts a learning word as frontier and an unlisted word as not yet', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    const states = new Map<string, WordState>([
      ['ὅς', 'solid'],
      ['λόγος', 'learning'],
      ['ζωή', 'dropped'],
    ]);
    const levels = new Map<string, Level>([
      ['tense-perfect', 'solid'],
      ['tense-aorist', 'frontier'],
    ]);
    const p = progressToward(needs, states, levels);
    expect(p.words).toEqual({ solid: 1, frontier: 1, notYet: 14, total: 16 });
    expect(p.grammar.solid).toBe(1);
    expect(p.grammar.frontier).toBe(1);
    expect(p.grammar.total).toBe(needs.ideas.length);
    expect(p.grammar.notYet).toBe(needs.ideas.length - 2);
  });

  it('counts everything as not yet for a reader with nothing', async () => {
    const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);
    expect(progressToward(needs, new Map(), new Map()).words).toEqual({ solid: 0, frontier: 0, notYet: 16, total: 16 });
  });
});
