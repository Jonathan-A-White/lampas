// src/practise/copywork.ts — Copywork, the first door of the Verse view's Practise (mw-5r3p30.899, his grilling mw-6ww.146): Susan Wise Bauer's copywork is copying a model exactly,
// by hand. The verse is shown in the script he picks (English always; Greek on a New Testament verse; Hebrew, pointed, on an Old Testament one), he writes it on paper and photographs
// the page, and the copywork grind (grinds/copywork.json: sonnet, one picture) marks each word right, missing or wrong. This file is the pure part: the languages a verse has, the text to
// copy and the words of it, the request, and the check of the answer. The screen is CopyworkPane.tsx.
import type { Chapter, SourceLanguage, Verse } from '../data/chapter';
import { cardForm } from '../reader/septuagint';
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

/** The text of `unit` (a verse, or a passage as one Verse) to copy, in `language`: English as the translation has it, Greek as the text has it (accents and breathings; a Septuagint word without Swete's mark: cardForm, given its `chapter`), Hebrew pointed with
 * the cantillation marks off. */
export function copyTextOf(unit: Pick<Verse, 'g' | 'e'>, language: CopyLanguage, chapter?: Pick<Chapter, 'edition'>): string {
  const words = language === 'en' ? unit.e.map((chunk) => chunk.t) : unit.g.map((word) => (language === 'grc' ? cardForm(chapter, word).normalize('NFC') : hebrewPointedForm(word.t)));
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
type AnswerWord = Omit<MarkedWord, 'soundsAlike'> & { sounds_alike?: boolean; written?: string };

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
        (w.sounds_alike === undefined || typeof w.sounds_alike === 'boolean') &&
        (w.written === undefined || typeof w.written === 'string'),
    )
  );
}

const SMOOTH = '\u0313';
const ROUGH = '\u0314';
const ACCENTS = ['\u0301', '\u0300', '\u0342'];
const isMark = (ch: string) => /\p{M}/u.test(ch);

/** A word as its letters, each with the set of marks it carries (NFD: the letter, then its combining marks). */
function lettersWithMarks(word: string): { letter: string; marks: string[] }[] {
  const out: { letter: string; marks: string[] }[] = [];
  for (const ch of word.normalize('NFD')) {
    if (isMark(ch) && out.length > 0) out[out.length - 1].marks.push(ch);
    else out.push({ letter: ch, marks: [] });
  }
  return out.map((l) => ({ letter: l.letter, marks: l.marks.sort() }));
}

/** Whether `written` is the request's lone-breathing Greek word (ἡ, ὁ, οἱ, ἐν, εἰς, οὐ, ὡς, εἰ: a breathing and no accent) plus one accent the model read from the breathing's curl:
 * the same letters and marks, and on the breathing's vowel either the same breathing and ONE accent, or one accent and no breathing. Anything else (smooth for rough, no mark, another letter,
 * a second accent, a request word with an accent of its own) is a fault. */
export function isBreathingReadAsAccent(word: string, written: string | undefined): boolean {
  if (!written) return false;
  const asked = lettersWithMarks(word);
  const heard = lettersWithMarks(written);
  if (asked.length !== heard.length) return false;
  if (asked.some((l) => l.marks.some((m) => ACCENTS.includes(m)))) return false;
  const at = asked.findIndex((l) => l.marks.includes(SMOOTH) || l.marks.includes(ROUGH));
  if (at < 0 || asked.filter((l) => l.marks.includes(SMOOTH) || l.marks.includes(ROUGH)).length !== 1) return false;
  for (let i = 0; i < asked.length; i++) {
    if (asked[i].letter !== heard[i].letter) return false;
    if (i !== at && asked[i].marks.join() !== heard[i].marks.join()) return false;
  }
  const breathing = asked[at].marks.filter((m) => m === SMOOTH || m === ROUGH);
  const rest = asked[at].marks.filter((m) => m !== SMOOTH && m !== ROUGH);
  const marks = heard[at].marks;
  const accents = marks.filter((m) => ACCENTS.includes(m));
  const others = marks.filter((m) => m !== SMOOTH && m !== ROUGH && !ACCENTS.includes(m));
  const breathings = marks.filter((m) => m === SMOOTH || m === ROUGH);
  if (accents.length !== 1 || others.join() !== rest.join()) return false;
  return breathings.length === 0 || (breathings.length === 1 && breathings[0] === breathing[0]);
}

/** Whether `written` (what the model says is on the page) is the request's word itself, after NFC: an answer that marks such a word wrong contradicts itself (the grind's own rule: when `written` and
 * `word` are the same characters the mark is `right`). The model does it about one run in ten on σκοτία, οὐ and κατέλαβεν, believing the request's word has no accent (mw-qtu3zvz.254). */
export function isWrittenAsAsked(word: string, written: string | undefined): boolean {
  return !!written && written.normalize('NFC') === word.normalize('NFC');
}

/** The words of the model, each with the mark the grind gave the word at its place (the model's own word is shown, whatever the answer copied); null when the answer does not
 * mark every word of the request, which it must (the count and the order are the request's). On a Greek page a word marked wrong whose `written` is only the page's breathing read as an
 * accent (isBreathingReadAsAccent) is right: the model misreads a small curl about one run in eight, and the page cannot be redrawn for it (mw-qtu3zvz.153); so is one whose `written` is the request's
 * word itself (isWrittenAsAsked, mw-qtu3zvz.254). English and Hebrew are left as marked: no run has shown the fault there. `language` is the request's; a
 * request without one is not taken for Greek. */
export function markedWords(request: Pick<CopyworkRequest, 'words'> & Partial<Pick<CopyworkRequest, 'language'>>, answer: CopyworkAnswer): MarkedWord[] | null {
  if (answer.words.length !== request.words.length) return null;
  return request.words.map((word, i) => {
    const { mark, problem, sounds_alike, written } = answer.words[i];
    if (mark !== 'wrong') return { word, mark };
    if (request.language === 'grc' && (isWrittenAsAsked(word, written) || isBreathingReadAsAccent(word, written))) return { word, mark: 'right' };
    return { word, mark, ...(problem !== undefined ? { problem } : {}), ...(sounds_alike === true ? { soundsAlike: true } : {}) };
  });
}
