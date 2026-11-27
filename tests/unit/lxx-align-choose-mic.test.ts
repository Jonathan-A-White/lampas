// tests/unit/lxx-align-choose-mic.test.ts — the model pass over Micah (story mw-u2w5klk.349.66, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Micah 1 to 7, all the chapters of the book the ship ships (data/lxx/align/mic-01.tsv to mic-07.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Micah:
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
const MODELLED = alignFileChapters('mic');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Micah', () => {
  it('has one file a chapter, chapters 1 to 7, each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('mic', n)), 'utf8'));
      expect(rows.length, `Mic ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ref.startsWith(`Mic.${n}:`), row.ref).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectMic = readExpect('mic')!;
    expect(Object.keys(expectMic.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectMic.chapters)) {
      expect(chapter.gaps, `Mic ${n}`).toBe(0);
      expect(chapter.leftovers, `Mic ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Mic ${n}: ${key}`).not.toBe('');
        expect(expectMic.reasons[why] ?? why, `Mic ${n}: ${key}`).not.toBe('');
      }
    }
  });

  it("has no leftover but the English whose Greek stands in the next or the previous verse: 'assembly' and 'Lord' of 2:6, 'breach' and 'made' of 2:12, 'away', 'goods', 'take' and 'therefore' of 7:4", () => {
    const keys = Object.entries(readExpect('mic')!.chapters).flatMap(([, c]) => (c.leftovers ?? []).map(([key]) => key));
    expect(keys).toEqual(['2:6:assembly', '2:6:lord', '2:12:breach', '2:12:made', '7:4:away', '7:4:goods', '7:4:take', '7:4:therefore']);
  });
});

describe.skipIf(!real.run)('Micah with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'mic', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-mic-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-mic-b-'));
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
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Mic ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Mic ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Mic ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Mic ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Mic ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    const verses = new Map([[1, 16], [2, 13], [3, 12], [4, 13], [5, 15], [6, 16], [7, 20]]);
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses, `Mic ${n}`).toHaveLength(verses.get(n)!);
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Mic ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('mic', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      expect(rows.length, `Mic ${n}`).toBeGreaterThan(0);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Mic.${n}:${x.n}` === r.ref)!;
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

  it('gives \'mourning\' (1:8) its πένθος, which the aligner had left on κόψεται, and the words of 1:4, 4:13, 7:4 and 7:11 the Greek that renders them', () => {
    expect(greek(1, 8, /^mourning$/)).toEqual(['πένθος']);
    expect(greek(1, 4, /^like wax$/)).toEqual(['ὡς', 'κηρὸς']);
    expect(greek(4, 13, /^their strength to the Lord$/)).toEqual(['τὴν', 'ἰσχὺν', 'αὐτῶν', 'τῷ', 'κυρίῳ']);
    expect(greek(7, 4, /^as a devouring moth,$/)).toEqual(['ὡς', 'σὴς', 'ἐκτρώγων']);
    expect(greek(7, 11, /^It is the day of making of brick;$/)).toEqual(['ἡμέρας', 'ἀλοιφῆς', 'πλίνθου,']);
  });
});
