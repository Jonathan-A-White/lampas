// src/ui/LinkActions.tsx — Copy link (and Share, where the phone has navigator.share) for the https link of a word (src/nav/links.ts wordUrl). Copying says
// 'Link copied'; a phone that refuses the clipboard shows the link itself, selected, to copy by hand: the tap never ends in nothing. Used on the word sheet.
// Given `text` (the Verse view's: what When you copy makes of the verse, passage or chapter, src/copy/format.ts) the buttons are Copy and Share, it says
// 'Copied' and shows the text to copy by hand; Share hands the share sheet `shareText` and, when there is one, `shareUrl` as its link.
import { useAlive } from 'pwa-kit/alive';
import { useEffect, useRef, useState } from 'react';
import { copy } from './clipboard';

const BUTTON = 'min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line';

/** How long 'Link copied' stays. */
const COPIED_MS = 2500;

/** `statusClassName` replaces the look of the 'Link copied' line (the Verse view's row has no room for it beside the buttons). */
export function LinkActions({
  url,
  title,
  text,
  shareText,
  shareUrl,
  className,
  statusClassName = 'text-sm text-muted',
}: {
  url: string;
  title: string;
  text?: string;
  shareText?: string;
  shareUrl?: string;
  className?: string;
  statusClassName?: string;
}) {
  const whole = text !== undefined;
  const value = text ?? url;
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useAlive();
  useEffect(() => () => clearTimeout(timer.current), []);
  const canShare = typeof navigator.share === 'function';
  const copied = () => {
    if (!alive()) return;
    setState('copied');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), COPIED_MS);
  };
  return (
    <div data-link-actions className={`${className ?? ''} ${state === 'by-hand' ? 'col-span-full w-full' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-1">
        <button type="button" onClick={() => void copy(value).then((done) => (done ? copied() : alive() && setState('by-hand')))} className={BUTTON}>
          {whole ? 'Copy' : 'Copy link'}
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={() =>
              void navigator.share(whole ? { title, text: shareText ?? text, ...(shareUrl ? { url: shareUrl } : {}) } : { title, url }).catch((error: unknown) => {
                // closing the share sheet is not a failure
                if (alive() && !(error instanceof DOMException && error.name === 'AbortError')) setState('by-hand');
              })
            }
            className={BUTTON}
          >
            Share
          </button>
        ) : null}
        {state === 'copied' ? (
          <span role="status" className={statusClassName}>
            {whole ? 'Copied' : 'Link copied'}
          </span>
        ) : null}
      </div>
      {state === 'by-hand' ? (
        whole ? (
          <textarea
            readOnly
            aria-label="Text to copy"
            value={value}
            rows={Math.min(8, value.split('\n').length + 1)}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-2 py-1 text-base"
          />
        ) : (
          <input
            type="text"
            readOnly
            aria-label="Link to copy"
            value={value}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-base"
          />
        )
      ) : null}
    </div>
  );
}
