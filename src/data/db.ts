import Dexie, { type EntityTable } from 'dexie';
import type { AppliedChange } from '../settings/applied';
import { cleanGloss } from './gloss';
import { isItemId, legacyStoredId, plainIdOf } from './grammar/soundScope';

export type WordState = 'solid' | 'learning' | 'dropped';

/** A Greek word he is learning. */
export interface Word {
  /** The plain headword, the key: 'ἄνθρωπος'. */
  lemma: string;
  /** The lexicon lemmas that match it (see lemma.ts); indexed so the weave can look a lemma up. */
  lemmas: string[];
  gloss: string;
  /** The part of speech ('noun', 'verb' ...) when the lexicon gave it, for a word added from a Talk answer; not indexed, so no version bump. */
  pos?: string;
  /** Where it came from when not a lesson: 'frontier' for a new word he took on the teach sheet (it is listed under 'From my reading'); not indexed, so no version bump. */
  source?: 'frontier';
  /** The BMA lesson it came from; 0 for a word added by Import or from a Talk answer, with no lesson. */
  lesson: number;
  state: WordState;
  /** When it last got this state (ms since the epoch). */
  since: number;
}

/** One answer in the Quick test. */
export interface TestResult {
  id?: number;
  lemma: string;
  /** When he answered (ms since the epoch). */
  when: number;
  right: boolean;
}

/** A word of the tutor's answer: a Greek word of the verse, its lemma and a note with its parsing. */
export interface AnswerWord {
  greek: string;
  lemma: string;
  note: string;
}

/** A link of the tutor's answer to a study resource (mw-5r3p30.75): a word by its lemma (NFC, the dictionary form) or a verse by its reference as the tutor wrote it ('Romans 8:31'); a setting by its key; a work of his Logos library by its id (src/resources/works.ts)
 *  and, for a commentary, the passage to open it at (mw-5r3p30.675). */
export type AnswerLink = { kind: 'word'; lemma: string } | { kind: 'verse'; reference: string } | { kind: 'setting'; key: string } | { kind: 'work'; work: string; reference?: string; place?: string };

/** One answer the tutor gave to a question about a verse, kept so it is there on return. */
export interface TutorAnswer {
  id?: number;
  /** the verse it was asked about: 'rom.8.28' */
  ref: string;
  /** his words as he said them (the raw transcript) */
  question: string;
  /** the same question as the tutor cleaned it up (punctuation, capitals, no ums); shown in its place when present */
  cleanQuestion?: string;
  /** the question was spoken (src/speech/spoken.ts): the cleaned question is shown with his own words under it */
  spoken?: boolean;
  answer: string;
  words: AnswerWord[];
  /** when it arrived (ms since the epoch) */
  when: number;
  /** the settings the answer changed (Ask by, when he asked the tutor to switch it): shown under the answer as 'Changed: Ask by: Typing' */
  changes?: AppliedChange[];
  /** the foundation ideas the answer bridged to (mw-1vuvq6.5): shown under the answer with Take me there */
  bridge?: Bridge;
}

/** What a tutor's answer bridges a question he is not ready for to (mw-1vuvq6.5, src/data/grammar/bridge.ts resolveBridge): up to three LADDER ideas he lacks, most
 * important first, the one that is his next step (the lowest unmet need, the one Take me there opens), one plain line why they come first, and whether more than
 * three are missing. */
export interface Bridge {
  ideas: string[];
  next: string;
  why: string;
  many: boolean;
}

/** A share waiting to be placed (mw-y3qno5.2): what another app sent to Lampas's share target, until he picks the talk it goes to or cancels. */
export interface ShareRow {
  /** 'time-random': the share route names the share by it */
  id: string;
  createdAt: number;
  /** the shared title, text and link, one to a line; none for a share of pictures alone */
  text?: string;
  /** the shared files: their bytes and kind, as the service worker read them */
  files: { name: string; type: string; bytes: ArrayBuffer }[];
}

/** One reference as kept: the shape of src/nav/refsInText.ts FoundReference, written out here because the worker reads this file and imports no screen. */
export interface KeptReference {
  printed: string;
  ref: string;
  book: string;
  testament: 'nt' | 'ot';
  chapter: number;
  verse?: number;
  lastVerse?: number;
}

