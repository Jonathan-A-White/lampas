// src/copy/useCopyHold.ts — a hold on a verse number, a section heading or the place line copies the verse, its passage or the chapter at once (mw-9txn0x1.2): the
// text When you copy gives (src/copy/format.ts) in the view the Reader is in, put on the clipboard, and 'Copied Colossians 3:1' said for a moment (`said`).
// A hold on a verse number says it in a row (`row`, src/copy/HoldRow.tsx, mw-5r3p30.1074) for ROW_MS from the last touch: Verse, Paragraph, Pericope and Chapter re-copy from the
// held verse to that end (src/copy/holdEnds.ts) and Share sends whatever range is held. The question mark, tapped while the row is up, asks the tutor about that range (`held`).
// A phone that refuses the clipboard opens the Verse view for the same verse, passage or chapter with its text shown selected to copy by hand (askByHand, taken
// by the view as it opens), never nothing.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter } from '../data/chapter';
import { passagesOf } from '../data/passage';
import { blocksOf, type ReadingLayout } from '../layout/layouts';
import { openPassage, openVerse, openVerseRange, readerOf } from '../nav/route';
import { copy } from '../ui/clipboard';
import { COPY_DEFAULTS, copyReference, copyText, copyUnitOf, sharePieces, type CopyUnit, type ReadView } from './format';
import { holdEnds, type EndUnit, type HoldEnd } from './holdEnds';
import { useCopyFormat } from './useCopyFormat';

/** How long 'Copied Colossians 3:1' stays. */
export const COPIED_MS = 2500;

/** How long the row of a hold on a verse number stays, counted from the last touch of it (mw-5r3p30.1074, provisional: 3 s). */
export const ROW_MS = 3000;

/** What the row says when the phone has no share. */
export const NO_SHARE_NOTE = 'This phone cannot share.';

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

/** The row a hold on a verse number draws. */
export interface HoldRowState {
  /** what it says: 'Copied Colossians 3:1-4' (and, after a Share the phone could not make, that it cannot) */
  said: string;
  /** the ends that differ, nearest first; the current one is `unit` */
  ends: HoldEnd[];
  unit: EndUnit;
}

export interface CopyHold {
  /** what the last hold on a heading or the place line copied, 'Copied Colossians 3:1', for COPIED_MS; null the rest of the time */
  said: string | null;
  /** the row of the last hold on a verse number, for ROW_MS from the last touch; null the rest of the time */
  row: HoldRowState | null;
  /** the range the row holds, while it is up: what the question mark asks about */
  held: { first: number; last: number } | null;
  /** a tap on an end of the row: copy from the held verse to that end */
  reach: (unit: EndUnit) => void;
  /** a tap on Share: hand the phone's share the range held; the row goes when the sheet opens */
  share: () => void;
  /** the row was touched: its time starts again */
  touch: () => void;
  /** the row goes now */
  closeRow: () => void;
  verse: (n: number) => void;
  /** the passage a section heading starts at verse `first` */
  passage: (first: number) => void;
  /** the whole chapter, as the place line holds it */
  chapter: () => void;
}

/** `read` is the view the Reader is in, with the variants it shows, for Text 'As you read it'; `openChapter` opens the Verse view on the whole chapter (the place line's tap) for a phone that refuses the clipboard;
 * `layout` is the Reader's, for the Paragraph end (Verse by verse has none). */
