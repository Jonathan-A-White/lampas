// tests/unit/fetch-diagram.test.ts — fetchDiagram (src/diagram/fetchDiagram.ts, mw-souyao.2) and the table of kept diagrams (db v31, src/data/repositories/diagrams.ts), with a fake askGrind:
// a kept diagram means no ask; a first bad answer and then a good one is two asks and the good one kept; two bad answers are two asks, nothing kept and the faults returned; redraw asks past a kept one.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { DIAGRAM_VERSION, getDiagram, keepDiagram } from '../../src/data/repositories';
import { fetchDiagram, isDiagramAnswer, type AskDiagram } from '../../src/diagram/fetchDiagram';
import type { Diagram } from '../../src/diagram/types';
import { loadFixture } from '../support/diagram-fixtures';

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
    expect(db.verno).toBe(31);
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
