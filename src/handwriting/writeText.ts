// src/handwriting/writeText.ts — what Write it says and how its buttons look (mw-86e9r1.51), shared by the card, the lesson's screen and the letter drill.

/** What the first Write it says: a memory aid, never a goal. */
export const WHY_LINES = ['Writing a letter by hand helps it stick.', 'You never need to write Greek to read the Bible.'];

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';
export const WRITE_PRIMARY = `${BUTTON} border-accent bg-accent text-accent-fg disabled:border-line disabled:bg-surface disabled:text-muted`;
export const WRITE_PLAIN = `${BUTTON} border-line text-accent active:bg-line disabled:text-muted`;
