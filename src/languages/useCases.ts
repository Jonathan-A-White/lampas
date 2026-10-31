// src/languages/useCases.ts — the golden list: every use case of the app that a language must have, and where each language stands on it
// (mw-5r3p30.903, his post of 2026-10-31 04:10Z: "there should be something where you know there are use cases and the use cases for Latin and the
// use cases for Hebrew and the use cases for Greek align"). Greek, the most developed, wrote the list. A use case is proved for a language by a
// scenario under features/ tagged @uc-<id> and @<language>; tests/unit/language-parity.test.ts holds this file to those tags, and
// docs/language-parity.md is written from both (npm run parity:docs). The rule for a Builder: a new use case is a tagged scenario for every enabled
// language plus an entry here, in the same story; a gap is allowed only as a `gap` here with its backfill named. Nothing in the app reads this file.

/** The languages the golden list is kept for. A language is enabled once the app teaches it; a disabled one may claim nothing. */
export type Language = 'greek' | 'hebrew' | 'latin';

export interface LanguageInfo {
  id: Language;
  label: string;
  /** the app teaches it today: its `has` statuses are checked against the scenarios, and none may be missing without a `gap` */
  enabled: boolean;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { id: 'greek', label: 'Greek', enabled: true },
  { id: 'hebrew', label: 'Hebrew', enabled: true },
  // Latin is the next language (the held epic mw-cbsbw9q, its probe mw-cbsbw9q.2): enabled when its first story lands.
  { id: 'latin', label: 'Latin', enabled: false },
];

/**
 * Where a language stands on a use case: `has` (a tagged scenario proves it), a gap (the backfill a story would do: the scenario it must add,
 * the files, a size XS to M) or n/a (why the use case does not apply to the language).
 */
export type Status = 'has' | { gap: string } | { na: string };

export const isGap = (status: Status | undefined): status is { gap: string } => typeof status === 'object' && status !== null && 'gap' in status;
export const isNa = (status: Status | undefined): status is { na: string } => typeof status === 'object' && status !== null && 'na' in status;

export interface UseCase {
  /** the tag's id: @uc-<id> */
  id: string;
  /** the use case in a line, as the Governor would say it */
  title: string;
  status: Record<Language, Status>;
}

/** Latin's standing on everything until its epic lands. */
const LATIN_LATER: Status = { gap: 'Latin is not yet enabled: the held epic mw-cbsbw9q (probe mw-cbsbw9q.2) brings it in; see docs/language-parity.md "A new language"' };

