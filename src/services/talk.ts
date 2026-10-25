// src/services/talk.ts — the Bible talk: one thing he says, sent as a grist through Postern (bsv-kit/grist) and answered by
// the mill's bible-talk grind (grinds/bible-talk.json). The wire work is the tutor's (src/services/tutor.ts askGrind); this
// file is the kind's own: the request with the last turns of the conversation, the answer's shape, and the fit to a grist.
import type { Chapter, Verse } from '../data/chapter';
import { unitId } from '../data/passage';
import { wordHeart } from '../data/wordHeart';
import { QUIZ_GOAL_MAX, type ReaderView } from '../data/repositories/settings';
import { STUDY_WAY_LINE_MAX } from '../data/repositories/studyWay';
import { MEMORY_NAME_MAX, MEMORY_NOTE_MAX } from '../data/repositories/memory';
import { screenRef, talkRef } from '../data/repositories/talks';
import type { AnswerLink, AnswerWord, GreekOffer } from '../data/db';
import { isAnswerBridge, type AnswerBridge, type MissingFoundations } from '../data/grammar/bridge';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { LearnerProfile } from '../data/learnerProfile';
import { RUSTY_MAX, type RustyItem } from '../data/rusty';
import type { TodayItem } from '../data/learnerToday';
import type { MemoryField } from '../data/learnerMemory';
import { LEARNABLE, LEARNED_VALUE_MAX, type Learnable, type ProfileUpdate } from '../data/repositories/profile';
import type { TutorRequest } from '../data/requestsForTutor';
import type { MemoryUpdate } from '../talk/memoryUpdate';
import type { SettingValue } from '../settings/registry';
import { GREEK_LEVELS, greekLevelOf, nextGreekStep, type GreekLevel } from '../settings/definitions/greekInterest';
import { type TutorResource, type TutorWork } from '../resources/tutorLinks';
import { slugOf, type ScreenContext } from '../tutor/screen';
import type { FormRequest, FormValue } from '../formHelper/formHelper';
import { MAX_SUMMARY } from './feedback';
import { greekSyllables, stressedSyllable } from '../speech/greekSyllables';
import { DEFAULT_PRONUNCIATION, pronunciationOf, tutorGuideOf, type GreekPronunciation } from '../speech/pronunciation';
import { askGrind, type AskOptions } from './tutor';
import { FOLD_A_CHARS, FOLD_MAX_TURNS, FOLD_Q_CHARS, MAX_QUESTION_CHARS, MAX_REQUEST_BYTES, TALK_SUMMARY_MAX } from './requestBudget';
import { solidWordsField } from './solidWords';
import { holdText, talkWindow, textOf, versesLabel } from './talkVerses';
import { GREEK_WORDS_BYTES, greekWordsFitting, type GreekWordEntry } from './greekWords';
import { heldPassagesOf, MAX_FETCH, verseEnglish, verseGreek, type HeldPassage } from './talkFetch';
import { clipText as clipTo, fitRequest, isNoteUpdate, jsonBytes, MAX_HISTORY_TURNS, type CatalogueEntry } from 'voice-kit/talks';
import { bibleTalkSteps, talkBytes } from './talkFit';
import { tutorFitSteps } from '../tutor/fit';

/** The kind the mill runs the grind under (grinds/bible-talk.json). */
export const TALK_KIND = 'bible-talk';

/** How long a message may be (src/services/requestBudget.ts: the same as Ask the tutor's). */
export const MAX_TALK_CHARS = MAX_QUESTION_CHARS;
/** How many earlier turns the grind is sent (voice-kit's @voice-kit/talks has the same ten). */
export { MAX_HISTORY_TURNS };

/** The longest name of a talk the mill takes, in bytes (grist header `talk`). */
export const TALK_NAME_MAX = 80;

/**
 * The name this conversation goes by to the mill (mw-pxji7y.3): its ref and the time of its first turn, `rom.8@1790000000000`. `turns` are the conversation's kept turns,
 * oldest first; with none yet the first turn is this one, and `when` is the time it must be kept with (`now`), so the name is the same on every later turn. New talk deletes the
 * turns, so the next first turn makes a new name by itself; a quiz, a screen and a free talk have refs of their own. A ref too long for the mill's limit is cut and the time stays.
 */
export function talkNameOf(ref: string, turns: readonly { when: number }[], now = Date.now()): { talk: string; when: number } {
  const when = turns[0]?.when ?? now;
  const suffix = `@${when}`;
  return { talk: ref.slice(0, Math.max(0, TALK_NAME_MAX - suffix.length)) + suffix, when };
}

export { MAX_REQUEST_BYTES, GREEK_WORDS_BYTES, TALK_SUMMARY_MAX, FOLD_MAX_TURNS, FOLD_Q_CHARS, FOLD_A_CHARS };

/** What the grind says to anything outside the Bible (grinds/bible-talk.instructions/), word for word. */
export const REFUSAL = 'I can only talk about the Bible here; ask for app changes in Postern.';

/** What the grind says when he asks for a setting the app does not have (grinds/bible-talk.instructions/), word for word. */
export const NO_SETTING = 'The app has no setting for that yet.';

export interface TalkHistoryEntry {
  q: string;
  a: string;
}

/** The word he asked for help with (the word sheet's Help with this word row): the form as it stands, its lemma, its parsing in
 * plain words, and what he wants: its grammar, or how to sound it out; or ('word', the sheet's Ask the tutor) just the word,
 * with nothing in particular asked. */
export interface WordFocus {
  form: string;
  lemma: string;
  parse: string;
  kind: 'grammar' | 'sound' | 'word';
  /** the language of the word when it is not Greek: 'he' for a Hebrew word of an answer (mw-5r3p30.98), whose sound question the grind answers in Hebrew syllables */
  language?: 'he';
  /** a Greek sound question only (mw-5r3p30.241): the word as the app's pronunciation respells it ('TAF-ta'), added by buildTalkRequest; the tutor describes the sounds by it */
  respelling?: string;
  /** a Greek sound question only (mw-5r3p30.274): the word cut into syllables by the app (speech/greekSyllables.ts), in order; the tutor repeats these and never counts */
  syllables?: string[];
  /** with `syllables`: the index (0 = the first) of the stressed syllable; absent when the word carries no accent */
  stress?: number;
  /** a Greek word that has a note (mw-bsf54t.14), added by buildTalkRequest: the heart of the word as the app shows it to him, so the tutor's answer agrees with it */
  heart?: string;
}

