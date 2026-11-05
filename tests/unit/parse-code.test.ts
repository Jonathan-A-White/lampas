import { describe, expect, it } from 'vitest';
import { decodeParse, parseSegments, splitParse } from '../../src/data/parseCode';

describe('decodeParse: Robinson RP codes in plain words', () => {
  it.each([
    ['N-NSM', 'noun, nominative singular masculine'],
    ['N-GSF', 'noun, genitive singular feminine'],
    ['V-PAI-3S', 'verb, present active indicative, 3rd person singular'],
    ['V-AAI-3S', 'verb, aorist active indicative, 3rd person singular'],
    ['V-PAP-DPM', 'verb, present active participle, dative plural masculine'],
    ['V-PPI-1P', 'verb, present passive indicative, 1st person plural'],
    ['T-DPM', 'article, dative plural masculine'],
    ['PREP', 'preposition'],
    ['CONJ', 'conjunction'],
    ['PRT', 'particle'],
    ['ADV', 'adverb'],
    ['A-NSM', 'adjective, nominative singular masculine'],
    ['P-GP', 'personal pronoun, genitive plural'],
    ['R-NSM', 'relative pronoun, nominative singular masculine'],
  ])('%s is %s', (code, words) => {
    expect(decodeParse(code)).toBe(words);
  });

  it('decodes the other tenses, voices and moods a verb can carry', () => {
    expect(decodeParse('V-2AAI-3S')).toBe('verb, second aorist active indicative, 3rd person singular');
    expect(decodeParse('V-IMI-3P')).toBe('verb, imperfect middle indicative, 3rd person plural');
    expect(decodeParse('V-FDI-1S')).toBe('verb, future middle deponent indicative, 1st person singular');
    expect(decodeParse('V-RPI-2S')).toBe('verb, perfect passive indicative, 2nd person singular');
    expect(decodeParse('V-LAI-3S')).toBe('verb, pluperfect active indicative, 3rd person singular');
    expect(decodeParse('V-AOM-2S')).toBe('verb, aorist passive deponent imperative, 2nd person singular');
    expect(decodeParse('V-PES-3S')).toBe('verb, present middle or passive subjunctive, 3rd person singular');
    expect(decodeParse('V-AAO-3S')).toBe('verb, aorist active optative, 3rd person singular');
    expect(decodeParse('V-AAN')).toBe('verb, aorist active infinitive');
    expect(decodeParse('V-APP-NSF')).toBe('verb, aorist passive participle, nominative singular feminine');
  });

  it('decodes the pronouns, with person where the code has one', () => {
    expect(decodeParse('P-1NS')).toBe('personal pronoun, 1st person nominative singular');
    expect(decodeParse('P-ASF')).toBe('personal pronoun, accusative singular feminine');
    expect(decodeParse('F-3ASM')).toBe('reflexive pronoun, 3rd person accusative singular masculine');
    expect(decodeParse('S-1SGSF')).toBe('possessive pronoun, 1st person singular possessor, genitive singular feminine');
    expect(decodeParse('D-NSN')).toBe('demonstrative pronoun, nominative singular neuter');
    expect(decodeParse('I-ASN')).toBe('interrogative pronoun, accusative singular neuter');
    expect(decodeParse('X-DPM')).toBe('indefinite pronoun, dative plural masculine');
    expect(decodeParse('C-GPM')).toBe('reciprocal pronoun, genitive plural masculine');
    expect(decodeParse('K-NSM')).toBe('correlative pronoun, nominative singular masculine');
    expect(decodeParse('Q-NSN')).toBe('correlative or interrogative pronoun, nominative singular neuter');
  });

  it('decodes the words with no inflection and the suffixes', () => {
    expect(decodeParse('COND')).toBe('conditional');
    expect(decodeParse('INJ')).toBe('interjection');
    expect(decodeParse('PRT-N')).toBe('particle, negative');
    expect(decodeParse('PRT-I')).toBe('particle, interrogative');
    expect(decodeParse('ADV-C')).toBe('adverb, comparative');
    expect(decodeParse('A-NSM-S')).toBe('adjective, nominative singular masculine, superlative');
    expect(decodeParse('V-AOI-3S-ATT')).toBe('verb, aorist passive deponent indicative, 3rd person singular, Attic form');
    expect(decodeParse('N-PRI')).toBe('noun, proper name, indeclinable');
    expect(decodeParse('N-LI')).toBe('noun, letter, indeclinable');
    expect(decodeParse('N-OI')).toBe('noun, indeclinable');
    expect(decodeParse('A-NUI')).toBe('adjective, numeral, indeclinable');
    expect(decodeParse('N-VSM')).toBe('noun, vocative singular masculine');
    expect(decodeParse('ARAM')).toBe('Aramaic word');
    expect(decodeParse('HEB')).toBe('Hebrew word');
  });

  it('refuses a code it does not know, rather than guessing', () => {
    expect(() => decodeParse('Z-NSM')).toThrow(/Z-NSM/);
    expect(() => decodeParse('V-XYZ-3S')).toThrow(/V-XYZ-3S/);
    expect(() => decodeParse('')).toThrow();
  });
});

