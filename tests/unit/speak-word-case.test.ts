// Holding a Greek word hands the phone's voice the word in lower case, never a capital: an el-GR voice reads a lone capital
// letter as "capital ..." (mw-5r3p30.226, Ὃ in 1 John 1:1 heard as 'kefalaio').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { clearBus } from '../../src/events/bus';
import { speak, speakWord, stopSpeaking } from '../../src/speech/greek';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../support/fake-speech';

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
});
afterEach(() => {
  act(() => stopSpeaking());
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

  it('one-letter rule: a word of one letter is said as its bare vowel, marks and breathing taken off', () => {
    expect(heard('Ὃ')).toBe('ο');
    expect(heard('ὁ')).toBe('ο');
    expect(heard('ἡ')).toBe('η');
    expect(heard('ὦ')).toBe('ω');
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
