// src/talk/PictureControls.tsx — the picture part of the Talk sheet's composer (mw-y3qno5.1): the attach and camera buttons (the labels of bsv-kit's
// Composer, which the Verse view's Ask uses) and the pictures waiting to go, each a thumbnail with a remove x. A paste anywhere in the sheet is
// pastedPictures' business (pictures.ts). The state is src/talk/usePictureBox.ts.
import { useRef } from 'react';
import { TALK_PICTURE_MIMES } from './pictures';
import type { PictureBox } from './usePictureBox';

const ICON = 'h-6 w-6';

function Attach() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
    </svg>
  );
}

function Camera() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

const BUTTON = 'flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-line text-accent active:bg-line disabled:opacity-40';

export function PictureControls({ box, disabled }: { box: PictureBox; disabled: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  const shutter = useRef<HTMLInputElement>(null);
  const onFiles = (list: FileList | null, input: HTMLInputElement): void => {
    if (list) box.add(Array.from(list));
    input.value = '';
  };
  return (
    <div data-talk-pictures className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Attach a picture" disabled={disabled} onClick={() => picker.current?.click()} className={BUTTON}>
          <Attach />
        </button>
        <button type="button" aria-label="Take a photo" disabled={disabled} onClick={() => shutter.current?.click()} className={BUTTON}>
          <Camera />
        </button>
        {box.working ? (
          <p role="status" className="text-base text-muted">
            Getting the picture ready…
          </p>
        ) : null}
        <input ref={picker} type="file" multiple hidden aria-label="Picture file" accept={TALK_PICTURE_MIMES.join(',')} onChange={(e) => onFiles(e.target.files, e.target)} />
        <input ref={shutter} type="file" hidden aria-label="Camera photo" accept="image/*" capture="environment" onChange={(e) => onFiles(e.target.files, e.target)} />
      </div>
      {box.pictures.length > 0 ? (
        <ul role="group" aria-label="Pictures to send" className="flex gap-4 pt-1">
          {box.pictures.map((p, i) => (
            <li key={p.id} data-picture className="relative h-14 w-14 shrink-0">
              <img src={p.url} alt={`Picture ${i + 1}`} className="h-14 w-14 rounded-lg border border-line object-cover" />
              <button
                type="button"
                aria-label={`Remove picture ${i + 1}`}
                disabled={disabled}
                onClick={() => box.remove(p.id)}
                className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center disabled:opacity-40"
              >
                <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-sm leading-none">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {box.notice ? (
        <p role="alert" className="break-words text-base text-bad">
          {box.notice}
        </p>
      ) : null}
    </div>
  );
}
