// src/tutor/knows.ts — what each grind is told (mw-5r3p30.242, VISION.md 'The tutor'): the Governor's rule is that the tutor always knows the app's
// current state where it could change what it says, and how far he has got. This is the table of it. For each grind: the settings and the parts of his
// progress its request carries (setting or part -> the request field that holds it) and, for every one it is not sent, the written reason.
// tests/unit/tutor-knows.test.ts fails when a registry setting that bears on speech, language, level, the quiz goal or his study way is in no grind's request
// without a reason here, when a new setting has no entry in BEARS_ON, and when a builder does not send what a row says. A new setting, or a new part of his
// progress, is classified here in the same story that makes it.
import { currentSettings, SETTINGS } from '../settings/registry';

export const GRINDS = ['bible-talk', 'verse-ask', 'verse-read', 'tips'] as const;
export type GrindKind = (typeof GRINDS)[number];

/** What a setting bears on: the five that can change an answer, or `screen` for one that only changes how the app looks or what it offers. */
export type Bearing = 'speech' | 'language' | 'level' | 'quizGoal' | 'studyWay' | 'screen';

/** Every setting of the registry by key, and what it bears on. */
export const BEARS_ON: Readonly<Record<string, Bearing>> = {
  theme: 'screen',
  textSize: 'screen',
  layout: 'screen',
  sectionHeadings: 'screen',
  immersiveReader: 'screen',
  immersiveHint: 'screen',
  tips: 'screen',
  'resource.strongs': 'screen',
  'resource.logos': 'screen',
  'resource.accordance': 'screen',
  logosBible: 'screen',
  audioBible: 'screen',
  readSpan: 'speech',
  readTutor: 'speech',
  readLessons: 'speech',
  askBy: 'speech',
  englishVoice: 'speech',
  greekVoice: 'speech',
  englishRate: 'speech',
  greekRate: 'speech',
  greekPronunciation: 'speech',
  englishAccent: 'speech',
  hebrewDepth: 'language',
  weave: 'level',
  weaveGrammar: 'level',
  newWordsADay: 'level',
  pickerGrammar: 'level',
  grammarMove: 'level',
  goal: 'level',
  grammarApproach: 'level',
  quizGoal: 'quizGoal',
};

/** The parts of his progress besides the settings (the study way is a list of lines he kept, not a setting). */
export const PROGRESS: Readonly<Record<string, string>> = {
  words: 'which words are solid, being learned, new today or due (src/data/learnerSummary.ts)',
  grammar: 'where his grammar stands, his goal, the approach and the move (src/data/grammar/learnerGrammar.ts)',
  profile: 'who he is as a student (src/data/learnerProfile.ts, Settings > About you)',
  memory: 'what Lampas remembers of him: the index and the notes named for the place, word and screen (src/data/learnerMemory.ts, Settings > Memory)',
  requests: 'what became of the things he asked the factory for (src/data/requestsForTutor.ts)',
  studyWay: 'the lines he kept about how the tutor quizzes him (src/data/repositories/studyWay.ts)',
  rusty: 'the solid words and ideas he now slips on or has not met for a long while (src/data/rusty.ts, src/data/learnerRusty.ts)',
};

export interface GrindKnows {
  /** a setting key -> the request field (a dotted path) that carries it */
  settings: Record<string, string>;
  /** a part of his progress (a key of PROGRESS) -> the request field that carries it */
  progress: Record<string, string>;
  /** a setting or part of progress the request does not carry -> why it does not change this grind's answer (at least a sentence) */
  notSent: Record<string, string>;
}

const bearingKeys = Object.entries(BEARS_ON)
  .filter(([, on]) => on !== 'screen')
  .map(([key]) => key);
/** every key of the registry, each at `settings.<key>` */
const everySetting = Object.fromEntries(SETTINGS.map((s) => [s.key, `settings.${s.key}`]));
/** the tips grind is told by key which settings he has changed and which never, not their values */
const byName = Object.fromEntries(bearingKeys.map((key) => [key, 'summary.settings_changed']));

const READ_LESSONS = 'Whether a lesson reads itself aloud when it opens is a reading control; it changes nothing the answer says.';
const SPOKEN_LATER = 'It changes how loud or fast the answer is heard, never what it says.';
const NO_QUIZ = 'The quiz is the Bible talk\'s Quiz me mode alone; this grind never quizzes him.';

