// The Septuagint derivation's layer 2, the paradigm parser (scripts/lxx/parser.ts, tbesg.ts, derive.ts; docs/lxx-derivation.md 'Layer 2'; story
// mw-u2w5klk.2), on fixtures, never the network. The counts it is held to are the probe's (docs/sources/lxx-derivation-probe.md).
// tests/fixtures/lxx/tagnt-slice.tsv is B1a's slice (its first 3,683 rows; tests/unit/lxx-layer1.test.ts says how they were cut) and after them the rows
// of the pinned TAGNT the parser learns from for these words: for every ending rule that reaches a TBESG lemma while parsing a word of Gen 1, Ps 22 or
// John 1 (with John hidden or not), the rows of six of the rule's lemmas and a sixth of the rest, or of all of them where the thinning changed a word's
// answer; a row for each part of speech the New Testament gives each lemma reached; every pair of forms an analogy look-up meets; and for John 1's
// forms, rows enough to keep layer 1's answer. Checked against the whole of TAGNT and TBESG when the slice was made: every word of the three chapters
// has the same layer, lemma, parsing and candidates (and in John the parser's first candidate) as with the whole files. So, as in B1a's slice, a
// candidate's support in a fixture run is not the New Testament's count; the answers are.
// tbesg-slice.txt is the rows of the pinned TBESG (cut to its first seven columns, the definitions dropped) of every lemma a rule reaches for those words.
// tagnt-jhn-1.tsv is TAGNT's rows for John 1 in NA28 (829 words), cut as the slice is; swete-jhn-1.csv is the same words in the shape of Swete's two files,
// so lxx:derive reads John 1 as a book, and the rows say what each word is (the known answer).
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import {
  DERIVED_HEADER,
  NOTE_ANALOGY,
  NOTE_NOT_IN_NT,
  NOTE_NO_CANDIDATE,
  PENDING_HEADER,
  isDerived,
  runDerive,
  type BookResult,
  type DeriveInput,
  type DerivedWord,
  type PendingWord,
} from '../../scripts/lxx/derive';
import { PARSER_DOMINANT, parse, ruleOf, settleParsed, unaugment, type Candidate } from '../../scripts/lxx/parser';
import { sweteTokens } from '../../scripts/lxx/swete';
import { readTagnt } from '../../scripts/lxx/tagnt';
import { fits, readTbesg } from '../../scripts/lxx/tbesg';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const tagnt = [fixture('tagnt-slice.tsv')];
const tbesg = fixture('tbesg-slice.txt');
function swete(file: string, input: Partial<DeriveInput> = {}): DeriveInput {
  const [versification, words] = fixture(file).split('\n\n');
  return { versification, words, tagnt, tbesg, ...input };
}
const GEN_1 = swete('swete-gen-1.csv');
const PSA_22 = swete('swete-psa-22.csv');
// John's own rows go in too, to show --hide keeps them out of the parser as well as the form index
const JHN_1 = swete('swete-jhn-1.csv', { tagnt: [...tagnt, fixture('tagnt-jhn-1.tsv')] });

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const run = (input: DeriveInput, argv: string[], outDir = tmp(), log?: (line: string) => void): Promise<BookResult> => runDerive(argv, { input, outDir, log });
const nfc = (s: string): string => s.normalize('NFC');
const outOf = (result: BookResult, ref: string): DerivedWord | PendingWord => [...result.derived, ...result.pending].find((w) => w.ref === ref)!;
function wordOf(result: BookResult, display: string): { ref: string; form: string; out: DerivedWord | PendingWord } {
  const word = result.words.find((w) => nfc(w.display) === nfc(display));
  if (!word) throw new Error(`no word ${display}`);
  return { ...word, out: outOf(result, word.ref) };
}
const layerOf = (w: DerivedWord | PendingWord): number | undefined => (isDerived(w) ? w.layer : undefined);
const has = (cs: readonly Candidate[] | readonly { lemma: string; morph: string }[], lemma: string, morph: string): boolean =>
  cs.some((c) => c.lemma === lemma && c.morph === morph);

