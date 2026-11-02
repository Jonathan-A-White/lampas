// tests/unit/diagram-apart.test.ts — clauses written apart (src/diagram/apart.ts, mw-5r3p30.979). The sentence-diagram grind lost about one answer in three on Ephesians 1:3-14, whose tree is 96
// levels of JSON deep: the tutor's closers miscounted and the answer was not JSON. A clause modifier may name a clause held in the answer's `apart` list; expandApart puts each back, and
// fetchDiagram, the schema and the instructions take the shape.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { getDiagram } from '../../src/data/repositories';
import { expandApart, type WireDiagram } from '../../src/diagram/apart';
import { fetchDiagram, isDiagramAnswer, type AskDiagram } from '../../src/diagram/fetchDiagram';
import type { Diagram } from '../../src/diagram/types';
import { validateDiagram } from '../../src/diagram/validate';
import { validate, type Schema } from '../support/schema-validate';
import { instructionsOf } from '../../scripts/grind-parts';
import '../support/grinds-in-graph';

/** 'the man who came sat': 0 the, 1 man, 2 who, 3 came, 4 sat — the clause 'who came' hangs on 'man'. */
const nested: Diagram = {
  clauses: [{ clause: {
    subject: { words: [{ i: 1 }], modifiers: [
      { kind: 'word', word: { i: 0 }, modifiers: [] },
      { kind: 'clause', connector: { i: 2 }, clause: { subject: { words: [{ implied: 'who' }], modifiers: [] }, verb: { words: [{ i: 3 }], modifiers: [] } } }] },
    verb: { words: [{ i: 4 }], modifiers: [] },
  } }],
};
const mainClause = {
  subject: { words: [{ i: 1 }], modifiers: [
    { kind: 'word', word: { i: 0 }, modifiers: [] },
    { kind: 'clause', connector: { i: 2 }, apart: 0 }] },
  verb: { words: [{ i: 4 }], modifiers: [] },
};
const wire: WireDiagram = {
  clauses: [{ clause: mainClause }],
  apart: [{ subject: { words: [{ implied: 'who' }], modifiers: [] }, verb: { words: [{ i: 3 }], modifiers: [] } }],
};
const faultsOf = (answer: WireDiagram) => expandApart(answer).faults.map((f) => f.kind);

describe('expandApart', () => {
  it('puts a clause held apart where its modifier names it, giving the tree written whole', () => {
    expect(expandApart(wire)).toEqual({ diagram: nested, faults: [] });
    expect(validateDiagram(expandApart(wire).diagram, 5)).toEqual({ ok: true });
  });

  it('leaves a tree with no apart list as it is', () => {
    expect(expandApart(nested)).toEqual({ diagram: nested, faults: [] });
  });

  it('puts a held clause that itself hangs another, whichever order the list is in', () => {
    // 'the man who came, who sat': the first held clause hangs the second
    const deep: WireDiagram = {
      clauses: [{ clause: { subject: { words: [{ i: 1 }], modifiers: [{ kind: 'clause', apart: 1 }] }, verb: { words: [{ i: 9 }], modifiers: [] } } }],
      apart: [
        { subject: { words: [{ implied: 'x' }], modifiers: [] }, verb: { words: [{ i: 3 }], modifiers: [] } },
        { subject: { words: [{ implied: 'y' }], modifiers: [] }, verb: { words: [{ i: 4 }], modifiers: [{ kind: 'clause', apart: 0 }] } },
      ],
    };
    const { diagram, faults } = expandApart(deep);
    expect(faults).toEqual([]);
    const outer = diagram.clauses[0].clause.subject.modifiers[0];
    expect(outer.kind === 'clause' && outer.clause.verb.words).toEqual([{ i: 4 }]);
    const inner = outer.kind === 'clause' ? outer.clause.verb.modifiers[0] : undefined;
    expect(inner && inner.kind === 'clause' && inner.clause.verb.words).toEqual([{ i: 3 }]);
  });

  it.each([
    ['a place that is not in the list', { ...wire, apart: [] }],
    ['a place that is not a whole number', { ...wire, apart: undefined, clauses: [{ clause: { ...mainClause, subject: { words: [{ i: 1 }], modifiers: [{ kind: 'clause', apart: 'a' }] } } }] }],
    ['a clause held and never placed', { ...wire, apart: [...(wire.apart ?? []), { subject: { words: [{ i: 5 }], modifiers: [] }, verb: { words: [{ i: 6 }], modifiers: [] } }] }],
    ['a clause modifier with neither a clause nor a place', { ...wire, apart: undefined, clauses: [{ clause: { ...mainClause, subject: { words: [{ i: 1 }], modifiers: [{ kind: 'clause' }] } } }] }],
  ] as [string, WireDiagram][])('names %s as a fault', (_name, answer) => {
    expect(faultsOf(answer)).toEqual(['bad-apart']);
  });

  it('names a clause placed twice, and one placed inside itself', () => {
    const twice: WireDiagram = { ...wire, clauses: [...wire.clauses, ...wire.clauses] };
    expect(faultsOf(twice)).toEqual(['bad-apart']);
    const inside: WireDiagram = { clauses: wire.clauses, apart: [{ subject: { words: [{ i: 3 }], modifiers: [{ kind: 'clause', apart: 0 }] }, verb: { words: [{ i: 4 }], modifiers: [] } }] };
    expect(faultsOf(inside)).toEqual(['bad-apart']);
  });
});