/** The running summary of one talk (src/data/repositories/talks.ts, mw-5r3p30.700): what the tutor wrote of every turn that fell out of the 10-turn window, and how many of the talk's
 * oldest turns it holds, so the next request sends only the turns after them to be folded in. */
export interface TalkSummaryRow {
  /** the talk's key ('rom.8', 'rom.8.28:quiz', 'screen.goal') */
  ref: string;
  summary: string;
  /** how many of the talk's oldest turns the summary holds */
  covered: number;
  when: number;
}

/** The Bible references found in a shared picture (src/data/repositories/pictureRefs.ts, mw-5r3p30.695), kept by the picture's fingerprint so it is never read twice. */
export interface PictureRefsRow {
  /** the SHA-256 of the picture's bytes, in hex: the key */
  hash: string;
  /** when they were kept (ms since the epoch); the oldest go first when there are many */
  at: number;
  /** the checked references (src/share/findRefs.ts checkedReferences), as they are shown */
  found: KeptReference[];
}

/** One book of his Logos library that he has touched (src/data/repositories/library.ts, docs/design/library-at-scale.md 3.2): Off is no row. */
export interface LibraryRow {
  /** the Logos Resource ID, the catalogue's key ('LLS:46.30.18') */
  id: string;
  /** the catalogue's kind of the book (src/resources/catalogue.ts KINDS) */
  kind: string;
  state: 'on' | 'pinned';
  /** when it went On or Pinned (ms since the epoch) */
  since: number;
  /** only on the one row that is no book ('#taken', kind 'taken'): the text of each old settings key as the shelf took it */
  taken?: string;
}

/** A request Lampas sent to the factory (mw-vy3ghg.2), kept with the grist's id so a status that comes back can be matched to it. */
export interface RequestRow {
  /** the grist's transaction id: the key */
  txid: string;
  /** 'grammar-approach', 'tutor-ask', 'grammar-book', 'devotional' or one of the Ask for more kinds (src/services/feedback.ts FeedbackKind) */
  kind: string;
  /** the tutor's one-line summary of the ask (tutor-ask) */
  summary?: string;
  /** his words (grammar-approach: the approach he described; grammar-book: the title he typed; devotional: its title) */
  text?: string;
  /** the build that sent it (config __APP_VERSION__) */
  app_version: string;
  /** when the mill took it, ms since the epoch */
  sentAt: number;
  /** where it stands: 'sent' until a request-status record says otherwise, then that record's status (src/data/repositories/requests.ts) */
  status: string;
  /** the status record the row last took: when the mill sent it (ms), and the bead the factory filed (mw-vy3ghg.5; no index, no version bump) */
  statusAt?: number;
  bead?: string;
  /** landed: the app version it shipped in, the commit and its link on GitHub */
  version?: string;
  commit?: string;
  url?: string;
  /** declined: one plain sentence */
  reason?: string;
  /** adopted as a setting: the setting's name */
  setting?: string;
}

/** A picture he sent with a turn of a Bible talk (mw-y3qno5.1), kept as bytes and a mime (a Blob does not survive every store the tests use). */
export interface TalkPicture {
  id?: number;
  /** the turn it went with (talks.id) */
  turnId: number;
  /** its place among the turn's pictures, from 0 */
  place: number;
  bytes: ArrayBuffer;
  /** one of bsv-kit's photo types (grist.PHOTO_MIMES); always image/jpeg after the cut */
  mime: string;
  /** the file name it was sent under: 'picture-1.jpg' */
  name: string;
}

