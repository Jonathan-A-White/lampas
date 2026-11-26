// src/timeline/marks.ts — what the timeline strip draws, worked out from the books' files (mw-fnvjof.17.317.2, docs/timeline-design.md 'What is drawn' and decision D1; ported from
// prototypes/timeline/timeline.js). Every book's events and every dated life are marks; an event told in several books is one mark; each mark has a voice: the open chapter's (0),
// the open book's (1), the rest of the Bible's (2). Pure: the strip (strip.ts) takes the open book's file first and the others after its first picture.
import { tOf } from './axis';
import { yearsOf } from './timelineData';
import type { BookTimeline, TimelineEvent, VerseRange } from './types';

/** An event as every file read so far tells it: its verses by book, its years on the axis, and whether the open book (`own`) and the open chapter (`here`) tell it. */
export interface ToldEvent extends Omit<TimelineEvent, 'verses'> {
  verses: Record<string, VerseRange[]>;
  a: number;
  b: number;
  own: boolean;
  here: boolean;
}

export interface ToldPerson {
  key: string;
  name: string;
  born?: number;
  died?: number;
  /** the open book names the person */
  own: boolean;
  /** the events the person takes part in, filled by marksOf */
  events: ToldEvent[];
}

export interface Told {
  events: Map<number, ToldEvent>;
  people: Map<string, ToldPerson>;
}

export const newTold = (): Told => ({ events: new Map(), people: new Map() });

/** Reads a book's file into what is told: `own` for the open book's, whose events with a verse in `chapter` are the chapter's. */
export function take(told: Told, file: BookTimeline, own: boolean, chapter: number): void {
  for (const [key, person] of Object.entries(file.people)) {
    const known = told.people.get(key) ?? { key, name: person.name, born: person.born, died: person.died, own: false, events: [] };
    known.own ||= own;
    told.people.set(key, known);
  }
  for (const event of file.events) {
    const a = tOf(event.year, event.date);
    const known = told.events.get(event.id) ?? { ...event, verses: {}, a, b: a + yearsOf(event.duration), own: false, here: false };
    known.verses[file.book] = event.verses;
    known.own ||= own;
    known.here ||= own && event.verses.some(([c]) => c === chapter);
    told.events.set(event.id, known);
  }
}

/** Whose voice a mark has: the open chapter's, the open book's, the rest's. */
export type Rank = 0 | 1 | 2;

interface MarkBase {
  /** 'e217', 'phezekiah_1512' */
  id: string;
  /** its years on the axis */
  a: number;
  b: number;
  /** the title or the name drawn with it */
  text: string;
  rank: Rank;
}
export interface EventMark extends MarkBase {
  kind: 'event';
  event: ToldEvent;
}
export interface PersonMark extends MarkBase {
  kind: 'person';
  person: ToldPerson;
  /** the data gives no birth, or no death: the line fades out at that end */
  openStart: boolean;
  openEnd: boolean;
}
export type Mark = EventMark | PersonMark;

/** How far apart the copies of an event are drawn when the budget's headroom is measured, in years. */
const STRESS_SHIFT = 3.7;

/**
 * The marks of what is told: every event and every dated life. A 'Lifetime of' event of a person who has both years is that person's line, drawn once, among the lives; a person with
 * no year has no line. `stress` draws every event that many times (the budget's headroom, docs/timeline-design.md 'Rendering'); the app draws each once.
 */
export function marksOf(told: Told, stress = 1): Mark[] {
  const marks: Mark[] = [];
  for (const person of told.people.values()) person.events = [];
  for (const event of told.events.values()) for (const key of event.people) told.people.get(key)?.events.push(event);
  for (let copy = 0; copy < stress; copy++) {
    for (const event of told.events.values()) {
      const who = event.people.length === 1 ? told.people.get(event.people[0]) : undefined;
      if (event.title.startsWith('Lifetime of ') && who?.born !== undefined && who.died !== undefined) continue;
      const shift = copy * STRESS_SHIFT;
      marks.push({ id: `e${event.id}${copy ? `x${copy}` : ''}`, kind: 'event', event, a: event.a + shift, b: event.b + shift, text: event.title, rank: event.here ? 0 : event.own ? 1 : 2 });
    }
  }
  for (const person of told.people.values()) {
    if (person.born === undefined && person.died === undefined) continue;
    const a = person.born !== undefined ? tOf(person.born) : null;
    const b = person.died !== undefined ? tOf(person.died) : null;
    const here = person.events.some((event) => event.here);
    marks.push({
      id: `p${person.key}`,
      kind: 'person',
      person,
      a: a ?? b ?? 0,
      b: b ?? a ?? 0,
      openStart: a === null,
      openEnd: b === null,
      // the note in brackets tells two people apart in a card; on the line the name alone rides
      text: person.name.replace(/ \(.*\)$/, ''),
      rank: here ? 0 : person.own ? 1 : 2,
    });
  }
  return marks;
}

const spanOf = (events: ToldEvent[]): { a: number; b: number } | null =>
  events.length ? { a: Math.min(...events.map((e) => e.a)), b: Math.max(...events.map((e) => Math.max(e.b, e.a + (e.date ? 0 : 1)))) } : null;

/**
 * The chapter's years on the axis, where the strip opens (docs/timeline-design.md 'Where it opens'): from the first start to the last end of the events with a verse in the open
 * chapter; a chapter with none opens on its book's; a book with none has no years (null: the strip opens on the whole Bible, with no column).
 */
export function chapterYears(told: Told): { a: number; b: number } | null {
  const own = [...told.events.values()].filter((event) => event.own);
  return spanOf(own.filter((event) => event.here)) ?? spanOf(own);
}
