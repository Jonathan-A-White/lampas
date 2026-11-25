// tests/unit/diagrams-redrawn.test.ts — a kept Greek-mode sentence diagram of a verse the RP 2026 overlay changed (mw-9ji6ek0.9) is asked for again: the row stores Greek word
// indexes, and the overlay moved or removed words (Philemon 1:1's swap, Revelation 13:14's one word fewer, Matthew 26:29's spelling). Every overlay entry's verse is marked in REDRAWN
// or is named here as one the chapter already read so; English rows (their indexes are the English chunks') and every other verse's rows stay kept.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter } from '../../src/data/chapter';
import { DIAGRAM_VERSION, REDRAWN, getDiagram, holdsNegatedMember, keepDiagram } from '../../src/data/repositories/diagrams';
import { fetchDiagram, type AskDiagram } from '../../src/diagram/fetchDiagram';
import { buildDiagramRequest } from '../../src/diagram/request';
import type { Diagram } from '../../src/diagram/types';
import { loadFixture } from '../support/diagram-fixtures';
import { flatDiagram } from '../support/flat-diagram';
import '../support/grinds-in-graph';

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

describe('a tree kept before a vocative stood on its own line (mw-5r3p30.1227)', () => {
  it('is not read for 1 John 2:1, in Greek or English, nor for a passage that holds it', async () => {
    const refs = ['1 John 2:1', '1 John 2:1-2'];
    for (const ref of refs) for (const lang of ['greek', 'english'] as const) await keptBefore(ref, lang, tree);
    for (const ref of refs) for (const lang of ['greek', 'english'] as const) expect(await getDiagram(ref, lang)).toBeUndefined();
  });

  it('keeps the neighbouring verse, and reads the new tree of 1 John 2:1', async () => {
    await keptBefore('1 John 2:2', 'greek', tree);
    expect(await getDiagram('1 John 2:2', 'greek')).toEqual(tree);
    await keepDiagram('1 John 2:1', 'english', tree, 2);
    expect(await getDiagram('1 John 2:1', 'english')).toEqual(tree);
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

describe('a tree kept before a vocative stood on its own line, of any verse that holds a vocative (mw-5r3p30.1251)', () => {
  // Luke 5:8 holds κύριε (N-VSM), 'Lord' as an address; Luke 5:6 holds no vocative.
  const luke5 = JSON.parse(readFileSync('public/data/luk/5.json', 'utf8')) as Chapter;
  const verse = (n: number) => [luke5.verses.find((v) => v.n === n)!];
  const key = new Uint8Array(32).fill(7);
  /** A tree that holds every word the request for these verses names, so it passes the check; `fresh` is the one the tutor draws now. */
  const treeFor = (verses: Chapter['verses'], lang: 'greek' | 'english'): Diagram => flatDiagram(buildDiagramRequest(luke5, verses, lang).request as unknown as Record<string, unknown>);
  const askOnce = (fresh: Diagram): { ask: AskDiagram; asked: number[] } => {
    const asked: number[] = [];
    return { asked, ask: async () => (asked.push(1), fresh) };
  };

  it('holds a vocative in Luke 5:8 and none in Luke 5:6 (the real data)', () => {
    const parses = (n: number) => verse(n)[0].g.map((w) => w.p);
    expect(parses(8).some((p) => /^[NA]-V/.test(p))).toBe(true);
    expect(parses(6).some((p) => /^[NA]-V/.test(p))).toBe(false);
  });

  it.each(['greek', 'english'] as const)('is not read for Luke 5:8 in %s: the tutor is asked, and the new tree is kept and read', async (lang) => {
    const old = treeFor(verse(8), lang);
    const fresh = structuredClone(old);
    fresh.clauses[0].clause.verb.modifiers = [];
    fresh.clauses.push({ clause: { subject: { words: [{ implied: 'I' }], modifiers: [] }, verb: { words: [{ implied: 'am' }], modifiers: old.clauses[0].clause.verb.modifiers } } });
    await keptBefore('Luke 5:8', lang, old);
    const { ask, asked } = askOnce(fresh);
    expect(await fetchDiagram(luke5, verse(8), lang, { ask, key, now: 2 })).toMatchObject({ ok: true, diagram: fresh, kept: false });
    expect(asked).toHaveLength(1);
    const again = askOnce(old);
    expect(await fetchDiagram(luke5, verse(8), lang, { ask: again.ask, key })).toMatchObject({ ok: true, diagram: fresh, kept: true });
    expect(again.asked).toHaveLength(0);
  });

  it('is not read for a passage of Luke 5:7-8 either', async () => {
    const both = [luke5.verses.find((v) => v.n === 7)!, luke5.verses.find((v) => v.n === 8)!];
    const old = treeFor(both, 'greek');
    await keptBefore('Luke 5:7-8', 'greek', old);
    const { ask, asked } = askOnce(old);
    expect(await fetchDiagram(luke5, both, 'greek', { ask, key })).toMatchObject({ ok: true, kept: false });
    expect(asked).toHaveLength(1);
  });

  it('still reads a kept tree of Luke 5:6, which holds no vocative: no needless redraw', async () => {
    for (const lang of ['greek', 'english'] as const) {
      const old = treeFor(verse(6), lang);
      await keptBefore('Luke 5:6', lang, old);
      const { ask, asked } = askOnce(old);
      expect(await fetchDiagram(luke5, verse(6), lang, { ask, key })).toMatchObject({ ok: true, diagram: old, kept: true });
      expect(asked).toHaveLength(0);
    }
  });
});

describe('a tree kept before a negative stood on its own member of a contrast (mw-5r3p30.800, mw-fnvjof.17.309)', () => {
  // 2 Corinthians 5:7 'by faith we walk, not by sight' (περιπατοῦμεν οὐ διὰ εἴδους): οὐ (PRT-N) before a phrase with no verb of its own, as in Colossians 3:2; 2 Corinthians 5:6 holds no such negative.
  const cor = JSON.parse(readFileSync('public/data/2co/5.json', 'utf8')) as Chapter;
  const verse = (n: number) => [cor.verses.find((v) => v.n === n)!];
  const key = new Uint8Array(32).fill(7);
  const treeFor = (verses: Chapter['verses'], lang: 'greek' | 'english'): Diagram => flatDiagram(buildDiagramRequest(cor, verses, lang).request as unknown as Record<string, unknown>);
  const askOnce = (fresh: Diagram): { ask: AskDiagram; asked: number[] } => {
    const asked: number[] = [];
    return { asked, ask: async () => (asked.push(1), fresh) };
  };

  it('holds a negative before a verb-less member in 2 Corinthians 5:7 and Colossians 3:2, and not in 5:6 (the real data)', () => {
    const col = JSON.parse(readFileSync('public/data/col/3.json', 'utf8')) as Chapter;
    const parses = (c: Chapter, n: number) => c.verses.find((v) => v.n === n)!.g.map((w) => ({ parse: w.p }));
    expect(holdsNegatedMember(parses(cor, 7))).toBe(true);
    expect(holdsNegatedMember(parses(col, 2))).toBe(true);
    expect(holdsNegatedMember(parses(cor, 6))).toBe(false);
  });

  it('does not take for a negated member an exception (εἰ μὴ), nor a negative before a verb', () => {
    const of = (...parse: string[]) => parse.map((p) => ({ parse: p }));
    expect(holdsNegatedMember(of('V-PAI-1S', 'COND', 'PRT-N', 'T-ASM', 'N-ASM'))).toBe(false);
    expect(holdsNegatedMember(of('PRT-N', 'T-NSM', 'N-NSM', 'V-PAI-3S'))).toBe(false);
    expect(holdsNegatedMember(of('V-PAI-3S', 'PRT-N', 'T-NSM', 'N-NSM'))).toBe(true);
    // a verb in the NEXT verse of a passage is not the negated member's verb
    expect(holdsNegatedMember([{ parse: 'V-PAI-3S', verse: 1 }, { parse: 'PRT-N' }, { parse: 'N-NSM' }, { parse: 'V-PAI-3S', verse: 2 }])).toBe(true);
  });

  it.each(['greek', 'english'] as const)('is not read for 2 Corinthians 5:7 in %s: the tutor is asked, and the new tree is kept and read', async (lang) => {
    const old = treeFor(verse(7), lang);
    const fresh = structuredClone(old);
    fresh.clauses.push({ clause: { subject: { words: [{ implied: 'we' }], modifiers: [] }, verb: { words: [{ implied: 'walk' }], modifiers: [] } } });
    await keptBefore('2 Corinthians 5:7', lang, old);
    const { ask, asked } = askOnce(fresh);
    expect(await fetchDiagram(cor, verse(7), lang, { ask, key, now: 2 })).toMatchObject({ ok: true, diagram: fresh, kept: false });
    expect(asked).toHaveLength(1);
    const again = askOnce(old);
    expect(await fetchDiagram(cor, verse(7), lang, { ask: again.ask, key })).toMatchObject({ ok: true, diagram: fresh, kept: true });
    expect(again.asked).toHaveLength(0);
  });

  it('is not read for a passage of 2 Corinthians 5:6-7 either', async () => {
    const both = [...verse(6), ...verse(7)];
    const old = treeFor(both, 'greek');
    await keptBefore('2 Corinthians 5:6-7', 'greek', old);
    const { ask, asked } = askOnce(old);
    expect(await fetchDiagram(cor, both, 'greek', { ask, key })).toMatchObject({ ok: true, kept: false });
    expect(asked).toHaveLength(1);
  });

  it('still reads a kept tree of 2 Corinthians 5:6, which holds none: no needless redraw', async () => {
    for (const lang of ['greek', 'english'] as const) {
      const old = treeFor(verse(6), lang);
      await keptBefore('2 Corinthians 5:6', lang, old);
      const { ask, asked } = askOnce(old);
      expect(await fetchDiagram(cor, verse(6), lang, { ask, key })).toMatchObject({ ok: true, diagram: old, kept: true });
      expect(asked).toHaveLength(0);
    }
  });
});
