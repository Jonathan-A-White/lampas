// tests/fixtures/diagrams/lesson-steps.ts — the ten steps of the lesson 'How to read a sentence diagram' (src/diagram/lesson.ts, mw-q6t5tvn.1) as the story sets them out: the verse each
// is of, its mode, the Reed-Kellogg convention it teaches, and the word of the right tap. Written apart from lesson.ts so a change to the lesson that drops a convention or a verse fails a test.
import type { DiagramMode } from '../../../src/diagram/types';

export interface ExpectedStep {
  /** the convention the step teaches, in docs/layout/diagram.md's words */
  convention: string;
  reference: string;
  mode: DiagramMode;
  /** the text of the word the check wants tapped */
  answerText: string;
  /** the step's title, only where the story sets it */
  title?: string;
  /** the line kind(s) layoutDiagram must have drawn for the step */
  drawn: string[];
}

export const EXPECTED_STEPS: readonly ExpectedStep[] = [
  { convention: 'the base line and the full bar', reference: 'John 11:35', mode: 'english', answerText: 'Jesus', drawn: ['base', 'bar-full'] },
  { convention: 'a word that describes another, on a slant', reference: 'John 1:5', mode: 'english', answerText: 'The', drawn: ['modifier', 'foot'] },
  { convention: 'a direct object after a half bar', reference: 'Mark 4:14', mode: 'english', answerText: 'word', drawn: ['bar-half'] },
  { convention: 'an understood subject in parentheses', reference: 'Luke 17:32', mode: 'english', answerText: 'Remember', drawn: ['bar-full'] },
  { convention: 'a predicate nominative after a bar slanting back', reference: '1 John 4:8', mode: 'english', answerText: 'love', drawn: ['bar-predicate'] },
  { convention: 'an indirect object on a slant with a line under it', reference: 'John 11:23', mode: 'english', answerText: 'her', drawn: ['indirect-slant'] },
  { convention: 'a prepositional phrase', reference: '1 Thessalonians 5:17', mode: 'english', answerText: 'without', drawn: ['prep-slant', 'object-line'] },
  { convention: 'two clauses joined by a dotted line carrying the connecting word', reference: 'John 1:5', mode: 'english', answerText: 'and', drawn: ['step'] },
  { convention: 'the same lines with Greek words in them', reference: 'Colossians 3:1', mode: 'english', answerText: 'ζητεῖτε', drawn: ['join', 'prep-slant'] },
  { convention: 'which line is which, in Greek: each line named with its Greek grammar term, each term a link to its lesson', title: 'Which line is which, in Greek', reference: 'Colossians 3:1', mode: 'greek', answerText: 'χριστῷ', drawn: ['bar-half', 'indirect-slant', 'prep-slant'] },
];

/** The terms step 10 lists, each a button that opens the idea sheet of its idea. */
export const EXPECTED_TERMS: ReadonlyArray<readonly [term: string, ideaId: string]> = [
  ['nominative', 'case-nominative'],
  ['accusative', 'case-accusative'],
  ['dative', 'case-dative'],
  ['genitive', 'case-genitive'],
  ['article', 'article'],
  ['adjective', 'adjective'],
  ['verb', 'verb'],
  ['adverb', 'adverb'],
  ['preposition', 'preposition'],
  ['participle', 'mood-participle'],
  ['infinitive', 'mood-infinitive'],
];
