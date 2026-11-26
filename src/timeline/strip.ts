// src/timeline/strip.ts — the timeline strip itself (mw-fnvjof.17.317.2, docs/timeline-design.md; the second half of prototypes/timeline/timeline.js, carried over without the card, which is
// mw-fnvjof.17.317.3's): one 2D canvas for the picture, drawn only while something moves, and the gestures that move it. It owns the view (where the strip stands and how far it is zoomed),
// the lanes and the frames; what is read, pressed and announced is real DOM that TimelineStrip.tsx lays over the picture from what this says at rest (`onRest`), so nothing here writes to
// the page while a finger is down. Time on the page's own clock (performance.now) times the finger's speed and every motion.
import { K_MAX, T0, T1, clamp, fitView, kMin, tAt, ticks, wholeView, yearLabel, yearOf, type View } from './axis';
import { LAYOUT, MOTION, TYPE_SCALE_MAX } from './design';
import { dealLanes, packLanes, type Deal, type LaneMark } from './lanes';
import { chapterYears, marksOf, newTold, take, type Mark } from './marks';
import { easeInOut, easeOut, flyAt, flyMs, glideAt, glideRest, rubberC, rubberK, snapRest } from './motion';
import type { BookTimeline } from './types';
import { lifeWords, standsWords, whenOf } from './words';

/** A button over the picture, at rest: a mark in its lane, or the ruler where the ribbon holds what found no lane. Px from the strip's own corner. */
export interface StripHit {
  key: string;
  /** the mark's id ('e217', 'phezekiah_1512'), or 'ribbon' */
  mark: string;
  /** its name: 'Prophecies of Isaiah, about 759 to 697 BC', '8 near 770 BC' */
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** what is under it, each by name and years: one for a mark, several for a busy place on the ruler */
  names: string[];
}

/** Where the strip stands, said each time it comes to rest. */
export interface StripRest {
  hits: StripHit[];
  /** the chapter's years are out of view, at this side */
  away: '' | 'left' | 'right';
  /** the top of the ruler, px: where the zoom buttons stand */
  spine: number;
  /** the whole Bible is in the width */
  whole: boolean;
  /** the strip stands on the chapter */
  home: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** what a screen reader hears of it: '778 to 678 BC, Isaiah 1' */
  stands: string;
  /** the year in the middle, as the data counts it (negative BC): what Bible Mapper's timeline opens at */
  year: number;
  /** the open book has a dated event (one with none opens on the whole Bible, with no column) */
  dated: boolean;
}

export interface StripOptions {
  book: string;
  chapter: number;
  /** the chapter as the Reader names it: 'Isaiah 1' */
  chapterName: string;
  /** every book's code, in canon order: the open book's file is read first, the rest after the first picture */
  books: readonly string[];
  load(book: string): Promise<BookTimeline>;
  onRest(rest: StripRest): void;
  /** the strip has begun to move: the buttons over the picture are hidden until it rests */
  onMoving(): void;
  /** every book's file is read and drawn */
  onLoaded?(): void;
  /** draw every event this many times: the budget's headroom, never the app */
  stress?: number;
}

interface Timing {
  mean: number;
  p95: number;
  worst: number;
}

export interface Strip {
  readonly view: View;
  readonly home: View | null;
  readonly width: number;
  readonly deal: Deal;
  readonly stats: { frames: number; last: number; marks: number };
  earlier(): void;
  later(): void;
  zoomIn(): void;
  zoomOut(): void;
  /** flies out to the whole Bible; pressed again, back to where he was */
  toggleWhole(): void;
  /** flies back to the chapter */
  goHome(): void;
  /** The budget's run (docs/timeline-design.md 'The budget check'): `frames` frames of a pan across six widths at the chapter's zoom, then `frames` of a zoom out to the whole Bible and in to a day. */
  bench(frames?: number): { marks: number; width: number; height: number; ratio: number; pan: Timing; zoom: Timing } | null;
  destroy(): void;
}

/** The strip's root as a test finds it: the mounted strip is on the element (tests/e2e/timeline-dock.spec.ts, timeline-budget.spec.ts). */
export type StripRoot = HTMLElement & { timeline?: Strip };

const TOKENS = ['surface', 'line', 'fg', 'muted', 'accent', 'accent-fg'] as const;
type Token = (typeof TOKENS)[number];
/** Dark's own, for a page with no stylesheet (jsdom). */
const FALLBACK: Record<Token, string> = { surface: '#111725', line: '#232c40', fg: '#e7ebf3', muted: '#9aa5ba', accent: '#f2b544', 'accent-fg': '#1a1204' };

/** A token as six-digit hex: the build writes #ffffff as #fff. Any other form is given back as it is. */
const sixDigits = (colour: string): string => colour.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3');

