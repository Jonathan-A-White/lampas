// src/tutor/knows.ts — what each grind is told (mw-5r3p30.242, VISION.md 'The tutor'): the Governor's rule is that the tutor always knows the app's
// current state where it could change what it says, and how far he has got. This is the table of it. For each grind: the settings and the parts of his
// progress its request carries (setting or part -> the request field that holds it) and, for every one it is not sent, the written reason.
// tests/unit/tutor-knows.test.ts fails when a registry setting that bears on speech, language, level, the quiz goal or his study way is in no grind's request
// without a reason here, when a new setting has no entry in BEARS_ON, and when a builder does not send what a row says. A new setting, or a new part of his
// progress, is classified here in the same story that makes it.
import { SOURCES } from '../maps/sources';
import { currentSettings, SETTINGS } from '../settings/registry';

export const GRINDS = ['bible-talk', 'verse-ask', 'verse-read', 'tips'] as const;
export type GrindKind = (typeof GRINDS)[number];

/** What a setting bears on: the five that can change an answer, or `screen` for one that only changes how the app looks or what it offers. */
export type Bearing = 'speech' | 'language' | 'level' | 'quizGoal' | 'studyWay' | 'screen';

/** Every setting of the registry by key, and what it bears on. */
export const BEARS_ON: Readonly<Record<string, Bearing>> = {
  theme: 'screen',
  font: 'screen',
  textSize: 'screen',
  layout: 'screen',
  readingMode: 'screen',
  chapterButtons: 'screen',
  variants: 'screen',
  variantWitnesses: 'screen',
  copyText: 'screen',
  copyReference: 'screen',
  copyNumbers: 'screen',
  copyLink: 'screen',
  sectionHeadings: 'screen',
  immersiveReader: 'screen',
  immersiveHint: 'screen',
  tips: 'screen',
  'resource.strongs': 'screen',
  // which map sources the Maps door and the tutor's map list draw on: what the app offers, not what he knows (one switch per source in src/maps/sources, mw-zbjgn3r.6)
  ...Object.fromEntries(SOURCES.map((source) => [`maps.${source.id}`, 'screen' as const])),
  'resource.logos': 'screen', // also gives a tapped English word its Look it up in Logos row (Webster's 1828): an offer on a sheet, it changes no answer
  logosBible: 'screen',
  audioBible: 'screen',
  readingPlan: 'screen',
  dailyReview: 'screen',
  dailyMemorize: 'screen',
  dailyPlan: 'screen',
  dailyPsalms: 'screen',
  dailyDevotional: 'screen',
  devotional: 'screen',
  devotionalDraw: 'screen',
  todaysDevotional: 'screen',
  dailyTicks: 'screen',
  greekKeyboard: 'screen',
  hebrewKeyboard: 'screen',
  readSpan: 'speech',
  readTutor: 'speech',
  readLessons: 'speech',
  askBy: 'speech',
  talk: 'screen',
  send: 'screen',
  englishVoice: 'speech',
  greekVoice: 'speech',
  englishRate: 'speech',
  greekRate: 'speech',
  hebrewVoice: 'speech',
  hebrewRate: 'speech',
  greekPronunciation: 'speech',
  hebrewPronunciation: 'speech',
  pronunciation: 'speech',
  // only which of the pronunciation rows is drawn: the schemes it leaves are sent as greekPronunciation and hebrewPronunciation
  pronunciationSeparate: 'screen',
  englishAccent: 'speech',
  // only whether the Goal screen offers the optional IPA lesson: the tutor answers the same either way
  ipaLesson: 'screen',
  hebrewDepth: 'language',
  languages: 'level',
  greekInterest: 'level',
  hebrewInterest: 'level',
  weave: 'level',
  weaveGrammar: 'level',
  weaveOrder: 'screen',
  newWordsADay: 'level',
  pickerGrammar: 'level',
  grammarMove: 'level',
  // which cells a paradigm table shows: what the table screen offers, not what he knows (mw-irpgqi.3: the table's own Ask the tutor tells the tutor the table, the mode, the cell he is on and the word he came from, as screen facts and the paradigm focus)
  paradigmExtent: 'screen',
  goal: 'level',
  grammarApproach: 'level',
  handwritingDrills: 'screen',
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
  works: 'his Logos shelf: the pinned books, the commentaries covering the chapter, and for a question about a form or a reading the grammars and Greek texts, chosen by the place (src/resources/tutorLinks.ts worksForTutor, src/data/repositories/library.ts)',
  maps: 'the maps of the passage the talk holds, as the tutor may link them: the chapter\'s maps with the places the held verse or range names (src/maps/forTutor.ts, Bible Mapper through src/maps)',
  variants: "the variant units set in the verses the talk holds, while Settings > Variants is on: each reading in Greek and English with its witness spelled out, and the chapter's count (src/tutor/variantFacts.ts)",
  today: "the items behind the Reader's chip 'Today · N of M', each with its title and whether he ticked it (src/data/learnerToday.ts)",
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
const FAMILY_SET_BOTH = 'Pronunciation sets greekPronunciation and hebrewPronunciation together; what it left them at is what the request carries, so it is not sent a second time.';
const NO_QUIZ = 'The quiz is the Bible talk\'s Quiz me mode alone; this grind never quizzes him.';

export const TUTOR_KNOWS: Readonly<Record<GrindKind, GrindKnows>> = {
  'bible-talk': {
    // currentSettings(): what every registry setting holds now, in `settings`; the pronunciation also has its own field the sound questions use (mw-5r3p30.241)
    // each dial is also its own field, greek_interest and hebrew_interest, with the step's name and the one step above it: all an offer may name, the chapter's language picking
    // which (mw-3ased2.3, mw-gdcyf98.3). The languages he reads is sent in `settings` (everySetting). The text of an Old Testament chapter goes under `hebrew` with `hebrew_words` (mw-gdcyf98.18),
    // from the Hebrew dial's Curious up; at Just English the request holds the English alone, and `hebrew_interest` tells the tutor why. `settings.hebrewDepth` is how it writes a Hebrew word.
    settings: { ...everySetting, greekPronunciation: 'pronunciation', greekInterest: 'greek_interest', hebrewInterest: 'hebrew_interest' },
    progress: { words: 'solid_words', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory', requests: 'requests', studyWay: 'study_way', rusty: 'rusty', today: 'today', works: 'works', maps: 'maps', variants: 'variants' },
    notSent: {},
  },
  'verse-ask': {
    settings: {
      askBy: 'settings.askBy',
      hebrewDepth: 'settings.hebrewDepth',
      readTutor: 'settings.readTutor',
      weave: 'settings.weave',
      weaveGrammar: 'settings.weaveGrammar',
      greekInterest: 'settings.greekInterest',
      // the Hebrew dial is also its own field, hebrew_interest (mw-gdcyf98.3), the Bible talk's shape
      hebrewInterest: 'settings.hebrewInterest',
      greekPronunciation: 'pronunciation',
      hebrewPronunciation: 'settings.hebrewPronunciation',
      englishAccent: 'settings.englishAccent',
      goal: 'learner_grammar.goal',
      pickerGrammar: 'learner_grammar.picker_level',
      grammarApproach: 'learner_grammar.approach',
    },
    progress: { words: 'solid_words', grammar: 'learner_grammar', profile: 'learner_profile', memory: 'memory', requests: 'requests', rusty: 'rusty', works: 'works' },
    notSent: {
      newWordsADay: 'How many new words are offered a day is the picker\'s pace; the answer is about this verse, and learner says what is new today.',
      grammarMove: 'Whether the app moves the grammar level for him is the Bible talk\'s offer to make; learner_grammar.picker_level is the level it left.',
      readSpan: 'Play to (the end of the book or of the Bible) is where the header\'s Play stops; a verse, a section heading or the place line reads just what he tapped. It changes nothing the answer says.',
      readLessons: READ_LESSONS,
      englishVoice: SPOKEN_LATER,
      greekVoice: SPOKEN_LATER,
      hebrewVoice: SPOKEN_LATER,
      englishRate: SPOKEN_LATER,
      greekRate: SPOKEN_LATER,
      hebrewRate: SPOKEN_LATER,
      pronunciation: FAMILY_SET_BOTH,
      quizGoal: NO_QUIZ,
      studyWay: NO_QUIZ,
      today: 'An ask is about one verse he is reading; what is on his Today list is for the Bible talk, where he can ask what is on his drill and be offered Today.',
      maps: 'An ask is about one verse and links no map; the maps of its chapter are the Bible talk\'s to name and to link, and the Verse view has its own Maps door.',
      variants: 'An ask is about one verse and reads it as it stands; the manuscripts\' variant readings of it are the Bible talk\'s to explain, and the Reader\'s braces and the brace sheet show them.',
      languages: 'Which languages he reads is the two dials read together (greekInterest and hebrewInterest here, and hebrew_interest as a field), so the ask is not given the sum a second time.',
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
      readSpan: 'Where the header\'s Play stops (Play to) has no part in the verdict on one verse he read.',
      readLessons: READ_LESSONS,
      readTutor: 'The verdict is written to be safe to speak whether or not it is read aloud to him (no words the voice mispronounces).',
      askBy: 'How he asks the tutor has no part in the verdict on a reading.',
      englishVoice: SPOKEN_LATER,
      greekVoice: SPOKEN_LATER,
      hebrewVoice: SPOKEN_LATER,
      englishRate: SPOKEN_LATER,
      greekRate: SPOKEN_LATER,
      hebrewRate: SPOKEN_LATER,
      pronunciation: FAMILY_SET_BOTH,
      hebrewPronunciation: 'A reading verdict is about English or Greek and never respells a Hebrew word.',
      hebrewDepth: 'A reading verdict is about English or Greek and never writes a Hebrew word.',
      weave: 'What the Reader weaves into the English has no part in the verdict on a reading of the verse as it is.',
      weaveGrammar: 'What the Reader weaves into the English has no part in the verdict on a reading of the verse as it is.',
      newWordsADay: 'The pace of new words has no part in the verdict on a reading.',
      greekInterest: 'How much Greek he wants in the app is for the talk and the asks to meet him at; a verdict on one reading is about that reading.',
      hebrewInterest: 'How much Hebrew he wants in the app is for the talk and the asks to meet him at; a verdict on one reading is about that reading.',
      languages: 'Which languages he reads is for the talk and the asks to meet him at; a verdict on one reading is about that reading.',
      grammarMove: 'The level move is the Bible talk\'s offer; learner_grammar.picker_level is the level it left.',
      quizGoal: NO_QUIZ,
      studyWay: NO_QUIZ,
      requests: 'What became of his requests to the factory has no part in the verdict on a reading.',
      rusty: 'A verdict on one reading is about that reading; what he has gone rusty on in his words and grammar is for the talk and the asks to name.',
      today: 'A verdict on one reading is about that reading; what is on his Today list is for the Bible talk to name and to offer to open.',
      works: 'A verdict on one reading is about that reading as he said it; the books of his Logos shelf have no part in it, and the verdict links nothing.',
      maps: 'A verdict on one reading is about that reading as he said it; the maps of its chapter have no part in it, and the verdict links nothing.',
      variants: 'A verdict on one reading is about that reading as he said it; the variant readings of the manuscripts have no part in it.',
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
      today: 'A tip is about a feature he has not tried; what is on his Today list is the Bible talk\'s to name and to offer to open.',
      works: 'A tip is about a feature he has not tried; which books his Logos shelf holds is for the talk and the asks to speak of.',
      maps: 'A tip is about a feature he has not tried; which maps a chapter has is for the Bible talk to name and to link.',
      variants: 'A tip is about a feature he has not tried; which variants a verse has is for the Bible talk to explain.',
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
