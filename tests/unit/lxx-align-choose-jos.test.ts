// tests/unit/lxx-align-choose-lev.test.ts — the model pass over Joshua (story mw-u2w5klk.349.12, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Joshua 1 to 8 (data/lxx/align/jos-01.tsv to jos-16.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Joshua:
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
const MODELLED = alignFileChapters('jos');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Joshua', () => {
  it('has one file a chapter, the chapters of the pass (1 to 8, 13 and 16), each with a row for a run and every row a model chunk', () => {
    expect(MODELLED.length).toBeGreaterThan(0);
    expect(MODELLED).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 13, 16]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('jos', n)), 'utf8'));
      expect(rows.length, `Jos ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectJos = readExpect('jos')!;
    expect(Object.keys(expectJos.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectJos.chapters)) {
      expect(chapter.gaps, `Jos ${n}`).toBe(0);
      expect(chapter.leftovers, `Jos ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Jos ${n}: ${key}`).not.toBe('');
        expect(expectJos.reasons[why] ?? why, `Jos ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Joshua with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'jos', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-jos-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-jos-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Jos\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Jos ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Jos ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Jos ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Jos ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Jos ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Jos ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  // Story mw-u2w5klk.349.130: LXX2012's Joshua 6:7 and 6:8 are each the other's in Swete's order, so 'Charge the people' stood under 'καὶ ἑπτὰ ἱερεῖς' and 'let seven priests' under Παραγγείλατε.
  it.each([
    [7, 'Charge', 'Παραγγείλατε'],
    [7, 'let your men of war', 'μάχιμοι'],
    [7, 'go round,', 'περιελθεῖν'],
    [8, 'proceed thus before', 'παρελθέτωσαν'],
    [8, 'proceed thus before', 'ὡσαύτως'],
  ])('Joshua 6:%i: the chunk "%s" renders %s', (n, text, greek) => {
    const verse = withModel.get(6)!.verses.find((x) => x.n === n)!;
    const chunk = verse.e.find((c) => c.t === text);
    expect(chunk, `Jos 6:${n} ${text}`).toBeDefined();
    expect(chunk!.g.map((g) => verse.g[g].t.replace(/[.,;·:]+$/, ''))).toContain(greek);
    expect(verse.g.filter((w) => w.e === undefined).map((w) => w.t)).toEqual(n === 7 ? ['καὶ', 'εἶπεν', 'αὐτοῖς', 'λέγων'] : []);
  });

  it('leaves no English word of Joshua 6:7 or 6:8 in the sidecar as one whose Greek is in the other verse', () => {
    const left = readExpect('jos')!.chapters['6'].leftovers!.map(([key]) => key);
    expect(left.filter((key) => /^6:[78]:/.test(key))).toEqual([]);
  });

  // Story mw-u2w5klk.349.146: LXX2012's Joshua 5 has 16 verses and Swete's 15, so 'Joshua fell on his face' stood under Λῦσαι τὸ ὑπόδημα and 'Loose your shoe' was shown nowhere.
  it.each([
    [14, 'fell', 'ἔπεσεν'],
    [14, 'servant?', 'οἰκέτῃ'],
    [14, 'command', 'προστάσσεις'],
    [15, 'Loose', 'Λῦσαι'],
    [15, 'shoe', 'ὑπόδημα'],
  ])('Joshua 5:%i: the chunk holding "%s" renders %s', (n, words, greek) => {
    const verse = withModel.get(5)!.verses.find((x) => x.n === n)!;
    const chunk = verse.e.find((c) => c.t.includes(words));
    expect(chunk, `Jos 5:${n} ${words}`).toBeDefined();
    expect(chunk!.g.map((g) => verse.g[g].t.replace(/[.,;·:]+$/, ''))).toContain(greek);
  });

  it('leaves no English word of Joshua 5:14 or 5:15 in the sidecar as one whose Greek is in the other verse', () => {
    const left = readExpect('jos')!.chapters['5'].leftovers!.filter(([key, why]) => /^5:1[45]:/.test(key) && why === 'other-verse-jos');
    expect(left).toEqual([]);
  });

  it('pairs the English of Joshua 3:14 "removed" with ἀπῆρεν, where a tap on "removed" opened the Verse view', () => {
    const verse = withModel.get(3)!.verses.find((v) => v.n === 14)!;
    const chunk = verse.e.find((c) => /removed/.test(c.t));
    expect(chunk).toBeDefined();
    expect(chunk!.y).toBe('model');
    expect(chunk!.g.map((g) => verse.g[g].t)).toEqual(['ἀπῆρεν']);
  });

  it('gives "it came to pass" of Joshua 1:1 to ἐγένετο, as one chunk', () => {
    const verse = withModel.get(1)!.verses.find((v) => v.n === 1)!;
    const chunk = verse.e.find((c) => /it came to pass/.test(c.t));
    expect(chunk).toBeDefined();
    expect(chunk!.g.map((g) => verse.g[g].t)).toEqual(['ἐγένετο']);
  });
});