/** The question the Hebrew guide's Syllables and sounds sends for a Hebrew word of an answer, and the focus that rides with it. */
export function hebrewSoundAsk(word: string): { message: string; focus: WordFocus } {
  return {
    message: `Help me pronounce the Hebrew word ${word}: its syllables in Hebrew letters and how each sounds.`,
    focus: { form: word, lemma: word, parse: 'Hebrew word', kind: 'sound', language: 'he' },
  };
}

/** One earlier answer of the Quick test round he is in. */
export interface QuizAnswer {
  lemma: string;
  picked: string;
  right: boolean;
}

/** The most earlier answers a quiz focus carries: a round is ten questions, the one asked about is not among them. */
export const MAX_QUIZ_ANSWERS = 10;

/** The Quick test question he asked the tutor about (the question's Ask the tutor): the word (its dictionary form, and the form,
 * parsing and Strong's number it has in the chapter when it has one), the question, the glosses it offered, the one he chose, the
 * right one, and his earlier answers of the round. */
export interface QuizFocus {
  kind: 'quiz';
  lemma: string;
  form?: string;
  parse?: string;
  strongs?: string;
  /** part of speech ('noun'), from the lexicon */
  pos?: string;
  /** the heart of the word as the app shows it to him (mw-bsf54t.14), added by buildTalkRequest */
  heart?: string;
  question: string;
  choices: string[];
  picked: string;
  correct: string;
  right: boolean;
  answers: QuizAnswer[];
}

/** The grammar term he asked the tutor about (the Grammar sheet's Ask the tutor): 'conjunction'. */
export interface TermFocus {
  term: string;
  kind: 'grammar-term';
}

/** A form of a paradigm table with its place in plain words, as the table names it: 'Genitive Singular Feminine' and 'τῆς'. */
export interface ParadigmPlace {
  /** the cell's place; for a word, its parsing in plain words */
  parse: string;
  /** the form; missing for a cell whose form the table does not show him (a locked one) */
  form?: string;
}

/** The paradigm table he asked the tutor about (the Paradigms screen's Ask the tutor, mw-irpgqi.3): its name, the mode he is in (Learn shows every form, Drill hides them until tapped),
 * the forms he has revealed, each with its place: 'Genitive Singular Masculine: τοῦ' (at most MAX_REVEALED, the longest table), the cell in focus (the last one he tapped, or the
 * word's own) and the word he came to the table from, if he did. */
export interface ParadigmFocus {
  table: string;
  revealed: string[];
  kind: 'paradigm';
  mode?: 'learn' | 'drill';
  cell?: ParadigmPlace;
  word?: { form: string; parse: string };
}

/** The most forms a paradigm focus carries (the grind's schema): the largest table holds 40. */
export const MAX_REVEALED = 40;

/** What a question comes with, when it comes from a word's sheet, a Grammar sheet, a paradigm table or a Quick test question. */
export type TalkFocus = WordFocus | TermFocus | ParadigmFocus | QuizFocus;

/** The question the Paradigms screen's Ask the tutor sends: it names the table, and the cell he is on and the word he came from when he is on one; the forms he has revealed and the mode ride in the focus. */
export function paradigmQuestion(table: string, revealed: number, on: Pick<ParadigmFocus, 'cell' | 'word'> = {}): string {
  const cell = on.cell ? ` I am looking at ${on.cell.parse}${on.cell.form ? `: ${on.cell.form}` : ''}.` : '';
  const word = on.word ? ` I came to it from the word ${on.word.form} (${on.word.parse}).` : '';
  if (on.cell || on.word) return `I am learning the paradigm table “${table}”.${cell}${word} Explain what to notice about it and how it fits the pattern of the table.`;
  return revealed > 0
    ? `I am learning the paradigm table “${table}”. Explain its pattern, then quiz me on the forms I have revealed.`
    : `I am learning the paradigm table “${table}” and have not revealed any form yet. Explain its pattern and how to learn it.`;
}

/** The question the word sheet's Help row sends for `focus` in `reference`: it names the word, its lemma, its parsing and the
 * reference, then asks. */
export function helpQuestion(focus: WordFocus, reference: string): string {
  const word = `${focus.form} (lemma ${focus.lemma}; ${focus.parse}) in ${reference}`;
  if (focus.kind === 'word') return `Tell me about the word ${word}: what it means here, why it has this form and how to remember it.`;
  return focus.kind === 'grammar'
    ? `The word ${word}. Explain the grammar of this form and what I need to know to read it.`
    : `The word ${word}. Help me pronounce this word: its syllables and how each sounds.`;
}

/** What the Quick test's Ask the tutor sends: it names the word, the gloss he chose and the right one, and where the word stands when
 * it stands anywhere (`reference`). The rest of what the app knows rides in the focus. */
export function quizQuestion(focus: QuizFocus, reference: string | undefined): string {
  const as = focus.form && focus.form !== focus.lemma ? ` (as ${focus.form})` : '';
  const where = reference ? `, as it stands in ${reference}` : '';
  const verdict = focus.right ? 'and that was right' : `and the right answer was “${focus.correct}”`;
  return `In the Quick test I was asked what ${focus.lemma}${as} means${where}. I chose “${focus.picked}”, ${verdict}. Tell me more about this word and how to remember it.`;
}

/** The question the Grammar sheet's Ask the tutor sends: it names the term and the reference it was asked in. */
export function termQuestion(term: string, reference: string): string {
  return `Explain the grammar term “${term}” in plain words, and show me where it is in ${reference}.`;
}