/** One turn of a Bible talk: what he said and what the companion answered, kept so the conversation is there on return. */
export interface TalkTurn {
  id?: number;
  /** the conversation it belongs to: the chapter 'rom.8', or a verse 'rom.8.28' when it was started on one */
  ref: string;
  /** his words as he said them (the raw transcript, also what is sent as history) */
  q: string;
  /** the same question as the tutor cleaned it up (punctuation, capitals, no ums); shown in its place when present */
  cleanQ?: string;
  /** the question was spoken (src/speech/spoken.ts): the tutor's cleaned question is shown with his own words under it */
  spoken?: boolean;
  a: string;
  words: AnswerWord[];
  /** when the answer arrived (ms since the epoch); for the first turn of a talk the time he asked, which the talk's name to the mill carries (src/services/talk.ts talkNameOf) */
  when: number;
  /** the key points the tutor wrote when this answer began a fresh session of the talk (mw-pxji7y.3): shown behind 'The tutor wrote down the key points of this talk so far' */
  keyPoints?: string;
  /** the settings the answer changed, each with what it replaced so Undo can put it back (src/settings/registry.ts) */
  changes?: AppliedChange[];
  /** a sentence for each change the answer asked for that was ignored */
  refused?: string[];
  /** the chapter the answer took him to ('Colossians 1', mw-5r3p30.172): shown as 'Opened Colossians 1' */
  opened?: string;
  /** the chapter the answer would have taken him to had Talk still been open (mw-5r3p30.199): the answer said so after he pressed Done, so nothing moved; shown as
   * 'You closed Talk before this came, so John 3 was not opened' with a button that opens it then */
  unopened?: { book: string; chapter: number; title: string };
  /** the chapter the answer took him to that he was already on (mw-5r3p30.199): nothing moved; shown as 'Already on Romans 8' */
  stayed?: string;
  /** the lemmas the answer put on his words-to-learn list (words_to_add), each one new to it */
  added?: string[];
  /** the lemmas the answer asked to add that were on his list already */
  already?: string[];
  /** the lemmas the answer asked to add that neither his list nor the lexicon has: not added, and said so */
  unknown?: string[];
  /** the links the answer carried (at most MAX_LINKS), shown as chips for the study resources he has switched on (src/TutorLinks.tsx) */
  links?: AnswerLink[];
  /** the study way line the answer proposed (mw-5r3p30.76); the reader keeps it with Keep this, or not */
  studyWayLine?: string;
  /** the goal the answer offered to keep as his quiz goal (mw-5r3p30.185); `quizGoalChoice` says what he did with the offer, absent while he has not answered it */
  quizGoalOffer?: string;
  quizGoalChoice?: 'kept' | 'once' | 'declined';
  /** the pronunciation guide the answer carried for a Hebrew word (mw-5r3p30.98, src/script/HebrewGuide.tsx HebrewSoundGuide) */
  guide?: HebrewSounds;
  /** the tutor's one-line summary of an ask the app cannot meet; its presence offers Send this to the makers (src/Talk.tsx FeedbackOffer) */
  feedbackOffer?: string;
  /** set once the mill has the feedback this offer made: the offer then reads Sent */
  feedbackSent?: boolean;
  /** set when he said no to the feedback offer (mw-5r3p30.186): nothing was sent and the offer reads Not sent */
  feedbackWithdrawn?: boolean;
  /** a setting change the answer offered (mw-5r3p30.186): shown as a button; `settingChoice` says what became of it, absent while it waits */
  settingOffer?: { key: string; value: string | number };
  settingChoice?: 'taken' | 'declined';
  /** the foundation the answer bridged to (mw-1vuvq6.5): shown as 'Take me there: <title>'; `bridgeChoice` says what he did with the offer, absent while he has not answered it */
  bridge?: Bridge;
  bridgeChoice?: 'taken' | 'declined';
  /** the tutor's one offer of the Greek (mw-yrmkdf.4): shown as a button; `greekChoice` says what became of it, absent while it waits */
  greekOffer?: GreekOffer;
  greekChoice?: 'taken' | 'declined';
  /** the tutor's offer to move the rusty items it named back to Frontier and practise them (mw-1vuvq6.6): only items the request listed as rusty; `rustyChoice` says what became of it, absent while it waits */
  rustyOffer?: RustyOffer;
  rustyChoice?: 'taken' | 'declined';
}

/** The rusty items a tutor's answer offered to move back to Frontier: each with the title the request gave it (src/talk/rustyOffer.ts rustyOfferOf). */
export interface RustyOffer {
  items: Array<{ kind: 'word' | 'idea'; id: string; title: string }>;
}

