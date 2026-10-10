// src/useTalk.ts — the Bible talk's messages in flight, by conversation. A message keeps waiting when he closes the sheet; its
// answer is kept when it comes and `onAnswered` is told, so a sheet still open can read it aloud. They all stop when the
// reader goes away.
import { useCallback, useEffect, useRef, useState } from 'react';
import { addLemmaToLearn } from './data/answerWord';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { learnerSummary } from './data/learnerSummary';
import { addTurn, listSolidHeadwords, listStudyWay, listTurns } from './data/repositories';
import { getDeviceKeyBytes } from './services/deviceKey';
import { TutorError } from './services/tutor';
import { stopAnswer } from './speech/readAloud';
import { applyChanges, currentSettings } from './settings/registry';
import { askTalk, buildTalkRequest, MAX_LINKS, scopeRef, type TalkAnswer, type TalkFocus, type TalkScope } from './services/talk';
import type { HebrewSounds } from './data/db';
import type { AskState } from './useAsks';

type Talks = Record<string, AskState | undefined>;

export interface UseTalk {
  /** what the message of each conversation (by its ref) is doing now */
  states: Talks;
  /** says `message` in the conversation `scope` names; `focus` is the word the message asks help with. A message sent again
   * unchanged (Retry) keeps the focus it was first sent with. */
  say: (scope: TalkScope, message: string, focus?: TalkFocus) => void;
}

/** What `onAnswered` is told besides the answer's text: the focus the message had and the syllables the answer lists. */
export interface AnswerInfo {
  focus?: TalkFocus;
  syllables?: string[];
}

/** Puts the lemmas an answer asked for on his words-to-learn list, once each, with the lexicon's gloss; says which were new, which
 * were there already and which the lexicon does not know (those are not added). */
async function addWords(scope: TalkScope, lemmas: string[]): Promise<{ added: string[]; already: string[]; unknown: string[] }> {
  const added: string[] = [];
  const already: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const lemma of lemmas) {
    const { headword, result } = await addLemmaToLearn(scope, lemma);
    if (!headword || seen.has(headword)) continue;
    seen.add(headword);
    if (result === 'added') added.push(headword);
    else if (result === 'already') already.push(headword);
    else if (result === 'unknown') unknown.push(headword);
  }
  return { added, already, unknown };
}

/** The pronunciation guide of an answer to a Hebrew word's sound question: its syllables over how each sounds; none for any other answer. */
function hebrewGuideOf(focus: TalkFocus | undefined, answer: TalkAnswer): HebrewSounds | undefined {
  if (!focus || !('form' in focus) || focus.kind !== 'sound' || focus.language !== 'he' || !answer.syllables?.length) return undefined;
  return { word: focus.form, syllables: answer.syllables, sounds: answer.transliteration ?? [] };
}

/** `onAnswered(ref, turnId, answer, info)` is called once an answer has been kept. */
export function useTalk(book: string, chapter: number, onAnswered: (ref: string, turnId: number, answer: string, info: AnswerInfo) => void): UseTalk {
  const [states, setStates] = useState<Talks>({});
  const live = useRef<AbortController>(new AbortController());
  const answered = useRef(onAnswered);
  // The last message of each conversation that carried a focus, so that Retry (the same text again) sends it again.
  const focused = useRef<Record<string, { text: string; focus: TalkFocus } | undefined>>({});
  useEffect(() => {
    answered.current = onAnswered;
  });

  useEffect(() => {
    // React strict mode runs the effect twice: the controller made while the screen was away is replaced here.
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => {
      controller.abort();
    };
  }, []);

  const say = useCallback(
    (scope: TalkScope, message: string, focusOf?: TalkFocus) => {
      const text = message.trim();
      if (!text) return;
      const ref = scopeRef(book, chapter, scope);
      const kept = focused.current[ref];
      const focus = focusOf ?? (kept?.text === text ? kept.focus : undefined);
      focused.current[ref] = focus ? { text, focus } : undefined;
      // a new message ends the speech of the last response
      stopAnswer();
      const signal = live.current.signal;
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setStates((all) => ({ ...all, [ref]: state }));
      };
      const startedAt = Date.now();
      set({ phase: 'sending', question: text, startedAt });
      void (async () => {
        try {
          const [turns, solid, settings, learner, grammar, way] = await Promise.all([
            listTurns(ref),
            listSolidHeadwords(),
            currentSettings(),
            learnerSummary(),
            learnerGrammar().catch(() => undefined),
            scope.quiz ? listStudyWay() : Promise.resolve([]),
          ]);
          const answer = await askTalk(buildTalkRequest(scope, text, turns, solid, settings, focus, learner, grammar, way), {
            key: getDeviceKeyBytes(),
            signal,
            onSent: () => set({ phase: 'waiting', question: text, startedAt }),
          });
          // The settings he asked for are applied at once (the registry checks each), then kept with the turn for its Undo.
          const { applied, refused } = await applyChanges(answer.settings_changes);
          const { added, already, unknown } = await addWords(scope, answer.words_to_add ?? []);
          const id = await addTurn(ref, text, answer.answer, answer.words, Date.now(), { changes: applied, refused, added, already, unknown, links: answer.links?.slice(0, MAX_LINKS), studyWayLine: scope.quiz ? answer.study_way_line : undefined, guide: hebrewGuideOf(focus, answer), feedbackOffer: answer.feedback_offer?.summary, cleanQ: answer.question });
          set(undefined);
          if (!signal.aborted) answered.current(ref, id, answer.answer, { focus, syllables: answer.syllables });
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set({ phase: 'failed', question: text, failure, detail: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      })();
    },
    [book, chapter],
  );

  return { states, say };
}
