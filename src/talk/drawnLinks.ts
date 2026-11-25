// src/talk/drawnLinks.ts — the answer spoken by itself, as it arrives, says what is drawn (mw-fnvjof.17.319). The words 'tap the link below' are true only while a chip is drawn under the
// answer, and that is known only once the chips have loaded (src/TutorLinks.tsx, told to src/Talk.tsx's Turn, which reports it here). An answer that carries links and whose words point at
// one is therefore spoken when the Turn has said how many groups it drew: none, and the sentences that promise one are left out of the speech, as they are left out of the screen.
import { answerAsShown, promisesLink } from '../data/linkPromise';

/** The groups each turn drew, by the turn's id, once its links have answered. */
const known = new Map<number, number>();
const waiting = new Map<number, ((count: number) => void)[]>();

/** The turn `id` drew `count` groups of links (src/Talk.tsx's Turn tells it, as often as the count changes). */
export function reportDrawn(id: number, count: number): void {
  known.set(id, count);
  const asked = waiting.get(id);
  waiting.delete(id);
  asked?.forEach((resolve) => resolve(count));
}

/** How many groups the turn `id` drew: now if its Turn has said, else when it does (never, if its sheet is not open: the caller decides whether it is still wanted). */
function drawnOf(id: number): Promise<number> {
  const count = known.get(id);
  if (count !== undefined) return Promise.resolve(count);
  return new Promise((resolve) => waiting.set(id, [...(waiting.get(id) ?? []), resolve]));
}

/**
 * Hands `speak` the answer `id` as it is to be spoken. An answer with no link, or whose words point at none, goes at once, as written. One that carries `links` and points at a link
 * waits for its Turn to say what it drew, and goes without the sentences that promise a link when nothing was drawn. `drawn` false says no Turn is open to draw them (Hands-free's answer
 * with the sheet closed): they are left out at once.
 */
export function spokenAnswer(id: number, answer: string, links: number | undefined, speak: (words: string) => void, drawn = true): void {
  if (!links || !promisesLink(answer)) return speak(answer);
  if (!drawn) return speak(answerAsShown({ a: answer, linksUndrawn: true }));
  void drawnOf(id).then((count) => speak(answerAsShown({ a: answer, linksUndrawn: count === 0 })));
}