/** The question the teach sheet's Ask the tutor sends: it names the new word, its meaning and the reference it was met in. */
export function newWordQuestion(lemma: string, gloss: string, reference: string): string {
  return `Teach me the new word ${lemma}${gloss ? ` (${gloss})` : ''}, as it stands in ${reference}: what it means, how it sounds and one way to remember it.`;
}

/** What the grind is sent (Bible Talk Request 1; grinds/bible-talk.input.schema.json). */
export interface TalkRequest {
  reference: string;
  /** the verse's, the passage's or the chapter's first verses' Greek; missing in a talk from a screen (`screen`), which is not about a text */
  greek?: string;
  english?: string;
  /** the verses `greek` and `english` hold (mw-5r3p30.733), the chapter and then the verses: '2:8-10' or '2:9'. The window follows the talk (the verses his question names, the last answer's verse links, the selected verse, else the chapter's first verses) and a clip drops whole verses, so a verse outside this is one the tutor does not hold; missing with `screen` */
  verses?: string;
  /** each distinct Greek word of `greek` with its dictionary form, gloss and parsing as the chapter data has them (mw-5r3p30.246): the tutor names a word's lemma from here, never from memory */
  greek_words?: GreekWordEntry[];
  question: string;
  /** present (true) only when the question was spoken to the phone's English recogniser (mw-5r3p30.244): a Greek word in it may have come as English sound-alikes */
  spoken?: true;
  history: TalkHistoryEntry[];
  /** the running summary of this talk (mw-5r3p30.700): what the tutor wrote of every turn older than `history`, kept on the phone; missing until a turn has fallen out of the window. fitHistory cuts it last of all, after the newest turn */
  summary?: string;
  /** the turns older than `history` that `summary` does not hold yet, oldest first, each cut short (FOLD_Q_CHARS, FOLD_A_CHARS), at most FOLD_MAX_TURNS: the tutor folds them into `summary` and answers with the new one */
  fold?: TalkHistoryEntry[];
  /** only with `fold`: how many older turns still wait behind it, when the backlog is longer than one fold holds (an old talk): the summary is still catching up */
  unfolded?: number;
  /** how many solid words he has (src/services/solidWords.ts) and the most recent few of them, newest last */
  solid_count?: number;
  solid_words: string[];
  /** what each of the app's settings holds now (src/settings/registry.ts currentSettings), by key */
  settings: Record<string, SettingValue>;
  /** present only when the question comes from the word sheet's Help with this word row, a Grammar sheet's Ask the tutor or a paradigm table's */
  focus?: TalkFocus;
  /** present only in a talk from a screen (mw-5r3p30.91, the round Ask the tutor control): the screen's name and what it shows; `reference` is then its name */
  screen?: ScreenContext;
  /** where he stands (src/data/learnerSummary.ts): solid count, the learning words, today's new words, what is due */
  learner?: string;
  /** where his grammar stands (src/data/grammar/learnerGrammar.ts): the goal, the counts, the idea titles by level, the suggested move; fitHistory never cuts it */
  learner_grammar?: LearnerGrammar;
  /** who he is as a student (src/data/learnerProfile.ts, Settings > About you): missing when he has filled in nothing; fitHistory never cuts it */
  learner_profile?: LearnerProfile;
  /** what Lampas remembers of him (src/data/learnerMemory.ts, Settings > Memory): the index and the notes the app chose by name for this place, word and screen; missing when nothing is kept; fitHistory cuts the notes only after the older turns, the word list and his requests, and before the newest turn */
  memory?: MemoryField;
  /** quiz (the Verse view's Quiz me, mw-5r3p30.74): the grind runs the read, quiz, map method on `greek` and `english`; welcome (mw-yrmkdf.3): the grind runs the welcome interview, from a screen named Welcome, with no text */
  mode?: 'quiz' | 'welcome';
  /** present only in a quiz and only when he has kept any (My study way, mw-5r3p30.76): the lines of how he wants to be quizzed; they override the default method where they conflict */
  study_way?: string[];
  /** present only in a quiz (mw-5r3p30.185): why he wants the quiz, in his words, as he kept it (Settings > Quiz goal), or null when he has kept none: the tutor then opens by asking */
  quiz_goal?: string | null;
  /** present only in a quiz in which he chose Just this time for a goal the tutor offered: that goal, for this quiz alone (`quiz_goal` stays null) */
  quiz_goal_once?: string;
  /** present only while the tutor helps him fill in a form (mw-5r3p30.117, src/formHelper/): the form's name and its fields with what each holds now */
  form?: FormRequest;
  /** the Greek pronunciation the app speaks and respells in (mw-5r3p30.241, src/speech/pronunciation.ts), such as 'modern': a sound is described by it */
  pronunciation?: GreekPronunciation;
  /** that pronunciation's name and sound rules, from its scheme (mw-5r3p30.268, Pronunciation.tutorGuide): the grind describes every sound by them */
  pronunciation_guide?: string;
  /** the study resources he has switched on in Settings (mw-5r3p30.123): the only ones the tutor may link; missing in About, whose request is the credits */
  resources?: TutorResource[];
  /** the digest of his Logos shelf chosen by the place (mw-rfjjzd.10, worksForTutor): the pinned books, the commentaries that cover the chapter, the grammars and Greek texts for a question about a form or a reading, and a closing `more` line; the only books the tutor may link as a `work`; missing when none is on his shelf and in About; fitHistory cuts it from its end after the word list and before the history */
  works?: TutorWork[];
  /** present only when pictures go with the message (mw-y3qno5.1): how many, 1 to 4. They are the grist's attachments; the tutor reads the text in them */
  pictures?: number;
  /** present only while an offer waits for his tap (mw-5r3p30.186): the newest one in this talk, its kind and the exact text */
  pending_offer?: PendingOffer;
  /** present only when the grammar words of his question name a topic that rests on ideas he lacks (mw-1vuvq6.5, src/data/grammar/bridge.ts): the topic, how many he lacks and those
   * ideas, the lowest on the ladder first. The tutor picks its `bridge` from it and never guesses an idea. */
  missing_foundations?: MissingFoundations;
  /** which language the Reader shows now (mw-yrmkdf.4); missing in a talk from a screen */
  reader_view?: ReaderView;
  /** the Greek dial as he set it (mw-3ased2.3): its step, the step's name and the one step above, which is all the tutor may offer to raise it to; `next` is missing at All in. A phone not
   * placed yet reads All in. Missing in a quiz and a talk from a screen. */
  greek_interest?: GreekInterestField;
  /** present only when he has sent requests to the factory (mw-vy3ghg.6, src/data/requestsForTutor.ts): up to 10, newest first, each with where it stands; none in About, whose request is the credits */
  requests?: TutorRequest[];
  /** the solid words and ideas he now slips on or has not met for a long while, worst first, at most 8 (mw-1vuvq6.6, src/data/rusty.ts); missing when none; fitHistory never cuts it */
  rusty?: RustyItem[];
  /** the items behind the Reader's chip 'Today · N of M', in the order Today draws them, each with its title and whether he ticked it (mw-5r3p30.731, src/data/learnerToday.ts); missing when Today holds nothing; fitHistory never cuts it */
  today?: TodayItem[];
  /** the passages the tutor asked for in `fetch` on earlier turns of this talk (mw-5r3p30.734, src/services/talkFetch.ts), newest first, under HELD_PASSAGES_BYTES; missing when none, and in About. fitHistory drops the oldest
   * before a verse of the talk's own text or a turn */
  held_passages?: HeldPassage[];
  /** the facts the tutor client read up front, by name (mw-t3xu9a.4, src/tutor/registry.ts): where-he-is, today-drill and settings always, then the screen's up-front list; added to the fields above, which they leave as they are. fitHistory drops one that repeats a field above before it cuts a turn */
  facts?: Record<string, unknown>;
  /** every fact and place the tutor may name, sorted, each with its tell line (the client's registry.catalogue()); fitHistory cuts the tell lines first of all */
  catalogue?: CatalogueEntry[];
  /** only in a follow-up (mw-t3xu9a.7): the facts the answer to the request before asked for (`asks`), by name, as the registry read them */
  asked?: Record<string, unknown>;
}

