// tests/unit/lxx-align-choose-lev.test.ts — the model pass over Leviticus (story mw-u2w5klk.349.9, a batch of the pairing epic mw-u2w5klk.349; the Governor's report of 2026-11-10: 'I tap removed and get this').
// A Builder's session cut every remainder of Leviticus 1 to 8 (data/lxx/align/lev-01.tsv to lev-08.tsv) and paired each piece to the Swete Greek words no chunk had. The generic checks of every book
// (a file for each chapter its sidecar names, no stale run, the leftovers each with why, the book's file under docs/lxx-align) are in tests/unit/lxx-align-choose.test.ts; here what the pass promised for Leviticus:
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
const MODELLED = alignFileChapters('lev');
const joined = (verse: Verse): string => verse.e.map((c) => c.t).join(' ');
// a Greek word without its accents and punctuation
const plain = (t: string): string => t.normalize('NFD').replace(/[^\p{L}]/gu, '');
// The verses the shared LXX2012 map moved (mw-u2w5klk.349.130: its 6:4 holds the Greek 4-5 and its 5-7 are the Greek 6-8; its 8:18 holds the Greek 18-19 and its 19-28 are the Greek 20-29): Lev 6:4-9 and 8:18-30 (mw-u2w5klk.349.134).
const MOVED = /^(6:[4-9]|8:(1[89]|2\d|30))(?!\d)/;
// Of those, only these still have English that renders a Greek word of another verse: 6:4 and 8:18 hold the English of two Greek verses, and Brenton cuts 8:20 and 8:22 a clause later than Swete.
const OTHER_VERSE = new Set(['6:4', '8:18', '8:20', '8:22']);

describe('the model pass files of Leviticus', () => {
  it('has one file a chapter, the chapters in order from 1, each with a row for a run and every row a model chunk', () => {
    expect(MODELLED.length).toBeGreaterThan(0);
    expect(MODELLED).toEqual(MODELLED.map((_, i) => i + 1));
    for (const n of MODELLED) {
      const rows = readModelRows(readFileSync(join(ALIGN_CHOICES_DIR, alignChoicesName('lev', n)), 'utf8'));
      expect(rows.length, `Lev ${n}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(['0.80', '0.50', '0.40'], `${row.ref}#${row.run}`).toContain(row.confidence.toFixed(2));
        expect(row.g.every((g) => Number.isInteger(g) && g >= 0), `${row.ref}#${row.run}`).toBe(true);
      }
    }
  });

  it('names a reason for each English content word it leaves with no Greek word (the sidecar of the book)', () => {
    const expectLev = readExpect('lev')!;
    expect(Object.keys(expectLev.chapters).map(Number)).toEqual(MODELLED);
    for (const [n, chapter] of Object.entries(expectLev.chapters)) {
      expect(chapter.gaps, `Lev ${n}`).toBe(0);
      expect(chapter.leftovers, `Lev ${n}`).toBeDefined();
      for (const [key, why] of chapter.leftovers!) {
        expect(why.trim(), `Lev ${n}: ${key}`).not.toBe('');
        expect(expectLev.reasons[why] ?? why, `Lev ${n}: ${key}`).not.toBe('');
      }
    }
  });

  it('calls a leftover of Lev 6:4-9 or 8:18-30 another verse\'s only in 6:4, 8:18, 8:20 and 8:22', () => {
    const wrong = Object.values(readExpect('lev')!.chapters)
      .flatMap((c) => c.leftovers ?? [])
      .filter(([key, why]) => MOVED.test(key) && /^other-verse/.test(why) && !OTHER_VERSE.has(key.split(':').slice(0, 2).join(':')))
      .map(([key]) => key);
    expect(wrong).toEqual([]);
  });
});

