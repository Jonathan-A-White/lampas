// src/ui/LinkActions.tsx — Copy link (and Share, where the phone has navigator.share) for the https link of a word (src/nav/links.ts wordUrl). Copying says
// 'Link copied'; a phone that refuses the clipboard shows the link itself, selected, to copy by hand: the tap never ends in nothing. Used on the word sheet.
// Given `text` (the Verse view's: what When you copy makes of the verse, passage or chapter, src/copy/format.ts) the buttons are Copy and Share, it says
// 'Copied' and shows the text to copy by hand (`startByHand` shows it from the start, selected). Given `pieces` (src/copy/format.ts sharePieces) Share opens the ShareSheet first: a row for
// each piece, one tap on a row hands the phone's share that piece alone (mw-5r3p30.1026); a share the phone refuses shows that piece to copy by hand.
import { useAlive } from 'pwa-kit/alive';
import { useEffect, useRef, useState } from 'react';
import { copy } from './clipboard';
import type { SharePiece } from '../copy/format';
import { focusOnMount } from './focus';
import { ShareSheet } from './ShareSheet';

const BUTTON = 'min-h-11 rounded-lg px-3 text-base font-medium text-accent active:bg-line';

/** How long 'Link copied' stays. */
const COPIED_MS = 2500;

/** `statusClassName` replaces the look of the 'Link copied' line (the Verse view's row has no room for it beside the buttons). */
export function LinkActions({
  url,
  title,
  text,
  pieces,
  className,
  statusClassName = 'text-sm text-muted',
  startByHand,
}: {
  url: string;
  title: string;
  text?: string;
  /** the pieces Share offers on a sheet of its own; without them Share hands the phone's share the link at once */
  pieces?: readonly SharePiece[];
  className?: string;
  statusClassName?: string;
  /** open with the text shown selected to copy by hand: a hold in the Reader that the clipboard refused (src/copy/useCopyHold.ts) */
  startByHand?: boolean;
}) {
  const whole = text !== undefined;
  const value = text ?? url;
  const [state, setState] = useState<'idle' | 'copied' | 'by-hand'>(startByHand && whole ? 'by-hand' : 'idle');
  // the sheet of pieces is open, and the text shown to copy by hand when a share was refused (a piece, not always the whole)
  const [choosing, setChoosing] = useState(false);
  const [byHand, setByHand] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useAlive();
  useEffect(() => () => clearTimeout(timer.current), []);
  const canShare = typeof navigator.share === 'function';
  const refused = (error: unknown) => {
    // closing the share sheet is not a failure
    return alive() && !(error instanceof DOMException && error.name === 'AbortError');
  };
  const copied = () => {
    if (!alive()) return;
    setState('copied');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), COPIED_MS);
  };
  return (
    <div data-link-actions className={`${className ?? ''} ${state === 'by-hand' ? 'col-span-full w-full' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-1">
        <button
          type="button"
          onClick={() => {
            setByHand(null);
            void copy(value).then((done) => (done ? copied() : alive() && setState('by-hand')));
          }}
          className={BUTTON}
        >
          {whole ? 'Copy' : 'Copy link'}
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={() => {
              if (pieces) return setChoosing(true);
              void navigator.share({ title, url }).catch((error: unknown) => {
                if (refused(error)) setState('by-hand');
              });
            }}
            className={BUTTON}
          >
            Share
          </button>
        ) : null}
        {choosing && pieces ? (
          <ShareSheet
            title={title}
            pieces={pieces}
            onClose={() => setChoosing(false)}
            onPick={(piece) => {
              setChoosing(false);
              setByHand(null);
              void navigator.share(piece.data).catch((error: unknown) => {
                if (refused(error)) {
                  setByHand(piece.hand);
                  setState('by-hand');
                }
              });
            }}
          />
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
            ref={startByHand ? focusOnMount : undefined}
            value={byHand ?? value}
            rows={Math.min(8, (byHand ?? value).split('\n').length + 1)}
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
