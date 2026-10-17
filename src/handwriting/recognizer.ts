// src/handwriting/recognizer.ts — the on-device Greek handwriting checker (mw-86e9r1.50).
// Given what a pen wrote (strokes of {x, y, t} points) and the letter that was asked for, it says whether the writing is that
// letter, how well, which letter it looks most like, and which of the strokes were off. It is a point-cloud recognizer of the $P
// family (Vatavu, Anthony and Wobbrock, 2012): the strokes become one cloud of 32 points spaced along their length, scaled to a
// unit box and centred, and the cloud is compared with every template's. A cloud ignores the order and direction of the strokes,
// which is where people differ most in writing a letter: one hand's single stroke and another's two are the same cloud. Two
// changes from $P, both found by trying them against the writings in tests/unit/handwriting.test.ts: the comparison is the
// nearest-point distance taken both ways (the worse way counts) as a power mean with p = 4, which a missing bar or an extra loop
// moves far more than $P's greedy one-to-one match does; and the writing is also tried turned a little each way, so a hand that
// drifts off level, or a phone held at a slant, still meets the template. The templates are in templates.ts.
// Nothing here reads the network, a clock or the page.

import { GLYPHS, LETTERS, type Variant } from './templates';

export interface InkPoint {
  x: number;
  y: number;
  /** Milliseconds; the checker does not need it, a pad hands it over anyway. */
  t: number;
}
export type InkStroke = readonly InkPoint[];

export interface RecognizeOptions {
  /**
   * How tall a capital letter is on the pad, in the units of the points. A small and a capital letter that are the same shape
   * (ο and Ο, ι and Ι, Ρ and ρ) are then told apart by the size of the writing.
   */
  capHeight?: number;
  /**
   * With `capHeight`, the y of the line the letters stand on. The writing's top and bottom against that line (a descender, an
   * ascender, a capital that fills the line) then tell such a pair apart by where it was written as well as how big.
   */
  baseline?: number;
}

export interface Recognition {
  /** The letter that was asked for. */
  target: string;
  /** The writing is the asked-for letter (and, where the case can be told, in the asked-for case). */
  match: boolean;
  /** 0 to 1: how close the writing is to the asked-for letter; 0 for ink that is no letter at all. */
  score: number;
  /** The letter the writing looks most like ('' for ink that is no letter at all). */
  closest: string;
  /** The same 0 to 1 measure for the closest letter. */
  closestScore: number;
  /** Which of the strokes handed over (0-based, in the order given) do not belong to the asked-for letter. */
  offStrokes: number[];
  /** Part of the asked-for letter has no ink near it: a stroke was left out or is too short. */
  missing: boolean;
  /** The case was told by size or place (the pad gave a capHeight, and the letter's small and capital shapes are the same). */
  caseChecked: boolean;
}

/** Points a writing and a template are resampled to. */
const N = 32;
/** The first look at every template uses every other point; only the likeliest few are compared at full size. */
const COARSE = N / 2;
const CANDIDATES = 10;
/** The writing is tried turned by each of these angles (degrees): a hand drifts off level and a phone sits at a slant. */
const TURNS = [-24, -16, -8, 0, 8, 16, 24];
/** How much of a letter's proportions the comparison keeps: 1 is all (one scale for both sides), 0 none (a unit square). */
const ASPECT_KEPT = 0.7;
/** A shape thinner than this share of its length (a stem) keeps its proportions whatever ASPECT_KEPT says. */
const LINE_SHARE = 0.15;
/** A distance (in units of the letter's longer side) at which the score reaches 0. */
const SCORE_ZERO = 0.24;
/** The widest distance from the asked-for letter that still counts as that letter. */
const ACCEPT = 0.12;
/** A small and a capital letter whose templates are this close are the same shape, told apart by size and place only. */
const TWIN = 0.09;
/** A stroke shorter than this share of the longest stroke is a speck of the pen, not part of a letter. */
const SPECK = 0.1;
/** A written stroke is off when its points are this far, on average, from the asked-for letter's. */
const OFF_MEAN = 0.09;
/** Part of the asked-for letter is missing when this share of its points (two in 32) has no ink nearer than MISS_DIST. */
const MISS_DIST = 0.16;
const MISS_SHARE = 0.04;
/** Two same-shaped letters whose heights differ by less than this share cannot be told by size. */
const HEIGHT_APART = 0.2;
/** Two same-shaped letters whose place on the line differs by less than this many cap heights cannot be told by place. */
const PLACE_APART = 0.15;

