// src/ui/barClass.ts — the look of the wide bar (h-24, rounded-3xl), shared by the hold bar (ui/HoldBar.tsx) and the tap bar (ui/TapBar.tsx).
/** The classes of the bar: the accent colour, or the alert colour while a hold listens. */
export function barClass(listening: boolean, compactWhenShort = false, roundWhenShort = false): string {
  const compact = compactWhenShort ? 'short:h-14 short:flex-row short:gap-2 ' : '';
  // in a short window a bar that gives its room to the field beside it is a round 56 px mic button (the label is hidden, the name stays)
  const round = roundWhenShort ? 'short:w-14 short:min-w-14 short:rounded-full short:p-0 ' : '';
  return `${compact}${round}mx-auto flex h-24 w-full max-w-xl touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl text-[16px] font-semibold transition-colors [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-45 ${listening ? 'bg-bad text-canvas' : 'bg-accent text-accent-fg'}`;
}

