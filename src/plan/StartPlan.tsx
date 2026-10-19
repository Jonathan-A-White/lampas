// src/plan/StartPlan.tsx — 'Start a listening plan' (mw-umv8sp.5): first the plan (listPlans(), one today: The whole Bible), then 'Where are you starting?': the chapter
// picker in choose mode, and a tap on a chapter starts the plan there (readingPlan.ts startPlan: everything before it is done, the Reading plan setting and the Audio Bible go
// On). Today's reading plan piece ('Start a plan') and Settings > Study resources both open it. Back, Escape, Not now or a tap outside close it and start nothing.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChapterPicker } from '../ChapterPicker';
import { listPlans } from '../data/plans';
import { startPlan } from '../data/repositories/readingPlan';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { chapterName } from './chapterName';
import { usePlan } from './usePlan';

const GENESIS_1 = { code: 'gen', chapter: 1 };

function Sheet({ onClose }: { onClose: () => void }) {
  const [planId, setPlanId] = useState<string | null>(null);
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, planId === null);
  useSheetBack(onClose);
  const start = usePlan()?.started?.next ?? GENESIS_1;
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start a listening plan"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 text-xl font-semibold">Start a listening plan</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Not now
            </button>
          </div>
        </div>
        <p className="text-base text-muted">Pick a plan. Next you say where you are starting, and everything before it counts as done.</p>
        <div role="group" aria-label="Plans" className="flex flex-col gap-2 pt-4">
          {listPlans().map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              className="flex min-h-12 w-full items-center rounded-xl border border-line bg-surface px-4 text-left text-lg font-medium"
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>
      {planId === null ? null : (
        <ChapterPicker
          heading="Where are you starting?"
          showPlan={false}
          current={{ book: start.code, chapter: start.chapter, title: chapterName(start) }}
          onClose={() => setPlanId(null)}
          onChoose={(chosen) => void startPlan(planId, chosen).then((started) => started && onClose())}
        />
      )}
    </div>
  );
}

/** The sheet, drawn over everything (put it where the button that opens it is). */
export function StartPlan({ onClose }: { onClose: () => void }) {
  return createPortal(<Sheet onClose={onClose} />, document.body);
}
