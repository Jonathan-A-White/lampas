// src/ui/barClass.ts — the look of the wide bar (h-24, rounded-3xl), shared by the hold bar (ui/HoldBar.tsx) and the tap bar (ui/TapBar.tsx).
/** The classes of the bar: the accent colour, or the alert colour while a hold listens. */
export function barClass(listening: boolean, compactWhenShort = false): string {
  return `${compactWhenShort ? 'short:h-14 short:flex-row short:gap-2 ' : ''}mx-auto flex h-24 w-full max-w-xl touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl text-[16px] font-semibold transition-colors [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-45 ${listening ? 'bg-bad text-canvas' : 'bg-accent text-accent-fg'}`;
}

