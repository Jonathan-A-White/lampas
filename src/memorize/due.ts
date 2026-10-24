// src/memorize/due.ts — when a verse is next due, in the words the session ends on (docs/layout/memorize.md): 'Due tomorrow', 'Due Friday' within the week, else the date.
const startOfDay = (when: number): number => {
  const d = new Date(when);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** 'Due today' (due now or already), 'Due tomorrow', 'Due <weekday>' up to six days on, else 'Due <date>' (with the year when it is not this one). */
export function dueWords(due: number, now: number): string {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  const when = new Date(due);
  if (days < 7) return `Due ${when.toLocaleDateString('en-US', { weekday: 'long' })}`;
  const sameYear = when.getFullYear() === new Date(now).getFullYear();
  return `Due ${when.toLocaleDateString('en-US', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })}`;
}