// mw-u2w5klk.272: TAGNT writes a crasis (κἀγώ, 'and I') and a joined particle (οὐκέτι, 'not still') as two parts, 'P-1NS + G2532', and readTagnt keeps the second as a bare Strong's number.
describe('a parsing of two parts joined by " + "', () => {
  it('puts both parts in words: the form\'s parsing, then the word joined to it', () => {
    expect(decodeParse('P-1NS + G2532')).toBe('personal pronoun, 1st person nominative singular, joined to "and"');
    expect(decodeParse('P-1AS + G2532')).toBe('personal pronoun, 1st person accusative singular, joined to "and"');
    expect(decodeParse('PRT-N + G2089')).toBe('particle, negative, joined to "still"');
  });

  it('puts every ' + "' + '" + ' class of the New Testament in words (the sweep of mw-u2w5klk.272)', () => {
    for (const code of ['P-1DS + G2532', 'D-NPM + G2532', 'PRT-N + G4218', 'CONJ + G1565', 'CONJ + G1437', 'CONJ + G1564', 'CONJ + G1563', 'COND + G4007', 'CONJ + G5101', 'CONJ + G5104', 'PREP + G1537', 'PREP + G4057', 'PREP + G3029', 'PRT-N + G4452', 'A-NUI + G3638', 'A-NUI + G5064', 'PRT + G4225', 'PREP + G4521', 'PREP + G4155', 'PREP + G2955', 'PREP + G0826', 'ADV + G3461']) {
      expect(decodeParse(code), code).toMatch(/, joined to "[^"]+"$/);
    }
  });

  it('refuses a joined word it does not know, and a part that is not a Strong\'s number', () => {
    expect(() => decodeParse('P-1NS + G9999')).toThrow(/G9999/);
    expect(() => decodeParse('P-1NS + CONJ')).toThrow(/CONJ/);
    expect(() => decodeParse('Z-1NS + G2532')).toThrow(/Z-1NS/);
  });

  it('is split for the drill by its first part', () => {
    expect(splitParse('P-1NS + G2532')).toEqual(splitParse('P-1NS'));
    expect(splitParse('PRT-N + G2089')).toEqual(splitParse('PRT-N'));
  });
});

describe('parseSegments by the language of the chapter (mw-5vvlay.2)', () => {
  it('cuts a Greek parsing into its grammar terms, as it always did', () => {
    const segments = parseSegments(decodeParse('V-PAI-3S'));
    expect(segments.filter((s) => s.term).map((s) => s.term)).toEqual(['verb', 'present', 'active', 'indicative', '3rd person', 'singular']);
    expect(parseSegments(decodeParse('V-PAI-3S'), 'grc')).toEqual(segments);
  });

  it('cuts a Hebrew parsing, as the chapter\'s parse map decodes it, at the Hebrew table\'s terms (mw-gdcyf98.20): each a link to the Grammar sheet', () => {
    const decoded = 'Verb - Qal - Perfect - third person masculine singular';
    const segments = parseSegments(decoded, 'hbo');
    expect(segments.filter((s) => s.term).map((s) => s.term)).toEqual(['Verb', 'Qal', 'Perfect', 'third person', 'masculine', 'singular']);
    expect(segments.map((s) => s.text).join('')).toBe(decoded);
    expect(parseSegments('', 'hbo')).toEqual([]);
  });
});