export const USE_CASES: readonly UseCase[] = [
  // Reading
  {
    id: 'english-text',
    title: 'The English of a chapter beside its source text (the MSB for the Greek, the BSB for the Hebrew)',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'source-view',
    title: "The Reader's source view and its English | Source switch, immersive reading, the chips row",
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'weave',
    title: 'The diglot weave: his known words stand in the source language inside the English',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'variants',
    title: 'Textual variants inline in the Reader, the witnesses setting and reading sets',
    status: {
      greek: 'has',
      hebrew: { na: 'the WLC data carries no apparatus (no Qere/Ketiv or witness lists are built, docs/data.md); a story that adds one reopens this row' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'copy',
    title: 'Copy and Share give the words as he reads them, the source text in the source view',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "In the Hebrew view, Copy pastes the Hebrew" in features/hebrew-reader.feature; src/copy/format.ts already takes the chapter lang, so the step file features/steps/hebrew-reader.steps.tsx and a check of the pasted text; XS' },
      latin: LATIN_LATER,
    },
  },
  // The word
  {
    id: 'word-sheet',
    title: 'The word card: form, respelling, lemma, gloss, parsing with its terms as links, Help with this word',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'hear-word',
    title: 'Hearing a word: a tap or long press says it in its language, the one-letter words, no voice says so',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'links',
    title: 'Links into the app at a word or a verse of the language (#/?word=G..., #/?word=H...)',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  // The verse
  {
    id: 'verse-view',
    title: 'The Verse view of a verse or passage in the source language, with its actions',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'listen',
    title: 'Hearing a verse: Listen in the Verse view says the verse in its voice',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'read-aloud',
    title: 'Read aloud what is shown (Read from the top, a verse, the weave in each piece’s language) with the one speaking bar',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'tutor-aloud',
    title: "The tutor's answers read aloud, the source words in their own voice",
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "The tutor’s answer read aloud says its Hebrew words in the Hebrew voice" in features/hebrew-speech.feature; src/speech/answerRuns.ts (a Hebrew stretch becomes a run in the Hebrew voice as a Greek one does), features/steps/hebrew-speech.steps.tsx; docs/hebrew.md "Not done" names it; S' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'tutor-word',
    title: "A source word in the tutor's answer: drawn in its face, tappable, said, its guide, Add to my words",
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  // Speech and sound
  {
    id: 'voice-settings',
    title: "The language's voice and speed rows in Settings, shown from its dial's Curious",
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'voice-test',
    title: 'Hear and switch the voice from Settings: the name of the voice in use and Test',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "Test under the Hebrew voice says a Hebrew word in the voice in use" in a new features/hebrew-voice-test.feature; src/settings/controls/voice.tsx (GreekVoiceInUse drawn for one language: take the language), src/speech/greek.ts voiceInUse/testGreekVoice by language; S' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'pronunciation',
    title: 'The respelling of a word in the chosen pronunciation, the one family setting and each language on its own',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'ipa-course',
    title: 'Learn the IPA sounds, the optional course, behind a setting',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'sound-lessons',
    title: "Hard sounds: optional lessons on the sounds his English makes hard, with Try it and the pair drill",
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "The Goal lists the Hebrew hard sounds for his accent and opens one" in a new features/hebrew-hard-sounds.feature; a lesson file per sound (het, ayin, resh, tsade) in src/hardSounds/lessons.ts keyed by the Israeli scheme’s sound ids, src/hardSounds/ and the Goal’s Optional section by the Hebrew dial (src/GoalScreen.tsx); M' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'letter-drill',
    title: 'The letters: each taught from its sheet with Hear it, the letter drill and Say it',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'handwriting',
    title: 'Write it: a letter by hand, traced, copied and from memory, in the letter lessons and drills',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "Write it on Alef traces its strokes" in features/hebrew-letters.feature; stroke data for the 27 glyphs beside the Greek ones in src/handwriting/, the Write it part of a Hebrew letter sheet and the drill’s Write it questions (src/data/grammar/hebrew/letterQuestions.ts), Settings > Handwriting drills shown by either dial (src/settings/registry.ts); M' },
      latin: LATIN_LATER,
    },
  },
  // Words
  {
    id: 'words',
    title: 'Words he knows: the list under its language, a segment where two languages are chosen',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'quick-test',
    title: 'The Quick test on his words, asked in the dictionary form among words of the same language',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'review',
    title: 'Review brings back the words and ideas due, on the schedule, each asked in its language',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'new-words',
    title: 'New words taught while he reads: the frontier, the pace, the teach sheet, the picker at his grammar level',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'pictures',
    title: 'Memory pictures on the teach sheet and in the talk',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "The teach sheet of a Hebrew word with a picture shows it" in features/hebrew-words.feature; a picture per Hebrew seed lemma under public/pictures/ and its row in the pictures index (docs/pictures.md says where), credited in ATTRIBUTION.md; S' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'parsing-drill',
    title: 'The Parsing drill on the open chapter asks a word’s terms with the verse in its language',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'example-words',
    title: 'The example words a new phone holds (docs/example-words.md), which the offers and the tests draw on',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "A new phone’s Hebrew Quick test draws its wrong answers from the Hebrew example words" in features/hebrew-words.feature; src/data/seed-words-hbo.ts is built (npm run seed:build) and src/data/quiz.ts reads it, so only the scenario and features/steps/hebrew-words.steps.tsx; XS' },
      latin: LATIN_LATER,
    },
  },
  // Grammar
  {
    id: 'grammar-ladder',
    title: 'The grammar ladder: the Goal, the idea sheet, the terms and their Grammar sheet, levels that turn solid, inference',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'drill-it',
    title: 'Drill it on an idea, the grammar drills in Review, more drill items from the mill',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'placement',
    title: 'Placement: test me on the grammar and meet me where I am',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'paradigms',
    title: 'Paradigms: the tables, a word’s own paradigm, Drill on a table, How much of a table',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'grammar-approach',
    title: 'Grammar approach: the order and voice the ladder is taught in',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "A Hebrew approach orders the Hebrew ladder" in features/hebrew-grammar.feature; an approach for the Hebrew ladder in src/approaches/, src/settings/registry.ts Grammar approach shown by either dial (today greekFrom, docs/layout/settings.md), and the Hebrew ladder\u2019s path reads it; M' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'lessons',
    title: 'Lessons read to him: Read lessons to me, a passage lesson that opens its verses and Check passes it by reading',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "A Hebrew passage lesson opens its verses in Hebrew and Check passes it by reading" in features/hebrew-ladder.feature; a passage step in the Hebrew ladder (src/data/grammar/hebrew/ladder.ts), src/data/grammar/lessons.ts and the Verse view’s Check for an hbo chapter; S' },
      latin: LATIN_LATER,
    },
  },
  // Study
  {
    id: 'reading-ladder',
    title: 'The reading ladder: verses by how hard they are to say, Read it aloud, the reading check, drills on what he missed, his readings kept',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'memorize',
    title: 'Memorize a verse: the target text, the session, hearing and typing it, the schedule, the tutor on it',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'diagram',
    title: 'The sentence diagram of a verse (Reed-Kellogg) and the lesson on reading one',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'verse-quiz',
    title: 'Quiz me on a verse, with the quiz goal, in the Talk sheet',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'practise',
    title: 'The Practise door on a verse: copywork, narration, dictation, summary and the quiz (Susan Wise Bauer’s order)',
    status: {
      greek: { gap: 'lands with the Practise stories: copywork mw-5r3p30.899 (English, Greek and Hebrew), dictation mw-5r3p30.900 (English, Greek and Hebrew), narration mw-5r3p30.901 and summary mw-5r3p30.902 (English only in their first slice); each tags its scenarios @uc-practise @greek @hebrew' },
      hebrew: { gap: 'lands with the Practise stories mw-5r3p30.899 (copywork) and mw-5r3p30.900 (dictation), both live in Hebrew from the start; narration .901 and summary .902 are English only in their first slice' },
      latin: LATIN_LATER,
    },
  },
  // The tutor
  {
    id: 'tutor-ask',
    title: 'Ask the tutor about a verse or a word, holding what the app knows of it in its language',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'talk',
    title: 'The Bible talk on a chapter or a verse: the request carries the source text and its words, the bridge',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'language-offer',
    title: 'The tutor offers the language gently to a reader who is not learning it',
    status: {
      greek: 'has',
      hebrew: { gap: 'scenario "The tutor offers the Hebrew gently on Genesis 1 to a reader who is not learning it" in features/hebrew-talk.feature; the grind example grinds/examples/bible-talk/hebrew-offer-on-genesis.json already exists and src/talk/greekOffer.ts has chapterOfferLang, so the scenario and features/steps/hebrew-talk.steps.tsx; XS' },
      latin: LATIN_LATER,
    },
  },
  {
    id: 'learner-summary',
    title: 'The tutor is told his progress in the language: solid words, the ladder, the reading ladder, rust',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'languages-dial',
    title: 'Which languages? and a dial per language: what each step shows, the tutor may move it',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'script-depth',
    title: 'How deep into the script the tutor writes: transliteration, both, or the letters alone',
    status: {
      greek: { na: 'Greek is written in its letters wherever it is drawn (its depth is simply full, src/script/scripts.ts); a reader who wants less lowers the dial' },
      hebrew: 'has',
      latin: { na: 'Latin is written in the Latin alphabet, which needs no transliteration' },
    },
  },
  // Resources and data
  {
    id: 'logos-links',
    title: 'Links into Logos from a word (Strong’s, Bible Word Study, his lexicons) and a verse (In Logos, In another book, Read in Logos)',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'resources',
    title: 'Study resources by language: which ship, which his shelf turns on, the Study row at scale',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
  {
    id: 'data',
    title: 'The text data: every word with its lemma, gloss and parsing, the lexicon and frequencies built with the chapters',
    status: { greek: 'has', hebrew: 'has', latin: LATIN_LATER },
  },
];

/**
 * The features under features/ that are not about a language (the shell, the licence, navigation, the tutor's mechanics, English-only pieces),
 * each with why: a feature is here or tagged, never neither, so nothing is left out by accident.
 */
export const NEUTRAL_FEATURES: Readonly<Record<string, string>> = {
  about: 'About and credits: the app, not a language',
  'about-you': 'About you: his profile for the tutor, in English',
  'ai-needs-licence': 'the licence gate on the AI, the same for every language',
  'app-missing': 'a study app not on the phone: the shell',
  'app-on-phone': 'turning a study app On: the shell',
  'app-update': 'the update flow: the shell',
  appearance: 'theme and text size: the shell (a language’s speed row is uc-voice-settings)',
  'ask-approach': 'Ask for another approach: the tutor’s mechanics',
  'ask-by': 'Ask by Speaking or Typing: the tutor’s mechanics',
  'ask-composer': 'the shared composer: the tutor’s mechanics',
  'ask-for-book': 'Ask for a book: his Logos library, no language in it',
  'ask-for-more': 'Ask for more: the request flow',
  'audio-bible': 'Listen in Audible: an English audio Bible',
  'chapter-nav': 'next and previous chapter: navigation, the same for every book',
  'chapter-picker': 'the 66 books: navigation',
  'chapter-swipe': 'swiping between chapters: navigation',
  'double-tap': 'a double tap on Next: the question screens’ mechanics',
  events: 'the event bus: the shell',
  'feedback-offer': 'an ask offered to the makers: the request flow',
  'form-helper': 'Let the tutor do it: the tutor’s mechanics',
  'free-to-read': 'free to read, a licence unlocks the AI: the shell',
  'fresh-install': 'a new install starts empty: the shell',
  gate: 'the licence gate: the shell',
  'get-licence': 'the Licence page: the shell',
  install: 'installing the PWA: the shell',
  layout: 'verse-by-verse or paragraph layout and section headings: the English page',
  library: 'Your Logos library: a screen over his shelf (what each language gets of it is uc-resources)',
  'library-import': 'importing his Logos list: the shelf',
  'library-shelf': 'the shelf table: the shelf',
  'licence-page': 'the Licence page: the shell',
  'licence-tip': 'the licence tip: the shell',
  'long-question': 'a long pasted question: the tutor’s mechanics',
  maps: 'Bible maps: English place names',
  'maps-settings': 'Maps in Settings: English place names',
  memory: 'the reader’s memory: the tutor’s mechanics',
  'memory-tutor': 'the tutor reads the memory: the tutor’s mechanics',
  'my-devices': 'the devices of a licence: the shell',
  'offline-copy': 'Keep on this phone: the shell',
  'page-aloud': 'a page of English prose read aloud and shared: the English page',
  preface: 'the Preface about the texts: the shell',
  'push-to-talk': 'push-to-talk: the tutor’s mechanics',
  'reading-plan': 'the listening plan in the Bible view: the English audio Bible',
  'reading-plan-return': 'back from Audible: the English audio Bible',
  'reading-plan-screenshot': 'a screenshot of Audible: the English audio Bible',
  'reading-plan-sendoff': 'the Audible send-off: the English audio Bible',
  'reference-card': 'a Bible reference in an answer opens a card: the tutor’s mechanics',
  'render-errors': 'one bad render never blacks out the app: the shell',
  reopen: 'reopening where he left it: the shell',
  'send-to-makers': 'a wish for the makers: the request flow',
  settings: 'the Settings screen: the shell',
  'settings-details': 'a setting’s details show while it is on: the shell',
  'settings-library': 'Settings after the library: the shelf',
  'settings-search': 'the Settings search: the shell',
  'share-references': 'Share to Lampas lists the references: the share target',
  'share-target': 'Lampas is a share target: the share target',
  'sheet-back': 'Back closes a sheet: the shell',
  'sheet-double-tap': 'a double tap on a sheet’s button: the shell',
  'study-way': 'My study way: the tutor’s mechanics',
  'talk-long-question': 'minutes of speech go whole: the tutor’s mechanics',
  'talk-pictures': 'pictures in the talk: the tutor’s mechanics',
  'tap-guard': 'a double tap that changes the screen: the shell',
  tips: 'the one-time tips: the shell',
  'tutor-does': 'what the tutor does shows on the sheet: the tutor’s mechanics',
  'tutor-door-setting': 'the Tutor door and Hand settings: the shell',
  'tutor-go': 'the tutor takes him to a chapter: navigation',
  'tutor-live-stream': 'an answer the moment it is ready: the tutor’s mechanics',
  'tutor-requests': 'the tutor knows his requests: the request flow',
  'tutor-timing': 'timing every answer: the tutor’s mechanics',
  'turn-pages': 'turning pages: navigation',
  'unsent-draft': 'a draft kept in the box: the tutor’s mechanics',
  'voice-offers': 'answering an offer by voice: the tutor’s mechanics',
  welcome: 'the welcome in plain English: the shell',
  'whats-new': 'What’s new: the shell',
  'your-requests': 'Your requests: the request flow',
};
