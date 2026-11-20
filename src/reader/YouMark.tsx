// src/reader/YouMark.tsx — the plural mark of Brenton's "ye" in a Septuagint chunk's English (mw-u2w5klk.378). LXX2012 writes the old plural as "you^" ("like you-all, y'all", its intro); the caret stays in the
// text and is drawn here as a small raised mark that is a tap target of its own, whose tap shows what it means (SEPTUAGINT_YOU_TIP). The chunk around it is a Tap, so the mark keeps its tap, its keys and its
// press to itself, and the word beside it is the chunk's, as ever. A tap anywhere else, Escape or a scroll closes the tip.
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { chunkShown, SEPTUAGINT_YOU_TIP, splitYouMarks } from './septuagint';

/** How wide the tip may be and how far it stays from the window's edges, in px. */
const TIP_WIDTH = 256;
const EDGE = 8;

/** One plural mark: 44 px tall to touch (vertical padding, as Tap's TAP_PAD: the mark itself is a few px wide), raised, with the tip over it while it is open. */
function Mark({ mark }: { mark: string }) {
  const [at, setAt] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const button = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const open = at !== null;
  useEffect(() => {
    if (!open) return;
    const close = () => setAt(null);
    const away = (e: Event) => {
      const target = e.target as Node | null;
      if (target && (button.current?.contains(target) || tip.current?.contains(target))) return;
      close();
    };
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);
  const toggle = () => {
    if (open || !button.current) return setAt(null);
    const box = button.current.getBoundingClientRect();
    const width = Math.min(TIP_WIDTH, window.innerWidth - 2 * EDGE);
    const left = Math.max(EDGE, Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - EDGE));
    // over the mark where there is room for the tip above it, else under it
    const above = box.top > 96;
    setAt({ left, top: above ? box.top : box.bottom, above });
  };
  // the chunk around the mark is a Tap: its press, click and keys are the chunk's, so the mark takes its own
  const own = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <>
      <span
        ref={button}
        role="button"
        tabIndex={0}
        aria-label="you, plural: what this mark means"
        aria-expanded={open}
        data-you-mark=""
        onPointerDown={(e: PointerEvent) => own(e)}
        onClick={(e: MouseEvent) => {
          own(e);
          toggle();
        }}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          own(e);
          toggle();
        }}
        className="cursor-pointer rounded px-0.5 py-[calc((var(--lp-tap)-1em)/2)] align-super text-[0.7em] font-semibold leading-none text-accent"
      >
        {mark}
      </span>
      {at
        ? createPortal(
            <span
              ref={tip}
              role="status"
              data-you-tip=""
              lang="en"
              style={{ left: at.left, top: at.top, width: Math.min(TIP_WIDTH, window.innerWidth - 2 * EDGE), transform: at.above ? 'translateY(-100%)' : undefined }}
              className="fixed z-40 block rounded-lg border border-line bg-surface px-3 py-2 font-sans text-sm font-normal not-italic leading-snug text-fg shadow-lg"
            >
              {SEPTUAGINT_YOU_TIP}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * The text of a Septuagint English chunk with its plural marks drawn (the text as the English view shows it: `chunkShown`). `gaps` undefined is a text that is not the Septuagint, which is never touched;
 * `still` draws the mark as text, for a verse on a card where nothing is tapped.
 */
export function EnglishText({ text, gaps, still }: { text: string; gaps: boolean | undefined; still?: boolean }): ReactNode {
  const shown = chunkShown(text, gaps);
  if (gaps === undefined || (!shown.includes('⌃') && !shown.includes('^'))) return shown;
  return splitYouMarks(shown).map((piece, i) => (piece.mark && !still ? <Mark key={i} mark={piece.text} /> : piece.text));
}
