// src/today/pieces.ts — what Today holds on a day, as the pieces that have a box (mw-1fwagb.6): 'review', 'memorize', 'plan', 'devotional' and a passage ('psa.5', 'pro.5') for each of the day's
// Psalms and Proverbs, each only while its Settings > Daily switch is On. The Reader's Today chip counts them ('Today · 2 of 6'); Today draws the same list.
import { dailyReadings } from '../data/daily/psalmsProverbs';

export interface DailySwitches {
  review: string;
  plan: string;
  psalms: string;
  devotional: string;
  memorize: string;
}

/** The ids of the pieces with a box on `today`, in the order Today draws them. `devotionalDrawn` is whether Today draws a devotional (devotionalToday gave one): with Logos Off and a Logos book
 *  chosen it draws none, so the switch being On leaves no box (mw-r9xo1pj.6). */
export function todayPieces(on: DailySwitches, today: Date, devotionalDrawn = true): string[] {
  return [
    ...(on.review === 'on' ? ['review'] : []),
    ...(on.memorize === 'on' ? ['memorize'] : []),
    ...(on.plan === 'on' ? ['plan'] : []),
    ...(on.psalms === 'on' ? dailyReadings(today).map((r) => `${r.code}.${r.chapter}`) : []),
    ...(on.devotional === 'on' && devotionalDrawn ? ['devotional'] : []),
  ];
}

/** How many of `pieces` he has ticked. */
export const tickedCount = (pieces: readonly string[], ticked: readonly string[]): number => pieces.filter((p) => ticked.includes(p)).length;