describe.skipIf(!real.run)('Leviticus with the model pass', () => {
  const dirs: string[] = [];
  let withModel: Map<number, Chapter>;
  let base: Map<number, Chapter>;
  let stale: string[] = [];
  let notes: string[] = [];
  const read = (dir: string): Map<number, Chapter> => {
    const out = new Map<number, Chapter>();
    for (const n of MODELLED) out.set(n, JSON.parse(readFileSync(join(dir, 'lev', `${n}.json`), 'utf8')) as Chapter);
    return out;
  };
  beforeAll(async () => {
    const a = mkdtempSync(join(tmpdir(), 'lampas-lxx-lev-a-'));
    const b = mkdtempSync(join(tmpdir(), 'lampas-lxx-lev-b-'));
    dirs.push(a, b);
    const log: string[] = [];
    await runShip(['--out', a], { ...sources, alignDir: '', log: () => undefined });
    await runShip(['--out', b], { ...sources, log: (l) => log.push(l) });
    base = read(a);
    withModel = read(b);
    notes = log.filter((l) => /model pass/.test(l) && /Lev\./.test(l));
    stale = notes.filter((l) => /stale|kept/.test(l));
  }, 10 * HOOK_TIMEOUT_MS);
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

  it('had remainders to re-choose in each of its chapters, and has none after the pass, no run stale', () => {
    for (const [n, chapter] of base) {
      expect(chapter.verses.some((v) => v.e.some((c) => c.y === 'align?')), `Lev ${n} before`).toBe(true);
      expect(withModel.get(n)!.verses.flatMap((v) => v.e.filter((c) => c.y === 'align?')), `Lev ${n} after`).toEqual([]);
    }
    expect(stale).toEqual([]);
  });

  it('gives each model chunk its confidence and Greek positions inside the verse, free and used once', () => {
    for (const [n, chapter] of withModel) {
      for (const verse of chapter.verses) {
        const used = verse.e.flatMap((c, i) => c.g.filter((g) => verse.g[g].e === i));
        expect(new Set(used).size, `Lev ${n}:${verse.n}`).toBe(used.length);
        for (const chunk of verse.e) {
          chunk.g.forEach((g) => expect(g >= 0 && g < verse.g.length, `Lev ${n}:${verse.n} g ${g}`).toBe(true));
          if (chunk.y === 'model') {
            expect(chunk.c).toBeGreaterThan(0);
            expect(chunk.c).toBeLessThanOrEqual(1);
          }
        }
        verse.g.forEach((w, k) => w.e !== undefined && expect(verse.e[w.e].g, `Lev ${n}:${verse.n}`).toContain(k));
      }
    }
  });

  it('drops no word and no English word: the chunks joined are Brenton\'s whole verse as the aligner had it, and the Greek words are the same', () => {
    for (const [n, chapter] of withModel) {
      const was = base.get(n)!;
      expect(chapter.verses).toHaveLength(was.verses.length);
      chapter.verses.forEach((verse, i) => {
        expect(joined(verse), `Lev ${n}:${verse.n}`).toBe(joined(was.verses[i]));
        expect(verse.g.map((w) => w.t)).toEqual(was.verses[i].g.map((w) => w.t));
      });
    }
  });

  it('has no note for a run or a row of Lev 6:4-9 or 8:18-30: none stale, none without a choice, none unused', () => {
    expect(notes.filter((l) => /Lev\.(6:[4-9]|8:(1[89]|2\d|30))(?!\d)/.test(l))).toEqual([]);
  });

  it.each([
    [6, 6, 'προβάτων', 'flock'],
    [6, 6, 'ἄμωμον', 'blemish'],
    [6, 7, 'ἐξιλάσεται', 'atonement'],
    [6, 7, 'ἀφεθήσεται', 'forgiven'],
    [8, 20, 'ἐκρεανόμησεν', 'divided'],
    [8, 21, 'ἀνήνεγκεν', 'offered up'],
    [8, 21, 'εὐωδίας', 'sweet smelling'],
    [8, 25, 'βραχίονα', 'shoulder'],
    [8, 26, 'λάγανον', 'cake'],
    [8, 28, 'ἀνήνεγκεν', 'offered'],
    [8, 30, 'στολάς', 'garments'],
  ])('pairs the English of Leviticus %i:%i with its own Greek verse: %s is under "%s"', (chapter, n, greek, english) => {
    const verse = withModel.get(chapter)!.verses.find((v) => v.n === n)!;
    const word = verse.g.find((w) => plain(w.t) === plain(greek));
    expect(word, `${greek} in Lev ${chapter}:${n}`).toBeDefined();
    expect(word!.e, `${greek} has an English chunk`).toBeDefined();
    expect(verse.e[word!.e!].t).toContain(english);
  });

  // mw-u2w5klk.349.141: in the moved verses the aligner paired the pronouns by their place, so 'his' and 'them' were swapped (a tap on 'his' in 8:27 opened αὐτὰ).
  it.each([
    [6, 6, 'his', ['αὐτοῦ']],
    [6, 6, 'which', ['ὃ', 'αὐτῷ']],
    [6, 7, 'him', ['αὐτοῦ']],
    [6, 7, 'he did', ['ἐποίησεν']],
    [6, 9, 'this', ['αὐτὴ']],
    [6, 9, 'it,', ['αὐτοῦ']],
    [8, 18, 'his', ['αὐτοῦ']],
    [8, 18, 'their', ['αὐτῶν']],
    [8, 22, 'his', ['αὐτοῦ']],
    [8, 22, 'their', ['αὐτῶν']],
    [8, 23, 'his blood,', ['αἵματος', 'αὐτοῦ']],
    [8, 27, 'his', ['αὐτοῦ']],
    [8, 27, 'them', ['αὐτὰ']],
    [8, 28, 'their', ['αὐτῶν']],
    [8, 28, 'them', ['αὐτὰ']],
    [8, 28, 'it is', ['ἐστιν']],
  ] as const)('gives the pronoun of Leviticus %i:%i its own Greek word: "%s" holds %j', (chapter, n, english, greek) => {
    const verse = withModel.get(chapter)!.verses.find((v) => v.n === n)!;
    const chunks = verse.e.filter((c) => c.t === english);
    expect(chunks, `one chunk "${english}" in Lev ${chapter}:${n}`).toHaveLength(1);
    expect(chunks[0].g.map((g) => plain(verse.g[g].t))).toEqual(greek.map(plain));
  });

  it('gives no pronoun of Lev 6:4-9 or 8:18-30 an αὐτός of the wrong case or number', () => {
    // what each English pronoun's αὐτός may be, by the case and number of its parsing code (P-GSM)
    const fits: Record<string, RegExp> = { his: /^P-GS[MN]/, its: /^P-GS/, their: /^P-GP/, him: /^P-[GDA]S[MN]/, them: /^P-[GDA]P/ };
    const wrong: string[] = [];
    for (const [chapter, { verses }] of withModel) {
      for (const verse of verses.filter((v) => MOVED.test(`${chapter}:${v.n}`))) {
        for (const chunk of verse.e) {
          const rule = fits[chunk.t.toLowerCase().replace(/[^a-z]/g, '')];
          const held = chunk.g.map((g) => verse.g[g]).filter((w) => w.l === 'αὐτός');
          if (rule && held.length > 0 && !held.some((w) => rule.test(w.p))) wrong.push(`${chapter}:${verse.n} '${chunk.t}' ${held.map((w) => `${w.t} ${w.p}`).join(' ')}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('pairs the English of Leviticus 1:16 "take away" with ἀφελεῖ, where a tap on "away" opened the Verse view', () => {
    const verse = withModel.get(1)!.verses.find((v) => v.n === 16)!;
    const chunk = verse.e.find((c) => /take away/.test(c.t));
    expect(chunk).toBeDefined();
    expect(chunk!.y).toBe('model');
    expect(chunk!.g.map((g) => verse.g[g].t)).toEqual(['ἀφελεῖ']);
  });
});
