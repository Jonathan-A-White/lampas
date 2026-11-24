// tests/unit/lxx-align-choose-jdg.test.ts — the model pass over Judges (story mw-u2w5klk.349.59, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Judges 1 to 4, the chapters the ship ships (data/lxx/align/jdg-01.tsv to jdg-04.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Judges (the Governor's report of 2026-11-20: tapping a word in Judges 1 sometimes opened the Verse view):
// it re-chose every remainder of its chapters, with Greek positions inside the verse; it dropped no word and no English word; and no English content word sits where a tap opens the Verse view but those the sidecar names.
// When the pinned sources are not on the disk (tests/support/lxx-real-data.ts) the real-data part is skipped and the gate's log says so.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { alignFileChapters, readExpect } from '../../scripts/lxx/align-expect';
import { ALIGN_CHOICES_DIR, alignChoicesName, readModelRows } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const MODELLED = alignFileChapters('jdg');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Judges', () => {
  it('has one file a chapter, the chapters of the pass (1 to 4), each with a row for a run and every row a model chunk', () => {
    expect(MODELLED.length).toBeGreaterThan(0);
    expect(MODELLED).toEqual([1, 2, 3, 4]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('jdg', n)), 'utf8'));
      expect(rows.length, `Jdg ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectJdg = readExpect('jdg')!;
    expect(Object.keys(expectJdg.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectJdg.chapters)) {
      expect(chapter.gaps, `Jdg ${n}`).toBe(0);
      expect(chapter.leftovers, `Jdg ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Jdg ${n}: ${key}`).not.toBe('');
        expect(expectJdg.reasons[why] ?? why, `Jdg ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Judges with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'jdg', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-jdg-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-jdg-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Jdg\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Jdg ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Jdg ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Jdg ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Jdg ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Jdg ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Jdg ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('gives "came out" of Judges 1:10 to ἐξῆλθεν, and "went" to ἐπορεύθη', () => {
    const verse = withModel.get(1)!.verses.find((v) => v.n === 10)!;
    const came = verse.e.find((c) => /came out/.test(c.t));
    expect(came).toBeDefined();
    expect(came!.y).toBe('model');
    expect(came!.g.map((g) => verse.g[g].t)).toEqual(['ἐξῆλθεν', 'ἐξ']);
    const went = verse.e.find((c) => c.t === 'went');
    expect(went!.g.map((g) => verse.g[g].t)).toEqual(['ἐπορεύθη']);
  });

  it('gives "it came to pass" of Judges 1:1 to ἐγένετο, as one chunk', () => {
    const verse = withModel.get(1)!.verses.find((v) => v.n === 1)!;
    const chunk = verse.e.find((c) => /it came to pass/.test(c.t));
    expect(chunk).toBeDefined();
    expect(chunk!.g.map((g) => verse.g[g].t)).toEqual(['ἐγένετο']);
  });
});
