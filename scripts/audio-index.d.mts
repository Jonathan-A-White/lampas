// Types for scripts/audio-index.mjs, which the tests import.
export const EDITION: string;
export const VOICE: string;
export const INDEX_DIR: string;
/** The text of the index the book files in `dir` make; throws, naming the file, when one is not a book's timings. */
export function indexText(dir?: string): string;
/** Writes the index of `dir` (untouched when already right); returns its path. */
export function writeIndex(dir?: string): string;
/** null when index.json in `dir` is what the book files make, else what is wrong. */
export function checkIndex(dir?: string): string | null;
