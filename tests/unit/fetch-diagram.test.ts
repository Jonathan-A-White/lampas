// tests/unit/fetch-diagram.test.ts — fetchDiagram (src/diagram/fetchDiagram.ts, mw-souyao.2) and the table of kept diagrams (db v31, src/data/repositories/diagrams.ts), with a fake askGrind:
// a kept diagram means no ask; a first bad answer and then a good one is two asks and the good one kept; two bad answers are two asks, nothing kept and the faults returned; redraw asks past a kept one.
// A tree of Colossians 3:2 kept before mw-5r3p30.800 (μὴ hung on φρονεῖτε) is never drawn again: the unit is asked for once more.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { DIAGRAM_VERSION, getDiagram, keepDiagram } from '../../src/data/repositories';
import { fetchDiagram, isDiagramAnswer, type AskDiagram } from '../../src/diagram/fetchDiagram';
import type { Diagram } from '../../src/diagram/types';
import { loadFixture } from '../support/diagram-fixtures';
import '../support/grinds-in-graph';

const col3 = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as Chapter;
const verses = [col3.verses.find((v) => v.n === 1)!];
const good = loadFixture('english').diagram;
/** Drops the last word's place from the verb: the tree misses word 8 and the check names it. */
const bad: Diagram = { clauses: [{ clause: { subject: { words: [{ implied: 'you' }], modifiers: [] }, verb: { words: [{ i: 99 }], modifiers: [] } } }] };
const key = new Uint8Array(32).fill(7);

/** A fake askGrind that answers from a list, in turn, and remembers what it was asked. */
function fakeAsk(...answers: Diagram[]): { ask: AskDiagram; asked: object[] } {
  const asked: object[] = [];
  const ask: AskDiagram = async (request) => {
    asked.push(request);
    const next = answers[asked.length - 1];
    if (!next) throw new Error('asked more than expected');
    return next;
  };
  return { ask, asked };
}

beforeEach(async () => {
  await db.open();
  await db.diagrams.clear();
});
afterAll(() => db.close());

describe('the diagrams table', () => {
  it('is keyed by [ref+lang+version] and is version 31 of the store', () => {
    expect(db.verno).toBe(33);
    expect(db.diagrams.schema.primKey.keyPath).toEqual(['ref', 'lang', 'version']);
  });

  it('keeps one by ref, lang and version, and reads it back; another language or version is another diagram', async () => {
    await keepDiagram('Colossians 3:1', 'english', good, 5);
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
    expect(await getDiagram('Colossians 3:1', 'greek')).toBeUndefined();
    expect(await getDiagram('Colossians 3:1', 'english', '2')).toBeUndefined();
    expect(DIAGRAM_VERSION).toBe(JSON.parse(readFileSync('grinds/sentence-diagram.json', 'utf8')).versions[0]);
  });

  it('keeps a second diagram of the same verse in place of the first', async () => {
    await keepDiagram('Colossians 3:1', 'english', bad, 1);
    await keepDiagram('Colossians 3:1', 'english', good, 2);
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
    expect(await db.diagrams.count()).toBe(1);
  });
});

describe('a tree of Colossians 3:2 kept before the rule on a negative in a contrast (mw-5r3p30.800)', () => {
  const verse2 = [col3.verses.find((v) => v.n === 2)!];
  /** τὰ ἄνω φρονεῖτε, μὴ τὰ ἐπὶ τῆς γῆς as the grind drew it before: one clause, μὴ (3) on φρονεῖτε (2), the second member in the object beside the first. */
  const hungOnTheVerb: Diagram = {
    clauses: [{ clause: {
      subject: { words: [{ implied: 'ὑμεῖς' }], modifiers: [] },
      verb: { words: [{ i: 2 }], modifiers: [{ kind: 'word', word: { i: 3 }, modifiers: [] }] },
      complement: { kind: 'direct-object', slot: { words: [{ i: 1 }, { i: 4 }], modifiers: [
        { kind: 'word', word: { i: 0 }, modifiers: [] },
        { kind: 'prepositional', preposition: { i: 5 }, object: { words: [{ i: 7 }], modifiers: [{ kind: 'word', word: { i: 6 }, modifiers: [] }] } }] } },
    } }],
  };
  /** The row as the phone kept it before this fix: under the grind's version and nothing more. */
  const keptBefore = (ref: string, lang: 'greek' | 'english', diagram: Diagram) => db.diagrams.put({ ref, lang, version: DIAGRAM_VERSION, diagram, at: 1 });

  it('is not returned, in either mode, nor is a passage that holds the verse; another verse kept before is', async () => {
    await keptBefore('Colossians 3:2', 'greek', hungOnTheVerb);
    await keptBefore('Colossians 3:2', 'english', good);
    await keptBefore('Colossians 3:1-2', 'greek', good);
    await keptBefore('Colossians 3:1', 'english', good);
    expect(await getDiagram('Colossians 3:2', 'greek')).toBeUndefined();
    expect(await getDiagram('Colossians 3:2', 'english')).toBeUndefined();
    expect(await getDiagram('Colossians 3:1-2', 'greek')).toBeUndefined();
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
  });

  it('is asked for once more, and the new tree is kept and drawn with no second ask', async () => {
    await keptBefore('Colossians 3:2', 'greek', hungOnTheVerb);
    const redrawn = structuredClone(hungOnTheVerb);
    redrawn.clauses[0].clause.verb.modifiers = [];
    redrawn.clauses[0].clause.complement!.slot.words = [{ i: 1 }];
    redrawn.clauses.push({ clause: {
      subject: { words: [{ implied: 'ὑμεῖς' }], modifiers: [] },
      verb: { words: [{ implied: 'φρονεῖτε' }], modifiers: [{ kind: 'word', word: { i: 3 }, modifiers: [] }] },
      complement: { kind: 'direct-object', slot: { words: [{ i: 4 }], modifiers: [] } },
    } });
    const { ask, asked } = fakeAsk(redrawn);
    expect(await fetchDiagram(col3, verse2, 'greek', { ask, key })).toMatchObject({ ok: true, diagram: redrawn, kept: false });
    expect(asked).toHaveLength(1);
    const again = fakeAsk();
    expect(await fetchDiagram(col3, verse2, 'greek', { ask: again.ask, key })).toMatchObject({ ok: true, diagram: redrawn, kept: true });
    expect(again.asked).toHaveLength(0);
  });
});

