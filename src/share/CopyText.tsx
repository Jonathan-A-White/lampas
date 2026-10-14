// src/share/CopyText.tsx — a Copy button for a piece of his own words (a question in the Talk sheet, sent or not): it puts the text on the clipboard
// and says 'Copied'. The look and the by-hand fallback are CopyExchange's. A question too long to send is copied whole and trimmed elsewhere.
import { useEffect, useRef, useState } from 'react';
import { copy } from '../ui/clipboard';

/** How long 'Copied' stays. */
const COPIED_MS = 2500;

export function CopyText({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const tap = (): void => {
    void copy(text).then((done) => {
      setState(done ? 'copied' : 'by-hand');
      clearTimeout(timer.current);
      if (done) timer.current = setTimeout(() => setState('idle'), COPIED_MS);
    });
  };
  return (
    <div data-copy-text className="ml-auto w-fit max-w-full">
      <div className="flex items-center justify-end gap-x-1">
        {state === 'copied' ? (
          <span role="status" className="text-sm text-muted">
            Copied
          </span>
        ) : null}
        <button type="button" aria-label={label} onClick={tap} className="min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line">
          Copy
        </button>
      </div>
      {state === 'by-hand' ? (
        <textarea
          readOnly
          aria-label="Text to copy"
          value={text}
          rows={6}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 text-base"
        />
      ) : null}
    </div>
  );
}
