// src/services/hebrewWords.ts — the words of an Old Testament verse as the tutor is handed them (hebrew_words): the Verse view's Ask the tutor (src/services/tutor.ts) sends them as it
// sends a Greek verse's greek_words (src/services/greekWords.ts, mw-5vvlay.3). The same chapter shape holds both (docs/data.md): `t` is the pointed WLC word, `tr` its transliteration,
// `l` the TBESH headword, `s` the Strong's number whose gloss the chapter's `lex` holds, `p` the short parsing code whose plain words the chapter's `parse` holds.
import { wordGloss, wordParse, type Chapter, type Verse } from '../data/chapter';
import { hebrewPointedForm } from '../speech/hebrewPronunciation';
import { MAX_REQUEST_BYTES } from './requestBudget';

/** One word of the text: the form as it stands (pointed, no cantillation), its dictionary form, the transliteration the data has, the lexicon's gloss and the parsing in plain words. */
export interface HebrewWordEntry {
  form: string;
  /** missing for the few words the data gives no headword (a bare suffix) */
  lemma?: string;
  translit?: string;
  gloss?: string;
  parse: string;
}

/** The most the word list may weigh, as JSON in UTF-8: a Hebrew entry weighs about twice a Greek one (the letters are two bytes each), so a verse of 25 words fits and a longer passage stops part-way. */
export const HEBREW_WORDS_BYTES = 5600;
/** What the key `"hebrew_words":` and its comma take in the JSON. */
export const HEBREW_WORDS_KEY_BYTES = 17;
/** The most words of the list kept past its byte budget because the question names them. */
const MAX_NAMED_WORDS = 5;

/** A word of the question or of the text reduced to its letters (no points, no accents, no maqaf), so a question that names a word names every pointing of it. */
const letters = (text: string): string => text.replace(/[\u0591-\u05C7]/gu, '');
const wordsOfQuestion = (question: string): Set<string> => new Set(question.split(/[^\p{L}\p{M}]+/u).map(letters).filter((t) => t !== ''));

/** The words of `verses` from `chapter`, in text order; a word that repeats with the same lemma and parsing is listed once. The list stops before the word that would take it over
 * `maxBytes`, except that a word `question` names (up to MAX_NAMED_WORDS) is always kept. */
export function hebrewWordsOf(chapter: Chapter, verses: Verse[], question: string, maxBytes: number): HebrewWordEntry[] {
  const data: Chapter = { ...chapter, lex: chapter.lex ?? {}, parse: chapter.parse ?? {} };
  const named = wordsOfQuestion(question);
  const seen = new Set<string>();
  const entries: { word: HebrewWordEntry; bytes: number; named: boolean }[] = [];
  for (const w of verses.flatMap((v) => v.g)) {
    const gloss = wordGloss(data, w);
    const word: HebrewWordEntry = {
      form: hebrewPointedForm(w.t),
      ...(w.l ? { lemma: w.l } : {}),
      ...(w.tr ? { translit: w.tr } : {}),
      ...(gloss ? { gloss } : {}),
      parse: wordParse(data, w) || w.p,
    };
    const key = `${word.form}|${word.lemma ?? ''}|${word.parse}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ word, bytes: new TextEncoder().encode(JSON.stringify(word)).length + 1, named: named.has(letters(w.t)) });
  }
  const keepNamed = new Set(entries.filter((e) => e.named).slice(0, MAX_NAMED_WORDS));
  let held = [...keepNamed].reduce((sum, e) => sum + e.bytes, 0);
  let bytes = 2;
  let open = true;
  const kept = new Set<(typeof entries)[number]>();
  for (const e of entries) {
    if (keepNamed.has(e)) {
      kept.add(e);
      held -= e.bytes;
      bytes += e.bytes;
    } else if (open && bytes + e.bytes + held <= maxBytes) {
      kept.add(e);
      bytes += e.bytes;
    } else {
      open = false;
    }
  }
  return entries.filter((e) => kept.has(e)).map((e) => e.word);
}

/** The word list for a request that weighs `rest` bytes without it: the most the record leaves, up to HEBREW_WORDS_BYTES. */
export const hebrewWordsFitting = (chapter: Chapter, verses: Verse[], question: string, rest: number): HebrewWordEntry[] =>
  hebrewWordsOf(chapter, verses, question, Math.min(HEBREW_WORDS_BYTES, MAX_REQUEST_BYTES - rest - HEBREW_WORDS_KEY_BYTES));
