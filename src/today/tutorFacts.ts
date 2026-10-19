// src/today/tutorFacts.ts — what Today tells the tutor (mw-1fwagb.7, the grilling mw-6ww.126 Q5): the local date, the pieces that are On and the pieces he opened today, by name,
// so the tutor knows what he is probably going to talk about. Pure: Today reads the day (dailyStore.ts getDay: only that date's opened list) and the plan's and the devotional's names.
import type { ScreenFact } from '../tutor/screen';

/** A Psalms and Proverbs passage as Today names it: 'Psalm 5', 'Proverbs 5'. */
export const passageName = (code: string, chapter: number): string => `${code === 'psa' ? 'Psalm' : 'Proverbs'} ${chapter}`;

/** The names of the two pieces whose name is not in their id: the plan's next chapter and the day's devotional. */
export interface PieceNames {
  plan?: string;
  devotional?: string;
}

/** The names of the pieces whose link he opened ('review', 'plan', 'devotional', 'psa.5'), in the order he opened them; a piece it cannot name is left out. */
export function openedTitles(opened: readonly string[], names: PieceNames): string[] {
  const titles: string[] = [];
  for (const id of opened) {
    const passage = /^(psa|pro)\.(\d+)$/.exec(id);
    const title = id === 'review' ? 'Review' : id === 'plan' ? names.plan : id === 'devotional' ? names.devotional : passage ? passageName(passage[1], Number(passage[2])) : undefined;
    if (title) titles.push(title);
  }
  return titles;
}

/** The facts Today reports: the local date, what is On, the reading plan's next chapter when a plan is started (he can move it, src/plan/PlacePicker.tsx), the chapters of it he read today as ranges ('1 Peter 1-5, 2 Peter 1-3', 'nothing yet'; mw-5r3p30.630) and what he opened today ('nothing yet' before he opens one). */
export function todayFacts({ date, on, opened, plan, readToday }: { date: string; on: readonly string[]; opened: readonly string[]; plan?: string; readToday?: readonly string[] }): ScreenFact[] {
  return [
    { label: 'Date', value: date },
    { label: 'On Today', value: on.join(', ') || 'nothing' },
    ...(plan ? [{ label: 'Reading plan', value: `Next: ${plan}` }, { label: 'Read today', value: readToday?.join(', ') || 'nothing yet' }] : []),
    { label: 'Opened today', value: opened.join(', ') || 'nothing yet' },
  ];
}
