// prototypes/timeline/timeline.js (mw-fnvjof.17.317.4): the prototype of the timeline strip that docs/timeline-design.md describes. Not app code and not in any build: plain
// JavaScript that index.html beside it loads, reading the rig's own Theographic files (src/timeline/data/<book>.json, docs/timeline.md) over HTTP. Nothing of the data is copied here.
// Two halves. The first is pure (time, ruler, motion, lanes) and is what the dock's Builder ports to TypeScript; tests/unit/timeline-design.test.ts holds the doc's numbers to the
// constants below and runs these functions on the real Isaiah file. The second half, `mount`, is the strip itself: one 2D canvas drawn only while something moves, real buttons
// over it at rest, the card, the gestures. Run it: node prototypes/timeline/serve.mjs, then open the address it prints.

/** The motion's numbers. Each has a row in docs/timeline-design.md 'Motion'. */
export const MOTION = {
  GLIDE_MS: 325, // the time constant of a fling's decay: it comes to rest v x GLIDE_MS further on
  SPEED_WINDOW_MS: 100, // the finger's speed is read over its last 100 ms (the page turn's own, src/reader/usePages.ts)
  FLING_MIN: 0.05, // px/ms: slower than this, letting go is not a fling
  FLING_MAX: 6, // px/ms: a fling is never faster than this
  SNAP_PX: 28, // a glide that would rest this near the chapter settles on it
  RUBBER: 0.35, // the share of the finger's travel the strip follows past an end (the chapter swipe's FOLLOW_SHARE)
  SPRING_MS: 200, // back from past an end, and a settle on the chapter: the bars' own time (src/Away.tsx)
  ZOOM_STEP: 2, // one tap of a zoom button, or one + or - key
  ZOOM_MS: 240, // a zoom step's time
  FLY_MIN_MS: 240, // a flight (to the chapter, to the whole Bible, to a row of a list) takes between these
  FLY_MAX_MS: 640,
  TAP_SLOP: 8, // a finger that moves less is a tap (the ladder graph's own)
  EDGE_PX: 24, // no pan starts this near a side of the screen: that is the phone's own Back swipe (the chapter swipe's own)
  PAN_STEP: 0.4, // an arrow key or Earlier / Later moves by this share of the width (the ladder graph's own)
  EASE_MS: 120, // a mark changing lane, a label coming or going
  CARD_MS: 200, // the card rising and leaving
};

/** The layout's numbers, in px unless said. Each has a row in docs/timeline-design.md 'Layout' or 'Type'. */
export const LAYOUT = {
  LANE: 44, // a lane of events or of people: a thumb tall
  SPINE: 44, // the ruler between them: ribbon, line, ticks, years
  FLAG: 18, // the room at the top for the chapter's name
  STRIP_MIN: 106, // the least strip: the flag, one lane, the ruler
  STRIP_FULL: 282, // the strip with five lanes: it keeps this height while the dock's body has it, and the credit line comes into view under it as the dock grows
  BAR: 28, // an event's bar in its lane
  DOT: 10, // an event of a day
  LIFE: 4, // a life's line
  TARGET: 44, // the least width the packer gives a mark, so two never stand closer than a thumb
  LABEL_MAX: 200, // a title is cut with an ellipsis past this
  GAP: 8, // between two marks of a lane
  TICK_GAP: 72, // the least distance between two years written on the ruler
  HOME_SHARE: 0.62, // the share of the width the chapter's years take when the strip opens
  PEOPLE_SHARE: 0.6, // people never take more than this share of the lanes
  EDGE_FADE: 16, // the fade at each side, where time goes on
  WHOLE_PAD: 32, // the room left of the whole Bible, so its first year is written whole
  ZOOM_BOX: 104, // the room right of it: the two zoom buttons at the ruler's end and a fade, so AD 1 is never under them
  TITLE_PX: 16, // titles and names (text-base)
  SMALL_PX: 14, // years, the chapter's name (text-sm)
  DPR_MAX: 2, // the canvas is never drawn at more than two device px to one (src/reader/pageSnapshot.ts MAX_SCALE)
  DAY_PX: 48, // the closest zoom: one day this wide
  SUIT_EVENT: 120, // among the other books' events, those nearest this width at the zoom choose a lane first: reigns beside a prophet, kingdoms beside the whole Bible
  SUIT_LIFE: 160, // and the same for the lives
};

// ───────────────────────────────────────────────── time ─────────────────────────────────────────────────

const DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A year of the data (negative BC, no year 0) as a place on the axis, where 1 BC is 0 and AD 1 is 1; a day ('0030-05-01') adds its share of the year. */
export function tOf(year, date) {
  const base = year < 0 ? year + 1 : year;
  const day = date ? /(\d\d)-(\d\d)$/.exec(date) : null;
  return day ? base + (DAYS[Number(day[1]) - 1] + Number(day[2]) - 1) / 365 : base;
}

/** The year at a place on the axis, as the maps write it (src/maps/period.ts): '759 BC', 'AD 30'. */
export function yearLabel(t) {
  const year = Math.floor(t + 1e-9);
  return year <= 0 ? `${1 - year} BC` : `AD ${year}`;
}

const UNIT_YEARS = { Y: 1, M: 1 / 12, W: 7 / 365.25, D: 1 / 365.25 };
/** A duration ('62Y', '7Y6M') in years (src/timeline/timelineData.ts yearsOf). */
export const yearsOf = (duration) => [...duration.matchAll(/(\d+(?:\.\d+)?)([YMWD])/g)].reduce((years, [, n, unit]) => years + Number(n) * UNIT_YEARS[unit], 0);

/** The Bible's time on the axis: 4004 BC (the first year of the data) to AD 100. */
export const T0 = tOf(-4004);
export const T1 = 100;
export const K_MAX = LAYOUT.DAY_PX * 365;
/** The widest view: the whole Bible in the width. */
export const kMin = (width) => (width - LAYOUT.WHOLE_PAD - LAYOUT.ZOOM_BOX) / (T1 - T0);
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

/** A view is the year at the middle of the strip (`c`, on the axis) and the px one year takes (`k`). */
export const xOf = (t, view, width) => (t - view.c) * view.k + width / 2;
export const tAt = (x, view, width) => view.c + (x - width / 2) / view.k;

/** The view in which the years `a` to `b` of the axis take `share` of the width, in the middle. */
export function fitView(a, b, width, share = LAYOUT.HOME_SHARE) {
  return { c: (a + b) / 2, k: clamp((share * width) / Math.max(b - a, 1e-6), kMin(width), K_MAX) };
}

/** Where the strip opens: the chapter's years (`from` to `to`, the data's years) in the middle, taking HOME_SHARE of the width; a span under a year opens as a year. */
export function homeView(span, width) {
  const a = tOf(span.from);
  return fitView(a, Math.max(tOf(span.to), a + 1), width);
}

/** The whole Bible in the width: 4004 BC a little in from the left, AD 100 short of the zoom buttons. */
export const wholeView = (width) => ({ c: T0 + (width / 2 - LAYOUT.WHOLE_PAD) / kMin(width), k: kMin(width) });

const YEAR_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
const MINOR_OF = { 1: 0, 2: 1, 5: 1, 10: 5, 20: 10, 50: 10, 100: 50, 200: 100, 500: 100, 1000: 500, 2000: 1000 };

/** Every `step`th year by its written number (500 BC, not 501 BC: there is no year 0, so the round years of BC sit one off the axis's round numbers), between two places on the axis. */
function roundYears(step, from, to) {
  const out = [];
  for (let m = Math.floor((from - 1) / step); m <= Math.ceil(to / step); m++) {
    if (m === 0) continue;
    const t = m < 0 ? m * step + 1 : m * step;
    if (t >= from && t <= to) out.push(t);
  }
  return out;
}

/**
 * The ruler of a view: the places that carry a written year (`major`), never closer than TICK_GAP, and the unwritten marks between them (`minor`). Zoomed out it steps in round
 * years; from 144 px a year in months (the year written at January); from 2,628 px a year in days.
 */
