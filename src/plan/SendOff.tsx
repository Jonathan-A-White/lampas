// src/plan/SendOff.tsx — the send-off sheet (mw-umv8sp.2): 'Off to Audible: Leviticus 3.', one line of what happens next, one big Go. Go is the only way
// on (useSendOff.ts go: the start time is recorded, then Audible opens); Back, Escape, a swipe down or a tap outside close it and begin nothing.
import { createPortal } from 'react-dom';
import { bookOf } from '../data/books';
import { otBookOf } from '../data/otBooks';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import type { SendOff as SendOffState } from './useSendOff';

function Sheet({ title, onGo, onClose }: { title: string; onGo: () => void; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div data-testid="sendoff-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+var(--lp-bar-inset))]"
      >
        <div data-testid="sheet-handle" {...handle} className="flex touch-none flex-col items-center pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <h2 className="pt-3 text-2xl font-semibold">{title}</h2>
        <p className="pt-2 text-lg text-muted">When you are back, tell me where you got to.</p>
        <button type="button" ref={focusOnMount} onClick={onGo} className="mt-5 min-h-14 w-full rounded-xl bg-accent px-6 text-xl font-semibold text-accent-fg active:opacity-80">
          Go
        </button>
      </div>
    </div>
  );
}

/** The sheet, drawn over everything while a Listen in Audible on the plan's next chapter waits for Go. Put it beside the link. */
export function SendOff({ send }: { send: SendOffState }) {
  const { offered } = send;
  if (!offered) return null;
  const name = (otBookOf(offered.code) ?? bookOf(offered.code))?.name ?? offered.code;
  return createPortal(<Sheet title={`Off to Audible: ${name} ${offered.chapter}`} onGo={() => void send.go()} onClose={send.close} />, document.body);
}
