// The timeline strip's pure half (mw-fnvjof.17.317.2, docs/timeline-design.md 'For the build stories' item 1): src/timeline/ carries the prototype's time, ruler, motion and lanes as
// TypeScript, with the design's numbers as named constants. The constants are held to the prototype's (which tests/unit/timeline-design.test.ts holds to the doc's tables), and the cases
// that test runs on the prototype pass here on the app's own functions. Also here: the strip's height from the dock's body (item 10), which marks the files make, and where a chapter opens.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { K_MAX, T0, T1, homeView, kMin, tAt, tOf, ticks, wholeView, xOf, yearLabel, yearOf } from '../../src/timeline/axis';
import { LAYOUT, MOTION, stripHeight } from '../../src/timeline/design';
import { dealLanes, packLanes, type LaneMark } from '../../src/timeline/lanes';
import { chapterYears, marksOf, newTold, take } from '../../src/timeline/marks';
import { flyAt, flyMs, glideAt, glideRest, rubberC, rubberK, snapRest } from '../../src/timeline/motion';
import { lifeWords, spanWords, standsWords, whenOf } from '../../src/timeline/words';
import type { BookTimeline } from '../../src/timeline/types';

const file = (book: string): BookTimeline => JSON.parse(readFileSync(`src/timeline/data/${book}.json`, 'utf8')) as BookTimeline;
const isaiah = file('isa');

describe("the design's numbers (docs/timeline-design.md 'Motion', 'Layout', 'Type')", () => {
  let proto: { MOTION: Record<string, number>; LAYOUT: Record<string, number> };
  beforeAll(async () => {
    // a path worked out at run time: the prototype is plain JavaScript outside src/, which tsc does not read
    proto = (await import(/* @vite-ignore */ pathToFileURL(resolve('prototypes/timeline/timeline.js')).href)) as typeof proto;
  });

  it("are the prototype's own, every one", () => {
    expect({ ...MOTION }).toEqual(proto.MOTION);
    expect({ ...LAYOUT }).toEqual(proto.LAYOUT);
  });
});

describe('time on the strip (src/timeline/axis.ts)', () => {
  it('counts years with no year 0, and labels them as the maps do', () => {
    expect(tOf(-1)).toBe(0);
    expect(tOf(1)).toBe(1);
    expect(tOf(-759)).toBe(-758);
    expect(tOf(30, '0030-07-02')).toBeGreaterThan(30.4);
    expect(tOf(30, '0030-07-02')).toBeLessThan(30.6);
    expect(yearLabel(tOf(-759))).toBe('759 BC');
    expect(yearLabel(tOf(30))).toBe('AD 30');
    expect(yearLabel(0)).toBe('1 BC');
  });

  it("gives the year at a place as the data counts it (negative BC, no year 0): what Bible Mapper's timeline takes", () => {
    expect(yearOf(tOf(-759))).toBe(-759);
    expect(yearOf(tOf(-759) + 0.6)).toBe(-759);
    expect(yearOf(0.5)).toBe(-1);
    expect(yearOf(1)).toBe(1);
    expect(yearOf(30.4)).toBe(30);
  });

  it('opens Isaiah 1 on the years of its prophecies, the band in the middle of a 390 px strip', () => {
    const span = { from: isaiah.events[0].year, to: -697 };
    const home = homeView(span, 390);
    const left = xOf(tOf(span.from), home, 390);
    const right = xOf(tOf(span.to), home, 390);
    expect((left + right) / 2).toBeCloseTo(195, 5);
    expect((right - left) / 390).toBeCloseTo(LAYOUT.HOME_SHARE, 5);
    expect(tAt(195, home, 390)).toBeCloseTo(home.c, 9);
  });

  it('holds the whole Bible in the width: 4004 BC a little in from the left, AD 100 short of the zoom buttons', () => {
    const whole = wholeView(390);
    expect(whole.k).toBe(kMin(390));
    expect(xOf(T0, whole, 390)).toBeCloseTo(LAYOUT.WHOLE_PAD, 6);
    expect(xOf(T1, whole, 390)).toBeCloseTo(390 - LAYOUT.ZOOM_BOX, 6);
    expect(K_MAX).toBe(LAYOUT.DAY_PX * 365);
  });

  it('rules the whole Bible in round years, a lifetime in tens, and a week in days', () => {
    const whole = ticks(wholeView(390), 390);
    expect(whole.major.map((tick) => tick.label)).toEqual(expect.arrayContaining(['4000 BC', '2000 BC', 'AD 1']));
    expect(whole.major.every((tick) => !tick.label.startsWith('0') && tick.label !== 'AD 0')).toBe(true);
    const view = homeView({ from: -759, to: -697 }, 390);
    const home = ticks(view, 390);
    expect(home.major.map((tick) => tick.label)).toEqual(expect.arrayContaining(['760 BC', '700 BC']));
    for (let i = 1; i < home.major.length; i++) expect(xOf(home.major[i].t, view, 390) - xOf(home.major[i - 1].t, view, 390)).toBeGreaterThanOrEqual(LAYOUT.TICK_GAP);
    // at the closest zoom a day is 48 px, so every second day is written (never closer than TICK_GAP)
    const days = ticks({ c: tOf(30, '0030-04-04'), k: K_MAX }, 390);
    expect(days.major.map((tick) => tick.label)).toEqual(expect.arrayContaining(['3 Apr', '5 Apr']));
    expect(days.minor.length).toBeGreaterThan(0);
  });
});

