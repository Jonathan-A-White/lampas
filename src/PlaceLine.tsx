// src/PlaceLine.tsx — the one quiet line at the foot of the Reader's text (mw-5r3p30.298): the book and chapter and where he is in it, like a Kindle's
// "Page 9 of 187 · 12%". While the Immersive reader has its bars away it says how far through the chapter's text he has scrolled ('Mark 12 · 45%'); with
// Turn pages (Settings > Reading, mw-5r3p30.299) it is always there, right under the text, and says the page ('Mark 12 · Page 2 of 7'). It is a row
// of its own under the text's box, so it covers no text; small and dim. The CSS is `.place-line` in src/index.css.
//
// The row slides in and out with the bars, in the same 200 ms (the bars' own, src/Away.tsx): it must not vanish at once when the bars come back, or the text's box grows by
// the row for a moment before the bars shrink it, and a text scrolled to its end is clamped back by the row's height (mw-5r3p30.472). It is drawn from
// the moment it is wanted until it has slid out, and then it is not in the page at all.
//
// Its foot keeps the phone's bottom floor (`floor`, --lp-bar-inset) when it is the lowest thing on the screen, because Android Chrome does not always report
// the navigation bar (mw-5r3p30.473); the Talk bar and the speaking bar keep the floor themselves when they are.
//
// With Turn pages the row also holds the room the Reader keeps for the round Ask button (`room`, mw-5r3p30.610): the line is at its top, right under the
// text, and the button sits beside it in the rest, so a page ends a line or less above the line and not above a blank band of the button's room. The
// line keeps the room's width clear at each side (the button's 12 px, 56 px and 4 px of air), so a long title wraps rather than runs under the button. A
// room of 0px (the bars away) slides shut with the bars, as the box's margin does with Scroll.
//
// A tap on the line opens the whole chapter in the view a section heading opens (`onOpen`, mw-5r3p30.699). The line is then a button with the row's own
// type, padding and place, so it is no bigger than it was; an underline is all that says it can be tapped, as a heading's active tint does.
// Its tap area is 44 px tall (--lp-tap, mw-5r3p30.703), a hit box that paints nothing and reaches above the row, so the row is not clipped once it has slid in.
import { useEffect, useState } from 'react';

/** How long the row takes to slide: `.place-box` in src/index.css. */
const SLIDE_MS = 200;

export function PlaceLine({ title, at, visible = true, floor = false, room, onOpen }: { title: string; at: string; visible?: boolean; floor?: boolean; room?: string; onOpen?: () => void }) {
  // `drawn`: in the page, from the moment it is wanted until it has slid out. A row wanted while the page is up slides in (`slides`, a CSS animation that
  // starts with the bars' own slide, so the box never grows past its end); one drawn with the Reader is at full height from the start.
  const [drawn, setDrawn] = useState(visible);
  const [slides, setSlides] = useState(false);
  // adjusting state while rendering: the row is in the page as soon as it is wanted
  if (visible && !drawn) {
    setDrawn(true);
    setSlides(true);
  }
  useEffect(() => {
    if (visible) return undefined;
    const gone = setTimeout(() => setDrawn(false), SLIDE_MS);
    return () => clearTimeout(gone);
  }, [visible]);
  // the slide is over after SLIDE_MS: the row is then no longer clipped, so the line's tap area can reach above it (`.place-box` in src/index.css)
  useEffect(() => {
    if (!slides) return undefined;
    const over = setTimeout(() => setSlides(false), SLIDE_MS);
    return () => clearTimeout(over);
  }, [slides]);
  if (!drawn) return null;
  return (
    <div className="place-box" style={room ? { minHeight: room } : undefined} data-slides={slides ? '' : undefined} data-closed={visible ? undefined : ''} aria-hidden={visible ? undefined : true} inert={!visible}>
      <div className="place-inner">
        {onOpen ? (
          <button type="button" onClick={onOpen} data-place-line data-tap data-floor={floor ? '' : undefined} style={room ? { paddingInline: `max(1rem, ${room})` } : undefined} className="place-line block w-full">
            <span className="underline decoration-dotted underline-offset-2">
              {title} · {at}
            </span>
          </button>
        ) : (
          <p data-place-line data-floor={floor ? '' : undefined} style={room ? { paddingInline: `max(1rem, ${room})` } : undefined} className="place-line">
            {title} · {at}
          </p>
        )}
      </div>
    </div>
  );
}