/** The tutor's offer to raise the Greek dial one step (mw-3ased2.3): a tap raises it to `to`, and a `word` offer then opens that word's sheet in Greek (`lemma`, a word of the text);
 * `text` is the button's line, naming the step. `to` is set by the app from the dial as the answer came (the welcome's is Dipping a toe); an offer kept without it raises one step from where the dial stands. */
export interface GreekOffer {
  kind: 'word' | 'view';
  text: string;
  lemma?: string;
  to?: 0 | 1 | 2 | 3 | 4 | 5;
}

/** How a Hebrew word is said, as the tutor's sound answer gave it: the word, its syllables in Hebrew letters in reading order and how each sounds in Latin letters. */
export interface HebrewSounds {
  word: string;
  syllables: string[];
  /** one per syllable, as many as the tutor gave (a missing one shows nothing under its syllable) */
  sounds: string[];
}

/** One step of one word in the Parsing drill: 'tense' of λέγω, answered rightly or not. */
export interface DrillResult {
  id?: number;
  /** the word's key in the store: the headword he knows it by */
  lemma: string;
  /** the step asked: 'pos', 'tense', 'case', 'number+gender' ... (src/data/drill.ts) */
  step: string;
  /** when he answered (ms since the epoch) */
  when: number;
  right: boolean;
}

/** One word of a reading the mill marked to fix, with its chunks to say and a tip. */
export interface FixWord {
  word: string;
  /** where this exact word stands in the verse's words, from 0; a reading kept before the mill gave one has none and marks every word spelled so */
  index?: number;
  chunks: string[];
  tip: string;
  /** the respelling the English voice speaks right ('blest' for 'blessed'); a reading kept before it existed, or a word the voice says right, has none */
  say?: string;
  /** where the word stands in the recording, seconds (both or neither); a reading kept before the scorer gave times has none, and no 'Me' button */
  start?: number;
  end?: number;
}

/** The result of the last reading check of a verse, kept so it is there on return. */
export interface VerseReading {
  /** the verse it was read from, the key: 'rom.8.28' for an English reading, 'rom.8.28:el' for one in another language */
  ref: string;
  verdict: 'well-read' | 'some-to-fix' | 'partial' | 'incomplete';
  words: FixWord[];
  note: string;
  /** when it arrived (ms since the epoch) */
  when: number;
  /** how far it reached: the index in the verse's words of the last word he read (a whole reading: the last word, an `incomplete` one: -1); a reading kept before it existed has none */
  reached?: number;
  /** the verse's word count when it was read */
  total?: number;
  /** a `partial` reading: the word he stopped at, offered as his next word */
  next?: FixWord;
  /** a `partial` reading that reached past the reading of the same verse and language before it (true; absent otherwise) */
  further?: true;
  /** the text it was scored against, kept only for a woven reading (mw-5r3p30.411): the weave of a later day may show other words in Greek, and its indexes would not stand where the weave of this one put them */
  text?: string;
  /** the clip he recorded for this reading (not indexed; a reading kept before it existed has none) */
  clip?: { bytes: ArrayBuffer; mime: string };
}

/** One reading check of a verse, kept for good (readings keeps only the last of each verse): the sounds or words he misreads are tallied from these. */
export interface ReadingRecord {
  id?: number;
  /** the verse, plain: 'rom.8.28' (the language is its own field) */
  ref: string;
  /** the language it was read and scored in: 'en', or 'el' for Modern Greek */
  lang: string;
  verdict: VerseReading['verdict'];
  /** the words the mill marked to fix, as they came */
  words: FixWord[];
  /** when it arrived (ms since the epoch) */
  at: number;
  /** how far it reached and the verse's word count, as on VerseReading; a reading kept before they existed has neither */
  reached?: number;
  total?: number;
}

/**
 * How often one sound (Greek) or word (English) was among the words he misread in his last readings in that language
 * (src/data/repositories/readings.ts TALLY_READINGS of them). Rewritten after every reading; one row per language and unit.
 */
export interface MissCount {
  lang: string;
  /** a Greek sound's ladder id ('diphthong-ou', 'pair-gg'), or an English word in lower case */
  unit: string;
  /** the number of those readings in which a misread word holds the unit (a unit counts once a reading) */
  count: number;
}

