// src/timeline/motion.ts — how the timeline strip moves, as pure maths (mw-fnvjof.17.317.2, docs/timeline-design.md 'Motion'; ported from prototypes/timeline/timeline.js): a fling's
// glide and where it rests, the snap to the chapter, the give past an end, and a flight from one view to another.
import { K_MAX, T0, T1, clamp, kMin, type View } from './axis';
import { MOTION } from './design';

/** Where a fling let go at `x` with `velocity` px/ms comes to rest. */
export const glideRest = (x: number, velocity: number): number => x + velocity * MOTION.GLIDE_MS;
/** Where a glide from `from` to its `rest` is after `ms`: fast at first, then slowing, never past the rest. */
export const glideAt = (from: number, rest: number, ms: number): number => rest - (rest - from) * Math.exp(-ms / MOTION.GLIDE_MS);
/** Snap to the chapter: a rest within SNAP_PX of the chapter's place is the chapter's place. Both in px. */
export const snapRest = (rest: number, home: number): number => (Math.abs(rest - home) < MOTION.SNAP_PX ? home : rest);

/** Past an end of the Bible's time the strip follows the finger by RUBBER of its travel. */
export const rubberC = (c: number): number => (c < T0 ? T0 + (c - T0) * MOTION.RUBBER : c > T1 ? T1 + (c - T1) * MOTION.RUBBER : c);
/** And past an end of the zoom, in a strip `width` px wide. */
export function rubberK(k: number, width: number): number {
  const low = kMin(width);
  return k < low ? low * (k / low) ** MOTION.RUBBER : k > K_MAX ? K_MAX * (k / K_MAX) ** MOTION.RUBBER : k;
}

/**
 * A flight from one view to another, `share` 0 to 1 of the way: van Wijk and Nuij's smooth zoom-and-pan (the path d3-interpolate's interpolateZoom takes), in one dimension. Far
 * apart, it draws back, crosses and closes in, so the eye keeps its place; near, it is a plain zoom.
 */
export function flyAt(from: View, to: View, width: number, share: number): View {
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
export function flyMs(from: View, to: View, width: number): number {
  const zoom = Math.abs(Math.log(to.k / from.k));
  const pan = (Math.abs(to.c - from.c) * Math.min(from.k, to.k)) / width;
  return clamp(MOTION.FLY_MIN_MS + 80 * zoom + 60 * Math.min(pan, 4), MOTION.FLY_MIN_MS, MOTION.FLY_MAX_MS);
}

export const easeOut = (p: number): number => 1 - (1 - p) ** 3;
export const easeInOut = (p: number): number => 0.5 - Math.cos(Math.PI * p) / 2;
