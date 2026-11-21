// tests/unit/lxx-article-gender.test.ts — Genesis 24:2 τῷ παιδὶ αὐτοῦ (mw-u2w5klk.349.34): the parser read παιδὶ as N-DSF (its ending rule, παι-δι as παι-σ, was learned from feminine
// nouns in -ις) though the article before it is τῷ (DSM or DSN) and παῖς is a masculine and a feminine in the New Testament. A layer-2 noun that disagrees with its article takes
// another gender its lemma has in the New Testament when exactly one of them agrees (agreement.ts, `regender`). The sweep (scripts/lxx/article-gender.ts) lists every shipped
// article directly before a noun of another gender.
import { describe, expect, it } from 'vitest';
import { checkAgreement } from '../../scripts/lxx/agreement';
import { isDerived, type DerivedWord, type PendingWord } from '../../scripts/lxx/derive';
import { CHOICES_DIR } from '../../scripts/lxx/release';
import { readChoiceDir } from '../../scripts/lxx/choices';
import { genderMismatches, mismatchLines, why, type ShippedChapter } from '../../scripts/lxx/article-gender';

type Out = DerivedWord | PendingWord;

const verse = 'Gen.24:2';
const words = ['Ἀβραὰμ', 'τῷ', 'παιδὶ', 'αὐτοῦ,', 'τῷ', 'πρεσβυτέρῳ'].map((display, i) => ({ ref: `${verse}#${i + 1}`, verse, display, form: display.replace(/,$/, '') }));
const pending = (ref: string, morphs: string[], lemma: string): PendingWord => ({ ref, candidates: morphs.map((morph) => ({ lemma, morph, support: 0, share: 0 })), notes: [] });
const settled = (ref: string, lemma: string, morph: string, layer: 1 | 2): DerivedWord => ({ ref, lemma, morph, layer, confidence: layer === 1 ? 0.97 : 0.75, candidates: [{ lemma, morph, support: 9, share: 1 }], notes: [] });
const GENDERS = new Map([['παῖς', ['F', 'M']]]);
const ctx = { names: new Set<string>(), parse: () => [], genders: (lemma: string) => GENDERS.get(lemma) ?? [] };
const answers = (outs: Out[]): Map<string, string> => new Map(outs.map((o) => [o.ref, isDerived(o) ? o.morph : '?']));

describe('Gen 24:2 τῷ παιδὶ αὐτοῦ, τῷ πρεσβυτέρῳ', () => {
  const start = (article: Out, noun: Out): Out[] => [
    settled(`${verse}#1`, 'Ἀβραάμ', 'N-NSM', 1),
    article,
    noun,
    settled(`${verse}#4`, 'αὐτός', 'P-GSM', 1),
    pending(`${verse}#5`, ['T-DSM', 'T-DSN'], 'ὁ'),
    settled(`${verse}#6`, 'πρεσβύτερος', 'N-DSM', 1),
  ];

  it('gives παιδὶ the masculine its article has when the article is still pending (DSM or DSN)', () => {
    const outs = start(pending(`${verse}#2`, ['T-DSM', 'T-DSN'], 'ὁ'), settled(`${verse}#3`, 'παῖς', 'N-DSF', 2));
    const got = answers(checkAgreement(words, outs, ctx).outs);
    expect(got.get(`${verse}#3`)).toBe('N-DSM');
    expect(got.get(`${verse}#2`)).toBe('T-DSM');
  });

  // a nominative: the article's ending is its own (no shared ending), so it stays settled and a disagreement is a break
  const nominative = (noun: Out, genders: (lemma: string) => readonly string[] = ctx.genders): { outs: Out[]; result: ReturnType<typeof checkAgreement> } => {
    const verse2 = 'Gen.24:28';
    const ws = ['ἡ', 'παῖς'].map((display, i) => ({ ref: `${verse2}#${i + 1}`, verse: verse2, display, form: display }));
    const outs = [settled(`${verse2}#1`, 'ὁ', 'T-NSM', 1), { ...noun, ref: `${verse2}#2` } as Out];
    return { outs, result: checkAgreement(ws, outs, { ...ctx, genders }) };
  };

  it('gives a noun the masculine of a settled article', () => {
    const { result } = nominative(settled('', 'παῖς', 'N-NSF', 2));
    expect(answers(result.outs).get('Gen.24:28#2')).toBe('N-NSM');
    expect(result.stats.breaks).toBe(0);
  });

  it('leaves a lemma the New Testament has in one gender only as the parser read it (a break, for the model)', () => {
    const { result } = nominative(settled('', 'ἐλπίς', 'N-NSF', 2), () => ['F']);
    expect(result.stats.breaks).toBe(1);
  });

  it('does not touch a layer-1 noun: the New Testament has its form', () => {
    const { result } = nominative(settled('', 'παῖς', 'N-NSF', 1));
    expect(result.stats.breaks).toBe(1);
  });
});

