// src/timeline/timelineData.ts — the door to the timeline's data (docs/timeline.md): Theographic's events, people and places, one file per book
// (src/timeline/data/<book>.json, `npm run timeline:build`), loaded on first use a book at a time, each as its own chunk. Reading it needs no licence.
import { TIMELINE_CREDIT, type BookTimeline, type TimelineEvent } from './types';

export { TIMELINE_CREDIT };
export type { BookTimeline, TimelineEvent, TimelinePerson, VerseRange } from './types';

const FILES = import.meta.glob<BookTimeline>('./data/*.json', { import: 'default' });

const books = new Map<string, Promise<BookTimeline>>();

/** The timeline of a book, loaded once; a book with no events and no dated people has an empty one (with the credit). */
export function loadTimeline(book: string): Promise<BookTimeline> {
  let found = books.get(book);
  if (!found) {
    const load = FILES[`./data/${book}.json`];
    found = load ? load() : Promise.resolve({ book, credit: TIMELINE_CREDIT, events: [], people: {}, places: {} });
    // a failed load is asked again next time
    found.catch(() => books.delete(book));
    books.set(book, found);
  }
  return found;
}

/** The events with a verse in the chapter, in the file's order (by year). */
export const eventsOfChapter = (timeline: BookTimeline, chapter: number): TimelineEvent[] => timeline.events.filter((event) => event.verses.some(([c]) => c === chapter));

const UNIT_YEARS: Record<string, number> = { Y: 1, M: 1 / 12, W: 7 / 365.25, D: 1 / 365.25 };

/** A duration ('62Y', '7Y6M', '3M10D') in years. */
export function yearsOf(duration: string): number {
  if (!/^(\d+(\.\d+)?[YMWD])+$/.test(duration)) throw new Error(`not a duration: ${duration}`);
  return [...duration.matchAll(/(\d+(?:\.\d+)?)([YMWD])/g)].reduce((years, [, n, unit]) => years + Number(n) * UNIT_YEARS[unit], 0);
}

/** The year the event ends: the whole years of its duration after its start. There is no year 0 between 1 BC and AD 1. */
export function endYearOf({ year, duration }: Pick<TimelineEvent, 'year' | 'duration'>): number {
  const astronomical = (year < 0 ? year + 1 : year) + Math.floor(yearsOf(duration));
  return astronomical <= 0 ? astronomical - 1 : astronomical;
}

/** From the earliest start to the latest end of the events, or null for none. */
export function spanOf(events: readonly Pick<TimelineEvent, 'year' | 'duration'>[]): { from: number; to: number } | null {
  if (events.length === 0) return null;
  return { from: Math.min(...events.map((e) => e.year)), to: Math.max(...events.map(endYearOf)) };
}

/** The years of the chapter's events, or null where none names it. */
export const chapterSpan = (timeline: BookTimeline, chapter: number): { from: number; to: number } | null => spanOf(eventsOfChapter(timeline, chapter));
