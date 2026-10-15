// The count under a text box with a limit (mw-5r3p30.413): a box never cuts what he pastes, it keeps it whole and says 'N of M' once the
// text is near the limit, in the warning colour and with the reason once it is over, so the button that sends it can be off and say why.
import type { ReactNode } from 'react';

/** The share of the limit at which the count first shows. */
const NEAR = 0.9;

export function LengthNote({ id, text, max, what, className = '', children }: {
  id: string;
  text: string;
  max: number;
  /** what is too long, for the reason: 'question', 'approach' */
  what: string;
  className?: string;
  children?: ReactNode;
}) {
  const length = text.trim().length;
  if (length <= max * NEAR) return null;
  const over = length > max;
  return (
    <p id={id} role="status" data-length-note className={`break-words text-sm ${over ? 'font-medium text-bad' : 'text-muted'} ${className}`}>
      {length} of {max}
      {over ? `: the ${what} is too long to send. Shorten it; nothing has been cut.` : ''}
      {children}
    </p>
  );
}
