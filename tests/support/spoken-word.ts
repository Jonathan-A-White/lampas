// What is heard for a Greek word said alone. Any word of two letters or more goes to the Greek voice in lower case (mw-5r3p30.226); a word of ONE letter
// would be named by the voice ('omicron'), so it goes to the Greek voice as its bare vowel doubled ('οο' for ὁ), which his phone's Greek voice says as the
// sound (mw-5r3p30.421, his pick on the listening trial; the clip of mw-5r3p30.347 plays only on a phone with no Greek voice). Written out here, not
// imported from src/speech/, so the steps check the rule and do not repeat it. The Quick test's first word is often ὁ, so its steps hear either.
import { expect } from 'vitest';
import type { FakeAudio } from './fake-audio';
import type { FakeSynth } from './fake-speech';

const bare = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '');

/** One letter, whatever marks it carries (ὁ, Ὃ, ἡ). */
export const isOneLetter = (word: string): boolean => [...bare(word)].length === 1;

/** What the Greek voice is handed for `word` said alone: lower case, and a word of one letter (a vowel) its bare letter doubled. */
export const asSpoken = (word: string): string => {
  const lower = word.toLowerCase();
  return isOneLetter(word) ? bare(lower).repeat(2) : lower;
};

/** A word said alone, heard by the Greek voice. */
export interface Hearing {
  /** it was heard once: the voice handed it once with `lang`, and no clip played */
  once(word: string, lang: string): void;
  /** it is sounding now */
  sounding(): boolean;
  /** what sounds runs to its end by itself */
  end(): void;
  /** it was stopped before its end */
  stopped(): void;
}

export function hearing(synth: FakeSynth, audio: FakeAudio): Hearing {
  return {
    once(text, lang) {
      expect(synth.spoken).toHaveLength(1);
      expect(synth.spoken[0].text).toBe(asSpoken(text));
      expect(synth.spoken[0].lang).toBe(lang);
      expect(audio.played).toEqual([]);
    },
    sounding: () => synth.speaking,
    end: () => synth.finish(),
    stopped() {
      expect(synth.speaking).toBe(false);
      expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
      expect(synth.spoken).toHaveLength(1);
    },
  };
}
