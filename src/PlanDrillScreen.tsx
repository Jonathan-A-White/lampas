// src/PlanDrillScreen.tsx — one short drill of Your drill plan (mw-i7xe0n.4, docs/grammar.md 'Your drill plan'): a full screen that asks 4 to 6 questions of one weak facet of an idea
// (data/grammar/drillPlan.ts shortDrill), one at a time as Drill it draws them (GrammarCard, multiple choice), then says how many were right and whether this step of the plan is done
// (facetPassed: one miss is allowed). It writes nothing: Done hands the verdict to onFinish (the Result of Drill it and the Review card put it on the plan, drillPlans.ts answerPlanItem).
import { useState } from 'react';
import { facetPassed } from './data/grammar/drillPlan';
import type { DrillQuestion } from './data/grammar/drillIt';
import { ideaOf } from './data/grammar/ladder';
import { GrammarCard } from './GrammarCard';
import { FacetLabel } from './FacetLabel';
import { useSheetBack } from './ui/sheetBack';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

export function PlanDrillScreen({ ideaId, facetLabel, questions, onFinish, onClose }: {
  ideaId: string;
  facetLabel: string;
  questions: readonly DrillQuestion[];
  /** he tapped Done (or went Back) after the last question: whether the step is done */
  onFinish: (passed: boolean) => void;
  /** Stop, or Back before the end: nothing is kept */
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const over = index >= questions.length;
  const passed = facetPassed(right, questions.length);
  const leave = over ? () => onFinish(passed) : onClose;
  useSheetBack(leave);
  const question = over ? null : questions[index];

  const pick = (option: string) => {
    if (!question || picked !== null) return;
    setPicked(option);
    if (option === question.right) setRight((n) => n + 1);
  };
  const next = () => {
    setIndex((n) => n + 1);
    setPicked(null);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Short drill" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{ideaOf(ideaId).title}</h2>
          <p data-testid="plan-drill-step" className="truncate text-sm text-muted">
            {over ? 'Short drill: ' : `Question ${index + 1} of ${questions.length} · `}
            <FacetLabel label={facetLabel} />
          </p>
        </div>
        {over ? null : (
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Stop
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {question ? (
          <GrammarCard key={index} question={question} mode="choice" picked={picked} onPick={pick} sideBySide />
        ) : (
          <div data-testid="plan-drill-result">
            <h3 className="text-2xl font-bold">
              {right} of {questions.length} right
            </h3>
            <p className="mt-1 text-base text-muted">{passed ? 'This step of your plan is done.' : 'Not yet. It comes back tomorrow in Review.'}</p>
          </div>
        )}
      </div>
      <FootBar>
        {over ? (
          <button type="button" data-testid="plan-drill-done" ref={focusOnMount} onClick={() => onFinish(passed)} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Done
          </button>
        ) : picked !== null ? (
          <button type="button" data-testid="plan-drill-next" ref={focusOnMount} onClick={next} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            {index === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        ) : null}
      </FootBar>
    </div>
  );
}
