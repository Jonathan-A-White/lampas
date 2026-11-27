// tests/unit/lxx-align-choose-hos.test.ts — the model pass over Hosea (story mw-u2w5klk.349.61, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Hosea 1, 5 and 6, the chapters the ship ships (data/lxx/align/hos-01.tsv, hos-05.tsv, hos-06.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Hosea:
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
const MODELLED = alignFileChapters('hos');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');

describe('the model pass files of Hosea', () => {
  it('has one file a chapter, the chapters the ship ships (1, 5 and 6), each with a row for a run and every row a model chunk', () => {
    expect(MODELLED).toEqual([1, 5, 6]);
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('hos', n)), 'utf8'));
      expect(rows.length, `Hos ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectHos = readExpect('hos')!;
    expect(Object.keys(expectHos.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectHos.chapters)) {
      expect(chapter.gaps, `Hos ${n}`).toBe(0);
      expect(chapter.leftovers, `Hos ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Hos ${n}: ${key}`).not.toBe('');
        expect(expectHos.reasons[why] ?? why, `Hos ${n}: ${key}`).not.toBe('');
      }
    }
  });
});

describe('the notes of Hosea', () => {
  // mw-u2w5klk.349.161: the notes said chapters 2 to 4 and 7 to 14 were not shipped after the report listed 2, 3, 7, 8 and 9; Hosea 4 ships since mw-u2w5klk.349.199
  it('name as not shipped the chapters the report of the book lacks, and no other', () => {
    const report = readFileSync(join('docs', 'lxx-align', 'hos.txt'), 'utf8');
    const shipped = [...report.matchAll(/^\| Hosea (\d+) \|/gm)].map((m) => Number(m[1]));
    const missing = Array.from({ length: 14 }, (_, i) => i + 1).filter((n) => !shipped.includes(n));
    expect(missing).toEqual([10, 11, 12, 13, 14]);
    const notes = readFileSync(join('docs', 'lxx-align', 'hos-notes.txt'), 'utf8');
    expect(notes).toContain('chapters 10 to 14 are not shipped yet');
    expect(notes).not.toContain('2 to 4 and 7 to 14');
    expect(notes).toContain('Hosea 2, 3, 4, 7, 8 and 9 ship');
  });
});

describe.skipIf(!real.run)('Hosea with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'hos', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-hos-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-hos-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    stale = log.filter((l) => /model pass/.test(l) && /stale|kept/.test(l) && /Hos\./.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Hos ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Hos ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Hos ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Hos ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Hos ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Hos ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('applies every fix row it has: none is stale, and each is a model chunk of its text with its Greek words', () => {
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('hos', n)), 'utf8')).filter((r) => r.run === FIX_RUN);
      for (const r of rows) {
        const verse = withModel.get(n)!.verses.find((x) => `Hos.${n}:${x.n}` === r.ref)!;
        expect(verse.e.some((c) => c.y === 'model' && c.t === r.text && c.g.join(',') === r.g.join(',')), `${r.ref} ${r.text}`).toBe(true);
      }
    }
  });

  it('pairs the English of Hosea 5:10 "removed" with μετατιθέντες, where a tap on "removed" opened the Verse view', () => {
    const verse = withModel.get(5)!.verses.find((v) => v.n === 10)!;
    const chunk = verse.e.find((c) => /removed/.test(c.t));
    expect(chunk).toBeDefined();
    expect(chunk!.y).toBe('model');
    expect(chunk!.g.map((g) => verse.g[g].t)).toEqual(['μετατιθέντες']);
  });

  it('gives the aligner\'s wrong pairs back by fix rows: 5:13 "went" renders ἐπορεύθη and 5:8 "sound aloud" ἠχήσατε', () => {
    const verses = withModel.get(5)!.verses;
    const greek = (n: number, re: RegExp): string[] => {
      const verse = verses.find((v) => v.n === n)!;
      const chunk = verse.e.find((c) => re.test(c.t))!;
      expect(chunk, `5:${n} ${re}`).toBeDefined();
      return chunk.g.map((g) => verse.g[g].t);
    };
    expect(greek(13, /^went$/)).toEqual(['ἐπορεύθη']);
    expect(greek(8, /sound aloud/)).toEqual(['ἠχήσατε']);
  });

  it('gives the aligner\'s small-word pairs back to the Greek word that renders them (story mw-u2w5klk.349.121): 5:10 they and I, 5:11 he, 5:14 to, 6:2 we, 6:5 I', () => {
    // each row: chapter, verse, the English chunk, the Greek words it renders; and the small word that held a neighbour's Greek, now with none
    const greekOf = (n: number, v: number, re: RegExp): { chunk: string; greek: string[] } => {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      const chunk = verse.e.find((c) => re.test(c.t));
      expect(chunk, `${n}:${v} ${re}`).toBeDefined();
      return { chunk: chunk!.t, greek: chunk!.g.map((g) => verse.g[g].t) };
    };
    // 5:10 "as they that removed the bounds: I will pour out upon them my fury": 'they' on αὐτοὺς and 'I' on μου are not theirs
    expect(greekOf(5, 10, /\bupon\b/).greek).toEqual(['ἐπ᾽', 'αὐτοὺς']);
    expect(greekOf(5, 10, /\bpour\b/).greek).toEqual(['ἐκχεῶ']);
    expect(greekOf(5, 10, /\bfury\b/).greek).toEqual(['τὸ', 'ὅρμημά', 'μου.']);
    // 5:11 "Ephraim ... against his adversary, he trod": 'he' is not αὐτοῦ, which is 'his'
    expect(greekOf(5, 11, /adversary/).greek).toEqual(['τὸν', 'ἀντίδικον', 'αὐτοῦ,']);
    expect(greekOf(5, 11, /\btrod\b/).greek).toEqual(['κατεπάτησεν', 'τὸ', 'κρίμα,']);
    // 5:14 "I am as a panther to Ephraim": 'to' is not εἰμι, which is 'am'
    expect(greekOf(5, 14, /\bam\b/).greek).toEqual(['ἐγώ', 'εἰμι']);
    // 6:2 "he will heal us: ... we shall arise": 'we' is not ἡμᾶς, which is 'us'
    expect(greekOf(6, 2, /\bheal\b/).greek).toEqual(['ὑγιάσει', 'ἡμᾶς']);
    // 6:5 "have I mown down ... I have slain them with the word of my mouth: and my judgment": 'I' is not μου
    expect(greekOf(6, 5, /\bmouth\b/).greek).toEqual(['στόματός', 'μου,']);
    expect(greekOf(6, 5, /\bjudgment\b/).greek).toEqual(['κρίμα', 'μου']);
    for (const [n, v, re] of [[5, 10, /^they\b/], [5, 11, /^he$/], [5, 14, /^to$/], [6, 2, /^we\b/], [6, 5, /^I\b/]] as const) {
      const verse = withModel.get(n)!.verses.find((x) => x.n === v)!;
      for (const chunk of verse.e.filter((c) => re.test(c.t))) {
        expect(chunk.g.map((g) => verse.g[g].t), `${n}:${v} ${chunk.t}`).not.toEqual(expect.arrayContaining(['αὐτοὺς', 'αὐτοῦ,', 'εἰμι', 'ἡμᾶς', 'μου']));
      }
    }
  });
});
