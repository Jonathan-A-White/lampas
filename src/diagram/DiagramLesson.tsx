// src/diagram/DiagramLesson.tsx — the optional lesson 'How to read a sentence diagram' (mw-q6t5tvn.1, #/diagram-lesson). Nine steps (./lesson.ts), one Reed-Kellogg convention each: its sentences above
// the diagram ReedKellogg draws from a diagram written by hand (the Verse view's own face and sideways scroll), then a one-tap check, 'Tap the <role>': a right tap says so, a wrong one shows the
// right word lit. Next and Back walk the steps; the last step's Done keeps the lesson done on the phone (localStorage 'lampas.diagram-lesson', no Dexie) and returns to where he came from.
// Leaving early keeps the step he reached, and the lesson opens there next time. Optional: no other screen names it, nudges toward it or counts it.
import { useState } from 'react';
import { navigate } from '../nav/route';
import { previousAddress } from '../nav/lastRoute';
import { HeaderButton, ScreenHeader } from '../ScreenHeader';
import { useReportScreen } from '../tutor/screenContext';
import { checkPrompt, keepLessonDone, keepLessonStep, LESSON_STEPS, LESSON_TITLE, lessonDone, lessonStep } from './lesson';
import { ReedKellogg } from './ReedKellogg';

const STEPS = LESSON_STEPS.length;
const BUTTON = 'min-h-12 rounded-xl border border-line px-4 text-lg font-medium text-accent active:bg-line disabled:opacity-40';

/** Where he came from: a step back when the trail has an entry behind this one, else the Reader. */
function leave(): void {
  if (previousAddress() !== null) window.history.back();
  else navigate('home');
}

export function DiagramLesson() {
  const [at, setAt] = useState(lessonStep);
  // his answer to the check of the step on show: the word he tapped, forgotten with the step
  const [tapped, setTapped] = useState<number | null>(null);
  const step = LESSON_STEPS[at];
  const last = at === STEPS - 1;
  const right = tapped !== null && tapped === step.check.answer;

  useReportScreen({
    name: LESSON_TITLE,
    facts: [
      { label: 'About', value: 'An optional lesson on reading a Reed-Kellogg sentence diagram, one line a step, each with a one-tap check; not needed for Lampas' },
      { label: 'Step', value: `${at + 1} of ${STEPS}: ${step.title} (${step.reference})` },
      { label: 'Finished', value: lessonDone() ? 'Yes' : 'Not yet' },
    ],
  });

  const go = (to: number): void => {
    keepLessonStep(to);
    setAt(to);
    setTapped(null);
  };
  const next = (): void => {
    if (!last) return go(at + 1);
    keepLessonDone();
    leave();
  };

  return (
    <>
      <ScreenHeader title={LESSON_TITLE} subtitle={`Step ${at + 1} of ${STEPS}`} back={<HeaderButton onClick={leave}>‹ Leave</HeaderButton>} />
      <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="diagram-lesson">
        <h2 className="text-2xl font-semibold">{step.title}</h2>
        <p className="mt-2 text-lg">{step.text}</p>
        <p className="mt-1 text-base text-muted">{step.reference}</p>
        <div className="mt-3" data-testid="diagram-lesson-diagram">
          <ReedKellogg key={at} diagram={step.diagram} words={step.words} mode={step.mode} reference={step.reference} onWord={setTapped} lit={tapped === null ? undefined : step.check.answer} />
        </div>
        <p className="mt-3 text-lg font-medium" data-testid="diagram-lesson-check">
          {checkPrompt(step)}
        </p>
        <p role="status" data-testid="diagram-lesson-told" className={`mt-1 min-h-7 text-lg ${right ? 'text-good' : 'text-muted'}`}>
          {tapped === null ? '' : right ? 'Right.' : `Not quite: the ${step.check.role} is the one lit.`}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 pb-[var(--lp-end-inset)]">
          <button type="button" disabled={at === 0} onClick={() => go(at - 1)} className={BUTTON}>
            Back
          </button>
          <button type="button" onClick={next} className={BUTTON}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </main>
    </>
  );
}
