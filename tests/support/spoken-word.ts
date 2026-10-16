// What is heard for a Greek word said alone (the rule itself is written out in ./lone-word.ts: a word of one letter as its bare vowel doubled, any other in
// lower case, monotonic marks and '!'). The Quick test's first word is often ὁ, so its steps hear either.
import { expect } from 'vitest';
import type { FakeAudio } from './fake-audio';
import type { FakeSynth } from './fake-speech';
import { asSpoken } from './lone-word';

export { asSpoken, isOneLetter } from './lone-word';

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
