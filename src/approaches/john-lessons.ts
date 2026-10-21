// src/approaches/john-lessons.ts — the twelve lessons that read the letters of John, one passage each, shared by the Lampas ladder (its last stage) and the record of
// the other path's order. Each lesson's ideas are the ones its passage uses again, taught earlier in the sequence; the range is the lesson's title (mw-z370x5.1).
import { bookOf } from '../data/books';
import type { ApproachLesson, Passage } from './types';

const read = (book: string, chapter: number, from: number, to: number, ...ideas: string[]): ApproachLesson => {
  const passage: Passage = { book, chapter, from, to };
  const name = bookOf(book)?.name ?? book;
  return { title: from === to ? `${name} ${chapter}:${from}` : `${name} ${chapter}:${from}-${to}`, ideas, passage };
};

export const JOHN_LESSONS: ApproachLesson[] = [
  read('1jn', 1, 1, 4, 'pronoun-relative', 'tense-perfect', 'tense-aorist', 'tense-imperfect'),
  read('1jn', 1, 5, 10, 'conditional', 'mood-subjunctive', 'negative', 'attic-form'),
  read('1jn', 2, 1, 11, 'mood-imperative', 'tense-perfect', 'conditional', 'pronoun-indefinite'),
  read('1jn', 2, 12, 17, 'tense-perfect', 'tense-aorist', 'pronoun-demonstrative', 'mood-imperative'),
  read('1jn', 2, 18, 29, 'tense-pluperfect', 'pronoun-relative', 'voice-middle', 'mood-participle'),
  read('1jn', 3, 1, 10, 'pronoun-reflexive', 'mood-subjunctive', 'mood-participle', 'tense-perfect'),
  read('1jn', 3, 11, 24, 'tense-future', 'pronoun-interrogative', 'mood-infinitive', 'comparative'),
  read('1jn', 4, 1, 12, 'mood-imperative', 'pronoun-reciprocal', 'tense-perfect', 'comparative'),
  read('1jn', 4, 13, 21, 'pronoun-indefinite', 'mood-infinitive', 'conditional', 'tense-perfect'),
  read('1jn', 5, 1, 12, 'mood-participle', 'tense-perfect', 'pronoun-demonstrative', 'voice-passive'),
  read('1jn', 5, 13, 21, 'tense-future', 'pronoun-interrogative', 'mood-imperative', 'pronoun-indefinite'),
  // one passage a lesson: 2 John, thirteen verses, stands for the course's lesson on both short letters; titled for what it reads, not for both (mw-5r3p30.704)
  read('2jn', 1, 1, 13, 'comparative', 'voice-passive-deponent', 'mood-infinitive', 'pronoun-reciprocal'),
];
