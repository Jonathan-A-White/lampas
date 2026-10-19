// src/data/grammar/hint.ts — a Hint on a multiple-choice grammar question (Drill it, mw-5r3p30.349): which wrong answers it takes away and the
// line that says so. Pure; DrillItScreen decides them, GrammarCard draws them.

/**
 * The wrong answers a Hint takes away: half of them, rounded up, the far ones first and a near miss of the point the question tests (`near`, src/data/choices.ts,
 * mw-i7xe0n.7) last, so a hinted question still asks the point (χάρις keeps HYA-rees). An option spelt like the right one is not wrong.
 */
export function hintTakes(options: readonly string[], right: string, near: readonly string[] = []): Set<number> {
  const wrong = options.flatMap((o, i) => (o === right ? [] : [i]));
  const far = [...wrong.filter((i) => !near.includes(options[i])), ...wrong.filter((i) => near.includes(options[i]))];
  return new Set(far.slice(0, Math.ceil(wrong.length / 2)));
}

/** The line under the question once a Hint has been taken: 'Hint: 2 wrong answers taken away'. */
export const hintLine = (count: number): string => `Hint: ${count} wrong ${count === 1 ? 'answer' : 'answers'} taken away`;

/** The feedback on a right answer after a Hint: a hinted right does not count (drillIt.ts answer), so the walk stays on its step and asks the same side of a sound rule again, and the card says why (mw-5r3p30.431, mw-i7xe0n.23). */
export const HINTED_RIGHT = 'Right. With a Hint it does not count toward Proved, so you stay on this step.';