/**
 * What the checker has done so far, counted so a test can hold its speed to a budget of work, which a loaded host cannot move,
 * rather than to a wall clock, which it can (mw-5r3p30.504): `pairs` is the point-to-point distances measured, `templates` the
 * templates built from their drawn strokes.
 */
export const work = { pairs: 0, templates: 0 };

interface Pt {
  x: number;
  y: number;
  /** The stroke it belongs to. */
  id: number;
}

interface Cloud {
  xs: Float64Array;
  ys: Float64Array;
}

interface Template {
  letter: string;
  cloud: Cloud;
  coarse: Cloud;
  /** Where the drawn variant reaches, in cap heights with the baseline at 1. */
  top: number;
  bottom: number;
  /** Its sampled points in the comparison frame, to say which part of the writing is off. */
  points: Pt[];
}

const length = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

function pathLength(points: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) if (points[i].id === points[i - 1].id) total += length(points[i - 1], points[i]);
  return total;
}

/** n points spaced evenly along the strokes' own length (the jump between two strokes does not count). */
function resample(points: readonly Pt[], n: number): Pt[] | null {
  const total = pathLength(points);
  if (!(total > 0)) return null;
  const spacing = total / (n - 1);
  const source = points.slice();
  const out: Pt[] = [source[0]];
  let carried = 0;
  for (let i = 1; i < source.length; i += 1) {
    if (source[i].id !== source[i - 1].id) continue;
    const d = length(source[i - 1], source[i]);
    if (d > 0 && carried + d >= spacing) {
      const f = (spacing - carried) / d;
      const q: Pt = {
        x: source[i - 1].x + f * (source[i].x - source[i - 1].x),
        y: source[i - 1].y + f * (source[i].y - source[i - 1].y),
        id: source[i].id,
      };
      out.push(q);
      source.splice(i, 0, q);
      carried = 0;
    } else {
      carried += d;
    }
  }
  while (out.length < n) out.push(source[source.length - 1]);
  return out.slice(0, n);
}

interface Frame {
  /** What x and y are multiplied by, so the longer side of the letter becomes 1. */
  sx: number;
  sy: number;
  /** The centroid after scaling. */
  cx: number;
  cy: number;
}

/**
 * The frame that scales a cloud's longer side to 1 and moves its centroid to the origin. The shorter side is pulled toward the
 * longer (its share of it raised to ASPECT_KEPT), so a hand that writes narrower or wider than the template is half forgiven, but
 * a letter that is plainly tall and thin, or a plain line, keeps its proportions.
 */
function frameOf(points: readonly Pt[]): Frame | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const longer = Math.max(width, height);
  if (!(longer > 0)) return null;
  const share = Math.min(width, height) / longer;
  const pull = share < LINE_SHARE ? 1 : share ** ASPECT_KEPT / share;
  const sx = (width < height ? pull : 1) / longer;
  const sy = (height < width ? pull : 1) / longer;
  return { sx, sy, cx: (sumX / points.length) * sx, cy: (sumY / points.length) * sy };
}

const place = (p: { x: number; y: number }, f: Frame): { x: number; y: number } => ({ x: p.x * f.sx - f.cx, y: p.y * f.sy - f.cy });

function cloudOf(points: readonly { x: number; y: number }[]): Cloud {
  return { xs: Float64Array.from(points, (p) => p.x), ys: Float64Array.from(points, (p) => p.y) };
}

