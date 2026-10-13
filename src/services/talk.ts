// src/services/talk.ts — the Bible talk: one thing he says, sent as a grist through Postern (bsv-kit/grist) and answered by
// the mill's bible-talk grind (grinds/bible-talk.json). The wire work is the tutor's (src/services/tutor.ts askGrind); this
// file is the kind's own: the request with the last turns of the conversation, the answer's shape, and the fit to a grist.
import { markSupplied, wordGloss, wordLemma, wordParse, type Chapter, type Verse } from '../data/chapter';
import { unitId } from '../data/passage';
import { QUIZ_GOAL_MAX } from '../data/repositories/settings';
import { STUDY_WAY_LINE_MAX } from '../data/repositories/studyWay';
import { MEMORY_NAME_MAX, MEMORY_NOTE_MAX } from '../data/repositories/memory';
import { screenRef, talkRef } from '../data/repositories/talks';
import type { AnswerLink, AnswerWord } from '../data/db';
import { isAnswerBridge, type AnswerBridge, type MissingFoundations } from '../data/grammar/bridge';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { LearnerProfile } from '../data/learnerProfile';
import type { MemoryField } from '../data/learnerMemory';
import { LEARNABLE, LEARNED_VALUE_MAX, type Learnable, type ProfileUpdate } from '../data/repositories/profile';
import type { TutorRequest } from '../data/requestsForTutor';
import type { MemoryUpdate } from '../talk/memoryUpdate';
import type { SettingValue } from '../settings/registry';
import type { TutorResource } from '../resources/tutorLinks';
import { slugOf, type ScreenContext } from '../tutor/screen';
import type { FormFieldState, FormValue } from '../formHelper/formHelper';
import { MAX_SUMMARY } from './feedback';
import { greekSyllables, stressedSyllable } from '../speech/greekSyllables';
import { DEFAULT_PRONUNCIATION, pronunciationOf, type GreekPronunciation } from '../speech/pronunciation';
import { askGrind, type AskOptions } from './tutor';

/** The kind the mill runs the grind under (grinds/bible-talk.json). */
export const TALK_KIND = 'bible-talk';

/** How long a message may be (the grist's record is capped at 10 KiB; the history and the text share it). */
export const MAX_TALK_CHARS = 600;
/** How many earlier turns the grind is sent. */
export const MAX_HISTORY_TURNS = 10;
/** The most a request may weigh, as JSON in UTF-8: a record is capped at 10 KiB and the sealed grist is base64 of this. */
export const MAX_REQUEST_BYTES = 6500;
/** A long answer in the history is cut to this many characters when the request is too big. */
const CLIPPED_CHARS = 240;
const CLIP_MARK = '…';
/** The verses of a chapter the grind is given when the talk is about the chapter. */
const CHAPTER_VERSES = 3;

/** What the grind says to anything outside the Bible (grinds/bible-talk.instructions.md), word for word. */
export const REFUSAL = 'I can only talk about the Bible here; ask for app changes in Postern.';

/** What the grind says when he asks for a setting the app does not have (grinds/bible-talk.instructions.md), word for word. */
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

/** The paradigm table he asked the tutor about (the Paradigms screen's Ask the tutor): its name and the forms he has revealed, each
 * with its place: 'Genitive Singular Masculine: τοῦ'. At most MAX_REVEALED, the longest table. */
export interface ParadigmFocus {
  table: string;
  revealed: string[];
  kind: 'paradigm';
}

/** The most forms a paradigm focus carries (the grind's schema): the largest table holds 40. */
export const MAX_REVEALED = 40;

/** What a question comes with, when it comes from a word's sheet, a Grammar sheet, a paradigm table or a Quick test question. */
export type TalkFocus = WordFocus | TermFocus | ParadigmFocus | QuizFocus;