/** One command an answer asks the app to run. */
export interface DoCall {
  name: string;
  args?: unknown;
}

/** The most commands, facts and misses one answer names (the schema's limits, grinds/bible-talk.answer.schema.json). */
const MAX_DO = 8;
const MAX_ASKS = 8;
const MAX_MISSES = 5;

const isDoCall = (value: unknown): value is DoCall => isObject(value) && isText(value.name, 80) && Object.keys(value).every((k) => k === 'name' || k === 'args');
const isMiss = (value: unknown): boolean => isObject(value) && Object.keys(value).length === 2 && isText(value.wanted, 200) && isText(value.why, 300);

/** What the tutor's `rusty_offer` holds: the rusty items (kind and id, as the request listed them) it offers to move back to Frontier. */
export interface RustyOfferAnswer {
  items: Array<{ kind: 'word' | 'idea'; id: string }>;
}

/** The most links an answer carries (the grind's schema): the app shows the first three of more. */
export const MAX_LINKS = 3;

/** The longest summary of a feedback offer: the feedback grind's (grinds/feedback.input.schema.json `summary`). */
export const FEEDBACK_SUMMARY_MAX = MAX_SUMMARY;

/** The tutor's offer to pass an ask the app cannot meet to the makers: one line saying what he wants. The app draws Send this to the makers; nothing is sent without his tap. */
export interface FeedbackOffer {
  summary: string;
}

/** The offer waiting for his tap that his next turn carries (mw-5r3p30.186): its kind and the exact text it would send or do, so the tutor can read it back word for word
 * and tell from his words whether he confirms, declines or asks to hear it. */
export interface PendingOffer {
  kind: 'feedback' | 'setting' | 'quiz-goal' | 'bridge' | 'greek' | 'rusty' | 'today';
  text: string;
}

/** What the tutor decided his words were, when an offer was waiting: yes, no or 'read it back'. Left out for an ordinary question, and the offer stays. */
export type OfferReply = 'confirm' | 'decline' | 'read_back';
export const OFFER_REPLIES: readonly OfferReply[] = ['confirm', 'decline', 'read_back'];

