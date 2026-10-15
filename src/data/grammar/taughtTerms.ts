// src/data/grammar/taughtTerms.ts — which grammar terms a text uses, and which ideas of the ladder teach each (mw-5r3p30.234, .379). The cards of the
// ladder (teach/) and the questions of a lesson (questions.ts) are each held to the terms of their own idea and the ideas before it on the ladder:
// a question never says 'accusative' or 'personal pronoun' to a learner who has not met them. Pure.
import { GRAMMAR_TERMS } from '../parseCode';
import { LADDER, ideaOf, ideaOfTerm, type GrammarIdea } from './ladder';

/** The ids of the ideas that begin with `prefix` and are no letter, pair or breathing item ('case-' gives the five cases). */
export const ideaIdsStartingWith = (prefix: string): string[] => LADDER.filter((i) => i.id.startsWith(prefix) && !i.parent && !i.glyphs).map((i) => i.id);
const ids = ideaIdsStartingWith;

/**
 * Each grammar term and title key word a card might use, with the ideas that teach it (any one of them will do). GRAMMAR_TERMS map to their own
 * idea (ideaOfTerm); the rest are the key words of the ladder's titles and the words the cards teach on the way ('stem', 'ending', 'case' are the
 * noun's; the augment is the imperfect's). An everyday word that is also a term is only a term in a grammar phrase: 'the second vowel' is no
 * second aorist, and 'letter' is the alphabet's word (the 'letter' of the parsing, a letter used as a name, is taught under 'indeclinable').
 */
const KEY_WORDS: [term: string, pattern: RegExp, teachers: string[]][] = [
  ['case', /\bcases?\b/i, ['noun', ...ids('case-')]],
  ['gender', /\bgenders?\b/i, ids('gender-')],
  ['number', /\bnumber\b(?! words?)/i, ['number-singular', 'number-plural']],
  ['person', /\b(?:first|second|third) person\b|\bperson and number\b/i, ids('person-')],
  ['tense', /\btenses?\b/i, ids('tense-')],
  ['voice', /\bvoices?\b/i, ids('voice-')],
  ['mood', /\bmoods?\b/i, ids('mood-')],
  ['pronoun', /\bpronouns?\b/i, ids('pronoun')],
  ['stem', /\bstems?\b/i, ['noun']],
  ['ending', /\bendings?\b/i, ['noun']],
  ['dictionary form', /\bdictionary form\b/i, ['noun']],
  ['subject', /\bsubjects?\b/i, ['case-nominative']],
  ['object', /\bobjects?\b/i, ['case-accusative']],
  ['augment', /\baugment\b/i, ['tense-imperfect']],
  ['reduplication', /\breduplicat\w*/i, ['tense-perfect']],
  ['deponent', /\bdeponents?\b/i, ids('voice-middle-deponent').concat(ids('voice-passive-deponent'))],
  ['enclitic', /\benclitics?\b/i, ['enclitics']],
  ['breathing', /\bbreathings?\b/i, ['breathings']],
  ['accent', /\baccents?\b|\bacute\b|\bgrave\b|\bcircumflex\b/i, ['accents']],
  ['stress', /\bstress(?:ed)?\b/i, ['accents']],
  ['syllable', /\bsyllables?\b/i, ['syllables']],
  ['vowel pair', /\bvowel pairs?\b|\bpairs? of vowels\b|\bdiphthongs?\b/i, ['diphthongs']],
  ['consonant pair', /\bconsonant pairs?\b|\bpairs? of consonants\b/i, ['consonant-pairs']],
  ['iota subscript', /\biota subscript\b|\biota under\b/i, ['iota-subscript']],
  ['punctuation', /\bpunctuation\b|\bapostrophe\b|\bdiaeresis\b|\belision\b/i, ['punctuation']],
  ['movable', /\bmovable\b/i, ['movable-letters']],
  ['compound verb', /\bcompound verbs?\b/i, ['compound-verbs']],
  ['vowel', /\bvowels?\b/i, ['alphabet']],
  ['consonant', /\bconsonants?\b/i, ['alphabet']],
];

/** Everyday words that are GRAMMAR_TERMS, matched only where they are grammar. */
const TERM_PATTERNS: Record<string, RegExp> = {
  letter: /\bletters?\b/i,
  second: /\bsecond (?:aorists?|perfects?|tenses?)\b/i,
  '1st person': /\b(?:1st|first) person\b/i,
  '2nd person': /\b(?:2nd|second) person\b/i,
  '3rd person': /\b(?:3rd|third) person\b/i,
  middle: /(?<![\w-])middles?(?! of (?:a|the|each) word)(?![\w-])/i,
};
const TERM_TEACHERS: Record<string, string[]> = { letter: ['alphabet'] };

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The whole term list, the longest first, so 'middle or passive deponent' is read as one term and not as 'middle' and 'passive'. */
export const TERMS: [term: string, pattern: RegExp, teachers: string[]][] = [
  ...GRAMMAR_TERMS.map((term): [string, RegExp, string[]] => [
    term,
    TERM_PATTERNS[term] ?? new RegExp(`(?<![\\w-])${escape(term)}s?(?![\\w-])`, 'i'),
    TERM_TEACHERS[term] ?? [ideaOfTerm(term) as string],
  ]),
  ...KEY_WORDS,
].sort((a, b) => b[0].length - a[0].length);

/** Each term's pattern, once built: one to test with and one that takes the matched stretches out. */
const COMPILED = TERMS.map(([term, pattern, teachers]) => ({ term, teachers, test: new RegExp(pattern.source, pattern.flags.replace('g', '')), all: new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`) }));

/** The terms a text uses, each matched stretch taken out once read, so a long term's words are not read again as short ones. */
export function termsIn(text: string): [string, string[]][] {
  let rest = text;
  const found: [string, string[]][] = [];
  for (const { term, teachers, test, all } of COMPILED) {
    if (!test.test(rest)) continue;
    found.push([term, teachers]);
    rest = rest.replace(all, ' ');
  }
  return found;
}

/** A sound's key word, 'b as in bed', 'mb as in number': an example of a sound and no grammar, whatever the word is. */
const SOUND_KEY_WORD = /\bas in [“"]?[\p{L}]+[”"]?/giu;

/** The terms a question or its lesson text uses: termsIn, with the key words of the sounds left out. */
export const termsUsedIn = (text: string): [string, string[]][] => termsIn(text.replace(SOUND_KEY_WORD, ' '));

/** Whether an idea at or before `idea` on the ladder (ladder.ts order) teaches the term, one of `teachers`. */
export const taughtBy = (teachers: readonly string[], idea: GrammarIdea): boolean => teachers.some((t) => ideaOf(t).rung <= idea.rung);

/** The terms in `text` that only an idea after `idea` on the ladder teaches: none when a learner who has the ideas up to `idea` can read it. */
export const laterTermsIn = (text: string, idea: GrammarIdea): string[] => termsUsedIn(text).filter(([, teachers]) => !taughtBy(teachers, idea)).map(([term]) => term);

/** Whether a grammar term of a parsing ('genitive', '3rd person', or 'pronoun' for any pronoun) is taught by `idea` or an idea before it. */
export function termIsTaught(term: string, idea: GrammarIdea): boolean {
  const teacher = term === 'pronoun' ? 'pronoun' : ideaOfTerm(term);
  return teacher !== undefined && ideaOf(teacher).rung <= idea.rung;
}
