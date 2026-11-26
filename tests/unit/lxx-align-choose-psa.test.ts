// tests/unit/lxx-align-choose-psa.test.ts — the model pass over Psalms, the real data (story mw-u2w5klk.349.13; a book's real-data tests are in its own file, tests/unit/lxx-align-choose-<code>.test.ts,
// so that a pass over another book writes no line of the shared file: docs/lxx-align.md 'A pairing pass').
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { alignFileChapters } from '../../scripts/lxx/align-expect';
import { runShip, type Shipped } from '../../scripts/lxx/ship';
import { joined } from '../support/lxx-align-choose';
import { lxxRawData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

// Psalms with the model pass (story mw-u2w5klk.349.13; the Governor's 2026-11-10 'I tap removed and get this', Genesis 20:1, for every book). Psalms has no Morpheus cache anywhere (docs/lxx-align/psa.txt says
// so), so unlike the Genesis block above this one needs only the pinned raw sources (data/raw/lxx, this checkout's or the Laptop's lent ones: tests/support/lxx-real-data.ts lxxRawData) and runs the ship with --no-morpheus on Psalms alone.
// The chapters of the pass are the files of data/lxx/align (psa-<nn>.tsv), done in the order the ship ships them: the first chapter left (Psalms 37 at this story) is the next batch's. Each file's reasons for a content word left with no Greek
// are in data/lxx/align/psa.expect.json (the generic checks of the Genesis block read it too, on a host with the Genesis cache).
const real = lxxRawData();
describe.skipIf(!real.run)('Psalms with the model pass', () => {
  const PSA: ReadonlyArray<readonly [string, string]> = [['Psa', 'Psalms']];
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let shipped: Shipped;
  let stale: string[] = [];
  const MODELLED_PSA = alignFileChapters('psa');
  const read = (dir: string, chapters: number[]): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of chapters) out.set(n, JSON.parse(readFileSync(join(dir, 'psa', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-psa-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-psa-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a, '--no-morpheus'], { rawDir: real.rawDir, alignDir: '', books: PSA, log: () => undefined });
    shipped = await runShip(['--out', b, '--no-morpheus'], { rawDir: real.rawDir, books: PSA, log: (l) => log.push(l) });
    base = read(a, MODELLED_PSA);
    withModel = read(b, MODELLED_PSA);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has a model file for the shipped chapters of Psalms from the first, in order and with no gap, and none of its runs is stale', () => {
    const psa = shipped.books.find((b) => b.code === 'psa')!;
    expect(MODELLED_PSA.length).toBeGreaterThan(0);
    expect(MODELLED_PSA).toEqual(psa.shipped.slice(0, MODELLED_PSA.length));
    expect(stale).toEqual([]);
  });

  it('leaves no remainder chunk in a chapter of the pass: every English chunk is aligned, the model\'s or one of the function words the aligner left', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) expect(verse.e.filter((c) => c.y === 'align?'), `Psa ${n}:${verse.n}`).toEqual([]);
    }
  });

  it('drops no word and no English: the chunks joined are Brenton\'s whole verse as the aligner had it, with the same Greek words and the same supplied words', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        const prior = was.verses[i];
        expect(joined(verse), `Psa ${n}:${verse.n}`).toBe(joined(prior));
        expect(verse.g.map((w) => w.t)).toEqual(prior.g.map((w) => w.t));
        const supplied = (v: Verse): number => v.e.reduce((a, c) => a + (c.s?.length ?? 0), 0);
        expect(supplied(verse)).toBe(supplied(prior));
        // a model chunk points at the verse's own Greek words only
        for (const c of verse.e) for (const k of c.g) expect(k, `Psa ${n}:${verse.n} ${c.t}`).toBeLessThan(verse.g.length);
      });
    }
  });

  it('settles more of the Greek: more words have English than the aligner alone gave, in every chapter', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Psa ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });
});
