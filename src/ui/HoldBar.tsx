// src/ui/HoldBar.tsx — the one hold-to-talk control, Postern's bar (postern src/cockpit/TalkLineScreen.tsx, the button under the
// model switch: h-24 w-full max-w-xl rounded-3xl, a 26 px microphone over a 16 px semibold label, the accent colour, the alert
// colour while it listens). The Talk sheet, the reader's foot Talk bar and the reading check's Read buttons are all this
// component (docs/pwa-best-practices.md section 12: every hold-to-talk control is Postern's bar), and so is Hold to hear on the
// Quick test and Review, which changes only the icon (a speaker); only a Read button beside each verse stays small, because a bar per verse cannot fit in the text. What the press does is the caller's:
// `hold` is useHoldPress's handlers, `holdMs` its delay (0 = a hold from the first touch).
import type { ReactNode } from 'react';
import { type HoldHandlers, useHoldPress } from './holdPress';

/** h-24, Postern's bar height: 6 rem, which the root font scaling does not touch (spacing is divided by --lp-scale). */
export const HOLD_BAR_HEIGHT_PX = 96;

export function MicIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function HoldBar({ hold, holdMs, name, label, icon = <MicIcon />, testId, listening = false, disabled = false, keys = false, compactWhenShort = false }: {
  hold: HoldHandlers;
  holdMs?: number;
  /** the accessible name, which stays the same while the label changes */
  name: string;
  /** what the bar says now */
  label: string;
  /** the icon over the label: the microphone unless the hold is not talking (Hold to hear has a speaker) */
  icon?: ReactNode;
  testId?: string;
  /** a hold is going on: the alert colour */
  listening?: boolean;
  disabled?: boolean;
  /** Space or Enter held works as a hold (a bar that is a hold from the first touch) */
  keys?: boolean;
  /** in a short window (a phone held sideways) the bar is a row 56 px high, the icon beside the label (a sheet that needs the height for its text) */
  compactWhenShort?: boolean;
}) {
  const press = useHoldPress(hold, holdMs);
  return (
    <button
      type="button"
      data-hold-bar=""
      data-testid={testId}
      aria-label={name}
      aria-pressed={listening}
      disabled={disabled}
      {...press}
      {...(keys
        ? {
            onClick: undefined,
            onKeyDown: (e) => {
              if (e.key !== ' ' && e.key !== 'Enter') return;
              e.preventDefault();
              if (!e.repeat) hold.onHold();
            },
            onKeyUp: (e) => {
              if (e.key === ' ' || e.key === 'Enter') hold.onRelease();
            },
          }
        : {})}
      className={`${compactWhenShort ? 'short:h-14 short:flex-row short:gap-2 ' : ''}mx-auto flex h-24 w-full max-w-xl touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl text-[16px] font-semibold transition-colors [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-45 ${listening ? 'bg-bad text-canvas' : 'bg-accent text-accent-fg'}`}
    >
      {icon}
      <span aria-hidden="true">{label}</span>
    </button>
  );
}
