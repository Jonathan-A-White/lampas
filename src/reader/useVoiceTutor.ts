// src/reader/useVoiceTutor.ts — the Reader answers Hands-free's tutor commands (mw-rl10piw.8, src/handsFree/ask.ts) through the seat of src/nav/tutorSeat.ts, the way it answers 'read from here'.
// 'ask ...' sends the question as the next turn of the talk of what is on screen with `useTalk`'s own `say` (the same talk and record as a held bar: the Talk sheet shows it when opened later, and
// the sheet need not be open), with the scope the one function `scopeOnScreen` gives (the passage or verse on screen, John 17:6-19, not only the chapter) and, when a word's sheet is open, that word as the focus.
// 'tutor' opens the Talk sheet through the floating ?'s own door (src/tutor/door.ts openDoorTarget), so every way into the tutor takes its context from the screen's targets.
import { useEffect, useRef } from 'react';
import { type Chapter, sourceLanguage, wordLemma, wordParse } from '../data/chapter';
import { expectVoiceTurn, type VoiceOutcome } from '../handsFree/voiceTurn';
import { answerTutor } from '../nav/tutorSeat';
import { pendingOf, talkKey } from '../pending/pendingAsks';
import { scopeRef, type WordFocus } from '../services/talk';
import { hebrewPointedForm } from '../speech/hebrewPronunciation';
import { openDoorTarget } from '../tutor/door';
import type { UseTalk } from '../useTalk';
import type { Lookup } from '../WordSheet';
import { cardForm } from './septuagint';
import type { OnScreen, ReaderTutor } from './useReaderTutor';

/** The word whose sheet is open, as the tutor is told of it with a question (`kind: 'word'`: just the word, nothing in particular asked); undefined when no word's sheet is open. */
export function wordOnScreen(chapter: Chapter, lookup: Lookup | null): WordFocus | undefined {
  const first = lookup?.words[0];
  if (!first) return undefined;
  if (sourceLanguage(chapter) === 'hbo') return { form: hebrewPointedForm(first.t), lemma: wordLemma(first), parse: wordParse(chapter, first), kind: 'word', language: 'he' };
  return { form: cardForm(chapter, first), lemma: wordLemma(first), parse: wordParse(chapter, first), kind: 'word' };
}

export interface VoiceTutorShared {
  book: string;
  chapterNumber: number;
  chapter: Chapter | null;
  /** the tutor is allowed (a licence) */
  ai: boolean;
  talk: UseTalk;
  tutor: ReaderTutor;
  /** what the screen shows now, read when a command arrives */
  about: OnScreen;
  /** the open word sheet's lookup */
  lookup: Lookup | null;
}

/** Registers the Reader's answers to the tutor commands for as long as it is on screen. */
export function useVoiceTutor(shared: VoiceTutorShared): void {
  const latest = useRef(shared);
  useEffect(() => {
    latest.current = shared;
  });
  const { book, chapterNumber } = shared;
  useEffect(
    () =>
      answerTutor({
        book,
        chapter: chapterNumber,
        ask(question): Promise<VoiceOutcome> | null {
          const now = latest.current;
          if (!now.ai || !now.chapter) return null;
          const scope = now.tutor.scopeOnScreen(now.about);
          if (!scope) return null;
          const ref = scopeRef(book, chapterNumber, scope);
          const state = pendingOf(talkKey(ref));
          if (state?.phase === 'sending' || state?.phase === 'waiting') return Promise.resolve({ kind: 'busy' });
          const focus = wordOnScreen(now.chapter, now.lookup);
          const outcome = expectVoiceTurn(ref);
          now.talk.say(scope, question, focus);
          return outcome;
        },
        isOpen: () => latest.current.tutor.talkAbout !== undefined,
        open: () => latest.current.ai && openDoorTarget(),
        close() {
          const open = latest.current.tutor.talkAbout !== undefined;
          if (open) latest.current.tutor.setTalkAbout(undefined);
          return open;
        },
      }),
    [book, chapterNumber],
  );
}
