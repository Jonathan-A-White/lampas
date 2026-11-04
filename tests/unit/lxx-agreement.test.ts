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
  ADDRESS,
  AGREEMENT_CONFIDENCE,
  LINKS,
  NOTE_ADDRESS,
  NOTE_NAME,
  NOTE_PREPOSITION_NONE,
  PREPOSITION,
  SHARED_ENDINGS,
  TAGNT_EVIDENCE,
  agree,
  checkAgreement,
  pauseAfter,
  readAddresses,
  readPrepositions,
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

// ---------------------------------------------------------------- an address (story mw-u2w5klk.26)

/**
 * A stretch of a verse as layers 1 and 2 left it, copied from the full run (`npm run lxx:derive -- --all`): each token is Swete's print, then ' = ', then
 * the settled 'lemma MORPH', or '? ' and the pending word's candidates 'lemma MORPH; lemma MORPH'; a candidate written 'lemma MORPH+' is one analogy offered beside a thin lone
 * candidate (WordCandidate.beside), and 'lemma MORPH*' one of Morpheus's perfect readings that took a thin lone candidate's place (WordCandidate.replaces), and 'lemma MORPH^' a rule's lone candidate on a stem support of 0 (isThinLone). `first` is the number of its first word in the verse.
 */
function asLeft(verse: string, first: number, tokens: readonly string[]): { words: Array<{ ref: string; verse: string; form: string; display: string }>; outs: Array<DerivedWord | PendingWord> } {
  const words = tokens.map((t, i) => {
    const display = t.split(' = ')[0];
    return { ref: `${verse}#${first + i}`, verse, display, form: display.replace(/[,.;:··;]+$/u, '') };
  });
  const outs = tokens.map((t, i): DerivedWord | PendingWord => {
    const ref = words[i].ref;
    const reading = t.split(' = ')[1];
    if (reading.startsWith('? ')) {
      const candidates = reading
        .slice(2)
        .split('; ')
        .map((c) => ({ lemma: c.split(' ')[0], morph: c.split(' ')[1].replace(/[+*^]$/, ''), support: 1, share: 0, ...(c.endsWith('+') ? { beside: true as const } : {}), ...(c.endsWith('*') ? { replaces: true as const } : {}), ...(c.endsWith('^') ? { stemSupport: 0 } : {}) }));
      return { ref, candidates, notes: [] };
    }
    const [lemma, morph] = reading.split(' ');
    return { ref, lemma, morph, layer: 1, confidence: 0.97, candidates: [{ lemma, morph, support: 3, share: 1 }], notes: [] };
  });
  return { words, outs };
}
const checked = (verse: string, first: number, tokens: readonly string[]): Map<string, DerivedWord | PendingWord> => {
  const { words, outs } = asLeft(verse, first, tokens);
  return new Map(checkAgreement(words, outs, { names: new Set(), parse: () => [] }).outs.map((o) => [o.ref, o]));
};
const answer = (m: Map<string, DerivedWord | PendingWord>, ref: string): string | undefined => {
  const o = m.get(ref);
  return o && isDerived(o) ? `${o.lemma} ${o.morph}` : undefined;
};