/** What the grind answers (grinds/bible-talk.answer.schema.json). */
export interface TalkAnswer {
  answer: string;
  words: AnswerWord[];
  /** what he said, cleaned up by the tutor (punctuation, capitals, no fillers); shown in place of his raw words when present */
  question?: string;
  /** the settings he asked to change, as the grind wrote them: the registry checks each one before it is applied */
  settings_changes?: unknown[];
  /** the lemmas he asked to put on his words-to-learn list ('add σάρξ to my words'): at most 12 */
  words_to_add?: string[];
  /** for a Sound it out question: the syllables of the word, in order (at most 12) */
  syllables?: string[];
  /** for a Hebrew word's sound question: how each of `syllables` sounds, in Latin letters, in the same order (at most 12) */
  transliteration?: string[];
  /** only when the request carried `fold` (mw-5r3p30.700): the talk's new running summary, `summary` and every turn of `fold` folded in, at most TALK_SUMMARY_MAX characters; the app keeps it on the phone and sends it next time */
  summary?: string;
  /** the words and verses the answer links to a study resource (mw-5r3p30.75): the app shows each in the resources he has switched on */
  links?: AnswerLink[];
  /** in a quiz, one line the tutor proposes for his study way (mw-5r3p30.76): shown with Keep this, kept only when he taps it */
  study_way_line?: string;
  /** in a quiz, the goal the tutor understood from him (mw-5r3p30.185), at most QUIZ_GOAL_MAX characters: shown with Yes, from now on | Just this time, kept only when he taps Yes */
  quiz_goal_offer?: string;
  /** what the tutor learned about him as a student in this exchange, or judged from how he writes (mw-1vuvq6.3): kept on the phone beside his own profile, never over it */
  profile_update?: ProfileUpdate[];
  /** the field of his profile the question in `answer` asks him about: noted so the tutor does not ask it again at once */
  profile_question?: Learnable;
  /** an ask the app cannot meet (another app, a new setting, a change): the summary the app offers to send to the makers */
  feedback_offer?: FeedbackOffer;
  /** a setting change to offer instead of making it (mw-5r3p30.186): the app shows a button and changes it on his tap or his spoken yes; the registry checks it */
  setting_offer?: { key: string; value: string | number };
  /** only when the request carried `pending_offer`: what his words did with it */
  offer_reply?: OfferReply;
  /** only when the request carried `missing_foundations` (mw-1vuvq6.5): up to three of those ideas he lacks, the one to start with and why; the app offers Take me there */
  bridge?: AnswerBridge;
  /** only for a reader not learning the Greek, on real interest in the original (mw-yrmkdf.4): the ONE line offering the Greek word's sheet or the Greek view, drawn as a button; src/talk/greekOffer.ts decides whether it is kept */
  greek_offer?: GreekOffer;
  /** only when the request carried `rusty` (mw-1vuvq6.6): which of those items to offer to move back to Frontier; the app keeps only the ones it listed, and draws the button */
  rusty_offer?: RustyOfferAnswer;
  /** only when the request carried `today` (mw-5r3p30.731): the tutor offers to open Today (its drill); the app draws one button and opens it on his tap or his yes */
  today_offer?: true;
  /** true when he asked for Greek himself (mw-yrmkdf.4): the app takes his earlier no to the Greek offer out of the memory index */
  greek_asked?: true;
  /** while the tutor helps with a form (`form` in the request): the values to put in its fields, by field name; the form ignores a name it does not have */
  form_values?: FormValue[];
  /** the name of the field the question in `answer` is about; missing when there is nothing more to ask */
  form_ask?: string;
  /** a chapter he asked to be taken to (mw-5r3p30.172): {book, chapter}. Read by src/talk/go.ts; whatever else arrives is ignored there, not refused here. */
  go?: unknown;
  /** names of facts of the app's registry the tutor needs before it answers (mw-t3xu9a.5): the app reads them and sends the request again with `asked` (src/useTalk.ts) */
  asks?: string[];
  /** commands of the registry to run, in order (mw-t3xu9a.5): `[{name, args}]`, carried out by the tutor client (src/tutor/registry.ts); the sheet shows each one's line (src/talk/DoneLine.tsx) */
  do?: DoCall[];
  /** what the tutor wanted that the registry lacks (mw-t3xu9a.5): `[{wanted, why}]`, recorded as misses by the client */
  misses?: { wanted: string; why: string }[];
  /** the tutor's one line on what it did through the app; the sheet shows the app's own line for each command, so this one is only checked */
  said?: string;
  /** what to add to the reader's memory (mw-yrmkdf.2): at most MAX_MEMORY_UPDATES entries, applied by src/talk/memoryUpdate.ts (a replace or remove only when `directed`) */
  memory_update?: MemoryUpdate[];
  /** names of notes the tutor would have used had they existed (book:<Book>, word:<lemma>, topic:<slug>): counted and the last names kept, nothing more */
  wished_notes?: string[];
  /** only in the welcome (mw-yrmkdf.3): the interview is over, this answer is its line of thanks; the app ends the welcome */
  welcome_done?: true;
  /** the passages the talk is heading toward that the tutor does not hold (mw-5r3p30.734): at most MAX_FETCH references, read by the app after the answer is shown (src/services/talkFetch.ts) */
  fetch?: string[];
}

/** The most entries a memory_update has, and the most names a wished_notes has; the longest line an append adds (the answer schema's). */
export const MAX_MEMORY_UPDATES = 4;
export const MAX_WISHED_NOTES = 5;
export const MEMORY_APPEND_MAX = 300;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

const isWorkLink = (value: Record<string, unknown>): boolean =>
  value.kind === 'work' &&
  isText(value.work, 60) &&
  Object.keys(value).length === 2 + Number('reference' in value) + Number('place' in value) &&
  (!('reference' in value) || isText(value.reference, 40)) &&
  (!('place' in value) || isText(value.place, 20));

const isAnswerLink = (value: unknown): value is AnswerLink =>
  isObject(value) &&
  (isWorkLink(value) ||
    (Object.keys(value).length === 2 && ((value.kind === 'word' && isText(value.lemma, 80)) || (value.kind === 'verse' && isText(value.reference, 40)) || (value.kind === 'setting' && isText(value.key, 40)))));

const isFormValue = (value: unknown): value is FormValue =>
  isObject(value) && Object.keys(value).length === 2 && isText(value.field, 30) && isText(value.value, 1200);

const isProfileUpdate = (value: unknown): value is ProfileUpdate => {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'field' && k !== 'value' && k !== 'guessed' && k !== 'declined')) return false;
  if (value.field !== 'note' && !LEARNABLE.some((f) => f === value.field)) return false;
  if ('guessed' in value && value.guessed !== true) return false;
  if ('declined' in value && value.declined !== true) return false;
  return 'value' in value ? isText(value.value, LEARNED_VALUE_MAX) : value.declined === true;
};

const isMemoryUpdate = (value: unknown): value is MemoryUpdate =>
  isNoteUpdate(value, { nameMax: MEMORY_NAME_MAX, appendMax: MEMORY_APPEND_MAX, replaceMax: MEMORY_NOTE_MAX });

/** The longest line of a Greek offer: the answer schema's. */
export const GREEK_OFFER_TEXT_MAX = 120;
const isGreekOffer = (value: unknown): value is GreekOffer =>
  isObject(value) &&
  isText(value.text, GREEK_OFFER_TEXT_MAX) &&
  ((value.kind === 'view' && Object.keys(value).length === 2) || (value.kind === 'word' && Object.keys(value).length === 3 && isText(value.lemma, 80)));

