// src/share/ShareTalk.tsx — the talk Share > Lampas placed its share in (mw-y3qno5.2): the Talk sheet opened on the conversation `talkRef` names, outside the
// Reader, over a scope made from the key (src/share/talkPlace.ts): a chapter, a verse or a passage of the Bible (the chapter fetched like the Reader's), a quiz
// on one, a screen's talk, or a talk of its own. It is scrolled to its end like any talk; `shared` waits in the composer and its field, not sent. A Greek word
// of an answer opens its word sheet, and Help with this word and a grammar term ask the tutor here, in this talk.
// The scope is made BEFORE the sheet is drawn (src/share/talkScope.ts useTalkScope).
import { useCallback, useEffect, useRef } from 'react';
import { helpQuestion, scopeTitle, termQuestion, type TalkScope, type WordFocus } from '../services/talk';
import { answerRuns } from '../speech/answerRuns';
import { speakTutor } from '../speech/tutorVoice';
import { stopReading } from '../speech/readAloud';
import { takeWaitingPictures } from '../talk/outbox';
import { READER_SUGGESTIONS, suggestionsFor } from '../tutor/screen';
import { TalkSheet } from '../Talk';
import { useTalk } from '../useTalk';
import { useVoice } from '../useVoice';
import type { TermAsk, WordHelp } from '../WordSheet';
import type { SharedContent } from './shared';

/** The Talk sheet over `scope`, with the voice, the answers read aloud and the word sheet's help wired as the Reader and the Ask the tutor button wire them. */
export function TalkHost({ scope, talkRef, book, chapter, shared, onClose }: { scope: TalkScope; talkRef: string; book: string; chapter: number; shared?: SharedContent; onClose: () => void }) {
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const openRef = useRef<string | null>(talkRef);
  const { states, say } = useTalk(book, chapter, (ref, id, answer) => {
    if (openRef.current !== ref || voice.listening) return;
    speakTutor(id, answerRuns(answer), () => openRef.current === ref);
  });
  useEffect(() => {
    openRef.current = talkRef;
    sayAbout.current = (message) => say(scope, message, undefined, takeWaitingPictures());
  });
  // A talk that is gone has nothing open: an answer that comes as it goes is not read aloud.
  useEffect(() => () => void (openRef.current = null), []);
  // Opening the talk ends a reading under way, as the Ask the tutor button does.
  useEffect(() => stopReading(), []);
  const close = useCallback(() => {
    voice.abort();
    voice.clearNotice();
    onClose();
  }, [voice, onClose]);
  const help = useCallback(
    (asked: WordHelp) => {
      const focus: WordFocus = { form: asked.form, lemma: asked.lemma, parse: asked.parse, kind: asked.kind };
      say(scope, helpQuestion(focus, scopeTitle(scope)), focus);
    },
    [say, scope],
  );
  const askTerm = useCallback((ask: TermAsk) => say(scope, termQuestion(ask.term, scopeTitle(scope)), { term: ask.term, kind: 'grammar-term' }), [say, scope]);
  const suggestions = scope.free ? undefined : scope.screen ? suggestionsFor(scope.screen.name) : scope.verse === null && !scope.quiz ? READER_SUGGESTIONS : undefined;
  return (
    <TalkSheet
      scope={scope}
      talkRef={talkRef}
      state={states[talkRef]}
      voice={voice}
      suggestions={suggestions}
      shared={shared}
      onSay={(message, focus, pictures) => say(scope, message, focus, pictures)}
      onHelp={help}
      onAskTerm={askTerm}
      onClose={close}
    />
  );
}
