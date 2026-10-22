// src/talk/KeyPointsLine.tsx — the one grey line under an answer that began a fresh session of the talk (mw-pxji7y.3): the mill ended the tutor's session at its cap and
// the tutor wrote down the key points of the talk so far; a tap shows them in a sheet. 'resumed' and 'fresh' answers show nothing.
import { useState } from 'react';
import { focusOnMount } from '../ui/focus';
import { useEscapeToClose } from '../ui/sheetDrag';
import { useSheetBack } from '../ui/sheetBack';

/** What the line says. */
export const KEY_POINTS_LINE = 'The tutor wrote down the key points of this talk so far';

/** The key points in a sheet over the talk. */
function KeyPointsSheet({ keyPoints, onClose }: { keyPoints: string; onClose: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="key-points-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Key points of this talk" className="relative flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-line bg-surface">
        <div className="flex min-h-12 shrink-0 items-center justify-end px-2 pt-2">
          <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))]">
          <h2 className="text-xl font-bold">Key points of this talk</h2>
          <p data-key-points className="mt-3 whitespace-pre-wrap break-words text-lg leading-snug">
            {keyPoints}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The grey line, and the sheet it opens. */
export function KeyPointsLine({ keyPoints }: { keyPoints: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-key-points-line onClick={() => setOpen(true)} className="min-h-11 w-full rounded-lg px-1 text-left text-base text-muted underline underline-offset-4 active:bg-line">
        {KEY_POINTS_LINE}
      </button>
      {open ? <KeyPointsSheet keyPoints={keyPoints} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
