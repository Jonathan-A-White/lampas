// Holding a Greek word hands the phone's voice the word in lower case, never a capital: an el-GR voice reads a lone capital
// letter as "capital ..." (mw-5r3p30.226, Ὃ in 1 John 1:1 heard as 'kefalaio').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { clearBus } from '../../src/events/bus';
import { setGreekPronunciation, speak, speakLetter, speakWord, stopSpeaking } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, pronunciationOf, registerPronunciation } from '../../src/speech/pronunciation';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopSpeaking());
  setGreekPronunciation(DEFAULT_PRONUNCIATION);
  vi.unstubAllGlobals();
});

const heard = (word: string): string => {
  act(() => void speakWord(word, 'greek'));
  const said = synth.spoken[synth.spoken.length - 1].text;
  act(() => stopSpeaking());
  return said;
};
const hasCapital = (s: string) => s !== s.toLowerCase();

describe('holding a Greek word', () => {
  it.each([
    ['Ὃ', 'U+1F4B, capital omicron with dasia and varia'],
    ['Ἐν', 'a capitalised word of two letters'],
    ['ὁ', 'a lower-case one-letter word'],
  ])('passes the voice no capital letter: %s (%s)', (word) => {
    expect(hasCapital(heard(word))).toBe(false);
  });

  it('words of two letters or more are handed to the Greek voice in lower case', () => {
    expect(heard('Ἐν')).toBe('ἐν');
    expect(heard('οὐ')).toBe('οὐ');
  });

  it('every other word is unchanged but for case', () => {
    expect(heard('Ἐν')).toBe('ἐν');
    expect(heard('Ἰησοῦς')).toBe('ἰησοῦς');
    expect(heard('λόγος')).toBe('λόγος');
  });

  it('a speaker button (speak) gives the voice the same lower-case form', () => {
    act(() => void speak('Ἰησοῦς', 'speaker-1', 'greek'));
    expect(synth.spoken[synth.spoken.length - 1].text).toBe('ἰησοῦς');
  });

  it('leaves English as it is', () => {
    act(() => void speakWord('Grace', 'english'));
    expect(synth.spoken[synth.spoken.length - 1].text).toBe('Grace');
  });
});

// A voice handed a bare Greek letter names it ('omicron'), so a word of one letter goes to the GREEK voice in the form the pronunciation he chose
// gives a word of one letter (its loneLetter; Modern Greek's is the stressed vowel, ό): never the bare letter, never the English voice
// (mw-5r3p30.262: mw-5r3p30.256 had sent the respell 'o' to the English voice, and he heard an English voice in a lesson's example).
describe('holding a one-letter Greek word', () => {
  const ONE_LETTER = ['Ὃ', 'ὁ', 'ἡ', 'ὦ', 'ὃ'];
  const lastUtterance = () => synth.spoken[synth.spoken.length - 1];
  const isBareLetter = (s: string) => [...s].length === 1 && s.normalize('NFD') === s.normalize('NFD').replace(/\p{M}/gu, '');

  describe.each(PRONUNCIATIONS.map((p) => p.id))('in the pronunciation %s', (id) => {
    beforeEach(() => setGreekPronunciation(id));

    it.each(ONE_LETTER)("%s is handed to the Greek voice in the scheme's form for a word of one letter, never as a bare letter", (word) => {
      const said = heard(word);
      expect(said).not.toBe('');
      expect(said).toBe(pronunciationOf(id).loneLetter(word));
      expect(isBareLetter(said)).toBe(false);
    });

    it('is said by the Greek voice, not the English one', () => {
      act(() => void speakWord('Ὃ', 'greek'));
      expect(lastUtterance().lang).toBe('el-GR');
      expect(lastUtterance().voice).toBe(GREEK_VOICE);
    });

    it('a speaker button (speak) gives the Greek voice the same form', () => {
      act(() => void speak('ὁ', 'speaker-1', 'greek'));
      expect(lastUtterance().text).toBe(pronunciationOf(id).loneLetter('ὁ'));
      expect(lastUtterance().voice).toBe(GREEK_VOICE);
    });
  });

  it.each([
    ['Ὃ', 'ό'],
    ['ὃ', 'ό'],
    ['ὁ', 'ό'],
    ['ἡ', 'ή'],
    ['ὦ', 'ώ'],
  ])('in Modern Greek %s is handed over as the stressed vowel %s, with no breathing', (word, form) => {
    expect(heard(word)).toBe(form.normalize('NFC'));
  });

  it('follows the scheme: with a second scheme chosen, its own form is handed to the Greek voice', () => {
    const unregister = registerPronunciation({
      id: 'stub-erasmian',
      label: 'Stub',
      lang: 'el-GR',
      scoringLang: 'el',
      note: '',
      respell: (w) => w,
      keyWords: {},
      loneLetter: (w) => `[${w.toLowerCase()}]`,
    });
    try {
      setGreekPronunciation('stub-erasmian');
      expect(heard('Ὃ')).toBe('[ὃ]');
      expect(heard('λόγος')).toBe('λόγος');
      setGreekPronunciation(DEFAULT_PRONUNCIATION);
      expect(heard('Ὃ')).toBe('ό');
    } finally {
      unregister();
    }
  });

  it('is said slowly when it is being sounded out, still in its form', () => {
    act(() => void speakWord('ὦ', 'greek', true));
    expect(isBareLetter(lastUtterance().text)).toBe(false);
    expect(lastUtterance().voice).toBe(GREEK_VOICE);
  });
});

describe('a letter drill (Tap to hear a letter)', () => {
  it('names the letter in lower case with the Greek voice: the letter is the thing asked about, not a word', () => {
    act(() => void speakLetter('Ο'));
    const u = synth.spoken[synth.spoken.length - 1];
    expect(u.text).toBe('ο');
    expect(u.lang).toBe('el-GR');
  });
});