describe("layer 2 on Swete's Gen 1 and Ps 22 (npm run lxx:derive -- --book gen)", async () => {
  const gen = await run(GEN_1, ['--book', 'gen']);
  const psa = await run(PSA_22, ['--book', 'psa']);

  it('settles 28 words in layer 2 and leaves 178 pending, each within two of the probe', () => {
    expect(gen.derived.filter((w) => w.layer === 1)).toHaveLength(545);
    expect(Math.abs(gen.derived.filter((w) => w.layer === 2).length - 28)).toBeLessThanOrEqual(2);
    expect(Math.abs(gen.pending.length - 178)).toBeLessThanOrEqual(2);
    expect(psa.derived.filter((w) => w.layer === 2)).toHaveLength(2);
    expect(psa.pending).toHaveLength(24);
  });

  it('gives ἕρπον[τι both the masculine and the neuter participle (the agreement check, B2, will pick)', () => {
    const w = wordOf(gen, 'ἕρπον[τι');
    expect(w.ref).toBe('Gen.1:30#17');
    expect(has(w.out.candidates, 'ἕρπω', 'V-PAP-DSM')).toBe(true);
    expect(has(w.out.candidates, 'ἕρπω', 'V-PAP-DSN')).toBe(true);
    expect(w.out.notes).toContain(NOTE_NOT_IN_NT);
  });

  it('finds no candidate for Γενηθήτωσαν, by rule or by analogy, as the probe found', () => {
    const w = wordOf(gen, 'Γενηθήτωσαν');
    expect(parse(w.form, gen.parser)).toEqual([]);
    expect(w.out.candidates).toEqual([]);
    expect(w.out.notes).toContain(NOTE_NO_CANDIDATE);
  });

  it('leaves μακρότητα (Ps 22:6) with no candidate because TBESG lists μακρότης masculine; a feminine entry would reopen it', () => {
    const w = wordOf(psa, 'μακρότητα');
    expect(w.out.candidates).toEqual([]);
    expect(w.out.notes).toContain(NOTE_NO_CANDIDATE);
    const row = tbesg.split('\n').find((l) => nfc(l.split('\t')[3] ?? '') === nfc('μακρότης'))!;
    expect(row.split('\t')[5]).toBe('G:N-M');
    // the gender check is what refuses it: the same run with TBESG's row read as feminine finds the accusative
    return run({ ...PSA_22, tbesg: tbesg.replace(row, row.replace('G:N-M', 'G:N-F')) }, ['--book', 'psa']).then((fixed) => {
      expect(has(outOf(fixed, w.ref).candidates, 'μακρότης', 'N-ASF')).toBe(true);
    });
  });

  it('reads ἐπεφέρετο as ἐπι-φερ-ετο: a compound’s augment undone, and the rule learned the same way from TAGNT', () => {
    const w = wordOf(gen, 'ἐπεφέρετο');
    expect(w.out.candidates.length).toBeGreaterThan(1);
    expect(w.out.candidates.every((c) => c.lemma === 'ἐπιφέρω')).toBe(true);
    expect(has(w.out.candidates, 'ἐπιφέρω', 'V-IPI-3S')).toBe(true);
    expect((w.out.candidates[0] as Candidate).via[0]).toBe('rule: επιφερ-ετο as επιφερ-ω, augment undone (8 lemmas)');
    expect(ruleOf({ form: 'ἐπεφέρετο', lemma: 'ἐπιφέρω', morph: 'V-IPI-3S' })).toEqual({ key: 'aug|ετο', rk: 'ω|V-IPI-3S' });
  });

  it('answers a word the rules cannot by analogy, from a New Testament form of the same stem', () => {
    const byAnalogy = [...gen.derived, ...gen.pending].filter((w) => w.notes.includes(NOTE_ANALOGY));
    expect(byAnalogy.length).toBeGreaterThan(0);
    for (const w of byAnalogy) {
      const form = gen.words.find((x) => x.ref === w.ref)!.form;
      expect(parse(form, gen.parser)).toEqual([]);
      expect(w.candidates.length).toBeGreaterThan(0);
      expect(w.candidates.every((c) => (c as Candidate).via.every((why) => why.startsWith('analogy: ')))).toBe(true);
    }
  });

  it('proposes only TBESG’s lemmas: a lemma taken out of the lexicon is never a candidate', async () => {
    const lexicon = readTbesg(tbesg);
    const lemmas = new Set([...lexicon.values()].flat().map((e) => e.lemma));
    const parsed = [...gen.derived, ...gen.pending].filter((w) => w.notes.includes(NOTE_NOT_IN_NT) && !w.notes.includes(NOTE_ANALOGY));
    expect(parsed.length).toBeGreaterThan(50);
    for (const w of parsed) for (const c of w.candidates) expect(lemmas.has(c.lemma)).toBe(true);
    const without = await run({ ...GEN_1, tbesg: tbesg.split('\n').filter((l) => nfc(l.split('\t')[3] ?? '') !== 'ἕρπω').join('\n') }, ['--book', 'gen']);
    expect(outOf(without, 'Gen.1:30#17').candidates.some((c) => c.lemma === 'ἕρπω')).toBe(false);
  });

  it('settles a parsed word in layer 2 only on one candidate or one with 90% of the support, at 0.75 x its share', () => {
    const layer2 = gen.derived.filter((w) => w.layer === 2);
    for (const w of layer2) {
      expect(w.candidates.length === 1 || w.candidates[0].share >= PARSER_DOMINANT).toBe(true);
      expect(w.confidence).toBe(Math.round(75 * w.candidates[0].share) / 100);
      expect([w.lemma, w.morph]).toEqual([w.candidates[0].lemma, w.candidates[0].morph]);
    }
    const pendingParsed = gen.pending.filter((w) => w.candidates.length > 1 && w.notes.includes(NOTE_NOT_IN_NT));
    expect(pendingParsed.length).toBeGreaterThan(0);
    for (const w of pendingParsed) expect(w.candidates[0].share).toBeLessThan(PARSER_DOMINANT);
  });
});