/** Every other point of a cloud: the same path, half as many points. */
function thin(cloud: Cloud): Cloud {
  return {
    xs: Float64Array.from({ length: COARSE }, (_, i) => cloud.xs[2 * i]),
    ys: Float64Array.from({ length: COARSE }, (_, i) => cloud.ys[2 * i]),
  };
}

/**
 * How far apart two clouds of the same size are, in units of the letter's longer side: each point's distance to the nearest point
 * of the other cloud, both ways, as a power mean with p = 4 (so a stretch of ink with nothing near it counts for much more than
 * a general wobble), the worse way taken. Stops early, giving Infinity, once it must be over `cutoff`.
 */
function distance(a: Cloud, b: Cloud, cutoff = Infinity): number {
  const n = a.xs.length;
  const { xs: axs, ys: ays } = a;
  const { xs: bxs, ys: bys } = b;
  const limit = cutoff ** 4 * n;
  const nearestOfB = new Float64Array(n).fill(Infinity);
  let sumA = 0;
  for (let i = 0; i < n; i += 1) {
    const x = axs[i];
    const y = ays[i];
    let min = Infinity;
    for (let j = 0; j < n; j += 1) {
      const dx = x - bxs[j];
      const dy = y - bys[j];
      const d = dx * dx + dy * dy;
      if (d < min) min = d;
      if (d < nearestOfB[j]) nearestOfB[j] = d;
    }
    work.pairs += n;
    sumA += min * min;
    if (sumA > limit) return Infinity;
  }
  let sumB = 0;
  for (let j = 0; j < n; j += 1) sumB += nearestOfB[j] * nearestOfB[j];
  return Math.sqrt(Math.sqrt(Math.max(sumA, sumB) / n));
}

/** The strokes as points with the stroke they belong to; repeats and non-numbers dropped, specks beside a letter dropped. */
function inkOf(strokes: readonly InkStroke[]): { points: Pt[]; origin: number[] } {
  const kept: { points: Pt[]; length: number; origin: number }[] = [];
  strokes.forEach((stroke, origin) => {
    const points: Pt[] = [];
    for (const p of stroke ?? []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const last = points[points.length - 1];
      if (last && last.x === p.x && last.y === p.y) continue;
      points.push({ x: p.x, y: p.y, id: kept.length });
    }
    if (points.length >= 2) kept.push({ points, length: pathLength(points), origin });
  });
  const longest = Math.max(0, ...kept.map((k) => k.length));
  const real = kept.filter((k) => k.length >= SPECK * longest && k.length > 0);
  const points: Pt[] = [];
  const origin: number[] = [];
  real.forEach((k, id) => {
    origin.push(k.origin);
    for (const p of k.points) points.push({ ...p, id });
  });
  return { points, origin };
}

let cache: Template[] | null = null;

/** The templates, built on first use. */
function templates(): Template[] {
  if (cache) return cache;
  const out: Template[] = [];
  for (const letter of LETTERS) {
    for (const variant of GLYPHS[letter] as readonly Variant[]) {
      const points: Pt[] = variant.flatMap((stroke, id) => stroke.map(([x, y]): Pt => ({ x, y, id })));
      const ys = points.map((p) => p.y);
      const sampled = resample(points, N);
      const frame = sampled && frameOf(sampled);
      if (!sampled || !frame) throw new Error(`template ${letter} has no ink`);
      const placed = sampled.map((p) => ({ ...place(p, frame), id: p.id }));
      const cloud = cloudOf(placed);
      work.templates += 1;
      out.push({ letter, cloud, coarse: thin(cloud), top: Math.min(...ys), bottom: Math.max(...ys), points: placed });
    }
  }
  cache = out;
  return out;
}

let twinCache: Map<string, string[]> | null = null;

