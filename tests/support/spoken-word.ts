// What is heard for a Greek word said alone. Any word of two letters or more goes to the Greek voice in lower case (mw-5r3p30.226); a word of ONE letter
// is never handed to a voice, which would name the letter ('omicron'): the chosen pronunciation's clip of its sound plays (mw-5r3p30.347). Written out here,
// not imported from src/speech/greek.ts, so the steps check the rule and do not repeat it. The Quick test's first word is often ὁ, so its steps hear either.
import { expect } from 'vitest';
import { chosenPronunciation } from '../../src/speech/greek';
import type { FakeAudio } from './fake-audio';
import type { FakeSynth } from './fake-speech';

/** One letter, whatever marks it carries (ὁ, Ὃ, ἡ). */
export const isOneLetter = (word: string): boolean => [...word.normalize('NFD').replace(/\p{M}/gu, '')].length === 1;

export const asSpoken = (word: string): string => {
  if (isOneLetter(word)) throw new Error(`${word} is one letter: it is played as a clip, not spoken (mw-5r3p30.347)`);
  return word.toLowerCase();
};

/** A word said alone, heard either way: by the Greek voice, or (one letter) as its clip. */
export interface Hearing {
  /** it was heard once: the voice handed it once with `lang`, or its clip played once and the voice handed nothing */
  once(word: string, lang: string): void;
  /** it is sounding now */
  sounding(): boolean;
  /** what sounds runs to its end by itself */
  end(): void;
  /** it was stopped before its end */
  stopped(): void;
}

export function hearing(synth: FakeSynth, audio: FakeAudio, word: () => string): Hearing {
  const clip = () => isOneLetter(word());
  return {
    once(text, lang) {
      if (isOneLetter(text)) {
        expect(audio.played).toEqual([chosenPronunciation().loneLetterClip(text)]);
        expect(synth.spoken).toEqual([]);
        return;
      }
      expect(synth.spoken).toHaveLength(1);
      expect(synth.spoken[0].text).toBe(asSpoken(text));
      expect(synth.spoken[0].lang).toBe(lang);
    },
    sounding: () => (clip() ? audio.playing() !== null : synth.speaking),
    end: () => (clip() ? audio.end() : synth.finish()),
    stopped() {
      if (clip()) {
        expect(audio.played).toHaveLength(1);
        expect(audio.playing()).toBeNull();
        return;
      }
      expect(synth.speaking).toBe(false);
      expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
      expect(synth.spoken).toHaveLength(1);
    },
  };
}
