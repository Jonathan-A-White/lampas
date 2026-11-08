// src/reader/useNotReadyName.ts — what the Reader's "The Septuagint of … is not ready yet" notice names (mw-u2w5klk.298): the book, or the chapter when the book ships and only this chapter is held back.
import { useEffect, useState } from 'react';
import { loadLxxIndex, notReadyName } from '../data/lxxChapter';

/**
 * The name the notice carries (`Genesis`, or `Genesis 14`; notReadyName) once the Septuagint's index is read, null while it is being read or while `active` is false, so the notice is drawn once with the right
 * words and never first with the wrong ones. An index that cannot be read names the book.
 */
export function useNotReadyName(active: boolean, book: string, chapter: number, name: string): string | null {
  const [named, setNamed] = useState<{ key: string; text: string } | null>(null);
  const key = `${book}:${chapter}:${name}`;
  useEffect(() => {
    if (!active) return;
    let live = true;
    void loadLxxIndex()
      .catch(() => null)
      .then((from) => {
        if (live) setNamed({ key, text: notReadyName(from, book, chapter, name) });
      });
    return () => {
      live = false;
    };
  }, [active, key, book, chapter, name]);
  return active && named?.key === key ? named.text : null;
}
