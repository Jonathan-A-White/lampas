// tests/unit/diagram-validate.test.ts — validateDiagram (src/diagram/validate.ts, mw-souyao.1): every word sent appears exactly once across the tree, and each fault is named.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EnglishChunk, GreekWord } from '../../src/data/chapter';
import type { Diagram } from '../../src/diagram/types';
import { validateDiagram, type Fault } from '../../src/diagram/validate';
import { loadFixture, slotOf } from '../support/diagram-fixtures';

const sentence = (clause: Diagram['clauses'][number]['clause']): Diagram => ({ clauses: [{ clause }] });
const faultsOf = (tree: Diagram, wordCount: number): Fault[] => {
  const result = validateDiagram(tree, wordCount);
  return result.ok ? [] : result.faults;
};

describe('validateDiagram', () => {
  it('passes a tree that uses each word once', () => {
    expect(validateDiagram(sentence({ subject: slotOf(0), verb: slotOf(1) }), 2)).toEqual({ ok: true });
  });

  it('names a word index out of range, with where it was found', () => {
    const faults = faultsOf(sentence({ subject: slotOf(0), verb: slotOf(1, 5) }), 2);
    expect(faults).toEqual([expect.objectContaining({ kind: 'out-of-range', index: 5 })]);
    expect(faults[0].at).toMatch(/verb/);
  });

  it('counts a negative or fractional index as out of range', () => {
    expect(faultsOf(sentence({ subject: slotOf(0), verb: slotOf(-1, 1) }), 2).map((f) => f.kind)).toEqual(['out-of-range']);
    expect(faultsOf(sentence({ subject: slotOf(0), verb: slotOf(1, 1.5) }), 2).map((f) => f.kind)).toEqual(['out-of-range']);
  });

  it('names a word used twice, once however many times over', () => {
    const faults = faultsOf(sentence({ subject: slotOf(0, 0), verb: slotOf(1, 0) }), 2);
    expect(faults).toEqual([expect.objectContaining({ kind: 'used-twice', index: 0 })]);
  });

  it('names every word that is missing', () => {
    const faults = faultsOf(sentence({ subject: slotOf(0), verb: slotOf(2) }), 4);
    expect(faults).toEqual([expect.objectContaining({ kind: 'missing', index: 1 }), expect.objectContaining({ kind: 'missing', index: 3 })]);
  });

  it('names an empty subject and an empty verb', () => {
    expect(faultsOf(sentence({ subject: slotOf(), verb: slotOf(0) }), 1)).toEqual([expect.objectContaining({ kind: 'empty-subject' })]);
    expect(faultsOf(sentence({ subject: slotOf(0), verb: slotOf() }), 1)).toEqual([expect.objectContaining({ kind: 'empty-verb' })]);
  });

  it('allows a subject that is only an implied word', () => {
    const tree = sentence({ subject: { words: [{ implied: 'you' }], modifiers: [] }, verb: slotOf(0) });
    expect(validateDiagram(tree, 1)).toEqual({ ok: true });
  });

  it('names a tree with no clause as missing every word', () => {
    expect(faultsOf({ clauses: [] }, 2).map((f) => f.kind)).toEqual(['missing', 'missing']);
  });

  it('finds the words in modifiers, prepositional phrases, subordinate clauses, complements and the joining word', () => {
    const tree: Diagram = {
      clauses: [
        {
          clause: {
            subject: slotOf(0),
            verb: {
              words: [{ i: 1 }],
              modifiers: [
                { kind: 'word', word: { i: 2 }, modifiers: [{ kind: 'word', word: { i: 3 }, modifiers: [] }] },
                { kind: 'prepositional', preposition: { i: 4 }, object: slotOf(5) },
                { kind: 'clause', connector: { i: 6 }, clause: { subject: slotOf(7), verb: slotOf(8), complement: { kind: 'direct-object', slot: slotOf(9) } } },
              ],
            },
          },
        },
        { clause: { subject: slotOf(10), verb: slotOf(11) }, joinedBy: { i: 12 } },
      ],
    };
    expect(validateDiagram(tree, 13)).toEqual({ ok: true });
    // the same tree against a longer word list misses exactly the last word
    expect(faultsOf(tree, 14)).toEqual([expect.objectContaining({ kind: 'missing', index: 13 })]);
  });

  it('reports a fault inside a subordinate clause with its place', () => {
    const tree = sentence({
      subject: slotOf(0),
      verb: { words: [{ i: 1 }], modifiers: [{ kind: 'clause', clause: { subject: slotOf(), verb: slotOf(2) } }] },
    });
    const faults = faultsOf(tree, 3);
    expect(faults.map((f) => f.kind)).toEqual(['empty-subject']);
    expect(faults[0].at).toMatch(/clause/);
  });

  it('reports every fault of a tree at once', () => {
    const faults = faultsOf(sentence({ subject: slotOf(0, 9), verb: slotOf(0) }), 3);
    expect(faults.map((f) => f.kind).sort()).toEqual(['missing', 'missing', 'out-of-range', 'used-twice']);
  });
});

describe('the two fixtures of Colossians 3:1', () => {
  const chapter = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as { verses: { n: number; g: GreekWord[]; e: EnglishChunk[] }[] };
  const verse = chapter.verses.find((v) => v.n === 1)!;
  const bare = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

  it('hold the English words the chapter data gives, chunk by chunk', () => {
    const fixture = loadFixture('english');
    const fromData = verse.e.flatMap((chunk, i) => chunk.t.split(/\s+/).map(bare).filter(Boolean).map((text) => ({ text, chunk: i })));
    expect(fixture.mode).toBe('english');
    expect(fixture.words).toEqual(fromData);
  });

  it('hold the Greek words the chapter data gives, by index', () => {
    const fixture = loadFixture('greek');
    expect(fixture.mode).toBe('greek');
    expect(fixture.words).toEqual(verse.g.map((w, i) => ({ text: w.t, word: i })));
  });

  it.each(['english', 'greek'] as const)('place every word of the %s one exactly once', (mode) => {
    const fixture = loadFixture(mode);
    expect(validateDiagram(fixture.diagram, fixture.words.length)).toEqual({ ok: true });
  });

  it('leave the subject of the imperative to an implied word, as the epic draws it', () => {
    for (const mode of ['english', 'greek'] as const) {
      const main = loadFixture(mode).diagram.clauses[0].clause;
      expect(main.subject.words.every((w) => 'implied' in w)).toBe(true);
    }
  });
});
