// Holding a Greek word hands the phone's voice the word in lower case, never a capital: an el-GR voice reads a lone capital
// letter as "capital ..." (mw-5r3p30.226, Ὃ in 1 John 1:1 heard as 'kefalaio').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { clearBus } from '../../src/events/bus';
import { setGreekPronunciation, speak, speakLetter, speakWord, stopSpeaking } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS } from '../../src/speech/pronunciation';
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

// A Greek voice names a lone letter ('omicron'), so a word of one letter is never handed to it: it is said as its sound, the pronunciation he
// chose's respell, by the English voice (mw-5r3p30.256, Ὃ in 1 John 1:1 heard as 'omicron' after .226).
describe('holding a one-letter Greek word', () => {
  const ONE_LETTER = ['Ὃ', 'ὁ', 'ἡ', 'ὦ', 'ὃ'];
  const lastUtterance = () => synth.spoken[synth.spoken.length - 1];
  const isOneGreekLetter = (s: string) => /^\p{Script=Greek}\p{M}*$/u.test(s.normalize('NFC')) && [...s.normalize('NFD').replace(/\p{M}/gu, '')].length === 1;

  describe.each(PRONUNCIATIONS.map((p) => p.id))('in the pronunciation %s', (id) => {
    beforeEach(() => setGreekPronunciation(id));

    it.each(ONE_LETTER)('%s is never handed to a voice as a single Greek letter, but as its respell', (word) => {
      const said = heard(word);
      expect(isOneGreekLetter(said)).toBe(false);
      const sound = PRONUNCIATIONS.find((p) => p.id === id)!.respell(word.toLowerCase()).toLowerCase();
      expect(sound).not.toBe('');
      expect(said).toBe(sound);
    });

    it('is said by the English voice, not the Greek one', () => {
      act(() => void speakWord('Ὃ', 'greek'));
      expect(lastUtterance().lang.split('-')[0]).toBe('en');
      expect(lastUtterance().voice).toBe(ENGLISH_VOICE);
    });

    it('a speaker button (speak) gives the voice the same sound', () => {
      act(() => void speak('ὁ', 'speaker-1', 'greek'));
      expect(isOneGreekLetter(lastUtterance().text)).toBe(false);
    });
  });

  it('is said slowly when it is being sounded out, still as a sound', () => {
    act(() => void speakWord('ὦ', 'greek', true));
    expect(isOneGreekLetter(lastUtterance().text)).toBe(false);
  });
});

describe('a letter drill (Hold to hear a letter)', () => {
  it('names the letter in lower case with the Greek voice: the letter is the thing asked about, not a word', () => {
    act(() => void speakLetter('Ο'));
    const u = synth.spoken[synth.spoken.length - 1];
    expect(u.text).toBe('ο');
    expect(u.lang).toBe('el-GR');
  });
});
