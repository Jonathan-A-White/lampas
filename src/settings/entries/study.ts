// src/settings/entries/study.ts — the registry entries of the study settings written by hand: Grammar of the Weave, New words a day, New words at, Move it, Goal, Grammar approach and
// Quiz goal (SETTINGS slots 260, 320 to 340, 360, 370 and 720, src/settings/entry.ts).
import { APPROACHES, DEFAULT_APPROACH, approachOf } from '../../approaches';
import { BOOK_INDEX } from '../../data/bookIndex';
import { goalTitle, parseGoal } from '../../data/goal';
import { normaliseNewWordsADay } from '../../data/pace';
import {
  getGoal,
  getGrammarApproach,
  getGrammarMove,
  getNewWordsADay,
  getPickerGrammar,
  getQuizGoal,
  getWeaveGrammar,
  QUIZ_GOAL_MAX,
  setGoal,
  setGrammarApproach,
  setGrammarMove,
  setNewWordsADay,
  setPickerGrammar,
  setQuizGoal,
  setWeaveGrammar,
  type GrammarMove,
  type PickerGrammar,
  type WeaveGrammar,
} from '../../data/repositories';
import { publish } from '../../events/bus';
import { extentChoices } from '../definitions/grammarExtent';
import { depthFrom } from '../definitions/interest';
import { choice, slotted, type SettingEntry } from '../entry';

export const weaveGrammarSlot = slotted(
  260,
  choice(
    'weaveGrammar',
    'Grammar',
    'Keep only forms whose grammar you have.',
    extentChoices('weaveGrammar'),
    getWeaveGrammar,
    async (value) => {
      await setWeaveGrammar(value as WeaveGrammar);
      publish({ kind: 'weave-grammar-changed', grammar: value as WeaveGrammar });
    },
    {
      section: 'weave',
      dependsOn: { key: 'weave', shown: (value) => value !== 'off' },
      help: 'Of the woven Greek or Hebrew, keep only forms whose grammar you have at this level: Any, Solid, or Solid and frontier. It shows only while the Weave is not Off.',
    },
  ),
);

export const newWordsSlot = slotted(320, [
  choice(
    'newWordsADay',
    'New words a day',
    'How many new words are offered a day.',
    [
      { value: '0', label: 'Off' },
      { value: '3', label: '3' },
      { value: '5', label: '5' },
      { value: '10', label: '10' },
    ],
    async () => String(await getNewWordsADay()),
    async (value) => {
      await setNewWordsADay(normaliseNewWordsADay(value));
    },
    {
      section: 'newWords',
      dependsOn: depthFrom(3),
      help: 'From the chapter you are reading, most common first. Off offers none; none while many reviews are due or the last round went badly; a clean week adds a notch.',
    },
  ),
  choice(
    'pickerGrammar',
    'New words at',
    'Offer new words by the grammar of their form.',
    extentChoices('pickerGrammar'),
    getPickerGrammar,
    async (value) => {
      await setPickerGrammar(value as PickerGrammar);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Offer only new words whose form uses grammar you have at this level. It shows only while New words a day is not Off.',
    },
  ),
  choice(
    'grammarMove',
    'Move it',
    'Whether the app moves that level for you.',
    [
      { value: 'ask', label: 'Ask' },
      { value: 'auto', label: 'Auto' },
      { value: 'off', label: 'Off' },
    ],
    getGrammarMove,
    async (value) => {
      await setGrammarMove(value as GrammarMove);
    },
    {
      section: 'newWords',
      dependsOn: { key: 'newWordsADay', shown: (value) => value !== '0' },
      help: 'Whether New words at moves by how your grammar reviews go:\n\n- **Ask**: offers.\n- **Auto**: moves and says so.\n- **Off**: never.\n\nIt shows only while New words a day is not Off.',
    },
  ),
]);

// The goal is checked against the committed index (src/data/bookIndex.ts), so a book, chapter or verse the text lacks is refused at once.
const INDEX = BOOK_INDEX;

/** The goal text names, as `parseGoal` reads it; '' is no goal. */
const goalOf = (value: string) => (value.trim() === '' ? null : (parseGoal(value, INDEX) ?? null));

const goalEntry: SettingEntry = {
  section: 'goal',
  dependsOn: depthFrom(3),
  key: 'goal',
  label: 'Goal',
  hint: 'The passage you are working toward: a book, a chapter or a verse.',
  allowed: { kind: 'text', valid: (value) => value.trim() === '' || goalOf(value) !== null, example: '1 John 1:1' },
  read: getGoal,
  write: async (value) => {
    const goal = goalOf(String(value));
    await setGoal(goal ? goalTitle(goal, INDEX) : '');
    publish({ kind: 'goal-changed', goal });
  },
  show: (value) => {
    const goal = goalOf(String(value));
    return `Goal: ${goal ? goalTitle(goal, INDEX) : 'none'}`;
  },
};

export const goalSlot = slotted(360, goalEntry);

export const grammarApproachSlot = slotted(
  370,
  choice(
    'grammarApproach',
    'Grammar approach',
    'The order grammar is taught and tested in.',
    APPROACHES.map((a) => ({ value: a.id, label: a.name })),
    getGrammarApproach,
    async (value) => {
      const approach = approachOf(value)?.id ?? DEFAULT_APPROACH;
      await setGrammarApproach(approach);
      publish({ kind: 'approach-changed', approach });
    },
    { section: 'approach', dependsOn: depthFrom(3) },
  ),
);

const quizGoalEntry: SettingEntry = {
  section: 'studyWay',
  ai: true,
  dependsOn: depthFrom(3),
  key: 'quizGoal',
  label: 'Quiz goal',
  hint: 'Why you want Quiz me; the tutor quizzes to match. Empty: it asks.',
  help: 'What you want from a quiz, in your own words, such as understanding the passage, learning Greek or Hebrew, learning English or just reading the Bible. A kept goal is sent with every quiz and the tutor quizzes to match; with none kept, Quiz me opens by asking you.',
  allowed: { kind: 'text', valid: (value) => value.trim().length <= QUIZ_GOAL_MAX, example: 'understanding the passage', note: `a short phrase in his words, at most ${QUIZ_GOAL_MAX} characters; "" for none` },
  read: getQuizGoal,
  write: async (value) => {
    await setQuizGoal(String(value));
  },
  show: (value) => `Quiz goal: ${String(value).trim() === '' ? 'none' : String(value).trim()}`,
};

export const quizGoalSlot = slotted(720, quizGoalEntry);
