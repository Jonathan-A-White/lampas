// src/data/startOfDay.ts — the start of the local day (his local midnight), the day boundary Memorize's early-practice rule and Today's Review progress share
// (the Reading plan and Today's ticks use the same day by its local date, dailyStore.ts localDate).

/** The local midnight (ms since the epoch) that begins the day `when` falls on. */
export const startOfDay = (when: number): number => {
  const d = new Date(when);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
