// src/ui/ShareSheet.tsx — the small sheet the Verse view's Share opens first (mw-5r3p30.1026, his word 2026-11-03: "choose to share just the link ... the whole or the pieces"): one row for
// each piece of the verse, passage or chapter (src/copy/format.ts sharePieces: The whole, Just the link, Just the text, Just the reference), each showing the piece it will send, cut short
// when it is long (what is sent is whole). A tap on a row closes the sheet and hands the phone's share that piece, but not in the sheet's first two settle moments (a double tap on Share would land on Just the link, mw-5r3p30.1058). Back (useSheetBack), the Close button, Escape and a tap outside close it.
import { createPortal } from 'react-dom';
import type { SharePiece } from '../copy/format';
import { useNoDoor } from '../tutor/door';
import { useSettled } from './settle';
import { useSheetBack } from './sheetBack';
import { useEscapeToClose, useSheetDrag } from './sheetDrag';

/** A row ignores a tap for this many settle moments from the sheet's opening: the sheet rises under the Share that opened it, so the second tap of a double tap, up to
 * about 400 ms after the first, lands on "Just the link" (mw-5r3p30.1058). He has to read four rows before a deliberate tap. */
const ROW_MOMENTS = 2;

const ROW = 'flex min-h-12 w-full shrink-0 flex-col justify-center rounded-xl border border-line px-4 py-2 text-left active:bg-line';

export function ShareSheet({ title, pieces, onPick, onClose }: { title: string; pieces: readonly SharePiece[]; onPick: (piece: SharePiece) => void; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  const settled = useSettled(0, ROW_MOMENTS);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  // a list of rows to tap, nothing to ask about: no ? over it
  useNoDoor();
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div data-testid="share-sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${title}`}
        data-share-sheet
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex [--lp-panel-max:92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2 short:min-h-11 short:pt-0">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <h2 className="shrink-0 px-4 pb-2 text-xl font-semibold short:pb-1">Share {title}</h2>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-[calc(0.75rem+var(--lp-bar-inset))] short:grid short:grid-cols-2 short:pb-2">
          {pieces.map((piece) => (
            <button key={piece.id} type="button" data-share-piece={piece.id} onClick={() => settled() && onPick(piece)} className={ROW}>
              <span className="text-base font-medium text-accent">{piece.label}</span>
              {piece.shown.split('\n').map((line, i) => (
                <span key={i} className="break-words text-sm font-normal text-muted">
                  {line}
                </span>
              ))}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
