// src/practise/copywork.ts — Copywork, the first door of the Verse view's Practise (mw-5r3p30.899, his grilling mw-6ww.146): Susan Wise Bauer's copywork is copying a model exactly,
// by hand. The verse is shown in the script he picks (English always; Greek on a New Testament verse; Hebrew, pointed, on an Old Testament one), he writes it on paper and photographs
// the page, and the copywork grind (grinds/copywork.json: sonnet, one picture) marks each word right, missing or wrong. This file is the pure part: the languages a verse has, the text to
// copy and the words of it, the request, and the check of the answer. The screen is CopyworkPane.tsx.
import type { SourceLanguage, Verse } from '../data/chapter';
import { GREEK_LANG } from '../script/greekLang';
import { hebrewPointedForm } from '../speech/hebrewPronunciation';

export const COPYWORK_KIND = 'copywork';

/** The language of a text to copy: English, Koine Greek or Biblical Hebrew (the grind's `language`). */
export type CopyLanguage = 'en' | 'grc' | 'hbo';

export const COPY_LANGUAGE_NAMES: Record<CopyLanguage, string> = { en: 'English', grc: 'Greek', hbo: 'Hebrew' };

/** The languages a verse can be copied in: English always, and the language of its own text (Greek on a New Testament verse, Hebrew on an Old Testament one). */
export const copyLanguagesOf = (source: SourceLanguage): CopyLanguage[] => ['en', source];

/** The language attributes of a text in `language`: Greek as the app writes it (lang el, data-lang grc: src/script/greekLang.ts), Hebrew right to left. */
export const copyAttrs = (language: CopyLanguage): { lang: string; 'data-lang'?: string; dir: 'ltr' | 'rtl' } =>
  language === 'grc' ? { ...GREEK_LANG, dir: 'ltr' } : language === 'hbo' ? { lang: 'he', 'data-lang': 'hbo', dir: 'rtl' } : { lang: 'en', dir: 'ltr' };

/** The most words a page of copywork judges: the grind's input schema takes 400, and a hand copies far fewer in a sitting. */
export const MAX_COPY_WORDS = 150;

/** The text of `unit` (a verse, or a passage as one Verse) to copy, in `language`: English as the translation has it, Greek as the text has it (accents and breathings), Hebrew pointed with
 * the cantillation marks off. */
export function copyTextOf(unit: Pick<Verse, 'g' | 'e'>, language: CopyLanguage): string {
  const words = language === 'en' ? unit.e.map((chunk) => chunk.t) : unit.g.map((word) => (language === 'grc' ? word.t.normalize('NFC') : hebrewPointedForm(word.t)));
  return words.map((w) => w.trim()).filter(Boolean).join(' ');
}

/** The words of a text to copy: what the grind marks one for one. */
export const copyWordsOf = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** The request the copywork grind is sent beside the photo (grinds/copywork.input.schema.json). `mode` is left out for copywork; a dictated page (Dictation, mw-5r3p30.900) says 'dictation':
 * the page was written from hearing the verse read, and the words are the verse as heard. */
export interface CopyworkRequest {
  reference: string;
  language: CopyLanguage;
  words: string[];
  mode?: 'dictation';
}

export const buildCopyworkRequest = (reference: string, language: CopyLanguage, text: string, mode?: 'dictation'): CopyworkRequest => ({
  reference,
  language,
  words: copyWordsOf(text),
  ...(mode ? { mode } : {}),
});

export type CopyMark = 'right' | 'missing' | 'wrong';

/** One word as the grind marks it. */
export interface MarkedWord {
  word: string;
  mark: CopyMark;
  problem?: string;
  /** a wrong word of a dictated page that sounds like the verse's word: he heard it right and spelled it as another word or another way (the grind's `sounds_alike`) */
  soundsAlike?: boolean;
}

/** A word as the grind sends it: `sounds_alike` is the snake-case of `soundsAlike`. */
type AnswerWord = Omit<MarkedWord, 'soundsAlike'> & { sounds_alike?: boolean };

/** The grind's answer (grinds/copywork.answer.schema.json). */
export interface CopyworkAnswer {
  readable: boolean;
  words: AnswerWord[];
  fix_first: string;
}

const MARKS: readonly string[] = ['right', 'missing', 'wrong'];

/** The app's own check of an answer, run before it is believed. */
export function isCopyworkAnswer(value: unknown): value is CopyworkAnswer {
  if (typeof value !== 'object' || value === null) return false;
  const { readable, words, fix_first } = value as Partial<Record<keyof CopyworkAnswer, unknown>>;
  return (
    typeof readable === 'boolean' &&
    typeof fix_first === 'string' &&
    Array.isArray(words) &&
    words.every(
      (w) =>
        typeof w === 'object' &&
        w !== null &&
        typeof (w as AnswerWord).word === 'string' &&
        MARKS.includes((w as AnswerWord).mark) &&
        (w.problem === undefined || typeof w.problem === 'string') &&
        (w.sounds_alike === undefined || typeof w.sounds_alike === 'boolean'),
    )
  );
}

/** The words of the model, each with the mark the grind gave the word at its place (the model's own word is shown, whatever the answer copied); null when the answer does not
 * mark every word of the request, which it must (the count and the order are the request's). */
export function markedWords(request: Pick<CopyworkRequest, 'words'>, answer: CopyworkAnswer): MarkedWord[] | null {
  if (answer.words.length !== request.words.length) return null;
  return request.words.map((word, i) => {
    const { mark, problem, sounds_alike } = answer.words[i];
    if (mark !== 'wrong') return { word, mark };
    return { word, mark, ...(problem !== undefined ? { problem } : {}), ...(sounds_alike === true ? { soundsAlike: true } : {}) };
  });
}