describe('motion (src/timeline/motion.ts)', () => {
  it('lets a fling glide to rest at its speed times the glide time, and settles on the chapter when it would rest near it', () => {
    const rest = glideRest(100, 2);
    expect(rest).toBe(100 + 2 * MOTION.GLIDE_MS);
    expect(glideAt(100, rest, 0)).toBe(100);
    expect(Math.abs(glideAt(100, rest, 6 * MOTION.GLIDE_MS) - rest)).toBeLessThan(2);
    expect(snapRest(500 + MOTION.SNAP_PX - 1, 500)).toBe(500);
    expect(snapRest(500 + MOTION.SNAP_PX + 1, 500)).toBe(500 + MOTION.SNAP_PX + 1);
  });

  it('flies from one view to another, beginning and ending exactly on them, in 240 to 640 ms', () => {
    const from = homeView({ from: -759, to: -697 }, 390);
    const to = wholeView(390);
    expect(flyAt(from, to, 390, 0)).toEqual(from);
    const end = flyAt(from, to, 390, 1);
    expect(end.c).toBeCloseTo(to.c, 6);
    expect(end.k).toBeCloseTo(to.k, 9);
    const mid = flyAt(from, to, 390, 0.5);
    expect(mid.k).toBeLessThan(from.k);
    expect(mid.k).toBeGreaterThan(to.k * 0.5);
    expect(flyMs(from, to, 390)).toBeGreaterThanOrEqual(MOTION.FLY_MIN_MS);
    expect(flyMs(from, to, 390)).toBeLessThanOrEqual(MOTION.FLY_MAX_MS);
    expect(flyMs(from, from, 390)).toBe(MOTION.FLY_MIN_MS);
  });

  it("follows 0.35 of the finger past an end of the Bible's time and of the zoom", () => {
    expect(rubberC(-1000)).toBe(-1000);
    expect(rubberC(T1 + 10)).toBeCloseTo(T1 + 10 * MOTION.RUBBER, 9);
    expect(rubberC(T0 - 10)).toBeCloseTo(T0 - 10 * MOTION.RUBBER, 9);
    expect(rubberK(1, 390)).toBe(1);
    expect(rubberK(K_MAX * 4, 390)).toBeCloseTo(K_MAX * 4 ** MOTION.RUBBER, 6);
    expect(rubberK(kMin(390) / 4, 390)).toBeCloseTo(kMin(390) * 0.25 ** MOTION.RUBBER, 9);
  });
});

describe('lanes (src/timeline/lanes.ts)', () => {
  it('deals a half dock at 390x844 two lanes of events and three of people, and the smallest dock one lane of events', () => {
    expect(dealLanes(282, { events: 9, people: 3 })).toEqual({ events: 2, people: 3 });
    expect(dealLanes(282, { events: 9, people: 0 })).toEqual({ events: 5, people: 0 });
    expect(dealLanes(LAYOUT.STRIP_MIN, { events: 9, people: 3 })).toEqual({ events: 1, people: 0 });
  });

  it('packs marks into lanes by rank, and sends what finds no lane to the ribbon, losing none', () => {
    const marks: LaneMark[] = [
      { id: 'far', x0: 300, x1: 380, rank: 2 },
      { id: 'chapter', x0: 10, x1: 200, rank: 0 },
      { id: 'book', x0: 50, x1: 150, rank: 1 },
      { id: 'other', x0: 60, x1: 160, rank: 2 },
    ];
    const { placed, ribbon } = packLanes(marks, 2);
    expect(placed.find((p) => p.id === 'chapter')?.lane).toBe(0);
    expect(placed.find((p) => p.id === 'book')?.lane).toBe(1);
    expect(placed.find((p) => p.id === 'far')?.lane).toBe(0);
    expect(ribbon).toEqual(['other']);
    expect(placed.length + ribbon.length).toBe(marks.length);
  });
});

describe("the strip's height from the dock's body (docs/timeline-design.md 'Layout', decision D2)", () => {
  it('is max(STRIP_MIN, min(body, max(STRIP_FULL, body - credit)))', () => {
    // Half at 390x844 in a browser tab: a 330 px body keeps the five lanes, the credit part in view under them
    expect(stripHeight(330, 68)).toBe(LAYOUT.STRIP_FULL);
    // the installed phone at Half: the body is the strip, the credit one small scroll down
    expect(stripHeight(282, 68)).toBe(282);
    // from a 350 px body up the credit is in view whole, and the strip grows with the dock
    expect(stripHeight(350, 68)).toBe(282);
    expect(stripHeight(480, 68)).toBe(412);
    // a body under the five lanes: the strip is the body, never under its least
    expect(stripHeight(200, 68)).toBe(200);
    expect(stripHeight(90, 68)).toBe(LAYOUT.STRIP_MIN);
  });
});