/**
 * Where he is on the reading ladder of a language (src/data/repositories/ladder.ts, docs/reading-ladder.md): one row per language ('el', 'en'). The place itself
 * is worked out from the readings he has read well, so it is never kept twice; the row keeps what they cannot say.
 */
export interface LadderRow {
  /** the language of the list and of the readings: 'el' (public/data/ladder/el.json) or 'en' */
  lang: string;
  /** the ref of the verse the ladder last opened for him, whose panel says 'Number N of M on the ladder'; null when he is not on the ladder */
  showing: string | null;
  /** the verses he chose to skip for now, each with the time of the skip; they come back after he reads others well (src/data/readingLadder.ts SKIP_GAP) */
  skipped: { ref: string; at: number }[];
}

/**
 * Where he stands on a passage lesson of the approach (src/data/repositories/passageLessons.ts, docs/grammar.md 'Approaches'): one row per passage, keyed
 * 'passage:1jn.1.1-4' (src/approaches passageKey). `read` once he has read it, `passed` once he has shown he followed it; `score` is the share he got right (0 to 1) when he
 * passed, null when he only read it. A passed row is never taken back to read.
 */
export interface PassageLessonRow {
  key: string;
  state: 'read' | 'passed';
  /** when the state was set, ms since the epoch */
  when: number;
  score: number | null;
}

/**
 * One finished run of Drill it on one grammar idea (src/data/repositories/drillRuns.ts, docs/grammar.md 'Drill it, the engine'): the engine's DrillResult
 * (src/data/grammar/drillIt.ts) and the time it was kept. Every run is kept; the latest of an idea says where he stands on it now. The shapes are written out
 * here so db.ts imports no screen or engine (the worker's tsconfig reaches it).
 */
export interface DrillRunRow {
  id?: number;
  ideaId: string;
  /** when the run was kept, ms since the epoch */
  at: number;
  /** two unhinted rights in a row at the top step */
  proved: boolean;
  /** the highest step he holds (0 when he holds none, the top step when proved) */
  edgeStep: number;
  topStep: number;
  /** how the walk ended: 'proved', 'edge' or 'limit' */
  ended: 'proved' | 'edge' | 'limit';
  /** facets right at least once and not weak */
  strong: { id: string; label: string }[];
  /** facets missed at least once and right fewer than twice */
  weak: { id: string; label: string }[];
  /** every question asked, in order */
  answers: { step: number; facet: { id: string; label: string }; key: string; right: boolean; hinted: boolean }[];
}

/** A grammar term he marked I know this on its Grammar sheet ('conjunction'), kept so the word sheet shows it plain. */
export interface KnownTerm {
  /** the term, the key: a word of src/data/grammar-concepts.ts */
  term: string;
  /** when he marked it (ms since the epoch) */
  since: number;
}

export type GrammarLevelName = 'solid' | 'frontier' | 'notYet';

/** What set a grammar level: the placement, a review answer, the idea sheet, the tutor, a term he marked I know this, the right answers he gave on forms that use it (mw-hqd5bz.17), or a run of Drill it (mw-i7xe0n.3: 'Proved by drill'), or the idea that follows the one just proved (mw-i7xe0n.6: 'next'). */
export type GrammarLevelHow = 'placement' | 'review' | 'sheet' | 'tutor' | 'marked' | 'inferred' | 'drill' | 'next';

/** Where one grammar idea (src/data/grammar/ladder.ts) stands for him: solid, at the frontier, or not yet. One row per idea. */
export interface GrammarLevel {
  /** the idea's id: 'case-genitive' */
  id: string;
  level: GrammarLevelName;
  /** when it got this level (ms since the epoch) */
  since: number;
  how: GrammarLevelHow;
}

/**
 * One item on the back-off schedule (src/data/schedule.ts): a word today, anything he reviews later. The key is
 * {kind, id}: kind 'word' with the NFC headword as id, or another kind with its own ids.
 */
