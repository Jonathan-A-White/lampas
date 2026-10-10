// src/reader/useReaderTutor.ts — the Reader's tutor wiring (docs/module-map.md R1b): which Talk sheet is open and what it is about, and every way
// the Reader asks the tutor: a hold on a verse number or the Talk bar (holdTalk), Help with this word (helpWithWord), a grammar term
// (askAboutTerm), the teach sheet's new word (askAboutNewWord) and the Verse view's Quiz me (openQuiz); with the request another screen made
// (the Paradigms and Quick test asks), met once as the Reader opens. helpWithWord, askAboutTerm and askAboutNewWord differ only in the question
// they build: askFrom is the one place that opens the sheet on the verse and sends it.
// The refs the Reader's effects share are passed in, never copied: `openTalkRef` (the conversation the sheet is open on, which useTalk's
// callback reads) is the Reader's, and this hook keeps it current.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter, Verse } from '../data/chapter';
import { listTurns, talkRef } from '../data/repositories';
import type { OpenChapter } from '../data/readerChapter';
import { publish } from '../events/bus';
import type { ReaderRequest } from '../nav/readerRequest';
import {
  helpQuestion,
  newWordQuestion,
  paradigmQuestion,
  quizMeQuestion,
  scopeRef,
  scopeTitle,
  termQuestion,
  type TalkFocus,
  type TalkScope,
  type WordFocus,
} from '../services/talk';
import { speakWord } from '../speech/greek';
import type { NewWordAsk } from '../TeachSheet';
import type { UseTalk } from '../useTalk';
import type { Voice } from '../useVoice';
import type { TermAsk, WordHelp } from '../WordSheet';

export interface ReaderTutor {
  /** the Talk sheet's scope: the chapter, a verse, or a quiz on a verse or passage; null while the sheet is closed (or the chapter not here) */
  talkScope: TalkScope | null;
  /** the conversation the sheet is open on, null while it is closed */
  talkKey: string | null;
  /** undefined is closed, a number the verse the sheet was opened on, null the chapter; every way of setting it but openQuiz ends a quiz */
  talkAbout: number | null | undefined;
  setTalkAbout(about: number | null | undefined): void;
  helpWithWord(help: WordHelp): void;
  askAboutTerm(ask: TermAsk): void;
  askAboutNewWord(ask: NewWordAsk): void;
  openQuiz(): void;
  /** the quiz of the unit the Verse view shows has a turn or a message on its way: the button then says Continue */
  quizStarted: boolean;
  holdTalk(about: number | null): void;
}

/** What the Reader shares with this hook besides the chapter and the talk. */
export interface ReaderTutorShared {
  /** a request from another screen, met once as the Reader opens (undefined: none for this chapter) */
  request: ReaderRequest | undefined;
  /** the verse or passage the open Verse view shows, if any: what Quiz me quizzes */
  viewUnit: Verse | undefined;
  /** the ref of the open Talk sheet's conversation: this hook keeps it current, useTalk's callback reads it */
  openTalkRef: { current: string | null };
}

