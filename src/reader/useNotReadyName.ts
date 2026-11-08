// src/reader/useNotReadyName.ts — what the Reader's "The Septuagint of … is not ready yet" notice names (mw-u2w5klk.298): the book, or the chapter when the book ships and only this chapter is held back.
import { useEffect, useState } from 'react';
import { loadLxxIndex, notReadyNotice } from '../data/lxxChapter';
import { useOnline } from '../ui/online';

/**
 * The notice itself (notReadyNotice: 'The Septuagint of Genesis 14 is not ready yet; this is the Hebrew.', or, when the index could not be reached, that the phone is offline or that it could not be fetched) once the
 * Septuagint's index is read, null while it is being read or while `active` is false, so the notice is drawn once with the right words and never first with the wrong ones (mw-u2w5klk.18).
 */
export function useNotReadyName(active: boolean, book: string, chapter: number, name: string): string | null {
  const [named, setNamed] = useState<{ key: string; text: string } | null>(null);
  const online = useOnline();
  const key = `${book}:${chapter}:${name}:${online}`;
  useEffect(() => {
    if (!active) return;
    let live = true;
    void loadLxxIndex()
      .catch(() => null)
      .then((from) => {
        if (live) setNamed({ key, text: notReadyNotice(from, online, book, chapter, name) });
      });
    return () => {
      live = false;
    };
  }, [active, key, book, chapter, name, online]);
  return active && named?.key === key ? named.text : null;
}