describe('the sweep of articles before nouns of another gender', () => {
  const w = (t: string, l: string, p: string) => ({ t, l, p });
  const chapter: ShippedChapter = {
    code: 'gen',
    chapter: 24,
    verses: [
      { n: 2, g: [w('τῷ', 'ὁ', 'T-DSM'), w('παιδὶ', 'παῖς', 'N-DSF'), w('τὴν', 'ὁ', 'T-ASF'), w('ἵππον', 'ἵππος', 'N-ASF'), w('τὸ', 'ὁ', 'T-NSN'), w('ὕδωρ', 'ὕδωρ', 'N-NSN')] },
      { n: 3, g: [w('ὁ', 'ὁ', 'T-NSM'), w('καί', 'καί', 'CONJ'), w('θεὸς', 'θεός', 'N-NSM')] },
    ],
  };

  it('finds only a noun directly after an article, of a gender the article does not have', () => {
    const found = genderMismatches([chapter]);
    expect(found).toEqual([{ ref: 'Gen 24:2', article: 'τῷ', articleParse: 'T-DSM', noun: 'παιδὶ', lemma: 'παῖς', nounParse: 'N-DSF', index: 0 }]);
  });

  it('writes a line for each with its reason, and says 0 when there is none', () => {
    const lines = mismatchLines(genderMismatches([chapter]));
    expect(lines[0]).toContain('Gen 24:2');
    expect(lines[0]).toContain('open');
    expect(mismatchLines([])).toEqual(['0 articles stand before a noun of another gender']);
  });

  it('is no fault when the noun is in another case than the article (τὸ ἑσπέρας)', () => {
    const [m] = genderMismatches([{ code: 'gen', chapter: 49, verses: [{ n: 27, g: [w('τὸ', 'ὁ', 'T-ASN'), w('ἑσπέρας', 'ἑσπέρα', 'N-GSF')] }] }]);
    expect(why(m).fault).toBe(false);
  });
});

// Genesis 24:28 ἡ παῖς and 24:57 τὴν παῖδα (Rebekah the maid, mw-u2w5klk.349.53): the model's choices (layer 3, 'unsure') kept the masculine of the New Testament's παῖδα beside a
// feminine article, so the word sheet read 'noun, masculine'. The choices file is what ships for these two (the parser's regender only touches layer 2).
describe('Genesis 24: the maid Rebekah is feminine in the model\'s choices', () => {
  const { choices } = readChoiceDir(CHOICES_DIR, 'gen-');

  it('has ἡ παῖς in 24:28 as N-NSF and τὴν παῖδα in 24:57 as N-ASF (a guess: the parser offers only the masculine)', () => {
    expect(choices.get('Gen.24:28#4')).toMatchObject({ parsing: 'N-NSF', lemma: 'παῖς', mark: 'guess' });
    expect(choices.get('Gen.24:57#6')).toMatchObject({ parsing: 'N-ASF', lemma: 'παῖς', mark: 'guess' });
  });

  it('lists a noun the model chose beside an article of another gender, by the shipped words alone (no layer is read)', () => {
    const w = (t: string, l: string, p: string, y?: string) => ({ t, l, p, y });
    const found = genderMismatches([{ code: 'gen', chapter: 24, verses: [{ n: 28, g: [w('δραμοῦσα', 'τρέχω', 'V-AAP-NSF'), w('ἡ', 'ὁ', 'T-NSF'), w('παῖς', 'παῖς', 'N-NSM', '3')] }] }]);
    expect(found.map((m) => `${m.ref} ${m.noun}`)).toEqual(['Gen 24:28 παῖς']);
    expect(why(found[0]).text).toContain('model');
    expect(mismatchLines(found)[0]).toContain("by the model's choice");
  });
});
