// src/ui/LinkActions.tsx — Copy link (and Share, where the phone has navigator.share) for the https link of a verse or a word (src/nav/links.ts
// referenceUrl, wordUrl). Copying says 'Link copied'; a phone that refuses the clipboard shows the link itself, selected, to copy by hand: the tap
// never ends in nothing. Used under a verse's panel (ReadCheck.tsx) and on the word sheet.
import { useEffect, useRef, useState } from 'react';

const BUTTON = 'min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line';

/** The clipboard through the old way, for a page the modern API refuses. */
function copyOld(text: string): boolean {
  if (typeof document.execCommand !== 'function') return false;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyOld(text);
  }
}

/** How long 'Link copied' stays. */
const COPIED_MS = 2500;

export function LinkActions({ url, title, className }: { url: string; title: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const canShare = typeof navigator.share === 'function';
  const copied = () => {
    setState('copied');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), COPIED_MS);
  };
  return (
    <div data-link-actions className={`${className ?? ''} ${state === 'by-hand' ? 'w-full' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-1">
        <button type="button" onClick={() => void copy(url).then((done) => (done ? copied() : setState('by-hand')))} className={BUTTON}>
          Copy link
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={() =>
              void navigator.share({ title, url }).catch((error: unknown) => {
                // closing the share sheet is not a failure
                if (!(error instanceof DOMException && error.name === 'AbortError')) setState('by-hand');
              })
            }
            className={BUTTON}
          >
            Share
          </button>
        ) : null}
        {state === 'copied' ? (
          <span role="status" className="text-sm text-muted">
            Link copied
          </span>
        ) : null}
      </div>
      {state === 'by-hand' ? (
        <input
          type="text"
          readOnly
          aria-label="Link to copy"
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-base"
        />
      ) : null}
    </div>
  );
}
