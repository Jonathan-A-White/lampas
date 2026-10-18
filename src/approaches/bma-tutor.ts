// src/approaches/bma-tutor.ts
// Not listed: the record of BMA Tutor's order, read by the gap audit (docs/path-gaps.md). No app code imports this file (mw-foy5mb.1).
// 'BMA Tutor': the sequence of Biblical Mastery Academy's Greek course, followed with credit. Only the
// ORDER is theirs; every title, the method and the mapping to our ideas are Lampas's own words, and no course text, picture or exercise
// is copied (mw-hqd5bz.5). The passages the lessons read are Lampas's own picks, not the course's (mw-z370x5.1): 'Being plus a participle' reads John 3:24-28, which has three
// periphrastics by usesOf (src/data/grammar/uses.ts); the opening of a letter, an argument and an appeal read Romans 1:1-7, 8:31-39 and 12:1-2; the two wider stages read John and Romans 8. PROVISIONAL, the Governor to confirm. Where the course names a lesson the RP parsing codes cannot tell apart
// (root variations, assimilation), the lesson maps to the nearest ideas the ladder has, or revisits ideas taught earlier (docs/grammar.md,
// 'Approaches'). The third declension and the -μι verbs have ideas of their own (the pattern ideas, mw-svw421.1), each in the earliest lesson after
// everything it needs.
import { LADDER } from '../data/grammar/ladder';
import { JOHN_LESSONS } from './john-lessons';
import type { ApproachLesson, GrammarApproach, Passage } from './types';

const lesson = (title: string, ...ideas: string[]): ApproachLesson => ({ title, ideas });
/** A lesson that has him read a passage once its ideas are at least frontier (stepsOf, index.ts). */
const reads = (title: string, passage: Passage, ...ideas: string[]): ApproachLesson => ({ title, ideas, passage });
const at = (book: string, chapter: number, from: number, to: number): Passage => ({ book, chapter, from, to });

/** The alphabet and its 24 letters, which the ladder holds as ideas of the letters tier. */
const LETTERS = LADDER.filter((i) => i.tier === 'letters').map((i) => i.id);
/** The pairs of vowels, the pairs of consonants and the two breathings, which the ladder holds as an item each (mw-hqd5bz.18). */
const itemsOfGroup = (group: string): string[] => LADDER.filter((i) => i.parent === group).map((i) => i.id);
/** The twelve prepositions taken one by one (mw-86e9r1.5), each an idea of its own after the general one. */
const PREPOSITIONS_ONE_BY_ONE = LADDER.filter((i) => i.id.startsWith('preposition-')).map((i) => i.id);

