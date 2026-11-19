// src/handsFree/HandsFreeGate.tsx — the Hands-free gate, mounted once in the shell's top strip (src/ShellBars.tsx, from src/App.tsx; mw-rl10piw.5). It does four things:
//  - a three-finger tap anywhere in the app (voice-kit's useThreeFingerTap, over the document) turns Hands-free On or Off (src/handsFree/switch.ts says so aloud). A touch that starts on
//    something with finger gestures of its own, a map or the ladder graph (marked data-two-finger), is theirs and is left alone, as the two-finger tap leaves it (src/tutor/doorTap.ts).
//    The Reader's text and a sheet are not skipped: the Immersive reader's two-finger watcher drops a third finger (src/immersive.ts), so the two taps never both fire.
//  - while it is On the one Hands-free session listens (src/handsFree/session.ts, mw-rl10piw.6), and Off ends it.
//  - while it is On, a small microphone mark (voice-kit's HandsFreeMark) stands at the top right with the name 'Hands-free is on', drawn by the session's state (data-state:
//    waiting, listening, working, needs-touch, failed). It is fixed over the top-right corner and out of the page flow, so turning Hands-free On or Off moves no text (it took a 36 px
//    strip before, mw-rl10piw.24); it is small enough to leave the buttons' icons and the text clear. A tap on it opens the sheet 'What you can say' (HelpSheet.tsx, the same list 'help' reads aloud;
//    mw-rl10piw.43): the mark is inside a button, a 1.25 rem tap box in the corner, so it takes the corner of the header's menu button's tap box.
//  - while it is On, the screen is kept awake (src/speech/wakeLock.ts, holder 'hands-free'); Off lets it go.
// When the browser refuses the microphone the session turns the setting Off and the notice (session.ts MIC_REFUSED) shows here, in the strip, until he dismisses it or turns
// Hands-free on again. When the wake could not start for a reason that may pass (the model not fetched) the setting stays On, the notice (COULD_NOT_START) shows beside the
// mark and goes by itself when the wake is waiting again.
import type { HandsFreeState } from 'voice-kit/handsfree';
import { HandsFreeMark, useHandsFree as useSessionState, useThreeFingerTap } from 'voice-kit/handsfree/react';
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { holdAwake, releaseAwake } from '../speech/wakeLock';
import { HELP_TITLE } from './commands';
import { HelpSheet } from './HelpSheet';
import { dismissHandsFreeNotice, handsFreeNotice, handsFreeSource, onHandsFreeNotice, runHandsFree } from './session';
import { toggleHandsFree, useHandsFree } from './switch';

/** The holder name the screen's wake lock is asked for under. */
export const HANDS_FREE_HOLDER = 'hands-free';

/** The mark's accessible name. */
export const HANDS_FREE_MARK_NAME = 'Hands-free is on';

/** True where a finger gesture belongs to something else: a map pinch, the ladder graph (data-two-finger). */
const ownFingers = (target: EventTarget | null): boolean => target instanceof Element && target.closest('[data-two-finger]') !== null;

/** The mark's size: the kit's 36 px is too big for a corner (--bk-handsfree-size, voice-kit/handsfree/styles.css; its icon is shrunk in src/index.css). */
const MARK_SIZE = { '--bk-handsfree-size': '1rem' } as CSSProperties;

/** The mark inside a button: a tap opens the sheet 'What you can say'. It lives only while Hands-free is On, so Off puts the sheet away. */
function MarkButton({ state }: { state: HandsFreeState }) {
  const [helping, setHelping] = useState(false);
  return (
    <>
      <button
        type="button"
        data-hands-free-mark
        aria-haspopup="dialog"
        aria-label={HELP_TITLE}
        onClick={() => setHelping(true)}
        className="fixed top-0 right-[env(safe-area-inset-right)] pb-1 pl-1"
        style={MARK_SIZE}
      >
        <HandsFreeMark state={state} label={HANDS_FREE_MARK_NAME} />
      </button>
      {helping ? <HelpSheet onClose={() => setHelping(false)} /> : null}
    </>
  );
}

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
  const strip =
    notice === null ? null : (
      <div data-hands-free-notice className="flex items-start gap-2 px-3 py-1 text-sm">
        <p role="alert" className="flex-1">
          {notice}
        </p>
        <button type="button" className="shrink-0 underline" onClick={dismissHandsFreeNotice}>
          OK
        </button>
      </div>
    );
  if (!on) return strip;
  return (
    <>
      {strip}
      <MarkButton state={session} />
    </>
  );
}