describe('an address is tagged vocative, as the New Testament data tags it (mw-u2w5klk.26: the hand audit of mw-u2w5klk.24, problem A)', () => {
  it('reads 2Sa.13:20#19 ἀδελφή as N-VSF: καὶ νῦν, ἀδελφή μου, κώφευσον', () => {
    const v = checked('2Sa.13:20', 17, ['καὶ = καί CONJ', 'νῦν, = νῦν ADV', 'ἀδελφή = ἀδελφή N-NSF', 'μου, = ἐγώ P-1GS', 'κώφευσον, = κωφεύω V-AAM-2S', 'ὅτι = ὅτι CONJ', 'ἀδελφός = ἀδελφός N-NSM', 'σού = σύ P-2GS', 'ἐστιν· = εἰμί V-PAI-3S']);
    expect(answer(v, '2Sa.13:20#19')).toBe('ἀδελφή N-VSF');
    // the subject of ἐστιν after ὅτι is no address
    expect(answer(v, '2Sa.13:20#23')).toBe('ἀδελφός N-NSM');
  });

  it('reads Psa.148:2#5 ἄγγελοι as N-VPM, with πάντες and οἱ: αἰνεῖτε αὐτόν, πάντες οἱ ἄγγελοι αὐτοῦ', () => {
    const v = checked('Psa.148:2', 1, [
      'αἰνεῖτε = αἰνέω V-PAM-2P',
      'αὐτόν, = αὐτός P-ASM',
      'πάντες = πᾶς A-NPM',
      'οἱ = ὁ T-NPM',
      'ἄγγελοι = ἄγγελος N-NPM',
      'αὐτοῦ· = αὐτός P-GSM',
      'αἰνεῖτε = αἰνέω V-PAM-2P',
      'αὐτόν, = αὐτός P-ASM',
      'πᾶσαι = πᾶς A-NPF',
      'αἱ = ὁ T-NPF',
      'δυνάμεις = ? δύναμις N-NPF; δύναμις N-APF',
      'αὐτοῦ. = αὐτός P-GSM',
    ]);
    expect(answer(v, 'Psa.148:2#5')).toBe('ἄγγελος N-VPM');
    expect([3, 4, 9, 10, 11].map((n) => answer(v, `Psa.148:2#${n}`))).toEqual(['πᾶς A-VPM', 'ὁ T-VPM', 'πᾶς A-VPF', 'ὁ T-VPF', 'δύναμις N-VPF']);
  });

  it('reads Joe.1:5#10 πάντες as A-VPM: θρηνήσατε, πάντες οἱ πίνοντες οἶνον', () => {
    const v = checked('Joe.1:5', 1, [
      'Ἐκνήψατε, = ἐκνήφω V-AAM-2P',
      'οἱ = ὁ T-NPM',
      'μεθύοντες, = μεθύω V-PAP-NPM',
      'ἐξ = ἐκ PREP',
      'οἴνου = οἶνος N-GSM',
      'αὐτῶν = ? αὐτός P-GPM; αὐτός P-GPN; αὐτός P-GPF',
      'καὶ = καί CONJ',
      'κλαύσατε· = κλαίω V-AAM-2P',
      'θρηνήσατε, = θρηνέω V-AAM-2P',
      'πάντες = πᾶς A-NPM',
      'οἱ = ὁ T-NPM',
      'πίνοντες = πίνω V-PAP-NPM',
      'οἶνον, = οἶνος N-ASM',
      'εἰς = εἰς PREP',
      'μέθην, = μέθη N-ASF',
      'ὅτι = ὅτι CONJ',
      'ἐξήρθη = ἐξαίρω V-API-3S',
      'ἐκ = ἐκ PREP',
      'στόματος = στόμα N-GSN',
      'ὑμῶν = σύ P-2GP',
      'εὐφροσύνη = ? εὐφροσύνη N-NSF; εὐφροσύνη N-DSF; εὐφροσύνη N-VSF; εὐφροσύνη N-ASF; εὐφροσύνη N-GSF; εὐφροσύνη N-APF',
      'καὶ = καί CONJ',
      'χαρά. = ? χαρά N-NSF; χαρά N-VSF',
    ]);
    expect(answer(v, 'Joe.1:5#10')).toBe('πᾶς A-VPM');
    expect([2, 3, 11, 12].map((n) => answer(v, `Joe.1:5#${n}`))).toEqual(['ὁ T-VPM', 'μεθύω V-PAP-VPM', 'ὁ T-VPM', 'πίνω V-PAP-VPM']);
    expect(answer(v, 'Joe.1:5#13')).toBe('οἶνος N-ASM');
  });

  it('marks a word it changes as layer 2a with the note, and counts it', () => {
    const { words, outs } = asLeft('Psa.7:2', 1, ['Κύριε = κύριος N-VSM', 'ὁ = ὁ T-NSM', 'θεός = θεός N-NSM']);
    const result = checkAgreement(words, outs, { names: new Set(), parse: () => [] });
    expect(result.outs.map((o) => (isDerived(o) ? `${o.morph} ${o.layer}` : 'pending'))).toEqual(['N-VSM 1', 'T-VSM 2a', 'N-VSM 2a']);
    expect(result.outs[2].notes).toEqual([NOTE_ADDRESS]);
    expect(result.stats.addressed).toBe(2);
    expect(readAddresses(words, outs).addressed).toBe(2);
  });

  it('offers a pending word of an address the vocative, and agreement settles it: ἐπάρθητε, πύλαι αἰώνιοι (Ps 23:7)', () => {
    const v = checked('Psa.23:7', 5, [
      'ὑμῶν, = σύ P-2GP',
      'καὶ = καί CONJ',
      'ἐπάρθητε, = ἐπαίρω V-APM-2P',
      'πύλαι = πύλη N-NPF',
      'αἰώνιοι, = ? αἰώνιος A-NPM; αἰώνιος A-VPM; αἰώνιος A-NPF; αἰώνιος A-NPM-LG',
      'καὶ = καί CONJ',
    ]);
    expect(answer(v, 'Psa.23:7#8')).toBe('πύλη N-VPF');
    expect(answer(v, 'Psa.23:7#9')).toBe('αἰώνιος A-VPF');
  });

  it('reads no address beside an indicative, or where σύ is named: ὅτι σύ, Κύριε, ἡ ἐλπίς μου· τὸν ὕψιστον ἔθου (Ps 90:9)', () => {
    const v = checked('Psa.90:9', 1, ['ὅτι = ὅτι CONJ', 'σύ, = σύ P-2NS', 'Κύριε, = κύριος N-VSM', 'ἡ = ὁ T-NSF', 'ἐλπίς = ἐλπίς N-NSF', 'μου· = ἐγώ P-1GS', 'τὸν = ὁ T-ASM', 'ἔθου = τίθημι V-2AMI-2S', 'καταφυγήν = καταφυγή N-ASF', 'σου. = σύ P-2GS']);
    expect([4, 5].map((n) => answer(v, `Psa.90:9#${n}`))).toEqual(['ὁ T-NSF', 'ἐλπίς N-NSF']);
  });

  it('reads no address beside a phrase with a verb of another person: φωνὴ ἀδελφιδοῦ μου, κρούει … Ἄνοιξόν μοι (Song 5:2)', () => {
    const v = checked('Sol.5:2', 8, ['φωνὴ = φωνή N-NSF', 'ἀδελφιδοῦ = ἀδελφιδός N-GSM', 'μου, = ἐγώ P-1GS', 'κρούει = κρούω V-PAI-3S', 'ἐπὶ = ἐπί PREP', 'τὴν = ὁ T-ASF', 'θύραν = θύρα N-ASF', 'Ἄνοιξόν = ἀνοίγω V-AAM-2S', 'μοι, = ἐγώ P-1DS']);
    expect(answer(v, 'Sol.5:2#8')).toBe('φωνή N-NSF');
  });

  it('takes no participle that layer 1 settled vocative as a call: ὁ οἰκοδομῶν (Amos 9:6)', () => {
    const v = checked('Amo.9:6', 1, ['ὁ = ὁ T-NSM', 'οἰκοδομῶν = οἰκοδομέω V-PAP-VSM', 'εἰς = εἰς PREP', 'τὸν = ὁ T-ASM', 'οὐρανὸν = οὐρανός N-ASM', 'ἀνάβασιν = ἀνάβασις N-ASF', 'αὐτοῦ, = αὐτός P-GSM']);
    expect(answer(v, 'Amo.9:6#1')).not.toBe('ὁ T-VSM');
  });

  it('reads a call forward across a comma only: Κύριε· καιρὸς εὐδοκίας, ὁ θεός· … ἐπάκουσον (Ps 68:14)', () => {
    const v = checked('Psa.68:14', 7, ['σέ, = σύ P-2AS', 'Κύριε· = κύριος N-VSM', 'καιρὸς = καιρός N-NSM', 'εὐδοκίας, = εὐδοκία N-GSF', 'ὁ = ὁ T-NSM', 'θεός· = θεός N-NSM', 'ἐν = ἐν PREP', 'τῷ = ? ὁ T-DSM; ὁ T-DSN', 'πλήθει = πλῆθος N-DSN', 'ἐπάκουσον, = ἐπακούω V-AAM-2S']);
    expect(answer(v, 'Psa.68:14#9')).toBe('καιρός N-NSM');
    expect([11, 12].map((n) => answer(v, `Psa.68:14#${n}`))).toEqual(['ὁ T-VSM', 'θεός N-VSM']);
  });

  it("keeps θεὸς Ἀβραάμ a nominative after ὦπταί, whether its one candidate is the rule's thin lone ὀπτάω V-IAI-3S or Morpheus's perfect in its place (Exo 3:16, mw-u2w5klk.32)", () => {
    // the verse as layers 1 and 2 leave it in the full run; ὦπταί's candidates are the one word that changes
    const verse = (verb: string): string[] => [
      'ἐλθὼν = ἔρχομαι V-2AAP-NSM', 'οὖν = οὖν CONJ', 'συνάγαγε = συνάγω V-2AAM-2S', 'τὴν = ὁ T-ASF', 'γερουσίαν = γερουσία N-ASF', 'τῶν = ὁ T-GPM', 'υἱῶν = υἱός N-GPM',
      'Ἰσραὴλ = ? Ἰσραήλ N-GSM; Ἰσραήλ N-DSM; Ἰσραήλ N-ASM; Ἰσραήλ N-NSM; Ἰσραήλ N-VSM', 'καὶ = καί CONJ', 'ἐρεῖς = ἔπω V-FAI-2S', 'πρὸς = πρός PREP', 'αὐτούς = αὐτός P-APM',
      'Κύριος = κύριος N-NSM', 'ὁ = ὁ T-NSM', 'θεὸς = θεός N-NSM', 'τῶν = ὁ T-GPM', 'πατέρων = πατήρ N-GPM', 'ὑμῶν = σύ P-2GP', verb, 'μοι, = ἐγώ P-1DS', 'θεὸς = θεός N-NSM',
      'Ἀβραὰμ = ? Ἀβραάμ N-GSM; Ἀβραάμ N-NSM; Ἀβραάμ N-DSM; Ἀβραάμ N-ASM; Ἀβραάμ N-VSM', 'καὶ = καί CONJ', 'θεὸς = θεός N-NSM', 'Ἰσαὰκ = ? Ἰσαάκ N-GSM; Ἰσαάκ N-ASM; Ἰσαάκ N-NSM; Ἰσαάκ N-DSM; Ἰσαάκ N-VSM',
      'καὶ = καί CONJ', 'θεὸς = θεός N-NSM', 'Ἰακώβ, = ? Ἰακώβ N-GSM; Ἰακώβ N-ASM; Ἰακώβ N-NSM; Ἰακώβ N-DSM; Ἰακώβ N-VSM', 'λέγων = λέγω V-PAP-NSM',
    ];
    for (const verb of ['ὦπταί = ? ὀπτάω V-IAI-3S^', 'ὦπταί = ? ὁράω V-RMI-3S*; ὁράω V-RPI-3S*']) {
      const v = checked('Exo.3:16', 1, verse(verb));
      for (const n of [21, 24, 27]) expect(answer(v, `Exo.3:16#${n}`), `${verb} #${n}`).toBe('θεός N-NSM');
    }
    // the guard is what holds it: with Morpheus's two readings as plain candidates the pending verb is not a settled one and the phrase is read as a call
    expect(answer(checked('Exo.3:16', 1, verse('ὦπταί = ? ὁράω V-RMI-3S; ὁράω V-RPI-3S')), 'Exo.3:16#21')).toBe('θεός N-VSM');
  });

  describe("analogy's readings beside a thin lone candidate do not turn an address (mw-u2w5klk.31)", () => {
    // The six verses of the first version's twelve words, as layers 1 and 2 leave them in the full run (`npm run lxx:derive -- --all`) with analogy's readings beside the
    // thin imperatives (ἐπάρθητε V-APM-2P beside V-APS-2P, ἐπίστρεψον beside two participles, ἀνοίξατε beside V-AAI-2P, ὕψωσον beside four others): '+' marks them.
    const PS_23 = (name: string): string[] => ['ἄρατε = αἴρω V-AAM-2P', 'πύλας, = πύλη N-APF', 'οἱ = ὁ T-NPM', 'ἄρχοντες = ? ἄρχων N-NPM; ἄρχων N-VPM', 'ὑμῶν, = σύ P-2GP', 'καὶ = καί CONJ', name, 'πύλαι = πύλη N-NPF', 'αἰώνιοι, = ? αἰώνιος A-NPM; αἰώνιος A-VPM; αἰώνιος A-NPF; αἰώνιος A-NPM-LG; αἰώνιος A-VPM-LG; αἰώνιος A-NPM-PG; αἰώνιος A-VPM-PG', 'καὶ = καί CONJ', 'εἰσελεύσεται = εἰσέρχομαι V-FDI-3S', 'ὁ = ὁ T-NSM', 'βασιλεὺς = βασιλεύς N-NSM', 'τῆς = ὁ T-GSF', 'δόξης. = δόξα N-GSF'];
    const VERSES: ReadonlyArray<{ verse: string; tokens: string[]; says: Record<number, string> }> = [
      { verse: 'Psa.23:7', tokens: PS_23('ἐπάρθητε, = ? ἐπαίρω V-APM-2P; ἐπαίρω V-APS-2P+'), says: { 3: 'ὁ T-VPM', 4: 'ἄρχων N-VPM', 8: 'πύλη N-VPF', 9: 'αἰώνιος A-VPF' } },
      { verse: 'Psa.23:9', tokens: PS_23('ἐπάρθητε, = ? ἐπαίρω V-APM-2P; ἐπαίρω V-APS-2P+'), says: { 3: 'ὁ T-VPM', 4: 'ἄρχων N-VPM', 8: 'πύλη N-VPF', 9: 'αἰώνιος A-VPF' } },
      {
        verse: 'Psa.79:15',
        tokens: ['ὁ = ὁ T-NSM', 'θεὸς = θεός N-NSM', 'τῶν = ? ὁ T-GPM; ὁ T-GPN; ὁ T-GPF', 'δυνάμεων, = δύναμις N-GPF', 'ἐπίστρεψον = ? ἐπιστρέφω V-AAM-2S; ἐπιστρέφω V-PAP-ASN+; ἐπιστρέφω V-PAP-NSN+', 'δή, = δή PRT', 'ἐπίβλεψον = ? ἐπιβλέπω V-AAM-2S', 'ἐξ = ἐκ PREP', 'οὐρανοῦ = οὐρανός N-GSM', 'καὶ = καί CONJ', 'ἴδε, = ? ἴδε INJ; εἴδω V-2AAM-2S', 'καὶ = καί CONJ', 'ἐπίσκεψαι = ἐπισκέπτομαι V-ADM-2S', 'τὴν = ὁ T-ASF', 'ἄμπελον = ἄμπελος N-ASF', 'ταύτην· = οὗτος D-ASF'],
        says: { 1: 'ὁ T-VSM', 2: 'θεός N-VSM', 3: 'ὁ T-GPF' },
      },
      {
        verse: 'Psa.114:7',
        tokens: ['ἐπίστρεψον, = ? ἐπιστρέφω V-AAM-2S; ἐπιστρέφω V-PAP-ASN+; ἐπιστρέφω V-PAP-NSN+', 'ἡ = ὁ T-NSF', 'ψυχή = ? ψυχή N-NSF; ψυχή N-VSF', 'μου, = ἐγώ P-1GS', 'εἰς = εἰς PREP', 'τὴν = ὁ T-ASF', 'ἀνάπαυσίν = ἀνάπαυσις N-ASF', 'σου, = σύ P-2GS', 'ὅτι = ὅτι CONJ', 'Κύριος = κύριος N-NSM', 'εὐηργέτησέν = ? εὐεργετέω V-AAI-3S', 'σε· = σύ P-2AS'],
        says: { 2: 'ὁ T-VSF', 3: 'ψυχή N-VSF' },
      },
      {
        verse: 'Isa.13:2',
        tokens: ['Ἐπ᾽ = ἐπί PREP', 'ὄρους = ὄρος N-GSN', 'πεδινοῦ = πεδινός A-GSM', 'ἄρατε = αἴρω V-AAM-2P', 'σημεῖον, = ? σημεῖον N-ASN; σημεῖον N-NSN', 'ὑψώσατε = ὑψόω V-AAM-2P', 'τὴν = ὁ T-ASF', 'φωνὴν = φωνή N-ASF', 'αὐτοῖς, = αὐτός P-DPM', 'παρακαλεῖτε = παρακαλέω V-PAM-2P', 'τῇ = ὁ T-DSF', 'χειρί· = χείρ N-DSF', 'ἀνοίξατε, = ? ἀνοίγω V-AAM-2P; ἀνοίγω V-AAI-2P+', 'οἱ = ὁ T-NPM', 'ἄρχοντες. = ? ἄρχων N-NPM; ἄρχων N-VPM'],
        says: { 14: 'ὁ T-VPM', 15: 'ἄρχων N-VPM' },
      },
      {
        verse: 'Isa.40:9',
        tokens: ['Ἐπ᾽ = ἐπί PREP', 'ὄρος = ? ὄρος N-ASN; ὄρος N-NSN', 'ὑψηλὸν = ? ὑψηλός A-ASN; ὑψηλός A-NSN', 'ἀνάβηθι, = ? ἀναβαίνω V-2AAM-2S', 'ὁ = ὁ T-NSM', 'εὐαγγελιζόμενος = εὐαγγελίζομαι V-PMP-NSM', 'Σειών· = ? σείω V-PAP-NSM; σείω V-PAP-VSM; Σειών N-NSM; Σειών N-VSM', 'ὕψωσον = ? ὑψόω V-AAM-2S; ὑψόω V-AAI-1S+; ὑψόω V-AAI-3P+; ὑψόω V-PAP-ASN+; ὑψόω V-PAP-NSN+', 'τῇ = ὁ T-DSF', 'ἰσχύι = ? ἰσχύω V-PAI-3S; ἰσχύω V-PAM-2S; ἰσχύς N-DSF; ἰσχύς N-NPF; ἰσχύω V-FAI-3S; ἰσχύω V-IAI-3S', 'τὴν = ὁ T-ASF', 'φωνήν = φωνή N-ASF', 'σου, = σύ P-2GS', 'ὁ = ὁ T-NSM', 'εὐαγγελιζόμενος = εὐαγγελίζομαι V-PMP-NSM', 'Ἰερουσαλήμ· = ? Ἱερουσαλήμ N-ASF; Ἱερουσαλήμ N-VSF; Ἱερουσαλήμ N-NSF', 'ὑψώσατε, = ὑψόω V-AAM-2P'],
        says: { 14: 'ὁ T-VSM', 15: 'εὐαγγελίζομαι V-PMP-VSM' },
      },
    ];
    const WITHOUT = (tokens: readonly string[]): string[] => tokens.map((t) => t.split('; ').filter((c) => !c.endsWith('+')).join('; '));

    for (const { verse, tokens, says } of VERSES) {
      it(`${verse}: the address is read as before, each word of it named`, () => {
        const v = checked(verse, 1, tokens);
        for (const [n, reading] of Object.entries(says)) expect(answer(v, `${verse}#${n}`), `${verse}#${n}`).toBe(reading);
        // the pending imperative keeps analogy's readings for the model, and is not settled by the check
        const imperative = tokens.findIndex((t) => t.includes('+'));
        expect(isDerived(v.get(`${verse}#${imperative + 1}`)!)).toBe(false);
        expect(v.get(`${verse}#${imperative + 1}`)!.candidates.some((c) => c.beside)).toBe(true);
        // and the same words, with no reading beside them, are read the same
        const plain = checked(verse, 1, WITHOUT(tokens));
        expect(tokens.map((_, i) => answer(v, `${verse}#${i + 1}`))).toEqual(tokens.map((_, i) => answer(plain, `${verse}#${i + 1}`)));
      });
    }

    it('readAddresses offers the vocative to a pending word only by its own readings, never by what analogy offered beside them', () => {
      const { words, outs } = asLeft('Psa.7:2', 1, ['Κύριε = κύριος N-VSM', 'ὁ = ὁ T-NSM', 'θεός = ? θεός N-NSM; θεός N-VSM+']);
      const read = readAddresses(words, outs).outs[2];
      expect(isDerived(read)).toBe(false);
      expect(read.candidates.map((c) => `${c.morph}${c.beside ? '+' : ''}`)).toEqual(['N-NSM', 'N-VSM+']);
      // a pending word whose own readings are not mostly nominative is not offered it, whatever analogy offers beside them
      const accusative = asLeft('Psa.7:2', 1, ['Κύριε = κύριος N-VSM', 'ὁ = ὁ T-NSM', 'θεός = ? θεός N-ASM; θεός N-NSM+; θεός N-NPM+']);
      expect(readAddresses(accusative.words, accusative.outs).outs[2].candidates.map((c) => c.morph)).toEqual(['N-ASM', 'N-NSM', 'N-NPM']);
    });

    // ἄφρονος: the rules' one candidate, a comparative's, A-GSF-C, on a support of 1; analogy offers six more, A-GSM among them and A-NSF, which καρδία (N-NSF) and a link that
    // only chooses would take (Pro 17:21, Ecc 5:2 with φωνή, Ecc 10:2) if the check read it. It does not: the word stays pending, the model has A-GSM.
    const FOOL = 'ἄφρων A-GSF-C; ἄφρων A-NSM+; ἄφρων A-GSN+; ἄφρων A-GSM+; ἄφρων A-NSF+; ἄφρων A-NSM-S+; ἄφρων A-VSF+; ἄφρων A-VSM+';
    const FOOLS: ReadonlyArray<{ verse: string; n: number; tokens: string[] }> = [
      { verse: 'Pro.17:21', n: 3, tokens: ['καρδία = καρδία N-NSF', 'δὲ = δέ CONJ', `ἄφρονος = ? ${FOOL}`, 'ὀδύνη = ὀδύνη N-NSF', 'τῷ = ? ὁ T-DSM; ὁ T-DSN', 'κεκτημένῳ = ? κτάομαι V-RMP-DSM', 'αὐτήν. = αὐτός P-ASF'] },
      { verse: 'Ecc.5:2', n: 9, tokens: ['ὅτι = ὅτι CONJ', 'παραγίνεται = παραγίνομαι V-PNI-3S', 'ἐνύπνιον = ? ἐνύπνιον N-ASN; ἐνύπνιον N-NSN', 'ἐν = ἐν PREP', 'πλήθει = πλῆθος N-DSN', 'πειρασμοῦ, = πειρασμός N-GSM', 'καὶ = καί CONJ', 'φωνὴ = φωνή N-NSF', `ἄφρονος = ? ${FOOL}`, 'ἐν = ἐν PREP', 'πλήθει = πλῆθος N-DSN', 'λόγων. = λόγος N-GPM'] },
      { verse: 'Ecc.10:2', n: 8, tokens: ['καρδία = καρδία N-NSF', 'σοφοῦ = ? σοφός A-GSM; σοφός A-GSN; σοφός A-GSF', 'εἰς = εἰς PREP', 'δεξιὸν = ? δεξιός A-ASN; δεξιός A-ASM', 'αὐτοῦ. = αὐτός P-GSM', 'καὶ = καί CONJ', 'καρδία = καρδία N-NSF', `ἄφρονος = ? ${FOOL}`, 'εἰς = εἰς PREP', 'ἀριστερὸν = ? ἀριστερός A-ASM; ἀριστερός A-ASN', 'αὐτοῦ. = αὐτός P-GSM'] },
      { verse: 'Ecc.2:16', n: 9, tokens: ['ὅτι = ὅτι CONJ', 'οὐκ = οὐ PRT-N', 'ἔστιν = εἰμί V-PAI-3S', 'μνήμη = ? μνήμη N-NSF; μνήμη N-DSF; μνήμη N-GSF', 'τοῦ = ? ὁ T-GSM; ὁ T-GSN; αὐτός P-GSN', 'σοφοῦ = ? σοφός A-GSM; σοφός A-GSN; σοφός A-GSF', 'μετὰ = μετά PREP', 'τοῦ = ? ὁ T-GSM; ὁ T-GSN; αὐτός P-GSN', `ἄφρονος = ? ${FOOL}`, 'εἰς = εἰς PREP', 'τὸν = ὁ T-ASM', 'αἰῶνα, = αἰών N-ASM'] },
    ];
    for (const { verse, n, tokens } of FOOLS) {
      it(`${verse}#${n} ἄφρονος stays pending, not A-NSF (nor, at Ecc 2:16, A-GSF-C): the model has A-GSM beside the rules’ reading`, () => {
        const { words, outs } = asLeft(verse, 1, tokens);
        const result = checkAgreement(words, outs, { names: new Set(), parse: () => [] });
        const w = result.outs[n - 1];
        expect(isDerived(w) ? `${w.lemma} ${w.morph}` : 'pending').toBe('pending');
        expect(w.candidates.map((c) => c.morph)).toEqual(expect.arrayContaining(['A-GSF-C', 'A-GSM']));
        expect(w.candidates[0].morph).toBe('A-GSF-C');
        expect(result.stats.breaks).toBe(0);
      });
    }
  });

  it('has a comment a reader can check, copied in docs/lxx-derivation.md', () => {
    expect(ADDRESS.comment).toContain('Heb 1:8');
    expect(readFileSync('docs/lxx-derivation.md', 'utf8')).toContain(ADDRESS.name);
  });
});

