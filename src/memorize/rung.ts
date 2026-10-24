// src/memorize/rung.ts — how much of a verse is shown when he recalls it, from where the verse is on the schedule (his Q1, mw-fu7dqf.4): a new verse starts with read and say,
// a verse he knows starts with more words gone, the long check is from nothing. PROVISIONAL: the Mayor's table, the Governor to confirm.
import { RARE_STEP } from '../data/schedule';

/** 'read': the whole verse shown and read aloud; 'gaps': `share` of the words gone (a blank the width of the word; at share 1 the first letter of each is left); 'nothing': only the reference. */
export interface Rung {
  kind: 'read' | 'gaps' | 'nothing';
  share: number;
}

const GAPS = [0, 0.25, 0.5, 0.75, 1, 1];

/** The rung at a step: 0 read, 1 a quarter gone, 2 half, 3 three quarters, 4 and 5 all gone with first letters, the rare check (RARE_STEP) from nothing. */
export function rungFor(step: number): Rung {
  if (step >= RARE_STEP) return { kind: 'nothing', share: 1 };
  const at = Math.max(0, Math.trunc(step));
  return at === 0 ? { kind: 'read', share: 0 } : { kind: 'gaps', share: GAPS[at] };
}

const GAP_NAMES = new Map([
  [0.25, 'A quarter of the words gone'],
  [0.5, 'Half the words gone'],
  [0.75, 'Three quarters of the words gone'],
  [1, 'All the words gone'],
]);

/** What the screen calls a rung. */
export function rungName(rung: Rung): string {
  if (rung.kind === 'read') return 'Read and say';
  if (rung.kind === 'nothing') return 'From nothing';
  return GAP_NAMES.get(rung.share) ?? 'Some of the words gone';
}
