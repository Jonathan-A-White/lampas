// src/resources/grammarBooks.ts — the grammar books of his Logos library that an idea sheet links to under Read more (mw-5r3p30.381, PROVISIONAL):
// for each book, the sections of its table of contents and the ladder ideas each teaches. A book is a reference inside the learning, whichever
// grammar approach he is on, never an approach of its own. Adding a book is one entry in GRAMMAR_BOOKS: Settings (Logos > Grammar books) and the
// idea sheet read this list and nothing else. Every link is the Logos scheme first with the https ref.ly address as the fallback (src/resources/openApp.ts),
// as the lexicon links are (logos.ts). docs/resources.md names each book's source and what is UNVERIFIED.
import type { BookSection, GrammarBook, StudyLink } from './types';

const black: GrammarBook = {
  id: 'black',
  short: 'Black, Learn to Read NT Greek',
  name: 'Learn to Read New Testament Greek (Black)',
  resource: 'LLS:LRNTOREADNTGRK',
  startsTicked: true,
  source: 'The third edition (B&H, 2009) as Google Books lists its contents, with the page each starts on; the lessons are numbered in page order.',
  // Page.p+N: the printed page a section starts on (the Logos edition is the 2009 print edition). The ideas follow each lesson's title.
  sections: [
    { title: 'Lesson 1: The Letters and Sounds of Greek', ref: 'Page.p+1', ideas: ['alphabet', 'diphthongs', 'breathings'] },
    { title: 'Lesson 2: The Greek Verb System', ref: 'Page.p+10', ideas: ['verb'] },
    { title: 'Lesson 3: Present and Future Active Indicative', ref: 'Page.p+17', ideas: ['tense-present', 'tense-future', 'voice-active', 'mood-indicative', 'person-1st', 'person-2nd', 'person-3rd'] },
    {
      title: 'Lesson 4: Nouns of the Second Declension',
      ref: 'Page.p+26',
      ideas: ['noun', 'declension-2', 'case-nominative', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative', 'gender-masculine', 'gender-neuter', 'number-singular', 'number-plural', 'stem-and-ending', 'article'],
    },
    { title: 'Lesson 5: Nouns of the First Declension', ref: 'Page.p+35', ideas: ['declension-1', 'gender-feminine'] },
    { title: 'Lesson 6: Adjectives of the First and Second Declensions', ref: 'Page.p+42', ideas: ['adjective'] },
    { title: 'Lesson 7: Imperfect and Aorist Active Indicative', ref: 'Page.p+49', ideas: ['tense-imperfect', 'tense-aorist', 'augment'] },
    {
      title: 'Lesson 8: Additional Prepositions',
      ref: 'Page.p+58',
      ideas: ['preposition', 'preposition-eis', 'preposition-en', 'preposition-ek', 'preposition-apo', 'preposition-pros', 'preposition-dia', 'preposition-kata', 'preposition-meta', 'preposition-peri', 'preposition-hypo', 'preposition-para', 'preposition-epi'],
    },
    { title: 'Lesson 9: Personal Pronouns', ref: 'Page.p+65', ideas: ['pronoun', 'pronoun-personal', 'person-1st', 'person-2nd', 'person-3rd'] },
    { title: 'Lesson 10: Perfect and Pluperfect Active Indicative', ref: 'Page.p+73', ideas: ['tense-perfect', 'tense-pluperfect', 'reduplication'] },
    { title: 'Lesson 11: Demonstrative Pronouns', ref: 'Page.p+80', ideas: ['pronoun-demonstrative'] },
    { title: 'Lesson 12: Present Middle and Passive Indicative', ref: 'Page.p+86', ideas: ['voice-middle', 'voice-passive', 'voice-middle-or-passive', 'tense-present'] },
    { title: 'Lesson 13: Perfect Middle and Passive, Future Middle Indicative', ref: 'Page.p+92', ideas: ['tense-perfect', 'tense-future', 'voice-middle', 'voice-passive', 'voice-middle-or-passive'] },
    {
      title: 'Lesson 14: Imperfect Middle and Passive, Aorist Middle, and Pluperfect Middle and Passive Indicative',
      ref: 'Page.p+97',
      ideas: ['tense-imperfect', 'tense-aorist', 'tense-pluperfect', 'voice-middle', 'voice-passive', 'voice-middle-or-passive'],
    },
    { title: 'Lesson 15: Aorist and Future Passive Indicative', ref: 'Page.p+102', ideas: ['tense-aorist', 'tense-future', 'voice-passive'] },
    { title: 'Lesson 16: Review of the Indicative Mood', ref: 'Page.p+107', ideas: ['mood-indicative'] },
    { title: 'Lesson 17: Nouns of the Third Declension', ref: 'Page.p+116', ideas: ['declension-3'] },
    { title: 'Lesson 18: Adjectives, Pronouns, and Numerals of the First and Third Declensions', ref: 'Page.p+124', ideas: ['adjective', 'pronoun', 'numeral', 'declension-3'] },
    { title: 'Lesson 19: Contract and Liquid Verbs', ref: 'Page.p+133', ideas: ['contract-verbs'] },
    { title: 'Lesson 20: Participles (Verbal Adjectives)', ref: 'Page.p+142', ideas: ['mood-participle'] },
    { title: 'The Greek Accents', ref: 'Page.p+216', ideas: ['accents'] },
    { title: 'Principal Parts of Selected Verbs', ref: 'Page.p+244', ideas: ['principal-parts'] },
  ],
};

/** Every grammar book, in the order Settings lists them and the idea sheet draws their lines. */
export const GRAMMAR_BOOKS: readonly GrammarBook[] = [black];

/** The books ticked while he has not changed the ticks. */
export const DEFAULT_GRAMMAR_BOOKS: readonly string[] = GRAMMAR_BOOKS.filter((b) => b.startsTicked).map((b) => b.id);

/** The sections of `book` that teach the idea `ideaId`, in the book's order. */
export const sectionsFor = (book: GrammarBook, ideaId: string): BookSection[] => book.sections.filter((s) => s.ideas.includes(ideaId));

/** The link that opens `section` in Logos: the logosres: scheme, with its ref.ly address as the fallback (the colon of the Resource ID encoded, as logos.ts does). */
export const bookLink = (book: GrammarBook, section: BookSection): StudyLink => ({
  label: `Open in Logos: ${book.short}, ${section.title}`,
  tile: section.title,
  url: `logosres:${book.resource};ref=${section.ref}`,
  fallback: `https://ref.ly/logosres/${encodeURIComponent(book.resource)}?ref=${section.ref}`,
});

export interface ReadMoreLine {
  book: GrammarBook;
  links: StudyLink[];
}

/** Read more for the idea `ideaId`: one line for each ticked book that teaches it, in GRAMMAR_BOOKS' order (`books` is the list; a test hands it its own). */
export function readMoreFor(ideaId: string, ticked: readonly string[], books: readonly GrammarBook[] = GRAMMAR_BOOKS): ReadMoreLine[] {
  return books
    .filter((book) => ticked.includes(book.id))
    .map((book) => ({ book, links: sectionsFor(book, ideaId).map((section) => bookLink(book, section)) }))
    .filter((line) => line.links.length > 0);
}
