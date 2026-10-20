// src/ReaderControls.tsx — the Reader's actions that are otherwise a gesture, each as a button with a name (mw-cwf538.4, the epic 'Lampas for every age and every
// ability'; docs/accessibility.md 'Gesture-only actions'): the two-finger tap that shows or puts away the Immersive reader's bars, going in and out of the
// Immersive reader (Settings > Immersive reader), and with Turn pages the tap on the outer thirds and the swipe that turn a page. They are out of sight (one
// pixel, clipped: `.reveal-on-focus` in src/index.css) until the keyboard or a screen reader's focus reaches one, and then the row shows at the top of the
// screen: a sighted reader on a touch screen sees nothing new, and TalkBack finds them as buttons. A button that changes what it is (Leave / Start immersive
// reading) stays the same element, so focus stays on it.
import { setImmersive } from './data/repositories';
import { announce } from './ui/live';

const BUTTON = 'min-h-11 rounded-xl border border-line bg-surface px-4 text-base font-medium text-accent active:bg-line aria-disabled:text-muted';

export interface PageControls {
  /** the page shown, from 1 */
  page: number;
  count: number;
  /** a chapter stands before this one, and one after it: the first page turns back, and the last forward, into it (mw-5r3p30.620) */
  chapterBefore: boolean;
  chapterAfter: boolean;
  turn(by: 1 | -1): void;
}

export function ReaderControls({ immersive, away, onBars, pages, inert }: {
  immersive: boolean;
  /** the Immersive reader's bars are out of view */
  away: boolean;
  /** shows the bars if away, puts them away if shown (the two-finger tap) */
  onBars(): void;
  /** with Turn pages: the page and its turning */
  pages: PageControls | null;
  /** a sheet is open over the Reader: nothing here is reachable */
  inert: boolean;
}) {
  const bars = () => {
    announce(away ? 'The bars are back' : 'The bars are away');
    onBars();
  };
  const mode = () => {
    announce(immersive ? 'Immersive reading is off' : 'Immersive reading is on');
    void setImmersive(immersive ? 'off' : 'on');
  };
  const turn = (by: 1 | -1) => {
    if (pages) pages.turn(by);
  };
  return (
    <div role="group" aria-label="Reading controls" inert={inert} data-reader-controls className="reveal-on-focus">
      {pages ? (
        <>
          <button type="button" aria-disabled={pages.page <= 1 && !pages.chapterBefore ? true : undefined} onClick={() => turn(-1)} className={BUTTON}>
            Previous page
          </button>
          <button type="button" aria-disabled={pages.page >= pages.count && !pages.chapterAfter ? true : undefined} onClick={() => turn(1)} className={BUTTON}>
            Next page
          </button>
        </>
      ) : null}
      {immersive ? (
        <button type="button" onClick={bars} className={BUTTON}>
          {away ? 'Show the bars' : 'Put the bars away'}
        </button>
      ) : null}
      <button type="button" onClick={mode} className={BUTTON}>
        {immersive ? 'Leave immersive reading' : 'Start immersive reading'}
      </button>
    </div>
  );
}
