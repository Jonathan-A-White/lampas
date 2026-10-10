// src/services/talk.ts — the Bible talk: one thing he says, sent as a grist through Postern (bsv-kit/grist) and answered by
// the mill's bible-talk grind (grinds/bible-talk.json). The wire work is the tutor's (src/services/tutor.ts askGrind); this
// file is the kind's own: the request with the last turns of the conversation, the answer's shape, and the fit to a grist.
import { markSupplied, type Chapter, type Verse } from '../data/chapter';
import { unitId } from '../data/passage';
import { STUDY_WAY_LINE_MAX } from '../data/repositories/studyWay';
import { screenRef, talkRef } from '../data/repositories/talks';
import type { AnswerLink, AnswerWord } from '../data/db';
import type { LearnerGrammar } from '../data/grammar/learnerGrammar';
import type { SettingValue } from '../settings/registry';
import { slugOf, type ScreenContext } from '../tutor/screen';
import { MAX_SUMMARY } from './feedback';
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

/** What the grind is sent (Bible Talk Request 1; grinds/bible-talk.input.schema.json). */
export interface TalkRequest {
  reference: string;
  /** the verse's, the passage's or the chapter's first verses' Greek; missing in a talk from a screen (`screen`), which is not about a text */
  greek?: string;
  english?: string;
  question: string;
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
  /** present only in a quiz (the Verse view's Quiz me, mw-5r3p30.74): the grind then runs the read, quiz, map method on `greek` and `english` */
  mode?: 'quiz';
  /** present only in a quiz and only when he has kept any (My study way, mw-5r3p30.76): the lines of how he wants to be quizzed; they override the default method where they conflict */
  study_way?: string[];
}

/** The most links an answer carries (the grind's schema): the app shows the first three of more. */
export const MAX_LINKS = 3;

/** The longest summary of a feedback offer: the feedback grind's (grinds/feedback.input.schema.json `summary`). */
export const FEEDBACK_SUMMARY_MAX = MAX_SUMMARY;

/** The tutor's offer to pass an ask the app cannot meet to the makers: one line saying what he wants. The app draws Send this to the makers; nothing is sent without his tap. */
export interface FeedbackOffer {
  summary: string;
}

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
  /** an ask the app cannot meet (another app, a new setting, a change): the summary the app offers to send to the makers */
  feedback_offer?: FeedbackOffer;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

const isAnswerLink = (value: unknown): value is AnswerLink =>
  isObject(value) && Object.keys(value).length === 2 && ((value.kind === 'word' && isText(value.lemma, 80)) || (value.kind === 'verse' && isText(value.reference, 40)));

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isTalkAnswer(value: unknown): value is TalkAnswer {
  if (!isObject(value) || !isText(value.answer, 1500)) return false;
  if (Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'question' && k !== 'settings_changes' && k !== 'words_to_add' && k !== 'syllables' && k !== 'transliteration' && k !== 'links' && k !== 'study_way_line' && k !== 'feedback_offer')) return false;
  if ('question' in value && !isText(value.question, MAX_TALK_CHARS)) return false;
  if ('study_way_line' in value && !isText(value.study_way_line, STUDY_WAY_LINE_MAX)) return false;
  if ('feedback_offer' in value && !(isObject(value.feedback_offer) && Object.keys(value.feedback_offer).length === 1 && isText(value.feedback_offer.summary, FEEDBACK_SUMMARY_MAX))) return false;
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
}

/** The first thing he says in a quiz (the Start the quiz button sends it): the sheet shows it as his turn. */
export const quizMeQuestion = (reference: string): string => `Quiz me on ${reference}.`;

const greekOf = (v: Verse): string => v.g.map((w) => w.t).join(' ');
const englishOf = (v: Verse): string => v.e.map(markSupplied).join(' ');

/** The title of the sheet and the reference in the request: 'Romans 8', 'Romans 8:28' or, for a passage, 'Romans 8:1-11'. */
export const scopeTitle = (scope: Pick<TalkScope, 'title' | 'verse'>): string => (scope.verse ? `${scope.title}:${unitId(scope.verse)}` : scope.title);

/** The key the conversation `scope` names is kept under (src/data/repositories/talks.ts talkRef). */
export const scopeRef = (book: string, chapter: number, scope: Pick<TalkScope, 'verse' | 'quiz' | 'screen'>): string =>
  scope.screen ? screenRef(slugOf(scope.screen.name)) : talkRef(book, chapter, scope.verse ? unitId(scope.verse) : null, scope.quiz === true);

const sizeOf = (request: TalkRequest): number => new TextEncoder().encode(JSON.stringify(request)).length;

/**
 * Makes the request fit a grist: while it is too big the oldest long answer in the history is cut short, and when none is
 * left to cut the oldest turn is dropped. The newest turn is the last to be touched.
 */
export function fitHistory(request: TalkRequest): TalkRequest {
  let history = request.history.map((t) => ({ ...t }));
  const fitted = (): TalkRequest => ({ ...request, history });
  while (history.length > 0 && sizeOf(fitted()) > MAX_REQUEST_BYTES) {
    const long = history.findIndex((t) => t.a.length > CLIPPED_CHARS);
    if (long >= 0) history[long] = { ...history[long], a: history[long].a.slice(0, CLIPPED_CHARS - CLIP_MARK.length).trimEnd() + CLIP_MARK };
    else history = history.slice(1);
  }
  return fitted();
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
): TalkRequest {
  const verses = scope.verse ? [scope.verse] : scope.chapter.verses.slice(0, CHAPTER_VERSES);
  // About (mw-vtjxh4.2) sends the credits, which take most of the record: the credits are the talk, so his words and his grammar stay home
  const aboutCredits = scope.screen?.credits !== undefined;
  return {
    reference: scopeTitle(scope),
    // a talk from a screen is not about a text: it carries the screen and no verse text
    ...(scope.screen ? { screen: scope.screen } : { greek: verses.map(greekOf).join(' '), english: verses.map(englishOf).join(' ') }),
    question: question.trim(),
    history: turns.slice(-MAX_HISTORY_TURNS).map(({ q, a }) => ({ q, a })),
    solid_words: aboutCredits ? [] : solidWords,
    settings,
    ...(focus ? { focus } : {}),
    ...(learner ? { learner } : {}),
    ...(learnerGrammar && !aboutCredits ? { learner_grammar: learnerGrammar } : {}),
    ...(scope.quiz ? { mode: 'quiz' as const } : {}),
    ...(scope.quiz && studyWay.length > 0 ? { study_way: studyWay } : {}),
  };
}

/** Sends what he said and waits for the companion's answer. Throws a TutorError (src/services/tutor.ts). */
export function askTalk(request: TalkRequest, options: AskOptions): Promise<TalkAnswer> {
  return askGrind(TALK_KIND, fitHistory(request), isTalkAnswer, options);
}