// ---------------------------------------------------------------- a preposition's case (story mw-u2w5klk.27)

/**
 * The cases each preposition of these verses governs, as prepositionCases (scripts/lxx/parser.ts) learns them from the pinned TAGNT: the full file is not
 * in a fresh worktree, so the tests name them. ἕως is not among them: one in 28 of the declined words after it in the New Testament is a nominative.
 */
const GOVERNS: ReadonlyMap<string, readonly string[]> = new Map([
  ['ἐν', ['D']],
  ['ἐπί', ['G', 'D', 'A']],
  ['εἰς', ['A']],
  ['ἐκ', ['G']],
  ['σύν', ['D']],
  ['ἕνεκα, εἵνεκεν', ['G']],
]);
/**
 * As asLeft, and a settled word may name the layer that settled it and its other candidates: 'τρίβων = τρίβω V-PAP-NSM 2 | τρίβος N-GPF; τρίβω V-PAN' is
 * layer 2 with τρίβω V-PAP-NSM its first candidate and the two after it.
 */
function asParsed(verse: string, first: number, tokens: readonly string[]): ReturnType<typeof asLeft> {
  const plain = tokens.map((t) => t.replace(/ \d?a? ?\| .*$/, '').replace(/ 2$/, ''));
  const { words, outs } = asLeft(verse, first, plain);
  return {
    words,
    outs: outs.map((o, i) => {
      const m = / (\d?a?) ?\| (.*)$/.exec(tokens[i]) ?? / (2)$/.exec(tokens[i]);
      if (!m || !isDerived(o)) return o;
      const more = (m[2] ?? '').split('; ').filter(Boolean).map((c) => ({ lemma: c.split(' ')[0], morph: c.split(' ')[1], support: 1, share: 0 }));
      const layer = m[1] === '2' ? 2 : 1;
      return { ...o, layer, confidence: layer === 2 ? 0.7 : o.confidence, candidates: [...o.candidates, ...more] };
    }),
  };
}
const governed = (verse: string, first: number, tokens: readonly string[]): Map<string, DerivedWord | PendingWord> => {
  const { words, outs } = asParsed(verse, first, tokens);
  return new Map(checkAgreement(words, outs, { names: new Set(), parse: () => [], governs: GOVERNS }).outs.map((o) => [o.ref, o]));
};
const layerOf = (m: Map<string, DerivedWord | PendingWord>, ref: string): string => {
  const o = m.get(ref);
  return o && isDerived(o) ? String(o.layer) : 'pending';
};

