// tests/unit/diagrams-redrawn.test.ts — a kept Greek-mode sentence diagram of a verse the RP 2026 overlay changed (mw-9ji6ek0.9) is asked for again: the row stores Greek word
// indexes, and the overlay moved or removed words (Philemon 1:1's swap, Revelation 13:14's one word fewer, Matthew 26:29's spelling). Every overlay entry's verse is marked in REDRAWN
// or is named here as one the chapter already read so; English rows (their indexes are the English chunks') and every other verse's rows stay kept.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { DIAGRAM_VERSION, REDRAWN, getDiagram, keepDiagram } from '../../src/data/repositories/diagrams';
import type { Diagram } from '../../src/diagram/types';
import { loadFixture } from '../support/diagram-fixtures';

type Entry = { book: string; chapter: number; verse: number };
const overlay = JSON.parse(readFileSync('data/rp2026-overlay.json', 'utf8')) as Entry[];
const refOf = (e: Entry): string => `${e.book} ${e.chapter}:${e.verse}`;

/** Entries whose verse the committed chapter read in the 2026 words before the overlay (the MSB table follows RP 2005 there, docs/greek-edition.md): the overlay left its Greek as it was. */
const READ_SO_ALREADY = ['Romans 13:9', 'Revelation 11:16'];

const tree = loadFixture('english').diagram;
const keptBefore = (ref: string, lang: 'greek' | 'english', diagram: Diagram) => db.diagrams.put({ ref, lang, version: DIAGRAM_VERSION, diagram, at: 1 });

beforeEach(async () => {
  await db.open();
  await db.diagrams.clear();
});
afterAll(() => db.close());

describe('REDRAWN and the RP 2026 overlay', () => {
  it('marks the verse of every overlay entry, except those the chapter already read so', () => {
    const marked = new Set(REDRAWN.map((r) => `${r.book} ${r.chapter}:${r.verse}`));
    const missing = [...new Set(overlay.map(refOf))].filter((ref) => !marked.has(ref) && !READ_SO_ALREADY.includes(ref));
    expect(missing).toEqual([]);
  });

  it('does not name as already read so a verse that is marked, and every one named is an overlay entry', () => {
    const marked = new Set(REDRAWN.map((r) => `${r.book} ${r.chapter}:${r.verse}`));
    expect(READ_SO_ALREADY.filter((ref) => marked.has(ref))).toEqual([]);
    expect(READ_SO_ALREADY.every((ref) => overlay.map(refOf).includes(ref))).toBe(true);
  });
});

describe('a Greek tree kept before the overlay moved the verse’s words', () => {
  it('is not read for Revelation 13:14, Philemon 1:1 or Matthew 26:29, nor for a passage that holds one', async () => {
    for (const ref of ['Revelation 13:14', 'Philemon 1:1', 'Matthew 26:29', 'Revelation 13:13-14', 'Philemon 1:1-2']) await keptBefore(ref, 'greek', tree);
    for (const ref of ['Revelation 13:14', 'Philemon 1:1', 'Matthew 26:29', 'Revelation 13:13-14', 'Philemon 1:1-2']) expect(await getDiagram(ref, 'greek')).toBeUndefined();
  });

  it('is kept for another verse, and an English row of the verse is kept too', async () => {
    await keptBefore('Revelation 13:13', 'greek', tree);
    await keptBefore('Revelation 13:15', 'greek', tree);
    await keptBefore('Revelation 13:14', 'english', tree);
    expect(await getDiagram('Revelation 13:13', 'greek')).toEqual(tree);
    expect(await getDiagram('Revelation 13:15', 'greek')).toEqual(tree);
    expect(await getDiagram('Revelation 13:14', 'english')).toEqual(tree);
  });

  it('is replaced by the new tree, which is then read', async () => {
    await keptBefore('Revelation 13:14', 'greek', tree);
    const fresh: Diagram = { clauses: [{ clause: { subject: { words: [{ implied: 'he' }], modifiers: [] }, verb: { words: [{ i: 1 }], modifiers: [] } } }] };
    await keepDiagram('Revelation 13:14', 'greek', fresh, 2);
    expect(await getDiagram('Revelation 13:14', 'greek')).toEqual(fresh);
  });
});
