// src/overDrill.ts — whether what is drawn stands over a drill (mw-indx1x6.29): the screens that run a drill (Drill it, the short drill, the Parsing drill) draw themselves inside
// `OverDrill`, so whatever opens over one (the lesson of a 'Study this' row, the idea sheet behind a word sheet's grammar term, the one a tutor's bridge opens) knows it without
// being told through each sheet between. The idea sheet (src/IdeaSheet.tsx) then draws no Drill it and no Try it on a verse: either would start a second run of questions over
// the drill he is in.
import { createContext, useContext } from 'react';

/** True inside a screen that runs a drill, its end card included. */
export const OverDrill = createContext(false);

/** Whether this is drawn over a drill. */
export const useOverDrill = (): boolean => useContext(OverDrill);
