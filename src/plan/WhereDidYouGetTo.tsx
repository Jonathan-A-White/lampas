// src/plan/WhereDidYouGetTo.tsx — the return sheet (mw-umv8sp.3): back from Audible with a listening session open, 'Where did you get to?' proposes the chapter the time
// away most likely reached (src/plan/estimate.ts) and asks where she STOPPED in a tap or two (mw-umv8sp.7): Finished <the chapter she began> (heard to its end: the plan is
// done through it), I stopped in (the chapters around the estimate, the estimate highlighted), Pick it myself (the chapter picker in choose mode, 'Which chapter did you stop
// in?') or Stopped partway (no chapter: marks nothing, the plan stays where it was). A chapter she stopped in is not done: the plan is marked done through the chapter before
// it, so Next and the send-off name it and her next listen starts at its beginning (readingPlan.ts markHeard is the one rule, the screenshot read uses it too). Every answer
// ends the session (src/plan/useReturn.ts). Not now puts the sheet away and leaves the session open. Send a screenshot (mw-umv8sp.4) picks one picture, a
// screenshot of Audible, and the sheet 'Your screenshot' over this one reads it with the audible-position grist and proposes its chapter (src/plan/ScreenshotRead.tsx); with
// no licence the row says 'Needs a licence' and opens the Licence page (the sheet is hidden there, App passes `hidden`, and shows again on Back). The sheet is as tall
// as its content and nothing on it opens or closes a list, so the control she tapped never moves under her thumb. It slides up and fades in (src/index.css .lp-sheet-in, all but instant under reduced motion).
import { useRef, useState } from 'react';
import { ChapterPicker } from '../ChapterPicker';
import type { PlanChapter } from '../data/plans';
import type { Heard } from '../data/repositories/readingPlan';
import { useAiAllowed } from '../gate/licenceContext';
import { openLicence } from '../nav/route';
import { TALK_PICTURE_MIMES } from '../talk/pictures';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { awayText } from './awayText';
import { chapterName } from './chapterName';
import { ScreenshotRead } from './ScreenshotRead';
import { useReturn, type ReturnProposal } from './useReturn';

const same = (a: PlanChapter, b: PlanChapter): boolean => a.code === b.code && a.chapter === b.chapter;

const rowClass = 'flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border px-4 text-left text-lg font-medium';

function Sheet({ proposal, hidden, onAnswer, onClose }: { proposal: ReturnProposal; hidden: boolean; onAnswer: (chosen: PlanChapter | null, heard: Heard) => void; onClose: () => void }) {
  const [picking, setPicking] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const ai = useAiAllowed();
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, !picking && !screenshot && !hidden);
  useSheetBack(onClose);
  const { session, elapsedMs, estimate } = proposal;
  return (
    <div hidden={hidden} className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Where did you get to?"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            <h2 className="min-w-0 flex-1 text-xl font-semibold">Where did you get to?</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Not now
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-bar-inset))] pt-1">
          <p className="text-base text-muted">{`You set off from ${chapterName(session)} ${awayText(elapsedMs)} ago.`}</p>
          <p className="pt-1 text-lg">
            {'I think you got to '}
            <strong className="font-semibold text-accent">{chapterName(estimate.reached)}</strong>.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <button type="button" onClick={() => onAnswer(session, 'finished')} className={`${rowClass} border-line bg-surface`}>
              {`Finished ${chapterName(session)}`}
            </button>
            <div role="group" aria-label="I stopped in" className="rounded-xl border border-line p-2">
              <p className="px-2 pb-1 pt-1 text-sm font-medium text-muted">I stopped in</p>
              <div className="flex flex-col gap-2">
                {estimate.around.map((c) => {
                  const proposed = same(c, estimate.reached);
                  return (
                    <button
                      key={`${c.code}.${c.chapter}`}
                      type="button"
                      aria-label={`Stopped in: ${chapterName(c)}`}
                      aria-current={proposed ? 'true' : undefined}
                      data-proposal={proposed ? '' : undefined}
                      onClick={() => onAnswer(c, 'stopped-in')}
                      className={`${rowClass} ${proposed ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}
                    >
                      <span>{chapterName(c)}</span>
                      {proposed ? <span className="shrink-0 text-sm font-medium opacity-90">my guess</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setPicking(true)} className={`${rowClass} border-line bg-surface`}>
              Pick it myself
            </button>
            {ai ? (
              <>
                <button type="button" onClick={() => picker.current?.click()} className={`${rowClass} border-line bg-surface`}>
                  <span>Send a screenshot</span>
                  <span className="shrink-0 text-sm font-medium text-muted">of Audible</span>
                </button>
                <input
                  ref={picker}
                  type="file"
                  hidden
                  accept={TALK_PICTURE_MIMES.join(',')}
                  aria-label="Screenshot file"
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (chosen) setScreenshot(chosen);
                  }}
                />
              </>
            ) : (
              <button type="button" onClick={() => openLicence('reader')} className={`${rowClass} border-line bg-surface`}>
                <span className="text-muted">Send a screenshot</span>
                <span className="shrink-0 text-base font-medium text-accent underline">Needs a licence</span>
              </button>
            )}
            <button type="button" onClick={() => onAnswer(null, 'stopped-in')} className={`${rowClass} border-line bg-surface text-muted`}>
              {`Stopped partway, the plan stays at ${chapterName(session)}`}
            </button>
          </div>
        </div>
      </div>
      {picking ? (
        <ChapterPicker
          current={{ book: session.code, chapter: session.chapter, title: chapterName(session) }}
          heading="Which chapter did you stop in?"
          onClose={() => setPicking(false)}
          onChoose={(chosen) => onAnswer(chosen, 'stopped-in')}
        />
      ) : null}
      {screenshot ? <ScreenshotRead picture={screenshot} setOffFrom={session} onAccept={onAnswer} onClose={() => setScreenshot(null)} /> : null}
    </div>
  );
}

/** The return sheet, drawn while a return from Audible is proposed (App draws it once). `hidden` (the Licence page is open over it) keeps it mounted, with its
 *  place in history (src/ui/sheetBack.ts), and out of sight: Back from the Licence page finds it as she left it. */
export function WhereDidYouGetTo({ hidden = false }: { hidden?: boolean }) {
  const { proposal, close, answer } = useReturn();
  if (!proposal) return null;
  return <Sheet proposal={proposal} hidden={hidden} onAnswer={(chosen, heard) => void answer(chosen, heard)} onClose={close} />;
}
