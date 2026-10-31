// tests/unit/hebrew-grammar-books.test.ts — his Hebrew grammars in the catalogue and Read more on a Hebrew lesson's idea sheet (mw-5r3p30.890, PROVISIONAL):
// Biblical Hebrew Step by Step is the Hebrew peer of Black; Read more follows the grammar he pinned in the idea's language, and a grammar with no table never takes its place.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { HEBREW_LADDER } from '../../src/data/grammar/hebrew/ladder';
import { setState, shelfOf } from '../../src/data/repositories';
import { entriesOf } from '../../src/resources/catalogue';
import { DEFAULT_GRAMMAR_BOOKS, GRAMMAR_BOOKS, bookLink, readMoreFor, sectionsFor, shelvedBooks } from '../../src/resources/grammarBooks';
import { worksForTutor } from '../../src/resources/tutorLinks';
import type { GrammarBook } from '../../src/resources/types';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const HEBREW_IDS = new Set(HEBREW_LADDER.map((i) => i.id));
const stepByStep = GRAMMAR_BOOKS.find((b) => b.id === 'step-by-step');

/** A Hebrew grammar with a table of its own, as a test hands one to readMoreFor (Step by Step's real table holds only the lessons whose pages are sourced). */
const lessons: GrammarBook = {
  id: 'lessons', lang: 'he', short: 'Lessons', name: 'Lessons', resource: 'LLS:LESSONS', source: 'test',
  sections: [
    { title: 'Lesson 1: The Alphabet', ref: 'Page.p_14', ideas: ['he-alphabet', 'he-final-forms'] },
    { title: 'Lesson 5: The Article', ref: 'Page.p_52', ideas: ['he-article'] },
    { title: 'Lesson 9: The Perfect', ref: 'Page.p_90', ideas: ['he-perfect', 'he-qal'] },
  ],
};

describe('his Hebrew grammars in the catalogue', () => {
  const grammars = entriesOf('grammar');
  const hebrew = grammars.filter((e) => e.lang === 'he');

  it('lists Step by Step (both volumes and their Keys), Biblical Hebrew for Beginners, Davidson, the T&T Clark Primer, BHRG, GKC and Hebrew Syntax, by Resource ID', () => {
    expect(hebrew.map((e) => e.resource).sort()).toEqual(
      ['LLS:BBLHEBBEGNNRS', 'LLS:BHRG2ED', 'LLS:BIBHEBSBS', 'LLS:BIBHEBSBS2', 'LLS:DAVDSINTROHEB', 'LLS:KYBIBHEBSBS1', 'LLS:KYBIBHEBSBS2', 'LLS:TTCLRKRVCNSLDTN', 'LLS:46.20.10', 'LLS:46.20.9'].sort(),
    );
  });

  it('keeps the Greek grammars Greek', () => {
    expect(grammars.filter((e) => e.lang === 'grc').map((e) => e.resource)).toContain('LLS:LRNTOREADNTGRK');
    expect(hebrew.some((e) => e.resource === 'LLS:LRNTOREADNTGRK')).toBe(false);
  });

  it('pins Step by Step to start with; the other Hebrew grammars have no table and start On', () => {
    expect(grammars.find((e) => e.resource === 'LLS:BIBHEBSBS')?.starts).toBe('pinned');
    for (const e of hebrew.filter((x) => x.sections === undefined)) expect(e.starts, e.resource).toBe('on');
  });
});

describe('Step by Step, the Hebrew peer of Black', () => {
  it('is a grammar book of Hebrew, the default of the Hebrew lessons, beside Black for Greek', () => {
    expect(stepByStep?.lang).toBe('he');
    expect(stepByStep?.resource).toBe('LLS:BIBHEBSBS');
    expect(DEFAULT_GRAMMAR_BOOKS).toEqual(['black', 'step-by-step']);
  });

  it('maps only ideas of the Hebrew ladder, each with a title and a page', () => {
    for (const section of stepByStep!.sections) {
      expect(section.title.trim()).not.toBe('');
      expect(section.ref).toMatch(/^Page\.p_\d+$/);
      for (const id of section.ideas) expect(HEBREW_IDS.has(id), id).toBe(true);
    }
  });

  it('opens at the lesson of the alphabet for the alphabet idea, by the same link Black’s lessons use', () => {
    const [section] = sectionsFor(stepByStep!, 'he-alphabet');
    expect(section).toBeDefined();
    const link = bookLink(stepByStep!, section);
    expect(link.url).toBe(`logosres:LLS:BIBHEBSBS;ref=${section.ref}`);
    expect(link.fallback).toBe(`https://ref.ly/logosres/LLS%3ABIBHEBSBS?ref=${section.ref.replace(/_/g, '+')}`);
    expect(link.url).not.toContain('+');
    const [line] = readMoreFor('he-alphabet', ['black', 'step-by-step']);
    expect(line.book.id).toBe('step-by-step');
    expect(line.links[0]).toEqual(link);
  });
});

