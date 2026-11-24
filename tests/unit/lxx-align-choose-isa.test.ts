// tests/unit/lxx-align-choose-isa.test.ts — the model pass over Isaiah, the real data (story mw-u2w5klk.349.14; moved here from tests/unit/lxx-align-choose.test.ts by mw-u2w5klk.349.99, so that a pass over another book
// writes no line of the shared file: docs/lxx-align.md 'A pairing pass').
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { alignFileChapters } from '../../scripts/lxx/align-expect';
import { runShip, type Shipped } from '../../scripts/lxx/ship';
import { joined } from '../support/lxx-align-choose';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

// Isaiah with the model pass (story mw-u2w5klk.349.14; the Governor's 2026-11-10 'I tap removed and get this', Genesis 20:1, for every book). Isaiah has no Morpheus cache anywhere (docs/lxx-align/isa.txt says
// so), so unlike the Genesis block above this one needs only the pinned raw sources (data/raw/lxx, `npm run lxx:link`) and runs the ship with --no-morpheus on Isaiah alone.
// The chapters of the pass are the files of data/lxx/align (isa-<nn>.tsv), done in the order the ship ships them: the first chapter left is the next batch's. Each file's reasons for a content word left with no Greek
// are in data/lxx/align/isa.expect.json (the generic checks of the Genesis block read it too, on a host with the Genesis cache).
const RAW_ISA = join(process.cwd(), 'data/raw/lxx');
const haveRawIsa = existsSync(RAW_ISA);
describe.skipIf(!haveRawIsa)('Isaiah with the model pass', () => {
  const ISA: ReadonlyArray<readonly [string, string]> = [['Isa', 'Isaiah']];
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let shipped: Shipped;
  let stale: string[] = [];
  const MODELLED_ISA = alignFileChapters('isa');
  const read = (dir: string, chapters: number[]): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of chapters) out.set(n, JSON.parse(readFileSync(join(dir, 'isa', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-isa-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-isa-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a, '--no-morpheus'], { rawDir: RAW_ISA, alignDir: '', books: ISA, log: () => undefined });
    shipped = await runShip(['--out', b, '--no-morpheus'], { rawDir: RAW_ISA, books: ISA, log: (l) => log.push(l) });
    base = read(a, MODELLED_ISA);
    withModel = read(b, MODELLED_ISA);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has a model file for the shipped chapters of Isaiah from the first, in order and with no gap, and none of its runs is stale', () => {
    const isa = shipped.books.find((b) => b.code === 'isa')!;
    expect(MODELLED_ISA.length).toBeGreaterThan(0);
    expect(MODELLED_ISA).toEqual(isa.shipped.slice(0, MODELLED_ISA.length));
    expect(stale).toEqual([]);
  });

  it('leaves no remainder chunk in a chapter of the pass: every English chunk is aligned, the model\'s or one of the function words the aligner left', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Isa ${n}:${verse.n}`).toEqual([]);
    }
  });

  it('drops no word and no English: the chunks joined are Brenton\'s whole verse as the aligner had it, with the same Greek words and the same supplied words', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        const prior = was.verses[i];
        expect(joined(verse), `Isa ${n}:${verse.n}`).toBe(joined(prior));
        expect(verse.g.map((w) => w.t)).toEqual(prior.g.map((w) => w.t));
        const supplied = (v: Verse): number => v.e.reduce((a, c) => a + (c.s?.length ?? 0), 0);
        expect(supplied(verse)).toBe(supplied(prior));
        // a model chunk points at the verse's own Greek words only
        for (const c of verse.e) for (const k of c.g) expect(k, `Isa ${n}:${verse.n} ${c.t}`).toBeLessThan(verse.g.length);
      });
    }
  });

  it('settles more of the Greek: more words have English than the aligner alone gave, in every chapter', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Isa ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });
});