export function ticks(view, width) {
  const { k } = view;
  const from = tAt(-LAYOUT.TICK_GAP, view, width);
  const to = tAt(width + LAYOUT.TICK_GAP, view, width);
  const major = [];
  let minor = [];
  if (k < 2 * LAYOUT.TICK_GAP) {
    const step = YEAR_STEPS.find((s) => s * k >= LAYOUT.TICK_GAP) ?? 2000;
    for (const t of roundYears(step, from, to)) major.push({ t, label: yearLabel(t) });
    if (step > 1 && from <= 1 && to >= 1) major.push({ t: 1, label: 'AD 1' });
    major.sort((a, b) => a.t - b.t);
    const written = new Set(major.map((tick) => tick.t));
    if (MINOR_OF[step]) minor = roundYears(MINOR_OF[step], from, to).filter((t) => !written.has(t));
    return { major, minor };
  }
  const byDay = (10 * k) / 365 >= LAYOUT.TICK_GAP;
  const months = byDay ? 0 : ([1, 3, 6].find((s) => (s * k) / 12 >= LAYOUT.TICK_GAP) ?? 6);
  const days = [1, 2, 5, 10].find((s) => (s * k) / 365 >= LAYOUT.TICK_GAP) ?? 10;
  for (let year = Math.floor(from); year <= Math.floor(to); year++) {
    for (let m = 0; m < 12; m++) {
      const start = year + DAYS[m] / 365;
      const length = (DAYS[m + 1] ?? 365) - DAYS[m];
      if (months) {
        if (m % months === 0) major.push({ t: start, label: m === 0 ? yearLabel(year) : MONTHS[m] });
        else minor.push(start);
        continue;
      }
      for (let d = 1; d <= length; d++) {
        const t = year + (DAYS[m] + d - 1) / 365;
        if ((d - 1) % days === 0 && d <= length - days / 2 + 1) major.push({ t, label: d === 1 && m === 0 ? yearLabel(year) : `${d} ${MONTHS[m]}` });
        else minor.push(t);
      }
    }
  }
  return { major: major.filter((tick) => tick.t >= from && tick.t <= to), minor: minor.filter((t) => t >= from && t <= to) };
}

// ───────────────────────────────────────────────── motion ─────────────────────────────────────────────────

/** Where a fling let go at `x` with `velocity` px/ms comes to rest. */
export const glideRest = (x, velocity) => x + velocity * MOTION.GLIDE_MS;
/** Where a glide from `from` to its `rest` is after `ms`: fast at first, then slowing, never past the rest. */
export const glideAt = (from, rest, ms) => rest - (rest - from) * Math.exp(-ms / MOTION.GLIDE_MS);
/** Snap to the chapter: a rest within SNAP_PX of the chapter's place is the chapter's place. Both in px. */
export const snapRest = (rest, home) => (Math.abs(rest - home) < MOTION.SNAP_PX ? home : rest);

/**
 * A flight from one view to another, `share` 0 to 1 of the way: van Wijk and Nuij's smooth zoom-and-pan (the path d3-interpolate's interpolateZoom takes), in one dimension. Far
 * apart, it draws back, crosses and closes in, so the eye keeps its place; near, it is a plain zoom.
 */
export function flyAt(from, to, width, share) {
  if (share <= 0) return { ...from };
  if (share >= 1) return { ...to };
  // the years in view at each end, and the years between the two middles; rho, the path's one number, is the square root of 2 (so rho squared is the 2 and its fourth power the 4 below)
  const w0 = width / from.k;
  const w1 = width / to.k;
  const dx = to.c - from.c;
  const d = Math.abs(dx);
  if (d < 1e-9 * Math.max(w0, w1)) return { c: from.c + share * dx, k: width / (w0 * Math.exp(share * Math.log(w1 / w0))) };
  const b0 = (w1 * w1 - w0 * w0 + 4 * d * d) / (4 * w0 * d);
  const b1 = (w1 * w1 - w0 * w0 - 4 * d * d) / (4 * w1 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const s = share * (r1 - r0) + r0;
  const u = (w0 / (2 * d)) * (Math.cosh(r0) * Math.tanh(s) - Math.sinh(r0));
  return { c: from.c + u * dx, k: (width * Math.cosh(s)) / (w0 * Math.cosh(r0)) };
}

/** How long a flight takes: longer the further it goes in zoom and place, between FLY_MIN_MS and FLY_MAX_MS. */
export function flyMs(from, to, width) {
  const zoom = Math.abs(Math.log(to.k / from.k));
  const pan = Math.abs(to.c - from.c) * Math.min(from.k, to.k) / width;
  return clamp(MOTION.FLY_MIN_MS + 80 * zoom + 60 * Math.min(pan, 4), MOTION.FLY_MIN_MS, MOTION.FLY_MAX_MS);
}

const easeOut = (p) => 1 - (1 - p) ** 3;
const easeInOut = (p) => 0.5 - Math.cos(Math.PI * p) / 2;

// ───────────────────────────────────────────────── lanes ─────────────────────────────────────────────────

/** How many lanes of events and of people a strip `height` px tall has, from how many each needs in view: people take what they need, never over PEOPLE_SHARE of the lanes, and events keep one. */
export function dealLanes(height, need) {
  const lanes = Math.max(1, Math.floor((height - LAYOUT.FLAG - LAYOUT.SPINE) / LAYOUT.LANE));
  const people = Math.max(0, Math.min(need.people, Math.floor(lanes * LAYOUT.PEOPLE_SHARE + 1e-9), lanes - 1));
  return { events: lanes - people, people };
}

/**
 * Marks into lanes. Each mark is { id, x0, x1, rank }, its reach with its name: the lowest rank chooses first, then the leftmost. A mark takes the first lane where it and its
 * name touch nothing; failing that it goes to the ribbon. Nothing stands in a lane unnamed, and none is lost.
 */
export function packLanes(marks, lanes) {
  const rows = Array.from({ length: lanes }, () => []);
  const placed = [];
  const ribbon = [];
  const free = (row, x0, x1) => {
    let low = 0;
    let high = row.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (row[mid][0] <= x0) low = mid + 1;
      else high = mid;
    }
    return (low === row.length || row[low][0] >= x1) && (low === 0 || row[low - 1][1] <= x0) ? low : -1;
  };
  const order = [...marks].sort((a, b) => a.rank - b.rank || a.x0 - b.x0 || (a.id < b.id ? -1 : 1));
  for (const mark of order) {
    let lane = 0;
    let at = -1;
    while (lane < lanes && (at = free(rows[lane], mark.x0, mark.x1)) === -1) lane++;
    if (at === -1) {
      ribbon.push(mark.id);
      continue;
    }
    rows[lane].splice(at, 0, [mark.x0, mark.x1]);
    placed.push({ id: mark.id, lane });
  }
  return { placed, ribbon };
}

// ───────────────────────────────────────────────── words ─────────────────────────────────────────────────

