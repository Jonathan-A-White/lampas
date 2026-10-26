// The Hebrew pronunciation registry (src/speech/hebrewPronunciation.ts) and its one scheme, Israeli (src/speech/schemes/hebrew-israeli.ts): the text is spoken as
// written, pointed, to the he-IL voice, with the cantillation marks (the accents of the Masoretic text) taken off first, so a voice does not stumble on them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { DEFAULT_HEBREW_PRONUNCIATION, HEBREW_PRONUNCIATIONS, hebrewPronunciationOf, hebrewVoiceForm } from '../../src/speech/hebrewPronunciation';
import { stripCantillation } from '../../src/speech/schemes/hebrew-israeli';

const genesis1 = JSON.parse(readFileSync('tests/fixtures/data/gen/1.json', 'utf8')) as Chapter;

const code = (c: string): number => c.codePointAt(0) as number;
/** The cantillation marks: U+0591 to U+05AF, the meteg U+05BD, the rafe U+05BF, the paseq U+05C0, the sof pasuq U+05C3 and the two dots U+05C4, U+05C5 and the nun hafukha U+05C6. */
const ACCENTS: number[] = [
  ...Array.from({ length: 0x05af - 0x0591 + 1 }, (_, i) => 0x0591 + i),
  0x05bd,
  0x05bf,
  0x05c0,
  0x05c3,
  0x05c4,
  0x05c5,
  0x05c6,
];
/** The vowel points and the marks that make a letter another: U+05B0 to U+05BC (the sheva to the dagesh), the maqaf U+05BE, the shin and sin dots U+05C1, U+05C2 and the qamats qatan U+05C7 (a vowel, not an accent). */
const KEPT: number[] = [...Array.from({ length: 0x05bc - 0x05b0 + 1 }, (_, i) => 0x05b0 + i), 0x05be, 0x05c1, 0x05c2, 0x05c7];

describe('the Hebrew pronunciation registry', () => {
  it('holds one scheme, Israeli, spoken in the he-IL voice', () => {
    expect(HEBREW_PRONUNCIATIONS.map((p) => p.id)).toEqual(['israeli']);
    const israeli = hebrewPronunciationOf('israeli');
    expect(israeli.label).toBe('Israeli');
    expect(israeli.lang).toBe('he-IL');
    expect(DEFAULT_HEBREW_PRONUNCIATION).toBe('israeli');
  });

  it('falls back to the default for an id it does not hold, and for none', () => {
    expect(hebrewPronunciationOf('nowhere').id).toBe('israeli');
    expect(hebrewPronunciationOf().id).toBe('israeli');
  });

  it('hands the voice the text with the accents off (hebrewVoiceForm is the chosen scheme\'s voiceForm)', () => {
    expect(hebrewVoiceForm('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית');
    expect(hebrewPronunciationOf('israeli').voiceForm('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית');
  });
});

describe('stripCantillation', () => {
  it('removes every accent it lists', () => {
    for (const mark of ACCENTS) {
      const out = stripCantillation(`אב${String.fromCodePoint(mark)}ג`);
      expect(out, `U+${mark.toString(16).toUpperCase().padStart(4, '0')}`).toBe('אבג');
    }
  });

  it('keeps every vowel point and the letters themselves', () => {
    for (const mark of KEPT) {
      const word = `אב${String.fromCodePoint(mark)}ג`;
      expect(stripCantillation(word), `U+${mark.toString(16).toUpperCase().padStart(4, '0')}`).toBe(word);
    }
  });

  it('turns בְּרֵאשִׁ֖ית into the same word without its tipcha', () => {
    expect(stripCantillation('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית');
    expect(stripCantillation('הָאָֽרֶץ׃')).toBe('הָאָרֶץ');
  });

  it('on the whole of Genesis 1 leaves no accent and loses no vowel point', () => {
    const text = genesis1.verses.flatMap((v) => v.g.map((w) => w.t)).join(' ');
    const out = stripCantillation(text);
    const marks = (s: string, set: number[]): number => [...s].filter((c) => set.includes(code(c))).length;
    expect(marks(text, ACCENTS)).toBeGreaterThan(300);
    expect(marks(out, ACCENTS)).toBe(0);
    expect(marks(out, KEPT)).toBe(marks(text, KEPT));
    expect([...out].filter((c) => /\p{L}/u.test(c))).toEqual([...text].filter((c) => /\p{L}/u.test(c)));
  });

  it('leaves English and Greek alone', () => {
    expect(stripCantillation('In the beginning λόγος')).toBe('In the beginning λόγος');
  });
});
