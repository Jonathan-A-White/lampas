// src/sermons/plainDate.ts — a sermon's date in plain words for the Sermons sheet's second line.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A date as a sermon's source knows it ('1889-07-07', '1889-07', '1889') in plain words: '7 Jul 1889', 'Jul 1889', '1889'; text that is none of these is shown as it is. */
export function plainDate(date: string): string {
  const parts = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(date);
  if (!parts) return date;
  const [, year, month, day] = parts;
  const name = month === undefined ? undefined : MONTHS[Number(month) - 1];
  if (month !== undefined && name === undefined) return date;
  return [day === undefined ? undefined : String(Number(day)), name, year].filter((p) => p !== undefined).join(' ');
}
