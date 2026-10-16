// Holding a Greek word hands the phone's voice the word in lower case, never a capital: an el-GR voice reads a lone capital
// letter as "capital ..." (mw-5r3p30.226, Ὃ in 1 John 1:1 heard as 'kefalaio').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { clearBus } from '../../src/events/bus';
import { setGreekPronunciation, speak, speakLetter, speakWord, stopSpeaking } from '../../src/speech/greek';
import { DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
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
    ['Ὅτι', 'a capitalised word with a breathing and an accent'],
    ['Ἐν', 'a capitalised word of two letters'],
    ['Ὧν', 'U+1F6F, capital omega with dasia and perispomeni, in a word of two letters'],
  ])('passes the voice no capital letter: %s (%s)', (word) => {
    expect(hasCapital(heard(word))).toBe(false);
  });

  it('words of two letters or more are handed to the Greek voice in lower case (in monotonic marks, with \'!\', mw-5r3p30.357)', () => {
    expect(heard('Ἐν')).toBe('εν!');
    expect(heard('οὐ')).toBe('ου!');
  });

  it('every other word is unchanged but for case, its marks made monotonic and the lone word\'s \'!\'', () => {
    expect(heard('Ἐν')).toBe('εν!');
    expect(heard('Ἰησοῦς')).toBe('ιησούς!'.normalize('NFC'));
    expect(heard('λόγος')).toBe('λόγος!');
  });

  it('a speaker button (speak) gives the voice the same lower-case form', () => {
    act(() => void speak('Ἰησοῦς', 'speaker-1', 'greek'));
    expect(synth.spoken[synth.spoken.length - 1].text).toBe('ιησούς!'.normalize('NFC'));
  });

  it('leaves English as it is', () => {
    act(() => void speakWord('Grace', 'english'));
    expect(synth.spoken[synth.spoken.length - 1].text).toBe('Grace');
  });
});

// A word of ONE letter (Ὃ, ὁ) reaches the voice as its vowel doubled in lower case, 'οο', which the phone says as the sound (mw-5r3p30.421,
// tests/unit/lone-letter-voice.test.ts, which holds that the speech port is never handed the letter alone).

describe('a letter named (a teach tile)', () => {
  it('names the letter in lower case with the Greek voice: the letter is the thing shown, not a word', () => {
    act(() => void speakLetter('Ο'));
    const u = synth.spoken[synth.spoken.length - 1];
    expect(u.text).toBe('ο');
    expect(u.lang).toBe('el-GR');
  });
});
