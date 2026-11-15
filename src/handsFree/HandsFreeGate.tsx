// src/handsFree/HandsFreeGate.tsx — the Hands-free gate, mounted once in the shell's top strip (src/ShellBars.tsx, from src/App.tsx; mw-rl10piw.5). It does four things:
//  - a three-finger tap anywhere in the app (voice-kit's useThreeFingerTap, over the document) turns Hands-free On or Off (src/handsFree/switch.ts says so aloud). A touch that starts on
//    something with finger gestures of its own, a map or the ladder graph (marked data-two-finger), is theirs and is left alone, as the two-finger tap leaves it (src/tutor/doorTap.ts).
//    The Reader's text and a sheet are not skipped: the Immersive reader's two-finger watcher drops a third finger (src/immersive.ts), so the two taps never both fire.
//  - while it is On the one Hands-free session listens (src/handsFree/session.ts, mw-rl10piw.6), and Off ends it.
//  - while it is On, a small microphone mark (voice-kit's HandsFreeMark) stands at the top right with the name 'Hands-free is on', drawn by the session's state (data-state:
//    waiting, listening, working, needs-touch, failed). It is in the flow of the strip above every screen, so it covers neither a header's buttons nor the text (every full-screen
//    layer starts below the strip, src/ShellBars.tsx). It is not a button.
//  - while it is On, the screen is kept awake (src/speech/wakeLock.ts, holder 'hands-free'); Off lets it go.
// When the browser refuses the microphone the session turns the setting Off and the notice (session.ts MIC_REFUSED) shows here, in the strip, until he dismisses it or turns
// Hands-free on again.
import { HandsFreeMark, useHandsFree as useSessionState, useThreeFingerTap } from 'voice-kit/handsfree/react';
import { useEffect, useSyncExternalStore } from 'react';
import { holdAwake, releaseAwake } from '../speech/wakeLock';
import { dismissHandsFreeNotice, handsFreeNotice, handsFreeSource, onHandsFreeNotice, runHandsFree } from './session';
import { toggleHandsFree, useHandsFree } from './switch';

/** The holder name the screen's wake lock is asked for under. */
export const HANDS_FREE_HOLDER = 'hands-free';

/** The mark's accessible name. */
export const HANDS_FREE_MARK_NAME = 'Hands-free is on';

/** True where a finger gesture belongs to something else: a map pinch, the ladder graph (data-two-finger). */
const ownFingers = (target: EventTarget | null): boolean => target instanceof Element && target.closest('[data-two-finger]') !== null;

export function HandsFreeGate() {
  const on = useHandsFree();
  const session = useSessionState(handsFreeSource);
  const notice = useSyncExternalStore(onHandsFreeNotice, handsFreeNotice, handsFreeNotice);
  useThreeFingerTap(() => void toggleHandsFree(), { skip: ownFingers });
  useEffect(() => {
    if (on === undefined) return undefined;
    runHandsFree(on);
    return () => runHandsFree(false);
  }, [on]);
  useEffect(() => {
    if (!on) return undefined;
    holdAwake(HANDS_FREE_HOLDER);
    return () => releaseAwake(HANDS_FREE_HOLDER);
  }, [on]);
  if (notice !== null && !on) {
    return (
      <div data-hands-free-notice className="flex items-start gap-2 px-3 py-1 text-sm">
        <p role="alert" className="flex-1">
          {notice}
        </p>
        <button type="button" className="shrink-0 underline" onClick={dismissHandsFreeNotice}>
          OK
        </button>
      </div>
    );
  }
  if (!on) return null;
  return (
    <div data-hands-free-mark className="flex justify-end px-3 py-1">
      <HandsFreeMark state={session} label={HANDS_FREE_MARK_NAME} />
    </div>
  );
}
