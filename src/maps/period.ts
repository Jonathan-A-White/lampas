// src/maps/period.ts — a map's dates as a card shows them. Years are integers, negative for BC (there is no year 0).
// One date in BC is 'c. 2070 BC'; a span in BC '1010 to 970 BC'; one date in AD 'AD 30' (the New Testament's dates are firmer, so no 'c.'); a span in AD
// 'AD 27 to 30'; a span across the turn '5 BC to AD 30'. A map with a start and no end is one date; one with neither has no period.

const bc = (year: number): string => String(-year);

export function period(start: number | undefined, end?: number): string {
  if (start === undefined) return '';
  const last = end ?? start;
  const [from, to] = start <= last ? [start, last] : [last, start];
  if (from < 0 && to < 0) return from === to ? `c. ${bc(from)} BC` : `${bc(from)} to ${bc(to)} BC`;
  if (from >= 0 && to >= 0) return from === to ? `AD ${from}` : `AD ${from} to ${to}`;
  return `${bc(from)} BC to AD ${to}`;
}
