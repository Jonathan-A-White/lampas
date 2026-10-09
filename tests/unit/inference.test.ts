import { describe, expect, it } from 'vitest';
import {
  INFERRED_RIGHTS,
  LETTER_IDS,
  alphabetIsSolid,
  countMiss,
  creditForm,
  foundationOf,
  formOfQuestion,
  inferFromAnswer,
  isInferredSolid,
  letterIdOf,
  lettersText,
  questionFoundation,
  weakLetters,
  type Evidence,
} from '../../src/data/grammar/inference';
import type { Level } from '../../src/data/grammar/needs';

const none = new Map<string, Evidence>();

describe('what a form shows', () => {
  it('names each of its letters, a final sigma as a sigma, once however often it stands', () => {
    expect(foundationOf('λόγος')).toEqual(expect.arrayContaining(['letter-lambda', 'letter-omicron', 'letter-gamma', 'letter-sigma']));
    expect(foundationOf('λόγος').filter((id) => id === 'letter-omicron')).toHaveLength(1);
    expect(foundationOf('λόγος').filter((id) => id.startsWith('letter-'))).toHaveLength(4);
  });

  it('names a pair of vowels, but not when the stress or two dots part them', () => {
    expect(foundationOf('αἰών')).toContain('diphthongs');
    expect(foundationOf('οὐ')).toContain('diphthongs');
    expect(foundationOf('λόγος')).not.toContain('diphthongs');
    expect(foundationOf('ἄιδω')).not.toContain('diphthongs');
    expect(foundationOf('πρωϊ')).not.toContain('diphthongs');
  });

  it('names a pair of consonants', () => {
    expect(foundationOf('ἄγγελος')).toContain('consonant-pairs');
    expect(foundationOf('ἐμπίπτω')).toContain('consonant-pairs');
    expect(foundationOf('λόγος')).not.toContain('consonant-pairs');
  });

  it('names a breathing, an accent and an iota under a letter', () => {
    expect(foundationOf('ὁ')).toEqual(expect.arrayContaining(['breathings', 'letter-omicron']));
    expect(foundationOf('ὁ')).not.toContain('accents');
    expect(foundationOf('λόγος')).toContain('accents');
    expect(foundationOf('λόγος')).not.toContain('breathings');
    expect(foundationOf('τῷ')).toEqual(expect.arrayContaining(['iota-subscript', 'accents']));
  });

  it('knows every letter by its glyph, capital or small', () => {
    expect(LETTER_IDS).toHaveLength(24);
    expect(letterIdOf('ξ')).toBe('letter-xi');
    expect(letterIdOf('Ψ')).toBe('letter-psi');
    expect(letterIdOf('ς')).toBe('letter-sigma');
    expect(letterIdOf(';')).toBeUndefined();
  });
});

describe('the evidence', () => {
  it('makes a letter solid on three right uses and no miss', () => {
    let evidence = new Map(none);
    for (let i = 1; i <= INFERRED_RIGHTS; i += 1) {
      evidence = creditForm(evidence, 'ξένος');
      expect(isInferredSolid(evidence.get('letter-xi'))).toBe(i >= INFERRED_RIGHTS);
    }
    expect(isInferredSolid(evidence.get('letter-psi'))).toBe(false);
  });

  it('counts a miss on that letter against it: the run starts again', () => {
    let evidence = creditForm(creditForm(creditForm(none, 'ξένος'), 'ξένος'), 'ξένος');
    expect(isInferredSolid(evidence.get('letter-xi'))).toBe(true);
    evidence = countMiss(evidence, ['letter-xi']);
    expect(evidence.get('letter-xi')).toEqual({ run: 0, misses: 1 });
    expect(isInferredSolid(evidence.get('letter-xi'))).toBe(false);
    expect(isInferredSolid(evidence.get('letter-nu'))).toBe(true);
  });

  it('does not change the evidence it was given', () => {
    const before = new Map(none);
    creditForm(before, 'ξένος');
    expect(before.size).toBe(0);
  });
});

describe('an answer to a question', () => {
  const ending = { kind: 'ending', ideaId: 'case-genitive', form: 'ἀρχ_', right: 'ῆς' } as const;

  it('shows the form of an ending, a tap, a stress, a syllable count and a breathing question', () => {
    expect(formOfQuestion(ending)).toBe('ἀρχῆς');
    expect(formOfQuestion({ kind: 'tap-form', form: undefined, right: 'τοῦ' })).toBe('τοῦ');
    expect(formOfQuestion({ kind: 'stress', form: 'λόγος', right: 'λο' })).toBe('λόγος');
    expect(formOfQuestion({ kind: 'letter', form: undefined, right: 'ξ' })).toBeUndefined();
  });

  it('credits the form on a right answer', () => {
    const result = inferFromAnswer(none, ending, true);
    expect(result.credited).toEqual(expect.arrayContaining(['letter-alpha', 'letter-rho', 'letter-chi', 'letter-eta', 'letter-sigma', 'accents']));
    expect(result.evidence.get('letter-rho')).toEqual({ run: 1, misses: 0 });
  });

  it('says nothing about the letters on a miss about a form', () => {
    const result = inferFromAnswer(none, ending, false);
    expect(result.evidence.size).toBe(0);
    expect(result.missed).toEqual([]);
  });

  it('counts a miss on a letter question against that letter, also when the alphabet was asked', () => {
    expect(questionFoundation({ kind: 'letter', ideaId: 'letter-xi', right: 'ξ' })).toEqual(['letter-xi']);
    expect(questionFoundation({ kind: 'sound', ideaId: 'alphabet', right: 'ψ' })).toEqual(['letter-psi']);
    expect(questionFoundation({ kind: 'letter', ideaId: 'diphthongs', right: 'αι' })).toEqual(['diphthongs']);
    expect(questionFoundation({ kind: 'stress', ideaId: 'accents', right: 'λο' })).toEqual(['accents']);
    expect(questionFoundation(ending)).toEqual([]);
    const result = inferFromAnswer(creditForm(none, 'ψαλμός'), { kind: 'sound', ideaId: 'alphabet', form: undefined, right: 'ψ' }, false);
    expect(result.evidence.get('letter-psi')).toEqual({ run: 0, misses: 1 });
  });
});

describe('the alphabet and the weak letters', () => {
  const allBut = (...ids: string[]) => new Map<string, Level>(LETTER_IDS.filter((id) => !ids.includes(id)).map((id) => [id, 'solid']));

  it('is solid when all 24 letters are', () => {
    expect(alphabetIsSolid(allBut())).toBe(true);
    expect(alphabetIsSolid(allBut('letter-xi'))).toBe(false);
    expect(alphabetIsSolid(new Map<string, Level>([...allBut(), ['letter-xi', 'frontier']]))).toBe(false);
  });

  it('lists the letters that are not solid, in alphabet order', () => {
    expect(weakLetters(allBut('letter-psi', 'letter-xi')).map((l) => l.id)).toEqual(['letter-xi', 'letter-psi']);
  });

  it('writes them for Learn next', () => {
    const named = (ids: string[]) => lettersText(weakLetters(allBut(...ids)));
    expect(named(['letter-xi'])).toBe('ξ');
    expect(named(['letter-xi', 'letter-psi'])).toBe('ξ and ψ');
    expect(named(['letter-zeta', 'letter-xi', 'letter-psi'])).toBe('ζ, ξ and ψ');
    expect(named(LETTER_IDS.slice(0, 9))).toBe('α, β, γ, δ, ε, ζ and 3 more letters');
  });
});
