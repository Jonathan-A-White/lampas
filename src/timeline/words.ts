// src/timeline/words.ts — a mark's years in words (mw-fnvjof.17.317.2, docs/timeline-design.md 'The card' and 'Touch targets'; ported from prototypes/timeline/timeline.js): what the
// button over an event or a life is named with ('Prophecies of Isaiah, about 759 to 697 BC'), and what the strip says of where it stands. 'about' wherever the data gives a year and no day.
import { MONTH_NAMES, dayLabel, tOf, yearLabel } from './axis';
import { yearsOf } from './timelineData';
import type { TimelineEvent, TimelinePerson } from './types';

/** Two places on the axis as a span of years: '780 to 680 BC', 'AD 27 to 30', '5 BC to AD 30'. */
export function spanWords(a: number, b: number): string {
  if (a <= 0 && b <= 0) return `${yearLabel(a).replace(' BC', '')} to ${yearLabel(b)}`;
  if (a > 0 && b > 0) return `${yearLabel(a)} to ${yearLabel(b).replace('AD ', '')}`;
  return `${yearLabel(a)} to ${yearLabel(b)}`;
}

/** What the strip says of where it stands, from its left edge to its right: years ('778 to 678 BC'), or days once it is zoomed in to under two years ('30 March to 8 April AD 30'). */
export function standsWords(a: number, b: number): string {
  if (b - a >= 2) return spanWords(a, b);
  const sameYear = Math.floor(a + 1e-9) === Math.floor(b + 1e-9);
  return sameYear ? `${dayLabel(a)} to ${dayLabel(b)} ${yearLabel(b)}` : `${dayLabel(a)} ${yearLabel(a)} to ${dayLabel(b)} ${yearLabel(b)}`;
}

/** When an event is: 'about 759 to 697 BC', 'about AD 27 to 30', 'about 4 BC to AD 30'; a day as '1 May AD 30'. */
export function whenOf(event: Pick<TimelineEvent, 'year' | 'date' | 'duration'>): string {
  const start = tOf(event.year, event.date);
  const years = yearsOf(event.duration);
  const day = event.date && years < 1 ? /(\d\d)-(\d\d)$/.exec(event.date) : null;
  if (day) return `${Number(day[2])} ${MONTH_NAMES[Number(day[1]) - 1]} ${yearLabel(start)}`;
  const end = start + Math.floor(years);
  if (Math.floor(end) === Math.floor(start)) return `about ${yearLabel(start)}`;
  return `about ${spanWords(start, end)}`;
}

/** A life by its years, or by the one year the data has: 'about 752 to 697 BC', 'born about 1754 BC'. */
export function lifeWords(person: Pick<TimelinePerson, 'born' | 'died'>): string {
  if (person.born !== undefined && person.died !== undefined) return `about ${spanWords(tOf(person.born), tOf(person.died))}`;
  if (person.born !== undefined) return `born about ${yearLabel(tOf(person.born))}`;
  return person.died !== undefined ? `died about ${yearLabel(tOf(person.died))}` : '';
}