describe('the parts of the parser', () => {
  const variants = (form: string): string[] => unaugment(form).map((v) => `${v.type} ${v.g}`);
  it('undoes a syllabic, a temporal and an ερρ- augment', () => {
    expect(variants('εποιησεν')).toContain('aug ποιησεν');
    expect(variants('ηυξησεν')).toEqual(expect.arrayContaining(['aug ευξησεν', 'aug αυξησεν']));
    expect(variants('ηγαπησεν')).toContain('aug αγαπησεν');
    expect(variants('ωμολογησεν')).toContain('aug ομολογησεν');
    expect(variants('ερριψεν')).toContain('aug ριψεν');
  });
  it('undoes a reduplication, the consonant or its aspirate', () => {
    expect(variants('πεπληρωκα')).toContain('redup πληρωκα');
    expect(variants('τεθεικα')).toContain('redup θεικα');
  });
  it('undoes the augment after a compound’s prefix, elided, aspirated or assimilated, and reads each way once', () => {
    expect(variants('επεφερετο')).toContain('aug επιφερετο');
    expect(variants('απεθανεν')).toContain('aug αποθανεν');
    expect(variants('ενεβλεψεν')).toContain('aug εμβλεψεν');
    expect(variants('συνεκαλεσεν')).toContain('aug συγκαλεσεν');
    expect(variants('εξεβαλεν')).toContain('aug εκβαλεν');
    expect(variants('αφηκεν')).toContain('aug αφεκεν');
    const all = variants('επεφερετο');
    expect(new Set(all).size).toBe(all.length);
  });
  it('keeps a parsing that fits the lemma’s part of speech and a noun’s gender in TBESG, unless the New Testament shows it so', () => {
    const fem = [{ lemma: 'ἀρχή', pos: 'G:N-F' }];
    expect(fits('N-ASF', fem, undefined)).toBe(true);
    expect(fits('N-ASM', fem, undefined)).toBe(false);
    expect(fits('V-PAI-3S', fem, undefined)).toBe(false);
    expect(fits('N-ASM', fem, new Set(['N:M']))).toBe(true);
    expect(fits('ADV', [{ lemma: 'καλός', pos: 'G:A' }], undefined)).toBe(true);
    expect(fits('N-NSM', [{ lemma: 'x', pos: 'G:N-M/F' }], undefined)).toBe(true);
    expect(fits('N-NSN', [{ lemma: 'x', pos: 'G:N-M/F' }], undefined)).toBe(false);
  });
  it('takes one candidate, or one with 90% of the support, at 0.75 x its share', () => {
    const cs = (...supports: number[]): Candidate[] => {
      const total = supports.reduce((s, n) => s + n, 0);
      return supports.map((support, i) => ({ lemma: `l${i}`, morph: 'X', support, share: support / total, via: [] }));
    };
    expect(settleParsed(cs(1))?.confidence).toBe(0.75);
    expect(settleParsed(cs(9, 1))?.confidence).toBe(0.68);
    expect(settleParsed(cs(89, 11))).toBeUndefined();
    expect(settleParsed(cs())).toBeUndefined();
  });
});

