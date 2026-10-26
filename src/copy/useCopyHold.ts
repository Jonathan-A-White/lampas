// src/copy/useCopyHold.ts — a hold on a verse number, a section heading or the place line copies the verse, its passage or the chapter at once (mw-9txn0x1.2): the
// text When you copy gives (src/copy/format.ts) in the view the Reader is in, put on the clipboard, and 'Copied Colossians 3:1' said for a moment (`said`).
// A phone that refuses the clipboard opens the Verse view for the same verse, passage or chapter with its text shown selected to copy by hand (askByHand, taken
// by the view as it opens), never nothing.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { passagesOf } from '../data/passage';
import type { WovenVerse } from '../data/weave';
import { openPassage, openVerse } from '../nav/route';
import { copy } from '../ui/clipboard';
import { COPY_DEFAULTS, copyReference, copyText, copyUnitOf, type CopyUnit } from './format';
import { useCopyFormat } from './useCopyFormat';

/** How long 'Copied Colossians 3:1' stays. */
export const COPIED_MS = 2500;

// The Verse view opened by a refused copy shows the text to copy by hand: this is said as it opens and taken once by the view (a module flag, as the address cannot carry it).
let byHand = false;
export const askByHand = (): void => {
  byHand = true;
};
export const takeByHand = (): boolean => {
  const was = byHand;
  byHand = false;
  return was;
};

export interface CopyHold {
  /** what the last hold copied, 'Copied Colossians 3:1', for COPIED_MS; null the rest of the time */
  said: string | null;
  verse: (n: number) => void;
  /** the passage a section heading starts at verse `first` */
  passage: (first: number) => void;
  /** the whole chapter, as the place line holds it */
  chapter: () => void;
}

/** `read` is the view the Reader is in, for Text 'As you read it'; `openChapter` opens the Verse view on the whole chapter (the place line's tap) for a phone that refuses the clipboard. */
export function useCopyHold(chapter: Chapter | null, read: { view: ReaderView; woven: readonly (WovenVerse | null)[] | null } | undefined, openChapter: () => void): CopyHold {
  const format = useCopyFormat() ?? COPY_DEFAULTS;
  const [said, setSaid] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, []);
  const put = useCallback(
    (unit: CopyUnit, refused: () => void) => {
      void copy(copyText(unit, format)).then((done) => {
        if (!alive.current) return;
        if (!done) {
          askByHand();
          refused();
          return;
        }
        setSaid(`Copied ${copyReference(unit)}`);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaid(null), COPIED_MS);
      });
    },
    [format],
  );
  const verses = chapter?.verses;
  const readView = read?.view;
  const readWoven = read?.woven;
  const unit = useCallback(
    (n: number, to?: number): CopyUnit | null => (chapter ? copyUnitOf(chapter, { n, to }, readView ? { view: readView, woven: readWoven ?? null } : undefined) : null),
    [chapter, readView, readWoven],
  );
  return {
    said,
    verse: (n) => {
      const u = unit(n);
      if (u) put(u, () => openVerse(n));
    },
    passage: (first) => {
      const found = chapter ? passagesOf(chapter.verses).find((p) => p.first === first) : undefined;
      const u = found ? unit(found.first, found.last) : null;
      if (u) put(u, () => openPassage(first));
    },
    chapter: () => {
      const u = verses?.length ? unit(verses[0].n, verses[verses.length - 1].n) : null;
      if (u) put(u, openChapter);
    },
  };
}