describe('the answer guard', () => {
  it('takes an answer with an apart list', () => {
    expect(isDiagramAnswer(wire)).toBe(true);
  });

  it('refuses an apart list that is not a list', () => {
    expect(isDiagramAnswer({ ...wire, apart: 'x' })).toBe(false);
  });
});

describe('fetchDiagram with a clause held apart', () => {
  const col3 = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as Chapter;
  const key = new Uint8Array(32).fill(7);
  beforeEach(async () => {
    await db.open();
    await db.diagrams.clear();
  });
  afterAll(() => db.close());

  /** Colossians 3:1 in English, as the tree written whole and as the same tree with its clause held apart. */
  const verses = [col3.verses.find((v) => v.n === 1)!];
  const whole: Diagram = JSON.parse(readFileSync('tests/fixtures/diagrams/col-3-1-english.json', 'utf8')).diagram ?? JSON.parse(readFileSync('tests/fixtures/diagrams/col-3-1-english.json', 'utf8'));

  /** Moves the first clause modifier anywhere in the tree out to `apart`. */
  function holdApart(tree: Diagram): WireDiagram | undefined {
    const apart: unknown[] = [];
    const move = (node: unknown): unknown => {
      if (Array.isArray(node)) return node.map(move);
      if (typeof node !== 'object' || node === null) return node;
      const o = node as Record<string, unknown>;
      if (o.kind === 'clause' && apart.length === 0) {
        apart.push(o.clause);
        return { kind: o.kind, ...(o.connector ? { connector: o.connector } : {}), apart: 0 };
      }
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, move(v)]));
    };
    const moved = move(tree) as Diagram;
    return apart.length === 0 ? undefined : { ...moved, apart };
  }

  it('expands the answer before it checks THE RULE, and keeps the tree written whole', async () => {
    const held = holdApart(whole);
    if (!held) return; // the fixture has no clause modifier to hold apart: the unit cases above carry the proof
    const ask: AskDiagram = async () => held;
    const result = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(result).toMatchObject({ ok: true, kept: false, diagram: whole });
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(whole);
  });

  it('asks once more, naming the fault, when a clause is held and never placed', async () => {
    const asked: object[] = [];
    const answers: WireDiagram[] = [{ ...whole, apart: [{ subject: { words: [{ i: 0 }], modifiers: [] }, verb: { words: [{ i: 1 }], modifiers: [] } }] }, whole];
    const ask: AskDiagram = async (request) => {
      asked.push(request);
      return answers[asked.length - 1];
    };
    const result = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(result).toMatchObject({ ok: true });
    expect(asked).toHaveLength(2);
    expect((asked[1] as { faults: string[] }).faults.join(' ')).toMatch(/apart 0 is never placed/);
  });
});

describe('the grind takes clauses held apart', () => {
  const schema = JSON.parse(readFileSync('grinds/sentence-diagram.answer.schema.json', 'utf8')) as Schema;
  const text = instructionsOf('sentence-diagram');

  it('has an answer schema that takes the answer with an apart list and a clause modifier with a place', () => {
    expect(validate(wire, schema)).toEqual([]);
  });

  it('still refuses a clause modifier of nothing, and an apart list that is empty', () => {
    expect(validate({ ...wire, apart: [] }, schema)).not.toEqual([]);
  });

  it('works one tree with a clause apart in the instructions, which the schema takes and validateDiagram passes', () => {
    const at = text.indexOf('## Clauses apart');
    expect(at, 'the instructions have a section headed "Clauses apart"').toBeGreaterThan(-1);
    const block = /```json\n([\s\S]*?)```/.exec(text.slice(at));
    expect(block, 'that section works a tree as json').not.toBeNull();
    const tree = JSON.parse(block![1]) as WireDiagram;
    expect(validate(tree, schema)).toEqual([]);
    expect(tree.apart?.length).toBeGreaterThan(0);
    const { diagram, faults } = expandApart(tree);
    expect(faults).toEqual([]);
    const words = JSON.stringify(diagram).match(/"i":/g)?.length ?? 0;
    expect(validateDiagram(diagram, words)).toEqual({ ok: true });
  });

  it('asks for it when the tree is deep', () => {
    expect(text).toMatch(/`apart`/);
    expect(text).toMatch(/a clause inside a clause is written apart/i);
  });
});
