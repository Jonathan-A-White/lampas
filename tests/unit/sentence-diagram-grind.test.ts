// tests/unit/sentence-diagram-grind.test.ts — the sentence-diagram grind (grinds/sentence-diagram.json, mw-souyao.2): its answer schema mirrors src/diagram/types.ts, the two hand-written
// diagrams of Colossians 3:1 (tests/fixtures/diagrams) are answers it takes and the validator passes, the instructions are one file under their size and say THE RULE, and the examples'
// requests are what the builder makes.
import { readFileSync, readdirSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { buildDiagramRequest } from '../../src/diagram/request';
import type { Diagram, DiagramMode } from '../../src/diagram/types';
import { validateDiagram } from '../../src/diagram/validate';
import { checkExpect, type GrindExample } from '../support/grind-examples';
import { loadFixture } from '../support/diagram-fixtures';
import { validate, type Schema } from '../support/schema-validate';

const read = <T,>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const answerSchema = read<Schema>('grinds/sentence-diagram.answer.schema.json');
const manifest = read<Record<string, unknown>>('grinds/sentence-diagram.json');
const MODES: DiagramMode[] = ['english', 'greek'];

describe('the manifest', () => {
  it('follows drill-items: grind 1 of lampas, kind sentence-diagram, version 1, sonnet at high effort, no attachments', () => {
    expect(manifest).toEqual({
      grind: 1,
      app: 'lampas',
      kind: 'sentence-diagram',
      versions: ['1'],
      model: 'sonnet',
      effort: 'high',
      instructions: 'grinds/sentence-diagram.instructions.md',
      answerSchema: 'grinds/sentence-diagram.answer.schema.json',
      attachments: { min: 0, max: 0, mime: [], maxBytes: 0 },
    });
  });
});

describe.each(MODES)('the Colossians 3:1 diagram in %s', (mode) => {
  const fixture = loadFixture(mode);

  it('is an answer the schema takes', () => {
    expect(validate(fixture.diagram, answerSchema)).toEqual([]);
  });

  it('passes validateDiagram: every word once', () => {
    expect(validateDiagram(fixture.diagram, fixture.words.length)).toEqual({ ok: true });
  });
});

describe('the answer schema', () => {
  const schema = answerSchema as Schema & { $defs?: Record<string, Schema> };
  const one: Diagram = { clauses: [{ clause: { subject: { words: [{ i: 0 }], modifiers: [] }, verb: { words: [{ i: 1 }], modifiers: [] } } }] };

  it('takes the smallest sentence', () => {
    expect(validate(one, answerSchema)).toEqual([]);
  });

  it.each([
    ['no clauses', { clauses: [] }],
    ['a key it does not know', { ...one, note: 'x' }],
    ['a clause key it does not know', { clauses: [{ clause: one.clauses[0].clause, extra: 1 }] }],
    ['a modifier of no kind', { clauses: [{ clause: { ...one.clauses[0].clause, verb: { words: [{ i: 1 }], modifiers: [{ kind: 'sideways', word: { i: 2 }, modifiers: [] }] } } }] }],
    ['a word that is neither an index nor an implied word', { clauses: [{ clause: { ...one.clauses[0].clause, subject: { words: [{ text: 'x' }], modifiers: [] } } }] }],
    ['a complement of a kind it does not know', { clauses: [{ clause: { ...one.clauses[0].clause, complement: { kind: 'subject-complement', slot: { words: [{ i: 2 }], modifiers: [] } } } }] }],
  ])('refuses %s', (_name, bad) => {
    expect(validate(bad, answerSchema)).not.toEqual([]);
  });

  it('has no maxProperties, and every array is a required one or has minItems 1 (an empty optional array has one way to be said: left out)', () => {
    const text = JSON.stringify(schema);
    expect(text).not.toContain('maxProperties');
    expect(schema.additionalProperties).toBe(false);
    const loose: string[] = [];
    const walk = (node: unknown, path: string, required: boolean): void => {
      if (typeof node !== 'object' || node === null) return;
      const s = node as Schema;
      if (s.type === 'array' && !required && !((s.minItems ?? 0) >= 1)) loose.push(path);
      const need = new Set(s.required ?? []);
      for (const [name, sub] of Object.entries(s.properties ?? {})) walk(sub, `${path}.${name}`, need.has(name));
      if (s.items) walk(s.items, `${path}[]`, true);
      for (const option of s.anyOf ?? []) walk(option, path, required);
      for (const [name, sub] of Object.entries(schema.$defs ?? {})) if (path === '$') walk(sub, `$defs.${name}`, true);
    };
    walk(schema, '$', true);
    expect(loose).toEqual([]);
  });

  it('closes every object: additionalProperties false', () => {
    const open: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (typeof node !== 'object' || node === null) return;
      if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
      const s = node as Record<string, unknown>;
      if (s.type === 'object' && s.additionalProperties !== false) open.push(path);
      for (const [k, v] of Object.entries(s)) if (k !== 'enum' && k !== 'required' && k !== 'const') walk(v, `${path}.${k}`);
    };
    walk(schema, '$');
    expect(open).toEqual([]);
  });
});

describe('the instructions', () => {
  const text = instructionsOf('sentence-diagram');

  it('are one file under 12,000 bytes', () => {
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(12_000);
  });

  it('say THE RULE: every word sent exactly once, none twice, none missing, punctuation never a word', () => {
    expect(text).toMatch(/exactly once/i);
    expect(text).toMatch(/none twice/i);
    expect(text).toMatch(/none missing/i);
    expect(text).toMatch(/punctuation is never a word/i);
  });

  it('say how Greek fills the roles', () => {
    expect(text).toMatch(/word order is free/i);
    expect(text).toMatch(/article/i);
    expect(text).toMatch(/implied/i);
    expect(text).toMatch(/participle/i);
    expect(text).toMatch(/genitive/i);
  });

  it('say the English half: a supplied word is a word like any other, a chunk\'s words are the words sent', () => {
    expect(text).toMatch(/supplied/i);
    expect(text).toMatch(/chunk/i);
  });

  it('add nothing to the bible-talk instructions', () => {
    expect(readdirSync('grinds/bible-talk.instructions').filter((f) => /diagram/i.test(f))).toEqual([]);
  });
});

describe.each(MODES)('the Colossians 3:1 example in %s', (mode) => {
  const example = read<GrindExample>(`grinds/examples/sentence-diagram/col-3-1-${mode}.json`);
  const col3 = read<Chapter>('public/data/col/3.json');
  const fixture = loadFixture(mode);

  it('is what buildDiagramRequest makes for the verse in that mode', () => {
    const verse = col3.verses.find((v) => v.n === 1)!;
    expect(example.request).toEqual(buildDiagramRequest(col3, [verse], mode).request);
  });

  it('expects clauses, and the main verb in the first clause\'s verb slot', () => {
    expect(Object.keys(example.expect)).toEqual(['clauses', 'clauses.0.clause.verb.words.0.i']);
    expect(example.expect['clauses.0.clause.verb.words.0.i']).toEqual({ equals: mode === 'english' ? 8 : 7 });
  });

  it('is met by the hand-written diagram', () => {
    expect(checkExpect(example.expect, fixture.diagram)).toEqual([]);
  });
});
