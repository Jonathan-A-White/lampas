// The Hebrew pronunciation registry (src/speech/hebrewPronunciation.ts) and its one scheme, Israeli (src/speech/schemes/hebrew-israeli.ts): the text is spoken as
// written, pointed, to the he-IL voice, with the cantillation marks (the accents of the Masoretic text) taken off first, so a voice does not stumble on them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { DEFAULT_HEBREW_PRONUNCIATION, HEBREW_PRONUNCIATIONS, hebrewPronunciationOf, hebrewVoiceForm } from '../../src/speech/hebrewPronunciation';
import { ACCENTS as ENGLISH_ACCENTS, accentOf, missingHints } from '../../src/speech/accents';
import { DEFAULT_PRONUNCIATION, PRONUNCIATIONS, lessonsOf, pronunciationOf, pronunciationsOf, registerPronunciation, tutorGuideOf } from '../../src/speech/pronunciation';
import { hebrewRespelling } from '../../src/script/hebrewSpeech';
import { HEBREW_LETTER_IDS, HEBREW_VOWEL_IDS } from '../../src/speech/schemes/hebrew-israeli-lessons';
import { stripCantillation } from '../../src/speech/schemes/hebrew-israeli';
import { SOUND_IDS } from '../../src/speech/sounds';

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

describe('the Hebrew scheme implements the whole Pronunciation interface (mw-gdcyf98.5)', () => {
  const israeli = pronunciationOf('israeli');

  it('is in the one registry, tagged he, and found by pronunciationOf', () => {
    expect(israeli.language).toBe('he');
    expect(pronunciationsOf('he').map((p) => p.id)).toEqual(['israeli']);
    expect(pronunciationsOf('he')[0]).toBe(israeli);
    expect(pronunciationsOf('grc')).toEqual(PRONUNCIATIONS);
    expect(PRONUNCIATIONS.every((p) => p.language === 'grc')).toBe(true);
    expect(PRONUNCIATIONS.map((p) => p.id)).not.toContain('israeli');
    expect(pronunciationOf('modern').id).toBe('modern');
    expect(pronunciationOf('nowhere').id).toBe(DEFAULT_PRONUNCIATION);
    expect(DEFAULT_HEBREW_PRONUNCIATION).toBe('israeli');
  });

  it('answers every member of the interface', () => {
    expect(israeli.label).toBe('Israeli');
    expect(israeli.lang).toBe('he-IL');
    expect(israeli.scoringLang).toBe('he');
    expect(israeli.note.length).toBeGreaterThan(0);
    expect(israeli.respell('בְּרֵאשִׁית')).toBe('be-reh-SHEET');
    expect(israeli.voiceForm('בְּרֵאשִׁ֖ית')).toBe('בְּרֵאשִׁית');
    expect(israeli.letterForm('ב')).toBe('ב');
    expect(israeli.loneLetterForm('ו')).toBeNull();
    expect(israeli.loneLetterClip('ו')).toBeNull();
    expect(Object.keys(israeli.sounds).length).toBeGreaterThan(10);
    for (const id of Object.values(israeli.sounds)) expect(SOUND_IDS).toContain(id);
    for (const accent of ENGLISH_ACCENTS) expect(missingHints(israeli, accent), accent.id).toEqual([]);
    expect(Object.keys(israeli.letterNames ?? {}).sort()).toEqual([...HEBREW_LETTER_IDS].sort());
    for (const symbol of Object.keys(israeli.heardAs ?? {})) expect(israeli.sounds[symbol], symbol).toBeDefined();
    expect(tutorGuideOf(israeli)).toContain('be-reh-SHEET');
    expect(israeli.soundRules).toBeUndefined();
  });

  it('teaches a sound lesson for each of the 22 letters and the 9 vowels', () => {
    const lessons = lessonsOf(israeli);
    expect(HEBREW_LETTER_IDS).toHaveLength(22);
    expect(HEBREW_LETTER_IDS[0]).toBe('he-letter-alef');
    expect(HEBREW_LETTER_IDS[21]).toBe('he-letter-tav');
    expect(HEBREW_VOWEL_IDS).toEqual(
      ['patach', 'qamats', 'segol', 'tsere', 'hiriq', 'holam', 'qubuts', 'shuruq', 'shewa'].map((v) => `he-vowel-${v}`),
    );
    for (const id of [...HEBREW_LETTER_IDS, ...HEBREW_VOWEL_IDS]) {
      expect(lessons[id], id).toBeDefined();
      expect(lessons[id].sound?.length, id).toBeGreaterThan(0);
    }
  });

  it('names a sound through the sound words, in the reader\'s accent', () => {
    expect(lessonsOf(israeli, accentOf('american'))['he-letter-bet'].sound).toContain('b, as in “bed”');
    expect(lessonsOf(israeli, accentOf('american'))['he-letter-bet'].sound).toContain('v, as in “vase”');
    expect(lessonsOf(israeli, accentOf('american'))['he-vowel-hiriq'].sound).toContain('ee, as in “see”');
  });

  it('is handed to the registry as a Greek scheme\'s is: registerPronunciation files a Hebrew scheme under he', () => {
    const extra = { ...israeli, id: 'academic-test', label: 'Academic' };
    const undo = registerPronunciation(extra);
    expect(pronunciationsOf('he').map((p) => p.id)).toEqual(['israeli', 'academic-test']);
    expect(PRONUNCIATIONS.map((p) => p.id)).toEqual(['modern']);
    expect(pronunciationOf('academic-test')).toBe(extra);
    undo();
    expect(pronunciationsOf('he').map((p) => p.id)).toEqual(['israeli']);
  });
});

describe('hebrewRespelling', () => {
  it('is the default Hebrew scheme\'s respelling, with the data\'s transliteration as its guide', () => {
    expect(hebrewRespelling('בְּרֵאשִׁ֖ית')).toBe('be-reh-SHEET');
    expect(hebrewRespelling('לְאָכְלָֽה׃', 'lə·’āḵ·lāh')).toBe('le-okh-LA');
  });
});
