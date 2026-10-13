// src/approaches/bma-tutor.ts — 'BMA Tutor': the sequence of Biblical Mastery Academy's Greek course, followed with credit. Only the
// ORDER is theirs; every title, the method and the mapping to our ideas are Lampas's own words, and no course text, picture or exercise
// is copied (mw-hqd5bz.5). PROVISIONAL, the Governor to confirm. Where the course names a lesson the RP parsing codes cannot tell apart
// (the third declension, athematic verbs, root variations, assimilation), the lesson maps to the nearest ideas the ladder has, or revisits
// ideas taught earlier (docs/grammar.md, 'Approaches').
import { LADDER } from '../data/grammar/ladder';
import type { ApproachLesson, GrammarApproach } from './types';

const lesson = (title: string, ...ideas: string[]): ApproachLesson => ({ title, ideas });

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
            lesson('Who acts and who is acted on', 'case-nominative', 'case-accusative'),
            lesson('Being: I am, you are, he is', 'person-1st', 'person-2nd', 'person-3rd', 'verb'),
            lesson('The present active statement', 'tense-present', 'voice-active', 'mood-indicative'),
            lesson('A past action in progress', 'tense-imperfect'),
            lesson('The completed action', 'tense-aorist'),
            lesson('Of and belonging to', 'case-genitive'),
            lesson('To, for, and calling out', 'case-dative', 'case-vocative'),
          ],
        },
        {
          title: 'Articles, pronouns and describing words',
          lessons: [
            lesson('A sentence takes shape', 'gender-masculine', 'gender-feminine', 'gender-neuter'),
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
            lesson('Describing words', 'adjective'),
          ],
        },
        {
          title: 'More nouns, and the passive and middle',
          lessons: [
            lesson('The nouns with other patterns', 'noun', 'case-genitive', 'case-dative'),
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
            lesson('A finished action with a lasting result', 'tense-perfect'),
            lesson('That result, in the past', 'tense-pluperfect'),
            lesson('Verbs with their own endings', 'tense-present', 'second-tenses'),
            lesson('What may happen', 'mood-subjunctive'),
            lesson('If and unless', 'conditional'),
            lesson('A wish', 'mood-optative'),
            lesson('A command', 'mood-imperative'),
            lesson('No, not and do not', 'negative'),
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
            lesson('Being plus a participle', 'tense-perfect', 'mood-participle'),
            lesson('Clauses of condition and purpose', 'conditional', 'mood-subjunctive'),
            lesson('Clauses that say who or which', 'pronoun-relative', 'mood-indicative'),
            lesson('Purpose and result with the infinitive', 'mood-infinitive', 'mood-subjunctive'),
            lesson('Clauses built on a participle', 'mood-participle', 'case-genitive'),
            lesson('Long sentences', 'conjunction', 'particle'),
            lesson('Reading Paul: the opening of a letter', 'voice-passive', 'mood-participle'),
            lesson('Reading Paul: an argument', 'conditional', 'preposition'),
            lesson('Reading Paul: an appeal', 'mood-imperative', 'negative'),
          ],
        },
        {
          title: 'Reading the letters of John',
          lessons: [
            lesson('1 John 1:1-4', 'pronoun-relative', 'tense-perfect', 'tense-aorist', 'tense-imperfect'),
            lesson('1 John 1:5-10', 'conditional', 'mood-subjunctive', 'negative', 'attic-form'),
            lesson('1 John 2:1-11', 'mood-imperative', 'tense-perfect', 'conditional', 'pronoun-indefinite'),
            lesson('1 John 2:12-17', 'tense-perfect', 'tense-aorist', 'pronoun-demonstrative', 'mood-imperative'),
            lesson('1 John 2:18-29', 'tense-pluperfect', 'pronoun-relative', 'voice-middle', 'mood-participle'),
            lesson('1 John 3:1-10', 'pronoun-reflexive', 'mood-subjunctive', 'mood-participle', 'tense-perfect'),
            lesson('1 John 3:11-24', 'tense-future', 'pronoun-interrogative', 'mood-infinitive', 'comparative'),
            lesson('1 John 4:1-12', 'mood-imperative', 'pronoun-reciprocal', 'tense-perfect', 'comparative'),
            lesson('1 John 4:13-21', 'pronoun-indefinite', 'mood-infinitive', 'conditional', 'tense-perfect'),
            lesson('1 John 5:1-12', 'mood-participle', 'tense-perfect', 'pronoun-demonstrative', 'voice-passive'),
            lesson('1 John 5:13-21', 'tense-future', 'pronoun-interrogative', 'mood-imperative', 'pronoun-indefinite'),
            lesson('2 John and 3 John', 'comparative', 'voice-passive-deponent', 'mood-infinitive', 'pronoun-reciprocal'),
          ],
        },
      ],
    },
    {
      title: 'Wider reading',
      levels: [{ title: 'Reading', lessons: [lesson('Reading', 'poetic', 'aramaic', 'hebrew')] }],
    },
    {
      title: 'Fluent reading',
      levels: [{ title: 'Reading', lessons: [lesson('Reading', 'mood-participle', 'mood-infinitive')] }],
    },
  ],
};
