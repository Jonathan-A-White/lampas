// src/speech/elision.ts — the marks that show a dropped vowel at the end of a Greek word (δ', ἀπ᾽, δι᾿): the text's apostrophe (' ’), the modifier letter
// apostrophe ʼ, and the koronis ᾽ and psili ᾿ that editions and the lexicon's glosses use. A word of one letter and such a mark (δ', the δέ of Luke 9:24) is
// still a word of ONE letter to a voice, which names it ('Delta'), so speech reads past the mark (greek.ts isOneGreekLetter, mw-5r3p30.449).

const ELISION = /['’ʼ᾽᾿]/u;
const ELISION_AT_END = /['’ʼ᾽᾿]+$/u;

/** Whether `word` ends in a mark of a dropped vowel: δ', ἀπ᾽. */
export const isElided = (word: string): boolean => ELISION_AT_END.test(word.trim());

/** `text` with every mark of a dropped vowel taken out: 'δ' for δ'. */
export const withoutElision = (text: string): string => text.replace(new RegExp(ELISION.source, 'gu'), '');

/** `text` with each word of ONE letter and a mark of a dropped vowel joined to the word after it (δ' ἂν becomes δ'ἂν): a voice handed δ' as a word of its own
 * names the letter ('Delta'), and joined it says the sound ('dan'). Only the voice is handed this: the text on screen is as it was (mw-5r3p30.654). */
export const joinElidedLetters = (text: string): string =>
  text.replace(new RegExp(`(?<![\\p{L}\\p{M}])(\\p{Script=Greek}\\p{M}*${ELISION.source}+)[ \\t]+(?=[\\p{L}])`, 'gu'), '$1');