export const bmaTutor: GrammarApproach = {
  id: 'bma-tutor',
  name: 'BMA Tutor',
  credit: {
    name: 'Biblical Mastery Academy',
    url: 'https://biblicalmastery.academy/',
    line: "After the Greek Success Path of Biblical Mastery Academy; the lessons and drills here are Lampas's own.",
  },
  method:
    'Letters and sounds come first, said aloud. A few nouns and little joining words come next, then verbs and short sentences, so you can read a line soon; the cases come one at a time. Each lesson takes a few ideas, shows them in real Greek and has you say and name them before you move on. The rarer tenses and moods wait until the common ones hold. The last levels read whole passages of John, each with the grammar it needs.',
  stages: [
    {
      title: 'Foundations',
      levels: [
        {
          title: 'Letters, sounds and first sentences',
          lessons: [
            lesson('The Greek letters', ...LETTERS),
            lesson('Saying words aloud', 'diphthongs', ...itemsOfGroup('diphthongs'), 'consonant-pairs', ...itemsOfGroup('consonant-pairs'), 'syllables'),
            lesson('Marks over the letters', 'breathings', ...itemsOfGroup('breathings'), 'accents', 'iota-subscript', 'words-sound-alike', 'punctuation', 'movable-letters', 'marks-change-word', 'enclitics'),
            lesson('Your first words', 'noun', 'number-singular', 'number-plural'),
            lesson('Joining and refusing', 'conjunction', 'negative'),
            lesson('Who acts and who is acted on', 'case-nominative', 'case-accusative', 'stem-and-ending'),
            lesson('Being: I am, you are, he is', 'person-1st', 'person-2nd', 'person-3rd', 'verb', 'eimi'),
            lesson('The present active statement', 'tense-present', 'voice-active', 'mood-indicative', 'contract-verbs'),
            lesson('A past action in progress', 'tense-imperfect'),
            lesson('The completed action', 'tense-aorist', 'augment'),
            lesson('Of and belonging to', 'case-genitive'),
            lesson('To, for, and calling out', 'case-dative', 'case-vocative'),
          ],
        },
        {
          title: 'Articles, pronouns and describing words',
          lessons: [
            lesson('A sentence takes shape', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'declension-1', 'declension-2'),
            lesson('The little word “the”, and names', 'article', 'proper-name'),
            lesson('Letters that change at a joint', 'crasis'),
            lesson('Stems that shift', 'attic-form'),
            lesson('I, you, he and she', 'pronoun', 'pronoun-personal'),
            lesson('This and that', 'pronoun-demonstrative'),
            lesson('Himself', 'pronoun-reflexive'),
            lesson('Who, which and that', 'pronoun-relative'),
            lesson('Who? and anyone', 'pronoun-interrogative', 'pronoun-indefinite'),
            lesson('Each other, such as, how great', 'pronoun-reciprocal', 'pronoun-correlative', 'pronoun-correlative-interrogative'),
            lesson('Small words that take a case', 'preposition', ...PREPOSITIONS_ONE_BY_ONE, 'compound-verbs'),
            lesson('Describing words', 'adjective', 'dictionary-entry'),
          ],
        },
        {
          title: 'More nouns, and the passive and middle',
          lessons: [
            lesson('The nouns with other patterns', 'noun', 'case-genitive', 'case-dative', 'declension-3'),
            lesson('Acting for oneself', 'voice-middle'),
            lesson('Being acted upon', 'voice-passive'),
            lesson('One form for two voices', 'voice-middle-or-passive'),
            lesson('More and most', 'comparative', 'superlative'),
            lesson('Counting', 'numeral'),
            lesson('A middle sense in an active form', 'voice-middle-significance'),
            lesson('Verbs that look passive or middle', 'voice-middle-deponent', 'voice-passive-deponent', 'voice-middle-or-passive-deponent'),
            lesson('Unusual verbs', 'voice-impersonal-active', 'voice-none'),
            lesson('Words that never change', 'indeclinable'),
            lesson('Small words that colour a line', 'particle', 'adverb'),
            lesson('Mine and yours', 'pronoun-possessive'),
          ],
        },
        {
          title: 'More tenses and moods',
          lessons: [
            lesson('What will happen', 'tense-future'),
            lesson('A finished action with a lasting result', 'tense-perfect', 'reduplication', 'tense-signs', 'principal-parts', 'oida'),
            lesson('That result, in the past', 'tense-pluperfect'),
            lesson('Verbs with their own endings', 'tense-present', 'second-tenses', 'mi-verbs'),
            lesson('What may happen', 'mood-subjunctive', 'subjunctive-hortatory'),
            lesson('If and unless', 'conditional'),
            lesson('A wish', 'mood-optative'),
            lesson('A command', 'mood-imperative'),
            lesson('No, not and do not', 'negative', 'prohibition', 'ou-me'),
            lesson('Asking a question', 'interrogative'),
            lesson('Cries and calls', 'interjection'),
            lesson('The verb as a whole', 'tense-future', 'tense-perfect', 'mood-subjunctive', 'mood-imperative'),
          ],
        },
        {
          title: 'Participles, infinitives and clauses',
          lessons: [
            lesson('The verb as a noun', 'mood-infinitive'),
            lesson('The verb as a describing word', 'mood-participle'),
            lesson('A participle that commands', 'mood-participle-imperative'),
            reads('Being plus a participle', at('jhn', 3, 24, 28), 'tense-perfect', 'mood-participle', 'periphrastic'),
            lesson('Clauses of condition and purpose', 'conditional', 'mood-subjunctive', 'condition', 'clause-hina'),
            lesson('Clauses that say who or which', 'pronoun-relative', 'mood-indicative', 'agreement', 'article-substantival'),
            lesson('Purpose and result with the infinitive', 'mood-infinitive', 'mood-subjunctive', 'infinitive-articular', 'infinitive-complement'),
            lesson('Clauses built on a participle', 'mood-participle', 'case-genitive', 'participle-adverbial', 'genitive-absolute'),
            lesson('Long sentences', 'conjunction', 'particle', 'postpositive', 'article-position', 'clause-hoti'),
            reads('Reading Paul: the opening of a letter', at('rom', 1, 1, 7), 'voice-passive', 'mood-participle'),
            reads('Reading Paul: an argument', at('rom', 8, 31, 39), 'conditional', 'preposition'),
            reads('Reading Paul: an appeal', at('rom', 12, 1, 2), 'mood-imperative', 'negative'),
          ],
        },
        {
          title: 'Reading the letters of John',
          lessons: [
            ...JOHN_LESSONS,
          ],
        },
      ],
    },
    {
      title: 'Wider reading',
      levels: [
        {
          title: 'Reading',
          lessons: [
            reads('Reading the prologue of John', at('jhn', 1, 1, 18), 'poetic', 'aramaic', 'hebrew'),
            reads('Reading a night talk in John', at('jhn', 3, 1, 21), 'poetic', 'aramaic', 'hebrew'),
          ],
        },
      ],
    },
    {
      title: 'Fluent reading',
      levels: [
        {
          title: 'Reading',
          lessons: [
            reads('Reading Romans 8', at('rom', 8, 1, 39), 'mood-participle', 'mood-infinitive'),
            reads('Reading the song of love', at('1co', 13, 1, 13), 'mood-participle', 'mood-infinitive'),
          ],
        },
      ],
    },
  ],
};
