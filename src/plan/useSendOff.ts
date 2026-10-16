// src/plan/useSendOff.ts — the one door to 'Listen in Audible' (mw-umv8sp.2). With the Reading plan On and the chapter in the plan he started, the tap does not
// leave the app: it offers the send-off sheet (SendOff.tsx), and Go records the start of the listening session (readingPlan.ts beginSession) BEFORE it opens
// Audible with the fallback armed. Otherwise (the plan Off, none started, a chapter outside it) the tap is what it always was: the link is stamped with the time
// of the tap and the phone follows it. Every Audible entry point (VerseView.tsx, ChapterPicker.tsx) takes its tap from here.
import { useLiveQuery } from 'dexie-react-hooks';
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';
import { planOf } from '../data/plans';
import { beginSession, getReadingPlan } from '../data/repositories/readingPlan';
import { type AudioBible, audibleListen } from '../resources/audioBible';
import { armFallback, browserEnv } from '../resources/openApp';
import { readingPlanSetting } from '../settings/definitions/readingPlan';
import { useSetting } from '../settings/store';

/** The chapter he is about to listen to and the audio Bible it opens in. */
export interface SendOffTarget {
  audio: AudioBible;
  code: string;
  chapter: number;
}

export interface SendOff {
  /** The onClick of a Listen in Audible link: offers the sheet for a plan chapter, else stamps the link with the time of the tap and arms the fallback. */
  tap: (e: MouseEvent<HTMLAnchorElement>, target: SendOffTarget) => void;
  /** the chapter the sheet is offered for, or null while no sheet is up */
  offered: SendOffTarget | null;
  /** Go: begins the session, then opens Audible */
  go: () => Promise<void>;
  /** the sheet is dismissed: nothing begins */
  close: () => void;
}

export function useSendOff(): SendOff {
  const on = useSetting(readingPlanSetting) === 'on';
  const state = useLiveQuery(getReadingPlan, []);
  const [offered, setOffered] = useState<SendOffTarget | null>(null);

  const inPlan = useCallback(
    (code: string, chapter: number): boolean =>
      on && state !== undefined && (planOf(state.planId)?.chapters().some((c) => c.code === code && c.chapter === chapter) ?? false),
    [on, state],
  );

  const tap = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, target: SendOffTarget) => {
      if (inPlan(target.code, target.chapter)) {
        e.preventDefault();
        setOffered(target);
        return;
      }
      // Audible wants the link stamped with the time of the tap: make it again as the tap lands, before the phone follows it
      const listen = audibleListen(target.audio, target.code, target.chapter);
      e.currentTarget.href = listen.href;
      if (listen.fallback !== undefined) armFallback(listen.fallback);
    },
    [inPlan],
  );

  const close = useCallback(() => setOffered(null), []);

  const go = useCallback(async () => {
    if (!offered) return;
    const startedAt = Date.now();
    setOffered(null);
    await beginSession({ code: offered.code, chapter: offered.chapter, startedAt });
    const listen = audibleListen(offered.audio, offered.code, offered.chapter, startedAt);
    if (listen.fallback !== undefined) armFallback(listen.fallback);
    browserEnv.open(listen.href);
  }, [offered]);

  return { tap, offered, go, close };
}
