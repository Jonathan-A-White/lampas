// src/diagram/lesson.ts — the optional lesson 'How to read a sentence diagram' (mw-q6t5tvn.1, #/diagram-lesson): ten steps, one Reed-Kellogg convention each, drawn by ReedKellogg from a diagram
// written by hand here (never asked of the tutor) on a real verse or part of one, each with a one-tap check, and what he has done kept on the phone (localStorage, no Dexie), with whether the Diagram pane still invites him to it (mw-q6t5tvn.2). The conventions are
// the ones docs/layout/diagram.md 'The Reed-Kellogg conventions, as drawn' sets out, so the lesson teaches what the app draws. Pure data and the little keeping; the screen is DiagramLesson.tsx.
import { english, greek, hang, prep, slot, understood, w } from './handwritten';
import type { Diagram, DiagramWords, Modifier, Slot, WrittenDiagram } from './types';

/** The check of a step: the screen says 'Tap the <role>', and `answer` is the index in the step's words of the word that is right. */
export interface LessonCheck {
  role: string;
  answer: number;
}

/** A step: the diagram it draws (WrittenDiagram), with its title and text above it and its check. */
export interface LessonStep extends WrittenDiagram {
  /** a step's short name, its heading */
  title: string;
  /** one or two plain sentences, above the diagram */
  text: string;
  check: LessonCheck;
  /** only the step that names the lines by their Greek terms: one entry a term, each a link that opens that idea's lesson */
  terms?: readonly LessonTerm[];
}

/** One line of the list under step 10's diagram: `term` is the button (the idea's lesson at `ideaId` opens from it), `line` says which line of the diagram it is. */
export interface LessonTerm {
  term: string;
  ideaId: string;
  line: string;
}

/** The understood 'you' of a command. */
const YOU: Slot = understood('you');

/** Colossians 3:1 as the Weave can show it: the chunks the Weave shows in Greek (src/diagram/weave.ts) carry their Greek words (`weft`: the verse's Greek word indexes), the English left over is emptied. */
const COLOSSIANS_WOVEN: DiagramWords = [
  { text: 'Therefore', chunk: 0 },
  { text: 'since', chunk: 1 },
  { text: 'you', chunk: 2 },
  { text: 'have', chunk: 2 },
  { text: 'been', chunk: 2 },
  { text: 'raised', chunk: 2 },
  { text: 'with', chunk: 2 },
  { text: 'χριστῷ', chunk: 3, weft: [4] },
  { text: 'ζητεῖτε', chunk: 4, weft: [7] },
  { text: '', chunk: 4, weft: [] },
  { text: 'the', chunk: 5 },
  { text: 'things', chunk: 5 },
  { text: 'ἄνω', chunk: 6, weft: [6] },
  { text: 'where', chunk: 7 },
  { text: 'χριστός', chunk: 8, weft: [10] },
  { text: 'ἐστιν', chunk: 9, weft: [11] },
  { text: 'καθήμενος', chunk: 10, weft: [16] },
  { text: 'ἐν', chunk: 11, weft: [12] },
  { text: 'the', chunk: 12 },
  { text: 'right', chunk: 12 },
  { text: 'hand', chunk: 12 },
  { text: 'of', chunk: 13 },
  { text: 'God', chunk: 13 },
];

/** 'where Christ is seated at the right hand of God', hanging on 'above'. */
const WHERE: Modifier = {
  kind: 'clause',
  connector: w(13),
  clause: { subject: slot([14]), verb: slot([15]), complement: { kind: 'predicate-adjective', slot: slot([16], [prep(17, slot([20], [hang(18), hang(19), prep(21, slot([22]))]))]) } },
};
/** 'since you have been raised with Christ', hanging on 'strive'. */
const SINCE: Modifier = { kind: 'clause', connector: w(1), clause: { subject: slot([2]), verb: slot([3, 4, 5], [prep(6, slot([7]))]) } };

/** The same tree the tutor drew for Colossians 3:1 (tests/fixtures/diagrams/col-3-1-english.json): the words are the woven ones above. */
const COLOSSIANS: Diagram = {
  clauses: [{ clause: { subject: YOU, verb: slot([8], [hang(0), prep(9, slot([11], [hang(10), hang(12, [WHERE])])), SINCE]) } }],
};

/** The Greek of Colossians 3:1 as the Greek face of the Diagram draws it (tests/fixtures/diagrams/col-3-1-greek.json): the verse's own words, marks stripped. */
const COLOSSIANS_GREEK: DiagramWords = greek(
  [0, 'Εἰ'], [1, 'οὖν'], [2, 'συνηγέρθητε'], [3, 'τῷ'], [4, 'χριστῷ'], [5, 'τὰ'], [6, 'ἄνω'], [7, 'ζητεῖτε'], [8, 'οὗ'],
  [9, 'ὁ'], [10, 'χριστός'], [11, 'ἐστιν'], [12, 'ἐν'], [13, 'δεξιᾷ'], [14, 'τοῦ'], [15, 'θεοῦ'], [16, 'καθήμενος'],
);

