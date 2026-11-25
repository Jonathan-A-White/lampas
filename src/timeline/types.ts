// src/timeline/types.ts — the shapes of the timeline's data (docs/timeline.md) and its credit. scripts/timeline-import.ts writes one BookTimeline per book into
// src/timeline/data/; src/timeline/timelineData.ts loads them. Years are integers, negative for BC, with no year 0 (as src/maps/period.ts counts them).

/** The credit and licence line that goes wherever the timeline's data is shown (the data is CC BY-SA 4.0), written into each file. */
export const TIMELINE_CREDIT = 'Theographic Bible Metadata, Robert Rouse, CC BY-SA 4.0; traditional dating (Floyd Nolen Jones, after Ussher)';

/** Verses of one chapter of the book, `from` to `to` inclusive. */
export type VerseRange = [chapter: number, from: number, to: number];

export interface TimelineEvent {
  /** Theographic's eventID */
  id: number;
  title: string;
  /** the year the event starts */
  year: number;
  /** the day, 'YYYY-MM-DD', only where Theographic gives one (the Passion week, parts of Acts); its year is `year` */
  date?: string;
  /** how long it lasts, Theographic's form: a number and a unit (D days, W weeks, M months, Y years), sometimes two: '62Y', '7Y6M' */
  duration: string;
  /** its verses in this book, in order */
  verses: VerseRange[];
  /** the people who take part: keys of BookTimeline.people */
  people: string[];
  /** where it happens: keys of BookTimeline.places */
  places: string[];
}

export interface TimelinePerson {
  name: string;
  /** the birth and death years, only for the few people Theographic dates */
  born?: number;
  died?: number;
}

export interface BookTimeline {
  /** the app's book code (src/data/canon.ts) */
  book: string;
  credit: string;
  /** the events with a verse in this book, by year, then by the first verse of each in canon order */
  events: TimelineEvent[];
  /** by Theographic's lookup ('isaiah_617'): the people of the events, and the dated people the book's verses name */
  people: Record<string, TimelinePerson>;
  /** the names of the events' places, by lookup */
  places: Record<string, string>;
}
