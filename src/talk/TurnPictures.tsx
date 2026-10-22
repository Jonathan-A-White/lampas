// src/talk/TurnPictures.tsx — the pictures of a turn (mw-y3qno5.1): thumbnails above his words, kept with the turn in Dexie (talkPictures), and the
// full-screen view a tap opens: pwa-kit's shared picture viewer (a modal dialog on the browser's top layer, so no screen's z-index covers it: Drill it is z-40; pinch, drag
// and double tap zoom). The view is a Back step of its own (useSheetBack): Back, Close or Escape closes it and leaves the talk as it was.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { PictureViewer } from 'pwa-kit/picture-viewer';
import { listTurnPictures } from '../data/repositories';
import { useSheetBack } from '../ui/sheetBack';
import { dataUrlOf } from './pictures';

/** A picture to show: the URL it is drawn by. */
export interface ShownPicture {
  key: string | number;
  url: string;
}

/** The shared viewer (pwa-kit/picture-viewer), one Back step of its own: Back calls onClose through useSheetBack, and Close and Escape call it too. */
function Viewer({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  useSheetBack(onClose);
  return <PictureViewer src={url} name={name} label={name} onClose={onClose} />;
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
