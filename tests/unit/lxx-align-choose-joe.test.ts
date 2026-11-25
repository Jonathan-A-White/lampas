// tests/unit/lxx-align-choose-joe.test.ts — the model pass over Joel (story mw-u2w5klk.349.62, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Joel 1 to 3, the chapters the ship ships (data/lxx/align/joe-01.tsv to joe-03.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Joel:
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
const MODELLED = alignFileChapters('joe');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Joel', () => {
  it('has one file a chapter, the chapters the ship ships (1, 2 and 3), each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1, 2, 3]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('joe', n)), 'utf8'));
      expect(rows.length, `Joe ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ref.startsWith(`Joe.${n}:`), row.ref).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectJoe = readExpect('joe')!;
    expect(Object.keys(expectJoe.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectJoe.chapters)) {
      expect(chapter.gaps, `Joe ${n}`).toBe(0);
      expect(chapter.leftovers, `Joe ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Joe ${n}: ${key}`).not.toBe('');
        expect(expectJoe.reasons[why] ?? why, `Joe ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Joel with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'joe', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-joe-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-joe-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Joe\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Joe ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Joe ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Joe ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Joe ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Joe ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Joe ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('joe', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      expect(rows.length, `Joe ${n}`).toBeGreaterThan(0);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Joe.${n}:${x.n}` === r.ref)!;
        expect(verse.e.some((c) => c.y === 'model' && c.t === r.text && c.g.join(',') === r.g.join(',')), `${r.ref} ${r.text}`).toBe(true);
      }
    }
  });

  const greek = (chapter: number, n: number, re: RegExp): string[] => {
    const verse = withModel.get(chapter)!.verses.find((v) => v.n === n)!;
    const chunk = verse.e.find((c) => re.test(c.t))!;
    expect(chunk, `${chapter}:${n} ${re}`).toBeDefined();
    return chunk.g.map((g) => verse.g[g].t);
  };

  it('pairs "removed" with the Greek verb in Joel 1:5 and 1:9, where a tap on it opened the Verse view', () => {
    expect(greek(1, 5, /removed/)).toEqual(['ἐξήρθη']);
    expect(greek(1, 9, /removed/)).toEqual(['ἐξῆρται']);
  });

  it('gives the aligner\'s wrong pairs back by fix rows: 1:11 "harvest" and "perished", 1:13 "lament" and "mourn"', () => {
    expect(greek(1, 11, /^harvest/)).toEqual(['τρυγητὸς']);
    expect(greek(1, 11, /perished/)).toEqual(['ἀπόλωλεν']);
    expect(greek(1, 13, /^lament/)).toEqual(['κόπτεσθε']);
    expect(greek(1, 13, /^mourn/)).toEqual(['θρηνεῖτε']);
  });

  it('gives "vats" the vats and "the press" the press (Joel 3:13), and "morning" the dawn (Joel 2:2)', () => {
    expect(greek(3, 13, /vats/)).toEqual(['τὰ', 'ὑπολήνια,']);
    expect(greek(3, 13, /^the press$/)).toEqual(['ἡ', 'ληνός·']);
    expect(greek(2, 2, /^morning/)).toEqual(['ὄρθρος']);
  });
});