/** A span of the axis as a card writes it: 'about 759 to 697 BC', 'AD 27 to 30', '5 BC to AD 30'; a day as '1 May AD 30'. 'about' wherever the data gives a year and no day. */
export function whenOf(event) {
  const start = tOf(event.year, event.date);
  const years = yearsOf(event.duration);
  if (event.date && years < 1) {
    const [, m, d] = /(\d\d)-(\d\d)$/.exec(event.date);
    return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${yearLabel(start)}`;
  }
  const end = start + Math.floor(years);
  if (Math.floor(end) === Math.floor(start)) return `about ${yearLabel(start)}`;
  return `about ${spanWords(start, end)}`;
}

function spanWords(a, b) {
  if (a <= 0 && b <= 0) return `${yearLabel(a).replace(' BC', '')} to ${yearLabel(b)}`;
  if (a > 0 && b > 0) return `${yearLabel(a)} to ${yearLabel(b).replace('AD ', '')}`;
  return `${yearLabel(a)} to ${yearLabel(b)}`;
}

/** A duration in words: '62 years', '7 years 6 months', '3 days'; nothing for a single day. */
export function lengthOf(duration) {
  if (duration === '1D') return '';
  const names = { Y: 'year', M: 'month', W: 'week', D: 'day' };
  return [...duration.matchAll(/(\d+(?:\.\d+)?)([YMWD])/g)].map(([, n, unit]) => `${n} ${names[unit]}${Number(n) === 1 ? '' : 's'}`).join(' ');
}

/** An event's verses of one book as the card's chips: a run of whole chapters is one chip ('Isaiah 1 to 66'), anything else its own ('2 Kings 18:1-8'). Each chip names where a tap goes. */
export function refsOf(name, ranges) {
  const chips = [];
  for (let i = 0; i < ranges.length; i++) {
    let j = i;
    while (j + 1 < ranges.length && ranges[j][1] === 1 && ranges[j + 1][1] === 1 && ranges[j + 1][0] === ranges[j][0] + 1) j++;
    const [chapter, from, to] = ranges[i];
    if (j > i) chips.push({ label: `${name} ${chapter}–${ranges[j][0]}`, chapter, verse: 1, last: ranges[j][0] });
    else chips.push({ label: `${name} ${chapter}:${from}${to > from ? `–${to}` : ''}`, chapter, verse: from, last: chapter });
    i = j;
  }
  return chips;
}

// ───────────────────────────────────────────────── the strip ─────────────────────────────────────────────────

/** The door to the rig's own files: a book's timeline as `npm run timeline:build` wrote it, read as it is. A book with no file (it has no dated event or person) answers an empty one. */
export const door = (repo) => ({
  book: (code) =>
    fetch(new URL(`src/timeline/data/${code}.json`, repo)).then((answer) => (answer.ok ? answer.json() : { book: code, credit: '', events: [], people: {}, places: {} })),
});

const el = (tag, attrs = {}, text) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};
const rgba = (hex, alpha) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;

/**
 * The strip in `root`. `options`: `data` (the door to the files: book(code) answers a BookTimeline), `book`, `chapter`, `chapterName` ('Isaiah 1'), `books` (code to name, in canon
 * order), `whole` (the Whole Bible button of the handle row), `onVerse(book, chapter, verse)`, `stress` (draw every event this many times, for the budget's headroom).
 */
export async function mount(root, options) {
  const { book, chapter, chapterName, books, onVerse = () => {}, stress = 1 } = options;
  const reduced = () => options.still || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the picture, then what is read and pressed, above it
  root.classList.add('tl');
  root.tabIndex = 0;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Timeline');
  root.setAttribute('data-two-finger', '');
  if (options.still) root.setAttribute('data-still', '');
  const canvas = root.appendChild(el('canvas', { 'aria-hidden': 'true' }));
  const hits = root.appendChild(el('div', { class: 'tl-hits' }));
  const homeChip = root.appendChild(el('button', { type: 'button', class: 'tl-home', 'data-nopan': '', hidden: '' }));
  const zoom = root.appendChild(el('div', { class: 'tl-zoom', 'data-nopan': '', role: 'group', 'aria-label': 'Zoom' }));
  const zoomOut = zoom.appendChild(el('button', { type: 'button', 'aria-label': 'Zoom out', 'data-repeat': '' }, '−'));
  const zoomIn = zoom.appendChild(el('button', { type: 'button', 'aria-label': 'Zoom in', 'data-repeat': '' }, '+'));
  const card = root.appendChild(el('section', { class: 'tl-card', 'data-nopan': '', hidden: '', 'aria-live': 'polite' }));
  const live = root.appendChild(el('p', { class: 'tl-live', role: 'status' }));
  const ctx = canvas.getContext('2d', { alpha: false });

  // ── the data: the open book at once, the rest of the Bible when the strip has drawn
  const events = new Map();
  const people = new Map();
  let credit = ''; // the line the data asks to be shown with it, from whichever file is read first (every file carries the same)
  function take(file, isOwn) {
    credit ||= file.credit;
    for (const [key, person] of Object.entries(file.people)) {
      const known = people.get(key) ?? { key, name: person.name, born: person.born, died: person.died, own: false, events: [] };
      known.own ||= isOwn;
      people.set(key, known);
    }
    for (const event of file.events) {
      const known = events.get(event.id) ?? { ...event, verses: {}, a: tOf(event.year, event.date), own: false, here: false };
      known.b = known.a + yearsOf(event.duration);
      known.verses[file.book] = event.verses;
      known.own ||= isOwn;
      known.here ||= isOwn && event.verses.some(([c]) => c === chapter);
      events.set(event.id, known);
    }
  }
  take(await options.data.book(book), true);

  // ── the marks: every event and every dated life, each with its years on the axis and its rank (the chapter's first, then the book's, then the rest, the longest first)
  let marks = [];
  const byId = new Map();
  function build() {
    marks = [];
    byId.clear();
    for (const person of people.values()) person.events = [];
    for (const event of events.values()) for (const key of event.people) people.get(key)?.events.push(event);
    for (let copy = 0; copy < stress; copy++) {
      for (const event of events.values()) {
        const life = event.title.startsWith('Lifetime of ') && event.people.length === 1 && people.get(event.people[0])?.born !== undefined && people.get(event.people[0])?.died !== undefined;
        // a 'Lifetime of' event is the person's own line, drawn once, among the people
        if (life) continue;
        const shift = copy * 3.7;
        marks.push({ id: `e${event.id}${copy ? `x${copy}` : ''}`, kind: 'event', event, a: event.a + shift, b: event.b + shift, text: event.title, rank: event.here ? 0 : event.own ? 1 : 2 });
      }
    }
    for (const person of people.values()) {
      if (person.born === undefined && person.died === undefined) continue;
      const a = person.born !== undefined ? tOf(person.born) : null;
      const b = person.died !== undefined ? tOf(person.died) : null;
      const here = person.events.some((event) => event.here);
      marks.push({ id: `p${person.key}`, kind: 'person', person, a: a ?? b, b: b ?? a, openStart: a === null, openEnd: b === null, text: person.name.replace(/ \(.*\)$/, ''), rank: here ? 0 : person.own ? 1 : 2 });
    }
    for (const mark of marks) byId.set(mark.id, mark);
    packed = null;
  }

  // ── the chapter's years: its events', else the book's, else none (the strip then opens on the whole Bible)
  const span = (list) => (list.length ? { a: Math.min(...list.map((e) => e.a)), b: Math.max(...list.map((e) => Math.max(e.b, e.a + (e.date ? 0 : 1)))) } : null);
  const chapterSpan = span([...events.values()].filter((e) => e.here)) ?? span([...events.values()]);

  // ── size, colours, type
  let width = 0;
  let height = 0;
  let ratio = 1;
  let colours = {};
  let face = 'sans-serif';
  const font = (px, weight = 500) => `${weight} ${px}px ${face}`;
  function readLook() {
    const style = getComputedStyle(root);
    const token = (name) => style.getPropertyValue(`--lp-${name}`).trim();
    colours = Object.fromEntries(['canvas', 'surface', 'line', 'fg', 'muted', 'accent', 'accent-fg'].map((name) => [name, token(name)]));
    face = style.fontFamily;
    widths.clear();
    packed = null;
  }
  const widths = new Map();
  /** A label cut to LABEL_MAX, and its width: measured once. */
  function labelOf(text, weight) {
    const key = `${weight}:${text}`;
    let known = widths.get(key);
    if (!known) {
      ctx.font = font(LAYOUT.TITLE_PX, weight);
      let shown = text;
      let w = ctx.measureText(shown).width;
      while (w > LAYOUT.LABEL_MAX && shown.length > 4) {
        shown = `${shown.slice(0, -2).trimEnd()}…`;
        w = ctx.measureText(shown).width;
      }
      known = { shown, w: Math.ceil(w) };
      widths.set(key, known);
    }
    return known;
  }

  // ── the view, the home, the lanes
  let view = { c: 0, k: 1 };
  let home = null;
  let whole = null;
  let before = null; // where he was when he pressed Whole Bible
  let deal = { events: 1, people: 0 };
  let packed = null; // the lanes of the marks at this zoom, in px from the axis's 0: a pan reuses it
  let selected = null;
  let trayHeight = 0;
  const drawn = new Map(); // per mark: where it is drawn now (y, how present in its lane, how present its label), eased toward where it belongs
  const stats = { frames: 0, last: 0, marks: 0 };

  const layoutHeight = () => Math.max(LAYOUT.STRIP_MIN, height - trayHeight);
  const laneCount = () => Math.max(1, Math.floor((layoutHeight() - LAYOUT.FLAG - LAYOUT.SPINE) / LAYOUT.LANE));
  const top = () => LAYOUT.FLAG + Math.max(0, layoutHeight() - LAYOUT.FLAG - LAYOUT.SPINE - laneCount() * LAYOUT.LANE) / 2;
  const spineY = () => top() + deal.events * LAYOUT.LANE;

  /** A mark's reach at this zoom, in px from the axis's 0: itself and its name. Never narrower than a thumb. */
  function reach(mark, k) {
    const label = labelOf(mark.text, mark.rank < 1 ? 600 : 500);
    if (mark.kind === 'person') {
      const x0 = mark.a * k - (mark.openStart ? 56 : 0);
      const end = mark.b * k + (mark.openEnd ? 56 : 0);
      return { x0, x1: Math.max(end, x0 + label.w + 4, x0 + LAYOUT.TARGET) + LAYOUT.GAP, label, inside: true, bar: true };
    }
    // an event of one day is a dot at every zoom: a day is the data's smallest grain
    const bar = mark.event.duration !== '1D' && (mark.b - mark.a) * k >= LAYOUT.DOT;
    const start = bar ? mark.a * k : mark.a * k - LAYOUT.DOT / 2;
    const end = bar ? mark.b * k : start + LAYOUT.DOT;
    const inside = bar && end - start >= label.w + 20;
    // a title that would run past the end of the Bible's time, where the widest view stops, stands before its mark instead: the New Testament's titles are never cut by the edge
    const flip = !inside && end + 6 + label.w > T1 * k + LAYOUT.ZOOM_BOX - 8 && start - 6 - label.w >= T0 * k - LAYOUT.WHOLE_PAD + 8;
    const x0 = flip ? start - 6 - label.w : start;
    // a bar that holds its title needs no room after it: a reign that ends the year the next begins stands in the same lane, a hair between them
    const x1 = Math.max(inside || flip ? end : end + 6 + label.w, x0 + LAYOUT.TARGET) + (inside ? 0 : LAYOUT.GAP);
    return { x0, x1, label, inside, bar, flip };
  }

  /** Who chooses a lane first at this zoom: the chosen mark, the chapter's, the book's, then the rest, those whose length suits the zoom before the far longer and the far shorter. */
  const rankAt = (mark, k, r) => {
    if (mark.id === selected) return -1;
    if (mark.rank < 2) return mark.rank;
    // a day's dot suits no zoom more than another, so the spans go first; and a bar that holds its own title before one whose title must stand beside it, where the next bar wants to be
    if (!r.bar) return 2.25;
    const px = Math.max(8, (mark.b - mark.a) * k);
    return 2 + Math.min(0.24, Math.abs(Math.log(px / (mark.kind === 'event' ? LAYOUT.SUIT_EVENT : LAYOUT.SUIT_LIFE))) / 16) + (r.inside ? 0 : 0.1);
  };

  function pack() {
    if (packed && packed.k === view.k && packed.events === deal.events && packed.people === deal.people && packed.selected === selected) return packed;
    const reaches = new Map();
    const lists = { event: [], person: [] };
    for (const mark of marks) {
      const r = reach(mark, view.k);
      reaches.set(mark.id, r);
      lists[mark.kind].push({ id: mark.id, x0: r.x0, x1: r.x1, rank: rankAt(mark, view.k, r) });
    }
    const lanes = new Map();
    const ribbons = { event: [], person: [] };
    for (const [kind, count] of [['event', deal.events], ['person', deal.people]]) {
      const { placed, ribbon } = packLanes(lists[kind], count);
      for (const place of placed) lanes.set(place.id, place);
      ribbons[kind] = ribbon;
    }
    packed = { k: view.k, events: deal.events, people: deal.people, selected, reaches, lanes, ribbons };
    return packed;
  }

  /** How many lanes the marks in view would fill, were there no limit: what the lanes are dealt from, at rest. */
  function need() {
    const inView = { event: [], person: [] };
    const left = (view.c - width / 2 / view.k) * view.k;
    for (const mark of marks) {
      const r = reach(mark, view.k);
      if (r.x1 > left && r.x0 < left + width) inView[mark.kind].push({ id: mark.id, x0: r.x0, x1: r.x1, rank: rankAt(mark, view.k, r) });
    }
    const used = (list) => new Set(packLanes(list, 12).placed.map((p) => p.lane)).size;
    return { events: used(inView.event), people: used(inView.person) };
  }

  function dealAgain() {
    let next = dealLanes(layoutHeight(), need());
    // a person's card keeps a lane for the person, whatever the room
    if (selected?.startsWith('p') && next.people === 0) next = { events: Math.max(0, next.events - 1), people: 1 };
    if (next.events !== deal.events || next.people !== deal.people) {
      deal = next;
      packed = null;
    }
  }

  // ── drawing: one pass over the marks; nothing here reads the page's layout
  let lastDraw = 0;
  function draw(now = performance.now()) {
    const began = performance.now();
    const dt = lastDraw ? Math.min(64, now - lastDraw) : 16.7;
    lastDraw = now;
    const ease = reduced() ? 1 : 1 - Math.exp(-dt / MOTION.EASE_MS);
    const { reaches, lanes } = pack();
    const k = view.k;
    const origin = width / 2 - view.c * k; // a mark at px X from the axis's 0 is drawn at origin + X
    const spine = spineY();
    let moving = false;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = colours.surface;
    ctx.fillRect(0, 0, width, height);

    // the chapter's years: a soft column through the whole strip
    if (home) {
      const a = Math.max(-4, origin + chapterSpan.a * k);
      const b = Math.min(width + 4, Math.max(origin + chapterSpan.b * k, origin + chapterSpan.a * k + 3));
      if (b > 0 && a < width) {
        ctx.fillStyle = rgba(colours.accent, 0.1);
        ctx.fillRect(a, 0, b - a, height);
        ctx.fillStyle = colours.accent;
        ctx.fillRect(a, 0, b - a, 2);
      }
    }

    // the ruler: a hairline down the strip at each written year, the line, the ticks, the years
    const rule = ticks(view, width);
    ctx.fillStyle = colours.line;
    for (const tick of rule.major) ctx.fillRect(Math.round(origin + tick.t * k), LAYOUT.FLAG, 1, height - LAYOUT.FLAG);
    ctx.fillRect(0, spine + 12, width, 1);
    ctx.fillStyle = colours.muted;
    for (const t of rule.minor) ctx.fillRect(Math.round(origin + t * k), spine + 12, 1, 4);
    ctx.font = font(LAYOUT.SMALL_PX, 500);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // months and days carry no year: the year at the left edge stays written there, and no tick is written under it
    const year = k >= 2 * LAYOUT.TICK_GAP ? yearLabel(tAt(0, view, width)) : '';
    const kept = year ? ctx.measureText(year).width + 44 : 0;
    for (const tick of rule.major) {
      const x = Math.round(origin + tick.t * k);
      ctx.fillRect(x, spine + 12, 1, 7);
      if (x >= kept) ctx.fillText(tick.label, x, spine + 30);
    }
    ctx.textAlign = 'left';
    if (year) {
      ctx.fillStyle = colours.fg;
      ctx.font = font(LAYOUT.SMALL_PX, 600);
      ctx.fillText(year, 8, spine + 30);
    }

    // the marks
    let count = 0;
    for (const mark of marks) {
      const r = reaches.get(mark.id);
      const sx0 = origin + r.x0;
      const sx1 = origin + r.x1;
      const place = lanes.get(mark.id);
      const event = mark.kind === 'event';
      const lane = place ? (event ? spine - (place.lane + 0.5) * LAYOUT.LANE : spine + LAYOUT.SPINE + (place.lane + 0.5) * LAYOUT.LANE) : event ? spine + 6 : spine + LAYOUT.SPINE - 3;
      let state = drawn.get(mark.id);
      if (!state) {
        state = { y: lane, in: 0, label: 0 };
        drawn.set(mark.id, state);
      }
      const want = place ? 1 : 0;
      const wantLabel = want;
      // a mark with no lane keeps the height it left from while it fades to the ribbon: only one with a lane has somewhere to go
      if ((place && Math.abs(state.y - lane) > 0.5) || Math.abs(state.in - want) > 0.02 || Math.abs(state.label - wantLabel) > 0.02) {
        if (place) state.y += (lane - state.y) * ease;
        state.in += (want - state.in) * ease;
        state.label += (wantLabel - state.label) * ease;
        if (sx1 > -40 && sx0 < width + 40) moving = true;
      } else {
        state.y = place ? lane : state.y;
        state.in = want;
        state.label = wantLabel;
      }
      if (sx1 < 0 || sx0 > width) continue;
      count++;
      const tone = mark.rank === 0 ? colours.accent : mark.rank === 1 ? colours.fg : colours.muted;
      const a = origin + mark.a * k;
      const b = origin + mark.b * k;

      // crowded out of the lanes: a quiet mark on the ruler's ribbon, so nothing is ever missing
      if (state.in < 0.98) {
        ctx.globalAlpha = (1 - state.in) * (mark.rank < 2 ? 0.9 : 0.55);
        ctx.fillStyle = tone;
        if (event) {
          if (b - a >= 4) ctx.fillRect(a, spine + 5, b - a, 2);
          else {
            ctx.beginPath();
            ctx.arc(a, spine + 6, 2, 0, 7);
            ctx.fill();
          }
        } else {
          ctx.globalAlpha = (1 - state.in) * 0.35;
          ctx.fillRect(Math.max(a, -2), spine + LAYOUT.SPINE - 5 + (mark.person.key.length % 2) * 3, Math.max(3, Math.min(b, width + 2) - Math.max(a, -2)), 1);
        }
        ctx.globalAlpha = 1;
      }
      if (state.in < 0.02) continue;
      ctx.globalAlpha = state.in;
      const y = state.y;
      if (event) drawEvent(mark, r, a, b, y, tone, state.label);
      else drawLife(mark, r, a, b, y, tone, state.label);
      ctx.globalAlpha = 1;
    }
    stats.marks = count;

    // the chapter's name, at the top of its column, held in view while any of the column is
    if (home) {
      const a = origin + chapterSpan.a * k;
      const b = Math.max(origin + chapterSpan.b * k, a + 3);
      if (b > 0 && a < width) {
        ctx.font = font(LAYOUT.SMALL_PX, 600);
        const w = ctx.measureText(chapterName).width;
        ctx.fillStyle = colours.accent;
        ctx.fillText(chapterName, clamp(Math.max(a + 6, 8), 8, Math.max(8, Math.min(width - w - 8, Math.max(b - w - 6, a + 6)))), LAYOUT.FLAG / 2 + 3);
      }
    }

    // time goes on past both sides
    for (const [x, from, to] of [[0, 1, 0], [width - LAYOUT.EDGE_FADE, 0, 1]]) {
      const fade = ctx.createLinearGradient(x, 0, x + LAYOUT.EDGE_FADE, 0);
      fade.addColorStop(0, rgba(colours.surface, from));
      fade.addColorStop(1, rgba(colours.surface, to));
      ctx.fillStyle = fade;
      ctx.fillRect(x, LAYOUT.FLAG, LAYOUT.EDGE_FADE, height - LAYOUT.FLAG);
    }
    stats.frames++;
    stats.last = performance.now() - began;
    return moving;
  }

  function roundRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, w), h, Math.max(0, Math.min(radius, w / 2)));
  }

  function drawEvent(mark, r, a, b, y, tone, labelShare) {
    const chosen = mark.id === selected;
    const weight = mark.rank === 0 ? 600 : 500;
    ctx.font = font(LAYOUT.TITLE_PX, weight);
    let textX;
    let textTone = tone;
    if (r.bar) {
      const x = Math.max(a + 1, -12);
      const w = Math.min(b - 1, width + 12) - x;
      roundRect(x, y - LAYOUT.BAR / 2, w, LAYOUT.BAR, 8);
      if (mark.rank === 0) {
        ctx.fillStyle = tone;
        ctx.fill();
        textTone = r.inside ? colours['accent-fg'] : tone;
      } else if (mark.rank === 1) {
        ctx.fillStyle = rgba(colours.fg, 0.1);
        ctx.fill();
        ctx.fillStyle = colours.fg;
        ctx.fillRect(Math.max(a, 0), y - LAYOUT.BAR / 2 + 4, 3, LAYOUT.BAR - 8);
      } else {
        ctx.fillStyle = rgba(colours.muted, 0.08);
        ctx.fill();
        ctx.strokeStyle = rgba(colours.muted, 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // a title inside its bar keeps in view while the bar is: it slides along as the bar leaves by the left
      textX = r.inside ? clamp(Math.max(a + 10, 10), a + 10, Math.max(a + 10, b - r.label.w - 10)) : r.flip ? a - 6 - r.label.w : b + 6;
    } else {
      ctx.beginPath();
      ctx.arc(a, y, LAYOUT.DOT / 2, 0, 7);
      if (mark.rank < 2) {
        ctx.fillStyle = tone;
        ctx.fill();
      } else {
        ctx.strokeStyle = tone; // another book's day: a ring, not a dot, so colour is never the only sign
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      textX = r.flip ? a - LAYOUT.DOT / 2 - 6 - r.label.w : a + LAYOUT.DOT / 2 + 6;
    }
    if (chosen) {
      const x = r.bar ? Math.max(a, -12) - 3 : a - LAYOUT.DOT / 2 - 3;
      const w = r.bar ? Math.min(b, width + 12) - Math.max(a, -12) + 6 : LAYOUT.DOT + 6;
      roundRect(x, y - LAYOUT.BAR / 2 - 3, w, LAYOUT.BAR + 6, 11);
      ctx.strokeStyle = colours.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (labelShare > 0.02) {
      ctx.globalAlpha *= labelShare;
      ctx.fillStyle = textTone;
      ctx.fillText(r.label.shown, textX, y + 1);
    }
  }

  function drawLife(mark, r, a, b, y, tone, labelShare) {
    const line = y + 11;
    const from = mark.openStart ? a - 56 : a;
    const to = mark.openEnd ? b + 56 : b;
    // a life with no known birth or death fades out at that end
    if (mark.openStart || mark.openEnd) {
      const stroke = ctx.createLinearGradient(from, 0, to, 0);
      const span = Math.max(1, to - from);
      stroke.addColorStop(0, rgba(tone, mark.openStart ? 0 : 1));
      if (mark.openStart) stroke.addColorStop(Math.min(1, 56 / span), tone);
      if (mark.openEnd) stroke.addColorStop(Math.max(0, 1 - 56 / span), tone);
      stroke.addColorStop(1, rgba(tone, mark.openEnd ? 0 : 1));
      ctx.fillStyle = stroke;
    } else ctx.fillStyle = tone;
    const x = Math.max(from, -8);
    roundRect(x, line - LAYOUT.LIFE / 2, Math.max(2, Math.min(to, width + 8) - x), LAYOUT.LIFE, 2);
    ctx.fill();
    ctx.fillStyle = tone;
    if (!mark.openStart) {
      ctx.beginPath();
      ctx.arc(a, line, 5, 0, 7);
      ctx.fill();
    }
    if (!mark.openEnd) ctx.fillRect(b - 1, line - 6, 2, 12);
    if (mark.id === selected) {
      roundRect(Math.max(from, -8) - 4, y - 20, Math.min(to, width + 8) - Math.max(from, -8) + 8, 40, 10);
      ctx.strokeStyle = colours.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (labelShare > 0.02) {
      ctx.globalAlpha *= labelShare;
      ctx.font = font(LAYOUT.TITLE_PX, mark.rank === 0 ? 600 : 500);
      // the name rides its line: at the line's start, or at the strip's left edge while the start is out of view
      ctx.fillText(r.label.shown, clamp(Math.max(from, 10), from, Math.max(from, to - r.label.w)), y - 7);
    }
  }

  // ── frames: asked for only while something moves; at rest the strip runs no frame at all
  let frame = 0;
  let anim = null;
  function ask() {
    if (!frame) frame = requestAnimationFrame(step);
  }
  function step(now) {
    frame = 0;
    if (anim) {
      const done = anim(now);
      if (done) {
        anim = null;
        rest();
      }
    }
    const moving = draw(now);
    if (anim || moving) ask();
    else lastDraw = 0;
    options.onFrame?.(stats);
  }

  const bounded = (next) => ({ c: clamp(next.c, T0, T1), k: clamp(next.k, kMin(width), K_MAX) });

  /** Go to a view over `ms`: a flight when it is far in place and zoom, else a plain ease. At once when motion is reduced. */
  function go(to, ms, fly = false) {
    to = bounded(to);
    hits.hidden = true;
    if (reduced() || ms <= 0) {
      view = to;
      anim = null;
      rest();
      ask();
      return;
    }
    const from = { ...view };
    const began = performance.now();
    anim = (now) => {
      const p = Math.min(1, (now - began) / ms);
      view = fly ? flyAt(from, to, width, easeInOut(p)) : { c: from.c + (to.c - from.c) * easeOut(p), k: Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * easeOut(p)) };
      return p >= 1;
    };
    ask();
  }
  const flyTo = (to) => go(to, flyMs(view, bounded(to), width), true);

  /** Zoom by `factor` about the place under `x`, which stays under it. */
  function zoomBy(factor, x = width / 2, ms = MOTION.ZOOM_MS) {
    const k = clamp(view.k * factor, kMin(width), K_MAX);
    const t = tAt(x, view, width);
    const to = { c: t - (x - width / 2) / k, k };
    if (ms <= 0 || reduced()) {
      view = bounded(to);
      rest();
      ask();
      return;
    }
    hits.hidden = true;
    const from = view.k;
    const began = performance.now();
    anim = (now) => {
      const p = Math.min(1, (now - began) / ms);
      const at = Math.exp(Math.log(from) + (Math.log(k) - Math.log(from)) * easeOut(p));
      view = { c: clamp(t - (x - width / 2) / at, T0, T1), k: at };
      return p >= 1;
    };
    ask();
  }

  const atHome = () => home && Math.abs((view.c - home.c) * view.k) < 1 && Math.abs(Math.log(view.k / home.k)) < 0.01;
  const atWhole = () => Math.abs(Math.log(view.k / whole.k)) < 0.01 && Math.abs((view.c - whole.c) * view.k) < 1;

  // ── at rest: the lanes are dealt again from what is in view, and the real buttons are laid over the picture
  function rest() {
    dealAgain();
    const { reaches, lanes, ribbons } = pack();
    const origin = width / 2 - view.c * view.k;
    const spine = spineY();
    hits.replaceChildren();
    hits.hidden = false;
    const button = (label, x, y, w, h, act, mark) => {
      const b = el('button', { type: 'button', 'aria-label': label, style: `left:${Math.round(x)}px;top:${Math.round(y)}px;width:${Math.round(w)}px;height:${Math.round(h)}px` });
      if (mark) b.dataset.mark = mark;
      b.addEventListener('click', act);
      hits.appendChild(b);
    };
    for (const mark of marks) {
      const place = lanes.get(mark.id);
      const r = reaches.get(mark.id);
      if (!place) continue;
      const x0 = Math.max(0, origin + r.x0);
      const x1 = Math.min(width, origin + r.x1 - (r.inside ? 0 : LAYOUT.GAP));
      if (x1 - x0 < 12) continue;
      const event = mark.kind === 'event';
      const y = event ? spine - (place.lane + 1) * LAYOUT.LANE : spine + LAYOUT.SPINE + place.lane * LAYOUT.LANE;
      button(event ? `${mark.text}, ${whenOf(mark.event)}` : `${mark.text}, ${lifeWords(mark.person)}`, x0, y, Math.max(x1 - x0, Math.min(LAYOUT.TARGET, width - x0)), LAYOUT.LANE, () => open(mark.id), mark.id);
    }
    // the ribbon: what found no lane, a thumb's width at a time; one is opened, several are listed
    const crowd = [...ribbons.event, ...ribbons.person]
      .map((id) => byId.get(id))
      .map((mark) => ({ mark, x0: Math.max(0, origin + mark.a * view.k), x1: Math.min(width, Math.max(origin + mark.b * view.k, origin + mark.a * view.k + 1)) }))
      .filter((m) => m.x1 >= 0 && m.x0 <= width)
      .sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < crowd.length; ) {
      let j = i;
      let end = Math.min(crowd[i].x1, crowd[i].x0 + LAYOUT.TARGET);
      while (j + 1 < crowd.length && crowd[j + 1].x0 <= Math.max(end, crowd[i].x0 + LAYOUT.TARGET)) {
        j++;
        end = Math.max(end, Math.min(crowd[j].x1, crowd[j].x0 + LAYOUT.TARGET));
      }
      const group = crowd.slice(i, j + 1).map((m) => m.mark);
      const x0 = crowd[i].x0;
      const w = Math.max(LAYOUT.TARGET, end - x0);
      const x = clamp(x0 - (w - (end - x0)) / 2, 0, Math.max(0, width - w));
      const near = yearLabel(tAt(x + w / 2, view, width));
      button(group.length === 1 ? `${group[0].text}` : `${group.length} near ${near}`, x, spine, w, LAYOUT.SPINE, () => (group.length === 1 ? open(group[0].id) : list(group, near)), 'ribbon');
      i = j + 1;
    }
    // the way back to the chapter, at the side it lies on, when its years are out of view
    if (home) {
      const a = origin + chapterSpan.a * view.k;
      const b = origin + chapterSpan.b * view.k;
      const away = b < 0 ? 'left' : a > width ? 'right' : '';
      homeChip.hidden = !away;
      homeChip.dataset.side = away;
      homeChip.textContent = away === 'left' ? `‹ ${chapterName}` : `${chapterName} ›`;
    }
    zoom.style.top = `${Math.round(spine)}px`;
    options.whole?.setAttribute('aria-pressed', String(atWhole()));
    zoomOut.setAttribute('aria-disabled', String(view.k <= kMin(width) * 1.001));
    zoomIn.setAttribute('aria-disabled', String(view.k >= K_MAX * 0.999));
    const left = tAt(0, view, width);
    const right = tAt(width, view, width);
    live.textContent = `${spanWords(Math.max(left, T0), Math.min(right, T1))}${atHome() ? `, ${chapterName}` : ''}`;
    options.onRest?.({ view, home: atHome(), whole: atWhole(), deal });
  }

  const lifeWords = (person) => {
    if (person.born !== undefined && person.died !== undefined) return `about ${spanWords(tOf(person.born), tOf(person.died))}`;
    return person.born !== undefined ? `born about ${yearLabel(tOf(person.born))}` : `died about ${yearLabel(tOf(person.died))}`;
  };

  // ── the card: it rises from the strip's foot and the strip makes room above it, the chosen mark ringed and kept in a lane
  function tray(build) {
    card.replaceChildren();
    const head = card.appendChild(el('div', { class: 'tl-card-head' }));
    const close = el('button', { type: 'button', class: 'tl-card-close' }, 'Close');
    close.addEventListener('click', shut);
    build(head, card);
    head.appendChild(close);
    card.hidden = false;
    card.style.maxHeight = `${Math.max(132, height - LAYOUT.STRIP_MIN)}px`;
    trayHeight = card.offsetHeight;
    packed = null;
    rest();
    ask();
  }
  function shut() {
    card.hidden = true;
    selected = null;
    trayHeight = 0;
    packed = null;
    rest();
    ask();
    root.focus({ preventScroll: true });
  }
  const row = (parent, cls) => parent.appendChild(el('div', { class: cls }));

  function open(id) {
    const mark = byId.get(id);
    if (!mark) return;
    selected = id;
    if (mark.kind === 'person') return openPerson(mark);
    const event = mark.event;
    tray((head, body) => {
      head.appendChild(el('h2', {}, event.title));
      const length = lengthOf(event.duration);
      body.appendChild(el('p', { class: 'tl-card-when' }, `${whenOf(event)}${length ? ` · ${length}` : ''}`));
      const verses = row(body, 'tl-chips');
      const codes = Object.keys(event.verses).sort((a, b) => (a === book ? -1 : b === book ? 1 : Object.keys(books).indexOf(a) - Object.keys(books).indexOf(b)));
      for (const code of codes) {
        for (const ref of refsOf(books[code] ?? code, event.verses[code])) {
          const here = code === book && chapter >= ref.chapter && chapter <= ref.last;
          const chip = verses.appendChild(el('button', { type: 'button', class: 'tl-chip' }, ref.label));
          if (here) chip.setAttribute('aria-current', 'true');
          chip.addEventListener('click', () => (here ? onVerse(code, chapter, ref.chapter === chapter ? ref.verse : 1) : onVerse(code, ref.chapter, ref.verse)));
        }
      }
      if (event.people.length) {
        const who = row(body, 'tl-chips tl-who');
        for (const key of event.people) {
          const person = people.get(key);
          if (!person) continue;
          const dated = byId.has(`p${key}`);
          const name = who.appendChild(el(dated ? 'button' : 'span', dated ? { type: 'button', class: 'tl-chip tl-chip-quiet' } : { class: 'tl-name' }, person.name));
          if (dated) name.addEventListener('click', () => open(`p${key}`));
        }
      }
    });
    // an event with no lane at this zoom is flown to, so it has one and wears the ring
    if (!pack().lanes.has(id)) flyTo(fitView(mark.a, Math.max(mark.b, mark.a + 1 / 365), width, 0.4));
  }

  function openPerson(mark) {
    const person = mark.person;
    tray((head, body) => {
      head.appendChild(el('h2', {}, person.name));
      const years = person.born !== undefined && person.died !== undefined ? ` · ${Math.round(tOf(person.died) - tOf(person.born))} years` : '';
      body.appendChild(el('p', { class: 'tl-card-when' }, `${lifeWords(person)}${years}`));
      const told = person.events.filter((event) => byId.has(`e${event.id}`)).sort((a, b) => a.a - b.a);
      if (told.length) {
        const rows = row(body, 'tl-rows');
        for (const event of told.slice(0, 8)) {
          const item = rows.appendChild(el('button', { type: 'button', class: 'tl-row' }));
          item.appendChild(el('span', {}, event.title));
          item.appendChild(el('span', { class: 'tl-row-when' }, whenOf(event).replace('about ', '')));
          item.addEventListener('click', () => open(`e${event.id}`));
        }
      }
    });
    const a = mark.openStart ? mark.a - 30 : mark.a;
    const b = mark.openEnd ? mark.b + 30 : mark.b;
    const x0 = xOf(a, view, width);
    const x1 = xOf(b, view, width);
    if (!pack().lanes.has(mark.id) || x1 < 40 || x0 > width - 40) flyTo(fitView(a, b, width, 0.7));
  }

  function list(group, near) {
    selected = null;
    tray((head, body) => {
      head.appendChild(el('h2', {}, `${group.length} near ${near}`));
      const rows = row(body, 'tl-rows');
      for (const mark of [...group].sort((a, b) => a.rank - b.rank || a.a - b.a)) {
        const item = rows.appendChild(el('button', { type: 'button', class: 'tl-row' }));
        item.appendChild(el('span', {}, mark.kind === 'person' ? mark.person.name : mark.event.title));
        item.appendChild(el('span', { class: 'tl-row-when' }, (mark.kind === 'person' ? lifeWords(mark.person) : whenOf(mark.event)).replace('about ', '')));
        item.addEventListener('click', () => open(mark.id));
      }
    });
  }

  // ── gestures: one finger pans, and lets go into a glide; two zoom about the place between them. Up and down are the page's (the dock's body scrolls): touch-action is pan-y.
  const fingers = new Map();
  let pan = null;
  let pinch = null;
  let dragged = false;
  // where the strip's left edge is on the screen: read when a finger comes down or the wheel turns, never while a finger moves
  let edge = 0;
  const local = (event) => event.clientX - edge;

  /** Past an end of the Bible's time, or of the zoom, the strip follows the finger by RUBBER of its travel. */
  const rubberC = (c) => (c < T0 ? T0 + (c - T0) * MOTION.RUBBER : c > T1 ? T1 + (c - T1) * MOTION.RUBBER : c);
  const rubberK = (k) => {
    const low = kMin(width);
    return k < low ? low * (k / low) ** MOTION.RUBBER : k > K_MAX ? K_MAX * (k / K_MAX) ** MOTION.RUBBER : k;
  };

  root.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-nopan]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.pointerType === 'touch' && (event.clientX < MOTION.EDGE_PX || event.clientX > innerWidth - MOTION.EDGE_PX)) return;
    edge = root.getBoundingClientRect().left;
    fingers.set(event.pointerId, { x: local(event), y: event.clientY });
    anim = null; // a finger on a gliding strip catches it
    dragged = false;
    if (fingers.size === 1) pan = { id: event.pointerId, x: local(event), y: event.clientY, c: view.c, moved: false, trail: [[event.timeStamp, local(event)]] };
    else if (fingers.size === 2) beginPinch();
  });

  function beginPinch() {
    const [a, b] = [...fingers.values()];
    const mid = (a.x + b.x) / 2;
    pinch = { span: Math.max(24, Math.hypot(a.x - b.x, a.y - b.y)), k: view.k, t: tAt(mid, view, width) };
    pan = null;
    dragged = true;
    hits.hidden = true;
  }

  root.addEventListener('pointermove', (event) => {
    const finger = fingers.get(event.pointerId);
    if (!finger) return;
    finger.x = local(event);
    finger.y = event.clientY;
    if (pinch && fingers.size >= 2) {
      const [a, b] = [...fingers.values()];
      const mid = (a.x + b.x) / 2;
      const k = rubberK(pinch.k * (Math.max(24, Math.hypot(a.x - b.x, a.y - b.y)) / pinch.span));
      view = { c: pinch.t - (mid - width / 2) / k, k };
      ask();
      return;
    }
    if (!pan || pan.id !== event.pointerId) return;
    const dx = finger.x - pan.x;
    if (!pan.moved) {
      if (Math.abs(dx) < MOTION.TAP_SLOP || Math.abs(dx) <= Math.abs(finger.y - pan.y)) return;
      pan.moved = true;
      dragged = true;
      pan.x = finger.x; // no jump as the pan takes hold
      hits.hidden = true;
      root.setPointerCapture(event.pointerId);
      return;
    }
    view = { c: rubberC(pan.c - dx / view.k), k: view.k };
    pan.trail.push([event.timeStamp, finger.x]);
    while (pan.trail.length > 2 && event.timeStamp - pan.trail[0][0] > MOTION.SPEED_WINDOW_MS) pan.trail.shift();
    ask();
  });

  function lift(event) {
    if (!fingers.delete(event.pointerId)) return;
    if (pinch) {
      pinch = null;
      if (fingers.size === 1) {
        const [[id, finger]] = [...fingers];
        pan = { id, x: finger.x, y: finger.y, c: view.c, moved: true, trail: [[event.timeStamp, finger.x]] };
        return;
      }
      return settle(0);
    }
    if (!pan || pan.id !== event.pointerId) return;
    const moved = pan.moved;
    const [[t0, x0]] = pan.trail;
    const [t1, x1] = pan.trail.at(-1);
    pan = null;
    if (!moved) return;
    const quiet = event.timeStamp - t1 > MOTION.SPEED_WINDOW_MS; // a finger that stopped before lifting throws nothing
    settle(event.type === 'pointercancel' || quiet || t1 === t0 ? 0 : clamp((x1 - x0) / (t1 - t0), -MOTION.FLING_MAX, MOTION.FLING_MAX));
  }
  root.addEventListener('pointerup', lift);
  root.addEventListener('pointercancel', lift);
  // a tap that became a drag presses nothing
  root.addEventListener('click', (event) => {
    if (!dragged) return;
    dragged = false;
    event.stopPropagation();
    event.preventDefault();
  }, true);
  // a pan or a pinch under way is ours: the page must not take the fingers back for a scroll (docs/pwa-best-practices.md: pan-y and a touchmove that is not passive)
  root.addEventListener('touchmove', (event) => {
    if (pinch || pan?.moved) event.preventDefault();
  }, { passive: false });

  /** A finger let go at `velocity` px/ms: glide to rest (on the chapter when it would rest near it), or come back from past an end. */
  function settle(velocity) {
    const k = clamp(view.k, kMin(width), K_MAX);
    if (k !== view.k || view.c < T0 || view.c > T1) return go({ c: view.c, k }, MOTION.SPRING_MS);
    const fling = Math.abs(velocity) >= MOTION.FLING_MIN && !reduced();
    // in px: the strip's middle now is 0, the chapter's middle is where the snap looks
    let restPx = fling ? glideRest(0, -velocity) : 0;
    const snaps = home && chapterSpan && (chapterSpan.b - chapterSpan.a) * k < width && Math.abs(Math.log(k / home.k)) < Math.log(1.5);
    if (snaps) restPx = snapRest(restPx, (home.c - view.c) * k);
    const to = clamp(view.c + restPx / k, T0, T1);
    if (Math.abs(to - view.c) * k < 0.5) {
      rest();
      ask();
      return;
    }
    if (!fling) return go({ c: to, k }, MOTION.SPRING_MS);
    const from = view.c;
    const began = performance.now();
    hits.hidden = true;
    anim = (now) => {
      view = { c: glideAt(from, to, now - began), k };
      if (Math.abs(to - view.c) * k >= 0.5) return false;
      view = { c: to, k };
      if (snaps && to === home.c) navigator.vibrate?.(10); // the hold's own tick (src/ui/longPress.ts), as the strip settles on the chapter
      return true;
    };
    ask();
  }

  // a mouse and a trackpad: sideways moves time, a pinch (ctrl and the wheel) zooms about the pointer; up and down stay the page's
  root.addEventListener('wheel', (event) => {
    if (event.target.closest('.tl-card')) return;
    edge = root.getBoundingClientRect().left;
    if (event.ctrlKey) {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.01), local(event), 0);
    } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
      event.preventDefault();
      anim = null;
      view = bounded({ c: view.c + (event.deltaX || event.deltaY) / view.k, k: view.k });
      rest();
      ask();
    }
  }, { passive: false });

  root.addEventListener('keydown', (event) => {
    if (event.target !== root) return;
    const acts = {
      ArrowLeft: () => go({ c: view.c - (MOTION.PAN_STEP * width) / view.k, k: view.k }, MOTION.SPRING_MS),
      ArrowRight: () => go({ c: view.c + (MOTION.PAN_STEP * width) / view.k, k: view.k }, MOTION.SPRING_MS),
      '+': () => zoomBy(MOTION.ZOOM_STEP),
      '=': () => zoomBy(MOTION.ZOOM_STEP),
      '-': () => zoomBy(1 / MOTION.ZOOM_STEP),
      Home: () => home && flyTo(home),
      Escape: () => !card.hidden && shut(),
    };
    if (!acts[event.key]) return;
    event.preventDefault();
    acts[event.key]();
  });
  zoomIn.addEventListener('click', () => zoomBy(MOTION.ZOOM_STEP));
  zoomOut.addEventListener('click', () => zoomBy(1 / MOTION.ZOOM_STEP));
  homeChip.addEventListener('click', () => flyTo(home));
  options.whole?.addEventListener('click', () => {
    if (atWhole()) return flyTo(before ?? home ?? whole);
    before = { ...view };
    flyTo(whole);
  });

  // ── the box: the canvas is the strip's size at up to two device px to one; the views are worked out again from the width
  function size() {
    const box = root.getBoundingClientRect();
    if (!box.width || !box.height || (box.width === width && box.height === height)) return;
    const wasHome = !home || atHome();
    const wasWhole = whole && atWhole();
    width = box.width;
    height = box.height;
    ratio = Math.min(LAYOUT.DPR_MAX, Math.max(1, devicePixelRatio || 1));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    whole = wholeView(width);
    home = chapterSpan ? fitView(chapterSpan.a, chapterSpan.b, width) : null;
    if (wasWhole) view = whole;
    else if (wasHome) view = home ?? whole;
    view = bounded(view);
    packed = null;
    rest();
    draw();
  }
  readLook();
  build();
  new ResizeObserver(size).observe(root);
  size();
  new MutationObserver(() => {
    readLook();
    ask();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  document.fonts?.ready.then(() => {
    readLook();
    ask();
  });

  // the rest of the Bible, once the strip has drawn: its events stand quiet round the chapter's
  const others = Object.keys(books).filter((code) => code !== book);
  const loaded = Promise.all(others.map((code) => options.data.book(code).then((file) => file && take(file, false), () => {}))).then(() => {
    build();
    rest();
    ask();
  });

  return {
    stats,
    get credit() {
      return credit;
    },
    ready: loaded,
    get view() {
      return view;
    },
    get deal() {
      return deal;
    },
    home: () => home && go(home, 0),
    whole: () => go(whole, 0),
    flyHome: () => home && flyTo(home),
    flyWhole: () => flyTo(whole),
    show: (to) => go(to, 0),
    open,
    openAt(title) {
      const mark = marks.find((m) => m.text === title);
      if (mark) open(mark.id);
    },
    /**
     * The budget's run (docs/timeline-design.md 'The budget check'): `frames` frames of a pan across six widths at the chapter's zoom, then `frames` of a zoom from the chapter out to
     * the whole Bible and back in to a day. Each frame is the strip's whole work (lanes, easing, drawing) and ends by reading a pixel back, so the drawing is done inside the time.
     */
    bench(frames = 240) {
      const kept = { ...view };
      const start = home ?? whole;
      const time = (views) => {
        const ms = [];
        let clock = 0;
        for (const next of views) {
          view = next;
          const began = performance.now();
          dealAgain();
          draw((clock += 16.7));
          ctx.getImageData(0, 0, 1, 1);
          ms.push(performance.now() - began);
        }
        ms.sort((a, b) => a - b);
        return { mean: ms.reduce((a, b) => a + b, 0) / ms.length, p95: ms[Math.floor(ms.length * 0.95)], worst: ms.at(-1) };
      };
      const pans = Array.from({ length: frames }, (_, i) => ({ c: start.c + ((i / frames) * 6 - 3) * (width / start.k), k: start.k }));
      const zooms = Array.from({ length: frames }, (_, i) => {
        const p = i / (frames - 1);
        const k = p < 0.5 ? Math.exp(Math.log(start.k) + (Math.log(kMin(width)) - Math.log(start.k)) * (p * 2)) : Math.exp(Math.log(kMin(width)) + (Math.log(K_MAX) - Math.log(kMin(width))) * (p * 2 - 1));
        return { c: start.c, k };
      });
      const result = { marks: marks.length, width, height, ratio, pan: time(pans), zoom: time(zooms) };
      view = kept;
      packed = null;
      lastDraw = 0;
      rest();
      draw();
      return result;
    },
    /** A real flight out to the whole Bible and back, on the screen's own frames: how many came, how far apart, and the strip's own work in each (the gap between the two flights is not counted). */
    cadence() {
      return new Promise((done) => {
        const gaps = [];
        const work = [];
        let last = 0;
        let leg = 0;
        options.onFrame = (frameStats) => {
          const now = performance.now();
          if (last && anim) gaps.push(now - last);
          if (anim) work.push(frameStats.last);
          last = now;
        };
        options.onRest = () => {
          leg++;
          if (leg === 1) setTimeout(() => flyTo(home ?? whole), 0);
          else if (leg === 2) {
            options.onFrame = undefined;
            options.onRest = undefined;
            gaps.sort((a, b) => a - b);
            work.sort((a, b) => a - b);
            done({ frames: gaps.length, median: gaps[gaps.length >> 1], p95: gaps[Math.floor(gaps.length * 0.95)], worst: gaps.at(-1), work: work.reduce((a, b) => a + b, 0) / work.length, workWorst: work.at(-1) });
          }
        };
        flyTo(whole);
      });
    },
  };
}