const isRustyOffer = (value: unknown): value is RustyOfferAnswer =>
  isObject(value) &&
  Object.keys(value).length === 1 &&
  Array.isArray(value.items) &&
  value.items.length >= 1 &&
  value.items.length <= RUSTY_MAX &&
  value.items.every((i) => isObject(i) && Object.keys(i).length === 2 && (i.kind === 'word' || i.kind === 'idea') && isText(i.id, 80));

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isTalkAnswer(value: unknown): value is TalkAnswer {
  if (!isObject(value) || !isText(value.answer, 1500)) return false;
  if (Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question' && k !== 'settings_changes' && k !== 'words_to_add' && k !== 'syllables' && k !== 'transliteration' && k !== 'links' && k !== 'study_way_line' && k !== 'quiz_goal_offer' && k !== 'profile_update' && k !== 'profile_question' && k !== 'feedback_offer' && k !== 'setting_offer' && k !== 'offer_reply' && k !== 'bridge' && k !== 'form_values' && k !== 'form_ask' && k !== 'go' && k !== 'memory_update' && k !== 'wished_notes' && k !== 'greek_offer' && k !== 'greek_asked' && k !== 'rusty_offer' && k !== 'today_offer' && k !== 'welcome_done' && k !== 'summary' && k !== 'fetch' && k !== 'asks' && k !== 'do' && k !== 'misses' && k !== 'said')) return false;
  if ('question' in value && !isText(value.question, MAX_TALK_CHARS)) return false;
  if ('memory_update' in value && !(Array.isArray(value.memory_update) && value.memory_update.length <= MAX_MEMORY_UPDATES && value.memory_update.every(isMemoryUpdate))) return false;
  if ('wished_notes' in value && !(Array.isArray(value.wished_notes) && value.wished_notes.length <= MAX_WISHED_NOTES && value.wished_notes.every((n) => isText(n, MEMORY_NAME_MAX)))) return false;
  if ('summary' in value && !isText(value.summary, TALK_SUMMARY_MAX)) return false;
  if ('asks' in value && !(Array.isArray(value.asks) && value.asks.length <= MAX_ASKS && value.asks.every((n) => isText(n, 80)))) return false;
  if ('do' in value && !(Array.isArray(value.do) && value.do.length <= MAX_DO && value.do.every(isDoCall))) return false;
  if ('misses' in value && !(Array.isArray(value.misses) && value.misses.length <= MAX_MISSES && value.misses.every(isMiss))) return false;
  if ('said' in value && !isText(value.said, 300)) return false;
  if ('fetch' in value && !(Array.isArray(value.fetch) && value.fetch.length <= MAX_FETCH && value.fetch.every((r) => isText(r, 40)))) return false;
  if ('study_way_line' in value && !isText(value.study_way_line, STUDY_WAY_LINE_MAX)) return false;
  if ('quiz_goal_offer' in value && !isText(value.quiz_goal_offer, QUIZ_GOAL_MAX)) return false;
  if ('profile_update' in value && !(Array.isArray(value.profile_update) && value.profile_update.length <= 3 && value.profile_update.every(isProfileUpdate))) return false;
  if ('profile_question' in value && !LEARNABLE.some((f) => f === value.profile_question)) return false;
  if ('feedback_offer' in value && !(isObject(value.feedback_offer) && Object.keys(value.feedback_offer).length === 1 && isText(value.feedback_offer.summary, FEEDBACK_SUMMARY_MAX))) return false;
  if ('offer_reply' in value && !OFFER_REPLIES.includes(value.offer_reply as OfferReply)) return false;
  if ('bridge' in value && !isAnswerBridge(value.bridge)) return false;
  if ('greek_offer' in value && !isGreekOffer(value.greek_offer)) return false;
  if ('greek_asked' in value && value.greek_asked !== true) return false;
  if ('welcome_done' in value && value.welcome_done !== true) return false;
  if ('rusty_offer' in value && !isRustyOffer(value.rusty_offer)) return false;
  if ('today_offer' in value && value.today_offer !== true) return false;
  if ('setting_offer' in value && !(isObject(value.setting_offer) && Object.keys(value.setting_offer).length === 2 && isText(value.setting_offer.key, 60) && (isText(value.setting_offer.value, 80) || typeof value.setting_offer.value === 'number'))) return false;
  if ('form_ask' in value && !isText(value.form_ask, 30)) return false;
  if ('form_values' in value && !(Array.isArray(value.form_values) && value.form_values.length <= 8 && value.form_values.every(isFormValue))) return false;
  if ('links' in value && !(Array.isArray(value.links) && value.links.length <= 12 && value.links.every(isAnswerLink))) return false;
  if ('settings_changes' in value && !Array.isArray(value.settings_changes)) return false;
  if ('words_to_add' in value && !(Array.isArray(value.words_to_add) && value.words_to_add.length <= 12 && value.words_to_add.every((l) => isText(l, 80)))) return false;
  if ('syllables' in value && !(Array.isArray(value.syllables) && value.syllables.length <= 12 && value.syllables.every((s) => isText(s, 40)))) return false;
  if ('transliteration' in value && !(Array.isArray(value.transliteration) && value.transliteration.length <= 12 && value.transliteration.every((s) => isText(s, 40)))) return false;
  if (!Array.isArray(value.words) || value.words.length > 12) return false;
  return value.words.every((w) => isObject(w) && Object.keys(w).length === 3 && isText(w.greek, 80) && isText(w.lemma, 80) && isText(w.note, 300));
}

/** What a talk is about: the chapter (`verse` null), one of its verses, or a passage under a heading (a Verse with `to`, src/data/passage.ts).
 * `quiz` makes it the quiz about that verse or passage: a conversation of its own, every request in quiz mode. */
export interface TalkScope {
  /** the chapter's title: 'Romans 8'; for a talk from a screen, the screen's name */
  title: string;
  chapter: Chapter;
  verse: Verse | null;
  quiz?: boolean;
  /** the welcome interview of a new reader (mw-yrmkdf.3): a talk from the screen Welcome, every request in welcome mode */
  welcome?: boolean;
  /** a talk from a screen (mw-5r3p30.91): what the screen shows. `chapter` is then NO_CHAPTER, `verse` null: the talk is not about a text. */
  screen?: ScreenContext;
  /** a screen talk kept under a key of its own, not the screen's (mw-5r3p30.649: the results of each drill are a talk, 'screen.drill-it.<n>') */
  kept?: string;
  /** a talk of its own (mw-y3qno5.2): the key it is kept under ('talk.<ms>', src/share/talkPlace.ts newTalkRef). It carries a `screen` that names no screen, and the sheet is a plain talk with the tutor. */
  free?: string;
}

/** The first thing he says in a quiz (the Start the quiz button sends it): the sheet shows it as his turn. */
export const quizMeQuestion = (reference: string): string => `Quiz me on ${reference}.`;

const greekOf = verseGreek;
const englishOf = verseEnglish;

/** The title of the sheet and the reference in the request: 'Romans 8', 'Romans 8:28' or, for a passage, 'Romans 8:1-11'. */
export const scopeTitle = (scope: Pick<TalkScope, 'title' | 'verse'>): string => (scope.verse ? `${scope.title}:${unitId(scope.verse)}` : scope.title);

/** The key the conversation `scope` names is kept under (src/data/repositories/talks.ts talkRef). */
export const scopeRef = (book: string, chapter: number, scope: Pick<TalkScope, 'verse' | 'quiz' | 'screen' | 'free' | 'kept'>): string =>
  scope.free ? scope.free : scope.screen && scope.kept ? scope.kept : scope.screen ? screenRef(slugOf(scope.screen.name)) : talkRef(book, chapter, scope.verse ? unitId(scope.verse) : null, scope.quiz === true);

/** The key points the mill wrote when it ended a talk's session (at most 1500 characters) as the running summary the device keeps: a summary is at most TALK_SUMMARY_MAX, so longer key points are cut at that, ending in the clip mark. */
export const summaryOfKeyPoints = (keyPoints: string): string => clipTo(keyPoints.trim(), TALK_SUMMARY_MAX);

/** A turn as the fold carries it: what he said and what the tutor answered, each cut short. */
export const foldedTurn = (turn: TalkHistoryEntry): TalkHistoryEntry => ({ q: clipTo(turn.q, FOLD_Q_CHARS), a: clipTo(turn.a, FOLD_A_CHARS) });

/**
 * Makes the request fit a grist: while it is too big the oldest long answer in the history is cut short; when none is left to cut
 * the words of the text (greek_words) are cut from their end, and when none is left the oldest turn is dropped. The newest turn is
 * the last to be touched (a quiz is nothing without its earlier turns, so they outlast the tail of a long passage's word list).
 * The digest of his shelf (`works`) is cut from its end once the words are gone (each book it drops is counted into its closing line, trimWorks), before the passage's text is clipped and before any turn is dropped (mw-rfjjzd.10).
 * The text of a passage too long for a request is clipped from its end (clipTexts) once the words are gone, before any turn is dropped.
 * The oldest turns go until the newest alone is left; then the oldest of his requests (the last in the list, newest first) go one at a time, then
 * his memory notes, and only then the newest turn (mw-5r3p30.615: a talk from Settings, whose screen weighs most of the record, forgot the question
 * it was answering). A turn dropped for room moves to the fold, cut short, so the tutor folds it into the summary (mw-5r3p30.700); the fold goes before the lesser fields, and the summary after the
 * newest turn, last of all. The tutor client's part (`facts`, `catalogue`, src/tutor/fit.ts) gives way before all of that: the catalogue's tell lines, then a fact that repeats a field. `held` is how many of the history's oldest turns the summary holds already (they are never folded twice). `talk` is the talk's name, which weighs with the request. The questions of a drill's results go after the notes, right answers first. The pronunciation's guide goes before the words and the turns (mw-5r3p30.268: a quiz on a long passage needs them more than
 * the sound rules), except on a sound question.
 */
export function fitHistory(request: TalkRequest, held = 0, talk?: string): TalkRequest {
  // the talk's name travels in the grist header beside the request and weighs with it (mw-pxji7y.3)
  return fitRequest(request, [...tutorFitSteps, ...bibleTalkSteps(held)], { maxBytes: MAX_REQUEST_BYTES, extraBytes: talkBytes(talk) });
}

/** A Greek sound question carries the app's respelling of the word, and its syllables and stressed syllable (mw-5r3p30.274), so the tutor explains the sounds by the pronunciation the app speaks, not by its own habit. */
function withRespelling(focus: TalkFocus, pronunciation: GreekPronunciation): TalkFocus {
  if (!('form' in focus) || focus.kind !== 'sound' || focus.language) return focus;
  const syllables = greekSyllables(focus.form);
  const stress = stressedSyllable(syllables);
  return { ...focus, respelling: pronunciationOf(pronunciation).respell(focus.form), syllables, ...(stress >= 0 ? { stress } : {}) };
}

/** A Greek word that has a note on its heart (src/data/wordHeart.ts) carries it, so the tutor's answer agrees with what the app showed him (mw-bsf54t.14). */
function withHeart(focus: TalkFocus): TalkFocus {
  if (!('lemma' in focus) || ('language' in focus && focus.language)) return focus;
  const heart = wordHeart(focus.lemma);
  return heart ? { ...focus, heart } : focus;
}

/** The Greek dial as the request carries it: `greekInterest` of the settings, read as the Reader reads it (All in until the phone is placed). */
export interface GreekInterestField {
  level: GreekLevel;
  name: string;
  next?: { level: GreekLevel; name: string };
}

/** The dial's field of a request, from the settings it carries. */
export function greekInterestField(settings: Record<string, SettingValue>): GreekInterestField {
  const level = greekLevelOf(settings.greekInterest);
  const next = nextGreekStep(level);
  return { level, name: GREEK_LEVELS[level].name, ...(next ? { next: { level: next.level, name: next.name } } : {}) };
}

/** The request for what he just said: the verse's or the passage's whole text, the verses his words or the last answer's links name, or the chapter's first three verses (src/services/talkVerses.ts); the last 10 turns, oldest first, the talk's running summary and the next turns to fold into it; the settings as they stand; the word he asked help with, if he did. */
export function buildTalkRequest(
  scope: TalkScope,
  question: string,
  turns: { q: string; a: string; links?: AnswerLink[]; fetched?: HeldPassage[] }[],
  solidWords: string[],
  settings: Record<string, SettingValue> = {},
  focus?: TalkFocus,
  learner?: string,
  learnerGrammar?: LearnerGrammar,
  studyWay: string[] = [],
  resources: TutorResource[] = [],
  pictureCount = 0,
  quizGoal: { kept: string; once?: string } = { kept: '' },
  pendingOffer?: PendingOffer,
  requests: TutorRequest[] = [],
  learnerProfile?: LearnerProfile,
  pronunciation: GreekPronunciation = DEFAULT_PRONUNCIATION,
  spoken = false,
  memory?: MemoryField,
  missingFoundations?: MissingFoundations,
  readerView?: ReaderView,
  rusty?: RustyItem[],
  works: TutorWork[] = [],
  summary?: { text: string; covered: number },
  today?: TodayItem[],
): TalkRequest {
  // the turns older than the window that the summary does not hold yet: the next few, oldest first, for the tutor to fold in (mw-5r3p30.700)
  const past = Math.max(0, turns.length - MAX_HISTORY_TURNS);
  const from = Math.min(summary?.covered ?? 0, past);
  const folding = turns.slice(from, Math.min(past, from + FOLD_MAX_TURNS)).map(foldedTurn);
  const waiting = past - from - folding.length;
  // the verses the talk holds follow the talk (mw-5r3p30.733): those he names, those the last answer linked, the selected verse, else the chapter's first; a quiz holds its passage
  const hold = scope.screen ? undefined : talkWindow(scope.chapter, scope.verse, question, turns[turns.length - 1], !scope.quiz && !scope.welcome, greekOf, englishOf);
  const verses = hold ? hold.parts.map((p) => p.verse) : [];
  // About (mw-vtjxh4.2) sends the credits, which take most of the record: the credits are the talk, so his words and his grammar stay home
  const aboutCredits = scope.screen?.credits !== undefined;
  // the passages the tutor fetched on earlier turns, newest first (mw-5r3p30.734)
  const held = aboutCredits ? [] : heldPassagesOf(turns);
  const request: TalkRequest = {
    reference: scopeTitle(scope),
    // a talk from a screen is not about a text: it carries the screen and no verse text
    ...(scope.screen || !hold ? { screen: scope.screen } : { ...textOf(hold.parts), ...(hold.parts.length > 0 ? { verses: versesLabel(hold.chapter, hold.parts) } : {}) }),
    ...(held.length > 0 ? { held_passages: held } : {}),
    question: question.trim(),
    ...(spoken ? { spoken: true as const } : {}),
    history: turns.slice(-MAX_HISTORY_TURNS).map(({ q, a }) => ({ q, a })),
    ...(summary?.text ? { summary: summary.text } : {}),
    ...(folding.length > 0 ? { fold: folding } : {}),
    ...(folding.length > 0 && waiting > 0 ? { unfolded: waiting } : {}),
    // a talk with credits sends no words and no count: a count of 0 would tell the tutor he knows nothing
    ...(aboutCredits ? { solid_words: [] } : solidWordsField(solidWords)),
    settings,
    pronunciation,
    pronunciation_guide: tutorGuideOf(pronunciationOf(pronunciation)),
    ...(focus ? { focus: withHeart(withRespelling(focus, pronunciation)) } : {}),
    ...(learner ? { learner } : {}),
    ...(learnerGrammar && !aboutCredits ? { learner_grammar: learnerGrammar } : {}),
    ...(learnerProfile && !aboutCredits ? { learner_profile: learnerProfile } : {}),
    ...(memory && !aboutCredits ? { memory } : {}),
    ...(scope.quiz ? { mode: 'quiz' as const } : scope.welcome ? { mode: 'welcome' as const } : {}),
    ...(scope.quiz && studyWay.length > 0 ? { study_way: studyWay } : {}),
    ...(scope.quiz ? { quiz_goal: quizGoal.kept === '' ? null : quizGoal.kept } : {}),
    ...(scope.quiz && quizGoal.kept === '' && quizGoal.once ? { quiz_goal_once: quizGoal.once } : {}),
    ...(aboutCredits ? {} : { resources }),
    ...(works.length > 0 && !aboutCredits ? { works } : {}),
    ...(pictureCount > 0 ? { pictures: pictureCount } : {}),
    ...(pendingOffer ? { pending_offer: pendingOffer } : {}),
    ...(missingFoundations && !aboutCredits ? { missing_foundations: missingFoundations } : {}),
    ...(readerView && !scope.screen && !scope.quiz ? { reader_view: readerView } : {}),
    ...(!scope.screen && !scope.quiz ? { greek_interest: greekInterestField(settings) } : {}),
    ...(requests.length > 0 && !aboutCredits ? { requests } : {}),
    ...(rusty && rusty.length > 0 && !aboutCredits && !scope.quiz && !scope.welcome ? { rusty } : {}),
    ...(today && today.length > 0 && !aboutCredits && !scope.quiz && !scope.welcome ? { today } : {}),
  };
  if (scope.screen || !hold) return request;
  // the words of the text weigh what the rest leaves of the record, without the history (which is cut first), up to GREEK_WORDS_BYTES
  return holdText({ ...request, greek_words: greekWordsFitting(scope.chapter, verses, request.question, pronunciation, jsonBytes({ ...request, history: [] })) }, hold);
}

/** Sends what he said and waits for the companion's answer. Throws a TutorError (src/services/tutor.ts). */
export function askTalk(request: TalkRequest, options: AskOptions): Promise<TalkAnswer> {
  return askGrind(TALK_KIND, fitHistory(request, 0, options.talk), isTalkAnswer, options);
}
