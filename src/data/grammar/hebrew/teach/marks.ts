// src/data/grammar/hebrew/teach/marks.ts — the cards of the Hebrew marks tier (mw-gdcyf98.11): the maqaf, the cantillation marks and the ketiv and qere. The cantillation marks are the TEXT, not the sound: a card
// says where they are and what they do to the page, and names no sound (the Israeli scheme leaves them unsaid). Worked words are of Genesis 1 and Jonah 1.
import { POINT, on } from '../letters';
import type { Teach } from '../../teach/types';

export const MARKS_TEACH: Readonly<Record<string, Teach>> = {
  'he-maqaf': {
    whatItIs: 'The maqaf is a short line raised to the top of the letters, written between two words. It joins them into one unit, so a short word hangs on the word after it.',
    howToSpot: `Look at the right-hand edge of the line for a raised hyphen at the end of a short word, ${on('עַל', POINT.maqaf)}. It is a hyphen at the top of the line, not a letter.`,
    worked: [
      { word: 'עַל־', ref: 'Genesis 1:2', gloss: 'upon', steps: [`The word ends, at the left, with a raised line: ${POINT.maqaf}. That is a maqaf.`, 'The next word, פְּנֵי “face of”, is joined to it: together they read “upon the face of”.'] },
      { word: 'כָּל־', ref: 'Genesis 1:31', gloss: 'all', steps: [`The word ends with a raised line, ${POINT.maqaf}: a maqaf.`, 'The word after it is joined to it, so the two are one unit.'] },
    ],
  },
  'he-cantillation': {
    whatItIs: 'The cantillation marks are small signs above and below the words, added to the letters and the vowel points. They are part of the text. They mark how a verse is phrased.',
    howToSpot: 'Look for a small extra sign over or under a word that is not a vowel point. It can share a letter with a vowel point. Take it away, and the letters and the points stay.',
    worked: [
      { word: 'בְּרֵאשִׁ֖ית', ref: 'Genesis 1:1', gloss: 'in the beginning', steps: [`Under ש shin, beside its hiriq, is one more sign: ${on('ש', POINT.shinDot, POINT.hiriq, '֖')}. It is a cantillation mark.`, 'Take it away and the letters and the vowel points are the same.'] },
      { word: 'אֱלֹהִ֑ים', ref: 'Genesis 1:1', gloss: 'God', steps: [`Under ה he, beside its hiriq, is one more sign: ${on('ה', POINT.hiriq, '֑')}. It is a cantillation mark.`, 'It does not change one letter of the word.'] },
    ],
  },
  'he-ketiv-qere': {
    whatItIs: 'In some places the word written in the text, the ketiv, is not the word that is read, the qere. The reading is usually put in the margin. The commonest case is the name of God, written with the vowels of another word.',
    howToSpot: 'Look for a word whose vowel points do not fit its letters. The letters are the ketiv; the word the points belong to is the qere, and that is the word read.',
    worked: [
      { word: 'יְהוָה', ref: 'Jonah 1:17', gloss: 'the LORD', steps: [`The four letters י ה ו ה are the ketiv, the name of God as it is written.`, 'The points under them belong to another word, so the reader reads that word, the qere, in its place.'] },
    ],
  },
};