describe('Read more per language', () => {
  it('gives a Hebrew idea only a Hebrew book and a Greek idea only a Greek one, with both ticked', () => {
    const ticked = ['black', 'step-by-step', 'lessons'];
    const books = [...GRAMMAR_BOOKS, lessons];
    expect(readMoreFor('he-alphabet', ticked, books).map((l) => l.book.lang)).toEqual(['he', 'he']);
    expect(readMoreFor('noun', ticked, books).map((l) => l.book.id)).toEqual(['black']);
  });

  it('opens the lesson that teaches the letters, the article and a verb tier idea (a book with a table of each)', () => {
    const open = (id: string) => readMoreFor(id, ['lessons'], [lessons])[0]?.links.map((l) => l.url);
    expect(open('he-alphabet')).toEqual(['logosres:LLS:LESSONS;ref=Page.p_14']);
    expect(open('he-article')).toEqual(['logosres:LLS:LESSONS;ref=Page.p_52']);
    expect(open('he-perfect')).toEqual(['logosres:LLS:LESSONS;ref=Page.p_90']);
    expect(open('he-root')).toBeUndefined();
  });
});

describe('Read more follows the grammar he pinned', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear()]);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
    await vi.waitFor(async () => expect(await db.library.get('#taken')).toBeDefined(), { timeout: ASYNC_WAIT_MS });
  });

  it('stays on Step by Step when he pins BHRG, which has no table', async () => {
    await setState('LLS:BIBHEBSBS', 'on');
    expect((await setState('LLS:BHRG2ED', 'pinned')).ok).toBe(true);
    const shelved = shelvedBooks(GRAMMAR_BOOKS, await shelfOf('grammar'));
    expect(shelved.pinned).toEqual([]);
    const lines = readMoreFor('he-alphabet', shelved.ticked, GRAMMAR_BOOKS, undefined, shelved.pinned);
    expect(lines.map((l) => l.book.id)).toEqual(['step-by-step']);
  });

  it('pins three Hebrew grammars apart from the three Greek ones', async () => {
    for (const r of ['LLS:BHRG2ED', 'LLS:46.20.10', 'LLS:DAVDSINTROHEB']) expect((await setState(r, 'pinned')).ok, r).toBe(true);
    expect((await setState('LLS:LRNTOREADNTGRK', 'pinned')).ok).toBe(true);
    expect((await setState('LLS:BDF', 'pinned')).ok).toBe(true);
    expect((await setState('LLS:TTCLRKRVCNSLDTN', 'pinned')).ok).toBe(false);
  });
});

describe('the tutor’s digest', () => {
  it('does not list a Hebrew grammar, which the answer schema’s work enum cannot name yet, but still lists a Greek one', () => {
    const row = (id: string, state: 'on' | 'pinned') => ({ id, kind: 'grammar' as const, state, since: 1 });
    const shelf = [row('LLS:BIBHEBSBS', 'pinned'), row('LLS:BHRG2ED', 'on'), row('LLS:BDF', 'on'), row('LLS:LRNTOREADNTGRK', 'pinned')];
    const ids = worksForTutor(shelf, undefined, 'why is this the aorist, parse it').flatMap((w) => ('id' in w ? [w.id] : []));
    expect(ids).toEqual(expect.arrayContaining(['LLS:LRNTOREADNTGRK', 'LLS:BDF']));
    expect(ids).not.toContain('LLS:BIBHEBSBS');
    expect(ids).not.toContain('LLS:BHRG2ED');
  });
});
