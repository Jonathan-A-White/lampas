// The timeline's card as pure words (mw-fnvjof.17.317.3, docs/timeline-design.md 'The card' and 'For the build stories' items 2 and 6): what a card says of an event, of a life and of a busy
// place on the ruler, worked out from the rig's own Theographic files with nothing drawn. The verses' chips come from the ranges alone (a run of whole chapters is one chip); a date has
// 'about' wherever the data gives a year and no day, and a single day has no length. Also here: the chapter turn's handover, by which a new chapter's strip flies from where the last stood.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOOKS, bookOf } from '../../src/data/books';
import { eventCard, lengthOf, listCard, personCard, refsOf, type CardContext } from '../../src/timeline/card';
import { CARD_MIN, LAYOUT, cardRoom } from '../../src/timeline/design';
import { leaveFor, takeFor } from '../../src/timeline/follow';
import { marksOf, newTold, take, type EventMark, type Mark, type PersonMark } from '../../src/timeline/marks';
import type { BookTimeline } from '../../src/timeline/types';

const file = (book: string): BookTimeline => JSON.parse(readFileSync(`src/timeline/data/${book}.json`, 'utf8')) as BookTimeline;

/** The strip's marks with `book` open at `chapter` and the other `books` read beside it, and what a card is told of them. */
function open(book: string, chapter: number, books: string[] = []): { marks: Mark[]; at: CardContext; event(title: string): EventMark; life(name: string): PersonMark } {
  const told = newTold();
  take(told, file(book), true, chapter);
  for (const code of books) take(told, file(code), false, chapter);
  const marks = marksOf(told);
  const ids = new Set(marks.map((mark) => mark.id));
  return {
    marks,
    at: { book, chapter, books: BOOKS.map((b) => b.code), bookName: (code) => bookOf(code)?.name ?? code, person: (key) => told.people.get(key), has: (id) => ids.has(id) },
    event: (title) => marks.find((mark): mark is EventMark => mark.kind === 'event' && mark.event.title === title)!,
    life: (name) => marks.find((mark): mark is PersonMark => mark.kind === 'person' && mark.person.name === name)!,
  };
}

describe("a length in words (the data's own units)", () => {
  it('writes years, months, weeks and days, each alone or two together, and nothing for a single day', () => {
    expect(lengthOf('62Y')).toBe('62 years');
    expect(lengthOf('1Y')).toBe('1 year');
    expect(lengthOf('7Y6M')).toBe('7 years 6 months');
    expect(lengthOf('3M10D')).toBe('3 months 10 days');
    expect(lengthOf('1W')).toBe('1 week');
    expect(lengthOf('40D')).toBe('40 days');
    expect(lengthOf('1D')).toBe('');
  });
});

describe("the verses' chips, from the ranges alone", () => {
  it('writes a run of whole chapters as one chip, and any other range as its own', () => {
    expect(refsOf('Isaiah', file('isa').events[0].verses)).toEqual([{ label: 'Isaiah 1–66', chapter: 1, verse: 1, last: 66 }]);
    expect(refsOf('2 Kings', [[18, 1, 8]])).toEqual([{ label: '2 Kings 18:1–8', chapter: 18, verse: 1, last: 18 }]);
    expect(refsOf('2 Kings', [[20, 21, 21]])).toEqual([{ label: '2 Kings 20:21', chapter: 20, verse: 21, last: 20 }]);
    // two runs with a gap between them, then a part of a chapter
    expect(refsOf('Acts', [[1, 1, 26], [2, 1, 47], [4, 1, 37], [5, 1, 42], [7, 54, 60]]).map((ref) => ref.label)).toEqual(['Acts 1–2', 'Acts 4–5', 'Acts 7:54–60']);
    // a chapter that does not begin at its first verse joins no run
    expect(refsOf('Luke', [[22, 66, 71], [23, 1, 25]]).map((ref) => ref.label)).toEqual(['Luke 22:66–71', 'Luke 23:1–25']);
    expect(refsOf('Luke', [])).toEqual([]);
  });
});

