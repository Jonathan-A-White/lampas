// src/useAsks.ts — the questions in flight to the tutor, by verse (or by passage, mw-5r3p30.73: src/data/passage.ts unitId). A question keeps waiting when he selects another
// verse; its answer is stored when it comes (an Ask by change it carries is applied then). They all stop when the screen goes away, but what each was doing is kept
// (src/pending/pendingAsks.ts): a question that had gone is waited for again, never sent a second time, when the page is back (`resume`), and a failure stays with its Retry.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Verse } from './data/chapter';
import { unitId, unitReference } from './data/passage';
import { missingFoundations, resolveBridge } from './data/grammar/bridge';
import { rustyNow } from './data/learnerRusty';
import { levelsOf } from './data/grammar/goalProgress';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { requestsForTutor } from './data/requestsForTutor';
import { learnerMemory } from './data/learnerMemory';
import { learnerProfile } from './data/learnerProfile';
import { learnerSummary } from './data/learnerSummary';
import { applyChanges } from './settings/registry';
import { settingsSentTo } from './tutor/knows';
import { addAnswer, getGreekPronunciation, listLevels, listSolidHeadwords, verseRef } from './data/repositories';
import { isOrphan, pendingOf, setPending, startRunning, usePendingAsks, type AskState, type SentRef } from './pending/pendingAsks';
import { answerDrawn } from './services/clientTiming';
import { getDeviceKeyBytes } from './services/deviceKey';
import { withoutFillers } from './services/fillers';
import { stopAnswer } from './speech/readAloud';
import { wasSpoken } from './speech/spoken';
import { TutorError, askByChange, askTutor, buildRequest } from './services/tutor';

export type { AskState };

type Asks = Record<string, AskState | undefined>;

export interface UseAsks {
  asks: Asks;
  ask: (verse: Verse, question: string) => void;
  /** Waits again for the question of `verse` that a page or screen that went away left waiting (its grist is not sent a second time); none left: nothing happens. */
  resume: (verse: Verse) => void;
}

/** The key a verse's (or passage's) question is kept under. */
export const askKey = (book: string, chapter: number, unit: number | string): string => `ask:${verseRef(book, chapter, unit)}`;

/** The questions in flight, by verse number ('11') or passage ('1-11'), for one chapter. They stop when the screen goes away. */
export function useAsks(book: string, chapter: number, title: string): UseAsks {
  const table = usePendingAsks();
  const asks = useMemo<Asks>(() => {
    const prefix = askKey(book, chapter, '');
    return Object.fromEntries(Object.entries(table).filter(([key]) => key.startsWith(prefix)).map(([key, state]) => [key.slice(prefix.length), state]));
  }, [table, book, chapter]);
  const live = useRef<AbortController>(new AbortController());

  useEffect(() => {
    // React strict mode runs the effect twice: the controller made while the screen was away is replaced here.
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => {
      controller.abort();
    };
  }, []);

  /** Sends `text` about `verse`, or, with `resume` (the grist of this very question that went), waits for the answer to that one; `startedAt` is when it was first asked. */
  const run = useCallback(
    (verse: Verse, text: string, resume?: SentRef, startedAt = Date.now()) => {
      const key = askKey(book, chapter, unitId(verse));
      const signal = live.current.signal;
      const stopRunning = startRunning(key);
      // a screen that went away stops writing what the question is doing: what was kept stays, to be waited for again
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setPending(key, state);
      };
      set(resume ? { phase: 'waiting', question: text, startedAt, sent: resume } : { phase: 'sending', question: text, startedAt });
      void (async () => {
        try {
          const [solid, learner, grammar, settings, requests, profile, pronunciation, memory, levels, rusty] = await Promise.all([listSolidHeadwords(), learnerSummary(), learnerGrammar().catch(() => undefined), settingsSentTo('verse-ask'), requestsForTutor().catch(() => []), learnerProfile().catch(() => undefined), getGreekPronunciation(), learnerMemory(unitReference(title, verse)).catch(() => undefined), listLevels().catch(() => undefined), rustyNow().catch(() => undefined)]);
          // What he lacks under the topic his words name (mw-1vuvq6.5), worked out here so the tutor picks from it and never guesses
          const missing = levels ? missingFoundations(text, levelsOf(levels)) : undefined;
          const spoken = wasSpoken(text);
          const request = buildRequest(unitReference(title, verse), verse, text, solid, learner, grammar, settings, requests, profile, spoken, pronunciation, memory, missing, rusty);
          let sentAs: string | undefined;
          const answer = await askTutor(request, {
            key: getDeviceKeyBytes(),
            signal,
            tapAt: startedAt,
            resume,
            onSent: (txid, seq) => {
              sentAs = txid;
              set({ phase: 'waiting', question: text, startedAt, sent: { txid, seq } });
            },
          });
          // The one setting this tutor may switch is Ask by; the registry checks it like any talked change.
          const { applied } = await applyChanges(askByChange(answer), { skipUnchanged: true });
          await addAnswer(verseRef(book, chapter, unitId(verse)), text, answer.answer, answer.words, Date.now(), answer.question && withoutFillers(answer.question), applied, answer.bridge ? resolveBridge(answer.bridge, missing) : undefined, spoken);
          // the answer is kept: the question is done, even if the screen went away as it came
          setPending(key, undefined);
          void answerDrawn(sentAs);
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set({ phase: 'failed', question: text, failure, detail: err instanceof Error ? err.message : 'Something went wrong.', ...(err instanceof TutorError && err.sent ? { sent: err.sent } : {}) });
        } finally {
          stopRunning();
        }
      })();
    },
    [book, chapter, title],
  );

  const ask = useCallback(
    (verse: Verse, question: string) => {
      const text = question.trim();
      if (!text) return;
      // a new question ends the speech of the last response
      stopAnswer();
      // Retry of a question whose grist went (the link failed after it): wait for that grist's answer, send no second
      const kept = pendingOf(askKey(book, chapter, unitId(verse)));
      run(verse, text, kept?.phase === 'failed' && kept.question === text ? kept.sent : undefined);
    },
    [book, chapter, run],
  );

  const resume = useCallback(
    (verse: Verse) => {
      const key = askKey(book, chapter, unitId(verse));
      const kept = pendingOf(key);
      if (!kept || kept.phase === 'failed' || !isOrphan(key)) return;
      if (kept.sent) run(verse, kept.question, kept.sent, kept.startedAt);
      else setPending(key, { phase: 'failed', question: kept.question, failure: 'unreachable', detail: 'The page was closed before the question went. Nothing was lost: send it again.' });
    },
    [book, chapter, run],
  );

  return { asks, ask, resume };
}
