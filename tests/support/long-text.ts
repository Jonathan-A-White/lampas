// tests/support/long-text.ts — a question of an exact length, spoken-looking (words and spaces, one full stop at the end), for the specs and features that
// carry a long spoken or pasted question to the tutor (mw-5r3p30.601).

const SENTENCE = 'Why does Paul say that all things work together for good for those who love God, and how should I pray about it today? ';

/** `length` characters of plain words ending in a full stop (no trailing space, so what is sent is what is shown). */
export function longQuestion(length: number): string {
  const unit = SENTENCE.repeat(Math.ceil(length / SENTENCE.length));
  return unit.slice(0, length - 1).trimEnd().padEnd(length - 1, 'x') + '.';
}
