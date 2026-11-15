import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Under the title, such as the count line. */
  subtitle?: ReactNode;
  /** The back button, on the left. */
  back: ReactNode;
  /** An action on the right. */
  action?: ReactNode;
  /** The action is a short line of text, not a button: it takes only the room it needs, not the 80 px a button's column holds, and the bar's gaps and sides are 4 px, not 8: with a long back label ('‹ Study resources' beside 'Sermon sources') the count would else drop to a second line at 390 px (mw-qtu3zvz.149). */
  slimAction?: boolean;
}

/** The bar at the top of a screen: back on the left, the title, an action on the right. The title never gives up its room to the buttons: at the phone's
 * largest text (200%, mw-cwf538.5) what does not fit one row drops to the next, rather than the title being squeezed out; an action too wide for the title's
 * row (the paradigm table's How much of a table, mw-irpgqi.2) drops to a row of its own, at the right (ml-auto; on the title's row the title's flex-1 takes the room). */
export function ScreenHeader({ title, subtitle, back, action, slimAction }: Props) {
  return (
    <header className={slimAction ? 'flex shrink-0 flex-wrap items-center gap-1 border-b border-line px-1 py-2' : 'flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-2'}>
      <div className="shrink-0">{back}</div>
      <div className="max-w-full min-w-max flex-1 text-center">
        <h1 className="chrome-title font-semibold">{title}</h1>
        {subtitle ? <p className="chrome-small text-muted">{subtitle}</p> : null}
      </div>
      <div className={slimAction ? 'ml-auto flex shrink-0 justify-end pr-1' : 'ml-auto flex min-w-20 shrink-0 justify-end'}>
        {action}
      </div>
    </header>
  );
}

/** A text button in the header with a thumb-sized target. The second click of a double tap (detail 2) is dropped: it would land on the next screen's own
 * header button, which sits at the same spot, and take him a screen further than he meant. */
export function HeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={(event) => event.detail < 2 && onClick()} className="min-h-12 min-w-12 rounded-lg px-3 chrome-text font-medium text-accent">
      {children}
    </button>
  );
}
