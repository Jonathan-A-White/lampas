// src/speech/answerRuns.ts — an answer of the Bible talk is English with Greek and Hebrew words in it. Read aloud, each stretch of Greek goes to the Greek voice,
// each of Hebrew to the Hebrew one and the rest to the English one (the runs src/speech/readAloud.ts speaks; the cut is src/speech/languageRuns.ts, which a page of
// prose shares, mw-gdcyf98.27).
import { markdownToSpeech } from '../markdown/plain';
import { SCRIPTS } from '../script/scripts';
import { chosenPronunciation } from './greek';
import { greekSyllables } from './greekSyllables';
import { GREEK_WORD, languageRuns, speakable } from './languageRuns';
import { chosenHebrewPronunciation } from './pronunciation';
import type { Run } from './readAloud';

// A respelling of a Greek sound ('PNEV-ma', 'khree-STO'): hyphened syllables with one stressed in capitals, or a capitalised word. The English voice would
// spell it letter by letter, so answerRuns hands the Greek it respells to the Greek voice instead (mw-5r3p30.272).
const LATIN_WORD = /(?<![\p{L}\p{N}-])[A-Za-z]+(?:-[A-Za-z]+)*(?![\p{L}\p{N}-])/gu;
const QUOTED_WORD = /(["\u201c\u2018])([a-z]+(?:-[a-z]+)*)(["\u201d\u2019])/gu;
const ACRONYMS = new Set(['NT', 'OT', 'LXX', 'BDAG', 'LSB', 'ESV', 'KJV', 'NIV', 'NASB', 'NRSV', 'MSB', 'BMA', 'TDNT', 'LSJ', 'IPA', 'ASV', 'RSV', 'NET', 'CSB', 'GNT', 'SBL', 'UBS']);

const keyOf = (respelling: string): string => respelling.toLowerCase().replace(/-/g, '');

/** Each respelling in the answer's own Greek words, whole or by runs of its syllables, mapped to the Greek it respells: 'pnevma' -> πνεῦμα, 'pnev' -> πνεῦ. */
function respellings(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const add = (respelling: string, greek: string): void => {
    for (const key of [keyOf(respelling), keyOf(respelling).replace(/f$/, 'v')]) if (key && !found.has(key)) found.set(key, greek);
  };
  const { respell } = chosenPronunciation();
  for (const [word] of text.matchAll(new RegExp(GREEK_WORD, 'gu'))) {
    const whole = respell(word);
    add(whole, word);
    const spelled = whole.split('-');
    const syllables = greekSyllables(word);
    if (spelled.length !== syllables.length) continue;
    for (let from = 0; from < syllables.length; from++) {
      for (let to = from + 1; to <= syllables.length; to++) add(spelled.slice(from, to).join('-'), syllables.slice(from, to).join(''));
    }
  }
  // a Hebrew word's respelling ('RU-akh') is likewise the Hebrew word, said in the Hebrew voice, never the English voice's guess at the Latin letters
  const hebrew = SCRIPTS.find((script) => script.speaks === 'hebrew');
  if (hebrew) {
    for (const [word] of text.matchAll(new RegExp(`[${hebrew.letters}]+`, 'gu'))) add(chosenHebrewPronunciation().respell(word), word);
  }
  return found;
}

const isRespelling = (token: string): boolean => {
  const caps = token.split('-').filter((part) => /^[A-Z]{2,}$/.test(part));
  if (caps.length === 0 || caps.every((part) => ACRONYMS.has(part))) return false;
  return token.includes('-') || (token.length >= 3 && /[AEIOUY]/.test(token));
};

/** The text with every respelling of a Greek sound put right for speech: the Greek word or syllable it respells (a quoted lower-case one too), else a capitalised one as a plain lower-case word. */
function withoutRespellings(text: string): string {
  const greek = respellings(text);
  const said = text.replace(LATIN_WORD, (token) => (isRespelling(token) ? (greek.get(keyOf(token)) ?? token.toLowerCase()) : token));
  return said.replace(QUOTED_WORD, (whole, open: string, token: string, close: string) => {
    const match = greek.get(keyOf(token));
    return match ? `${open}${match}${close}` : whole;
  });
}

/** The answer cut into runs of one language each, in the order they come; a run with nothing to say is left out. Its Markdown marks are never spoken. */
export function answerRuns(answer: string): Run[] {
  // Greek and Hebrew words are each said in their own voice, as the word itself (a Hebrew word was once left out here, mw-gdcyf98.27); the English voice only garbles either.
  return languageRuns(withoutRespellings(markdownToSpeech(answer)));
}

/** The syllables of a word he asked to have sounded out, as runs to read one after another: Greek, said slowly. A syllable of one letter stays one letter here: readAloud.ts piecesOf plays its pronunciation's clip there, never handing it to a voice (mw-5r3p30.347). */
export function syllableRuns(syllables: string[]): Run[] {
  return syllables.filter(speakable).map((text) => ({ text, language: 'greek' as const, slow: true }));
}
