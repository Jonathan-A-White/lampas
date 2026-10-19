// src/speech/TutorWaitingBar.tsx — the bar at the top of the app that says 'The tutor answered: tap to play' when a response came while he was in
// another app (mw-5r3p30.270, src/speech/tutorWaiting.ts). The tap is the user gesture that lets the page speak.
// It is drawn on a layer of its own over the whole page (a portal to the body, fixed, above every screen, sheet and backdrop: mw-5r3p30.322): he asks from
// the Verse view (fixed, z-5) or the Talk sheet (fixed, with a backdrop), and a bar in the shell's flow was under both, so there was nothing to tap.
import { createPortal } from 'react-dom';
import { startAnswer } from './readAloud';
import { dropWaiting, useWaitingAnswer } from './tutorWaiting';

export function TutorWaitingBar() {
  const answer = useWaitingAnswer();
  if (!answer) return null;
  return createPortal(
    <div className="fixed inset-x-0 top-0 z-60 border-b border-line bg-accent pt-[env(safe-area-inset-top)] text-accent-fg" data-tutor-waiting>
      <button
        type="button"
        onClick={() => {
          dropWaiting();
          startAnswer(answer.id, answer.runs);
        }}
        className="flex min-h-12 w-full items-center justify-center px-3 py-3 text-base font-medium"
      >
        The tutor answered: tap to play
      </button>
    </div>,
    document.body,
  );
}
