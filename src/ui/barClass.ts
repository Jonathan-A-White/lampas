// src/ui/barClass.ts — the look of the wide bar (h-24, rounded-3xl), shared by the hold bar (ui/HoldBar.tsx) and the tap bar (ui/TapBar.tsx).
/** What a bar changes in a short window (sideways): a 56 px row of icon and label instead of the 96 px column, so the text above it keeps the room (mw-5r3p30.468). */
export const SHORT_BAR = 'short:h-14 short:flex-row short:gap-2';

/** The classes of the bar: the accent colour, or the alert colour while a hold listens. */
export function barClass(listening: boolean, compactWhenShort = false, roundWhenShort = false): string {
  // a compact bar with its label keeps clear room between the words and its rounded ends (mw-5r3p30.490); the round one has no label
  const compact = compactWhenShort ? `${SHORT_BAR} ${roundWhenShort ? '' : 'short:px-3 '}` : '';
  // in a short window a bar that gives its room to the field beside it is a round 56 px mic button (the label is hidden, the name stays)
  const round = roundWhenShort ? 'short:w-14 short:min-w-14 short:rounded-full short:p-0 ' : '';
  return `${compact}${round}mx-auto flex h-24 w-full max-w-xl touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl chrome-text font-semibold transition-colors [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-45 ${listening ? 'bg-bad text-canvas' : 'bg-accent text-accent-fg'}`;
}