describe('the known answer: John 1 with John hidden (npm run lxx:derive -- --book jhn --hide jhn on the fixture)', async () => {
  const jhn = await run(JHN_1, ['--book', 'jhn', '--hide', 'jhn']);
  const gold = readTagnt([fixture('tagnt-jhn-1.tsv')]);
  const answer = new Map(jhn.words.map((w, i) => [w.ref, gold[i]]));

  it('reads the 829 words of John 1, each against TAGNT’s own row', () => {
    expect(jhn.words).toHaveLength(829);
    expect(gold).toHaveLength(829);
    jhn.words.forEach((w, i) => expect(nfc(w.display)).toBe(nfc(gold[i].form)));
    // a lemma only John has (Nathanael) is in the input but never reaches the parser
    expect(gold.some((r) => r.lemma === nfc('Ναθαναήλ'))).toBe(true);
    expect(jhn.parser.ntPos.has(nfc('Ναθαναήλ'))).toBe(false);
  });

  it('the parser’s first candidate alone is right on the lemma for about 80.8% and on lemma and parsing for about 69.2% of the words it analyses', () => {
    let analysed = 0;
    let lemma = 0;
    let full = 0;
    for (const w of jhn.words) {
      const out = outOf(jhn, w.ref);
      // a word the New Testament has elsewhere is parsed as a second method; a word it lacks has the parser's candidates already
      const top = out.notes.includes(NOTE_NOT_IN_NT) ? out.candidates[0] : parse(w.form, jhn.parser)[0];
      if (!top) continue;
      analysed++;
      const g = answer.get(w.ref)!;
      if (top.lemma === g.lemma) {
        lemma++;
        if (top.morph === g.morph) full++;
      }
    }
    expect(Math.abs(analysed - 681)).toBeLessThanOrEqual(10);
    expect(Math.abs((100 * lemma) / analysed - 80.8)).toBeLessThanOrEqual(3);
    expect(Math.abs((100 * full) / analysed - 69.2)).toBeLessThanOrEqual(3);
  });

  it('settles 25 words in layer 2, every one right', () => {
    const layer2 = jhn.derived.filter((w) => w.layer === 2);
    expect(layer2).toHaveLength(25);
    for (const w of layer2) expect([w.lemma, w.morph]).toEqual([answer.get(w.ref)!.lemma, answer.get(w.ref)!.morph]);
    expect(jhn.derived.filter((w) => w.layer === 1)).toHaveLength(673);
  });
});

const GREEK = /[Ͱ-Ͽἀ-῿]/;

describe('--word and the files', async () => {
  it('--word Gen.1:20#13 prints each candidate’s lemma, parsing, support and the rule that produced it, and writes nothing', async () => {
    const lines: string[] = [];
    const outDir = tmp();
    const result = await run(GEN_1, ['--word', 'Gen.1:20#13'], outDir, (line) => lines.push(line));
    const out = outOf(result, 'Gen.1:20#13');
    expect(layerOf(out)).toBeUndefined();
    expect(out.candidates.length).toBeGreaterThan(1);
    const text = lines.join('\n');
    expect(lines[0]).toMatch(/^Gen\.1:20#13 /);
    for (const c of out.candidates as Candidate[]) {
      expect(text).toContain(`${c.lemma} ${c.morph}: support ${c.support}`);
      for (const why of c.via) expect(text).toContain(why);
      expect(c.via[0]).toMatch(/^rule: /);
    }
    expect(() => readFileSync(join(outDir, 'derived', 'gen.tsv'))).toThrow();
  });

  for (const [name, input, book] of [['Gen 1', GEN_1, 'gen'], ['Ps 22', PSA_22, 'psa']] as const) {
    it(`never carry the pinned text’s form for a ref in ${name}, and hold Greek only in the lemma and candidates`, async () => {
      const outDir = tmp();
      const result = await run(input, ['--book', book], outDir);
      expect(result.derived.some((w) => w.layer === 2)).toBe(true);
      const tokens = new Map(sweteTokens(input.versification, input.words).words.map((w) => [w.ref, w]));
      for (const [kind, header] of [['derived', DERIVED_HEADER], ['pending', PENDING_HEADER]] as const) {
        const rows = readFileSync(join(outDir, kind, `${book}.tsv`), 'utf8').trimEnd().split('\n').slice(1).map((l) => l.split('\t'));
        const ownData = new Set(['lemma', 'candidates'].map((c) => header.indexOf(c)));
        for (const row of rows) {
          const token = tokens.get(row[0])!;
          row.forEach((cell, i) => {
            if (ownData.has(i)) return;
            expect(cell).not.toMatch(GREEK);
            expect(cell.includes(token.display) || cell.includes(token.form)).toBe(false);
          });
        }
      }
    });
  }

  it('come out the same bytes whatever the order of the TAGNT rows', async () => {
    const a = tmp();
    const b = tmp();
    await run(GEN_1, ['--book', 'gen'], a);
    const lines = tagnt[0].trimEnd().split('\n');
    await run({ ...GEN_1, tagnt: [[...lines].reverse().join('\n')] }, ['--book', 'gen'], b);
    for (const kind of ['derived', 'pending']) {
      expect(readFileSync(join(b, kind, 'gen.tsv'), 'utf8')).toBe(readFileSync(join(a, kind, 'gen.tsv'), 'utf8'));
    }
  });
});
