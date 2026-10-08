// src/useTalk.ts — the Bible talk's messages in flight, by conversation. A message keeps waiting when he closes the sheet; its
// answer is kept when it comes and `onAnswered` is told, so a sheet still open can read it aloud. They all stop when the
// reader goes away.
import { useCallback, useEffect, useRef, useState } from 'react';
import { addTurn, listSolidHeadwords, listTurns, talkRef } from './data/repositories';
import { getDeviceKeyBytes } from './services/deviceKey';
import { TutorError } from './services/tutor';
import { applyChanges, currentSettings } from './settings/registry';
import { askTalk, buildTalkRequest, type TalkScope } from './services/talk';
import type { AskState } from './useAsks';

type Talks = Record<string, AskState | undefined>;

export interface UseTalk {
  /** what the message of each conversation (by its ref) is doing now */
  states: Talks;
  /** says `message` in the conversation `scope` names */
  say: (scope: TalkScope, message: string) => void;
}

/** `onAnswered(ref, turnId, answer)` is called once an answer has been kept. */
export function useTalk(book: string, chapter: number, onAnswered: (ref: string, turnId: number, answer: string) => void): UseTalk {
  const [states, setStates] = useState<Talks>({});
  const live = useRef<AbortController>(new AbortController());
  const answered = useRef(onAnswered);
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
    (scope: TalkScope, message: string) => {
      const text = message.trim();
      if (!text) return;
      const ref = talkRef(book, chapter, scope.verse?.n ?? null);
      const signal = live.current.signal;
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setStates((all) => ({ ...all, [ref]: state }));
      };
      const startedAt = Date.now();
      set({ phase: 'sending', question: text, startedAt });
      void (async () => {
        try {
          const [turns, solid, settings] = await Promise.all([listTurns(ref), listSolidHeadwords(), currentSettings()]);
          const answer = await askTalk(buildTalkRequest(scope, text, turns, solid, settings), {
            key: getDeviceKeyBytes(),
            signal,
            onSent: () => set({ phase: 'waiting', question: text, startedAt }),
          });
          // The settings he asked for are applied at once (the registry checks each), then kept with the turn for its Undo.
          const { applied, refused } = await applyChanges(answer.settings_changes);
          const id = await addTurn(ref, text, answer.answer, answer.words, Date.now(), { changes: applied, refused });
          set(undefined);
          if (!signal.aborted) answered.current(ref, id, answer.answer);
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
