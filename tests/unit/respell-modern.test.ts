import { describe, expect, it } from 'vitest';
import { respellModern } from '../../src/speech/schemes/modern';

describe('Modern Greek respelling', () => {
  it.each([
    ['χριστῷ', 'hree-STO'],
    ['ἐντολή', 'en-do-LEE'],
    ['ἄγγελος', 'AN-ge-los'],
    ['Ἰσραήλ', 'eez-ra-EEL'],
    ['πνεῦμα', 'PNEV-ma'],
    ['εὐαγγέλιον', 'ev-an-GHE-lee-on'],
    ['ἐλέγχω', 'e-LENG-kho'],
  ])('%s is %s (the story\'s examples)', (greek, want) => {
    expect(respellModern(greek)).toBe(want);
  });

  it.each([
    ['μπ', 'ἀμπελών', 'am-be-LON'],
    ['ντ at the start of a word is d', 'ντομάτα', 'do-MA-ta'],
    ['μπ at the start of a word is b', 'μπαμπάς', 'bam-BAS'],
    ['γκ', 'ἐγκρατής', 'en-gra-TEES'],
    ['γξ', 'σφίγξ', 'sfeenks'],
    ['ευ before μ', 'πνευματικός', 'pnev-ma-tee-KOS'],
    ['σμ', 'ἀσμένως', 'az-ME-nos'],
    ['σβ', 'ἀσβέστῳ', 'az-VE-sto'],
    ['γ before a back vowel is gh', 'ἀγάπη', 'a-GHA-pee'],
    ['γ before a front vowel is y', 'γένος', 'YE-nos'],
    ['γ before a consonant is gh', 'γνῶσις', 'GHNO-sees'],
    ['χ before a back vowel is kh', 'χάρις', 'KHA-rees'],
    ['χ before a front vowel is h', 'χειρί', 'hee-REE'],
    ['αι', 'καί', 'ke'],
    ['ει', 'εἰς', 'ees'],
    ['οι', 'οἱ', 'ee'],
    ['ου', 'οὐ', 'oo'],
    ['ου in a longer word', 'οὐρανός', 'oo-ra-NOS'],
    ['αυ before a voiceless consonant is af', 'αὐτός', 'af-TOS'],
    ['αυ before a voiced consonant is av', 'αὐλή', 'av-LEE'],
    ['ευ before a voiced consonant is ev', 'εὐλογία', 'ev-lo-YEE-a'],
    ['a diaeresis splits the pair', 'Ἠσαΐας', 'ee-sa-EE-as'],
    ['a final sigma', 'λόγος', 'LO-ghos'],
    ['doubled consonants are one', 'ἀλλά', 'a-LA'],
    ['an elision mark is silent', "ἀλλ'", 'al'],
    ['a lone elided consonant', "δ'", 'dh'],
    ['an unmarked word has no capitals', 'ἐν', 'en'],
    ['a word with one vowel group is not capitalised twice', 'ὁ', 'o'],
  ])('%s: %s -> %s', (_why, greek, want) => {
    expect(respellModern(greek)).toBe(want);
  });

  it('ignores breathing marks and the iota under a letter', () => {
    expect(respellModern('ᾅδης')).toBe(respellModern('ἅδης'));
    expect(respellModern('τῇ')).toBe('tee');
  });

  it('gives nothing for nothing', () => {
    expect(respellModern('')).toBe('');
  });
});
