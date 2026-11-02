// src/tutor/workTalk.ts — what the tutor is told on a screen he works in that is no route and not a drill's results (mw-5r3p30.955, docs/ask-tutor.md 'Talk from a working screen'): the letter drill, Check
// on a passage lesson, Try it on a verse. Each draws a DialogAskTutor inside itself (so its Talk stands in front of the full-screen layer, z-40, and the floating ? asks about it), and reports the screen's name
// and a few facts: the lesson, how far he is, and the question on screen (what is asked and the Greek it is about, never the right answer or the options). Pure: the screens call it, src/AskTutor.tsx sends it.
import type { GrammarQuestion } from '../data/grammar/questions';
import { askedOf } from './drillTalk';
import type { ScreenContext, ScreenFact } from './screen';

/** The names the working screens go by. */
export const LETTER_DRILL_SCREEN = 'Letter drill';
export const CHECK_SCREEN = 'Check';
export const TRY_IT_SCREEN = 'Try it';

/** The key a working screen's talk is kept under: one for each time it is opened, so a run's talk is never the last run's (as Drill it's). */
export const workKept = (name: string, at: number = Date.now()): string => `screen.work.${name.toLowerCase().replace(/\W+/g, '-')}.${at}`;

/** The question on screen as a fact: what is asked and the Greek it is about. Nothing when no question is up. */
export const questionFact = (question: GrammarQuestion | null | undefined): ScreenFact[] => (question ? [{ label: 'Question on screen', value: askedOf(question) }] : []);

/** The screen a working screen reports. Facts with no value are left out. */
export function workScreen(name: string, facts: ReadonlyArray<ScreenFact | null>): ScreenContext {
  return { name, facts: facts.filter((f): f is ScreenFact => f !== null && f.value.trim() !== '') };
}

/** The questions the sheet opens with on a working screen: `what` is how the screen is named in a sentence ('this letter drill', 'this Check'). */
export const workSuggestions = (what: string): string[] => [`Can you explain the question on screen in ${what}?`, `What should I look at in ${what}?`];
