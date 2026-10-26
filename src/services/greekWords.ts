// src/services/greekWords.ts — the words of a text as the tutor is handed them (greek_words): the Bible talk's request (src/services/talk.ts) and the Verse view's
// Ask the tutor (src/services/tutor.ts) both build the list here, so a typed "how do I say σβέννυτε?" reaches either grind with the app's syllables and stress (mw-5r3p30.643).
import { fold } from 'learn-kit/recall';
import { sourceLanguage, wordGloss, wordLemma, wordParse, type Chapter, type Verse } from '../data/chapter';
import { greekSyllables, stressedSyllable } from '../speech/greekSyllables';
import { pronunciationOf, type GreekPronunciation } from '../speech/pronunciation';
import { MAX_REQUEST_BYTES } from './requestBudget';

/** One word of the text as the chapter data has it: the form as it stands, its lemma (NFC), the lexicon's gloss and the parsing in plain words. */
export interface GreekWordEntry {
  form: string;
  lemma: string;
  gloss: string;
  parse: string;
  /** the word as the app's pronunciation respells it ('ZVE-nee-te'), the stressed syllable in capitals (mw-5r3p30.568) */
  respelling?: string;
  /** the word cut into syllables by the app (speech/greekSyllables.ts), in order: a typed or spoken "how do I say it?" has no focus, so the tutor reads them from here and never counts */
  syllables?: string[];
  /** with `syllables`: the index (0 = the first) of the stressed syllable; absent when the word carries no accent */
  stress?: number;
}

/** The most the word list may weigh, as JSON in UTF-8: a verse of 25 words fits; a long passage's list stops part-way (the grinds' instructions say so),
 * and buildTalkRequest and buildRequest (src/services/tutor.ts) make it smaller still when the rest of the request leaves less room, so the record stays under MAX_REQUEST_BYTES. */
export const GREEK_WORDS_BYTES = 4400;
/** What the key `"greek_words":` and its comma take in the JSON. */
export const GREEK_WORDS_KEY_BYTES = 16;
/** The most words of the list kept past its byte budget because the question names them. */
const MAX_NAMED_WORDS = 5;

/** The words of `question`, folded (learn-kit/recall: no accents, breathings, case or final sigma), so "σβεννυτε" and a NFD-typed "σβέννυτε" both name σβέννυτε. */
const wordsOfQuestion = (question: string): Set<string> => new Set(question.split(/[^\p{L}\p{M}]+/u).map(fold).filter((t) => t !== ''));

/** The words of `verses` with lemma, gloss and parse from `chapter`, in text order; a word that repeats with the same lemma and parsing is listed once.
 * Each carries the app's respelling, syllables and stress (mw-5r3p30.568). The list stops before the word that would take it over `maxBytes`,
 * except that a word `question` names (up to MAX_NAMED_WORDS) is always kept, so "how do I say σβέννυτε?" never reaches a tutor with no syllables.
 * A word with no lemma is left out: there is nothing to say of it. A chapter that is not Greek has none: no Greek syllable or respelling is ever made of a Hebrew word. */
export function greekWordsOf(chapter: Chapter, verses: Verse[], question: string, pronunciation: GreekPronunciation, maxBytes: number): GreekWordEntry[] {
  if (sourceLanguage(chapter) !== 'grc') return [];
  const data: Chapter = { ...chapter, lex: chapter.lex ?? {}, parse: chapter.parse ?? {} };
  const scheme = pronunciationOf(pronunciation);
  const named = wordsOfQuestion(question);
  const seen = new Set<string>();
  const entries: { word: GreekWordEntry; bytes: number; named: boolean }[] = [];
  for (const w of verses.flatMap((v) => v.g)) {
    const word: GreekWordEntry = { form: w.t, lemma: wordLemma(w), gloss: wordGloss(data, w), parse: wordParse(data, w) };
    const key = `${word.form}|${word.lemma}|${word.parse}`;
    if (!word.lemma || seen.has(key)) continue;
    seen.add(key);
    const syllables = greekSyllables(w.t);
    const stress = stressedSyllable(syllables);
    const full = { ...word, respelling: scheme.respell(w.t), syllables, ...(stress >= 0 ? { stress } : {}) };
    entries.push({ word: full, bytes: new TextEncoder().encode(JSON.stringify(full)).length + 1, named: named.has(fold(w.t)) });
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

/** The word list for a request that weighs `rest` bytes without it: the most the record leaves, up to GREEK_WORDS_BYTES. */
export function greekWordsFitting(chapter: Chapter, verses: Verse[], question: string, pronunciation: GreekPronunciation, rest: number): GreekWordEntry[] {
  return greekWordsOf(chapter, verses, question, pronunciation, Math.min(GREEK_WORDS_BYTES, MAX_REQUEST_BYTES - rest - GREEK_WORDS_KEY_BYTES));
}
