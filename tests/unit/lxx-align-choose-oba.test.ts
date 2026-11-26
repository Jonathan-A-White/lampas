// tests/unit/lxx-align-choose-oba.test.ts — the model pass over Obadiah (story mw-u2w5klk.349.64, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Obadiah 1, the one chapter of the book (data/lxx/align/oba-01.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Obadiah:
// it re-chose every remainder of its chapter, with Greek positions inside the verse; it dropped no word and no English word; and no English content word sits where a tap opens the Verse view but those the sidecar names.
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
const MODELLED = alignFileChapters('oba');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Obadiah', () => {
  it('has one file a chapter, the one chapter of the book, each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('oba', n)), 'utf8'));
      expect(rows.length, `Oba ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ref.startsWith(`Oba.${n}:`), row.ref).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectOba = readExpect('oba')!;
    expect(Object.keys(expectOba.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectOba.chapters)) {
      expect(chapter.gaps, `Oba ${n}`).toBe(0);
      expect(chapter.leftovers, `Oba ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Oba ${n}: ${key}`).not.toBe('');
        expect(expectOba.reasons[why] ?? why, `Oba ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Obadiah with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'oba', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-oba-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-oba-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Oba\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in its chapter, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Oba ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Oba ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Oba ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Oba ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Oba ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(21);
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Oba ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('oba', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      expect(rows.length, `Oba ${n}`).toBeGreaterThan(0);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Oba.${n}:${x.n}` === r.ref)!;
        expect(verse.e.some((c) => c.y === 'model' && c.t === r.text && c.g.join(',') === r.g.join(',')), `${r.ref} ${r.text}`).toBe(true);
      }
    }
  });

  const greek = (n: number, re: RegExp): string[] => {
    const verse = withModel.get(1)!.verses.find((v) => v.n === n)!;
    const chunk = verse.e.find((c) => re.test(c.t))!;
    expect(chunk, `1:${n} ${re}`).toBeDefined();
    return chunk.g.map((g) => verse.g[g].t);
  };

  it('gives "domain" the rule and "captivity" the carrying away (Obadiah 20), where the aligner had them crossed', () => {
    expect(greek(20, /domain/)).toEqual(['ἡ', 'ἀρχὴ']);
    expect(greek(20, /captivity/)).toEqual(['τῆς', 'μετοικεσίας']);
  });

  it('gives "destruction" and "perishing" of verse 13 each its own noun', () => {
    expect(greek(13, /^destruction/)).toEqual(['ὀλέθρου']);
    expect(greek(13, /perishing/)).toEqual(['ἀπωλίας']);
  });

  it('gives back the aligner\'s wrong pairs of verses 1, 3, 11 and 19 by fix rows', () => {
    expect(greek(1, /^nations/)).toEqual(['ἔθνη']);
    expect(greek(1, /sent forth/)).toEqual(['ἐξαπέστειλεν']);
    expect(greek(3, /habitation/)).toEqual(['κατοικίαν']);
    expect(greek(11, /forces/)).toEqual(['δύναμιν']);
    expect(greek(19, /dwell in the south/)).toEqual(['οἱ', 'ἐν', 'Νάγεβ']);
  });
});
