// The Septuagint derivation's agreement check and shared-ending rule (scripts/lxx/agreement.ts, run by derive.ts after layers 1 and 2; docs/lxx-derivation.md
// 'The agreement check'; story mw-u2w5klk.3), on the fixtures of tests/unit/lxx-parser.test.ts (its header says how they were cut), never the network.
// The words the probe found wrong by reading Swete (docs/sources/lxx-derivation-probe.md, 'My own reading of the result') are asserted by reference.
// A verse built for a test is given to `agree` as words already settled or pending, the way layers 1 and 2 (or later the model) leave them.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';
import {
  AGREEMENT_CONFIDENCE,
  LINKS,
  NOTE_NAME,
  SHARED_ENDINGS,
  TAGNT_EVIDENCE,
  agree,
  pauseAfter,
  sharedEnding,
  type AgreementWord,
} from '../../scripts/lxx/agreement';
import { isDerived, parseArgs, runDerive, type BookResult, type DeriveInput, type DerivedWord, type PendingWord } from '../../scripts/lxx/derive';

const FIXTURES = 'tests/fixtures/lxx';
const fixture = (file: string): string => readFileSync(join(FIXTURES, file), 'utf8');
const tagnt = [fixture('tagnt-slice.tsv')];
const tbesg = fixture('tbesg-slice.txt');
function swete(file: string, input: Partial<DeriveInput> = {}): DeriveInput {
  const [versification, words] = fixture(file).split('\n\n');
  return { versification, words, tagnt, tbesg, ...input };
}
/** A verse of our own in the shape of Swete's two files: 'Tst.1:1', its words one a line. */
const built = (...words: string[]): DeriveInput => ({ versification: '1\tTst.1:1', words: words.map((w, i) => `${i + 1}\t${w}`).join('\n'), tagnt, tbesg });

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-lxx-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })), HOOK_TIMEOUT_MS);

const run = (input: DeriveInput, argv: string[], log?: (line: string) => void): Promise<BookResult> => runDerive(argv, { input, outDir: tmp(), log });
const outOf = (words: ReadonlyArray<DerivedWord | PendingWord>, ref: string): DerivedWord | PendingWord => {
  const out = words.find((w) => w.ref === ref);
  if (!out) throw new Error(`no word ${ref}`);
  return out;
};
const after = (result: BookResult, ref: string): DerivedWord | PendingWord => outOf([...result.derived, ...result.pending], ref);
const before = (result: BookResult, ref: string): DerivedWord | PendingWord => outOf([...result.beforeCheck.derived, ...result.beforeCheck.pending], ref);
const has = (cs: ReadonlyArray<{ lemma: string; morph: string }>, lemma: string, morph: string): boolean => cs.some((c) => c.lemma === lemma && c.morph === morph);
const settledAs = (w: DerivedWord | PendingWord): string | undefined => (isDerived(w) ? `${w.lemma} ${w.morph} ${w.layer}` : undefined);
const sharedNote = (name: string): string => `shared ending: ${name}: for the agreement check or the model`;
const nameOf = (morph: string, lemma: string, form: string, analyses: ReadonlyArray<{ lemma: string; morph: string }> = []): string | undefined =>
  sharedEnding(form, { lemma, morph }, analyses)?.ending.name;

