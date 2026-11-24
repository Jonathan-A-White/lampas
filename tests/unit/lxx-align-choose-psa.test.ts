// tests/unit/lxx-align-choose-psa.test.ts — the model pass over the Psalms (story mw-u2w5klk.349.13; docs/lxx-align.md, 'The model pass' and 'A pairing pass'): the remainder chunks of the first 30 shipped chapters
// of the Psalms (2 to 45, 1,400 runs) are cut and paired to Swete's Greek words by `data/lxx/align/psa-<nn>.tsv`. Here: the files are those chapters and no other, no run is stale, no remainder is left, every chunk
// points at real, free Greek words of its own verse, the chunks joined are Brenton's whole verse (no word and no English dropped), and the English content words with no Greek word are those the sidecar names with why.
// Like tests/unit/lxx-align-choose.test.ts it needs the git-ignored sources (tests/support/lxx-real-data.ts) and is skipped, with a line in the gate's log, where there are none.
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { alignFileChapters, checkFiles, expectBooks, readExpect } from '../../scripts/lxx/align-expect';
import { ALIGN_CHOICES_DIR, alignChoicesName, readModelRows } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };

/** The chapters of the Psalms this story did, in the order of the book: the chapters the ship ships, up to about 1,400 runs; Psalm 46 is the first left. */
const DONE = [2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 15, 16, 18, 19, 22, 23, 25, 28, 29, 31, 32, 33, 36, 37, 38, 39, 40, 42, 43, 45];
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the files of the model pass over the Psalms', () => {
  it('are one for each chapter of this pass, a model row (c 0.8, 0.5 or 0.4) for every run it names, and the sidecar names the same chapters', () => {
    const files = readdirSync(ALIGN_CHOICES_DIR).filter((f) => f.startsWith('psa-') && f.endsWith('.tsv'));
    expect(files).toEqual(DONE.map((n) => alignChoicesName('psa', n)));
    expect(alignFileChapters('psa')).toEqual(DONE);
    for (const n of DONE) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('psa', n)), 'utf8'));
      expect(rows.length, `Psa ${n}`).toBeGreaterThan(0);
      for (const r of rows) expect([0.8, 0.5, 0.4], `Psa ${n} ${r.ref}`).toContain(r.confidence);
    }
    expect(Object.keys(readExpect('psa')!.chapters).map(Number)).toEqual(expect.arrayContaining(DONE));
  });
});

describe.skipIf(!real.run)('the Psalms with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of DONE) out.set(n, JSON.parse(readFileSync(join(dir, 'psa', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-psa-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-psa-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has no stale run, and the sidecar and the files agree', () => {
    expect(stale).toEqual([]);
    expect(checkFiles('psa', readExpect('psa')!, alignFileChapters('psa'))).toEqual([]);
    expect(expectBooks()).toContain('psa');
  });

  it('leaves no remainder: every chunk of these chapters has been chosen, its Greek positions are inside the verse and each Greek word is in one chunk', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        expect(verse.e.filter((c) => c.y === 'align?'), `Psa ${n}:${verse.n}`).toEqual([]);
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Psa ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Psa ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Psa ${n}:${verse.n} word ${k}`).toContain(k));
      }
    }
  });

  it("drops no word and no English: the chunks joined are Brenton's whole verse as the aligner had it, and the Greek words are the same", () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        const prior = was.verses[i];
        expect(joined(verse), `Psa ${n}:${verse.n}`).toBe(joined(prior));
        expect(verse.g.map((w) => w.t)).toEqual(prior.g.map((w) => w.t));
      });
    }
  });

  it('settles more of the Greek: more words have English than the aligner alone gave, in every chapter', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Psa ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });

  it('counts no English content word unpaired in these chapters (the others are each named in the sidecar with why: the generic test of tests/unit/lxx-align-choose.test.ts)', () => {
    const expectFile = readExpect('psa')!;
    for (const n of DONE) {
      const c = expectFile.chapters[String(n)];
      expect(c.gaps, `Psa ${n}`).toBe(0);
      for (const [word, why] of c.leftovers ?? []) expect(why.trim(), `Psa ${word}`).not.toBe('');
    }
  });
});
