// src/talk/usePictureBox.ts — the pictures waiting in the Talk sheet's composer (mw-y3qno5.1): attached, taken with the camera or pasted. Each is cut down on
// the phone as it is added (src/talk/pictures.ts), so Send has nothing left to wait for but the last one; a fifth, or a file that is no picture, is refused
// with a line and the rest still go in.
import { useCallback, useEffect, useRef, useState } from 'react';
import { COULD_NOT_USE_LINE, dataUrlOf, isTalkPicture, NOT_A_PICTURE_LINE, preparePicture, TALK_MAX_PICTURES, TOO_MANY_LINE, type OutgoingPicture } from './pictures';

/** A picture in the box: what is sent and a URL to show it by. */
export interface BoxPicture extends OutgoingPicture {
  id: number;
  url: string;
}

let nextId = 1;

export interface PictureBox {
  pictures: BoxPicture[];
  /** pictures still being cut down: Send waits for them */
  working: boolean;
  /** why the last file was refused, until he adds or removes one */
  notice: string | null;
  add: (files: File[]) => void;
  remove: (id: number) => void;
  /** hands the pictures over (the box is empty after) */
  take: () => BoxPicture[];
}

export function usePictureBox(): PictureBox {
  const [pictures, setPictures] = useState<BoxPicture[]>([]);
  const [working, setWorking] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  // the pictures and the room they leave, read at once when several files come in a row
  const held = useRef<BoxPicture[]>([]);
  const room = useRef(TALK_MAX_PICTURES);
  const gone = useRef(false);

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  const set = (next: BoxPicture[]): void => {
    held.current = next;
    setPictures(next);
  };

  const add = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const pictureFiles = files.filter(isTalkPicture);
    const taken = pictureFiles.slice(0, room.current);
    room.current -= taken.length;
    setNotice(taken.length < pictureFiles.length ? TOO_MANY_LINE : pictureFiles.length < files.length ? NOT_A_PICTURE_LINE : null);
    if (taken.length === 0) return;
    setWorking((n) => n + taken.length);
    void Promise.allSettled(taken.map((file, i) => preparePicture(file, held.current.length + i))).then((results) => {
      const added: BoxPicture[] = [];
      let failed = 0;
      for (const r of results) {
        if (r.status === 'fulfilled') added.push({ ...r.value, id: nextId++, url: dataUrlOf(r.value.bytes, r.value.mime) });
        else failed += 1;
      }
      room.current += failed;
      setWorking((n) => n - taken.length);
      if (gone.current) return;
      // the names follow the order they stand in
      set([...held.current, ...added].map((p, i) => ({ ...p, name: `picture-${i + 1}.jpg` })));
      if (failed > 0) setNotice(COULD_NOT_USE_LINE);
    });
  }, []);

  const remove = useCallback((id: number) => {
    if (!held.current.some((p) => p.id === id)) return;
    room.current += 1;
    set(held.current.filter((p) => p.id !== id).map((p, i) => ({ ...p, name: `picture-${i + 1}.jpg` })));
    setNotice(null);
  }, []);

  const take = useCallback(() => {
    const out = held.current;
    held.current = [];
    room.current = TALK_MAX_PICTURES;
    setPictures([]);
    setNotice(null);
    return out;
  }, []);

  return { pictures, working: working > 0, notice, add, remove, take };
}
