// src/useAsks.ts — the questions in flight to the tutor, by verse (or by passage, mw-5r3p30.73: src/data/passage.ts unitId). A question keeps waiting when he selects another
// verse; its answer is stored when it comes. They all stop when the screen goes away.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Verse } from './data/chapter';
import { unitId, unitReference } from './data/passage';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { learnerSummary } from './data/learnerSummary';
import { depthSettings } from './script/depthSettings';
import { addAnswer, listSolidHeadwords, verseRef } from './data/repositories';
import { getDeviceKeyBytes } from './services/deviceKey';
import { stopAnswer } from './speech/readAloud';
import { TutorError, askTutor, buildRequest, type TutorFailure } from './services/tutor';

/** What a question is doing right now. */
export type AskState =
  | { phase: 'sending' | 'waiting'; question: string; startedAt: number }
  | { phase: 'failed'; question: string; failure: TutorFailure; detail: string };

type Asks = Record<string, AskState | undefined>;

export interface UseAsks {
  asks: Asks;
  ask: (verse: Verse, question: string) => void;
}

/** The questions in flight, by verse number ('11') or passage ('1-11'), for one chapter. They stop when the screen goes away. */
export function useAsks(book: string, chapter: number, title: string): UseAsks {
  const [asks, setAsks] = useState<Asks>({});
  const live = useRef<AbortController>(new AbortController());

  useEffect(() => {
    // React strict mode runs the effect twice: the controller made while the screen was away is replaced here.
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => {
      controller.abort();
    };
  }, []);

  const ask = useCallback(
    (verse: Verse, question: string) => {
      const text = question.trim();
      if (!text) return;
      // a new question ends the speech of the last response
      stopAnswer();
      const signal = live.current.signal;
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setAsks((all) => ({ ...all, [unitId(verse)]: state }));
      };
      const startedAt = Date.now();
      set({ phase: 'sending', question: text, startedAt });
      void (async () => {
        try {
          const [solid, learner, grammar, settings] = await Promise.all([listSolidHeadwords(), learnerSummary(), learnerGrammar().catch(() => undefined), depthSettings()]);
          const request = buildRequest(unitReference(title, verse), verse, text, solid, learner, grammar, settings);
          const answer = await askTutor(request, {
            key: getDeviceKeyBytes(),
            signal,
            onSent: () => set({ phase: 'waiting', question: text, startedAt }),
          });
          await addAnswer(verseRef(book, chapter, unitId(verse)), text, answer.answer, answer.words);
          set(undefined);
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set({ phase: 'failed', question: text, failure, detail: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      })();
    },
    [book, chapter, title],
  );

  return { asks, ask };
}
