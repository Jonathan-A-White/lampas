// src/ui/NextBar.tsx — where the button that moves on stands after he has answered (mw-5r3p30.377). A question screen draws it below the card inside its
// scroll box; NextBar is `sticky` at the box's foot, so it sits right under the card when the card fits and stays pinned to the bottom edge, in view, when
// the card and its feedback run past it: 'what next' is never below the fold. FootBar is the same bar for a full-screen dialog (Drill it) whose card scrolls
// above a footer of its own.
import type { ReactNode } from 'react';
import { useAiAllowed } from '../gate/licenceContext';
import { useBarShown } from '../speech/barShown';

/** The bar's look, shared: a hairline above, the screen's own background, a thumb's room at the sides. */
const LOOK = 'border-t border-line bg-canvas';

/** Under a bar the phone's own bar covers (a phone that does not report it too: --lp-bar-inset has a 48 px floor, src/index.css). */
const BELOW_PHONE_BAR = 'pb-[calc(0.5rem+var(--lp-bar-inset))]';

/**
 * The next step of a question screen, in the `.screen` box that holds the card (its px-4). Not drawn before there is a next step.
 * The round Ask the tutor button (src/AskTutor.tsx) would leave the box 72 px of its own below the bar; the bar takes that room itself instead (src/index.css
 * `[data-ask-beside]`): the button sits in the bar's right end and the button that moves on leaves it its room. `grid` is a row of two buttons (Quick test's
 * Next | Ask the tutor), which has no room to spare, so the button keeps its own row under it as ever; so does the speaking bar being up (it carries the button).
 * `where` is a bar in a box that is not a screen's, on the surface colour, with no round Ask button over it: 'view', the Verse view's scroll box (px-3, its hold bar
 * pinned under it) and 'sheet', a bottom sheet's (px-4, pb-3), as the Reading drill's.
 */
export function NextBar({ children, grid, where }: { children: ReactNode; grid?: boolean; where?: 'view' | 'sheet' }) {
  const ai = useAiAllowed();
  const speaking = useBarShown();
  if (where) {
    // a sheet's box pads its end (pb-3), which a sticky bar stops short of: the bar reaches down over it
    const place = where === 'view' ? 'bottom-0 -mx-3 px-3' : '-bottom-3 -mx-4 px-4 pb-3';
    return (
      <div data-next-bar className={`sticky z-1 mt-2 border-t border-line bg-surface py-2 ${place}`}>
        {children}
      </div>
    );
  }
  const beside = ai && !speaking && !grid;
  // sideways (a short window) the box has a gutter for the button and no bottom margin: the bar clears the phone's bar itself
  const room = !ai ? `px-4 ${BELOW_PHONE_BAR}` : beside ? `pl-4 pr-19 short:pr-4 pb-3 short:${BELOW_PHONE_BAR} ` : `px-4 pb-2 short:${BELOW_PHONE_BAR}`;
  return (
    <div data-next-bar data-ask-beside={beside ? '' : undefined} className={`sticky bottom-0 z-1 -mx-4 mt-2 pt-2 ${LOOK} ${room}${grid ? ' grid grid-cols-2 gap-3' : ''}`}>
      {children}
    </div>
  );
}

/** The foot of a full-screen dialog: pinned under the scrolling card, above the phone's bar. */
export function FootBar({ children }: { children: ReactNode }) {
  return <div className={`shrink-0 px-4 pt-2 ${BELOW_PHONE_BAR} ${LOOK}`}>{children}</div>;
}