/** The same tree with the Greek's own words: 'you' is understood on both verbs (the ending carries it), and 'χριστῷ' hangs under 'συνηγέρθητε' as an indirect object. */
const COLOSSIANS_GREEK_TREE: Diagram = {
  clauses: [
    {
      clause: {
        subject: understood('ὑμεῖς'),
        verb: slot([7], [
          hang(1),
          {
            kind: 'clause',
            connector: w(0),
            clause: { subject: understood('ὑμεῖς'), verb: slot([2]), complement: { kind: 'indirect-object', slot: slot([4], [hang(3)]) } },
          },
        ]),
        complement: {
          kind: 'direct-object',
          slot: slot([6], [
            hang(5),
            {
              kind: 'clause',
              connector: w(8),
              clause: {
                subject: slot([10], [hang(9)]),
                verb: slot([11], [prep(12, slot([13], [hang(15, [hang(14)])]))]),
                complement: { kind: 'predicate-adjective', slot: slot([16]) },
              },
            },
          ]),
        },
      },
    },
  ],
};

/** Each line of a diagram by its Greek term, in the order step 10 lists them. */
const TERMS: readonly LessonTerm[] = [
  { term: 'nominative', ideaId: 'case-nominative', line: 'the subject line' },
  { term: 'accusative', ideaId: 'case-accusative', line: 'the direct object, after the vertical bar' },
  { term: 'dative', ideaId: 'case-dative', line: 'the indirect object, hung below the verb' },
  { term: 'genitive', ideaId: 'case-genitive', line: 'often a modifier hung below a noun' },
  { term: 'article', ideaId: 'article', line: 'a modifier hung below a noun' },
  { term: 'adjective', ideaId: 'adjective', line: 'a modifier hung below a noun' },
  { term: 'verb', ideaId: 'verb', line: 'the verb line' },
  { term: 'adverb', ideaId: 'adverb', line: 'a modifier hung below the verb' },
  { term: 'preposition', ideaId: 'preposition', line: 'on the slanted line, its object after it' },
  { term: 'participle', ideaId: 'mood-participle', line: 'stands in the place of the part it serves' },
  { term: 'infinitive', ideaId: 'mood-infinitive', line: 'stands in the place of the part it serves' },
];

export const LESSON_TITLE = 'How to read a sentence diagram';

