// src/plan/ScreenshotRead.tsx — the sheet 'Your screenshot' (mw-umv8sp.4), over the return sheet once she has picked a screenshot of Audible with 'Send a screenshot'.
// It sends the picture to the audible-position grist (src/plan/audiblePosition.ts) and says 'Reading your screenshot...' meanwhile; then it proposes the chapter read,
// with the time played, what he heard of it (time left in the chapter: 'You stopped partway in it: the plan stays at <chapter>.'; at its end: 'You heard it to the end:
// the plan moves on.', mw-umv8sp.7) and how sure the reading is in words, and 'Yes, that is where I am' answers the return sheet with that chapter and what he heard (markHeard), the session
// ended. 'Back to the choices', Back, Escape, a swipe down or a tap outside leave the return sheet as it was. A screenshot with no chapter Lampas can place says so,
// and a grist that fails says so with 'Try again'. The sheet is one height whatever it shows, so a control never moves under her thumb as the answer comes in.
import { useEffect, useState } from 'react';
import type { PlanChapter } from '../data/plans';
import type { Heard } from '../data/repositories/readingPlan';
import { TutorError } from '../services/tutor';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { CONFIDENCE_WORDS, readAudibleScreenshot, type ScreenshotReading } from './audiblePosition';
import { chapterName } from './chapterName';

/** Where the reading of the screenshot stands. */
type Read = { status: 'reading' } | { status: 'failed'; line: string } | { status: 'done'; reading: ScreenshotReading | null };

const READING: Read = { status: 'reading' };

export const READING_LINE = 'Reading your screenshot...';
export const FAILED_LINE = 'Could not read the screenshot.';
export const NO_CHAPTER_LINE = 'I could not find a chapter in that screenshot.';

/** What the plan will do with the reading, in words. */
const heardWords = ({ chapter, heard }: ScreenshotReading): string =>
  heard === 'finished' ? 'You heard it to the end: the plan moves on.' : `You stopped partway in it: the plan stays at ${chapterName(chapter)}.`;

const buttonClass = 'flex min-h-12 w-full items-center justify-center rounded-xl border px-4 text-lg font-medium';

/** Reads `picture` as soon as it is drawn; `retry` reads it again after a failure. */
function useScreenshotRead(picture: File, setOffFrom: PlanChapter): { read: Read; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // what a reading ended with, and which attempt it was for: any other is still being read
  const [settled, setSettled] = useState<{ attempt: number; read: Read } | null>(null);
  useEffect(() => {
    const stop = new AbortController();
    const settle = (read: Read): void => {
      if (!stop.signal.aborted) setSettled({ attempt, read });
    };
    readAudibleScreenshot(picture, setOffFrom, stop.signal).then(
      (reading) => settle({ status: 'done', reading }),
      (err: unknown) => settle({ status: 'failed', line: err instanceof TutorError && err.failure === 'no-licence' ? 'No licence' : FAILED_LINE }),
    );
    return () => stop.abort();
  }, [picture, setOffFrom, attempt]);
  return { read: settled && settled.attempt === attempt ? settled.read : READING, retry: () => setAttempt((n) => n + 1) };
}

export function ScreenshotRead({
  picture,
  setOffFrom,
  onAccept,
  onClose,
}: {
  picture: File;
  /** the chapter the listening session began at: sent as a hint, never proposed for it */
  setOffFrom: PlanChapter;
  onAccept: (chapter: PlanChapter, heard: Heard) => void;
  onClose: () => void;
}) {
  const { read, retry } = useScreenshotRead(picture, setOffFrom);
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const back = (
    <button type="button" ref={focusOnMount} onClick={onClose} className={`${buttonClass} border-line bg-surface`}>
      Back to the choices
    </button>
  );
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="screenshot-backdrop" aria-hidden="true" onClick={onClose} className="lp-fade-in absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your screenshot"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="lp-sheet-in relative flex h-[min(26rem,85dvh)] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <h2 className="flex min-h-12 w-full items-center text-xl font-semibold">Your screenshot</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-bar-inset))] pt-1">
          {read.status === 'reading' ? (
            <>
              <p role="status" className="flex flex-1 items-center justify-center gap-3 text-lg text-muted">
                <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent motion-safe:animate-pulse" />
                {READING_LINE}
              </p>
              {back}
            </>
          ) : read.status === 'failed' ? (
            <>
              <p role="alert" className="flex-1 pt-2 text-lg text-bad">
                {read.line}
              </p>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={retry} className={`${buttonClass} border-accent bg-accent text-accent-fg`}>
                  Try again
                </button>
                {back}
              </div>
            </>
          ) : read.reading === null ? (
            <>
              <div className="flex-1 pt-2">
                <p className="text-lg">{NO_CHAPTER_LINE}</p>
                <p className="pt-2 text-base text-muted">Send one of Audible’s playing screen, with the chapter’s name on it, or choose the chapter yourself.</p>
              </div>
              {back}
            </>
          ) : (
            <>
              <div className="flex-1 pt-2">
                <p className="text-base text-muted">It shows</p>
                <p data-testid="screenshot-proposal" className="pt-1 text-2xl font-semibold text-accent">
                  {chapterName(read.reading.chapter)}
                  {read.reading.position ? <span className="text-lg font-medium text-fg">{`, ${read.reading.position} in`}</span> : null}
                </p>
                <p className="pt-2 text-lg">{CONFIDENCE_WORDS[read.reading.confidence]}</p>
                <p className="pt-2 text-lg">{heardWords(read.reading)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onAccept(read.reading!.chapter, read.reading!.heard)}
                  className={`${buttonClass} border-accent bg-accent text-accent-fg`}
                >
                  Yes, that is where I am
                </button>
                {back}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
