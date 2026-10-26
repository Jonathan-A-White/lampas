// src/speech/schemes/hebrew-israeli.ts — the one Hebrew pronunciation (mw-5vvlay.1): modern Israeli. The text is spoken as written, pointed, to the phone's he-IL voice,
// which says the points as modern Hebrew does; the cantillation marks (the accents of the Masoretic text, which a voice has no sound for) are taken off first so it does not stumble on them.
import { HEBREW_LANG } from '../languages';
import type { HebrewPronunciation } from '../hebrewPronunciation';

/** The cantillation marks: the accents U+0591 to U+05AF, the meteg U+05BD, the rafe U+05BF, the paseq U+05C0, the sof pasuq U+05C3 and the upper and lower dots U+05C4 and U+05C5 and the
 * nun hafukha U+05C6. Not U+05C7, the qamats qatan, which is a vowel; nor the vowel points U+05B0 to U+05BB, the dagesh U+05BC, the maqaf U+05BE and the shin and sin dots U+05C1 and U+05C2. */
const CANTILLATION = /[֑-ֽֿ֯׀׃-׆]/gu;

/** `text` without its cantillation marks: the letters, the vowel points and everything that is not Hebrew stay as they are. */
export const stripCantillation = (text: string): string => text.replace(CANTILLATION, '');

export const ISRAELI: HebrewPronunciation = {
  id: 'israeli',
  label: 'Israeli',
  lang: HEBREW_LANG,
  note: 'Modern Israeli Hebrew, as the phone\'s Hebrew voice says the pointed text.',
  voiceForm: stripCantillation,
};