/** The question the Paradigms screen's Ask the tutor sends: it names the table; the forms he has revealed ride in the focus. */
export function paradigmQuestion(table: string, revealed: number): string {
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

/** One word of the text as the chapter data has it: the form as it stands, its lemma (NFC), the lexicon's gloss and the parsing in plain words. */
export interface TalkGreekWord {
  form: string;
  lemma: string;
  gloss: string;
  parse: string;
}

/** What the grind is sent (Bible Talk Request 1; grinds/bible-talk.input.schema.json). */
export interface TalkRequest {
  reference: string;
  /** the verse's, the passage's or the chapter's first verses' Greek; missing in a talk from a screen (`screen`), which is not about a text */
  greek?: string;
  english?: string;
  /** each distinct Greek word of `greek` with its dictionary form, gloss and parsing as the chapter data has them (mw-5r3p30.246): the tutor names a word's lemma from here, never from memory */
  greek_words?: TalkGreekWord[];
  question: string;
  /** present (true) only when the question was spoken to the phone's English recogniser (mw-5r3p30.244): a Greek word in it may have come as English sound-alikes */
  spoken?: true;
  history: TalkHistoryEntry[];
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
  /** what Lampas remembers of him (src/data/learnerMemory.ts, Settings > Memory): the index and the notes the app chose by name for this place, word and screen; missing when nothing is kept; fitHistory cuts the notes only after the history, the word list and his requests */
  memory?: MemoryField;
  /** present only in a quiz (the Verse view's Quiz me, mw-5r3p30.74): the grind then runs the read, quiz, map method on `greek` and `english` */
  mode?: 'quiz';
  /** present only in a quiz and only when he has kept any (My study way, mw-5r3p30.76): the lines of how he wants to be quizzed; they override the default method where they conflict */
  study_way?: string[];
  /** present only in a quiz (mw-5r3p30.185): why he wants the quiz, in his words, as he kept it (Settings > Quiz goal), or null when he has kept none: the tutor then opens by asking */
  quiz_goal?: string | null;
  /** present only in a quiz in which he chose Just this time for a goal the tutor offered: that goal, for this quiz alone (`quiz_goal` stays null) */
  quiz_goal_once?: string;
  /** present only while the tutor helps him fill in a form (mw-5r3p30.117, src/formHelper/): the form's name and its fields with what each holds now */
  form?: { name: string; fields: FormFieldState[] };
  /** the Greek pronunciation the app speaks and respells in (mw-5r3p30.241, src/speech/pronunciation.ts), such as 'modern': a sound is described by it */
  pronunciation?: GreekPronunciation;
  /** the study resources he has switched on in Settings (mw-5r3p30.123): the only ones the tutor may link; missing in About, whose request is the credits */
  resources?: TutorResource[];
  /** present only when pictures go with the message (mw-y3qno5.1): how many, 1 to 4. They are the grist's attachments; the tutor reads the text in them */
  pictures?: number;
  /** present only while an offer waits for his tap (mw-5r3p30.186): the newest one in this talk, its kind and the exact text */
  pending_offer?: PendingOffer;
  /** present only when the grammar words of his question name a topic that rests on ideas he lacks (mw-1vuvq6.5, src/data/grammar/bridge.ts): the topic, how many he lacks and those
   * ideas, the lowest on the ladder first. The tutor picks its `bridge` from it and never guesses an idea. */
  missing_foundations?: MissingFoundations;
  /** present only when he has sent requests to the factory (mw-vy3ghg.6, src/data/requestsForTutor.ts): up to 10, newest first, each with where it stands; none in About, whose request is the credits */
  requests?: TutorRequest[];
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
  kind: 'feedback' | 'setting' | 'quiz-goal' | 'bridge';
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
  /** while the tutor helps with a form (`form` in the request): the values to put in its fields, by field name; the form ignores a name it does not have */
  form_values?: FormValue[];
  /** the name of the field the question in `answer` is about; missing when there is nothing more to ask */
  form_ask?: string;
  /** a chapter he asked to be taken to (mw-5r3p30.172): {book, chapter}. Read by src/talk/go.ts; whatever else arrives is ignored there, not refused here. */
  go?: unknown;
  /** what to add to the reader's memory (mw-yrmkdf.2): at most MAX_MEMORY_UPDATES entries, applied by src/talk/memoryUpdate.ts (a replace or remove only when `directed`) */
  memory_update?: MemoryUpdate[];
  /** names of notes the tutor would have used had they existed (book:<Book>, word:<lemma>, topic:<slug>): counted and the last names kept, nothing more */
  wished_notes?: string[];
}

/** The most entries a memory_update has, and the most names a wished_notes has; the longest line an append adds (the answer schema's). */
export const MAX_MEMORY_UPDATES = 4;
export const MAX_WISHED_NOTES = 5;
export const MEMORY_APPEND_MAX = 300;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

const isAnswerLink = (value: unknown): value is AnswerLink =>
  isObject(value) && Object.keys(value).length === 2 && ((value.kind === 'word' && isText(value.lemma, 80)) || (value.kind === 'verse' && isText(value.reference, 40)));

const isFormValue = (value: unknown): value is FormValue =>
  isObject(value) && Object.keys(value).length === 2 && isText(value.field, 30) && isText(value.value, 1200);

const isProfileUpdate = (value: unknown): value is ProfileUpdate => {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'field' && k !== 'value' && k !== 'guessed' && k !== 'declined')) return false;
  if (value.field !== 'note' && !LEARNABLE.some((f) => f === value.field)) return false;
  if ('guessed' in value && value.guessed !== true) return false;
  if ('declined' in value && value.declined !== true) return false;
  return 'value' in value ? isText(value.value, LEARNED_VALUE_MAX) : value.declined === true;
};

