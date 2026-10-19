// src/plan/PlacePicker.tsx — "I should be able to edit where I'm at" (mw-5r3p30.623): a tap on the plan's place (Today's reading plan row, src/today/Today.tsx) opens this sheet with two
// ways to say where he is in the plan. "I'm at 1 John 2" (the chapter open in the Reader, src/data/readerChapter.ts) counts that chapter done and the next is the one after it
// (repositories setPlaceAfter); "Pick a place" is the chapter picker in choose mode (book, then chapter, in the plan's own order, with the plan's marks; it takes a typed 'Ps 23' through
// src/nav/parseReference.ts as the Reader's search does), and a chosen chapter is asked again with Set here (setPlace: it is the next). Nothing changes until he taps Set here or
// "I'm at": Not now, Back, Escape or a tap outside close it. The move is handed to `onMove`, which keeps what Undo needs (src/plan/useMovePlace.ts).
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChapterPicker } from '../ChapterPicker';
import type { PlanChapter } from '../data/plans';
import { getOpenChapter } from '../data/readerChapter';
import { setPlace, setPlaceAfter, type ReadingPlanState } from '../data/repositories';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { chapterName } from './chapterName';

/** A move of the place: what it does to the store, and the words that say it was done. */
export interface PlaceMove {
  run: () => Promise<ReadingPlanState | undefined>;
  said: string;
}

const GENESIS_1 = { code: 'gen', chapter: 1 };
const OPTION = 'flex min-h-12 w-full items-center rounded-xl border border-line bg-surface px-4 text-left text-lg font-medium';

function Sheet({ label, title, children, onClose, escape = true }: { label: string; title: string; children: ReactNode; onClose: () => void; escape?: boolean }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, escape);
  useSheetBack(onClose);
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 text-xl font-semibold">{title}</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Not now
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The chapter he chose, asked once more: Set here moves the plan's place, Choose another goes back to the picker. */
function Confirm({ chapter, onSet, onBack }: { chapter: PlanChapter; onSet: () => void; onBack: () => void }) {
  const { drag, handle } = useSheetDrag(onBack);
  useEscapeToClose(onBack);
  useSheetBack(onBack);
  const name = chapterName(chapter);
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onBack} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set your place"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <h2 className="min-h-12 w-full py-2 text-xl font-semibold">{name}</h2>
        </div>
        <p className="text-base text-muted">{`Your plan carries on from ${name}. Everything before it counts as done, and what you have done stays done.`}</p>
        <div className="flex flex-col gap-2 pt-4">
          <button type="button" ref={focusOnMount} onClick={onSet} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-lg font-medium text-accent-fg">
            Set here
          </button>
          <button type="button" onClick={onBack} className="flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-lg font-medium text-accent">
            Choose another
          </button>
        </div>
      </div>
    </div>
  );
}

function Places({ next, onMove, onClose }: { next: PlanChapter | undefined; onMove: (move: PlaceMove) => void; onClose: () => void }) {
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<PlanChapter | null>(null);
  const open = getOpenChapter();
  const here = { code: open.book, chapter: open.chapter };
  const place = next ?? GENESIS_1;
  const move = (m: PlaceMove): void => {
    onMove(m);
    onClose();
  };
  return (
    <>
      <Sheet label="Where are you in the plan?" title="Where are you?" onClose={onClose} escape={!picking}>
        <p className="text-base text-muted">{next ? `The plan is at ${chapterName(next)}. Say where you are and it carries on from there.` : 'Say where you are and the plan carries on from there.'}</p>
        <div role="group" aria-label="Ways to say where you are" className="flex flex-col gap-2 pt-4">
          <button type="button" onClick={() => move({ run: () => setPlaceAfter(here), said: `Counted ${open.title} as done.` })} className={OPTION}>
            {`I'm at ${open.title}`}
          </button>
          <button type="button" onClick={() => setPicking(true)} className={OPTION}>
            Pick a place
          </button>
        </div>
      </Sheet>
      {picking ? (
        <div className="fixed inset-0 z-30">
          <ChapterPicker heading="Pick a place" current={{ book: place.code, chapter: place.chapter, title: chapterName(place) }} onClose={() => setPicking(false)} onChoose={setChosen} />
        </div>
      ) : null}
      {chosen ? <Confirm chapter={chosen} onBack={() => setChosen(null)} onSet={() => move({ run: () => setPlace(chosen), said: `The plan is at ${chapterName(chosen)}.` })} /> : null}
    </>
  );
}

/** The sheet, drawn over everything (put it where the button that opens it is). */
export function PlacePicker(props: { next: PlanChapter | undefined; onMove: (move: PlaceMove) => void; onClose: () => void }) {
  return createPortal(<Places {...props} />, document.body);
}