describe('the shared-ending classes (SHARED_ENDINGS, the table in docs/lxx-derivation.md)', () => {
  const shares = (morph: string, lemma: string, form: string, analyses: ReadonlyArray<{ lemma: string; morph: string }> = []): string[] | undefined =>
    sharedEnding(form, { lemma, morph }, analyses)?.shares;

  it('neuter nominative and accusative: ξύλον, σπέρμα, the article τό, a participle in -ον, whichever case the New Testament showed', () => {
    expect(nameOf('N-ASN', 'ξύλον', 'ξύλον')).toBe('neuter nominative and accusative');
    expect(shares('N-ASN', 'ξύλον', 'ξύλον')).toEqual(['N-NSN', 'N-ASN']);
    expect(shares('N-NPN', 'σπέρμα', 'σπέρματα')).toEqual(['N-NPN', 'N-APN']);
    expect(shares('T-NSN', 'ὁ', 'τό')).toEqual(['T-NSN', 'T-ASN']);
    expect(shares('V-PAP-NSN', 'ποιέω', 'ποιοῦν')).toEqual(['V-PAP-NSN', 'V-PAP-ASN']);
  });

  it('masculine accusative and neuter in -on: a second-declension adjective and a middle participle, not a comparative or an active participle', () => {
    expect(nameOf('A-ASN', 'χλωρός', 'χλωρόν')).toBe('masculine accusative and neuter in -on');
    expect(shares('A-ASN', 'χλωρός', 'χλωρόν')).toEqual(['A-ASM', 'A-NSN', 'A-ASN']);
    expect(shares('V-PPP-ASM', 'λύω', 'λυόμενον')).toEqual(['V-PPP-ASM', 'V-PPP-NSN', 'V-PPP-ASN']);
    // μείζων's masculine accusative is μείζονα, and an active participle's is -οντα: only the neuter's two cases are shared
    expect(shares('A-ASN-C', 'μέγας', 'μεῖζον')).toEqual(['A-NSN-C', 'A-ASN-C']);
    expect(shares('V-PAP-NSN', 'ποιέω', 'ποιοῦν')).toEqual(['V-PAP-NSN', 'V-PAP-ASN']);
  });

  it('masculine and neuter genitive and dative singular: αὐτοῦ, αὐτῷ, ἕρποντι; never a noun, whose gender is its own', () => {
    expect(nameOf('P-GSM', 'αὐτός', 'αὐτοῦ')).toBe('masculine and neuter genitive and dative singular');
    expect(shares('P-GSM', 'αὐτός', 'αὐτοῦ')).toEqual(['P-GSM', 'P-GSN']);
    expect(shares('P-DSM', 'αὐτός', 'αὐτῷ')).toEqual(['P-DSM', 'P-DSN']);
    expect(shares('V-PAP-DSM', 'ἕρπω', 'ἕρποντι')).toEqual(['V-PAP-DSM', 'V-PAP-DSN']);
    expect(shares('N-GSM', 'θεός', 'θεοῦ')).toBeUndefined();
    expect(shares('T-GSF', 'ὁ', 'τῆς')).toBeUndefined();
  });

  it('every gender in the genitive plural: τῶν, αὐτῶν, an adjective in -ος; a participle shares only masculine and neuter', () => {
    expect(nameOf('P-GPM', 'αὐτός', 'αὐτῶν')).toBe('every gender in the genitive plural');
    expect(shares('P-GPM', 'αὐτός', 'αὐτῶν')).toEqual(['P-GPM', 'P-GPF', 'P-GPN']);
    expect(nameOf('V-PAP-GPM', 'ποιέω', 'ποιούντων')).toBe('masculine and neuter genitive plural');
    expect(shares('V-PAP-GPM', 'ποιέω', 'ποιούντων')).toEqual(['V-PAP-GPM', 'V-PAP-GPN']);
  });

  it('masculine and neuter dative plural: τοῖς, πᾶσι', () => {
    expect(nameOf('T-DPM', 'ὁ', 'τοῖς')).toBe('masculine and neuter dative plural');
    expect(shares('A-DPM', 'πᾶς', 'πᾶσι')).toEqual(['A-DPM', 'A-DPN']);
  });

  it("the New Testament's analyses differ only in case or gender: ἀόρατος as masculine and feminine; a vocative is not counted", () => {
    const aoratos = [
      { lemma: 'ἀόρατος', morph: 'A-NSM' },
      { lemma: 'ἀόρατος', morph: 'A-NSF' },
    ];
    expect(nameOf('A-NSM', 'ἀόρατος', 'ἀόρατος', aoratos)).toBe(TAGNT_EVIDENCE.name);
    expect(shares('A-NSM', 'ἀόρατος', 'ἀόρατος', aoratos)).toEqual(['A-NSM', 'A-NSF']);
    // ὁ θεός as an address is TAGNT's vocative: the nominative's use, not another ending
    const theos = [
      { lemma: 'θεός', morph: 'N-NSM' },
      { lemma: 'θεός', morph: 'N-VSM' },
    ];
    expect(nameOf('N-NSM', 'θεός', 'θεός', theos)).toBeUndefined();
    expect(nameOf('PREP', 'ἐν', 'ἐν', [{ lemma: 'εἷς', morph: 'A-NSN' }])).toBeUndefined();
  });

  it('each class has a comment a reader can check, and docs/lxx-derivation.md names each class and each link with this file', () => {
    const doc = readFileSync('docs/lxx-derivation.md', 'utf8');
    for (const ending of [...SHARED_ENDINGS, TAGNT_EVIDENCE]) {
      expect(ending.comment.length).toBeGreaterThan(40);
      expect(doc).toContain(ending.name);
    }
    for (const link of Object.values(LINKS)) expect(doc).toContain(link.name);
    expect(doc).toContain('tests/unit/lxx-agreement.test.ts');
  });
});

