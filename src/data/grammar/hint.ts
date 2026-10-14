// src/data/grammar/hint.ts — a Hint on a multiple-choice grammar question (Drill it, mw-5r3p30.349): which wrong answers it takes away and the
// line that says so. Pure; DrillItScreen decides them, GrammarCard draws them.

/** The wrong answers a Hint takes away: the first half of them, rounded up. An option spelt like the right one is not wrong. */
export function hintTakes(options: readonly string[], right: string): Set<number> {
  const wrong = options.flatMap((o, i) => (o === right ? [] : [i]));
  return new Set(wrong.slice(0, Math.ceil(wrong.length / 2)));
}

/** The line under the question once a Hint has been taken: 'Hint: 2 wrong answers taken away'. */
export const hintLine = (count: number): string => `Hint: ${count} wrong ${count === 1 ? 'answer' : 'answers'} taken away`;
