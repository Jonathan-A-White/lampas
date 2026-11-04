// src/tutor/doorTap.ts — the two-finger tap that puts the ? away and brings it back on every screen (mw-5r3p30.1006; the rule is in src/tutor/doorHidden.ts). One listener on the document, on while the ? is
// the screen's to show (FloatingTutor). It leaves alone what has a two-finger use of its own: the Reader's text (the same tap goes in and out of immersive reading, src/immersive.ts), anything marked
// `data-two-finger` (the ladder graph and a map pinch), and a browser dialog (the picture viewer pinches).
import { useEffect } from 'react';
import { watchTwoFingerTaps } from '../immersive';
import { toggleDoorAway } from './doorHidden';

/** What a touch that starts here is not ours: its own two-finger use, or the Reader's text. */
const OWN = '[data-two-finger], main[data-reader], dialog';

/** True where a two-finger gesture belongs to something else. */
export function hasOwnTwoFingers(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OWN) !== null;
}

/** While `active`, a two-finger tap anywhere that has no two-finger use of its own takes the ? away or brings it back, and no word or button under the fingers is tapped by it. */
export function useDoorTwoFingerTap(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    return watchTwoFingerTaps(document.documentElement, toggleDoorAway, () => {}, hasOwnTwoFingers);
  }, [active]);
}