describe("the check on Swete's Gen 1 and Ps 22 and on John 1: the words the probe found wrong in layers 1 and 2", async () => {
  const gen = await run(swete('swete-gen-1.csv'), ['--book', 'gen']);
  const psa = await run(swete('swete-psa-22.csv'), ['--book', 'psa']);
  const jhn = await run(swete('swete-jhn-1.csv', { tagnt: [...tagnt, fixture('tagnt-jhn-1.tsv')] }), ['--book', 'jhn', '--hide', 'jhn']);

  it('demotes ποιοῦν (Gen 1:11, 1:12), the nominative layer 1 gave, so the accusative is a candidate again', () => {
    for (const ref of ['Gen.1:11#20', 'Gen.1:12#17']) {
      expect(settledAs(before(gen, ref))).toBe('ποιέω V-PAP-NSN 1');
      const w = after(gen, ref);
      expect(isDerived(w)).toBe(false);
      expect(w.notes).toContain(sharedNote('neuter nominative and accusative'));
      expect(has(w.candidates, 'ποιέω', 'V-PAP-ASN')).toBe(true);
    }
  });

  it('demotes αὐτοῦ and αὐτῷ of ξύλον (Gen 1:11-12), the masculine layer 1 gave, so the neuter is a candidate', () => {
    for (const [ref, gave, neuter] of [
      ['Gen.1:11#25', 'P-GSM', 'P-GSN'],
      ['Gen.1:11#27', 'P-DSM', 'P-DSN'],
      ['Gen.1:12#22', 'P-GSM', 'P-GSN'],
      ['Gen.1:12#24', 'P-DSM', 'P-DSN'],
    ]) {
      expect(settledAs(before(gen, ref))).toBe(`αὐτός ${gave} 1`);
      const w = after(gen, ref);
      expect(isDerived(w)).toBe(false);
      expect(w.notes).toContain(sharedNote('masculine and neuter genitive and dative singular'));
      expect(has(w.candidates, 'αὐτός', neuter)).toBe(true);
    }
  });

  it('settles χλωρὸν (Gen 1:30) as the masculine accusative, by agreement with χόρτον before it', () => {
    expect(settledAs(before(gen, 'Gen.1:30#30'))).toBe('χλωρός A-ASN 1');
    const w = after(gen, 'Gen.1:30#30') as DerivedWord;
    expect(settledAs(w)).toBe('χλωρός A-ASM 2a');
    expect(w.confidence).toBe(AGREEMENT_CONFIDENCE);
    expect(w.notes).toContain(`agreement: ${LINKS.beside.name} with Gen.1:30#29`);
    expect(w.candidates[0]).toMatchObject({ lemma: 'χλωρός', morph: 'A-ASM' });
  });

  it('demotes ἕρπον[τι (Gen 1:30), the masculine the parser gave, so the neuter of ἑρπετῷ is a candidate', () => {
    expect(settledAs(before(gen, 'Gen.1:30#17'))).toBe('ἕρπω V-PAP-DSM 2');
    const w = after(gen, 'Gen.1:30#17');
    expect(isDerived(w)).toBe(false);
    expect(w.notes).toContain(sharedNote('masculine and neuter genitive and dative singular'));
    expect(has(w.candidates, 'ἕρπω', 'V-PAP-DSN')).toBe(true);
  });

  it('sends χλόης (Ps 22:2) to the model: the New Testament has it only as the name Chloe, and Swete writes it in lower case', () => {
    expect(settledAs(before(psa, 'Psa.22:2#3'))).toBe('Χλόη N-GSF 1');
    const w = after(psa, 'Psa.22:2#3');
    expect(isDerived(w)).toBe(false);
    expect(w.notes).toContain(NOTE_NAME);
  });

  it('keeps a name the text writes with a capital: Χλόης in a verse of our own stays in layer 1', async () => {
    const result = await run(built('Χλόης'), ['--book', 'tst']);
    expect(settledAs(after(result, 'Tst.1:1#1'))).toBe('Χλόη N-GSF 1');
  });

  it("demotes John 1:33's μένον, the nominative layer 1 gave where TAGNT reads the accusative", () => {
    expect(settledAs(before(jhn, 'Jhn.1:33#23'))).toBe('μένω V-PAP-NSN 1');
    const w = after(jhn, 'Jhn.1:33#23');
    expect(isDerived(w)).toBe(false);
    expect(has(w.candidates, 'μένω', 'V-PAP-ASN')).toBe(true);
  });

  it('settles ἁγίῳ (John 1:33) as neuter by agreement with πνεύματι, and τοῦ before φωτὸς (Gen 1:4) as the neuter article', () => {
    expect(settledAs(after(jhn, 'Jhn.1:33#32'))).toBe('ἅγιος A-DSN 2a');
    expect(after(jhn, 'Jhn.1:33#32').notes).toContain(`agreement: ${LINKS.beside.name} with Jhn.1:33#31`);
    expect(isDerived(before(gen, 'Gen.1:4#15'))).toBe(false);
    expect(settledAs(after(gen, 'Gen.1:4#15'))).toBe('ὁ T-GSN 2a');
    expect(after(gen, 'Gen.1:4#15').notes).toContain(`agreement: ${LINKS.article.name} with Gen.1:4#16`);
  });
});

