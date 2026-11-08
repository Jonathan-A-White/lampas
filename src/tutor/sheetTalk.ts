// src/tutor/sheetTalk.ts — what the floating ? asks about on a sheet that stands over the Talk sheet (mw-5r3p30.1122; his words, Postern general 2026-11-06: "the two finger tap should bring and remove tutor the question
// mark from every screen ... and then obviously it should get context right from that screen"). Such a sheet (Sermons, Maps, All lexicons, ...) draws a <DialogAskTutor> inside its own layer, so its Talk stands in front
// of it and the ? asks about the sheet (src/AskTutor.tsx), the pattern of Check and Try it (src/tutor/workTalk.ts). This is the part they share: the talk's key, one for each time the sheet is opened, and the screen it reports.
import { useState } from 'react';
import type { ScreenContext, ScreenFact } from './screen';
import { workKept, workScreen } from './workTalk';

/** What a sheet tells the tutor of itself: its name as the tutor hears it, a few facts (what is asked about and what the sheet shows; a fact with no value is left out) and the questions to suggest. */
export interface SheetTalk {
  name: string;
  facts: ReadonlyArray<ScreenFact | null>;
  suggestions: string[];
}

/** The props of a <DialogAskTutor> for a sheet: `kept` is chosen when the sheet opens, so its talk is never the last time's. */
export function useSheetTalk({ name, facts, suggestions }: SheetTalk): { kept: string; screen: ScreenContext; suggestions: string[] } {
  const [kept] = useState(() => workKept(name));
  return { kept, screen: workScreen(name, facts), suggestions };
}

/** A fact whose value is a list: the items joined, the first `most` of them, 'and N more' after. Null when the list is empty. */
export function listFact(label: string, items: readonly string[], most = 8): ScreenFact | null {
  if (items.length === 0) return null;
  const shown = items.slice(0, most).join('; ');
  return { label, value: items.length > most ? `${shown}; and ${items.length - most} more` : shown };
}
