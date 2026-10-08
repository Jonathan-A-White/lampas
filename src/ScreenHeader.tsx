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
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex min-w-20 shrink-0 justify-end">{action}</div>
    </header>
  );
}

/** A text button in the header with a thumb-sized target. */
export function HeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 min-w-12 rounded-lg px-3 text-base font-medium text-accent">
      {children}
    </button>
  );
}