/** A word as layers 1 and 2 (or the model) left it: settled with one analysis, or pending with candidates. */
const settledWord = (ref: string, lemma: string, morph: string): AgreementWord => ({
  ref,
  verse: 'Tst.1:1',
  out: { ref, lemma, morph, layer: 1, confidence: 0.97, candidates: [{ lemma, morph, support: 3, share: 1 }], notes: [] },
});
const pendingWord = (ref: string, lemma: string, ...morphs: string[]): AgreementWord => ({
  ref,
  verse: 'Tst.1:1',
  out: { ref, candidates: morphs.map((morph) => ({ lemma, morph, support: 1, share: 1 / morphs.length })), notes: [] },
});

describe('the agreement links, on verses built for the test', () => {
  it('settles τὸ before φῶς by agreement only when φῶς is itself settled', () => {
    const open = agree([pendingWord('Tst.1:1#1', 'ὁ', 'T-NSN', 'T-ASN'), pendingWord('Tst.1:1#2', 'φῶς', 'N-NSN', 'N-ASN')]);
    expect(open.outs.every((w) => !isDerived(w))).toBe(true);
    expect(open.settled).toBe(0);
    for (const morph of ['N-ASN', 'N-NSN']) {
      const shut = agree([pendingWord('Tst.1:1#1', 'ὁ', 'T-NSN', 'T-ASN'), settledWord('Tst.1:1#2', 'φῶς', morph)]);
      const article = shut.outs[0] as DerivedWord;
      expect(settledAs(article)).toBe(`ὁ T-${morph.slice(2)} 2a`);
      expect(article.notes).toEqual([`agreement: ${LINKS.article.name} with Tst.1:1#2`]);
      expect(shut.settled).toBe(1);
    }
  });

  it('leaves τὸ φῶς pending through the whole run: φῶς is neuter, so neither word is settled', async () => {
    const result = await run(built('εἶδεν', 'τὸ', 'φῶς'), ['--book', 'tst']);
    expect(isDerived(after(result, 'Tst.1:1#2'))).toBe(false);
    expect(isDerived(after(result, 'Tst.1:1#3'))).toBe(false);
  });

  it('never guesses: where two candidates agree (τὸ before an infinitive, nominative or accusative) the word stays pending', () => {
    const out = agree([pendingWord('Tst.1:1#1', 'ὁ', 'T-NSN', 'T-ASN'), settledWord('Tst.1:1#2', 'κατοικέω', 'V-PAN')]);
    expect(isDerived(out.outs[0])).toBe(false);
    expect(out.settled).toBe(0);
    // but the infinitive does say the article is neuter singular
    const gsn = agree([pendingWord('Tst.1:1#1', 'ὁ', 'T-GSM', 'T-GSN'), settledWord('Tst.1:1#2', 'κατοικέω', 'V-PAN')]);
    expect(settledAs(gsn.outs[0])).toBe('ὁ T-GSN 2a');
  });

  it('gives a neuter noun in -ον or -α the case of its article', () => {
    const sperma = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-ASN'), pendingWord('Tst.1:1#2', 'σπέρμα', 'N-NSN', 'N-ASN')]);
    expect(settledAs(sperma.outs[1])).toBe('σπέρμα N-ASN 2a');
    const xyla = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-NPN'), pendingWord('Tst.1:1#2', 'ξύλον', 'N-NPN', 'N-APN')]);
    expect(settledAs(xyla.outs[1])).toBe('ξύλον N-NPN 2a');
  });

  it('reads past δέ to the word the article goes with', () => {
    const out = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-NSF'), settledWord('Tst.1:1#2', 'δέ', 'CONJ'), pendingWord('Tst.1:1#3', 'γῆ', 'N-NSF', 'N-VSF')]);
    expect(settledAs(out.outs[2])).toBe('γῆ N-NSF 2a');
  });

  it('settles an article and adjective from the noun after them (an article, adjective and noun)', () => {
    const out = agree([
      pendingWord('Tst.1:1#1', 'ὁ', 'T-NSN', 'T-ASN'),
      pendingWord('Tst.1:1#2', 'καλός', 'A-ASM', 'A-NSN', 'A-ASN'),
      settledWord('Tst.1:1#3', 'φῶς', 'N-ASN'),
    ]);
    expect(out.outs.map(settledAs)).toEqual(['ὁ T-ASN 2a', 'καλός A-ASN 2a', 'φῶς N-ASN 1']);
  });

  it('settles a repeated article and its participle from the noun before them (a noun, then an article and adjective or participle)', () => {
    const out = agree([
      settledWord('Tst.1:1#1', 'ἑρπετόν', 'N-DSN'),
      pendingWord('Tst.1:1#2', 'ὁ', 'T-DSM', 'T-DSN'),
      pendingWord('Tst.1:1#3', 'ἕρπω', 'V-PAP-DSM', 'V-PAP-DSN'),
    ]);
    expect(out.outs.map(settledAs)).toEqual(['ἑρπετόν N-DSN 1', 'ὁ T-DSN 2a', 'ἕρπω V-PAP-DSN 2a']);
  });

  it('marks a break where a settled article and its settled word disagree, sends both pending and counts it once', () => {
    const out = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-ASM'), settledWord('Tst.1:1#2', 'γῆ', 'N-NSF')]);
    expect(out.breaks).toBe(1);
    expect(out.outs.every((w) => !isDerived(w))).toBe(true);
    expect(out.outs[0].notes).toContain(`agreement break: ${LINKS.article.name} with Tst.1:1#2: for the model`);
    expect(out.outs[1].notes).toContain(`agreement break: ${LINKS.article.name} with Tst.1:1#1: for the model`);
  });

  it('never counts a break from a link that only chooses: ὁ θεὸς τὸ ξηρὸν, a noun before a substantive in another case', () => {
    const out = agree([
      settledWord('Tst.1:1#1', 'ὁ', 'T-NSM'),
      settledWord('Tst.1:1#2', 'θεός', 'N-NSM'),
      settledWord('Tst.1:1#3', 'ὁ', 'T-ASN'),
      settledWord('Tst.1:1#4', 'ξηρός', 'A-ASN'),
    ]);
    expect(out.breaks).toBe(0);
    expect(out.outs.every(isDerived)).toBe(true);
  });

  it('never counts a break from an article, adjective and noun: ἡ νεωτέρα υἱόν (Gen 19:38), the younger one and her son', () => {
    const out = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-NSF'), settledWord('Tst.1:1#2', 'νέος', 'A-NSF-C'), settledWord('Tst.1:1#3', 'υἱός', 'N-ASM')]);
    expect(out.breaks).toBe(0);
  });

  it('reaches past no mark of punctuation: τῇ ἐρήμῳ, χεῖρα (Gen 37:22); brackets, Swete’s supplied letters, are read past', () => {
    expect(['ἐρήμῳ,', 'γῆς·', 'φῶς.', 'γῆς,]', 'ἐστιν;'].every(pauseAfter)).toBe(true);
    expect(['πληθυ]νέσθωσαν', 'τῆς]', 'ἕρπον[τι', 'καθ᾽'].some(pauseAfter)).toBe(false);
    const noun = { ...settledWord('Tst.1:1#1', 'χόρτος', 'N-ASM'), pause: true };
    const out = agree([noun, pendingWord('Tst.1:1#2', 'χλωρός', 'A-ASM', 'A-NSN', 'A-ASN')]);
    expect(isDerived(out.outs[1])).toBe(false);
    const article = { ...settledWord('Tst.1:1#1', 'ὁ', 'T-DSF'), pause: true };
    expect(agree([article, settledWord('Tst.1:1#2', 'χείρ', 'N-ASF')]).breaks).toBe(0);
  });

  it('takes no genitive after an article as its word (τὰ Καίσαρος, the things of Caesar)', () => {
    const out = agree([settledWord('Tst.1:1#1', 'ὁ', 'T-APN'), settledWord('Tst.1:1#2', 'Καῖσαρ', 'N-GSM')]);
    expect(out.breaks).toBe(0);
  });
});