const isMemoryUpdate = (value: unknown): value is MemoryUpdate => {
  if (!isObject(value) || Object.keys(value).some((k) => k !== 'name' && k !== 'append' && k !== 'replace' && k !== 'remove' && k !== 'directed')) return false;
  if (!isText(value.name, MEMORY_NAME_MAX)) return false;
  if ('directed' in value && value.directed !== true) return false;
  const actions = ['append', 'replace', 'remove'].filter((k) => k in value);
  if (actions.length !== 1) return false;
  if ('append' in value) return !('directed' in value) && isText(value.append, MEMORY_APPEND_MAX);
  if ('replace' in value) return isText(value.replace, MEMORY_NOTE_MAX);
  return value.remove === true;
};

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isTalkAnswer(value: unknown): value is TalkAnswer {
  if (!isObject(value) || !isText(value.answer, 1500)) return false;
  if (Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question' && k !== 'settings_changes' && k !== 'words_to_add' && k !== 'syllables' && k !== 'transliteration' && k !== 'links' && k !== 'study_way_line' && k !== 'quiz_goal_offer' && k !== 'profile_update' && k !== 'profile_question' && k !== 'feedback_offer' && k !== 'setting_offer' && k !== 'offer_reply' && k !== 'bridge' && k !== 'form_values' && k !== 'form_ask' && k !== 'go' && k !== 'memory_update' && k !== 'wished_notes')) return false;
  if ('question' in value && !isText(value.question, MAX_TALK_CHARS)) return false;
  if ('memory_update' in value && !(Array.isArray(value.memory_update) && value.memory_update.length <= MAX_MEMORY_UPDATES && value.memory_update.every(isMemoryUpdate))) return false;
  if ('wished_notes' in value && !(Array.isArray(value.wished_notes) && value.wished_notes.length <= MAX_WISHED_NOTES && value.wished_notes.every((n) => isText(n, MEMORY_NAME_MAX)))) return false;
  if ('study_way_line' in value && !isText(value.study_way_line, STUDY_WAY_LINE_MAX)) return false;
  if ('quiz_goal_offer' in value && !isText(value.quiz_goal_offer, QUIZ_GOAL_MAX)) return false;
  if ('profile_update' in value && !(Array.isArray(value.profile_update) && value.profile_update.length <= 3 && value.profile_update.every(isProfileUpdate))) return false;
  if ('profile_question' in value && !LEARNABLE.some((f) => f === value.profile_question)) return false;
  if ('feedback_offer' in value && !(isObject(value.feedback_offer) && Object.keys(value.feedback_offer).length === 1 && isText(value.feedback_offer.summary, FEEDBACK_SUMMARY_MAX))) return false;
  if ('offer_reply' in value && !OFFER_REPLIES.includes(value.offer_reply as OfferReply)) return false;
  if ('bridge' in value && !isAnswerBridge(value.bridge)) return false;
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
  /** a talk from a screen (mw-5r3p30.91): what the screen shows. `chapter` is then NO_CHAPTER, `verse` null: the talk is not about a text. */
  screen?: ScreenContext;
  /** a talk of its own (mw-y3qno5.2): the key it is kept under ('talk.<ms>', src/share/talkPlace.ts newTalkRef). It carries a `screen` that names no screen, and the sheet is a plain talk with the tutor. */
  free?: string;
}

/** The first thing he says in a quiz (the Start the quiz button sends it): the sheet shows it as his turn. */
export const quizMeQuestion = (reference: string): string => `Quiz me on ${reference}.`;

const greekOf = (v: Verse): string => v.g.map((w) => w.t).join(' ');
const englishOf = (v: Verse): string => v.e.map(markSupplied).join(' ');

/** The most the word list may weigh, as JSON in UTF-8: a verse of 25 words fits; a long passage's list stops part-way (the grind's instructions say so),
 * and buildTalkRequest makes it smaller still when the rest of the request leaves less room, so the record stays under MAX_REQUEST_BYTES. */
export const GREEK_WORDS_BYTES = 2600;
/** What the key `"greek_words":` and its comma take in the JSON. */
const GREEK_WORDS_KEY_BYTES = 16;

/** The words of `verses` with lemma, gloss and parse from `chapter`, in text order; a word that repeats with the same lemma and parsing is listed once.
 * The list stops before the word that would take it over `maxBytes`. A word with no lemma is left out: there is nothing to say of it. */
function greekWordsOf(chapter: Chapter, verses: Verse[], maxBytes: number): TalkGreekWord[] {
  const data: Chapter = { ...chapter, lex: chapter.lex ?? {}, parse: chapter.parse ?? {} };
  const seen = new Set<string>();
  const words: TalkGreekWord[] = [];
  let bytes = 2;
  for (const w of verses.flatMap((v) => v.g)) {
    const word = { form: w.t, lemma: wordLemma(w), gloss: wordGloss(data, w), parse: wordParse(data, w) };
    const key = `${word.form}|${word.lemma}|${word.parse}`;
    if (!word.lemma || seen.has(key)) continue;
    bytes += new TextEncoder().encode(JSON.stringify(word)).length + 1;
    if (bytes > maxBytes) break;
    seen.add(key);
    words.push(word);
  }
  return words;
}

/** The title of the sheet and the reference in the request: 'Romans 8', 'Romans 8:28' or, for a passage, 'Romans 8:1-11'. */
export const scopeTitle = (scope: Pick<TalkScope, 'title' | 'verse'>): string => (scope.verse ? `${scope.title}:${unitId(scope.verse)}` : scope.title);

/** The key the conversation `scope` names is kept under (src/data/repositories/talks.ts talkRef). */
export const scopeRef = (book: string, chapter: number, scope: Pick<TalkScope, 'verse' | 'quiz' | 'screen' | 'free'>): string =>
  scope.free ? scope.free : scope.screen ? screenRef(slugOf(scope.screen.name)) : talkRef(book, chapter, scope.verse ? unitId(scope.verse) : null, scope.quiz === true);

const sizeOf = (request: TalkRequest): number => new TextEncoder().encode(JSON.stringify(request)).length;

/**
 * Makes the request fit a grist: while it is too big the oldest long answer in the history is cut short; when none is left to cut
 * the words of the text (greek_words) are cut from their end, and when none is left the oldest turn is dropped. The newest turn is
 * the last to be touched (a quiz is nothing without its earlier turns, so they outlast the tail of a long passage's word list).
 * With the history gone, the oldest of his requests (the last in the list, newest first) go one at a time.
 */
export function fitHistory(request: TalkRequest): TalkRequest {
  let history = request.history.map((t) => ({ ...t }));
  let requests = request.requests;
  let greekWords = request.greek_words;
  let memoryNotes = request.memory?.notes;
  const fitted = (): TalkRequest => ({ ...request, history, ...(requests ? { requests } : {}), ...(greekWords ? { greek_words: greekWords } : {}), ...(request.memory && memoryNotes ? { memory: { ...request.memory, notes: memoryNotes } } : {}) });
  const tooBig = (): boolean => sizeOf(fitted()) > MAX_REQUEST_BYTES;
  for (;;) {
    const long = history.findIndex((t) => t.a.length > CLIPPED_CHARS);
    if (!tooBig() || long < 0) break;
    history[long] = { ...history[long], a: history[long].a.slice(0, CLIPPED_CHARS - CLIP_MARK.length).trimEnd() + CLIP_MARK };
  }
  while (greekWords && greekWords.length > 0 && tooBig() && history.length > 0) greekWords = greekWords.slice(0, -1);
  while (history.length > 0 && tooBig()) history = history.slice(1);
  while (greekWords && greekWords.length > 0 && tooBig()) greekWords = greekWords.slice(0, -1);
  while (requests && requests.length > 0 && tooBig()) requests = requests.slice(0, -1);
  // his notes are the last to go, from the end of the list (the notes come in name order: book, topic, word); the index always stays
  while (memoryNotes && memoryNotes.length > 0 && tooBig()) memoryNotes = memoryNotes.slice(0, -1);
  return fitted();
}

/** A Greek sound question carries the app's respelling of the word, and its syllables and stressed syllable (mw-5r3p30.274), so the tutor explains the sounds by the pronunciation the app speaks, not by its own habit. */
function withRespelling(focus: TalkFocus, pronunciation: GreekPronunciation): TalkFocus {
  if (!('form' in focus) || focus.kind !== 'sound' || focus.language) return focus;
  const syllables = greekSyllables(focus.form);
  const stress = stressedSyllable(syllables);
  return { ...focus, respelling: pronunciationOf(pronunciation).respell(focus.form), syllables, ...(stress >= 0 ? { stress } : {}) };
}

/** The request for what he just said: the verse's or the passage's whole text, or the chapter's first three verses; the last 10 turns, oldest first; the settings as they stand; the word he asked help with, if he did. */
export function buildTalkRequest(
  scope: TalkScope,
  question: string,
  turns: { q: string; a: string }[],
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
): TalkRequest {
  const verses = scope.verse ? [scope.verse] : scope.chapter.verses.slice(0, CHAPTER_VERSES);
  // About (mw-vtjxh4.2) sends the credits, which take most of the record: the credits are the talk, so his words and his grammar stay home
  const aboutCredits = scope.screen?.credits !== undefined;
  const request: TalkRequest = {
    reference: scopeTitle(scope),
    // a talk from a screen is not about a text: it carries the screen and no verse text
    ...(scope.screen ? { screen: scope.screen } : { greek: verses.map(greekOf).join(' '), english: verses.map(englishOf).join(' ') }),
    question: question.trim(),
    ...(spoken ? { spoken: true as const } : {}),
    history: turns.slice(-MAX_HISTORY_TURNS).map(({ q, a }) => ({ q, a })),
    solid_words: aboutCredits ? [] : solidWords,
    settings,
    pronunciation,
    ...(focus ? { focus: withRespelling(focus, pronunciation) } : {}),
    ...(learner ? { learner } : {}),
    ...(learnerGrammar && !aboutCredits ? { learner_grammar: learnerGrammar } : {}),
    ...(learnerProfile && !aboutCredits ? { learner_profile: learnerProfile } : {}),
    ...(memory && !aboutCredits ? { memory } : {}),
    ...(scope.quiz ? { mode: 'quiz' as const } : {}),
    ...(scope.quiz && studyWay.length > 0 ? { study_way: studyWay } : {}),
    ...(scope.quiz ? { quiz_goal: quizGoal.kept === '' ? null : quizGoal.kept } : {}),
    ...(scope.quiz && quizGoal.kept === '' && quizGoal.once ? { quiz_goal_once: quizGoal.once } : {}),
    ...(aboutCredits ? {} : { resources }),
    ...(pictureCount > 0 ? { pictures: pictureCount } : {}),
    ...(pendingOffer ? { pending_offer: pendingOffer } : {}),
    ...(missingFoundations && !aboutCredits ? { missing_foundations: missingFoundations } : {}),
    ...(requests.length > 0 && !aboutCredits ? { requests } : {}),
  };
  if (scope.screen) return request;
  // the words of the text weigh what the rest leaves of the record, without the history (which is cut first), up to GREEK_WORDS_BYTES
  const room = MAX_REQUEST_BYTES - sizeOf({ ...request, history: [] }) - GREEK_WORDS_KEY_BYTES;
  return { ...request, greek_words: greekWordsOf(scope.chapter, verses, Math.min(GREEK_WORDS_BYTES, room)) };
}

/** Sends what he said and waits for the companion's answer. Throws a TutorError (src/services/tutor.ts). */
export function askTalk(request: TalkRequest, options: AskOptions): Promise<TalkAnswer> {
  return askGrind(TALK_KIND, fitHistory(request), isTalkAnswer, options);
}
