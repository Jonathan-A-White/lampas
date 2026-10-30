// src/diagram/DiagramLesson.tsx — the optional lesson 'How to read a sentence diagram' (mw-q6t5tvn.1, #/diagram-lesson). Ten steps (./lesson.ts), one Reed-Kellogg convention each: its sentences above
// the diagram ReedKellogg draws from a diagram written by hand (the Verse view's own face and sideways scroll), then a one-tap check, 'Tap the <role>': a right tap says so, a wrong one shows the
// right word lit. Next and Back walk the steps; the last step's Done keeps the lesson done on the phone (localStorage 'lampas.diagram-lesson', no Dexie) and returns to where he came from.
// The tenth step lists each line by its Greek term, each term a button that opens that idea's lesson in the idea sheet over the step (closing it comes back to the step).
// Leaving early keeps the step he reached, and the lesson opens there next time. Optional: only the Verse view's Diagram pane points to it ('How to read this', and an invitation until he has finished or dismissed it); no other screen names it, nudges toward it or counts it.
import { useState } from 'react';
import { DrillReference } from '../markdown/DrillReference';
import { IdeaSheetWithWord } from '../IdeaSheetWithWord';
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
  // the idea whose lesson is open over the step (a term of the tenth step), if any
  const [idea, setIdea] = useState<string | null>(null);
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
      <main className="screen min-h-0 flex-1 px-4 pt-4 pb-[var(--lp-end-inset)]" data-testid="diagram-lesson">
        <h2 className="text-2xl font-semibold">{step.title}</h2>
        <p className="mt-2 text-lg">{step.text}</p>
        <p className="mt-1 text-base text-muted">
          <DrillReference reference={step.reference} linked={tapped !== null} />
        </p>
        {/* the check is above the diagram: a tall diagram never pushes the question, or the answer, out of sight */}
        <p className="mt-3 text-lg font-medium" data-testid="diagram-lesson-check">
          {checkPrompt(step)}
        </p>
        <p role="status" data-testid="diagram-lesson-told" className={`min-h-7 text-lg ${right ? 'text-good' : 'text-muted'}`}>
          {tapped === null ? '' : right ? 'Right.' : `Not quite: the ${step.check.role} is the one lit.`}
        </p>
        <div className="mt-2" data-testid="diagram-lesson-diagram">
          <ReedKellogg key={at} diagram={step.diagram} words={step.words} mode={step.mode} reference={step.reference} onWord={setTapped} lit={tapped === null ? undefined : step.check.answer} />
        </div>
        {step.terms ? (
          <ul className="mt-4 space-y-1" data-testid="diagram-lesson-terms">
            {step.terms.map((t) => (
              <li key={t.term} className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-2 text-lg">
                <button type="button" onClick={() => setIdea(t.ideaId)} className="min-h-11 justify-self-start rounded-lg px-1 font-medium text-accent underline active:bg-line">
                  {t.term}
                </button>
                <span className="min-w-0 text-muted">{t.line}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
      {idea ? <IdeaSheetWithWord ideaId={idea} onClose={() => setIdea(null)} /> : null}
      {/* Back and Next stay where a thumb finds them, however tall the diagram is */}
      <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-line px-4 pt-2 pb-[var(--lp-bar-inset)]">
        <button type="button" disabled={at === 0} onClick={() => go(at - 1)} className={BUTTON}>
          Back
        </button>
        <button type="button" onClick={next} className={BUTTON}>
          {last ? 'Done' : 'Next'}
        </button>
      </footer>
    </>
  );
}