describe('the derive report', async () => {
  const lines: string[] = [];
  const gen = await run(swete('swete-gen-1.csv'), ['--book', 'gen'], (line) => lines.push(line));

  it("prints 'settled by agreement', 'demoted by the shared-ending rule' and 'breaks per 1,000 words' with numbers", () => {
    expect(lines.some((l) => /^settled by agreement \(layer 2a\): \d+ \(\d+\.\d%\)$/.test(l))).toBe(true);
    expect(lines.some((l) => /^demoted by the shared-ending rule: \d+, of which settled again by agreement: \d+$/.test(l))).toBe(true);
    expect(lines.some((l) => /^agreement breaks: \d+ in \d+ words, \d+\.\d breaks per 1,000 words$/.test(l))).toBe(true);
    expect(lines).toContain(`pending before the agreement check: ${gen.beforeCheck.pending.length}; after it: ${gen.pending.length}`);
  });

  it('leaves fewer words pending on Gen 1 after the check than before it', () => {
    expect(gen.agreement.settled).toBeGreaterThan(0);
    expect(gen.agreement.demoted).toBeGreaterThan(0);
    expect(gen.pending.length).toBeLessThan(gen.beforeCheck.pending.length);
    expect(gen.derived.length + gen.pending.length).toBe(gen.words.length);
  });

  it('runs every book of the file with --all, one line a book', async () => {
    expect(parseArgs(['--all'])).toMatchObject({ all: true });
    const two: DeriveInput = { versification: '1\tTst.1:1\n3\tTsu.1:1', words: '1\tὁ\n2\tθεὸς\n3\tτὸν\n4\tοὐρανὸν', tagnt, tbesg };
    const table: string[] = [];
    await run(two, ['--all'], (line) => table.push(line));
    expect(table.filter((l) => /^(tst|tsu)\t2\t/.test(l))).toHaveLength(2);
  });
});
