// src/reader/flipSeptuagint.ts — a hold on the Reader header's Greek / Hebrew button flips Settings > Old Testament in Greek (Septuagint) from where he is reading (mw-u2w5klk.293). The setting itself changes, so Memorize,
// the Diagram and Review follow it. The Reader is on a Lampas chapter whichever text it shows (Psalm 23 is Greek Psalm 22), so the chapter stays; the verse is the one thing the two numberings can disagree about: the verse on top
// is carried across by the Septuagint's own map (a Greek verse's `ref`, STEPBible's TVTMS), kept as the chapter's last verse and brought to the top once the other text is drawn (useBringFlipped).
import { useEffect, type RefObject } from 'react';
import { bookOf, isHebrewBook } from '../data/books';
import type { Chapter } from '../data/chapter';
import { loadLxxIndex, loadSeptuagintChapter, notReadyName } from '../data/lxxChapter';
import { setLastVerse } from '../data/readerChapter';
import { septuagintSetting } from '../settings/definitions';
import { setSetting } from '../settings/store';
import { isSeptuagint } from './septuagint';
import { settleAtTop } from './useBringVerse';

/** The toasts the hold says. */
export const FLIP_TEXT = {
  on: 'Septuagint on',
  off: 'Hebrew text on',
  notOldTestament: 'Only an Old Testament book has a Septuagint',
  loading: 'The chapter is still loading',
  notReady: (name: string): string => `The Septuagint of ${name} is not ready yet`,
  /** the index could not be reached, so nothing is known of the book (mw-u2w5klk.18): offline on the browser's word, else not fetched */
  offline: 'You are offline, and a Septuagint chapter needs the network',
  unreachable: 'The Septuagint could not be fetched',
} as const;

/** Lampas's verses a Greek verse answers that lie in chapter `lampas` (`refs` where it is several, else `ref`). */
const lampasVersesOf = (verse: Chapter['verses'][number], lampas: number): number[] => {
  const refs = verse.refs ?? (verse.ref && verse.ref !== 'none' ? [verse.ref] : []);
  return refs.filter((r) => r.chapter === lampas).map((r) => r.verse);
};

/** The Lampas verse of Greek verse `n` of a Septuagint chapter opened as Lampas's chapter `lampas`: its own, else (an Addition, a title Lampas has no verse for) the next verse that has one, else the last before it. */
export function lampasVerseOf(greek: Pick<Chapter, 'verses'>, n: number, lampas: number): number | null {
  const own = greek.verses.find((v) => v.n === n);
  if (own) {
    const mine = lampasVersesOf(own, lampas);
    if (mine.length > 0) return mine[0];
  }
  const mapped = greek.verses.flatMap((v) => lampasVersesOf(v, lampas).slice(0, 1).map((verse) => ({ n: v.n, verse })));
  return (mapped.find((m) => m.n > n) ?? mapped.filter((m) => m.n < n).at(-1))?.verse ?? null;
}

/** The Greek verse of a Septuagint chapter that holds Lampas's verse `verse` of chapter `lampas`: the one that answers it, else the Greek verse of the nearest Lampas verse below it, else the first. */
export function greekVerseOf(greek: Pick<Chapter, 'verses'>, verse: number, lampas: number): number | null {
  const mapped = greek.verses.flatMap((g) => lampasVersesOf(g, lampas).map((v) => ({ n: g.n, verse: v })));
  const exact = mapped.find((m) => m.verse === verse);
  if (exact) return exact.n;
  const below = mapped.filter((m) => m.verse < verse).sort((a, b) => b.verse - a.verse)[0];
  return (below ?? mapped.sort((a, b) => a.verse - b.verse)[0])?.n ?? null;
}

/** The verse to bring to the top once the other text is drawn: of this book's Lampas chapter, for the text the flip turns to. */
let pending: { book: string; septuagint: boolean; verse: number } | null = null;

/**
 * Flips the Septuagint setting for the chapter on screen and says, in a few words, what it did or why it did nothing. `shown` is the chapter the Reader draws now (the Septuagint's when `isSeptuagint`), `top` the verse
 * on top of the reading box in that chapter's own numbering (null at the chapter's top).
 */
export async function flipSeptuagint({ book, chapter, shown, top }: { book: string; chapter: number; shown: Chapter | null; top: number | null }): Promise<string> {
  if (!isHebrewBook(book)) return FLIP_TEXT.notOldTestament;
  if (!shown) return FLIP_TEXT.loading;
  const toSeptuagint = !isSeptuagint(shown);
  let verse: number | null = null;
  if (toSeptuagint) {
    const greek = await loadSeptuagintChapter(book, chapter).catch(() => null);
    if (!greek) {
      const index = await loadLxxIndex().catch(() => null);
      // the index not reached: nothing is known of the book, so it is not 'not ready'
      if (!index) return navigator.onLine === false ? FLIP_TEXT.offline : FLIP_TEXT.unreachable;
      return FLIP_TEXT.notReady(notReadyName(index, book, chapter, bookOf(book)?.name ?? book));
    }
    verse = top === null ? null : greekVerseOf(greek, top, chapter);
  } else if (top !== null) {
    verse = lampasVerseOf(shown, top, chapter);
  }
  if (verse !== null) {
    setLastVerse(book, chapter, verse);
    pending = { book, septuagint: toSeptuagint, verse };
  } else {
    pending = null;
    setLastVerse(book, chapter, null);
  }
  await setSetting(septuagintSetting, toSeptuagint ? 'on' : 'off');
  return toSeptuagint ? FLIP_TEXT.on : FLIP_TEXT.off;
}

/** Brings the verse a flip carried across to the top of `main` once the other text is on screen, and keeps it there while that text settles (settleAtTop). */
export function useBringFlipped(main: RefObject<HTMLElement | null>, inner: RefObject<HTMLElement | null>, book: string, chapter: Chapter | null): void {
  useEffect(() => {
    const box = main.current;
    const want = pending;
    if (!box || !want || !chapter || want.book !== book || isSeptuagint(chapter) !== want.septuagint) return;
    let watcher: MutationObserver | undefined;
    let stop: (() => void) | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const start = (): boolean => {
      if (!box.querySelector(`[data-verse="${want.verse}"]`)) return false;
      watcher?.disconnect();
      clearTimeout(giveUp);
      pending = null;
      stop = settleAtTop(box, inner.current, want.verse);
      return true;
    };
    if (!start()) {
      watcher = new MutationObserver(start);
      watcher.observe(box, { childList: true, subtree: true });
      giveUp = setTimeout(() => {
        watcher?.disconnect();
        pending = null;
      }, 3000);
    }
    return () => {
      watcher?.disconnect();
      clearTimeout(giveUp);
      stop?.();
    };
  }, [main, inner, book, chapter]);
}
