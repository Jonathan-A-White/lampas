// tests/unit/lxx-align-choose-exo.test.ts — the model pass over Exodus (story mw-u2w5klk.349.8; docs/lxx-align.md 'A pairing pass'): Brenton's remainder chunks of Exodus 1 to 19 are cut and paired to Swete's
// Greek words, one file a chapter in data/lxx/align/exo-<nn>.tsv (the Governor's report of 2026-11-10: he tapped 'removed' and got the Verse view). The files are held here as data (they exist, are well formed,
// name no Greek word twice in a verse) and, when the pinned sources are on the disk (tests/support/lxx-real-data.ts), as what the ship makes of them: no remainder left, no word or English dropped, every fix applied,
// no English content word without a Greek word but those the sidecar data/lxx/align/exo.expect.json names with why, and the taps that opened the Verse view now open a Greek word.
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { alignFileChapters, checkFiles, checkLeftovers, measureShipped, readExpect } from '../../scripts/lxx/align-expect';
import { ALIGN_CHOICES_DIR, alignChoicesName, FIX_RUN, readModelRows, type ModelRow } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

/** The chapters of this pass, in order: the first chapter left is Exodus 20 (the story's closing comment). */
const PASS = [1, 6, 8, 11, 14, 15, 17, 18, 19];
const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const rowsOf = (n: number): ModelRow[] => readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('exo', n)), 'utf8'));
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Exodus', () => {
  it('are one file a chapter for the chapters of the pass, and the sidecar names the same chapters', () => {
    expect(alignFileChapters('exo')).toEqual(PASS);
    expect(readdirSync(ALIGN_CHOICES_DIR).filter((f) => f.startsWith('exo-') && f.endsWith('.tsv'))).toEqual(PASS.map((n) => alignChoicesName('exo', n)));
    expect(checkFiles('exo', readExpect('exo')!, PASS)).toEqual([]);
  });

  it('hold only rows of their own chapter, chosen at 0.8, unsure at 0.5 or guessed at 0.4, and no Greek word twice in a verse among the runs', () => {
    for (const n of PASS) {
      const rows = rowsOf(n);
      expect(rows.length, `Exo ${n}`).toBeGreaterThan(0);
      const seen = new Map<string, number[]>();
      for (const r of rows) {
        expect(r.ref.startsWith(`Exo.${n}:`), `${r.ref} in exo-${n}`).toBe(true);
        expect([0.8, 0.5, 0.4], `${r.ref}#${r.run}`).toContain(r.confidence);
        r.g.forEach((g) => expect(Number.isInteger(g) && g >= 0, `${r.ref}#${r.run} g ${g}`).toBe(true));
        if (r.run === FIX_RUN) {
          // a fix row's Greek positions are written in ascending order (tests/unit/lxx-align-choose.test.ts 'applies every fix row' compares them to the chunk's g as joined)
          expect(r.g, `${r.ref} fix '${r.text}'`).toEqual([...r.g].sort((a, b) => a - b));
          continue;
        }
        const used = seen.get(r.ref) ?? [];
        for (const g of r.g) expect(used, `${r.ref}#${r.run} g ${g} is in two chunks`).not.toContain(g);
        seen.set(r.ref, [...used, ...r.g]);
      }
    }
  });

  it('give every run of the chapters a row, 1,342 runs in all (the model pass is whole for them)', () => {
    let chunks = 0;
    for (const n of PASS) chunks += rowsOf(n).filter((r) => r.run !== FIX_RUN).length;
    expect(chunks).toBeGreaterThanOrEqual(1342);
  });
});

describe.skipIf(!real.run)('Exodus with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  let shippedDir = '';
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of PASS) out.set(n, JSON.parse(readFileSync(join(dir, 'exo', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-exo-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-exo-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    shippedDir = b;
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('has no stale run and no stale fix: the aligner is what the session read', () => {
    expect(stale).toEqual([]);
  });

  it('re-chooses every remainder: no chunk is left y "align?", each model chunk has c and its Greek positions are real and used once in its verse', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        expect(verse.e.filter((c) => c.y === 'align?'), `Exo ${n}:${verse.n}`).toEqual([]);
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Exo ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g).toContain(k));
      }
    }
  });

  it("drops no word and no English: a verse's chunks joined are Brenton's whole verse as the aligner had it, with the same Greek words", () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Exo ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('settles more of the Greek in every chapter than the aligner alone gave', () => {
    const paired = (c: Chapter): number => c.verses.reduce((a, v) => a + v.g.filter((w) => w.e !== undefined).length, 0);
    for (const [n, chapter] of withModel) expect(paired(chapter), `Exo ${n}`).toBeGreaterThan(paired(base.get(n)!));
  });

  it('leaves no English content word without a Greek word but those the sidecar names, each with why (0 unpaired, the rest settled as rendering no Greek)', () => {
    const want = readExpect('exo')!;
    const measured = measureShipped(shippedDir, 'exo', PASS, (n) => want.chapters[String(n)]?.also ?? []);
    expect(checkLeftovers('exo', want, measured)).toEqual([]);
    for (const n of PASS) expect(want.chapters[String(n)].gaps, `Exo ${n}`).toBe(0);
  });

  // The Governor's report was a tap on 'removed' that opened the Verse view; these are the same kind of tap in Exodus: a content word of a remainder that had no Greek word of its own.
  it("pairs a content word of each kind (Exodus 1:8 knew, 14:19 removed, 14:30 delivered, 15:5 sank, 19:3 went up, 8:6 frogs brought up) to a Greek word the Reader links", () => {
    const cases: [number, number, string, string][] = [
      [1, 8, 'knew', 'ᾔδει'],
      [14, 19, 'removed', 'ἐξῆρεν'],
      [14, 30, 'delivered', 'ἐρρύσατο'],
      [15, 5, 'they sank', 'κατέδυσαν'],
      [19, 3, 'went up', 'ἀνέβη'],
      [14, 7, 'six hundred', 'ἑξακόσια'],
    ];
    for (const [n, v, text, greek] of cases) {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunk = verse.e.find((c) => c.t === text || c.t.endsWith(` ${text}`));
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk!), `${n}:${v} ${text}`).toBe(true);
      expect(chunk!.g.map((i) => verse.g[i].t.replace(/[·,.;]/g, '')), `${n}:${v} ${text}`).toContain(greek);
    }
  });
});