describe('what the files make (src/timeline/marks.ts)', () => {
  it("opens Isaiah 1 on its prophecies' years, and marks them the chapter's own with the book's dated lives", () => {
    const told = newTold();
    take(told, isaiah, true, 1);
    expect(chapterYears(told)).toEqual({ a: tOf(-759), b: tOf(-759) + 62 });
    const marks = marksOf(told);
    const prophecies = marks.find((mark) => mark.kind === 'event' && mark.text === 'Prophecies of Isaiah');
    expect(prophecies?.rank).toBe(0);
    const lives = marks.filter((mark) => mark.kind === 'person').map((mark) => mark.text);
    expect(lives).toEqual(expect.arrayContaining(['Uzziah', 'Jotham', 'Ahaz', 'Hezekiah']));
    // a person with no year (Isaiah himself) has no line
    expect(lives).not.toContain('Isaiah');
    // a name's note in brackets is not drawn on the line: 'Jacob (Israel)' rides as 'Jacob'
    expect(lives).toContain('Jacob');
  });

  it("tells another book's events as the rest's (grey), once, whichever files tell them", () => {
    const told = newTold();
    take(told, isaiah, true, 1);
    take(told, file('2ki'), false, 1);
    take(told, file('2ch'), false, 1);
    const marks = marksOf(told);
    const ids = marks.map((mark) => mark.id);
    expect(new Set(ids).size).toBe(ids.length);
    const other = marks.find((mark) => mark.kind === 'event' && mark.rank === 2);
    expect(other).toBeDefined();
    // the chapter's own stays the chapter's own
    expect(marks.find((mark) => mark.text === 'Prophecies of Isaiah')?.rank).toBe(0);
  });

  it('draws a Lifetime event of a person with both years as that life, once, among the lives', () => {
    const told = newTold();
    for (const book of ['gen', 'exo', '1sa', '2sa', '1ki']) take(told, file(book), book === 'gen', 5);
    const marks = marksOf(told);
    for (const mark of marks) {
      if (mark.kind !== 'event' || !mark.text.startsWith('Lifetime of ')) continue;
      const [who] = mark.event.people;
      const person = told.people.get(who);
      expect(mark.event.people.length !== 1 || person?.born === undefined || person?.died === undefined, `${mark.text} is drawn as an event though its person has both years`).toBe(true);
    }
  });

  it("opens a chapter with no event on its book's span, and a book with none on nothing (the whole Bible)", () => {
    const luke = newTold();
    take(luke, file('luk'), true, 23);
    const days = chapterYears(luke);
    // every event of Luke 23 has a day in AD 30: the span is days, not years
    expect(days && days.b - days.a).toBeLessThan(1);
    // no event of Isaiah has a verse in a chapter 99: the strip opens on the book's years, and the book's event is the book's (ink), not the chapter's (amber)
    const book = newTold();
    take(book, isaiah, true, 99);
    expect(chapterYears(book)).toEqual({ a: tOf(-759), b: tOf(-759) + 62 });
    expect(marksOf(book).find((mark) => mark.text === 'Prophecies of Isaiah')?.rank).toBe(1);
    const none = newTold();
    take(none, { book: '3jn', credit: '', events: [], people: {}, places: {} }, true, 1);
    expect(chapterYears(none)).toBeNull();
  });
});

describe("a mark's words, for its button's name (src/timeline/words.ts)", () => {
  it("writes years with 'about' and a day without", () => {
    expect(whenOf(isaiah.events[0])).toBe('about 759 to 697 BC');
    expect(whenOf({ year: 30, date: '0030-05-01', duration: '1D' })).toBe('1 May AD 30');
    expect(whenOf({ year: -4, duration: '33Y' })).toBe('about 4 BC to AD 30');
    expect(whenOf({ year: 27, duration: '3Y' })).toBe('about AD 27 to 30');
    expect(whenOf({ year: -1451, duration: '1M' })).toBe('about 1451 BC');
  });

  it('writes a life by its years, or the one year the data has', () => {
    expect(lifeWords({ born: -752, died: -697 })).toBe('about 752 to 697 BC');
    expect(lifeWords({ born: -1754 })).toBe('born about 1754 BC');
    expect(lifeWords({ died: 30 })).toBe('died about AD 30');
    expect(spanWords(tOf(-780), tOf(-680))).toBe('780 to 680 BC');
  });

  it('says where the strip stands in years, and in days once it is zoomed in to under two years', () => {
    expect(standsWords(tOf(-778), tOf(-678))).toBe('778 to 678 BC');
    expect(standsWords(tOf(-4004), 100)).toBe('4004 BC to AD 100');
    expect(standsWords(tOf(30, '0030-03-30'), tOf(30, '0030-04-08'))).toBe('30 March to 8 April AD 30');
    expect(standsWords(tOf(29, '0029-12-25'), tOf(30, '0030-01-06'))).toBe('25 December AD 29 to 6 January AD 30');
    expect(standsWords(tOf(-5, '0000-01-01'), tOf(-5, '0000-12-31'))).toBe('1 January to 31 December 5 BC');
  });
});
