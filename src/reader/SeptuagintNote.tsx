// src/reader/SeptuagintNote.tsx — the one line a Septuagint chapter says the first time the Weave is on (mw-u2w5klk.11): its English is one chunk a verse, so the Weave has nothing to lay a
// Greek word over and is off there. Got it puts it away for good (the phone's localStorage); it is a note of this one chapter kind, not a tip of Help's Tips page (src/tips/hints.ts).
import { useState } from 'react';

const KEY = 'lampas.septuagintWeaveNote';
export const SEPTUAGINT_WEAVE_NOTE = 'The Septuagint has one line of English a verse, so the Weave is off here';

const seen = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export function SeptuagintNote({ className }: { className?: string }) {
  const [shown, setShown] = useState(() => !seen());
  if (!shown) return null;
  return (
    <aside role="note" data-hint-card="septuagint-weave" className={`flex items-center gap-2 rounded-xl border border-line px-3 ${className ?? ''}`}>
      <p className="min-w-0 flex-1 py-1 text-sm">{SEPTUAGINT_WEAVE_NOTE}</p>
      <button
        type="button"
        onClick={() => {
          setShown(false);
          try {
            window.localStorage.setItem(KEY, '1');
          } catch {
            // not kept: it shows again, which is harmless
          }
        }}
        className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line"
      >
        Got it
      </button>
    </aside>
  );
}
