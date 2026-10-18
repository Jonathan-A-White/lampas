import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Under the title, such as the count line. */
  subtitle?: ReactNode;
  /** The back button, on the left. */
  back: ReactNode;
  /** An action on the right. */
  action?: ReactNode;
}

/** The bar at the top of a screen: back on the left, the title, an action on the right. */
export function ScreenHeader({ title, subtitle, back, action }: Props) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-2">
      <div className="shrink-0">{back}</div>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="chrome-title font-semibold">{title}</h1>
        {subtitle ? <p className="chrome-small text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex min-w-20 shrink-0 justify-end">
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
