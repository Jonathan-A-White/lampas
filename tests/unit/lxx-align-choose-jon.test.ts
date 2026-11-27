// tests/unit/lxx-align-choose-jon.test.ts — the model pass over Jonah (story mw-u2w5klk.349.65, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Jonah 1 to 4, all the chapters of the book the ship ships (data/lxx/align/jon-01.tsv to jon-04.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Jonah:
// it re-chose every remainder of its chapters, with Greek positions inside the verse; it dropped no word and no English word; and no English content word sits where a tap opens the Verse view but those the sidecar names.
// When the pinned sources are not on the disk (tests/support/lxx-real-data.ts) the real-data part is skipped and the gate's log says so.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { alignFileChapters, readExpect } from '../../scripts/lxx/align-expect';
import { ALIGN_CHOICES_DIR, alignChoicesName, FIX_RUN, readModelRows } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const MODELLED = alignFileChapters('jon');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Jonah', () => {
  it('has one file a chapter, chapters 1 to 4, each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1, 2, 3, 4]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('jon', n)), 'utf8'));
      expect(rows.length, `Jon ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ref.startsWith(`Jon.${n}:`), row.ref).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectJon = readExpect('jon')!;
    expect(Object.keys(expectJon.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectJon.chapters)) {
      expect(chapter.gaps, `Jon ${n}`).toBe(0);
      expect(chapter.leftovers, `Jon ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Jon ${n}: ${key}`).not.toBe('');
        expect(expectJon.reasons[why] ?? why, `Jon ${n}: ${key}`).not.toBe('');
      }
    }
  });

  it("has no leftover for 'clefts' and 'mountains': the verse map stands Brenton's 'to the clefts of the mountains;' at Swete's 2:6, where εἰς σχισμὰς ὀρέων is (mw-u2w5klk.349.157)", () => {
    const keys = (readExpect('jon')!.chapters['2'].leftovers ?? []).map(([key]) => key);
    expect(keys).not.toContain('2:7:clefts');
    expect(keys).not.toContain('2:7:mountains');
    expect(keys).toEqual(['2:11:lord']);
  });
});

describe.skipIf(!real.run)('Jonah with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'jon', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-jon-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-jon-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Jon\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each chapter, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Jon ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Jon ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Jon ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Jon ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Jon ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    const verses = new Map([[1, 16], [2, 11], [3, 10], [4, 11]]);
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses, `Jon ${n}`).toHaveLength(verses.get(n)!);
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Jon ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('jon', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      expect(rows.length, `Jon ${n}`).toBeGreaterThan(0);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Jon.${n}:${x.n}` === r.ref)!;
        expect(verse.e.some((c) => c.y === 'model' && c.t === r.text && c.g.join(',') === r.g.join(',')), `${r.ref} ${r.text}`).toBe(true);
      }
    }
  });

  const greek = (n: number, v: number, re: RegExp): string[] => {
    const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
    const chunk = verse.e.find((c) => re.test(c.t))!;
    expect(chunk, `${n}:${v} ${re}`).toBeDefined();
    return chunk.g.map((g) => verse.g[g].t);
  };

  it('gives "removed"-kind words their own Greek: "raiment" (3:6), "storm"-"tempest" (1:12), "mischief" (1:7) and "occupation" (1:8)', () => {
    expect(greek(3, 6, /raiment/)).toEqual(['τὴν', 'στολὴν', 'αὐτοῦ']);
    expect(greek(1, 12, /tempest/)).toEqual(['ὁ', 'κλύδων', 'ὁ', 'μέγας', 'οὗτος']);
    expect(greek(1, 7, /^mischief/)).toEqual(['κακία']);
    expect(greek(1, 8, /occupation/)).toEqual(['σου', 'ἐργασία']);
  });

  it("stands 'to the clefts of the mountains;' in 2:6 on εἰς σχισμὰς ὀρέων, so 2:7 begins with 'I went down' (mw-u2w5klk.349.157)", () => {
    expect(greek(2, 6, /^clefts$/)).toEqual(['σχισμὰς']);
    expect(greek(2, 6, /^mountains;$/)).toEqual(['ὀρέων,']);
    const seven = withModel.get(2)!.verses.find((v) => v.n === 7)!;
    expect(seven.e.some((c) => /clefts|mountains/.test(c.t))).toBe(false);
    expect(joined(withModel.get(2)!.verses.find((v) => v.n === 6)!)).toMatch(/my head went down to the clefts of the mountains;$/);
  });

  it('gives the verbs of the book the Greek word that renders them', () => {
    expect(greek(1, 5, /sailors/)).toEqual(['ναυτικοὶ']);
    expect(greek(2, 1, /had commanded/)).toEqual(['προσέταξεν']);
    expect(greek(3, 3, /^journey/)).toEqual(['πορείας', 'ὁδοῦ']);
    expect(greek(4, 11, /human beings/)).toEqual(['ἀνθρώπων,']);
    expect(greek(4, 11, /right hand/)).toEqual(['δεξιὰν']);
  });
});