/** The other-case letter whose template is nearly this one's shape, if any: ο and Ο, ι and Ι, ρ and Ρ. */
export function caseTwins(letter: string): string[] {
  if (!twinCache) {
    twinCache = new Map();
    const all = templates();
    for (const small of LETTERS.filter((l) => l !== l.toUpperCase() && l !== 'ς')) {
      const capital = small.toUpperCase();
      let closest = Infinity;
      for (const a of all.filter((t) => t.letter === small)) {
        for (const b of all.filter((t) => t.letter === capital)) closest = Math.min(closest, distance(a.cloud, b.cloud));
      }
      if (closest < TWIN) {
        twinCache.set(small, [capital]);
        twinCache.set(capital, [small]);
      }
    }
  }
  return twinCache.get(letter) ?? [];
}

const scoreOf = (d: number): number => Math.max(0, Math.min(1, 1 - d / SCORE_ZERO));

const NOTHING = (target: string): Recognition => ({
  target,
  match: false,
  score: 0,
  closest: '',
  closestScore: 0,
  offStrokes: [],
  missing: false,
  caseChecked: false,
});

/** Of two same-shaped letters, the one the size or place of the writing says, or null when the pad has not told enough. */
function byCase(group: string[], ink: Pt[], options: RecognizeOptions): string | null {
  const { capHeight, baseline } = options;
  if (!capHeight || !(capHeight > 0)) return null;
  const own = (letter: string): Template[] => templates().filter((t) => t.letter === letter);
  let low = Infinity;
  let high = -Infinity;
  for (const p of ink) {
    low = Math.min(low, p.y);
    high = Math.max(high, p.y);
  }
  if (!(high > low)) return null;
  // how far each letter's drawn reach is from the writing's: by place on the line when it is known, else by height alone
  const apart =
    baseline !== undefined
      ? (letter: string): number =>
          Math.min(
            ...own(letter).map(
              (t) => Math.abs(1 - (baseline - low) / capHeight - t.top) + Math.abs(1 - (baseline - high) / capHeight - t.bottom),
            ),
          )
      : (letter: string): number =>
          Math.min(...own(letter).map((t) => Math.abs(Math.log((high - low) / capHeight / (t.bottom - t.top)))));
  const gaps = group.map(apart);
  const needed = baseline !== undefined ? PLACE_APART : Math.log(1 + HEIGHT_APART);
  if (Math.abs(gaps[0] - gaps[1]) < needed) return null;
  return gaps[0] < gaps[1] ? group[0] : group[1];
}

/** Which of the written strokes are off the template, and whether part of the template has no ink near it. */
function compare(
  ink: Pt[],
  sampled: Pt[],
  frame: Frame,
  origin: number[],
  template: Template,
): { offStrokes: number[]; missing: boolean } {
  const near = (p: { x: number; y: number }, to: readonly { x: number; y: number }[]): number => {
    let min = Infinity;
    for (const q of to) min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
    return min;
  };
  const dense = resample(ink, N * 3) ?? sampled;
  const written = dense.map((p) => place(p, frame));

  const offStrokes: number[] = [];
  const total = pathLength(ink);
  for (const id of new Set(ink.map((p) => p.id))) {
    const own = ink.filter((p) => p.id === id);
    const points = resample(own, Math.max(6, Math.round((N * pathLength(own)) / total)));
    if (!points) continue;
    const mean = points.reduce((sum, p) => sum + near(place(p, frame), template.points), 0) / points.length;
    if (mean > OFF_MEAN) offStrokes.push(origin[id]);
  }
  const lacking = template.points.filter((p) => near(p, written) > MISS_DIST).length;
  return { offStrokes: offStrokes.sort((a, b) => a - b), missing: lacking / template.points.length > MISS_SHARE };
}

interface Turned {
  ink: Pt[];
  sampled: Pt[];
  frame: Frame;
  cloud: Cloud;
  coarse: Cloud;
}

