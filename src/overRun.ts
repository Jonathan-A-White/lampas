// src/overRun.ts — the one guard of what is drawn over a run (mw-indx1x6.57; it takes in mw-indx1x6.28's `overRun` flag and mw-indx1x6.29's src/overDrill.ts). A run is a round of
// questions held only by the component that draws it: Drill it, the short drill and the Parsing drill, each with its end card, and the end card of a Review. A sheet written for a
// plain screen (the idea sheet, the word sheet, the tutor's Talk with its link chips) is also opened over one, from a 'Study this' row or a Study list, and there a link to a page of
// its own (anything that changes window.location.hash: a table, the Reader, Settings, the Library, a Help page, a Hard sounds lesson) takes the screen and the run with it, and a
// button that starts a run of its own (Drill it, the level slider's 'I know it', Try it on a verse) buries the run under a second one.
//
// The screens that hold a run draw themselves inside `OverRun` (tests/unit/over-run.test.ts keeps them to it), and so does what a Study row opens where a table opens as a layer
// (src/review/useStudyPlaces.tsx). Everything drawn there, however deep, reads it through `useOffRun`, the ONE guard: a control that leaves the page or starts a run is offered through
// it and is not drawn over a run. Review's own row is not over a run: Review keeps its round (src/review/keptRound.ts), so there a link to a page is as ever.
import { createContext, useCallback, useContext } from 'react';

/** True inside a screen that holds a run, its end card included, and inside what a Study row opens over one. */
export const OverRun = createContext(false);

/** What `useOffRun` gives: `offered` on a plain screen; over a run `kept`, what does the same without leaving (a layer over the run), or nothing. */
export type OffRun = <T>(offered: T, kept?: T) => T | undefined;

/**
 * The one guard of a control that would leave the page or start a second run. `const offRun = useOffRun()`, then `offRun(opener)` is the opener on a plain screen and undefined over
 * a run, and a control with no opener is not drawn (never drawn and dead); `offRun(opener, inLayer)` keeps the control over a run with what opens the same place as a layer.
 * It takes any value, not only a function: the list of tables to link, the passage Try it on a verse needs, `true` for a block of controls.
 */
export function useOffRun(): OffRun {
  const overRun = useContext(OverRun);
  return useCallback(<T>(offered: T, kept?: T): T | undefined => (overRun ? kept : offered), [overRun]);
}
