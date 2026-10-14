// src/review/DrillPlanCard.tsx — a step of Your drill plan in Review (mw-i7xe0n.4, docs/grammar.md 'Your drill plan'): the idea, what the step is (a short drill on one weak facet, or Prove it, a full
// Drill it), and a button that runs it on a screen of its own (PlanDrillScreen, DrillItScreen). When the drill is over the card is answered: KNEW_IT when the step is passed (a short drill with
// one miss allowed; Prove it proved), else NOT_YET, and the item goes the way kinds.ts DRILL_PLAN.record puts it. Prove it keeps its own run and moves the level like the idea sheet's does (recordDrill).
import { useRef, useState } from 'react';
import { ideaOf } from '../data/grammar/ladder';
import type { DrillResult } from '../data/grammar/drillIt';
import { recordDrill } from '../data/repositories';
import { DrillItScreen } from '../DrillItScreen';
import { FacetLabel } from '../FacetLabel';
import { PlanDrillScreen } from '../PlanDrillScreen';
import { KNEW_IT, NOT_YET, type PlanDrillItem } from './kinds';

const BUTTON = 'min-h-14 w-full rounded-xl border border-accent bg-accent text-lg font-medium text-accent-fg';

export function DrillPlanCard({ item, picked, onPick }: { item: PlanDrillItem; picked: string | null; onPick: (option: string) => void }) {
  const [running, setRunning] = useState(false);
  const proveRun = useRef<DrillResult | null>(null);
  const prove = item.item.kind === 'prove';
  const title = ideaOf(item.ideaId).title;
  return (
    <div data-testid="drill-plan-card" data-item={item.item.id} className="text-center">
      <p className="text-base text-muted">Your drill plan</p>
      <p className="mt-1 text-xl font-medium">{title}</p>
      <p data-testid="drill-plan-step" className="mt-3 text-2xl font-bold">
        {prove ? 'Prove it' : <FacetLabel label={item.item.facet?.label ?? ''} />}
      </p>
      <p className="mt-1 text-base text-muted">
        {prove ? 'A full Drill it. A pass makes the idea solid.' : `A short drill of ${item.questions.length} ${item.questions.length === 1 ? 'question' : 'questions'}. One miss is allowed.`}
      </p>
      {picked === null ? (
        <button type="button" onClick={() => setRunning(true)} className={`${BUTTON} mt-6`}>
          {prove ? 'Start Prove it' : 'Start the drill'}
        </button>
      ) : (
        <p data-testid="feedback" role="status" className="mt-6 min-h-12 text-lg">
          {picked === KNEW_IT ? (prove ? 'Proved by drill.' : 'Done. The next step of your plan comes up later.') : 'Not yet. It comes back tomorrow.'}
        </p>
      )}
      {running && !prove ? (
        <PlanDrillScreen
          ideaId={item.ideaId}
          facetLabel={item.item.facet?.label ?? ''}
          questions={item.questions}
          onFinish={(passed) => {
            setRunning(false);
            onPick(passed ? KNEW_IT : NOT_YET);
          }}
          onClose={() => setRunning(false)}
        />
      ) : null}
      {running && prove ? (
        <DrillItScreen
          ideaId={item.ideaId}
          mode="prove"
          passage={item.passage}
          onResult={(result) => {
            proveRun.current = result;
            void recordDrill(result, 'prove');
          }}
          onClose={() => {
            setRunning(false);
            if (proveRun.current) onPick(proveRun.current.proved ? KNEW_IT : NOT_YET);
          }}
        />
      ) : null}
    </div>
  );
}
