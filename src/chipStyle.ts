// src/chipStyle.ts — the classes of a chip in the Reader's row under the header (src/ReaderChips.tsx): the row is 40 px, a chip fills it,
// the text keeps the phone's own size (chrome-small) and never wraps; a chip never shrinks below its text (shrink-0), the row scrolls sideways instead (mw-5r3p30.617).
const CHIP_BASE = 'chrome-small flex h-full items-center whitespace-nowrap rounded-lg px-3 font-semibold text-accent active:bg-line';
export const CHIP = `${CHIP_BASE} shrink-0`;
export const CHIP_ACCENT = 'bg-accent/10';
export const CHIP_PLAIN = 'border border-line bg-surface';
