// A paradigm table and the ideas and forms it belongs to (mw-svw421.5, docs/paradigms.md 'Where a table is linked'): paradigmsOf(idea), tableFor(code),
// and an ending is asked only once its table has been opened.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LADDER, ideaOf } from '../../src/data/grammar/ladder';
import { buildEnding, buildIdeaQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { patternsOf } from '../../src/data/grammar/patterns';
import { PARADIGMS, cellsOf, paradigmsOf, tableFor } from '../../src/data/paradigms';

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

  it('finds the third declension for a third-declension noun, by its lemma and its code (mw-svw421.37)', () => {
    const words = jn1.verses.flatMap((v) => v.g).filter((w) => ['πατήρ', 'φῶς', 'χείρ', 'σκότος'].includes(w.l));
    expect(new Set(words.map((w) => w.l)).size).toBeGreaterThanOrEqual(3);
    for (const w of words) expect(tableFor(w.p, w)?.id, `${w.l} ${w.p}`).toBe('third-declension');
    expect(tableFor('N-GSM', { l: 'λόγος' })?.id).toBe('noun-endings');
    expect(tableFor('N-GSF', { l: 'ἀρχή' })?.id).toBe('noun-endings');
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

  it('never asks a third-declension noun once only Noun endings is open (mw-svw421.37)', () => {
    const third = new Set(['πατήρ', 'φῶς', 'χείρ', 'σκότος']);
    const words = new Map(jn1.verses.flatMap((v) => v.g).map((w) => [w.p + '|' + w.l, w]));
    for (const idea of LADDER) {
      for (const seed of seeds) {
        const q = buildEnding(idea, [jn1], mulberry32(seed), new Set(['noun-endings']));
        if (!q) continue;
        const word = [...words.values()].find((w) => w.p === q.code && q.prompt.endsWith(` of ${w.l}`));
        expect(third.has(word?.l ?? ''), `${idea.id} ${seed}: ${q.prompt}`).toBe(false);
        expect(q.table, `${idea.id} ${seed}`).toBe('noun-endings');
      }
    }
  });

  it('is asked with every table open, and the question names the table of its form', () => {
    const asked = seeds.map((seed) => buildEnding(genitive, [jn1], mulberry32(seed), EVERY));
    expect(asked.every((q) => q !== null)).toBe(true);
    for (const q of asked) expect(q?.table).toBe(tableFor(q!.code!, { l: q!.prompt.split(' of ').pop()! })?.id);
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

describe('a form is credited only to a table that shows it (mw-svw421.37)', () => {
  // the declensions name a family of forms a table holds. The rest (stem-and-ending, augment, tense-signs, reduplication) are how any form is built, and a verb
  // of the contract or -μι kind has its future, aorist, subjunctive and the rest in the tables of those, not in the table of its present active.
  const FAMILY = ['declension-1', 'declension-2', 'declension-3'];

  it('names, for every inflected word of every chapter, a table that holds each pattern idea its lemma has', () => {
    const wrong = new Set<string>();
    const dir = 'public/data';
    for (const book of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(`${dir}/${d.name}/1.json`))) {
      for (const file of readdirSync(`${dir}/${book.name}`).filter((f) => /^\d+\.json$/.test(f))) {
        const chapter = JSON.parse(readFileSync(`${dir}/${book.name}/${file}`, 'utf8')) as Chapter;
        for (const word of chapter.verses.flatMap((v) => v.g)) {
          const table = tableFor(word.p, word);
          if (!table) continue;
          const held = new Set([...table.ideas, ...cellsOf(table).flatMap((c) => c.ideas)]);
          for (const id of patternsOf(word).filter((p) => FAMILY.includes(p))) if (!held.has(id)) wrong.add(`${word.l} ${word.p} -> ${table.id} lacks ${id}`);
        }
      }
    }
    expect([...wrong].slice(0, 40)).toEqual([]);
  });
});
