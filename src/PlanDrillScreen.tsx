// src/PlanDrillScreen.tsx — one short drill of Your drill plan (mw-i7xe0n.4, docs/grammar.md 'Your drill plan'): a full screen that asks 4 to 6 questions of one weak facet of an idea
// (data/grammar/drillPlan.ts shortDrill), one at a time as Drill it draws them (GrammarCard, multiple choice), then says how many were right and whether this step of the plan is done
// (facetPassed: one miss is allowed), with the round Ask the tutor button at the foot's right end on that result (mw-5r3p30.649, as on Drill it). It writes nothing: Done hands the verdict to onFinish (the Result of Drill it and the Review card put it on the plan, drillPlans.ts answerPlanItem).
import { useEffect, useRef, useState } from 'react';
import { DialogAskTutor } from './AskTutor';
import { facetPassed, withFetched } from './data/grammar/drillPlan';
import type { DrillQuestion } from './data/grammar/drillIt';
import { ideaOf } from './data/grammar/ladder';
import { noteAsked, takeFetchedItems } from './data/repositories';
import { GrammarCard } from './GrammarCard';
import { FacetLabel } from './FacetLabel';
import { drillScreen, drillSuggestions, type DrillTry } from './tutor/drillTalk';
import { useSheetBack } from './ui/sheetBack';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

export function PlanDrillScreen({ ideaId, facetLabel, questions: built, onFinish, onClose }: {
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
  // a question the mill wrote for this idea is asked in place of the first built one not yet answered (docs/grammar.md 'More items from the mill'): taken from the phone as the drill opens, never waited for
  const [questions, setQuestions] = useState<readonly DrillQuestion[]>(built);
  const live = useRef({ index, picked });
  useEffect(() => {
    live.current = { index, picked };
  });
  const taking = useRef(false);
  useEffect(() => {
    // once for this screen: a second run of the effect must not take a second item
    if (taking.current) return;
    taking.current = true;
    takeFetchedItems([ideaId])
      .then((kept) => {
        const item = kept.get(ideaId);
        if (item) setQuestions((all) => withFetched(all, item, live.current.index + (live.current.picked === null ? 0 : 1)));
      })
      .catch((error: unknown) => console.warn('could not take a kept drill item', error));
  }, [ideaId]);
  // every question as he answered it, for the tutor on the result, and the key this drill's talk is kept under
  const [tries, setTries] = useState<DrillTry[]>([]);
  const [talkKey] = useState(() => `screen.drill-it.${Date.now()}`);
  const over = index >= questions.length;
  const passed = facetPassed(right, questions.length);
  const leave = over ? () => onFinish(passed) : onClose;
  useSheetBack(leave);
  const question = over ? null : questions[index];
  // Done stands where Finish was: a second tap of a double tap on Finish waits for the result to settle (src/ui/settle.ts, mw-5r3p30.430)
  const settled = useSettled(index);

  const pick = (option: string) => {
    if (!question || picked !== null) return;
    setPicked(option);
    setTries((all) => [...all, { question, picked: option, hinted: false }]);
    void noteAsked(question);
    if (option === question.right) setRight((n) => n + 1);
  };
  const talkScreen = over
    ? drillScreen({ idea: ideaOf(ideaId).title, headline: `Short drill on ${facetLabel}: ${right} of ${questions.length} right`, tries })
    : null;
  const next = () => {
    setIndex((n) => n + 1);
    setPicked(null);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Short drill" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="title-wrap text-lg font-bold">{ideaOf(ideaId).title}</h2>
          <p data-testid="plan-drill-step" className="title-wrap text-sm text-muted">
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
      <FootBar beside={over}>
        {over ? (
          <button type="button" data-testid="plan-drill-done" ref={focusOnMount} onClick={() => settled() && onFinish(passed)} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Done
          </button>
        ) : picked !== null ? (
          <button type="button" data-testid="plan-drill-next" ref={focusOnMount} onClick={next} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            {index === questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        ) : null}
      </FootBar>
      {talkScreen ? <DialogAskTutor kept={talkKey} screen={talkScreen} suggestions={drillSuggestions(talkScreen)} /> : null}
    </div>
  );
}
