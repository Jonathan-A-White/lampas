// tests/unit/lxx-align-choose-amo.test.ts — the model pass over Amos (story mw-u2w5klk.349.63, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Amos 1 to 8, the chapters the ship ships (data/lxx/align/amo-01.tsv to amo-08.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Amos:
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
const MODELLED = alignFileChapters('amo');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Amos', () => {
  it('has one file a chapter, the chapters the ship ships (1 to 8), each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('amo', n)), 'utf8'));
      expect(rows.length, `Amo ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.ref.startsWith(`Amo.${n}:`), row.ref).toBe(true);
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectAmo = readExpect('amo')!;
    expect(Object.keys(expectAmo.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectAmo.chapters)) {
      expect(chapter.gaps, `Amo ${n}`).toBe(0);
      expect(chapter.leftovers, `Amo ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Amo ${n}: ${key}`).not.toBe('');
        expect(expectAmo.reasons[why] ?? why, `Amo ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe.skipIf(!real.run)('Amos with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'amo', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-amo-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-amo-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Amo\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Amo ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Amo ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Amo ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Amo ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Amo ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Amo ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('amo', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      expect(rows.length, `Amo ${n}`).toBeGreaterThan(0);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Amo.${n}:${x.n}` === r.ref)!;
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

  it('pairs "I will destroy" and "shall perish" in Amos 1:8 each with its own verb, where the aligner had them crossed', () => {
    expect(greek(1, 8, /I will destroy/)).toEqual(['ἐξολεθρεύσω']);
    expect(greek(1, 8, /shall perish/)).toEqual(['ἀπολοῦνται']);
  });

  it('gives "roar" the roaring and "utter" the giving (Amos 3:4)', () => {
    expect(greek(3, 4, /^roar/)).toEqual(['ἐρεύξεται']);
    expect(greek(3, 4, /^utter/)).toEqual(['δώσει']);
  });

  // mw-u2w5klk.349.137: from 6:11 each verse of Brenton rendered the Greek of the verse before it, and his 6:15 was shown nowhere
  it('stands each verse of Brenton from Amos 6:10 to 6:15 at the Greek it renders, his 6:15 at the Greek 6:14', () => {
    const verse = (n: number): Verse => withModel.get(6)!.verses.find((v) => v.n === n)!;
    expect(withModel.get(6)!.verses.map((v) => v.n)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(joined(verse(10))).toContain('you name not the name of the Lord.');
    expect(joined(verse(11))).toMatch(/^For, behold,.*the little house with rents\.$/);
    expect(joined(verse(14))).toContain('I will raise up against you a nation');
    expect(greek(6, 10, /^Is there/)).toEqual(['Εἰ', 'ὑπάρχει']);
    expect(greek(6, 11, /great/)).toContain('μέγαν');
    expect(greek(6, 12, /horses/)).toContain('ἵπποι;');
    expect(greek(6, 13, /horns/)).toContain('κέρατα;');
    expect(greek(6, 14, /nation/)).toContain('ἔθνος,');
  });

  it('gives back the aligner\'s wrong pairs of 5:9, 7:9 and 7:17 by fix rows', () => {
    expect(greek(5, 9, /brings/)).toEqual(['ἐπάγων.']);
    expect(greek(5, 9, /distress/)).toEqual(['ταλαιπωρίαν']);
    expect(greek(7, 9, /joyful/)).toEqual(['τοῦ', 'γέλωτος,']);
    expect(greek(7, 9, /abolished/)).toEqual(['ἀφανισθήσονται']);
    expect(greek(7, 17, /your land/)).toEqual(['ἡ', 'γῆ', 'σου']);
  });
});