describe("a preposition's case checks the word it governs (mw-u2w5klk.27: the hand audit of mw-u2w5klk.24, problem B)", () => {
  it('reads Job.18:10#12 τρίβων as τρίβος N-GPF: ἐπὶ τρίβων, the parser’s participle being a nominative', () => {
    const v = governed('Job.18:10', 7, [
      'καὶ = καί CONJ',
      'ἡ = ὁ T-NSF',
      'σύλληψις = σύλληψις N-NSF 2 |',
      'αὐτοῦ = ? αὐτός P-GSM; αὐτός P-GSN',
      'ἐπὶ = ἐπί PREP',
      'τρίβων. = τρίβω V-PAP-NSM 2 | τρίβω V-PAP-VSM; τρίβος N-GPF; τρίβω V-PAN',
    ]);
    expect(answer(v, 'Job.18:10#12')).toBe('τρίβος N-GPF');
    expect(layerOf(v, 'Job.18:10#12')).toBe('2a');
  });

  it('reads Pro.11:22#4 ῥινί as N-DSF: ἐν ῥινὶ ὑός', () => {
    const v = governed('Pro.11:22', 1, ['ὥσπερ = ὥσπερ CONJ', 'ἐνώτιον = ? ἐνώτιον N-ASN; ἐνώτιον N-NSN', 'ἐν = ἐν PREP', 'ῥινὶ = ῥίν N-NPF 2 | ῥίν N-DSF']);
    expect(answer(v, 'Pro.11:22#4')).toBe('ῥίν N-DSF');
    expect(layerOf(v, 'Pro.11:22#4')).toBe('2a');
  });

  it('marks the word it changes with the note naming the preposition, and counts it', () => {
    const { words, outs } = asParsed('Pro.11:22', 3, ['ἐν = ἐν PREP', 'ῥινὶ = ῥίν N-NPF 2 | ῥίν N-DSF']);
    const result = checkAgreement(words, outs, { names: new Set(), parse: () => [], governs: GOVERNS });
    expect(result.outs[1].notes).toEqual([`${PREPOSITION.name}: ἐν (Pro.11:22#3) takes the dative`]);
    expect(result.stats.governed).toBe(1);
    expect(result.stats.governedPending).toBe(0);
    expect(readPrepositions(words, outs, GOVERNS).governed).toBe(1);
  });

  it('leaves a word in a case the preposition takes as it is, though another of its readings fits too (ἐπί takes three)', () => {
    const v = governed('Tst.1:1', 1, ['ἐπὶ = ἐπί PREP', 'τὴν = ὁ T-ASF', 'γῆν = γῆ N-ASF 2 | γῆ N-GSF; γῆ N-DSF']);
    expect(answer(v, 'Tst.1:1#3')).toBe('γῆ N-ASF');
    expect(layerOf(v, 'Tst.1:1#3')).toBe('2');
  });

  it('settles no case where a preposition that takes more than one leaves two readings: the word waits for the model, and agreement does not choose', () => {
    const v = governed('Tst.1:1', 1, ['ἐπὶ = ἐπί PREP', 'λίθου = λίθος N-NSM 2 | λίθος N-GSM; λίθος N-ASM', 'μεγάλου = ? μέγας A-GSM; μέγας A-NSM']);
    const w = v.get('Tst.1:1#2');
    expect(w && isDerived(w)).toBe(false);
    expect(w?.candidates.slice(0, 2).map((c) => c.morph)).toEqual(['N-GSM', 'N-ASM']);
    expect(w?.notes).toEqual([`${PREPOSITION.name}: ἐπί (Tst.1:1#1) takes the genitive, dative or accusative; several readings fit: for the model`]);
    expect(answer(v, 'Tst.1:1#3')).toBeUndefined();
  });

  it('sends to the model a word no reading of which the preposition takes: it may be wrong (ἐν Καδής as κάδος N-NSM), or not governed (οὗ εἵνεκεν ὁ υἱὸς, 2 Sam 18:20)', () => {
    const v = governed('Num.20:1', 21, ['ἐν = ἐν PREP', 'Καδής, = κάδος N-NSM 2 |']);
    const w = v.get('Num.20:1#22');
    expect(w && isDerived(w)).toBe(false);
    expect(w?.candidates.map((c) => `${c.lemma} ${c.morph}`)).toEqual(['κάδος N-NSM']);
    expect(w?.notes).toEqual([`${PREPOSITION.name}: ἐν (Num.20:1#21) takes the dative; ${NOTE_PREPOSITION_NONE}`]);
    // TAGNT's lemma holds a comma and a space, which the tokens above cannot say
    const { words, outs } = asParsed('2Sa.18:20', 25, ['εἵνεκεν = ἕνεκα PREP', 'ὁ = ὁ T-NSM', 'υἱὸς = υἱός N-NSM']);
    const ἕνεκα = outs[0] as DerivedWord;
    outs[0] = { ...ἕνεκα, lemma: 'ἕνεκα, εἵνεκεν', candidates: [{ lemma: 'ἕνεκα, εἵνεκεν', morph: 'PREP', support: 3, share: 1 }] };
    const after = new Map(checkAgreement(words, outs, { names: new Set(), parse: () => [], governs: GOVERNS }).outs.map((o) => [o.ref, o]));
    expect(answer(after, '2Sa.18:20#26')).toBeUndefined();
    expect(answer(after, '2Sa.18:20#27')).toBe('υἱός N-NSM');
  });

  it('reads nothing after a preposition it does not know (ἕως), after a mark of punctuation, or after a preposition still pending', () => {
    const word = 'ἡμέρα = ἡμέρα N-NSF 2 | ἡμέρα N-GSF';
    expect(answer(governed('Tst.1:1', 1, ['ἕως = ἕως PREP', word]), 'Tst.1:1#2')).toBe('ἡμέρα N-NSF');
    expect(answer(governed('Tst.1:1', 1, ['ἐκ, = ἐκ PREP', word]), 'Tst.1:1#2')).toBe('ἡμέρα N-NSF');
    expect(answer(governed('Tst.1:1', 1, ['ἐκ = ? ἐκ PREP; ἐκ ADV', word]), 'Tst.1:1#2')).toBe('ἡμέρα N-NSF');
  });

  it('takes no reading layer 1 has from one New Testament word: σὺν τὸν δίκαιον (Eccl 3:17) is not made τόν T-DSF, its stray reading; it waits for the model', () => {
    const v = governed('Ecc.3:17', 7, ['Σὺν = σύν PREP', 'τὸν = ὁ T-ASM | ὁ T-DSF', 'δίκαιον = δίκαιος A-ASM']);
    expect(layerOf(v, 'Ecc.3:17#8')).toBe('pending');
    expect(v.get('Ecc.3:17#8')?.notes.at(-1)).toContain(NOTE_PREPOSITION_NONE);
  });

  it('reads a layer-1 word again where its reading in the case is seen twice or more in the New Testament', () => {
    const { words, outs } = asParsed('Tst.1:1', 1, ['εἰς = εἰς PREP', 'ὥρας = ὥρα N-GSF | ὥρα N-APF']);
    const twice = outs.map((o) => ({ ...o, candidates: o.candidates.map((c) => ({ ...c, support: 2 })) }));
    const out = checkAgreement(words, twice, { names: new Set(), parse: () => [], governs: GOVERNS }).outs[1];
    expect(isDerived(out) ? `${out.morph} ${out.layer}` : 'pending').toBe('N-APF 2a');
    expect(layerOf(governed('Tst.1:1', 1, ['εἰς = εἰς PREP', 'ὥρας = ὥρα N-GSF | ὥρα N-APF']), 'Tst.1:1#2')).toBe('pending');
  });

  it('runs without a table of cases, as the check did before (a context with no governs)', () => {
    const { words, outs } = asParsed('Pro.11:22', 3, ['ἐν = ἐν PREP', 'ῥινὶ = ῥίν N-NPF 2 | ῥίν N-DSF']);
    expect(answer(new Map(checkAgreement(words, outs, { names: new Set(), parse: () => [] }).outs.map((o) => [o.ref, o])), 'Pro.11:22#4')).toBe('ῥίν N-NPF');
  });

  it('has a comment a reader can check, copied in docs/lxx-derivation.md', () => {
    expect(PREPOSITION.comment).toContain('ἐπὶ τρίβων');
    expect(readFileSync('docs/lxx-derivation.md', 'utf8')).toContain(PREPOSITION.name);
  });
});
