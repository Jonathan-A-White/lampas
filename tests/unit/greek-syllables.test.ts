// mw-5r3p30.241: the syllables the tutor lists for a sound question are checked by the app before they are read aloud: joined they spell the word,
// and no boundary falls inside a diphthong; otherwise the app's own syllabifier cuts the word.
import { describe, expect, it } from 'vitest';
import { checkedSyllables, greekSyllables, splitsDiphthong } from '../../src/speech/greekSyllables';

describe('greekSyllables', () => {
  it.each([
    ['ταῦτα', ['ταῦ', 'τα']],
    ['συνεργεῖ', ['συ', 'νερ', 'γεῖ']],
    ['εὐαγγέλιον', ['εὐ', 'αγ', 'γέ', 'λι', 'ον']],
    ['λόγος', ['λό', 'γος']],
    ['Χριστῷ', ['Χρι', 'στῷ']],
    ['ἀγαπῶσιν', ['ἀ', 'γα', 'πῶ', 'σιν']],
    ['οὐρανός', ['οὐ', 'ρα', 'νός']],
    ['Ἰησοῦ', ['Ἰ', 'η', 'σοῦ']],
    ['πνεῦμα', ['πνεῦ', 'μα']],
    ['προϊόν', ['προ', 'ϊ', 'όν']],
  ])('cuts %s into %j, keeping every diphthong whole and every mark where it was', (word, expected) => {
    expect(greekSyllables(word).map((s) => s.normalize('NFC'))).toEqual(expected.map((s) => s.normalize('NFC')));
  });
});

describe('splitsDiphthong', () => {
  it('is true when a boundary falls inside αυ, ευ, ηυ, ου, αι, ει, οι or υι', () => {
    for (const [a, b] of [['τα', 'υτα'], ['ε', 'υαγγελιον'], ['η', 'υ'], ['ο', 'υρανος'], ['κα', 'ι'], ['λε', 'ι'], ['ο', 'ι'], ['υ', 'ι']]) {
      expect(splitsDiphthong([a, b]), `${a}|${b}`).toBe(true);
    }
  });

  it('is false for a diphthong kept whole, for a split vowel pair that is no diphthong, and for a diaeresis', () => {
    expect(splitsDiphthong(['ταυ', 'τα'])).toBe(false);
    expect(splitsDiphthong(['κα', 'ο'])).toBe(false);
    expect(splitsDiphthong(['προ', 'ϊ', 'όν'])).toBe(false);
    expect(splitsDiphthong(['προ', 'ι'.normalize('NFD') + '̈'])).toBe(false);
  });
});

describe('checkedSyllables', () => {
  it('reads ταῦτα given as τα, ῦ, τα as ταῦ, τα', () => {
    expect(checkedSyllables('ταῦτα', ['τα', 'ῦ', 'τα']).map((s) => s.normalize('NFC'))).toEqual(['ταῦ', 'τα']);
  });

  it('keeps the answer when it spells the word and splits no diphthong', () => {
    const answer = ['συν', 'ερ', 'γεῖ'];
    expect(checkedSyllables('συνεργεῖ', answer)).toBe(answer);
    expect(checkedSyllables('ταῦτα', ['ταῦ', 'τα'])).toEqual(['ταῦ', 'τα']);
  });

  it('cuts the word itself when the answer does not spell it', () => {
    expect(checkedSyllables('ταῦτα', ['taf', 'ta']).map((s) => s.normalize('NFC'))).toEqual(['ταῦ', 'τα']);
    expect(checkedSyllables('ταῦτα', []).map((s) => s.normalize('NFC'))).toEqual(['ταῦ', 'τα']);
  });

  it('joins pieces that differ only by letter case or accents form (NFC against NFD)', () => {
    const answer = ['ταῦ'.normalize('NFD'), 'τα'];
    expect(checkedSyllables('ταῦτα', answer)).toBe(answer);
  });
});