export const LESSON_STEPS: readonly LessonStep[] = [
  {
    title: 'The base line',
    text: 'A sentence stands on a level line. The subject is on the left and the verb on the right, parted by a tall bar that goes through the line.',
    reference: 'John 11:35',
    verse: { book: 'jhn', chapter: 11, verse: 35 },
    mode: 'english',
    words: english('Jesus', 'wept'),
    diagram: { clauses: [{ clause: { subject: slot([0]), verb: slot([1]) } }] },
    check: { role: 'subject', answer: 0 },
  },
  {
    title: 'A word that describes another',
    text: 'A word that describes another hangs beneath it on a slanting line, standing on a short level line of its own. Here “The” describes “Light”.',
    reference: 'John 1:5',
    verse: { book: 'jhn', chapter: 1, verse: 5 },
    mode: 'english',
    words: english('The', 'Light', 'shines'),
    diagram: { clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([2]) } }] },
    check: { role: 'word that describes “Light”', answer: 0 },
  },
  {
    title: 'A direct object',
    text: 'What the verb acts on, the direct object, comes after the verb. A short upright bar, resting on the line and not going through it, stands before it.',
    reference: 'Mark 4:14',
    verse: { book: 'mrk', chapter: 4, verse: 14 },
    mode: 'english',
    words: english('The', 'farmer', 'sows', 'the', 'word'),
    diagram: { clauses: [{ clause: { subject: slot([1], [hang(0)]), verb: slot([2]), complement: { kind: 'direct-object', slot: slot([4], [hang(3)]) } } }] },
    check: { role: 'direct object', answer: 4 },
  },
  {
    title: 'An understood subject',
    text: 'A command has no spoken subject: the one told is “you”, which stands in parentheses on the subject side. It is not a word of the verse, so it cannot be tapped.',
    reference: 'Luke 17:32',
    verse: { book: 'luk', chapter: 17, verse: 32 },
    mode: 'english',
    words: english('Remember', 'Lot’s', 'wife'),
    diagram: { clauses: [{ clause: { subject: YOU, verb: slot([0]), complement: { kind: 'direct-object', slot: slot([2], [hang(1)]) } } }] },
    check: { role: 'verb', answer: 0 },
  },
  {
    title: 'A word that says what the subject is',
    text: 'After a verb like “is”, a bar slanting back toward the subject comes before a word that says what the subject is or what it is like.',
    reference: '1 John 4:8',
    verse: { book: '1jn', chapter: 4, verse: 8 },
    mode: 'english',
    words: english('God', 'is', 'love'),
    diagram: { clauses: [{ clause: { subject: slot([0]), verb: slot([1]), complement: { kind: 'predicate-nominative', slot: slot([2]) } } }] },
    check: { role: 'predicate nominative', answer: 2 },
  },
  {
    title: 'An indirect object',
    text: 'The one who is told or given something is the indirect object. It has no bar: it hangs beneath the verb on a slanting line, with a line under it.',
    reference: 'John 11:23',
    verse: { book: 'jhn', chapter: 11, verse: 23 },
    mode: 'english',
    words: english('Jesus', 'told', 'her'),
    diagram: { clauses: [{ clause: { subject: slot([0]), verb: slot([1]), complement: { kind: 'indirect-object', slot: slot([2]) } } }] },
    check: { role: 'indirect object', answer: 2 },
  },
  {
    title: 'A phrase with a preposition',
    text: 'A preposition and the word it governs hang beneath the word they go with. The preposition is written on the slanting line and its word on the level line that leaves it.',
    reference: '1 Thessalonians 5:17',
    verse: { book: '1th', chapter: 5, verse: 17 },
    mode: 'english',
    words: english('Pray', 'without', 'ceasing'),
    diagram: { clauses: [{ clause: { subject: YOU, verb: slot([0], [prep(1, slot([2]))]) } }] },
    check: { role: 'preposition', answer: 1 },
  },
  {
    title: 'Two clauses joined',
    text: 'Two clauses are drawn one under the other. A dotted line runs down the left side between them, and the word that joins them is written on it.',
    reference: 'John 1:5',
    verse: { book: 'jhn', chapter: 1, verse: 5 },
    mode: 'english',
    words: english('The', 'Light', 'shines', 'in', 'the', 'darkness', 'and', 'the', 'darkness', 'has', 'not', 'overcome', 'it'),
    diagram: {
      clauses: [
        { clause: { subject: slot([1], [hang(0)]), verb: slot([2], [prep(3, slot([5], [hang(4)]))]) } },
        { joinedBy: w(6), clause: { subject: slot([8], [hang(7)]), verb: slot([9, 11], [hang(10)]), complement: { kind: 'direct-object', slot: slot([12]) } } },
      ],
    },
    check: { role: 'word that joins the two clauses', answer: 6 },
  },
  {
    title: 'The same lines, with Greek in them',
    text: 'In the Weave, or in the Greek, the lines are the same and Greek words stand on them. In a sentence diagram of a verse, a tap on any word opens its word sheet; here a tap is your answer.',
    reference: 'Colossians 3:1',
    verse: { book: 'col', chapter: 3, verse: 1 },
    mode: 'english',
    words: COLOSSIANS_WOVEN,
    diagram: COLOSSIANS,
    check: { role: 'verb of the top line', answer: 8 },
  },
  {
    title: 'Which line is which, in Greek',
    text: 'Every line of a diagram has its Greek name, the grammar term for the word that stands on it. Tap a term to open its lesson, and come back here when you close it.',
    reference: 'Colossians 3:1',
    verse: { book: 'col', chapter: 3, verse: 1 },
    mode: 'greek',
    words: COLOSSIANS_GREEK,
    diagram: COLOSSIANS_GREEK_TREE,
    check: { role: 'dative', answer: 4 },
    terms: TERMS,
  },
];

/** The prompt of a step's check. */
export const checkPrompt = (step: LessonStep): string => `Tap the ${step.check.role}`;

const DONE_KEY = 'lampas.diagram-lesson';
const STEP_KEY = 'lampas.diagram-lesson.step';
const INVITE_KEY = 'lampas.diagram-lesson.invite';
/** What DONE_KEY holds once he has tapped Done. */
export const DONE_VALUE = 'done';
/** What INVITE_KEY holds once he has tapped Not now. */
export const DISMISSED_VALUE = 'dismissed';

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Whether he has finished the lesson. */
export const lessonDone = (): boolean => store()?.getItem(DONE_KEY) === DONE_VALUE;

/** The step he left the lesson at (0-based), or the first when none is kept or the one kept is not a step. */
export function lessonStep(): number {
  const at = Number(store()?.getItem(STEP_KEY));
  return Number.isInteger(at) && at >= 0 && at < LESSON_STEPS.length ? at : 0;
}

/** Keeps the step he has reached, so leaving early opens there next time. */
export function keepLessonStep(at: number): void {
  try {
    store()?.setItem(STEP_KEY, String(at));
  } catch {
    // Storage full or refused: the lesson opens at the first step next time.
  }
}

/** Keeps the lesson done, and forgets the step: a second visit starts again from the first. */
export function keepLessonDone(): void {
  try {
    store()?.setItem(DONE_KEY, DONE_VALUE);
    store()?.removeItem(STEP_KEY);
  } catch {
    // Storage full or refused: nothing is kept.
  }
}

/** Whether the Diagram pane still invites him to the lesson (mw-q6t5tvn.2): until he has finished it or tapped Not now. */
export const lessonInvited = (): boolean => !lessonDone() && store()?.getItem(INVITE_KEY) !== DISMISSED_VALUE;

/** Keeps the invitation dismissed for good. */
export function keepInviteDismissed(): void {
  try {
    store()?.setItem(INVITE_KEY, DISMISSED_VALUE);
  } catch {
    // Storage full or refused: the invitation shows again next time.
  }
}