describe("an event's card", () => {
  it("says Isaiah's prophecies with 'about', their length, the open chapter's chip marked, and Isaiah, who has no years, in plain words", () => {
    const { at, event } = open('isa', 1);
    expect(eventCard(event('Prophecies of Isaiah'), at)).toEqual({
      kind: 'event',
      id: 'e217',
      title: 'Prophecies of Isaiah',
      when: 'about 759 to 697 BC · 62 years',
      // the chip's range holds the open chapter: a tap goes to its first verse of this chapter
      verses: [{ label: 'Isaiah 1–66', book: 'isa', chapter: 1, verse: 1, here: true }],
      people: [{ name: 'Isaiah', id: null }],
    });
    // further on in the book the same chip still goes to the open chapter, not back to the range's first
    const later = open('isa', 40);
    expect(eventCard(later.event('Prophecies of Isaiah'), later.at)).toMatchObject({ verses: [{ label: 'Isaiah 1–66', book: 'isa', chapter: 40, verse: 1, here: true }] });
  });

  it("writes a day with no 'about' and no length (Acts 1, The Holy Spirit is promised)", () => {
    const { at, event } = open('act', 1);
    const card = eventCard(event('The Holy Spirit is promised'), at);
    expect(card).toMatchObject({ title: 'The Holy Spirit is promised', when: '1 May AD 30', verses: [{ label: 'Acts 1:4–5', book: 'act', chapter: 1, verse: 4, here: true }] });
    // Jesus Christ has years, so he is a chip that opens his life; God has none
    expect(card.kind === 'event' && card.people).toEqual([
      { name: 'Jesus Christ', id: 'pjesus_905' },
      { name: 'God', id: null },
      { name: 'Holy Spirit', id: null },
    ]);
  });

  it("puts the open book's verses first, then the other books' in the Bible's order, each chip going to its own chapter", () => {
    // Hezekiah's reign is told in 2 Kings; read from Isaiah 1 it is another book's
    const { at, event } = open('isa', 1, ['2ki']);
    expect(eventCard(event('Reign of Hezekiah'), at)).toMatchObject({
      when: 'about 726 to 697 BC · 29 years',
      verses: [{ label: '2 Kings 18–20', book: '2ki', chapter: 18, verse: 1, here: false }],
      people: [{ name: 'Hezekiah', id: 'phezekiah_1512' }],
    });
    // an event the four Gospels tell, read from Luke 23: Luke's chips first, the one holding chapter 23 marked, then Matthew's, Mark's and John's
    const luke = open('luk', 23, ['jhn', 'mrk', 'mat']);
    const week = eventCard(luke.event('Holy Week'), luke.at);
    const books = week.kind === 'event' ? week.verses.map((chip) => chip.book) : [];
    expect(books[0]).toBe('luk');
    expect([...new Set(books)]).toEqual(['luk', 'mat', 'mrk', 'jhn']);
    const here = week.kind === 'event' ? week.verses.filter((chip) => chip.here) : [];
    expect(here).toHaveLength(1);
    expect(here[0]).toMatchObject({ book: 'luk', chapter: 23 });
  });
});

describe("a life's card", () => {
  it("says Hezekiah's years and their count, and the events he takes part in as rows, the earlier first", () => {
    const { at, life } = open('isa', 1, ['2ki']);
    expect(personCard(life('Hezekiah'), at)).toEqual({
      kind: 'person',
      id: 'phezekiah_1512',
      title: 'Hezekiah',
      when: 'about 752 to 697 BC · 55 years',
      rows: [
        { id: 'e226', title: 'Reign of Hezekiah', when: '726 to 697 BC' },
        { id: 'e227', title: 'Death of Hezekiah', when: '697 BC' },
      ],
    });
  });

  it('says the one year the data has for a life with no death', () => {
    const { at, life } = open('isa', 1);
    expect(personCard(life('Ephraim'), at)).toMatchObject({ title: 'Ephraim', when: 'born about 1708 BC' });
  });
});

describe("the ruler's list", () => {
  it('is headed with how many and where, and has a row for each mark by its name and years', () => {
    const { life, event } = open('isa', 1, ['2ki']);
    expect(listCard([event('Reign of Hezekiah'), life('Ahaz')], '2 near 730 BC')).toEqual({
      kind: 'list',
      id: null,
      title: '2 near 730 BC',
      rows: [
        { id: 'e226', title: 'Reign of Hezekiah', when: '726 to 697 BC' },
        { id: 'pahaz_118', title: 'Ahaz', when: '763 to 726 BC' },
      ],
    });
  });
});

describe('the chapter turn (src/timeline/follow.ts)', () => {
  it("hands where the strip stood to the strip of the chapter he turned to, once, and to no other chapter's", () => {
    leaveFor('act/2', { c: 30.2, k: 4000 });
    expect(takeFor('act/2')).toEqual({ c: 30.2, k: 4000 });
    // taken once: the dock closed and opened again on the same chapter opens at the chapter's time
    expect(takeFor('act/2')).toBeNull();
    // left for one chapter, never met by another's strip, and gone once any strip has opened
    leaveFor('act/2', { c: 30.2, k: 4000 });
    expect(takeFor('isa/1')).toBeNull();
    expect(takeFor('act/2')).toBeNull();
  });
});

describe("the room a card may take of the strip (docs/timeline-design.md 'The card')", () => {
  it("is the strip less its least, so the chapter's name, a lane and the ruler stay in view; a strip too small for that gives the card its least, up to the whole strip", () => {
    // Half at 390x844 in a browser tab, and in the installed app
    expect(cardRoom(LAYOUT.STRIP_FULL)).toBe(176);
    expect(cardRoom(250)).toBe(144);
    expect(cardRoom(LAYOUT.STRIP_MIN + CARD_MIN)).toBe(CARD_MIN);
    expect(cardRoom(200)).toBe(CARD_MIN);
    // the dock pulled to its smallest: the card takes the strip whole
    expect(cardRoom(LAYOUT.STRIP_MIN)).toBe(LAYOUT.STRIP_MIN);
    expect(cardRoom(600)).toBe(600 - LAYOUT.STRIP_MIN);
  });
});
