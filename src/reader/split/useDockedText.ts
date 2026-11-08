// src/reader/split/useDockedText.ts — the chapter the Reader's dock holds when it holds a text (mw-5r3p30.1130): the chapter of the open address in the dock's text, loaded on its own and whatever Settings >
// Old Testament in Greek says of the passage. 'none' is a chapter the text does not exist for (Romans 8 in the Septuagint, a New Testament chapter in Hebrew): the dock keeps its place and says so.
import { useEffect, useState } from 'react';
import { isHebrewBook } from '../../data/books';
import { fillChapter, loadOwnChapter, type Chapter } from '../../data/chapter';
import { greekChaptersOf, loadLxxIndex, loadSeptuagintChapter } from '../../data/lxxChapter';
import { isSeptuagintText, type SplitTextKey } from './splitTexts';

export type DockedText = { status: 'loading' } | { status: 'none' } | { status: 'failed' } | { status: 'ready'; chapter: Chapter };

const held = new Map<string, Promise<Chapter | null>>();

/** The chapter in the text, or null where the text has none: the Septuagint's own chapter (null when it is not shipped for it), else Lampas's. A failure is not kept. */
export function loadSplitChapter(key: SplitTextKey, book: string, chapter: number): Promise<Chapter | null> {
  const at = `${key}:${book}/${chapter}`;
  const known = held.get(at);
  if (known) return known;
  const own = isHebrewBook(book);
  const request: Promise<Chapter | null> =
    isSeptuagintText(key)
      ? own
        ? loadSeptuagintChapter(book, chapter).then((greek) => (greek ? fillChapter(greek) : null))
        : Promise.resolve(null)
      : (key === 'hebrew' && !own) || (key === 'greek' && own)
        ? Promise.resolve(null)
        : loadOwnChapter(book, chapter);
  held.set(at, request);
  request.catch(() => {
    if (held.get(at) === request) held.delete(at);
  });
  return request;
}

/** Forgets the chapters held (tests). */
export const forgetSplitChapters = (): void => held.clear();

/** The dock's text in the open chapter; idle (null) while the dock holds no text. */
export function useDockedText(key: SplitTextKey | null, book: string, chapter: number): DockedText | null {
  const [state, setState] = useState<{ at: string; text: DockedText } | null>(null);
  const at = key === null ? '' : `${key}:${book}/${chapter}`;
  useEffect(() => {
    if (key === null) return;
    let current = true;
    loadSplitChapter(key, book, chapter).then(
      (loaded) => current && setState({ at: `${key}:${book}/${chapter}`, text: loaded ? { status: 'ready', chapter: loaded } : { status: 'none' } }),
      () => current && setState({ at: `${key}:${book}/${chapter}`, text: { status: 'failed' } }),
    );
    return () => {
      current = false;
    };
  }, [key, book, chapter]);
  if (key === null) return null;
  return state?.at === at ? state.text : { status: 'loading' };
}

/** Whether the Septuagint is shipped for a chapter of an Old Testament book (the index of public/data-lxx names a Greek chapter for it); undefined until the index is read. */
export function useSeptuagintShipped(book: string, chapter: number): boolean | undefined {
  const [shipped, setShipped] = useState<{ at: string; shipped: boolean } | undefined>(undefined);
  const at = `${book}/${chapter}`;
  useEffect(() => {
    if (!isHebrewBook(book)) return;
    let current = true;
    loadLxxIndex().then(
      (index) => current && setShipped({ at, shipped: greekChaptersOf(index, book, chapter).length > 0 }),
      () => current && setShipped({ at, shipped: false }),
    );
    return () => {
      current = false;
    };
  }, [book, chapter, at]);
  if (!isHebrewBook(book)) return false;
  return shipped?.at === at ? shipped.shipped : undefined;
}