/** The writing turned by `degrees` about the middle of its sampled points, framed and ready to compare. */
function turned(ink: Pt[], sampled: Pt[], degrees: number): Turned | null {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = sampled.reduce((sum, p) => sum + p.x, 0) / sampled.length;
  const cy = sampled.reduce((sum, p) => sum + p.y, 0) / sampled.length;
  const turn = (p: Pt): Pt => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
    id: p.id,
  });
  const turnedSampled = sampled.map(turn);
  const frame = frameOf(turnedSampled);
  if (!frame) return null;
  const cloud = cloudOf(turnedSampled.map((p) => place(p, frame)));
  return { ink: ink.map(turn), sampled: turnedSampled, frame, cloud, coarse: thin(cloud) };
}

/** Is `strokes` the Greek letter `target`? Strokes may come in any order and direction, at any size and place. */
export function recognize(strokes: readonly InkStroke[], target: string, options: RecognizeOptions = {}): Recognition {
  const { points, origin } = inkOf(strokes);
  const sampled = points.length ? resample(points, N) : null;
  if (!sampled || !frameOf(sampled)) return NOTHING(target);
  const views = TURNS.map((degrees) => turned(points, sampled, degrees)).filter((v): v is Turned => v !== null);

  const all = templates();
  const known = Object.prototype.hasOwnProperty.call(GLYPHS, target);
  /** The nearest a template comes to the writing over the turns tried (stopping early past `cutoff`); `view` came nearest. */
  const nearest = (template: Template, coarse: boolean, cutoff = Infinity): { d: number; view: Turned } => {
    let found = { d: Infinity, view: views[0] };
    for (const view of views) {
      const bar = Math.min(found.d, cutoff);
      const d = coarse ? distance(view.coarse, template.coarse, bar) : distance(view.cloud, template.cloud, bar);
      if (d < found.d) found = { d, view };
    }
    return found;
  };

  // a first look at every template with half the points, then the likeliest few (and the asked-for letter) at full size
  const likeliest: { template: Template; d: number }[] = [];
  for (const template of all) {
    const bar = likeliest.length < CANDIDATES ? Infinity : likeliest[CANDIDATES - 1].d;
    const { d } = nearest(template, true, bar);
    if (d >= bar) continue;
    likeliest.push({ template, d });
    likeliest.sort((a, b) => a.d - b.d);
    likeliest.length = Math.min(likeliest.length, CANDIDATES);
  }
  for (const template of all) {
    if (template.letter === target && !likeliest.some((l) => l.template === template)) likeliest.push({ template, d: Infinity });
  }
  // at full size each is compared in every turn; one that cannot beat the best so far is dropped early (the asked-for letter never is)
  const best = new Map<string, { d: number; template: Template; view: Turned }>();
  let top = Infinity;
  for (const { template } of likeliest) {
    const { d, view } = nearest(template, false, template.letter === target ? Infinity : top);
    if (d < (best.get(template.letter)?.d ?? Infinity)) best.set(template.letter, { d, template, view });
    top = Math.min(top, d);
  }
  let closest = [...best.entries()].reduce((a, b) => (b[1].d < a[1].d ? b : a))[0];

  // a small and a capital letter of the same shape: the size or place of the writing tells them apart, when the pad says enough
  const group = [closest, ...caseTwins(closest)];
  const bySize = group.length > 1 ? byCase(group, points, options) : null;
  if (bySize) closest = bySize;
  const caseChecked = bySize !== null;

  const asked = known ? best.get(target) : undefined;
  const dTarget = asked ? asked.d : Infinity;
  const shape = best.get(closest)?.d ?? Math.min(...all.filter((t) => t.letter === closest).map((t) => nearest(t, false).d));
  const sameShape = known && (closest === target || (!caseChecked && group.includes(target)));
  const match = known && sameShape && dTarget <= ACCEPT;

  const off = asked
    ? compare(asked.view.ink, asked.view.sampled, asked.view.frame, origin, asked.template)
    : { offStrokes: [], missing: false };
  return {
    target,
    match,
    score: scoreOf(dTarget),
    closest,
    closestScore: scoreOf(shape),
    offStrokes: off.offStrokes,
    missing: off.missing,
    caseChecked,
  };
}
