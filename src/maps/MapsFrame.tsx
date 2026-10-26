// src/maps/MapsFrame.tsx — the bottom sheet the Maps sheet and the map share (mw-zbjgn3r.2): the backdrop, the handle and Close, the heading, the scroll box. It takes the phone's Back
// (useSheetBack), Escape and a swipe down on the handle as every sheet does; a map opened over the sheet is a second frame, one Back deeper.
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';

export function MapsFrame({ label, onClose, children, heading, escape = true }: { label: string; onClose: () => void; children: ReactNode; heading: ReactNode; escape?: boolean }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose, escape);
  useSheetBack(onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="maps-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-maps-sheet
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex [--lp-panel-max:92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="maps-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <div className="shrink-0 px-4 pb-2">{heading}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(0.5rem+var(--lp-bar-inset))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