export const TUTOR_KNOWS: Readonly<Record<GrindKind, GrindKnows>> = {
  'bible-talk': {
    // currentSettings(): what every registry setting holds now, in `settings`; the pronunciation also has its own field the sound questions use (mw-5r3p30.241)
    settings: { ...everySetting, greekPronunciation: 'pronunciation' },
    progress: { words: 'solid_words', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory', requests: 'requests', studyWay: 'study_way', rusty: 'rusty' },
    notSent: {},
  },
  'verse-ask': {
    settings: {
      askBy: 'settings.askBy',
      hebrewDepth: 'settings.hebrewDepth',
      readTutor: 'settings.readTutor',
      weave: 'settings.weave',
      weaveGrammar: 'settings.weaveGrammar',
      greekPronunciation: 'pronunciation',
      englishAccent: 'settings.englishAccent',
      goal: 'learner_grammar.goal',
      pickerGrammar: 'learner_grammar.picker_level',
      grammarApproach: 'learner_grammar.approach',
    },
    progress: { words: 'solid_words', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory', requests: 'requests', rusty: 'rusty' },
    notSent: {
      newWordsADay: 'How many new words are offered a day is the picker\'s pace; the answer is about this verse, and learner says what is new today.',
      grammarMove: 'Whether the app moves the grammar level for him is the Bible talk\'s offer to make; learner_grammar.picker_level is the level it left.',
      readSpan: 'How far Play reads aloud is a reading control; it changes nothing the answer says.',
      readLessons: READ_LESSONS,
      englishVoice: SPOKEN_LATER,
      greekVoice: SPOKEN_LATER,
      englishRate: SPOKEN_LATER,
      greekRate: SPOKEN_LATER,
      quizGoal: NO_QUIZ,
      studyWay: NO_QUIZ,
    },
  },
  'verse-read': {
    settings: {
      greekPronunciation: 'pronunciation',
      englishAccent: 'english_accent',
      goal: 'learner_grammar.goal',
      pickerGrammar: 'learner_grammar.picker_level',
      grammarApproach: 'learner_grammar.approach',
    },
    progress: { words: 'learner', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory' },
    notSent: {
      readSpan: 'How far Play reads aloud has no part in the verdict on one verse he read.',
      readLessons: READ_LESSONS,
      readTutor: 'The verdict is written to be safe to speak whether or not it is read aloud to him (no words the voice mispronounces).',
      askBy: 'How he asks the tutor has no part in the verdict on a reading.',
      englishVoice: SPOKEN_LATER,
      greekVoice: SPOKEN_LATER,
      englishRate: SPOKEN_LATER,
      greekRate: SPOKEN_LATER,
      hebrewDepth: 'A reading verdict is about English or Greek and never writes a Hebrew word.',
      weave: 'What the Reader weaves into the English has no part in the verdict on a reading of the verse as it is.',
      weaveGrammar: 'What the Reader weaves into the English has no part in the verdict on a reading of the verse as it is.',
      newWordsADay: 'The pace of new words has no part in the verdict on a reading.',
      grammarMove: 'The level move is the Bible talk\'s offer; learner_grammar.picker_level is the level it left.',
      quizGoal: NO_QUIZ,
      studyWay: NO_QUIZ,
      requests: 'What became of his requests to the factory has no part in the verdict on a reading.',
      rusty: 'A verdict on one reading is about that reading; what he has gone rusty on in his words and grammar is for the talk and the asks to name.',
    },
  },
  tips: {
    // the summary names, by key, the settings he has changed and the ones he never has (src/tips/summary.ts); a tip is about the app's features, never a sound
    settings: { ...byName, goal: 'learner_grammar.goal', pickerGrammar: 'learner_grammar.picker_level', grammarApproach: 'learner_grammar.approach' },
    progress: { words: 'learner', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory' },
    notSent: {
      requests: 'A tip is about what he has not yet tried in the app; his requests to the factory are not a feature to try.',
      studyWay: 'A tip may point at My study way through screens_never; the lines he kept change nothing a tip says.',
      rusty: 'A tip is about a feature he has not tried; rust in his words and ideas is the talk\'s to name and to offer to move back.',
    },
  },
};

/** The `settings` object of a request to `kind`: the value each setting the table puts at `settings.<key>` holds now (a voice he chose is 'other'). */
export async function settingsSentTo(kind: GrindKind): Promise<Record<string, string>> {
  const wanted = Object.values(TUTOR_KNOWS[kind].settings)
    .filter((field) => field.startsWith('settings.'))
    .map((field) => field.slice('settings.'.length));
  const all = await currentSettings();
  return Object.fromEntries(wanted.map((key) => [key, String(all[key])]));
}
