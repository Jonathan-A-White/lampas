// src/speech/TutorWaitingBar.tsx — the bar at the top of the app that says 'The tutor answered: tap to play' when a response came while he was in
// another app (mw-5r3p30.270, src/speech/tutorWaiting.ts). The tap is the user gesture that lets the page speak.
// It is in the shell's flow (src/ShellBars.tsx, with 'Update ready' and Welcome back), which is above every screen, sheet and backdrop, so he can tap it from the
// Verse view or the Talk sheet he asked from (mw-5r3p30.322); the bars stack there without overlapping, and the full-screen layers start below them (mw-5r3p30.636).
import { startAnswer } from './readAloud';
import { dropWaiting, useWaitingAnswer } from './tutorWaiting';

export function TutorWaitingBar() {
  const answer = useWaitingAnswer();
  if (!answer) return null;
  return (
    <div className="border-b border-line bg-accent text-accent-fg" data-tutor-waiting>
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
    </div>
  );
}
