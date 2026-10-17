// src/chipStyle.ts — the classes of a chip in the Reader's row under the header (src/ReaderChips.tsx): the row is 40 px, a chip fills it,
// the text keeps the phone's own size (chrome-small) and never wraps.
const CHIP_BASE = 'chrome-small flex h-full items-center whitespace-nowrap rounded-lg px-3 font-semibold text-accent active:bg-line';
export const CHIP = `${CHIP_BASE} shrink-0`;
/** A chip that may give way when the row is tight (the Plan chip's name is cut with an ellipsis rather than the row scrolling). */
export const CHIP_SHRINKS = `${CHIP_BASE} min-w-0 shrink`;
export const CHIP_ACCENT = 'bg-accent/10';
export const CHIP_PLAIN = 'border border-line bg-surface';