export interface Review {
  kind: string;
  id: string;
  /** the position on the steps of src/data/schedule.ts (0 is the shortest gap) */
  step: number;
  /** when it next comes up (ms since the epoch) */
  due: number;
  /** when it was last answered (ms since the epoch) */
  lastWhen: number;
  /** how many times it was answered wrong */
  lapses: number;
  /** rights in a row since it last moved up or was wrong; two move it up a step */
  rights: number;
  /** its last RECENT_ANSWERS answers, oldest first (mw-1vuvq6.6: the tutor notices a solid item he now slips on); not indexed, so a row kept before has none */
  recent?: Array<{ when: number; right: boolean }>;
}

/** One-off facts about the store, such as 'wordsSeeded'. */
export interface MetaRow {
  key: string;
  value: string;
}

/** A saved setting, such as the reader's 'readerView'. */
export interface SettingRow {
  key: string;
  value: string;
}

/** How many times he used one part of the app on one day: an event kind ('verse-selected'), 'screen:<route>' or 'chapter-changed'. Counts only. */
export interface UsageRow {
  /** '2026-10-01|verse-selected' */
  key: string;
  /** the local day, 'YYYY-MM-DD' */
  day: string;
  name: string;
  count: number;
}

/** A tip the tips grind offered (src/tips/): kept so its id is sent as shown next time, and so a card he has not answered is still there. */
export interface TipRow {
  /** the grind's slug, 'try-review' */
  id: string;
  title: string;
  body: string;
  /** the screen the tip's button opens, when it has one */
  action?: { label: string; screen: string };
  /** the local day it was shown, 'YYYY-MM-DD' */
  day: string;
  /** open: the card is up; acted: he tapped Show me; dismissed: Not now or Got it */
  status: 'open' | 'acted' | 'dismissed';
}

// Never edit an old version(): repeat the whole stores map on each bump with a '// vN:' comment
// (docs/pwa-best-practices.md section 15).
class LampasDB extends Dexie {
  words!: EntityTable<Word, 'lemma'>;
  meta!: EntityTable<MetaRow, 'key'>;
  settings!: EntityTable<SettingRow, 'key'>;
  results!: EntityTable<TestResult, 'id'>;
  answers!: EntityTable<TutorAnswer, 'id'>;
  talks!: EntityTable<TalkTurn, 'id'>;
  drills!: EntityTable<DrillResult, 'id'>;
  readings!: EntityTable<VerseReading, 'ref'>;
  grammarKnown!: EntityTable<KnownTerm, 'term'>;
  reviews!: EntityTable<Review, 'kind' | 'id'>;
  grammarLevels!: EntityTable<GrammarLevel, 'id'>;
  usage!: EntityTable<UsageRow, 'key'>;
  tips!: EntityTable<TipRow, 'id'>;
  talkPictures!: EntityTable<TalkPicture, 'id'>;
  shares!: EntityTable<ShareRow, 'id'>;
  requests!: EntityTable<RequestRow, 'txid'>;
  readingHistory!: EntityTable<ReadingRecord, 'id'>;
  missTally!: EntityTable<MissCount, 'lang' | 'unit'>;
  ladder!: EntityTable<LadderRow, 'lang'>;
  drillRuns!: EntityTable<DrillRunRow, 'id'>;
  passageLessons!: EntityTable<PassageLessonRow, 'key'>;
  pictureRefs!: EntityTable<PictureRefsRow, 'hash'>;
  talkSummaries!: EntityTable<TalkSummaryRow, 'ref'>;
  library!: EntityTable<LibraryRow, 'id'>;

