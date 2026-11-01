// src/practise/dictation.ts — Dictation, the third door of the Verse view's Practise (mw-5r3p30.900, his grilling mw-6ww.146): Susan Wise Bauer's dictation is writing a sentence from hearing it read.
// The app reads the verse aloud a phrase at a time (src/speech/greek.ts speakPhrase: one phrase, then it waits; Next says the next, Again says this one again), he writes it by hand with the verse
// hidden, photographs the page, and the copywork grind (request `mode: 'dictation'`) judges the page against the verse as heard. This file is the pure part: how a verse is cut into the phrases
// that are read. The screen is DictationPane.tsx.
import { copyWordsOf, type CopyLanguage } from './copywork';

/** The most words one phrase has: what a hand can hold from one hearing. */
export const MAX_PHRASE_WORDS = 6;

/** What closes a quotation or a bracket: it stays with the word before it when a cut falls after that word's mark. */
const CLOSERS = /[”’"')\]»]+$/u;
/** A word that ends a phrase: it ends in a comma, a stop, a colon, a question or exclamation mark, a dash, the Greek ano teleia or question mark, or the Hebrew sof pasuq. */
const STOPS = /[,.;:!?…—··;׃]$/u;
/** Greek has no punctuation in the text: a phrase begins at these (καὶ, ἀλλὰ, ὅτι, ἵνα, ἐὰν, ἢ), where it already has two words or more. */
const GREEK_OPENERS: ReadonlySet<string> = new Set(['καὶ', 'ἀλλὰ', 'ὅτι', 'ἵνα', 'ἐὰν', 'ἢ'].map((w) => w.normalize('NFC')));

const endsPhrase = (word: string): boolean => STOPS.test(word.replace(CLOSERS, ''));

/** `words` in pieces of at most MAX_PHRASE_WORDS, as even as can be (seven words are four and three, never six and one), the larger first. */
function evenPieces(words: string[]): string[][] {
  const pieces = Math.ceil(words.length / MAX_PHRASE_WORDS);
  const out: string[][] = [];
  let at = 0;
  for (let i = 0; i < pieces; i++) {
    const size = Math.floor(words.length / pieces) + (i < words.length % pieces ? 1 : 0);
    out.push(words.slice(at, at + size));
    at += size;
  }
  return out;
}

/** The phrases the app reads, in order, of `text` (a verse or passage as the Practise door shows it, in `language`): cut at punctuation (and, in Greek, before a conjunction that begins a
 * phrase), then any stretch longer than MAX_PHRASE_WORDS into even pieces. Every word of the text is in exactly one phrase, in its order, as written. */
export function phrasesOf(text: string, language: CopyLanguage): string[] {
  const clauses: string[][] = [];
  let clause: string[] = [];
  for (const word of copyWordsOf(text)) {
    if (language === 'grc' && clause.length >= 2 && GREEK_OPENERS.has(word.normalize('NFC'))) {
      clauses.push(clause);
      clause = [];
    }
    clause.push(word);
    if (endsPhrase(word)) {
      clauses.push(clause);
      clause = [];
    }
  }
  if (clause.length > 0) clauses.push(clause);
  return clauses.flatMap(evenPieces).map((words) => words.join(' '));
}
