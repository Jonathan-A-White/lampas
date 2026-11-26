// src/timeline/card.ts — what a card of the timeline says (mw-fnvjof.17.317.3, docs/timeline-design.md 'The card'; ported from prototypes/timeline/timeline.js), as pure words worked out from
// the strip's marks: an event's title, date and length, its verses as chips and its people; a life's years and the events the person takes part in; a busy place on the ruler as a list.
// EventCard.tsx draws it; the strip (strip.ts) hands it the marks. 'about' wherever the data gives a year and no day (words.ts whenOf); a single day has no length.
import { tOf } from './axis';
import type { EventMark, Mark, PersonMark } from './marks';
import type { VerseRange } from './types';
import { lifeWords, whenOf } from './words';

const UNIT_NAMES: Record<string, string> = { Y: 'year', M: 'month', W: 'week', D: 'day' };

/** A duration in words, in the data's own units: '62 years', '7 years 6 months', '3 days'; nothing for a single day. */
export function lengthOf(duration: string): string {
  if (duration === '1D') return '';
  return [...duration.matchAll(/(\d+(?:\.\d+)?)([YMWD])/g)].map(([, n, unit]) => `${n} ${UNIT_NAMES[unit]}${Number(n) === 1 ? '' : 's'}`).join(' ');
}

/** A chip's range in one book: its words, where a tap goes (`chapter` and `verse`, the range's first), and the last chapter it holds. */
export interface VerseRef {
  label: string;
  chapter: number;
  verse: number;
  last: number;
}

/**
 * An event's verses of one book as chips, from the ranges alone: a run of chapters each read from its first verse is one chip ('Isaiah 1–66'), any other range its own ('2 Kings 18:1–8',
 * '2 Kings 20:21'). `name` is the book's.
 */
export function refsOf(name: string, ranges: readonly VerseRange[]): VerseRef[] {
  const refs: VerseRef[] = [];
  for (let i = 0; i < ranges.length; i++) {
    let j = i;
    while (j + 1 < ranges.length && ranges[j][1] === 1 && ranges[j + 1][1] === 1 && ranges[j + 1][0] === ranges[j][0] + 1) j++;
    const [chapter, from, to] = ranges[i];
    if (j > i) refs.push({ label: `${name} ${chapter}–${ranges[j][0]}`, chapter, verse: 1, last: ranges[j][0] });
    else refs.push({ label: `${name} ${chapter}:${from}${to > from ? `–${to}` : ''}`, chapter, verse: from, last: chapter });
    i = j;
  }
  return refs;
}

/** A verse chip: its words and the verse a tap moves the text to. `here`: its range holds the open chapter, so the tap stays in it (the chip is tinted and aria-current). */
export interface VerseChip {
  label: string;
  book: string;
  chapter: number;
  verse: number;
  here: boolean;
}

/** One of an event's people: `id` is the life's mark where the data dates the person (a chip that opens the life), null for one with no year (plain words). */
export interface CardPerson {
  name: string;
  id: string | null;
}

/** A row that opens a mark's card: its title or name, and its years without 'about'. */
export interface CardRow {
  id: string;
  title: string;
  when: string;
}

export type Card =
  | { kind: 'event'; id: string; title: string; when: string; verses: VerseChip[]; people: CardPerson[] }
  | { kind: 'person'; id: string; title: string; when: string; rows: CardRow[] }
  | { kind: 'list'; id: null; title: string; rows: CardRow[] };

/** What a card is told of the strip it stands on. */
export interface CardContext {
  /** the open chapter */
  book: string;
  chapter: number;
  /** every book's code, in the Bible's order */
  books: readonly string[];
  bookName(code: string): string;
  person(key: string): { name: string } | undefined;
  /** the strip has a mark of this id ('e217', 'phezekiah_1512') */
  has(id: string): boolean;
}

const rowOf = (mark: Mark): CardRow =>
  mark.kind === 'event' ? { id: mark.id, title: mark.event.title, when: whenOf(mark.event).replace('about ', '') } : { id: mark.id, title: mark.person.name, when: lifeWords(mark.person).replace('about ', '') };

/**
 * An event's card: its title; when it was and for how long ('about 759 to 697 BC · 62 years', '1 May AD 30'); its verses as chips, the open book's first and the rest in the Bible's
 * order; its people. A chip whose range holds the open chapter goes to that range's first verse of the open chapter; any other to its own first verse.
 */
export function eventCard(mark: EventMark, at: CardContext): Card {
  const { event } = mark;
  const length = lengthOf(event.duration);
  const order = (code: string): number => (code === at.book ? -1 : at.books.indexOf(code));
  const verses: VerseChip[] = [];
  for (const code of Object.keys(event.verses).sort((a, b) => order(a) - order(b))) {
    for (const ref of refsOf(at.bookName(code), event.verses[code])) {
      const here = code === at.book && at.chapter >= ref.chapter && at.chapter <= ref.last;
      verses.push(here ? { label: ref.label, book: code, chapter: at.chapter, verse: ref.chapter === at.chapter ? ref.verse : 1, here } : { label: ref.label, book: code, chapter: ref.chapter, verse: ref.verse, here });
    }
  }
  const people: CardPerson[] = [];
  for (const key of event.people) {
    const person = at.person(key);
    if (person) people.push({ name: person.name, id: at.has(`p${key}`) ? `p${key}` : null });
  }
  return { kind: 'event', id: mark.id, title: event.title, when: `${whenOf(event)}${length ? ` · ${length}` : ''}`, verses, people };
}

/** A life's card: the name; the years and their count ('about 752 to 697 BC · 55 years'; 'born about 1754 BC' where only one is known); the events the person takes part in that the strip has, the earlier first. */
export function personCard(mark: PersonMark, at: Pick<CardContext, 'has'>): Card {
  const { person } = mark;
  const years = person.born !== undefined && person.died !== undefined ? ` · ${Math.round(tOf(person.died) - tOf(person.born))} years` : '';
  const rows = person.events
    .filter((event) => at.has(`e${event.id}`))
    .sort((a, b) => a.a - b.a)
    .map((event): CardRow => ({ id: `e${event.id}`, title: event.title, when: whenOf(event).replace('about ', '') }));
  return { kind: 'person', id: mark.id, title: person.name, when: `${lifeWords(person)}${years}`, rows };
}

/** The ruler's list: `title` says how many and where ('8 near 770 BC'), and each mark is a row, in the order given (the order they would have chosen lanes). */
export const listCard = (marks: readonly Mark[], title: string): Card => ({ kind: 'list', id: null, title, rows: marks.map(rowOf) });