export function useCopyHold(chapter: Chapter | null, read: ReadView | undefined, openChapter: () => void, layout?: ReadingLayout): CopyHold {
  const format = useCopyFormat() ?? COPY_DEFAULTS;
  const [said, setSaid] = useState<string | null>(null);
  // the row: the verse held, the last verse copied, the reference said, and a note when the phone could not share
  const [held, setHeld] = useState<{ n: number; last: number; reference: string; note?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      clearTimeout(rowTimer.current);
    };
  }, []);
  const closeRow = useCallback(() => {
    clearTimeout(rowTimer.current);
    setHeld(null);
  }, []);
  const touch = useCallback(() => {
    clearTimeout(rowTimer.current);
    rowTimer.current = setTimeout(() => setHeld(null), ROW_MS);
  }, []);
  /** Copies `unit`; once on the clipboard `done` says it (the toast, or the row); a refusal opens the Verse view for it to copy by hand. */
  const put = useCallback(
    (unit: CopyUnit, refused: () => void, done?: () => void) => {
      void copy(copyText(unit, format)).then((copied) => {
        if (!alive.current) return;
        if (!copied) {
          askByHand();
          refused();
          return;
        }
        if (done) {
          done();
          return;
        }
        closeRow();
        setSaid(`Copied ${copyReference(unit)}`);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaid(null), COPIED_MS);
      });
    },
    [format, closeRow],
  );
  const verses = chapter?.verses;
  const readView = read?.view;
  const readWoven = read?.woven;
  const readVariants = read?.variants;
  const unit = useCallback(
    (n: number, to?: number): CopyUnit | null => (chapter ? copyUnitOf(chapter, { n, to }, readView ? { view: readView, woven: readWoven ?? null, variants: readVariants } : undefined) : null),
    [chapter, readView, readWoven, readVariants],
  );
  const endsOf = useCallback(
    (n: number): HoldEnd[] => {
      if (!chapter || chapter.verses.length === 0) return [];
      const all = chapter.verses;
      const block = layout === 'paragraph' ? blocksOf(all, layout).find((b) => b.some((v) => v.n === n)) : undefined;
      const passage = passagesOf(all).find((p) => n >= p.first && n <= p.last);
      return holdEnds({ verse: n, paragraphLast: block?.[block.length - 1].n, pericopeLast: passage?.last, chapterLast: all[all.length - 1].n });
    },
    [chapter, layout],
  );
  /** Copies from verse `n` to verse `last` and shows the row on it. */
  const reachTo = useCallback(
    (n: number, last: number) => {
      const u = unit(n, last === n ? undefined : last);
      if (!u) return;
      const refused = () => {
        const here = readerOf(window.location.hash);
        if (last === n) openVerse(n);
        else openVerseRange({ book: u.code, chapter: u.chapter, from: n, to: last, view: here.view, weave: here.weave });
      };
      put(u, refused, () => {
        setSaid(null);
        setHeld({ n, last, reference: copyReference(u) });
        touch();
      });
    },
    [unit, put, touch],
  );
  const heldEnds = held ? endsOf(held.n) : [];
  const heldUnit: EndUnit = heldEnds.find((e) => e.last === held?.last)?.unit ?? 'verse';
  return {
    said,
    row: held ? { said: `Copied ${held.reference}${held.note ? `. ${held.note}` : ''}`, ends: heldEnds.length > 1 ? heldEnds : [], unit: heldUnit } : null,
    held: held ? { first: held.n, last: held.last } : null,
    reach: (to) => {
      const end = held ? heldEnds.find((e) => e.unit === to) : undefined;
      if (held && end) reachTo(held.n, end.last);
    },
    share: () => {
      if (!held) return;
      const u = unit(held.n, held.last === held.n ? undefined : held.last);
      if (!u) return;
      const row = held;
      if (typeof navigator.share !== 'function') {
        setHeld({ ...row, note: NO_SHARE_NOTE });
        touch();
        return;
      }
      // the row goes when the sheet opens; a share the phone refuses (other than the sheet closed) leaves what was copied, said again
      closeRow();
      void navigator.share(sharePieces(u, format)[0].data).catch((error: unknown) => {
        if (!alive.current || (error instanceof DOMException && error.name === 'AbortError')) return;
        setHeld({ ...row, note: NO_SHARE_NOTE });
        touch();
      });
    },
    touch,
    closeRow,
    verse: (n) => reachTo(n, n),
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
