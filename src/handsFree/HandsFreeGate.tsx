// src/handsFree/HandsFreeGate.tsx — the Hands-free gate, mounted once in the shell's top strip (src/ShellBars.tsx, from src/App.tsx; mw-rl10piw.5). It does three things:
//  - a three-finger tap anywhere in the app (voice-kit's useThreeFingerTap, over the document) turns Hands-free On or Off (src/handsFree/switch.ts says so aloud). A touch that starts on
//    something with finger gestures of its own, a map or the ladder graph (marked data-two-finger), is theirs and is left alone, as the two-finger tap leaves it (src/tutor/doorTap.ts).
//    The Reader's text and a sheet are not skipped: the Immersive reader's two-finger watcher drops a third finger (src/immersive.ts), so the two taps never both fire.
//  - while it is On, a small microphone mark (voice-kit's HandsFreeMark) stands at the top right with the name 'Hands-free is on'. It is in the flow of the strip above every screen, so it covers
//    neither a header's buttons nor the text (every full-screen layer starts below the strip, src/ShellBars.tsx).
//  - while it is On, the screen is kept awake (src/speech/wakeLock.ts, holder 'hands-free'); Off lets it go.
// This opens no microphone: the mark shows 'waiting' (a quiet outline) until the story that listens gives it states.
import { HandsFreeMark, useThreeFingerTap } from 'voice-kit/handsfree/react';
import { useEffect } from 'react';
import { holdAwake, releaseAwake } from '../speech/wakeLock';
import { toggleHandsFree, useHandsFree } from './switch';

/** The holder name the screen's wake lock is asked for under. */
export const HANDS_FREE_HOLDER = 'hands-free';

/** The mark's accessible name. */
export const HANDS_FREE_MARK_NAME = 'Hands-free is on';

/** True where a finger gesture belongs to something else: a map pinch, the ladder graph (data-two-finger). */
const ownFingers = (target: EventTarget | null): boolean => target instanceof Element && target.closest('[data-two-finger]') !== null;

export function HandsFreeGate() {
  const on = useHandsFree();
  useThreeFingerTap(() => void toggleHandsFree(), { skip: ownFingers });
  useEffect(() => {
    if (!on) return undefined;
    holdAwake(HANDS_FREE_HOLDER);
    return () => releaseAwake(HANDS_FREE_HOLDER);
  }, [on]);
  if (!on) return null;
  return (
    <div data-hands-free-mark className="flex justify-end px-3 py-1">
      <HandsFreeMark state="waiting" label={HANDS_FREE_MARK_NAME} />
    </div>
  );
}
