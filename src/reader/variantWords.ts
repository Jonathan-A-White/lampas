// src/reader/variantWords.ts — what a tap on a word inside a variant's brace asks the word popup for (mw-9ji6ek0.15). The reading's words are the apparatus's, not the verse's:
// a form the verse's own text carries (the same letters, accents and breathings; case and punctuation aside) opens that word with its lemma and parsing; a form it does not carry
// opens a card of just the form (no lemma, parsing, meaning or number: nothing invented) that still knows the verse, so Ask the tutor is there. mw-9ji6ek0.22 finishes this for
// every word once the build tags the readings.
import type { GreekWord, Verse } from '../data/chapter';
import type { Lookup } from '../WordSheet';
import type { BraceReading } from './variants';

const plain = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}]+/gu, '');

/** The word of `verse` that has the form `form`, or a word of that form alone (every other field empty). */
export function variantWord(verse: Verse, form: string): GreekWord {
  const key = plain(form);
  return verse.g.find((w) => plain(w.t) === key) ?? { t: form.replace(/[^\p{L}\p{M}]+$/gu, ''), tr: '', s: '', l: '', p: '' };
}

/** The lookup for `word`, tapped in `reading`'s text, which is drawn in `language`: a Greek word opens its own card; an English word opens the cards of the Greek the reading has, under
 * the English tapped. Null when there is nothing to open (an English reading that leaves the words out). */
export function variantLookup(verse: Verse, word: string, reading: BraceReading, language: 'greek' | 'english'): Lookup | null {
  const variant = `in variant ${reading.chips.join(', ')}`;
  if (language === 'greek') {
    const w = variantWord(verse, word);
    return { words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false, verse: verse.n, variant };
  }
  const words = reading.greek.split(/\s+/).filter(Boolean).map((g) => variantWord(verse, g));
  return words.length ? { words, english: reading.english, fromEnglish: true, tapped: word, verse: verse.n, variant } : null;
}