/** A token's colour at an alpha. The tokens are hex (src/index.css); any other form is given back as it is. */
function rgba(colour: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(sixDigits(colour))?.[1];
  if (!hex) return colour;
  return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${alpha})`;
}

interface Reach {
  x0: number;
  x1: number;
  label: { shown: string; w: number };
  inside: boolean;
  bar: boolean;
  flip: boolean;
}
interface Packed {
  k: number;
  events: number;
  people: number;
  reaches: Map<string, Reach>;
  lanes: Map<string, { id: string; lane: number }>;
  ribbons: { event: string[]; person: string[] };
}
interface Pan {
  id: number;
  x: number;
  y: number;
  c: number;
  moved: boolean;
  trail: [number, number][];
}

/** How far a life with no known birth or death runs on, fading, at that end. */
const OPEN_END = 56;
/** A wheel's last turn is this long ago before the strip counts as at rest. */
const WHEEL_REST_MS = 120;

export function mountStrip(root: StripRoot, canvas: HTMLCanvasElement, options: StripOptions): Strip {
  const { book, chapter, chapterName, stress = 1 } = options;
  // no matchMedia (jsdom) is read as reduced motion: every move lands at once
  const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = (): boolean => motion === null || motion.matches;
  // jsdom has no canvas: the lanes and the buttons are still worked out, and nothing is drawn
  const ctx = typeof CanvasRenderingContext2D === 'undefined' ? null : canvas.getContext('2d', { alpha: false });
  const gone = new AbortController();
  const on = { signal: gone.signal };
  let dead = false;

  // ── the data: the open book at once, the rest of the Bible when the strip has drawn
  const told = newTold();
  let marks: Mark[] = [];
  const byId = new Map<string, Mark>();
  let chapterSpan: { a: number; b: number } | null = null;
  let begun = false;
  function build(): void {
    marks = marksOf(told, stress);
    byId.clear();
    for (const mark of marks) byId.set(mark.id, mark);
    labels.clear();
    laid = null;
    packed = null;
  }

  // ── size, colours, type
  let width = 0;
  let height = 0;
  let ratio = 1;
  const colours: Record<Token, string> = { ...FALLBACK };
  let face = 'sans-serif';
  let titlePx: number = LAYOUT.TITLE_PX;
  let smallPx: number = LAYOUT.SMALL_PX;
  const font = (px: number, weight = 500): string => `${weight} ${px}px ${face}`;
  // the tints a frame draws with, made when the look is read and never in a frame
  const tint = { column: '', book: '', rest: '', restEdge: '', clear: '', ground: '' };
  const fonts = { title: '', strong: '', small: '', smallStrong: '' };
  /** A mark's label, cut and measured once for this look. */
  const labels = new Map<string, { shown: string; w: number }>();
  function readLook(): void {
    const style = getComputedStyle(root);
    for (const name of TOKENS) colours[name] = sixDigits(style.getPropertyValue(`--lp-${name}`).trim()) || FALLBACK[name];
    face = style.fontFamily || 'sans-serif';
    // Settings > Appearance > Text size scales the root's font size: the picture's type follows it as far as a title still fits its bar
    const scale = Math.min(TYPE_SCALE_MAX, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16);
    titlePx = LAYOUT.TITLE_PX * scale;
    smallPx = LAYOUT.SMALL_PX * scale;
    tint.column = rgba(colours.accent, 0.1);
    tint.book = rgba(colours.fg, 0.1);
    tint.rest = rgba(colours.muted, 0.08);
    tint.restEdge = rgba(colours.muted, 0.6);
    tint.clear = rgba(colours.surface, 0);
    tint.ground = rgba(colours.surface, 1);
    fonts.title = font(titlePx, 500);
    fonts.strong = font(titlePx, 600);
    fonts.small = font(smallPx, 500);
    fonts.smallStrong = font(smallPx, 600);
    labels.clear();
    laid = null;
    packed = null;
  }
  const measure = (text: string, px: number, weight: number): number => {
    if (!ctx) return text.length * px * 0.55;
    ctx.font = font(px, weight);
    return ctx.measureText(text).width;
  };
  /** A mark's label cut to LABEL_MAX, and its width: measured once. */
  function labelOf(mark: Mark): { shown: string; w: number } {
    let known = labels.get(mark.id);
    if (!known) {
      const weight = mark.rank < 1 ? 600 : 500;
      let shown = mark.text;
      let w = measure(shown, titlePx, weight);
      while (w > LAYOUT.LABEL_MAX && shown.length > 4) {
        shown = `${shown.slice(0, -2).trimEnd()}…`;
        w = measure(shown, titlePx, weight);
      }
      known = { shown, w: Math.ceil(w) };
      labels.set(mark.id, known);
    }
    return known;
  }

  // ── the view, the home, the lanes
  let view: View = { c: 0, k: 1 };
  let home: View | null = null;
  let whole: View = { c: 0, k: 1 };
  let before: View | null = null; // where he was when he pressed Whole Bible
  let aim: View | null = null; // where a move under way is going: a second press steps from there
  let deal: Deal = { events: 1, people: 0 };
  let packed: Packed | null = null; // the lanes of the marks at this zoom, in px from the axis's 0: a pan reuses it
  let laid: { k: number; reaches: Map<string, Reach>; lists: { event: LaneMark[]; person: LaneMark[] } } | null = null; // every mark's reach and rank at this zoom, worked out once for the lanes and for what the lanes are dealt from
  const drawn = new Map<string, { y: number; in: number; label: number }>(); // per mark: where it is drawn now, eased toward where it belongs
  const stats = { frames: 0, last: 0, marks: 0 };

  const laneCount = (): number => Math.max(1, Math.floor((Math.max(LAYOUT.STRIP_MIN, height) - LAYOUT.FLAG - LAYOUT.SPINE) / LAYOUT.LANE));
  const top = (): number => LAYOUT.FLAG + Math.max(0, Math.max(LAYOUT.STRIP_MIN, height) - LAYOUT.FLAG - LAYOUT.SPINE - laneCount() * LAYOUT.LANE) / 2;
  const spineY = (): number => top() + deal.events * LAYOUT.LANE;

  /** A mark's reach at this zoom, in px from the axis's 0: itself and its name. Never narrower than a thumb. */
  function reach(mark: Mark, k: number): Reach {
    const label = labelOf(mark);
    if (mark.kind === 'person') {
      const x0 = mark.a * k - (mark.openStart ? OPEN_END : 0);
      const end = mark.b * k + (mark.openEnd ? OPEN_END : 0);
      return { x0, x1: Math.max(end, x0 + label.w + 4, x0 + LAYOUT.TARGET) + LAYOUT.GAP, label, inside: true, bar: true, flip: false };
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

  /** Who chooses a lane first at this zoom: the chapter's, the book's, then the rest, those whose length suits the zoom before the far longer and the far shorter. */
  function rankAt(mark: Mark, k: number, r: Reach): number {
    if (mark.rank < 2) return mark.rank;
    // a day's dot suits no zoom more than another, so the spans go first; and a bar that holds its own title before one whose title must stand beside it, where the next bar wants to be
    if (!r.bar) return 2.25;
    const px = Math.max(8, (mark.b - mark.a) * k);
    return 2 + Math.min(0.24, Math.abs(Math.log(px / (mark.kind === 'event' ? LAYOUT.SUIT_EVENT : LAYOUT.SUIT_LIFE))) / 16) + (r.inside ? 0 : 0.1);
  }

  function lay(): NonNullable<typeof laid> {
    if (laid && laid.k === view.k) return laid;
    const reaches = new Map<string, Reach>();
    const lists: { event: LaneMark[]; person: LaneMark[] } = { event: [], person: [] };
    for (const mark of marks) {
      const r = reach(mark, view.k);
      reaches.set(mark.id, r);
      lists[mark.kind].push({ id: mark.id, x0: r.x0, x1: r.x1, rank: rankAt(mark, view.k, r) });
    }
    laid = { k: view.k, reaches, lists };
    return laid;
  }

  function pack(): Packed {
    if (packed && packed.k === view.k && packed.events === deal.events && packed.people === deal.people) return packed;
    const { reaches, lists } = lay();
    const lanes = new Map<string, { id: string; lane: number }>();
    const ribbons: Packed['ribbons'] = { event: [], person: [] };
    for (const [kind, count] of [['event', deal.events], ['person', deal.people]] as const) {
      const { placed, ribbon } = packLanes(lists[kind], count);
      for (const place of placed) lanes.set(place.id, place);
      ribbons[kind] = ribbon;
    }
    packed = { k: view.k, events: deal.events, people: deal.people, reaches, lanes, ribbons };
    return packed;
  }

  /** How many lanes the marks in view would fill, were there no limit: what the lanes are dealt from, at rest. */
  function need(): Deal {
    const { lists } = lay();
    const left = (view.c - width / 2 / view.k) * view.k;
    const inView = { event: lists.event.filter((m) => m.x1 > left && m.x0 < left + width), person: lists.person.filter((m) => m.x1 > left && m.x0 < left + width) };
    const used = (list: LaneMark[]): number => new Set(packLanes(list, 12).placed.map((p) => p.lane)).size;
    return { events: used(inView.event), people: used(inView.person) };
  }

  function dealAgain(): void {
    const next = dealLanes(Math.max(LAYOUT.STRIP_MIN, height), need());
    if (next.events !== deal.events || next.people !== deal.people) {
      deal = next;
      packed = null;
    }
  }

  // ── drawing: one pass over the marks; nothing here reads the page's layout
  let lastDraw = 0;
  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
    c.beginPath();
    const r = Math.max(0, Math.min(radius, w / 2));
    if (typeof c.roundRect === 'function') c.roundRect(x, y, Math.max(0, w), h, r);
    else c.rect(x, y, Math.max(0, w), h);
  }

  function draw(now: number = performance.now()): boolean {
    if (!ctx || !width) return false;
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
    ctx.globalAlpha = 1;
    ctx.fillStyle = colours.surface;
    ctx.fillRect(0, 0, width, height);

    // the chapter's years: a soft column through the whole strip
    if (chapterSpan) {
      const a = Math.max(-4, origin + chapterSpan.a * k);
      const b = Math.min(width + 4, Math.max(origin + chapterSpan.b * k, origin + chapterSpan.a * k + 3));
      if (b > 0 && a < width) {
        ctx.fillStyle = tint.column;
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
    ctx.font = fonts.small;
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
      ctx.font = fonts.smallStrong;
      ctx.fillText(year, 8, spine + 30);
    }

    // the marks
    fontNow = '';
    let count = 0;
    for (const mark of marks) {
      const r = reaches.get(mark.id);
      if (!r) continue;
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
      // a mark with no lane keeps the height it left from while it fades to the ribbon: only one with a lane has somewhere to go
      if ((place && Math.abs(state.y - lane) > 0.5) || Math.abs(state.in - want) > 0.02 || Math.abs(state.label - want) > 0.02) {
        if (place) state.y += (lane - state.y) * ease;
        state.in += (want - state.in) * ease;
        state.label += (want - state.label) * ease;
        if (sx1 > -40 && sx0 < width + 40) moving = true;
      } else {
        state.y = place ? lane : state.y;
        state.in = want;
        state.label = want;
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
      if (mark.kind === 'event') drawEvent(ctx, mark, r, a, b, state.y, tone, state.label);
      else drawLife(ctx, mark, r, a, b, state.y, tone, state.label);
      ctx.globalAlpha = 1;
    }
    stats.marks = count;

    // the chapter's name, at the top of its column, held in view while any of the column is
    if (chapterSpan) {
      const a = origin + chapterSpan.a * k;
      const b = Math.max(origin + chapterSpan.b * k, a + 3);
      if (b > 0 && a < width) {
        ctx.font = fonts.smallStrong;
        const w = ctx.measureText(chapterName).width;
        ctx.fillStyle = colours.accent;
        ctx.fillText(chapterName, clamp(Math.max(a + 6, 8), 8, Math.max(8, Math.min(width - w - 8, Math.max(b - w - 6, a + 6)))), LAYOUT.FLAG / 2 + 3);
      }
    }

    // time goes on past both sides
    for (const [x, from, to] of [[0, 1, 0], [width - LAYOUT.EDGE_FADE, 0, 1]] as const) {
      const fade = ctx.createLinearGradient(x, 0, x + LAYOUT.EDGE_FADE, 0);
      fade.addColorStop(0, from ? tint.ground : tint.clear);
      fade.addColorStop(1, to ? tint.ground : tint.clear);
      ctx.fillStyle = fade;
      ctx.fillRect(x, LAYOUT.FLAG, LAYOUT.EDGE_FADE, height - LAYOUT.FLAG);
    }
    stats.frames++;
    stats.last = performance.now() - began;
    return moving;
  }

  /** The canvas's font is set only when it changes: most marks of a frame share one. */
  let fontNow = '';
  function setFont(c: CanvasRenderingContext2D, to: string): void {
    if (fontNow === to) return;
    fontNow = to;
    c.font = to;
  }

  function drawEvent(c: CanvasRenderingContext2D, mark: Mark, r: Reach, a: number, b: number, y: number, tone: string, labelShare: number): void {
    setFont(c, mark.rank === 0 ? fonts.strong : fonts.title);
    let textX: number;
    let textTone = tone;
    if (r.bar) {
      const x = Math.max(a + 1, -12);
      const w = Math.min(b - 1, width + 12) - x;
      roundRect(c, x, y - LAYOUT.BAR / 2, w, LAYOUT.BAR, 8);
      if (mark.rank === 0) {
        c.fillStyle = tone;
        c.fill();
        textTone = r.inside ? colours['accent-fg'] : tone;
      } else if (mark.rank === 1) {
        c.fillStyle = tint.book;
        c.fill();
        c.fillStyle = colours.fg;
        c.fillRect(Math.max(a, 0), y - LAYOUT.BAR / 2 + 4, 3, LAYOUT.BAR - 8);
      } else {
        c.fillStyle = tint.rest;
        c.fill();
        c.strokeStyle = tint.restEdge;
        c.lineWidth = 1;
        c.stroke();
      }
      // a title inside its bar keeps in view while the bar is: it slides along as the bar leaves by the left
      textX = r.inside ? clamp(Math.max(a + 10, 10), a + 10, Math.max(a + 10, b - r.label.w - 10)) : r.flip ? a - 6 - r.label.w : b + 6;
    } else {
      c.beginPath();
      c.arc(a, y, LAYOUT.DOT / 2, 0, 7);
      if (mark.rank < 2) {
        c.fillStyle = tone;
        c.fill();
      } else {
        c.strokeStyle = tone; // another book's day: a ring, not a dot, so colour is never the only sign
        c.lineWidth = 1.5;
        c.stroke();
      }
      textX = r.flip ? a - LAYOUT.DOT / 2 - 6 - r.label.w : a + LAYOUT.DOT / 2 + 6;
    }
    if (labelShare > 0.02) {
      c.globalAlpha *= labelShare;
      c.fillStyle = textTone;
      c.fillText(r.label.shown, textX, y + 1);
    }
  }

  function drawLife(c: CanvasRenderingContext2D, mark: Mark & { kind: 'person' }, r: Reach, a: number, b: number, y: number, tone: string, labelShare: number): void {
    const line = y + 11;
    const from = mark.openStart ? a - OPEN_END : a;
    const to = mark.openEnd ? b + OPEN_END : b;
    // a life with no known birth or death fades out at that end
    if (mark.openStart || mark.openEnd) {
      const stroke = c.createLinearGradient(from, 0, to, 0);
      const span = Math.max(1, to - from);
      stroke.addColorStop(0, rgba(tone, mark.openStart ? 0 : 1));
      if (mark.openStart) stroke.addColorStop(Math.min(1, OPEN_END / span), tone);
      if (mark.openEnd) stroke.addColorStop(Math.max(0, 1 - OPEN_END / span), tone);
      stroke.addColorStop(1, rgba(tone, mark.openEnd ? 0 : 1));
      c.fillStyle = stroke;
    } else c.fillStyle = tone;
    const x = Math.max(from, -8);
    roundRect(c, x, line - LAYOUT.LIFE / 2, Math.max(2, Math.min(to, width + 8) - x), LAYOUT.LIFE, 2);
    c.fill();
    c.fillStyle = tone;
    if (!mark.openStart) {
      c.beginPath();
      c.arc(a, line, 5, 0, 7);
      c.fill();
    }
    if (!mark.openEnd) c.fillRect(b - 1, line - 6, 2, 12);
    if (labelShare > 0.02) {
      c.globalAlpha *= labelShare;
      setFont(c, mark.rank === 0 ? fonts.strong : fonts.title);
      // the name rides its line: at the line's start, or at the strip's left edge while the start is out of view
      c.fillText(r.label.shown, clamp(Math.max(from, 10), from, Math.max(from, to - r.label.w)), y - 7);
    }
  }

  // ── frames: asked for only while something moves; at rest the strip runs no frame at all
  let frame = 0;
  let anim: ((now: number) => boolean) | null = null;
  function ask(): void {
    if (!frame && !dead) frame = requestAnimationFrame(step);
  }
  function step(now: number): void {
    frame = 0;
    if (dead) return;
    if (anim) {
      const done = anim(performance.now());
      if (done) {
        anim = null;
        rest();
      }
    }
    const moving = draw(now);
    if (anim || moving) ask();
    else lastDraw = 0;
  }

  const bounded = (next: View): View => ({ c: clamp(next.c, T0, T1), k: clamp(next.k, kMin(width), K_MAX) });
  let hidden = false;
  /** The strip moves: the buttons over the picture go until it rests. Said once a move. */
  function moves(): void {
    if (hidden) return;
    hidden = true;
    options.onMoving();
  }

  /** Go to a view over `ms`: a flight when `fly`, else a plain ease. At once when motion is reduced. */
  function go(target: View, ms: number, fly = false): void {
    const to = bounded(target);
    if (reduced() || ms <= 0) {
      view = to;
      anim = null;
      rest();
      ask();
      return;
    }
    moves();
    aim = to;
    const from = { ...view };
    const began = performance.now();
    anim = (now) => {
      const p = clamp((now - began) / ms, 0, 1);
      view = fly ? flyAt(from, to, width, easeInOut(p)) : { c: from.c + (to.c - from.c) * easeOut(p), k: Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * easeOut(p)) };
      if (p >= 1) view = to;
      return p >= 1;
    };
    ask();
  }
  const flyTo = (to: View): void => go(to, flyMs(view, bounded(to), width), true);
  /** One step of the zoom buttons or keys, about the middle; a second press before the first has landed steps on from where that one is going. */
  const zoomStep = (factor: number): void => {
    const base = aim ?? view;
    go({ c: base.c, k: base.k * factor }, MOTION.ZOOM_MS);
  };
  /** One step of Earlier, Later or an arrow key. */
  const panStep = (by: 1 | -1): void => {
    const base = aim ?? view;
    go({ c: base.c + (by * MOTION.PAN_STEP * width) / base.k, k: base.k }, MOTION.SPRING_MS);
  };

  const atHome = (): boolean => home !== null && Math.abs((view.c - home.c) * view.k) < 1 && Math.abs(Math.log(view.k / home.k)) < 0.01;
  const atWhole = (): boolean => Math.abs(Math.log(view.k / whole.k)) < 0.01 && Math.abs((view.c - whole.c) * view.k) < 1;

  // ── at rest: the lanes are dealt again from what is in view, and the page is told what stands where, for the real buttons over the picture
  function rest(): void {
    aim = null;
    hidden = false;
    if (!begun || !width) return;
    dealAgain();
    const { reaches, lanes, ribbons } = pack();
    const origin = width / 2 - view.c * view.k;
    const spine = spineY();
    const hits: StripHit[] = [];
    const nameOf = (mark: Mark): string => `${mark.kind === 'event' ? mark.event.title : mark.person.name}, ${mark.kind === 'event' ? whenOf(mark.event) : lifeWords(mark.person)}`;
    for (const mark of marks) {
      const place = lanes.get(mark.id);
      const r = reaches.get(mark.id);
      if (!place || !r) continue;
      const x0 = Math.max(0, origin + r.x0);
      const x1 = Math.min(width, origin + r.x1 - (r.inside ? 0 : LAYOUT.GAP));
      if (x1 - x0 < 12) continue;
      const event = mark.kind === 'event';
      const y = event ? spine - (place.lane + 1) * LAYOUT.LANE : spine + LAYOUT.SPINE + place.lane * LAYOUT.LANE;
      hits.push({ key: mark.id, mark: mark.id, label: nameOf(mark), x: Math.round(x0), y: Math.round(y), w: Math.round(Math.max(x1 - x0, Math.min(LAYOUT.TARGET, width - x0))), h: LAYOUT.LANE, names: [nameOf(mark)] });
    }
    // the ribbon: what found no lane, a thumb's width at a time
    const crowd = [...ribbons.event, ...ribbons.person]
      .map((id) => byId.get(id))
      .filter((mark): mark is Mark => mark !== undefined)
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
      // in the order they would have chosen lanes: the chapter's, the book's, the rest, each by year
      const group = crowd.slice(i, j + 1).map((m) => m.mark).sort((a, b) => a.rank - b.rank || a.a - b.a);
      const x0 = crowd[i].x0;
      const w = Math.max(LAYOUT.TARGET, end - x0);
      const x = clamp(x0 - (w - (end - x0)) / 2, 0, Math.max(0, width - w));
      const near = yearLabel(tAt(x + w / 2, view, width));
      hits.push({ key: `ribbon${i}`, mark: 'ribbon', label: group.length === 1 ? nameOf(group[0]) : `${group.length} near ${near}`, x: Math.round(x), y: Math.round(spine), w: Math.round(w), h: LAYOUT.SPINE, names: group.map(nameOf) });
      i = j + 1;
    }
    // the way back to the chapter, at the side it lies on, when its years are out of view
    let away: StripRest['away'] = '';
    if (chapterSpan) {
      const a = origin + chapterSpan.a * view.k;
      const b = origin + chapterSpan.b * view.k;
      away = b < 0 ? 'left' : a > width ? 'right' : '';
    }
    const left = tAt(0, view, width);
    const right = tAt(width, view, width);
    options.onRest({
      hits,
      away,
      spine: Math.round(spine),
      whole: atWhole(),
      home: atHome(),
      canZoomIn: view.k < K_MAX * 0.999,
      canZoomOut: view.k > kMin(width) * 1.001,
      stands: `${standsWords(Math.max(left, T0), Math.min(right, T1))}${atHome() ? `, ${chapterName}` : ''}`,
      year: yearOf(view.c),
      dated: chapterSpan !== null,
    });
  }

  // ── gestures: one finger pans, and lets go into a glide; two zoom about the place between them. Up and down are the page's (the dock's body scrolls): touch-action is pan-y.
  const fingers = new Map<number, { x: number; y: number }>();
  let pan: Pan | null = null;
  let pinch: { span: number; k: number; t: number } | null = null;
  let dragged = false;
  // where the strip's left edge is on the screen: read when a finger comes down or the wheel turns, never while a finger moves
  let edge = 0;
  const local = (event: { clientX: number }): number => event.clientX - edge;

  root.addEventListener(
    'pointerdown',
    (event) => {
      // a new press is a new tap: a finger's drag ends with no click to swallow, and must not cost the next tap (on a zoom button, on the chapter's name) its own
      dragged = false;
      if ((event.target as Element).closest('[data-nopan]') || (event.pointerType === 'mouse' && event.button !== 0) || !begun) return;
      if (event.pointerType === 'touch' && (event.clientX < MOTION.EDGE_PX || event.clientX > window.innerWidth - MOTION.EDGE_PX)) return;
      edge = root.getBoundingClientRect().left;
      fingers.set(event.pointerId, { x: local(event), y: event.clientY });
      // a finger on a gliding strip catches it
      if (anim) {
        anim = null;
        aim = null;
        dragged = true;
      }
      if (fingers.size === 1) pan = { id: event.pointerId, x: local(event), y: event.clientY, c: view.c, moved: false, trail: [[performance.now(), local(event)]] };
      else if (fingers.size === 2) beginPinch();
    },
    on,
  );

  function beginPinch(): void {
    const [a, b] = [...fingers.values()];
    const mid = (a.x + b.x) / 2;
    pinch = { span: Math.max(24, Math.hypot(a.x - b.x, a.y - b.y)), k: view.k, t: tAt(mid, view, width) };
    pan = null;
    dragged = true;
    moves();
  }

  root.addEventListener(
    'pointermove',
    (event) => {
      const finger = fingers.get(event.pointerId);
      if (!finger) return;
      finger.x = local(event);
      finger.y = event.clientY;
      if (pinch && fingers.size >= 2) {
        const [a, b] = [...fingers.values()];
        const mid = (a.x + b.x) / 2;
        const k = rubberK(pinch.k * (Math.max(24, Math.hypot(a.x - b.x, a.y - b.y)) / pinch.span), width);
        view = { c: pinch.t - (mid - width / 2) / k, k };
        ask();
        return;
      }
      if (!pan || pan.id !== event.pointerId) return;
      let dx = finger.x - pan.x;
      if (!pan.moved) {
        if (Math.abs(dx) < MOTION.TAP_SLOP || Math.abs(dx) <= Math.abs(finger.y - pan.y)) return;
        pan.moved = true;
        dragged = true;
        // time moves one to one from the 8th px: the slop is taken off where the pan takes hold, so there is no jump
        pan.x += Math.sign(dx) * MOTION.TAP_SLOP;
        dx = finger.x - pan.x;
        try {
          root.setPointerCapture(event.pointerId);
        } catch {
          // a pointer that has already gone: the pan ends with its lift
        }
        moves();
      }
      view = { c: rubberC(pan.c - dx / view.k), k: view.k };
      const now = performance.now();
      pan.trail.push([now, finger.x]);
      while (pan.trail.length > 2 && now - pan.trail[0][0] > MOTION.SPEED_WINDOW_MS) pan.trail.shift();
      ask();
    },
    on,
  );

  function lift(event: PointerEvent): void {
    if (!fingers.delete(event.pointerId)) return;
    if (pinch) {
      pinch = null;
      const [last] = [...fingers];
      if (last) {
        // one finger left of the two: it goes on as a pan from where it is
        pan = { id: last[0], x: last[1].x, y: last[1].y, c: view.c, moved: true, trail: [[performance.now(), last[1].x]] };
        return;
      }
      settle(0);
      return;
    }
    if (!pan || pan.id !== event.pointerId) return;
    const { moved, trail } = pan;
    pan = null;
    if (!moved) {
      // a tap that caught a glide leaves the strip where it was caught
      if (dragged) settle(0);
      return;
    }
    const [t0, x0] = trail[0];
    const [t1, x1] = trail[trail.length - 1];
    const quiet = performance.now() - t1 > MOTION.SPEED_WINDOW_MS; // a finger that stopped before lifting throws nothing
    settle(event.type === 'pointercancel' || quiet || t1 === t0 ? 0 : clamp((x1 - x0) / (t1 - t0), -MOTION.FLING_MAX, MOTION.FLING_MAX));
  }
  root.addEventListener('pointerup', lift, on);
  root.addEventListener('pointercancel', lift, on);
  // a tap that became a drag, or that caught a glide, presses nothing
  root.addEventListener(
    'click',
    (event) => {
      if (!dragged) return;
      dragged = false;
      event.stopPropagation();
      event.preventDefault();
    },
    { capture: true, signal: gone.signal },
  );
  // a pan or a pinch under way is ours: the page must not take the fingers back for a scroll (docs/pwa-best-practices.md: pan-y and a touchmove that is not passive)
  root.addEventListener(
    'touchmove',
    (event) => {
      if ((pinch || pan?.moved) && event.cancelable) event.preventDefault();
    },
    { passive: false, signal: gone.signal },
  );

  /** A finger let go at `velocity` px/ms: glide to rest (on the chapter when it would rest near it), or come back from past an end. */
  function settle(velocity: number): void {
    const k = clamp(view.k, kMin(width), K_MAX);
    if (k !== view.k || view.c < T0 || view.c > T1) return go({ c: view.c, k }, MOTION.SPRING_MS);
    const fling = Math.abs(velocity) >= MOTION.FLING_MIN && !reduced();
    // in px: the strip's middle now is 0, the chapter's middle is where the snap looks
    let restPx = fling ? glideRest(0, -velocity) : 0;
    const snaps = home !== null && chapterSpan !== null && (chapterSpan.b - chapterSpan.a) * k < width && Math.abs(Math.log(k / home.k)) < Math.log(1.5);
    if (snaps && home) restPx = snapRest(restPx, (home.c - view.c) * k);
    const to = clamp(view.c + restPx / k, T0, T1);
    if (Math.abs(to - view.c) * k < 0.5) {
      rest();
      ask();
      return;
    }
    if (!fling) return go({ c: to, k }, MOTION.SPRING_MS);
    const from = view.c;
    const began = performance.now();
    const lands = snaps && home !== null && to === home.c;
    moves();
    anim = (now) => {
      view = { c: glideAt(from, to, now - began), k };
      if (Math.abs(to - view.c) * k >= 0.5) return false;
      view = { c: to, k };
      // the hold's own tick (src/ui/longPress.ts), as the strip settles on the chapter
      if (lands && typeof navigator.vibrate === 'function') navigator.vibrate(10);
      return true;
    };
    ask();
  }

  // a mouse and a trackpad: sideways moves time, a pinch (ctrl and the wheel) zooms about the pointer; up and down stay the page's
  let wheelRest = 0;
  root.addEventListener(
    'wheel',
    (event) => {
      if (!begun) return;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
      if (!event.ctrlKey && !sideways) return;
      event.preventDefault();
      edge = root.getBoundingClientRect().left;
      anim = null;
      aim = null;
      if (event.ctrlKey) {
        const x = local(event);
        const k = clamp(view.k * Math.exp(-event.deltaY * 0.01), kMin(width), K_MAX);
        view = bounded({ c: tAt(x, view, width) - (x - width / 2) / k, k });
      } else view = bounded({ c: view.c + (event.deltaX || event.deltaY) / view.k, k: view.k });
      moves();
      ask();
      // the wheel has no lift: the strip is at rest when it has not turned for a moment
      window.clearTimeout(wheelRest);
      wheelRest = window.setTimeout(() => {
        if (dead || anim) return;
        rest();
        ask();
      }, WHEEL_REST_MS);
    },
    { passive: false, signal: gone.signal },
  );

  const goHome = (): void => {
    if (home) flyTo(home);
  };
  root.addEventListener(
    'keydown',
    (event) => {
      if (event.target !== root || !begun || event.ctrlKey || event.metaKey || event.altKey) return;
      const acts: Record<string, () => void> = {
        ArrowLeft: () => panStep(-1),
        ArrowRight: () => panStep(1),
        '+': () => zoomStep(MOTION.ZOOM_STEP),
        '=': () => zoomStep(MOTION.ZOOM_STEP),
        '-': () => zoomStep(1 / MOTION.ZOOM_STEP),
        Home: goHome,
      };
      const act = acts[event.key];
      if (!act) return;
      event.preventDefault();
      act();
    },
    on,
  );

  // ── the box: the canvas is the strip's size at up to two device px to one; the views are worked out again from the width
  function size(): void {
    const box = root.getBoundingClientRect();
    if (!box.width || !box.height || (box.width === width && box.height === height)) return;
    const wasHome = home !== null && atHome();
    const wasWhole = width > 0 && atWhole();
    const first = width === 0;
    width = box.width;
    height = box.height;
    ratio = Math.min(LAYOUT.DPR_MAX, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    whole = wholeView(width);
    home = chapterSpan ? fitView(chapterSpan.a, chapterSpan.b, width) : null;
    if (first || wasWhole) view = whole;
    if (begun && (first || (wasHome && !wasWhole))) view = home ?? whole;
    view = bounded(view);
    packed = null;
    if (anim) return ask();
    rest();
    draw();
  }

  readLook();
  const sized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(size);
  sized?.observe(root);
  size();
  const looked = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
    readLook();
    if (begun && !anim) rest();
    ask();
  });
  looked?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
  void document.fonts?.ready.then(() => {
    if (dead) return;
    readLook();
    if (begun && !anim) rest();
    ask();
  });

  // the open book first: the strip opens on the chapter's years; then the rest of the Bible, whose events stand quiet round the chapter's
  void options
    .load(book)
    .catch((): BookTimeline => ({ book, credit: '', events: [], people: {}, places: {} }))
    .then((own) => {
      if (dead) return;
      take(told, own, true, chapter);
      chapterSpan = chapterYears(told);
      build();
      begun = true;
      if (width) {
        home = chapterSpan ? fitView(chapterSpan.a, chapterSpan.b, width) : null;
        view = bounded(home ?? whole);
        rest();
        draw();
      }
      return Promise.all(options.books.filter((code) => code !== book).map((code) => options.load(code).then((file) => !dead && take(told, file, false, chapter), () => undefined)));
    })
    .then(() => {
      if (dead) return;
      build();
      if (!anim && !pan && !pinch) rest();
      ask();
      options.onLoaded?.();
    });

  const api: Strip = {
    get view() {
      return view;
    },
    get home() {
      return home;
    },
    get width() {
      return width;
    },
    get deal() {
      return deal;
    },
    stats,
    earlier: () => panStep(-1),
    later: () => panStep(1),
    zoomIn: () => zoomStep(MOTION.ZOOM_STEP),
    zoomOut: () => zoomStep(1 / MOTION.ZOOM_STEP),
    toggleWhole() {
      if (!begun || !width) return;
      if (atWhole()) return flyTo(before ?? home ?? whole);
      before = { ...view };
      flyTo(whole);
    },
    goHome,
    bench(frames = 240) {
      if (!ctx || !width) return null;
      const kept = { ...view };
      const start = home ?? whole;
      const time = (views: View[]): Timing => {
        const ms: number[] = [];
        let clock = 0;
        for (const next of views) {
          view = next;
          const began = performance.now();
          dealAgain();
          draw((clock += 16.7));
          // the drawing is done inside the time: a pixel is read back
          ctx.getImageData(0, 0, 1, 1);
          ms.push(performance.now() - began);
        }
        ms.sort((a, b) => a - b);
        return { mean: ms.reduce((a, b) => a + b, 0) / ms.length, p95: ms[Math.floor(ms.length * 0.95)], worst: ms[ms.length - 1] };
      };
      const pans = Array.from({ length: frames }, (_, i) => ({ c: start.c + ((i / frames) * 6 - 3) * (width / start.k), k: start.k }));
      const low = kMin(width);
      const zooms = Array.from({ length: frames }, (_, i) => {
        const p = i / (frames - 1);
        const k = p < 0.5 ? Math.exp(Math.log(start.k) + (Math.log(low) - Math.log(start.k)) * (p * 2)) : Math.exp(Math.log(low) + (Math.log(K_MAX) - Math.log(low)) * (p * 2 - 1));
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
    destroy() {
      dead = true;
      gone.abort();
      sized?.disconnect();
      looked?.disconnect();
      window.clearTimeout(wheelRest);
      if (frame) cancelAnimationFrame(frame);
      delete root.timeline;
    },
  };
  root.timeline = api;
  return api;
}
