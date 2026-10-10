// src/share/CopyExchange.tsx — the Copy under a tutor exchange (an answer card of the Verse view, a turn of the Talk sheet): it puts the exchange
// on the clipboard as Markdown (exchange.ts) and says 'Copied'. A phone that refuses the clipboard shows the Markdown itself, selected, to copy by
// hand: the tap never ends in nothing.
import { useEffect, useRef, useState } from 'react';
import { copy } from '../ui/clipboard';
import { exchangeMarkdown } from './exchange';

/** How long 'Copied' stays. */
const COPIED_MS = 2500;

/** `place` is the key the exchange is kept under ('rom.8.28'); `question` is the one shown to him. */
export function CopyExchange({ place, question, answer }: { place: string; question: string; answer: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const markdown = exchangeMarkdown(place, question, answer);
  const tap = (): void => {
    void copy(markdown).then((done) => {
      setState(done ? 'copied' : 'by-hand');
      clearTimeout(timer.current);
      if (done) timer.current = setTimeout(() => setState('idle'), COPIED_MS);
    });
  };
  return (
    <div data-copy-exchange className={state === 'by-hand' ? 'w-full' : undefined}>
      <div className="flex items-center gap-x-1">
        <button
          type="button"
          aria-label="Copy this exchange"
          // a tap on a response stops it being read aloud; copying it is not a reason to cut it off
          onClick={(e) => {
            e.stopPropagation();
            tap();
          }}
          className="min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line"
        >
          Copy
        </button>
        {state === 'copied' ? (
          <span role="status" className="text-sm text-muted">
            Copied
          </span>
        ) : null}
      </div>
      {state === 'by-hand' ? (
        <textarea
          readOnly
          aria-label="Exchange to copy"
          value={markdown}
          rows={6}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 text-base"
        />
      ) : null}
    </div>
  );
}
