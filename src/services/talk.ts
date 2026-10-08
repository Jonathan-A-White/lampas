// src/services/talk.ts — the Bible talk: one thing he says, sent as a grist through Postern (bsv-kit/grist) and answered by
// the mill's bible-talk grind (grinds/bible-talk.json). The wire work is the tutor's (src/services/tutor.ts askGrind); this
// file is the kind's own: the request with the last turns of the conversation, the answer's shape, and the fit to a grist.
import type { Chapter, Verse } from '../data/chapter';
import type { AnswerWord } from '../data/db';
import type { SettingValue } from '../settings/registry';
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
 * plain words, and what he wants: its grammar, or how to sound it out. */
export interface WordFocus {
  form: string;
  lemma: string;
  parse: string;
  kind: 'grammar' | 'sound';
}

/** The grammar term he asked the tutor about (the Grammar sheet's Ask the tutor): 'conjunction'. */
export interface TermFocus {
  term: string;
  kind: 'grammar-term';
}

/** What a question comes with, when it comes from a word's sheet or a Grammar sheet. */
export type TalkFocus = WordFocus | TermFocus;

/** The question the word sheet's Help row sends for `focus` in `reference`: it names the word, its lemma, its parsing and the
 * reference, then asks. */
export function helpQuestion(focus: WordFocus, reference: string): string {
  const word = `${focus.form} (lemma ${focus.lemma}; ${focus.parse}) in ${reference}`;
  return focus.kind === 'grammar'
    ? `The word ${word}. Explain the grammar of this form and what I need to know to read it.`
    : `The word ${word}. Help me pronounce this word: its syllables and how each sounds.`;
}

/** The question the Grammar sheet's Ask the tutor sends: it names the term and the reference it was asked in. */
export function termQuestion(term: string, reference: string): string {
  return `Explain the grammar term “${term}” in plain words, and show me where it is in ${reference}.`;
}

/** What the grind is sent (Bible Talk Request 1; grinds/bible-talk.input.schema.json). */
export interface TalkRequest {
  reference: string;
  greek: string;
  english: string;
  question: string;
  history: TalkHistoryEntry[];
  solid_words: string[];
  /** what each of the app's settings holds now (src/settings/registry.ts currentSettings), by key */
  settings: Record<string, SettingValue>;
  /** present only when the question comes from the word sheet's Help with this word row, or a Grammar sheet's Ask the tutor */
  focus?: TalkFocus;
}

/** What the grind answers (grinds/bible-talk.answer.schema.json). */
export interface TalkAnswer {
  answer: string;
  words: AnswerWord[];
  /** the settings he asked to change, as the grind wrote them: the registry checks each one before it is applied */
  settings_changes?: unknown[];
  /** for a Sound it out question: the syllables of the word, in order (at most 12) */
  syllables?: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

/** The app's own check of an answer, run before anything is kept (the schema's limits). */
export function isTalkAnswer(value: unknown): value is TalkAnswer {
  if (!isObject(value) || !isText(value.answer, 1500)) return false;
  if (Object.keys(value).some((k) => k !== 'answer' && k !== 'words' && k !== 'settings_changes' && k !== 'syllables')) return false;
  if ('settings_changes' in value && !Array.isArray(value.settings_changes)) return false;
  if ('syllables' in value && !(Array.isArray(value.syllables) && value.syllables.length <= 12 && value.syllables.every((s) => isText(s, 40)))) return false;
  if (!Array.isArray(value.words) || value.words.length > 12) return false;
  return value.words.every((w) => isObject(w) && Object.keys(w).length === 3 && isText(w.greek, 80) && isText(w.lemma, 80) && isText(w.note, 300));
}

/** What a talk is about: the chapter (`verse` null) or one of its verses. */
export interface TalkScope {
  /** the chapter's title: 'Romans 8' */
  title: string;
  chapter: Chapter;
  verse: Verse | null;
}

const greekOf = (v: Verse): string => v.g.map((w) => w.t).join(' ');
const englishOf = (v: Verse): string => v.e.map((c) => c.t.trim()).join(' ');

/** The title of the sheet and the reference in the request: 'Romans 8' or 'Romans 8:28'. */
export const scopeTitle = (scope: Pick<TalkScope, 'title' | 'verse'>): string => (scope.verse ? `${scope.title}:${scope.verse.n}` : scope.title);

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

/** The request for what he just said: the verse's text, or the chapter's first three verses; the last 10 turns, oldest first; the settings as they stand; the word he asked help with, if he did. */
export function buildTalkRequest(
  scope: TalkScope,
  question: string,
  turns: { q: string; a: string }[],
  solidWords: string[],
  settings: Record<string, SettingValue> = {},
  focus?: TalkFocus,
): TalkRequest {
  const verses = scope.verse ? [scope.verse] : scope.chapter.verses.slice(0, CHAPTER_VERSES);
  return {
    reference: scopeTitle(scope),
    greek: verses.map(greekOf).join(' '),
    english: verses.map(englishOf).join(' '),
    question: question.trim(),
    history: turns.slice(-MAX_HISTORY_TURNS).map(({ q, a }) => ({ q, a })),
    solid_words: solidWords,
    settings,
    ...(focus ? { focus } : {}),
  };
}

/** Sends what he said and waits for the companion's answer. Throws a TutorError (src/services/tutor.ts). */
export function askTalk(request: TalkRequest, options: AskOptions): Promise<TalkAnswer> {
  return askGrind(TALK_KIND, fitHistory(request), isTalkAnswer, options);
}
