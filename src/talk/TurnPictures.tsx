// src/talk/TurnPictures.tsx — the pictures of a turn (mw-y3qno5.1): thumbnails above his words, kept with the turn in Dexie (talkPictures), and the
// full-screen view a tap opens. The view is a Back step of its own (useSheetBack): Back, Close or Escape closes it and leaves the talk as it was.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { listTurnPictures } from '../data/repositories';
import { focusOnMount } from '../ui/focus';
import { useSheetBack } from '../ui/sheetBack';
import { dataUrlOf } from './pictures';

/** A picture to show: the URL it is drawn by. */
export interface ShownPicture {
  key: string | number;
  url: string;
}

function Viewer({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  useSheetBack(onClose);
  // Escape closes the picture and not the Talk sheet under it: this listener is first (capture) and ends the key there.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={name} className="fixed inset-0 z-20 flex flex-col bg-black">
      <div className="flex shrink-0 justify-end px-4 pt-3">
        <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-12 min-w-12 rounded-lg bg-white/15 px-4 text-lg font-medium text-white">
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
        <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
    </div>,
    document.body,
  );
}

/** Thumbnails that open full screen on a tap. `align` puts them on his side of the talk. */
export function PictureThumbs({ pictures, label = 'Pictures you sent' }: { pictures: ShownPicture[]; label?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (pictures.length === 0) return null;
  const opened = open === null ? undefined : pictures[open];
  return (
    <>
      <div data-turn-pictures role="group" aria-label={label} className="ml-auto flex w-fit max-w-[88%] flex-wrap justify-end gap-2">
        {pictures.map((p, i) => (
          <button
            key={p.key}
            type="button"
            aria-label={`Picture ${i + 1}`}
            aria-haspopup="dialog"
            onClick={() => setOpen(i)}
            className="h-16 w-16 overflow-hidden rounded-lg border border-line bg-line active:opacity-70"
          >
            <img src={p.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {opened && open !== null ? <Viewer name={`Picture ${open + 1}`} url={opened.url} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

/** The pictures kept with a turn, read from Dexie. */
export function TurnPictures({ turnId }: { turnId: number | undefined }) {
  const rows = useLiveQuery(() => (turnId === undefined ? Promise.resolve([]) : listTurnPictures(turnId)), [turnId]);
  const shown = useMemo<ShownPicture[]>(() => (rows ?? []).map((r) => ({ key: r.id ?? r.place, url: dataUrlOf(new Uint8Array(r.bytes), r.mime) })), [rows]);
  return <PictureThumbs pictures={shown} />;
}