describe('isDiagramAnswer', () => {
  it('takes a tree and refuses what is not one', () => {
    expect(isDiagramAnswer(good)).toBe(true);
    expect(isDiagramAnswer({ clauses: [] })).toBe(false);
    expect(isDiagramAnswer({ clauses: [{ clause: { subject: {}, verb: {} } }] })).toBe(false);
    expect(isDiagramAnswer(null)).toBe(false);
    expect(isDiagramAnswer('x')).toBe(false);
  });
});

describe('fetchDiagram', () => {
  it('returns the kept one with no ask at all', async () => {
    await keepDiagram('Colossians 3:1', 'english', good);
    const { ask, asked } = fakeAsk();
    const got = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(got).toEqual({ ok: true, diagram: good, words: expect.any(Array), kept: true });
    expect(asked).toHaveLength(0);
  });

  it('asks for a diagram not kept, checks it, keeps it, and returns it', async () => {
    const { ask, asked } = fakeAsk(good);
    const got = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(got.ok).toBe(true);
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatchObject({ ref: 'Colossians 3:1', lang: 'english' });
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
  });

  it('asks once more when the first answer breaks THE RULE, naming what was wrong, and keeps the good second', async () => {
    const { ask, asked } = fakeAsk(bad, good);
    const got = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(got).toMatchObject({ ok: true, diagram: good });
    expect(asked).toHaveLength(2);
    expect(asked[0]).not.toHaveProperty('faults');
    expect(JSON.stringify(asked[1])).toContain('out of range');
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
  });

  it('returns the faults of a second bad answer, keeps nothing, and does not throw', async () => {
    const { ask, asked } = fakeAsk(bad, bad);
    const got = await fetchDiagram(col3, verses, 'english', { ask, key });
    expect(asked).toHaveLength(2);
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect(got.faults.map((f) => f.kind)).toContain('out-of-range');
    expect(got.faults.map((f) => f.kind)).toContain('missing');
    expect(await db.diagrams.count()).toBe(0);
  });

  it('redraw asks once past a kept diagram and replaces it', async () => {
    await keepDiagram('Colossians 3:1', 'english', bad);
    const { ask, asked } = fakeAsk(good);
    const got = await fetchDiagram(col3, verses, 'english', { ask, key, redraw: true });
    expect(got).toMatchObject({ ok: true, diagram: good, kept: false });
    expect(asked).toHaveLength(1);
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
    expect(await db.diagrams.count()).toBe(1);
  });

  it('keeps a bad kept diagram when the redraw fails twice', async () => {
    await keepDiagram('Colossians 3:1', 'english', good);
    const { ask } = fakeAsk(bad, bad);
    const got = await fetchDiagram(col3, verses, 'english', { ask, key, redraw: true });
    expect(got.ok).toBe(false);
    expect(await getDiagram('Colossians 3:1', 'english')).toEqual(good);
  });

  it('lets a failed ask throw (no licence, no answer): only faults in a tree are returned', async () => {
    const ask: AskDiagram = async () => {
      throw new Error('No licence');
    };
    await expect(fetchDiagram(col3, verses, 'english', { ask, key })).rejects.toThrow('No licence');
  });
});
