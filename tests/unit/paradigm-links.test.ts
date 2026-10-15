// A paradigm table and the ideas and forms it belongs to (mw-svw421.5, docs/paradigms.md 'Where a table is linked'): paradigmsOf(idea), tableFor(code),
// and an ending is asked only once its table has been opened.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { buildEnding, buildIdeaQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { PARADIGMS, paradigmsOf, tableFor } from '../../src/data/paradigms';

const jn1 = JSON.parse(readFileSync('public/data/1jn/1.json', 'utf8')) as Chapter;
const EVERY = new Set(PARADIGMS.map((p) => p.id));

describe('paradigmsOf', () => {
  it('names the tables that teach an idea, in the list order', () => {
    expect(paradigmsOf('tense-aorist').map((p) => p.id)).toEqual(['future-and-aorist']);
    expect(paradigmsOf('tense-signs').map((p) => p.id)).toEqual(['future-and-aorist', 'aorist-and-future-passive']);
    expect(paradigmsOf('article').map((p) => p.name)).toEqual(['The article']);
  });

  it('names no table for an idea no table teaches', () => {
    expect(paradigmsOf('alphabet')).toEqual([]);
    expect(paradigmsOf('no-such-idea')).toEqual([]);
  });
});

describe('tableFor', () => {
  it('finds the table that holds the ending of a form', () => {
    expect(tableFor('N-GSF')?.id).toBe('noun-endings');
    expect(tableFor('V-API-3S')?.id).toBe('aorist-and-future-passive');
    expect(tableFor('V-PAI-3S')?.id).toBe('verb-endings');
    expect(tableFor('V-AAI-3S')?.id).toBe('future-and-aorist');
    expect(tableFor('T-NSM')?.id).toBe('article');
  });

  it('finds none for a word with no endings to learn', () => {
    expect(tableFor('PREP')).toBeUndefined();
    expect(tableFor('CONJ')).toBeUndefined();
  });
});

describe('an ending asked only once its table is open', () => {
  const genitive = ideaOf('case-genitive');
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

  it('is asked of no form of 1 John 1 while no table is open', () => {
    for (const idea of LADDER) for (const seed of seeds) expect(buildEnding(idea, [jn1], mulberry32(seed), new Set()), `${idea.id} ${seed}`).toBeNull();
  });

  it('is asked with every table open, and the question names the table of its form', () => {
    const asked = seeds.map((seed) => buildEnding(genitive, [jn1], mulberry32(seed), EVERY));
    expect(asked.every((q) => q !== null)).toBe(true);
    for (const q of asked) expect(q?.table).toBe(tableFor(q!.code!)?.id);
    expect(asked.some((q) => q?.table === 'noun-endings')).toBe(true);
  });

  it('is asked only when the table of its own form is the one that is open', () => {
    expect(seeds.every((seed) => buildEnding(genitive, [jn1], mulberry32(seed), new Set(['verb-endings'])) === null)).toBe(true);
    expect(seeds.every((seed) => buildEnding(genitive, [jn1], mulberry32(seed), new Set(['noun-endings', 'article']))?.table !== undefined)).toBe(true);
  });

  it('is asked with every table open when no set is given (the placement)', () => {
    expect(buildEnding(genitive, [jn1], mulberry32(3))).toEqual(buildEnding(genitive, [jn1], mulberry32(3), EVERY));
  });

  it('turns an idea whose ending is shut into tap the form in a Review draw', () => {
    const kinds = (open: ReadonlySet<string>) => new Set(seeds.map((seed) => buildIdeaQuestion(genitive, [jn1], mulberry32(seed), undefined, undefined, open).kind));
    expect(kinds(new Set())).toEqual(new Set(['tap-form']));
    expect(kinds(EVERY)).toEqual(new Set(['ending', 'tap-form']));
  });
});