export function useReaderTutor(open: OpenChapter, chapter: Chapter | null, talk: UseTalk, voice: Voice, shared: ReaderTutorShared): ReaderTutor {
  const { book: BOOK, chapter: CHAPTER, title: TITLE } = open;
  const { request, viewUnit, openTalkRef } = shared;
  const { states, say } = talk;
  // The Talk sheet: undefined is closed, a number the verse it was opened on, null the chapter. A request from another screen opens it first.
  const [talkAbout, setTalkAboutRaw] = useState<number | null | undefined>(() =>
    request?.action === 'talk' || request?.action === 'word' ? request.verse : request?.action === 'paradigm' ? null : undefined,
  );
  // The quiz (the Verse view's Quiz me, mw-5r3p30.74): the verse or passage the open Talk sheet quizzes, else null.
  const [quizUnit, setQuizUnit] = useState<Verse | null>(null);
  const setTalkAbout = useCallback((about: number | null | undefined) => {
    setQuizUnit(null);
    setTalkAboutRaw(about);
  }, []);
  useEffect(() => {
    openTalkRef.current = talkAbout === undefined ? null : quizUnit ? scopeRef(BOOK, CHAPTER, { verse: quizUnit, quiz: true }) : talkRef(BOOK, CHAPTER, talkAbout);
  }, [openTalkRef, talkAbout, quizUnit, BOOK, CHAPTER]);
  // A Reader that is gone has no talk open: an answer that came as it went, and is read a moment later (speakTutor reads the saved choice first), is not spoken (mw-5r3p30.114).
  useEffect(() => () => void (openTalkRef.current = null), [openTalkRef]);

  const talkScope: TalkScope | null =
    chapter && talkAbout !== undefined
      ? quizUnit
        ? { title: TITLE, chapter, verse: quizUnit, quiz: true }
        : { title: TITLE, chapter, verse: chapter.verses.find((v) => v.n === talkAbout) ?? null }
      : null;
  const talkKey = talkScope ? scopeRef(BOOK, CHAPTER, talkScope) : null;

  // Ask the tutor on a paradigm table (src/ParadigmsScreen.tsx): the Talk sheet is open on the chapter; once the chapter is here the first
  // question goes with the table's name and the forms he revealed.
  const paradigmSent = useRef(false);
  useEffect(() => {
    if (request?.action !== 'paradigm' || !chapter || paradigmSent.current) return;
    paradigmSent.current = true;
    say({ title: TITLE, chapter, verse: null }, paradigmQuestion(request.table, request.revealed.length), {
      kind: 'paradigm',
      table: request.table,
      revealed: request.revealed,
    });
  }, [request, chapter, say, TITLE]);
  // The Quick test's Ask the tutor: the Talk sheet is open on the word's verse; once the chapter is here the first question goes with
  // the focus it was asked with (the word, the question, his answers so far).
  const wordSent = useRef(false);
  useEffect(() => {
    if (request?.action !== 'word' || !chapter || wordSent.current) return;
    wordSent.current = true;
    const verse = chapter.verses.find((v) => v.n === request.verse) ?? null;
    say({ title: TITLE, chapter, verse }, request.question, request.focus);
  }, [request, chapter, say, TITLE]);

  // A hold opens the sheet about `about` and listens, unless that conversation is still waiting for its answer.
  const holdTalk = useCallback(
    (about: number | null) => {
      setTalkAbout(about);
      const state = states[talkRef(BOOK, CHAPTER, about)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      voice.press();
    },
    [states, voice, setTalkAbout, BOOK, CHAPTER],
  );

  // The one way to ask the tutor about a verse from a sheet: drop what he was saying, open the Talk sheet on the verse and send the first
  // question `build` makes for its scope; a conversation still waiting for its answer is only shown. `beforeSay` runs just before the send.
  const askFrom = useCallback(
    (
      verseN: number,
      build: (scope: { title: string; chapter: Chapter; verse: Verse | null }) => { question: string; focus?: TalkFocus; beforeSay?: () => void },
    ) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === verseN) ?? null;
      const scope = { title: TITLE, chapter, verse };
      voice.abort();
      setTalkAbout(verseN);
      const state = states[talkRef(BOOK, CHAPTER, verseN)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      const { question, focus, beforeSay } = build(scope);
      beforeSay?.();
      say(scope, question, focus);
    },
    [chapter, states, voice, say, setTalkAbout, BOOK, CHAPTER, TITLE],
  );
  // Help with this word (the word sheet's Grammar | Sound it out): the first question names the word. Sound it out says the word, slowly, now.
  const helpWithWord = useCallback(
    (help: WordHelp) => {
      if (!chapter) return;
      const focus: WordFocus = { form: help.form, lemma: help.lemma, parse: help.parse, kind: help.kind };
      publish({ kind: 'word-help', help: help.kind, form: focus.form, lemma: focus.lemma, parse: focus.parse, chapter: CHAPTER, verse: help.verse });
      askFrom(help.verse, (scope) => ({
        question: helpQuestion(focus, scopeTitle(scope)),
        focus,
        beforeSay: () => help.kind === 'sound' && speakWord(help.form, 'greek', true),
      }));
    },
    [chapter, askFrom, CHAPTER],
  );
  // Ask the tutor on a Grammar sheet: the verse of the word the term was tapped on.
  const askAboutTerm = useCallback(
    (ask: TermAsk) => askFrom(ask.verse, (scope) => ({ question: termQuestion(ask.term, scopeTitle(scope)), focus: { term: ask.term, kind: 'grammar-term' } })),
    [askFrom],
  );
  // Ask the tutor on the teach sheet: the verse the new word was shown in.
  const askAboutNewWord = useCallback(
    (ask: NewWordAsk) => askFrom(ask.verse, (scope) => ({ question: newWordQuestion(ask.lemma, ask.gloss, scopeTitle(scope)) })),
    [askFrom],
  );

  // Quiz me: the quiz about the unit the view shows is begun when it has no turn yet and nothing is on its way; the button then says Continue.
  const quizKey = viewUnit ? scopeRef(BOOK, CHAPTER, { verse: viewUnit, quiz: true }) : null;
  const quizTurns = useLiveQuery(() => (quizKey ? listTurns(quizKey) : Promise.resolve([])), [quizKey]);
  const quizStarted = (quizTurns?.length ?? 0) > 0 || (quizKey !== null && states[quizKey] !== undefined);
  const openQuiz = useCallback(() => {
    if (!chapter || !viewUnit || !quizKey) return;
    voice.abort();
    setQuizUnit(viewUnit);
    setTalkAboutRaw(viewUnit.n);
    if (quizTurns?.length === 0 && !states[quizKey]) {
      say({ title: TITLE, chapter, verse: viewUnit, quiz: true }, quizMeQuestion(scopeTitle({ title: TITLE, verse: viewUnit })));
    }
  }, [chapter, viewUnit, quizKey, quizTurns, states, voice, say, TITLE]);

  return { talkScope, talkKey, talkAbout, setTalkAbout, helpWithWord, askAboutTerm, askAboutNewWord, openQuiz, quizStarted, holdTalk };
}
