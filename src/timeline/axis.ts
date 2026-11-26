// src/timeline/axis.ts — time on the timeline strip, as pure maths (mw-fnvjof.17.317.2, docs/timeline-design.md; ported from prototypes/timeline/timeline.js). The data's years are
// integers, negative for BC, with no year 0 (docs/timeline.md); the axis is a plain number line on which 1 BC is 0 and AD 1 is 1, so a span's length is a subtraction. A view is the
// place at the middle of the strip and the px a year takes; the ruler's ticks are worked out from a view.
import { LAYOUT } from './design';

const DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A view of the strip: the place at its middle (`c`, on the axis) and the px one year takes (`k`). */
export interface View {
  c: number;
  k: number;
}

export const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));

/** A year of the data (negative BC, no year 0) as a place on the axis, where 1 BC is 0 and AD 1 is 1; a day ('0030-05-01') adds its share of the year. */
export function tOf(year: number, date?: string): number {
  const base = year < 0 ? year + 1 : year;
  const day = date ? /(\d\d)-(\d\d)$/.exec(date) : null;
  return day ? base + (DAYS[Number(day[1]) - 1] + Number(day[2]) - 1) / 365 : base;
}

/** The day at a place on the axis, as a card writes it: '4 April'. */
export function dayLabel(t: number): string {
  const day = Math.min(364, Math.floor((t - Math.floor(t + 1e-9)) * 365 + 1e-6));
  let month = 11;
  while (DAYS[month] > day) month--;
  return `${day - DAYS[month] + 1} ${MONTH_NAMES[month]}`;
}

/** The year at a place on the axis, as the data counts it: negative for BC, never 0. It is what Bible Mapper's own timeline takes (`?date=`). */
export function yearOf(t: number): number {
  const year = Math.floor(t + 1e-9);
  return year <= 0 ? year - 1 : year;
}

/** The year at a place on the axis, as the maps write it (src/maps/period.ts): '759 BC', 'AD 30'. */
export function yearLabel(t: number): string {
  const year = Math.floor(t + 1e-9);
  return year <= 0 ? `${1 - year} BC` : `AD ${year}`;
}

/** The Bible's time on the axis: 4004 BC (the first year of the data) to AD 100. */
export const T0 = tOf(-4004);
export const T1 = 100;
/** The closest zoom: a day DAY_PX wide. */
export const K_MAX = LAYOUT.DAY_PX * 365;
/** The widest zoom: the whole Bible in the width. */
export const kMin = (width: number): number => (width - LAYOUT.WHOLE_PAD - LAYOUT.ZOOM_BOX) / (T1 - T0);

export const xOf = (t: number, view: View, width: number): number => (t - view.c) * view.k + width / 2;
export const tAt = (x: number, view: View, width: number): number => view.c + (x - width / 2) / view.k;

/** The view in which the places `a` to `b` of the axis take `share` of the width, in the middle. */
export function fitView(a: number, b: number, width: number, share: number = LAYOUT.HOME_SHARE): View {
  return { c: (a + b) / 2, k: clamp((share * width) / Math.max(b - a, 1e-6), kMin(width), K_MAX) };
}

/** Where the strip opens: the chapter's years (`from` to `to`, the data's years) in the middle, taking HOME_SHARE of the width; a span under a year opens as a year. */
export function homeView(span: { from: number; to: number }, width: number): View {
  const a = tOf(span.from);
  return fitView(a, Math.max(tOf(span.to), a + 1), width);
}

/** The whole Bible in the width: 4004 BC a little in from the left, AD 100 short of the zoom buttons. */
export const wholeView = (width: number): View => ({ c: T0 + (width / 2 - LAYOUT.WHOLE_PAD) / kMin(width), k: kMin(width) });

const YEAR_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
const MINOR_OF: Record<number, number> = { 1: 0, 2: 1, 5: 1, 10: 5, 20: 10, 50: 10, 100: 50, 200: 100, 500: 100, 1000: 500, 2000: 1000 };

/** Every `step`th year by its written number (500 BC, not 501 BC: there is no year 0, so the round years of BC sit one off the axis's round numbers), between two places on the axis. */
function roundYears(step: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = Math.floor((from - 1) / step); m <= Math.ceil(to / step); m++) {
    if (m === 0) continue;
    const t = m < 0 ? m * step + 1 : m * step;
    if (t >= from && t <= to) out.push(t);
  }
  return out;
}

export interface Tick {
  t: number;
  label: string;
}

/**
 * The ruler of a view: the places that carry a written year (`major`), never closer than TICK_GAP, and the unwritten marks between them (`minor`). Zoomed out it steps in round
 * years; from 144 px a year in months (the year written at January); from 2,628 px a year in days.
 */
export function ticks(view: View, width: number): { major: Tick[]; minor: number[] } {
  const { k } = view;
  const from = tAt(-LAYOUT.TICK_GAP, view, width);
  const to = tAt(width + LAYOUT.TICK_GAP, view, width);
  const major: Tick[] = [];
  let minor: number[] = [];
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
