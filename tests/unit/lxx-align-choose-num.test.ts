// tests/unit/lxx-align-choose-num.test.ts — the model pass over Numbers (story mw-u2w5klk.349.10, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Numbers 1 to 4 (data/lxx/align/num-01.tsv to num-04.tsv) and paired each piece to the Swete Greek words no chunk had; its `fix` rows give the one Greek word of a phrase
// ('twenty years old', 'two thousand', 'encamp next shall be') to every English word that renders it. The generic checks of every book (a file for each chapter its sidecar names, no stale run, the leftovers each with why,
// the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Numbers: it re-chose every remainder of its chapters, with Greek positions inside the verse; it dropped no word
// and no English word; and no English content word sits where a tap opens the Verse view but those the sidecar names, each with why.
// When the pinned sources are not on the disk (tests/support/lxx-real-data.ts) the real-data part is skipped and the gate's log says so.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { alignFileChapters, readExpect } from '../../scripts/lxx/align-expect';
import { ALIGN_CHOICES_DIR, alignChoicesName, FIX_RUN, readModelRows } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const real = lxxRealData();
const sources = { rawDir: real.rawDir, morpheusDir: real.morpheusDir };
const MODELLED = alignFileChapters('num');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Numbers', () => {
  it('has one file a chapter, the chapters in order from 1, each with a row for a run and every row a model chunk', () => {
    expect(MODELLED.length).toBeGreaterThan(0);
    expect(MODELLED).toEqual(MODELLED.map((_, i) => i + 1));
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('num', n)), 'utf8'));
      expect(rows.length, `Num ${n}`).toBeGreaterThan(0);
      const seen = new Map<string, number[]>();
      for (const row of rows) {
        expect(row.ref.startsWith(`Num.${n}:`), `${row.ref} in num-${n}`).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
        if (row.run === FIX_RUN) {
          // a fix row's Greek positions are written in ascending order (tests/unit/lxx-align-choose.test.ts 'applies every fix row' compares them to the chunk's g as joined)
          expect(row.g, `${row.ref} fix '${row.text}'`).toEqual([...row.g].sort((a, b) => a - b));
          continue;
        }
        const used = seen.get(row.ref) ?? [];
        for (const g of row.g) expect(used, `${row.ref}#${row.run} g ${g} is in two chunks`).not.toContain(g);
        seen.set(row.ref, [...used, ...row.g]);
      }
    }
  });

  it('gives every run of its chapters a row: 1,231 runs in Numbers 1 to 4 (the model pass is whole for them)', () => {
    let chunks = 0;
    for (const n of MODELLED) chunks += readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('num', n)), 'utf8')).filter((r) => r.run !== FIX_RUN).length;
    expect(chunks).toBeGreaterThanOrEqual(1231);
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectNum = readExpect('num')!;
    expect(Object.keys(expectNum.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectNum.chapters)) {
      expect(chapter.gaps, `Num ${n}`).toBe(0);
      expect(chapter.leftovers, `Num ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Num ${n}: ${key}`).not.toBe('');
        expect(expectNum.reasons[why] ?? why, `Num ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Numbers with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'num', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-num-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-num-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Num\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run and no fix stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Num ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Num ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Num ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Num ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Num ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it("drops no word and no English word: the chunks joined are Brenton's whole verse as the aligner had it, and the Greek words are the same", () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Num ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  // The Governor's report was a tap on 'removed' that opened the Verse view; these are the same kind of tap in Numbers: an English word with no Greek word of its own.
  it('pairs a word of each kind (1:19 commanded, 1:22 twenty years old, 2:9 one hundred, 3:4 ministered, 4:5 camp is about to move, 4:36 two thousand) to the Greek word the Reader links', () => {
    const cases: [number, number, string, string][] = [
      [1, 19, 'commanded', 'συνέταξεν'],
      [1, 22, 'twenty years old', 'εἰκοσαετοῦς'],
      [2, 9, 'were one hundred', 'ἑκατὸν'],
      [3, 4, "ministered in the priests' office", 'ἱεράτευσεν'],
      [4, 5, 'camp is about to move,', 'ἐξαίρῃ'],
      [4, 36, 'two thousand,', 'δισχίλιοι'],
    ];
    for (const [n, v, text, greek] of cases) {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunk = verse.e.find((c) => c.t === text);
      expect(chunk, `${n}:${v} ${text}`).toBeDefined();
      expect(septuagintChunkLinked(chunk!), `${n}:${v} ${text}`).toBe(true);
      expect(chunk!.g.map((i) => verse.g[i].t.replace(/[·,.;]/g, '')), `${n}:${v} ${text}`).toContain(greek);
    }
  });
});
