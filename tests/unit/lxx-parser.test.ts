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
// The agreement check (mw-u2w5klk.3, tests/unit/lxx-agreement.test.ts) runs after layers 1 and 2, so what they settle is read before it (`beforeCheck`).
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import { PRINTED_SMALL } from '../support/lxx-printed-small';
import {
  DERIVED_HEADER,
  NOTE_ANALOGY,
  NOTE_FORM_NAME,
  NOTE_INDECLINABLE,
  NOTE_NOT_IN_NT,
  NOTE_NO_CANDIDATE,
  PENDING_HEADER,
  deriveBook,
  isDerived,
  runDerive,
  supportOf,
  train,
  tsvOf,
  type BookResult,
  type DeriveInput,
  type DerivedWord,
  type Layer,
  type PendingWord,
} from '../../scripts/lxx/derive';
import { NO_NAMES, PARSER_DOMINANT, formNameLemma, parse, ruleOf, settleParsed, unaugment, type Candidate } from '../../scripts/lxx/parser';
import { sweteTokens } from '../../scripts/lxx/swete';
import { readTagnt } from '../../scripts/lxx/tagnt';
import { fits, readTbesg, readTbesgNames } from '../../scripts/lxx/tbesg';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const tagnt = [fixture('tagnt-slice.tsv')];
const tbesg = fixture('tbesg-slice.txt');
function swete(file: string, input: Partial<DeriveInput> = {}): DeriveInput {
  const [versification, words] = fixture(file).split('\n\n');
  return { versification, words, tagnt, tbesg, printedSmall: PRINTED_SMALL, ...input };
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
const layerOf = (w: DerivedWord | PendingWord): Layer | undefined => (isDerived(w) ? w.layer : undefined);
const has = (cs: readonly Candidate[] | readonly { lemma: string; morph: string }[], lemma: string, morph: string): boolean =>
  cs.some((c) => c.lemma === lemma && c.morph === morph);

describe("layer 2 on Swete's Gen 1 and Ps 22 (npm run lxx:derive -- --book gen)", async () => {
  const gen = await run(GEN_1, ['--book', 'gen']);
  const psa = await run(PSA_22, ['--book', 'psa']);

  it('settles 28 words in layer 2 and leaves 178 pending, each within two of the probe', () => {
    expect(gen.beforeCheck.derived.filter((w) => w.layer === 1)).toHaveLength(545);
    expect(Math.abs(gen.beforeCheck.derived.filter((w) => w.layer === 2).length - 28)).toBeLessThanOrEqual(2);
    expect(Math.abs(gen.beforeCheck.pending.length - 178)).toBeLessThanOrEqual(2);
    expect(psa.beforeCheck.derived.filter((w) => w.layer === 2)).toHaveLength(2);
    expect(psa.beforeCheck.pending).toHaveLength(24);
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
    const layer2 = gen.beforeCheck.derived.filter((w) => w.layer === 2);
    for (const w of layer2) {
      expect(w.candidates.length === 1 || w.candidates[0].share >= PARSER_DOMINANT).toBe(true);
      expect(w.confidence).toBe(Math.round(75 * w.candidates[0].share) / 100);
      expect([w.lemma, w.morph]).toEqual([w.candidates[0].lemma, w.candidates[0].morph]);
    }
    const pendingParsed = gen.beforeCheck.pending.filter((w) => w.candidates.length > 1 && w.notes.includes(NOTE_NOT_IN_NT));
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
    const layer2 = jhn.beforeCheck.derived.filter((w) => w.layer === 2);
    expect(layer2).toHaveLength(25);
    for (const w of layer2) expect([w.lemma, w.morph]).toEqual([answer.get(w.ref)!.lemma, answer.get(w.ref)!.morph]);
    expect(jhn.beforeCheck.derived.filter((w) => w.layer === 1)).toHaveLength(673);
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

// ---------------------------------------------------------------- B6 (mw-u2w5klk.13): an indeclinable name gets every case of its gender
// The names of Gen 2-5 that M1 (mw-u2w5klk.8) had to guess for want of a case: Ἀδάμ (no accusative), Ἐνώχ (no dative), Καινάν (listed under καινός and
// Κάϊν only), Ἰωβέλ (one candidate, a feminine accusative). The input is small and made for the test: TAGNT's rows are the ones the real file gives these
// names (Luke 3, Heb 11, Matt 1) in the shape of the real file, TBESG's rows are the real ones with their text; a declined name (Ἰησοῦς) and a common noun stand beside them.
describe('an indeclinable name offers every case of its gender (B6)', async () => {
  const tagntRow = (ref: string, form: string, strong: string, morph: string, lemma: string): string => `${ref}=NKO\t${form} (x)\tgloss\t${strong}=${morph}\t${lemma}=gloss\tNA28+`;
  const rows = [
    tagntRow('Luk.3.38#10', 'Ἀδάμ', 'G0076', 'N-GSM-P', 'Ἀδάμ'),
    tagntRow('Rom.5.14#3', 'Ἀδάμ', 'G0076', 'N-GSM-P', 'Ἀδάμ'),
    tagntRow('1Co.15.22#6', 'Ἀδὰμ', 'G0076', 'N-DSM-P', 'Ἀδάμ'),
    tagntRow('1Co.15.45#9', 'Ἀδάμ', 'G0076', 'N-NSM-P', 'Ἀδάμ'),
    tagntRow('Luk.3.37#5', 'Ἑνώχ', 'G1802', 'N-GSM-P', 'Ἐνώχ'),
    tagntRow('Heb.11.5#2', 'Ἑνώχ', 'G1802', 'N-NSM-P', 'Ἐνώχ'),
    tagntRow('Mat.1.1#4', 'Ἰησοῦ', 'G2424', 'N-GSM-P', 'Ἰησοῦς'),
    tagntRow('Mat.1.16#9', 'Ἰησοῦς', 'G2424', 'N-NSM-P', 'Ἰησοῦς'),
    tagntRow('Mat.1.25#7', 'Ἰησοῦν', 'G2424', 'N-ASM-P', 'Ἰησοῦς'),
    tagntRow('Joh.1.1#4', 'λόγος', 'G3056', 'N-NSM', 'λόγος'),
    tagntRow('Joh.1.14#2', 'λόγον', 'G3056', 'N-ASM', 'λόγος'),
    // the one pair of forms the rule -ελ for -ηλ is learned from
    tagntRow('Mat.1.12#9', 'Σαλαθιέλ', 'G4528', 'N-ASM-P', 'Σαλαθιήλ'),
    // Ἰούδας declines (Ἰούδαν), though TBESG's entry says indecl. of the tribe's spelling; a place in the neuter seen once; a woman of Magdala, not tagged a name
    tagntRow('Mat.1.2#9', 'Ἰούδαν', 'G2455', 'N-ASM-P', 'Ἰούδας'),
    tagntRow('Mat.1.3#1', 'Ἰούδας', 'G2455', 'N-NSM-P', 'Ἰούδας'),
    tagntRow('Mat.1.3#9', 'Ἰούδα', 'G2455', 'N-GSM-P', 'Ἰούδας'),
    tagntRow('Act.28.15#9', 'Φόρου', 'G5410', 'N-GSN-L', 'Φόρον'),
    tagntRow('Luk.8.2#9', 'Μαγδαληνή', 'G3094', 'N-NSF', 'Μαγδαληνή'),
    tagntRow('Luk.8.3#9', 'Μαγδαληνή', 'G3094', 'N-ASF', 'Μαγδαληνή'),
  ];
  const tbesgRows = [
    'G0076\tG0076 = the Greek of\tH0121G\tἈδάμ\tAdam\tN:N-M-P\tAdam\t <b>Ἀδάμ</b>, ὁ indecl. (Heb. אָדָם), <BR /> <b>Adam</b>',
    'G1802\tG1802 =\tG1802\tἘνώχ\tEnōch\tN:N-M-P\tEnoch\t <b>Ἐνώχ</b>, ὁ, indecl. (Heb. חֲנוֹךְ), <BR /> <b>Enoch</b>',
    'G2424\tG2424 =\tG2424\tἸησοῦς\tIēsous\tN:N-M-P\tJesus\t <b>Ἰησοῦς</b>, -οῦ, ὁ, <BR /> <b>Jesus</b>',
    'G2536\tG2536G =\tG2536G\tΚαϊνάν, Καϊνάμ\tKainan, Kainam\tN:N-M-P\tCainan\t <b>Καινάμ</b> (T, Καϊ-; Rec. Καϊνάν), ό, indecl. (Heb. קֵינָן), <BR /> <b>Cainam, Cainan</b>',
    'G4528\tG4528 =\tG4528\tΣαλαθιήλ\tSalathiēl\tN:N-M-P\tSalathiel\t <b>Σαλαθιήλ</b>, ὁ, indecl.',
    'G7745\tG7745 =\tG7745\tἸωβήλ\tIōbēl\t\ta ram\t Ἰωβήλ, see: Ἰωβήδ.<BR /> <b>Ἰωβήδ</b> (WH, -βήλ, Lk, l.with; Rec., RV, Ὠβήδ), ὁ, indecl., <BR /> <b>Jobed</b>',
    'G2455\tG2455 =\tG2455\tἸούδας\tIoudas\tN:N-M-P\tJudah\t <b>Ἰούδας</b>, -α, ὁ, <BR /> <b>Judah</b>, <b>Ἰούδα</b>, ὁ, indecl. (Heb. יְהוּדָה), <BR /> the tribe',
    'G3056\tG3056 =\tG3056\tλόγος\tlogos\tG:N-M\tword\t <b>λόγος</b>, ὁ, <BR /> <b>word</b>',
  ];
  const words = ['Ἀδὰμ', 'Ἑνὼχ', 'Καινὰν', 'Ἰωβέλ·', 'Ἰησοῦν', 'λόγον', 'Λόγος', 'ἀδὰμ'];
  const [ADAM, ENOCH, KAINAN, IOBEL, IESOUN, LOGON, LOGOS_CAPITAL, ADAM_LOWER] = words.map((_, i) => `Gen.2:19#${i + 1}`);
  const input: DeriveInput = {
    versification: '1\tGen.2:19',
    words: words.map((w, i) => `${i + 1}\t${w}`).join('\n'),
    tagnt: [rows.join('\n')],
    tbesg: tbesgRows.join('\n'),
  };
  const trained = train(input);
  const got = deriveBook(input, 'gen', undefined, trained);
  const without = deriveBook(input, 'gen', undefined, { ...trained, parser: { ...trained.parser, names: NO_NAMES } });
  const cases = (w: DerivedWord | PendingWord, lemma: string): string[] => w.candidates.filter((c) => c.lemma === lemma).map((c) => c.morph);
  const ALL_MASCULINE = ['N-NSM', 'N-GSM', 'N-DSM', 'N-ASM', 'N-VSM'];

  it('gives Ἀδάμ its accusative and vocative, which the New Testament never prints (Gen 2:19, 2:21, 3:9)', () => {
    const out = outOf(got, ADAM);
    expect(isDerived(out)).toBe(false);
    expect(cases(out, 'Ἀδάμ').sort()).toEqual([...ALL_MASCULINE].sort());
    // what TAGNT has stays first, with its counts; the new ones come after, counted apart
    expect(out.candidates.slice(0, 3).map((c) => supportOf(c))).toEqual(['2', '1', '1']);
    expect(out.candidates.slice(0, 3).every((c) => c.support > 0)).toBe(true);
    const added = out.candidates.slice(3);
    expect(added.map((c) => c.morph).sort()).toEqual(['N-ASM', 'N-VSM']);
    expect(added.every((c) => supportOf(c) === 'name')).toBe(true);
  });

  it('gives Ἐνώχ its dative, accusative and vocative (Gen 4:18)', () => {
    expect(cases(outOf(got, ENOCH), 'Ἐνώχ').sort()).toEqual([...ALL_MASCULINE].sort());
  });

  it('gives the name Καϊνάν to Καινάν, which TBESG lists under a pair of lemmas and the parser read as καινός or Κάϊν (Gen 5:12)', () => {
    const out = outOf(got, KAINAN);
    expect(isDerived(out)).toBe(false);
    expect(cases(out, 'Καϊνάν').sort()).toEqual([...ALL_MASCULINE].sort());
    expect(out.candidates.every((c) => c.lemma === 'Καϊνάν' || c.lemma !== 'Καϊνάμ')).toBe(true);
  });

  it('gives Ἰωβήλ the masculine, which TBESG’s text says (ὁ, indecl.), beside the parser’s accusative (Gen 4:20)', () => {
    const out = outOf(got, IOBEL);
    expect(isDerived(out)).toBe(false);
    expect(cases(out, 'Ἰωβήλ').sort()).toEqual([...ALL_MASCULINE].sort());
    expect(out.candidates.some((c) => c.morph.endsWith('F'))).toBe(false);
  });

  it('changes no other word: a declined name, a common noun, a capital that is no name and a name in lower case keep their candidates', () => {
    const changed = got.words.map((w) => w.ref).filter((ref) => JSON.stringify(outOf(got, ref)) !== JSON.stringify(outOf(without, ref)));
    expect(changed.sort()).toEqual([ADAM, ENOCH, KAINAN, IOBEL].sort());
    for (const ref of [IESOUN, LOGON, LOGOS_CAPITAL, ADAM_LOWER]) expect(outOf(got, ref)).toEqual(outOf(without, ref));
    expect(outOf(got, IESOUN).candidates.some((c) => supportOf(c) === 'name')).toBe(false);
  });

  it('notes why a name waits, and leaves the word for the model: pending, not settled by the parser’s one candidate', () => {
    for (const ref of [ADAM, ENOCH, KAINAN, IOBEL]) {
      const out = outOf(got, ref);
      expect(isDerived(out)).toBe(false);
      expect(out.notes).toContain(NOTE_INDECLINABLE);
      expect(out.notes).not.toContain(NOTE_NO_CANDIDATE);
    }
    // before the rule the parser had settled Ἰωβέλ on its single candidate, in layer 2
    expect(layerOf(outOf(without, IOBEL))).toBe(2);
  });

  it('writes the new candidates’ support as the word name, in the pending file', () => {
    const text = tsvOf(got).pending;
    expect(text).toContain('Ἀδάμ/N-ASM/name');
    expect(text).toContain('Ἰωβήλ/N-VSM/name');
  });

  it('finds an indeclinable name by the New Testament’s one spelling in several cases, or by TBESG saying indecl.', () => {
    const { names } = trained.parser;
    const entryOf = (lemma: string): { genders: readonly string[] } | undefined => names.lemma.get(nfc(lemma));
    expect(entryOf('Ἀδάμ')?.genders).toEqual(['M']);
    expect(entryOf('Ἐνώχ')?.genders).toEqual(['M']);
    expect(entryOf('Σαλαθιήλ')?.genders).toEqual(['M']);
    expect(entryOf('Καϊνάν')?.genders).toEqual(['M']);
    expect(entryOf('Καϊνάμ')?.genders).toEqual(['M']);
    expect(entryOf('Ἰωβήλ')?.genders).toEqual(['M']);
    // Ἰησοῦς declines (Ἰησοῦν), whatever one of its spellings does in two cases
    expect(entryOf('Ἰησοῦς')).toBeUndefined();
    expect(entryOf('λόγος')).toBeUndefined();
    // the New Testament's own declension beats a line of TBESG's text; one case seen once is no evidence; a lemma tagged no name is no name
    expect(entryOf('Ἰούδας')).toBeUndefined();
    expect(entryOf('Φόρον')).toBeUndefined();
    expect(entryOf('Μαγδαληνή')).toBeUndefined();
  });
});

// A capitalised form that no lexicon has (story mw-u2w5klk.19, B8): 10,849 words of the 39 books are names in neither TAGNT nor TBESG (Γαιδάδ Gen 4:18, Σελλά
// Gen 4:19, Θόβελ Gen 4:22, Εὑειλάτ Gen 2:11), each a forced guess. The form is read as its own lemma where its ending looks indeclinable. The input is made for
// the test, in the shape of the real files, with the words in the order and the marks Swete prints around them.
describe('a capitalised no-candidate form is its own lemma where its ending looks indeclinable (B8)', async () => {
  const tagntRow = (ref: string, form: string, strong: string, morph: string, lemma: string): string => `${ref}=NKO\t${form} (x)\tgloss\t${strong}=${morph}\t${lemma}=gloss\tNA28+`;
  const kai = 'καὶ';
  const words = [
    kai, 'Γαιδάδ,', kai, 'Σελλά.', kai, 'Θόβελ·', 'Θόβελ', kai, 'Εὑειλάτ,', kai, 'γαιδὰδ', kai, 'Ἰωναθὰν', kai, 'Βαναίας', kai, 'Γοδολίαν', kai, 'Μειχαία', kai, 'Μωσῇ', kai, 'Ὤ',
    // Gen 4:19: a name that opens its verse
    'Θόβελ',
  ];
  const at = (display: string, nth = 1): string => {
    const i = words.map((w, j) => [w, j] as const).filter(([w]) => nfc(w) === nfc(display))[nth - 1][1];
    return i < words.length - 1 ? `Gen.4:18#${i + 1}` : 'Gen.4:19#1';
  };
  const input: DeriveInput = {
    versification: `1\tGen.4:18\n${words.length}\tGen.4:19`,
    words: words.map((w, i) => `${i + 1}\t${w}`).join('\n'),
    tagnt: [tagntRow('Mat.1.2#2', 'καὶ', 'G2532', 'CONJ', 'καί')],
    tbesg: 'G2532\tG2532 =\tG2532\tκαί\tkai\tG:CONJ\tand\t <b>καί</b>',
  };
  const got = deriveBook(input, 'gen');
  const lemmaCases = (w: DerivedWord | PendingWord): string[] => [...new Set(w.candidates.map((c) => `${c.lemma}`))];
  const ALL = ['N', 'G', 'D', 'A', 'V'].flatMap((c) => ['M', 'F', 'N'].map((g) => `N-${c}S${g}`));

  it('gives Γαιδάδ, Σελλά, Θόβελ, Εὑειλάτ and Ἰωναθάν a candidate in every case of every gender, the form being the lemma', () => {
    for (const [display, lemma] of [['Γαιδάδ,', 'Γαιδάδ'], ['Σελλά.', 'Σελλά'], ['Θόβελ·', 'Θόβελ'], ['Εὑειλάτ,', 'Εὑειλάτ'], ['Ἰωναθὰν', 'Ἰωναθάν']] as const) {
      const out = outOf(got, at(display));
      expect(isDerived(out), lemma).toBe(false);
      expect(lemmaCases(out), lemma).toEqual([nfc(lemma)]);
      expect(out.candidates.map((c) => c.morph).sort(), lemma).toEqual([...ALL].sort());
      expect(out.candidates.every((c) => supportOf(c) === 'form'), lemma).toBe(true);
      expect(out.notes, lemma).toContain(NOTE_FORM_NAME);
      expect(out.notes, lemma).not.toContain(NOTE_NO_CANDIDATE);
    }
  });

  it('writes a Σελλὰ with its grave as the acute lemma, and the support as the word form, in the pending file', () => {
    expect(lemmaCases(outOf(got, at('Σελλά.')))).toEqual(['Σελλά']);
    const text = tsvOf(got).pending;
    expect(text).toContain('Γαιδάδ/N-NSM/form');
    expect(text).toContain('Εὑειλάτ/N-VSN/form');
  });

  it('holds out a word in lower case, and a name that opens a clause or a verse', () => {
    expect(outOf(got, at('γαιδὰδ')).candidates).toEqual([]);
    // Θόβελ after the high point of 'Θόβελ·', and Θόβελ first in Gen 4:19
    expect(at('Θόβελ', 1)).toBe('Gen.4:18#7');
    expect(at('Θόβελ', 2)).toBe('Gen.4:19#1');
    for (const nth of [1, 2]) {
      expect(outOf(got, at('Θόβελ', nth)).candidates).toEqual([]);
      expect(outOf(got, at('Θόβελ', nth)).notes).toContain(NOTE_NO_CANDIDATE);
    }
  });

  it('holds out the endings Greek declines: -ς, -ν after a vowel with no acute on it, a vowel with no acute, a circumflex, a word of two letters', () => {
    for (const display of ['Βαναίας', 'Γοδολίαν', 'Μειχαία', 'Μωσῇ', 'Ὤ']) expect(outOf(got, at(display)).candidates, display).toEqual([]);
  });

  it('takes the ending rule on the form alone', () => {
    const lemmas: Array<[string, string | undefined]> = [
      ['Γαιδάδ', 'Γαιδάδ'], // a consonant other than ς and ν
      ['Ἰεροβοὰμ', 'Ἰεροβοάμ'], // the grave is the acute
      ['Δὰν', 'Δάν'], // -ν after an acute or grave on α or ω: Hebrew names (Ἰωναθάν, Χεβρών)
      ['Χεβρὼν', 'Χεβρών'],
      ['Σελλά', 'Σελλά'], // an acute or grave on a final vowel
      ['Νεφθαλεί', 'Νεφθαλεί'],
      ['Ἰερειχὼ', 'Ἰερειχώ'],
      ['Μανασσή', 'Μανασσή'],
      ['Βαναιού', 'Βαναιού'],
      ['Βαναίας', undefined], // -ς
      ['Μωσῆς', undefined],
      ['Ἀμορραίων', undefined], // -ν after a circumflex, or with the accent earlier
      ['Χαναναῖον', undefined],
      ['Γοδολίαν', undefined],
      ['Μειχαία', undefined], // no accent on the vowel
      ['Μωσῇ', undefined],
      ['Ὤ', undefined],
      ['Ἀπελθέ', undefined], // -έ: a vocative or a verb with its enclitic
      ['γαιδάδ', undefined], // lower case
    ];
    for (const [form, lemma] of lemmas) expect(formNameLemma(nfc(form)), form).toBe(lemma === undefined ? undefined : nfc(lemma));
  });
});

describe('a lemma cell with a stray mark, and a lemma that differs by a diaeresis (B8)', () => {
  it('drops the mark that ends a TBESG lemma, as the name reader does (Ἆπις;, Μακαλωθ·)', () => {
    const rows = [
      'G0001\tG0001 =\tG0001\tἌπις;\tApis\tG:N-F\tApis\t <b>Ἄπις</b>',
      'G0002\tG0002 =\tG0002\tΜακαλωθ·\tMakaloth\tN:N-F-P\tMakaloth\t <b>Μακαλωθ</b>, indecl.',
    ].join('\n');
    const lexicon = readTbesg(rows);
    expect([...lexicon.values()].flat().map((e) => e.lemma).sort()).toEqual(['Μακαλωθ', 'Ἄπις'].sort());
    expect(readTbesgNames(rows).map((n) => n.lemma)).toEqual(['Μακαλωθ']);
  });
});

// Esther and Lamentations under the 3% bar on words with no candidate (story mw-u2w5klk.20, B9). The Governor's answer (2026-11-02, "A: Count only words with no
// candidate"): a name read from its own form is not a guess; the bar counts the words no source gave a candidate. Two causes were left, each a general rule.
// The rows are the real sources': Esther 1:1 prints `⸂[1] ΕΤΟΥΣ δευτέρου` (the additions carry the editor's verse numbers, `[1]`, 257 tokens in Swete's file, 106 of
// Esther's 181 words with no candidate) and Lamentations 1:2 opens `Βήθ. Κλαίουσα ἔκλαυσεν` (the acrostic's letter names, 62 words, each a whole sentence).
describe("the editor's verse numbers are not words, and a letter name that is a sentence of its own is read as a name (B9)", async () => {
  const tagntRow = (ref: string, form: string, strong: string, morph: string, lemma: string): string => `${ref}=NKO\t${form} (x)\tgloss\t${strong}=${morph}\t${lemma}=gloss\tNA28+`;
  const input = (verses: Record<string, string[]>): DeriveInput => {
    const refs = Object.keys(verses);
    let line = 0;
    const starts: string[] = [];
    const lines: string[] = [];
    for (const ref of refs) {
      starts.push(`${line + 1}\t${ref}`);
      for (const w of verses[ref]) lines.push(`${++line}\t${w}`);
    }
    return {
      versification: starts.join('\n'),
      words: lines.join('\n'),
      tagnt: [tagntRow('Mat.1.2#2', 'καὶ', 'G2532', 'CONJ', 'καί')],
      tbesg: 'G2532\tG2532 =\tG2532\tκαί\tkai\tG:CONJ\tand\t <b>καί</b>',
    };
  };

  it('counts a bracketed number as an editor sign: it is left out of the words and not numbered (Esther 1:1)', () => {
    const est = input({ 'Est.1:1': ['⸂[1]', 'ΕΤΟΥΣ', 'δευτέρου', 'τῆς', 'βασιλείας'], 'Est.1:2': ['καὶ', '[2]', 'ἄνθρωπος'] });
    const { words, signs } = sweteTokens(est.versification, est.words, 'est');
    expect(words.map((w) => `${w.ref} ${w.form}`)).toEqual(['Est.1:1#1 ΕΤΟΥΣ', 'Est.1:1#2 δευτέρου', 'Est.1:1#3 τῆς', 'Est.1:1#4 βασιλείας', 'Est.1:2#1 καὶ', 'Est.1:2#2 ἄνθρωπος']);
    expect(signs.map((s) => `${s.verse} ${s.sign}`)).toEqual(['Est.1:1 ⸂[1]', 'Est.1:2 [2]']);
    // a word with a digit that is a Greek numeral (ε᾽, Esther 9:19) is a word, and so is one with brackets round letters
    const odd = input({ 'Est.9:19': ['ε᾽', 'καὶ', 'πληθυ]νέσθωσαν'] });
    expect(sweteTokens(odd.versification, odd.words, 'est').words.map((w) => w.form)).toEqual(['ε᾽', 'καὶ', 'πληθυνέσθωσαν']);
  });

  it('leaves no verse number among the words with no candidate, and the other words keep their order', () => {
    const est = input({ 'Est.1:1': ['⸂[1]', 'Ἰαείρου', '[2]', 'Ἀστὶν'], 'Est.1:2': ['[1]', 'καὶ'] });
    const got = deriveBook(est, 'est');
    expect(got.words.map((w) => w.form)).toEqual(['Ἰαείρου', 'Ἀστὶν', 'καὶ']);
    expect(got.signs).toHaveLength(3);
    expect([...got.derived, ...got.pending].map((w) => w.ref).sort()).toEqual(['Est.1:1#1', 'Est.1:1#2', 'Est.1:2#1']);
  });

  const lam = deriveBook(
    input({
      'Lam.1:1': ['καὶ', 'Βήθ.', 'Κλαίουσα'],
      'Lam.1:2': ['Βήθ.', 'Κλαίουσα', 'ἔκλαυσεν'],
      'Lam.1:3': ['Γίμελ.', 'Μετῳκίσθη'],
      'Lam.1:4': ['Τιαδή.', 'Δίκαιός', 'ἐστιν'],
      'Lam.1:5': ['Ἄιν.', 'Ὁ', 'ὀφθαλμὸς'],
      'Lam.1:6': ['Ῥήχς.', 'Ἴδε'],
      'Lam.1:7': ['Σελλά', 'καὶ', 'Βήθ'],
      'Lam.1:8': ['Ὁ', 'Γίμελ', 'καὶ', 'Θόβελ,', 'Ἡ'],
      'Lam.1:9': ['καὶ', 'βήθ.'],
    }),
    'lam',
  );
  const out = (ref: string): DerivedWord | PendingWord => outOf(lam, ref);
  const ALL = ['N', 'G', 'D', 'A', 'V'].flatMap((c) => ['M', 'F', 'N'].map((g) => `N-${c}S${g}`));

  it('takes the form as the lemma of a capitalised word that opens a clause and ends it, where its ending looks indeclinable: Βήθ. Γίμελ. Τιαδή.', () => {
    for (const [ref, lemma] of [['Lam.1:1#2', 'Βήθ'], ['Lam.1:2#1', 'Βήθ'], ['Lam.1:3#1', 'Γίμελ'], ['Lam.1:4#1', 'Τιαδή']] as const) {
      const w = out(ref);
      expect(isDerived(w), ref).toBe(false);
      expect([...new Set(w.candidates.map((c) => c.lemma))], ref).toEqual([nfc(lemma)]);
      expect(w.candidates.map((c) => c.morph).sort(), ref).toEqual([...ALL].sort());
      expect(w.candidates.every((c) => supportOf(c) === 'form'), ref).toBe(true);
      expect(w.notes, ref).toContain(NOTE_FORM_NAME);
      expect(w.notes, ref).not.toContain(NOTE_NO_CANDIDATE);
    }
  });

  it('holds out what the ending rule holds out (Ἄιν. ends in -ν after ι; Ῥήχς. in -ς), a lower-case word, and a word that opens a clause and does not end it', () => {
    for (const ref of ['Lam.1:5#1', 'Lam.1:6#1', 'Lam.1:9#2']) {
      expect(out(ref).candidates, ref).toEqual([]);
      expect(out(ref).notes, ref).toContain(NOTE_NO_CANDIDATE);
    }
    // Σελλά opens its verse and has no full stop of its own (B8 leaves it); 'Ὁ Γίμελ' is a name inside a clause (B8 takes it); Ἡ ends the verse with no mark and is too short
    expect(out('Lam.1:7#1').candidates).toEqual([]);
    expect(out('Lam.1:8#2').candidates).not.toEqual([]);
    expect(out('Lam.1:8#1').candidates).toEqual([]);
    expect(out('Lam.1:8#5').candidates).toEqual([]);
  });
});

// ---------------------------------------------------------------- B10 (mw-u2w5klk.22): a name Swete writes with a capital is not read as a common word
// The lxx-morph probe (mw-u2w5klk.21) found layers 1 and 2 reading names as the common words their letters spell: Σειών (Zion) as a participle of σείω (129 words),
// Εἰού (Jehu) as εἴλω (51), Ἁμάν (Haman) as ἀμάω (48), Γάζης (of Gaza) as γάζα, a treasure. The input is made for the test, TAGNT's and TBESG's rows being the real ones
// the parser learns these from (περιβαλοῦ for -ου/-λω, ἀγαπᾶν for -ν/-ω, λέγων for -ων/-ω, γάζης).
describe('a capital in the middle of a clause takes no lower-case lemma unless Swete also prints the form in lower case (B10)', async () => {
  const tagntRow = (ref: string, form: string, strong: string, morph: string, lemma: string): string => `${ref}=NKO\t${form} (x)\tgloss\t${strong}=${morph}\t${lemma}=gloss\tNA28+`;
  const tbesgRow = (strong: string, lemma: string, pos: string): string => `${strong}\t${strong} =\t${strong}\t${lemma}\tx\tG:${pos}\tgloss\t <b>${lemma}</b>`;
  const rows = [
    tagntRow('Act.12.8#19', 'περιβαλοῦ', 'G4016', 'V-2AMM-2S', 'περιβάλλω'),
    tagntRow('Rom.13.8#8', 'ἀγαπᾶν', 'G0025', 'V-PAN', 'ἀγαπάω'),
    tagntRow('Mat.2.2#3', 'λέγων', 'G3004', 'V-PAP-NSM', 'λέγω'),
    tagntRow('Act.8.27#5', 'γάζης', 'G1047', 'N-GSF', 'γάζα'),
    tagntRow('Mat.1.1#2', 'κύριος', 'G2962', 'N-NSM', 'κύριος'),
    tagntRow('Mat.1.3#1', 'Ἰησοῦς', 'G2424', 'N-NSM-P', 'Ἰησοῦς'),
    tagntRow('Mat.1.4#1', 'Ἰησοῦν', 'G2424', 'N-ASM-P', 'Ἰησοῦς'),
    tagntRow('Mat.1.5#1', 'καὶ', 'G2532', 'CONJ', 'καί'),
  ];
  const tbesg = [
    tbesgRow('G4016', 'περιβάλλω', 'V'),
    tbesgRow('G0025', 'ἀγαπάω', 'V'),
    tbesgRow('G3004', 'λέγω', 'V'),
    tbesgRow('G20289', 'εἴλω', 'V'),
    tbesgRow('G20290', 'ἀμάω', 'V'),
    tbesgRow('G4579', 'σείω', 'V'),
    tbesgRow('G1047', 'γάζα', 'N:N-F'),
    tbesgRow('G2962', 'κύριος', 'N:N-M'),
    tbesgRow('G2424', 'Ἰησοῦς', 'N:N-M-P'),
    tbesgRow('G2532', 'καί', 'CONJ'),
  ].join('\n');
  const KAI = 'καὶ';
  /** Gen 4:18 holds the words in the middle of a clause; Gen 4:19 opens with Σειών (a capital that is only the capital) and Gen 4:20 with a full stop before one */
  const make = (extra: string[] = []): DeriveInput => {
    const verses: Record<string, string[]> = {
      'Gen.4:18': [KAI, 'Σειών', KAI, 'Εἰού', KAI, 'Ἁμάν', KAI, 'Γάζης', KAI, 'Κύριος', KAI, 'Ἰησοῦν', KAI, 'Ἰησοῦς', ...extra],
      'Gen.4:19': ['Σειών', KAI, 'τοῦτο.', 'Εἰού'],
    };
    let line = 0;
    const starts: string[] = [];
    const lines: string[] = [];
    for (const [ref, ws] of Object.entries(verses)) {
      starts.push(`${line + 1}\t${ref}`);
      for (const w of ws) lines.push(`${++line}\t${w}`);
    }
    return { versification: starts.join('\n'), words: lines.join('\n'), tagnt: [rows.join('\n')], tbesg };
  };
  const at = (n: number): string => `Gen.4:18#${n}`;
  const [ZION, JEHU, HAMAN, GAZA, LORD, IESOUN, IESOUS] = [2, 4, 6, 8, 10, 12, 14].map(at);
  const input = make();
  const got = deriveBook(input, 'gen');
  const lemmasOf = (w: DerivedWord | PendingWord): string[] => [...new Set(w.candidates.map((c) => c.lemma))];
  const isCapitalLemma = (lemma: string): boolean => lemma !== lemma.toLowerCase();

  it('shows the fault on the code before it: the parser reads Σειών as σείω, Εἰού as εἴλω and Ἁμάν as ἀμάω, and layer 1 reads Γάζης as γάζα', () => {
    const trained = train(input);
    expect(lemmasOf({ ref: 'x', notes: [], candidates: parse('Σειών', trained.parser).map((c) => ({ ...c })) })).toContain('σείω');
    expect(lemmasOf({ ref: 'x', notes: [], candidates: parse('Εἰού', trained.parser).map((c) => ({ ...c })) })).toContain('εἴλω');
    expect(lemmasOf({ ref: 'x', notes: [], candidates: parse('Ἁμάν', trained.parser).map((c) => ({ ...c })) })).toContain('ἀμάω');
  });

  it('gives Σειών, Εἰού and Ἁμάν in the middle of a clause no lower-case lemma from layer 1 or 2, and not Γάζης either', () => {
    for (const ref of [ZION, JEHU, HAMAN, GAZA]) {
      const w = outOf(got, ref);
      expect(isDerived(w) ? [w.lemma] : [], ref).toEqual([]);
      expect(lemmasOf(w).every(isCapitalLemma), `${ref} ${lemmasOf(w)}`).toBe(true);
      const before = [...got.beforeCheck.derived, ...got.beforeCheck.pending].find((x) => x.ref === ref)!;
      expect(lemmasOf(before).every(isCapitalLemma), `${ref} before the check`).toBe(true);
    }
  });

  it('leaves them pending with their form as the lemma where its ending is a Hebrew name’s, and with no candidate where it is not (Γάζης ends in -ς)', () => {
    for (const [ref, lemma] of [[ZION, 'Σειών'], [JEHU, 'Εἰού'], [HAMAN, 'Ἁμάν']] as const) {
      const w = outOf(got, ref);
      expect(isDerived(w), ref).toBe(false);
      expect(lemmasOf(w), ref).toEqual([nfc(lemma)]);
      expect(w.notes, ref).toContain(NOTE_FORM_NAME);
    }
    const gaza = outOf(got, GAZA);
    expect(isDerived(gaza)).toBe(false);
    expect(gaza.candidates).toEqual([]);
    expect(gaza.notes).toContain(NOTE_NO_CANDIDATE);
  });

  it('still reads a capital that is only the capital: Σειών opening a verse, Εἰού after a full stop, as the parser reads them', () => {
    const verseStart = outOf(got, 'Gen.4:19#1');
    expect(isDerived(verseStart) ? verseStart.lemma : undefined).toBe('σείω');
    const afterStop = outOf(got, 'Gen.4:19#4');
    expect(isDerived(afterStop) ? afterStop.lemma : undefined).toBe('εἴλω');
  });

  it('still reads a lower-case lemma where Swete prints the form in lower case too (a capital that is a speech’s first word, or a divine title), and a name with a capital lemma', () => {
    const lord = outOf(got, LORD);
    expect(isDerived(lord)).toBe(false);
    // Κύριος has no lower-case witness in this text, so it waits too; with one it is layer 1's κύριος
    const withWitness = deriveBook(make(['καὶ', 'κύριος', 'καὶ', 'ἁμάν']), 'gen');
    const lordAgain = outOf(withWitness, LORD);
    expect(isDerived(lordAgain) ? lordAgain.lemma : undefined).toBe('κύριος');
    expect(isDerived(lordAgain) ? lordAgain.layer : undefined).toBe(1);
    const haman = outOf(withWitness, HAMAN);
    expect(isDerived(haman) ? haman.lemma : undefined).toBe('ἀμάω');
    // a name the New Testament gives a capital lemma is untouched
    for (const ref of [IESOUN, IESOUS]) {
      const w = outOf(got, ref);
      expect(isDerived(w) ? w.lemma : undefined, ref).toBe('Ἰησοῦς');
    }
  });
});
