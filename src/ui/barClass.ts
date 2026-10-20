// src/ui/barClass.ts — the look of the tap bar (ui/TapBar.tsx): the same size, place and colour as the hold-to-talk bar (voice-kit's TalkBar, src/talk/Bars.tsx; `.lp-bar`).
/** h-24, Postern's bar height: 6 rem, which the root font scaling does not touch (spacing is divided by --lp-scale). */
export const BAR_HEIGHT_PX = 96;

/** What a bar changes in a short window (sideways): a 56 px row of icon and label instead of the 96 px column, so the text above it keeps the room (mw-5r3p30.468). */
export const SHORT_BAR = 'short:h-14 short:flex-row short:gap-2';

/** The classes of the tap bar: the accent colour. */
export function barClass(): string {
  return 'mx-auto flex h-24 w-full max-w-xl touch-none select-none flex-col items-center justify-center gap-1 rounded-3xl chrome-text font-semibold transition-colors [-webkit-touch-callout:none] disabled:cursor-not-allowed disabled:opacity-45 bg-accent text-accent-fg';
}
