// What the Say it matcher accepts (mw-86e9r1.12): a letter heard as its name or its sound, as the chosen pronunciation says them, and nothing else.
import { describe, expect, it } from 'vitest';
import { acceptedSayings, letterHeard } from '../../src/data/grammar/sayIt';
import { itemsOf } from '../../src/data/grammar/ladder';

const LETTERS = itemsOf('alphabet');

describe('the Say it matcher (Modern Greek)', () => {
  it('has 24 letters to say', () => {
    expect(LETTERS).toHaveLength(24);
  });

  it("accepts the English name and the sound of beta, and Modern Greek's name for it", () => {
    for (const heard of ['beta', 'Beta', 'beta.', 'v', 'V', 'vee', 'vita', 'veeta', "it's beta", 'the letter v']) {
      expect(letterHeard(heard, 'letter-beta'), heard).toBe(true);
    }
  });

  it('rejects what is not beta: another letter, the English b, nothing, a sentence', () => {
    for (const heard of ['delta', 'alpha', 'b', 'bee', '', '   ', 'beta delta', 'I do not know', 'gamma']) {
      expect(letterHeard(heard, 'letter-beta'), heard).toBe(false);
    }
  });

  it('accepts every variant of each letter and rejects every variant that belongs only to other letters', () => {
    const variants = new Map(LETTERS.map((l) => [l.id, acceptedSayings(l.id)]));
    for (const letter of LETTERS) {
      const own = variants.get(letter.id)!;
      expect(own.length, letter.id).toBeGreaterThanOrEqual(2);
      for (const heard of own) expect(letterHeard(heard, letter.id), `${letter.id} hears ${heard}`).toBe(true);
      const others = LETTERS.filter((o) => o.id !== letter.id).flatMap((o) => variants.get(o.id)!);
      for (const heard of others.filter((h) => !own.includes(h))) expect(letterHeard(heard, letter.id), `${letter.id} hears ${heard}`).toBe(false);
    }
  });

  it('keeps the English name of every letter among its variants', () => {
    for (const letter of LETTERS) expect(acceptedSayings(letter.id)).toContain(letter.title.toLowerCase());
  });

  it('knows no sayings for what is not a letter', () => {
    expect(acceptedSayings('alphabet')).toEqual([]);
    expect(letterHeard('alpha', 'alphabet')).toBe(false);
  });
});
