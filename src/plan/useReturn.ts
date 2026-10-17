// src/plan/useReturn.ts — the return from Audible (mw-umv8sp.3): with a listening session open, the first time Lampas is in front again after she left it (the page was
// hidden or lost focus, then visibilitychange to visible or focus), and once when Lampas opens with a session still open (the phone may have closed the page while she
// listened), the return sheet is proposed. visibilitychange and focus come together on a return: the first one is the return, the second finds the sheet already open.
// Closing the sheet without an answer leaves the session open, so the next return asks again; every answer ends the session, so the sheet never reopens for it.
// Nothing is asked with the Reading plan setting Off.
import { useCallback, useEffect, useState } from 'react';
import { planOf, type PlanChapter } from '../data/plans';
import { endSession, getReadingPlan, markDoneThrough, type ListeningSession } from '../data/repositories/readingPlan';
import { readingPlanSetting } from '../settings/definitions/readingPlan';
import { getSetting } from '../settings/store';
import { estimateReached, type Estimate } from './estimate';

export interface ReturnProposal {
  session: ListeningSession;
  /** how long she was away, from the session's start (ms) */
  elapsedMs: number;
  estimate: Estimate;
}

/** The proposal for the session open now, or undefined when there is none, the setting is Off, or the plan does not hold the session's chapter. */
async function propose(): Promise<ReturnProposal | undefined> {
  if ((await getSetting(readingPlanSetting)) !== 'on') return undefined;
  const state = await getReadingPlan();
  const session = state?.session;
  if (!state || !session) return undefined;
  const elapsedMs = Math.max(0, Date.now() - session.startedAt);
  const estimate = estimateReached(session, elapsedMs, { chapters: planOf(state.planId)?.chapters() });
  return estimate ? { session, elapsedMs, estimate } : undefined;
}

/** The return sheet's state: `proposal` while it is open, `close` to put it away unanswered, `answer(chapter)` to mark the plan done through that chapter (none for Stopped partway) and end the session. */
export function useReturn(): { proposal: ReturnProposal | null; close: () => void; answer: (chosen: PlanChapter | null) => Promise<void> } {
  const [proposal, setProposal] = useState<ReturnProposal | null>(null);
  useEffect(() => {
    let live = true;
    let away = false;
    let asking = false;
    const ask = async (): Promise<void> => {
      if (asking) return;
      asking = true;
      try {
        const found = await propose();
        // keeps the sheet open as it is when a second event of the same return comes in
        if (live && found) setProposal((open) => open ?? found);
      } catch (error) {
        console.error('could not check for a listening session', error);
      } finally {
        asking = false;
      }
    };
    const left = (): void => {
      away = true;
    };
    const back = (): void => {
      if (!away) return;
      away = false;
      void ask();
    };
    const onVisibility = (): void => (document.visibilityState === 'hidden' ? left() : back());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', left);
    window.addEventListener('blur', left);
    window.addEventListener('focus', back);
    if (document.visibilityState !== 'hidden') void ask();
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', left);
      window.removeEventListener('blur', left);
      window.removeEventListener('focus', back);
    };
  }, []);
  const close = useCallback(() => setProposal(null), []);
  const answer = useCallback(async (chosen: PlanChapter | null): Promise<void> => {
    setProposal(null);
    if (chosen) await markDoneThrough(chosen);
    await endSession(Date.now());
  }, []);
  return { proposal, close, answer };
}