  constructor() {
    super('lampas');
    // v1: no stores yet; the reading, licence and progress stories add theirs.
    this.version(1).stores({});
    // v2: the words he knows (key lemma; lesson and state to list them; *lemmas to find one by lexicon lemma), and meta.
    this.version(2).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key' });
    // v3: settings he chooses (key, value), such as the reader's English | Greek view.
    this.version(3).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key', settings: 'key' });
    // v4: the Quick test's answers {lemma, when, right}; [lemma+when] reads one word's answers in order.
    this.version(4).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
    });
    // v5: the tutor's answers {ref, question, answer, words, when}; [ref+when] reads one verse's answers in order.
    this.version(5).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
    });
    // v6: the turns of a Bible talk {ref, q, a, words, when}; [ref+when] reads one conversation's turns in order.
    this.version(6).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
    });
    // v7: the Parsing drill's steps {lemma, step, when, right}; [lemma+step] reads one word's answers to one step.
    this.version(7).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
    });
    // v8: the last reading check of each verse {ref, verdict, words, note, when}, one row per verse (key ref).
    this.version(8).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
    });
    // v9: the grammar terms he knows {term, since}, one row per term (key term).
    this.version(9).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
    });
    // v10: the back-off schedule {kind, id, step, due, lastWhen, lapses, rights}, one row per item (key [kind+id]); due finds what is due.
    this.version(10).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
    });
    // v11: where each grammar idea stands {id, level, since, how}, one row per idea (key id); level finds the solid ones.
    this.version(11).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
    });
    // v12: how often he used each part of the app, a row per day and name {key 'day|name', day, name, count}; counts only (src/tips/).
    this.version(12).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
    });
    // v13: the tips he was shown {id key, title, body, action?, day, status}; status finds the card still open.
    this.version(13).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
    });
    // v14: the pictures he sent with a turn of a Bible talk {turnId, place, bytes, mime, name}; turnId finds a turn's pictures.
    this.version(14).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
    });
    // v15: the share waiting to be placed {id key, createdAt, text?, files}, written by the service worker (src/share/target.ts).
    this.version(15).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
    });
    // v16: the requests he sent to the factory {txid key, kind, summary?, text?, app_version, sentAt, status}, written by src/services/feedback.ts.
    this.version(16).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
    });
    // v17: every reading check {id, ref, lang, verdict, words, at}, newest found by [lang+at]; and the tally of the sounds or words he misreads {lang, unit, count}, one row per language and unit (key [lang+unit]).
    this.version(17).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
    });
    // v18: where he is on the reading ladder of each language {lang key, showing, skipped}.
    this.version(18).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
    });
    // v19: every finished run of Drill it {id, ideaId, at, proved, edgeStep, topStep, ended, strong, weak, answers}, found by idea or by time.
    this.version(19).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
    });
    // v20: same tables. The rows of the letters, sounds and marks ideas (grammarLevels, the schedule rows of kind 'grammar', the 'grammarEvidence' setting) are kept per
    // pronunciation scheme under '<scheme>:<id>' (src/data/grammar/soundScope.ts); what he has proved so far was proved in Modern Greek, so those rows move there.
    this.version(20)
      .stores({
        words: 'lemma, lesson, state, *lemmas',
        meta: 'key',
        settings: 'key',
        results: '++id, [lemma+when]',
        answers: '++id, [ref+when]',
        talks: '++id, [ref+when]',
        drills: '++id, lemma, [lemma+step]',
        readings: 'ref',
        grammarKnown: 'term',
        reviews: '[kind+id], due, kind',
        grammarLevels: 'id, level',
        usage: 'key, day, name',
        tips: 'id, status',
        talkPictures: '++id, turnId',
        shares: 'id, createdAt',
        requests: 'txid, sentAt, status',
        readingHistory: '++id, ref, [lang+at]',
        missTally: '[lang+unit], lang',
        ladder: 'lang',
        drillRuns: '++id, ideaId, at',
      })
      .upgrade(async (tx) => {
        const levels = tx.table<GrammarLevel, string>('grammarLevels');
        const moved = (await levels.toArray()).filter((row) => legacyStoredId(row.id) !== row.id);
        await levels.bulkDelete(moved.map((row) => row.id));
        await levels.bulkPut(moved.map((row) => ({ ...row, id: legacyStoredId(row.id) })));
        const reviews = tx.table<Review, [string, string]>('reviews');
        const owed = (await reviews.where('kind').equals('grammar').toArray()).filter((row) => legacyStoredId(row.id) !== row.id);
        await reviews.bulkDelete(owed.map((row) => [row.kind, row.id] as [string, string]));
        await reviews.bulkPut(owed.map((row) => ({ ...row, id: legacyStoredId(row.id) })));
        const settings = tx.table<{ key: string; value: unknown }, string>('settings');
        const evidence = await settings.get('grammarEvidence');
        if (typeof evidence?.value === 'string') {
          try {
            const kept = JSON.parse(evidence.value) as Record<string, unknown>;
            await settings.put({ key: 'grammarEvidence', value: JSON.stringify(Object.fromEntries(Object.entries(kept).map(([id, e]) => [legacyStoredId(id), e]))) });
          } catch {
            // Not evidence: leave it for getEvidence to start again.
          }
        }
      });
    // v21: same tables. One idea at the frontier at a time (mw-i7xe0n.6): where more than one idea (not a letter, pair or breathing, which are items of a group) was
    // frontier, the one changed most recently stays and the others go back to not yet; their rows, schedule rows and drill runs are kept.
    this.version(21)
      .stores({
        words: 'lemma, lesson, state, *lemmas',
        meta: 'key',
        settings: 'key',
        results: '++id, [lemma+when]',
        answers: '++id, [ref+when]',
        talks: '++id, [ref+when]',
        drills: '++id, lemma, [lemma+step]',
        readings: 'ref',
        grammarKnown: 'term',
        reviews: '[kind+id], due, kind',
        grammarLevels: 'id, level',
        usage: 'key, day, name',
        tips: 'id, status',
        talkPictures: '++id, turnId',
        shares: 'id, createdAt',
        requests: 'txid, sentAt, status',
        readingHistory: '++id, ref, [lang+at]',
        missTally: '[lang+unit], lang',
        ladder: 'lang',
        drillRuns: '++id, ideaId, at',
      })
      .upgrade(async (tx) => {
        const levels = tx.table<GrammarLevel, string>('grammarLevels');
        const learning = (await levels.where('level').equals('frontier').toArray()).filter((row) => !isItemId(plainIdOf(row.id)));
        if (learning.length < 2) return;
        const keep = learning.reduce((latest, row) => (row.since > latest.since ? row : latest));
        await levels.bulkPut(learning.filter((row) => row !== keep).map((row) => ({ ...row, level: 'notYet' as const })));
      });
    // v22: same tables. A word's gloss kept in a source form ('spirit/breath: spirit' from the lexicon, 'dat: in, by, with' from the old seed) is
    // cleaned as every gloss now comes in (src/data/gloss.ts, mw-5r3p30.384); nothing else about the word changes.
    this.version(22)
      .stores({
        words: 'lemma, lesson, state, *lemmas',
        meta: 'key',
        settings: 'key',
        results: '++id, [lemma+when]',
        answers: '++id, [ref+when]',
        talks: '++id, [ref+when]',
        drills: '++id, lemma, [lemma+step]',
        readings: 'ref',
        grammarKnown: 'term',
        reviews: '[kind+id], due, kind',
        grammarLevels: 'id, level',
        usage: 'key, day, name',
        tips: 'id, status',
        talkPictures: '++id, turnId',
        shares: 'id, createdAt',
        requests: 'txid, sentAt, status',
        readingHistory: '++id, ref, [lang+at]',
        missTally: '[lang+unit], lang',
        ladder: 'lang',
        drillRuns: '++id, ideaId, at',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Word, string>('words')
          .toCollection()
          .modify((word) => {
            if (typeof word.gloss === 'string') word.gloss = cleanGloss(word.gloss);
          });
      });
    // v23: a passage lesson of the approach (src/approaches, mw-z370x5.1) {key, state read | passed, when, score}; every other table as it was.
    this.version(23).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
    });
    // v24: the references found in a shared picture {hash, at, found} (src/data/repositories/pictureRefs.ts, mw-5r3p30.695); every other table as it was.
    this.version(24).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
    });
    // v25: the running summary of each talk {ref, summary, covered, when} (src/data/repositories/talks.ts, mw-5r3p30.700); every other table as it was.
    this.version(25).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
      talkSummaries: 'ref',
    });

    // v26: his shelf, one row per book he has touched {id, kind, state, since} (src/data/repositories/library.ts, mw-rfjjzd.3); every other table as it was.
    this.version(26).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
      talkSummaries: 'ref',
      library: 'id, kind',
    });
  }
}

export const db = new LampasDB();
